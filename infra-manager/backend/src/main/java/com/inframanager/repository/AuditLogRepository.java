package com.inframanager.repository;

import com.inframanager.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByEntityTypeAndEntityId(String entityType, Long entityId);

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:username IS NULL OR a.username = :username) " +
           "AND (:action IS NULL OR a.action = :action) " +
           "AND (:entityType IS NULL OR a.entityType = :entityType) " +
           "AND (:from IS NULL OR a.createdAt >= :from) " +
           "AND (:to IS NULL OR a.createdAt <= :to) " +
           "ORDER BY a.createdAt DESC")
    Page<AuditLog> findWithFilters(@Param("username") String username,
                                   @Param("action") String action,
                                   @Param("entityType") String entityType,
                                   @Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to,
                                   Pageable pageable);
}
