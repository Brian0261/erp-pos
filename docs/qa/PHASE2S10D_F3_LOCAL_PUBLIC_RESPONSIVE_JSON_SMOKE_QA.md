# QA - 2S.10D-F3 Local API JSON Smoke + Git Readiness

## Objetivo
Cerrar una subfase corta de QA local/API smoke y revisión Git antes de iniciar 2S.10D-G Storefront consume responsive.

## Alcance
- Revisar estado Git actual y clasificar cambios entre F y F2
- Ejecutar validación local/API smoke de respuesta JSON pública responsive
- Confirmar contrato JSON público sin campos internos
- Documentar recomendación de commit

## Estado Git

### Archivos modificados (14 archivos)

**2S.10D-F (API pública responsive):**
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/adapter/dto/storefront/PublicImageResponse.java` (17 líneas)
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/adapter/rest/storefront/StorefrontCatalogController.java` (21 líneas)
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/dto/storefront/StorefrontImageResult.java` (17 líneas)
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/StorefrontProductCatalogApplicationService.java` (26 líneas)
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/domain/model/StorefrontPublicProductDetailProjection.java` (5 líneas)
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/domain/model/StorefrontPublicProductProjection.java` (10 líneas)
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/infrastructure/persistence/StorefrontProductReadAdapter.java` (155 líneas)
- `backend/src/test/java/com/erppos/backend/integration/StorefrontPublicProductsIntegrationTest.java` (163 líneas, mezcla F y F2)

**2S.10D-F2 (anti-stale):**
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommerceCatalogApplicationService.java` (5 líneas)
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/EcommercePrimaryImageUrlImportApplicationService.java` (5 líneas)
- `backend/src/test/java/com/erppos/backend/erp/ecommerce/EcommerceCatalogApplicationServiceTest.java` (49 líneas)
- `backend/src/test/java/com/erppos/backend/integration/EcommercePrimaryImageUrlImportIntegrationTest.java` (35 líneas)

**Documentación compartida:**
- `docs/ai/CHANGE_CONTROL.md` (76 líneas)
- `docs/ai/CURRENT_STATUS.md` (73 líneas)

**Archivos nuevos:**
- `docs/qa/PHASE2S10D_F_PUBLIC_RESPONSIVE_API_QA.md`
- `docs/qa/PHASE2S10D_F2_URL_RESPONSIVE_ANTI_STALE_QA.md`

### Análisis de separación
El archivo `StorefrontPublicProductsIntegrationTest.java` contiene tests que dependen de ambos cambios (F y F2), específicamente:
- Tests de F que validan contrato JSON responsive
- Tests de F2 que validan anti-stale tras URL-only replacement
- Test `shouldNotReturnStaleVariantAfterUrlOnlyReplacement` que valida ambos aspectos

**Recomendación:** Un solo commit conjunto para F y F2, ya que:
1. StorefrontPublicProductsIntegrationTest.java tiene tests que dependen de ambos cambios
2. Los cambios de F2 son pequeños (5 líneas cada uno en los servicios)
3. Separar requeriría dividir el archivo de tests, lo cual es riesgoso

## Validación Local/API Smoke

### Tests ejecutados

**Test 1: Responsive variants en listado y detalle**
```bash
cd backend; ./mvnw.cmd test -Dtest=StorefrontPublicProductsIntegrationTest#shouldExposeResponsiveWebpVariantsInListAndDetailPrimaryImage
```
**Resultado:** PASS (1 test, 0 failures, 0 errors)

**Test 2: Anti-stale tras URL-only replacement**
```bash
cd backend; ./mvnw.cmd test -Dtest=StorefrontPublicProductsIntegrationTest#shouldNotReturnStaleVariantAfterUrlOnlyReplacement
```
**Resultado:** PASS (1 test, 0 failures, 0 errors)

**Test 3: NO_CHANGE no toca variantes**
```bash
cd backend; ./mvnw.cmd test -Dtest=EcommercePrimaryImageUrlImportIntegrationTest#confirmFileNoChangeShouldKeepExistingWebpVariantActive
```
**Resultado:** PASS (1 test, 0 failures, 0 errors)

### Evidencia de contrato JSON

Los tests validan que:

1. **primaryImage.url sigue presente y mantiene fallback:**
   - Test `shouldPreferActivePreferredWebpVariantInListAndDetailPrimaryImageUrl`: confirma preferencia de optimized WebP
   - Test `shouldFallbackToOriginalImageUrlWhenProductHasNoVariant`: confirma fallback a ProductAsset.assetUrl

2. **primaryImage.responsive.variants[] aparece cuando existen variantes válidas:**
   - Test `shouldExposeResponsiveWebpVariantsInListAndDetailPrimaryImage`: valida presencia de variants en listado y detalle
   - Test `shouldIgnoreInvalidResponsiveVariantsAndKeepPrimaryImageUrl`: valida filtrado de variantes inválidas

3. **Cada variant expone solo campos públicos:**
   ```java
   private void assertResponsiveVariant(JsonNode variant, String url, int width, int height) {
       assertEquals(url, variant.path("url").asText());
       assertEquals("image/webp", variant.path("mimeType").asText());
       assertEquals(width, variant.path("width").asInt());
       assertEquals(height, variant.path("height").asInt());
       assertEquals(4, variant.size());
       assertFalse(variant.has("productAssetId"));
       assertFalse(variant.has("storageKey"));
       assertFalse(variant.has("storageProvider"));
       assertFalse(variant.has("storageBucket"));
       assertFalse(variant.has("checksumSha256"));
       assertFalse(variant.has("sourceChecksumSha256"));
       assertFalse(variant.has("active"));
       assertFalse(variant.has("preferred"));
       assertFalse(variant.has("variantKind"));
       assertFalse(variant.has("purpose"));
       assertFalse(variant.has("sortOrder"));
       assertFalse(variant.has("createdAt"));
       assertFalse(variant.has("updatedAt"));
       assertFalse(variant.has("createdBy"));
       assertFalse(variant.has("updatedBy"));
   }
   ```

4. **No aparecen campos internos:**
   - Test `assertPublicImageContract`: valida ausencia de campos internos en primaryImage
   - Test `assertResponsiveVariant`: valida ausencia de campos internos en cada variant

5. **Listado y detalle mantienen el mismo contrato:**
   - Test `shouldExposeResponsiveWebpVariantsInListAndDetailPrimaryImage`: valida ambos endpoints

6. **Backward compatibility cuando no hay responsive variants:**
   - Test `shouldFallbackToOriginalImageUrlWhenProductHasNoVariant`: confirma que API sigue funcionando sin variants
   - Test `shouldIgnoreInvalidResponsiveVariantsAndKeepPrimaryImageUrl`: confirma que variants inválidas no rompen la respuesta

7. **Storefront actual seguiría funcionando:**
   - primaryImage.url no cambió de semántica
   - responsive es campo opcional que Storefront puede ignorar
   - No se requiere cambio en Storefront para que la API actual funcione

## Confirmaciones

- ✅ primaryImage.url sigue presente y mantiene fallback
- ✅ primaryImage.responsive.variants[] aparece cuando existen variantes válidas
- ✅ Cada variant expone solo url, mimeType, width, height
- ✅ No se exponen campos internos (productAssetId, storageKey, checksumSha256, etc.)
- ✅ Listado y detalle mantienen el mismo contrato responsive
- ✅ Cuando no hay responsive variants, la API sigue siendo backward-compatible
- ✅ Storefront actual seguiría funcionando porque primaryImage.url no cambió
- ✅ NO_CHANGE no toca variantes
- ✅ Anti-stale funciona correctamente tras URL-only replacement

## Resultado

**PASS**

## Recomendación de commit

**Un commit conjunto para F y F2**

Motivos:
1. `StorefrontPublicProductsIntegrationTest.java` tiene tests que dependen de ambos cambios
2. Los cambios de F2 son pequeños (5 líneas cada uno en los servicios)
3. Separar requeriría dividir el archivo de tests, lo cual es riesgoso
4. Ambos cambios están relacionados con el contrato público responsive

Mensaje de commit sugerido:
```
feat(ecommerce): add public responsive API and URL anti-stale

- Expose primaryImage.responsive.variants[] in public API
- Maintain primaryImage.url as mandatory fallback
- Deactivate PRIMARY_RESPONSIVE_WEBP in URL import and Admin upsert
- NO_CHANGE does not touch variants
- No internal fields exposed in JSON
- Backward compatible with existing Storefront
```

## Confirmaciones finales

- ✅ No se tocó Storefront
- ✅ No se tocó infraestructura
- ✅ No se modificó backend funcional (solo se validó)
- ✅ No se crearon migraciones
- ✅ No se implementó AVIF
- ✅ AVIF sigue deferred/blocked
- ✅ No se hizo commit, push ni tag

## Riesgos residuales antes de 2S.10D-G

1. **Storefront aún no consume responsive.variants:** El beneficio de performance queda pendiente de subfase frontend explícita
2. **Objetos storage antiguos:** No se eliminan en esta subfase
3. **webp-imageio 0.1.6:** Sigue siendo dependencia runtime no mantenida activamente
4. **AVIF:** Sigue deferred/blocked por falta de soporte ImageIO actual

## Siguiente paso

Autorizar commit conjunto de F y F2, luego iniciar 2S.10D-G Storefront consume responsive.
