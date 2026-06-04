# Storefront Public SEO Catalog MVP Plan - Fase 2F

## Estado

Plan documental de Fase 2F.0. Define el alcance, subfases, riesgos y criterios de salida para el MVP de catálogo público SEO-first de InkToy. No implementa código funcional.

## Objetivo

Habilitar páginas públicas indexables de producto y categoría en la Storefront Next.js, manteniendo el enfoque SEO-first, server-side rendering y sin adelantar funcionalidades transaccionales.

## Alcance del MVP SEO Catalog

### Dentro de alcance

- Página pública de listado de productos (`/productos`).
- Página pública de detalle de producto (`/productos/{slug}`).
- Página pública de listado de categorías (`/categorias`).
- Página pública de detalle de categoría (`/categorias/{slug}`).
- Metadata SEO por página (title, description, canonical, Open Graph).
- Manejo de 404 para slugs inexistentes o no publicados.
- Protección de noindex en desarrollo.
- Consumo server-side de Storefront API.
- Estructura visual base con Tailwind CSS.

### Fuera de alcance

- Checkout, carrito, pagos, pedidos, stock reservado.
- Merchant Center, delivery.
- `sitemap.xml` real (diferido a fase posterior).
- Marcas públicas como páginas independientes (`/marcas/{slug}`).
- Filtros avanzados y sort por precio.
- AWS/staging, Docker raíz, `.env` raíz.
- Cambios backend, Angular, Flyway/DB.
- Consumo client-side directo de Storefront API.

## Subfases

| Subfase | Objetivo | Resultado |
|---------|----------|-----------|
| 2F.0 | Planificación SEO/catalog + limpieza documental | Docs limpias, plan 2F, checklist QA 2F, alcance Google Stitch documentado. |
| 2F.1 | Diseño visual con Google Stitch | Diseño "Catálogo Creativo Profesional" aprobado. Paleta, tipografía, componentes y restricciones documentados. |
| 2F.2 | Conversión del diseño a componentes base Next.js/Tailwind | Layout, header/footer, cards, grids y estados visuales sin API real aún. Preview técnico en `/`. IMPLEMENTADO (commits `dd8f1a3`, `1a55ec0`). |
| 2F.3 | Integración real con Storefront API | Listados y detalles de producto/categoría consumiendo endpoints públicos. |
| 2F.4 | SEO técnico inicial | `generateMetadata`, canonical, `notFound()`, noindex/indexable, ISR. |
| 2F.5 | QA/cierre documental | Build/lint/typecheck, smoke local, docs, backlog, roadmap, status, change control. |

## Google Stitch como 2F.1

Google Stitch es una herramienta de diseño visual asistido por IA. En Fase 2F.1 se utilizará para producir artefactos visuales de referencia, **no para generar código final aprobado automáticamente**.

### Entregables esperados de Google Stitch

- Home visual pública.
- Listado de productos.
- Detalle de producto.
- Listado de categorías.
- Detalle de categoría.
- Layout general (header, footer, navegación).
- Componentes visuales: product card, category card, badge de disponibilidad, price block, image frame, breadcrumb.
- Paleta de colores, tipografía y estilo visual alineado a marca InkToy.
- Versiones responsive: mobile, tablet, desktop.
- Estados vacíos, error, sin imagen y producto agotado.
- Diseño explícitamente **sin checkout, sin carrito, sin compra online, sin pagos y sin CTA transaccional**.

### Decisiones técnicas antes de codificar

Antes de pasar de 2F.1 a 2F.2, los diseños de Google Stitch deben convertirse en:

- Design tokens: colores, tipografía, spacing, radius, shadow, border, estados.
- Componentes Tailwind CSS base (sin librerías visuales nuevas).
- Estructura responsive y breakpoints.
- Jerarquía semántica HTML: un `h1` por página, `h2/h3` coherentes.
- Reglas de imágenes: tamaños, aspect ratio, alt text, fallback.
- Accesibilidad: contraste, foco visible, labels, landmarks, navegación teclado.
- Core Web Vitals: evitar JS innecesario, imágenes optimizadas, CSS razonable.
- SEO metadata: title, description, OG, canonical.
- Noindex en desarrollo: mantener `robots.txt`, metadata noindex y flag env futura.

## Rutas objetivo

| Ruta | Tipo | Descripción |
|------|------|-------------|
| `/productos` | Página estática/ISR | Listado público de productos publicados. |
| `/productos/{slug}` | Página dinámica SSG/ISR | Detalle público de producto por slug. |
| `/categorias` | Página estática/ISR | Listado público de categorías activas. |
| `/categorias/{slug}` | Página dinámica SSG/ISR | Detalle público de categoría por slug. |

## Estrategia server-side fetch

- Usar `fetchStorefront` solo desde Server Components, `generateMetadata`, helpers server-side o Route Handlers.
- No consumir `/api/v1/ecommerce-admin/...`.
- No usar fetch desde Client Components en 2F.
- Migrar hacia variable server-side `STOREFRONT_API_BASE_URL`, manteniendo `NEXT_PUBLIC_` solo si realmente se necesita exponer una URL pública no sensible.
- No consultar DB desde Next.js.

## Estrategia de noindex/dev

- Mantener `public/robots.txt` con `Disallow: /`.
- Mantener `layout.tsx` noindex global hasta que exista env de producción aprobada.
- Agregar guard server-side tipo `STOREFRONT_INDEXING_ENABLED=false` en `.env.local.example`.
- En desarrollo: forzar `robots: { index: false, follow: false }` aunque backend diga indexable.
- En producción futura: habilitar indexación solo con env explícita y dominio aprobado.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Diseño visual pesado perjudica Core Web Vitals | Limitar efectos, priorizar CSS, imágenes optimizadas y layout estable. |
| Exceso de JavaScript | Mantener Server Components por defecto y componentes cliente solo si hay interacción real. |
| Contenido SEO oculto al SSR/SSG | Renderizar nombre, descripción, precio público y categorías server-side. |
| Mala jerarquía `h1/h2` | Definir semántica por plantilla antes de codificar. |
| Baja accesibilidad | Checklist de contraste, foco, alt text y navegación teclado en 2F.2/2F.5. |
| Responsive UX deficiente | Google Stitch debe entregar mobile/tablet/desktop, no solo desktop. |
| Dependencia excesiva del diseño IA | Convertir a tokens/componentes propios, no copiar artefactos sin criterio. |
| Estilos difíciles de mantener | Tailwind con componentes base pequeños y nombres consistentes. |
| Branding genérico | Dirección visual InkToy: papelería, útiles, pasamanería, comercio local. |
| Indexación accidental dev/staging | Mantener `Disallow: /`, noindex global y flag `STOREFRONT_INDEXING_ENABLED=false`. |
| Fetch client-side innecesario | Consumir API desde Server Components/helpers server-side. |
| Build falla si backend no está disponible | No usar `generateStaticParams` obligatorio en 2F.3; usar ISR on-demand. |
| Metadata incompleta | Fallback mínimo, pero no inventar metadata crítica si backend no la entrega. |
| Cache/ISR muestra datos obsoletos | Revalidate conservador; invalidación avanzada queda posterior. |
| API expone datos de más | Consumir solo `/api/v1/storefront/...`, nunca admin. |

## Criterios de salida de Fase 2F

1. Páginas reales de producto y categoría funcionan localmente con datos de backend.
2. `npm run build`, `npm run lint` y `npx tsc --noEmit` pasan sin errores.
3. Metadata SEO presente en detalle de producto y categoría.
4. `notFound()` implementado para slugs inexistentes/no publicados.
5. `robots.txt` y layout mantienen protección de noindex en desarrollo.
6. No se consumieron endpoints administrativos.
7. No se implementó checkout, carrito, pagos, pedidos, delivery, Merchant Center ni stock reservado.
8. Documentación actualizada: roadmap, backlog, status, change control, QA checklist.
9. Deudas no bloqueantes registradas.

## Fuera de alcance explícito

- Checkout, carrito, pagos, pedidos, stock reservado.
- Merchant Center, delivery.
- `sitemap.xml` real.
- Marcas públicas (`/marcas/{slug}`).
- Filtros avanzados, sort por precio.
- AWS/staging, Docker raíz, `.env` raíz.
- Cambios backend, Angular, Flyway/DB.
- Consumo client-side de Storefront API.
