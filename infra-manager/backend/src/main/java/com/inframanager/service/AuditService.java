package com.inframanager.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inframanager.dto.AuditLogDto;
import com.inframanager.entity.AuditLog;
import com.inframanager.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String username, String action, String entityType, Long entityId,
                    Object beforeState, Object afterState, String details, String ipAddress) {
        try {
            AuditLog entry = AuditLog.builder()
                    .username(username)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .beforeState(serializeToJson(beforeState))
                    .afterState(serializeToJson(afterState))
                    .details(details)
                    .ipAddress(ipAddress)
                    .build();

            auditLogRepository.save(entry);
            log.debug("Audit log: {} {} {} #{}", username, action, entityType, entityId);
        } catch (Exception e) {
            log.error("Failed to create audit log entry: {}", e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDto> getAuditLog(String entityType, Long entityId, Pageable pageable) {
        return auditLogRepository.findWithFilters(null, null, entityType, null, null, pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDto> getAll(String username, String action, String entityType,
                                     LocalDateTime from, LocalDateTime to, Pageable pageable) {
        return auditLogRepository.findWithFilters(username, action, entityType, from, to, pageable)
                .map(this::toDto);
    }

    private String serializeToJson(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof String) {
            return (String) obj;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize object to JSON: {}", e.getMessage());
            return obj.toString();
        }
    }

    private AuditLogDto toDto(AuditLog entry) {
        return AuditLogDto.builder()
                .id(entry.getId())
                .username(entry.getUsername())
                .action(entry.getAction())
                .entityType(entry.getEntityType())
                .entityId(entry.getEntityId())
                .details(entry.getDetails())
                .beforeState(entry.getBeforeState())
                .afterState(entry.getAfterState())
                .createdAt(entry.getCreatedAt())
                .ipAddress(entry.getIpAddress())
                .build();
    }
}
