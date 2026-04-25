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
public class SnapshotDto {

    private Long id;
    private String name;
    private String description;
    private Long applicationId;
    private String createdBy;
    private LocalDateTime createdAt;
    private int allocationCount;
}
