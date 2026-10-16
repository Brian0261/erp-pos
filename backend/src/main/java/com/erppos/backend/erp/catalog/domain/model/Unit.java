package com.erppos.backend.erp.catalog.domain.model;
import com.erppos.backend.erp.shared.domain.policy.QuantityPolicy;
import java.time.Instant;
public record Unit(
        Long id,
        String code,
        String name,
        QuantityPolicy quantityPolicy,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
