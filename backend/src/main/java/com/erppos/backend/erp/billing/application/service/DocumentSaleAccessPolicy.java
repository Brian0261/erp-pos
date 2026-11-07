package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.port.BillingSaleReadPort;
import com.erppos.backend.erp.security.domain.RoleName;
import org.springframework.stereotype.Component;

/** Shared resource check for document reads and writes, including combined CAJERO roles. */
@Component
public class DocumentSaleAccessPolicy {
    private final AuditUserProvider actor;
    private final BillingSaleReadPort sales;

    public DocumentSaleAccessPolicy(AuditUserProvider actor, BillingSaleReadPort sales) {
        this.actor = actor;
        this.sales = sales;
    }

    public void assertAccessible(ElectronicDocument document) {
        if (actor.hasRole(RoleName.CAJERO)) {
            sales.findById(document.saleId())
                    .orElseThrow(() -> new BillingNotFoundException("Electronic document not found"));
        }
    }
}
