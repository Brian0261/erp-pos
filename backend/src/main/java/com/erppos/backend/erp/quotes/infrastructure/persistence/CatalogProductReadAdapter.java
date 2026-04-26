package com.erppos.backend.erp.quotes.infrastructure.persistence;

import com.erppos.backend.erp.catalog.application.usecase.ProductUseCase;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.quotes.domain.model.QuoteProductSnapshot;
import com.erppos.backend.erp.quotes.domain.port.QuoteCatalogReadPort;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component("quotesCatalogProductReadAdapter")
public class CatalogProductReadAdapter implements QuoteCatalogReadPort {

    private final ProductUseCase productUseCase;

    public CatalogProductReadAdapter(ProductUseCase productUseCase) {
        this.productUseCase = productUseCase;
    }

    @Override
    public Optional<QuoteProductSnapshot> findById(Long productId) {
        try {
            Product product = productUseCase.getById(productId);
            return Optional.of(new QuoteProductSnapshot(
                    product.id(),
                    product.sku(),
                    product.barcode(),
                    product.name(),
                    product.salePrice(),
                    product.active()
            ));
        } catch (CatalogNotFoundException ex) {
            return Optional.empty();
        }
    }
}

