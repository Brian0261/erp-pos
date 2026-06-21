# Phase 2S.10C-E3 Local Public API QA

## Objetivo

Validar localmente que la API publica ecommerce devuelve correctamente la URL WebP preferida cuando existe variante valida y mantiene fallback seguro al original cuando no existe.

## Commit Base

- `b054487 feat(ecommerce): prefer WebP variant in public image response`

## Endpoints Publicos

- `GET /api/v1/storefront/catalog/products`
- `GET /api/v1/storefront/catalog/products/{slug}`

## Regla de Preferencia

1. Se identifica el `ProductAsset` primario activo vigente.
2. Si existe `ProductAssetVariant` asociada a ese mismo `ProductAsset` con:
   - `variant_kind = PRIMARY_OPTIMIZED_WEBP`
   - `active = true`
   - `preferred = true`
   - `asset_url` no null/no blank
3. Entonces `primaryImage.url` devuelve `ProductAssetVariant.assetUrl`.
4. Si no existe variante valida, `primaryImage.url` devuelve `ProductAsset.assetUrl` original.
5. `altText`, `type` y `displayOrder` siguen saliendo del `ProductAsset` original.

## Fallback al Original

Cuando no existe variante valida, la API publica devuelve la URL del `ProductAsset` original sin errores ni cambios de contrato.

## Listado y Detalle

Ambos endpoints aplican la misma regla de seleccion de URL:
- Listado: `GET /api/v1/storefront/catalog/products`
- Detalle: `GET /api/v1/storefront/catalog/products/{slug}`

## Contrato Publico sin Cambios

`PublicImageResponse` mantiene solo:
- `url`
- `altText`
- `type`
- `displayOrder`

No se exponen:
- `variants`
- `mimeType`
- `width`
- `height`
- `srcset`
- `sizes`
- metadata adicional

## Pruebas Ejecutadas

### Tests Focalizados E2 + Regresion E1/D1/D2

```powershell
.\mvnw.cmd "-Dtest=StorefrontPublicProductsIntegrationTest,EcommercePrimaryImageUrlImportIntegrationTest,EcommerceCatalogApplicationServiceTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest,ProductAssetVariantPersistenceIntegrationTest,EcommercePrimaryImageBinaryImportIntegrationTest" test
```

Resultado:
```
Tests run: 103, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Backend Completo

```powershell
.\mvnw.cmd test
```

Resultado:
```
Tests run: 449, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Casos Validados

1. **Producto con variante active/preferred valida**: devuelve URL WebP en listado y detalle.
2. **Producto sin variante**: devuelve URL original en listado y detalle.
3. **Variante inactive**: se ignora y devuelve original.
4. **Variante preferred=false**: se ignora y devuelve original.
5. **Variante asociada a otro ProductAsset**: se ignora y devuelve original.
6. **Variante stale despues de reemplazo URL-only**: no se devuelve.
7. **Contrato publico**: mantiene solo 4 campos sin metadata adicional.

## Resultado

**PASS**

Todos los casos validados correctamente.

## Riesgos Residuales Antes de Staging

- Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
- Cache CDN/Next/Image puede retrasar visibilidad de cambios de URL en ambientes reales.
- `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- No se ha validado con data real de productos en staging.

## Restricciones Cumplidas

- No se modifico `storefront/`.
- No se modifico contrato publico Storefront.
- No se modifico Admin UI.
- No se toco staging, deploy, Caddy, DNS, AWS/S3/CloudFront/IAM ni secretos.
- No se modificaron `.env`, Dockerfile ni `docker-compose.yml`.
- No se implemento AVIF, responsive images ni `srcset`.
- Solo cambios documentales en E3.

## Conclusion

La API publica ecommerce esta lista para servir WebP optimizado con fallback seguro al original. El contrato publico se mantiene estable y todos los casos criticos estan cubiertos por tests de integracion. Listo para staging smoke cuando se autorice.
