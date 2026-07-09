# Change Control - InkToy ERP/POS

## Objetivo

Estandarizar cambios tecnicos para reducir regresiones y mantener trazabilidad en etapa pre-piloto.

## Control fiscal

### Cierre Fiscal production safety hardening

- Tipo: hardening backend de seguridad productiva fiscal.
- Alcance implementado: politica central `BillingRuntimeSafetyPolicy` para reglas runtime por ambiente; bloqueo de `PROD` antes de consumir correlativo cuando no hay provider fiscal real y firma XML real; bloqueo de firma productiva con signer no productivo; bloqueo de envio productivo con provider no productivo; defensa adicional para que `MockElectronicBillingProviderAdapter` no devuelva `ACCEPTED` en `PROD`.
- LOCAL/BETA siguen habilitados como simulacion controlada para desarrollo, sandbox y beta interna.
- Exclusiones confirmadas: no se implemento SUNAT directo, PSE/OSE, UBL SUNAT completo, firma digital real, CDR, PDF/ticket fiscal, QR, notas de credito/debito, comunicacion de baja ni migracion de credenciales a secret manager.
- Seguridad operativa: no se tocaron `.env`, secretos, tokens, claves, certificados reales ni configuracion productiva real.
- Validacion: `./mvnw -Dtest=BillingApplicationServiceTest test` con 35 tests, 0 failures, BUILD SUCCESS; `./mvnw test` backend completo con 476 tests, 0 failures, BUILD SUCCESS.

### Cierre Fiscal secrets DB/API foundation

- Tipo: hardening backend/frontend de configuracion fiscal y base DB/API para referencias de secretos.
- Alcance implementado: migracion Flyway V21 no destructiva con columnas `certificate_secret_ref`, `certificate_password_secret_ref`, `provider_secret_ref`, `certificate_alias` y `secret_provider`; DTOs/use cases/domain/entity/mapper actualizados para refs fiscales; `CompanyBillingProfileResponse` expone solo flags seguros (`certificateConfigured`, `providerConfigured`) y metadata (`certificateAlias`, `secretProvider`), sin `certificatePath` ni `certificatePassword`.
- Reglas backend: `certificatePassword` legado se acepta solo por compatibilidad de request pero no se persiste; el mapper limpia `certificate_password` al guardar perfiles; PROD rechaza `certificatePassword` plano y `certificatePath` directo; PROD activo exige `certificateSecretRef` o `certificateAlias`, `certificatePasswordSecretRef`, `providerSecretRef` y `secretProvider`; actualizaciones preservan refs write-only existentes cuando el request las omite.
- Frontend Angular: pantalla Configuracion tributaria reemplaza ruta/password por referencias write-only y metadata segura; resumen por ambiente muestra refs de firma/proveedor sin revelar valores; Local/Beta siguen como simulacion controlada y PROD continua bloqueado para emision real.
- Exclusiones confirmadas: no se implemento secret manager real, resolver de secretos, SUNAT directo, PSE/OSE real, UBL SUNAT completo, firma digital real, CDR, PDF/ticket fiscal, QR, notas, bajas ni produccion real.
- Seguridad operativa: no se tocaron `.env`, secretos, tokens, claves, certificados reales, backups ni dumps.
- Validacion: `./mvnw -Dtest=BillingApplicationServiceTest test` con 41 tests, 0 failures, BUILD SUCCESS; `./mvnw test` backend completo con 482 tests, 0 failures, BUILD SUCCESS; `npm run build` frontend, BUILD SUCCESS.

### Cierre Fiscal secret resolver mock/local

- Tipo: hardening backend arquitectonico para resolver referencias fiscales sin secretos reales.
- Alcance implementado: `FiscalSecretResolverPort` desacopla aplicacion/dominio de infraestructura; `LocalFiscalSecretResolverAdapter` resuelve solo placeholders seguros para LOCAL/BETA y declara `supportsProduction=false`.
- Placeholders permitidos: `LOCAL_NOOP_CERT`, `LOCAL_NOOP_CERT_PASSWORD`, `LOCAL_NOOP_PROVIDER`, `BETA_SANDBOX_REF`, `BETA_SANDBOX_CERT_PASSWORD`, `BETA_SANDBOX_PROVIDER`.
- Reglas defensivas: rechaza refs vacias, path traversal, rutas absolutas, rutas con drive Windows, `file:`, whitespace/control chars, extensiones de certificado/keystore y valores demasiado largos; los errores no incluyen el valor recibido.
- Integracion runtime: `BillingRuntimeSafetyPolicy` requiere provider, signer y resolver productivos para considerar PROD listo; con resolver local/mock, PROD sigue bloqueado con `Emision electronica productiva no configurada...` y el adapter falla en PROD con `Resolver de secretos productivo no configurado.`
- Exclusiones confirmadas: no se leyeron `.env`, archivos, certificados, passwords, keystores, claves privadas, backups ni dumps; no se implemento secret manager real, SUNAT directo, PSE/OSE real, UBL SUNAT completo, firma digital real, CDR, PDF/ticket fiscal, QR, notas ni bajas.
- Validacion: `./mvnw -Dtest=BillingApplicationServiceTest test` con 49 tests, 0 failures, BUILD SUCCESS; `./mvnw test` backend completo con 490 tests, 0 failures, BUILD SUCCESS.

### Cierre Fiscal PROD enforcement / secret manager readiness

- Tipo: hardening backend de configuracion fiscal productiva y readiness para secret manager futuro.
- Alcance implementado: propiedades no sensibles `billing.secrets.provider`, `billing.secrets.production-enabled`, `billing.electronic.provider` y `billing.signer.provider` con defaults seguros LOCAL/MOCK/NOOP; validador startup `BillingFiscalStartupValidator` para fail-fast cuando `production-enabled=true` no tiene configuracion y beans productivos; `BillingRuntimeSafetyPolicy` exige readiness completa para create/sign/send y para resultados ACCEPTED en PROD.
- Reglas de perfil fiscal: perfiles PROD activos rechazan placeholders `LOCAL_*`/`BETA_*` en refs/alias y rechazan `secretProvider` `LOCAL`, `MOCK` o `NOOP`; los errores no incluyen los valores recibidos.
- Readiness futura: `SECRET_MANAGER`/`EXTERNAL` quedan como nombres de configuracion permitidos para integraciones futuras, sin adapter real ni lectura de secretos.
- Exclusiones confirmadas: no se implemento secret manager real, AWS Secrets Manager, Vault, GCP Secret Manager, Azure Key Vault, SUNAT directo, PSE/OSE real, UBL SUNAT completo, firma digital real, CDR, PDF/ticket fiscal, QR, notas ni bajas.
- Seguridad operativa: no se tocaron `.env`, secretos, tokens, claves, certificados reales, backups ni dumps; no se leyeron archivos de certificados ni passwords reales.
- Validacion: `./mvnw -Dtest=BillingApplicationServiceTest test` con 58 tests, 0 failures, BUILD SUCCESS; `./mvnw test` backend completo con 499 tests, 0 failures, BUILD SUCCESS.

### Cierre Fiscal lifecycle state machine + idempotency base

- Tipo: hardening backend del ciclo fiscal interno previo a integraciones reales.
- Alcance implementado: `ElectronicDocumentLifecyclePolicy` centraliza transiciones validas e invalidas; `ElectronicDocumentRepositoryPort` agrega `findByIdForUpdate`; JPA aplica `PESSIMISTIC_WRITE` para bloquear operaciones concurrentes del mismo comprobante en `generateXml`, `sign` y `send`.
- Idempotencia base: `generateXml` sobre `GENERATED` retorna el estado actual sin sobrescribir XML ni duplicar historial; `sign` sobre `SIGNED` retorna el estado actual sin refirmar ni duplicar historial; `send` sobre `SENT` o estados finales bloquea el reenvio y no llama al provider.
- Proteccion documento/venta: `createFromSale` conserva el bloqueo previo antes de consumir correlativo; V22 agrega indice unico parcial `uq_electronic_documents_sale_active` por `sale_id` con `status <> 'CANCELLED'`, precedido por precheck no destructivo para detectar duplicados historicos antes de crear el indice.
- Transiciones permitidas: `DRAFT -> GENERATED`, `GENERATED -> SIGNED`, `SIGNED -> SENT`, `SENT -> ACCEPTED/REJECTED/ERROR`.
- Transiciones bloqueadas: `DRAFT -> SIGNED`, `ACCEPTED -> GENERATED/SIGNED/SENT`, `REJECTED -> SIGNED/SENT`, `ERROR -> SENT` y reenvios sin politica explicita de retry.
- Exclusiones confirmadas: no se implemento retry avanzado, tabla de attempts, provider response estructurada completa, secret manager real, SUNAT directo, PSE/OSE real, UBL SUNAT completo, firma digital real, CDR, PDF/ticket fiscal, QR, notas ni bajas.
- Seguridad operativa: no se tocaron `.env`, secretos, tokens, claves, certificados reales, backups ni dumps; no se leyeron archivos de certificados ni passwords reales.
- Validacion: `./mvnw -Dtest=BillingApplicationServiceTest test` con 67 tests, 0 failures, BUILD SUCCESS; `./mvnw test` backend completo con 508 tests, 0 failures, BUILD SUCCESS.

### Cierre Fiscal attempt model + send audit records

- Tipo: hardening backend de auditoria fiscal interna para intentos SEND, previo a retry controlado e integraciones reales.
- Alcance implementado: migracion Flyway V23 no destructiva con tabla `electronic_document_attempts`; modelo `ElectronicDocumentAttempt`; enums `FiscalOperation`, `FiscalAttemptResult`, `FiscalErrorCategory`; puerto `ElectronicDocumentAttemptRepositoryPort`; entidad JPA, repository, mapper y persistence adapter.
- Auditoria SEND: `ElectronicDocumentApplicationService.send()` registra attempt `STARTED` antes de llamar al provider, finaliza `SUCCESS` para `ACCEPTED`, `FAILED` para `REJECTED`/`ERROR` y `BLOCKED` para reenvios o bloqueos previos; `attemptNumber` es incremental por documento + operacion bajo lock del comprobante.
- Seguridad de auditoria: `FiscalAuditSanitizer` trunca y sanitiza provider message/ticket/code/correlation id, remueve saltos/control chars, tokens, passwords, refs tipo `vault://`, rutas locales, archivos de certificados y XML/payloads embebidos; attempts guardan hashes SHA-256, no payloads completos.
- Excepciones provider: `FiscalAttemptAuditService` usa transacciones `REQUIRES_NEW` para que el attempt fallido no se pierda si el provider lanza excepcion; la excepcion se relanza y no se habilita retry automatico.
- Politica: no hay scheduler, backoff, cooldown ni retry automatico; LOCAL/BETA quedan marcados como `simulated=true`; PROD sigue bloqueado si no existe readiness productiva de provider/signer/resolver.
- Exclusiones confirmadas: no se implemento PSE/OSE real, SUNAT directo, firma digital real, XML UBL SUNAT completo, CDR, PDF/ticket fiscal, QR, notas, comunicacion de baja, produccion real ni secret manager real.
- Seguridad operativa: no se tocaron `.env`, secretos, tokens, claves, certificados reales, backups ni dumps; no se leyeron archivos de certificados ni passwords reales.
- Validacion: `./mvnw -Dtest=BillingApplicationServiceTest test` con 72 tests, 0 failures, BUILD SUCCESS; `./mvnw test` backend completo con 513 tests, 0 failures, BUILD SUCCESS.

### Cierre Fiscal error taxonomy + provider response mapping

- Tipo: hardening backend de taxonomia fiscal interna y mapping de respuestas de provider.
- Alcance implementado: `ProviderSendResult` mantiene constructor legacy `status/ticket/message` y agrega modelo enriquecido con `ProviderSendStatus`, `providerCode`, `providerCorrelationId`, `FiscalErrorCategory`, `recoverable`, `observed`, `pending` y `simulated`; se agrego `FiscalProviderResultClassifier` y `FiscalProviderResultClassification` como mapping central.
- Mapping fiscal: `ACCEPTED` -> attempt `SUCCESS`, documento `ACCEPTED`; `OBSERVED` -> attempt `SUCCESS`, documento `ACCEPTED`, categoria `PROVIDER_OBSERVED`; `REJECTED` -> attempt `FAILED`, documento `REJECTED`, categoria `PROVIDER_REJECTED`; `PENDING` -> attempt `PENDING`, documento queda `SENT` sin transicion final ni reenvio; `TIMEOUT`, `UNAVAILABLE` y `COMMUNICATION_ERROR` -> attempt `FAILED`, documento `ERROR`, categorias recuperables; `CONFIGURATION_ERROR` -> attempt `FAILED`, documento `ERROR`, no recuperable.
- Integracion SEND: `ElectronicDocumentApplicationService` usa el clasificador para finalizar attempts, guardar provider status/code/message/ticket/correlation id sanitizados y preservar el bloqueo de reenvio; no usa providerMessage crudo para decisiones criticas cuando existe status/categoria explicita.
- Politica: no hay retry automatico, scheduler, backoff, polling ni consulta real de estado; `PENDING` queda modelado solo como preparacion interna y no activa reenvio.
- Exclusiones confirmadas: no se implemento PSE/OSE real, SUNAT directo, firma digital real, XML UBL SUNAT completo, CDR, PDF/ticket fiscal, QR, notas, comunicacion de baja, produccion real ni secret manager real.
- Seguridad operativa: no se tocaron `.env`, secretos, tokens, claves, certificados reales, backups ni dumps; no se leyeron archivos de certificados ni passwords reales.
- Validacion: `./mvnw -Dtest=BillingApplicationServiceTest test` con 79 tests, 0 failures, BUILD SUCCESS; `./mvnw test` backend completo con 520 tests, 0 failures, BUILD SUCCESS.

### Cierre Fiscal manual retry policy backend-only

- Tipo: hardening backend de retry manual/controlado para envio fiscal, sin endpoint REST en esta fase.
- Alcance implementado: contrato `ElectronicDocumentUseCase.retrySend(Long)` y metodo `ElectronicDocumentApplicationService.retrySend(Long)` separado de `send()`; consulta del ultimo attempt `SEND` via `ElectronicDocumentAttemptRepositoryPort.findLatestByElectronicDocumentIdAndOperation`; adapter JPA con finder por documento, operacion y `attemptNumber desc`.
- Politica de retry: solo desde documento `ERROR`, bajo lock `findByIdForUpdate`, con ultimo attempt `SEND` `FAILED`, `recoverable=true`, categoria clara y reintentable (`PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `COMMUNICATION_ERROR`) y XML firmado disponible.
- Bloqueos: `DRAFT`, `GENERATED`, `SIGNED`, `SENT`, `ACCEPTED`, `REJECTED`, `CANCELLED`; categorias `PROVIDER_REJECTED`, `PROVIDER_OBSERVED`, `PROVIDER_PENDING`, `CONFIGURATION_ERROR`, `INTERNAL_ERROR`, `VALIDATION_ERROR`, categoria ausente y cualquier attempt `recoverable=false`.
- PENDING/OBSERVED: `PENDING` queda como documento `SENT` reservado para consulta/polling/reconciliacion futura; `OBSERVED` queda `ACCEPTED` con observaciones y no es reintentable.
- Auditoria: cada retry permitido crea nuevo attempt `SEND` incremental, registra `STARTED` antes del provider y finaliza con `SUCCESS`, `FAILED` o `PENDING` segun `FiscalProviderResultClassifier`; retry bloqueado registra `BLOCKED` usando el patron seguro existente; hashes SHA-256 y sanitizacion se mantienen.
- Idempotencia/prevention: no se consume correlativo, no se regenera XML, no se refirma, no se duplica evidencia firmada, no hay scheduler, no hay backoff, no hay retry automatico.
- Exclusiones confirmadas: no se creo endpoint REST, no se tocaron controllers, no se creo migracion Flyway, no se implemento PSE/OSE/SUNAT real, firma real, CDR, XML UBL completo, PDF/ticket fiscal, QR, notas, bajas, produccion real ni secret manager real.
- Seguridad operativa: no se tocaron `.env`, secretos, tokens, claves, certificados reales, backups ni dumps; no se leyeron archivos de certificados ni passwords reales.
- Validacion: `./mvnw -Dtest=BillingApplicationServiceTest test` con 96 tests, 0 failures, BUILD SUCCESS; `./mvnw test` backend completo con 537 tests, 0 failures, BUILD SUCCESS.

### Cierre Fiscal frontend-readiness contract documental

- Tipo: documentacion/readiness-only para futura UI/API fiscal.
- Alcance implementado: contrato `docs/billing/FISCAL_FRONTEND_READINESS_CONTRACT.md`, draft API `docs/api/BILLING_FISCAL_READINESS_API_DRAFT.md` y QA `docs/qa/FISCAL_FRONTEND_READINESS_CONTRACT_QA.md`; actualizacion de `docs/ai/CURRENT_STATUS.md` y referencias cruzadas en QA fiscal.
- Contenido: matriz de estados fiscales, acciones futuras, reglas de retry readiness, mensajes operativos, roles/permisos, auditoria visible, datos prohibidos, draft read-only de readiness y draft diferido `retry-send`.
- Exclusiones confirmadas: no se creo endpoint REST, no se toco controller, no se toco frontend, no se modificaron DTOs ni servicios, no se creo migracion, no se implemento retry automatico, scheduler, backoff, polling, PSE/OSE/SUNAT real, firma real, CDR, PDF/ticket fiscal, QR, notas ni produccion real.
- Seguridad operativa: no se tocaron `.env`, secretos, tokens, claves, certificados reales, backups ni dumps; no se leyeron archivos de certificados ni passwords reales.

### Cierre Fiscal evidence metadata DB foundation

- Tipo: foundation backend/DB metadata-only para evidencias fiscales.
- Alcance implementado: migracion V24 `electronic_document_evidence`; modelo `ElectronicDocumentEvidence`; enums de evidence type, storage provider y metadata status; puerto, entidad JPA, mapper y adapter de persistencia.
- Seguridad: validaciones rechazan XML/CDR/PDF/QR crudos, base64 embebido, tokens, passwords, secret refs, rutas absolutas, certificados, claves privadas y hashes SHA-256 invalidos; `storageKey` debe ser relativo u opaque.
- Trazabilidad: evidencia ligada siempre a documento y opcionalmente a attempt; adapter valida que el attempt pertenezca al mismo documento; modelo append-only sin sobrescritura.
- Exclusiones confirmadas: no se reemplazo `billing_xml_files`, no se modificaron `send`, `retrySend` ni `sign`, no se creo endpoint REST, no se toco frontend, no se implemento storage real, no se guardaron payloads completos, no se implemento PSE/OSE/SUNAT real.
- Validacion: `./mvnw -Dtest=BillingApplicationServiceTest test` con 109 tests, 0 failures, BUILD SUCCESS; `./mvnw test` backend completo con 551 tests, 0 failures, BUILD SUCCESS.

## Control ecommerce SEO-first

### Cierre Fase 0 documental ecommerce

- ECOM-ADR-001 al ECOM-ADR-019 estan aprobados como base de arquitectura ecommerce SEO-first.
- `docs/ecommerce/PRELIMINARY_ECOMMERCE_CONTRACTS.md` queda aprobado como contrato preliminar ecommerce.
- `docs/qa/PHASE0_ECOMMERCE_VALIDATION_CHECKLIST.md` queda revisado/cerrado mediante evidencia documental.
- La proxima fase autorizada para preparar es Fase 1 - Catalogo online base en ERP/POS.

### Reglas para Fase 1A

- Fase 1A es documental/tecnica y no funcional.
- No tocar backend, frontend funcional, DB/Flyway, endpoints, Docker, `.env`, secretos, AWS/staging ni dependencias.
- No crear tienda Next.js, Storefront API publica, checkout, carrito real, Mercado Pago, facturacion automatica ecommerce, delivery real ni Merchant Center real.
- No modificar POS, inventario, ventas, caja ni facturacion durante Fase 1A.
- Cualquier Fase 1B que requiera persistencia, Flyway o endpoints administrativos internos exige aprobacion humana explicita antes de implementar.

### Cierre Fase 1A.2 documental

- Se aprobaron las decisiones humanas pendientes para Fase 1: producto sin marca, categoria online, assets, namespace administrativo, permisos iniciales, Flyway, categoria SEO separada y bloqueo de slug en productos publicados.
- Se reforzaron lineamientos UX/UI para la administracion ecommerce en Angular interno: tablas, filtros, badges/chips, formularios, confirmaciones, mensajes, estados vacios, errores y responsive.
- Se reforzo QA documental para evitar N+1 y para confirmar que Angular no duplica logica critica de negocio.
- No se toco codigo funcional, backend, frontend funcional, DB/Flyway, endpoints, AWS/staging, Docker, dependencias ni secretos.
- El siguiente paso es preparar commit documental; despues de ese cierre, abrir Fase 1B con aprobacion explicita si el negocio confirma el alcance.

### Cierre Fase 1C ecommerce admin interno

- Se completaron y pushearon las subfases Fase 1C.1, Fase 1C.2 y el polish visual final del modulo ecommerce admin interno.
- Alcance cerrado: perfiles online, detalle/editor de perfil, checklist backend, precio efectivo readonly, publish/unpublish solo ADMIN, marcas ecommerce y categorias online.
- RBAC ADMIN/SUPERVISOR validado; roles no autorizados sin acceso a navegacion ni rutas protegidas.
- Manejo de errores 400/401/403/404/409/422 validado en la interfaz.
- Build frontend exitoso y QA manual ligero sin bloqueantes conocidos.
- No se modificaron backend, Flyway/DB, endpoints ni modulos protegidos durante el cierre documental.

### Inicio Fase 2A Storefront SEO-first Discovery & Contracts

- Tipo: documentacion y planificacion.
- Alcance: roadmap ecommerce, backlog inicial, estrategia SEO-first, contratos publicos draft y checklist QA documental.
- Decisiones cerradas registradas: base path draft `/api/v1/storefront/...`, API publica inicial read-only, DTOs publicos separados de DTOs admin, no reutilizar `/api/v1/ecommerce-admin/...` como contrato publico, ERP/POS como fuente de verdad.
- Decisiones pendientes documentadas: marcas publicas en MVP o fase posterior, estrategia final SSR/SSG/ISR, politica de productos agotados, sitemap como endpoint JSON o generacion directa, estructura final Next.js, schema.org avanzado y Merchant Center.
- Restriccion operativa: sin codigo funcional, sin endpoints, sin frontend publico, sin backend, sin DB/Flyway, sin AWS/staging y sin commit/push en esta fase.

### Cierre Fase 2C implementacion backend read-only

- Tipo: implementacion backend funcional + cierre documental QA.
- Base: Fase 2B cerrada con diseno contractual de Public Catalog API.
- Commits incluidos:
  - `3236e02 feat(storefront): add public API security baseline`
  - `d247106 feat(storefront): add public products listing`
  - `65a2921 feat(storefront): add public product detail by slug`
  - `4c6e1c6 feat(storefront): add public categories listing`
  - `abc4809 feat(storefront): add public category detail by slug`
  - `d5ab5ea feat(storefront): add public sitemap JSON source`
- Alcance real implementado:
  - `GET /api/v1/storefront/catalog/products` — listado publico paginado de productos publicados.
  - `GET /api/v1/storefront/catalog/products/{slug}` — detalle publico de producto por slug.
  - `GET /api/v1/storefront/catalog/categories` — listado publico de categorias online activas.
  - `GET /api/v1/storefront/catalog/categories/{slug}` — detalle publico de categoria por slug.
  - `GET /api/v1/storefront/seo/sitemap` — fuente JSON para sitemap futuro (no es sitemap.xml real).
- Arquitectura: hexagonal estricta (controllers, DTOs publicos separados, use cases, ports, adapters, proyecciones de dominio).
- Tests focalizados: 52 tests, 0 failures, BUILD SUCCESS.
  - `StorefrontPublicProductsIntegrationTest`
  - `StorefrontPublicCategoriesIntegrationTest`
  - `StorefrontPublicSitemapIntegrationTest`
  - `AuthRbacCorsIntegrationTest`
  - `SecurityConfigTest`
- Exclusiones confirmadas:
  - No se implemento sitemap.xml real.
  - No se implemento Next.js ni Storefront publica.
  - No se implementaron filtros categorySlug.
  - No se implementaron marcas publicas.
  - No se implemento checkout, pagos, delivery, Merchant Center, pedidos online ni stock reservado.
  - No se toco frontend Angular, Flyway/DB, Docker, `.env`, secretos, dependencias, POS, ventas, caja, facturacion ni inventario.
- QA focalizada: tests de integracion focalizados aprobados (52/52, BUILD SUCCESS).
- Deuda QA conocida: `mvn test` completo falla por deuda preexistente no relacionada:
  - `ProductCleanupPreviewIntegrationTest.shouldBlockExecuteWhenElectronicDocumentExistsAndKeepDataUnchanged`
  - `DuplicateKey` en `billing_series / uq_billing_series_doc_type_environment_active`
  - No corregida en esta fase; pendiente prioritaria antes de avanzar a fases mayores.
- Separacion admin/public mantenida: `/api/v1/ecommerce-admin/...` protegido, `/api/v1/storefront/...` publico read-only.
- Archivos documentales actualizados en cierre 2C.5:
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
  - `docs/qa/PHASE2_PUBLIC_CATALOG_API_DESIGN_QA_CHECKLIST.md`
  - `docs/qa/MATRIX_API_ENDPOINTS.md`
  - `docs/ecommerce/STOREFRONT_PUBLIC_CONTRACTS_DRAFT.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`

### Correccion deuda QA ProductCleanupPreviewIntegrationTest

- Tipo: correccion de fixture en test de integracion.
- Contexto: el helper privado `insertElectronicDocument` en `ProductCleanupPreviewIntegrationTest.insertElectronicDocument` intentaba insertar siempre una billing_series activa `RECEIPT`/`LOCAL`, violando el constraint `uq_billing_series_doc_type_environment_active` cuando dos tests del mismo suite lo invocaban.
- Commit: `eb56641 fix(test): make billing series fixture idempotent`.
- Cambio: se extrajo metodo `findOrCreateBillingSeries` que primero busca una billing_series activa existente; si existe, la reutiliza; si no, la crea.
- Impacto:
  - `mvn test` completo ahora pasa: 348 tests, 0 failures, 0 errors, BUILD SUCCESS.
  - `ProductCleanupPreviewIntegrationTest`: 22 tests, 0 failures, BUILD SUCCESS.
  - Tests Storefront focalizados: 52 tests, 0 failures, BUILD SUCCESS.
- Alcance: solo se modifico un test fixture. No se toco produccion, Storefront/ecommerce 2C, Flyway/DB, frontend, Docker, `.env`, secretos ni dependencias.

### Cierre Fase 2E.1 Storefront MVP Shell Implementation

- Tipo: implementacion funcional del shell publico minimo en `storefront/`.
- Commit: `c049e3e feat(storefront): add Next.js MVP shell`.
- Resultados de validacion:
  - `npm run build`: OK, Next.js 16.2.7 compilado correctamente.
  - `npm run lint`: OK, sin errores.
  - `npx tsc --noEmit`: OK, sin errores de tipo.
  - `npm audit`: 2 vulnerabilidades moderadas en `postcss` (dependencia transitiva). No corregidas. Deuda no bloqueante.
- Archivos creados (21):
  - `storefront/package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `README.md`
  - `storefront/app/layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`
  - `storefront/lib/api.ts`
  - `storefront/types/storefront.ts`
  - `storefront/public/robots.txt`, `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`
  - `storefront/.env.local.example`
- Confirmaciones:
  - Sin paginas reales /`productos/{slug}` ni /`categorias/{slug}`.
  - Sin consumo real de endpoints Storefront.
  - Sin `sitemap.xml` real.
  - Sin checkout, pagos, pedidos, delivery, Merchant Center ni stock reservado.
  - Sin cambios en backend, Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.
- Deudas no bloqueantes registradas:
  - 2 vulnerabilidades moderadas en `postcss`.
  - Warning Turbopack por multiples lockfiles.
  - README.md generico de `create-next-app`.
  - SVGs default en `storefront/public/`.
- Siguiente paso: Fase 2F Public SEO Catalog MVP en Plan Mode.

### Cierre Fase 2F.2 Componentes base Next.js + Tailwind

- Tipo: implementacion funcional de componentes visuales + cierre documental QA.
- Commits incluidos:
  - `dd8f1a3 feat(storefront): add layout components with InkToy branding` (2F.2A + 2F.2B)
  - `1a55ec0 feat(storefront): add catalog visual components` (2F.2C)
- Alcance real implementado:
  - 2F.2A: Foundations visuales + UI base (Button, Badge, Chip, Breadcrumbs, SectionHeading, ProductImageFrame, Accordion).
  - 2F.2B: Layout (StorefrontHeader, StorefrontFooter, BottomNavigation) con logo InkToy real.
  - 2F.2C: Catalogo visual (ProductCard, CategoryCard, EmptyState, StickyProductCTA) + preview tecnico en `/`.
- Validaciones:
  - `npm run build`: OK (compiled successfully, 0 errors).
  - `npm run lint`: OK (0 warnings).
  - `npx tsc --noEmit`: OK (0 errors).
- Exclusiones confirmadas:
  - No se implementaron paginas reales `/productos`, `/productos/[slug]`, `/categorias`, `/categorias/[slug]`.
  - No se consumio API real.
  - No se implemento `sitemap.xml` real.
  - No se implemento checkout, pagos, pedidos, delivery, Merchant Center, login, perfil ni admin.
  - No se toco backend, Angular, Flyway/DB, Docker, `.env` raiz, secretos, dependencias ni AWS/staging.
- Deudas no bloqueantes registradas:
  - Logo puede requerir ajuste fino en paginas reales.
  - Placeholders visuales no son assets finales.
  - Paginas reales con BottomNavigation deben reservar padding inferior.
  - Chips requieren scroll horizontal controlado.
  - Imagenes reales pendientes.
  - StickyProductCTA implementado pero no montado en preview.
  - Warning Turbopack por multiples lockfiles.
  - ProductImageFrame/next/image requerira configuracion de patrones remotos.
  - Preview en `/` debe ser reemplazado por Home real.
- Archivos documentales actualizados en cierre 2F.2D:
  - `docs/ecommerce/STOREFRONT_COMPONENTS_SYSTEM_2F2.md` (creado)
  - `docs/qa/PHASE2F2_STOREFRONT_COMPONENTS_QA_CHECKLIST.md` (creado)
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`

### Inicio Fase 2F.0 Public SEO Catalog MVP Planning

- Tipo: documentacion y planificacion.
- Alcance: definir subfases 2F.0 a 2F.5, limpiar deuda documental heredada y ubicar Google Stitch como herramienta de diseno visual.
- Archivos creados:
  - `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md`
  - `docs/qa/PHASE2F_PUBLIC_SEO_CATALOG_QA_CHECKLIST.md`
- Archivos actualizados:
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ecommerce/STOREFRONT_SEO_FIRST_STRATEGY.md`
  - `docs/qa/PHASE2E_STOREFRONT_MVP_SHELL_QA_CHECKLIST.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
- Decisiones documentales:
  - Fase 2F dividida en 6 subfases: 2F.0 planificacion, 2F.1 Google Stitch, 2F.2 componentes base, 2F.3 integracion API, 2F.4 SEO tecnico, 2F.5 QA cierre.
  - Google Stitch es herramienta de diseno visual en 2F.1, no generador de codigo final.
  - Entregables de Google Stitch: home, productos, categorias, layout, componentes, paleta, responsive, estados vacios/error.
  - Antes de codificar se deben convertir disenos en design tokens, componentes Tailwind, breakpoints, jerarquia semantica, reglas de imagenes, accesibilidad, Core Web Vitals, SEO metadata, canonical y noindex.
  - Rutas objetivo: `/productos`, `/productos/{slug}`, `/categorias`, `/categorias/{slug}`.
  - Estrategia server-side fetch por defecto.
  - Proteccion noindex en desarrollo mediante `robots.txt`, layout metadata y flag env.
- Restricciones vigentes:
  - No paginas reales, no consumo real de API, no checkout, no pagos, no pedidos.
  - No sitemap.xml real, no marcas publicas, no filtros avanzados.
  - No AWS/staging, no Docker raiz, no .env raiz.
  - No cambios backend, Angular, Flyway/DB.
- Deudas no bloqueantes persisten:
  - 2 vulnerabilidades moderadas en `postcss`.
  - Warning Turbopack por multiples lockfiles.
  - README.md generico.
  - SVGs default en `public/`.
- Siguiente paso esperado: aprobar Fase 2F.1 Diseno visual con Google Stitch antes de tocar componentes o paginas reales.

### Aprobacion Visual Fase 2F.1 - Catalogo Creativo Profesional

- Tipo: documentacion y aprobacion visual.
- Alcance: registrar decisiones de diseno aprobadas para el sistema "Catalogo Creativo Profesional" de la Storefront publica.
- Archivos creados:
  - `docs/ecommerce/STOREFRONT_VISUAL_APPROVAL_2F1.md`
  - `docs/qa/PHASE2F1_VISUAL_APPROVAL_QA_CHECKLIST.md`
- Archivos actualizados:
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
- Decisiones visuales aprobadas:
  - Direccion visual: "Catalogo Creativo Profesional".
  - Logo: usar siempre logo real de InkToy.
  - Paleta: Azul `#0A2540`, Amarillo `#FFD166`, Rojo `#EF476F`, blanco y grises suaves.
  - Tipografias: Fraunces (titulos), DM Sans (cuerpo/UI).
  - Estilo: mobile-first, SEO-first, limpio, profesional, comercial, accesible. Bordes 8px, sombras suaves, sin efectos pesados.
  - Navegacion MVP: Inicio, Categorias, Buscar, Tiendas.
  - CTAs: "Ver detalle", "Ver categoria", "Consultar en tienda".
  - Badges: Disponible, Agotado, Disponible en tienda.
- Componentes visuales definidos: StorefrontHeader, StorefrontFooter, BottomNavigation, Button, Badge, Chip, ProductCard, CategoryCard, EmptyState, ProductImageFrame, Accordion, StickyProductCTA, Breadcrumbs, SectionHeading.
- Ajustes menores registrados: sticky CTA safe area, chips scroll horizontal, productos relacionados opcionales, noindex/robots durante desarrollo, next/image con proporciones estables, H1 unico, breadcrumbs semanticos.
- Restricciones vigentes: sin checkout, carrito, pagos, pedidos, login, perfil, admin, ERP interno, Merchant Center.
- Siguiente paso esperado: Fase 2F.2 Componentes base Next.js + Tailwind.

### Cierre Fase 2G.1 Publicacion de producto operativo a perfil ecommerce

- Tipo: implementacion backend funcional.
- Commit: `f766397 feat(ecommerce): add create online profile from product`.
- Alcance real implementado:
  - `POST /api/v1/ecommerce-admin/products/{id}/online-profile` — crea perfil online DRAFT desde producto ERP/POS existente.
  - Validacion de existencia del producto, estado DRAFT inicial, proteccion RBAC ADMIN.
- Tests: `EcommerceAdminProfilesIntegrationTest` 11 tests, 0 failures, BUILD SUCCESS.
- Exclusiones confirmadas:
  - No se toco frontend Angular, Flyway/DB, Docker, `.env` raiz, secretos, dependencias, POS, ventas, caja, facturacion ni inventario.
  - No se implemento checkout, pagos, pedidos, delivery, Merchant Center, login cliente, perfil cliente ni panel publico.
- QA: tests de integracion aprobados (11/11, BUILD SUCCESS).
- Siguiente paso: Fase 2G.2 Smoke Test Real de Producto Publicado → Storefront.

### Cierre Fase 2G.2 Smoke Test Real de Producto Publicado → Storefront

- Tipo: validacion end-to-end + cierre documental QA.
- Producto de prueba: ProductId 5839, Slug `producto-smoke-test-2g2-1780622524`, Precio S/ 25.90, Estado PUBLISHED.
- Flujo validado:
  1. Login `admin@erp.local` → token JWT.
  2. Creacion categoria/unidad/producto operativo.
  3. `POST /api/v1/ecommerce-admin/products/5839/online-profile` → 201 DRAFT.
  4. PUT perfil (slug, nombre, descripcion, categoria, marca) → 200.
  5. PUT SEO (title, description, canonical, INDEX_FOLLOW, indexable=true) → 200.
  6. PUT asset principal (URL externa) → 200.
  7. Validacion publicacion → publishable=true.
  8. `POST /api/v1/ecommerce-admin/products/5839/publish` → 200 PUBLISHED.
  9. Storefront `/productos/producto-smoke-test-2g2-1780622524` → 200 OK con contenido correcto.
- Storefront validado:
  - H1, precio PEN 25.90, descripcion, categoria/marca badges, breadcrumbs.
  - CTA "Consultar en tienda" presente.
  - Metadata SEO: noindex/nofollow, canonical, OG tags.
  - Header/Footer/BottomNavigation/StickyProductCTA renderizados.
  - Sin carrito, checkout, "Comprar", login, perfil cliente.
- Casos negativos validados: 404 slug inexistente, 404 DRAFT, 409 duplicado, 403 SUPERVISOR.
- Backend Docker requirio rebuild para incluir codigo 2G.1.
- Configuracion local: `storefront/.env.local` con `STOREFRONT_API_BASE_URL=http://localhost:8080`, `STOREFRONT_INDEXING_ENABLED=false` (ignorado por git).
- Deudas no bloqueantes:
  - Asset externo no renderiza (getSafeImageSrc solo acepta paths relativos).
  - Disponibilidad "No disponible temporalmente" por falta de stock operativo.
- Exclusiones confirmadas:
  - No se toco codigo funcional durante fase documental 2G.2D.
  - No se toco frontend Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.
  - No se implemento checkout, carrito, pagos, pedidos, login cliente, perfil cliente, Merchant Center.
- Archivos documentales actualizados en cierre 2G.2D:
  - `docs/qa/PHASE2G2_PUBLISHED_PRODUCT_SMOKE_TEST.md` (creado)
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
  - `docs/qa/REGRESSION_CHECKLIST.md`
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
- Siguiente paso esperado: Fase 2G.3A — Indicador de perfil online en Productos (Angular frontend).
- NOTA: `/productos/[slug]` ya fue implementada en 2F.3B y validada exitosamente en 2G.2. No requiere nueva implementacion.

### Cierre Fase 2H.5D QA Detalle de Perfil Online

- Tipo: cierre documental QA de UX administrativa Angular-only.
- Fase funcional base: 2H.5C-FIX.
- Commit funcional: `fcf6017 feat(ecommerce-admin): refine online profile detail workflow`.
- Pantalla: `Catalogo online > Perfiles online > Detalle de Perfil online`.
- Archivo funcional validado: `frontend/src/app/features/ecommerce-admin/online-profile-detail-page.component.ts`.
- Alcance cerrado:
  - Tabs operativos Contenido, SEO, Imagen y Precio.
  - Checklist lateral clicable.
  - Boton `Ir al primer pendiente`.
  - Panel `Requisitos para publicar` como guia operativa con resumen, pendientes primero y completados colapsados/discretos.
  - Ajustes de copy, paleta, tipografia y jerarquia visual.
- Validaciones:
  - `npm run build`: OK.
  - Smoke UI Docker/headless: OK.
  - Desktop/tablet/mobile: OK.
  - Caso con pendientes y caso sin pendientes: OK.
  - Sin errores JS capturados.
- Documentacion creada: `docs/qa/PHASE2_2H5D_ONLINE_PROFILE_DETAIL_QA.md`.
- Exclusiones confirmadas: sin backend, endpoints, DTOs, servicios, Storefront, Flyway/DB, Docker, `.env`, secretos, reglas de publicacion, payloads ni contratos.

### Cierre POS Search Feedback And E2E Runtime Polish

- Tipo: polish frontend POS + cierre QA/E2E.
- Commit objetivo: `fix(pos): improve search feedback and e2e runtime`.
- Alcance real documentado:
  - Búsqueda y resultados POS refinados.
  - Mensaje de sin stock con nombre principal y SKU/código como detalle.
  - Empty state de resultados compacto con helper desktop en una línea cuando hay ancho.
  - Carrito con `Carrito vacío` y helper E2E alineado.
  - Runtime E2E aislado en `127.0.0.1:4201` sin reutilización de servidor para evitar estado stale.
- Validaciones:
  - `npm run build`: PASS.
  - `E2E_BASE_URL=http://127.0.0.1:4201 npm run e2e:no-write`: PASS, 3 tests.
  - `E2E_BASE_URL=http://127.0.0.1:4201 npm run e2e:no-write:headed`: PASS, 3 tests.
  - `git diff --check`: sin errores, solo advertencias LF -> CRLF.
- Confirmaciones:
  - No se toco backend, DB, Auth/JWT, guards, rutas funcionales, caja real, ventas transaccionales, stock real, comprobantes ni Storefront.

### Cierre POS Cart Density And Hierarchy Polish

- Tipo: polish frontend POS + cierre QA/E2E.
- Commit objetivo: `style(pos): polish cart density and hierarchy`.
- Alcance real documentado:
  - Panel `Carrito` mas compacto y legible.
  - Fila operativa con `Cant.`, `Dscto.`, `SUBTOTAL` y `Quitar` alineada en panel y modal.
  - Modal `Carrito completo` alineado al patron visual del panel.
  - Microajuste final para corregir el desfase vertical entre `SUBTOTAL` y `Quitar` eliminando compensaciones manuales.
- Validaciones:
  - `npm run build`: PASS.
  - `E2E_BASE_URL=http://127.0.0.1:4201 npm run e2e:no-write`: PASS.
  - `E2E_BASE_URL=http://127.0.0.1:4201 npm run e2e:no-write:headed`: PASS.
  - `git diff --check`: sin errores, solo advertencias LF -> CRLF.
- Confirmaciones:
  - No se toco backend, DB, Auth/JWT, guards, rutas funcionales, caja real, ventas transaccionales, stock real, comprobantes, layout global, sidebar ni Storefront.
  - No se toco la logica funcional del carrito ni el flujo de cobro.

### Cierre POS Checkout Modal UX Polish

- Tipo: polish frontend POS + cierre QA/E2E.
- Commit objetivo: `style(pos): polish checkout modal UX`.
- Alcance real documentado:
  - Modal `Cobrar venta` mas ancho y en 2 columnas.
  - Header compacto con resumen de items/total y accion `Cerrar` discreta.
  - Eliminacion del texto decorativo `Checkout de cobro`.
  - Validacion progresiva para Factura sin errores prematuros ni duplicados.
  - Actualizacion del contrato E2E para validar elementos operativos reales.
- Validaciones:
  - `npm run build`: PASS.
  - `E2E_BASE_URL=http://127.0.0.1:4201 npm run e2e:no-write`: PASS.
  - `E2E_BASE_URL=http://127.0.0.1:4201 npm run e2e:no-write:headed`: PASS.
  - `git diff --check`: sin errores, solo advertencias LF -> CRLF.
- Confirmaciones:
  - No se toco backend, DB, Auth/JWT, guards, rutas funcionales, caja real, ventas transaccionales, stock real, comprobantes reales, sidebar, layout global ni Storefront.
  - No se toco la logica funcional critica del cobro.

### Cierre Fase 2S.2A Catalogo Publico Navegable Minimo

- Tipo: implementacion funcional Storefront Next.js + cierre documental QA.
- Alcance: primeras paginas publicas navegables del Storefront usando contratos publicos existentes y componentes Stitch ya implementados.
- Archivos creados:
  - `storefront/app/productos/page.tsx` — Listado publico de productos.
  - `storefront/app/categorias/page.tsx` — Listado publico de categorias.
- Microajustes aplicados (2S.2A-FIX):
  - Copy comercial/orientado al cliente en ambas paginas.
  - Eliminados textos tecnicos orientados al ERP/POS.
  - `/categorias` muestra "Detalle proximamente" en lugar de CTA enganoso con href="#".
- Componentes reutilizados: ProductCard, CategoryCard (adaptado), EmptyState, StorefrontHeader, StorefrontFooter, BottomNavigation, Breadcrumbs, SectionHeading.
- API client: `getStorefrontProducts()`, `getStorefrontCategories()` consumiendo `/api/v1/storefront/catalog/products` y `/api/v1/storefront/catalog/categories`.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke HTTP:
  - `/productos`: 200 OK.
  - `/categorias`: 200 OK.
  - `/productos/{slug}`: 200 OK (sin cambios).
  - `/categorias/[slug]`: 404 esperado.
  - `/buscar`: 404 esperado.
- Confirmaciones:
  - Sin llamadas a `/api/v1/ecommerce-admin`.
  - robots/noindex activos.
  - Server Components.
  - Consumo exclusivo de `/api/v1/storefront/**`.
  - Mobile-first responsive.
- Exclusiones confirmadas:
  - Sin Home real, buscador, filtros, ordenamiento, paginacion UI avanzada.
  - Sin `/categorias/[slug]`.
  - Sin carrito, checkout, pagos, pedidos, login cliente, Merchant Center.
  - Sin sitemap XML, imagenes externas, remotePatterns.
  - Sin cambios en backend, Angular, ecommerce-admin, contratos, DTOs, Flyway/DB, Docker, `.env`, secretos, seguridad, endpoints, `/productos/[slug]`.
- Documentacion creada: `docs/qa/PHASE2S2A_STOREFRONT_NAVIGABLE_CATALOG_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: fase visual de alineacion Storefront mobile-first basada en disenos Stitch.

### Cierre Fase 2S.2B-A Alineacion Visual Storefront Mobile-First de Listados

- Tipo: ajustes visuales Storefront Next.js + cierre documental QA.
- Alcance: alineacion visual de `/productos` y `/categorias` con disenos Stitch mobile-first, sin agregar funcionalidades nuevas.
- Archivos modificados:
  - `storefront/app/productos/page.tsx` — Grid mobile-first de 2 columnas.
  - `storefront/app/categorias/page.tsx` — Cards tipo fila comerciales.
  - `storefront/components/catalog/product-card.tsx` — Card mas compacta.
  - `storefront/components/ui/product-image-frame.tsx` — Fallback mas de marca.
- Cambios visuales:
  - `/productos`: grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, espaciado compacto.
  - `ProductCard`: menos padding, textos mas pequenos en mobile, nombre limitado a 2 lineas, boton "Ver detalle" con `size="sm"`.
  - `ProductImageFrame`: fallback "Imagen InkToy proximamente" con gradiente y sombra.
  - `/categorias`: cards tipo fila con bloque visual lateral, nombre destacado, descripcion con limite visual, estado discreto "Detalle proximamente", sin CTA falsa.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke HTTP:
  - `/productos`: 200 OK (grid 2 columnas mobile).
  - `/categorias`: 200 OK (sin CTA falsa).
  - `/productos/{slug}`: 200 OK (sin cambios).
  - `/categorias/[slug]`: 404 esperado.
  - `/buscar`: 404 esperado.
- Confirmaciones:
  - Sin llamadas a `/api/v1/ecommerce-admin`.
  - robots/noindex activos.
  - Server Components.
  - Consumo exclusivo de `/api/v1/storefront/**`.
  - Mobile-first responsive.
- Exclusiones confirmadas:
  - Sin Home real, buscador, filtros, ordenamiento, paginacion UI avanzada.
  - Sin `/categorias/[slug]`.
  - Sin carrito, checkout, pagos, pedidos, login cliente, Merchant Center.
  - Sin sitemap XML, imagenes externas, remotePatterns, galeria real, productos relacionados.
  - Sin cambios en backend, Angular, ecommerce-admin, contratos, DTOs, Flyway/DB, Docker, `.env`, secretos, seguridad, endpoints, `/productos/[slug]`, `globals.css`.
- Documentacion creada: `docs/qa/PHASE2S2B_A_STOREFRONT_VISUAL_ALIGNMENT_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: discovery separado para categoria publica `/categorias/[slug]` y productos por categoria.

### Cierre Fase 2S.3A Categoria Publica /categorias/[slug] con Productos por Categoria

- Tipo: implementacion funcional backend + Storefront + cierre documental QA.
- Alcance: extender contrato publico con `categorySlug` opcional y crear pagina `/categorias/[slug]` con productos reales filtrados.
- Backend:
  - `GET /api/v1/storefront/catalog/products` acepta `categorySlug` opcional.
  - Filtro server-side por categoria online activa.
  - Sin cambios en DTOs publicos ni endpoint duplicado.
  - Tests nuevos: filtro por categoria, slug inexistente, categoria inactiva.
- Storefront:
  - `storefront/lib/api.ts`: `getStorefrontProducts()` acepta `categorySlug`.
  - `storefront/app/categorias/[slug]/page.tsx`: pagina dinamica con metadata SEO.
  - `storefront/app/categorias/page.tsx`: enlaces a `/categorias/{slug}`.
- Validaciones:
  - Tests backend focalizados: 43 tests, 0 failures, BUILD SUCCESS.
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke HTTP:
  - `/categorias/{slug-con-productos}`: 200 OK.
  - `/categorias/{slug-inexistente}`: 404 OK.
  - `/productos`: 200 OK (sin cambios).
  - `/productos/{slug}`: 200 OK (sin cambios).
  - `/buscar`: 404 OK (esperado).
- Confirmaciones:
  - Sin llamadas a `/api/v1/ecommerce-admin`.
  - robots/noindex activos.
  - Server Components.
  - Consumo exclusivo de `/api/v1/storefront/**`.
- Exclusiones confirmadas:
  - Sin Home real, buscador, filtros UI, carrito, checkout, pagos, pedidos, login cliente, Merchant Center.
  - Sin sitemap XML, imagenes externas, remotePatterns, productos relacionados, marcas publicas.
  - Sin cambios en Angular, ecommerce-admin, Flyway/DB, Docker, `.env`, secretos, seguridad, `/productos/[slug]`, `globals.css`, DTOs publicos.
  - Sin client-side filtering ni endpoints duplicados.
- Riesgo de despliegue: Storefront nuevo debe desplegarse junto con backend nuevo.
- Documentacion creada: `docs/qa/PHASE2S3A_PUBLIC_CATEGORY_PRODUCTS_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: discovery de Home real SEO-first.

### Cierre Fase 2S.4A Home real SEO-first Storefront

- Tipo: implementacion funcional Storefront + cierre documental QA.
- Alcance: reemplazar el preview/mock de `storefront/app/page.tsx` por una Home real MVP SEO-first.
- Datos publicos consumidos:
  - categorias publicas con `getStorefrontCategories({ page: 0, size: 6 })`;
  - productos publicos con `getStorefrontProducts({ page: 0, size: 8 })`.
- Secciones implementadas:
  - hero comercial real;
  - categorias reales enlazadas a `/categorias/{slug}`;
  - productos reales enlazados a `/productos/{slug}`;
  - bloque simple de confianza/beneficios;
  - header/footer/bottom navigation existentes.
- Confirmaciones:
  - sin mocks funcionales;
  - sin textos de preview tecnico;
  - sin `href="#"`;
  - sin funciones falsas;
  - sin buscador, filtros, carrito, checkout, pagos, login, pedidos, promociones ni banners administrables.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke HTTP:
  - `/`: 200 OK.
  - `/productos`: 200 OK.
  - `/categorias`: 200 OK.
  - `/buscar`: 404 OK (esperado).
- Confirmaciones tecnicas:
  - no hay llamadas nuevas a `/api/v1/ecommerce-admin`;
  - robots/noindex activos;
  - Server Components;
  - consumo exclusivo de `/api/v1/storefront/**`.
- Exclusiones confirmadas:
  - sin backend nuevo;
  - sin contratos/DTOs/endpoints nuevos;
  - sin sitemap XML;
  - sin `remotePatterns`;
  - sin imagenes externas nuevas;
  - sin cambios en Angular/ecommerce-admin/Flyway/DB/Docker/seguridad.
- Riesgo SEO: Home real aun depende del volumen real del catalogo para no verse pobre o duplicada.
- Documentacion creada: `docs/qa/PHASE2S4A_STOREFRONT_HOME_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: discovery de SEO tecnico de publicacion.

### Inicio Fase 2E.0 Storefront MVP Shell Planning

- Tipo: documentacion tecnica de planificacion, sin implementacion funcional.
- Objetivo: cerrar el stack tecnico, la estructura y la configuracion base del futuro shell Next.js en `storefront/`.
- Archivos creados:
  - `docs/adr/ecommerce/ECOM-ADR-021-storefront-tech-stack.md`
  - `docs/ecommerce/STOREFRONT_MVP_SHELL_PLAN.md`
  - `docs/qa/PHASE2E_STOREFRONT_MVP_SHELL_QA_CHECKLIST.md`
- Archivos actualizados:
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
- Decisiones tecnicas cerradas:
  - Next.js 16 como version objetivo estable/LTS.
  - App Router obligatorio.
  - TypeScript obligatorio.
  - npm como package manager.
  - Tailwind CSS como base visual inicial.
  - `storefront/` definida como carpeta raiz futura; `frontend/` Angular queda solo para ERP/POS interno.
  - `.env.local.example` como plantilla commiteable; `.env.local` real ignorado.
  - No usar `NEXT_PUBLIC_` para secretos ni URLs internas sensibles.
  - Wrapper API server-side por defecto.
  - `robots.txt` futuro bloquea crawlers durante desarrollo.
  - Paginas reales y `sitemap.xml` quedan para fase posterior.
- Restricciones: no crear `storefront/`, no instalar Next.js, no instalar dependencias, no crear paginas reales, no consumir endpoints reales, no `sitemap.xml` real, no robots productivo, no checkout/pagos/pedidos/stock reservado/delivery/Merchant Center, no AWS/staging, no Docker, no `.env` raiz, no backend funcional, no Angular, no Flyway/DB.
- No hacer commit ni push en esta fase sin instruccion explicita.

### Inicio Fase 2D Storefront Architecture Decision & SEO Delivery Plan

- Tipo: documentacion y arquitectura, sin implementacion funcional.
- Objetivo: cerrar la decision de arquitectura de entrega para la futura Storefront publica SEO-first con Next.js, SSG/ISR, rutas publicas, sitemap/robots/canonical y limites de alcance.
- Archivos creados:
  - `docs/adr/ecommerce/ECOM-ADR-020-storefront-nextjs-delivery-architecture.md`
  - `docs/ecommerce/STOREFRONT_NEXTJS_DELIVERY_PLAN.md`
  - `docs/qa/PHASE2D_STOREFRONT_ARCHITECTURE_QA_CHECKLIST.md`
- Archivos actualizados:
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ecommerce/STOREFRONT_SEO_FIRST_STRATEGY.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
- Decisiones documentales cerradas:
  - Next.js sera la futura Storefront publica SEO-first.
  - Angular `frontend/` queda solo para ERP/POS interno.
  - `storefront/` queda como ubicacion futura recomendada, sin crearse en Fase 2D.
  - Storefront API sigue dentro del monolito Spring Boot por ahora y extraction-ready.
  - Rutas objetivo: `/productos/{slug}` y `/categorias/{slug}`.
  - `/marcas/{slug}` queda diferido.
  - SSG/ISR sera la estrategia principal para productos y categorias.
  - SSR queda reservado para casos realmente necesarios.
  - `sitemap.xml` futuro sera generado por Next.js usando `GET /api/v1/storefront/seo/sitemap`.
  - `robots.txt` futuro sera generado/controlado por Storefront.
  - Canonical debe derivar de `canonicalPath` o regla backend/contractual aprobada.
  - Staging sera no indexable por defecto.
- Restricciones: no crear Next.js, no crear `storefront/`, no instalar dependencias, no tocar Angular, backend funcional, Flyway/DB, Docker, `.env`, secretos, AWS/staging, POS, ventas, caja, facturacion, inventario, checkout, pagos, delivery, Merchant Center, pedidos online ni stock reservado.
- No hacer commit ni push en esta fase sin instruccion explicita.

### Decisiones aprobadas para Fase 1

- Producto sin marca: no usar texto libre; permitir solo marca formal o regla explicita auditada tipo `Sin marca`/`Generico`.
- Categoria online: obligatoria para publicar; no obligatoria para perfiles online en `DRAFT`.
- Asset formal: el perfil online puede existir en `DRAFT` sin asset, pero la publicacion debe bloquearse hasta tener imagen principal con alt text y derechos confirmados.
- Namespace administrativo: `/api/v1/ecommerce-admin/...` para administracion interna, separado de la Storefront API publica.
- Permisos iniciales: `ADMIN` crea, edita, publica y despublica; `SUPERVISOR` solo lectura/revision al inicio.
- Flyway: no tocar en Fase 1A; Fase 1B futura debe ser aditiva, de bajo riesgo y aprobada explicitamente.
- Categoria SEO: usar categoria online separada para ecommerce; no reutilizar directamente la categoria interna como categoria publica SEO.
- Slugs: bloquear cambios de slug en productos ya publicados mientras no exista historial de slugs/redirecciones.

## Reglas de control de cambios

1. Trabajar por cambios pequenos, verificables y reversibles.
2. No mezclar deudas tecnicas distintas en una sola intervencion.
3. No mezclar backend/frontend cuando el requerimiento no lo exige.
4. No mezclar cambios funcionales con cambios cosmeticos sin acuerdo previo.
5. Mantener foco en alcance explicitamente solicitado.
6. En fases documentales, no introducir cambios de codigo funcional, migraciones, endpoints ni configuracion de despliegue.
7. En POS, documentar cambios de persistencia frontend, validacion de almacén y ajustes visuales de búsqueda/botones como nota operativa breve cuando impacten la experiencia de caja.
8. En POS, registrar como mejora UX el reemplazo de confirm nativo por modal propio al cobrar, sin alterar la logica transaccional.
9. En Inventario, documentar mejoras UX de Ajustes de stock cuando incorporen autocomplete server-side, layout estable, confirmacion propia y reset limpio post-success sin tocar backend.
10. En Catalogo, documentar cambios de Productos cuando la busqueda multi-token, filtros reorganizados y tabla compacta mejoren la experiencia sin cambiar endpoints.
11. En Inventario, documentar la fase 1 del autocomplete compartido cuando se cree `ProductAutocompleteComponent` y se migre primero solo Transferencias, dejando Stock/Stock inicial/Ajustes para fases posteriores.
12. En Inventario/Kardex, documentar cambios de auditoria cuando el endpoint se enriquezca con nombres operativos, el frontend use paginacion server-side, un solo Limpiar y tabla alineada sin tocar el contrato base `/api/v1/inventory/kardex`.
13. En Inventario, documentar la consolidacion del autocomplete compartido cuando `Stock` use `filterMode=true`, `disabled` reactivo y limpieza visual final sin textos redundantes bajo Producto.
14. En Compras, documentar el rediseño UX/UI de Proveedores cuando la pantalla pase a tabla principal con drawer/modal local para crear/editar y confirmaciones del sistema para estados.
15. En Compras, documentar el rediseño completo de Órdenes de compra en 5 fases cuando el flujo pase de listado -> nueva -> edicion -> detalle -> recepcion con tablas operativas, ProductAutocompleteComponent, sanitizacion de cantidades/costos, ConfirmDialogService y formateo local Intl sin tocar backend, endpoints ni contratos.
16. En Cotizaciones, documentar el rediseño completo en 5 fases cuando el flujo pase de listado -> nueva -> edicion -> detalle -> conversion con tabla compacta, ProductAutocompleteComponent, `syncSelectedToInput` opt-in en edicion, sanitizacion de cantidades/descuentos, ConfirmDialogService y formateo local Intl sin tocar backend, endpoints ni contratos.
17. En Facturacion, documentar la mejora empresarial del Detalle de comprobante electronico cuando se muestren nombre real + SKU + codigo de barras en la tabla de items, historial descendente, XML colapsable y cards key-value, sin ProductService lookup frontend, sin DB/Flyway, sin cambios de endpoints ni POS.
18. En Facturacion, documentar el rediseño empresarial de Emitir comprobante pendiente cuando la pantalla pase a header operativo sin MVP, cards key-value compactas, Tipo/Serie alineados con helper persistente, copy contextual por tipo, tabla de items con nombre real + SKU, montos PEN y sin ID tecnico visible, sin alterar reglas tributarias ni contratos.
19. En Facturacion, documentar hardening por ambiente cuando LOCAL/BETA sigan como simulacion controlada y PROD quede bloqueado para firma/envio sin proveedor tributario real ni firma XML real, evitando aceptaciones mock en produccion.
20. En Facturacion, documentar configuracion tributaria como consola por ambiente cuando se muestre estado LOCAL/BETA/PROD (perfil/series/readiness), validaciones operativas (RUC 11, ubigeo 6), advertencias preventivas perfil-serie y CTA a Series sin cambiar contratos backend.
21. En Facturacion, documentar correccion de layout shift en Configuracion tributaria cuando se aplique field-help persistente con altura reservada en RUC/Razon social, Ubigeo/Departamento y Provincia/Distrito para evitar desalineacion visual entre campos hermanos de la misma fila.
22. En Facturacion, documentar loading gate + loader neutral con delay en Configuracion tributaria cuando se elimine skeleton estructural con cuadros vacios y se implemente estado de carga con retardo de 280 ms: si la carga termina antes no se muestra nada intermedio; si tarda aparece loader compacto con texto operativo; sin formulario vacio, cards incompletas ni flash visual al presionar F5.
23. En Facturacion, documentar hardening de series y correlativos cuando se aplique: unica serie activa por documentType+environment (409 si duplica); currentNumber como proximo correlativo (bloquea si <= maxIssuedNumber); validacion defensiva en createFromSale() antes de crear documento/incrementar; migracion Flyway V16 con indice unico parcial active=true; runbook operativo para correccion manual de series inconsistentes (currentNumber = maxIssuedNumber + 1); riesgo residual de datos historicos inconsistentes documentado; sin modificacion automatica de datos; sin cambios en frontend/POS/endpoints publicos.
24. En Facturacion, registrar correccion operativa manual de serie historica inconsistente B001/LOCAL: tenia current_number=1 y max_issued=2 (inconsistente porque currentNumber es proximo correlativo a emitir y debe ser > maxIssuedNumber); se corrigio manualmente desde pantalla Series y correlativos a currentNumber=3; serie quedo INACTIVA; trazabilidad historica de comprobantes antiguos preservada; antes de reactivar serie historica validar que proximo correlativo sea mayor al ultimo emitido; no se modificaron datos automaticamente por script.
25. En Facturacion, documentar rediseño frontend de Series y numeracion tributaria: consola operativa empresarial con formulario cerrado por defecto, boton Nueva serie, modo edicion con contexto, Cancelar, Proximo correlativo + helper persistente, field-help anti-layout shift, filtros Tipo/Ambiente/Estado, separacion vigentes/historicas colapsables, confirmaciones activar/desactivar, chips LOCAL/BETA/PROD dark-tinted, badges sobrios, mensajes 409 operativos; sin cambios de backend/endpoints/contratos.
26. En Ventas, documentar integracion con comprobantes electronicos en 4 fases + refinamiento visual:
    - Fase 1 UX: Intl.NumberFormat/DateTimeFormat es-PE, saleNumber como identificador principal, "Total linea" -> "Importe", ConfirmDialogService en anulacion.
    - Fase 2A detalle: listBySaleId() sin fallback a list() global, bloque Comprobante electronico con CTA contextual Emitir/Ver, navegacion a /facturacion/emitir/:saleId y /facturacion/comprobantes/:id.
    - Fase 2B listado: endpoint no rompiente GET /api/v1/sales/list-items con read-model dedicado; evita N+1 con consulta batch de comprobantes por saleIds; GET /api/v1/sales intacto; columna Comprobante con numero/estado/ambiente o Pendiente/Sin comprobante.
    - Fase 2C proteccion de anulacion: backend bloquea anulacion si comprobante en DRAFT/GENERATED/SIGNED/SENT/ACCEPTED; permite sin comprobante o REJECTED/ERROR/CANCELLED; validacion antes de revertir stock; HTTP 409 con mensaje operativo; frontend advertencia preventiva y manejo 409 claro.
    - Refinamiento visual: chips sobrios dark-tinted con borde tenue; Pendiente neutral; bloque detalle horizontal compacto 4 columnas con labels arriba/valores debajo; copy reducido; sin consultas nuevas ni N+1; sin cambios backend/endpoints.
    - Decision de politica: bloquear anulacion para DRAFT/GENERATED/SIGNED/SENT/ACCEPTED; permitir sin comprobante, REJECTED, ERROR, CANCELLED.
    - Caja UX.1 y UX.2A: caja reorganizada como consola operativa frontend-only; formatos Intl es-PE; OPEN/CLOSED traducidos; badge superior con visibilidad intermedia; resumen principal con Caja #id; ID interno y UUID tecnico movidos a Datos tecnicos colapsable; apertura solo cuando no hay caja abierta; cierre con ConfirmDialogService; consulta por ID como bloque secundario colapsable; sesion cerrada se conserva visible; no se toco backend ni contratos.
    - Riesgo mitigado: evitar revertir stock/caja/pagos con comprobante electronico activo; evitar inconsistencias entre venta y comprobante; evitar N+1 en listado.
    - Restricciones: no se toco DB/Flyway; no se cambio endpoint existente /api/v1/sales; se agrego endpoint no rompiente /api/v1/sales/list-items; no se implemento nota de credito/anulacion tributaria todavia.

## Runbook operativo - Series inconsistentes

1. Identificar series con current_number <= max_issued_number:
   `SELECT id, document_type, series, environment, current_number, max_issued_number FROM billing_series WHERE current_number <= max_issued_number AND active = TRUE;`
2. Para cada serie inconsistente, corregir manualmente a max_issued_number + 1:
   `UPDATE billing_series SET current_number = max_issued_number + 1, updated_at = NOW() WHERE id = <series_id>;`
3. Validar que current_number > max_issued_number tras la correccion.
4. No modificar datos automaticamente sin aprobacion explicita del responsable.
5. Validar antes de usar en POS o emision pendiente que la serie este consistente.
6. Riesgo residual: datos historicos inconsistentes deben sanearse controladamente; la emision bloquea hasta correccion.

## Tipos de commit sugeridos (cuando se autorice commit)

- fix:
- feat:
- style:
- docs:
- test:
- chore:

Nota: esta guia define tipos recomendados, pero ningun agente debe commitear automaticamente.

## Flujo obligatorio antes de implementar

1. Revisar estado git:
   - git status
2. Leer contexto vigente:
   - README
   - docs/ai/\*
   - docs/qa relevantes
   - docs/adr relevantes
3. Proponer plan breve con alcance y riesgos.
4. Implementar solo el alcance limitado acordado.
5. Validar segun matriz de comandos/documentacion.
6. Reportar resultado con evidencia y riesgos residuales.

## Reglas de rollback

1. Cada cambio debe poder revertirse de forma aislada.
2. Evitar cambios masivos no atomicos.
3. Si se detecta regresion, priorizar rollback del bloque recien introducido.
4. No aplicar rollback destructivo global sin autorizacion explicita.

## Criterios para actualizar documentacion QA

Actualizar docs/qa cuando ocurra al menos uno de estos casos:

1. Cambio funcional en modulo o flujo de usuario.
2. Correccion de bug CRITICAL/HIGH/MEDIUM.
3. Ajuste de seguridad, permisos o rutas protegidas.
4. Cambio de comportamiento observable en Docker/runtime.
5. Nuevo protocolo operativo de validacion (ejemplo: anti-cache).

Nota operativa: cambios ecommerce deben actualizar plan/checklist de fase, matrices QA cuando haya endpoints/rutas reales, y mantener separacion entre endpoints administrativos internos y Storefront API publica.

Nota operativa: cambios de catalogo que agregan endpoints nuevos o reglas de reserva deben reflejarse tambien en matrices y decisiones antes de cerrar la tarea.
Nota operativa: cambios en Stock que alteren el filtro de Producto deben reflejar lookup/autocomplete, criterio de seleccion por `productId` y smoke minimo en matrices/checklist.
Nota operativa: cambios en Stock que adopten `filterMode` deben reflejarse en matrices/checklist con comportamiento de filtro editable, `Buscar` manual y sin acciones redundantes bajo el autocomplete.
Nota operativa: cambios en Proveedores que reorganicen crear/editar deben reflejar tabla principal, drawer/modal local, validacion visual estable y smoke minimo en matrices/checklist.
Nota operativa: cuando Unidades cierre acciones de frontend, reflejarlo en matrices y checklist sin abrir nuevos documentos.
Nota operativa: en Almacenes, registrar `PATCH /api/v1/warehouses/{id}/status` y la semantica de `DELETE` como alias de desactivacion en matrices y decisiones.

## Criterios para crear tag estable

Solo crear tag cuando se cumpla todo:

1. Build backend y frontend exitosos.
2. Docker Compose operativo (servicios arriba y saludables).
3. Smoke QA minimo por roles completado.
4. Sin hallazgos CRITICAL/HIGH abiertos.
5. Documentacion tecnica y QA actualizada.
6. Aprobacion explicita del responsable tecnico.

## Politica de seguridad operativa

1. No cargar datos reales sin autorizacion explicita.
2. No exponer credenciales reales.
3. No ejecutar comandos destructivos sobre git o base de datos sin aprobacion.
4. No hacer commit/push/tag automatico desde agentes.

### Cierre Fase 2S.5A Base SEO tecnica del Storefront

- Tipo: implementacion funcional Storefront + cierre documental QA.
- Alcance: preparar la base SEO tecnica sin activar indexacion.
- Archivos creados:
  - `storefront/lib/seo.ts`
  - `storefront/app/sitemap.ts`
  - `storefront/app/robots.ts`
  - `docs/qa/PHASE2S5A_STOREFRONT_TECHNICAL_SEO_QA.md`
- Archivos modificados:
  - `storefront/.env.local.example`
  - `storefront/app/layout.tsx`
  - `storefront/app/page.tsx`
  - `storefront/app/productos/page.tsx`
  - `storefront/app/categorias/page.tsx`
- Archivo eliminado:
  - `storefront/public/robots.txt`
- Decisiones tecnicas:
  - `app/robots.ts` queda como unica fuente efectiva de `/robots.txt`.
  - `STOREFRONT_PUBLIC_BASE_URL` se usa para canonicals y sitemap con fallback seguro a `http://localhost:3000`.
  - `app/sitemap.ts` consume `GET /api/v1/storefront/seo/sitemap` y transforma solo las entradas entregadas por backend.
  - Indexacion sigue bloqueada por defecto con `STOREFRONT_INDEXING_ENABLED=false`.
  - `layout.tsx` mantiene `index: false` y `follow: false` por defecto.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke:
  - `/`: 200.
  - `/productos`: 200.
  - `/categorias`: 200.
  - `/sitemap.xml`: 200.
  - `/robots.txt`: 200.
  - `/buscar`: 404 esperado.
- Exclusiones confirmadas:
  - sin backend, sin contratos, sin structured data, sin buscador, sin filtros, sin carrito, sin checkout, sin pagos, sin Merchant Center, sin `remotePatterns`, sin imagenes externas.
- Riesgos pendientes:
  - configurar dominio real en `STOREFRONT_PUBLIC_BASE_URL` antes de publicar;
  - limpiar datos de prueba antes de indexar;
  - activar indexacion solo en una fase posterior separada y controlada.

### Cierre Fase 2S.5C Storefront indexing readiness guardrails

- Tipo: implementacion funcional Storefront + cierre documental QA.
- Alcance: endurecer la decision de indexacion para evitar activacion accidental en entornos no preparados.
- Archivos creados:
  - `docs/qa/PHASE2S5C_STOREFRONT_INDEXING_GUARDRAILS_QA.md`
- Archivos modificados:
  - `storefront/lib/seo.ts`
  - `storefront/app/robots.ts`
  - `storefront/app/layout.tsx`
  - `storefront/app/productos/[slug]/page.tsx`
  - `storefront/app/categorias/[slug]/page.tsx`
  - `storefront/.env.local.example`
- Decisiones tecnicas:
  - `canStorefrontAllowIndexing()` centraliza la politica de indexacion.
  - `STOREFRONT_INDEXING_ENABLED=true` no basta: la base URL debe ser publicable.
  - `localhost`, `127.0.0.1`, `0.0.0.0` y dominios `example/test` quedan bloqueados.
  - `robots.ts` y metadata comparten la misma decision para evitar inconsistencias.
  - `layout.tsx` y las paginas dinamicas respetan el helper compartido.
- Confirmaciones:
  - indexacion sigue bloqueada por defecto;
  - localhost no puede quedar indexable aunque el flag sea true;
  - no se toco backend, Angular, ecommerce-admin, contratos, DTOs, endpoints, Flyway, Docker ni seguridad.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke:
  - `/`: 200.
  - `/productos`: 200.
  - `/categorias`: 200.
  - `/sitemap.xml`: 200.
  - `/robots.txt`: 200.
  - `/buscar`: 404 esperado.
- Exclusiones confirmadas:
  - sin backend, sin contratos, sin structured data, sin buscador, sin filtros, sin carrito, sin checkout, sin pagos, sin Merchant Center, sin `remotePatterns`.
- Riesgos pendientes:
  - limpiar datos smoke/test antes de publicar;
  - configurar dominio real en `STOREFRONT_PUBLIC_BASE_URL`;
  - mejorar contenido comercial real;
  - activar indexacion solo en fase posterior separada y controlada.

### Cierre Fase 2S.7A Bulk ecommerce online profile import/export MVP

- Tipo: implementacion funcional backend + frontend Angular + cierre documental QA.
- Alcance: flujo separado de importacion/exportacion masiva de Perfiles online ecommerce usando SKU como clave humana.
- Endpoints creados (ADMIN):
  - `GET /api/v1/ecommerce-admin/products/online-profiles/import/template`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/import/preview`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/import/confirm-file`
- Backend:
  - Resolver batch de SKU a productId (`ProductRepositoryPort.findBySkusIgnoreCase`).
  - Use case, service, workbook adapter, DTOs y controller dedicados.
  - Plantilla prellenada con productos ERP activos y perfiles no publicados.
  - Hojas de referencia: `online_categories`, `brands`, `instructions`.
- Frontend Angular:
  - Pantalla `/ecommerce-admin/perfiles/importar`.
  - Modelos y servicio en `ecommerce-admin`.
  - Link desde Perfiles online y navegacion lateral.
  - Microajustes UX: texto superior mas corto, boton Quitar archivo con limpieza completa, tabla con anchos estables/truncado, confirmacion previa con conteos.
- Reglas de negocio:
  - SKU inexistente/duplicado/producto inactivo se rechaza.
  - Perfil publicado se protege/rechaza.
  - No se crean productos ERP.
  - No se modifica stock, inventario, unidad, costo, precio ERP ni categoria ERP.
  - No se crean marcas/categorias online automaticamente.
  - No se publica desde Excel.
  - Nuevos perfiles quedan DRAFT.
  - `onlineName` y `slug` se autogeneran cuando corresponde.
  - Slugs con `test`, `smoke`, `demo`, `prueba` o `example` se rechazan.
  - Categoria online y marca se validan contra referencias existentes y activas.
- Validaciones:
  - `mvn -DskipTests compile`: OK.
  - Tests backend focalizados: 57 tests, 0 failures, BUILD SUCCESS.
  - `npm run build`: OK.
  - `git diff --check`: OK.
- Smoke: no ejecutado porque no hay servidor local activo en esta sesion.
- Exclusiones confirmadas:
  - Sin publicar desde Excel.
  - Sin bulk SEO/imagenes/ZIP/storage/CDN.
  - Sin crear productos ERP.
  - Sin modificar stock/inventario/unidad/costo/precio ERP/categoria ERP.
  - Sin Storefront/POS/carrito/checkout/pagos/Merchant Center/structured data/remotePatterns/imagenes externas.
- Riesgos pendientes:
  - Filtro por categoria ERP para plantilla fuera del MVP.
  - Sin script lint separado en frontend.
  - Sin smoke headless/e2e para esta pantalla.
- Documentacion creada: `docs/qa/PHASE2S7A_ONLINE_PROFILE_BULK_IMPORT_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: 2S.8 — Discovery de gestion profesional de imagenes ecommerce.

### Cierre Fase 2S.8A Public image URL policy

- Tipo: hardening backend ecommerce admin + readiness/publicacion + microajuste Angular + QA documental.
- Alcance: politica de URL publica para `ProductAsset.assetUrl` usando el modelo actual de assets ecommerce.
- Backend:
  - Nueva configuracion `app.ecommerce.public-images.allowed-domains` / `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS`.
  - Nueva politica centralizada de URL publica de imagen.
  - `upsertPrimaryProductAsset` rechaza URLs no publicas o no permitidas.
  - `validatePublication` agrega error cuando la URL de imagen no es valida.
  - `ASSET_INVALID` se conserva como codigo de readiness para asset con URL invalida, alt faltante, derechos no confirmados o tipo incorrecto.
  - Readiness SQL de listado admin considera validos solo paths relativos publicos o dominios `https` permitidos.
- Angular:
  - Perfil online detalle ahora ofrece solo `PRODUCT_IMAGE` para producto.
  - Se agrego ayuda visible para URL publica/dominio permitido, alt text y derechos.
- Politica implementada:
  - Permitido: path relativo publico que empieza con `/`.
  - Permitido: `https://` en dominio allowlisted.
  - Bloqueado: allowlist externa vacia para dominios no configurados.
  - Bloqueado: `http`, `file`, `data`, `ftp`, credenciales, host ausente, whitespace/control chars, localhost, `127.0.0.1`, `0.0.0.0`, IPs privadas, `.test`, `.example`, `.example.com`, `.example.test`.
- Validaciones:
  - `mvn -DskipTests compile`: OK.
  - `mvn -Dtest=EcommerceCatalogApplicationServiceTest test`: 27 tests, 0 failures, BUILD SUCCESS.
  - Integracion ecommerce/storefront focalizada: 79 tests, 0 failures, BUILD SUCCESS.
  - `npm run build` en frontend: OK.
- Exclusiones confirmadas:
  - Sin upload binario.
  - Sin storage/CDN.
  - Sin Cloudflare R2/S3/Bunny/Supabase.
  - Sin ZIP.
  - Sin importacion masiva de imagenes ni columna imagen en Excel.
  - Sin galeria.
  - Sin Storefront, `next.config.ts` ni `remotePatterns`.
  - Sin structured data, Merchant Center ni activacion de indexacion.
  - Sin imagen interna en Producto ERP.
  - Sin buscador, filtros, carrito, checkout ni pagos.
- Riesgos pendientes:
  - Storefront aun requiere fase posterior para render seguro de dominios externos aprobados.
  - Sin validacion binaria de MIME, dimensiones o peso porque no hay upload/storage.
  - Datos historicos con URLs absolutas invalidas requieren limpieza antes de indexacion.
- Documentacion creada: `docs/qa/PHASE2S8A_PUBLIC_IMAGE_URL_POLICY_QA.md`.
- Pendiente recomendado: decision de storage/CDN o fase Storefront-safe para dominios de imagen aprobados, sin activar indexacion.

### Fase 2S.8B Storefront safe image render

- Tipo: implementacion Storefront Next.js + documentacion QA.
- Alcance: render seguro de `primaryImage.url` y OG image usando allowlist Storefront.
- Storefront:
  - Nueva variable `STOREFRONT_IMAGE_ALLOWED_DOMAINS` documentada en `.env.local.example`.
  - `next.config.ts` configura `images.remotePatterns` desde la allowlist.
  - Nuevo helper central `storefront/lib/images.ts`.
  - Home, Productos, Detalle producto y Detalle categoria usan helper central para render de imagenes.
  - Metadata/OG image usa helper seguro y omite imagen no permitida.
- Politica Storefront:
  - Permitido: path relativo publico que empieza con `/`.
  - Permitido: URL `https` en dominio allowlisted o subdominio.
  - Bloqueado: `http`, `file`, `data`, `ftp`, credenciales, strings vacios, whitespace/control chars, localhost, `127.0.0.1`, `0.0.0.0`, IPs privadas, `.test`, `.example`, `.example.com`, `.example.test`.
  - Default restrictivo: allowlist vacia no permite dominios externos.
- Exclusiones confirmadas:
  - Sin backend.
  - Sin Angular admin.
  - Sin Producto ERP/POS/stock/inventario/unidad/costo/precio ERP.
  - Sin base de datos, Flyway, Docker, auth/security ni indexacion.
  - Sin upload/storage/CDN/ZIP/importacion masiva de imagenes/galeria.
  - Sin structured data, Merchant Center, buscador, filtros, carrito, checkout ni pagos.
- Validaciones:
  - `npm run build` en Storefront: OK.
  - `npm run lint` en Storefront: OK.
  - `git diff --check`: OK.
- Documentacion creada: `docs/qa/PHASE2S8B_STOREFRONT_SAFE_IMAGE_RENDER_QA.md`.
- Pendiente recomendado: 2S.8C — Decision e implementacion controlada de storage/CDN o carga manual inicial de imagenes, sin activar indexacion.

### Fase 2S.8D AWS S3 + CloudFront image upload manual

- Tipo: implementacion backend Spring Boot + Angular admin + Flyway + documentacion QA.
- Alcance real implementado:
  - Upload manual de imagen principal ecommerce via backend.
  - `ProductAsset` sigue siendo la entidad de imagen publica del Perfil online.
  - Endpoint nuevo `POST /api/v1/ecommerce-admin/products/{productId}/primary-asset/upload` con `multipart/form-data`.
  - Endpoint URL manual existente `PUT /api/v1/ecommerce-admin/products/{productId}/primary-asset` se mantiene compatible.
- Backend:
  - Nuevo comando `UploadPrimaryProductAssetCommand`.
  - Nuevo port `EcommerceImageStoragePort`.
  - Adapter S3 con AWS SDK v2 y `cache-control` configurable.
  - Adapter deshabilitado por defecto con `ECOMMERCE_IMAGE_STORAGE_PROVIDER=none`.
  - Validacion binaria JPEG/PNG, firma, MIME declarado, peso, dimensiones, checksum SHA-256 y URL publica allowlisted.
  - Naming de storage key por producto/perfil/checksum.
- Flyway/DB:
  - `V18__ecommerce_product_asset_storage_metadata.sql` agrega metadata nullable a `ecommerce_product_assets`.
  - Assets historicos URL-only siguen soportados.
- Angular:
  - Perfil online detalle agrega selector de archivo JPEG/PNG.
  - Upload usa alt text, fuente, derechos y orden existentes.
  - Se muestra metadata tecnica devuelta cuando existe.
  - Guardado por URL manual se mantiene intacto.
- Configuracion/env:
  - `.env.example` documenta `ECOMMERCE_IMAGE_STORAGE_PROVIDER`, `AWS_REGION`, `ECOMMERCE_IMAGE_S3_BUCKET`, `ECOMMERCE_IMAGE_S3_PREFIX`, `ECOMMERCE_IMAGE_PUBLIC_BASE_URL`, cache-control y limites.
  - `storefront/.env.local.example` recuerda alinear `STOREFRONT_IMAGE_ALLOWED_DOMAINS` con el host CDN publico.
  - No se agregaron secretos ni access keys.
- Validaciones:
  - `mvn -DskipTests compile`: OK.
  - `mvn -Dtest=EcommerceCatalogApplicationServiceTest test`: 29 tests, 0 failures, BUILD SUCCESS.
  - `mvn "-Dtest=EcommerceCatalogPersistenceIntegrationTest,EcommerceAdminProfilesIntegrationTest" test`: 29 tests, 0 failures, BUILD SUCCESS.
  - `npm run build` en frontend: OK.
  - `git diff --check`: OK con warnings CRLF normales en Windows.
- Exclusiones confirmadas:
  - Sin recursos AWS reales.
  - Sin credenciales/access keys.
  - Sin presigned URL.
  - Sin ZIP ni importacion masiva de imagenes.
  - Sin columna imagen Excel 2S.7A.
  - Sin galeria, WebP obligatorio, AVIF ni antivirus avanzado.
  - Sin cambios en Producto ERP, POS, stock, inventario, unidad, costo, precio ERP, Storefront funcional, `next.config.ts`, Docker, auth/security ni indexacion.
  - Sin structured data, Merchant Center, buscador, filtros, carrito, checkout ni pagos.
- Riesgos pendientes:
  - No se hizo smoke manual porque no hay servidores locales activos.
  - Adapter S3 no probado contra AWS real por restriccion de no tocar/crear recursos AWS.
  - No hay cleanup automatico del objeto S3 si S3 sube correctamente pero DB falla despues.
- Documentacion creada: `docs/qa/PHASE2S8D_AWS_S3_CLOUDFRONT_IMAGE_UPLOAD_QA.md`.

### Cierre Fase 2S.8E AWS staging smoke validation

- Tipo: cierre documental con validacion manual reportada por el operador.
- Opencode NO ejecuto el smoke real ni verifico directamente AWS/Lightsail/S3/CloudFront/IAM.
- Alcance validado manualmente por el operador:
  - Lightsail staging actualizado desde `origin/master`.
  - Docker Compose con backend, Angular y PostgreSQL operativo.
  - Flyway aplicado hasta V18.
  - Login 200, health 200, puertos seguros.
  - Upload manual de imagen principal funciona end-to-end.
  - Imagen servida desde CloudFront `cdn-staging.inktoy.pe`.
- Infraestructura:
  - Lightsail staging, Docker Compose, Caddy.
  - S3 privado `inktoy-ecommerce-images-staging`, region `us-east-1`, prefix `staging/ecommerce`.
  - CloudFront con CNAME `cdn-staging.inktoy.pe`.
  - Swap 2 GB para builds Docker.
- Exclusiones confirmadas:
  - Sin cambios en codigo backend/frontend/Storefront.
  - Sin cambios en Flyway ni docker-compose.
  - Sin creacion de recursos AWS.
  - Sin credenciales en repo.
  - Sin commit ni push.
  - Sin activacion de indexacion.
- No validado en esta fase:
  - Storefront Next.js desplegado en Lightsail.
  - Render end-to-end Storefront -> CloudFront.
  - Acceso S3 directo anonimo 403.
  - Importacion masiva por URL publica.
  - Excel + ZIP de imagenes.
- Riesgos pendientes:
  - Confirmar evidencia de S3 directo 403.
  - Ruta duplicada `/staging/ecommerce/ecommerce/...` a revisar antes de produccion.
  - Mantener secretos solo en `.env` del servidor.
  - Formalizar overrides de staging para docker-compose/puertos/env_file.
  - Disenar consistencia DB/S3 para cargas masivas.
- Documentacion creada: `docs/qa/PHASE2S8E_AWS_STAGING_SMOKE_QA.md`.
- Pendiente recomendado: 2S.8F -- Importacion masiva de imagen principal por URL publica.

### Implementacion Fase 2S.8F primary image URL import

- Tipo: feature backend/frontend + QA documental.
- Objetivo: importacion masiva separada de imagen principal URL-only para perfiles online ecommerce existentes, usando SKU como clave humana principal.
- Backend:
  - Nuevo use case `EcommercePrimaryImageUrlImportUseCase`.
  - Nuevo enum `EcommercePrimaryImageUrlImportAction`.
  - Nuevo port `EcommercePrimaryImageUrlImportWorkbookPort`.
  - Nuevo service `EcommercePrimaryImageUrlImportApplicationService`.
  - Nuevo adapter POI `PoiEcommercePrimaryImageUrlImportWorkbookAdapter`.
  - Nuevo controller `EcommercePrimaryImageUrlImportController`.
  - Nuevos DTOs de preview/confirm.
- Endpoints nuevos:
  - `GET /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/template`.
  - `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview`.
  - `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file`.
- Contrato XLSX:
  - Requeridas: `sku`, `imageUrl`, `altText`, `source`, `rightsConfirmed`.
  - Opcionales: `assetType`, `displayOrder`, `publishedUpdateConfirmed`, `productName`, `publicationStatus`, `currentImageUrl`.
  - `productName`, `publicationStatus` y `currentImageUrl` son informativas.
- Reglas:
  - Preview sin persistencia.
  - Confirm-file revalida todo antes de aplicar.
  - Aplica solo filas validas `CREATE`/`UPDATE`.
  - `NO_CHANGE` no modifica DB.
  - `REJECT` se reporta y permite importacion parcial.
  - `PublicImageUrlPolicy` valida `imageUrl` sin duplicar reglas.
  - No hay HEAD/GET ni descarga remota de imagenes.
  - `ProductAsset` queda URL-only con metadata storage nula.
  - Perfil `PUBLISHED` con cambio requiere `publishedUpdateConfirmed=true`.
- Angular:
  - Nueva pantalla standalone `primary-image-url-import-page.component.ts`.

### Cierre Fase 2S.8G staging smoke primary image URL import

- Tipo: cierre documental de smoke staging reportado por operador.
- Commit validado en staging: `ebb1726 feat(ecommerce-admin): add primary image URL import`.
- Evidencia manual reportada por el operador:
  - Lightsail actualizado desde `origin/master` hasta `ebb1726`.
  - `docker compose config`, `docker compose build backend`, `docker compose build frontend`, `docker compose up -d` y `docker compose ps` OK.
  - postgres healthy, backend up y frontend up en `127.0.0.1:4200`.
  - Backend inicio correctamente.
  - Flyway valido 18 migraciones y no hubo migraciones pendientes.
  - `https://staging.inktoy.pe/login` 200.
  - `https://staging.inktoy.pe/api/v1/health` 200.
  - Catalogo online -> Importar imagenes funciono en staging.
  - Plantilla `.xlsx` descargada correctamente.
  - Importacion con Excel correcta.
  - Preview contra `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview`.
  - Imagen importada correctamente.
  - Producto colocado en linea dentro del ERP.
  - Pantalla post-confirmacion correcta.
  - No quedo activo el boton para reimportar el mismo archivo.
  - `Nueva importacion` limpio correctamente el flujo.
  - Sin errores visuales o funcionales relevantes en el smoke staging.
- No validado en esta fase:
  - Storefront desplegado en Lightsail.
  - Storefront Docker.
  - Excel + ZIP.
  - Carga binaria masiva.
  - Presigned URLs.
  - Galeria.
  - Merchant Center.
  - Structured data.
  - Indexacion.
  - Carrito/checkout/pagos.
- Riesgo pendiente documentado: Storefront local muestra el producto, pero no la imagen; se tratara como fase posterior corta fuera de 2S.8G.
- Proximo paso recomendado: `2S.8H -- Storefront local image render smoke/diagnostic`.

### Cierre Fase 2S.8H Storefront local image render smoke/diagnostic

- Tipo: cierre documental de diagnostico/ajuste minimo de configuracion local.
- Causa confirmada: backend publico y Storefront usan el contrato `primaryImage.url`; la causa era configuracion local de Storefront.
- Validacion manual reportada por el operador:
  - Se agrego `STOREFRONT_IMAGE_ALLOWED_DOMAINS=cdn-staging.inktoy.pe` en `storefront/.env.local`.
  - Se reinicio `npm run dev`.
  - Se valido `http://localhost:3000/`.
  - El producto publicado ya muestra correctamente la imagen importada desde `cdn-staging.inktoy.pe`.
- No se requirio cambiar backend, contratos API ni logica del Storefront.
- Storefront sigue sin estar desplegado en Docker ni en Lightsail.
- `storefront/.env.local.example` documenta un ejemplo no sensible y la necesidad de reiniciar Next.js tras cambiar `STOREFRONT_IMAGE_ALLOWED_DOMAINS`.
- Recomendacion operativa: no iniciar 2S.9 sin validar el render basico de imagen en Storefront local.
- Proximo paso recomendado: revisar si hace falta un smoke documental corto para Storefront local antes de avanzar a 2S.9.

### Implementacion Fase 2S.8J Storefront Docker local support

- Tipo: soporte Docker local para Storefront Next.js, sin despliegue Lightsail.
- Archivos creados:
  - `storefront/Dockerfile`.
  - `storefront/.dockerignore`.
  - `docs/qa/PHASE2S8J_STOREFRONT_DOCKER_LOCAL_QA.md`.
- Archivo actualizado:
  - `docker-compose.yml`.
- Arquitectura:
  - Servicio Docker `storefront` separado de Angular Admin.
  - Profile `storefront` para levantarlo solo con `docker compose --profile storefront up -d storefront`.
  - Puerto interno Storefront 3000, publicado en `127.0.0.1:3000:3000`.
  - Angular Admin mantiene `127.0.0.1:4200:80`.
  - Backend queda ligado a loopback y PostgreSQL queda solo en la red interna Docker.
- Variables Storefront Docker:
  - `STOREFRONT_API_BASE_URL=http://backend:8080`.
  - `STOREFRONT_PUBLIC_BASE_URL=http://localhost:3000`.
  - `STOREFRONT_INDEXING_ENABLED=false`.
  - `STOREFRONT_IMAGE_ALLOWED_DOMAINS=cdn-staging.inktoy.pe`.
- Decision tecnica: variables pasadas como build args y runtime env para cubrir `next.config.ts`/`remotePatterns` en build y helper seguro en runtime.
- Validaciones CLI Docker locales OK: Compose config/build/up/ps/logs, Storefront HTTP 200 en `http://localhost:3000/` y Angular Admin HTTP 200 en `http://localhost:4200/`.
- Pendiente: validacion manual en navegador para producto e imagen renderizada antes de 2S.9.
- Sin cambios backend, contratos API, logica Storefront, `next.config.ts`, Caddy, Lightsail, AWS, S3, CloudFront, IAM ni `.env` reales.
- 2S.9 sigue bloqueado hasta validar smoke Docker local basico de Storefront con imagen renderizada.
  - Nueva ruta `/ecommerce-admin/perfiles/imagenes/importar`.
  - Nuevos modelos y metodos en `EcommerceAdminService`.
  - Navegacion agregada en Catalogo online y acceso desde Perfiles online.
  - Preview con filtros todas/validas/errores/warnings y confirm dialog.
- Tests:
  - Nuevo `EcommercePrimaryImageUrlImportIntegrationTest` con template, preview no persistente, confirm parcial, validaciones, perfiles publicados, `PUBLISHED + NO_CHANGE` y reemplazo URL-only de asset con metadata S3.
- Validaciones:
  - `./mvnw -DskipTests compile`: OK.
  - `./mvnw -Dtest=EcommercePrimaryImageUrlImportIntegrationTest test`: 8 tests, 0 failures, BUILD SUCCESS.
  - `./mvnw -Dtest=EcommerceCatalogApplicationServiceTest test`: 29 tests, 0 failures, BUILD SUCCESS.
  - `npm run build` en frontend: OK.
- Exclusiones confirmadas:
  - Sin CSV.
  - Sin ZIP ni carga binaria masiva.
  - Sin presigned URL.

### Cierre Fase 2S.8K Storefront Lightsail Docker tunnel smoke

- Tipo: cierre documental de smoke visual en Lightsail staging mediante tunel SSH, sin configuracion de host publico.
- Archivo creado:
  - `docs/qa/PHASE2S8K_STOREFRONT_LIGHTSAIL_DOCKER_TUNNEL_SMOKE_QA.md`.
- Evidencia resumida:
  - Docker Compose con backend, frontend, postgres y storefront en estado esperado.
  - HTTP 200 en `/`, `/productos` y `/productos/cuaderno-a4`.
  - Validacion visual en navegador via `http://localhost:3001/` con tunel SSH.
  - Producto `Cuaderno A4` e imagen principal importada visibles.
- Limitacion explicita:
  - No se configuro host publico ni Caddy para Storefront en esta fase.
- Recomendacion:
  - Tratar Caddy/host publico como fase separada si se decide exponer Storefront staging publicamente.
- Sin cambios funcionales en backend, frontend, Storefront, Docker, Caddy, AWS, Lightsail, S3, CloudFront, IAM ni `.env` reales.
- Restricciones confirmadas:
  - Sin secretos/access keys/tokens/passwords.
  - Sin Merchant Center, structured data, indexacion, carrito, checkout ni pagos.
  - Sin cambios en Producto ERP, POS, stock, inventario, unidades, costos ni precios ERP.
  - Sin cambios en Caddy, DNS ni exposicion publica del Storefront.

### Cierre Fase 2S.8L Storefront public Caddy staging

- Tipo: cierre documental de Storefront staging publico por HTTPS en host separado, sin tocar codigo funcional.
- Archivo creado:
  - `docs/qa/PHASE2S8L_STOREFRONT_PUBLIC_CADDY_STAGING_QA.md`.
- Evidencia resumida:
  - DNS resuelve correctamente a `52.205.169.234`.
  - Caddy validate/reload OK y servicio activo.
  - Storefront responde `200` en `/`, `/productos` y `/productos/cuaderno-a4` sobre HTTPS publico.
  - Admin Angular sigue respondiendo `200` en `https://staging.inktoy.pe/`.
  - `robots.txt` mantiene `Disallow: /`.
  - Smoke visual publico PASS con producto e imagen importada visibles.
- Confirmaciones:
  - Admin no fue afectado.
  - Indexacion desactivada.
- Limitaciones:
  - No es produccion.
  - No hay indexacion activa.
  - No se implemento checkout ni pagos.
- Sin cambios funcionales en backend, frontend, Storefront, Docker, Caddy, AWS, Lightsail, S3, CloudFront, IAM ni `.env` reales.

### Cierre Fase 2S.9C Binary Image Import Local QA

- Tipo: cierre documental de QA local para importacion masiva de imagen principal ecommerce mediante Excel + ZIP.
- Fases previas:
  - `e6edb50 feat(ecommerce): add binary primary image import backend` — 2S.9A backend/contracts.
  - `36156a2 feat(ecommerce-admin): add binary image import UI` — 2S.9B frontend Admin UX.
- Archivo creado:
  - `docs/qa/PHASE2S9C_BINARY_IMAGE_IMPORT_LOCAL_QA.md`.
- Validaciones automaticas:
  - Backend compile: OK.
  - Backend tests focalizados: 43/43 OK.
  - Frontend build: OK.
  - Navegacion y rutas: OK.
- Evidencia manual reportada por operador:
  - La pantalla Importar Excel + ZIP carga correctamente.
  - El Excel y el ZIP fueron leidos correctamente.
  - El preview mostro 3 filas validas con advertencias y 0 rechazadas.
  - Los filtros, detalle de fila, advertencias y resumen funcionan.
  - Al confirmar en local, las filas no se aplicaron porque el storage ecommerce no esta configurado.
  - Mensaje observado: `Ecommerce image storage is not configured.`
  - Resultado seguro: no se subieron imagenes ni se modificaron datos.
  - La pantalla Importar imagenes por URL sigue disponible.
  - La pantalla Importar perfiles sigue disponible.
- Resultado: PASS local con limitacion.
- Limitacion aceptada: la confirmacion real con subida a storage queda pendiente para 2S.9D staging smoke.
- Sin cambios funcionales en backend, frontend, Storefront, Docker, Caddy, AWS, Lightsail, S3, CloudFront, IAM ni `.env` reales.

### Cierre Fase 2S.9D Binary Image Import Staging Smoke

- Tipo: cierre documental de staging smoke para importacion masiva de imagen principal ecommerce mediante Excel + ZIP.
- Fases previas:
  - `e6edb50 feat(ecommerce): add binary primary image import backend` — 2S.9A backend/contracts.
  - `36156a2 feat(ecommerce-admin): add binary image import UI` — 2S.9B frontend Admin UX.
  - `8ebaa9f docs(ecommerce): close binary image import local QA` — 2S.9C QA local.
- Archivo creado:
  - `docs/qa/PHASE2S9D_BINARY_IMAGE_IMPORT_STAGING_SMOKE_QA.md`.
- Evidencia resumida:
  - HEAD staging: `8ebaa9f docs(ecommerce): close binary image import local QA`.
  - Admin staging responde 200.
  - Storefront staging responde 200.
  - `robots.txt` mantiene `Disallow: /`.
  - docker compose ps muestra backend, frontend, postgres y storefront arriba.
  - git status final limpio: `## master...origin/master`.
  - SKU controlado usado: `CUAD`.
  - Slug validado: `cuaderno-a4`.
  - URL validada: `https://storefront-staging.inktoy.pe/productos/cuaderno-a4`.
  - Excel + ZIP con una sola fila y una imagen PNG valida.
  - Preview valido 1 fila aplicable y 0 rechazadas.
  - Confirmacion real funciono en staging.
  - Se genero `assetUrl`/`storageKey`.
  - La imagen se actualizo correctamente.
  - La nueva imagen ya se visualiza en Storefront staging publico.
  - Logs recientes sin errores criticos.
- Observacion: se valido previamente que un archivo con formato real incorrecto fue rechazado con el mensaje "Solo se aceptan imagenes JPEG o PNG", validando control por formato real.
- Resultado: PASS.
- Riesgos pendientes: objeto S3 anterior puede quedar como orphan, cache CDN/Next/Image puede retrasar visibilidad, no se probo con multiples filas, no se valido WebP.
- Recomendacion: considerar fase futura para politica unificada de formatos de imagen y limpieza automatica de objetos orphan.
- Sin cambios funcionales en backend, frontend, Storefront, Docker, Caddy, AWS, Lightsail, S3, CloudFront, IAM ni `.env` reales.

### Cierre Fase 2S.10A Image Policy Plan

- Tipo: plan documental de politica unificada de imagenes ecommerce.
- Fase ejecutada en Plan Mode (solo lectura).
- Fases previas:
  - `e6edb50 feat(ecommerce): add binary primary image import backend` — 2S.9A backend/contracts.
  - `36156a2 feat(ecommerce-admin): add binary image import UI` — 2S.9B frontend Admin UX.
  - `8ebaa9f docs(ecommerce): close binary image import local QA` — 2S.9C QA local.
  - `153adda docs(ecommerce): close binary image import staging smoke` — 2S.9D staging smoke.
- Archivos creados:
  - `docs/ecommerce/ECOMMERCE_IMAGE_POLICY.md`
  - `docs/qa/PHASE2S10A_IMAGE_POLICY_PLAN_QA.md`
- Diagnostico actual:
  - Formatos soportados: JPEG, PNG.
  - WebP no soportado todavia.
  - URL import solo valida politica de URL, no descarga imagen remota.
  - Excel + ZIP valida binario completo antes de preview/confirm.
  - Storage S3 con metadata completa (mimeType, width, height, sizeBytes, checksumSha256).
  - Storefront renderiza con next/image y validacion de dominio.
- Decisiones aprobadas:
  - 2S.10B: aceptar WebP con validacion real, sin conversion.
  - 2S.10C: conservar original y generar derivados WebP.
  - 2S.10D: responsive images, AVIF y estrategia avanzada de cache.
  - No descargar imagenes remotas en URL import.
  - No convertir imagenes en 2S.10B.
- Riesgos identificados:
  - WebP requiere parser minimo o dependencia explicita (ImageIO estandar no confiable).
  - Objetos S3 anteriores pueden quedar orphan al reemplazar imagen.
  - Atomicidad S3/DB: si upload S3 exitoso pero guardado DB falla, cleanup best-effort.
- Orden de ejecucion recomendado:
  1. 2S.10B: WebP passthrough con validacion real y smoke staging.
  2. 2S.10C: derivados WebP conservando original, con decision DB previa.
  3. 2S.10D: responsive images, AVIF y cache avanzada.
  4. Fase posterior: limpieza segura de objetos orphan S3.
- Siguiente fase recomendada: 2S.10B Plan Mode antes de Build.
- Sin cambios funcionales en backend, frontend, Storefront, Docker, Caddy, AWS, Lightsail, S3, CloudFront, IAM ni `.env` reales.

### Cierre Fase 2S.10B WebP Support Build

- Tipo: implementación de soporte WebP en flujos ecommerce de imagen principal.
- Fase ejecutada en Build Mode tras auditoría APTO PARA COMMIT/PUSH.
- Fases previas:
  - `e6edb50 feat(ecommerce): add binary primary image import backend` — 2S.9A backend/contracts.
  - `36156a2 feat(ecommerce-admin): add binary image import UI` — 2S.9B frontend Admin UX.
  - `8ebaa9f docs(ecommerce): close binary image import local QA` — 2S.9C QA local.
  - `153adda docs(ecommerce): close binary image import staging smoke` — 2S.9D staging smoke.
  - `04a23fa docs(ecommerce): define unified image policy` — 2S.10A Plan Mode.
- Archivos funcionales modificados:
  - `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommerceProductImageBinaryService.java`
  - `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommercePrimaryImageBinaryImportApplicationService.java`
  - `backend/src/test/java/com/erppos/backend/erp/ecommerce/EcommerceCatalogApplicationServiceTest.java`
  - `backend/src/test/java/com/erppos/backend/integration/EcommercePrimaryImageBinaryImportIntegrationTest.java`
  - `frontend/src/app/features/ecommerce-admin/online-profile-detail-page.component.ts`
  - `frontend/src/app/features/ecommerce-admin/primary-image-binary-import-page.component.ts`
- Archivos de documentación creados/actualizados:
  - `docs/qa/PHASE2S10B_WEBP_LOCAL_QA.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
  - `docs/ecommerce/ECOMMERCE_IMAGE_POLICY.md`
- Implementación:
  - Backend acepta `image/webp` junto con `image/jpeg` y `image/png`.
  - Parser WebP propio para leer dimensiones reales de VP8, VP8L y VP8X.
  - `ImageIO` se mantiene solo para JPEG/PNG.
  - WebP genera `storageKey` con extensión `.webp`.
  - WebP pasa `Content-Type: image/webp` al storage S3.
  - Admin Angular acepta `image/webp` y actualiza textos.
- Validaciones de seguridad:
  - Firma RIFF/WEBP validada.
  - Chunks leídos con bounds checks y `long` para offsets/tamaños.
  - Padding par RIFF respetado.
  - WebP truncado rechazado.
  - VP8X mal ubicado rechazado.
  - Dimensiones `<= 0` rechazadas.
  - Dimensiones máximas respetadas.
- Correcciones durante auditoría:
  - Rechazo de cola RIFF truncada.
  - Rechazo de VP8X mal ubicado.
- Pruebas ejecutadas:
  - Backend focalizado: 40 tests PASS.
  - Backend completo: 407 tests PASS.
  - Frontend build: PASS.
  - `git diff --check`: sin errores, solo warnings CRLF.
- Restricciones cumplidas:
  - No se tocó Storefront.
  - No se cambió contrato público Storefront.
  - No se tocó `docker-compose.yml`, Dockerfile, `.env`.
  - No se crearon migraciones.
  - No se tocó Caddy, DNS, AWS, S3, CloudFront, IAM ni secretos.
  - No hubo deploy.
  - No se implementaron derivados WebP, conversión, AVIF ni responsive images.
- Riesgos residuales:
  - Parser valida contenedor, chunks y dimensiones, pero no decodifica pixeles completos WebP.
  - Falta staging smoke con WebP real servido por CDN/Storefront.
- Sin cambios funcionales en Storefront, Docker, Caddy, AWS, Lightsail, S3, CloudFront, IAM ni `.env` reales.

### Cierre Fase 2S.10B-S WebP Staging Smoke

- Tipo: validación staging de soporte WebP en flujos ecommerce de imagen principal.
- Fase ejecutada en Build Mode con deploy mínimo y smoke manual.
- Fases previas:
  - `e6edb50 feat(ecommerce): add binary primary image import backend` — 2S.9A backend/contracts.
  - `36156a2 feat(ecommerce-admin): add binary image import UI` — 2S.9B frontend Admin UX.
  - `8ebaa9f docs(ecommerce): close binary image import local QA` — 2S.9C QA local.
  - `153adda docs(ecommerce): close binary image import staging smoke` — 2S.9D staging smoke PNG.
  - `04a23fa docs(ecommerce): define unified image policy` — 2S.10A Plan Mode.
  - `ef81154 feat(ecommerce): support WebP primary image uploads` — 2S.10B Build.
- Commit desplegado:
  - `ef81154 feat(ecommerce): support WebP primary image uploads`
- Deploy mínimo ejecutado:
  - `git pull --ff-only origin master`
  - `docker compose up -d --build backend frontend`
  - Storefront no reconstruido (allowlist ya configurada).
- SKU controlado usado: `CUAD` (Cuaderno A4).
- Slug validado: `cuaderno-a4`.
- URL validada: `https://storefront-staging.inktoy.pe/productos/cuaderno-a4`.
- Artefactos QA:
  - Excel `.xlsx` con 1 sola fila.
  - ZIP `.zip` con 1 sola imagen WebP real.
  - imageFile: `images/cuad.webp`.
  - Dimensiones: 1200 x 1200 px.
  - Peso: 48.1 KB (49,212 bytes).
- Resultado preview/confirmación:
  - Total filas: 1.
  - Válidas: 1.
  - Rechazadas: 0.
  - Actualizadas: 1.
  - mimeType detectado: `image/webp`.
  - Dimensiones: 1200 x 1200 px.
  - Peso: 48.1 KB.
  - checksumSha256: presente.
  - assetUrl generado.
  - storageKey termina en `.webp`.
- Validación CDN:
  - HTTP/2 200.
  - Content-Type: image/webp.
  - Content-Length: 49212.
  - Cache-Control: public, max-age=31536000, immutable.
  - x-amz-meta-checksum-sha256 presente.
  - x-cache: Miss from cloudfront.
- Validación Storefront:
  - Imagen WebP visible.
  - Sin fallback.
  - Sin error Next/Image.
  - Sin error API.
  - robots.txt mantiene Disallow: /.
- Post-checks:
  - Backend health HTTP 200.
  - Admin staging HTTP 200.
  - Storefront home HTTP 200.
  - Storefront product HTTP 200.
  - docker compose ps: postgres healthy, backend up, frontend up, storefront up.
  - Logs recientes sin errores críticos.
- Warnings no bloqueantes observados:
  - Warning PageImpl serialization (deuda técnica preexistente).
  - Nginx multipart body buffered to temporary file (warning operativo esperado).
- git status final limpio: `## master...origin/master`.
- Documento QA creado:
  - `docs/qa/PHASE2S10B_WEBP_STAGING_SMOKE_QA.md`
- Restricciones cumplidas:
  - No se tocó código funcional.
  - No se tocó Storefront.
  - No se tocó Caddy, DNS, AWS, S3, CloudFront, IAM ni secretos.
  - No se tocó docker-compose.yml, Dockerfile, .env.
  - No se crearon migraciones.
  - No se hicieron nuevas importaciones.
  - No se borraron objetos S3.
  - No se inició 2S.10C.
  - No se creó tag.
- Resultado: PASS.
- Riesgos residuales:
  - Cache CDN/Next puede retrasar visibilidad en algunos casos.
  - Objetos S3 anteriores pueden quedar orphan al reemplazar imagen.
  - Parser WebP valida contenedor/chunks/dimensiones, pero no decodifica pixeles completos.
- Siguiente fase sugerida: 2S.10C Derivados WebP conservando original (fase posterior).
- Sin cambios funcionales en backend, frontend, Storefront, Docker, Caddy, AWS, Lightsail, S3, CloudFront, IAM ni `.env` reales.

### Cierre Fase 2S.10C-B/B2 WebP Conversion Spike

- Tipo: spike local y Docker de conversión WebP.
- Fase ejecutada en Build Mode con validación local y Docker.
- Fases previas:
  - `e6edb50 feat(ecommerce): add binary primary image import backend` — 2S.9A backend/contracts.
  - `36156a2 feat(ecommerce-admin): add binary image import UI` — 2S.9B frontend Admin UX.
  - `8ebaa9f docs(ecommerce): close binary image import local QA` — 2S.9C QA local.
  - `153adda docs(ecommerce): close binary image import staging smoke` — 2S.9D staging smoke PNG.
  - `04a23fa docs(ecommerce): define unified image policy` — 2S.10A Plan Mode.
  - `ef81154 feat(ecommerce): support WebP primary image uploads` — 2S.10B Build.
  - `0afb46e docs(ecommerce): close WebP staging smoke` — 2S.10B-S staging smoke.
- Objetivo: validar viabilidad técnica de conversión WebP antes de implementar derivados.
- Dependencia evaluada:
  - `org.sejda.imageio:webp-imageio:0.1.6`
  - Scope: `test` (NO runtime/productivo)
  - Plugin ImageIO para WebP con binarios nativos embebidos
  - Licencia Apache 2.0
- Archivos creados:
  - `backend/src/test/java/com/erppos/backend/erp/ecommerce/WebpConversionSpikeService.java`
  - `backend/src/test/java/com/erppos/backend/erp/ecommerce/WebpConversionSpikeServiceTest.java`
- Archivos modificados:
  - `backend/pom.xml` (agregada dependencia webp-imageio scope test)
- Validación local (Windows):
  - Conversión JPEG → WebP: PASS (reducción 49.2%, 1501 → 762 bytes)
  - Conversión PNG transparente → WebP: PASS (alpha preservado, aumento 13.9% en PNG pequeño)
  - Parser WebP existente (2S.10B) lee WebP generado: PASS
  - Tests: 43 tests PASS, 0 failures
- Validación Docker/Linux Java 17:
  - Imagen: `eclipse-temurin:17-jdk-jammy`
  - Conversión JPEG → WebP: PASS
  - Conversión PNG transparente → WebP: PASS
  - Alpha preservado: PASS
  - Tests: 3 tests PASS, 0 failures
- Restricciones cumplidas:
  - No se tocó DB, migraciones, ProductAsset, ProductAssetEntity.
  - No se tocó Storefront, Dockerfile, docker-compose.yml, .env.
  - No se tocó S3, staging, infraestructura.
  - Dependencia webp-imageio en scope test (NO runtime).
  - No se implementó AVIF, responsive images, srcset.
  - No se integró al flujo ecommerce real.
- Riesgos residuales:
  - webp-imageio 0.1.6 no mantenida activamente (última versión 2020).
  - Binarios nativos embebidos requieren validación adicional antes de producción.
  - PNG pequeño puede crecer en WebP.
  - No se evaluó calidad visual (PSNR/SSIM).
  - No se probó con imágenes grandes reales.
- Conclusión: APTO para pasar a 2S.10C-C.
- Advertencia: Dependencia webp-imageio NO aprobada todavía como dependencia runtime/productiva.
- Documento QA creado:
  - `docs/qa/PHASE2S10C_WEBP_CONVERSION_SPIKE_QA.md`
- Siguiente fase: 2S.10C-C (migración + modelo variants + repositorio + tests).
- Sin cambios funcionales en backend, frontend, Storefront, Docker, Caddy, AWS, Lightsail, S3, CloudFront, IAM ni `.env` reales.

### Cierre Fase 2S.10C-C Asset Variants Model

- Tipo: implementacion backend persistente aditiva + tests + documentacion QA.
- Base: 2S.10C-B/B2 cerrado en commit `fd8428b test(ecommerce): validate WebP conversion spike`.
- Objetivo: crear modelo persistente para registrar variantes/derivados de imagen ecommerce, preservando `ProductAsset` como original.
- Migracion creada:
  - `backend/src/main/resources/db/migration/V19__ecommerce_product_asset_variants.sql`
- Modelo persistente creado:
  - Tabla `ecommerce_product_asset_variants`.
  - Enum `ProductAssetVariantKind.PRIMARY_OPTIMIZED_WEBP`.
  - Entidad `ProductAssetVariantEntity`.
  - Repositorio `ProductAssetVariantJpaRepository`.
- Constraints relevantes:
  - FK a `ecommerce_product_assets(id)` con `ON DELETE CASCADE`.
  - `variant_kind IN ('PRIMARY_OPTIMIZED_WEBP')`.
  - `mime_type = 'image/webp'`.
  - dimensiones y `size_bytes` positivos.
  - checks de checksum SHA-256 de 64 caracteres.
  - `preferred=true` solo si `active=true`.
- Indices relevantes:
  - Por `product_asset_id`.
  - Por `storage_key`.
  - Unico parcial para variante activa por asset y tipo.
  - Unico parcial para variante preferred activa por asset.
- Tests nuevos:
  - `ProductAssetVariantPersistenceIntegrationTest`.
- Validaciones:
  - Test focalizado variantes: 10 tests PASS.
  - Regresion ecommerce requerida: 53 tests PASS.
  - Backend completo: 420 tests PASS.
- Restricciones cumplidas:
  - No se integro conversion WebP real.
  - No se generaron derivados.
  - No se modificaron flujos Excel + ZIP ni upload manual.
  - No se modifico Storefront, contrato publico ni `primaryImage.url`.
  - No se toco S3, staging, Caddy, DNS, AWS, CloudFront, IAM ni secretos.
  - No se modifico Dockerfile, `docker-compose.yml` ni `.env` reales.
  - `webp-imageio` permanece en `scope test`.
  - No se implemento AVIF, responsive images, `srcset` ni cleanup masivo de objetos orphan.
- Documento QA creado:
  - `docs/qa/PHASE2S10C_ASSET_VARIANTS_MODEL_QA.md`
- Resultado: PASS.
- Riesgos residuales:
  - La tabla existe pero no hay generacion productiva de variantes todavia.
  - La seleccion de derivado preferido queda pendiente de fase posterior.
  - `webp-imageio` no esta aprobado como dependencia runtime/productiva.

### Cierre Fase 2S.10C-D1 Manual Upload WebP Derivative

- Tipo: implementacion backend runtime + tests + documentacion QA.
- Base: 2S.10C-C cerrado en commit `78736ff feat(ecommerce): add product asset variants model`.
- Objetivo: generar derivado WebP real solo para upload manual ecommerce, conservando `ProductAsset` como original.
- Dependencia runtime:
  - `org.sejda.imageio:webp-imageio:0.1.6` cambia de `scope test` a `scope runtime`.
  - El codigo de aplicacion usa `ImageIO` estandar y registra plugins con `ImageIO.scanForPlugins()`.
- Modelo/servicios agregados:
  - `EcommerceWebpDerivativeGenerationService`.
  - `ProductAssetVariant` dominio.
  - `ProductAssetVariantRepositoryPort`.
  - `ProductAssetVariantMapper`.
  - `ProductAssetVariantPersistenceAdapter`.
- Flujo implementado:
  - Validar original manual.
  - Generar candidato WebP solo para JPEG/PNG.
  - Validar WebP generado con politica binaria existente.
  - Subir original preservado.
  - Subir derivado solo si `webp.sizeBytes < original.sizeBytes`.
  - Guardar `ProductAsset` original.
  - Desactivar variante WebP activa previa.
  - Guardar nueva variante `PRIMARY_OPTIMIZED_WEBP` active/preferred si aplica.
- Validaciones:
  - Unitarios focalizados WebP/upload manual: PASS.
  - Integracion HTTP/PostgreSQL upload manual: PASS.
  - Regresion ecommerce requerida: 65 tests PASS.
  - Backend completo: 432 tests PASS.
- Restricciones cumplidas:
  - No se modifico Storefront, contrato publico ni `primaryImage.url`.
  - No se modifico Excel + ZIP ni `confirm-file`.
  - No se integro generacion de derivados en importacion masiva.
  - No se toco Admin UI.
  - No se toco staging, produccion, Caddy, DNS, AWS, S3 real, CloudFront, IAM ni secretos.
  - No se modificaron `.env` reales, Dockerfile ni `docker-compose.yml`.
  - No se implemento AVIF, responsive images, `srcset`, cleanup masivo de objetos orphan ni deploy.
- Documento QA creado:
  - `docs/qa/PHASE2S10C_D1_MANUAL_UPLOAD_WEBP_DERIVATIVE_QA.md`
- Resultado: PASS.
- Riesgos residuales:
  - `webp-imageio` 0.1.6 no mantenida activamente y con binarios nativos embebidos.
  - Storefront todavia no consume variantes.
  - Imagenes grandes reales requieren medicion posterior de CPU/memoria/calidad.

### Cierre Fase 2S.10C-D2 Binary Import WebP Derivative

- Tipo: implementacion backend runtime + tests + documentacion QA.
- Base: D1 cerrado en commit `836fd78 feat(ecommerce): generate WebP derivative for manual upload`.
- Objetivo: extender generacion real de derivado WebP a Excel + ZIP `confirm-file`, conservando `ProductAsset` como original.
- Flujo implementado en `EcommercePrimaryImageBinaryImportApplicationService.confirmFile(...)`:
  - Validar original por fila.
  - Generar candidato WebP solo para JPEG/PNG.
  - No generar derivado para WebP original.
  - Descartar derivado si `webp.sizeBytes >= original.sizeBytes`.
  - Subir original preservado.
  - Subir derivado solo si fue aceptado.
  - Guardar `ProductAsset` original.
  - Desactivar variante WebP activa previa.
  - Guardar nueva `ProductAssetVariant.PRIMARY_OPTIMIZED_WEBP` active/preferred si aplica.
- Preview preservado sin efectos secundarios:
  - No sube storage.
  - No genera derivados.
  - No persiste `ProductAsset` ni `ProductAssetVariant`.
- Atomicidad por fila:
  - Escritura DB de asset + variante usa `TransactionTemplate`.
  - Si falla DB, la fila hace rollback de DB y limpia objetos nuevos.
  - Partial success del lote se mantiene porque cada fila captura su error.
- Validaciones:
  - D2 focalizado: 7 tests PASS.
  - Regresion requerida D2: 67 tests PASS.
  - Backend completo: 439 tests PASS.
- Restricciones cumplidas:
  - No se modifico Storefront, contrato publico ni `primaryImage.url`.
  - No se modifico Admin UI.
  - No se toco URL import.
  - No se toco staging, deploy, Caddy, DNS, AWS, S3 real, CloudFront, IAM ni secretos.
  - No se modificaron `.env` reales, Dockerfile ni `docker-compose.yml`.
  - No se implemento AVIF, responsive images, `srcset`, cleanup masivo de objetos orphan ni deploy.
- Documento QA creado:
  - `docs/qa/PHASE2S10C_D2_BINARY_IMPORT_WEBP_DERIVATIVE_QA.md`
- Resultado: PASS.
- Riesgos residuales:
  - `webp-imageio` 0.1.6 no mantenida activamente y con binarios nativos embebidos.
  - Storefront todavia no consume variantes.
  - Imagenes grandes reales requieren medicion posterior de CPU/memoria/calidad.

### Cierre Fase 2S.10C-D3 Local QA: WebP Derivatives

- Tipo: validacion local y documentacion QA.
- Base: D1 cerrado en commit `836fd78 feat(ecommerce): generate WebP derivative for manual upload`.
- Base: D2 cerrado en commit `632a145 feat(ecommerce): generate WebP derivative for binary import`.
- Objetivo: validar localmente que D1 (upload manual) y D2 (Excel + ZIP) conviven correctamente antes de 2S.10C-E.
- No se implementó nueva funcionalidad.
- Solo se ejecutaron pruebas y se documentó evidencia.
- Validaciones:
  - Upload manual: JPEG/WebP/PNG con reglas de preferred y descarte.
  - Excel + ZIP preview: sin efectos secundarios.
  - Excel + ZIP confirm-file: JPEG/WebP/PNG con partial success y cleanup.
  - Consistencia: `ProductAsset` original, `ProductAssetVariant` WebP, `preferred=true` solo si activo y menor.
  - Desactivación de variantes previas en reemplazos.
- Tests ejecutados:
  - Focalizados D1+D2: 72 tests PASS.
  - Backend completo: 439 tests PASS.
- Restricciones cumplidas:
  - No se modificó Storefront, contrato público, `primaryImage.url`, Admin UI, staging, deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM, infraestructura.
  - No se implementó AVIF, responsive images, `srcset`, limpieza masiva de objetos orphan.
  - No se inició 2S.10C-E todavía.
  - Solo cambios documentales en D3.
- Documento QA creado:
  - `docs/qa/PHASE2S10C_D3_LOCAL_DERIVATIVES_QA.md`
- Resultado: PASS.
- Riesgos residuales:
  - URL import fuera de alcance (puede requerir desactivación de variantes antes de 2S.10C-E).
  - Storefront no consume variantes todavía.
  - `webp-imageio` 0.1.6 no mantenida activamente.
  - Objetos orphan de reemplazos anteriores.
  - Cleanup best-effort puede fallar.
- Conclusión: D1 y D2 conviven correctamente. Listo para 2S.10C-E.

### Cierre Fase 2S.10C-E1 URL Stale Variants

- Tipo: implementacion backend + tests + documentacion QA.
- Base: D3 cerrado en commit `c3803da docs(ecommerce): close local WebP derivatives QA`.
- Objetivo: corregir riesgo anti-stale antes de habilitar preferencia publica de variantes WebP.
- Cambios backend:
  - `EcommercePrimaryImageUrlImportApplicationService.confirmFile(...)` desactiva `PRIMARY_OPTIMIZED_WEBP` activa del `ProductAsset` guardado cuando la fila aplica CREATE/UPDATE.
  - `EcommerceCatalogApplicationService.upsertPrimaryProductAsset(...)` desactiva `PRIMARY_OPTIMIZED_WEBP` activa del `ProductAsset` guardado.
- Reglas preservadas:
  - URL import `NO_CHANGE` no desactiva variantes.
  - URL import preview no cambia y sigue sin efectos secundarios.
  - No se generan derivados WebP nuevos en URL import.
  - No se crean `ProductAssetVariant` nuevas en E1.
  - No se borran objetos storage.
  - Partial success por fila se mantiene.
- Validaciones:
  - URL import UPDATE desactiva variante stale del asset afectado.
  - URL import NO_CHANGE conserva variante activa.
  - Admin URL upsert desactiva variante stale del asset afectado.
  - No se desactivan variantes de otro `ProductAsset`.
  - Regresion upload manual D1, Excel + ZIP D2, persistencia de variantes y Storefront contract: PASS.
- Tests ejecutados:
  - Focalizados E1 + regresion D1/D2/Storefront: 87 tests PASS.
  - Backend completo: 442 tests PASS.
- Restricciones cumplidas:
  - No se modifico Storefront, contrato publico ni `primaryImage.url`.
  - No se modifico Admin UI.
  - No se toco staging, deploy, Caddy, DNS, AWS/S3/CloudFront/IAM ni secretos.
  - No se modificaron `.env`, Dockerfile ni `docker-compose.yml`.
  - No se implemento AVIF, responsive images ni `srcset`.
  - No se inicio 2S.10C-E2.
- Documento QA creado:
  - `docs/qa/PHASE2S10C_E1_URL_STALE_VARIANTS_QA.md`
- Resultado: PASS.
- Riesgos residuales:
  - Storefront todavia no consume variantes.
  - E2 debe preferir variantes solo si pertenecen al `ProductAsset` primario activo vigente.
  - Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.

### Cierre Fase 2S.10C-E2 Public Image Variant Preference

- Tipo: implementacion backend read-only publica + tests + documentacion QA.
- Base: E1 cerrado en commit `5d2e7df fix(ecommerce): deactivate stale WebP variants for URL assets`.
- Objetivo: preferir `ProductAssetVariant.PRIMARY_OPTIMIZED_WEBP` active/preferred como `primaryImage.url` en API publica ecommerce, con fallback seguro al original.
- Cambios backend:
  - `StorefrontProductReadAdapter.findPublishedProducts(...)` usa variante WebP valida del mismo `ProductAsset` cuando existe.
  - `StorefrontProductReadAdapter.findPublishedProductDetailBySlug(...)` aplica la misma regla.
- Regla implementada:
  - Primero se identifica `ProductAsset` primario activo vigente.
  - Variante valida requiere mismo `product_asset_id`, `variant_kind = PRIMARY_OPTIMIZED_WEBP`, `active = true`, `preferred = true`, `asset_url` no blank.
  - Si no existe variante valida, se devuelve `ProductAsset.assetUrl` original.
  - `altText`, `type` y `displayOrder` permanecen desde `ProductAsset`.
- Contrato publico:
  - `PublicImageResponse(url, altText, type, displayOrder)` sin cambios.
  - No se agregan campos de variantes, `mimeType`, `width`, `height`, `srcset` ni metadata.
- Validaciones:
  - Listado y detalle devuelven WebP cuando existe variante active/preferred valida.
  - Listado y detalle devuelven original sin variante.
  - Variante inactive se ignora.
  - Variante `preferred=false` se ignora.
  - Variante de otro `ProductAsset` se ignora.
  - Variante con URL blank se ignora.
  - Variante stale tras reemplazo URL-only no se devuelve.
  - Regresion E1/D1/D2 y persistencia de variantes: PASS.
- Tests ejecutados:
  - Focalizados E2 + regresion E1/D1/D2: 94 tests PASS.
  - Backend completo: 449 tests PASS.
- Restricciones cumplidas:
  - No se modifico `storefront/`, contrato publico Storefront ni Admin UI.
  - No se toco staging, deploy, Caddy, DNS, AWS/S3/CloudFront/IAM ni secretos.
  - No se modificaron `.env`, Dockerfile ni `docker-compose.yml`.
  - No se modifico generacion de derivados, upload manual, Excel + ZIP ni URL import.
  - No se implemento AVIF, responsive images ni `srcset`.
- Documento QA creado:
  - `docs/qa/PHASE2S10C_E2_PUBLIC_IMAGE_VARIANT_PREFERENCE_QA.md`
- Resultado: PASS.
- Riesgos residuales:
  - Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
  - Cache CDN/Next/Image puede retrasar visibilidad en ambientes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.

### Cierre Fase 2S.10C-E3 Local Public API QA

- Tipo: validacion local y documentacion QA.
- Base: E2 cerrado en commit `b054487 feat(ecommerce): prefer WebP variant in public image response`.
- Objetivo: validar localmente que la API publica ecommerce devuelve correctamente la URL WebP preferida cuando existe variante valida y mantiene fallback seguro al original.
- No se implemento nueva funcionalidad.
- Solo se ejecutaron pruebas y se documento evidencia.
- Endpoints validados:
  - `GET /api/v1/storefront/catalog/products`
  - `GET /api/v1/storefront/catalog/products/{slug}`
- Regla validada:
  - Si existe variante `PRIMARY_OPTIMIZED_WEBP` active/preferred valida del mismo `ProductAsset`, se devuelve esa URL.
  - Si no existe variante valida, se devuelve URL original del `ProductAsset`.
  - `altText`, `type` y `displayOrder` siguen saliendo del `ProductAsset` original.
- Casos validados:
  - Producto con variante active/preferred valida: devuelve URL WebP en listado y detalle.
  - Producto sin variante: devuelve URL original en listado y detalle.
  - Variante inactive: se ignora y devuelve original.
  - Variante preferred=false: se ignora y devuelve original.
  - Variante asociada a otro ProductAsset: se ignora y devuelve original.
  - Variante stale despues de reemplazo URL-only: no se devuelve.
  - Contrato publico: mantiene solo 4 campos sin metadata adicional.
- Tests ejecutados:
  - Focalizados E2 + regresion E1/D1/D2: 103 tests PASS.
  - Backend completo: 449 tests PASS.
- Restricciones cumplidas:
  - No se modifico `storefront/`, Admin UI, contrato publico, staging, deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
  - No se modifico generacion de derivados, upload manual, Excel + ZIP ni URL import.
  - No se implemento AVIF, responsive images ni `srcset`.
  - Solo cambios documentales en E3.
- Documento QA creado:
  - `docs/qa/PHASE2S10C_E3_LOCAL_PUBLIC_API_QA.md`
- Resultado: PASS.
- Riesgos residuales:
  - Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
  - Cache CDN/Next/Image puede retrasar visibilidad de cambios en ambientes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
  - No se ha validado con data real de productos en staging.
- Conclusión: API publica lista para staging smoke. Todos los casos criticos cubiertos por tests de integracion.

### Cierre Fase 2S.10C-S Staging WebP Variant Public API QA

- Tipo: deploy minimo staging + validacion funcional + documentacion QA.
- Base: E3 cerrado en commit `fb0445f docs(ecommerce): close local public WebP API QA`.
- Objetivo: validar en staging el flujo completo de derivados WebP ecommerce.
- No se implemento nueva funcionalidad.
- Solo se ejecuto deploy minimo y se documento evidencia.
- Backup DB staging creado: `/home/ubuntu/inktoy-backups/2s10c-staging-smoke/20260621T160535Z/staging-db-before-2s10c-s.sql`.
- Flyway V19 aplicado correctamente: `success = t`.
- Tabla `ecommerce_product_asset_variants` existe.
- SKU usado: `CUAD`, slug `cuaderno-a4`.
- Upload manual desde Admin staging genero `ProductAssetVariant` WebP.
- ProductAsset original JPG preservado: 13890 bytes.
- ProductAssetVariant WebP creado: 4130 bytes (70.3% reduccion).
- CDN del derivado: HTTP 200, `Content-Type: image/webp`.
- API publica detalle: `primaryImage.url` apunta al derivado WebP.
- API publica listado: `primaryImage.url` apunta al derivado WebP.
- Storefront staging: HTTP 200, imagen visible en incognito.
- Robots.txt mantiene `Disallow: /`.
- Backend/Admin/Storefront responden 200.
- Sin errores criticos en logs.
- Contrato publico sin cambios: solo `url`, `altText`, `type`, `displayOrder`.
- Restricciones cumplidas:
  - No se reconstruyo frontend/Admin ni Storefront.
  - No se toco Caddy, DNS, AWS/S3/CloudFront/IAM, `.env`, Dockerfile, `docker-compose.yml` ni infraestructura.
  - Solo deploy minimo backend.
- Documento QA creado:
  - `docs/qa/PHASE2S10C_STAGING_WEBP_VARIANT_PUBLIC_API_QA.md`
- Resultado: PASS.
- Riesgos residuales:
  - Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
  - Cache CDN/Next/Image puede retrasar visibilidad de cambios en ambientes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
  - Calidad de conversion WebP depende de `webp-imageio`.
- Recomendacion siguiente: iniciar 2S.10D en Plan Mode, no Build directo.
- Conclusion: Staging smoke PASS. Flujo completo de derivados WebP validado en staging.

### Cierre Fase 2S.10D-B Responsive WebP and AVIF Spike

- Tipo: spike tecnico test-only + documentacion QA.
- Base: 2S.10C-S cerrado en commit `8669877 docs(ecommerce): close staging WebP variant smoke`.
- Objetivo: validar resize responsive WebP y evaluar viabilidad AVIF sin tocar infraestructura, Dockerfile, docker-compose, staging ni contrato publico.
- Cambios realizados solo en `backend/src/test/java` y documentacion.
- No se modifico codigo productivo backend, Storefront, Admin UI, migraciones, `PublicImageResponse`, upload manual, Excel + ZIP, URL import, `.env`, Dockerfile, `docker-compose.yml`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
- Tests agregados:
  - `ResponsiveImageResizeSpikeServiceTest`.
  - `AvifResponsiveSpikeTest`.
- Servicio experimental test-only agregado:
  - `ResponsiveImageResizeSpikeService`.
- WebP responsive validado:
  - JPEG 1600x1200 genera `320w`, `640w`, `960w`, `1280w`.
  - PNG transparente 800x800 genera `320w`, `640w` preservando alpha.
  - No-upscaling: JPEG 240x180 no genera `320w` ni `640w`.
  - Variantes validadas con `EcommerceProductImageBinaryService.validate(...)`.
  - Checksums SHA-256 y `sizeBytes` consistentes.
- Resultado local:
  - `./mvnw.cmd "-Dtest=ResponsiveImageResizeSpikeServiceTest,AvifResponsiveSpikeTest" test`: 5 tests PASS.
- Resultado Docker/Linux:
  - `docker run --rm -v "${PWD}:/workspace" -w /workspace/backend eclipse-temurin:17-jdk-jammy sh ./mvnw "-Dtest=ResponsiveImageResizeSpikeServiceTest,AvifResponsiveSpikeTest" test`: 5 tests PASS.
- AVIF:
  - Estado: BLOQUEADO/NO APTO por ahora.
  - No hay writer/reader ImageIO AVIF en classpath actual.
  - No se agrego dependencia AVIF runtime ni test-scope.
  - No se debe tocar Dockerfile ni instalar paquetes del sistema para habilitar AVIF en 2S.10D-B.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_RESPONSIVE_AVIF_SPIKE_QA.md`
- Resultado: PASS con AVIF BLOQUEADO.
- Riesgos residuales:
  - `webp-imageio` 0.1.6 sigue siendo dependencia no mantenida activamente.
  - Uso de memoria/CPU debe controlarse en implementacion productiva.
  - Calidad visual requiere validacion con imagenes reales.
  - AVIF requiere decision tecnica posterior o queda fuera de 2S.10D.
- Recomendacion siguiente: avanzar a 2S.10D-C Modelo para soportar multiples tamanos WebP activos. Continuar 2S.10D con WebP responsive primero y dejar AVIF para fase posterior.

### Cierre Fase 2S.10D-C Responsive WebP Variants Model

- Tipo: backend modelo/persistencia + migracion Flyway + tests + documentacion QA.
- Base: 2S.10D-B cerrado en commit `4257c2e test(ecommerce): validate responsive image spike`.
- Objetivo: extender el modelo `ProductAssetVariant` para permitir multiples variantes WebP responsive activas por `ProductAsset`, sin generar variantes responsive todavia.
- Migracion creada: `backend/src/main/resources/db/migration/V20__ecommerce_responsive_webp_asset_variants.sql`.
- V20 agrega columnas:
  - `format`.
  - `purpose`.
  - `target_width`.
  - `sort_order`.
- Backfill V20 para filas existentes 2S.10C:
  - `format = WEBP`.
  - `purpose = PRIMARY`.
  - `target_width = width`.
  - `sort_order = 0`.
- Constraints V20:
  - `variant_kind IN ('PRIMARY_OPTIMIZED_WEBP', 'PRIMARY_RESPONSIVE_WEBP')`.
  - `mime_type = 'image/webp'`.
  - `format IN ('WEBP')`.
  - `purpose IN ('PRIMARY', 'RESPONSIVE')`.
  - `target_width > 0`.
  - `sort_order >= 0`.
- Unique activo reemplazado por identidad responsive:
  - `(product_asset_id, variant_kind, format, purpose, target_width) WHERE active = TRUE`.
- Unique `preferred=true` activo por `ProductAsset` preservado.
- Modelo dominio actualizado:
  - `ProductAssetVariantKind.PRIMARY_RESPONSIVE_WEBP` agregado.
  - `ProductAssetVariantFormat.WEBP` agregado.
  - `ProductAssetVariantPurpose.PRIMARY/RESPONSIVE` agregado.
  - `ProductAssetVariant` ahora incluye `format`, `purpose`, `targetWidth`, `sortOrder`.
- Compatibilidad preservada:
  - Constructor compatible mantiene `WEBP/PRIMARY/targetWidth=width/sortOrder=0` para D1/D2.
  - D1 upload manual sigue insertando `PRIMARY_OPTIMIZED_WEBP` como antes.
  - D2 Excel + ZIP sigue insertando `PRIMARY_OPTIMIZED_WEBP` como antes.
  - E2 API publica sigue usando solo `PRIMARY_OPTIMIZED_WEBP active/preferred` para `primaryImage.url`.
  - `PublicImageResponse(url, altText, type, displayOrder)` no cambio.
- Tests ejecutados:
  - `ProductAssetVariantPersistenceIntegrationTest`: 13 tests PASS.
  - Regresion focalizada ecommerce: 96 tests PASS.
  - Backend completo: 457 tests PASS.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_RESPONSIVE_VARIANTS_MODEL_QA.md`
- Resultado: PASS.
- Restricciones cumplidas:
  - No se toco Storefront, Admin UI, contrato publico, `PublicImageResponse`, API responsive, generacion WebP responsive productiva, staging/deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
  - No se implemento AVIF ni se permitio `image/avif`.
- Riesgos residuales antes de 2S.10D-D:
  - D debe implementar generacion real de `PRIMARY_RESPONSIVE_WEBP` sin upscaling.
  - Al generar responsive, URL import/Admin URL upsert deberan desactivar tambien variantes responsive activas para evitar stale variants.
  - Cleanup best-effort debe cubrir multiples objetos nuevos por fila.
- Recomendacion siguiente: avanzar a 2S.10D-D WebP Responsive Generation en Build separado, sin API publica responsive, Storefront ni AVIF.

### Cierre Fase 2S.10D-D1 Manual Upload Responsive WebP

- Tipo: backend funcional + tests + documentacion QA.
- Base: 2S.10D-C cerrado en commit `7dad4a8 feat(ecommerce): extend image variants model for responsive WebP`.
- Objetivo: generar variantes `PRIMARY_RESPONSIVE_WEBP` solo para upload manual ecommerce, sin contrato publico responsive.
- Alcance real implementado:
  - Servicio productivo `EcommerceResponsiveWebpVariantGenerationService`.
  - Targets responsive `320w`, `640w`, `960w`, `1280w`.
  - JPEG/PNG only; WebP original se conserva sin responsive.
  - No-upscaling por target.
  - Storage key bajo `/variants/responsive/` con target width y checksums fuente/derivado.
  - Persistencia `PRIMARY_RESPONSIVE_WEBP` con `format=WEBP`, `purpose=RESPONSIVE`, `targetWidth`, `sortOrder`, `active=true`, `preferred=false`.
  - Desactivacion de responsive previas en reemplazo manual.
  - Cleanup best-effort de original, optimized y responsive nuevos ante fallos storage/DB.
- Compatibilidad preservada:
  - `PRIMARY_OPTIMIZED_WEBP` sigue siendo la unica variante `preferred=true`.
  - API publica sigue usando solo `PRIMARY_OPTIMIZED_WEBP active/preferred` para `primaryImage.url`.
  - `PublicImageResponse(url, altText, type, displayOrder)` no cambio.
  - Excel + ZIP y URL import no generan responsive.
- Tests ejecutados:
  - Focalizados iniciales: 47 tests PASS.
  - Regresion ecommerce focalizada: 104 tests PASS.
  - Backend completo: 465 tests PASS.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_D1_MANUAL_UPLOAD_RESPONSIVE_WEBP_QA.md`
- Resultado: PASS local.
- Restricciones cumplidas:
  - No se toco Storefront, Admin UI, contrato publico, `PublicImageResponse`, API publica responsive, Excel + ZIP, URL import, staging/deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
  - No se implemento AVIF ni se permitio `image/avif`.
- Riesgos residuales:
  - Calidad visual responsive requiere validacion con imagenes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
  - Objetos storage anteriores pueden quedar orphan hasta fase futura de limpieza segura.
- Recomendacion siguiente: cerrar commit D1; no iniciar 2S.10D-D2 sin autorizacion explicita.

### Cierre Fase 2S.10D-D2 Binary Import Responsive WebP

- Tipo: backend funcional + tests + documentacion QA.
- Base: 2S.10D-D1 cerrado en commit `dbbaea3 feat(ecommerce): generate responsive WebP variants for manual upload`.
- Objetivo: extender variantes `PRIMARY_RESPONSIVE_WEBP` al flujo Excel + ZIP `confirm-file`, sin cambiar preview ni contrato publico.
- Alcance real implementado:
  - `EcommercePrimaryImageBinaryImportApplicationService` inyecta y reutiliza `EcommerceResponsiveWebpVariantGenerationService`.
  - Targets responsive `320w`, `640w`, `960w`, `1280w`.
  - JPEG/PNG del ZIP generan responsive; WebP original no genera responsive.
  - No-upscaling por target.
  - Persistencia `PRIMARY_RESPONSIVE_WEBP` con `format=WEBP`, `purpose=RESPONSIVE`, `targetWidth`, `sortOrder`, `active=true`, `preferred=false`.
  - Desactivacion de `PRIMARY_OPTIMIZED_WEBP` y `PRIMARY_RESPONSIVE_WEBP` previas en reemplazo por import.
  - Partial success por fila preservado.
  - Cleanup best-effort por fila de original, optimized y responsive nuevos ante fallos storage/DB.
- Compatibilidad preservada:
  - Preview Excel + ZIP sin side effects.
  - `PRIMARY_OPTIMIZED_WEBP` sigue siendo la unica variante `preferred=true`.
  - API publica sigue usando solo `PRIMARY_OPTIMIZED_WEBP active/preferred` para `primaryImage.url`.
  - `PublicImageResponse(url, altText, type, displayOrder)` no cambio.
  - URL import y Admin URL upsert no se modificaron.
- Tests ejecutados:
  - Focalizados D2: 12 tests PASS.
  - Regresion ecommerce solicitada: 115 tests PASS.
  - Backend completo: 470 tests PASS.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_D2_BINARY_IMPORT_RESPONSIVE_WEBP_QA.md`
- Resultado: PASS local.
- Restricciones cumplidas:
  - No se toco Storefront, Admin UI, contrato publico, `PublicImageResponse`, API publica responsive, URL import, Admin URL upsert, staging/deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
  - No se implemento AVIF ni se permitio `image/avif`.
- Riesgos residuales:
  - Calidad visual responsive requiere validacion con imagenes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
  - URL import/Admin URL upsert no generan responsive por alcance; revisar stale responsive antes de exponer API publica responsive.
  - Objetos storage anteriores pueden quedar orphan hasta fase futura de limpieza segura.
- Recomendacion siguiente: cerrar commit D2; no iniciar API publica responsive ni Storefront responsive sin autorizacion explicita.

### Cierre Fase 2S.10D-F Public Responsive API Backend-Only

- Tipo: backend funcional + tests + documentacion QA.
- Base: 2S.10D-E Plan Mode de contrato publico responsive opcional completado.
- Objetivo: exponer variantes `PRIMARY_RESPONSIVE_WEBP` en `primaryImage` de la API publica ecommerce, sin romper clientes que consumen `primaryImage.url`.
- Alcance real implementado:
  - `PublicImageResponse` mantiene `url`, `altText`, `type`, `displayOrder` y agrega `responsive` opcional.
  - `responsive.variants[]` expone solo `url`, `mimeType`, `width`, `height`.
  - Proyecciones internas cargan el `ProductAsset` primario para consultar responsive variants asociadas.
  - `StorefrontProductReadAdapter` filtra variantes activas `PRIMARY_RESPONSIVE_WEBP`, `format=WEBP`, `purpose=RESPONSIVE`, `mime_type=image/webp`, URL no blank, `width/height/target_width` positivos.
  - Orden publico por `sort_order asc`, `target_width asc`.
  - Listado y detalle comparten el mismo contrato responsive en `primaryImage`.
- Compatibilidad preservada:
  - `primaryImage.url` sigue prefiriendo `PRIMARY_OPTIMIZED_WEBP active/preferred` con URL valida.
  - `primaryImage.url` sigue haciendo fallback a `ProductAsset.assetUrl`.
  - `responsive.variants` no reemplaza ni hace nullable `primaryImage.url`.
  - Cuando no hay responsive validas, `responsive` queda `null` por serializacion actual.
- Tests ejecutados:
  - `StorefrontPublicProductsIntegrationTest`: 30 tests PASS.
  - Regresion ecommerce relacionada: 81 tests PASS.
  - Backend completo: 472 tests PASS.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_F_PUBLIC_RESPONSIVE_API_QA.md`
- Resultado: PASS local.
- Restricciones cumplidas:
  - No se toco Storefront ni `storefront/`.
  - No se toco generacion responsive WebP, upload manual, Excel + ZIP, URL import, AVIF, Flyway/migraciones, auth/autorizacion, endpoints no relacionados, staging/deploy ni infraestructura.
  - No se agregaron `sizes`, `sources` ni `srcSet` como contrato unico.
  - No se implemento responsive para gallery.
  - No se expusieron campos internos (`productAssetId`, storage, checksums, flags, kind/purpose/sort, auditoria, metadata interna).
  - No se implemento AVIF ni se permitio `image/avif`; AVIF queda deferred/blocked.
- Riesgos residuales:
  - Storefront aun no consume `responsive.variants`; la mejora visual/performance requiere subfase frontend futura.
  - Payload de listado crece cuando hay variantes responsive.
  - URL import/Admin URL upsert no fueron modificados por alcance; responsive variants historicas activas sobre el mismo `ProductAsset` pueden requerir anti-stale especifico.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- Recomendacion siguiente: revision manual y commit; no iniciar consumo Storefront responsive sin autorizacion explicita.

### Cierre Fase 2S.10D-F2 URL Responsive Anti-Stale

- Tipo: backend funcional + tests + documentacion QA.
- Base: 2S.10D-F API publica responsive backend-only completada con PASS.
- Objetivo: desactivar `PRIMARY_RESPONSIVE_WEBP` stale en flujos URL-only antes de consumo Storefront.
- Alcance real implementado:
  - `EcommercePrimaryImageUrlImportApplicationService.confirmFile(...)` ahora desactiva `PRIMARY_RESPONSIVE_WEBP` junto con `PRIMARY_OPTIMIZED_WEBP` al aplicar CREATE/UPDATE.
  - `EcommerceCatalogApplicationService.upsertPrimaryProductAsset(...)` ahora desactiva `PRIMARY_RESPONSIVE_WEBP` junto con `PRIMARY_OPTIMIZED_WEBP` en Admin URL upsert.
  - Tests URL import cubren multiples responsive variants, variantes de otro asset y NO_CHANGE sin desactivacion.
  - Tests Admin URL upsert cubren desactivacion responsive multiple.
  - Test API publica confirma que `responsive.variants` no expone stale tras URL-only replacement y que `primaryImage.url` queda en fallback seguro.
- Compatibilidad preservada:
  - `PRIMARY_OPTIMIZED_WEBP` mantiene comportamiento previo.
  - NO_CHANGE no toca optimized ni responsive.
  - No se generan variantes en URL import/Admin URL upsert.
  - No cambia contrato publico ni semantica de `primaryImage.url`.
- Tests ejecutados:
  - Focalizados anti-stale: 82 tests PASS.
  - Regresion ecommerce relacionada: 113 tests PASS.
  - Backend completo: 473 tests PASS.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_F2_URL_RESPONSIVE_ANTI_STALE_QA.md`
- Resultado: PASS local.
- Restricciones cumplidas:
  - No se toco Storefront ni `storefront/`.
  - No se toco infraestructura, staging/deploy, Dockerfile, `docker-compose.yml`, Caddy, DNS, AWS/S3/CloudFront/IAM, secretos ni `.env` reales.
  - No se crearon migraciones Flyway.
  - No se modifico generacion responsive WebP ni optimized WebP.
  - No se modifico upload manual ni Excel + ZIP confirm-file.
  - No se modifico `PublicImageResponse` ni `StorefrontProductReadAdapter`.
  - No se agregaron `sizes`, `sources`, `srcSet` ni gallery responsive.
  - No se implemento AVIF ni se permitio `image/avif`; AVIF sigue deferred/blocked.
- Riesgos residuales:
  - Storefront aun no consume `responsive.variants`.
  - Objetos storage antiguos asociados a variantes desactivadas no se eliminan en esta subfase.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- Recomendacion siguiente: revision manual y commit; no iniciar consumo Storefront responsive sin autorizacion explicita.

### Cierre Fase 2S.10D-F3 Local API JSON Smoke + Git Readiness

- Tipo: QA local/API smoke + revision Git + documentacion.
- Base: 2S.10D-F y 2S.10D-F2 completadas con PASS.
- Objetivo: cerrar QA local/API smoke y revision Git antes de 2S.10D-G Storefront consume responsive.
- Estado Git revisado:
  - 14 archivos modificados (F + F2).
  - 2 documentos QA nuevos (F + F2).
  - `StorefrontPublicProductsIntegrationTest.java` contiene tests de F y F2 mezclados.
- Tests smoke ejecutados:
  - `shouldExposeResponsiveWebpVariantsInListAndDetailPrimaryImage`: PASS.
  - `shouldNotReturnStaleVariantAfterUrlOnlyReplacement`: PASS.
  - `confirmFileNoChangeShouldKeepExistingWebpVariantActive`: PASS.
- Contrato JSON validado:
  - `primaryImage.url` sigue presente y mantiene fallback.
  - `primaryImage.responsive.variants[]` aparece cuando existen variantes validas.
  - Cada variant expone solo `url`, `mimeType`, `width`, `height`.
  - No se exponen campos internos.
  - Listado y detalle mantienen el mismo contrato responsive.
  - Backward compatible cuando no hay responsive variants.
- Recomendacion de commit:
  - **Un commit conjunto para F y F2** (no separar).
  - Motivo: `StorefrontPublicProductsIntegrationTest.java` tiene tests que dependen de ambos cambios.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_F3_LOCAL_PUBLIC_RESPONSIVE_JSON_SMOKE_QA.md`
- Resultado: PASS.
- Restricciones cumplidas:
  - No se toco Storefront ni `storefront/`.
  - No se toco infraestructura, staging, deploy, Docker, Caddy, DNS, AWS, secretos ni `.env`.
  - No se modifico backend funcional (solo se valido).
  - No se crearon migraciones.
  - No se implemento AVIF; queda deferred/blocked.
  - No se hizo commit, push ni tag.
- Riesgos residuales antes de 2S.10D-G:
  - Storefront aun no consume `responsive.variants`.
  - Objetos storage antiguos no se eliminan en esta subfase.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- Recomendacion siguiente: autorizar commit conjunto de F y F2, luego iniciar 2S.10D-G Storefront consume responsive.

### Cierre Fase 2S.10D-G Storefront Responsive Consumption

- Tipo: frontend-only + checks locales + documentacion QA.
- Base: backend responsive publico ya cerrado en `cb6f77e feat(ecommerce): expose responsive variants and prevent stale URL assets`.
- Alcance real implementado:
  - Tipado Storefront para `primaryImage.responsive.variants[]`.
  - Helper seguro para sanitizar, ordenar y deduplicar variants responsive.
  - `ProductImageFrame` extendido con loader conservador de `next/image` y fallback obligatorio a `primaryImage.url`.
  - Home, listado de productos, categoria y detalle pasan variants responsive al componente de imagen.
- Compatibilidad preservada:
  - `responsive.variants` sigue siendo opcional.
  - Si no hay variants validas, el Storefront se comporta igual que antes.
  - `sizes` permanece en frontend.
  - No se uso `<picture>` ni se cambio a `<img>`.
- Checks ejecutados:
  - `npm run build`: PASS.
  - `npm run lint`: PASS.
  - `npx tsc --noEmit`: PASS.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_G_STOREFRONT_RESPONSIVE_CONSUMPTION_QA.md`
- Resultado: PASS local.
- Restricciones cumplidas:
  - No se toco backend, API publica, gallery, AVIF, cache avanzada, staging/deploy ni infraestructura.
  - No se modifico `next.config.ts`.
  - No se rediseño UI.
- Riesgos residuales:
  - No hay tests frontend automaticos dedicados.
  - No se ejecuto smoke runtime de rutas con backend vivo en esta subfase.
  - Warning heredado de multiples lockfiles/Turbopack root sigue no bloqueante.

### Cierre Fase 2S.10D-G-C Local Storefront Runtime Smoke

- Tipo: QA runtime + documentacion.
- Base: 2S.10D-G-B completada con PASS.
- Objetivo: validar runtime local del Storefront con backend vivo antes de autorizar commit.
- Servicios levantados:
  - PostgreSQL: `erp-pos-postgres` (puerto 5432).
  - Backend Spring Boot: `erp-pos-backend` (puerto 8080).
  - Storefront Next.js: `erp-pos-storefront` (puerto 3000).
- Rutas validadas:
  - `/` (pagina de inicio): HTTP 200 OK.
  - `/productos` (listado): HTTP 200 OK.
  - `/categorias/categoria-online-1` (detalle categoria): HTTP 200 OK.
  - `/productos/producto-6` (detalle producto): HTTP 200 OK.
- Validaciones confirmadas:
  - Storefront renderiza correctamente sin errores de JavaScript.
  - `next/image` funciona correctamente con `srcSet` y `sizes`.
  - `primaryImage.url` sigue siendo fallback obligatorio.
  - `responsive.variants` es opcional (backward compatibility confirmada).
  - HTML renderizado es valido y completo.
  - No se uso `<picture>`, se mantiene `next/image`.
- Nota importante:
  - Backend en Docker usa imagen anterior (pre-2S.10D-F).
  - Campo `responsive` no esta presente en respuestas de API.
  - Esto confirma backward compatibility del Storefront.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_GC_LOCAL_STOREFRONT_RUNTIME_SMOKE_QA.md`
- Resultado: PASS.
- Restricciones cumplidas:
  - No se toco backend funcional.
  - No se toco infraestructura.
  - No se toco gallery.
  - No se implemento AVIF (sigue deferred/blocked).
  - No se implemento cache avanzada (sigue diferida).
  - No se hizo commit, push ni tag.
- Riesgos residuales:
  - No se valido consumo real de `responsive.variants[]` (backend no las devuelve).
  - Se validara en staging con backend completo.
- Recomendacion siguiente: autorizar commit de 2S.10D-G-B + 2S.10D-G-C, luego desplegar en staging.

### Cierre Fase 2S.10D-S Staging Responsive Images Smoke

- Tipo: push + deploy minimo staging + smoke funcional + documentacion QA.
- Base: commits locales `cb6f77e` y `2a4645c` ya validados localmente.
- Push realizado a `origin/master`.
- Host staging actualizado desde `fb0445f` hasta `2a4645c` por fast-forward.
- Deploy minimo ejecutado solo sobre `backend` + `storefront`.
- `frontend` Angular, `postgres`, infraestructura, Dockerfile, `docker-compose.yml`, Caddy, DNS, AWS/S3/CloudFront/IAM, secretos y `.env` reales no se modificaron.
- Backend staging aplico V20 existente y quedo arriba.
- API publica staging responde 200 y expone `primaryImage.responsive = null` para `cuaderno-a4`, confirmando despliegue del contrato nuevo sin romper compatibilidad.
- Storefront staging responde 200 en rutas principales y renderiza sin error con `next/image`.
- URL WebP validada: `https://cdn-staging.inktoy.pe/staging/ecommerce/ecommerce/products/1/profiles/1/variants/cuaderno-a4-3fcc61f44cbf-37cfff654eef.webp` -> HTTP 200, `content-type: image/webp`.
- Resultado: PARTIAL.
- Motivo de partial:
  - No existe evidencia en staging de un producto con `responsive.variants[]` poblado.
  - Se valida fallback/backward compatibility, pero no el consumo real de variants responsive end-to-end.
- Documento QA creado:
  - `docs/qa/PHASE2S10D_STAGING_RESPONSIVE_IMAGES_SMOKE_QA.md`
- Riesgos residuales:
  - Falta un producto staging con `PRIMARY_RESPONSIVE_WEBP` activa para validar el flujo completo.
  - Widths responsive especificos y URLs de `responsive.variants[]` quedan pendientes de smoke posterior.

### Cierre Fase 2S.10D-S2 Staging Responsive Variants Real-Data Smoke

- Tipo: smoke staging con datos reales/controlados + documentacion QA.
- Base: staging ya actualizado con `cb6f77e` y `2a4645c`.
- Alcance real ejecutado:
  - Verificacion inicial: staging no tenia ninguna `PRIMARY_RESPONSIVE_WEBP` activa.
  - Se creo producto de prueba via flujos existentes y seguros del sistema.
  - Se genero imagen JPEG 1600x1200 por upload manual staging para forzar variants responsive.
  - Se completo online profile, SEO y publicacion via endpoints admin existentes.
- Resultado API/CDN:
  - API detalle y listado devuelven `primaryImage.url` y `primaryImage.responsive.variants[]` real.
  - Variants observadas: `320w`, `640w`, `960w`, `1280w`.
  - URLs responsive WebP: HTTP 200, `content-type: image/webp`.
  - No se exponen campos internos.
- Resultado Storefront:
  - FAIL runtime al renderizar producto con variants reales.
  - Logs muestran error por pasar `loader: function` a Client Component / `next/image`.
  - El fallo afecta home, listado, categoria y detalle del producto de prueba.
- Restricciones cumplidas:
  - No se modifico backend funcional.
  - No se modifico Storefront funcional.
  - No se toco infraestructura.
  - No se crearon migraciones.
  - No se toco gallery.
  - No se implemento AVIF ni cache avanzada.
- Resultado: FAIL.
- Conclusion:
  - Se requiere subfase correctiva frontend antes de poder cerrar 2S.10D como PASS total.

### Cierre Fase 2S.10D-G-D Storefront Responsive Loader Boundary Fix

- Tipo: correccion frontend-only en Storefront.
- Commit:
  - `96dc6c3 fix(storefront): keep responsive image loader inside client boundary`
- Push a `origin/master`: realizado.
- Staging actualizado a `96dc6c3` por fast-forward.
- Contexto:
  - 2S.10D-S2 valido backend/API/CDN responsive, pero Storefront staging fallo con HTTP 500 al renderizar producto con `primaryImage.responsive.variants[]` real.
  - Error observado: `Functions cannot be passed directly to Client Components ... loader: function`.
- Causa raiz:
  - `ProductImageFrame` Server Component construia una funcion `responsiveLoader` y la pasaba a `next/image`.
  - La funcion cruzaba el boundary Server Component -> Client Component y no era serializable.
- Cambio aplicado localmente:
  - `ProductImageFrame` permanece como Server Component.
  - Nuevo `ProductImageFrameClient` con `"use client"` contiene `next/image` y el custom loader.
  - Solo se pasan props serializables desde servidor a cliente.
- Validaciones locales:
  - `npm run lint`: PASS.
  - `npx tsc --noEmit`: PASS.
  - `npm run build`: PASS.
  - Smoke local Storefront principal: HTTP 200.
- Validaciones staging:
  - API publica `GET /api/v1/storefront/catalog/products/smoke-test-2s10d`: HTTP 200.
  - `primaryImage.url` presente.
  - `primaryImage.responsive.variants[]` real no vacio con `320w`, `640w`, `960w`, `1280w`.
  - URLs WebP responsive: HTTP 200, `content-type: image/webp`.
  - Storefront `/`, `/productos`, `/categorias/categoria-1`, `/productos/smoke-test-2s10d`: HTTP 200 tras estabilizar servicios.
  - Logs Storefront estabilizados sin `Functions cannot be passed directly to Client Components` ni `loader: function`.
- Restricciones respetadas:
  - No backend.
  - No migraciones.
  - No infraestructura.
  - No Dockerfile/docker-compose.
  - No Caddy/DNS/AWS/S3/CloudFront/IAM.
  - No secretos ni `.env` reales.
  - No AVIF.
  - No cache avanzada.
  - No gallery.
  - No `<img>` ni `<picture>`.
  - No se desactivo `responsive.variants[]`.
- Resultado: PASS.
- Observacion operativa:
  - El comando de deploy apunto a `storefront`, pero Docker Compose tambien reconstruyo/recreo `backend` por dependencias del perfil; no hubo cambios funcionales backend ni migraciones.
- Conclusion:
  - 2S.10D puede cerrarse como PASS total para el alcance responsive WebP/API/Storefront actual.
  - AVIF, cache avanzada y gallery responsive permanecen fuera de alcance/diferidos.

### Cierre Documental Final Fase 2S.10D

- Tipo: cierre documental final.
- Documento creado:
  - `docs/qa/PHASE2S10D_FINAL_CLOSURE_QA.md`
- Estado final:
  - PASS para responsive WebP end-to-end, API publica y Storefront.
- Aclaraciones obligatorias mantenidas:
  - AVIF deferred/blocked.
  - Caché avanzada deferred.
  - Gallery responsive fuera de alcance.
- Confirmaciones:
  - No se toco codigo funcional.
  - No se toco backend funcional.
  - No se toco Storefront funcional.
  - No se toco infraestructura.
  - No se creo migracion.
  - No se creo tag.
- Recomendacion de continuidad:
  - 2S.10D queda cerrada.
  - No iniciar otra fase automaticamente.
  - Esperar definicion del usuario sobre la siguiente seccion del ERP/POS.
