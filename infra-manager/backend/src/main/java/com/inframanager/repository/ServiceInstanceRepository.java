package com.inframanager.repository;

import com.inframanager.entity.ServiceInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceInstanceRepository extends JpaRepository<ServiceInstance, Long> {

    List<ServiceInstance> findByAllocationId(Long allocationId);

    List<ServiceInstance> findByStatus(ServiceInstance.Status status);

    List<ServiceInstance> findByEurekaRegistered(Boolean eurekaRegistered);
}
