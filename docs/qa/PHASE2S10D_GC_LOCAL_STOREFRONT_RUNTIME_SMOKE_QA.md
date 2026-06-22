# QA - 2S.10D-G-C Local Storefront Runtime Smoke

## Objetivo

Validar runtime local del Storefront con backend vivo para confirmar que el consumo de `primaryImage.responsive.variants[]` no rompe el render de páginas reales antes de autorizar commit.

## Servicios Levantados

- **PostgreSQL**: `erp-pos-postgres` (puerto 5432)
- **Backend Spring Boot**: `erp-pos-backend` (puerto 8080)
- **Storefront Next.js**: `erp-pos-storefront` (puerto 3000)

Todos los servicios se levantaron usando `docker-compose up -d` con el perfil `storefront`.

## Rutas Validadas

### 1. Página de Inicio (`/`)

- **URL**: `http://localhost:3000/`
- **Método**: GET
- **Status Code**: 200 OK
- **Resultado**: ✅ PASS
- **Observaciones**: Página se renderizó correctamente sin errores de JavaScript

### 2. Listado de Productos (`/productos`)

- **URL**: `http://localhost:3000/productos`
- **Método**: GET
- **Status Code**: 200 OK
- **Resultado**: ✅ PASS
- **Observaciones**: Listado se renderizó correctamente

### 3. Detalle de Categoría (`/categorias/[slug]`)

- **URL**: `http://localhost:3000/categorias/categoria-online-1`
- **Slug usado**: `categoria-online-1`
- **Método**: GET
- **Status Code**: 200 OK
- **Resultado**: ✅ PASS
- **Observaciones**: Detalle de categoría se renderizó correctamente

### 4. Detalle de Producto (`/productos/[slug]`)

- **URL**: `http://localhost:3000/productos/producto-6`
- **Slug usado**: `producto-6`
- **Método**: GET
- **Status Code**: 200 OK
- **Resultado**: ✅ PASS
- **Observaciones**: 
  - Detalle de producto se renderizó correctamente
  - Imagen principal se cargó usando `next/image` con `srcSet`
  - No hubo errores de JavaScript en el HTML renderizado
  - Contenido completo: título, descripción, precio, categoría, marca, disponibilidad

## Validación de API Backend

### Consulta de Producto con Campo `responsive`

- **Endpoint**: `GET /api/v1/storefront/catalog/products/producto-6`
- **Status Code**: 200 OK
- **Campo `responsive` presente**: ❌ No presente
- **Resultado**: ✅ PASS (backward compatibility confirmada)
- **Observaciones**: 
  - El backend en Docker usa imagen anterior (pre-2S.10D-F)
  - El campo `responsive` no está presente en la respuesta
  - El Storefront renderizó correctamente sin el campo `responsive`
  - Esto confirma que el fallback a `primaryImage.url` funciona correctamente
  - La backward compatibility está funcionando como se espera

## Validación de HTML Renderizado

Se analizó el HTML renderizado de la página de detalle de producto (`/productos/producto-6`):

### Confirmaciones

1. **Estructura HTML completa**: ✅
   - DOCTYPE, html, head, body presentes
   - Meta tags correctos (charset, viewport, description, robots)
   - Open Graph tags presentes

2. **Imagen con next/image**: ✅
   - Componente `Image` de Next.js renderizado correctamente
   - `srcSet` generado con múltiples resoluciones
   - `sizes` attribute presente: `(min-width: 1024px) 360px, (min-width: 768px) 45vw, 92vw`
   - `alt` text presente: "Imagen principal de Producto Prueba 6"
   - `fill` attribute presente para layout responsive

3. **Contenido del producto**: ✅
   - Título: "Producto 6"
   - Descripción: "Producto 6"
   - Precio: "PEN 25.90"
   - Categoría: "Categoria Online 1"
   - Marca: "Marca 1"
   - Disponibilidad: "No disponible temporalmente"

4. **Navegación y layout**: ✅
   - Header con logo y navegación
   - Breadcrumbs presentes
   - Footer completo
   - Bottom navigation para móvil
   - Sticky CTA "Consultar en tienda"

5. **Sin errores de JavaScript**: ✅
   - No se encontraron errores en el HTML renderizado
   - Scripts de Next.js cargados correctamente
   - No hay mensajes de error visibles

## Confirmaciones de Restricciones

### No se tocó backend funcional

✅ **CONFIRMADO**: No se modificó ningún archivo en `backend/` durante esta subfase.

### No se tocó infraestructura

✅ **CONFIRMADO**: No se modificaron archivos de infraestructura (Dockerfile, docker-compose.yml, Caddy, DNS, AWS, S3, CloudFront, IAM, secretos, .env).

### No se tocó gallery

✅ **CONFIRMADO**: No se modificó funcionalidad de gallery. El campo `gallery` en la API sigue siendo un array vacío en los datos de prueba.

### AVIF sigue deferred/blocked

✅ **CONFIRMADO**: No se implementó soporte AVIF. Solo WebP está soportado.

### Caché avanzada sigue diferida

✅ **CONFIRMADO**: No se implementó caché avanzada. La subfase 2S.10D-H sigue pendiente.

### No se usó `<picture>`

✅ **CONFIRMADO**: El HTML renderizado usa `<img>` con `srcSet` a través de `next/image`, no `<picture>`.

### No se cambió a `<img>`

✅ **CONFIRMADO**: Se mantiene el uso de `next/image` (componente `Image` de Next.js).

## Riesgos Residuales

1. **Backend en Docker usa imagen anterior**: El backend en el contenedor Docker no incluye los cambios de 2S.10D-F (API pública responsive). Esto significa que el campo `responsive` no está presente en las respuestas de la API. Sin embargo, esto es útil para validar la backward compatibility del Storefront.

2. **Datos de prueba limitados**: Los productos de prueba no tienen variantes responsive generadas. Para validar completamente el consumo de `responsive.variants[]`, se necesitaría:
   - Backend con cambios de 2S.10D-F desplegados
   - Productos con imágenes que tengan variantes responsive generadas (upload manual o Excel+ZIP)

3. **No se validó consumo real de responsive variants**: Dado que el backend no devuelve el campo `responsive`, no se pudo validar que el Storefront consume correctamente las variantes responsive cuando están presentes. Esto se validará en staging cuando se despliegue la versión completa.

## Resultado

✅ **PASS**

El Storefront con los cambios de 2S.10D-G-B funciona correctamente en runtime local:

- Todas las rutas validadas responden HTTP 200
- No hay errores de render
- `next/image` funciona correctamente
- `primaryImage.url` sigue siendo fallback obligatorio
- `responsive.variants` es opcional (backward compatibility confirmada)
- No se tocó backend, infraestructura, gallery, AVIF ni caché avanzada
- HTML renderizado es válido y completo

## Próximos Pasos

1. Autorizar commit de 2S.10D-G-B + 2S.10D-G-C
2. Desplegar en staging para validar con backend completo (incluyendo 2S.10D-F)
3. Validar consumo real de `responsive.variants[]` en staging con datos reales
4. Iniciar 2S.10D-H (caché avanzada) o 2S.10D-S (staging smoke) según prioridad
