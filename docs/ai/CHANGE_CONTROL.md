# Change Control - InkToy ERP/POS

## Objetivo

Estandarizar cambios tecnicos para reducir regresiones y mantener trazabilidad en etapa pre-piloto.

## Control ecommerce SEO-first

### Cierre Fase 0 documental ecommerce

- ECOM-ADR-001 al ECOM-ADR-019 estan aprobados como base de arquitectura ecommerce SEO-first.
- `docs/ecommerce/PRELIMINARY_ECOMMERCE_CONTRACTS.md` queda aprobado como contrato preliminar ecommerce.
- `docs/qa/PHASE0_ECOMMERCE_VALIDATION_CHECKLIST.md` queda revisado/cerrado mediante evidencia documental.
- La proxima fase autorizada para preparar es Fase 1 - Catalogo online base en ERP/POS.

### Reglas para Fase 1A

- Fase 1A es documental/tecnica y no funcional.
- No tocar backend, frontend funcional, DB/Flyway, endpoints, Docker, `.env`, secretos, AWS/staging ni dependencias.
- No crear tienda Next.js, Storefront API publica, checkout, carrito real, Mercado Pago, facturacion automatica ecommerce, delivery real ni Merchant Center real.
- No modificar POS, inventario, ventas, caja ni facturacion durante Fase 1A.
- Cualquier Fase 1B que requiera persistencia, Flyway o endpoints administrativos internos exige aprobacion humana explicita antes de implementar.

### Cierre Fase 1A.2 documental

- Se aprobaron las decisiones humanas pendientes para Fase 1: producto sin marca, categoria online, assets, namespace administrativo, permisos iniciales, Flyway, categoria SEO separada y bloqueo de slug en productos publicados.
- Se reforzaron lineamientos UX/UI para la administracion ecommerce en Angular interno: tablas, filtros, badges/chips, formularios, confirmaciones, mensajes, estados vacios, errores y responsive.
- Se reforzo QA documental para evitar N+1 y para confirmar que Angular no duplica logica critica de negocio.
- No se toco codigo funcional, backend, frontend funcional, DB/Flyway, endpoints, AWS/staging, Docker, dependencias ni secretos.
- El siguiente paso es preparar commit documental; despues de ese cierre, abrir Fase 1B con aprobacion explicita si el negocio confirma el alcance.

### Cierre Fase 1C ecommerce admin interno

- Se completaron y pushearon las subfases Fase 1C.1, Fase 1C.2 y el polish visual final del modulo ecommerce admin interno.
- Alcance cerrado: perfiles online, detalle/editor de perfil, checklist backend, precio efectivo readonly, publish/unpublish solo ADMIN, marcas ecommerce y categorias online.
- RBAC ADMIN/SUPERVISOR validado; roles no autorizados sin acceso a navegacion ni rutas protegidas.
- Manejo de errores 400/401/403/404/409/422 validado en la interfaz.
- Build frontend exitoso y QA manual ligero sin bloqueantes conocidos.
- No se modificaron backend, Flyway/DB, endpoints ni modulos protegidos durante el cierre documental.

### Inicio Fase 2A Storefront SEO-first Discovery & Contracts

- Tipo: documentacion y planificacion.
- Alcance: roadmap ecommerce, backlog inicial, estrategia SEO-first, contratos publicos draft y checklist QA documental.
- Decisiones cerradas registradas: base path draft `/api/v1/storefront/...`, API publica inicial read-only, DTOs publicos separados de DTOs admin, no reutilizar `/api/v1/ecommerce-admin/...` como contrato publico, ERP/POS como fuente de verdad.
- Decisiones pendientes documentadas: marcas publicas en MVP o fase posterior, estrategia final SSR/SSG/ISR, politica de productos agotados, sitemap como endpoint JSON o generacion directa, estructura final Next.js, schema.org avanzado y Merchant Center.
- Restriccion operativa: sin codigo funcional, sin endpoints, sin frontend publico, sin backend, sin DB/Flyway, sin AWS/staging y sin commit/push en esta fase.

### Cierre Fase 2C implementacion backend read-only

- Tipo: implementacion backend funcional + cierre documental QA.
- Base: Fase 2B cerrada con diseno contractual de Public Catalog API.
- Commits incluidos:
  - `3236e02 feat(storefront): add public API security baseline`
  - `d247106 feat(storefront): add public products listing`
  - `65a2921 feat(storefront): add public product detail by slug`
  - `4c6e1c6 feat(storefront): add public categories listing`
  - `abc4809 feat(storefront): add public category detail by slug`
  - `d5ab5ea feat(storefront): add public sitemap JSON source`
- Alcance real implementado:
  - `GET /api/v1/storefront/catalog/products` — listado publico paginado de productos publicados.
  - `GET /api/v1/storefront/catalog/products/{slug}` — detalle publico de producto por slug.
  - `GET /api/v1/storefront/catalog/categories` — listado publico de categorias online activas.
  - `GET /api/v1/storefront/catalog/categories/{slug}` — detalle publico de categoria por slug.
  - `GET /api/v1/storefront/seo/sitemap` — fuente JSON para sitemap futuro (no es sitemap.xml real).
- Arquitectura: hexagonal estricta (controllers, DTOs publicos separados, use cases, ports, adapters, proyecciones de dominio).
- Tests focalizados: 52 tests, 0 failures, BUILD SUCCESS.
  - `StorefrontPublicProductsIntegrationTest`
  - `StorefrontPublicCategoriesIntegrationTest`
  - `StorefrontPublicSitemapIntegrationTest`
  - `AuthRbacCorsIntegrationTest`
  - `SecurityConfigTest`
- Exclusiones confirmadas:
  - No se implemento sitemap.xml real.
  - No se implemento Next.js ni Storefront publica.
  - No se implementaron filtros categorySlug.
  - No se implementaron marcas publicas.
  - No se implemento checkout, pagos, delivery, Merchant Center, pedidos online ni stock reservado.
  - No se toco frontend Angular, Flyway/DB, Docker, `.env`, secretos, dependencias, POS, ventas, caja, facturacion ni inventario.
- QA focalizada: tests de integracion focalizados aprobados (52/52, BUILD SUCCESS).
- Deuda QA conocida: `mvn test` completo falla por deuda preexistente no relacionada:
  - `ProductCleanupPreviewIntegrationTest.shouldBlockExecuteWhenElectronicDocumentExistsAndKeepDataUnchanged`
  - `DuplicateKey` en `billing_series / uq_billing_series_doc_type_environment_active`
  - No corregida en esta fase; pendiente prioritaria antes de avanzar a fases mayores.
- Separacion admin/public mantenida: `/api/v1/ecommerce-admin/...` protegido, `/api/v1/storefront/...` publico read-only.
- Archivos documentales actualizados en cierre 2C.5:
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
  - `docs/qa/PHASE2_PUBLIC_CATALOG_API_DESIGN_QA_CHECKLIST.md`
  - `docs/qa/MATRIX_API_ENDPOINTS.md`
  - `docs/ecommerce/STOREFRONT_PUBLIC_CONTRACTS_DRAFT.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`

### Correccion deuda QA ProductCleanupPreviewIntegrationTest

- Tipo: correccion de fixture en test de integracion.
- Contexto: el helper privado `insertElectronicDocument` en `ProductCleanupPreviewIntegrationTest.insertElectronicDocument` intentaba insertar siempre una billing_series activa `RECEIPT`/`LOCAL`, violando el constraint `uq_billing_series_doc_type_environment_active` cuando dos tests del mismo suite lo invocaban.
- Commit: `eb56641 fix(test): make billing series fixture idempotent`.
- Cambio: se extrajo metodo `findOrCreateBillingSeries` que primero busca una billing_series activa existente; si existe, la reutiliza; si no, la crea.
- Impacto:
  - `mvn test` completo ahora pasa: 348 tests, 0 failures, 0 errors, BUILD SUCCESS.
  - `ProductCleanupPreviewIntegrationTest`: 22 tests, 0 failures, BUILD SUCCESS.
  - Tests Storefront focalizados: 52 tests, 0 failures, BUILD SUCCESS.
- Alcance: solo se modifico un test fixture. No se toco produccion, Storefront/ecommerce 2C, Flyway/DB, frontend, Docker, `.env`, secretos ni dependencias.

### Cierre Fase 2E.1 Storefront MVP Shell Implementation

- Tipo: implementacion funcional del shell publico minimo en `storefront/`.
- Commit: `c049e3e feat(storefront): add Next.js MVP shell`.
- Resultados de validacion:
  - `npm run build`: OK, Next.js 16.2.7 compilado correctamente.
  - `npm run lint`: OK, sin errores.
  - `npx tsc --noEmit`: OK, sin errores de tipo.
  - `npm audit`: 2 vulnerabilidades moderadas en `postcss` (dependencia transitiva). No corregidas. Deuda no bloqueante.
- Archivos creados (21):
  - `storefront/package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `README.md`
  - `storefront/app/layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`
  - `storefront/lib/api.ts`
  - `storefront/types/storefront.ts`
  - `storefront/public/robots.txt`, `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`
  - `storefront/.env.local.example`
- Confirmaciones:
  - Sin paginas reales /`productos/{slug}` ni /`categorias/{slug}`.
  - Sin consumo real de endpoints Storefront.
  - Sin `sitemap.xml` real.
  - Sin checkout, pagos, pedidos, delivery, Merchant Center ni stock reservado.
  - Sin cambios en backend, Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.
- Deudas no bloqueantes registradas:
  - 2 vulnerabilidades moderadas en `postcss`.
  - Warning Turbopack por multiples lockfiles.
  - README.md generico de `create-next-app`.
  - SVGs default en `storefront/public/`.
- Siguiente paso: Fase 2F Public SEO Catalog MVP en Plan Mode.

### Cierre Fase 2F.2 Componentes base Next.js + Tailwind

- Tipo: implementacion funcional de componentes visuales + cierre documental QA.
- Commits incluidos:
  - `dd8f1a3 feat(storefront): add layout components with InkToy branding` (2F.2A + 2F.2B)
  - `1a55ec0 feat(storefront): add catalog visual components` (2F.2C)
- Alcance real implementado:
  - 2F.2A: Foundations visuales + UI base (Button, Badge, Chip, Breadcrumbs, SectionHeading, ProductImageFrame, Accordion).
  - 2F.2B: Layout (StorefrontHeader, StorefrontFooter, BottomNavigation) con logo InkToy real.
  - 2F.2C: Catalogo visual (ProductCard, CategoryCard, EmptyState, StickyProductCTA) + preview tecnico en `/`.
- Validaciones:
  - `npm run build`: OK (compiled successfully, 0 errors).
  - `npm run lint`: OK (0 warnings).
  - `npx tsc --noEmit`: OK (0 errors).
- Exclusiones confirmadas:
  - No se implementaron paginas reales `/productos`, `/productos/[slug]`, `/categorias`, `/categorias/[slug]`.
  - No se consumio API real.
  - No se implemento `sitemap.xml` real.
  - No se implemento checkout, pagos, pedidos, delivery, Merchant Center, login, perfil ni admin.
  - No se toco backend, Angular, Flyway/DB, Docker, `.env` raiz, secretos, dependencias ni AWS/staging.
- Deudas no bloqueantes registradas:
  - Logo puede requerir ajuste fino en paginas reales.
  - Placeholders visuales no son assets finales.
  - Paginas reales con BottomNavigation deben reservar padding inferior.
  - Chips requieren scroll horizontal controlado.
  - Imagenes reales pendientes.
  - StickyProductCTA implementado pero no montado en preview.
  - Warning Turbopack por multiples lockfiles.
  - ProductImageFrame/next/image requerira configuracion de patrones remotos.
  - Preview en `/` debe ser reemplazado por Home real.
- Archivos documentales actualizados en cierre 2F.2D:
  - `docs/ecommerce/STOREFRONT_COMPONENTS_SYSTEM_2F2.md` (creado)
  - `docs/qa/PHASE2F2_STOREFRONT_COMPONENTS_QA_CHECKLIST.md` (creado)
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`

### Inicio Fase 2F.0 Public SEO Catalog MVP Planning

- Tipo: documentacion y planificacion.
- Alcance: definir subfases 2F.0 a 2F.5, limpiar deuda documental heredada y ubicar Google Stitch como herramienta de diseno visual.
- Archivos creados:
  - `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md`
  - `docs/qa/PHASE2F_PUBLIC_SEO_CATALOG_QA_CHECKLIST.md`
- Archivos actualizados:
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ecommerce/STOREFRONT_SEO_FIRST_STRATEGY.md`
  - `docs/qa/PHASE2E_STOREFRONT_MVP_SHELL_QA_CHECKLIST.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
- Decisiones documentales:
  - Fase 2F dividida en 6 subfases: 2F.0 planificacion, 2F.1 Google Stitch, 2F.2 componentes base, 2F.3 integracion API, 2F.4 SEO tecnico, 2F.5 QA cierre.
  - Google Stitch es herramienta de diseno visual en 2F.1, no generador de codigo final.
  - Entregables de Google Stitch: home, productos, categorias, layout, componentes, paleta, responsive, estados vacios/error.
  - Antes de codificar se deben convertir disenos en design tokens, componentes Tailwind, breakpoints, jerarquia semantica, reglas de imagenes, accesibilidad, Core Web Vitals, SEO metadata, canonical y noindex.
  - Rutas objetivo: `/productos`, `/productos/{slug}`, `/categorias`, `/categorias/{slug}`.
  - Estrategia server-side fetch por defecto.
  - Proteccion noindex en desarrollo mediante `robots.txt`, layout metadata y flag env.
- Restricciones vigentes:
  - No paginas reales, no consumo real de API, no checkout, no pagos, no pedidos.
  - No sitemap.xml real, no marcas publicas, no filtros avanzados.
  - No AWS/staging, no Docker raiz, no .env raiz.
  - No cambios backend, Angular, Flyway/DB.
- Deudas no bloqueantes persisten:
  - 2 vulnerabilidades moderadas en `postcss`.
  - Warning Turbopack por multiples lockfiles.
  - README.md generico.
  - SVGs default en `public/`.
- Siguiente paso esperado: aprobar Fase 2F.1 Diseno visual con Google Stitch antes de tocar componentes o paginas reales.

### Aprobacion Visual Fase 2F.1 - Catalogo Creativo Profesional

- Tipo: documentacion y aprobacion visual.
- Alcance: registrar decisiones de diseno aprobadas para el sistema "Catalogo Creativo Profesional" de la Storefront publica.
- Archivos creados:
  - `docs/ecommerce/STOREFRONT_VISUAL_APPROVAL_2F1.md`
  - `docs/qa/PHASE2F1_VISUAL_APPROVAL_QA_CHECKLIST.md`
- Archivos actualizados:
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
- Decisiones visuales aprobadas:
  - Direccion visual: "Catalogo Creativo Profesional".
  - Logo: usar siempre logo real de InkToy.
  - Paleta: Azul `#0A2540`, Amarillo `#FFD166`, Rojo `#EF476F`, blanco y grises suaves.
  - Tipografias: Fraunces (titulos), DM Sans (cuerpo/UI).
  - Estilo: mobile-first, SEO-first, limpio, profesional, comercial, accesible. Bordes 8px, sombras suaves, sin efectos pesados.
  - Navegacion MVP: Inicio, Categorias, Buscar, Tiendas.
  - CTAs: "Ver detalle", "Ver categoria", "Consultar en tienda".
  - Badges: Disponible, Agotado, Disponible en tienda.
- Componentes visuales definidos: StorefrontHeader, StorefrontFooter, BottomNavigation, Button, Badge, Chip, ProductCard, CategoryCard, EmptyState, ProductImageFrame, Accordion, StickyProductCTA, Breadcrumbs, SectionHeading.
- Ajustes menores registrados: sticky CTA safe area, chips scroll horizontal, productos relacionados opcionales, noindex/robots durante desarrollo, next/image con proporciones estables, H1 unico, breadcrumbs semanticos.
- Restricciones vigentes: sin checkout, carrito, pagos, pedidos, login, perfil, admin, ERP interno, Merchant Center.
- Siguiente paso esperado: Fase 2F.2 Componentes base Next.js + Tailwind.

### Cierre Fase 2G.1 Publicacion de producto operativo a perfil ecommerce

- Tipo: implementacion backend funcional.
- Commit: `f766397 feat(ecommerce): add create online profile from product`.
- Alcance real implementado:
  - `POST /api/v1/ecommerce-admin/products/{id}/online-profile` — crea perfil online DRAFT desde producto ERP/POS existente.
  - Validacion de existencia del producto, estado DRAFT inicial, proteccion RBAC ADMIN.
- Tests: `EcommerceAdminProfilesIntegrationTest` 11 tests, 0 failures, BUILD SUCCESS.
- Exclusiones confirmadas:
  - No se toco frontend Angular, Flyway/DB, Docker, `.env` raiz, secretos, dependencias, POS, ventas, caja, facturacion ni inventario.
  - No se implemento checkout, pagos, pedidos, delivery, Merchant Center, login cliente, perfil cliente ni panel publico.
- QA: tests de integracion aprobados (11/11, BUILD SUCCESS).
- Siguiente paso: Fase 2G.2 Smoke Test Real de Producto Publicado → Storefront.

### Cierre Fase 2G.2 Smoke Test Real de Producto Publicado → Storefront

- Tipo: validacion end-to-end + cierre documental QA.
- Producto de prueba: ProductId 5839, Slug `producto-smoke-test-2g2-1780622524`, Precio S/ 25.90, Estado PUBLISHED.
- Flujo validado:
  1. Login `admin@erp.local` → token JWT.
  2. Creacion categoria/unidad/producto operativo.
  3. `POST /api/v1/ecommerce-admin/products/5839/online-profile` → 201 DRAFT.
  4. PUT perfil (slug, nombre, descripcion, categoria, marca) → 200.
  5. PUT SEO (title, description, canonical, INDEX_FOLLOW, indexable=true) → 200.
  6. PUT asset principal (URL externa) → 200.
  7. Validacion publicacion → publishable=true.
  8. `POST /api/v1/ecommerce-admin/products/5839/publish` → 200 PUBLISHED.
  9. Storefront `/productos/producto-smoke-test-2g2-1780622524` → 200 OK con contenido correcto.
- Storefront validado:
  - H1, precio PEN 25.90, descripcion, categoria/marca badges, breadcrumbs.
  - CTA "Consultar en tienda" presente.
  - Metadata SEO: noindex/nofollow, canonical, OG tags.
  - Header/Footer/BottomNavigation/StickyProductCTA renderizados.
  - Sin carrito, checkout, "Comprar", login, perfil cliente.
- Casos negativos validados: 404 slug inexistente, 404 DRAFT, 409 duplicado, 403 SUPERVISOR.
- Backend Docker requirio rebuild para incluir codigo 2G.1.
- Configuracion local: `storefront/.env.local` con `STOREFRONT_API_BASE_URL=http://localhost:8080`, `STOREFRONT_INDEXING_ENABLED=false` (ignorado por git).
- Deudas no bloqueantes:
  - Asset externo no renderiza (getSafeImageSrc solo acepta paths relativos).
  - Disponibilidad "No disponible temporalmente" por falta de stock operativo.
- Exclusiones confirmadas:
  - No se toco codigo funcional durante fase documental 2G.2D.
  - No se toco frontend Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.
  - No se implemento checkout, carrito, pagos, pedidos, login cliente, perfil cliente, Merchant Center.
- Archivos documentales actualizados en cierre 2G.2D:
  - `docs/qa/PHASE2G2_PUBLISHED_PRODUCT_SMOKE_TEST.md` (creado)
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
  - `docs/qa/REGRESSION_CHECKLIST.md`
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
- Siguiente paso esperado: Fase 2G.3A — Indicador de perfil online en Productos (Angular frontend).
- NOTA: `/productos/[slug]` ya fue implementada en 2F.3B y validada exitosamente en 2G.2. No requiere nueva implementacion.

### Cierre Fase 2H.5D QA Detalle de Perfil Online

- Tipo: cierre documental QA de UX administrativa Angular-only.
- Fase funcional base: 2H.5C-FIX.
- Commit funcional: `fcf6017 feat(ecommerce-admin): refine online profile detail workflow`.
- Pantalla: `Catalogo online > Perfiles online > Detalle de Perfil online`.
- Archivo funcional validado: `frontend/src/app/features/ecommerce-admin/online-profile-detail-page.component.ts`.
- Alcance cerrado:
  - Tabs operativos Contenido, SEO, Imagen y Precio.
  - Checklist lateral clicable.
  - Boton `Ir al primer pendiente`.
  - Panel `Requisitos para publicar` como guia operativa con resumen, pendientes primero y completados colapsados/discretos.
  - Ajustes de copy, paleta, tipografia y jerarquia visual.
- Validaciones:
  - `npm run build`: OK.
  - Smoke UI Docker/headless: OK.
  - Desktop/tablet/mobile: OK.
  - Caso con pendientes y caso sin pendientes: OK.
  - Sin errores JS capturados.
- Documentacion creada: `docs/qa/PHASE2_2H5D_ONLINE_PROFILE_DETAIL_QA.md`.
- Exclusiones confirmadas: sin backend, endpoints, DTOs, servicios, Storefront, Flyway/DB, Docker, `.env`, secretos, reglas de publicacion, payloads ni contratos.

### Cierre Fase 2S.2A Catalogo Publico Navegable Minimo

- Tipo: implementacion funcional Storefront Next.js + cierre documental QA.
- Alcance: primeras paginas publicas navegables del Storefront usando contratos publicos existentes y componentes Stitch ya implementados.
- Archivos creados:
  - `storefront/app/productos/page.tsx` — Listado publico de productos.
  - `storefront/app/categorias/page.tsx` — Listado publico de categorias.
- Microajustes aplicados (2S.2A-FIX):
  - Copy comercial/orientado al cliente en ambas paginas.
  - Eliminados textos tecnicos orientados al ERP/POS.
  - `/categorias` muestra "Detalle proximamente" en lugar de CTA enganoso con href="#".
- Componentes reutilizados: ProductCard, CategoryCard (adaptado), EmptyState, StorefrontHeader, StorefrontFooter, BottomNavigation, Breadcrumbs, SectionHeading.
- API client: `getStorefrontProducts()`, `getStorefrontCategories()` consumiendo `/api/v1/storefront/catalog/products` y `/api/v1/storefront/catalog/categories`.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke HTTP:
  - `/productos`: 200 OK.
  - `/categorias`: 200 OK.
  - `/productos/{slug}`: 200 OK (sin cambios).
  - `/categorias/[slug]`: 404 esperado.
  - `/buscar`: 404 esperado.
- Confirmaciones:
  - Sin llamadas a `/api/v1/ecommerce-admin`.
  - robots/noindex activos.
  - Server Components.
  - Consumo exclusivo de `/api/v1/storefront/**`.
  - Mobile-first responsive.
- Exclusiones confirmadas:
  - Sin Home real, buscador, filtros, ordenamiento, paginacion UI avanzada.
  - Sin `/categorias/[slug]`.
  - Sin carrito, checkout, pagos, pedidos, login cliente, Merchant Center.
  - Sin sitemap XML, imagenes externas, remotePatterns.
  - Sin cambios en backend, Angular, ecommerce-admin, contratos, DTOs, Flyway/DB, Docker, `.env`, secretos, seguridad, endpoints, `/productos/[slug]`.
- Documentacion creada: `docs/qa/PHASE2S2A_STOREFRONT_NAVIGABLE_CATALOG_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: fase visual de alineacion Storefront mobile-first basada en disenos Stitch.

### Cierre Fase 2S.2B-A Alineacion Visual Storefront Mobile-First de Listados

- Tipo: ajustes visuales Storefront Next.js + cierre documental QA.
- Alcance: alineacion visual de `/productos` y `/categorias` con disenos Stitch mobile-first, sin agregar funcionalidades nuevas.
- Archivos modificados:
  - `storefront/app/productos/page.tsx` — Grid mobile-first de 2 columnas.
  - `storefront/app/categorias/page.tsx` — Cards tipo fila comerciales.
  - `storefront/components/catalog/product-card.tsx` — Card mas compacta.
  - `storefront/components/ui/product-image-frame.tsx` — Fallback mas de marca.
- Cambios visuales:
  - `/productos`: grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, espaciado compacto.
  - `ProductCard`: menos padding, textos mas pequenos en mobile, nombre limitado a 2 lineas, boton "Ver detalle" con `size="sm"`.
  - `ProductImageFrame`: fallback "Imagen InkToy proximamente" con gradiente y sombra.
  - `/categorias`: cards tipo fila con bloque visual lateral, nombre destacado, descripcion con limite visual, estado discreto "Detalle proximamente", sin CTA falsa.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke HTTP:
  - `/productos`: 200 OK (grid 2 columnas mobile).
  - `/categorias`: 200 OK (sin CTA falsa).
  - `/productos/{slug}`: 200 OK (sin cambios).
  - `/categorias/[slug]`: 404 esperado.
  - `/buscar`: 404 esperado.
- Confirmaciones:
  - Sin llamadas a `/api/v1/ecommerce-admin`.
  - robots/noindex activos.
  - Server Components.
  - Consumo exclusivo de `/api/v1/storefront/**`.
  - Mobile-first responsive.
- Exclusiones confirmadas:
  - Sin Home real, buscador, filtros, ordenamiento, paginacion UI avanzada.
  - Sin `/categorias/[slug]`.
  - Sin carrito, checkout, pagos, pedidos, login cliente, Merchant Center.
  - Sin sitemap XML, imagenes externas, remotePatterns, galeria real, productos relacionados.
  - Sin cambios en backend, Angular, ecommerce-admin, contratos, DTOs, Flyway/DB, Docker, `.env`, secretos, seguridad, endpoints, `/productos/[slug]`, `globals.css`.
- Documentacion creada: `docs/qa/PHASE2S2B_A_STOREFRONT_VISUAL_ALIGNMENT_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: discovery separado para categoria publica `/categorias/[slug]` y productos por categoria.

### Cierre Fase 2S.3A Categoria Publica /categorias/[slug] con Productos por Categoria

- Tipo: implementacion funcional backend + Storefront + cierre documental QA.
- Alcance: extender contrato publico con `categorySlug` opcional y crear pagina `/categorias/[slug]` con productos reales filtrados.
- Backend:
  - `GET /api/v1/storefront/catalog/products` acepta `categorySlug` opcional.
  - Filtro server-side por categoria online activa.
  - Sin cambios en DTOs publicos ni endpoint duplicado.
  - Tests nuevos: filtro por categoria, slug inexistente, categoria inactiva.
- Storefront:
  - `storefront/lib/api.ts`: `getStorefrontProducts()` acepta `categorySlug`.
  - `storefront/app/categorias/[slug]/page.tsx`: pagina dinamica con metadata SEO.
  - `storefront/app/categorias/page.tsx`: enlaces a `/categorias/{slug}`.
- Validaciones:
  - Tests backend focalizados: 43 tests, 0 failures, BUILD SUCCESS.
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke HTTP:
  - `/categorias/{slug-con-productos}`: 200 OK.
  - `/categorias/{slug-inexistente}`: 404 OK.
  - `/productos`: 200 OK (sin cambios).
  - `/productos/{slug}`: 200 OK (sin cambios).
  - `/buscar`: 404 OK (esperado).
- Confirmaciones:
  - Sin llamadas a `/api/v1/ecommerce-admin`.
  - robots/noindex activos.
  - Server Components.
  - Consumo exclusivo de `/api/v1/storefront/**`.
- Exclusiones confirmadas:
  - Sin Home real, buscador, filtros UI, carrito, checkout, pagos, pedidos, login cliente, Merchant Center.
  - Sin sitemap XML, imagenes externas, remotePatterns, productos relacionados, marcas publicas.
  - Sin cambios en Angular, ecommerce-admin, Flyway/DB, Docker, `.env`, secretos, seguridad, `/productos/[slug]`, `globals.css`, DTOs publicos.
  - Sin client-side filtering ni endpoints duplicados.
- Riesgo de despliegue: Storefront nuevo debe desplegarse junto con backend nuevo.
- Documentacion creada: `docs/qa/PHASE2S3A_PUBLIC_CATEGORY_PRODUCTS_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: discovery de Home real SEO-first.

### Cierre Fase 2S.4A Home real SEO-first Storefront

- Tipo: implementacion funcional Storefront + cierre documental QA.
- Alcance: reemplazar el preview/mock de `storefront/app/page.tsx` por una Home real MVP SEO-first.
- Datos publicos consumidos:
  - categorias publicas con `getStorefrontCategories({ page: 0, size: 6 })`;
  - productos publicos con `getStorefrontProducts({ page: 0, size: 8 })`.
- Secciones implementadas:
  - hero comercial real;
  - categorias reales enlazadas a `/categorias/{slug}`;
  - productos reales enlazados a `/productos/{slug}`;
  - bloque simple de confianza/beneficios;
  - header/footer/bottom navigation existentes.
- Confirmaciones:
  - sin mocks funcionales;
  - sin textos de preview tecnico;
  - sin `href="#"`;
  - sin funciones falsas;
  - sin buscador, filtros, carrito, checkout, pagos, login, pedidos, promociones ni banners administrables.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke HTTP:
  - `/`: 200 OK.
  - `/productos`: 200 OK.
  - `/categorias`: 200 OK.
  - `/buscar`: 404 OK (esperado).
- Confirmaciones tecnicas:
  - no hay llamadas nuevas a `/api/v1/ecommerce-admin`;
  - robots/noindex activos;
  - Server Components;
  - consumo exclusivo de `/api/v1/storefront/**`.
- Exclusiones confirmadas:
  - sin backend nuevo;
  - sin contratos/DTOs/endpoints nuevos;
  - sin sitemap XML;
  - sin `remotePatterns`;
  - sin imagenes externas nuevas;
  - sin cambios en Angular/ecommerce-admin/Flyway/DB/Docker/seguridad.
- Riesgo SEO: Home real aun depende del volumen real del catalogo para no verse pobre o duplicada.
- Documentacion creada: `docs/qa/PHASE2S4A_STOREFRONT_HOME_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: discovery de SEO tecnico de publicacion.

### Inicio Fase 2E.0 Storefront MVP Shell Planning

- Tipo: documentacion tecnica de planificacion, sin implementacion funcional.
- Objetivo: cerrar el stack tecnico, la estructura y la configuracion base del futuro shell Next.js en `storefront/`.
- Archivos creados:
  - `docs/adr/ecommerce/ECOM-ADR-021-storefront-tech-stack.md`
  - `docs/ecommerce/STOREFRONT_MVP_SHELL_PLAN.md`
  - `docs/qa/PHASE2E_STOREFRONT_MVP_SHELL_QA_CHECKLIST.md`
- Archivos actualizados:
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
- Decisiones tecnicas cerradas:
  - Next.js 16 como version objetivo estable/LTS.
  - App Router obligatorio.
  - TypeScript obligatorio.
  - npm como package manager.
  - Tailwind CSS como base visual inicial.
  - `storefront/` definida como carpeta raiz futura; `frontend/` Angular queda solo para ERP/POS interno.
  - `.env.local.example` como plantilla commiteable; `.env.local` real ignorado.
  - No usar `NEXT_PUBLIC_` para secretos ni URLs internas sensibles.
  - Wrapper API server-side por defecto.
  - `robots.txt` futuro bloquea crawlers durante desarrollo.
  - Paginas reales y `sitemap.xml` quedan para fase posterior.
- Restricciones: no crear `storefront/`, no instalar Next.js, no instalar dependencias, no crear paginas reales, no consumir endpoints reales, no `sitemap.xml` real, no robots productivo, no checkout/pagos/pedidos/stock reservado/delivery/Merchant Center, no AWS/staging, no Docker, no `.env` raiz, no backend funcional, no Angular, no Flyway/DB.
- No hacer commit ni push en esta fase sin instruccion explicita.

### Inicio Fase 2D Storefront Architecture Decision & SEO Delivery Plan

- Tipo: documentacion y arquitectura, sin implementacion funcional.
- Objetivo: cerrar la decision de arquitectura de entrega para la futura Storefront publica SEO-first con Next.js, SSG/ISR, rutas publicas, sitemap/robots/canonical y limites de alcance.
- Archivos creados:
  - `docs/adr/ecommerce/ECOM-ADR-020-storefront-nextjs-delivery-architecture.md`
  - `docs/ecommerce/STOREFRONT_NEXTJS_DELIVERY_PLAN.md`
  - `docs/qa/PHASE2D_STOREFRONT_ARCHITECTURE_QA_CHECKLIST.md`
- Archivos actualizados:
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ecommerce/STOREFRONT_SEO_FIRST_STRATEGY.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`
- Decisiones documentales cerradas:
  - Next.js sera la futura Storefront publica SEO-first.
  - Angular `frontend/` queda solo para ERP/POS interno.
  - `storefront/` queda como ubicacion futura recomendada, sin crearse en Fase 2D.
  - Storefront API sigue dentro del monolito Spring Boot por ahora y extraction-ready.
  - Rutas objetivo: `/productos/{slug}` y `/categorias/{slug}`.
  - `/marcas/{slug}` queda diferido.
  - SSG/ISR sera la estrategia principal para productos y categorias.
  - SSR queda reservado para casos realmente necesarios.
  - `sitemap.xml` futuro sera generado por Next.js usando `GET /api/v1/storefront/seo/sitemap`.
  - `robots.txt` futuro sera generado/controlado por Storefront.
  - Canonical debe derivar de `canonicalPath` o regla backend/contractual aprobada.
  - Staging sera no indexable por defecto.
- Restricciones: no crear Next.js, no crear `storefront/`, no instalar dependencias, no tocar Angular, backend funcional, Flyway/DB, Docker, `.env`, secretos, AWS/staging, POS, ventas, caja, facturacion, inventario, checkout, pagos, delivery, Merchant Center, pedidos online ni stock reservado.
- No hacer commit ni push en esta fase sin instruccion explicita.

### Decisiones aprobadas para Fase 1

- Producto sin marca: no usar texto libre; permitir solo marca formal o regla explicita auditada tipo `Sin marca`/`Generico`.
- Categoria online: obligatoria para publicar; no obligatoria para perfiles online en `DRAFT`.
- Asset formal: el perfil online puede existir en `DRAFT` sin asset, pero la publicacion debe bloquearse hasta tener imagen principal con alt text y derechos confirmados.
- Namespace administrativo: `/api/v1/ecommerce-admin/...` para administracion interna, separado de la Storefront API publica.
- Permisos iniciales: `ADMIN` crea, edita, publica y despublica; `SUPERVISOR` solo lectura/revision al inicio.
- Flyway: no tocar en Fase 1A; Fase 1B futura debe ser aditiva, de bajo riesgo y aprobada explicitamente.
- Categoria SEO: usar categoria online separada para ecommerce; no reutilizar directamente la categoria interna como categoria publica SEO.
- Slugs: bloquear cambios de slug en productos ya publicados mientras no exista historial de slugs/redirecciones.

## Reglas de control de cambios

1. Trabajar por cambios pequenos, verificables y reversibles.
2. No mezclar deudas tecnicas distintas en una sola intervencion.
3. No mezclar backend/frontend cuando el requerimiento no lo exige.
4. No mezclar cambios funcionales con cambios cosmeticos sin acuerdo previo.
5. Mantener foco en alcance explicitamente solicitado.
6. En fases documentales, no introducir cambios de codigo funcional, migraciones, endpoints ni configuracion de despliegue.
7. En POS, documentar cambios de persistencia frontend, validacion de almacén y ajustes visuales de búsqueda/botones como nota operativa breve cuando impacten la experiencia de caja.
8. En POS, registrar como mejora UX el reemplazo de confirm nativo por modal propio al cobrar, sin alterar la logica transaccional.
9. En Inventario, documentar mejoras UX de Ajustes de stock cuando incorporen autocomplete server-side, layout estable, confirmacion propia y reset limpio post-success sin tocar backend.
10. En Catalogo, documentar cambios de Productos cuando la busqueda multi-token, filtros reorganizados y tabla compacta mejoren la experiencia sin cambiar endpoints.
11. En Inventario, documentar la fase 1 del autocomplete compartido cuando se cree `ProductAutocompleteComponent` y se migre primero solo Transferencias, dejando Stock/Stock inicial/Ajustes para fases posteriores.
12. En Inventario/Kardex, documentar cambios de auditoria cuando el endpoint se enriquezca con nombres operativos, el frontend use paginacion server-side, un solo Limpiar y tabla alineada sin tocar el contrato base `/api/v1/inventory/kardex`.
13. En Inventario, documentar la consolidacion del autocomplete compartido cuando `Stock` use `filterMode=true`, `disabled` reactivo y limpieza visual final sin textos redundantes bajo Producto.
14. En Compras, documentar el rediseño UX/UI de Proveedores cuando la pantalla pase a tabla principal con drawer/modal local para crear/editar y confirmaciones del sistema para estados.
15. En Compras, documentar el rediseño completo de Órdenes de compra en 5 fases cuando el flujo pase de listado -> nueva -> edicion -> detalle -> recepcion con tablas operativas, ProductAutocompleteComponent, sanitizacion de cantidades/costos, ConfirmDialogService y formateo local Intl sin tocar backend, endpoints ni contratos.
16. En Cotizaciones, documentar el rediseño completo en 5 fases cuando el flujo pase de listado -> nueva -> edicion -> detalle -> conversion con tabla compacta, ProductAutocompleteComponent, `syncSelectedToInput` opt-in en edicion, sanitizacion de cantidades/descuentos, ConfirmDialogService y formateo local Intl sin tocar backend, endpoints ni contratos.
17. En Facturacion, documentar la mejora empresarial del Detalle de comprobante electronico cuando se muestren nombre real + SKU + codigo de barras en la tabla de items, historial descendente, XML colapsable y cards key-value, sin ProductService lookup frontend, sin DB/Flyway, sin cambios de endpoints ni POS.
18. En Facturacion, documentar el rediseño empresarial de Emitir comprobante pendiente cuando la pantalla pase a header operativo sin MVP, cards key-value compactas, Tipo/Serie alineados con helper persistente, copy contextual por tipo, tabla de items con nombre real + SKU, montos PEN y sin ID tecnico visible, sin alterar reglas tributarias ni contratos.
19. En Facturacion, documentar hardening por ambiente cuando LOCAL/BETA sigan como simulacion controlada y PROD quede bloqueado para firma/envio sin proveedor tributario real ni firma XML real, evitando aceptaciones mock en produccion.
20. En Facturacion, documentar configuracion tributaria como consola por ambiente cuando se muestre estado LOCAL/BETA/PROD (perfil/series/readiness), validaciones operativas (RUC 11, ubigeo 6), advertencias preventivas perfil-serie y CTA a Series sin cambiar contratos backend.
21. En Facturacion, documentar correccion de layout shift en Configuracion tributaria cuando se aplique field-help persistente con altura reservada en RUC/Razon social, Ubigeo/Departamento y Provincia/Distrito para evitar desalineacion visual entre campos hermanos de la misma fila.
22. En Facturacion, documentar loading gate + loader neutral con delay en Configuracion tributaria cuando se elimine skeleton estructural con cuadros vacios y se implemente estado de carga con retardo de 280 ms: si la carga termina antes no se muestra nada intermedio; si tarda aparece loader compacto con texto operativo; sin formulario vacio, cards incompletas ni flash visual al presionar F5.
23. En Facturacion, documentar hardening de series y correlativos cuando se aplique: unica serie activa por documentType+environment (409 si duplica); currentNumber como proximo correlativo (bloquea si <= maxIssuedNumber); validacion defensiva en createFromSale() antes de crear documento/incrementar; migracion Flyway V16 con indice unico parcial active=true; runbook operativo para correccion manual de series inconsistentes (currentNumber = maxIssuedNumber + 1); riesgo residual de datos historicos inconsistentes documentado; sin modificacion automatica de datos; sin cambios en frontend/POS/endpoints publicos.
24. En Facturacion, registrar correccion operativa manual de serie historica inconsistente B001/LOCAL: tenia current_number=1 y max_issued=2 (inconsistente porque currentNumber es proximo correlativo a emitir y debe ser > maxIssuedNumber); se corrigio manualmente desde pantalla Series y correlativos a currentNumber=3; serie quedo INACTIVA; trazabilidad historica de comprobantes antiguos preservada; antes de reactivar serie historica validar que proximo correlativo sea mayor al ultimo emitido; no se modificaron datos automaticamente por script.
25. En Facturacion, documentar rediseño frontend de Series y numeracion tributaria: consola operativa empresarial con formulario cerrado por defecto, boton Nueva serie, modo edicion con contexto, Cancelar, Proximo correlativo + helper persistente, field-help anti-layout shift, filtros Tipo/Ambiente/Estado, separacion vigentes/historicas colapsables, confirmaciones activar/desactivar, chips LOCAL/BETA/PROD dark-tinted, badges sobrios, mensajes 409 operativos; sin cambios de backend/endpoints/contratos.
26. En Ventas, documentar integracion con comprobantes electronicos en 4 fases + refinamiento visual:
    - Fase 1 UX: Intl.NumberFormat/DateTimeFormat es-PE, saleNumber como identificador principal, "Total linea" -> "Importe", ConfirmDialogService en anulacion.
    - Fase 2A detalle: listBySaleId() sin fallback a list() global, bloque Comprobante electronico con CTA contextual Emitir/Ver, navegacion a /facturacion/emitir/:saleId y /facturacion/comprobantes/:id.
    - Fase 2B listado: endpoint no rompiente GET /api/v1/sales/list-items con read-model dedicado; evita N+1 con consulta batch de comprobantes por saleIds; GET /api/v1/sales intacto; columna Comprobante con numero/estado/ambiente o Pendiente/Sin comprobante.
    - Fase 2C proteccion de anulacion: backend bloquea anulacion si comprobante en DRAFT/GENERATED/SIGNED/SENT/ACCEPTED; permite sin comprobante o REJECTED/ERROR/CANCELLED; validacion antes de revertir stock; HTTP 409 con mensaje operativo; frontend advertencia preventiva y manejo 409 claro.
    - Refinamiento visual: chips sobrios dark-tinted con borde tenue; Pendiente neutral; bloque detalle horizontal compacto 4 columnas con labels arriba/valores debajo; copy reducido; sin consultas nuevas ni N+1; sin cambios backend/endpoints.
    - Decision de politica: bloquear anulacion para DRAFT/GENERATED/SIGNED/SENT/ACCEPTED; permitir sin comprobante, REJECTED, ERROR, CANCELLED.
    - Caja UX.1 y UX.2A: caja reorganizada como consola operativa frontend-only; formatos Intl es-PE; OPEN/CLOSED traducidos; badge superior con visibilidad intermedia; resumen principal con Caja #id; ID interno y UUID tecnico movidos a Datos tecnicos colapsable; apertura solo cuando no hay caja abierta; cierre con ConfirmDialogService; consulta por ID como bloque secundario colapsable; sesion cerrada se conserva visible; no se toco backend ni contratos.
    - Riesgo mitigado: evitar revertir stock/caja/pagos con comprobante electronico activo; evitar inconsistencias entre venta y comprobante; evitar N+1 en listado.
    - Restricciones: no se toco DB/Flyway; no se cambio endpoint existente /api/v1/sales; se agrego endpoint no rompiente /api/v1/sales/list-items; no se implemento nota de credito/anulacion tributaria todavia.

## Runbook operativo - Series inconsistentes

1. Identificar series con current_number <= max_issued_number:
   `SELECT id, document_type, series, environment, current_number, max_issued_number FROM billing_series WHERE current_number <= max_issued_number AND active = TRUE;`
2. Para cada serie inconsistente, corregir manualmente a max_issued_number + 1:
   `UPDATE billing_series SET current_number = max_issued_number + 1, updated_at = NOW() WHERE id = <series_id>;`
3. Validar que current_number > max_issued_number tras la correccion.
4. No modificar datos automaticamente sin aprobacion explicita del responsable.
5. Validar antes de usar en POS o emision pendiente que la serie este consistente.
6. Riesgo residual: datos historicos inconsistentes deben sanearse controladamente; la emision bloquea hasta correccion.

## Tipos de commit sugeridos (cuando se autorice commit)

- fix:
- feat:
- style:
- docs:
- test:
- chore:

Nota: esta guia define tipos recomendados, pero ningun agente debe commitear automaticamente.

## Flujo obligatorio antes de implementar

1. Revisar estado git:
   - git status
2. Leer contexto vigente:
   - README
   - docs/ai/\*
   - docs/qa relevantes
   - docs/adr relevantes
3. Proponer plan breve con alcance y riesgos.
4. Implementar solo el alcance limitado acordado.
5. Validar segun matriz de comandos/documentacion.
6. Reportar resultado con evidencia y riesgos residuales.

## Reglas de rollback

1. Cada cambio debe poder revertirse de forma aislada.
2. Evitar cambios masivos no atomicos.
3. Si se detecta regresion, priorizar rollback del bloque recien introducido.
4. No aplicar rollback destructivo global sin autorizacion explicita.

## Criterios para actualizar documentacion QA

Actualizar docs/qa cuando ocurra al menos uno de estos casos:

1. Cambio funcional en modulo o flujo de usuario.
2. Correccion de bug CRITICAL/HIGH/MEDIUM.
3. Ajuste de seguridad, permisos o rutas protegidas.
4. Cambio de comportamiento observable en Docker/runtime.
5. Nuevo protocolo operativo de validacion (ejemplo: anti-cache).

Nota operativa: cambios ecommerce deben actualizar plan/checklist de fase, matrices QA cuando haya endpoints/rutas reales, y mantener separacion entre endpoints administrativos internos y Storefront API publica.

Nota operativa: cambios de catalogo que agregan endpoints nuevos o reglas de reserva deben reflejarse tambien en matrices y decisiones antes de cerrar la tarea.
Nota operativa: cambios en Stock que alteren el filtro de Producto deben reflejar lookup/autocomplete, criterio de seleccion por `productId` y smoke minimo en matrices/checklist.
Nota operativa: cambios en Stock que adopten `filterMode` deben reflejarse en matrices/checklist con comportamiento de filtro editable, `Buscar` manual y sin acciones redundantes bajo el autocomplete.
Nota operativa: cambios en Proveedores que reorganicen crear/editar deben reflejar tabla principal, drawer/modal local, validacion visual estable y smoke minimo en matrices/checklist.
Nota operativa: cuando Unidades cierre acciones de frontend, reflejarlo en matrices y checklist sin abrir nuevos documentos.
Nota operativa: en Almacenes, registrar `PATCH /api/v1/warehouses/{id}/status` y la semantica de `DELETE` como alias de desactivacion en matrices y decisiones.

## Criterios para crear tag estable

Solo crear tag cuando se cumpla todo:

1. Build backend y frontend exitosos.
2. Docker Compose operativo (servicios arriba y saludables).
3. Smoke QA minimo por roles completado.
4. Sin hallazgos CRITICAL/HIGH abiertos.
5. Documentacion tecnica y QA actualizada.
6. Aprobacion explicita del responsable tecnico.

## Politica de seguridad operativa

1. No cargar datos reales sin autorizacion explicita.
2. No exponer credenciales reales.
3. No ejecutar comandos destructivos sobre git o base de datos sin aprobacion.
4. No hacer commit/push/tag automatico desde agentes.

### Cierre Fase 2S.5A Base SEO tecnica del Storefront

- Tipo: implementacion funcional Storefront + cierre documental QA.
- Alcance: preparar la base SEO tecnica sin activar indexacion.
- Archivos creados:
  - `storefront/lib/seo.ts`
  - `storefront/app/sitemap.ts`
  - `storefront/app/robots.ts`
  - `docs/qa/PHASE2S5A_STOREFRONT_TECHNICAL_SEO_QA.md`
- Archivos modificados:
  - `storefront/.env.local.example`
  - `storefront/app/layout.tsx`
  - `storefront/app/page.tsx`
  - `storefront/app/productos/page.tsx`
  - `storefront/app/categorias/page.tsx`
- Archivo eliminado:
  - `storefront/public/robots.txt`
- Decisiones tecnicas:
  - `app/robots.ts` queda como unica fuente efectiva de `/robots.txt`.
  - `STOREFRONT_PUBLIC_BASE_URL` se usa para canonicals y sitemap con fallback seguro a `http://localhost:3000`.
  - `app/sitemap.ts` consume `GET /api/v1/storefront/seo/sitemap` y transforma solo las entradas entregadas por backend.
  - Indexacion sigue bloqueada por defecto con `STOREFRONT_INDEXING_ENABLED=false`.
  - `layout.tsx` mantiene `index: false` y `follow: false` por defecto.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke:
  - `/`: 200.
  - `/productos`: 200.
  - `/categorias`: 200.
  - `/sitemap.xml`: 200.
  - `/robots.txt`: 200.
  - `/buscar`: 404 esperado.
- Exclusiones confirmadas:
  - sin backend, sin contratos, sin structured data, sin buscador, sin filtros, sin carrito, sin checkout, sin pagos, sin Merchant Center, sin `remotePatterns`, sin imagenes externas.
- Riesgos pendientes:
  - configurar dominio real en `STOREFRONT_PUBLIC_BASE_URL` antes de publicar;
  - limpiar datos de prueba antes de indexar;
  - activar indexacion solo en una fase posterior separada y controlada.

### Cierre Fase 2S.5C Storefront indexing readiness guardrails

- Tipo: implementacion funcional Storefront + cierre documental QA.
- Alcance: endurecer la decision de indexacion para evitar activacion accidental en entornos no preparados.
- Archivos creados:
  - `docs/qa/PHASE2S5C_STOREFRONT_INDEXING_GUARDRAILS_QA.md`
- Archivos modificados:
  - `storefront/lib/seo.ts`
  - `storefront/app/robots.ts`
  - `storefront/app/layout.tsx`
  - `storefront/app/productos/[slug]/page.tsx`
  - `storefront/app/categorias/[slug]/page.tsx`
  - `storefront/.env.local.example`
- Decisiones tecnicas:
  - `canStorefrontAllowIndexing()` centraliza la politica de indexacion.
  - `STOREFRONT_INDEXING_ENABLED=true` no basta: la base URL debe ser publicable.
  - `localhost`, `127.0.0.1`, `0.0.0.0` y dominios `example/test` quedan bloqueados.
  - `robots.ts` y metadata comparten la misma decision para evitar inconsistencias.
  - `layout.tsx` y las paginas dinamicas respetan el helper compartido.
- Confirmaciones:
  - indexacion sigue bloqueada por defecto;
  - localhost no puede quedar indexable aunque el flag sea true;
  - no se toco backend, Angular, ecommerce-admin, contratos, DTOs, endpoints, Flyway, Docker ni seguridad.
- Validaciones:
  - `npm run build`: OK.
  - `npm run lint`: OK.
  - `npx tsc --noEmit`: OK.
  - `git diff --check`: OK.
- Smoke:
  - `/`: 200.
  - `/productos`: 200.
  - `/categorias`: 200.
  - `/sitemap.xml`: 200.
  - `/robots.txt`: 200.
  - `/buscar`: 404 esperado.
- Exclusiones confirmadas:
  - sin backend, sin contratos, sin structured data, sin buscador, sin filtros, sin carrito, sin checkout, sin pagos, sin Merchant Center, sin `remotePatterns`.
- Riesgos pendientes:
  - limpiar datos smoke/test antes de publicar;
  - configurar dominio real en `STOREFRONT_PUBLIC_BASE_URL`;
  - mejorar contenido comercial real;
  - activar indexacion solo en fase posterior separada y controlada.

### Cierre Fase 2S.7A Bulk ecommerce online profile import/export MVP

- Tipo: implementacion funcional backend + frontend Angular + cierre documental QA.
- Alcance: flujo separado de importacion/exportacion masiva de Perfiles online ecommerce usando SKU como clave humana.
- Endpoints creados (ADMIN):
  - `GET /api/v1/ecommerce-admin/products/online-profiles/import/template`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/import/preview`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/import/confirm-file`
- Backend:
  - Resolver batch de SKU a productId (`ProductRepositoryPort.findBySkusIgnoreCase`).
  - Use case, service, workbook adapter, DTOs y controller dedicados.
  - Plantilla prellenada con productos ERP activos y perfiles no publicados.
  - Hojas de referencia: `online_categories`, `brands`, `instructions`.
- Frontend Angular:
  - Pantalla `/ecommerce-admin/perfiles/importar`.
  - Modelos y servicio en `ecommerce-admin`.
  - Link desde Perfiles online y navegacion lateral.
  - Microajustes UX: texto superior mas corto, boton Quitar archivo con limpieza completa, tabla con anchos estables/truncado, confirmacion previa con conteos.
- Reglas de negocio:
  - SKU inexistente/duplicado/producto inactivo se rechaza.
  - Perfil publicado se protege/rechaza.
  - No se crean productos ERP.
  - No se modifica stock, inventario, unidad, costo, precio ERP ni categoria ERP.
  - No se crean marcas/categorias online automaticamente.
  - No se publica desde Excel.
  - Nuevos perfiles quedan DRAFT.
  - `onlineName` y `slug` se autogeneran cuando corresponde.
  - Slugs con `test`, `smoke`, `demo`, `prueba` o `example` se rechazan.
  - Categoria online y marca se validan contra referencias existentes y activas.
- Validaciones:
  - `mvn -DskipTests compile`: OK.
  - Tests backend focalizados: 57 tests, 0 failures, BUILD SUCCESS.
  - `npm run build`: OK.
  - `git diff --check`: OK.
- Smoke: no ejecutado porque no hay servidor local activo en esta sesion.
- Exclusiones confirmadas:
  - Sin publicar desde Excel.
  - Sin bulk SEO/imagenes/ZIP/storage/CDN.
  - Sin crear productos ERP.
  - Sin modificar stock/inventario/unidad/costo/precio ERP/categoria ERP.
  - Sin Storefront/POS/carrito/checkout/pagos/Merchant Center/structured data/remotePatterns/imagenes externas.
- Riesgos pendientes:
  - Filtro por categoria ERP para plantilla fuera del MVP.
  - Sin script lint separado en frontend.
  - Sin smoke headless/e2e para esta pantalla.
- Documentacion creada: `docs/qa/PHASE2S7A_ONLINE_PROFILE_BULK_IMPORT_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: 2S.8 — Discovery de gestion profesional de imagenes ecommerce.

### Cierre Fase 2S.8A Public image URL policy

- Tipo: hardening backend ecommerce admin + readiness/publicacion + microajuste Angular + QA documental.
- Alcance: politica de URL publica para `ProductAsset.assetUrl` usando el modelo actual de assets ecommerce.
- Backend:
  - Nueva configuracion `app.ecommerce.public-images.allowed-domains` / `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS`.
  - Nueva politica centralizada de URL publica de imagen.
  - `upsertPrimaryProductAsset` rechaza URLs no publicas o no permitidas.
  - `validatePublication` agrega error cuando la URL de imagen no es valida.
  - `ASSET_INVALID` se conserva como codigo de readiness para asset con URL invalida, alt faltante, derechos no confirmados o tipo incorrecto.
  - Readiness SQL de listado admin considera validos solo paths relativos publicos o dominios `https` permitidos.
- Angular:
  - Perfil online detalle ahora ofrece solo `PRODUCT_IMAGE` para producto.
  - Se agrego ayuda visible para URL publica/dominio permitido, alt text y derechos.
- Politica implementada:
  - Permitido: path relativo publico que empieza con `/`.
  - Permitido: `https://` en dominio allowlisted.
  - Bloqueado: allowlist externa vacia para dominios no configurados.
  - Bloqueado: `http`, `file`, `data`, `ftp`, credenciales, host ausente, whitespace/control chars, localhost, `127.0.0.1`, `0.0.0.0`, IPs privadas, `.test`, `.example`, `.example.com`, `.example.test`.
- Validaciones:
  - `mvn -DskipTests compile`: OK.
  - `mvn -Dtest=EcommerceCatalogApplicationServiceTest test`: 27 tests, 0 failures, BUILD SUCCESS.
  - Integracion ecommerce/storefront focalizada: 79 tests, 0 failures, BUILD SUCCESS.
  - `npm run build` en frontend: OK.
- Exclusiones confirmadas:
  - Sin upload binario.
  - Sin storage/CDN.
  - Sin Cloudflare R2/S3/Bunny/Supabase.
  - Sin ZIP.
  - Sin importacion masiva de imagenes ni columna imagen en Excel.
  - Sin galeria.
  - Sin Storefront, `next.config.ts` ni `remotePatterns`.
  - Sin structured data, Merchant Center ni activacion de indexacion.
  - Sin imagen interna en Producto ERP.
  - Sin buscador, filtros, carrito, checkout ni pagos.
- Riesgos pendientes:
  - Storefront aun requiere fase posterior para render seguro de dominios externos aprobados.
  - Sin validacion binaria de MIME, dimensiones o peso porque no hay upload/storage.
  - Datos historicos con URLs absolutas invalidas requieren limpieza antes de indexacion.
- Documentacion creada: `docs/qa/PHASE2S8A_PUBLIC_IMAGE_URL_POLICY_QA.md`.
- Pendiente recomendado: decision de storage/CDN o fase Storefront-safe para dominios de imagen aprobados, sin activar indexacion.

### Fase 2S.8B Storefront safe image render

- Tipo: implementacion Storefront Next.js + documentacion QA.
- Alcance: render seguro de `primaryImage.url` y OG image usando allowlist Storefront.
- Storefront:
  - Nueva variable `STOREFRONT_IMAGE_ALLOWED_DOMAINS` documentada en `.env.local.example`.
  - `next.config.ts` configura `images.remotePatterns` desde la allowlist.
  - Nuevo helper central `storefront/lib/images.ts`.
  - Home, Productos, Detalle producto y Detalle categoria usan helper central para render de imagenes.
  - Metadata/OG image usa helper seguro y omite imagen no permitida.
- Politica Storefront:
  - Permitido: path relativo publico que empieza con `/`.
  - Permitido: URL `https` en dominio allowlisted o subdominio.
  - Bloqueado: `http`, `file`, `data`, `ftp`, credenciales, strings vacios, whitespace/control chars, localhost, `127.0.0.1`, `0.0.0.0`, IPs privadas, `.test`, `.example`, `.example.com`, `.example.test`.
  - Default restrictivo: allowlist vacia no permite dominios externos.
- Exclusiones confirmadas:
  - Sin backend.
  - Sin Angular admin.
  - Sin Producto ERP/POS/stock/inventario/unidad/costo/precio ERP.
  - Sin base de datos, Flyway, Docker, auth/security ni indexacion.
  - Sin upload/storage/CDN/ZIP/importacion masiva de imagenes/galeria.
  - Sin structured data, Merchant Center, buscador, filtros, carrito, checkout ni pagos.
- Validaciones:
  - `npm run build` en Storefront: OK.
  - `npm run lint` en Storefront: OK.
  - `git diff --check`: OK.
- Documentacion creada: `docs/qa/PHASE2S8B_STOREFRONT_SAFE_IMAGE_RENDER_QA.md`.
- Pendiente recomendado: 2S.8C — Decision e implementacion controlada de storage/CDN o carga manual inicial de imagenes, sin activar indexacion.

### Fase 2S.8D AWS S3 + CloudFront image upload manual

- Tipo: implementacion backend Spring Boot + Angular admin + Flyway + documentacion QA.
- Alcance real implementado:
  - Upload manual de imagen principal ecommerce via backend.
  - `ProductAsset` sigue siendo la entidad de imagen publica del Perfil online.
  - Endpoint nuevo `POST /api/v1/ecommerce-admin/products/{productId}/primary-asset/upload` con `multipart/form-data`.
  - Endpoint URL manual existente `PUT /api/v1/ecommerce-admin/products/{productId}/primary-asset` se mantiene compatible.
- Backend:
  - Nuevo comando `UploadPrimaryProductAssetCommand`.
  - Nuevo port `EcommerceImageStoragePort`.
  - Adapter S3 con AWS SDK v2 y `cache-control` configurable.
  - Adapter deshabilitado por defecto con `ECOMMERCE_IMAGE_STORAGE_PROVIDER=none`.
  - Validacion binaria JPEG/PNG, firma, MIME declarado, peso, dimensiones, checksum SHA-256 y URL publica allowlisted.
  - Naming de storage key por producto/perfil/checksum.
- Flyway/DB:
  - `V18__ecommerce_product_asset_storage_metadata.sql` agrega metadata nullable a `ecommerce_product_assets`.
  - Assets historicos URL-only siguen soportados.
- Angular:
  - Perfil online detalle agrega selector de archivo JPEG/PNG.
  - Upload usa alt text, fuente, derechos y orden existentes.
  - Se muestra metadata tecnica devuelta cuando existe.
  - Guardado por URL manual se mantiene intacto.
- Configuracion/env:
  - `.env.example` documenta `ECOMMERCE_IMAGE_STORAGE_PROVIDER`, `AWS_REGION`, `ECOMMERCE_IMAGE_S3_BUCKET`, `ECOMMERCE_IMAGE_S3_PREFIX`, `ECOMMERCE_IMAGE_PUBLIC_BASE_URL`, cache-control y limites.
  - `storefront/.env.local.example` recuerda alinear `STOREFRONT_IMAGE_ALLOWED_DOMAINS` con el host CDN publico.
  - No se agregaron secretos ni access keys.
- Validaciones:
  - `mvn -DskipTests compile`: OK.
  - `mvn -Dtest=EcommerceCatalogApplicationServiceTest test`: 29 tests, 0 failures, BUILD SUCCESS.
  - `mvn "-Dtest=EcommerceCatalogPersistenceIntegrationTest,EcommerceAdminProfilesIntegrationTest" test`: 29 tests, 0 failures, BUILD SUCCESS.
  - `npm run build` en frontend: OK.
  - `git diff --check`: OK con warnings CRLF normales en Windows.
- Exclusiones confirmadas:
  - Sin recursos AWS reales.
  - Sin credenciales/access keys.
  - Sin presigned URL.
  - Sin ZIP ni importacion masiva de imagenes.
  - Sin columna imagen Excel 2S.7A.
  - Sin galeria, WebP obligatorio, AVIF ni antivirus avanzado.
  - Sin cambios en Producto ERP, POS, stock, inventario, unidad, costo, precio ERP, Storefront funcional, `next.config.ts`, Docker, auth/security ni indexacion.
  - Sin structured data, Merchant Center, buscador, filtros, carrito, checkout ni pagos.
- Riesgos pendientes:
  - No se hizo smoke manual porque no hay servidores locales activos.
  - Adapter S3 no probado contra AWS real por restriccion de no tocar/crear recursos AWS.
  - No hay cleanup automatico del objeto S3 si S3 sube correctamente pero DB falla despues.
- Documentacion creada: `docs/qa/PHASE2S8D_AWS_S3_CLOUDFRONT_IMAGE_UPLOAD_QA.md`.

### Cierre Fase 2S.8E AWS staging smoke validation

- Tipo: cierre documental con validacion manual reportada por el operador.
- Opencode NO ejecuto el smoke real ni verifico directamente AWS/Lightsail/S3/CloudFront/IAM.
- Alcance validado manualmente por el operador:
  - Lightsail staging actualizado desde `origin/master`.
  - Docker Compose con backend, Angular y PostgreSQL operativo.
  - Flyway aplicado hasta V18.
  - Login 200, health 200, puertos seguros.
  - Upload manual de imagen principal funciona end-to-end.
  - Imagen servida desde CloudFront `cdn-staging.inktoy.pe`.
- Infraestructura:
  - Lightsail staging, Docker Compose, Caddy.
  - S3 privado `inktoy-ecommerce-images-staging`, region `us-east-1`, prefix `staging/ecommerce`.
  - CloudFront con CNAME `cdn-staging.inktoy.pe`.
  - Swap 2 GB para builds Docker.
- Exclusiones confirmadas:
  - Sin cambios en codigo backend/frontend/Storefront.
  - Sin cambios en Flyway ni docker-compose.
  - Sin creacion de recursos AWS.
  - Sin credenciales en repo.
  - Sin commit ni push.
  - Sin activacion de indexacion.
- No validado en esta fase:
  - Storefront Next.js desplegado en Lightsail.
  - Render end-to-end Storefront -> CloudFront.
  - Acceso S3 directo anonimo 403.
  - Importacion masiva por URL publica.
  - Excel + ZIP de imagenes.
- Riesgos pendientes:
  - Confirmar evidencia de S3 directo 403.
  - Ruta duplicada `/staging/ecommerce/ecommerce/...` a revisar antes de produccion.
  - Mantener secretos solo en `.env` del servidor.
  - Formalizar overrides de staging para docker-compose/puertos/env_file.
  - Disenar consistencia DB/S3 para cargas masivas.
- Documentacion creada: `docs/qa/PHASE2S8E_AWS_STAGING_SMOKE_QA.md`.
- Pendiente recomendado: 2S.8F -- Importacion masiva de imagen principal por URL publica.

### Implementacion Fase 2S.8F primary image URL import

- Tipo: feature backend/frontend + QA documental.
- Objetivo: importacion masiva separada de imagen principal URL-only para perfiles online ecommerce existentes, usando SKU como clave humana principal.
- Backend:
  - Nuevo use case `EcommercePrimaryImageUrlImportUseCase`.
  - Nuevo enum `EcommercePrimaryImageUrlImportAction`.
  - Nuevo port `EcommercePrimaryImageUrlImportWorkbookPort`.
  - Nuevo service `EcommercePrimaryImageUrlImportApplicationService`.
  - Nuevo adapter POI `PoiEcommercePrimaryImageUrlImportWorkbookAdapter`.
  - Nuevo controller `EcommercePrimaryImageUrlImportController`.
  - Nuevos DTOs de preview/confirm.
- Endpoints nuevos:
  - `GET /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/template`.
  - `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview`.
  - `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file`.
- Contrato XLSX:
  - Requeridas: `sku`, `imageUrl`, `altText`, `source`, `rightsConfirmed`.
  - Opcionales: `assetType`, `displayOrder`, `publishedUpdateConfirmed`, `productName`, `publicationStatus`, `currentImageUrl`.
  - `productName`, `publicationStatus` y `currentImageUrl` son informativas.
- Reglas:
  - Preview sin persistencia.
  - Confirm-file revalida todo antes de aplicar.
  - Aplica solo filas validas `CREATE`/`UPDATE`.
  - `NO_CHANGE` no modifica DB.
  - `REJECT` se reporta y permite importacion parcial.
  - `PublicImageUrlPolicy` valida `imageUrl` sin duplicar reglas.
  - No hay HEAD/GET ni descarga remota de imagenes.
  - `ProductAsset` queda URL-only con metadata storage nula.
  - Perfil `PUBLISHED` con cambio requiere `publishedUpdateConfirmed=true`.
- Angular:
  - Nueva pantalla standalone `primary-image-url-import-page.component.ts`.
  - Nueva ruta `/ecommerce-admin/perfiles/imagenes/importar`.
  - Nuevos modelos y metodos en `EcommerceAdminService`.
  - Navegacion agregada en Catalogo online y acceso desde Perfiles online.
  - Preview con filtros todas/validas/errores/warnings y confirm dialog.
- Tests:
  - Nuevo `EcommercePrimaryImageUrlImportIntegrationTest` con template, preview no persistente, confirm parcial, validaciones, perfiles publicados, `PUBLISHED + NO_CHANGE` y reemplazo URL-only de asset con metadata S3.
- Validaciones:
  - `./mvnw -DskipTests compile`: OK.
  - `./mvnw -Dtest=EcommercePrimaryImageUrlImportIntegrationTest test`: 8 tests, 0 failures, BUILD SUCCESS.
  - `./mvnw -Dtest=EcommerceCatalogApplicationServiceTest test`: 29 tests, 0 failures, BUILD SUCCESS.
  - `npm run build` en frontend: OK.
- Exclusiones confirmadas:
  - Sin CSV.
  - Sin ZIP ni carga binaria masiva.
  - Sin presigned URL.
  - Sin galeria.
  - Sin Storefront Next.js.
  - Sin Flyway ni docker-compose.
  - Sin AWS/Lightsail/S3/CloudFront/IAM ni `.env` real.
  - Sin secretos/access keys/tokens/passwords.
  - Sin Merchant Center, structured data, indexacion, carrito, checkout ni pagos.
  - Sin cambios en Producto ERP, POS, stock, inventario, unidades, costos, precios ERP ni categorias ERP.
  - Sin commit, push ni tag.
- Riesgos pendientes:
  - URL remota no verificada por existencia/MIME/dimensiones/peso.
  - Si reemplaza asset S3, no se borra objeto S3 previo.
  - Mantener alineadas allowlists backend/Storefront.
  - Storefront Next.js staging no desplegado.
  - 2S.9 Excel + ZIP requiere estrategia DB/S3 y validacion binaria.
- Documentacion creada: `docs/qa/PHASE2S8F_PRIMARY_IMAGE_URL_IMPORT_QA.md`.
