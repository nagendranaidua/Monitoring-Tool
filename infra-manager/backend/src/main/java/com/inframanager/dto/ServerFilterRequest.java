package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServerFilterRequest {

    private String environment;
    private String datacenter;
    private String availabilityZone;
    private String usageRole;
    private String os;
    private String vmType;
    private String status;
}
