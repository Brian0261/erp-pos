package com.erppos.backend.erp.security.adapter.security;

import com.erppos.backend.erp.shared.adapter.rest.ApiError;
import com.erppos.backend.erp.shared.adapter.rest.ErrorResponseFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;
    private final ErrorResponseFactory errorResponseFactory;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper, ErrorResponseFactory errorResponseFactory) {
        this.objectMapper = objectMapper;
        this.errorResponseFactory = errorResponseFactory;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException, ServletException {
        ApiError apiError = errorResponseFactory.build(request, HttpStatus.UNAUTHORIZED, "Unauthorized");
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), apiError);
    }
}

