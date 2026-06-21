# QA - 2S.10D-D1 Manual Upload Responsive WebP

## Alcance

- Generacion productiva de variantes `PRIMARY_RESPONSIVE_WEBP` solo en upload manual ecommerce.
- Targets responsive: `320w`, `640w`, `960w`, `1280w`.
- No-upscaling: no se genera una variante si el ancho original es menor que el target.
- Entradas admitidas para responsive: JPEG y PNG.
- WebP original no genera variantes responsive.
- `PRIMARY_RESPONSIVE_WEBP` se persiste con `preferred=false`, `format=WEBP`, `purpose=RESPONSIVE`.
- `PRIMARY_OPTIMIZED_WEBP` sigue siendo la unica variante preferred para `primaryImage.url`.

## Exclusiones Confirmadas

- No se cambio `PublicImageResponse`.
- No se agregaron `srcset`, `sizes`, `sources` ni metadata responsive al contrato publico.
- No se toco Storefront ni `storefront/`.
- No se modifico Excel + ZIP ni URL import.
- No se implemento AVIF ni se permitio `image/avif`.
- No se toco staging, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.

## Evidencia Funcional

- JPEG 1000x750 por upload manual genera variantes responsive activas `320w`, `640w`, `960w` y no genera `1280w` por no-upscaling.
- JPEG pequeno 96x72 conserva comportamiento previo: original + `PRIMARY_OPTIMIZED_WEBP`, sin responsive.
- PNG transparente genera WebP responsive preservando canal alpha en pruebas unitarias.
- WebP original no genera responsive.
- Reemplazo manual desactiva variantes `PRIMARY_RESPONSIVE_WEBP` previas del mismo `ProductAsset`.
- Fallo de persistencia limpia best-effort original, optimized y responsive nuevos.
- Fallo de storage en variante limpia best-effort el original ya subido.

## Tests Ejecutados

### Focalizados iniciales

Comando:

```powershell
.\mvnw.cmd "-Dtest=EcommerceResponsiveWebpVariantGenerationServiceTest,EcommerceCatalogApplicationServiceTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest" test
```

Resultado:

- `47 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

### Regresion ecommerce focalizada

Comando:

```powershell
.\mvnw.cmd "-Dtest=EcommerceResponsiveWebpVariantGenerationServiceTest,EcommerceCatalogApplicationServiceTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,ProductAssetVariantPersistenceIntegrationTest,StorefrontPublicProductsIntegrationTest,EcommercePrimaryImageBinaryImportIntegrationTest,EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest" test
```

Resultado:

- `104 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

### Backend completo

Comando:

```powershell
.\mvnw.cmd test
```

Resultado:

- `465 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

## Notas de Logs

- Warnings `Best-effort ecommerce image cleanup failed...` esperados en pruebas que fuerzan fallo de cleanup.
- Stack traces por `page/size=abc` esperados en pruebas Storefront que validan respuesta `400` ante parametros no numericos.

## Resultado

- PASS local.
- Listo para commit de 2S.10D-D1.
