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

    @NotBlank(message = "Machine name is required")
    @Size(max = 100, message = "Machine name must not exceed 100 characters")
    private String machineName;

    @Size(max = 100, message = "Alias must not exceed 100 characters")
    private String alias;

    @NotBlank(message = "IP address is required")
    @Size(max = 45, message = "IP address must not exceed 45 characters")
    private String ipAddress;

    @NotBlank(message = "Environment is required")
    @Size(max = 30, message = "Environment must not exceed 30 characters")
    private String environment;

    @Size(max = 10, message = "Availability zone must not exceed 10 characters")
    private String availabilityZone;

    @Size(max = 50, message = "Datacenter must not exceed 50 characters")
    private String datacenter;

    @Size(max = 30, message = "OS must not exceed 30 characters")
    private String os;

    private Boolean vmServer;

    @Size(max = 30, message = "VM type must not exceed 30 characters")
    private String vmType;

    @Size(max = 30, message = "OS version must not exceed 30 characters")
    private String osVersion;

    private Integer cpu;
    private String ram;
    private String disk;

    @Size(max = 50, message = "Usage role must not exceed 50 characters")
    private String usageRole;

    private Boolean isAppServer;

    @Size(max = 100, message = "SSH username must not exceed 100 characters")
    private String sshUsername;

    private String sshPassword;

    private Integer sshPort;

    private String remark;

    @Size(max = 200, message = "TADP hostname must not exceed 200 characters")
    private String tadpHostname;

    @Size(max = 100, message = "TADP ref must not exceed 100 characters")
    private String tadpRef;

    private String status;
}
