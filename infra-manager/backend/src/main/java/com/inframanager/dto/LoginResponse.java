package com.inframanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String token;

    @Builder.Default
    private String tokenType = "Bearer";

    private long expiresIn;

    private UserSummaryDto user;
}
