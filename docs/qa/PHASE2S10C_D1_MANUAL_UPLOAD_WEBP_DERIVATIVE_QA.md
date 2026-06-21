# Phase 2S.10C-D1 Manual Upload WebP Derivative QA

## Objetivo

Generar un derivado WebP real solo para upload manual de imagen primaria ecommerce, preservando `ProductAsset` como imagen original y registrando `ProductAssetVariant` preferred solo cuando el WebP generado sea valido y pese menos que el original.

## Alcance Implementado

- Generacion runtime de WebP para JPEG/PNG usando `ImageIO` estandar y el plugin `webp-imageio`.
- Cambio de `org.sejda.imageio:webp-imageio:0.1.6` de `scope test` a `scope runtime`.
- Nuevo servicio `EcommerceWebpDerivativeGenerationService`.
- Nuevo modelo/puerto/adapter de dominio para `ProductAssetVariant`.
- Integracion exclusiva en `EcommerceCatalogApplicationService.uploadPrimaryProductAsset(...)`.
- Registro de variante `PRIMARY_OPTIMIZED_WEBP` activa y preferred si el derivado se conserva.
- Desactivacion de variante WebP activa previa del asset reemplazado.
- Cleanup best-effort de objetos recien subidos si falla upload de derivado o persistencia DB.

## Reglas Validadas

- JPEG manual puede generar derivado WebP preferred si reduce peso.
- PNG manual cuyo WebP no reduce peso descarta el derivado y no crea variante.
- WebP original no genera derivado adicional.
- `ProductAsset` sigue guardando la imagen original.
- La variante guarda `sourceChecksumSha256` del original.
- El flujo Excel + ZIP no genera derivados en D1.
- `primaryImage.url` y el contrato publico Storefront no cambian.
- Cleanup fallido se registra como warning y no oculta el error principal.

## Tests Nuevos y Actualizados

- `backend/src/test/java/com/erppos/backend/erp/ecommerce/EcommerceWebpDerivativeGenerationServiceTest.java`
- `backend/src/test/java/com/erppos/backend/erp/ecommerce/EcommerceCatalogApplicationServiceTest.java`
- `backend/src/test/java/com/erppos/backend/integration/EcommerceManualPrimaryImageUploadDerivativeIntegrationTest.java`

## Validaciones Ejecutadas

### Tests unitarios focalizados

Comando:
```powershell
.\mvnw.cmd "-Dtest=EcommerceWebpDerivativeGenerationServiceTest,EcommerceCatalogApplicationServiceTest" test
```

Resultado:
```text
BUILD SUCCESS
```

### Integracion HTTP/PostgreSQL focalizada

Comando:
```powershell
.\mvnw.cmd "-Dtest=EcommerceManualPrimaryImageUploadDerivativeIntegrationTest" test
```

Resultado:
```text
BUILD SUCCESS
```

### Regresion ecommerce requerida

Comando:
```powershell
.\mvnw.cmd "-Dtest=EcommerceWebpDerivativeGenerationServiceTest,EcommerceCatalogApplicationServiceTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,WebpConversionSpikeServiceTest,EcommercePrimaryImageBinaryImportIntegrationTest,ProductAssetVariantPersistenceIntegrationTest" test
```

Resultado:
```text
Tests run: 65, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Backend completo

Comando:
```powershell
.\mvnw.cmd test
```

Resultado:
```text
Tests run: 432, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Alcance Excluido

- No se modifico Storefront.
- No se modifico contrato publico Storefront.
- No se cambio `primaryImage.url`.
- No se modifico Excel + ZIP ni `confirm-file`.
- No se integro generacion de derivados en importacion masiva.
- No se toco Admin UI.
- No se toco staging, produccion, Caddy, DNS, AWS, S3 real, CloudFront, IAM ni secretos.
- No se modificaron `.env` reales.
- No se modifico Dockerfile ni `docker-compose.yml`.
- No se implemento AVIF, responsive images ni `srcset`.
- No se implemento limpieza masiva de objetos orphan.
- No se hizo deploy.

## Riesgos Residuales

- `webp-imageio` 0.1.6 no se mantiene activamente y usa binarios nativos embebidos.
- La calidad visual del derivado no se evalua con PSNR/SSIM.
- Imagenes reales grandes pueden requerir medicion adicional de CPU/memoria.
- La seleccion del derivado por Storefront queda fuera de D1.
- Objetos anteriores reemplazados pueden quedar orphan hasta una fase de limpieza segura.

## Conclusion

Estado: PASS.

2S.10C-D1 deja generacion real de derivado WebP solo en upload manual ecommerce, sin cambiar el contrato publico ni el flujo masivo Excel + ZIP.
