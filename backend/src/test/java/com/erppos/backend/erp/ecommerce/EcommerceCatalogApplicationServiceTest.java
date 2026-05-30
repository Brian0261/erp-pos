package com.erppos.backend.erp.ecommerce;

import com.erppos.backend.erp.ecommerce.application.service.AuditUserProvider;
import com.erppos.backend.erp.ecommerce.application.service.EcommerceCatalogApplicationService;
import com.erppos.backend.erp.ecommerce.application.usecase.CreateProductOnlineProfileCommand;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceConflictException;
import com.erppos.backend.erp.ecommerce.domain.exception.EcommerceNotFoundException;
import com.erppos.backend.erp.ecommerce.domain.model.EcommerceCatalogProductSnapshot;
import com.erppos.backend.erp.ecommerce.domain.model.OnlinePublicationStatus;
import com.erppos.backend.erp.ecommerce.domain.model.ProductOnlineProfile;
import com.erppos.backend.erp.ecommerce.domain.port.EcommerceCatalogProductReadPort;
import com.erppos.backend.erp.ecommerce.domain.port.ProductOnlineProfileRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EcommerceCatalogApplicationServiceTest {
    private InMemoryProductOnlineProfileRepository profileRepository;
    private InMemoryProductReadPort productReadPort;
    private EcommerceCatalogApplicationService service;

    @BeforeEach
    void setUp() {
        profileRepository = new InMemoryProductOnlineProfileRepository();
        productReadPort = new InMemoryProductReadPort();
        service = new EcommerceCatalogApplicationService(profileRepository, productReadPort, new AuditUserProvider());
    }

    @Test
    void shouldCreateDraftProfileForExistingProduct() {
        productReadPort.add(new EcommerceCatalogProductSnapshot(10L, "SKU-10", "Lapiz", BigDecimal.TEN, true));

        ProductOnlineProfile profile = service.createDraftProfile(new CreateProductOnlineProfileCommand(10L));

        assertNotNull(profile.id());
        assertEquals(10L, profile.productId());
        assertEquals(OnlinePublicationStatus.DRAFT, profile.publicationStatus());
    }

    @Test
    void shouldRejectDraftProfileForMissingProduct() {
        assertThrows(EcommerceNotFoundException.class,
                () -> service.createDraftProfile(new CreateProductOnlineProfileCommand(99L)));
    }

    @Test
    void shouldRejectDuplicatedDraftProfileForProduct() {
        productReadPort.add(new EcommerceCatalogProductSnapshot(10L, "SKU-10", "Lapiz", BigDecimal.TEN, true));
        service.createDraftProfile(new CreateProductOnlineProfileCommand(10L));

        assertThrows(EcommerceConflictException.class,
                () -> service.createDraftProfile(new CreateProductOnlineProfileCommand(10L)));
    }

    private static final class InMemoryProductReadPort implements EcommerceCatalogProductReadPort {
        private final Map<Long, EcommerceCatalogProductSnapshot> products = new HashMap<>();

        void add(EcommerceCatalogProductSnapshot product) {
            products.put(product.id(), product);
        }

        @Override
        public Optional<EcommerceCatalogProductSnapshot> findById(Long productId) {
            return Optional.ofNullable(products.get(productId));
        }
    }

    private static final class InMemoryProductOnlineProfileRepository implements ProductOnlineProfileRepositoryPort {
        private final AtomicLong sequence = new AtomicLong(1);
        private final Map<Long, ProductOnlineProfile> profiles = new HashMap<>();

        @Override
        public ProductOnlineProfile save(ProductOnlineProfile profile) {
            Long id = profile.id() == null ? sequence.getAndIncrement() : profile.id();
            ProductOnlineProfile saved = new ProductOnlineProfile(
                    id,
                    profile.productId(),
                    profile.publicationStatus(),
                    profile.slug(),
                    profile.onlineName(),
                    profile.onlineDescription(),
                    profile.onlineCategoryId(),
                    profile.brandId(),
                    profile.brandAbsencePolicy(),
                    profile.publishedAt(),
                    profile.unpublishedAt(),
                    profile.version(),
                    profile.createdAt() == null ? Instant.now() : profile.createdAt(),
                    Instant.now(),
                    profile.createdBy(),
                    profile.updatedBy()
            );
            profiles.put(id, saved);
            return saved;
        }

        @Override
        public Optional<ProductOnlineProfile> findById(Long id) {
            return Optional.ofNullable(profiles.get(id));
        }

        @Override
        public Optional<ProductOnlineProfile> findByProductId(Long productId) {
            return profiles.values().stream().filter(profile -> profile.productId().equals(productId)).findFirst();
        }

        @Override
        public boolean existsByProductId(Long productId) {
            return findByProductId(productId).isPresent();
        }

        @Override
        public boolean existsBySlugIgnoreCase(String slug) {
            return profiles.values().stream().anyMatch(profile -> profile.slug() != null && profile.slug().equalsIgnoreCase(slug));
        }

        @Override
        public boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id) {
            return profiles.values().stream()
                    .anyMatch(profile -> profile.slug() != null && profile.slug().equalsIgnoreCase(slug) && !profile.id().equals(id));
        }
    }
}
