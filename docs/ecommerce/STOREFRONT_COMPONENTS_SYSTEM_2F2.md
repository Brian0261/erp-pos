# Storefront Components System - Fase 2F.2

## Estado

Documentación técnica del sistema de componentes visuales de la Storefront pública InkToy. Cubre fases 2F.2A (foundations + UI base), 2F.2B (layout) y 2F.2C (catálogo). No implementa páginas reales ni consume API.

## Objetivo

Registrar el inventario completo de componentes Next.js/Tailwind implementados hasta Fase 2F.2C, sus props, responsabilidades, restricciones y deudas técnicas para trazabilidad antes de integrar datos reales (2F.3).

## Alcance

### Dentro de alcance

- Componentes UI base: Button, Badge, Chip, Breadcrumbs, SectionHeading, ProductImageFrame, Accordion.
- Componentes de layout: StorefrontHeader, StorefrontFooter, BottomNavigation.
- Componentes de catálogo: ProductCard, CategoryCard, EmptyState, StickyProductCTA.
- Preview técnico en `storefront/app/page.tsx` con datos mock/static.
- Tokens visuales en `globals.css` (colores, tipografías, sombras, bordes).
- Server Components por defecto; Client Components solo cuando hay interacción estricta.

### Fuera de alcance

- Páginas reales `/productos`, `/productos/[slug]`, `/categorias`, `/categorias/[slug]`.
- Consumo real de Storefront API.
- Checkout, carrito, pagos, pedidos, delivery.
- Login, perfil de cliente, panel administrativo.
- Merchant Center, funciones internas del ERP.
- `sitemap.xml` real.

## Inventario de componentes

### 2F.2A — Foundations y UI base

| Componente | Archivo | Tipo | Responsabilidad |
|------------|---------|------|-----------------|
| Button | `components/ui/button.tsx` | Server/Client | Botón primario/secundario/ghost con variantes Tailwind. |
| Badge | `components/ui/badge.tsx` | Server/Client | Indicador visual de estado (disponible, agotado, etc.). |
| Chip | `components/ui/chip.tsx` | Client | Filtro seleccionable con estado `selected`. |
| Breadcrumbs | `components/ui/breadcrumbs.tsx` | Server/Client | Navegación jerárquica con `aria-label`. |
| SectionHeading | `components/ui/section-heading.tsx` | Server/Client | Encabezado de sección con eyebrow, título y subtítulo. |
| ProductImageFrame | `components/ui/product-image-frame.tsx` | Server/Client | Contenedor de imagen con aspect ratio estable y fallback. |
| Accordion | `components/ui/accordion.tsx` | Client | Secciones colapsables con `aria-expanded` y estado interactivo. |

### 2F.2B — Layout

| Componente | Archivo | Tipo | Responsabilidad |
|------------|---------|------|-----------------|
| StorefrontHeader | `components/layout/storefront-header.tsx` | Server/Client | Header con logo InkToy real y navegación principal. |
| StorefrontFooter | `components/layout/storefront-footer.tsx` | Server/Client | Footer con información institucional y links legales. |
| BottomNavigation | `components/layout/bottom-navigation.tsx` | Client | Barra de navegación mobile fija (Inicio, Categorías, Buscar, Tiendas). |

### 2F.2C — Catálogo

| Componente | Archivo | Tipo | Responsabilidad |
|------------|---------|------|-----------------|
| ProductCard | `components/catalog/product-card.tsx` | Server/Client | Tarjeta de producto con imagen, nombre, precio, badge y CTA. |
| CategoryCard | `components/catalog/category-card.tsx` | Server/Client | Tarjeta de categoría con imagen, nombre y descripción. |
| EmptyState | `components/catalog/empty-state.tsx` | Server/Client | Estado vacío para listados sin resultados. |
| StickyProductCTA | `components/catalog/sticky-product-cta.tsx` | Client | CTA fijo inferior para páginas de detalle de producto. |

## Tokens visuales

Definidos en `storefront/app/globals.css` usando variables CSS nativas y `@theme` de Tailwind v4:

- `--ink-primary`: `#0A2540` (azul institucional)
- `--ink-accent`: `#FFD166` (amarillo)
- `--ink-alert`: `#EF476F` (rojo)
- `--ink-cream`: `#F9F7F3` (fondo general)
- `--ink-white`: `#FFFFFF`
- `--ink-border`, `--ink-text`, `--ink-text-muted`, `--ink-success`
- Fuentes: `--font-heading` (Fraunces), `--font-body` (DM Sans)

## Preview técnico en `/`

`storefront/app/page.tsx` es un **preview técnico temporal** que monta componentes con datos mock para validar estructura visual, responsive y accesibilidad.

- **No es** la Home real de la tienda.
- **No es** una página pública final.
- **No es** un flujo de catálogo productivo.
- **No consume** API real.
- BottomNavigation marca "Inicio" activo porque el preview vive temporalmente en `/`, no porque la Home final ya esté implementada.
- Será reemplazado por la Home real en fase posterior.

## Restricciones técnicas

- Server Components por defecto; `"use client"` solo en Accordion, Chip, BottomNavigation y StickyProductCTA.
- No `fetch(` en componentes ni páginas de esta fase.
- No referencias a `/api/v1/storefront` ni `/api/v1/ecommerce-admin` en `app/` o `components/`.
- Tailwind CSS v4 con `@theme inline`.
- Alias `@/*` configurado en `tsconfig.json`.
- No se instalaron dependencias nuevas.

## Validaciones ejecutadas

| Comando | Resultado |
|---------|-----------|
| `npm run build` | OK (compiled successfully, 0 errors) |
| `npm run lint` | OK (0 warnings) |
| `npx tsc --noEmit` | OK (0 errors) |

## Deudas no bloqueantes

1. Logo puede requerir ajuste fino de tamaño en páginas reales.
2. Placeholders visuales no son assets finales.
3. Páginas reales con BottomNavigation deben reservar padding inferior.
4. Chips requieren scroll horizontal controlado en listados largos.
5. Imágenes reales pendientes de integración con API/CDN.
6. StickyProductCTA implementado pero no montado en preview para evitar solapamiento.
7. Warning Turbopack por múltiples lockfiles (existente, no crítico).
8. ProductImageFrame/next/image requerirá configuración de patrones remotos cuando haya imágenes desde API/CDN.
9. Preview en `/` debe ser reemplazado por Home real en fase posterior.

## Siguiente paso recomendado

Abrir **2F.3A** — Alineación de tipos TypeScript/API client con DTOs públicos reales antes de implementar páginas reales de catálogo.
