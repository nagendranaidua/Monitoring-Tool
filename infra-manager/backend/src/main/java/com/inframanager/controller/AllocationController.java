package com.inframanager.controller;

import com.inframanager.dto.AllocationDto;
import com.inframanager.dto.CreateAllocationRequest;
import com.inframanager.dto.MoveAllocationRequest;
import com.inframanager.service.AllocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/allocations")
@RequiredArgsConstructor
public class AllocationController {

    private final AllocationService allocationService;

    @GetMapping
    public ResponseEntity<List<AllocationDto>> getAllocations(
            @RequestParam(required = false) Long serverId,
            @RequestParam(required = false) Long serviceId) {
        if (serverId != null) {
            return ResponseEntity.ok(allocationService.getByServerId(serverId));
        } else if (serviceId != null) {
            return ResponseEntity.ok(allocationService.getByServiceId(serviceId));
        }
        return ResponseEntity.badRequest().build();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<AllocationDto> createAllocation(@Valid @RequestBody CreateAllocationRequest request) {
        AllocationDto created = allocationService.createAllocation(request);
        return ResponseEntity.created(URI.create("/api/allocations/" + created.getId())).body(created);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<Void> removeAllocation(@PathVariable Long id) {
        allocationService.removeAllocation(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/move")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<AllocationDto> moveAllocation(@PathVariable Long id,
                                                         @Valid @RequestBody MoveAllocationRequest request) {
        return ResponseEntity.ok(allocationService.moveAllocation(id, request));
    }
}
