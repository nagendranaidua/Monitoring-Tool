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
    private String machineName;
    private String alias;
    private String ipAddress;
    private String environment;
    private String availabilityZone;
    private String datacenter;
    private String os;
    private Boolean vmServer;
    private String vmType;
    private String osVersion;
    private Integer cpu;
    private String ram;
    private String disk;
    private String usageRole;
    private Boolean isAppServer;
    private String sshUsername;
    private Integer sshPort;
    private String remark;
    private String tadpHostname;
    private String tadpRef;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<AllocationSummaryDto> allocatedServices;
}
