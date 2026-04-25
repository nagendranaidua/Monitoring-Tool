package com.inframanager.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAllocationRequest {

    @NotNull(message = "Server ID is required")
    private Long serverId;

    @NotNull(message = "Service ID is required")
    private Long serviceId;

    @Min(value = 1, message = "Planned instance count must be at least 1")
    private Integer plannedInstanceCount;

    private String deployPath;

    private Map<String, String> configOverrides;
}
