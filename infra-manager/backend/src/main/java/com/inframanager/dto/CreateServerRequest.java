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
public class CreateServerRequest {

    @NotNull(message = "Application ID is required")
    private Long applicationId;

    @NotBlank(message = "Server name is required")
    @Size(max = 200, message = "Server name must not exceed 200 characters")
    private String serverName;

    @Size(max = 100, message = "Alias must not exceed 100 characters")
    private String alias;

    @NotBlank(message = "IP address is required")
    @Size(max = 45, message = "IP address must not exceed 45 characters")
    private String ipAddress;

    @NotBlank(message = "Environment is required")
    @Size(max = 50, message = "Environment must not exceed 50 characters")
    private String environment;

    @Size(max = 100, message = "Datacenter must not exceed 100 characters")
    private String datacenter;

    @Size(max = 10, message = "Zone must not exceed 10 characters")
    private String zone;

    @Size(max = 30, message = "OS type must not exceed 30 characters")
    private String osType;

    @Size(max = 30, message = "OS version must not exceed 30 characters")
    private String osVersion;

    @Size(max = 100, message = "Server type must not exceed 100 characters")
    private String serverType;

    private Integer cpuCount;
    private Integer cpuCores;
    private Integer ramGb;

    @Size(max = 50, message = "Disk size must not exceed 50 characters")
    private String diskSize;

    @Size(max = 100, message = "Software must not exceed 100 characters")
    private String software;

    @Size(max = 100, message = "SSH username must not exceed 100 characters")
    private String sshUsername;

    private String sshPassword;

    private Integer sshPort;

    private String remarks;

    @Size(max = 200, message = "TADP hostname must not exceed 200 characters")
    private String tadpHostname;

    private String status;
}
