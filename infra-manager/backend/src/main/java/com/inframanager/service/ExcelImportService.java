package com.inframanager.service;

import com.inframanager.entity.Application;
import com.inframanager.entity.Server;
import com.inframanager.repository.ApplicationRepository;
import com.inframanager.repository.ServerRepository;
import com.inframanager.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExcelImportService {

    private final ApplicationRepository applicationRepository;
    private final ServerRepository serverRepository;

    @Value("${app.encryption.master-key}")
    private String masterKey;

    @Transactional
    public Map<String, Object> importExcel(MultipartFile file) {
        int applicationsImported = 0;
        int serversImported = 0;
        List<String> errors = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            for (int sheetIdx = 0; sheetIdx < workbook.getNumberOfSheets(); sheetIdx++) {
                Sheet sheet = workbook.getSheetAt(sheetIdx);
                String sheetName = sheet.getSheetName();

                if (sheetName == null || sheetName.isBlank()) {
                    continue;
                }

                // Create or find application from sheet name
                Application app = applicationRepository.findByName(sheetName)
                        .orElseGet(() -> {
                            Application newApp = Application.builder()
                                    .name(sheetName)
                                    .active(true)
                                    .eurekaEnabled(false)
                                    .build();
                            return applicationRepository.save(newApp);
                        });
                applicationsImported++;

                // Read header row (row 0)
                Row headerRow = sheet.getRow(0);
                if (headerRow == null) {
                    errors.add("Sheet '" + sheetName + "': no header row found");
                    continue;
                }

                Map<String, Integer> columnMap = buildColumnMap(headerRow);

                // Process data rows
                for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                    Row row = sheet.getRow(rowIdx);
                    if (row == null || isRowEmpty(row)) {
                        continue;
                    }

                    try {
                        Server server = parseServerRow(row, columnMap, app);
                        serverRepository.save(server);
                        serversImported++;
                    } catch (Exception e) {
                        String errorMsg = String.format("Sheet '%s', row %d: %s", sheetName, rowIdx + 1, e.getMessage());
                        errors.add(errorMsg);
                        log.warn("Import error: {}", errorMsg);
                    }
                }
            }

        } catch (Exception e) {
            log.error("Failed to import Excel file: {}", e.getMessage(), e);
            errors.add("File processing error: " + e.getMessage());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("applicationsImported", applicationsImported);
        result.put("serversImported", serversImported);
        result.put("errors", errors);

        log.info("Excel import completed: {} applications, {} servers, {} errors",
                applicationsImported, serversImported, errors.size());

        return result;
    }

    private Map<String, Integer> buildColumnMap(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        for (int col = 0; col < headerRow.getLastCellNum(); col++) {
            Cell cell = headerRow.getCell(col);
            if (cell != null) {
                String header = getCellStringValue(cell).trim();
                if (!header.isBlank()) {
                    map.put(header, col);
                }
            }
        }
        return map;
    }

    private Server parseServerRow(Row row, Map<String, Integer> columnMap, Application app) {
        Server.ServerBuilder builder = Server.builder();
        builder.application(app);

        builder.tadpHostname(getStringValue(row, columnMap, "TADP hostnames"));
        builder.machineName(getStringValue(row, columnMap, "Machine name"));
        builder.alias(getStringValue(row, columnMap, "Alias"));
        builder.ipAddress(getStringValue(row, columnMap, "IP Address"));
        builder.environment(getStringValue(row, columnMap, "Current role"));
        builder.availabilityZone(getStringValue(row, columnMap, "Availability Zone"));
        builder.datacenter(getStringValue(row, columnMap, "Datacenter"));
        builder.os(getStringValue(row, columnMap, "OS"));
        builder.vmServer(parseYesNo(getStringValue(row, columnMap, "VM Server")));
        builder.vmType(getStringValue(row, columnMap, "Type"));
        builder.osVersion(getStringValue(row, columnMap, "Version"));
        builder.cpu(parseInteger(getStringValue(row, columnMap, "CPU")));
        builder.ram(getStringValue(row, columnMap, "RAM"));
        builder.disk(getStringValue(row, columnMap, "DISK"));
        builder.usageRole(getStringValue(row, columnMap, "Usage"));
        builder.isAppServer(parseYesNo(getStringValue(row, columnMap, "Application Server")));
        builder.remark(getStringValue(row, columnMap, "Remark"));
        builder.tadpRef(getStringValue(row, columnMap, "TADP Ref"));
        builder.status(Server.Status.ACTIVE);
        builder.sshPort(22);

        // Validate required fields
        Server server = builder.build();
        if (server.getMachineName() == null || server.getMachineName().isBlank()) {
            throw new IllegalArgumentException("Machine name is required");
        }
        if (server.getIpAddress() == null || server.getIpAddress().isBlank()) {
            // Use machine name as fallback
            server.setIpAddress("0.0.0.0");
        }
        if (server.getEnvironment() == null || server.getEnvironment().isBlank()) {
            server.setEnvironment("UNKNOWN");
        }

        return server;
    }

    private String getStringValue(Row row, Map<String, Integer> columnMap, String columnName) {
        Integer colIdx = columnMap.get(columnName);
        if (colIdx == null) {
            return null;
        }
        Cell cell = row.getCell(colIdx);
        if (cell == null) {
            return null;
        }
        String value = getCellStringValue(cell);
        return value != null && !value.isBlank() ? value.trim() : null;
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) {
            return null;
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val) && !Double.isInfinite(val)) {
                    yield String.valueOf((long) val);
                }
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue();
                } catch (Exception e) {
                    try {
                        yield String.valueOf(cell.getNumericCellValue());
                    } catch (Exception e2) {
                        yield null;
                    }
                }
            }
            default -> null;
        };
    }

    private Boolean parseYesNo(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim().toLowerCase();
        return "yes".equals(v) || "y".equals(v) || "true".equals(v);
    }

    private Integer parseInteger(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim().replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean isRowEmpty(Row row) {
        for (int col = 0; col < row.getLastCellNum(); col++) {
            Cell cell = row.getCell(col);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellStringValue(cell);
                if (value != null && !value.isBlank()) {
                    return false;
                }
            }
        }
        return true;
    }
}
