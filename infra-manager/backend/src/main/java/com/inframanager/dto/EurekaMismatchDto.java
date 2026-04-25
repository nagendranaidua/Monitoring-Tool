package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EurekaMismatchDto {

    public enum MismatchType {
        CONFIGURED_NOT_REGISTERED,
        REGISTERED_NOT_CONFIGURED,
        INSTANCE_COUNT_MISMATCH
    }

    private MismatchType type;
    private String serviceName;
    private String serverAlias;
    private Long serverId;
    private int expected;
    private int actual;
    private String suggestion;
    private Map<String, Object> eurekaDetails;
}
