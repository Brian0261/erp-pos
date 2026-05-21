package com.erppos.backend.erp.catalog.infrastructure.persistence;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
public interface ProductJpaRepository extends JpaRepository<ProductEntity, Long> {
    @Override
    @EntityGraph(attributePaths = {"category", "unit"})
    Page<ProductEntity> findAll(Pageable pageable);
    @EntityGraph(attributePaths = {"category", "unit"})
    @Query(
            value = """
                    SELECT p FROM ProductEntity p
                    WHERE (:applyQuery = false
                           OR LOWER(p.name) LIKE CONCAT('%', :query, '%')
                           OR LOWER(p.sku) LIKE CONCAT('%', :query, '%')
                           OR (p.barcode IS NOT NULL AND LOWER(p.barcode) LIKE CONCAT('%', :query, '%')))
                      AND (:categoryId IS NULL OR p.category.id = :categoryId)
                      AND (:active IS NULL OR p.active = :active)
                      AND (:barcodeStatus IS NULL
                           OR (:barcodeStatus = 'WITH_BARCODE' AND p.barcode IS NOT NULL AND TRIM(p.barcode) <> '')
                           OR (:barcodeStatus = 'WITHOUT_BARCODE' AND (p.barcode IS NULL OR TRIM(p.barcode) = '')))
                    """,
            countQuery = """
                    SELECT COUNT(p) FROM ProductEntity p
                    WHERE (:applyQuery = false
                           OR LOWER(p.name) LIKE CONCAT('%', :query, '%')
                           OR LOWER(p.sku) LIKE CONCAT('%', :query, '%')
                           OR (p.barcode IS NOT NULL AND LOWER(p.barcode) LIKE CONCAT('%', :query, '%')))
                      AND (:categoryId IS NULL OR p.category.id = :categoryId)
                      AND (:active IS NULL OR p.active = :active)
                      AND (:barcodeStatus IS NULL
                           OR (:barcodeStatus = 'WITH_BARCODE' AND p.barcode IS NOT NULL AND TRIM(p.barcode) <> '')
                           OR (:barcodeStatus = 'WITHOUT_BARCODE' AND (p.barcode IS NULL OR TRIM(p.barcode) = '')))
                    """
    )
    Page<ProductEntity> findByFilters(
            @Param("query") String query,
            @Param("applyQuery") boolean applyQuery,
            @Param("categoryId") Long categoryId,
            @Param("active") Boolean active,
            @Param("barcodeStatus") String barcodeStatus,
            Pageable pageable
    );
    @Override
    @EntityGraph(attributePaths = {"category", "unit"})
    java.util.Optional<ProductEntity> findById(Long id);

    @EntityGraph(attributePaths = {"category", "unit"})
    List<ProductEntity> findByActive(boolean active);

    boolean existsBySkuIgnoreCase(String sku);
    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);
    boolean existsByBarcode(String barcode);
    boolean existsByBarcodeAndIdNot(String barcode, Long id);
    @EntityGraph(attributePaths = {"category", "unit"})
    @Query("""
            SELECT p FROM ProductEntity p
            WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%'))
               OR (p.barcode IS NOT NULL AND p.barcode LIKE CONCAT('%', :query, '%'))
            ORDER BY p.name ASC
            """)
    List<ProductEntity> search(@Param("query") String query, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "unit"})
    @Query("""
            SELECT p FROM ProductEntity p
            WHERE (
                    LOWER(p.name) LIKE CONCAT('%', :query, '%')
                 OR LOWER(p.sku) LIKE CONCAT('%', :query, '%')
                 OR (p.barcode IS NOT NULL AND LOWER(p.barcode) LIKE CONCAT('%', :query, '%'))
                  )
              AND (:active IS NULL OR p.active = :active)
            ORDER BY
              CASE
                WHEN LOWER(p.sku) = :query THEN 0
                WHEN p.barcode IS NOT NULL AND LOWER(p.barcode) = :query THEN 1
                WHEN LOWER(p.name) LIKE CONCAT(:query, '%') THEN 2
                ELSE 3
              END,
              p.name ASC
            """)
    List<ProductEntity> lookup(@Param("query") String query, @Param("active") Boolean active, Pageable pageable);
}
