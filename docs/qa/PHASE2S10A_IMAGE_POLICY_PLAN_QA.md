# Phase 2S.10A Image Policy Plan QA

## Objetivo

Definir política unificada de imágenes ecommerce para fases futuras (2S.10B, 2S.10C, 2S.10D) sin implementar cambios de código ni infraestructura.

## Alcance

- **Modo**: Solo Plan Mode (lectura)
- **Documentación**: Política unificada, decisiones, riesgos, orden de ejecución
- **Fases planificadas**: 2S.10B (WebP passthrough), 2S.10C (derivados WebP), 2S.10D (responsive + AVIF + caché)
- **No implementado**: WebP, migraciones, cambios de código, cambios de infraestructura

## Archivos Revisados en Modo Lectura

### Documentación
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`
- `docs/qa/PHASE2S9C_BINARY_IMAGE_IMPORT_LOCAL_QA.md`
- `docs/qa/PHASE2S9D_BINARY_IMAGE_IMPORT_STAGING_SMOKE_QA.md`
- `docs/qa/PHASE2S8A_PUBLIC_IMAGE_URL_POLICY_QA.md`
- `docs/qa/PHASE2S8B_STOREFRONT_SAFE_IMAGE_RENDER_QA.md`
- `docs/qa/PHASE2S8D_AWS_S3_CLOUDFRONT_IMAGE_UPLOAD_QA.md`

### Backend
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommerceProductImageBinaryService.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommercePrimaryImageBinaryImportApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommercePrimaryImageUrlImportApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommerceImageStorageProperties.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/PublicImageUrlPolicy.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/StorefrontProductCatalogApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/dto/storefront/StorefrontImageResult.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/infrastructure/storage/S3EcommerceImageStorageAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/infrastructure/imports/ZipEcommercePrimaryImageBinaryArchiveAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/domain/port/EcommerceImageStoragePort.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/domain/model/ProductAsset.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/infrastructure/persistence/ProductAssetEntity.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/adapter/rest/EcommercePrimaryImageBinaryImportController.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/adapter/rest/storefront/StorefrontCatalogController.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/adapter/dto/storefront/PublicImageResponse.java`
- `backend/src/main/resources/application.yaml`

### Frontend
- `frontend/src/app/features/ecommerce-admin/primary-image-binary-import-page.component.ts`
- `frontend/src/app/features/ecommerce-admin/data/ecommerce-admin.models.ts`

### Storefront
- `storefront/next.config.ts`
- `storefront/.env.local.example`
- `storefront/lib/images.ts`
- `storefront/components/ui/product-image-frame.tsx`
- `storefront/components/catalog/product-card.tsx`
- `storefront/app/productos/[slug]/page.tsx`
- `storefront/types/storefront.ts`

### Tests
- `backend/src/test/java/com/erppos/backend/integration/EcommercePrimaryImageBinaryImportIntegrationTest.java`
- `backend/src/test/java/com/erppos/backend/erp/ecommerce/EcommerceCatalogApplicationServiceTest.java`

### Configuración
- `docker-compose.yml`

## Decisiones Aprobadas

### 2S.10B: Aceptar WebP (Próxima Fase)
- **Objetivo**: Aceptar JPEG/PNG/WebP con validación real, sin conversión
- **Formatos**: JPEG, PNG, WebP
- **Validación**: Firma binaria + extensión + MIME declarado + peso + dimensiones + checksum
- **WebP firma**: `RIFF....WEBP` (4 bytes RIFF, 4 bytes tamaño, 4 bytes WEBP)
- **Dimensiones WebP**: Requiere parser WebP mínimo o dependencia explícita
- **Content-Type**: `image/webp` para WebP
- **storageKey**: Extensión `.webp` para WebP
- **No convertir**: Mantener formato original del proveedor
- **DB**: No requiere cambio
- **Storefront**: Probablemente no requiere cambio

### 2S.10C: Derivados WebP (Fase Posterior)
- **Objetivo**: Conservar original y generar derivado WebP optimizado
- **Entrada**: Imagen original (JPEG/PNG/WebP)
- **Salida**: Original preservado + derivado WebP
- **DB**: Requiere cambio (columnas o tabla de variantes)
- **Storefront**: Requiere cambio si se expone derivado preferente

### 2S.10D: Responsive + AVIF + Caché Avanzada (Fase Final)
- **Objetivo**: Responsive images, AVIF y estrategia avanzada de caché
- **Entrada**: Imagen original
- **Salida**: Múltiples variantes por tamaño/formato
- **DB**: Requiere modelo de variantes
- **Storefront**: Requiere cambios en tipos públicos, componentes, SEO/OG
- **Responsive**: `srcSet` con múltiples resoluciones
- **AVIF**: Formato moderno con mejor compresión
- **Caché**: Estrategia avanzada (stale-while-revalidate, CDN invalidation)

### Decisiones Clave
- **No descargar imágenes remotas en URL import**: Seguridad, performance, atomicidad
- **No convertir imágenes en 2S.10B**: Mantener trazabilidad, evitar pérdida de calidad
- **Dejar derivados WebP para 2S.10C**: Requiere pipeline de procesamiento
- **Dejar AVIF/responsive/caché avanzada para 2S.10D**: Mayor complejidad, requiere contrato nuevo

## Riesgos Identificados

### WebP en 2S.10B
- **Problema**: Java `ImageIO` no lee WebP estándar de forma confiable
- **Solución**: Parser WebP mínimo o dependencia explícita y testeada
- **Riesgo**: Si no se resuelve, no se puede validar dimensiones WebP
- **Mitigación**: Resolver antes de aceptar WebP en 2S.10B

### Objetos S3 Orphan
- **Problema**: Al reemplazar imagen, objeto S3 anterior puede quedar orphan
- **Solución**: Fase posterior separada para limpieza segura
- **Riesgo**: Costo S3 acumulado, confusión operativa
- **Mitigación**: No borrar manualmente sin fase explícita

### Atomicidad S3/DB
- **Problema**: Upload S3 exitoso pero guardado DB falla
- **Solución**: Cleanup best-effort del objeto S3 recién subido
- **Riesgo**: Si cleanup falla, objeto orphan
- **Mitigación**: Monitoreo y limpieza posterior

## Criterio de Cierre

- **Documentación creada**: `docs/ecommerce/ECOMMERCE_IMAGE_POLICY.md`
- **QA creado**: `docs/qa/PHASE2S10A_IMAGE_POLICY_PLAN_QA.md`
- **Decisiones documentadas**: 2S.10B, 2S.10C, 2S.10D
- **Riesgos identificados**: WebP, orphan S3, atomicidad
- **Orden de ejecución definido**: 2S.10B → 2S.10C → 2S.10D → limpieza orphan
- **No se implementó código**: Solo planificación
- **No se modificó infraestructura**: Solo lectura

## Siguiente Fase Recomendada

### 2S.10B Plan Mode (Antes de Build)
- **Objetivo**: Plan detallado de implementación WebP en 2S.10B
- **Alcance**: Parser WebP, validación dimensiones, tests, smoke staging
- **Riesgo crítico**: Resolver validación de dimensiones WebP antes de implementar
- **Entregables**: Plan de implementación, lista de archivos a modificar, tests a agregar
- **Criterio de avance**: Plan aprobado, riesgo WebP resuelto o mitigado

### 2S.10B Build (Después de Plan)
- **Objetivo**: Implementar WebP passthrough con validación real
- **Alcance**: Backend validation, imports ZIP, manual upload, Angular mensajes, tests
- **Validaciones**: Preview WebP OK, confirm WebP OK, SVG/GIF/AVIF rechazados
- **Evidencia QA**: Backend tests + frontend build + staging smoke 1 SKU WebP
- **Cierre**: WebP sube a S3, CDN responde `image/webp`, Storefront renderiza imagen

## Referencias

- **ECOMMERCE_IMAGE_POLICY.md**: Política unificada de imágenes
- **2S.9D**: Staging smoke de importación binaria (cerrado)
- **2S.8A**: Política de URL pública
- **2S.8B**: Storefront safe image render
- **2S.8D**: AWS S3 + CloudFront image upload
