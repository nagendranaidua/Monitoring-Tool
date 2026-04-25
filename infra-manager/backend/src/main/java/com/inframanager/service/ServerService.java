package com.inframanager.service;

import com.inframanager.dto.*;
import com.inframanager.entity.Application;
import com.inframanager.entity.Server;
import com.inframanager.entity.ServiceAllocation;
import com.inframanager.entity.ServiceInstance;
import com.inframanager.repository.ApplicationRepository;
import com.inframanager.repository.ServerRepository;
import com.inframanager.repository.ServiceAllocationRepository;
import com.inframanager.util.EncryptionUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServerService {

    private final ServerRepository serverRepository;
    private final ApplicationRepository applicationRepository;
    private final ServiceAllocationRepository allocationRepository;

    @Value("${app.encryption.master-key}")
    private String masterKey;

    public List<ServerDto> getByApplicationId(Long applicationId) {
        return serverRepository.findByApplicationId(applicationId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public ServerDto getById(Long id) {
        Server server = serverRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Server not found with id: " + id));
        return toDtoWithAllocations(server);
    }

    @Transactional
    public ServerDto create(Long appId, CreateServerRequest request) {
        Application app = applicationRepository.findById(appId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + appId));

        Server server = Server.builder()
                .application(app)
                .machineName(request.getMachineName())
                .alias(request.getAlias())
                .ipAddress(request.getIpAddress())
                .environment(request.getEnvironment())
                .availabilityZone(request.getAvailabilityZone())
                .datacenter(request.getDatacenter())
                .os(request.getOs())
                .vmServer(request.getVmServer())
                .vmType(request.getVmType())
                .osVersion(request.getOsVersion())
                .cpu(request.getCpu())
                .ram(request.getRam())
                .disk(request.getDisk())
                .usageRole(request.getUsageRole())
                .isAppServer(request.getIsAppServer())
                .sshUsername(request.getSshUsername())
                .sshPort(request.getSshPort() != null ? request.getSshPort() : 22)
                .remark(request.getRemark())
                .tadpHostname(request.getTadpHostname())
                .tadpRef(request.getTadpRef())
                .status(request.getStatus() != null ? Server.Status.valueOf(request.getStatus()) : Server.Status.ACTIVE)
                .build();

        if (request.getSshPassword() != null && !request.getSshPassword().isBlank()) {
            server.setSshPasswordEnc(EncryptionUtil.encrypt(request.getSshPassword(), masterKey));
        }

        server = serverRepository.save(server);
        log.info("Created server: {} (id={}) for application: {}", server.getMachineName(), server.getId(), appId);
        return toDto(server);
    }

    @Transactional
    public ServerDto update(Long id, CreateServerRequest request) {
        Server server = serverRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Server not found with id: " + id));

        server.setMachineName(request.getMachineName());
        server.setAlias(request.getAlias());
        server.setIpAddress(request.getIpAddress());
        server.setEnvironment(request.getEnvironment());
        server.setAvailabilityZone(request.getAvailabilityZone());
        server.setDatacenter(request.getDatacenter());
        server.setOs(request.getOs());
        server.setVmServer(request.getVmServer());
        server.setVmType(request.getVmType());
        server.setOsVersion(request.getOsVersion());
        server.setCpu(request.getCpu());
        server.setRam(request.getRam());
        server.setDisk(request.getDisk());
        server.setUsageRole(request.getUsageRole());
        server.setIsAppServer(request.getIsAppServer());
        server.setSshUsername(request.getSshUsername());
        server.setSshPort(request.getSshPort());
        server.setRemark(request.getRemark());
        server.setTadpHostname(request.getTadpHostname());
        server.setTadpRef(request.getTadpRef());

        if (request.getStatus() != null) {
            server.setStatus(Server.Status.valueOf(request.getStatus()));
        }
        if (request.getSshPassword() != null && !request.getSshPassword().isBlank()) {
            server.setSshPasswordEnc(EncryptionUtil.encrypt(request.getSshPassword(), masterKey));
        }

        server = serverRepository.save(server);
        log.info("Updated server: {} (id={})", server.getMachineName(), server.getId());
        return toDto(server);
    }

    @Transactional
    public void delete(Long id) {
        Server server = serverRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Server not found with id: " + id));
        server.setStatus(Server.Status.INACTIVE);
        serverRepository.save(server);
        log.info("Soft-deleted server: {} (id={})", server.getMachineName(), server.getId());
    }

    public List<ServerDto> filterServers(Long appId, ServerFilterRequest filter) {
        Server.Status status = null;
        if (filter.getStatus() != null && !filter.getStatus().isBlank()) {
            status = Server.Status.valueOf(filter.getStatus());
        }
        return serverRepository.findByFilters(
                appId,
                filter.getEnvironment(),
                filter.getDatacenter(),
                filter.getUsageRole(),
                status
        ).stream().map(this::toDto).collect(Collectors.toList());
    }

    public Map<String, List<String>> getFilterOptions(Long appId) {
        List<Server> servers = serverRepository.findByApplicationId(appId);

        Map<String, List<String>> options = new LinkedHashMap<>();
        options.put("environment", extractDistinct(servers, Server::getEnvironment));
        options.put("datacenter", extractDistinct(servers, Server::getDatacenter));
        options.put("availabilityZone", extractDistinct(servers, Server::getAvailabilityZone));
        options.put("usageRole", extractDistinct(servers, Server::getUsageRole));
        options.put("os", extractDistinct(servers, Server::getOs));
        options.put("vmType", extractDistinct(servers, Server::getVmType));
        options.put("status", extractDistinct(servers, s -> s.getStatus() != null ? s.getStatus().name() : null));

        return options;
    }

    private List<String> extractDistinct(List<Server> servers, java.util.function.Function<Server, String> extractor) {
        return servers.stream()
                .map(extractor)
                .filter(Objects::nonNull)
                .filter(s -> !s.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    private ServerDto toDto(Server server) {
        return ServerDto.builder()
                .id(server.getId())
                .applicationId(server.getApplication().getId())
                .machineName(server.getMachineName())
                .alias(server.getAlias())
                .ipAddress(server.getIpAddress())
                .environment(server.getEnvironment())
                .availabilityZone(server.getAvailabilityZone())
                .datacenter(server.getDatacenter())
                .os(server.getOs())
                .vmServer(server.getVmServer())
                .vmType(server.getVmType())
                .osVersion(server.getOsVersion())
                .cpu(server.getCpu())
                .ram(server.getRam())
                .disk(server.getDisk())
                .usageRole(server.getUsageRole())
                .isAppServer(server.getIsAppServer())
                .sshUsername(server.getSshUsername())
                .sshPort(server.getSshPort())
                .remark(server.getRemark())
                .tadpHostname(server.getTadpHostname())
                .tadpRef(server.getTadpRef())
                .status(server.getStatus() != null ? server.getStatus().name() : null)
                .createdAt(server.getCreatedAt())
                .updatedAt(server.getUpdatedAt())
                .build();
    }

    private ServerDto toDtoWithAllocations(Server server) {
        ServerDto dto = toDto(server);

        List<ServiceAllocation> allocations = allocationRepository.findByServerId(server.getId());
        List<AllocationSummaryDto> summaries = allocations.stream().map(alloc -> {
            long running = alloc.getInstances().stream()
                    .filter(i -> i.getStatus() == ServiceInstance.Status.RUNNING)
                    .count();
            return AllocationSummaryDto.builder()
                    .allocationId(alloc.getId())
                    .serviceId(alloc.getService().getId())
                    .serviceName(alloc.getService().getName())
                    .serverId(server.getId())
                    .serverAlias(server.getAlias())
                    .status(alloc.getStatus() != null ? alloc.getStatus().name() : null)
                    .runningInstances((int) running)
                    .totalInstances(alloc.getInstances().size())
                    .build();
        }).collect(Collectors.toList());

        dto.setAllocatedServices(summaries);
        return dto;
    }
}
