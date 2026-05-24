package com.erppos.backend.erp.billing;

import com.erppos.backend.erp.billing.adapter.rest.BillingSeriesController;
import com.erppos.backend.erp.billing.adapter.rest.ElectronicDocumentController;
import com.erppos.backend.erp.billing.application.service.AuditUserProvider;
import com.erppos.backend.erp.billing.application.service.BillingSeriesApplicationService;
import com.erppos.backend.erp.billing.application.service.CompanyBillingProfileApplicationService;
import com.erppos.backend.erp.billing.application.service.ElectronicDocumentApplicationService;
import com.erppos.backend.erp.billing.application.usecase.CreateBillingSeriesCommand;
import com.erppos.backend.erp.billing.application.usecase.CreateCompanyBillingProfileCommand;
import com.erppos.backend.erp.billing.application.usecase.CreateElectronicDocumentFromSaleCommand;
import com.erppos.backend.erp.billing.domain.exception.BillingBusinessRuleException;
import com.erppos.backend.erp.billing.domain.exception.BillingConflictException;
import com.erppos.backend.erp.billing.domain.exception.BillingNotFoundException;
import com.erppos.backend.erp.billing.domain.model.BillingEnvironment;
import com.erppos.backend.erp.billing.domain.model.BillingSaleItemSnapshot;
import com.erppos.backend.erp.billing.domain.model.BillingSaleSnapshot;
import com.erppos.backend.erp.billing.domain.model.BillingSeries;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFile;
import com.erppos.backend.erp.billing.domain.model.BillingXmlFileType;
import com.erppos.backend.erp.billing.domain.model.CompanyBillingProfile;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatusHistory;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.port.BillingSaleReadPort;
import com.erppos.backend.erp.billing.domain.port.BillingSeriesRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.BillingXmlFileRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.CompanyBillingProfileRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicBillingProviderPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentItemRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentStatusHistoryRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.UblXmlGeneratorPort;
import com.erppos.backend.erp.billing.domain.port.XmlSignerPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

class BillingApplicationServiceTest {

    private InMemoryCompanyProfileRepository profileRepository;
    private InMemoryBillingSeriesRepository seriesRepository;
    private InMemoryElectronicDocumentRepository documentRepository;
    private InMemoryElectronicDocumentItemRepository itemRepository;
    private InMemoryElectronicDocumentStatusHistoryRepository historyRepository;
    private InMemoryBillingXmlFileRepository xmlRepository;
    private InMemorySaleReadPort saleReadPort;
    private StubXmlGenerator stubXmlGenerator;
    private StubXmlSigner stubXmlSigner;
    private StubProvider stubProvider;

    private CompanyBillingProfileApplicationService profileService;
    private BillingSeriesApplicationService seriesService;
    private ElectronicDocumentApplicationService documentService;

    @BeforeEach
    void setUp() {
        profileRepository = new InMemoryCompanyProfileRepository();
        seriesRepository = new InMemoryBillingSeriesRepository();
        documentRepository = new InMemoryElectronicDocumentRepository();
        itemRepository = new InMemoryElectronicDocumentItemRepository();
        historyRepository = new InMemoryElectronicDocumentStatusHistoryRepository();
        xmlRepository = new InMemoryBillingXmlFileRepository();
        saleReadPort = new InMemorySaleReadPort();
        stubXmlGenerator = new StubXmlGenerator();
        stubXmlSigner = new StubXmlSigner();
        stubProvider = new StubProvider();

        AuditUserProvider auditUserProvider = new AuditUserProvider();
        profileService = new CompanyBillingProfileApplicationService(profileRepository, auditUserProvider);
        seriesService = new BillingSeriesApplicationService(seriesRepository, auditUserProvider);
        documentService = new ElectronicDocumentApplicationService(
                documentRepository,
                itemRepository,
                historyRepository,
                seriesRepository,
                profileRepository,
                saleReadPort,
                xmlRepository,
                stubXmlGenerator,
                stubXmlSigner,
                stubProvider,
                auditUserProvider
        );

        profileService.create(new CreateCompanyBillingProfileCommand(
                "20123456789",
                "TIENDA ESCOLAR SAC",
                "AV. LIMA 123",
                BillingEnvironment.LOCAL,
                null,
                null
        ));

        seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B001",
                1L,
                BillingEnvironment.LOCAL
        ));
        seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.INVOICE,
                "F001",
                1L,
                BillingEnvironment.LOCAL
        ));

        saleReadPort.sales.put(1L, completedSale(1L));
        saleReadPort.sales.put(2L, voidedSale(2L));
    }

    @Test
    void shouldCreateValidCompanyProfile() {
        CompanyBillingProfile created = profileService.create(new CreateCompanyBillingProfileCommand(
                "20987654321",
                "OTRA EMPRESA SAC",
                "CALLE TEST 456",
                BillingEnvironment.BETA,
                null,
                null
        ));
        assertNotNull(created.id());
        assertEquals("20987654321", created.ruc());
    }

    @Test
    void shouldRejectInvalidRuc() {
        assertThrows(BillingBusinessRuleException.class, () -> profileService.create(new CreateCompanyBillingProfileCommand(
                "123",
                "EMPRESA",
                "DIRECCION",
                BillingEnvironment.BETA,
                null,
                null
        )));
    }

    @Test
    void shouldCreateValidSeries() {
        BillingSeries created = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B777",
                10L,
                BillingEnvironment.BETA
        ));
        assertNotNull(created.id());
        assertEquals("B777", created.series());
    }

    @Test
    void shouldRejectDuplicatedSeries() {
        assertThrows(BillingConflictException.class, () -> seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B001",
                1L,
                BillingEnvironment.LOCAL
        )));
    }

    @Test
    void shouldRejectIncompatibleSeriesPattern() {
        assertThrows(BillingBusinessRuleException.class, () -> seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.INVOICE,
                "B123",
                1L,
                BillingEnvironment.LOCAL
        )));
    }

    @Test
    void shouldCreateReceiptFromCompletedSale() {
        ElectronicDocument doc = documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
        assertEquals(ElectronicDocumentType.RECEIPT, doc.documentType());
        assertEquals(ElectronicDocumentStatus.DRAFT, doc.status());
    }

    @Test
    void shouldCreateInvoiceFromCompletedSale() {
        ElectronicDocument doc = documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.INVOICE,
                2L,
                "Cliente Factura",
                "10456789012"
        ));
        assertEquals(ElectronicDocumentType.INVOICE, doc.documentType());
        assertEquals("Cliente Factura", doc.customerName());
    }

    @Test
    void shouldRejectVoidedSale() {
        assertThrows(BillingBusinessRuleException.class, () -> documentService.createFromSale(2L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        )));
    }

    @Test
    void shouldRejectMissingSale() {
        assertThrows(BillingNotFoundException.class, () -> documentService.createFromSale(999L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        )));
    }

    @Test
    void shouldRejectInvoiceWithoutCustomerData() {
        assertThrows(BillingBusinessRuleException.class, () -> documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.INVOICE,
                2L,
                null,
                null
        )));
    }

    @Test
    void shouldRejectSecondDocumentForSameSaleEvenWithDifferentType() {
        documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));

        assertThrows(BillingConflictException.class, () -> documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.INVOICE,
                2L,
                "Cliente Factura",
                "10456789012"
        )));
    }

    @Test
    void shouldIncrementCorrelative() {
        ElectronicDocument first = documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));

        saleReadPort.sales.put(3L, completedSale(3L));
        ElectronicDocument second = documentService.createFromSale(3L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));

        assertEquals(first.number() + 1, second.number());
    }

    @Test
    void shouldGenerateXml() {
        ElectronicDocument doc = createReceiptForSale(1L);
        ElectronicDocument generated = documentService.generateXml(doc.id());
        assertEquals(ElectronicDocumentStatus.GENERATED, generated.status());
        assertTrue(xmlRepository.storage.values().stream().anyMatch(xml -> xml.electronicDocumentId().equals(doc.id()) && xml.fileType() == BillingXmlFileType.GENERATED));
    }

    @Test
    void shouldSignXmlWithMockSigner() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        ElectronicDocument signed = documentService.sign(doc.id());
        assertEquals(ElectronicDocumentStatus.SIGNED, signed.status());
        assertTrue(xmlRepository.storage.values().stream().anyMatch(xml -> xml.electronicDocumentId().equals(doc.id()) && xml.fileType() == BillingXmlFileType.SIGNED));
    }

    @Test
    void shouldSendAndMarkAccepted() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());
        ElectronicDocument sent = documentService.send(doc.id());
        assertEquals(ElectronicDocumentStatus.ACCEPTED, sent.status());
    }

    @Test
    void shouldSimulateRejectedAndMarkRejected() {
        saleReadPort.sales.put(4L, completedSale(4L));
        ElectronicDocument doc = documentService.createFromSale(4L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                "CLIENTE REJECT",
                null
        ));
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());

        ElectronicDocument sent = documentService.send(doc.id());
        assertEquals(ElectronicDocumentStatus.REJECTED, sent.status());
    }

    @Test
    void shouldBlockSigningInProdWhenRealSignatureIsNotAvailable() {
        profileService.create(new CreateCompanyBillingProfileCommand(
                "20999999991",
                "INKTOY PROD SAC",
                "AV. PROD 100",
                BillingEnvironment.PROD,
                null,
                null
        ));
        BillingSeries prodSeries = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B101",
                1L,
                BillingEnvironment.PROD
        ));
        saleReadPort.sales.put(8L, completedSale(8L));

        ElectronicDocument doc = documentService.createFromSale(8L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                prodSeries.id(),
                null,
                null
        ));
        documentService.generateXml(doc.id());

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.sign(doc.id()));
        assertEquals("La firma en produccion requiere un certificado digital valido y firma XML real.", ex.getMessage());

        ElectronicDocument persisted = documentRepository.findById(doc.id()).orElseThrow();
        assertEquals(ElectronicDocumentStatus.GENERATED, persisted.status());
    }

    @Test
    void shouldBlockProdSendWhenProviderIsMockWithoutChangingStatus() {
        profileService.create(new CreateCompanyBillingProfileCommand(
                "20999999992",
                "INKTOY PROD SAC 2",
                "AV. PROD 200",
                BillingEnvironment.PROD,
                null,
                null
        ));
        BillingSeries prodSeries = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B102",
                1L,
                BillingEnvironment.PROD
        ));
        saleReadPort.sales.put(9L, completedSale(9L));

        ElectronicDocument created = documentService.createFromSale(9L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                prodSeries.id(),
                null,
                null
        ));
        ElectronicDocument generated = documentService.generateXml(created.id());

        ElectronicDocument signed = documentRepository.save(new ElectronicDocument(
                generated.id(),
                generated.saleId(),
                generated.billingSeriesId(),
                generated.documentType(),
                ElectronicDocumentStatus.SIGNED,
                generated.environment(),
                generated.series(),
                generated.number(),
                generated.fullNumber(),
                generated.customerName(),
                generated.customerDocument(),
                generated.currencyCode(),
                generated.subtotalAmount(),
                generated.taxAmount(),
                generated.totalAmount(),
                generated.xmlGeneratedAt(),
                Instant.now(),
                null,
                generated.providerTicket(),
                generated.providerMessage(),
                generated.createdAt(),
                generated.updatedAt(),
                generated.createdBy(),
                generated.updatedBy()
        ));
        xmlRepository.save(new BillingXmlFile(
                null,
                signed.id(),
                BillingXmlFileType.SIGNED,
                signed.fullNumber() + "-signed.xml",
                "<xml>signed</xml>",
                "application/xml",
                null,
                "tester"
        ));

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.send(signed.id()));
        assertEquals("El envio en produccion esta bloqueado porque no hay proveedor tributario real configurado.", ex.getMessage());

        ElectronicDocument persisted = documentRepository.findById(signed.id()).orElseThrow();
        assertEquals(ElectronicDocumentStatus.SIGNED, persisted.status());
        assertNull(persisted.sentAt());
        assertFalse(historyRepository.findByElectronicDocumentId(signed.id()).stream().anyMatch(h -> h.newStatus() == ElectronicDocumentStatus.SENT));
    }

    @Test
    void shouldConfigureControllerToForbidAlmacenero() throws NoSuchMethodException {
        Method method = ElectronicDocumentController.class.getMethod("createFromSale", Long.class,
                com.erppos.backend.erp.billing.adapter.dto.CreateElectronicDocumentFromSaleRequest.class);
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuthorize);
        assertTrue(preAuthorize.value().contains("CAJERO"));
        assertTrue(preAuthorize.value().contains("ADMIN"));
        assertTrue(preAuthorize.value().contains("SUPERVISOR"));
        assertFalse(preAuthorize.value().contains("ALMACENERO"));
    }

    @Test
    void shouldConfigureSeriesControllerToForbidCajero() throws NoSuchMethodException {
        Method method = BillingSeriesController.class.getMethod("create",
                com.erppos.backend.erp.billing.adapter.dto.BillingSeriesRequest.class);
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuthorize);
        assertTrue(preAuthorize.value().contains("ADMIN"));
        assertFalse(preAuthorize.value().contains("CAJERO"));
    }

    private ElectronicDocument createReceiptForSale(Long saleId) {
        return documentService.createFromSale(saleId, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
    }

    private BillingSaleSnapshot completedSale(Long id) {
        return new BillingSaleSnapshot(
                id,
                1L,
                "S-" + id,
                "COMPLETED",
                BigDecimal.valueOf(20),
                BigDecimal.ZERO,
                BigDecimal.valueOf(20),
                Instant.now(),
                "cajero",
                List.of(new BillingSaleItemSnapshot(1L, "Producto " + id, "SKU-" + id, null, BigDecimal.valueOf(2), BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.valueOf(20)))
        );
    }

    private BillingSaleSnapshot voidedSale(Long id) {
        return new BillingSaleSnapshot(
                id,
                1L,
                "S-" + id,
                "VOIDED",
                BigDecimal.valueOf(20),
                BigDecimal.ZERO,
                BigDecimal.valueOf(20),
                Instant.now(),
                "cajero",
                List.of(new BillingSaleItemSnapshot(1L, "Producto " + id, "SKU-" + id, null, BigDecimal.valueOf(2), BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.valueOf(20)))
        );
    }

    static class InMemoryCompanyProfileRepository implements CompanyBillingProfileRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, CompanyBillingProfile> storage = new HashMap<>();

        @Override
        public CompanyBillingProfile save(CompanyBillingProfile profile) {
            Long id = profile.id() == null ? seq.getAndIncrement() : profile.id();
            CompanyBillingProfile stored = new CompanyBillingProfile(
                    id,
                    profile.ruc(),
                    profile.legalName(),
                    profile.fiscalAddress(),
                    profile.environment(),
                    profile.certificatePath(),
                    profile.certificatePassword(),
                    profile.active(),
                    profile.createdAt() == null ? Instant.now() : profile.createdAt(),
                    Instant.now(),
                    profile.createdBy(),
                    profile.updatedBy()
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<CompanyBillingProfile> findActiveByEnvironment(BillingEnvironment environment) {
            return storage.values().stream().filter(p -> p.environment() == environment && p.active()).findFirst();
        }
    }

    static class InMemoryBillingSeriesRepository implements BillingSeriesRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, BillingSeries> storage = new HashMap<>();

        @Override
        public BillingSeries save(BillingSeries series) {
            Long id = series.id() == null ? seq.getAndIncrement() : series.id();
            BillingSeries stored = new BillingSeries(
                    id,
                    series.documentType(),
                    series.series(),
                    series.currentNumber(),
                    series.environment(),
                    series.active(),
                    series.createdAt() == null ? Instant.now() : series.createdAt(),
                    Instant.now(),
                    series.createdBy(),
                    series.updatedBy()
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<BillingSeries> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public Optional<BillingSeries> findByIdForUpdate(Long id) {
            return findById(id);
        }

        @Override
        public List<BillingSeries> findAll() {
            return storage.values().stream().toList();
        }

        @Override
        public boolean existsByDocumentTypeAndSeriesAndEnvironment(ElectronicDocumentType type, String series, BillingEnvironment environment, Long excludeId) {
            return storage.values().stream().anyMatch(s -> s.documentType() == type
                    && s.environment() == environment
                    && s.series().equalsIgnoreCase(series)
                    && (excludeId == null || !s.id().equals(excludeId))
            );
        }
    }

    static class InMemoryElectronicDocumentRepository implements ElectronicDocumentRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, ElectronicDocument> storage = new HashMap<>();

        @Override
        public ElectronicDocument save(ElectronicDocument document) {
            Long id = document.id() == null ? seq.getAndIncrement() : document.id();
            ElectronicDocument stored = new ElectronicDocument(
                    id,
                    document.saleId(),
                    document.billingSeriesId(),
                    document.documentType(),
                    document.status(),
                    document.environment(),
                    document.series(),
                    document.number(),
                    document.fullNumber(),
                    document.customerName(),
                    document.customerDocument(),
                    document.currencyCode(),
                    document.subtotalAmount(),
                    document.taxAmount(),
                    document.totalAmount(),
                    document.xmlGeneratedAt(),
                    document.signedAt(),
                    document.sentAt(),
                    document.providerTicket(),
                    document.providerMessage(),
                    document.createdAt() == null ? Instant.now() : document.createdAt(),
                    Instant.now(),
                    document.createdBy(),
                    document.updatedBy()
            );
            storage.put(id, stored);
            return stored;
        }

        @Override
        public Optional<ElectronicDocument> findById(Long id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public List<ElectronicDocument> findByFilters(ElectronicDocumentStatus status, ElectronicDocumentType type, Long saleId, LocalDate from, LocalDate to) {
            return storage.values().stream()
                    .filter(d -> status == null || d.status() == status)
                    .filter(d -> type == null || d.documentType() == type)
                    .filter(d -> saleId == null || d.saleId().equals(saleId))
                    .toList();
        }

        @Override
        public boolean existsBySaleId(Long saleId) {
            return storage.values().stream().anyMatch(d -> d.saleId().equals(saleId));
        }
    }

    static class InMemoryElectronicDocumentItemRepository implements ElectronicDocumentItemRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, List<ElectronicDocumentItem>> byDocument = new HashMap<>();

        @Override
        public List<ElectronicDocumentItem> saveAll(Long documentId, List<ElectronicDocumentItem> items) {
            List<ElectronicDocumentItem> stored = items.stream().map(item -> new ElectronicDocumentItem(
                    seq.getAndIncrement(),
                    documentId,
                    item.productId(),
                    item.description(),
                    item.quantity(),
                    item.unitPrice(),
                    item.discountAmount(),
                    item.lineTotal()
            )).toList();
            byDocument.put(documentId, stored);
            return stored;
        }

        @Override
        public List<ElectronicDocumentItem> findByElectronicDocumentId(Long documentId) {
            return byDocument.getOrDefault(documentId, List.of());
        }
    }

    static class InMemoryElectronicDocumentStatusHistoryRepository implements ElectronicDocumentStatusHistoryRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, List<ElectronicDocumentStatusHistory>> byDocument = new HashMap<>();

        @Override
        public ElectronicDocumentStatusHistory save(ElectronicDocumentStatusHistory history) {
            ElectronicDocumentStatusHistory stored = new ElectronicDocumentStatusHistory(
                    seq.getAndIncrement(),
                    history.electronicDocumentId(),
                    history.previousStatus(),
                    history.newStatus(),
                    history.message(),
                    history.changedAt() == null ? Instant.now() : history.changedAt(),
                    history.changedBy()
            );
            byDocument.computeIfAbsent(history.electronicDocumentId(), k -> new ArrayList<>()).add(stored);
            return stored;
        }

        @Override
        public List<ElectronicDocumentStatusHistory> findByElectronicDocumentId(Long documentId) {
            return byDocument.getOrDefault(documentId, List.of());
        }
    }

    static class InMemoryBillingXmlFileRepository implements BillingXmlFileRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<String, BillingXmlFile> storage = new HashMap<>();

        @Override
        public BillingXmlFile save(BillingXmlFile xmlFile) {
            String key = xmlFile.electronicDocumentId() + "-" + xmlFile.fileType();
            BillingXmlFile stored = new BillingXmlFile(
                    seq.getAndIncrement(),
                    xmlFile.electronicDocumentId(),
                    xmlFile.fileType(),
                    xmlFile.fileName(),
                    xmlFile.content(),
                    xmlFile.mimeType(),
                    xmlFile.createdAt() == null ? Instant.now() : xmlFile.createdAt(),
                    xmlFile.createdBy()
            );
            storage.put(key, stored);
            return stored;
        }

        @Override
        public Optional<BillingXmlFile> findByElectronicDocumentIdAndFileType(Long electronicDocumentId, BillingXmlFileType fileType) {
            return Optional.ofNullable(storage.get(electronicDocumentId + "-" + fileType));
        }
    }

    static class InMemorySaleReadPort implements BillingSaleReadPort {
        private final Map<Long, BillingSaleSnapshot> sales = new HashMap<>();

        @Override
        public Optional<BillingSaleSnapshot> findById(Long saleId) {
            return Optional.ofNullable(sales.get(saleId));
        }
    }

    static class StubXmlGenerator implements UblXmlGeneratorPort {
        @Override
        public String generate(ElectronicDocument document, CompanyBillingProfile profile, List<ElectronicDocumentItem> items) {
            return "<xml>" + document.fullNumber() + "</xml>";
        }
    }

    static class StubXmlSigner implements XmlSignerPort {
        @Override
        public String signXml(String xml, CompanyBillingProfile profile) {
            return xml + "-SIGNED";
        }
    }

    static class StubProvider implements ElectronicBillingProviderPort {
        @Override
        public ProviderSendResult send(ElectronicDocument document, String signedXml) {
            if (document.customerName() != null && document.customerName().contains("REJECT")) {
                return new ProviderSendResult(ElectronicDocumentStatus.REJECTED, "T-REJ", "Rejected by mock provider");
            }
            return new ProviderSendResult(ElectronicDocumentStatus.ACCEPTED, "T-ACC", "Accepted by mock provider");
        }
    }
}

