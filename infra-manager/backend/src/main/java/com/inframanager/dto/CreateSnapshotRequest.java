package com.inframanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSnapshotRequest {

    @NotBlank(message = "Snapshot name is required")
    @Size(max = 100, message = "Snapshot name must not exceed 100 characters")
    private String name;

    private String description;

    @NotNull(message = "Application ID is required")
    private Long applicationId;
}
