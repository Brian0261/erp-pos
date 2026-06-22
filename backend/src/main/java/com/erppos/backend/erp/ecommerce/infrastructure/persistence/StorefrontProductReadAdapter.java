package com.erppos.backend.erp.ecommerce.infrastructure.persistence;

import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicCategoryProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicCategoryDetailProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductDetailProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontPublicProductProjection.ResponsiveImageVariantProjection;
import com.erppos.backend.erp.ecommerce.domain.model.StorefrontSitemapEntryProjection;
import com.erppos.backend.erp.ecommerce.domain.port.StorefrontProductReadPort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class StorefrontProductReadAdapter implements StorefrontProductReadPort {

    private final JdbcTemplate jdbcTemplate;

    public StorefrontProductReadAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Page<StorefrontPublicProductProjection> findPublishedProducts(Pageable pageable, String categorySlug) {
        long total = countPublishedProducts(categorySlug);
        if (total == 0) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        Instant now = Instant.now();
        String categoryFilter = categorySlug == null ? "" : "  and c.slug = ?\n";
        Object[] args = categorySlug == null
                ? new Object[]{Timestamp.from(now), Timestamp.from(now), pageable.getPageSize(), pageable.getOffset()}
                : new Object[]{Timestamp.from(now), Timestamp.from(now), categorySlug, pageable.getPageSize(), pageable.getOffset()};

        List<StorefrontPublicProductProjection> items = jdbcTemplate.query(
                """
                        select
                            pop.slug,
                            coalesce(nullif(pop.online_name, ''), p.name) as public_name,
                            pop.online_description as short_description,
                            coalesce(ov.amount, p.sale_price) as effective_price_amount,
                            coalesce(ov.currency, 'PEN') as effective_price_currency,
                            pa.product_asset_id as primary_image_asset_id,
                            pa.asset_url as primary_image_url,
                            pa.alt_text as primary_image_alt_text,
                            pa.asset_type as primary_image_type,
                            pa.display_order as primary_image_display_order,
                            c.slug as category_slug,
                            c.name as category_name,
                            b.slug as brand_slug,
                            b.name as brand_name
                        from ecommerce_product_online_profiles pop
                        join products p on p.id = pop.product_id
                        left join ecommerce_online_categories c
                               on c.id = pop.online_category_id and c.active = true
                        left join ecommerce_brands b
                               on b.id = pop.brand_id and b.active = true
                        left join lateral (
                            select
                                pa.id as product_asset_id,
                                coalesce(nullif(trim(pav.asset_url), ''), pa.asset_url) as asset_url,
                                pa.alt_text,
                                pa.asset_type,
                                pa.display_order
                            from ecommerce_product_assets pa
                            left join lateral (
                                select pav.asset_url
                                from ecommerce_product_asset_variants pav
                                where pav.product_asset_id = pa.id
                                  and pav.variant_kind = 'PRIMARY_OPTIMIZED_WEBP'
                                  and pav.active = true
                                  and pav.preferred = true
                                  and nullif(trim(pav.asset_url), '') is not null
                                order by pav.updated_at desc, pav.id desc
                                limit 1
                            ) pav on true
                            where pa.product_online_profile_id = pop.id
                              and pa.is_primary = true
                              and pa.active = true
                            order by pa.display_order asc, pa.id asc
                            limit 1
                        ) pa on true
                        left join lateral (
                            select
                                po.amount,
                                po.currency
                            from ecommerce_online_price_overrides po
                            where po.product_online_profile_id = pop.id
                              and po.active = true
                              and po.amount > 0
                              and po.currency = 'PEN'
                              and (po.valid_from is null or po.valid_from <= ?)
                              and (po.valid_to is null or po.valid_to >= ?)
                            order by po.updated_at desc, po.id desc
                            limit 1
                        ) ov on true
                        where pop.publication_status = 'PUBLISHED'
                          and p.active = true
                        """ + categoryFilter + """
                        order by lower(coalesce(nullif(pop.online_name, ''), p.name)) asc, pop.id asc
                        limit ? offset ?
                        """,
                storefrontPublicProductProjectionRowMapper(),
                args
        );

        Map<Long, List<ResponsiveImageVariantProjection>> variantsByAssetId = findResponsiveVariantsByAssetIds(
                items.stream()
                        .map(StorefrontPublicProductProjection::primaryImageAssetId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList()
        );

        items = items.stream()
                .map(item -> withResponsiveVariants(item, variantsByAssetId.getOrDefault(item.primaryImageAssetId(), List.of())))
                .toList();

        return new PageImpl<>(items, pageable, total);
    }

    @Override
    public Page<StorefrontPublicCategoryProjection> findPublicCategories(Pageable pageable) {
        long total = countPublicCategories();
        if (total == 0) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        List<StorefrontPublicCategoryProjection> items = jdbcTemplate.query(
                """
                        select
                            c.slug,
                            c.name,
                            c.description
                        from ecommerce_online_categories c
                        where c.active = true
                        order by lower(c.name) asc, c.id asc
                        limit ? offset ?
                        """,
                (rs, rowNum) -> new StorefrontPublicCategoryProjection(
                        rs.getString("slug"),
                        rs.getString("name"),
                        rs.getString("description")
                ),
                pageable.getPageSize(),
                pageable.getOffset()
        );

        return new PageImpl<>(items, pageable, total);
    }

    @Override
    public Optional<StorefrontPublicProductDetailProjection> findPublishedProductDetailBySlug(String slug) {
        Instant now = Instant.now();
        List<StorefrontPublicProductDetailProjection> items = jdbcTemplate.query(
                """
                        select
                            pop.slug,
                            coalesce(nullif(pop.online_name, ''), p.name) as public_name,
                            coalesce(nullif(pop.online_description, ''), p.description) as public_description,
                            coalesce(ov.amount, p.sale_price) as effective_price_amount,
                            coalesce(ov.currency, 'PEN') as effective_price_currency,
                            pa.product_asset_id as primary_image_asset_id,
                            pa.asset_url as primary_image_url,
                            pa.alt_text as primary_image_alt_text,
                            pa.asset_type as primary_image_type,
                            pa.display_order as primary_image_display_order,
                            c.slug as category_slug,
                            c.name as category_name,
                            b.slug as brand_slug,
                            b.name as brand_name,
                            sm.seo_title,
                            sm.seo_description,
                            sm.canonical_path,
                            sm.robots_policy,
                            sm.indexable as seo_indexable,
                            sm.og_title,
                            sm.og_description,
                            sm.og_image_url
                        from ecommerce_product_online_profiles pop
                        join products p on p.id = pop.product_id
                        left join ecommerce_online_categories c
                               on c.id = pop.online_category_id and c.active = true
                        left join ecommerce_brands b
                               on b.id = pop.brand_id and b.active = true
                        left join ecommerce_seo_metadata sm
                               on sm.product_online_profile_id = pop.id
                        left join lateral (
                            select
                                pa.id as product_asset_id,
                                coalesce(nullif(trim(pav.asset_url), ''), pa.asset_url) as asset_url,
                                pa.alt_text,
                                pa.asset_type,
                                pa.display_order
                            from ecommerce_product_assets pa
                            left join lateral (
                                select pav.asset_url
                                from ecommerce_product_asset_variants pav
                                where pav.product_asset_id = pa.id
                                  and pav.variant_kind = 'PRIMARY_OPTIMIZED_WEBP'
                                  and pav.active = true
                                  and pav.preferred = true
                                  and nullif(trim(pav.asset_url), '') is not null
                                order by pav.updated_at desc, pav.id desc
                                limit 1
                            ) pav on true
                            where pa.product_online_profile_id = pop.id
                              and pa.is_primary = true
                              and pa.active = true
                            order by pa.display_order asc, pa.id asc
                            limit 1
                        ) pa on true
                        left join lateral (
                            select
                                po.amount,
                                po.currency
                            from ecommerce_online_price_overrides po
                            where po.product_online_profile_id = pop.id
                              and po.active = true
                              and po.amount > 0
                              and (po.valid_from is null or po.valid_from <= ?)
                              and (po.valid_to is null or po.valid_to >= ?)
                            order by po.updated_at desc, po.id desc
                            limit 1
                        ) ov on true
                        where pop.publication_status = 'PUBLISHED'
                          and p.active = true
                          and pop.slug = ?
                        limit 1
                        """,
                (rs, rowNum) -> new StorefrontPublicProductDetailProjection(
                        rs.getString("slug"),
                        rs.getString("public_name"),
                        rs.getString("public_description"),
                        rs.getBigDecimal("effective_price_amount"),
                        rs.getString("effective_price_currency"),
                        getNullableLong(rs.getObject("primary_image_asset_id")),
                        rs.getString("primary_image_url"),
                        rs.getString("primary_image_alt_text"),
                        rs.getString("primary_image_type"),
                        getNullableInteger(rs.getObject("primary_image_display_order")),
                        List.of(),
                        rs.getString("category_slug"),
                        rs.getString("category_name"),
                        rs.getString("brand_slug"),
                        rs.getString("brand_name"),
                        rs.getString("seo_title"),
                        rs.getString("seo_description"),
                        rs.getString("canonical_path"),
                        rs.getString("robots_policy"),
                        getNullableBoolean(rs.getObject("seo_indexable")),
                        rs.getString("og_title"),
                        rs.getString("og_description"),
                        rs.getString("og_image_url")
                ),
                Timestamp.from(now),
                Timestamp.from(now),
                slug
        );

        if (items.isEmpty()) {
            return Optional.empty();
        }

        StorefrontPublicProductDetailProjection item = items.get(0);
        List<ResponsiveImageVariantProjection> variants = item.primaryImageAssetId() == null
                ? List.of()
                : findResponsiveVariantsByAssetIds(List.of(item.primaryImageAssetId()))
                .getOrDefault(item.primaryImageAssetId(), List.of());
        return Optional.of(withResponsiveVariants(item, variants));
    }

    @Override
    public Optional<StorefrontPublicCategoryDetailProjection> findPublicCategoryDetailBySlug(String slug) {
        List<StorefrontPublicCategoryDetailProjection> items = jdbcTemplate.query(
                """
                        select
                            c.slug,
                            c.name,
                            c.description,
                            coalesce((
                                select count(*)
                                from ecommerce_product_online_profiles pop
                                join products p on p.id = pop.product_id
                                where pop.online_category_id = c.id
                                  and pop.publication_status = 'PUBLISHED'
                                  and p.active = true
                            ), 0) as product_count,
                            sm.seo_title,
                            sm.seo_description,
                            sm.canonical_path,
                            sm.robots_policy,
                            sm.indexable as seo_indexable,
                            sm.og_title,
                            sm.og_description,
                            sm.og_image_url
                        from ecommerce_online_categories c
                        left join ecommerce_seo_metadata sm
                               on sm.online_category_id = c.id
                        where c.active = true
                          and c.slug = ?
                        limit 1
                        """,
                (rs, rowNum) -> new StorefrontPublicCategoryDetailProjection(
                        rs.getString("slug"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getLong("product_count"),
                        rs.getString("seo_title"),
                        rs.getString("seo_description"),
                        rs.getString("canonical_path"),
                        rs.getString("robots_policy"),
                        getNullableBoolean(rs.getObject("seo_indexable")),
                        rs.getString("og_title"),
                        rs.getString("og_description"),
                        rs.getString("og_image_url")
                ),
                slug
        );

        if (items.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(items.get(0));
    }

    @Override
    public List<StorefrontSitemapEntryProjection> findPublicSitemapEntries() {
        return jdbcTemplate.query(
                """
                        select
                            sm.canonical_path as loc,
                            'PRODUCT' as entry_type,
                            pop.updated_at as last_modified
                        from ecommerce_product_online_profiles pop
                        join products p on p.id = pop.product_id
                        join ecommerce_seo_metadata sm on sm.product_online_profile_id = pop.id
                        where pop.publication_status = 'PUBLISHED'
                          and p.active = true
                          and sm.indexable = true
                          and nullif(trim(sm.canonical_path), '') is not null
                          and sm.robots_policy = 'INDEX_FOLLOW'

                        union all

                        select
                            sm.canonical_path as loc,
                            'CATEGORY' as entry_type,
                            c.updated_at as last_modified
                        from ecommerce_online_categories c
                        join ecommerce_seo_metadata sm on sm.online_category_id = c.id
                        where c.active = true
                          and sm.indexable = true
                          and nullif(trim(sm.canonical_path), '') is not null
                          and sm.robots_policy = 'INDEX_FOLLOW'
                          and (
                                select count(*)
                                from ecommerce_product_online_profiles pop2
                                join products p2 on p2.id = pop2.product_id
                                where pop2.online_category_id = c.id
                                  and pop2.publication_status = 'PUBLISHED'
                                  and p2.active = true
                          ) > 0

                        order by entry_type asc, loc asc
                        """,
                (rs, rowNum) -> new StorefrontSitemapEntryProjection(
                        rs.getString("loc"),
                        rs.getString("entry_type"),
                        getNullableInstant(rs.getObject("last_modified"))
                )
        );
    }

    private long countPublishedProducts(String categorySlug) {
        String categoryFilter = categorySlug == null ? "" : "  and c.slug = ?\n";
        Object[] args = categorySlug == null ? new Object[]{} : new Object[]{categorySlug};

        Long total = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from ecommerce_product_online_profiles pop
                        join products p on p.id = pop.product_id
                        left join ecommerce_online_categories c
                               on c.id = pop.online_category_id and c.active = true
                        where pop.publication_status = 'PUBLISHED'
                          and p.active = true
                        """ + categoryFilter + """
                        """,
                Long.class,
                args
        );
        return total == null ? 0 : total;
    }

    private RowMapper<StorefrontPublicProductProjection> storefrontPublicProductProjectionRowMapper() {
        return (rs, rowNum) -> new StorefrontPublicProductProjection(
                rs.getString("slug"),
                rs.getString("public_name"),
                rs.getString("short_description"),
                rs.getBigDecimal("effective_price_amount"),
                rs.getString("effective_price_currency"),
                getNullableLong(rs.getObject("primary_image_asset_id")),
                rs.getString("primary_image_url"),
                rs.getString("primary_image_alt_text"),
                rs.getString("primary_image_type"),
                getNullableInteger(rs.getObject("primary_image_display_order")),
                List.of(),
                rs.getString("category_slug"),
                rs.getString("category_name"),
                rs.getString("brand_slug"),
                rs.getString("brand_name")
        );
    }

    private Map<Long, List<ResponsiveImageVariantProjection>> findResponsiveVariantsByAssetIds(List<Long> productAssetIds) {
        if (productAssetIds == null || productAssetIds.isEmpty()) {
            return Map.of();
        }

        String placeholders = productAssetIds.stream()
                .map(ignored -> "?")
                .collect(Collectors.joining(", "));
        List<ResponsiveVariantRow> rows = jdbcTemplate.query(
                """
                        select
                            pav.product_asset_id,
                            trim(pav.asset_url) as asset_url,
                            pav.mime_type,
                            pav.width,
                            pav.height
                        from ecommerce_product_asset_variants pav
                        where pav.product_asset_id in (%s)
                          and pav.active = true
                          and pav.variant_kind = 'PRIMARY_RESPONSIVE_WEBP'
                          and pav.format = 'WEBP'
                          and pav.purpose = 'RESPONSIVE'
                          and nullif(trim(pav.asset_url), '') is not null
                          and pav.mime_type = 'image/webp'
                          and pav.width > 0
                          and pav.height > 0
                          and pav.target_width > 0
                        order by pav.product_asset_id asc, pav.sort_order asc, pav.target_width asc
                        """.formatted(placeholders),
                (rs, rowNum) -> new ResponsiveVariantRow(
                        rs.getLong("product_asset_id"),
                        new ResponsiveImageVariantProjection(
                                rs.getString("asset_url"),
                                rs.getString("mime_type"),
                                getNullableInteger(rs.getObject("width")),
                                getNullableInteger(rs.getObject("height"))
                        )
                ),
                productAssetIds.toArray()
        );

        Map<Long, List<ResponsiveImageVariantProjection>> variantsByAssetId = new LinkedHashMap<>();
        for (ResponsiveVariantRow row : rows) {
            variantsByAssetId.computeIfAbsent(row.productAssetId(), ignored -> new java.util.ArrayList<>())
                    .add(row.variant());
        }
        return variantsByAssetId;
    }

    private StorefrontPublicProductProjection withResponsiveVariants(
            StorefrontPublicProductProjection item,
            List<ResponsiveImageVariantProjection> variants
    ) {
        return new StorefrontPublicProductProjection(
                item.slug(),
                item.name(),
                item.shortDescription(),
                item.effectivePriceAmount(),
                item.effectivePriceCurrency(),
                item.primaryImageAssetId(),
                item.primaryImageUrl(),
                item.primaryImageAltText(),
                item.primaryImageType(),
                item.primaryImageDisplayOrder(),
                variants == null ? List.of() : variants,
                item.categorySlug(),
                item.categoryName(),
                item.brandSlug(),
                item.brandName()
        );
    }

    private StorefrontPublicProductDetailProjection withResponsiveVariants(
            StorefrontPublicProductDetailProjection item,
            List<ResponsiveImageVariantProjection> variants
    ) {
        return new StorefrontPublicProductDetailProjection(
                item.slug(),
                item.name(),
                item.description(),
                item.effectivePriceAmount(),
                item.effectivePriceCurrency(),
                item.primaryImageAssetId(),
                item.primaryImageUrl(),
                item.primaryImageAltText(),
                item.primaryImageType(),
                item.primaryImageDisplayOrder(),
                variants == null ? List.of() : variants,
                item.categorySlug(),
                item.categoryName(),
                item.brandSlug(),
                item.brandName(),
                item.seoTitle(),
                item.seoDescription(),
                item.canonicalPath(),
                item.robotsPolicy(),
                item.seoIndexable(),
                item.ogTitle(),
                item.ogDescription(),
                item.ogImageUrl()
        );
    }

    private record ResponsiveVariantRow(
            Long productAssetId,
            ResponsiveImageVariantProjection variant
    ) {
    }

    private long countPublicCategories() {
        Long total = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from ecommerce_online_categories c
                        where c.active = true
                        """,
                Long.class
        );
        return total == null ? 0 : total;
    }

    private Integer getNullableInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Integer integerValue) {
            return integerValue;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.valueOf(value.toString());
    }

    private Long getNullableLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Long longValue) {
            return longValue;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.valueOf(value.toString());
    }

    private Boolean getNullableBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean boolValue) {
            return boolValue;
        }
        return Boolean.valueOf(value.toString());
    }

    private Instant getNullableInstant(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Instant instantValue) {
            return instantValue;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        return Timestamp.valueOf(value.toString()).toInstant();
    }
}
