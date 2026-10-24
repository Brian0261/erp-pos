package com.erppos.backend.erp.sales.adapter.rest;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Covers recovery success and authentication/error responses alike. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE+20)
public class SaleOperationCacheControlFilter extends OncePerRequestFilter {
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        if(request.getRequestURI().startsWith("/api/v1/sales/operations"))response.setHeader("Cache-Control","no-store");
        chain.doFilter(request,response);
    }
}
