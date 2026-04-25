package com.erppos.backend.erp.shared.adapter.rest;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class ErrorResponseFactory {

    public static final String TRACE_ID_ATTRIBUTE = "traceId";

    public ApiError build(HttpServletRequest request, HttpStatus status, String message) {
        String traceId = (String) request.getAttribute(TRACE_ID_ATTRIBUTE);
        return new ApiError(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI(),
                traceId == null ? "N/A" : traceId
        );
    }
}

