# QA - 2S.10D-F2 URL Responsive Anti-Stale

## Objetivo

Cerrar el riesgo anti-stale de variantes `PRIMARY_RESPONSIVE_WEBP` en flujos URL-only antes de que Storefront consuma `primaryImage.responsive.variants`.

## Alcance

- URL import ecommerce: `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file`.
- Admin URL upsert ecommerce: `PUT /api/v1/ecommerce-admin/products/{productId}/primary-asset`.
- Variantes afectadas:
  - `PRIMARY_OPTIMIZED_WEBP` mantiene comportamiento previo.
  - `PRIMARY_RESPONSIVE_WEBP` ahora tambien se desactiva cuando el asset URL-only cambia.
- NO_CHANGE conserva comportamiento previo: no toca optimized ni responsive.

## Archivos Tocados

- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommercePrimaryImageUrlImportApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommerceCatalogApplicationService.java`
- `backend/src/test/java/com/erppos/backend/integration/EcommercePrimaryImageUrlImportIntegrationTest.java`
- `backend/src/test/java/com/erppos/backend/erp/ecommerce/EcommerceCatalogApplicationServiceTest.java`
- `backend/src/test/java/com/erppos/backend/integration/StorefrontPublicProductsIntegrationTest.java`
- `docs/qa/PHASE2S10D_F2_URL_RESPONSIVE_ANTI_STALE_QA.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`

## Reglas Validadas

- URL import UPDATE desactiva `PRIMARY_OPTIMIZED_WEBP` activa del `ProductAsset` afectado.
- URL import UPDATE desactiva multiples `PRIMARY_RESPONSIVE_WEBP` activas del `ProductAsset` afectado.
- URL import no toca variantes de otro `ProductAsset`.
- URL import NO_CHANGE mantiene optimized y responsive activas.
- Admin URL upsert desactiva `PRIMARY_OPTIMIZED_WEBP` activa del `ProductAsset` afectado.
- Admin URL upsert desactiva multiples `PRIMARY_RESPONSIVE_WEBP` activas del `ProductAsset` afectado.
- API publica ya no expone `responsive.variants` stale tras Admin URL upsert; mantiene `primaryImage.url` fallback.
- Si no existen responsive variants, los flujos siguen funcionando igual.

## Tests Ejecutados

### Focalizados Anti-Stale

Comando:

```powershell
.\mvnw.cmd "-Dtest=EcommercePrimaryImageUrlImportIntegrationTest,EcommerceCatalogApplicationServiceTest,StorefrontPublicProductsIntegrationTest" test
```

Resultado:

- `82 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

### Regresion Ecommerce Relacionada

Comando:

```powershell
.\mvnw.cmd "-Dtest=EcommercePrimaryImageUrlImportIntegrationTest,EcommerceCatalogApplicationServiceTest,StorefrontPublicProductsIntegrationTest,ProductAssetVariantPersistenceIntegrationTest,EcommerceResponsiveWebpVariantGenerationServiceTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest" test
```

Resultado:

- `113 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

### Backend Completo

Comando:

```powershell
.\mvnw.cmd test
```

Resultado:

- `473 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

## Exclusiones Confirmadas

- No se toco `storefront/`.
- No se modifico contrato publico.
- No se modifico `PublicImageResponse`.
- No se modifico `StorefrontProductReadAdapter`.
- No se modifico generacion responsive WebP.
- No se modifico generacion optimized WebP.
- No se modifico upload manual.
- No se modifico Excel + ZIP confirm-file.
- No se agrego AVIF ni `image/avif`.
- No se agregaron `sizes`, `sources` ni `srcSet`.
- No se toco gallery.
- No se crearon migraciones Flyway.
- No se toco staging, deploy, Dockerfile, `docker-compose.yml`, Caddy, DNS, AWS/S3/CloudFront/IAM, secretos, `.env` reales ni infraestructura.

## Notas De Logs

- Stack traces por `page/size=abc` son esperados en pruebas Storefront que validan respuesta `400` ante parametros no numericos.

## Riesgos Residuales

- Storefront aun no consume `responsive.variants`; el beneficio de performance queda pendiente de subfase frontend explicita.
- Objetos storage antiguos asociados a variantes desactivadas no se eliminan en esta subfase.
- `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- AVIF sigue deferred/blocked.

## Resultado

- PASS local.
