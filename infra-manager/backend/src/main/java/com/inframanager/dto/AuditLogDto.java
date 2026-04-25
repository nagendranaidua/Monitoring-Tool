package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDto {

    private Long id;
    private String username;
    private String action;
    private String entityType;
    private Long entityId;
    private String details;
    private String beforeState;
    private String afterState;
    private LocalDateTime createdAt;
    private String ipAddress;
}
