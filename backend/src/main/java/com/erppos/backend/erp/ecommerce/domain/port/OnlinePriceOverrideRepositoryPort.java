package com.erppos.backend.erp.ecommerce.domain.port;

import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;

import java.util.Optional;

public interface OnlinePriceOverrideRepositoryPort {
    OnlinePriceOverride save(OnlinePriceOverride override);
    Optional<OnlinePriceOverride> findActiveByProductOnlineProfileId(Long productOnlineProfileId);
}
