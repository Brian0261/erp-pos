package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import com.erppos.backend.erp.billing.domain.port.CompanyBillingProfileRepositoryPort;
import com.erppos.backend.erp.billing.infrastructure.mapper.CompanyBillingProfileMapper;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CompanyBillingProfilePersistenceAdapter implements CompanyBillingProfileRepositoryPort {

    private final CompanyBillingProfileJpaRepository profileJpaRepository;

    public CompanyBillingProfilePersistenceAdapter(CompanyBillingProfileJpaRepository profileJpaRepository) {
        this.profileJpaRepository = profileJpaRepository;
    }

    @Override
    public CompanyBillingProfile save(CompanyBillingProfile profile) {
        CompanyBillingProfileEntity entity;
        if (profile.id() == null) {
            entity = CompanyBillingProfileMapper.toEntity(profile);
        } else {
            entity = profileJpaRepository.findById(profile.id()).orElseGet(CompanyBillingProfileEntity::new);
            CompanyBillingProfileMapper.merge(entity, profile);
        }
        return CompanyBillingProfileMapper.toDomain(profileJpaRepository.save(entity));
    }

    @Override
    public Optional<CompanyBillingProfile> findActiveByEnvironment(BillingEnvironment environment) {
        return profileJpaRepository.findByEnvironmentAndActiveTrue(environment).map(CompanyBillingProfileMapper::toDomain);
    }
}

