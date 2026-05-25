package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import com.erppos.backend.erp.billing.domain.port.BillingSeriesRepositoryPort;
import com.erppos.backend.erp.billing.infrastructure.mapper.BillingSeriesMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class BillingSeriesPersistenceAdapter implements BillingSeriesRepositoryPort {

    private final BillingSeriesJpaRepository seriesJpaRepository;

    public BillingSeriesPersistenceAdapter(BillingSeriesJpaRepository seriesJpaRepository) {
        this.seriesJpaRepository = seriesJpaRepository;
    }

    @Override
    public BillingSeries save(BillingSeries series) {
        BillingSeriesEntity entity;
        if (series.id() == null) {
            entity = BillingSeriesMapper.toEntity(series);
        } else {
            entity = seriesJpaRepository.findById(series.id()).orElseGet(BillingSeriesEntity::new);
            BillingSeriesMapper.merge(entity, series);
        }
        return BillingSeriesMapper.toDomain(seriesJpaRepository.save(entity));
    }

    @Override
    public Optional<BillingSeries> findById(Long id) {
        return seriesJpaRepository.findById(id).map(BillingSeriesMapper::toDomain);
    }

    @Override
    public Optional<BillingSeries> findByIdForUpdate(Long id) {
        return seriesJpaRepository.findByIdForUpdate(id).map(BillingSeriesMapper::toDomain);
    }

    @Override
    public List<BillingSeries> findAll() {
        return seriesJpaRepository.findAll().stream().map(BillingSeriesMapper::toDomain).toList();
    }

    @Override
    public boolean existsByDocumentTypeAndSeriesAndEnvironment(ElectronicDocumentType type, String series, BillingEnvironment environment, Long excludeId) {
        return seriesJpaRepository.existsByTypeSeriesEnvironment(type, series, environment, excludeId);
    }

    @Override
    public boolean existsActiveByDocumentTypeAndEnvironment(ElectronicDocumentType type, BillingEnvironment environment, Long excludeId) {
        return seriesJpaRepository.existsActiveByTypeAndEnvironment(type, environment, excludeId);
    }
}

