package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllocationSummaryDto {

    private Long allocationId;
    private Long serviceId;
    private String serviceName;
    private Long serverId;
    private String serverAlias;
    private String status;
    private int runningInstances;
    private int totalInstances;
}
