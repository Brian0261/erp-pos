package com.erppos.backend.erp.ecommerce.adapter.rest.storefront;

import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicAvailabilityResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicBrandSummaryResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicCategorySummaryResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicImageResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicPageResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicPriceResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicProductListItemResponse;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductListItemResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductPageResult;
import com.erppos.backend.erp.ecommerce.application.usecase.StorefrontProductCatalogUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/v1/storefront/catalog")
public class StorefrontCatalogController {

    private final StorefrontProductCatalogUseCase storefrontProductCatalogUseCase;

    public StorefrontCatalogController(StorefrontProductCatalogUseCase storefrontProductCatalogUseCase) {
        this.storefrontProductCatalogUseCase = storefrontProductCatalogUseCase;
    }

    @GetMapping("/products")
    public PublicPageResponse<PublicProductListItemResponse> listProducts(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "sort", defaultValue = "name_asc") String sort
    ) {
        StorefrontProductPageResult pageResult = storefrontProductCatalogUseCase.listPublishedProducts(page, size, sort);

        return new PublicPageResponse<>(
                pageResult.items().stream().map(this::toPublicItem).toList(),
                pageResult.page(),
                pageResult.size(),
                pageResult.totalItems(),
                pageResult.totalPages()
        );
    }

    private PublicProductListItemResponse toPublicItem(StorefrontProductListItemResult item) {
        PublicImageResponse image = item.primaryImage() == null
                ? null
                : new PublicImageResponse(
                item.primaryImage().url(),
                item.primaryImage().altText(),
                item.primaryImage().type(),
                item.primaryImage().displayOrder()
        );

        PublicCategorySummaryResponse category = item.category() == null
                ? null
                : new PublicCategorySummaryResponse(item.category().slug(), item.category().name());

        PublicBrandSummaryResponse brand = item.brand() == null
                ? null
                : new PublicBrandSummaryResponse(item.brand().slug(), item.brand().name());

        return new PublicProductListItemResponse(
                item.slug(),
                item.name(),
                item.shortDescription(),
                image,
                new PublicPriceResponse(item.price().amount(), item.price().currency(), item.price().formatted()),
                new PublicAvailabilityResponse(item.availability().status(), item.availability().label(), item.availability().purchasable()),
                category,
                brand
        );
    }
}
