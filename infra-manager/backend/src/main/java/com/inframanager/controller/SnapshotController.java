package com.inframanager.controller;

import com.inframanager.dto.CreateSnapshotRequest;
import com.inframanager.dto.SnapshotDto;
import com.inframanager.service.SnapshotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/snapshots")
@RequiredArgsConstructor
public class SnapshotController {

    private final SnapshotService snapshotService;

    @GetMapping
    public ResponseEntity<List<SnapshotDto>> getSnapshots(@RequestParam Long applicationId) {
        return ResponseEntity.ok(snapshotService.getSnapshots(applicationId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<SnapshotDto> createSnapshot(@Valid @RequestBody CreateSnapshotRequest request,
                                                       Principal principal) {
        SnapshotDto created = snapshotService.createSnapshot(request, principal.getName());
        return ResponseEntity.created(URI.create("/api/snapshots/" + created.getId())).body(created);
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> restoreSnapshot(@PathVariable Long id) {
        snapshotService.restoreSnapshot(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/diff")
    public ResponseEntity<Map<String, Object>> getSnapshotDiff(@PathVariable Long id) {
        return ResponseEntity.ok(snapshotService.getSnapshotDiff(id));
    }
}
