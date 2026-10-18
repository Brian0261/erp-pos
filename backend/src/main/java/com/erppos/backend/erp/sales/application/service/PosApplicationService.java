package com.erppos.backend.erp.sales.application.service;

import com.erppos.backend.erp.sales.application.usecase.PosUseCase;
import com.erppos.backend.erp.sales.domain.exception.SalesNotFoundException;
import com.erppos.backend.erp.sales.domain.model.PosProductSnapshot;
import com.erppos.backend.erp.sales.domain.model.PosProductView;
import com.erppos.backend.erp.sales.domain.port.CatalogReadPort;
import com.erppos.backend.erp.sales.domain.port.InventorySalesPort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Stream;

@Service
public class PosApplicationService implements PosUseCase {

    private final CatalogReadPort catalogReadPort;
    private final InventorySalesPort inventorySalesPort;
    private final com.erppos.backend.erp.sales.domain.port.CheckoutReadPort checkoutReadPort;

    public PosApplicationService(CatalogReadPort catalogReadPort, InventorySalesPort inventorySalesPort,
            com.erppos.backend.erp.sales.domain.port.CheckoutReadPort checkoutReadPort) {
        this.catalogReadPort = catalogReadPort;
        this.inventorySalesPort = inventorySalesPort;
        this.checkoutReadPort = checkoutReadPort;
    }

    @Override
    public PosProductView lookupByCode(String code, Long warehouseId) {
        PosProductSnapshot product = catalogReadPort.lookupByCode(code)
                .orElseThrow(() -> new SalesNotFoundException("Product not found"));
        BigDecimal stock = inventorySalesPort.stockAvailable(product.id(), warehouseId);
        return toView(product, stock);
    }

    @Override
    public List<PosProductView> search(String query, Long warehouseId) {
        List<PosProductView> results = catalogReadPort.searchByNameOrCode(query, 25)
                .stream()
                .map(product -> toView(product, inventorySalesPort.stockAvailable(product.id(), warehouseId)))
                .toList();

        return Stream.concat(
                        results.stream().filter(view -> view.stockAvailable().compareTo(BigDecimal.ZERO) > 0),
                        results.stream().filter(view -> view.stockAvailable().compareTo(BigDecimal.ZERO) <= 0)
                )
                .toList();
    }

    private PosProductView toView(PosProductSnapshot product, BigDecimal stock) {
        return new PosProductView(
                product.id(),
                product.sku(),
                product.barcode(),
                product.name(),
                product.salePrice(),
                product.quantityPolicy(),
                stock
        );
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<PosProductView> snapshot(List<Long> ids, Long warehouseId) {
        if (warehouseId == null || ids == null || ids.isEmpty() || ids.size() > 200 || ids.stream().anyMatch(id -> id == null || id <= 0))
            throw new com.erppos.backend.erp.sales.domain.exception.SalesBusinessRuleException("Provide warehouseId and 1..200 productIds");
        return checkoutReadPort.snapshot(ids.stream().distinct().sorted().toList(), warehouseId);
    }
}

