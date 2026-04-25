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
public class CreateMicroserviceRequest {

    @NotNull(message = "Application ID is required")
    private Long applicationId;

    @NotBlank(message = "Service name is required")
    @Size(max = 100, message = "Service name must not exceed 100 characters")
    private String name;

    private String description;

    @Size(max = 200, message = "JAR name must not exceed 200 characters")
    private String jarName;

    @Size(max = 30, message = "Version must not exceed 30 characters")
    private String version;

    @Size(max = 500, message = "Start script must not exceed 500 characters")
    private String startScript;

    @Size(max = 500, message = "Stop script must not exceed 500 characters")
    private String stopScript;

    @Size(max = 500, message = "Health check script must not exceed 500 characters")
    private String healthCheckScript;

    @Size(max = 100, message = "Eureka service name must not exceed 100 characters")
    private String eurekaServiceName;

    private Integer basePort;

    private Boolean active;
}
