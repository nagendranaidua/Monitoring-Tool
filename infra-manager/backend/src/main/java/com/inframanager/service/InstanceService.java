package com.inframanager.service;

import com.inframanager.dto.HealthCheckResponse;
import com.inframanager.dto.InstanceDto;
import com.inframanager.dto.MoveInstanceRequest;
import com.inframanager.entity.Microservice;
import com.inframanager.entity.Server;
import com.inframanager.entity.ServiceAllocation;
import com.inframanager.entity.ServiceInstance;
import com.inframanager.repository.ServerRepository;
import com.inframanager.repository.ServiceAllocationRepository;
import com.inframanager.repository.ServiceInstanceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstanceService {

    private final ServiceInstanceRepository instanceRepository;
    private final ServiceAllocationRepository allocationRepository;
    private final ServerRepository serverRepository;
    private final SshService sshService;
    private final AuditService auditService;

    public List<InstanceDto> getByAllocationId(Long allocationId) {
        return instanceRepository.findByAllocationId(allocationId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public InstanceDto startInstance(Long instanceId) {
        ServiceInstance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new EntityNotFoundException("Instance not found with id: " + instanceId));

        ServiceAllocation allocation = instance.getAllocation();
        Server server = allocation.getServer();
        Microservice service = allocation.getService();

        instance.setStatus(ServiceInstance.Status.STARTING);
        instanceRepository.save(instance);

        SshService.SshResult result = sshService.startService(server, instance, service);

        if (result.isSuccess()) {
            instance.setStatus(ServiceInstance.Status.RUNNING);
            instance.setStartedAt(LocalDateTime.now());
            instance.setStoppedAt(null);
            // Try to extract PID from stdout
            try {
                String pidStr = result.getStdout().trim();
                if (!pidStr.isEmpty()) {
                    instance.setPid(Integer.parseInt(pidStr.split("\\s+")[0]));
                }
            } catch (NumberFormatException ignored) {
            }
            log.info("Started instance {} of service '{}' on server '{}' (port {})",
                    instance.getInstanceIndex(), service.getName(), server.getAlias(), instance.getPort());
        } else {
            instance.setStatus(ServiceInstance.Status.ERROR);
            log.error("Failed to start instance {} of service '{}' on server '{}': {}",
                    instance.getInstanceIndex(), service.getName(), server.getAlias(), result.getStderr());
        }

        instance = instanceRepository.save(instance);
        return toDto(instance);
    }

    @Transactional
    public InstanceDto stopInstance(Long instanceId) {
        ServiceInstance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new EntityNotFoundException("Instance not found with id: " + instanceId));

        ServiceAllocation allocation = instance.getAllocation();
        Server server = allocation.getServer();
        Microservice service = allocation.getService();

        instance.setStatus(ServiceInstance.Status.STOPPING);
        instanceRepository.save(instance);

        SshService.SshResult result = sshService.stopService(server, instance, service);

        if (result.isSuccess() || result.getExitCode() == 0) {
            instance.setStatus(ServiceInstance.Status.STOPPED);
            instance.setStoppedAt(LocalDateTime.now());
            instance.setPid(null);
            log.info("Stopped instance {} of service '{}' on server '{}' (port {})",
                    instance.getInstanceIndex(), service.getName(), server.getAlias(), instance.getPort());
        } else {
            instance.setStatus(ServiceInstance.Status.ERROR);
            log.error("Failed to stop instance {} of service '{}' on server '{}': {}",
                    instance.getInstanceIndex(), service.getName(), server.getAlias(), result.getStderr());
        }

        instance = instanceRepository.save(instance);
        return toDto(instance);
    }

    @Transactional
    public InstanceDto moveInstance(Long instanceId, MoveInstanceRequest request) {
        ServiceInstance sourceInstance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new EntityNotFoundException("Instance not found with id: " + instanceId));

        ServiceAllocation sourceAllocation = sourceInstance.getAllocation();
        Server sourceServer = sourceAllocation.getServer();
        Microservice service = sourceAllocation.getService();

        Server targetServer = serverRepository.findById(request.getTargetServerId())
                .orElseThrow(() -> new EntityNotFoundException("Target server not found with id: " + request.getTargetServerId()));

        // Stop on source if requested
        if (request.isStopOnSource() && sourceInstance.getStatus() == ServiceInstance.Status.RUNNING) {
            sshService.stopService(sourceServer, sourceInstance, service);
            sourceInstance.setStatus(ServiceInstance.Status.STOPPED);
            sourceInstance.setStoppedAt(LocalDateTime.now());
            sourceInstance.setPid(null);
            instanceRepository.save(sourceInstance);
        }

        // Find or create allocation on target server
        ServiceAllocation targetAllocation = allocationRepository
                .findByServerIdAndServiceId(targetServer.getId(), service.getId())
                .orElseGet(() -> {
                    ServiceAllocation newAlloc = ServiceAllocation.builder()
                            .server(targetServer)
                            .service(service)
                            .plannedInstanceCount(1)
                            .deployPath(sourceAllocation.getDeployPath())
                            .configOverrides(sourceAllocation.getConfigOverrides())
                            .status(ServiceAllocation.Status.ACTIVE)
                            .build();
                    return allocationRepository.save(newAlloc);
                });

        // Determine port and index for new instance
        List<ServiceInstance> existingInstances = instanceRepository.findByAllocationId(targetAllocation.getId());
        int newIndex = existingInstances.stream()
                .mapToInt(ServiceInstance::getInstanceIndex)
                .max()
                .orElse(-1) + 1;
        int port = request.getTargetPort() != null ? request.getTargetPort() : sourceInstance.getPort();

        // Create new instance on target
        ServiceInstance newInstance = ServiceInstance.builder()
                .allocation(targetAllocation)
                .instanceIndex(newIndex)
                .port(port)
                .status(ServiceInstance.Status.STOPPED)
                .eurekaRegistered(false)
                .healthStatus(ServiceInstance.HealthStatus.UNKNOWN)
                .deployPath(sourceInstance.getDeployPath())
                .jvmArgs(sourceInstance.getJvmArgs())
                .build();
        newInstance = instanceRepository.save(newInstance);

        // Update target allocation planned count
        targetAllocation.setPlannedInstanceCount(existingInstances.size() + 1);
        allocationRepository.save(targetAllocation);

        // Start on target if requested
        if (request.isStartOnTarget()) {
            SshService.SshResult result = sshService.startService(targetServer, newInstance, service);
            if (result.isSuccess()) {
                newInstance.setStatus(ServiceInstance.Status.RUNNING);
                newInstance.setStartedAt(LocalDateTime.now());
                try {
                    newInstance.setPid(Integer.parseInt(result.getStdout().trim()));
                } catch (NumberFormatException ignored) {
                }
            } else {
                newInstance.setStatus(ServiceInstance.Status.ERROR);
            }
            newInstance = instanceRepository.save(newInstance);
        }

        // Audit
        auditService.log(null, "MOVE_INSTANCE", "ServiceInstance", instanceId,
                String.format("{\"sourceServerId\":%d,\"sourceServerAlias\":\"%s\",\"port\":%d}",
                        sourceServer.getId(), sourceServer.getAlias(), sourceInstance.getPort()),
                String.format("{\"targetServerId\":%d,\"targetServerAlias\":\"%s\",\"newInstanceId\":%d,\"port\":%d}",
                        targetServer.getId(), targetServer.getAlias(), newInstance.getId(), newInstance.getPort()),
                String.format("Moved instance of service '%s' from '%s' to '%s'",
                        service.getName(), sourceServer.getAlias(), targetServer.getAlias()),
                null);

        log.info("Moved instance of service '{}' from server '{}' to '{}'",
                service.getName(), sourceServer.getAlias(), targetServer.getAlias());

        return toDto(newInstance);
    }

    public InstanceDto getInstanceStatus(Long instanceId) {
        ServiceInstance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new EntityNotFoundException("Instance not found with id: " + instanceId));

        ServiceAllocation allocation = instance.getAllocation();
        Server server = allocation.getServer();

        // Quick SSH health check on this specific instance
        SshService.SshResult portCheck = sshService.executeCommand(server,
                String.format("ss -tlnp | grep ':%d ' | wc -l", instance.getPort()));

        boolean portListening = portCheck.isSuccess() && !portCheck.getStdout().isBlank()
                && Integer.parseInt(portCheck.getStdout().trim()) > 0;

        InstanceDto dto = toDto(instance);
        if (portListening) {
            dto.setHealthStatus("UP");
        } else if (instance.getStatus() == ServiceInstance.Status.RUNNING) {
            dto.setHealthStatus("DOWN");
        }

        return dto;
    }

    private InstanceDto toDto(ServiceInstance instance) {
        return InstanceDto.builder()
                .id(instance.getId())
                .allocationId(instance.getAllocation().getId())
                .instanceIndex(instance.getInstanceIndex())
                .port(instance.getPort())
                .pid(instance.getPid())
                .status(instance.getStatus() != null ? instance.getStatus().name() : null)
                .eurekaRegistered(instance.getEurekaRegistered())
                .eurekaInstanceId(instance.getEurekaInstanceId())
                .healthStatus(instance.getHealthStatus() != null ? instance.getHealthStatus().name() : null)
                .lastHealthCheck(instance.getLastHealthCheck())
                .startedAt(instance.getStartedAt())
                .stoppedAt(instance.getStoppedAt())
                .build();
    }
}
