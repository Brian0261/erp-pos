package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePriceOverride;
import com.erppos.backend.erp.ecommerce.domain.port.OnlinePriceOverrideRepositoryPort;
import com.erppos.backend.erp.ecommerce.infrastructure.mapper.OnlinePriceOverrideMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@Transactional(readOnly = true)
public class OnlinePriceOverridePersistenceAdapter implements OnlinePriceOverrideRepositoryPort {
    private final OnlinePriceOverrideJpaRepository priceOverrideJpaRepository;

    public OnlinePriceOverridePersistenceAdapter(OnlinePriceOverrideJpaRepository priceOverrideJpaRepository) {
        this.priceOverrideJpaRepository = priceOverrideJpaRepository;
    }

    @Override
    @Transactional
    public OnlinePriceOverride save(OnlinePriceOverride override) {
        OnlinePriceOverrideEntity entity = override.id() == null
                ? OnlinePriceOverrideMapper.toEntity(override)
                : priceOverrideJpaRepository.findById(override.id()).orElseThrow(() -> new EcommerceNotFoundException("Online price override not found"));
        if (override.id() != null) {
            OnlinePriceOverrideMapper.merge(entity, override);
        }
        return OnlinePriceOverrideMapper.toDomain(priceOverrideJpaRepository.saveAndFlush(entity));
    }

    @Override
    public Optional<OnlinePriceOverride> findActiveByProductOnlineProfileId(Long productOnlineProfileId) {
        return priceOverrideJpaRepository.findFirstByProductOnlineProfileIdAndActiveTrue(productOnlineProfileId)
                .map(OnlinePriceOverrideMapper::toDomain);
    }

    @Override
    public List<OnlinePriceOverride> findActiveByProductOnlineProfileIds(List<Long> productOnlineProfileIds) {
        if (productOnlineProfileIds == null || productOnlineProfileIds.isEmpty()) {
            return List.of();
        }
        return priceOverrideJpaRepository.findByProductOnlineProfileIdInAndActiveTrue(productOnlineProfileIds).stream()
                .map(OnlinePriceOverrideMapper::toDomain)
                .toList();
    }
}
