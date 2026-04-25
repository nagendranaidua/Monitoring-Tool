package com.inframanager.service;

import com.inframanager.dto.EurekaMismatchDto;
import com.inframanager.entity.Application;
import com.inframanager.entity.Microservice;
import com.inframanager.entity.ServiceAllocation;
import com.inframanager.entity.ServiceInstance;
import com.inframanager.repository.ApplicationRepository;
import com.inframanager.repository.MicroserviceRepository;
import com.inframanager.repository.ServiceAllocationRepository;
import com.inframanager.repository.ServiceInstanceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EurekaService {

    private final ApplicationRepository applicationRepository;
    private final MicroserviceRepository microserviceRepository;
    private final ServiceAllocationRepository allocationRepository;
    private final ServiceInstanceRepository instanceRepository;
    private final WebClient.Builder webClientBuilder;

    @Data
    @Builder
    @AllArgsConstructor
    public static class EurekaInstanceInfo {
        private String instanceId;
        private String hostName;
        private String ipAddr;
        private int port;
        private String status;
        private String appName;
    }

    /**
     * Fetches the Eureka registry for the given application.
     */
    public Map<String, List<EurekaInstanceInfo>> fetchRegistry(Application app) {
        if (app.getEurekaUrl() == null || app.getEurekaUrl().isBlank()) {
            throw new IllegalStateException("Eureka URL not configured for application: " + app.getName());
        }

        String eurekaUrl = app.getEurekaUrl().endsWith("/")
                ? app.getEurekaUrl() + "eureka/apps"
                : app.getEurekaUrl() + "/eureka/apps";

        try {
            WebClient client = webClientBuilder.build();
            Map<String, Object> response = client.get()
                    .uri(eurekaUrl)
                    .header("Accept", "application/json")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return parseEurekaResponse(response);
        } catch (Exception e) {
            log.error("Failed to fetch Eureka registry from {}: {}", eurekaUrl, e.getMessage());
            throw new RuntimeException("Failed to fetch Eureka registry: " + e.getMessage(), e);
        }
    }

    /**
     * Detects mismatches between configured allocations/instances and live Eureka registry.
     */
    @Transactional(readOnly = true)
    public List<EurekaMismatchDto> detectMismatches(Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + applicationId));

        if (!Boolean.TRUE.equals(app.getEurekaEnabled())) {
            return Collections.emptyList();
        }

        Map<String, List<EurekaInstanceInfo>> registry = fetchRegistry(app);
        List<EurekaMismatchDto> mismatches = new ArrayList<>();

        List<Microservice> services = microserviceRepository.findByApplicationIdAndActiveTrue(applicationId);

        // Build a map of configured services by eureka name
        Map<String, Microservice> configuredByEurekaName = new HashMap<>();
        for (Microservice ms : services) {
            if (ms.getEurekaServiceName() != null && !ms.getEurekaServiceName().isBlank()) {
                configuredByEurekaName.put(ms.getEurekaServiceName().toUpperCase(), ms);
            }
        }

        // Check configured services against Eureka
        for (Map.Entry<String, Microservice> entry : configuredByEurekaName.entrySet()) {
            String eurekaName = entry.getKey();
            Microservice ms = entry.getValue();

            List<ServiceAllocation> allocations = allocationRepository.findByServiceId(ms.getId());
            int totalConfiguredInstances = allocations.stream()
                    .filter(a -> a.getStatus() == ServiceAllocation.Status.ACTIVE)
                    .mapToInt(ServiceAllocation::getPlannedInstanceCount)
                    .sum();

            List<EurekaInstanceInfo> eurekaInstances = registry.getOrDefault(eurekaName, Collections.emptyList());

            if (eurekaInstances.isEmpty() && totalConfiguredInstances > 0) {
                mismatches.add(EurekaMismatchDto.builder()
                        .type(EurekaMismatchDto.MismatchType.CONFIGURED_NOT_REGISTERED)
                        .serviceName(ms.getName())
                        .expected(totalConfiguredInstances)
                        .actual(0)
                        .suggestion(String.format("Service '%s' has %d configured instances but none registered in Eureka. " +
                                "Check if the service is running and Eureka registration is enabled.", ms.getName(), totalConfiguredInstances))
                        .build());
            } else if (eurekaInstances.size() != totalConfiguredInstances) {
                mismatches.add(EurekaMismatchDto.builder()
                        .type(EurekaMismatchDto.MismatchType.INSTANCE_COUNT_MISMATCH)
                        .serviceName(ms.getName())
                        .expected(totalConfiguredInstances)
                        .actual(eurekaInstances.size())
                        .suggestion(String.format("Service '%s' has %d configured instances but %d registered in Eureka.",
                                ms.getName(), totalConfiguredInstances, eurekaInstances.size()))
                        .eurekaDetails(Map.of(
                                "registeredInstances", eurekaInstances.stream()
                                        .map(EurekaInstanceInfo::getInstanceId)
                                        .collect(Collectors.toList())
                        ))
                        .build());
            }
        }

        // Check for services in Eureka not configured in DB
        for (Map.Entry<String, List<EurekaInstanceInfo>> entry : registry.entrySet()) {
            String eurekaAppName = entry.getKey();
            if (!configuredByEurekaName.containsKey(eurekaAppName)) {
                List<EurekaInstanceInfo> instances = entry.getValue();
                mismatches.add(EurekaMismatchDto.builder()
                        .type(EurekaMismatchDto.MismatchType.REGISTERED_NOT_CONFIGURED)
                        .serviceName(eurekaAppName)
                        .expected(0)
                        .actual(instances.size())
                        .suggestion(String.format("Service '%s' with %d instances is registered in Eureka but not configured " +
                                "in the infrastructure manager. Consider adding it.", eurekaAppName, instances.size()))
                        .eurekaDetails(Map.of(
                                "instances", instances.stream()
                                        .map(i -> Map.of("instanceId", i.getInstanceId(), "host", i.getHostName(), "port", i.getPort()))
                                        .collect(Collectors.toList())
                        ))
                        .build());
            }
        }

        return mismatches;
    }

    /**
     * Discovers services from Eureka registry and imports them into the DB for the given application.
     * Only imports services that are not already configured (matched by eureka service name).
     * Returns list of newly created Microservice names.
     */
    @Transactional
    public List<String> discoverAndImportServices(Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + applicationId));

        if (app.getEurekaUrl() == null || app.getEurekaUrl().isBlank()) {
            throw new IllegalStateException("Eureka URL not configured for application: " + app.getName());
        }

        Map<String, List<EurekaInstanceInfo>> registry = fetchRegistry(app);

        // Get already configured eureka service names
        List<Microservice> existing = microserviceRepository.findByApplicationId(applicationId);
        Set<String> existingNames = existing.stream()
                .filter(ms -> ms.getEurekaServiceName() != null)
                .map(ms -> ms.getEurekaServiceName().toUpperCase())
                .collect(Collectors.toSet());

        List<String> imported = new ArrayList<>();

        for (Map.Entry<String, List<EurekaInstanceInfo>> entry : registry.entrySet()) {
            String eurekaAppName = entry.getKey();
            List<EurekaInstanceInfo> instances = entry.getValue();

            if (existingNames.contains(eurekaAppName)) {
                continue; // Already configured
            }

            // Derive service metadata from Eureka instances
            EurekaInstanceInfo sample = instances.get(0);
            String serviceName = eurekaAppName.toLowerCase().replace('_', '-');

            Microservice ms = Microservice.builder()
                    .application(app)
                    .name(serviceName)
                    .description("Auto-discovered from Eureka registry")
                    .eurekaServiceName(eurekaAppName)
                    .basePort(sample.getPort())
                    .active(true)
                    .build();

            microserviceRepository.save(ms);
            imported.add(serviceName);
            log.info("Imported service '{}' (Eureka name: {}) for application '{}'",
                    serviceName, eurekaAppName, app.getName());
        }

        log.info("Discovered and imported {} new services from Eureka for application '{}'",
                imported.size(), app.getName());
        return imported;
    }

    /**
     * Syncs the eureka_registered flag on all service_instances based on live Eureka data.
     */
    @Transactional
    public void syncStatus(Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + applicationId));

        if (!Boolean.TRUE.equals(app.getEurekaEnabled())) {
            return;
        }

        Map<String, List<EurekaInstanceInfo>> registry;
        try {
            registry = fetchRegistry(app);
        } catch (Exception e) {
            log.error("Cannot sync Eureka status for app {}: {}", app.getName(), e.getMessage());
            return;
        }

        // Build a set of all registered instance identifiers (host:port)
        Set<String> registeredKeys = new HashSet<>();
        for (List<EurekaInstanceInfo> instances : registry.values()) {
            for (EurekaInstanceInfo info : instances) {
                registeredKeys.add(info.getIpAddr() + ":" + info.getPort());
                registeredKeys.add(info.getHostName() + ":" + info.getPort());
                if (info.getInstanceId() != null) {
                    registeredKeys.add(info.getInstanceId());
                }
            }
        }

        List<Microservice> services = microserviceRepository.findByApplicationIdAndActiveTrue(applicationId);
        for (Microservice ms : services) {
            List<ServiceAllocation> allocations = allocationRepository.findByServiceId(ms.getId());
            for (ServiceAllocation alloc : allocations) {
                String serverIp = alloc.getServer().getIpAddress();
                for (ServiceInstance instance : alloc.getInstances()) {
                    String key = serverIp + ":" + instance.getPort();
                    boolean registered = registeredKeys.contains(key)
                            || (instance.getEurekaInstanceId() != null && registeredKeys.contains(instance.getEurekaInstanceId()));

                    if (!Objects.equals(instance.getEurekaRegistered(), registered)) {
                        instance.setEurekaRegistered(registered);
                        instanceRepository.save(instance);
                    }
                }
            }
        }

        log.info("Synced Eureka status for application: {}", app.getName());
    }

    @SuppressWarnings("unchecked")
    private Map<String, List<EurekaInstanceInfo>> parseEurekaResponse(Map<String, Object> response) {
        Map<String, List<EurekaInstanceInfo>> result = new HashMap<>();

        if (response == null) {
            return result;
        }

        try {
            Map<String, Object> applications = (Map<String, Object>) response.get("applications");
            if (applications == null) {
                return result;
            }

            Object appList = applications.get("application");
            List<Map<String, Object>> appArray;

            if (appList instanceof List) {
                appArray = (List<Map<String, Object>>) appList;
            } else if (appList instanceof Map) {
                appArray = List.of((Map<String, Object>) appList);
            } else {
                return result;
            }

            for (Map<String, Object> app : appArray) {
                String appName = (String) app.get("name");
                if (appName == null) continue;

                List<EurekaInstanceInfo> instances = new ArrayList<>();
                Object instanceList = app.get("instance");
                List<Map<String, Object>> instanceArray;

                if (instanceList instanceof List) {
                    instanceArray = (List<Map<String, Object>>) instanceList;
                } else if (instanceList instanceof Map) {
                    instanceArray = List.of((Map<String, Object>) instanceList);
                } else {
                    continue;
                }

                for (Map<String, Object> inst : instanceArray) {
                    int port = 0;
                    Object portObj = inst.get("port");
                    if (portObj instanceof Map) {
                        Object portVal = ((Map<String, Object>) portObj).get("$");
                        if (portVal instanceof Number) {
                            port = ((Number) portVal).intValue();
                        } else if (portVal instanceof String) {
                            port = Integer.parseInt((String) portVal);
                        }
                    } else if (portObj instanceof Number) {
                        port = ((Number) portObj).intValue();
                    }

                    instances.add(EurekaInstanceInfo.builder()
                            .instanceId((String) inst.get("instanceId"))
                            .hostName((String) inst.get("hostName"))
                            .ipAddr((String) inst.get("ipAddr"))
                            .port(port)
                            .status((String) inst.get("status"))
                            .appName(appName)
                            .build());
                }

                result.put(appName.toUpperCase(), instances);
            }
        } catch (Exception e) {
            log.error("Failed to parse Eureka response: {}", e.getMessage(), e);
        }

        return result;
    }
}
