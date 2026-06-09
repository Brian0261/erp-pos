# Fase 2S.2B-A — Cierre QA: Alineación Visual Storefront Mobile-First de Listados

## Estado

Fase cerrada. Implementación y validación completadas.

## Objetivo

Ajustar visualmente `/productos` y `/categorias` para que se acerquen más a las capturas Stitch mobile-first, sin agregar funcionalidades nuevas.

## Alcance implementado

### Archivos modificados

- `storefront/app/productos/page.tsx`
- `storefront/app/categorias/page.tsx`
- `storefront/components/catalog/product-card.tsx`
- `storefront/components/ui/product-image-frame.tsx`

### Cambios visuales realizados

#### /productos

- Grid mobile-first de 2 columnas: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.
- Espaciado compacto: `gap-3` en mobile, `gap-4` en desktop.

#### ProductCard

- Padding reducido: `p-2.5` en mobile, `p-3` en tablet+.
- Textos más compactos:
  - marca: `text-xs` en mobile, `text-sm` en tablet+;
  - nombre: `text-sm` en mobile, `text-base` en tablet+;
  - precio: `text-lg` en mobile, `text-xl` en tablet+.
- Nombre limitado visualmente a 2 líneas con `line-clamp-2`.
- Botón "Ver detalle" con `size="sm"` y `text-xs` en mobile.
- Layout responsive: precio y badge en columna en mobile, fila en tablet+.

#### ProductImageFrame

- Fallback más de marca:
  - gradiente suave de fondo;
  - círculo "IT" con sombra;
  - texto: "Imagen InkToy proximamente";
  - mejor escala para cards de 2 columnas.

#### /categorias

- Cards tipo fila comercial:
  - bloque visual lateral (42% ancho en mobile, 1.2fr en tablet+);
  - contenido (58% ancho en mobile, 0.8fr en tablet+);
  - nombre destacado;
  - descripción con límite visual (`line-clamp-2`);
  - estado discreto: "Detalle proximamente".
- Sin botón "Ver categoría" ni `href="#"`.
- Espaciado compacto: `gap-3` en mobile, `gap-4` en tablet+.

## Validaciones ejecutadas

### Build y tipo

```
npm run build: OK (compiled successfully in 2.9s)
npm run lint: OK (0 warnings)
npx tsc --noEmit: OK (0 errors)
```

### Git

```
git status --short --branch: OK (4 archivos modificados)
git diff --stat: OK (4 archivos, 22 inserciones, 20 eliminaciones)
git diff --name-status: OK (4 archivos modificados)
git diff --check: OK (sin errores whitespace)
```

### Smoke HTTP

| Ruta | Status | Resultado |
|------|--------|-----------|
| `/productos` | 200 | OK — Grid 2 columnas mobile, cards compactas |
| `/categorias` | 200 | OK — Cards tipo fila, sin CTA falsa |
| `/productos/{slug}` | 200 | OK — Detalle de producto sin cambios |
| `/categorias/[slug]` | 404 | OK — Ruta no existe (esperado) |
| `/buscar` | 404 | OK — Ruta no existe (esperado) |

### Validaciones de contenido

- `/productos` contiene `grid-cols-2`: OK
- `/productos` contiene `sm:grid-cols-3`: OK
- `/productos` contiene `lg:grid-cols-4`: OK
- `/productos` contiene "Ver detalle": OK
- `/productos` contiene "Imagen InkToy proximamente": OK
- `/productos` NO contiene `/api/v1/ecommerce-admin`: OK
- `/productos` contiene `noindex`: OK
- `/categorias` contiene "Detalle proximamente": OK
- `/categorias` NO contiene "Ver categoria": OK
- `/categorias` NO contiene `/api/v1/ecommerce-admin`: OK
- `/categorias` contiene `noindex`: OK

## Confirmaciones de exclusiones

### No tocado

- [x] Backend
- [x] Angular frontend
- [x] ecommerce-admin
- [x] Contratos/DTOs
- [x] Flyway/DB
- [x] Docker
- [x] Seguridad
- [x] Endpoints
- [x] `storefront/app/productos/[slug]/page.tsx`
- [x] `robots.txt`
- [x] `noindex` global
- [x] `globals.css`
- [x] Home real
- [x] Buscador
- [x] Filtros
- [x] `/categorias/[slug]`
- [x] Carrito
- [x] Checkout
- [x] Pagos
- [x] Pedidos
- [x] Login cliente
- [x] Merchant Center
- [x] Sitemap XML
- [x] Imágenes externas
- [x] `remotePatterns`
- [x] Galería real
- [x] Productos relacionados
- [x] Navegación falsa a rutas inexistentes

## Pendiente recomendado para fase posterior

Discovery separado para categoría pública `/categorias/[slug]` y productos por categoría, que puede incluir:

- Implementación de `/categorias/[slug]` con listado de productos filtrados
- Filtros/chips por subcategoría (si existe data)
- Breadcrumbs con navegación real
- Metadata SEO específica por categoría
- Integración con productos relacionados (si backend lo expone)

## Criterio de cierre

Fase 2S.2B-A queda cerrada si:

- [x] `/productos` usa grid mobile-first de 2 columnas
- [x] `ProductCard` es compacta y legible
- [x] `ProductImageFrame` tiene fallback más de marca
- [x] `/categorias` usa cards tipo fila comerciales
- [x] No existe CTA falsa "Ver categoría" con `href="#"`
- [x] Build, lint y typecheck pasan sin errores
- [x] Smoke HTTP confirma rutas existentes y 404s esperados
- [x] No se consumen endpoints admin
- [x] robots/noindex siguen activos
- [x] No se implementaron funcionalidades fuera de alcance

## Archivos de documentación

- `docs/qa/PHASE2S2B_A_STOREFRONT_VISUAL_ALIGNMENT_QA.md` (creado)
- `docs/ai/CURRENT_STATUS.md` (actualizado)
- `docs/ai/CHANGE_CONTROL.md` (actualizado)
