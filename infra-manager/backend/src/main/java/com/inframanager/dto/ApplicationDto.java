package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationDto {

    private Long id;
    private String name;
    private String description;
    private String eurekaUrl;
    private Boolean eurekaEnabled;
    private Boolean active;
    private int serverCount;
    private int activeServiceCount;
    private LocalDateTime createdAt;
}
