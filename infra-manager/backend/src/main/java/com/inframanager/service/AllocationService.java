package com.inframanager.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inframanager.dto.AllocationDto;
import com.inframanager.dto.CreateAllocationRequest;
import com.inframanager.dto.InstanceDto;
import com.inframanager.dto.MoveAllocationRequest;
import com.inframanager.entity.Microservice;
import com.inframanager.entity.Server;
import com.inframanager.entity.ServiceAllocation;
import com.inframanager.entity.ServiceInstance;
import com.inframanager.repository.MicroserviceRepository;
import com.inframanager.repository.ServerRepository;
import com.inframanager.repository.ServiceAllocationRepository;
import com.inframanager.repository.ServiceInstanceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AllocationService {

    private final ServiceAllocationRepository allocationRepository;
    private final ServiceInstanceRepository instanceRepository;
    private final ServerRepository serverRepository;
    private final MicroserviceRepository microserviceRepository;
    private final SshService sshService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public List<AllocationDto> getByServerId(Long serverId) {
        return allocationRepository.findByServerId(serverId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<AllocationDto> getByServiceId(Long serviceId) {
        return allocationRepository.findByServiceId(serviceId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AllocationDto createAllocation(CreateAllocationRequest request) {
        Server server = serverRepository.findById(request.getServerId())
                .orElseThrow(() -> new EntityNotFoundException("Server not found with id: " + request.getServerId()));

        Microservice service = microserviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new EntityNotFoundException("Microservice not found with id: " + request.getServiceId()));

        // Check for existing allocation
        allocationRepository.findByServerIdAndServiceId(request.getServerId(), request.getServiceId())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException(
                            String.format("Allocation already exists for service '%s' on server '%s'",
                                    service.getName(), server.getAlias()));
                });

        int instanceCount = request.getPlannedInstanceCount() != null ? request.getPlannedInstanceCount() : 1;

        ServiceAllocation allocation = ServiceAllocation.builder()
                .server(server)
                .service(service)
                .plannedInstanceCount(instanceCount)
                .deployPath(request.getDeployPath())
                .configOverrides(serializeMap(request.getConfigOverrides()))
                .status(ServiceAllocation.Status.ACTIVE)
                .build();

        allocation = allocationRepository.save(allocation);

        // Create service instance rows
        int basePort = service.getBasePort() != null ? service.getBasePort() : 8080;
        List<ServiceInstance> instances = new ArrayList<>();
        for (int i = 0; i < instanceCount; i++) {
            ServiceInstance instance = ServiceInstance.builder()
                    .allocation(allocation)
                    .instanceIndex(i)
                    .port(basePort + i)
                    .status(ServiceInstance.Status.STOPPED)
                    .eurekaRegistered(false)
                    .healthStatus(ServiceInstance.HealthStatus.UNKNOWN)
                    .deployPath(request.getDeployPath())
                    .build();
            instances.add(instanceRepository.save(instance));
        }
        allocation.setInstances(instances);

        log.info("Created allocation: service '{}' on server '{}' with {} instances",
                service.getName(), server.getAlias(), instanceCount);

        return toDto(allocation);
    }

    @Transactional
    public void removeAllocation(Long allocationId) {
        ServiceAllocation allocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> new EntityNotFoundException("Allocation not found with id: " + allocationId));

        // Stop all running instances first
        for (ServiceInstance instance : allocation.getInstances()) {
            if (instance.getStatus() == ServiceInstance.Status.RUNNING) {
                try {
                    sshService.stopService(allocation.getServer(), instance, allocation.getService());
                    instance.setStatus(ServiceInstance.Status.STOPPED);
                    instance.setStoppedAt(LocalDateTime.now());
                    instanceRepository.save(instance);
                } catch (Exception e) {
                    log.warn("Failed to stop instance {} during allocation removal: {}",
                            instance.getId(), e.getMessage());
                }
            }
        }

        allocation.setStatus(ServiceAllocation.Status.INACTIVE);
        allocationRepository.save(allocation);

        log.info("Soft-deleted allocation: id={}, service='{}' on server='{}'",
                allocationId, allocation.getService().getName(), allocation.getServer().getAlias());
    }

    @Transactional
    public AllocationDto moveAllocation(Long allocationId, MoveAllocationRequest request) {
        ServiceAllocation sourceAllocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> new EntityNotFoundException("Allocation not found with id: " + allocationId));

        Server targetServer = serverRepository.findById(request.getTargetServerId())
                .orElseThrow(() -> new EntityNotFoundException("Target server not found with id: " + request.getTargetServerId()));

        Microservice service = sourceAllocation.getService();
        Server sourceServer = sourceAllocation.getServer();

        // Capture before state for audit
        String beforeState = String.format("{\"allocationId\":%d,\"sourceServerId\":%d,\"sourceServerAlias\":\"%s\"}",
                allocationId, sourceServer.getId(), sourceServer.getAlias());

        // Stop instances on source server
        if (request.isStopOnSource()) {
            for (ServiceInstance instance : sourceAllocation.getInstances()) {
                if (instance.getStatus() == ServiceInstance.Status.RUNNING) {
                    sshService.stopService(sourceServer, instance, service);
                    instance.setStatus(ServiceInstance.Status.STOPPED);
                    instance.setStoppedAt(LocalDateTime.now());
                    instanceRepository.save(instance);
                }
            }
        }

        // Deactivate source allocation
        sourceAllocation.setStatus(ServiceAllocation.Status.INACTIVE);
        allocationRepository.save(sourceAllocation);

        // Create new allocation on target server
        CreateAllocationRequest createRequest = CreateAllocationRequest.builder()
                .serverId(targetServer.getId())
                .serviceId(service.getId())
                .plannedInstanceCount(sourceAllocation.getPlannedInstanceCount())
                .deployPath(sourceAllocation.getDeployPath())
                .build();

        AllocationDto newAllocation = createAllocation(createRequest);

        // Start instances on target if requested
        if (request.isStartOnTarget()) {
            ServiceAllocation targetAllocation = allocationRepository.findById(newAllocation.getId())
                    .orElseThrow();
            for (ServiceInstance instance : targetAllocation.getInstances()) {
                SshService.SshResult result = sshService.startService(targetServer, instance, service);
                if (result.isSuccess()) {
                    instance.setStatus(ServiceInstance.Status.RUNNING);
                    instance.setStartedAt(LocalDateTime.now());
                    // Try to extract PID from stdout
                    try {
                        instance.setPid(Integer.parseInt(result.getStdout().trim()));
                    } catch (NumberFormatException ignored) {
                    }
                    instanceRepository.save(instance);
                }
            }
        }

        // Audit log
        String afterState = String.format("{\"newAllocationId\":%d,\"targetServerId\":%d,\"targetServerAlias\":\"%s\"}",
                newAllocation.getId(), targetServer.getId(), targetServer.getAlias());

        auditService.log(null, "MOVE_ALLOCATION", "ServiceAllocation", allocationId,
                beforeState, afterState,
                String.format("Moved service '%s' from server '%s' to '%s'",
                        service.getName(), sourceServer.getAlias(), targetServer.getAlias()),
                null);

        log.info("Moved allocation: service '{}' from server '{}' to '{}'",
                service.getName(), sourceServer.getAlias(), targetServer.getAlias());

        return newAllocation;
    }

    private AllocationDto toDto(ServiceAllocation alloc) {
        List<InstanceDto> instanceDtos = alloc.getInstances().stream()
                .map(this::toInstanceDto)
                .collect(Collectors.toList());

        Map<String, String> configMap = null;
        if (alloc.getConfigOverrides() != null && !alloc.getConfigOverrides().isBlank()) {
            try {
                configMap = objectMapper.readValue(alloc.getConfigOverrides(),
                        objectMapper.getTypeFactory().constructMapType(Map.class, String.class, String.class));
            } catch (Exception e) {
                log.warn("Failed to parse config overrides for allocation {}", alloc.getId());
            }
        }

        return AllocationDto.builder()
                .id(alloc.getId())
                .serverId(alloc.getServer().getId())
                .serverAlias(alloc.getServer().getAlias())
                .serverIp(alloc.getServer().getIpAddress())
                .serviceId(alloc.getService().getId())
                .serviceName(alloc.getService().getName())
                .plannedInstanceCount(alloc.getPlannedInstanceCount())
                .deployPath(alloc.getDeployPath())
                .configOverrides(configMap)
                .status(alloc.getStatus() != null ? alloc.getStatus().name() : null)
                .instances(instanceDtos)
                .build();
    }

    private InstanceDto toInstanceDto(ServiceInstance instance) {
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

    private String serializeMap(Map<String, String> map) {
        if (map == null || map.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }
}
