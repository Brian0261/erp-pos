# Phase 2S.10C-C Asset Variants Model QA

## Objetivo

Crear el modelo persistente para registrar variantes/derivados de imagen ecommerce, preservando `ProductAsset` como imagen original y preparando una futura variante `PRIMARY_OPTIMIZED_WEBP`.

## Alcance Implementado

- Migracion Flyway aditiva `V19__ecommerce_product_asset_variants.sql`.
- Nueva tabla `ecommerce_product_asset_variants`.
- Nuevo enum `ProductAssetVariantKind` con valor inicial `PRIMARY_OPTIMIZED_WEBP`.
- Nueva entidad JPA `ProductAssetVariantEntity`.
- Nuevo repositorio JPA `ProductAssetVariantJpaRepository`.
- Tests de persistencia, constraints, consultas e integridad referencial.

## Migracion Creada

Archivo:
- `backend/src/main/resources/db/migration/V19__ecommerce_product_asset_variants.sql`

La migracion es aditiva:
- Crea una tabla nueva.
- No altera tablas existentes.
- No migra datos existentes.
- No modifica `ecommerce_product_assets`.
- No modifica `ProductAsset` ni `ProductAssetEntity`.

## Tabla

Tabla nueva:
- `ecommerce_product_asset_variants`

Columnas principales:
- `id BIGSERIAL PRIMARY KEY`
- `product_asset_id BIGINT NOT NULL`
- `variant_kind VARCHAR(40) NOT NULL`
- `asset_url VARCHAR(1000) NOT NULL`
- `storage_provider VARCHAR(30)`
- `storage_bucket VARCHAR(255)`
- `storage_key VARCHAR(1000) NOT NULL`
- `mime_type VARCHAR(100) NOT NULL`
- `width INTEGER NOT NULL`
- `height INTEGER NOT NULL`
- `size_bytes BIGINT NOT NULL`
- `checksum_sha256 VARCHAR(64) NOT NULL`
- `source_checksum_sha256 VARCHAR(64)`
- `active BOOLEAN NOT NULL DEFAULT TRUE`
- `preferred BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `created_by VARCHAR(120)`
- `updated_by VARCHAR(120)`

## Constraints

- FK `product_asset_id` hacia `ecommerce_product_assets(id)` con `ON DELETE CASCADE`.
- `variant_kind IN ('PRIMARY_OPTIMIZED_WEBP')`.
- `mime_type = 'image/webp'`.
- `width > 0`.
- `height > 0`.
- `size_bytes > 0`.
- `length(checksum_sha256) = 64`.
- `source_checksum_sha256 IS NULL OR length(source_checksum_sha256) = 64`.
- `preferred = FALSE OR active = TRUE`.

## Indices

- `idx_ecommerce_asset_variants_asset` por `product_asset_id`.
- `idx_ecommerce_asset_variants_storage_key` por `storage_key`.
- `uq_ecommerce_asset_variants_active_kind` unico parcial por `(product_asset_id, variant_kind)` donde `active = TRUE`.
- `uq_ecommerce_asset_variants_preferred_active` unico parcial por `product_asset_id` donde `active = TRUE AND preferred = TRUE`.

## Entidad y Repositorio

Entidad:
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/infrastructure/persistence/ProductAssetVariantEntity.java`

Enum:
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/domain/model/ProductAssetVariantKind.java`

Repositorio:
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/infrastructure/persistence/ProductAssetVariantJpaRepository.java`

Consultas agregadas:
- `findFirstByProductAssetIdAndVariantKindAndActiveTrue(...)`
- `findFirstByProductAssetIdAndVariantKindAndActiveTrueAndPreferredTrue(...)`

## Tests Nuevos

Archivo:
- `backend/src/test/java/com/erppos/backend/integration/ProductAssetVariantPersistenceIntegrationTest.java`

Cobertura:
- La aplicacion levanta con Flyway V19.
- La tabla e indices existen en PostgreSQL real.
- Se persiste una variante valida `PRIMARY_OPTIMIZED_WEBP`.
- Se rechaza `mime_type` distinto de `image/webp`.
- Se rechazan `width`, `height` y `size_bytes` invalidos.
- Se rechazan `checksum_sha256` y `source_checksum_sha256` invalidos.
- Se rechaza `preferred=true` cuando `active=false`.
- No se permite mas de una variante activa del mismo tipo por asset.
- No se permite mas de una variante preferred activa por asset.
- El repositorio consulta variante activa/preferida por `productAssetId` y `variantKind`.
- Se valida cascade delete desde `ecommerce_product_assets` hacia `ecommerce_product_asset_variants`.

## Validaciones Ejecutadas

### Test focalizado de variantes

Comando:
```powershell
.\mvnw.cmd "-Dtest=ProductAssetVariantPersistenceIntegrationTest" test
```

Resultado:
```text
Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Regresion ecommerce requerida

Comando:
```powershell
.\mvnw.cmd "-Dtest=ProductAssetVariantPersistenceIntegrationTest,WebpConversionSpikeServiceTest,EcommercePrimaryImageBinaryImportIntegrationTest,EcommerceCatalogApplicationServiceTest" test
```

Resultado:
```text
Tests run: 53, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Backend completo

Comando:
```powershell
.\mvnw.cmd test
```

Resultado:
```text
Tests run: 420, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Alcance Excluido

- No se integro conversion WebP real.
- No se generaron derivados.
- No se modificaron flujos Excel + ZIP.
- No se modifico upload manual.
- No se modifico Storefront.
- No se cambio el contrato publico Storefront.
- No se cambio `primaryImage.url`.
- No se toco S3, AWS, CloudFront, IAM ni secretos.
- No se toco staging.
- No se modifico Dockerfile ni `docker-compose.yml`.
- No se modificaron `.env` reales.
- No se cambio `webp-imageio` de `scope test` a runtime/compile.
- No se implemento AVIF, responsive images ni `srcset`.
- No se implemento cleanup masivo de objetos orphan.

## Riesgos Residuales

- La tabla existe pero aun no hay pipeline productivo que escriba variantes reales.
- Con un unico `variant_kind` inicial, la restriccion de variante activa por tipo tambien bloquea duplicados preferred del mismo tipo; el indice preferred queda preparado para futuros tipos.
- La seleccion de URL preferida para Storefront queda pendiente de una fase posterior.
- La dependencia `webp-imageio` sigue solo en `scope test` y no esta aprobada como dependencia runtime/productiva.
- La limpieza de objetos derivados orphan queda fuera de alcance.

## Conclusion

Estado: PASS.

2S.10C-C deja listo el modelo persistente de variantes para una futura `PRIMARY_OPTIMIZED_WEBP`, sin integrar conversion real ni cambiar flujos publicos/operativos existentes.
