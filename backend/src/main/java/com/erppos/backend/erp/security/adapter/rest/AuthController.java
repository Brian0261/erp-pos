package com.erppos.backend.erp.security.adapter.rest;

import com.erppos.backend.erp.security.application.AuthApplicationService;
import com.erppos.backend.erp.security.application.AuthResult;
import com.erppos.backend.erp.security.domain.SecurityUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthApplicationService authApplicationService;

    public AuthController(AuthApplicationService authApplicationService) {
        this.authApplicationService = authApplicationService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResult result = authApplicationService.login(request.usernameOrEmail(), request.password());
        return ResponseEntity.ok(new LoginResponse(
                "Bearer",
                result.accessToken(),
                result.expiresAt(),
                toUserResponse(result.user())
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<UserMeResponse> me(Authentication authentication) {
        SecurityUser currentUser = authApplicationService.currentUser(authentication);
        return ResponseEntity.ok(toUserResponse(currentUser));
    }

    private UserMeResponse toUserResponse(SecurityUser user) {
        return new UserMeResponse(
                user.id(),
                user.username(),
                user.email(),
                user.roles().stream().map(Enum::name).collect(Collectors.toSet())
        );
    }
}

