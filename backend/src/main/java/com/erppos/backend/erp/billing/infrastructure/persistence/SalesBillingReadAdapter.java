package com.erppos.backend.erp.billing.infrastructure.persistence;

import com.erppos.backend.erp.billing.domain.model.BillingSaleItemSnapshot;
import com.erppos.backend.erp.billing.domain.model.BillingSaleSnapshot;
import com.erppos.backend.erp.billing.domain.port.BillingSaleReadPort;
import com.erppos.backend.erp.sales.application.usecase.SalesUseCase;
import com.erppos.backend.erp.sales.domain.exception.SalesNotFoundException;
import com.erppos.backend.erp.sales.domain.model.PosProductSnapshot;
import com.erppos.backend.erp.sales.domain.model.Sale;
import com.erppos.backend.erp.sales.domain.model.SaleItem;
import com.erppos.backend.erp.sales.domain.port.CatalogReadPort;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class SalesBillingReadAdapter implements BillingSaleReadPort {

    private final SalesUseCase salesUseCase;
    private final CatalogReadPort catalogReadPort;

    public SalesBillingReadAdapter(SalesUseCase salesUseCase, CatalogReadPort catalogReadPort) {
        this.salesUseCase = salesUseCase;
        this.catalogReadPort = catalogReadPort;
    }

    @Override
    public Optional<BillingSaleSnapshot> findById(Long saleId) {
        try {
            Sale sale = salesUseCase.getById(saleId);
            return Optional.of(new BillingSaleSnapshot(
                    sale.id(),
                    sale.warehouseId(),
                    sale.saleNumber(),
                    sale.status().name(),
                    sale.subtotalAmount(),
                    sale.discountAmount(),
                    sale.totalAmount(),
                    sale.soldAt(),
                    sale.createdBy(),
                    sale.items().stream().map(this::toSnapshotItem).toList()
            ));
        } catch (SalesNotFoundException ex) {
            return Optional.empty();
        }
    }

    private BillingSaleItemSnapshot toSnapshotItem(SaleItem item) {
        PosProductSnapshot product = catalogReadPort.findById(item.productId()).orElse(null);
        return new BillingSaleItemSnapshot(
                item.productId(),
                product != null ? product.name() : null,
                product != null ? product.sku() : null,
                product != null ? product.barcode() : null,
                item.quantity(),
                item.unitPrice(),
                item.discountAmount(),
                item.lineTotal()
        );
    }
}

