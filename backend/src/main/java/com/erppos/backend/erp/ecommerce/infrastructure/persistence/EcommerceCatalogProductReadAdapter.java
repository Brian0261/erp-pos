package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.catalog.application.usecase.ProductUseCase;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceCatalogProductSnapshot;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceCatalogProductReadPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
@Transactional(readOnly = true)
public class EcommerceCatalogProductReadAdapter implements EcommerceCatalogProductReadPort {
    private final ProductUseCase productUseCase;

    public EcommerceCatalogProductReadAdapter(ProductUseCase productUseCase) {
        this.productUseCase = productUseCase;
    }

    @Override
    public Optional<EcommerceCatalogProductSnapshot> findById(Long productId) {
        try {
            return Optional.of(toSnapshot(productUseCase.getById(productId)));
        } catch (CatalogNotFoundException ex) {
            return Optional.empty();
        }
    }

    private EcommerceCatalogProductSnapshot toSnapshot(Product product) {
        return new EcommerceCatalogProductSnapshot(
                product.id(),
                product.sku(),
                product.name(),
                product.salePrice(),
                product.active()
        );
    }
}
