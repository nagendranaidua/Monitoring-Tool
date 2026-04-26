package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServerDto {

    private Long id;
    private Long applicationId;
    private String serverName;
    private String alias;
    private String ipAddress;
    private String environment;
    private String datacenter;
    private String zone;
    private String osType;
    private String osVersion;
    private String serverType;
    private Integer cpuCount;
    private Integer cpuCores;
    private Integer ramGb;
    private String diskSize;
    private String software;
    private String sshUsername;
    private Integer sshPort;
    private String remarks;
    private String tadpHostname;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<AllocationSummaryDto> allocatedServices;
}
