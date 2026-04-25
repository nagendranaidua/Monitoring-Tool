package com.inframanager.controller;

import com.inframanager.dto.CreateServerRequest;
import com.inframanager.dto.HealthCheckResponse;
import com.inframanager.dto.ServerDto;
import com.inframanager.dto.ServerFilterRequest;
import com.inframanager.entity.Server;
import com.inframanager.repository.ServerRepository;
import com.inframanager.service.ServerService;
import com.inframanager.service.SshService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ServerController {

    private final ServerService serverService;
    private final SshService sshService;
    private final ServerRepository serverRepository;

    @GetMapping("/applications/{appId}/servers")
    public ResponseEntity<List<ServerDto>> getByApplicationId(@PathVariable Long appId) {
        return ResponseEntity.ok(serverService.getByApplicationId(appId));
    }

    @GetMapping("/servers/{id}")
    public ResponseEntity<ServerDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(serverService.getById(id));
    }

    @PostMapping("/applications/{appId}/servers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ServerDto> create(@PathVariable Long appId,
                                            @Valid @RequestBody CreateServerRequest request) {
        ServerDto created = serverService.create(appId, request);
        return ResponseEntity.created(URI.create("/api/servers/" + created.getId())).body(created);
    }

    @PutMapping("/servers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ServerDto> update(@PathVariable Long id,
                                            @Valid @RequestBody CreateServerRequest request) {
        return ResponseEntity.ok(serverService.update(id, request));
    }

    @DeleteMapping("/servers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serverService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/servers/filter")
    public ResponseEntity<List<ServerDto>> filterServers(@RequestParam Long appId,
                                                          @RequestBody ServerFilterRequest request) {
        return ResponseEntity.ok(serverService.filterServers(appId, request));
    }

    @GetMapping("/servers/filter-options")
    public ResponseEntity<Map<String, List<String>>> getFilterOptions(@RequestParam Long appId) {
        return ResponseEntity.ok(serverService.getFilterOptions(appId));
    }

    @PostMapping("/servers/{id}/health-check")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<HealthCheckResponse> healthCheck(@PathVariable Long id) {
        Server server = serverRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Server not found with id: " + id));
        return ResponseEntity.ok(sshService.healthCheck(server));
    }
}
