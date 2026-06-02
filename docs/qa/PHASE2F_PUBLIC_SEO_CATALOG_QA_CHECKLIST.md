# QA Checklist - Fase 2F Public SEO Catalog MVP

## Estado

Checklist de QA para Fase 2F Public SEO Catalog MVP. Cubre desde limpieza documental hasta cierre de implementación.

## 2F.0 Limpieza documental

- [x] Duplicados heredados eliminados de `docs/ecommerce/ECOMMERCE_BACKLOG.md`.
- [x] Duplicados heredados eliminados de `docs/qa/PHASE2E_STOREFRONT_MVP_SHELL_QA_CHECKLIST.md`.
- [x] `docs/ecommerce/STOREFRONT_SEO_FIRST_STRATEGY.md` actualizado: `storefront/` ya existe, sitemap.xml real sigue diferido.
- [x] `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md` creado con subfases 2F.0 a 2F.5.
- [x] `docs/qa/PHASE2F_PUBLIC_SEO_CATALOG_QA_CHECKLIST.md` creado.
- [ ] `docs/ecommerce/ECOMMERCE_ROADMAP.md` actualizado con Fase 2F.
- [ ] `docs/ecommerce/ECOMMERCE_BACKLOG.md` actualizado con historias Fase 2F.
- [ ] `docs/ai/CURRENT_STATUS.md` actualizado con inicio Fase 2F.0.
- [ ] `docs/ai/CHANGE_CONTROL.md` actualizado con inicio Fase 2F.0.
- [ ] Consistencia cruzada entre roadmap, backlog, plan, checklist, status y change control.

## 2F.1 Diseño visual con Google Stitch

- [ ] Google Stitch documentado como herramienta de diseño, no generador de código final.
- [ ] Diseños producidos: home, listado productos, detalle producto, listado categorías, detalle categoría.
- [ ] Layout general definido: header, footer, navegación.
- [ ] Componentes visuales identificados: product card, category card, badges, price block, image frame, breadcrumb.
- [ ] Paleta de colores y tipografía documentada.
- [ ] Versiones responsive: mobile, tablet, desktop.
- [ ] Estados vacíos, error, sin imagen, producto agotado diseñados.
- [ ] Diseño explícitamente sin checkout, carrito, compra online ni pagos.
- [ ] Decisiones técnicas derivadas del diseño documentadas:
  - [ ] Design tokens (colores, tipografía, spacing, radius, shadow, border).
  - [ ] Componentes Tailwind CSS base.
  - [ ] Breakpoints responsive.
  - [ ] Jerarquía semántica HTML (h1, h2, h3).
  - [ ] Reglas de imágenes (tamaños, aspect ratio, alt text, fallback).
  - [ ] Accesibilidad (contraste, foco visible, labels, landmarks, navegación teclado).
  - [ ] Core Web Vitals considerados.
  - [ ] SEO metadata, canonical, noindex en desarrollo.

## 2F.2 Componentes base Next.js/Tailwind

- [ ] Layout general implementado sin consumo de API.
- [ ] Header/footer/navegación como componentes base.
- [ ] Product card componente base.
- [ ] Category card componente base.
- [ ] Badges de disponibilidad.
- [ ] Price block.
- [ ] Image frame con fallback.
- [ ] Breadcrumb base.
- [ ] Estados vacíos y error visuales.
- [ ] Responsive mobile/tablet/desktop funcional.
- [ ] `npm run build` sin errores.
- [ ] `npm run lint` sin errores.
- [ ] `npx tsc --noEmit` sin errores.

## 2F.3 Integración real Storefront API

- [ ] `lib/api.ts` alineado con DTOs backend reales.
- [ ] Tipos TypeScript reflejan contratos públicos Java.
- [ ] Variable de entorno `STOREFRONT_API_BASE_URL` server-side.
- [ ] Página `/productos` consume `GET /api/v1/storefront/catalog/products`.
- [ ] Página `/productos/{slug}` consume `GET /api/v1/storefront/catalog/products/{slug}`.
- [ ] Página `/categorias` consume `GET /api/v1/storefront/catalog/categories`.
- [ ] Página `/categorias/{slug}` consume `GET /api/v1/storefront/catalog/categories/{slug}`.
- [ ] Fetch server-side desde Server Components.
- [ ] No se consume `/api/v1/ecommerce-admin/...`.
- [ ] No se consulta DB directamente desde Next.js.
- [ ] Manejo de errores HTTP con mensajes públicos seguros.

## 2F.4 SEO técnico inicial

- [ ] `generateMetadata` en `/productos/{slug}` usando datos backend.
- [ ] `generateMetadata` en `/categorias/{slug}` usando datos backend.
- [ ] Metadata base en layout raíz.
- [ ] Canonical URLs desde backend (`canonicalUrl`).
- [ ] Open Graph básico (title, description, image).
- [ ] `notFound()` para slug inexistente o no publicado (404 `PUBLIC_RESOURCE_NOT_FOUND`).
- [ ] `notFound()` para categoría inexistente o no publicada.
- [ ] ISR configurado con revalidate conservador.
- [ ] No se usa `generateStaticParams` obligatorio que dependa de backend en build time.
- [ ] `robots.txt` mantiene `Disallow: /`.
- [ ] Layout raíz mantiene `robots: { index: false, follow: false }`.
- [ ] Flag `STOREFRONT_INDEXING_ENABLED=false` en `.env.local.example`.
- [ ] Páginas pobres o `indexable=false` devuelven `noindex`.

## 2F.5 QA/cierre documental

- [ ] `npm run build` final sin errores.
- [ ] `npm run lint` final sin errores.
- [ ] `npx tsc --noEmit` final sin errores.
- [ ] Smoke test local: slugs válidos e inválidos.
- [ ] Smoke test local: listados vacíos y con datos.
- [ ] Smoke test local: categorías vacías y no indexables.
- [ ] `npm audit` revisado; deudas registradas.
- [ ] `git diff --check` sin errores de espacio.
- [ ] Roadmap actualizado con cierre 2F.
- [ ] Backlog actualizado con historias 2F cerradas.
- [ ] Current status actualizado con cierre 2F.
- [ ] Change control actualizado con cierre 2F.
- [ ] Deudas no bloqueantes registradas:
  - [ ] Vulnerabilidades `postcss` (si persisten).
  - [ ] Warning Turbopack por múltiples lockfiles.
  - [ ] README.md genérico.
  - [ ] SVGs default en `public/`.

## Restricciones permanentes (validar en cada subfase)

- [ ] No checkout, carrito, pagos, pedidos, stock reservado.
- [ ] No Merchant Center, delivery.
- [ ] No `sitemap.xml` real.
- [ ] No marcas públicas (`/marcas/{slug}`).
- [ ] No filtros avanzados ni sort por precio.
- [ ] No AWS/staging, Docker raíz, `.env` raíz.
- [ ] No cambios backend, Angular, Flyway/DB.
- [ ] No consumo client-side de Storefront API.
- [ ] No exposición de DTOs administrativos.

## Criterio de salida QA Fase 2F

Fase 2F queda lista para aprobación si:

1. Las páginas públicas de producto y categoría funcionan localmente.
2. Build, lint y typecheck pasan sin errores.
3. SEO técnico está presente y validado (metadata, canonical, noindex).
4. 404s y estados de error están manejados.
5. No se violaron restricciones de alcance.
6. Documentación está completa y consistente.
7. Deudas no bloqueantes están registradas.

## Recomendación QA

No avanzar a implementación de páginas reales (2F.3) sin:
1. Aprobación explícita del diseño visual (2F.1).
2. Conversión del diseño a decisiones técnicas documentadas (2F.2).
3. Confirmación de que tipos/API client están alineados con backend.
