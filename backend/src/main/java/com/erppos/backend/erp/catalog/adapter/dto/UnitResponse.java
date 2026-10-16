package com.erppos.backend.erp.catalog.adapter.dto;
import com.erppos.backend.erp.shared.domain.policy.QuantityPolicy;
import java.time.Instant;
public record UnitResponse(
        Long id,
        String code,
        String name,
        QuantityPolicy quantityPolicy,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
