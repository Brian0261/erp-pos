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

    public SalesBillingSummaryReadAdapter(ElectronicDocumentJpaRepository electronicDocumentJpaRepository) {
        this.electronicDocumentJpaRepository = electronicDocumentJpaRepository;
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
