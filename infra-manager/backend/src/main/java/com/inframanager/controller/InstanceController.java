package com.inframanager.controller;

import com.inframanager.dto.InstanceDto;
import com.inframanager.dto.MoveInstanceRequest;
import com.inframanager.service.InstanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/instances")
@RequiredArgsConstructor
public class InstanceController {

    private final InstanceService instanceService;

    @GetMapping
    public ResponseEntity<List<InstanceDto>> getByAllocationId(@RequestParam Long allocationId) {
        return ResponseEntity.ok(instanceService.getByAllocationId(allocationId));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<InstanceDto> startInstance(@PathVariable Long id) {
        return ResponseEntity.ok(instanceService.startInstance(id));
    }

    @PostMapping("/{id}/stop")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<InstanceDto> stopInstance(@PathVariable Long id) {
        return ResponseEntity.ok(instanceService.stopInstance(id));
    }

    @PutMapping("/{id}/move")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<InstanceDto> moveInstance(@PathVariable Long id,
                                                     @Valid @RequestBody MoveInstanceRequest request) {
        return ResponseEntity.ok(instanceService.moveInstance(id, request));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<InstanceDto> getInstanceStatus(@PathVariable Long id) {
        return ResponseEntity.ok(instanceService.getInstanceStatus(id));
    }
}
