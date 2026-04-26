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

@Service
public class PosApplicationService implements PosUseCase {

    private final CatalogReadPort catalogReadPort;
    private final InventorySalesPort inventorySalesPort;

    public PosApplicationService(CatalogReadPort catalogReadPort, InventorySalesPort inventorySalesPort) {
        this.catalogReadPort = catalogReadPort;
        this.inventorySalesPort = inventorySalesPort;
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
        return catalogReadPort.searchByNameOrCode(query, 50)
                .stream()
                .map(product -> toView(product, inventorySalesPort.stockAvailable(product.id(), warehouseId)))
                .toList();
    }

    private PosProductView toView(PosProductSnapshot product, BigDecimal stock) {
        return new PosProductView(
                product.id(),
                product.sku(),
                product.barcode(),
                product.name(),
                product.salePrice(),
                stock
        );
    }
}

