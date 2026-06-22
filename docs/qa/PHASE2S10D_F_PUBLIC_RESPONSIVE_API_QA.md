# QA - 2S.10D-F Public Responsive API Backend-Only

## Objetivo

Exponer en la API publica ecommerce un contrato responsive opcional y backward-compatible para `primaryImage`, usando variantes `PRIMARY_RESPONSIVE_WEBP` ya generadas, sin requerir cambios en Storefront.

## Alcance

- API publica de listado: `GET /api/v1/storefront/catalog/products`.
- API publica de detalle: `GET /api/v1/storefront/catalog/products/{slug}`.
- Imagen cubierta: solo `primaryImage`.
- Contrato publico existente preservado:
  - `url`.
  - `altText`.
  - `type`.
  - `displayOrder`.
- Campo nuevo opcional:
  - `responsive.variants[]`.
- Campos publicos por variante:
  - `url`.
  - `mimeType`.
  - `width`.
  - `height`.

## Reglas Validadas

- `primaryImage.url` mantiene la semantica anterior:
  - prefiere `PRIMARY_OPTIMIZED_WEBP` active/preferred con URL valida;
  - fallback a `ProductAsset.assetUrl`.
- `primaryImage.url` no depende de responsive variants y no fue reemplazada por ellas.
- `responsive.variants` se agrega solo cuando hay variantes activas validas `PRIMARY_RESPONSIVE_WEBP` del mismo `ProductAsset` primario.
- Filtro de variantes publicas:
  - `active=true`.
  - `variant_kind='PRIMARY_RESPONSIVE_WEBP'`.
  - `format='WEBP'`.
  - `purpose='RESPONSIVE'`.
  - `asset_url` no blank.
  - `mime_type='image/webp'`.
  - `width > 0`.
  - `height > 0`.
  - `target_width > 0`.
- Orden publico:
  - `sort_order asc`.
  - `target_width asc` como desempate.
- Si no hay variantes responsive validas, la respuesta conserva `primaryImage.url` y `responsive` queda `null` por serializacion actual.
- Variantes responsive invalidas/blank/inactivas se ignoran sin romper `primaryImage.url`.
- Listado y detalle exponen el mismo contrato responsive para `primaryImage`.
- No se exponen campos internos en JSON publico.

## Tests Ejecutados

### Focalizados StorefrontPublicProductsIntegrationTest

Comando:

```powershell
.\mvnw.cmd "-Dtest=StorefrontPublicProductsIntegrationTest" test
```

Resultado:

- `30 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

Cobertura destacada:

- Contrato actual con `url`, `altText`, `type`, `displayOrder`.
- Preferencia de `PRIMARY_OPTIMIZED_WEBP` active/preferred en `primaryImage.url`.
- Fallback a `ProductAsset.assetUrl` sin optimized valido.
- Exposicion de `responsive.variants` en listado y detalle.
- Orden por `sortOrder` y `targetWidth`.
- Filtro de responsive `assetUrl` blank e inactivas.
- No exposicion de campos internos en imagen ni variantes publicas.
- Backward compatibility cuando no hay responsive variants.

### Regresion ecommerce relacionada

Comando:

```powershell
.\mvnw.cmd "-Dtest=StorefrontPublicProductsIntegrationTest,StorefrontPublicCategoriesIntegrationTest,StorefrontPublicSitemapIntegrationTest,ProductAssetVariantPersistenceIntegrationTest,EcommerceResponsiveWebpVariantGenerationServiceTest,EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest" test
```

Resultado:

- `81 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

### Backend completo

Comando:

```powershell
.\mvnw.cmd test
```

Resultado:

- `472 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

## Exclusiones Confirmadas

- No se toco `storefront/`.
- No se modifico generacion responsive WebP.
- No se modifico upload manual.
- No se modifico Excel + ZIP.
- No se modifico URL import.
- No se implemento responsive para gallery.
- No se agrego `sizes` desde backend.
- No se agregaron `sources`.
- No se expuso `srcSet` como contrato unico.
- No se implemento AVIF ni se permitio `image/avif`.
- No se crearon migraciones Flyway.
- No se toco staging ni deploy.
- No se toco Dockerfile, `docker-compose.yml`, Caddy, DNS, AWS/S3/CloudFront/IAM, secretos, `.env` reales ni infraestructura.

## Notas de Logs

- Stack traces por `page/size=abc` son esperados en pruebas Storefront que validan respuesta `400` ante parametros no numericos.

## Riesgos Residuales

- Storefront aun no consume `responsive.variants`; seguira usando `primaryImage.url` hasta una subfase frontend explicita.
- Payload de listado crece cuando hay variantes responsive.
- URL import/Admin URL upsert no fueron modificados por alcance; si existen responsive variants historicas activas sobre el mismo `ProductAsset`, podrian requerir una subfase anti-stale especifica.
- AVIF sigue deferred/blocked por falta de soporte ImageIO actual y por decision de roadmap.
- `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.

## Resultado

- PASS local.
