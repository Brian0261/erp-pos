package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.security.adapter.security.ErpUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("billingAuditUserProvider")
public class AuditUserProvider {

    public java.util.UUID currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof ErpUserDetails userDetails) {
            return userDetails.getId();
        }
        return new java.util.UUID(0, 0);
    }

    public String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return "system";
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof ErpUserDetails userDetails) {
            return userDetails.getUsername();
        }
        return authentication.getName() == null ? "system" : authentication.getName();
    }
}

