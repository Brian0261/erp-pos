# Phase 2S.10C-D3 Local QA: WebP Derivatives

## Objetivo

Validar localmente que los dos flujos backend con derivados WebP (upload manual D1 + Excel/ZIP D2) funcionan correctamente antes de iniciar 2S.10C-E.

## Commits Base

- `836fd78 feat(ecommerce): generate WebP derivative for manual upload` (D1)
- `632a145 feat(ecommerce): generate WebP derivative for binary import` (D2)

## Flujos Validados

### Upload Manual (D1)

- JPEG crea `ProductAsset` original y `ProductAssetVariant` preferred si el WebP reduce peso.
- WebP original crea `ProductAsset` original y no crea variante.
- PNG crea variante solo si el WebP reduce peso.
- Reemplazo de imagen desactiva variante previa activa.

### Excel + ZIP Preview (D2)

- Preview no sube storage.
- Preview no persiste `ProductAssetVariant`.
- Preview solo valida e informa metadata, accion, errores y warnings.

### Excel + ZIP Confirm-File (D2)

- Confirm-file JPEG crea original + variante preferred si reduce.
- Confirm-file WebP crea original y no crea variante.
- Confirm-file PNG crea variante solo si reduce.
- Partial success por fila se mantiene.
- Si una fila falla, no bloquea otra válida.

## Reglas de Preferred

- `preferred=true` solo se guarda para variante WebP aceptada.
- La variante guarda `sourceChecksumSha256` del original.
- WebP original se conserva como `ProductAsset` original y no crea variante.
- PNG/JPEG cuyo WebP pesa igual o más se conserva solo como original.

## Reglas de Descarte

- Si `webp.sizeBytes >= original.sizeBytes`, el derivado se descarta.
- No se sube derivado a storage si fue descartado.
- No se persiste variante si fue descartada.

## Desactivación de Variantes Previas

- Si una imagen original se reemplaza y se genera nueva variante, la variante previa queda inactiva.
- Si una imagen original se reemplaza y no se genera nueva variante, la variante previa también queda inactiva para evitar WebP stale.
- No se borran objetos anteriores en esta fase.

## Pruebas Ejecutadas

### Tests Focalizados D1+D2

```powershell
.\mvnw.cmd "-Dtest=EcommerceWebpDerivativeGenerationServiceTest,EcommerceCatalogApplicationServiceTest,EcommerceManualPrimaryImageUploadDerivativeIntegrationTest,EcommercePrimaryImageBinaryImportIntegrationTest,ProductAssetVariantPersistenceIntegrationTest,WebpConversionSpikeServiceTest,EcommerceBinaryImportWebpDerivativeIntegrationTest,EcommerceBinaryImportWebpDerivativeFailureIntegrationTest" test
```

**Resultado:**
```
Tests run: 72, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Backend Completo

```powershell
.\mvnw.cmd test
```

**Resultado:**
```
Tests run: 439, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Resultado

**PASS**

Todos los tests focalizados y el backend completo pasan sin errores.

## Riesgos Residuales antes de 2S.10C-E

1. **URL Import fuera de alcance**: URL import todavía no genera derivados WebP. Puede requerir desactivación de variantes antes de 2S.10C-E para evitar stale variants si se reemplaza imagen vía URL.

2. **Storefront no consume variantes**: El contrato público Storefront todavía no expone variantes. `primaryImage.url` sigue sirviendo el original.

3. **webp-imageio 0.1.6**: Dependencia no mantenida activamente, con binarios nativos embebidos. Requiere validación adicional con imágenes grandes reales.

4. **Objetos orphan**: Objetos anteriores reemplazados pueden quedar orphan hasta una fase futura de limpieza segura.

5. **Cleanup best-effort**: Si cleanup falla, se registra warning pero no se oculta el error principal. Objetos pueden quedar orphan si cleanup falla.

## Restricciones Cumplidas

- No se modificó Storefront.
- No se modificó contrato público Storefront.
- No se cambió `primaryImage.url`.
- No se modificó Admin UI.
- No se tocó staging, deploy, Caddy, DNS, AWS, S3 real, CloudFront, IAM ni secretos.
- No se modificaron `.env` reales, Dockerfile ni `docker-compose.yml`.
- No se implementó AVIF, responsive images, `srcset` ni limpieza masiva de objetos orphan.
- No se inició 2S.10C-E todavía.
- Solo cambios documentales en esta fase D3.

## Conclusión

D1 y D2 conviven correctamente. Upload manual y Excel + ZIP con derivados WebP están listos para 2S.10C-E.
