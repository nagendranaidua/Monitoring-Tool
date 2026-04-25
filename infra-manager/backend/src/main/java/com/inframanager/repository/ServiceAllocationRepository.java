package com.inframanager.repository;

import com.inframanager.entity.ServiceAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceAllocationRepository extends JpaRepository<ServiceAllocation, Long> {

    List<ServiceAllocation> findByServerId(Long serverId);

    List<ServiceAllocation> findByServiceId(Long serviceId);

    Optional<ServiceAllocation> findByServerIdAndServiceId(Long serverId, Long serviceId);
}
