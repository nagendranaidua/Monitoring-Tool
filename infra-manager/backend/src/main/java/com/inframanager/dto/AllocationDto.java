package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllocationDto {

    private Long id;
    private Long serverId;
    private String serverAlias;
    private String serverIp;
    private Long serviceId;
    private String serviceName;
    private Integer plannedInstanceCount;
    private String deployPath;
    private Map<String, String> configOverrides;
    private String status;

    private List<InstanceDto> instances;
}
