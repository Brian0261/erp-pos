package com.erppos.backend.erp.security.application;

import com.erppos.backend.erp.security.adapter.security.ErpUserDetails;
import com.erppos.backend.erp.security.domain.SecurityUser;
import com.erppos.backend.erp.security.infrastructure.jwt.JwtTokenService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AuthApplicationService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenService jwtTokenService;

    public AuthApplicationService(AuthenticationManager authenticationManager, JwtTokenService jwtTokenService) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenService = jwtTokenService;
    }

    public AuthResult login(String usernameOrEmail, String password) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(usernameOrEmail, password)
            );
        } catch (BadCredentialsException ex) {
            throw new BadCredentialsException("Invalid credentials");
        }

        ErpUserDetails userDetails = (ErpUserDetails) authentication.getPrincipal();
        String token = jwtTokenService.generateToken(userDetails);
        return new AuthResult(token, jwtTokenService.extractExpiration(token), userDetails.toDomain());
    }

    public SecurityUser currentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof ErpUserDetails userDetails)) {
            throw new BadCredentialsException("Unauthorized");
        }
        return userDetails.toDomain();
    }
}

