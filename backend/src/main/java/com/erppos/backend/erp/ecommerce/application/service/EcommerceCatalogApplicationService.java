package com.erppos.backend.erp.ecommerce.application.service;

import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.application.usecase.EcommerceCatalogUseCase;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceBusinessRuleException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceConflictException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceCatalogProductReadPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import org.springframework.stereotype.Service;

@Service
public class EcommerceCatalogApplicationService implements EcommerceCatalogUseCase {
    private final ProductOnlineProfileRepositoryPort profileRepositoryPort;
    private final EcommerceCatalogProductReadPort productReadPort;
    private final AuditUserProvider auditUserProvider;

    public EcommerceCatalogApplicationService(
            ProductOnlineProfileRepositoryPort profileRepositoryPort,
            EcommerceCatalogProductReadPort productReadPort,
            AuditUserProvider auditUserProvider
    ) {
        this.profileRepositoryPort = profileRepositoryPort;
        this.productReadPort = productReadPort;
        this.auditUserProvider = auditUserProvider;
    }

    @Override
    public ProductOnlineProfile createDraftProfile(CreateProductOnlineProfileCommand command) {
        if (command.productId() == null) {
            throw new EcommerceBusinessRuleException("Product id is required");
        }
        productReadPort.findById(command.productId())
                .orElseThrow(() -> new EcommerceNotFoundException("Product not found"));
        if (profileRepositoryPort.existsByProductId(command.productId())) {
            throw new EcommerceConflictException("Product online profile already exists");
        }
        String actor = auditUserProvider.currentUsername();
        ProductOnlineProfile profile = new ProductOnlineProfile(
                null,
                command.productId(),
                OnlinePublicationStatus.DRAFT,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0L,
                null,
                null,
                actor,
                actor
        );
        return profileRepositoryPort.save(profile);
    }

    @Override
    public ProductOnlineProfile getProfileByProductId(Long productId) {
        return profileRepositoryPort.findByProductId(productId)
                .orElseThrow(() -> new EcommerceNotFoundException("Product online profile not found"));
    }
}
