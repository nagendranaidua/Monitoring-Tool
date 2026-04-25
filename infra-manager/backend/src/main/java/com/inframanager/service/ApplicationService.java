package com.inframanager.service;

import com.inframanager.dto.ApplicationDto;
import com.inframanager.dto.CreateApplicationRequest;
import com.inframanager.entity.Application;
import com.inframanager.repository.ApplicationRepository;
import com.inframanager.repository.MicroserviceRepository;
import com.inframanager.repository.ServerRepository;
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
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ServerRepository serverRepository;
    private final MicroserviceRepository microserviceRepository;

    public List<ApplicationDto> getAllApplications() {
        return applicationRepository.findByActiveTrue().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public ApplicationDto getById(Long id) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + id));
        return toDto(app);
    }

    @Transactional
    public ApplicationDto create(CreateApplicationRequest request) {
        applicationRepository.findByName(request.getName()).ifPresent(existing -> {
            throw new IllegalArgumentException("Application with name '" + request.getName() + "' already exists");
        });

        Application app = Application.builder()
                .name(request.getName())
                .description(request.getDescription())
                .eurekaUrl(request.getEurekaUrl())
                .eurekaEnabled(request.getEurekaEnabled() != null ? request.getEurekaEnabled() : false)
                .active(true)
                .build();

        app = applicationRepository.save(app);
        log.info("Created application: {} (id={})", app.getName(), app.getId());
        return toDto(app);
    }

    @Transactional
    public ApplicationDto update(Long id, CreateApplicationRequest request) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + id));

        app.setName(request.getName());
        app.setDescription(request.getDescription());
        app.setEurekaUrl(request.getEurekaUrl());
        if (request.getEurekaEnabled() != null) {
            app.setEurekaEnabled(request.getEurekaEnabled());
        }

        app = applicationRepository.save(app);
        log.info("Updated application: {} (id={})", app.getName(), app.getId());
        return toDto(app);
    }

    @Transactional
    public void delete(Long id) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Application not found with id: " + id));
        app.setActive(false);
        applicationRepository.save(app);
        log.info("Soft-deleted application: {} (id={})", app.getName(), app.getId());
    }

    private ApplicationDto toDto(Application app) {
        int serverCount = serverRepository.findByApplicationId(app.getId()).size();
        int serviceCount = microserviceRepository.findByApplicationIdAndActiveTrue(app.getId()).size();

        return ApplicationDto.builder()
                .id(app.getId())
                .name(app.getName())
                .description(app.getDescription())
                .eurekaUrl(app.getEurekaUrl())
                .eurekaEnabled(app.getEurekaEnabled())
                .active(app.getActive())
                .serverCount(serverCount)
                .activeServiceCount(serviceCount)
                .createdAt(app.getCreatedAt())
                .build();
    }
}
