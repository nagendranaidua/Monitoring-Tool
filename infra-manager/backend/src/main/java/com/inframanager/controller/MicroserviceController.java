package com.inframanager.controller;

import com.inframanager.dto.CreateMicroserviceRequest;
import com.inframanager.dto.MicroserviceDto;
import com.inframanager.service.MicroserviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class MicroserviceController {

    private final MicroserviceService microserviceService;

    @GetMapping
    public ResponseEntity<List<MicroserviceDto>> getByApplicationId(@RequestParam Long applicationId) {
        return ResponseEntity.ok(microserviceService.getByApplicationId(applicationId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MicroserviceDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(microserviceService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<MicroserviceDto> create(@Valid @RequestBody CreateMicroserviceRequest request) {
        MicroserviceDto created = microserviceService.create(request);
        return ResponseEntity.created(URI.create("/api/services/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<MicroserviceDto> update(@PathVariable Long id,
                                                   @Valid @RequestBody CreateMicroserviceRequest request) {
        return ResponseEntity.ok(microserviceService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        microserviceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
