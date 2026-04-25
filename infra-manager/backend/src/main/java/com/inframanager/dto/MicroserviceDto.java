package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MicroserviceDto {

    private Long id;
    private Long applicationId;
    private String name;
    private String description;
    private String jarName;
    private String version;
    private String startScript;
    private String stopScript;
    private String healthCheckScript;
    private String eurekaServiceName;
    private Integer basePort;
    private Boolean active;

    private List<AllocationSummaryDto> allocations;
}
