package com.erppos.backend.erp.purchases.infrastructure.persistence;

import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.purchases.domain.model.PurchaseProductSnapshot;
import com.erppos.backend.erp.purchases.domain.port.PurchaseProductReadPort;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component("purchaseCatalogProductReadAdapter")
public class CatalogProductReadAdapter implements PurchaseProductReadPort {

    private final ProductRepositoryPort productRepositoryPort;

    public CatalogProductReadAdapter(ProductRepositoryPort productRepositoryPort) {
        this.productRepositoryPort = productRepositoryPort;
    }

    @Override
    public Optional<PurchaseProductSnapshot> findById(Long productId) {
        return productRepositoryPort.findById(productId).map(this::toSnapshot);
    }

    private PurchaseProductSnapshot toSnapshot(Product product) {
        return new PurchaseProductSnapshot(product.id(), product.name(), product.active());
    }
}

