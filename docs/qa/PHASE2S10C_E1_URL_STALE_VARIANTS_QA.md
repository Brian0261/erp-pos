# Phase 2S.10C-E1 URL Stale Variants QA

## Objetivo

Evitar variantes WebP stale cuando la imagen original se reemplaza mediante flujos URL-only, antes de habilitar la preferencia publica de `ProductAssetVariant` en 2S.10C-E2.

## Alcance

- URL import `confirm-file`.
- Admin URL upsert de imagen principal.
- No se generan derivados WebP nuevos en flujos URL-only.
- No se borran objetos storage.
- No se cambia Storefront.
- No se cambia `primaryImage.url`.
- No se cambia `PublicImageResponse`.

## Flujos Corregidos

### URL Import

- `EcommercePrimaryImageUrlImportApplicationService.confirmFile(...)` ahora desactiva variantes activas `PRIMARY_OPTIMIZED_WEBP` del `ProductAsset` guardado cuando la fila aplica `CREATE` o `UPDATE`.
- `NO_CHANGE` retorna sin guardar `ProductAsset` y sin tocar variantes.
- Se mantiene partial success por fila.
- Preview no cambia y sigue sin efectos secundarios.

### Admin URL Upsert

- `EcommerceCatalogApplicationService.upsertPrimaryProductAsset(...)` ahora desactiva variantes activas `PRIMARY_OPTIMIZED_WEBP` del `ProductAsset` guardado.
- El upsert sigue guardando solo URL/metadatos del original.
- No se crea `ProductAssetVariant` nueva.

## Reglas Validadas

- Solo se desactiva la variante del `ProductAsset` afectado.
- Solo se desactiva `PRIMARY_OPTIMIZED_WEBP`.
- Una variante de otro `ProductAsset` no se desactiva.
- URL import `NO_CHANGE` no desactiva la variante existente.
- URL import `CREATE` no falla aunque no existan variantes previas.
- Upload manual D1 sigue pasando.
- Excel + ZIP D2 sigue pasando.
- El contrato Storefront no cambia.

## Pruebas Ejecutadas

### Tests Focalizados E1 + Regresion D1/D2/Storefront

```powershell
.\mvnw.cmd "-Dtest=EcommerceCatalogApplicationServiceTest,EcommercePrimaryImageUrlImportIntegrationTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest,ProductAssetVariantPersistenceIntegrationTest,StorefrontPublicProductsIntegrationTest" test
```

Resultado:

```text
Tests run: 87, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Backend Completo

```powershell
.\mvnw.cmd test
```

Resultado:

```text
Tests run: 442, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Resultado

PASS.

## Riesgos Residuales Antes de 2S.10C-E2

- Storefront todavia no consume variantes.
- `primaryImage.url` todavia devuelve el original hasta E2.
- E2 debe preferir `ProductAssetVariant` solo si pertenece al `ProductAsset` primario activo vigente.
- Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
- `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.

## Restricciones Cumplidas

- No se modifico Storefront.
- No se modifico contrato publico Storefront.
- No se cambio `primaryImage.url`.
- No se modifico Admin UI.
- No se toco staging, deploy, Caddy, DNS, AWS/S3/CloudFront/IAM ni secretos.
- No se modificaron `.env`, Dockerfile ni `docker-compose.yml`.
- No se implemento AVIF, responsive images ni `srcset`.
- No se inicio 2S.10C-E2.

## Conclusion

2S.10C-E1 elimina el riesgo anti-stale conocido para flujos URL-only. El backend queda listo para disenar e implementar 2S.10C-E2, donde la API publica podra preferir variantes WebP con fallback seguro al original.
