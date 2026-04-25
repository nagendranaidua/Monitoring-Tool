package com.inframanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateApplicationRequest {

    @NotBlank(message = "Application name is required")
    @Size(max = 100, message = "Application name must not exceed 100 characters")
    private String name;

    private String description;

    @Size(max = 500, message = "Eureka URL must not exceed 500 characters")
    private String eurekaUrl;

    private Boolean eurekaEnabled;
}
