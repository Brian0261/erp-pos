package com.erppos.backend.erp.ecommerce.adapter.rest.storefront;

import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicSitemapEntryResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicSitemapResponse;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontSitemapEntryResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontSitemapResult;
import com.erppos.backend.erp.ecommerce.application.usecase.StorefrontProductCatalogUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/storefront/seo")
public class StorefrontSeoController {

    private final StorefrontProductCatalogUseCase storefrontProductCatalogUseCase;

    public StorefrontSeoController(StorefrontProductCatalogUseCase storefrontProductCatalogUseCase) {
        this.storefrontProductCatalogUseCase = storefrontProductCatalogUseCase;
    }

    @GetMapping("/sitemap")
    public PublicSitemapResponse getSitemap() {
        StorefrontSitemapResult result = storefrontProductCatalogUseCase.getPublicSitemap();
        return new PublicSitemapResponse(
                result.generatedAt(),
                result.entries().stream().map(this::toPublicEntry).toList(),
                result.totalEntries()
        );
    }

    private PublicSitemapEntryResponse toPublicEntry(StorefrontSitemapEntryResult item) {
        return new PublicSitemapEntryResponse(
                item.loc(),
                item.type(),
                item.lastModified()
        );
    }
}
