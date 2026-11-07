package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.security.adapter.security.ErpUserDetails;
import com.erppos.backend.erp.security.domain.RoleName;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("billingAuditUserProvider")
public class AuditUserProvider {

    public boolean hasRole(RoleName role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof ErpUserDetails user
                && user.getRoles().contains(role);
    }

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

