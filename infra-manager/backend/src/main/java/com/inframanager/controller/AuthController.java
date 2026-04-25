package com.inframanager.controller;

import com.inframanager.dto.LoginRequest;
import com.inframanager.dto.LoginResponse;
import com.inframanager.dto.UserDto;
import com.inframanager.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Principal principal) {
        UserDto user = authService.getCurrentUser(principal.getName());
        return ResponseEntity.ok(user);
    }
}
