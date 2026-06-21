# Política Unificada de Imágenes Ecommerce

## Estado Actual

### Formatos Soportados
- **JPEG** (`.jpg`, `.jpeg`)
- **PNG** (`.png`)
- **WebP** (`.webp`) — implementado en 2S.10B

### Validación Actual
- **Firma binaria**:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47 0D 0A 1A 0A`
  - WebP: `RIFF....WEBP` (4 bytes RIFF, 4 bytes tamaño, 4 bytes WEBP)
- **Extensión**: Debe coincidir con contenido real
- **MIME declarado**: Si existe, debe coincidir con contenido detectado
- **Peso máximo**: Configurable via `ECOMMERCE_IMAGE_MAX_SIZE_BYTES` (default: 5 MiB)
- **Dimensiones máximas**: Configurable via `ECOMMERCE_IMAGE_MAX_WIDTH/HEIGHT` (default: 6000x6000)
- **Checksum**: SHA-256 obligatorio para uploads/storage
- **Dimensiones reales**:
  - JPEG/PNG: Lectura via `ImageIO.read()`
  - WebP: Parser propio para VP8, VP8L y VP8X

### Diferencia entre URL Import y Excel + ZIP

#### URL Import (2S.8F)
- **Entrada**: URL pública (relativa o absoluta HTTPS)
- **Validación**: Solo política de URL (`PublicImageUrlPolicy`)
- **Descarga**: No descarga imagen remota
- **Metadatos**: No valida MIME, peso, dimensiones ni existencia remota
- **Uso**: Imágenes ya alojadas en CDN/almacenamiento externo

#### Excel + ZIP (2S.9A)
- **Entrada**: Archivo Excel (.xlsx) + ZIP con imágenes binarias
- **Validación**: Validación binaria completa antes de preview/confirm
- **Descarga**: Imágenes extraídas del ZIP local
- **Metadatos**: Valida firma, extensión, MIME, peso, dimensiones, checksum
- **Uso**: Subida masiva de imágenes locales

### Storage
- **Backend**: S3 vía `EcommerceImageStoragePort`
- **Content-Type**: `image/jpeg`, `image/png`, `image/webp` según contenido detectado o variante generada
- **Cache-Control**: `public, max-age=31536000, immutable`
- **Metadata S3**: `checksum-sha256`
- **storageKey**: `{prefix}/ecommerce/products/{productId}/profiles/{profileId}/main/{slug}-{sha256-12}.{ext}`
- **storageKey variante optimized**: `{prefix}/ecommerce/products/{productId}/profiles/{profileId}/variants/{slug}-{sourceSha256-12}-{derivativeSha256-12}.webp`
- **storageKey variante responsive**: `{prefix}/ecommerce/products/{productId}/profiles/{profileId}/variants/responsive/{slug}-{targetWidth}w-{sourceSha256-12}-{derivativeSha256-12}.webp`
- **DB original**: `ecommerce_product_assets` con columnas: `storage_provider`, `storage_bucket`, `storage_key`, `mime_type`, `width`, `height`, `size_bytes`, `checksum_sha256`, `original_filename`
- **DB variantes**: `ecommerce_product_asset_variants` con `variant_kind`, `format`, `purpose`, `target_width`, `sort_order`, metadata storage/checksum y flags `active/preferred`

### Storefront
- **Render**: `next/image` con validación de dominio vía `STOREFRONT_IMAGE_ALLOWED_DOMAINS`
- **Fallback**: Visual si URL no segura o no permitida
- **Contrato público**: `url`, `altText`, `type`, `displayOrder`
- **No expone**: width/height/mime/derivatives en contrato público

### Productos Publicados
- **Requisito**: Confirmación explícita para `CREATE/UPDATE`
- **Warnings**: Visibles en preview/confirm
- **Riesgo**: Cambio de imagen visible públicamente

### Fallback y Rollback
- **Fallback**: Storefront nunca renderiza URL no segura; fallback visual si URL inválida
- **Rollback**: Reimportar asset anterior o URL anterior
- **No borrar**: S3 manualmente sin fase explícita
- **Riesgo documentado**: Objetos S3 previos pueden quedar orphan al reemplazar imagen

## Política Recomendada

### 2S.10B: Aceptar WebP (Implementado y Validado)
- **Objetivo**: Aceptar JPEG/PNG/WebP con validación real, sin conversión
- **Estado**: Implementado localmente en 2S.10B, validado en staging en 2S.10B-S
- **Formatos**: JPEG, PNG, WebP
- **Validación**: Firma binaria + extensión + MIME declarado + peso + dimensiones + checksum
- **WebP firma**: `RIFF....WEBP` (4 bytes RIFF, 4 bytes tamaño, 4 bytes WEBP)
- **Dimensiones WebP**: Parser propio para VP8, VP8L y VP8X (ImageIO estándar no confiable)
- **Content-Type**: `image/webp` para WebP
- **storageKey**: Extensión `.webp` para WebP
- **No convertir**: Mantener formato original del proveedor
- **DB**: No requiere cambio (solo `mimeType=image/webp` y `storageKey` `.webp`)
- **Storefront**: No requiere cambio; `next/image` acepta WebP y dominio está allowlisted
- **Validación staging**: WebP real servido por CDN/Storefront con Content-Type correcto

### 2S.10C: Derivados WebP
- **Objetivo**: Conservar original y generar derivado WebP optimizado
- **Entrada**: Imagen original (JPEG/PNG/WebP)
- **Salida**: Original preservado + derivado WebP
- **DB**: Tabla `ecommerce_product_asset_variants` creada en 2S.10C-C para registrar derivados; `ProductAsset` sigue representando el original preservado
- **Variante inicial**: `PRIMARY_OPTIMIZED_WEBP`, limitada por constraint a `mime_type = 'image/webp'`
- **Estado 2S.10C-C**: Modelo persistente listo
- **Estado 2S.10C-D1**: Upload manual genera derivado WebP real solo para JPEG/PNG; WebP original no genera derivado adicional
- **Estado 2S.10C-D2**: Excel + ZIP `confirm-file` genera derivado WebP real con las mismas reglas que D1
- **Estado 2S.10C-E1**: URL import y Admin URL upsert desactivan variantes WebP activas previas del `ProductAsset` afectado para evitar stale variants antes de preferencia publica
- **Estado 2S.10C-E2**: API publica ecommerce prefiere `ProductAssetVariant.PRIMARY_OPTIMIZED_WEBP` active/preferred como `primaryImage.url` con fallback al `ProductAsset.assetUrl` original
- **Estado 2S.10C-S**: Staging smoke PASS; migracion V19 aplicada, upload manual genera variante WebP, CDN sirve WebP, API publica devuelve `primaryImage.url` WebP, Storefront renderiza correctamente
- **Regla D1/D2**: Registrar `ProductAssetVariant.PRIMARY_OPTIMIZED_WEBP` active/preferred solo si el WebP generado es valido y `size_bytes` es menor que el original
- **Regla E2**: `altText`, `type` y `displayOrder` siguen saliendo del `ProductAsset` original; solo cambia internamente la URL seleccionada
- **Preview Excel + ZIP**: Sin efectos secundarios; no sube storage, no genera derivados y no persiste variantes
- **URL import**: Fuera del pipeline de generacion de derivados; sigue validando solo politica de URL, pero ya desactiva variantes previas en `confirm-file` cuando aplica CREATE/UPDATE
- **Storefront**: Sin cambios de contrato en 2S.10C-E2; `primaryImage.url` puede apuntar al WebP preferido, pero no se exponen variantes ni metadata adicional
- **Riesgos**: Calidad, CPU/memoria, orphan cleanup, atomicidad S3/DB

### 2S.10D: Responsive + AVIF + Caché Avanzada (Fase Final)
- **Objetivo**: Responsive images, AVIF y estrategia avanzada de caché
- **Entrada**: Imagen original
- **Salida**: Múltiples variantes por tamaño/formato (WebP, AVIF, JPEG fallback)
- **DB**: Requiere modelo de variantes si no se hizo en 2S.10C
- **Estado 2S.10D-B**: Spike test-only PASS para WebP responsive en local y Docker/Linux; AVIF BLOQUEADO por falta de writer/reader ImageIO seguro sin tocar Dockerfile/infraestructura
- **Estado 2S.10D-C**: Modelo extendido con V20 para WebP responsive; `PRIMARY_RESPONSIVE_WEBP`, `format=WEBP`, `purpose=RESPONSIVE`, `target_width` y `sort_order` listos, sin generacion responsive todavia
- **Estado 2S.10D-D1**: Upload manual genera `PRIMARY_RESPONSIVE_WEBP` para JPEG/PNG con targets `320w`, `640w`, `960w`, `1280w`, no-upscaling y `preferred=false`; WebP original no genera responsive
- **Estado 2S.10D-D2**: Excel + ZIP `confirm-file` genera `PRIMARY_RESPONSIVE_WEBP` con las mismas reglas de D1; preview sigue sin efectos secundarios
- **Storefront**: Sin cambios en D1/D2; cambios en tipos publicos, `ProductImageFrame`, SEO/OG y `next/image` config quedan diferidos
- **Responsive API**: Sin `srcset`, `sizes`, `sources` ni metadata publica en D1/D2
- **AVIF**: Bloqueado/no apto por ahora; no se permite `image/avif`
- **Caché**: Estrategia avanzada (stale-while-revalidate, CDN invalidation)
- **Riesgos**: Complejidad alta, cache invalidation, contrato público más amplio

## Decisiones Clave

### No Descargar Imágenes Remotas en URL Import
- **Razón**: Seguridad, performance, atomicidad
- **Alternativa**: URL import solo valida política de URL, no descarga
- **Uso**: Imágenes ya deben estar alojadas en CDN/almacenamiento externo

### No Convertir Imágenes en 2S.10B
- **Razón**: Mantener trazabilidad, evitar pérdida de calidad, simplicidad
- **Alternativa**: Aceptar WebP si proveedor lo entrega, sin convertir
- **Uso**: Proveedor decide formato, backend solo valida

### Dejar Derivados WebP para 2S.10C
- **Razón**: Requiere pipeline de procesamiento, storage adicional, posible DB/contrato
- **Alternativa**: 2S.10B solo acepta WebP, 2S.10C genera derivados
- **Uso**: Separar aceptación (2S.10B) de optimización (2S.10C)

### Dejar AVIF/Responsive/Caché Avanzada para 2S.10D
- **Razón**: Mayor complejidad, requiere contrato Storefront nuevo, variantes DB
- **Alternativa**: 2S.10D después de 2S.10C
- **Uso**: Optimización avanzada solo después de tener derivados WebP

## Riesgos Técnicos

### WebP en 2S.10B
- **Problema**: Java `ImageIO` no lee WebP estándar de forma confiable
- **Solución**: Parser WebP mínimo o dependencia explícita y testeada
- **Riesgo**: Si no se resuelve, no se puede validar dimensiones WebP
- **Mitigación**: Resolver antes de aceptar WebP en 2S.10B

### Objetos S3 Orphan
- **Problema**: Al reemplazar imagen, objeto S3 anterior puede quedar orphan
- **Solución**: Fase posterior separada para limpieza segura
- **Riesgo**: Costo S3 acumulado, confusión operativa
- **Mitigación**: No borrar manualmente sin fase explícita

### Atomicidad S3/DB
- **Problema**: Upload S3 exitoso pero guardado DB falla
- **Solución**: Cleanup best-effort del objeto S3 recién subido
- **Riesgo**: Si cleanup falla, objeto orphan
- **Mitigación**: Monitoreo y limpieza posterior

## Orden de Ejecución

1. **2S.10B**: WebP passthrough con validación real y smoke staging
2. **2S.10C**: Derivados WebP conservando original, con decisión DB previa
3. **2S.10D**: Responsive images, AVIF y caché avanzada
4. **Fase posterior**: Limpieza segura de objetos orphan S3 y política de rollback operativa

## Referencias

- **2S.8A**: Política de URL pública (`PublicImageUrlPolicy`)
- **2S.8B**: Storefront safe image render (`STOREFRONT_IMAGE_ALLOWED_DOMAINS`)
- **2S.8D**: AWS S3 + CloudFront image upload (storage port, metadata DB)
- **2S.8F**: Importación masiva por URL (Excel)
- **2S.9A**: Importación masiva binaria (Excel + ZIP)
- **2S.9D**: Staging smoke de importación binaria
