package com.inframanager.service;

import com.inframanager.dto.AllocationSummaryDto;
import com.inframanager.dto.CreateMicroserviceRequest;
import com.inframanager.dto.MicroserviceDto;
import com.inframanager.entity.Application;
import com.inframanager.entity.Microservice;
import com.inframanager.entity.ServiceAllocation;
import com.inframanager.entity.ServiceInstance;
import com.inframanager.repository.ApplicationRepository;
import com.inframanager.repository.MicroserviceRepository;
import com.inframanager.repository.ServiceAllocationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MicroserviceService {

    private final MicroserviceRepository microserviceRepository;
    private final ApplicationRepository applicationRepository;
    private final ServiceAllocationRepository allocationRepository;

    public List<MicroserviceDto> getByApplicationId(Long applicationId) {
        return microserviceRepository.findByApplicationIdAndActiveTrue(applicationId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public MicroserviceDto getById(Long id) {
        Microservice ms = microserviceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Microservice not found with id: " + id));
        return toDtoWithAllocations(ms);
    }

    @Transactional
    public MicroserviceDto create(CreateMicroserviceRequest request) {
        Application app = applicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + request.getApplicationId()));

        Microservice ms = Microservice.builder()
                .application(app)
                .name(request.getName())
                .description(request.getDescription())
                .jarName(request.getJarName())
                .version(request.getVersion())
                .startScript(request.getStartScript())
                .stopScript(request.getStopScript())
                .healthCheckScript(request.getHealthCheckScript())
                .eurekaServiceName(request.getEurekaServiceName())
                .basePort(request.getBasePort())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        ms = microserviceRepository.save(ms);
        log.info("Created microservice: {} (id={}) for application: {}", ms.getName(), ms.getId(), app.getName());
        return toDto(ms);
    }

    @Transactional
    public MicroserviceDto update(Long id, CreateMicroserviceRequest request) {
        Microservice ms = microserviceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Microservice not found with id: " + id));

        ms.setName(request.getName());
        ms.setDescription(request.getDescription());
        ms.setJarName(request.getJarName());
        ms.setVersion(request.getVersion());
        ms.setStartScript(request.getStartScript());
        ms.setStopScript(request.getStopScript());
        ms.setHealthCheckScript(request.getHealthCheckScript());
        ms.setEurekaServiceName(request.getEurekaServiceName());
        ms.setBasePort(request.getBasePort());
        if (request.getActive() != null) {
            ms.setActive(request.getActive());
        }

        ms = microserviceRepository.save(ms);
        log.info("Updated microservice: {} (id={})", ms.getName(), ms.getId());
        return toDto(ms);
    }

    @Transactional
    public void delete(Long id) {
        Microservice ms = microserviceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Microservice not found with id: " + id));
        ms.setActive(false);
        microserviceRepository.save(ms);
        log.info("Soft-deleted microservice: {} (id={})", ms.getName(), ms.getId());
    }

    private MicroserviceDto toDto(Microservice ms) {
        return MicroserviceDto.builder()
                .id(ms.getId())
                .applicationId(ms.getApplication().getId())
                .name(ms.getName())
                .description(ms.getDescription())
                .jarName(ms.getJarName())
                .version(ms.getVersion())
                .startScript(ms.getStartScript())
                .stopScript(ms.getStopScript())
                .healthCheckScript(ms.getHealthCheckScript())
                .eurekaServiceName(ms.getEurekaServiceName())
                .basePort(ms.getBasePort())
                .active(ms.getActive())
                .build();
    }

    private MicroserviceDto toDtoWithAllocations(Microservice ms) {
        MicroserviceDto dto = toDto(ms);

        List<ServiceAllocation> allocations = allocationRepository.findByServiceId(ms.getId());
        List<AllocationSummaryDto> summaries = allocations.stream().map(alloc -> {
            long running = alloc.getInstances().stream()
                    .filter(i -> i.getStatus() == ServiceInstance.Status.RUNNING)
                    .count();
            return AllocationSummaryDto.builder()
                    .allocationId(alloc.getId())
                    .serviceId(ms.getId())
                    .serviceName(ms.getName())
                    .serverId(alloc.getServer().getId())
                    .serverAlias(alloc.getServer().getAlias())
                    .status(alloc.getStatus() != null ? alloc.getStatus().name() : null)
                    .runningInstances((int) running)
                    .totalInstances(alloc.getInstances().size())
                    .build();
        }).collect(Collectors.toList());

        dto.setAllocations(summaries);
        return dto;
    }
}
