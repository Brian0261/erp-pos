package com.erppos.backend.erp.shared.adapter.rest;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class TraceIdFilter extends OncePerRequestFilter {

    public static final String TRACE_ID_HEADER = "X-Trace-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String traceId = UUID.randomUUID().toString();
        request.setAttribute(ErrorResponseFactory.TRACE_ID_ATTRIBUTE, traceId);
        response.setHeader(TRACE_ID_HEADER, traceId);
        MDC.put(ErrorResponseFactory.TRACE_ID_ATTRIBUTE, traceId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(ErrorResponseFactory.TRACE_ID_ATTRIBUTE);
        }
    }
}

