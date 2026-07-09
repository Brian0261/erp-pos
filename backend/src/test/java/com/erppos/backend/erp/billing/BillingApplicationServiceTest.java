package com.erppos.backend.erp.billing;

import com.erppos.backend.erp.billing.adapter.rest.BillingSeriesController;
import com.erppos.backend.erp.billing.adapter.rest.ElectronicDocumentController;
import com.erppos.backend.erp.billing.application.service.AuditUserProvider;
import com.erppos.backend.erp.billing.application.service.BillingSeriesApplicationService;
import com.erppos.backend.erp.billing.application.service.BillingRuntimeSafetyPolicy;
import com.erppos.backend.erp.billing.application.service.CompanyBillingProfileApplicationService;
import com.erppos.backend.erp.billing.application.service.ElectronicDocumentApplicationService;
import com.erppos.backend.erp.billing.application.service.ElectronicDocumentLifecyclePolicy;
import com.erppos.backend.erp.billing.application.service.FiscalAttemptAuditService;
import com.erppos.backend.erp.billing.application.service.FiscalAuditSanitizer;
import com.erppos.backend.erp.billing.application.service.FiscalProviderResultClassifier;
import com.erppos.backend.erp.billing.application.usecase.CreateBillingSeriesCommand;
import com.erppos.backend.erp.billing.application.usecase.CreateCompanyBillingProfileCommand;
import com.erppos.backend.erp.billing.application.usecase.CreateElectronicDocumentFromSaleCommand;
import com.erppos.backend.erp.billing.application.usecase.UpdateBillingSeriesCommand;
import com.erppos.backend.erp.billing.application.usecase.UpdateCompanyBillingProfileCommand;
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
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentEvidence;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentAttempt;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentItem;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatusHistory;
import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentType;
import com.erppos.backend.erp.billing.domain.model.FiscalAttemptResult;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceMetadataStatus;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceStorageProvider;
import com.erppos.backend.erp.billing.domain.model.FiscalEvidenceType;
import com.erppos.backend.erp.billing.domain.model.FiscalErrorCategory;
import com.erppos.backend.erp.billing.domain.model.FiscalOperation;
import com.erppos.backend.erp.billing.domain.model.FiscalSecretResolution;
import com.erppos.backend.erp.billing.domain.model.FiscalSecretType;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;
import com.erppos.backend.erp.billing.domain.model.ProviderSendStatus;
import com.erppos.backend.erp.billing.domain.port.BillingSaleReadPort;
import com.erppos.backend.erp.billing.domain.port.BillingSeriesRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.BillingXmlFileRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.CompanyBillingProfileRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicBillingProviderPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentAttemptRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentEvidenceRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentItemRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.ElectronicDocumentStatusHistoryRepositoryPort;
import com.erppos.backend.erp.billing.domain.port.FiscalSecretResolverPort;
import com.erppos.backend.erp.billing.domain.port.UblXmlGeneratorPort;
import com.erppos.backend.erp.billing.domain.port.XmlSignerPort;
import com.erppos.backend.erp.billing.infrastructure.provider.MockElectronicBillingProviderAdapter;
import com.erppos.backend.erp.billing.infrastructure.config.BillingFiscalProperties;
import com.erppos.backend.erp.billing.infrastructure.config.BillingFiscalStartupValidator;
import com.erppos.backend.erp.billing.infrastructure.secret.LocalFiscalSecretResolverAdapter;
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
    private InMemoryElectronicDocumentAttemptRepository attemptRepository;
    private InMemoryElectronicDocumentEvidenceRepository evidenceRepository;
    private InMemoryElectronicDocumentItemRepository itemRepository;
    private InMemoryElectronicDocumentStatusHistoryRepository historyRepository;
    private InMemoryBillingXmlFileRepository xmlRepository;
    private InMemorySaleReadPort saleReadPort;
    private StubXmlGenerator stubXmlGenerator;
    private StubXmlSigner stubXmlSigner;
    private StubProvider stubProvider;
    private LocalFiscalSecretResolverAdapter localFiscalSecretResolver;
    private BillingRuntimeSafetyPolicy runtimeSafetyPolicy;
    private ElectronicDocumentLifecyclePolicy lifecyclePolicy;
    private FiscalAuditSanitizer fiscalAuditSanitizer;
    private FiscalAttemptAuditService attemptAuditService;
    private FiscalProviderResultClassifier providerResultClassifier;

    private CompanyBillingProfileApplicationService profileService;
    private BillingSeriesApplicationService seriesService;
    private ElectronicDocumentApplicationService documentService;

    @BeforeEach
    void setUp() {
        profileRepository = new InMemoryCompanyProfileRepository();
        seriesRepository = new InMemoryBillingSeriesRepository();
        documentRepository = new InMemoryElectronicDocumentRepository();
        attemptRepository = new InMemoryElectronicDocumentAttemptRepository();
        evidenceRepository = new InMemoryElectronicDocumentEvidenceRepository();
        itemRepository = new InMemoryElectronicDocumentItemRepository();
        historyRepository = new InMemoryElectronicDocumentStatusHistoryRepository();
        xmlRepository = new InMemoryBillingXmlFileRepository();
        saleReadPort = new InMemorySaleReadPort();
        stubXmlGenerator = new StubXmlGenerator();
        stubXmlSigner = new StubXmlSigner();
        stubProvider = new StubProvider();
        localFiscalSecretResolver = new LocalFiscalSecretResolverAdapter();
        runtimeSafetyPolicy = new BillingRuntimeSafetyPolicy(stubProvider, stubXmlSigner, localFiscalSecretResolver);
        lifecyclePolicy = new ElectronicDocumentLifecyclePolicy();
        fiscalAuditSanitizer = new FiscalAuditSanitizer();
        attemptAuditService = new FiscalAttemptAuditService(attemptRepository, fiscalAuditSanitizer);
        providerResultClassifier = new FiscalProviderResultClassifier();

        AuditUserProvider auditUserProvider = new AuditUserProvider();
        profileService = new CompanyBillingProfileApplicationService(profileRepository, auditUserProvider);
        seriesService = new BillingSeriesApplicationService(seriesRepository, documentRepository, auditUserProvider);
        documentService = new ElectronicDocumentApplicationService(
                documentRepository,
                itemRepository,
                historyRepository,
                attemptRepository,
                evidenceRepository,
                seriesRepository,
                profileRepository,
                saleReadPort,
                xmlRepository,
                stubXmlGenerator,
                stubXmlSigner,
                stubProvider,
                runtimeSafetyPolicy,
                lifecyclePolicy,
                attemptAuditService,
                fiscalAuditSanitizer,
                providerResultClassifier,
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
    void shouldRejectCreatingActiveSeriesWhenAnotherActiveExistsForSameTypeAndEnvironment() {
        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B002",
                1L,
                BillingEnvironment.LOCAL,
                true
        )));
        assertEquals("Ya existe una serie activa para este tipo de comprobante y ambiente.", ex.getMessage());
    }

    @Test
    void shouldAllowCreatingActiveSeriesForDifferentEnvironment() {
        BillingSeries created = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B002",
                1L,
                BillingEnvironment.BETA,
                true
        ));

        assertNotNull(created.id());
        assertTrue(created.active());
        assertEquals(BillingEnvironment.BETA, created.environment());
    }

    @Test
    void shouldAllowCreatingActiveSeriesForDifferentTypeInSameEnvironment() {
        BillingSeries betaReceipt = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B010",
                1L,
                BillingEnvironment.BETA,
                true
        ));

        BillingSeries betaInvoice = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.INVOICE,
                "F010",
                1L,
                BillingEnvironment.BETA,
                true
        ));

        assertNotNull(betaReceipt.id());
        assertNotNull(betaInvoice.id());
        assertEquals(ElectronicDocumentType.RECEIPT, betaReceipt.documentType());
        assertEquals(ElectronicDocumentType.INVOICE, betaInvoice.documentType());
    }

    @Test
    void shouldRejectActivatingSeriesWhenAnotherActiveExistsForSameTypeAndEnvironment() {
        BillingSeries activeSeries = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B010",
                1L,
                BillingEnvironment.BETA,
                true
        ));
        BillingSeries inactiveSeries = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B011",
                1L,
                BillingEnvironment.BETA,
                false
        ));

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> seriesService.update(
                inactiveSeries.id(),
                new UpdateBillingSeriesCommand(
                        inactiveSeries.documentType(),
                        inactiveSeries.series(),
                        inactiveSeries.currentNumber(),
                        inactiveSeries.environment(),
                        true
                )
        ));

        assertNotNull(activeSeries.id());
        assertEquals("Ya existe una serie activa para este tipo de comprobante y ambiente.", ex.getMessage());
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
    void shouldStoreFiscalSecretReferencesWithoutPlainCertificatePassword() {
        CompanyBillingProfile created = profileService.create(new CreateCompanyBillingProfileCommand(
                "20987654322",
                "EMPRESA REF SAC",
                "CALLE REF 100",
                BillingEnvironment.BETA,
                "beta-certificate-placeholder",
                "plain-password-ignored",
                "vault://billing/beta/certificate",
                "vault://billing/beta/certificate-password",
                "vault://billing/beta/provider",
                "beta-certificate",
                "vault"
        ));

        assertEquals("beta-certificate-placeholder", created.certificatePath());
        assertEquals("vault://billing/beta/certificate", created.certificateSecretRef());
        assertEquals("vault://billing/beta/certificate-password", created.certificatePasswordSecretRef());
        assertEquals("vault://billing/beta/provider", created.providerSecretRef());
        assertEquals("beta-certificate", created.certificateAlias());
        assertEquals("VAULT", created.secretProvider());
    }

    @Test
    void shouldRejectPlainCertificatePasswordForProdProfile() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> profileService.create(new CreateCompanyBillingProfileCommand(
                "20987654323",
                "EMPRESA PROD SAC",
                "AV. PROD 200",
                BillingEnvironment.PROD,
                null,
                "plain-password-not-allowed",
                "vault://billing/prod/certificate",
                "vault://billing/prod/certificate-password",
                "vault://billing/prod/provider",
                "prod-certificate",
                "VAULT"
        )));

        assertEquals("certificatePassword is not accepted for PROD; use certificatePasswordSecretRef", ex.getMessage());
    }

    @Test
    void shouldRejectLegacyCertificatePathForProdProfile() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> profileService.create(new CreateCompanyBillingProfileCommand(
                "20987654324",
                "EMPRESA PROD SAC",
                "AV. PROD 200",
                BillingEnvironment.PROD,
                "C:\\certs\\prod.pfx",
                null,
                "vault://billing/prod/certificate",
                "vault://billing/prod/certificate-password",
                "vault://billing/prod/provider",
                "prod-certificate",
                "VAULT"
        )));

        assertEquals("certificatePath is deprecated for PROD; use certificateSecretRef or certificateAlias", ex.getMessage());
    }

    @Test
    void shouldRequireSecureReferencesForActiveProdProfile() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> profileService.create(new CreateCompanyBillingProfileCommand(
                "20987654325",
                "EMPRESA PROD SAC",
                "AV. PROD 200",
                BillingEnvironment.PROD,
                null,
                null
        )));

        assertEquals("PROD billing profile requires certificateSecretRef or certificateAlias", ex.getMessage());
    }

    @Test
    void shouldAllowProdProfileWithSecureSecretReferences() {
        CompanyBillingProfile created = profileService.create(secureProdProfileCommand("20987654326"));

        assertEquals(BillingEnvironment.PROD, created.environment());
        assertNull(created.certificatePath());
        assertEquals("vault://billing/prod/20987654326/certificate", created.certificateSecretRef());
        assertEquals("vault://billing/prod/20987654326/certificate-password", created.certificatePasswordSecretRef());
        assertEquals("vault://billing/prod/20987654326/provider", created.providerSecretRef());
        assertEquals("prod-certificate-20987654326", created.certificateAlias());
        assertEquals("VAULT", created.secretProvider());
    }

    @Test
    void shouldPreserveSecretReferencesWhenUpdatingWithoutNewWriteOnlyValues() {
        CompanyBillingProfile created = profileService.create(new CreateCompanyBillingProfileCommand(
                "20987654327",
                "EMPRESA BETA SAC",
                "AV. BETA 200",
                BillingEnvironment.BETA,
                null,
                null,
                "vault://billing/beta/current-certificate",
                "vault://billing/beta/current-certificate-password",
                "vault://billing/beta/current-provider",
                "beta-current-certificate",
                "VAULT"
        ));

        CompanyBillingProfile updated = profileService.update(new UpdateCompanyBillingProfileCommand(
                created.ruc(),
                "EMPRESA BETA ACTUALIZADA SAC",
                created.fiscalAddress(),
                created.environment(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true
        ));

        assertEquals("EMPRESA BETA ACTUALIZADA SAC", updated.legalName());
        assertEquals(created.certificateSecretRef(), updated.certificateSecretRef());
        assertEquals(created.certificatePasswordSecretRef(), updated.certificatePasswordSecretRef());
        assertEquals(created.providerSecretRef(), updated.providerSecretRef());
        assertEquals(created.certificateAlias(), updated.certificateAlias());
        assertEquals(created.secretProvider(), updated.secretProvider());
    }

    @Test
    void shouldResolveAllowedLocalAndBetaFiscalPlaceholders() {
        FiscalSecretResolution localCertificate = localFiscalSecretResolver.resolveCertificate(
                "LOCAL_NOOP_CERT",
                BillingEnvironment.LOCAL
        );
        FiscalSecretResolution localPassword = localFiscalSecretResolver.resolveCertificatePassword(
                "LOCAL_NOOP_CERT_PASSWORD",
                BillingEnvironment.LOCAL
        );
        FiscalSecretResolution betaProvider = localFiscalSecretResolver.resolveProviderCredentials(
                "BETA_SANDBOX_PROVIDER",
                BillingEnvironment.BETA
        );

        assertEquals(FiscalSecretType.CERTIFICATE, localCertificate.type());
        assertEquals(FiscalSecretType.CERTIFICATE_PASSWORD, localPassword.type());
        assertEquals(FiscalSecretType.PROVIDER_CREDENTIALS, betaProvider.type());
        assertTrue(localCertificate.placeholder());
        assertTrue(localPassword.placeholder());
        assertTrue(betaProvider.placeholder());
        assertFalse(localFiscalSecretResolver.supportsProduction());
    }

    @Test
    void shouldRejectFiscalSecretRefsWithPathTraversal() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> localFiscalSecretResolver.resolveCertificate(
                "../LOCAL_NOOP_CERT",
                BillingEnvironment.LOCAL
        ));

        assertEquals("Referencia fiscal no debe contener rutas.", ex.getMessage());
        assertFalse(ex.getMessage().contains("LOCAL_NOOP_CERT"));
    }

    @Test
    void shouldRejectFiscalSecretRefsWithAbsolutePaths() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> localFiscalSecretResolver.resolveCertificate(
                "/etc/ssl/prod.pfx",
                BillingEnvironment.LOCAL
        ));

        assertEquals("Referencia fiscal no debe contener rutas.", ex.getMessage());
        assertFalse(ex.getMessage().contains("prod.pfx"));
    }

    @Test
    void shouldRejectFiscalSecretRefsWithWindowsDrivePaths() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> localFiscalSecretResolver.resolveCertificate(
                "C:\\certs\\prod.pfx",
                BillingEnvironment.LOCAL
        ));

        assertEquals("Referencia fiscal no debe contener rutas.", ex.getMessage());
        assertFalse(ex.getMessage().contains("prod.pfx"));
    }

    @Test
    void shouldRejectFiscalSecretRefsThatLookLikeCertificateFiles() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> localFiscalSecretResolver.resolveCertificate(
                "PROD_CERTIFICATE.PFX",
                BillingEnvironment.LOCAL
        ));

        assertEquals("Referencia fiscal no debe apuntar a archivos de certificado.", ex.getMessage());
        assertFalse(ex.getMessage().contains("PROD_CERTIFICATE"));
    }

    @Test
    void shouldRejectProdFiscalSecretResolutionWithMockResolver() {
        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> localFiscalSecretResolver.resolveCertificate(
                "LOCAL_NOOP_CERT",
                BillingEnvironment.PROD
        ));

        assertEquals(LocalFiscalSecretResolverAdapter.PRODUCTIVE_RESOLVER_NOT_CONFIGURED_MESSAGE, ex.getMessage());
    }

    @Test
    void shouldNotExposeSensitiveFiscalRefValuesInResolverErrorsOrToString() {
        String sensitiveLookingRef = "SUPER-SECRET-PASSWORD.PEM";
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> localFiscalSecretResolver.resolveCertificatePassword(
                sensitiveLookingRef,
                BillingEnvironment.LOCAL
        ));

        assertFalse(ex.getMessage().contains(sensitiveLookingRef));
        assertFalse(new FiscalSecretResolution(FiscalSecretType.CERTIFICATE_PASSWORD, BillingEnvironment.LOCAL, true).toString().contains(sensitiveLookingRef));
    }

    @Test
    void shouldRejectLocalPlaceholderRefsForActiveProdProfile() {
        CreateCompanyBillingProfileCommand command = new CreateCompanyBillingProfileCommand(
                "20987654328",
                "EMPRESA PROD SAC",
                "AV. PROD 200",
                BillingEnvironment.PROD,
                null,
                null,
                "LOCAL_NOOP_CERT",
                "vault://billing/prod/certificate-password",
                "vault://billing/prod/provider",
                "prod-certificate",
                "VAULT"
        );

        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> profileService.create(command));

        assertEquals("certificateSecretRef must not use development placeholders in PROD", ex.getMessage());
        assertFalse(ex.getMessage().contains("LOCAL_NOOP_CERT"));
    }

    @Test
    void shouldRejectBetaPlaceholderRefsForActiveProdProfile() {
        CreateCompanyBillingProfileCommand command = new CreateCompanyBillingProfileCommand(
                "20987654329",
                "EMPRESA PROD SAC",
                "AV. PROD 200",
                BillingEnvironment.PROD,
                null,
                null,
                "vault://billing/prod/certificate",
                "BETA_SANDBOX_CERT_PASSWORD",
                "vault://billing/prod/provider",
                "prod-certificate",
                "VAULT"
        );

        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> profileService.create(command));

        assertEquals("certificatePasswordSecretRef must not use development placeholders in PROD", ex.getMessage());
        assertFalse(ex.getMessage().contains("BETA_SANDBOX_CERT_PASSWORD"));
    }

    @Test
    void shouldRejectLocalSecretProviderForActiveProdProfile() {
        CreateCompanyBillingProfileCommand command = new CreateCompanyBillingProfileCommand(
                "20987654330",
                "EMPRESA PROD SAC",
                "AV. PROD 200",
                BillingEnvironment.PROD,
                null,
                null,
                "vault://billing/prod/certificate",
                "vault://billing/prod/certificate-password",
                "vault://billing/prod/provider",
                "prod-certificate",
                "LOCAL"
        );

        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> profileService.create(command));

        assertEquals("secretProvider must be production managed for PROD", ex.getMessage());
    }

    @Test
    void shouldAllowStartupWithDefaultNonProductionFiscalConfig() {
        BillingFiscalProperties properties = new BillingFiscalProperties();
        BillingFiscalStartupValidator validator = new BillingFiscalStartupValidator(
                properties,
                stubProvider,
                stubXmlSigner,
                localFiscalSecretResolver
        );

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void shouldFailFastWhenProductionEnabledWithLocalFiscalSecretProvider() {
        BillingFiscalProperties properties = productionEnabledFiscalProperties();
        properties.getSecrets().setProvider(BillingFiscalProperties.SecretProvider.LOCAL);

        BillingFiscalStartupValidator validator = new BillingFiscalStartupValidator(
                properties,
                new ProductionReadyProvider(),
                new ProductionReadySigner(),
                new ProductionReadyFiscalSecretResolver()
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(ex.getMessage().contains("Configuracion fiscal productiva incompleta"));
        assertFalse(ex.getMessage().contains("LOCAL_NOOP_CERT"));
    }

    @Test
    void shouldFailFastWhenProductionEnabledWithMockElectronicProviderConfig() {
        BillingFiscalProperties properties = productionEnabledFiscalProperties();
        properties.getElectronic().setProvider(BillingFiscalProperties.ElectronicProvider.MOCK);

        BillingFiscalStartupValidator validator = new BillingFiscalStartupValidator(
                properties,
                new ProductionReadyProvider(),
                new ProductionReadySigner(),
                new ProductionReadyFiscalSecretResolver()
        );

        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void shouldFailFastWhenProductionEnabledWithNoopSignerConfig() {
        BillingFiscalProperties properties = productionEnabledFiscalProperties();
        properties.getSigner().setProvider(BillingFiscalProperties.SignerProvider.NOOP);

        BillingFiscalStartupValidator validator = new BillingFiscalStartupValidator(
                properties,
                new ProductionReadyProvider(),
                new ProductionReadySigner(),
                new ProductionReadyFiscalSecretResolver()
        );

        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void shouldFailFastWhenProductionEnabledWithNonProductionBeans() {
        BillingFiscalProperties properties = productionEnabledFiscalProperties();

        BillingFiscalStartupValidator validator = new BillingFiscalStartupValidator(
                properties,
                stubProvider,
                stubXmlSigner,
                localFiscalSecretResolver
        );

        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void shouldAllowStartupWhenProductionEnabledWithProductionConfigAndBeans() {
        BillingFiscalProperties properties = productionEnabledFiscalProperties();
        BillingFiscalStartupValidator validator = new BillingFiscalStartupValidator(
                properties,
                new ProductionReadyProvider(),
                new ProductionReadySigner(),
                new ProductionReadyFiscalSecretResolver()
        );

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void shouldRejectSecondDocumentForSameSaleEvenWithDifferentType() {
        documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.INVOICE,
                2L,
                "Cliente Factura",
                "10456789012"
        )));

        assertEquals("La venta ya tiene un comprobante asociado.", ex.getMessage());
        assertEquals(1L, seriesRepository.findById(2L).orElseThrow().currentNumber());
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
    void shouldBlockCreateFromSaleWhenSeriesCurrentNumberEqualsLastIssuedNumber() {
        documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
        forceSeriesCurrentNumber(1L, 1L);
        saleReadPort.sales.put(10L, completedSale(10L));

        int documentsBefore = documentRepository.storage.size();

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.createFromSale(10L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        )));

        assertEquals("El correlativo de la serie no es valido. Debe ser mayor al ultimo comprobante emitido.", ex.getMessage());
        assertFalse(documentRepository.existsBySaleId(10L));
        assertEquals(documentsBefore, documentRepository.storage.size());
        assertEquals(1L, seriesRepository.findById(1L).orElseThrow().currentNumber());
    }

    @Test
    void shouldBlockCreateFromSaleWhenSeriesCurrentNumberIsBelowLastIssuedNumber() {
        documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
        saleReadPort.sales.put(3L, completedSale(3L));
        documentService.createFromSale(3L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
        forceSeriesCurrentNumber(1L, 1L);
        saleReadPort.sales.put(11L, completedSale(11L));

        int documentsBefore = documentRepository.storage.size();

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.createFromSale(11L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        )));

        assertEquals("El correlativo de la serie no es valido. Debe ser mayor al ultimo comprobante emitido.", ex.getMessage());
        assertFalse(documentRepository.existsBySaleId(11L));
        assertEquals(documentsBefore, documentRepository.storage.size());
        assertEquals(1L, seriesRepository.findById(1L).orElseThrow().currentNumber());
    }

    @Test
    void shouldAllowCreateFromSaleWhenSeriesCurrentNumberIsAboveLastIssuedNumber() {
        documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
        saleReadPort.sales.put(3L, completedSale(3L));
        documentService.createFromSale(3L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
        forceSeriesCurrentNumber(1L, 5L);
        saleReadPort.sales.put(12L, completedSale(12L));

        ElectronicDocument created = documentService.createFromSale(12L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));

        assertEquals(5L, created.number());
        assertEquals("B001-00000005", created.fullNumber());
        assertEquals(6L, seriesRepository.findById(1L).orElseThrow().currentNumber());
    }

    @Test
    void shouldRejectReducingCurrentNumberBelowLastIssuedNumber() {
        documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
        saleReadPort.sales.put(3L, completedSale(3L));
        documentService.createFromSale(3L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> seriesService.update(
                1L,
                new UpdateBillingSeriesCommand(
                        ElectronicDocumentType.RECEIPT,
                        "B001",
                        1L,
                        BillingEnvironment.LOCAL,
                        true
                )
        ));

        assertEquals("El proximo correlativo debe ser mayor al ultimo comprobante emitido para esta serie.", ex.getMessage());
    }

    @Test
    void shouldRejectCurrentNumberEqualToLastIssuedNumber() {
        documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
        saleReadPort.sales.put(3L, completedSale(3L));
        documentService.createFromSale(3L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> seriesService.update(
                1L,
                new UpdateBillingSeriesCommand(
                        ElectronicDocumentType.RECEIPT,
                        "B001",
                        2L,
                        BillingEnvironment.LOCAL,
                        true
                )
        ));

        assertEquals("El proximo correlativo debe ser mayor al ultimo comprobante emitido para esta serie.", ex.getMessage());
    }

    @Test
    void shouldAllowIncreasingCurrentNumberAboveLastIssuedNumber() {
        documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));
        saleReadPort.sales.put(3L, completedSale(3L));
        documentService.createFromSale(3L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));

        BillingSeries updated = seriesService.update(
                1L,
                new UpdateBillingSeriesCommand(
                        ElectronicDocumentType.RECEIPT,
                        "B001",
                        10L,
                        BillingEnvironment.LOCAL,
                        true
                )
        );

        assertEquals(10L, updated.currentNumber());
    }

    @Test
    void shouldAllowUpdatingCurrentNumberWhenSeriesHasNoIssuedDocuments() {
        BillingSeries created = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B200",
                1L,
                BillingEnvironment.BETA,
                false
        ));

        BillingSeries updated = seriesService.update(
                created.id(),
                new UpdateBillingSeriesCommand(
                        ElectronicDocumentType.RECEIPT,
                        "B200",
                        1L,
                        BillingEnvironment.BETA,
                        true
                )
        );

        assertTrue(updated.active());
        assertEquals(1L, updated.currentNumber());
    }

    @Test
    void shouldAllowDeactivatingHistoricallyUsedSeriesWithoutBreakingTraceability() {
        ElectronicDocument created = documentService.createFromSale(1L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                null,
                null
        ));

        seriesService.deactivate(1L);

        BillingSeries disabledSeries = seriesService.getById(1L);
        ElectronicDocument persisted = documentRepository.findById(created.id()).orElseThrow();

        assertFalse(disabledSeries.active());
        assertEquals(1L, persisted.billingSeriesId());
        assertEquals("B001", persisted.series());
        assertEquals("B001-00000001", persisted.fullNumber());
    }

    @Test
    void shouldGenerateXml() {
        ElectronicDocument doc = createReceiptForSale(1L);
        ElectronicDocument generated = documentService.generateXml(doc.id());
        assertEquals(ElectronicDocumentStatus.GENERATED, generated.status());
        assertTrue(xmlRepository.storage.values().stream().anyMatch(xml -> xml.electronicDocumentId().equals(doc.id()) && xml.fileType() == BillingXmlFileType.GENERATED));
    }

    @Test
    void shouldGenerateXmlIdempotentlyWithoutDuplicateHistory() {
        ElectronicDocument doc = createReceiptForSale(1L);
        ElectronicDocument generated = documentService.generateXml(doc.id());
        int historyAfterFirstGenerate = historyRepository.findByElectronicDocumentId(doc.id()).size();
        int xmlFilesAfterFirstGenerate = xmlRepository.storage.size();

        ElectronicDocument repeated = documentService.generateXml(doc.id());

        assertEquals(ElectronicDocumentStatus.GENERATED, repeated.status());
        assertEquals(generated.xmlGeneratedAt(), repeated.xmlGeneratedAt());
        assertEquals(historyAfterFirstGenerate, historyRepository.findByElectronicDocumentId(doc.id()).size());
        assertEquals(xmlFilesAfterFirstGenerate, xmlRepository.storage.size());
    }

    @Test
    void shouldBlockRegeneratingXmlAfterSigning() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.generateXml(doc.id()));

        assertEquals("El estado actual no permite generar XML.", ex.getMessage());
        assertEquals(2, xmlRepository.storage.size());
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
    void shouldRegisterSignedXmlEvidenceMetadataWhenSigning() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());

        ElectronicDocument signed = documentService.sign(doc.id());

        List<ElectronicDocumentEvidence> evidence = documentService.evidence(signed.id());
        assertEquals(1, evidence.size());
        ElectronicDocumentEvidence signedXml = evidence.get(0);
        assertEquals(FiscalEvidenceType.SIGNED_XML, signedXml.evidenceType());
        assertEquals(FiscalEvidenceStorageProvider.DB_LEGACY, signedXml.storageProvider());
        assertEquals(FiscalEvidenceMetadataStatus.REGISTERED, signedXml.metadataStatus());
        assertEquals(BillingEnvironment.LOCAL, signedXml.environment());
        assertTrue(signedXml.simulated());
        assertEquals(signed.fullNumber() + "-signed.xml", signedXml.fileName());
        assertEquals("application/xml", signedXml.mimeType());
        assertEquals(64, signedXml.checksumSha256().length());
        assertEquals(signedXml.checksumSha256(), signedXml.contentHashSha256());
        assertNull(signedXml.providerTicket());
        assertNull(signedXml.attemptId());
    }

    @Test
    void shouldBlockSigningDraftDocument() {
        ElectronicDocument doc = createReceiptForSale(1L);

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.sign(doc.id()));

        assertEquals("El estado actual no permite firmar el XML.", ex.getMessage());
        assertFalse(ex.getMessage().contains("LOCAL_"));
        assertTrue(xmlRepository.findByElectronicDocumentIdAndFileType(doc.id(), BillingXmlFileType.SIGNED).isEmpty());
    }

    @Test
    void shouldSignXmlIdempotentlyWithoutDuplicateHistory() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        ElectronicDocument signed = documentService.sign(doc.id());
        int historyAfterFirstSign = historyRepository.findByElectronicDocumentId(doc.id()).size();
        int xmlFilesAfterFirstSign = xmlRepository.storage.size();
        int evidenceAfterFirstSign = evidenceRepository.findByElectronicDocumentId(doc.id()).size();

        ElectronicDocument repeated = documentService.sign(doc.id());

        assertEquals(ElectronicDocumentStatus.SIGNED, repeated.status());
        assertEquals(signed.signedAt(), repeated.signedAt());
        assertEquals(historyAfterFirstSign, historyRepository.findByElectronicDocumentId(doc.id()).size());
        assertEquals(xmlFilesAfterFirstSign, xmlRepository.storage.size());
        assertEquals(evidenceAfterFirstSign, evidenceRepository.findByElectronicDocumentId(doc.id()).size());
    }

    @Test
    void shouldBlockSigningAfterSent() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());
        documentService.send(doc.id());

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.sign(doc.id()));

        assertEquals("El estado actual no permite firmar el XML.", ex.getMessage());
    }

    @Test
    void shouldBlockSigningAcceptedDocument() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());
        ElectronicDocument accepted = documentService.send(doc.id());

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.sign(accepted.id()));

        assertEquals(ElectronicDocumentStatus.ACCEPTED, accepted.status());
        assertEquals("El estado actual no permite firmar el XML.", ex.getMessage());
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
    void shouldCreateSuccessfulSendAttemptWhenProviderAccepts() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());

        ElectronicDocument sent = documentService.send(doc.id());

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(doc.id());
        assertEquals(ElectronicDocumentStatus.ACCEPTED, sent.status());
        assertEquals(1, attempts.size());
        ElectronicDocumentAttempt attempt = attempts.get(0);
        assertEquals(FiscalOperation.SEND, attempt.operation());
        assertEquals(1, attempt.attemptNumber());
        assertEquals(FiscalAttemptResult.SUCCESS, attempt.result());
        assertNull(attempt.errorCategory());
        assertFalse(attempt.recoverable());
        assertEquals("ACCEPTED", attempt.providerStatus());
        assertEquals("T-ACC", attempt.providerTicket());
        assertEquals("Accepted by mock provider", attempt.providerMessage());
        assertEquals(64, attempt.requestHash().length());
        assertEquals(64, attempt.responseHash().length());
        assertTrue(attempt.simulated());
    }

    @Test
    void shouldRegisterProviderResponseEvidenceMetadataOnSend() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);

        documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        List<ElectronicDocumentEvidence> evidence = documentService.evidence(doc.id());
        ElectronicDocumentEvidence providerEvidence = evidence.stream()
                .filter(item -> item.evidenceType() == FiscalEvidenceType.PROVIDER_RESPONSE_METADATA)
                .findFirst()
                .orElseThrow();
        assertEquals(2, evidence.size());
        assertEquals(attempt.id(), providerEvidence.attemptId());
        assertEquals(FiscalEvidenceStorageProvider.NONE, providerEvidence.storageProvider());
        assertEquals(FiscalEvidenceMetadataStatus.REGISTERED, providerEvidence.metadataStatus());
        assertEquals("ACCEPTED", providerEvidence.providerStatus());
        assertEquals("T-ACC", providerEvidence.providerTicket());
        assertEquals(64, providerEvidence.checksumSha256().length());
        assertNull(providerEvidence.contentHashSha256());
        assertNull(providerEvidence.storageKey());
        assertTrue(providerEvidence.simulated());
    }

    @Test
    void shouldNotResendFinalDocument() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());
        ElectronicDocument accepted = documentService.send(doc.id());
        int callsAfterFirstSend = stubProvider.sendCalls();

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.send(accepted.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(doc.id());
        assertEquals("El estado actual no permite enviar el comprobante.", ex.getMessage());
        assertEquals(callsAfterFirstSend, stubProvider.sendCalls());
        assertEquals(2, attempts.size());
        assertEquals(FiscalAttemptResult.SUCCESS, attempts.get(0).result());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(1).result());
        assertEquals(FiscalErrorCategory.VALIDATION_ERROR, attempts.get(1).errorCategory());
        assertEquals(2, attempts.get(1).attemptNumber());
    }

    @Test
    void shouldBlockResendingSentDocumentWithoutProviderCall() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());
        ElectronicDocument signed = documentRepository.findById(doc.id()).orElseThrow();
        ElectronicDocument sent = documentRepository.save(new ElectronicDocument(
                signed.id(),
                signed.saleId(),
                signed.billingSeriesId(),
                signed.documentType(),
                ElectronicDocumentStatus.SENT,
                signed.environment(),
                signed.series(),
                signed.number(),
                signed.fullNumber(),
                signed.customerName(),
                signed.customerDocument(),
                signed.currencyCode(),
                signed.subtotalAmount(),
                signed.taxAmount(),
                signed.totalAmount(),
                signed.xmlGeneratedAt(),
                signed.signedAt(),
                Instant.now(),
                signed.providerTicket(),
                signed.providerMessage(),
                signed.createdAt(),
                signed.updatedAt(),
                signed.createdBy(),
                signed.updatedBy()
        ));

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.send(sent.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(doc.id());
        assertEquals("El comprobante ya fue marcado como enviado. No se reenvia en esta fase.", ex.getMessage());
        assertEquals(0, stubProvider.sendCalls());
        assertEquals(1, attempts.size());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(0).result());
        assertEquals(FiscalErrorCategory.VALIDATION_ERROR, attempts.get(0).errorCategory());
    }

    @Test
    void shouldSendAndMarkErrorWhenProviderReturnsError() {
        saleReadPort.sales.put(13L, completedSale(13L));
        ElectronicDocument doc = documentService.createFromSale(13L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                1L,
                "CLIENTE ERROR",
                null
        ));
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());

        ElectronicDocument sent = documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(ElectronicDocumentStatus.ERROR, sent.status());
        assertEquals(1, stubProvider.sendCalls());
        assertEquals(FiscalAttemptResult.FAILED, attempt.result());
        assertEquals(FiscalErrorCategory.PROVIDER_UNAVAILABLE, attempt.errorCategory());
        assertTrue(attempt.recoverable());
        assertTrue(attempt.simulated());
    }

    @Test
    void shouldClassifyTimeoutProviderResultWithoutRetry() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.timeout("T-TIMEOUT", "Provider timeout"));

        ElectronicDocument sent = documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(ElectronicDocumentStatus.ERROR, sent.status());
        assertEquals(1, stubProvider.sendCalls());
        assertEquals(FiscalAttemptResult.FAILED, attempt.result());
        assertEquals(FiscalErrorCategory.PROVIDER_TIMEOUT, attempt.errorCategory());
        assertTrue(attempt.recoverable());
        assertEquals("TIMEOUT", attempt.providerStatus());
    }

    @Test
    void shouldClassifyUnavailableProviderResultWithoutRetry() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.unavailable("T-UNAVAILABLE", "Provider unavailable"));

        ElectronicDocument sent = documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(ElectronicDocumentStatus.ERROR, sent.status());
        assertEquals(1, stubProvider.sendCalls());
        assertEquals(FiscalAttemptResult.FAILED, attempt.result());
        assertEquals(FiscalErrorCategory.PROVIDER_UNAVAILABLE, attempt.errorCategory());
        assertTrue(attempt.recoverable());
        assertEquals("UNAVAILABLE", attempt.providerStatus());
    }

    @Test
    void shouldClassifyCommunicationProviderResultWithoutRetry() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.communicationError("T-COMM", "Communication error"));

        ElectronicDocument sent = documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(ElectronicDocumentStatus.ERROR, sent.status());
        assertEquals(1, stubProvider.sendCalls());
        assertEquals(FiscalAttemptResult.FAILED, attempt.result());
        assertEquals(FiscalErrorCategory.COMMUNICATION_ERROR, attempt.errorCategory());
        assertTrue(attempt.recoverable());
        assertEquals("COMMUNICATION_ERROR", attempt.providerStatus());
    }

    @Test
    void shouldClassifyConfigurationProviderResultWithoutRetry() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.configurationError("T-CONFIG", "Configuration error"));

        ElectronicDocument sent = documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(ElectronicDocumentStatus.ERROR, sent.status());
        assertEquals(1, stubProvider.sendCalls());
        assertEquals(FiscalAttemptResult.FAILED, attempt.result());
        assertEquals(FiscalErrorCategory.CONFIGURATION_ERROR, attempt.errorCategory());
        assertFalse(attempt.recoverable());
        assertEquals("CONFIGURATION_ERROR", attempt.providerStatus());
    }

    @Test
    void shouldClassifyObservedProviderResultAsAcceptedWithObservation() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.observed("T-OBS", "Accepted with observations"));

        ElectronicDocument sent = documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(ElectronicDocumentStatus.ACCEPTED, sent.status());
        assertEquals(FiscalAttemptResult.SUCCESS, attempt.result());
        assertEquals(FiscalErrorCategory.PROVIDER_OBSERVED, attempt.errorCategory());
        assertFalse(attempt.recoverable());
        assertEquals("OBSERVED", attempt.providerStatus());
    }

    @Test
    void shouldClassifyPendingProviderResultWithoutFinalTransitionOrRetry() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        int historyBeforeSend = historyRepository.findByElectronicDocumentId(doc.id()).size();
        stubProvider.nextResult(ProviderSendResult.pending("T-PENDING", "Provider pending"));

        ElectronicDocument sent = documentService.send(doc.id());

        List<ElectronicDocumentStatusHistory> history = historyRepository.findByElectronicDocumentId(doc.id());
        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(ElectronicDocumentStatus.SENT, sent.status());
        assertEquals(1, stubProvider.sendCalls());
        assertEquals(historyBeforeSend + 1, history.size());
        assertEquals(ElectronicDocumentStatus.SENT, history.get(history.size() - 1).newStatus());
        assertEquals(FiscalAttemptResult.PENDING, attempt.result());
        assertEquals(FiscalErrorCategory.PROVIDER_PENDING, attempt.errorCategory());
        assertFalse(attempt.recoverable());
        assertEquals("PENDING", attempt.providerStatus());
    }

    @Test
    void shouldRetryManualFromErrorAfterTimeoutWithoutConsumingCorrelativeOrRebuildingEvidence() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        long currentNumberBeforeRetry = seriesRepository.findById(1L).orElseThrow().currentNumber();
        int generatorCallsBeforeRetry = stubXmlGenerator.generateCalls();
        int signerCallsBeforeRetry = stubXmlSigner.signCalls();
        stubProvider.nextResult(ProviderSendResult.timeout("T-TIMEOUT", "Provider timeout"));
        ElectronicDocument failed = documentService.send(doc.id());
        stubProvider.nextResult(ProviderSendResult.accepted("T-RETRY", "Accepted after retry"));

        ElectronicDocument retried = documentService.retrySend(failed.id());

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(doc.id());
        ElectronicDocumentAttempt retryAttempt = attempts.get(1);
        assertEquals(ElectronicDocumentStatus.ERROR, failed.status());
        assertEquals(ElectronicDocumentStatus.ACCEPTED, retried.status());
        assertEquals(2, stubProvider.sendCalls());
        assertEquals(2, attempts.size());
        assertEquals(FiscalAttemptResult.FAILED, attempts.get(0).result());
        assertEquals(FiscalErrorCategory.PROVIDER_TIMEOUT, attempts.get(0).errorCategory());
        assertEquals(2, retryAttempt.attemptNumber());
        assertEquals(FiscalAttemptResult.SUCCESS, retryAttempt.result());
        assertTrue(retryAttempt.simulated());
        assertEquals(currentNumberBeforeRetry, seriesRepository.findById(1L).orElseThrow().currentNumber());
        assertEquals(generatorCallsBeforeRetry, stubXmlGenerator.generateCalls());
        assertEquals(signerCallsBeforeRetry, stubXmlSigner.signCalls());
    }

    @Test
    void shouldRetryManualFromErrorAfterProviderUnavailable() {
        ElectronicDocument retried = retryRecoverableFailure(ProviderSendResult.unavailable("T-UNAVAILABLE", "Provider unavailable"));
        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(retried.id());

        assertEquals(ElectronicDocumentStatus.ACCEPTED, retried.status());
        assertEquals(2, stubProvider.sendCalls());
        assertEquals(FiscalErrorCategory.PROVIDER_UNAVAILABLE, attempts.get(0).errorCategory());
        assertEquals(FiscalAttemptResult.SUCCESS, attempts.get(1).result());
        assertEquals(2, attempts.get(1).attemptNumber());
    }

    @Test
    void shouldRetryManualFromErrorAfterCommunicationError() {
        ElectronicDocument retried = retryRecoverableFailure(ProviderSendResult.communicationError("T-COMM", "Communication error"));
        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(retried.id());

        assertEquals(ElectronicDocumentStatus.ACCEPTED, retried.status());
        assertEquals(2, stubProvider.sendCalls());
        assertEquals(FiscalErrorCategory.COMMUNICATION_ERROR, attempts.get(0).errorCategory());
        assertEquals(FiscalAttemptResult.SUCCESS, attempts.get(1).result());
        assertEquals(2, attempts.get(1).attemptNumber());
    }

    @Test
    void shouldBlockManualRetryFromErrorWhenLastAttemptWasProviderRejected() {
        ElectronicDocument error = createErroredSignedReceiptWithLastAttempt(FiscalErrorCategory.PROVIDER_REJECTED, true);

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(error.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(error.id());
        assertEquals("La categoria fiscal del ultimo attempt SEND no permite retry manual.", ex.getMessage());
        assertEquals(0, stubProvider.sendCalls());
        assertEquals(ElectronicDocumentStatus.ERROR, documentRepository.findById(error.id()).orElseThrow().status());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(1).result());
        assertEquals(FiscalErrorCategory.PROVIDER_REJECTED, attempts.get(1).errorCategory());
    }

    @Test
    void shouldBlockManualRetryFromErrorWhenLastAttemptWasConfigurationError() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.configurationError("T-CONFIG", "Configuration error"));
        ElectronicDocument failed = documentService.send(doc.id());
        stubProvider.nextResult(ProviderSendResult.accepted("T-RETRY", "Accepted after retry"));

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(failed.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(doc.id());
        assertEquals("El ultimo attempt SEND no es recuperable para retry manual.", ex.getMessage());
        assertEquals(1, stubProvider.sendCalls());
        assertEquals(ElectronicDocumentStatus.ERROR, documentRepository.findById(doc.id()).orElseThrow().status());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(1).result());
        assertEquals(FiscalErrorCategory.CONFIGURATION_ERROR, attempts.get(1).errorCategory());
    }

    @Test
    void shouldBlockManualRetryFromErrorWhenLastAttemptWasInternalError() {
        ElectronicDocument error = createErroredSignedReceiptWithLastAttempt(FiscalErrorCategory.INTERNAL_ERROR, true);

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(error.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(error.id());
        assertEquals("La categoria fiscal del ultimo attempt SEND no permite retry manual.", ex.getMessage());
        assertEquals(0, stubProvider.sendCalls());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(1).result());
        assertEquals(FiscalErrorCategory.INTERNAL_ERROR, attempts.get(1).errorCategory());
    }

    @Test
    void shouldBlockManualRetryFromErrorWhenLastAttemptIsNotRecoverable() {
        ElectronicDocument error = createErroredSignedReceiptWithLastAttempt(FiscalErrorCategory.PROVIDER_TIMEOUT, false);

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(error.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(error.id());
        assertEquals("El ultimo attempt SEND no es recuperable para retry manual.", ex.getMessage());
        assertEquals(0, stubProvider.sendCalls());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(1).result());
        assertEquals(FiscalErrorCategory.PROVIDER_TIMEOUT, attempts.get(1).errorCategory());
    }

    @Test
    void shouldBlockManualRetryFromErrorWhenNoLastSendAttemptExists() {
        ElectronicDocument signed = createSignedReceiptForSale(1L);
        ElectronicDocument error = saveDocumentWithStatus(signed, ElectronicDocumentStatus.ERROR);

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(error.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(error.id());
        assertEquals("No existe un attempt SEND fallido recuperable para reintentar.", ex.getMessage());
        assertEquals(0, stubProvider.sendCalls());
        assertEquals(1, attempts.size());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(0).result());
        assertEquals(FiscalErrorCategory.VALIDATION_ERROR, attempts.get(0).errorCategory());
    }

    @Test
    void shouldBlockManualRetryFromErrorWhenSignedXmlIsMissing() {
        ElectronicDocument error = createErroredSignedReceiptWithLastAttempt(FiscalErrorCategory.PROVIDER_TIMEOUT, true);
        xmlRepository.storage.remove(error.id() + "-" + BillingXmlFileType.SIGNED);

        BillingNotFoundException ex = assertThrows(BillingNotFoundException.class, () -> documentService.retrySend(error.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(error.id());
        assertEquals("XML firmado no disponible. Firma el XML antes de enviar.", ex.getMessage());
        assertEquals(0, stubProvider.sendCalls());
        assertEquals(ElectronicDocumentStatus.ERROR, documentRepository.findById(error.id()).orElseThrow().status());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(1).result());
        assertEquals(FiscalErrorCategory.VALIDATION_ERROR, attempts.get(1).errorCategory());
    }

    @Test
    void shouldBlockManualRetryFromSignedDocumentAndIndicateNormalSend() {
        ElectronicDocument signed = createSignedReceiptForSale(1L);

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(signed.id()));

        assertEquals("El comprobante firmado debe enviarse con el envio normal, no con retry manual.", ex.getMessage());
        assertEquals(0, stubProvider.sendCalls());
        assertEquals(ElectronicDocumentStatus.SIGNED, documentRepository.findById(signed.id()).orElseThrow().status());
        assertEquals(ElectronicDocumentStatus.ACCEPTED, documentService.send(signed.id()).status());
    }

    @Test
    void shouldBlockManualRetryFromSentPendingDocument() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.pending("T-PENDING", "Provider pending"));
        ElectronicDocument pending = documentService.send(doc.id());

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(pending.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(doc.id());
        assertEquals("El retry manual no aplica a comprobantes SENT/PENDING; queda reservado para consulta o reconciliacion.", ex.getMessage());
        assertEquals(ElectronicDocumentStatus.SENT, pending.status());
        assertEquals(1, stubProvider.sendCalls());
        assertEquals(FiscalAttemptResult.PENDING, attempts.get(0).result());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(1).result());
    }

    @Test
    void shouldBlockManualRetryFromAcceptedDocument() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        ElectronicDocument accepted = documentService.send(doc.id());

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(accepted.id()));

        assertEquals("El retry manual solo esta permitido para comprobantes en ERROR.", ex.getMessage());
        assertEquals(ElectronicDocumentStatus.ACCEPTED, documentRepository.findById(doc.id()).orElseThrow().status());
        assertEquals(1, stubProvider.sendCalls());
    }

    @Test
    void shouldBlockManualRetryFromRejectedDocument() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.rejected("T-REJ", "Rejected by provider"));
        ElectronicDocument rejected = documentService.send(doc.id());

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(rejected.id()));

        assertEquals("El retry manual solo esta permitido para comprobantes en ERROR.", ex.getMessage());
        assertEquals(ElectronicDocumentStatus.REJECTED, documentRepository.findById(doc.id()).orElseThrow().status());
        assertEquals(1, stubProvider.sendCalls());
    }

    @Test
    void shouldSanitizeProviderMetadataSavedByManualRetryAttempt() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.timeout("T-TIMEOUT", "Provider timeout"));
        ElectronicDocument failed = documentService.send(doc.id());
        String unsafeCode = "CODE token=secret vault://billing/prod/provider C:\\certs\\real.pfx " + "x".repeat(120);
        String unsafeCorrelationId = "CORR\n password=hidden file:/tmp/cert.pem <xml>payload</xml>";
        String unsafeMessage = "Accepted token=super-secret vault://billing/prod/provider C:\\certs\\real.pfx <xml>payload</xml>";
        stubProvider.nextResult(new ProviderSendResult(
                ElectronicDocumentStatus.ACCEPTED,
                "T-RETRY token=hidden",
                unsafeMessage,
                ProviderSendStatus.ACCEPTED,
                unsafeCode,
                unsafeCorrelationId,
                null,
                false,
                false,
                false,
                false
        ));

        ElectronicDocument retried = documentService.retrySend(failed.id());

        ElectronicDocumentAttempt retryAttempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(1);
        assertEquals(ElectronicDocumentStatus.ACCEPTED, retried.status());
        assertSanitizedProviderText(retried.providerMessage());
        assertSanitizedProviderText(retryAttempt.providerMessage());
        assertSanitizedProviderText(retryAttempt.providerTicket());
        assertSanitizedProviderText(retryAttempt.providerCode());
        assertSanitizedProviderText(retryAttempt.providerCorrelationId());
        assertEquals(64, retryAttempt.requestHash().length());
        assertEquals(64, retryAttempt.responseHash().length());
    }

    @Test
    void shouldKeepManualRetryAttemptsSimulatedInBeta() {
        profileService.create(new CreateCompanyBillingProfileCommand(
                "20999999995",
                "INKTOY BETA RETRY SAC",
                "AV. BETA 200",
                BillingEnvironment.BETA,
                null,
                null
        ));
        BillingSeries betaSeries = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B302",
                1L,
                BillingEnvironment.BETA
        ));
        saleReadPort.sales.put(6L, completedSale(6L));
        ElectronicDocument doc = documentService.createFromSale(6L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                betaSeries.id(),
                null,
                null
        ));
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());
        stubProvider.nextResult(ProviderSendResult.unavailable("T-BETA-ERR", "Provider unavailable"));
        ElectronicDocument failed = documentService.send(doc.id());
        stubProvider.nextResult(ProviderSendResult.accepted("T-BETA-RETRY", "Accepted after retry"));

        documentService.retrySend(failed.id());

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(doc.id());
        assertTrue(attempts.get(0).simulated());
        assertTrue(attempts.get(1).simulated());
    }

    @Test
    void shouldKeepProdManualRetryBlockedWithoutProductionReadiness() {
        BillingSeries prodSeries = createProdReceiptSeries("20999999996", "B105");
        ElectronicDocument error = saveDocumentForSeries(11L, prodSeries, ElectronicDocumentStatus.ERROR, Instant.now(), Instant.now(), Instant.now());
        saveSignedXml(error, "<xml>signed-prod</xml>");
        saveSendAttempt(error, 1, FiscalAttemptResult.FAILED, FiscalErrorCategory.PROVIDER_TIMEOUT, true, "TIMEOUT");

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.retrySend(error.id()));

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(error.id());
        assertEquals(BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE, ex.getMessage());
        assertEquals(0, stubProvider.sendCalls());
        assertEquals(ElectronicDocumentStatus.ERROR, documentRepository.findById(error.id()).orElseThrow().status());
        assertEquals(FiscalAttemptResult.BLOCKED, attempts.get(1).result());
        assertEquals(FiscalErrorCategory.CONFIGURATION_ERROR, attempts.get(1).errorCategory());
    }

    @Test
    void shouldNotRetryAutomaticallyAfterRecoverableFailure() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.timeout("T-TIMEOUT", "Provider timeout"));

        ElectronicDocument failed = documentService.send(doc.id());

        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(doc.id());
        assertEquals(ElectronicDocumentStatus.ERROR, failed.status());
        assertEquals(1, stubProvider.sendCalls());
        assertEquals(1, attempts.size());
        assertEquals(FiscalAttemptResult.FAILED, attempts.get(0).result());
        assertTrue(attempts.get(0).recoverable());
    }

    @Test
    void shouldPersistSignedXmlEvidenceMetadataWithoutPayload() {
        ElectronicDocument doc = createReceiptForSale(1L);
        ElectronicDocumentEvidence evidence = signedXmlEvidence(doc.id(), "a".repeat(64));

        ElectronicDocumentEvidence saved = evidenceRepository.save(evidence);

        assertNotNull(saved.id());
        assertEquals(doc.id(), saved.electronicDocumentId());
        assertEquals(FiscalEvidenceType.SIGNED_XML, saved.evidenceType());
        assertEquals(FiscalEvidenceStorageProvider.DB_LEGACY, saved.storageProvider());
        assertEquals("billing/LOCAL/" + doc.id() + "/SIGNED_XML/" + "a".repeat(64), saved.storageKey());
        assertEquals("application/xml", saved.mimeType());
        assertEquals("a".repeat(64), saved.checksumSha256());
        assertTrue(saved.simulated());
        assertEquals(1, evidenceRepository.findByElectronicDocumentId(doc.id()).size());
    }

    @Test
    void shouldPersistProviderResponseEvidenceMetadataLinkedToAttempt() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        ElectronicDocument error = saveDocumentWithStatus(doc, ElectronicDocumentStatus.ERROR);
        ElectronicDocumentAttempt attempt = saveSendAttempt(error, 1, FiscalAttemptResult.FAILED, FiscalErrorCategory.PROVIDER_TIMEOUT, true, "TIMEOUT");
        ElectronicDocumentEvidence evidence = new ElectronicDocumentEvidence(
                null,
                error.id(),
                attempt.id(),
                FiscalEvidenceType.PROVIDER_RESPONSE_METADATA,
                BillingEnvironment.LOCAL,
                true,
                FiscalEvidenceStorageProvider.NONE,
                null,
                null,
                null,
                null,
                "b".repeat(64),
                null,
                "T-TIMEOUT",
                "CORR-123",
                "TIMEOUT",
                FiscalEvidenceMetadataStatus.REGISTERED,
                null,
                "tester",
                "trace-123",
                "Provider metadata only"
        );

        ElectronicDocumentEvidence saved = evidenceRepository.save(evidence);

        assertEquals(attempt.id(), saved.attemptId());
        assertEquals(FiscalEvidenceType.PROVIDER_RESPONSE_METADATA, saved.evidenceType());
        assertEquals(1, evidenceRepository.findByAttemptId(attempt.id()).size());
    }

    @Test
    void shouldRejectEvidenceMetadataWithRawXml() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> new ElectronicDocumentEvidence(
                null, 1L, null, FiscalEvidenceType.CDR, BillingEnvironment.LOCAL, true,
                FiscalEvidenceStorageProvider.NONE, null, null, null, null, null, null,
                null, null, null, FiscalEvidenceMetadataStatus.REGISTERED, null, "tester", null,
                "<xml>raw payload</xml>"
        ));

        assertTrue(ex.getMessage().contains("unsafe fiscal metadata"));
    }

    @Test
    void shouldRejectEvidenceMetadataWithCertificateOrPrivateKeyMaterial() {
        assertThrows(BillingBusinessRuleException.class, () -> evidenceWithNotes("-----BEGIN CERTIFICATE-----"));
        assertThrows(BillingBusinessRuleException.class, () -> evidenceWithNotes("-----BEGIN PRIVATE KEY-----"));
    }

    @Test
    void shouldRejectEvidenceMetadataWithTokensPasswordsOrSecretRefs() {
        assertThrows(BillingBusinessRuleException.class, () -> evidenceWithNotes("token=secret"));
        assertThrows(BillingBusinessRuleException.class, () -> evidenceWithNotes("password=secret"));
        assertThrows(BillingBusinessRuleException.class, () -> evidenceWithNotes("vault://billing/prod/provider"));
    }

    @Test
    void shouldRejectWindowsAbsoluteStorageKey() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> evidenceWithStorageKey("C:\\billing\\signed.xml"));

        assertEquals("storageKey must be a relative opaque key", ex.getMessage());
    }

    @Test
    void shouldRejectLinuxAbsoluteStorageKey() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> evidenceWithStorageKey("/etc/billing/signed.xml"));

        assertEquals("storageKey must be a relative opaque key", ex.getMessage());
    }

    @Test
    void shouldRejectParentTraversalStorageKey() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> evidenceWithStorageKey("billing/LOCAL/../signed.xml"));

        assertEquals("storageKey must be a relative opaque key", ex.getMessage());
    }

    @Test
    void shouldRejectInvalidEvidenceSha256Hash() {
        BillingBusinessRuleException ex = assertThrows(BillingBusinessRuleException.class, () -> signedXmlEvidence(1L, "abc"));

        assertEquals("checksumSha256 must be a valid SHA-256 hex digest", ex.getMessage());
    }

    @Test
    void shouldAcceptValidEvidenceSha256Hash() {
        ElectronicDocumentEvidence evidence = signedXmlEvidence(1L, "ABCDEF" + "a".repeat(58));

        assertEquals("abcdef" + "a".repeat(58), evidence.checksumSha256());
    }

    @Test
    void shouldKeepEvidenceMetadataSimulatedForLocalAndBeta() {
        ElectronicDocumentEvidence local = signedXmlEvidence(1L, "a".repeat(64));
        ElectronicDocumentEvidence beta = new ElectronicDocumentEvidence(
                null,
                2L,
                null,
                FiscalEvidenceType.SIGNED_XML,
                BillingEnvironment.BETA,
                true,
                FiscalEvidenceStorageProvider.DB_LEGACY,
                "billing/BETA/2/SIGNED_XML/" + "b".repeat(64),
                "B001-00000002-signed.xml",
                "application/xml",
                128L,
                "b".repeat(64),
                "b".repeat(64),
                null,
                null,
                null,
                FiscalEvidenceMetadataStatus.REGISTERED,
                null,
                "tester",
                null,
                "Metadata only"
        );

        assertTrue(local.simulated());
        assertTrue(beta.simulated());
    }

    @Test
    void shouldRejectDuplicateEvidenceForSameAttemptTypeAndChecksum() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        ElectronicDocument error = saveDocumentWithStatus(doc, ElectronicDocumentStatus.ERROR);
        ElectronicDocumentAttempt attempt = saveSendAttempt(error, 1, FiscalAttemptResult.FAILED, FiscalErrorCategory.PROVIDER_TIMEOUT, true, "TIMEOUT");
        ElectronicDocumentEvidence evidence = providerEvidence(error.id(), attempt.id(), "c".repeat(64));
        evidenceRepository.save(evidence);

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> evidenceRepository.save(providerEvidence(error.id(), attempt.id(), "c".repeat(64))));

        assertEquals("La evidencia fiscal ya esta registrada para este intento.", ex.getMessage());
    }

    @Test
    void shouldRecordProviderResponseEvidenceForSendAndRetryWithoutDuplicatingSignedXml() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(ProviderSendResult.timeout("T-TIMEOUT", "Provider timeout"));
        ElectronicDocument failed = documentService.send(doc.id());
        stubProvider.nextResult(ProviderSendResult.accepted("T-RETRY", "Accepted after retry"));

        documentService.retrySend(failed.id());

        List<ElectronicDocumentEvidence> evidence = evidenceRepository.findByElectronicDocumentId(doc.id());
        long signedXmlCount = evidence.stream()
                .filter(item -> item.evidenceType() == FiscalEvidenceType.SIGNED_XML)
                .count();
        List<ElectronicDocumentEvidence> providerEvidence = evidence.stream()
                .filter(item -> item.evidenceType() == FiscalEvidenceType.PROVIDER_RESPONSE_METADATA)
                .toList();
        List<ElectronicDocumentAttempt> attempts = attemptRepository.findByElectronicDocumentId(doc.id());

        assertEquals(3, evidence.size());
        assertEquals(1, signedXmlCount);
        assertEquals(2, providerEvidence.size());
        assertEquals(attempts.get(0).id(), providerEvidence.get(0).attemptId());
        assertEquals(attempts.get(1).id(), providerEvidence.get(1).attemptId());
        assertEquals("TIMEOUT", providerEvidence.get(0).providerStatus());
        assertEquals("ACCEPTED", providerEvidence.get(1).providerStatus());
    }

    @Test
    void shouldSanitizeProviderMessageBeforeSavingAttemptAndDocument() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());
        String unsafeMessage = "Accepted\n token=super-secret vault://billing/prod/provider C:\\certs\\real.pfx <xml>payload</xml> " + "x".repeat(500);
        stubProvider.nextResult(new ProviderSendResult(ElectronicDocumentStatus.ACCEPTED, "T-ACC token=hidden", unsafeMessage));

        ElectronicDocument sent = documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(ElectronicDocumentStatus.ACCEPTED, sent.status());
        assertSanitizedProviderText(sent.providerMessage());
        assertSanitizedProviderText(attempt.providerMessage());
        assertSanitizedProviderText(attempt.providerTicket());
        assertTrue(attempt.providerMessage().length() <= 400);
        assertEquals(sent.providerMessage(), attempt.providerMessage());
    }

    @Test
    void shouldSanitizeProviderCodeAndCorrelationIdBeforeSavingAttempt() {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        String unsafeCode = "CODE token=secret vault://billing/prod/provider C:\\certs\\real.pfx " + "x".repeat(120);
        String unsafeCorrelationId = "CORR\n password=hidden file:/tmp/cert.pem <xml>payload</xml>";
        stubProvider.nextResult(new ProviderSendResult(
                ElectronicDocumentStatus.ACCEPTED,
                "T-ACC",
                "Accepted",
                ProviderSendStatus.ACCEPTED,
                unsafeCode,
                unsafeCorrelationId,
                null,
                false,
                false,
                false,
                false
        ));

        documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertSanitizedProviderText(attempt.providerCode());
        assertSanitizedProviderText(attempt.providerCorrelationId());
        assertTrue(attempt.providerCode().length() <= 80);
        assertTrue(attempt.providerCorrelationId().length() <= 120);
    }

    @Test
    void shouldRecordRejectedSendAttempt() {
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

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(ElectronicDocumentStatus.REJECTED, sent.status());
        assertEquals(FiscalAttemptResult.FAILED, attempt.result());
        assertEquals(FiscalErrorCategory.PROVIDER_REJECTED, attempt.errorCategory());
        assertFalse(attempt.recoverable());
        assertEquals("REJECTED", attempt.providerStatus());
        assertEquals("T-REJ", attempt.providerTicket());
    }

    @Test
    void shouldRecordFailedAttemptWhenProviderThrows() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());
        stubProvider.failWith(new RuntimeException("timeout token=secret vault://billing/prod/provider C:\\certs\\real.pfx"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> documentService.send(doc.id()));

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals("timeout token=secret vault://billing/prod/provider C:\\certs\\real.pfx", ex.getMessage());
        assertEquals(FiscalAttemptResult.FAILED, attempt.result());
        assertEquals(FiscalErrorCategory.PROVIDER_TIMEOUT, attempt.errorCategory());
        assertTrue(attempt.recoverable());
        assertEquals("TIMEOUT", attempt.providerStatus());
        assertSanitizedProviderText(attempt.providerMessage());
        assertEquals(1, stubProvider.sendCalls());
    }

    @Test
    void shouldRecordBlockedAttemptWhenSignedXmlIsMissing() {
        ElectronicDocument doc = createReceiptForSale(1L);
        documentService.generateXml(doc.id());
        ElectronicDocument generated = documentRepository.findById(doc.id()).orElseThrow();
        ElectronicDocument signedWithoutXml = documentRepository.save(new ElectronicDocument(
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
                generated.sentAt(),
                generated.providerTicket(),
                generated.providerMessage(),
                generated.createdAt(),
                generated.updatedAt(),
                generated.createdBy(),
                generated.updatedBy()
        ));
        xmlRepository.storage.remove(signedWithoutXml.id() + "-" + BillingXmlFileType.SIGNED);

        BillingNotFoundException ex = assertThrows(BillingNotFoundException.class, () -> documentService.send(signedWithoutXml.id()));

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals("XML firmado no disponible. Firma el XML antes de enviar.", ex.getMessage());
        assertEquals(FiscalAttemptResult.BLOCKED, attempt.result());
        assertEquals(FiscalErrorCategory.VALIDATION_ERROR, attempt.errorCategory());
        assertEquals(0, stubProvider.sendCalls());
    }

    @Test
    void shouldAllowBetaSimulationFlow() {
        profileService.create(new CreateCompanyBillingProfileCommand(
                "20999999990",
                "INKTOY BETA SAC",
                "AV. BETA 100",
                BillingEnvironment.BETA,
                null,
                null
        ));
        BillingSeries betaSeries = seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                "B301",
                1L,
                BillingEnvironment.BETA
        ));
        saleReadPort.sales.put(5L, completedSale(5L));

        ElectronicDocument doc = documentService.createFromSale(5L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                betaSeries.id(),
                null,
                null
        ));
        documentService.generateXml(doc.id());
        documentService.sign(doc.id());
        ElectronicDocument sent = documentService.send(doc.id());

        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(doc.id()).get(0);
        assertEquals(BillingEnvironment.BETA, sent.environment());
        assertEquals(ElectronicDocumentStatus.ACCEPTED, sent.status());
        assertTrue(attempt.simulated());
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
    void shouldBlockProdCreateFromSaleWhenRuntimeIsNotProductionReadyWithoutConsumingCorrelative() {
        BillingSeries prodSeries = createProdReceiptSeries("20999999991", "B101");
        saleReadPort.sales.put(8L, completedSale(8L));

        int documentsBefore = documentRepository.storage.size();

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.createFromSale(8L, new CreateElectronicDocumentFromSaleCommand(
                ElectronicDocumentType.RECEIPT,
                prodSeries.id(),
                null,
                null
        )));

        assertEquals(BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE, ex.getMessage());
        assertFalse(documentRepository.existsBySaleId(8L));
        assertEquals(documentsBefore, documentRepository.storage.size());
        assertEquals(1L, seriesRepository.findById(prodSeries.id()).orElseThrow().currentNumber());
    }

    @Test
    void shouldBlockProdWhenOnlyMockSecretResolverIsAvailableEvenIfProviderAndSignerAreProductionReady() {
        BillingRuntimeSafetyPolicy policy = new BillingRuntimeSafetyPolicy(
                new ProductionReadyProvider(),
                new ProductionReadySigner(),
                localFiscalSecretResolver
        );

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> policy.assertCanCreateFromSale(BillingEnvironment.PROD));

        assertFalse(policy.isProductionReady());
        assertEquals(BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE, ex.getMessage());
    }

    @Test
    void shouldBlockSigningInProdWhenRealSignatureIsNotAvailable() {
        BillingSeries prodSeries = createProdReceiptSeries("20999999992", "B102");
        ElectronicDocument generated = saveDocumentForSeries(8L, prodSeries, ElectronicDocumentStatus.GENERATED, Instant.now(), null, null);
        xmlRepository.save(new BillingXmlFile(
                null,
                generated.id(),
                BillingXmlFileType.GENERATED,
                generated.fullNumber() + ".xml",
                "<xml>generated</xml>",
                "application/xml",
                null,
                "tester"
        ));

        BillingConflictException ex = assertThrows(BillingConflictException.class, () -> documentService.sign(generated.id()));
        assertEquals(BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE, ex.getMessage());

        ElectronicDocument persisted = documentRepository.findById(generated.id()).orElseThrow();
        assertEquals(ElectronicDocumentStatus.GENERATED, persisted.status());
        assertTrue(xmlRepository.findByElectronicDocumentIdAndFileType(generated.id(), BillingXmlFileType.SIGNED).isEmpty());
    }

    @Test
    void shouldBlockProdSendWhenProviderIsMockWithoutChangingStatus() {
        BillingSeries prodSeries = createProdReceiptSeries("20999999993", "B103");
        ElectronicDocument signed = saveDocumentForSeries(9L, prodSeries, ElectronicDocumentStatus.SIGNED, Instant.now(), Instant.now(), null);
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
        assertEquals(BillingRuntimeSafetyPolicy.PRODUCTION_NOT_CONFIGURED_MESSAGE, ex.getMessage());

        ElectronicDocument persisted = documentRepository.findById(signed.id()).orElseThrow();
        ElectronicDocumentAttempt attempt = attemptRepository.findByElectronicDocumentId(signed.id()).get(0);
        assertEquals(ElectronicDocumentStatus.SIGNED, persisted.status());
        assertNull(persisted.sentAt());
        assertEquals(FiscalAttemptResult.BLOCKED, attempt.result());
        assertEquals(FiscalErrorCategory.CONFIGURATION_ERROR, attempt.errorCategory());
        assertFalse(historyRepository.findByElectronicDocumentId(signed.id()).stream().anyMatch(h -> h.newStatus() == ElectronicDocumentStatus.SENT));
    }

    @Test
    void shouldNotAllowMockProviderToAcceptProdDocument() {
        BillingSeries prodSeries = createProdReceiptSeries("20999999994", "B104");
        ElectronicDocument signed = saveDocumentForSeries(10L, prodSeries, ElectronicDocumentStatus.SIGNED, Instant.now(), Instant.now(), null);

        ProviderSendResult result = new MockElectronicBillingProviderAdapter().send(signed, "<xml>signed</xml>");

        assertEquals(ElectronicDocumentStatus.ERROR, result.status());
        assertNotEquals(ElectronicDocumentStatus.ACCEPTED, result.status());
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

    private ElectronicDocument createSignedReceiptForSale(Long saleId) {
        ElectronicDocument doc = createReceiptForSale(saleId);
        documentService.generateXml(doc.id());
        return documentService.sign(doc.id());
    }

    private ElectronicDocumentEvidence signedXmlEvidence(Long documentId, String checksum) {
        return new ElectronicDocumentEvidence(
                null,
                documentId,
                null,
                FiscalEvidenceType.SIGNED_XML,
                BillingEnvironment.LOCAL,
                true,
                FiscalEvidenceStorageProvider.DB_LEGACY,
                "billing/LOCAL/" + documentId + "/SIGNED_XML/" + checksum.toLowerCase(),
                "B001-00000001-signed.xml",
                "application/xml",
                128L,
                checksum,
                checksum,
                null,
                null,
                null,
                FiscalEvidenceMetadataStatus.REGISTERED,
                null,
                "tester",
                "trace-123",
                "Metadata only"
        );
    }

    private ElectronicDocumentEvidence providerEvidence(Long documentId, Long attemptId, String checksum) {
        return new ElectronicDocumentEvidence(
                null,
                documentId,
                attemptId,
                FiscalEvidenceType.PROVIDER_RESPONSE_METADATA,
                BillingEnvironment.LOCAL,
                true,
                FiscalEvidenceStorageProvider.NONE,
                null,
                null,
                null,
                null,
                checksum,
                null,
                "T-1",
                "CORR-1",
                "TIMEOUT",
                FiscalEvidenceMetadataStatus.REGISTERED,
                null,
                "tester",
                null,
                "Metadata only"
        );
    }

    private ElectronicDocumentEvidence evidenceWithNotes(String notes) {
        return new ElectronicDocumentEvidence(
                null, 1L, null, FiscalEvidenceType.PROVIDER_RESPONSE_METADATA, BillingEnvironment.LOCAL, true,
                FiscalEvidenceStorageProvider.NONE, null, null, null, null, "a".repeat(64), null,
                null, null, null, FiscalEvidenceMetadataStatus.REGISTERED, null, "tester", null, notes
        );
    }

    private ElectronicDocumentEvidence evidenceWithStorageKey(String storageKey) {
        return new ElectronicDocumentEvidence(
                null, 1L, null, FiscalEvidenceType.SIGNED_XML, BillingEnvironment.LOCAL, true,
                FiscalEvidenceStorageProvider.DB_LEGACY, storageKey, "B001-00000001-signed.xml", "application/xml", 128L,
                "a".repeat(64), "a".repeat(64), null, null, null, FiscalEvidenceMetadataStatus.REGISTERED,
                null, "tester", null, "Metadata only"
        );
    }

    private ElectronicDocument retryRecoverableFailure(ProviderSendResult firstResult) {
        ElectronicDocument doc = createSignedReceiptForSale(1L);
        stubProvider.nextResult(firstResult);
        ElectronicDocument failed = documentService.send(doc.id());
        stubProvider.nextResult(ProviderSendResult.accepted("T-RETRY", "Accepted after retry"));
        return documentService.retrySend(failed.id());
    }

    private ElectronicDocument createErroredSignedReceiptWithLastAttempt(FiscalErrorCategory category, boolean recoverable) {
        ElectronicDocument signed = createSignedReceiptForSale(1L);
        ElectronicDocument error = saveDocumentWithStatus(signed, ElectronicDocumentStatus.ERROR);
        saveSendAttempt(error, 1, FiscalAttemptResult.FAILED, category, recoverable, providerStatusFor(category));
        return error;
    }

    private ElectronicDocument saveDocumentWithStatus(ElectronicDocument current, ElectronicDocumentStatus status) {
        return documentRepository.save(new ElectronicDocument(
                current.id(),
                current.saleId(),
                current.billingSeriesId(),
                current.documentType(),
                status,
                current.environment(),
                current.series(),
                current.number(),
                current.fullNumber(),
                current.customerName(),
                current.customerDocument(),
                current.currencyCode(),
                current.subtotalAmount(),
                current.taxAmount(),
                current.totalAmount(),
                current.xmlGeneratedAt(),
                current.signedAt(),
                status == ElectronicDocumentStatus.ERROR || status == ElectronicDocumentStatus.SENT ? Instant.now() : current.sentAt(),
                current.providerTicket(),
                current.providerMessage(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                current.updatedBy()
        ));
    }

    private ElectronicDocumentAttempt saveSendAttempt(
            ElectronicDocument document,
            int attemptNumber,
            FiscalAttemptResult result,
            FiscalErrorCategory category,
            boolean recoverable,
            String providerStatus
    ) {
        Instant now = Instant.now();
        return attemptRepository.save(new ElectronicDocumentAttempt(
                null,
                document.id(),
                FiscalOperation.SEND,
                attemptNumber,
                result,
                category,
                recoverable,
                providerStatus,
                null,
                "Seeded attempt",
                null,
                null,
                "a".repeat(64),
                "b".repeat(64),
                now,
                now,
                "tester",
                null,
                document.environment() == BillingEnvironment.LOCAL || document.environment() == BillingEnvironment.BETA
        ));
    }

    private void saveSignedXml(ElectronicDocument document, String content) {
        xmlRepository.save(new BillingXmlFile(
                null,
                document.id(),
                BillingXmlFileType.SIGNED,
                document.fullNumber() + "-signed.xml",
                content,
                "application/xml",
                null,
                "tester"
        ));
    }

    private String providerStatusFor(FiscalErrorCategory category) {
        return switch (category) {
            case PROVIDER_TIMEOUT -> "TIMEOUT";
            case PROVIDER_UNAVAILABLE -> "UNAVAILABLE";
            case COMMUNICATION_ERROR -> "COMMUNICATION_ERROR";
            case CONFIGURATION_ERROR -> "CONFIGURATION_ERROR";
            case PROVIDER_REJECTED -> "REJECTED";
            case PROVIDER_OBSERVED -> "OBSERVED";
            case PROVIDER_PENDING -> "PENDING";
            default -> "ERROR";
        };
    }

    private void assertSanitizedProviderText(String value) {
        assertNotNull(value);
        assertFalse(value.toLowerCase().contains("token="));
        assertFalse(value.contains("token=super-secret"));
        assertFalse(value.contains("token=hidden"));
        assertFalse(value.contains("vault://"));
        assertFalse(value.contains("C:\\certs"));
        assertFalse(value.contains(".pfx"));
        assertFalse(value.contains("<xml>"));
        assertFalse(value.contains("\n"));
    }

    private BillingSeries createProdReceiptSeries(String ruc, String series) {
        profileService.create(secureProdProfileCommand(ruc));
        return seriesService.create(new CreateBillingSeriesCommand(
                ElectronicDocumentType.RECEIPT,
                series,
                1L,
                BillingEnvironment.PROD
        ));
    }

    private CreateCompanyBillingProfileCommand secureProdProfileCommand(String ruc) {
        return new CreateCompanyBillingProfileCommand(
                ruc,
                "INKTOY PROD SAC",
                "AV. PROD 100",
                BillingEnvironment.PROD,
                null,
                null,
                "vault://billing/prod/" + ruc + "/certificate",
                "vault://billing/prod/" + ruc + "/certificate-password",
                "vault://billing/prod/" + ruc + "/provider",
                "prod-certificate-" + ruc,
                "VAULT"
        );
    }

    private BillingFiscalProperties productionEnabledFiscalProperties() {
        BillingFiscalProperties properties = new BillingFiscalProperties();
        properties.getSecrets().setProductionEnabled(true);
        properties.getSecrets().setProvider(BillingFiscalProperties.SecretProvider.SECRET_MANAGER);
        properties.getElectronic().setProvider(BillingFiscalProperties.ElectronicProvider.EXTERNAL);
        properties.getSigner().setProvider(BillingFiscalProperties.SignerProvider.EXTERNAL);
        return properties;
    }

    private ElectronicDocument saveDocumentForSeries(
            Long saleId,
            BillingSeries series,
            ElectronicDocumentStatus status,
            Instant xmlGeneratedAt,
            Instant signedAt,
            Instant sentAt
    ) {
        long number = series.currentNumber();
        return documentRepository.save(new ElectronicDocument(
                null,
                saleId,
                series.id(),
                series.documentType(),
                status,
                series.environment(),
                series.series(),
                number,
                series.series() + "-" + String.format("%08d", number),
                "CONSUMIDOR FINAL",
                null,
                "PEN",
                BigDecimal.valueOf(20),
                BigDecimal.ZERO,
                BigDecimal.valueOf(20),
                xmlGeneratedAt,
                signedAt,
                sentAt,
                null,
                null,
                null,
                null,
                "tester",
                "tester"
        ));
    }

    private void forceSeriesCurrentNumber(Long seriesId, long currentNumber) {
        BillingSeries current = seriesRepository.findById(seriesId).orElseThrow();
        seriesRepository.save(new BillingSeries(
                current.id(),
                current.documentType(),
                current.series(),
                currentNumber,
                current.environment(),
                current.active(),
                current.createdAt(),
                current.updatedAt(),
                current.createdBy(),
                current.updatedBy()
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
                    profile.certificateSecretRef(),
                    profile.certificatePasswordSecretRef(),
                    profile.providerSecretRef(),
                    profile.certificateAlias(),
                    profile.secretProvider(),
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

        @Override
        public boolean existsActiveByDocumentTypeAndEnvironment(ElectronicDocumentType type, BillingEnvironment environment, Long excludeId) {
            return storage.values().stream().anyMatch(s -> s.documentType() == type
                    && s.environment() == environment
                    && s.active()
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
        public Optional<ElectronicDocument> findByIdForUpdate(Long id) {
            return findById(id);
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

        @Override
        public Optional<Long> findMaxIssuedNumberByBillingSeriesId(Long billingSeriesId) {
            return storage.values().stream()
                    .filter(d -> d.billingSeriesId().equals(billingSeriesId))
                    .map(ElectronicDocument::number)
                    .max(Long::compareTo);
        }
    }

    static class InMemoryElectronicDocumentAttemptRepository implements ElectronicDocumentAttemptRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, ElectronicDocumentAttempt> storage = new HashMap<>();
        private final Map<Long, List<ElectronicDocumentAttempt>> byDocument = new HashMap<>();

        @Override
        public ElectronicDocumentAttempt save(ElectronicDocumentAttempt attempt) {
            Long id = attempt.id() == null ? seq.getAndIncrement() : attempt.id();
            ElectronicDocumentAttempt stored = new ElectronicDocumentAttempt(
                    id,
                    attempt.electronicDocumentId(),
                    attempt.operation(),
                    attempt.attemptNumber(),
                    attempt.result(),
                    attempt.errorCategory(),
                    attempt.recoverable(),
                    attempt.providerStatus(),
                    attempt.providerCode(),
                    attempt.providerMessage(),
                    attempt.providerTicket(),
                    attempt.providerCorrelationId(),
                    attempt.requestHash(),
                    attempt.responseHash(),
                    attempt.startedAt() == null ? Instant.now() : attempt.startedAt(),
                    attempt.finishedAt(),
                    attempt.actor(),
                    attempt.traceId(),
                    attempt.simulated()
            );
            storage.put(id, stored);
            List<ElectronicDocumentAttempt> attempts = byDocument.computeIfAbsent(stored.electronicDocumentId(), k -> new ArrayList<>());
            attempts.removeIf(existing -> existing.id().equals(id));
            attempts.add(stored);
            attempts.sort((left, right) -> Integer.compare(left.attemptNumber(), right.attemptNumber()));
            return stored;
        }

        @Override
        public int nextAttemptNumber(Long electronicDocumentId, FiscalOperation operation) {
            return byDocument.getOrDefault(electronicDocumentId, List.of()).stream()
                    .filter(attempt -> attempt.operation() == operation)
                    .map(ElectronicDocumentAttempt::attemptNumber)
                    .max(Integer::compareTo)
                    .orElse(0) + 1;
        }

        @Override
        public List<ElectronicDocumentAttempt> findByElectronicDocumentId(Long electronicDocumentId) {
            return byDocument.getOrDefault(electronicDocumentId, List.of());
        }

        @Override
        public Optional<ElectronicDocumentAttempt> findLatestByElectronicDocumentIdAndOperation(Long electronicDocumentId, FiscalOperation operation) {
            return byDocument.getOrDefault(electronicDocumentId, List.of()).stream()
                    .filter(attempt -> attempt.operation() == operation)
                    .max((left, right) -> Integer.compare(left.attemptNumber(), right.attemptNumber()));
        }
    }

    static class InMemoryElectronicDocumentEvidenceRepository implements ElectronicDocumentEvidenceRepositoryPort {
        private final AtomicLong seq = new AtomicLong(1);
        private final Map<Long, ElectronicDocumentEvidence> storage = new HashMap<>();
        private final Map<Long, List<ElectronicDocumentEvidence>> byDocument = new HashMap<>();
        private final Map<Long, List<ElectronicDocumentEvidence>> byAttempt = new HashMap<>();

        @Override
        public ElectronicDocumentEvidence save(ElectronicDocumentEvidence evidence) {
            if (evidence.id() != null) {
                throw new BillingBusinessRuleException("Electronic document evidence is append-only.");
            }
            if (evidence.attemptId() != null && evidence.checksumSha256() != null) {
                boolean duplicate = byAttempt.getOrDefault(evidence.attemptId(), List.of()).stream()
                        .anyMatch(existing -> existing.evidenceType() == evidence.evidenceType()
                                && evidence.checksumSha256().equals(existing.checksumSha256()));
                if (duplicate) {
                    throw new BillingConflictException("La evidencia fiscal ya esta registrada para este intento.");
                }
            }
            if (evidence.evidenceType() == FiscalEvidenceType.SIGNED_XML && evidence.metadataStatus() != FiscalEvidenceMetadataStatus.REVOKED) {
                boolean signedXmlExists = byDocument.getOrDefault(evidence.electronicDocumentId(), List.of()).stream()
                        .anyMatch(existing -> existing.evidenceType() == FiscalEvidenceType.SIGNED_XML
                                && existing.metadataStatus() != FiscalEvidenceMetadataStatus.REVOKED);
                if (signedXmlExists) {
                    throw new BillingConflictException("La evidencia SIGNED_XML activa ya esta registrada para este comprobante.");
                }
            }
            Long id = seq.getAndIncrement();
            ElectronicDocumentEvidence stored = new ElectronicDocumentEvidence(
                    id,
                    evidence.electronicDocumentId(),
                    evidence.attemptId(),
                    evidence.evidenceType(),
                    evidence.environment(),
                    evidence.simulated(),
                    evidence.storageProvider(),
                    evidence.storageKey(),
                    evidence.fileName(),
                    evidence.mimeType(),
                    evidence.sizeBytes(),
                    evidence.checksumSha256(),
                    evidence.contentHashSha256(),
                    evidence.providerTicket(),
                    evidence.providerCorrelationId(),
                    evidence.providerStatus(),
                    evidence.metadataStatus(),
                    evidence.createdAt() == null ? Instant.now() : evidence.createdAt(),
                    evidence.createdBy(),
                    evidence.traceId(),
                    evidence.notes()
            );
            storage.put(id, stored);
            byDocument.computeIfAbsent(stored.electronicDocumentId(), k -> new ArrayList<>()).add(stored);
            if (stored.attemptId() != null) {
                byAttempt.computeIfAbsent(stored.attemptId(), k -> new ArrayList<>()).add(stored);
            }
            return stored;
        }

        @Override
        public List<ElectronicDocumentEvidence> findByElectronicDocumentId(Long electronicDocumentId) {
            return byDocument.getOrDefault(electronicDocumentId, List.of());
        }

        @Override
        public List<ElectronicDocumentEvidence> findByAttemptId(Long attemptId) {
            return byAttempt.getOrDefault(attemptId, List.of());
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
        private int generateCalls;

        @Override
        public String generate(ElectronicDocument document, CompanyBillingProfile profile, List<ElectronicDocumentItem> items) {
            generateCalls++;
            return "<xml>" + document.fullNumber() + "</xml>";
        }

        int generateCalls() {
            return generateCalls;
        }
    }

    static class StubXmlSigner implements XmlSignerPort {
        private int signCalls;

        @Override
        public String signXml(String xml, CompanyBillingProfile profile) {
            signCalls++;
            return xml + "-SIGNED";
        }

        int signCalls() {
            return signCalls;
        }
    }

    static class StubProvider implements ElectronicBillingProviderPort {
        private int sendCalls;
        private ProviderSendResult nextResult;
        private RuntimeException failure;

        @Override
        public ProviderSendResult send(ElectronicDocument document, String signedXml) {
            sendCalls++;
            if (failure != null) {
                throw failure;
            }
            if (nextResult != null) {
                return nextResult;
            }
            if (document.customerName() != null && document.customerName().contains("ERROR")) {
                return ProviderSendResult.unavailable("T-ERR", "Provider temporary error");
            }
            if (document.customerName() != null && document.customerName().contains("REJECT")) {
                return ProviderSendResult.rejected("T-REJ", "Rejected by mock provider");
            }
            return ProviderSendResult.accepted("T-ACC", "Accepted by mock provider");
        }

        int sendCalls() {
            return sendCalls;
        }

        void nextResult(ProviderSendResult nextResult) {
            this.nextResult = nextResult;
        }

        void failWith(RuntimeException failure) {
            this.failure = failure;
        }
    }

    static class ProductionReadySigner implements XmlSignerPort {
        @Override
        public String signXml(String xml, CompanyBillingProfile profile) {
            return xml + "-SIGNED";
        }

        @Override
        public boolean supportsProduction() {
            return true;
        }
    }

    static class ProductionReadyProvider implements ElectronicBillingProviderPort {
        @Override
        public ProviderSendResult send(ElectronicDocument document, String signedXml) {
            return ProviderSendResult.accepted("T-PROD", "Accepted by production-ready stub");
        }

        @Override
        public boolean supportsProduction() {
            return true;
        }
    }

    static class ProductionReadyFiscalSecretResolver implements FiscalSecretResolverPort {
        @Override
        public FiscalSecretResolution resolveCertificate(String certificateRef, BillingEnvironment environment) {
            return new FiscalSecretResolution(FiscalSecretType.CERTIFICATE, environment, false);
        }

        @Override
        public FiscalSecretResolution resolveCertificatePassword(String certificatePasswordRef, BillingEnvironment environment) {
            return new FiscalSecretResolution(FiscalSecretType.CERTIFICATE_PASSWORD, environment, false);
        }

        @Override
        public FiscalSecretResolution resolveProviderCredentials(String providerRef, BillingEnvironment environment) {
            return new FiscalSecretResolution(FiscalSecretType.PROVIDER_CREDENTIALS, environment, false);
        }

        @Override
        public boolean supportsProduction() {
            return true;
        }
    }
}

