package com.erppos.backend.erp.quotes.application.service;

import com.erppos.backend.erp.security.adapter.security.ErpUserDetails;
import com.erppos.backend.erp.security.domain.RoleName;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component("quotesAuditUserProvider")
public class AuditUserProvider {

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

    public Set<RoleName> currentRoles() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return Set.of();
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof ErpUserDetails userDetails) {
            return userDetails.getRoles();
        }
        return Set.of();
    }

    public boolean hasRole(RoleName roleName) {
        return currentRoles().contains(roleName);
    }
}

