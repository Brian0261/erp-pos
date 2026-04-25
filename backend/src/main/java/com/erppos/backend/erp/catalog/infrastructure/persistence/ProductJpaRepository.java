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
    @Override
    @EntityGraph(attributePaths = {"category", "unit"})
    java.util.Optional<ProductEntity> findById(Long id);
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
}
