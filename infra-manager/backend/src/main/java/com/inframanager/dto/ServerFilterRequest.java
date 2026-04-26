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
    private String zone;
    private String software;
    private String osType;
    private String serverType;
    private String status;
}
