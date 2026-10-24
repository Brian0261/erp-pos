package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.sales.domain.model.SaleBillingSummary;
import com.erppos.backend.erp.sales.domain.port.SalesBillingSummaryReadPort;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class SalesBillingSummaryReadAdapter implements SalesBillingSummaryReadPort {

    private final ElectronicDocumentJpaRepository electronicDocumentJpaRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public SalesBillingSummaryReadAdapter(ElectronicDocumentJpaRepository electronicDocumentJpaRepository,org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.electronicDocumentJpaRepository = electronicDocumentJpaRepository;
        this.jdbc=jdbc;
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void lockDocumentsForSale(Long saleId) {
        jdbc.queryForList("select id from electronic_documents where sale_id=? order by id for update",saleId);
    }

    @Override
    public Map<Long, SaleBillingSummary> findLatestBySaleIds(Collection<Long> saleIds) {
        if (saleIds == null || saleIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, SaleBillingSummary> summaries = new LinkedHashMap<>();
        for (ElectronicDocumentSalesSummaryProjection row : electronicDocumentJpaRepository.findSalesSummariesBySaleIds(saleIds)) {
            Long saleId = row.getSaleId();
            if (saleId == null || summaries.containsKey(saleId)) {
                continue;
            }
            summaries.put(saleId, new SaleBillingSummary(
                    true,
                    row.getDocumentId(),
                    row.getDocumentType() != null ? row.getDocumentType().name() : null,
                    row.getFullNumber(),
                    row.getStatus() != null ? row.getStatus().name() : null,
                    row.getEnvironment() != null ? row.getEnvironment().name() : null
            ));
        }
        return summaries;
    }
}
