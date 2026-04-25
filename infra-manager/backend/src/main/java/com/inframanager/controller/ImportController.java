package com.inframanager.controller;

import com.inframanager.service.ExcelImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
public class ImportController {

    private final ExcelImportService excelImportService;

    @PostMapping("/excel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> importExcel(@RequestParam("file") MultipartFile file) {
        Map<String, Object> result = excelImportService.importExcel(file);
        return ResponseEntity.ok(result);
    }
}
