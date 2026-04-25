package com.inframanager.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inframanager.dto.CreateSnapshotRequest;
import com.inframanager.dto.SnapshotDto;
import com.inframanager.entity.*;
import com.inframanager.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SnapshotService {

    private final AllocationSnapshotRepository snapshotRepository;
    private final ApplicationRepository applicationRepository;
    private final ServerRepository serverRepository;
    private final ServiceAllocationRepository allocationRepository;
    private final ServiceInstanceRepository instanceRepository;
    private final MicroserviceRepository microserviceRepository;
    private final SshService sshService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public SnapshotDto createSnapshot(CreateSnapshotRequest request, String username) {
        Application app = applicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + request.getApplicationId()));

        String snapshotData = captureSnapshotData(app.getId());

        AllocationSnapshot snapshot = AllocationSnapshot.builder()
                .name(request.getName())
                .description(request.getDescription())
                .applicationId(app.getId())
                .snapshotData(snapshotData)
                .build();

        snapshot = snapshotRepository.save(snapshot);
        log.info("Created snapshot '{}' for application '{}' by {}", request.getName(), app.getName(), username);

        return toDto(snapshot);
    }

    @Transactional
    public SnapshotDto createAutoSnapshot(Long applicationId, String trigger, String username) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + applicationId));

        String snapshotData = captureSnapshotData(applicationId);
        String name = String.format("Auto: %s - %s", trigger, LocalDateTime.now().toString());

        AllocationSnapshot snapshot = AllocationSnapshot.builder()
                .name(name)
                .description("Automatically created before " + trigger)
                .applicationId(applicationId)
                .snapshotData(snapshotData)
                .autoTrigger(trigger)
                .build();

        snapshot = snapshotRepository.save(snapshot);
        log.info("Created auto-snapshot for application '{}' trigger='{}' by {}", app.getName(), trigger, username);

        return toDto(snapshot);
    }

    @Transactional(readOnly = true)
    public List<SnapshotDto> getSnapshots(Long applicationId) {
        return snapshotRepository.findByApplicationIdOrderByCreatedAtDesc(applicationId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void restoreSnapshot(Long snapshotId) {
        AllocationSnapshot snapshot = snapshotRepository.findById(snapshotId)
                .orElseThrow(() -> new EntityNotFoundException("Snapshot not found with id: " + snapshotId));

        List<Map<String, Object>> snapshotAllocations = parseSnapshotData(snapshot.getSnapshotData());
        Map<String, Object> diff = computeDiff(snapshot.getApplicationId(), snapshotAllocations);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> toRemove = (List<Map<String, Object>>) diff.get("toRemove");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> toAdd = (List<Map<String, Object>>) diff.get("toAdd");

        // Stop services that should be removed
        for (Map<String, Object> entry : toRemove) {
            Long allocationId = ((Number) entry.get("allocationId")).longValue();
            allocationRepository.findById(allocationId).ifPresent(alloc -> {
                for (ServiceInstance instance : alloc.getInstances()) {
                    if (instance.getStatus() == ServiceInstance.Status.RUNNING) {
                        try {
                            sshService.stopService(alloc.getServer(), instance, alloc.getService());
                            instance.setStatus(ServiceInstance.Status.STOPPED);
                            instance.setStoppedAt(LocalDateTime.now());
                            instance.setPid(null);
                            instanceRepository.save(instance);
                        } catch (Exception e) {
                            log.warn("Failed to stop instance during restore: {}", e.getMessage());
                        }
                    }
                }
                alloc.setStatus(ServiceAllocation.Status.INACTIVE);
                allocationRepository.save(alloc);
            });
        }

        // Add/restore allocations from snapshot
        for (Map<String, Object> entry : toAdd) {
            Long serverId = ((Number) entry.get("serverId")).longValue();
            Long serviceId = ((Number) entry.get("serviceId")).longValue();
            int plannedCount = entry.get("plannedInstanceCount") != null
                    ? ((Number) entry.get("plannedInstanceCount")).intValue() : 1;

            Server server = serverRepository.findById(serverId).orElse(null);
            Microservice service = microserviceRepository.findById(serviceId).orElse(null);
            if (server == null || service == null) continue;

            // Check if allocation already exists
            Optional<ServiceAllocation> existing = allocationRepository.findByServerIdAndServiceId(serverId, serviceId);
            ServiceAllocation alloc;
            if (existing.isPresent()) {
                alloc = existing.get();
                alloc.setStatus(ServiceAllocation.Status.ACTIVE);
                alloc.setPlannedInstanceCount(plannedCount);
                alloc = allocationRepository.save(alloc);
            } else {
                alloc = ServiceAllocation.builder()
                        .server(server)
                        .service(service)
                        .plannedInstanceCount(plannedCount)
                        .deployPath((String) entry.get("deployPath"))
                        .status(ServiceAllocation.Status.ACTIVE)
                        .build();
                alloc = allocationRepository.save(alloc);

                // Create instance rows
                int basePort = service.getBasePort() != null ? service.getBasePort() : 8080;
                for (int i = 0; i < plannedCount; i++) {
                    ServiceInstance instance = ServiceInstance.builder()
                            .allocation(alloc)
                            .instanceIndex(i)
                            .port(basePort + i)
                            .status(ServiceInstance.Status.STOPPED)
                            .eurekaRegistered(false)
                            .healthStatus(ServiceInstance.HealthStatus.UNKNOWN)
                            .build();
                    instanceRepository.save(instance);
                }
            }

            // Start instances from snapshot that were running
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> snapshotInstances = (List<Map<String, Object>>) entry.get("instances");
            if (snapshotInstances != null) {
                for (Map<String, Object> si : snapshotInstances) {
                    String status = (String) si.get("status");
                    if ("RUNNING".equals(status)) {
                        int index = si.get("instanceIndex") != null ? ((Number) si.get("instanceIndex")).intValue() : 0;
                        List<ServiceInstance> instances = instanceRepository.findByAllocationId(alloc.getId());
                        instances.stream()
                                .filter(inst -> inst.getInstanceIndex() == index)
                                .findFirst()
                                .ifPresent(inst -> {
                                    SshService.SshResult result = sshService.startService(server, inst, service);
                                    if (result.isSuccess()) {
                                        inst.setStatus(ServiceInstance.Status.RUNNING);
                                        inst.setStartedAt(LocalDateTime.now());
                                        try {
                                            inst.setPid(Integer.parseInt(result.getStdout().trim()));
                                        } catch (NumberFormatException ignored) {
                                        }
                                    }
                                    instanceRepository.save(inst);
                                });
                    }
                }
            }
        }

        auditService.log(null, "RESTORE_SNAPSHOT", "AllocationSnapshot", snapshotId,
                null, null,
                String.format("Restored snapshot '%s' for application %d", snapshot.getName(), snapshot.getApplicationId()),
                null);

        log.info("Restored snapshot '{}' (id={})", snapshot.getName(), snapshotId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSnapshotDiff(Long snapshotId) {
        AllocationSnapshot snapshot = snapshotRepository.findById(snapshotId)
                .orElseThrow(() -> new EntityNotFoundException("Snapshot not found with id: " + snapshotId));

        List<Map<String, Object>> snapshotAllocations = parseSnapshotData(snapshot.getSnapshotData());
        return computeDiff(snapshot.getApplicationId(), snapshotAllocations);
    }

    private String captureSnapshotData(Long applicationId) {
        List<Server> servers = serverRepository.findByApplicationId(applicationId);
        List<Map<String, Object>> allocationData = new ArrayList<>();

        for (Server server : servers) {
            List<ServiceAllocation> allocations = allocationRepository.findByServerId(server.getId());
            for (ServiceAllocation alloc : allocations) {
                if (alloc.getStatus() == ServiceAllocation.Status.INACTIVE) continue;

                Map<String, Object> allocMap = new LinkedHashMap<>();
                allocMap.put("allocationId", alloc.getId());
                allocMap.put("serverId", server.getId());
                allocMap.put("serverAlias", server.getAlias());
                allocMap.put("serverIp", server.getIpAddress());
                allocMap.put("serviceId", alloc.getService().getId());
                allocMap.put("serviceName", alloc.getService().getName());
                allocMap.put("plannedInstanceCount", alloc.getPlannedInstanceCount());
                allocMap.put("deployPath", alloc.getDeployPath());
                allocMap.put("status", alloc.getStatus().name());

                List<Map<String, Object>> instanceData = new ArrayList<>();
                for (ServiceInstance inst : alloc.getInstances()) {
                    Map<String, Object> instMap = new LinkedHashMap<>();
                    instMap.put("instanceIndex", inst.getInstanceIndex());
                    instMap.put("port", inst.getPort());
                    instMap.put("status", inst.getStatus() != null ? inst.getStatus().name() : "STOPPED");
                    instMap.put("pid", inst.getPid());
                    instanceData.add(instMap);
                }
                allocMap.put("instances", instanceData);
                allocationData.add(allocMap);
            }
        }

        try {
            return objectMapper.writeValueAsString(allocationData);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize snapshot data", e);
        }
    }

    private List<Map<String, Object>> parseSnapshotData(String snapshotData) {
        try {
            return objectMapper.readValue(snapshotData, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse snapshot data", e);
        }
    }

    private Map<String, Object> computeDiff(Long applicationId, List<Map<String, Object>> snapshotAllocations) {
        // Get current active allocations
        List<Server> servers = serverRepository.findByApplicationId(applicationId);
        Set<String> currentKeys = new HashSet<>();
        Map<String, ServiceAllocation> currentByKey = new HashMap<>();

        for (Server server : servers) {
            List<ServiceAllocation> allocations = allocationRepository.findByServerId(server.getId());
            for (ServiceAllocation alloc : allocations) {
                if (alloc.getStatus() == ServiceAllocation.Status.INACTIVE) continue;
                String key = alloc.getServer().getId() + ":" + alloc.getService().getId();
                currentKeys.add(key);
                currentByKey.put(key, alloc);
            }
        }

        Set<String> snapshotKeys = new HashSet<>();
        Map<String, Map<String, Object>> snapshotByKey = new HashMap<>();
        for (Map<String, Object> entry : snapshotAllocations) {
            String key = ((Number) entry.get("serverId")).longValue() + ":" + ((Number) entry.get("serviceId")).longValue();
            snapshotKeys.add(key);
            snapshotByKey.put(key, entry);
        }

        List<Map<String, Object>> toAdd = new ArrayList<>();
        List<Map<String, Object>> toRemove = new ArrayList<>();
        List<Map<String, Object>> toModify = new ArrayList<>();

        // In snapshot but not current -> to add
        for (String key : snapshotKeys) {
            if (!currentKeys.contains(key)) {
                toAdd.add(snapshotByKey.get(key));
            }
        }

        // In current but not snapshot -> to remove
        for (String key : currentKeys) {
            if (!snapshotKeys.contains(key)) {
                ServiceAllocation alloc = currentByKey.get(key);
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("allocationId", alloc.getId());
                entry.put("serverId", alloc.getServer().getId());
                entry.put("serverAlias", alloc.getServer().getAlias());
                entry.put("serviceId", alloc.getService().getId());
                entry.put("serviceName", alloc.getService().getName());
                toRemove.add(entry);
            }
        }

        // In both -> check for modifications
        for (String key : snapshotKeys) {
            if (currentKeys.contains(key)) {
                ServiceAllocation current = currentByKey.get(key);
                Map<String, Object> snapshot = snapshotByKey.get(key);
                int snapshotCount = snapshot.get("plannedInstanceCount") != null
                        ? ((Number) snapshot.get("plannedInstanceCount")).intValue() : 1;

                if (!Objects.equals(current.getPlannedInstanceCount(), snapshotCount)) {
                    Map<String, Object> mod = new LinkedHashMap<>();
                    mod.put("allocationId", current.getId());
                    mod.put("serverId", current.getServer().getId());
                    mod.put("serverAlias", current.getServer().getAlias());
                    mod.put("serviceId", current.getService().getId());
                    mod.put("serviceName", current.getService().getName());
                    mod.put("currentInstanceCount", current.getPlannedInstanceCount());
                    mod.put("snapshotInstanceCount", snapshotCount);
                    toModify.add(mod);
                }
            }
        }

        Map<String, Object> diff = new LinkedHashMap<>();
        diff.put("toAdd", toAdd);
        diff.put("toRemove", toRemove);
        diff.put("toModify", toModify);
        return diff;
    }

    private SnapshotDto toDto(AllocationSnapshot snapshot) {
        int allocationCount = 0;
        try {
            List<Map<String, Object>> data = parseSnapshotData(snapshot.getSnapshotData());
            allocationCount = data.size();
        } catch (Exception ignored) {
        }

        return SnapshotDto.builder()
                .id(snapshot.getId())
                .name(snapshot.getName())
                .description(snapshot.getDescription())
                .applicationId(snapshot.getApplicationId())
                .createdAt(snapshot.getCreatedAt())
                .allocationCount(allocationCount)
                .build();
    }
}
