package com.erppos.backend.erp.billing.infrastructure.mapper;

import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import com.erppos.backend.erp.billing.infrastructure.persistence.CompanyBillingProfileEntity;

public final class CompanyBillingProfileMapper {
    private CompanyBillingProfileMapper() {
    }

    public static CompanyBillingProfile toDomain(CompanyBillingProfileEntity entity) {
        return new CompanyBillingProfile(
                entity.getId(),
                entity.getRuc(),
                entity.getLegalName(),
                entity.getFiscalAddress(),
                entity.getEnvironment(),
                entity.getCertificatePath(),
                entity.getCertificatePassword(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }

    public static CompanyBillingProfileEntity toEntity(CompanyBillingProfile profile) {
        CompanyBillingProfileEntity entity = new CompanyBillingProfileEntity();
        merge(entity, profile);
        return entity;
    }

    public static void merge(CompanyBillingProfileEntity entity, CompanyBillingProfile profile) {
        entity.setRuc(profile.ruc());
        entity.setLegalName(profile.legalName());
        entity.setFiscalAddress(profile.fiscalAddress());
        entity.setEnvironment(profile.environment());
        entity.setCertificatePath(profile.certificatePath());
        entity.setCertificatePassword(profile.certificatePassword());
        entity.setActive(profile.active());
        entity.setCreatedBy(profile.createdBy());
        entity.setUpdatedBy(profile.updatedBy());
    }
}

