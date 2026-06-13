package com.erppos.backend.erp.ecommerce.infrastructure.storage;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceImageStoragePort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.ecommerce.image-storage", name = "provider", havingValue = "none", matchIfMissing = true)
public class DisabledEcommerceImageStorageAdapter implements EcommerceImageStoragePort {
    @Override
    public StoredEcommerceImage store(EcommerceImageStorageObject object) {
        throw new EcommerceBusinessRuleException("Ecommerce image storage is not configured");
    }
}
