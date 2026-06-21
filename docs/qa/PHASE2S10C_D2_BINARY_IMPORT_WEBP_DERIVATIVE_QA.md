# Phase 2S.10C-D2 Binary Import WebP Derivative QA

## Objetivo

Extender la generacion real de derivado WebP al flujo Excel + ZIP `confirm-file`, conservando `ProductAsset` como imagen original y registrando `ProductAssetVariant.PRIMARY_OPTIMIZED_WEBP` preferred solo cuando el WebP generado sea valido y pese menos que el original.

## Alcance Backend-Only

- Integracion en `EcommercePrimaryImageBinaryImportApplicationService.confirmFile(...)`.
- Reutilizacion de `EcommerceWebpDerivativeGenerationService` creado en D1.
- Reutilizacion de `ProductAssetVariantRepositoryPort` y persistencia de variantes creada en 2S.10C-C/D1.
- Escritura DB por fila con `TransactionTemplate` para mantener partial success y rollback de la fila si falla DB.
- Preview sin efectos secundarios.

## Confirm-File Excel + ZIP

Para cada fila valida con accion `CREATE` o `UPDATE`:

- Se valida el original con la politica binaria existente.
- Se genera candidato WebP solo si el original es JPEG/PNG.
- No se genera derivado para WebP original.
- Se descarta el derivado si `webp.sizeBytes >= original.sizeBytes`.
- Se sube el original preservado.
- Se sube el derivado solo si fue aceptado.
- Se guarda `ProductAsset` apuntando al original.
- Se desactiva la variante activa previa `PRIMARY_OPTIMIZED_WEBP` del asset.
- Se guarda nueva `ProductAssetVariant` active/preferred si existe derivado aceptado.

## Preview Sin Efectos Secundarios

- Preview no sube archivos.
- Preview no genera derivados.
- Preview no persiste `ProductAsset`.
- Preview no persiste `ProductAssetVariant`.
- Preview solo valida e informa metadata, accion, errores y warnings.

## Reglas De Preferred

- `preferred=true` solo se guarda para variante WebP aceptada.
- La variante guarda `sourceChecksumSha256` del original.
- WebP original se conserva como `ProductAsset` original y no crea variante.
- PNG/JPEG cuyo WebP pesa igual o mas se conserva solo como original.

## Reemplazo Y Stale Variants

- Si una imagen original se reemplaza y se genera nueva variante, la variante previa queda inactiva.
- Si una imagen original se reemplaza y no se genera nueva variante, la variante previa tambien queda inactiva para evitar WebP stale.
- No se borran objetos anteriores en esta fase.

## Cleanup Por Fila

- Si falla la subida del derivado, se limpia el original nuevo.
- Si falla DB despues de subir original + derivado, se limpian ambos objetos nuevos.
- Si falla DB despues de subir solo original, se limpia el original nuevo.
- No se borran objetos anteriores.
- No se borran objetos no generados en la operacion actual.
- Si cleanup falla, se registra warning y no se oculta el error principal.

## Validaciones Ejecutadas

### Tests D2 focalizados

Comando:
```powershell
.\mvnw.cmd "-Dtest=EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest" test
```

Resultado:
```text
Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Regresion requerida D2

Comando:
```powershell
.\mvnw.cmd "-Dtest=EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,EcommercePrimaryImageBinaryImportIntegrationTest,ProductAssetVariantPersistenceIntegrationTest,WebpConversionSpikeServiceTest,EcommerceCatalogApplicationServiceTest" test
```

Resultado:
```text
Tests run: 67, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Backend completo

Comando:
```powershell
.\mvnw.cmd test
```

Resultado:
```text
Tests run: 439, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Tests Cubiertos

- Excel + ZIP confirm-file con JPEG guarda original y variante WebP preferred si reduce peso.
- Excel + ZIP confirm-file con PNG transparente preserva original y no crea variante si WebP no reduce.
- Excel + ZIP confirm-file con WebP original guarda original y no crea variante.
- Preview no sube a storage ni persiste variantes.
- Reemplazo desactiva variante previa cuando se crea nueva variante.
- Reemplazo desactiva variante previa cuando la nueva imagen no genera variante.
- Falla de storage del derivado limpia original nuevo y no bloquea otra fila valida.
- Falla DB despues de subir original + derivado limpia ambos objetos nuevos y hace rollback de asset de la fila.
- Regresion D1 upload manual sigue pasando.
- Regresion Excel + ZIP existente sigue pasando.
- Persistencia de variantes y spike WebP siguen pasando.

## Alcance Excluido

- No se modifico Storefront.
- No se modifico contrato publico Storefront.
- No se cambio `primaryImage.url`.
- No se modifico Admin UI.
- No se toco URL import.
- No se toco staging, deploy, Caddy, DNS, AWS, S3 real, CloudFront, IAM ni secretos.
- No se modificaron `.env` reales.
- No se modifico Dockerfile ni `docker-compose.yml`.
- No se implemento AVIF, responsive images ni `srcset`.
- No se implemento limpieza masiva de objetos orphan.

## Riesgos Residuales

- `webp-imageio` 0.1.6 no se mantiene activamente y usa binarios nativos embebidos.
- Imagenes grandes reales requieren medicion adicional de CPU/memoria/calidad.
- Storefront todavia no consume variantes, por lo que `primaryImage.url` sigue sirviendo el original.
- Objetos anteriores reemplazados pueden quedar orphan hasta una fase futura de limpieza segura.

## Conclusion

Estado: PASS.

2S.10C-D2 deja generacion real de derivado WebP en `confirm-file` Excel + ZIP, con preview sin efectos secundarios, partial success por fila, cleanup best-effort de objetos nuevos y sin cambios en Storefront/Admin/infraestructura.
