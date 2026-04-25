package com.erppos.backend.erp.inventory.infrastructure.persistence;

import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.inventory.domain.model.InventoryProductSnapshot;
import com.erppos.backend.erp.inventory.domain.port.InventoryProductReadPort;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CatalogProductReadAdapter implements InventoryProductReadPort {

    private final ProductRepositoryPort productRepositoryPort;

    public CatalogProductReadAdapter(ProductRepositoryPort productRepositoryPort) {
        this.productRepositoryPort = productRepositoryPort;
    }

    @Override
    public Optional<InventoryProductSnapshot> findById(Long productId) {
        return productRepositoryPort.findById(productId).map(this::toSnapshot);
    }

    private InventoryProductSnapshot toSnapshot(Product product) {
        return new InventoryProductSnapshot(product.id(), product.name(), product.active());
    }
}

