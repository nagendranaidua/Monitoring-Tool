package com.inframanager.controller;

import com.inframanager.dto.EurekaMismatchDto;
import com.inframanager.service.EurekaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/eureka")
@RequiredArgsConstructor
public class EurekaController {

    private final EurekaService eurekaService;

    @GetMapping("/mismatches/{appId}")
    public ResponseEntity<List<EurekaMismatchDto>> detectMismatches(@PathVariable Long appId) {
        return ResponseEntity.ok(eurekaService.detectMismatches(appId));
    }

    @PostMapping("/sync/{appId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<Void> syncStatus(@PathVariable Long appId) {
        eurekaService.syncStatus(appId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/discover/{appId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<Map<String, Object>> discoverServices(@PathVariable Long appId) {
        List<String> imported = eurekaService.discoverAndImportServices(appId);
        return ResponseEntity.ok(Map.of(
                "importedCount", imported.size(),
                "importedServices", imported
        ));
    }
}
