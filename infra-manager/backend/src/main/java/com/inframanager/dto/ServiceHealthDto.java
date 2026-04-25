package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceHealthDto {

    private Long allocationId;
    private String serviceName;
    private Integer instanceIndex;
    private Integer port;
    private String status;
    private Integer pid;
    private boolean portListening;
    private Long uptimeSeconds;
}
