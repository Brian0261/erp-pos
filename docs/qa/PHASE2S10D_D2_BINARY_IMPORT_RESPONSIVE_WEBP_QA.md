# QA - 2S.10D-D2 Binary Import Responsive WebP

## Objetivo

Extender la generacion de variantes `PRIMARY_RESPONSIVE_WEBP` al flujo Excel + ZIP `confirm-file`, conservando preview sin efectos secundarios, partial success por fila y contrato publico sin cambios.

## Alcance

- Flujo modificado: `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/binary-import/confirm-file`.
- Flujo no modificado: preview Excel + ZIP.
- Targets responsive: `320w`, `640w`, `960w`, `1280w`.
- Entradas responsive: JPEG y PNG del ZIP.
- WebP original: se conserva como original y no genera responsive.
- No-upscaling: si el ancho original es menor que el target, ese target se omite.

## Reglas Validadas

- `ProductAsset` sigue representando el original preservado.
- `PRIMARY_OPTIMIZED_WEBP` sigue siendo la unica variante `preferred=true`.
- `PRIMARY_RESPONSIVE_WEBP` se persiste con:
  - `format=WEBP`.
  - `purpose=RESPONSIVE`.
  - `targetWidth=320/640/960/1280` segun corresponda.
  - `sortOrder` estable.
  - `mimeType=image/webp`.
  - `active=true`.
  - `preferred=false`.
- Reemplazo por import desactiva `PRIMARY_OPTIMIZED_WEBP` y `PRIMARY_RESPONSIVE_WEBP` previas del mismo `ProductAsset`.
- No se desactivan variantes de otro `ProductAsset`.
- Preview no sube objetos, no genera variantes persistidas y no toca DB.
- Partial success se mantiene: una fila con fallo no bloquea otras filas validas.
- Cleanup best-effort por fila cubre original, optimized y responsive nuevos.
- Cleanup fallido no debe ocultar el error principal.

## Evidencia Funcional

- JPEG 1600x1200 importado por Excel + ZIP genera responsive `320w`, `640w`, `960w`, `1280w`.
- PNG transparente 800x800 genera responsive `320w`, `640w` y respeta no-upscaling.
- Imagen pequena no genera responsive y la fila se importa correctamente.
- WebP original no genera responsive y conserva comportamiento anterior.
- Fallo de storage responsive limpia original, optimized y responsive ya subidos para la fila fallida.
- Fallo DB tras uploads responsive limpia original, optimized y responsive nuevos.

## Tests Ejecutados

### Focalizados D2

Comando:

```powershell
.\mvnw.cmd "-Dtest=EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest" test
```

Resultado:

- `12 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

### Regresion ecommerce solicitada

Comando:

```powershell
.\mvnw.cmd "-Dtest=EcommerceCatalogApplicationServiceTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,ProductAssetVariantPersistenceIntegrationTest,StorefrontPublicProductsIntegrationTest,EcommercePrimaryImageBinaryImportIntegrationTest,EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest,EcommercePrimaryImageUrlImportIntegrationTest" test
```

Resultado:

- `115 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

### Backend completo

Comando:

```powershell
.\mvnw.cmd test
```

Resultado:

- `470 tests`, `0 failures`, `0 errors`, `BUILD SUCCESS`.

## Exclusiones Confirmadas

- No se toco Storefront.
- No se toco Admin UI.
- No se cambio `PublicImageResponse`.
- No se agregaron `srcset`, `sources` ni `sizes`.
- No se modifico API publica responsive.
- No se modifico URL import ni Admin URL upsert.
- No se implemento AVIF ni se permitio `image/avif`.
- No se toco staging, deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.

## Notas de Logs

- Stack traces por `page/size=abc` son esperados en pruebas Storefront que validan respuesta `400` ante parametros no numericos.

## Riesgos Residuales Antes De API Publica Responsive

- Calidad visual responsive requiere validacion con imagenes reales.
- `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- URL import/Admin URL upsert no generan responsive por alcance; si se habilita API publica responsive antes de una politica anti-stale completa, debe revisarse ese riesgo.
- Objetos storage anteriores pueden quedar orphan hasta fase futura de limpieza segura.

## Resultado

- PASS local.
