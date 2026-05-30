package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceBrand;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceBrandRepositoryPort;
import com.erppos.backend.erp.ecommerce.infrastructure.mapper.EcommerceBrandMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
@Transactional(readOnly = true)
public class EcommerceBrandPersistenceAdapter implements EcommerceBrandRepositoryPort {
    private final EcommerceBrandJpaRepository brandJpaRepository;

    public EcommerceBrandPersistenceAdapter(EcommerceBrandJpaRepository brandJpaRepository) {
        this.brandJpaRepository = brandJpaRepository;
    }

    @Override
    @Transactional
    public EcommerceBrand save(EcommerceBrand brand) {
        EcommerceBrandEntity entity = brand.id() == null
                ? EcommerceBrandMapper.toEntity(brand)
                : brandJpaRepository.findById(brand.id()).orElseThrow(() -> new EcommerceNotFoundException("Brand not found"));
        if (brand.id() != null) {
            EcommerceBrandMapper.merge(entity, brand);
        }
        return EcommerceBrandMapper.toDomain(brandJpaRepository.saveAndFlush(entity));
    }

    @Override
    public Optional<EcommerceBrand> findById(Long id) {
        return brandJpaRepository.findById(id).map(EcommerceBrandMapper::toDomain);
    }

    @Override
    public Optional<EcommerceBrand> findBySlugIgnoreCase(String slug) {
        return brandJpaRepository.findBySlugIgnoreCase(slug).map(EcommerceBrandMapper::toDomain);
    }

    @Override
    public boolean existsBySlugIgnoreCase(String slug) {
        return brandJpaRepository.existsBySlugIgnoreCase(slug);
    }

    @Override
    public boolean existsByNameIgnoreCase(String name) {
        return brandJpaRepository.existsByNameIgnoreCase(name);
    }
}
