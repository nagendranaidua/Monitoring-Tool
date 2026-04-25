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
public class InstanceDto {

    private Long id;
    private Long allocationId;
    private Integer instanceIndex;
    private Integer port;
    private Integer pid;
    private String status;
    private Boolean eurekaRegistered;
    private String eurekaInstanceId;
    private String healthStatus;
    private LocalDateTime lastHealthCheck;
    private LocalDateTime startedAt;
    private LocalDateTime stoppedAt;
}
