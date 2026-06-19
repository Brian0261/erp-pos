# Política Unificada de Imágenes Ecommerce

## Estado Actual

### Formatos Soportados
- **JPEG** (`.jpg`, `.jpeg`)
- **PNG** (`.png`)
- **WebP**: No soportado todavía (pendiente 2S.10B)

### Validación Actual
- **Firma binaria**: JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`)
- **Extensión**: Debe coincidir con contenido real
- **MIME declarado**: Si existe, debe coincidir con contenido detectado
- **Peso máximo**: Configurable via `ECOMMERCE_IMAGE_MAX_SIZE_BYTES` (default: 5 MiB)
- **Dimensiones máximas**: Configurable via `ECOMMERCE_IMAGE_MAX_WIDTH/HEIGHT` (default: 6000x6000)
- **Checksum**: SHA-256 obligatorio para uploads/storage
- **Dimensiones reales**: Lectura via `ImageIO.read()` (solo JPEG/PNG)

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
- **Content-Type**: `image/jpeg`, `image/png` según contenido detectado
- **Cache-Control**: `public, max-age=31536000, immutable`
- **Metadata S3**: `checksum-sha256`
- **storageKey**: `{prefix}/ecommerce/products/{productId}/profiles/{profileId}/main/{slug}-{sha256-12}.{ext}`
- **DB**: `ecommerce_product_assets` con columnas: `storage_provider`, `storage_bucket`, `storage_key`, `mime_type`, `width`, `height`, `size_bytes`, `checksum_sha256`, `original_filename`

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

### 2S.10B: Aceptar WebP (Próxima Fase)
- **Objetivo**: Aceptar JPEG/PNG/WebP con validación real, sin conversión
- **Formatos**: JPEG, PNG, WebP
- **Validación**: Firma binaria + extensión + MIME declarado + peso + dimensiones + checksum
- **WebP firma**: `RIFF....WEBP` (4 bytes RIFF, 4 bytes tamaño, 4 bytes WEBP)
- **Dimensiones WebP**: Requiere parser WebP mínimo o dependencia explícita (ImageIO estándar no confiable)
- **Content-Type**: `image/webp` para WebP
- **storageKey**: Extensión `.webp` para WebP
- **No convertir**: Mantener formato original del proveedor
- **DB**: No requiere cambio (solo `mimeType=image/webp` y `storageKey` `.webp`)
- **Storefront**: Probablemente no requiere cambio si `next/image` acepta WebP y dominio está allowlisted

### 2S.10C: Derivados WebP (Fase Posterior)
- **Objetivo**: Conservar original y generar derivado WebP optimizado
- **Entrada**: Imagen original (JPEG/PNG/WebP)
- **Salida**: Original preservado + derivado WebP
- **DB**: Requiere cambio (columnas para `optimized_asset_url`, `optimized_storage_key`, `optimized_mime_type`, `optimized_width`, `optimized_height`, `optimized_size_bytes`, `optimized_checksum_sha256` o tabla `ecommerce_product_asset_variants`)
- **Storefront**: Requiere cambio si se expone derivado preferente o variantes
- **Riesgos**: Calidad, CPU/memoria, orphan cleanup, atomicidad S3/DB

### 2S.10D: Responsive + AVIF + Caché Avanzada (Fase Final)
- **Objetivo**: Responsive images, AVIF y estrategia avanzada de caché
- **Entrada**: Imagen original
- **Salida**: Múltiples variantes por tamaño/formato (WebP, AVIF, JPEG fallback)
- **DB**: Requiere modelo de variantes si no se hizo en 2S.10C
- **Storefront**: Requiere cambios en tipos públicos, `ProductImageFrame`, SEO/OG, `next/image` config
- **Responsive**: `srcSet` con múltiples resoluciones
- **AVIF**: Formato moderno con mejor compresión (requiere soporte backend)
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
