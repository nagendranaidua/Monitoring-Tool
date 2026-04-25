package com.inframanager.repository;

import com.inframanager.entity.Microservice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MicroserviceRepository extends JpaRepository<Microservice, Long> {

    List<Microservice> findByApplicationId(Long applicationId);

    List<Microservice> findByApplicationIdAndActiveTrue(Long applicationId);

    Optional<Microservice> findByEurekaServiceName(String eurekaServiceName);
}
