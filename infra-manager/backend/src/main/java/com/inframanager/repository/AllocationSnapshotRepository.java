package com.inframanager.repository;

import com.inframanager.entity.AllocationSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AllocationSnapshotRepository extends JpaRepository<AllocationSnapshot, Long> {

    List<AllocationSnapshot> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}
