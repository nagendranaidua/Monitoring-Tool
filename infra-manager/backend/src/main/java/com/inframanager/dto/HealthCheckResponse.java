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
public class HealthCheckResponse {

    private Long serverId;
    private String serverAlias;
    private LocalDateTime checkedAt;
    private boolean reachable;
    private SystemInfo system;
    private List<ServiceHealthDto> services;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemInfo {
        private double cpuUsagePercent;
        private long memoryUsedMB;
        private long memoryTotalMB;
        private double diskUsedPercent;
        private String uptime;
    }
}
