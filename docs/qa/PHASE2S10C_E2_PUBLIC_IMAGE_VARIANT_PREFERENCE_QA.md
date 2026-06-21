# Phase 2S.10C-E2 Public Image Variant Preference QA

## Objetivo

Validar que la API publica ecommerce use `ProductAssetVariant.PRIMARY_OPTIMIZED_WEBP` como `primaryImage.url` cuando exista una variante WebP activa/preferred valida, manteniendo fallback seguro al `ProductAsset` original.

## Regla de Seleccion

- Primero se identifica el `ProductAsset` primario activo vigente.
- Si existe una `ProductAssetVariant` asociada a ese mismo `ProductAsset` con:
  - `variant_kind = PRIMARY_OPTIMIZED_WEBP`
  - `active = true`
  - `preferred = true`
  - `asset_url` no null/no blank
- Entonces `primaryImage.url` devuelve `ProductAssetVariant.assetUrl`.
- Si no existe variante valida, `primaryImage.url` devuelve `ProductAsset.assetUrl` original.
- `altText`, `type` y `displayOrder` siguen saliendo del `ProductAsset` original.

## Flujos Publicos Validados

- Listado: `GET /api/v1/storefront/catalog/products`.
- Detalle: `GET /api/v1/storefront/catalog/products/{slug}`.

## Contrato Publico

`PublicImageResponse` no cambia:

```text
url, altText, type, displayOrder
```

No se exponen variantes, `mimeType`, `width`, `height`, `srcset` ni metadata.

## Casos Cubiertos

- Producto publicado con original + variante active/preferred devuelve WebP en listado y detalle.
- Producto sin variante devuelve original en listado y detalle.
- Variante inactive se ignora y devuelve original.
- Variante `preferred=false` se ignora y devuelve original.
- Variante asociada a otro `ProductAsset` se ignora.
- Variante con `asset_url` blank se ignora.
- Variante stale luego de reemplazo URL-only no se devuelve.
- Contrato publico de imagen conserva solo 4 campos.

## Pruebas Ejecutadas

### Tests Focalizados E2 + Regresion E1/D1/D2

```powershell
.\mvnw.cmd "-Dtest=StorefrontPublicProductsIntegrationTest,EcommercePrimaryImageUrlImportIntegrationTest,EcommerceCatalogApplicationServiceTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest,ProductAssetVariantPersistenceIntegrationTest" test
```

Resultado:

```text
Tests run: 94, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Backend Completo

```powershell
.\mvnw.cmd test
```

Resultado:

```text
Tests run: 449, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Resultado

PASS.

## Restricciones Cumplidas

- No se modifico `storefront/`.
- No se modifico contrato publico Storefront.
- No se agregaron campos a `PublicImageResponse`.
- No se modifico Admin UI.
- No se modifico generacion de derivados.
- No se modifico upload manual.
- No se modifico Excel + ZIP.
- No se modifico URL import.
- No se toco staging, deploy, Caddy, DNS, AWS/S3/CloudFront/IAM ni secretos.
- No se modificaron `.env`, Dockerfile ni `docker-compose.yml`.
- No se implemento AVIF, responsive images ni `srcset`.

## Riesgos Residuales

- Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
- Cache CDN/Next/Image puede retrasar visibilidad de cambios de URL en ambientes reales.
- `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- E2 no implementa responsive images, AVIF, `srcset` ni metadata publica de variantes.

## Conclusion

La API publica ecommerce ya prefiere WebP optimizado cuando existe variante activa/preferred valida y conserva fallback seguro al original sin cambiar el contrato publico.
