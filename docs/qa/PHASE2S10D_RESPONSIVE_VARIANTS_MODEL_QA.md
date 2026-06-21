# Phase 2S.10D-C Responsive WebP Variants Model QA

## Objetivo

Extender de forma segura el modelo de `ProductAssetVariant` para permitir multiples variantes WebP responsive activas por `ProductAsset`, manteniendo compatibilidad con 2S.10C y sin cambiar API publica, Storefront ni flujos productivos de generacion.

## Alcance

- Backend modelo/persistencia.
- Migracion Flyway V20.
- Tests de persistencia/modelo y regresion ecommerce.
- Documentacion QA/estado.

## Fuera de Alcance

- No se genero WebP responsive productivo.
- No se implemento AVIF.
- No se permitio `image/avif`.
- No se agrego `srcset`, `sources` ni contrato publico responsive.
- No se modifico `PublicImageResponse`.
- No se modifico Storefront ni Admin UI.
- No se toco staging/deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.

## Migracion V20

Archivo:

- `backend/src/main/resources/db/migration/V20__ecommerce_responsive_webp_asset_variants.sql`

### Columnas Nuevas

- `format VARCHAR(20) NOT NULL`
- `purpose VARCHAR(40) NOT NULL`
- `target_width INTEGER NOT NULL`
- `sort_order INTEGER NOT NULL`

### Backfill

Para filas existentes de 2S.10C:

- `format = 'WEBP'`
- `purpose = 'PRIMARY'`
- `target_width = width`
- `sort_order = 0`

Esto preserva las variantes `PRIMARY_OPTIMIZED_WEBP` ya existentes y permite que E2 siga seleccionando el WebP preferido como `primaryImage.url`.

### Constraints

- `variant_kind IN ('PRIMARY_OPTIMIZED_WEBP', 'PRIMARY_RESPONSIVE_WEBP')`
- `mime_type = 'image/webp'`
- `format IN ('WEBP')`
- `purpose IN ('PRIMARY', 'RESPONSIVE')`
- `target_width > 0`
- `sort_order >= 0`
- `preferred = FALSE OR active = TRUE` preservado desde V19.

### Unique Indexes

Reemplazado:

- `uq_ecommerce_asset_variants_active_kind`

Nuevo:

- `uq_ecommerce_asset_variants_active_identity`
- Identidad: `(product_asset_id, variant_kind, format, purpose, target_width) WHERE active = TRUE`

Preservado:

- `uq_ecommerce_asset_variants_preferred_active`
- Mantiene solo un `preferred=true` activo por `ProductAsset`.

### Indices

- `idx_ecommerce_asset_variants_asset` preservado.
- `idx_ecommerce_asset_variants_storage_key` preservado desde V19.
- `idx_ecommerce_asset_variants_lookup` agregado para lectura por `product_asset_id`, `active`, `purpose`, `format`, `target_width`.

## Modelo Dominio y Persistencia

Cambios:

- `ProductAssetVariantKind` ahora permite `PRIMARY_OPTIMIZED_WEBP` y `PRIMARY_RESPONSIVE_WEBP`.
- Se agrego `ProductAssetVariantFormat.WEBP`.
- Se agrego `ProductAssetVariantPurpose.PRIMARY` y `RESPONSIVE`.
- `ProductAssetVariant` ahora incluye `format`, `purpose`, `targetWidth`, `sortOrder`.
- Constructor compatible mantiene defaults para llamadas 2S.10C existentes:
  - `format = WEBP`
  - `purpose = PRIMARY`
  - `targetWidth = width`
  - `sortOrder = 0`
- `ProductAssetVariantEntity` y `ProductAssetVariantMapper` mappean los nuevos campos.

## Compatibilidad 2S.10C

Validado:

- D1 upload manual sigue insertando `PRIMARY_OPTIMIZED_WEBP` como `WEBP/PRIMARY/target_width=width/sort_order=0` via constructor compatible.
- D2 Excel + ZIP sigue insertando `PRIMARY_OPTIMIZED_WEBP` con los mismos defaults.
- E1 URL import/Admin URL upsert siguen desactivando `PRIMARY_OPTIMIZED_WEBP` activa previa.
- E2 API publica sigue filtrando exclusivamente `PRIMARY_OPTIMIZED_WEBP active/preferred` para `primaryImage.url`.
- `PublicImageResponse(url, altText, type, displayOrder)` no cambio.

## Preparacion 2S.10D-D

El modelo queda listo para una fase posterior que genere `PRIMARY_RESPONSIVE_WEBP` con `purpose=RESPONSIVE` y multiples `target_width` activos por `ProductAsset`.

2S.10D-C no genera estas variantes todavia.

## AVIF

AVIF queda fuera de alcance.

- 2S.10D-B marco AVIF como BLOQUEADO/NO APTO por ahora.
- V20 mantiene `mime_type = 'image/webp'`.
- V20 mantiene `format IN ('WEBP')`.
- No se agrego `image/avif` ni `format='AVIF'`.

## Tests Ejecutados

### Persistencia V20

Comando:

```powershell
.\mvnw.cmd "-Dtest=ProductAssetVariantPersistenceIntegrationTest" test
```

Resultado:

```text
Tests run: 13, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Validaciones cubiertas:

- V20 aplica y crea columnas nuevas.
- Indices esperados existen.
- `PRIMARY_OPTIMIZED_WEBP` persiste con defaults `WEBP/PRIMARY/target_width=width/sort_order=0`.
- Multiples `PRIMARY_RESPONSIVE_WEBP` activos con distinto `target_width` son permitidos.
- Duplicado activo por identidad exacta es rechazado.
- Solo un `preferred=true` activo por `ProductAsset` se mantiene.
- Rechaza `target_width <= 0`.
- Rechaza `sort_order < 0`.
- Rechaza `format` distinto de `WEBP`.
- Rechaza `purpose` desconocido.
- Rechaza `mime_type` distinto de `image/webp`.

### Regresion Focalizada Ecommerce

Comando:

```powershell
.\mvnw.cmd "-Dtest=ProductAssetVariantPersistenceIntegrationTest,EcommerceCatalogApplicationServiceTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,EcommercePrimaryImageBinaryImportIntegrationTest,EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest,StorefrontPublicProductsIntegrationTest" test
```

Resultado:

```text
Tests run: 96, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Backend Completo

Comando:

```powershell
.\mvnw.cmd test
```

Resultado:

```text
Tests run: 457, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Resultado

**PASS**

El modelo de variantes queda preparado para WebP responsive sin romper 2S.10C, sin cambiar contrato publico y sin generar variantes responsive todavia.

## Riesgos Residuales Antes de 2S.10D-D

- 2S.10D-D debe implementar generacion real de `PRIMARY_RESPONSIVE_WEBP` sin upscaling.
- 2S.10D-D debe definir cleanup best-effort para multiples objetos nuevos por fila.
- Al comenzar a generar responsive, URL import/Admin URL upsert deberan desactivar tambien variantes responsive activas para evitar stale variants.
- Storefront y API publica aun no exponen ni consumen `srcset`/`sources`.
- Objetos storage anteriores pueden quedar orphan hasta una fase posterior de limpieza segura.
- AVIF sigue bloqueado.

## Recomendacion Siguiente

Avanzar a **2S.10D-D WebP Responsive Generation** en Build separado, manteniendo fuera de alcance API publica responsive, Storefront y AVIF.
