package com.erppos.backend.erp.ecommerce.adapter.rest.storefront;

import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicAvailabilityResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicBrandSummaryResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicCategorySummaryResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicImageResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicPageResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicProductDetailResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicPriceResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicProductListItemResponse;
import com.erppos.backend.erp.ecommerce.adapter.dto.storefront.PublicSeoResponse;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductDetailResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontImageResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontCategorySummaryResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontBrandSummaryResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductListItemResult;
import com.erppos.backend.erp.ecommerce.application.dto.storefront.StorefrontProductPageResult;
import com.erppos.backend.erp.ecommerce.application.usecase.StorefrontProductCatalogUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

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

    @GetMapping("/products/{slug}")
    public PublicProductDetailResponse getProductBySlug(@PathVariable("slug") String slug) {
        StorefrontProductDetailResult detail = storefrontProductCatalogUseCase.getPublishedProductBySlug(slug);
        return toPublicDetail(detail);
    }

    private PublicProductListItemResponse toPublicItem(StorefrontProductListItemResult item) {
        PublicImageResponse image = toPublicImage(item.primaryImage());
        PublicCategorySummaryResponse category = toPublicCategory(item.category());
        PublicBrandSummaryResponse brand = toPublicBrand(item.brand());

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

    private PublicProductDetailResponse toPublicDetail(StorefrontProductDetailResult detail) {
        List<PublicImageResponse> gallery = detail.gallery() == null
                ? List.of()
                : detail.gallery().stream().map(this::toPublicImage).toList();

        PublicSeoResponse seo = detail.seo() == null
                ? null
                : new PublicSeoResponse(
                detail.seo().title(),
                detail.seo().description(),
                detail.seo().canonicalUrl(),
                detail.seo().robots(),
                detail.seo().ogTitle(),
                detail.seo().ogDescription(),
                detail.seo().ogImageUrl(),
                detail.seo().indexable()
        );

        return new PublicProductDetailResponse(
                detail.slug(),
                detail.name(),
                detail.description(),
                toPublicImage(detail.primaryImage()),
                gallery,
                new PublicPriceResponse(detail.price().amount(), detail.price().currency(), detail.price().formatted()),
                new PublicAvailabilityResponse(detail.availability().status(), detail.availability().label(), detail.availability().purchasable()),
                toPublicCategory(detail.category()),
                toPublicBrand(detail.brand()),
                seo,
                detail.canonicalUrl(),
                detail.indexable()
        );
    }

    private PublicImageResponse toPublicImage(StorefrontImageResult image) {
        if (image == null) {
            return null;
        }
        return new PublicImageResponse(
                image.url(),
                image.altText(),
                image.type(),
                image.displayOrder()
        );
    }

    private PublicCategorySummaryResponse toPublicCategory(StorefrontCategorySummaryResult category) {
        if (category == null) {
            return null;
        }
        return new PublicCategorySummaryResponse(category.slug(), category.name());
    }

    private PublicBrandSummaryResponse toPublicBrand(StorefrontBrandSummaryResult brand) {
        if (brand == null) {
            return null;
        }
        return new PublicBrandSummaryResponse(brand.slug(), brand.name());
    }
}
