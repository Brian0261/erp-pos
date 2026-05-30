package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceOnlineCategory;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceOnlineCategoryRepositoryPort;
import com.erppos.backend.erp.ecommerce.infrastructure.mapper.EcommerceOnlineCategoryMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
@Transactional(readOnly = true)
public class EcommerceOnlineCategoryPersistenceAdapter implements EcommerceOnlineCategoryRepositoryPort {
    private final EcommerceOnlineCategoryJpaRepository categoryJpaRepository;

    public EcommerceOnlineCategoryPersistenceAdapter(EcommerceOnlineCategoryJpaRepository categoryJpaRepository) {
        this.categoryJpaRepository = categoryJpaRepository;
    }

    @Override
    @Transactional
    public EcommerceOnlineCategory save(EcommerceOnlineCategory category) {
        EcommerceOnlineCategoryEntity entity = category.id() == null
                ? EcommerceOnlineCategoryMapper.toEntity(category)
                : categoryJpaRepository.findById(category.id()).orElseThrow(() -> new EcommerceNotFoundException("Online category not found"));
        if (category.id() != null) {
            EcommerceOnlineCategoryMapper.merge(entity, category);
        }
        return EcommerceOnlineCategoryMapper.toDomain(categoryJpaRepository.saveAndFlush(entity));
    }

    @Override
    public Optional<EcommerceOnlineCategory> findById(Long id) {
        return categoryJpaRepository.findById(id).map(EcommerceOnlineCategoryMapper::toDomain);
    }

    @Override
    public Optional<EcommerceOnlineCategory> findBySlugIgnoreCase(String slug) {
        return categoryJpaRepository.findBySlugIgnoreCase(slug).map(EcommerceOnlineCategoryMapper::toDomain);
    }

    @Override
    public boolean existsBySlugIgnoreCase(String slug) {
        return categoryJpaRepository.existsBySlugIgnoreCase(slug);
    }
}
