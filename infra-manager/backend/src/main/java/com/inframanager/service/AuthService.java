package com.inframanager.service;

import com.inframanager.dto.LoginRequest;
import com.inframanager.dto.LoginResponse;
import com.inframanager.dto.UserDto;
import com.inframanager.dto.UserSummaryDto;
import com.inframanager.entity.User;
import com.inframanager.repository.UserRepository;
import com.inframanager.security.JwtTokenProvider;
import com.inframanager.security.UserPrincipal;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        boolean matches = encoder.matches("admin123", "$2a$10$u5IlQckc7R.lcZZ5rKRdKOcuDRET/D8kG9nrLxrP56fB.nYMVoqje");
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtTokenProvider.generateToken(userPrincipal);

        // Update last login
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        UserSummaryDto userSummary = UserSummaryDto.builder()
                .id(userPrincipal.getId())
                .username(userPrincipal.getUsername())
                .email(userPrincipal.getEmail())
                .role(userPrincipal.getRole().name())
                .build();

        log.info("User '{}' logged in successfully", request.getUsername());

        return LoginResponse.builder()
                .token(token)
                .expiresIn(jwtTokenProvider.getExpirationMs())
                .user(userSummary)
                .build();
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + username));
        return toDto(user);
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .active(user.getActive())
                .lastLogin(user.getLastLogin())
                .build();
    }
}
