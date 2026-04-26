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
                .serverName(request.getServerName())
                .alias(request.getAlias())
                .ipAddress(request.getIpAddress())
                .environment(request.getEnvironment())
                .datacenter(request.getDatacenter())
                .zone(request.getZone())
                .osType(request.getOsType())
                .osVersion(request.getOsVersion())
                .serverType(request.getServerType())
                .cpuCount(request.getCpuCount())
                .cpuCores(request.getCpuCores())
                .ramGb(request.getRamGb())
                .diskSize(request.getDiskSize())
                .software(request.getSoftware())
                .sshUsername(request.getSshUsername())
                .sshPort(request.getSshPort() != null ? request.getSshPort() : 22)
                .remarks(request.getRemarks())
                .tadpHostname(request.getTadpHostname())
                .status(request.getStatus() != null ? Server.Status.valueOf(request.getStatus()) : Server.Status.ACTIVE)
                .build();

        if (request.getSshPassword() != null && !request.getSshPassword().isBlank()) {
            server.setSshPasswordEnc(EncryptionUtil.encrypt(request.getSshPassword(), masterKey));
        }

        server = serverRepository.save(server);
        log.info("Created server: {} (id={}) for application: {}", server.getServerName(), server.getId(), appId);
        return toDto(server);
    }

    @Transactional
    public ServerDto update(Long id, CreateServerRequest request) {
        Server server = serverRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Server not found with id: " + id));

        server.setServerName(request.getServerName());
        server.setAlias(request.getAlias());
        server.setIpAddress(request.getIpAddress());
        server.setEnvironment(request.getEnvironment());
        server.setDatacenter(request.getDatacenter());
        server.setZone(request.getZone());
        server.setOsType(request.getOsType());
        server.setOsVersion(request.getOsVersion());
        server.setServerType(request.getServerType());
        server.setCpuCount(request.getCpuCount());
        server.setCpuCores(request.getCpuCores());
        server.setRamGb(request.getRamGb());
        server.setDiskSize(request.getDiskSize());
        server.setSoftware(request.getSoftware());
        server.setSshUsername(request.getSshUsername());
        server.setSshPort(request.getSshPort());
        server.setRemarks(request.getRemarks());
        server.setTadpHostname(request.getTadpHostname());

        if (request.getStatus() != null) {
            server.setStatus(Server.Status.valueOf(request.getStatus()));
        }
        if (request.getSshPassword() != null && !request.getSshPassword().isBlank()) {
            server.setSshPasswordEnc(EncryptionUtil.encrypt(request.getSshPassword(), masterKey));
        }

        server = serverRepository.save(server);
        log.info("Updated server: {} (id={})", server.getServerName(), server.getId());
        return toDto(server);
    }

    @Transactional
    public void delete(Long id) {
        Server server = serverRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Server not found with id: " + id));
        server.setStatus(Server.Status.INACTIVE);
        serverRepository.save(server);
        log.info("Soft-deleted server: {} (id={})", server.getServerName(), server.getId());
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
                filter.getSoftware(),
                status
        ).stream().map(this::toDto).collect(Collectors.toList());
    }

    public Map<String, List<String>> getFilterOptions(Long appId) {
        List<Server> servers = serverRepository.findByApplicationId(appId);

        Map<String, List<String>> options = new LinkedHashMap<>();
        options.put("environment", extractDistinct(servers, Server::getEnvironment));
        options.put("datacenter", extractDistinct(servers, Server::getDatacenter));
        options.put("zone", extractDistinct(servers, Server::getZone));
        options.put("software", extractDistinct(servers, Server::getSoftware));
        options.put("osType", extractDistinct(servers, Server::getOsType));
        options.put("serverType", extractDistinct(servers, Server::getServerType));
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
                .serverName(server.getServerName())
                .alias(server.getAlias())
                .ipAddress(server.getIpAddress())
                .environment(server.getEnvironment())
                .datacenter(server.getDatacenter())
                .zone(server.getZone())
                .osType(server.getOsType())
                .osVersion(server.getOsVersion())
                .serverType(server.getServerType())
                .cpuCount(server.getCpuCount())
                .cpuCores(server.getCpuCores())
                .ramGb(server.getRamGb())
                .diskSize(server.getDiskSize())
                .software(server.getSoftware())
                .sshUsername(server.getSshUsername())
                .sshPort(server.getSshPort())
                .remarks(server.getRemarks())
                .tadpHostname(server.getTadpHostname())
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
