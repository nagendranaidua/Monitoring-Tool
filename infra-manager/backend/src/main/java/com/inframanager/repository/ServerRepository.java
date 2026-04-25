package com.inframanager.repository;

import com.inframanager.entity.Server;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServerRepository extends JpaRepository<Server, Long> {

    List<Server> findByApplicationId(Long applicationId);

    List<Server> findByApplicationIdAndStatus(Long applicationId, Server.Status status);

    List<Server> findByEnvironment(String environment);

    List<Server> findByDatacenter(String datacenter);

    List<Server> findByUsageRole(String usageRole);

    @Query("SELECT s FROM Server s WHERE s.application.id = :appId " +
           "AND (:environment IS NULL OR s.environment = :environment) " +
           "AND (:datacenter IS NULL OR s.datacenter = :datacenter) " +
           "AND (:usageRole IS NULL OR s.usageRole = :usageRole) " +
           "AND (:status IS NULL OR s.status = :status)")
    List<Server> findByFilters(@Param("appId") Long applicationId,
                               @Param("environment") String environment,
                               @Param("datacenter") String datacenter,
                               @Param("usageRole") String usageRole,
                               @Param("status") Server.Status status);
}
