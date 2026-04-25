package com.inframanager.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoveInstanceRequest {

    @NotNull(message = "Target server ID is required")
    private Long targetServerId;

    private Integer targetPort;

    @Builder.Default
    private boolean stopOnSource = true;

    @Builder.Default
    private boolean startOnTarget = true;
}
