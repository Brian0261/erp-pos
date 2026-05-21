package com.erppos.backend.erp.sales.infrastructure.persistence;

import com.erppos.backend.erp.catalog.application.usecase.ProductUseCase;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.sales.domain.model.PosProductSnapshot;
import com.erppos.backend.erp.sales.domain.port.CatalogReadPort;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class CatalogReadAdapter implements CatalogReadPort {

    private final ProductUseCase productUseCase;

    public CatalogReadAdapter(ProductUseCase productUseCase) {
        this.productUseCase = productUseCase;
    }

    @Override
    public Optional<PosProductSnapshot> findById(Long productId) {
        try {
            Product product = productUseCase.getById(productId);
            return Optional.of(toSnapshot(product));
        } catch (CatalogNotFoundException ex) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<PosProductSnapshot> lookupByCode(String code) {
        String normalized = code == null ? "" : code.trim();
        if (normalized.isEmpty()) {
            return Optional.empty();
        }

        return productUseCase.lookup(normalized, true, 25).stream()
                .filter(p -> p.sku().equalsIgnoreCase(normalized)
                        || (p.barcode() != null && p.barcode().equalsIgnoreCase(normalized)))
                .findFirst()
                .map(this::toSnapshot);
    }

    @Override
    public List<PosProductSnapshot> searchByNameOrCode(String query, int limit) {
        String normalized = normalizeQuery(query);
        if (normalized.isEmpty()) {
            return List.of();
        }
        int resolvedLimit = Math.min(Math.max(limit, 1), 25);
        return productUseCase.lookup(normalized, true, resolvedLimit).stream()
                .map(this::toSnapshot)
                .toList();
    }

    private String normalizeQuery(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private PosProductSnapshot toSnapshot(Product product) {
        return new PosProductSnapshot(
                product.id(),
                product.sku(),
                product.barcode(),
                product.name(),
                product.salePrice(),
                product.active()
        );
    }
}

