# Phase 2F.2 Storefront Components QA Checklist

## Estado

Checklist de validación técnica para Fase 2F.2 (2F.2A + 2F.2B + 2F.2C). Solo QA técnica y documentación. No implementa código funcional nuevo.

## Validaciones técnicas

### Build / Lint / Typecheck

- [x] `npm run build` pasa sin errores desde `storefront/`.
- [x] `npm run lint` pasa sin warnings ni errores.
- [x] `npx tsc --noEmit` pasa sin errores de tipo.

### Alcance Git

- [x] Solo hay cambios dentro de `storefront/` (fases anteriores) o `docs/` (esta fase).
- [x] No hay cambios en backend, Angular, Flyway/DB, Docker, `.env` raíz, secretos ni AWS/staging.
- [x] `git status --short -- . ":(exclude)docs/**"` sin salida (esta fase).
- [x] `git diff --check` sin errores de whitespace.

### No consumo de API real

- [x] No hay `fetch(` nuevo en `storefront/app` ni `storefront/components`.
- [x] No hay referencias nuevas a `/api/v1/storefront` en `app/` o `components/`.
- [x] No hay referencias a `/api/v1/ecommerce-admin` en `app/` o `components/`.
- [x] No se crearon rutas reales `/productos`, `/productos/[slug]`, `/categorias` ni `/categorias/[slug]`.

### Restricciones funcionales

- [x] No checkout.
- [x] No carrito.
- [x] No pagos.
- [x] No pedidos.
- [x] No delivery.
- [x] No login.
- [x] No perfil.
- [x] No admin.
- [x] No Merchant Center.

### Puntos técnicos

- [x] Accordion es Client Component por estado interactivo y `aria-expanded`.
- [x] StickyProductCTA no está montado en preview para evitar solapamiento con BottomNavigation.
- [x] `page.tsx` sigue siendo preview técnico con datos mock/static, no Home real.
- [x] No hay consumo de API real.
- [x] No hay rutas `/productos` ni `/categorias`.

## Componentes verificados

### 2F.2A — Foundations y UI base

| Componente | Props tipadas | Server/Client | Accesibilidad | Responsive |
|------------|---------------|---------------|---------------|------------|
| Button | OK | S/C | OK | OK |
| Badge | OK | S/C | OK | OK |
| Chip | OK | Client | OK | OK |
| Breadcrumbs | OK | S/C | OK | OK |
| SectionHeading | OK | S/C | OK | OK |
| ProductImageFrame | OK | S/C | OK | OK |
| Accordion | OK | Client | OK | OK |

### 2F.2B — Layout

| Componente | Props tipadas | Server/Client | Accesibilidad | Responsive |
|------------|---------------|---------------|---------------|------------|
| StorefrontHeader | OK | S/C | OK | OK |
| StorefrontFooter | OK | S/C | OK | OK |
| BottomNavigation | OK | Client | OK | OK |

### 2F.2C — Catálogo

| Componente | Props tipadas | Server/Client | Accesibilidad | Responsive |
|------------|---------------|---------------|---------------|------------|
| ProductCard | OK | S/C | OK | OK |
| CategoryCard | OK | S/C | OK | OK |
| EmptyState | OK | S/C | OK | OK |
| StickyProductCTA | OK | Client | OK | OK |

## Preview técnico en `/`

- [x] `storefront/app/page.tsx` documentado como preview técnico temporal.
- [x] Usa datos mock/static, no consume API.
- [x] Un único `<h1>` por página.
- [x] BottomNavigation marca "Inicio" activo (explicado en docs).
- [x] No es Home real, no es página pública final.

## Deudas registradas

- [x] Logo puede requerir ajuste fino en páginas reales.
- [x] Placeholders visuales no son assets finales.
- [x] Páginas reales con BottomNavigation deben reservar padding inferior.
- [x] Chips requieren scroll horizontal controlado.
- [x] Imágenes reales pendientes.
- [x] StickyProductCTA no montado en preview.
- [x] Warning Turbopack por múltiples lockfiles.
- [x] ProductImageFrame requerirá configuración de patrones remotos.
- [x] Preview en `/` debe ser reemplazado por Home real.

## Criterio de salida de Fase 2F.2

- [x] Build/lint/typecheck sin errores.
- [x] Documentación de componentes creada (`STOREFRONT_COMPONENTS_SYSTEM_2F2.md`).
- [x] QA checklist creado (`PHASE2F2_STOREFRONT_COMPONENTS_QA_CHECKLIST.md`).
- [x] Roadmap, backlog, MVP plan, CURRENT_STATUS y CHANGE_CONTROL actualizados.
- [x] Deudas no bloqueantes registradas.
- [x] No hay páginas reales implementadas.
- [x] No hay consumo real de API.
- [x] Solo se tocó `storefront/` (fases anteriores) y `docs/` (esta fase).

## Recomendación siguiente paso

Abrir **2F.3A** — Alineación de tipos TypeScript/API client con DTOs públicos reales antes de implementar páginas reales de catálogo.
