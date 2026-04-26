package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyBillingProfileJpaRepository extends JpaRepository<CompanyBillingProfileEntity, Long> {
    Optional<CompanyBillingProfileEntity> findByEnvironmentAndActiveTrue(BillingEnvironment environment);
}

