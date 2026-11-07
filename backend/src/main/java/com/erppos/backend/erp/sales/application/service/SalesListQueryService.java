package com.erppos.backend.erp.sales.application.service;

import com.erppos.backend.erp.sales.application.usecase.SalesListPage;
import com.erppos.backend.erp.sales.application.usecase.SalesListQuery;
import com.erppos.backend.erp.sales.application.usecase.SalesListQueryPort;
import com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException;
import com.erppos.backend.erp.security.domain.RoleName;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesListQueryService {
    private final SalesListQueryPort queryPort;
    private final AuditUserProvider actor;

    public SalesListQueryService(SalesListQueryPort queryPort, AuditUserProvider actor) {
        this.queryPort = queryPort;
        this.actor = actor;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ, timeout = 5)
    public SalesListPage list(SalesListQuery query) {
        String owner = effectiveOwner(query.createdBy());
        if (query.from() != null && query.to() != null && query.to().isBefore(query.from())) {
            throw new SalesBusinessRuleException("to must be >= from");
        }
        if (Boolean.FALSE.equals(query.hasElectronicDocument()) && query.documentStatus() != null) {
            throw new SalesBusinessRuleException("documentStatus requires an electronic document");
        }
        return queryPort.findPage(query, owner);
    }

    private String effectiveOwner(String requestedOwner) {
        var roles = actor.currentRoles();
        if (roles.contains(RoleName.CAJERO)) {
            String username = actor.currentUsername();
            if (username == null || username.isBlank()) {
                throw new AuthorizationDeniedException("Access denied");
            }
            return username;
        }
        if (roles.contains(RoleName.ADMIN) || roles.contains(RoleName.SUPERVISOR)) {
            return requestedOwner;
        }
        throw new AuthorizationDeniedException("Access denied");
    }
}
