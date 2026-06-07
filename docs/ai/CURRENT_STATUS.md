# Current Status - InkToy ERP/POS

## Estado actual

Proyecto en estado pre-piloto con MVP funcional, estabilizado y con validaciones tecnicas/QA documentadas.

## Estado ecommerce SEO-first

- Fase 0 documental ecommerce cerrada a nivel de decisiones: ECOM-ADR-001 al ECOM-ADR-019 existen y estan aprobados para la futura tienda online SEO-first.
- `docs/ecommerce/PRELIMINARY_ECOMMERCE_CONTRACTS.md` existe y queda como contrato preliminar aprobado para fases posteriores.
- `docs/qa/PHASE0_ECOMMERCE_VALIDATION_CHECKLIST.md` existe y queda revisado/cerrado mediante seccion de cierre formal, sin validar codigo funcional porque Fase 0 es documental.
- Fase 1C del modulo ecommerce admin interno quedo cerrada funcional y documentalmente: perfiles online, detalle/editor, marcas ecommerce y categorias online implementados y auditados; build frontend exitoso; QA manual ligero sin bloqueantes conocidos.
- El backend ecommerce admin ya cuenta con soporte interno para perfiles online, marcas, categorias, slugs/metadata/assets/precio online segun alcance Fase 1B/1C.
- Fase 2A Storefront publico SEO-first Discovery & Contracts quedo cerrada documentalmente con commit `9fc65ca docs: start phase 2a storefront discovery`.
- Fase 2B Public Catalog API Design cerrada documentalmente con diseno de endpoints, DTOs publicos, errores seguros, reglas SEO y checklist QA de diseno.
- Fase 2C implementacion backend read-only completada funcionalmente y pusheada. Commits:
  - `3236e02 feat(storefront): add public API security baseline`
  - `d247106 feat(storefront): add public products listing`
  - `65a2921 feat(storefront): add public product detail by slug`
  - `4c6e1c6 feat(storefront): add public categories listing`
  - `abc4809 feat(storefront): add public category detail by slug`
  - `d5ab5ea feat(storefront): add public sitemap JSON source`
- Endpoints publicos read-only implementados y testeados:
  - `GET /api/v1/storefront/catalog/products` — listado paginado de productos publicados.
  - `GET /api/v1/storefront/catalog/products/{slug}` — detalle de producto por slug.
  - `GET /api/v1/storefront/catalog/categories` — listado de categorias online activas.
  - `GET /api/v1/storefront/catalog/categories/{slug}` — detalle de categoria por slug.
  - `GET /api/v1/storefront/seo/sitemap` — fuente JSON para sitemap futuro.
- Tests focalizados de Fase 2C: 52 tests, 0 failures, BUILD SUCCESS.
- Full backend suite verde tras correccion de deuda QA: `mvn test`, 348 tests, 0 failures, 0 errors, BUILD SUCCESS.
- Arquitectura hexagonal estricta mantenida: controllers, DTOs publicos separados, use cases, ports, adapters, proyecciones de dominio.
- Sitemap implementado como endpoint JSON (`/api/v1/storefront/seo/sitemap`), no como `sitemap.xml` real.
- NO se implemento: `sitemap.xml` real, Next.js, Storefront publica, filtros `categorySlug`, marcas publicas, checkout, pagos, delivery, Merchant Center, pedidos online, stock reservado.
- NO se toco: frontend Angular, Flyway/DB, Docker, `.env`, secretos, dependencias, POS, ventas, caja, facturacion, inventario.
- Deuda QA preexistente resuelta: `ProductCleanupPreviewIntegrationTest` corregida en commit `eb56641 fix(test): make billing series fixture idempotent`. La causa era un helper privado `insertElectronicDocument` que no respetaba el constraint `uq_billing_series_doc_type_environment_active` al intentar insertar siempre una billing_series activa `RECEIPT`/`LOCAL` sin reutilizar una existente. Se agrego metodo `findOrCreateBillingSeries` find-or-create para hacer el fixture idempotente. `mvn test` completo ahora pasa: 348 tests, 0 failures, 0 errors, BUILD SUCCESS.
- Fase 2D Storefront Architecture Decision & SEO Delivery Plan iniciada como fase documental/arquitectonica.
- Fase 2D crea/actualiza documentacion para ADR Storefront Next.js, plan delivery SEO-first y checklist QA documental.
- Fase 2D no crea Next.js, no crea `storefront/`, no instala dependencias, no implementa `sitemap.xml` real y no toca codigo funcional.
- Restricciones vigentes en Fase 2D: no frontend Angular, no backend funcional, no Flyway/DB, no Docker, no `.env`, no secretos, no dependencias, no POS/ventas/caja/facturacion/inventario, no AWS/staging, no checkout/pagos/pedidos/stock reservado/delivery/Merchant Center.
- Modulos protegidos para Fase 1A y preparacion Fase 1: POS, inventario, ventas, caja y facturacion no deben modificarse.
- AWS/staging no debe tocarse hasta que exista una fase local estable y validada.
- Confirmado: no se toco codigo funcional en esta fase documental.

## Deudas tecnicas cerradas (segun documentacion actual)

- BT-001: una sola caja OPEN por usuario.
- BT-002: bloqueo de doble conversion concurrente de cotizacion.
- BT-003: stock inicial unico por producto/almacen.
- BT-004: hardening/control de usuarios seed.
- BT-006 Fase 1: endpoints /api/v2 con contrato paginado estable.
- BT-007A/B: limites seguros en reportes.
- BT-008: CORS configurable por ambiente.
- BT-009: validaciones de integracion HTTP/RBAC/DB real.
- BT-010: documentacion tecnica alineada.

## Deudas diferidas

- BT-005: despacho automatico de outbox desde modulos de negocio.
- BT-006 (frontend): migrar consumidores Angular de /api/v1 a /api/v2.
- BT-007C: indices/tuning avanzado de reportes con metricas reales.

## Estado frontend

- Branding InkToy aplicado.
- Sidebar avanzado operativo (grupos, compacto/expandido, scroll interno, logout fijo).
- Modo claro/oscuro con persistencia local.
- Rutas protegidas y experiencia RBAC validadas en QA.
- Frontend desplegado via Nginx con proxy /api.
- Stock de Inventario actualizado a `ProductAutocompleteComponent` compartido con `filterMode=true`, `disabled` reactivo, búsqueda editable por Producto, `Buscar` manual, auto-filtrado por Almacén y limpieza visual final sin `Todos` ni resumen inferior redundante.
- Ajustes de stock optimizado en frontend: autocomplete compartido, layout estable, almacén por nombre, cantidad decimal controlada con maximo 1 decimal, confirmacion propia y reset limpio post-success.
- ProductAutocompleteComponent compartido consolidado en Inventario con `disabled` reactivo y `filterMode` opt-in para pantallas filtro editables sin romper el comportamiento selector por defecto.
- Transferencias migrado a lista/carrito operativo con autocomplete compartido, lookup server-side, navegación teclado, item activo sombreado, almacenes por nombre, tabla alineada Producto/Cantidad/Accion y confirmacion propia.
- Kardex enriquecido: backend devuelve nombres operativos de producto/almacen; frontend usa autocomplete compartido, fechas locales, paginacion server-side, tabla alineada con wrappers internos y un solo Limpiar global.
- Proveedores rediseñado como pantalla de mantenimiento centrada en tabla principal con drawer/modal local reutilizable para crear/editar, confirmaciones del sistema para desactivar/reactivar y tabla compacta sin ID visible.
- Órdenes de compra rediseñadas completo en 5 fases (frontend-only, sin cambios backend/endpoints): Fase 1 listado con columna `Orden`, almacén por nombre y ConfirmDialogService; Fase 2 nueva orden con ProductAutocompleteComponent, tabla tipo carrito y sanitización cantidad/costo; Fase 3 edición alineada con nueva orden; Fase 4 detalle con fechas Intl.DateTimeFormat, moneda Intl.NumberFormat, tabla colgroup y badge de estado; Fase 5 recepción con summary-grid, tabla de pendientes, input decimal sanitizado, validación inline y ConfirmDialogService.
- Cotizaciones rediseñadas completo en 5 fases (frontend-only, sin cambios backend/endpoints): Fase 1 listado con columna `Cotización`, estados traducidos, moneda/fechas Intl y ConfirmDialogService; Fase 2 nueva cotización con ProductAutocompleteComponent, tabla tipo carrito, cantidades/descuentos sanitizados y validación de subtotal; Fase 3 edición alineada con nueva cotización y `syncSelectedToInput` opt-in; Fase 4 detalle con badges, historial y tablas alineadas; Fase 5 conversión con resumen compacto, almacén por nombre, pagos traducidos y ConfirmDialogService.
- Catalogo/Productos optimizado: busqueda multi-token en listado paginado, filtros reorganizados por prioridad, tabla compacta y acciones estables sin recorte.
- POS con draft persistente frontend (`sessionStorage`) y UX afinada: rehidratacion por usuario/caja, Enter/Buscar unificados, búsqueda textual sin almacén, validacion de almacén para agregar/cobrar, select operativo por nombre y botones Agregar uniformes.
- Detalle de comprobante electronico elevado a UX empresarial: cards key-value compactas, progreso electronico con contraste mejorado, XML tecnico colapsable, historial descendente, tabla de items simplificada mostrando nombre real + SKU + codigo de barras; sin ID tecnico visible; sin ProductService lookup frontend; backend expone `productName`/`sku`/`barcode` en items de comprobante sin tocar DB/Flyway ni endpoints.
- Emitir comprobante pendiente rediseñado a UX empresarial: header operativo sin MVP, cards key-value compactas, Tipo/Serie alineados con helper persistente, copy contextual por tipo de comprobante, tabla de items con nombre real + SKU + codigo, montos PEN, sin ID tecnico visible; flujo de contingencia sin alterar reglas tributarias ni contratos.
- Hardening Fase 1 del ciclo tributario posterior: LOCAL/BETA operan como simulacion controlada; PROD bloquea firma/envio cuando no existe proveedor tributario real ni firma XML real, evitando `ACCEPTED` simulado en produccion.
- Hardening Fase 2 de series y correlativos: unica serie activa por documentType+environment (409 si duplica); currentNumber tratado como proximo correlativo a emitir (bloquea si <= maxIssuedNumber con mensaje de negocio); validacion defensiva en `createFromSale()` bloquea emision antes de crear documento/incrementar correlativo; migracion Flyway V16 con indice unico parcial `active=true` por `document_type+environment`; tests 32 OK, build OK; inconsistencia historica detectada y corregida manualmente: B001/LOCAL tenia current_number=1 y max_issued=2, se corrigio desde UI Series a currentNumber=3 (proximo correlativo) y la serie quedo INACTIVA; trazabilidad historica preservada; no se modificaron datos automaticamente.
- Pantalla Series y numeracion tributaria redisenada a consola operativa empresarial (frontend-only): header sin MVP, copy operativo en dos lineas, chips compactos LOCAL/BETA/PROD dark-tinted, formulario cerrado por defecto con boton Nueva serie, modo edicion con contexto, Cancelar, label Proximo correlativo + helper persistente, field-help persistente anti-layout shift, filtros Tipo/Ambiente/Estado, separacion Series vigentes/historicas (colapsables), confirmaciones activar/desactivar, badges sobrios, mensajes 409 operativos; sin cambios de contratos backend/endpoints.
- Ventas integrado con comprobantes electronicos en listado y detalle (Fases 1-2C + refinamiento visual):
  - Fase 1 UX: montos con Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }); fechas con Intl.DateTimeFormat("es-PE"); saleNumber como identificador principal; ID interno secundario; "Total linea" -> "Importe"; anulacion usa ConfirmDialogService con copy de impacto en stock/caja/pagos.
  - Fase 2A detalle: ElectronicDocumentService.listBySaleId(saleId) ya no hace fallback a list() global; solo consulta GET /api/v1/billing/documents?saleId=...; bloque "Comprobante electronico" con CTA contextual: Emitir -> /facturacion/emitir/:saleId, Ver -> /facturacion/comprobantes/:id; sin mostrar ambos CTA a la vez.
  - Fase 2B listado: backend agrego endpoint no rompiente GET /api/v1/sales/list-items con read-model dedicado (SalesListItemResponse, BillingSummaryResponse, SaleBillingSummary, SalesBillingSummaryReadPort); evita N+1 con una consulta de ventas + una batch de comprobantes por saleIds + ensamble en memoria; si hay multiples comprobantes por venta usa el mas reciente por createdAt DESC, id DESC; GET /api/v1/sales y SaleResponse intactos para detalle; frontend listado consume /api/v1/sales/list-items; columna "Comprobante" sin consultas por fila.
  - Fase 2C proteccion de anulacion: backend bloquea anulacion si comprobante mas reciente esta en DRAFT/GENERATED/SIGNED/SENT/ACCEPTED; permite sin comprobante o REJECTED/ERROR/CANCELLED; validacion antes de revertir stock; si bloquea no revierte stock, no marca VOIDED, no altera caja ni pagos; SalesConflictException con HTTP 409; frontend muestra advertencia preventiva y maneja 409 con mensaje operativo claro.
  - Refinamiento visual UX: chips/badges sobrios dark-tinted con borde tenue en listado; Pendiente neutral; numero como dato principal menos invasivo; estado+ambiente como linea secundaria; bloque detalle redisenado en formato horizontal compacto de 4 columnas (Tipo/Numero/Estado/Ambiente) con labels arriba y valores debajo; se corrigieron casos visuales pegados (TipoBoleta, EstadoBORRADOR, etc.); copy reducido a "Seguimiento del comprobante asociado."; boton Ver/Emitir alineado debajo a la izquierda; advertencia de bloqueo compacta; sin consultas nuevas ni N+1; sin cambios backend/endpoints en esta fase visual.
  - Queda pendiente: flujo formal de nota de credito/anulacion tributaria; posible enriquecimiento futuro de caja/almacen con nombres reales; posible descarga formal XML/CDR con proveedor tributario real.
- Caja UX.1 y UX.2A frontend-only completadas: caja reorganizada como consola operativa; formatos Intl es-PE para fechas/montos; OPEN/CLOSED traducidos; badge superior con visibilidad intermedia (Sesion abierta/Sesion cerrada/Sin caja abierta); resumen principal con Caja #id e ID interno movido a Datos tecnicos colapsable; apertura priorizada solo sin caja abierta; cierre priorizado con ConfirmDialogService; consulta por ID como bloque secundario colapsable; sesion cerrada se conserva visible tras el cierre; UUID tecnico fuera de la card principal; no se toco backend ni contratos.
- Configuracion tributaria evolucionada a consola operativa por ambiente (LOCAL/BETA/PROD): resumen visual de perfil/series/estado, warnings preventivos perfil-serie, reglas de simulacion y bloqueo PROD, validaciones RUC 11 y ubigeo 6, con navegacion directa a Series; layout estable con field-help persistente en RUC/Razon social, Ubigeo/Departamento y Provincia/Distrito para evitar desalineacion visual; loading gate + loader neutral con delay de 280 ms para evitar flicker al presionar F5, sin mostrar formulario vacio, cards incompletas ni skeleton con cuadros vacios.

## Estado backend

- Build y verify exitosos en corridas de referencia QA.
- Seguridad JWT/RBAC operativa.
- Endpoints principales de modulos MVP operativos.
- Contrato legado v1 convive con contrato estable v2 para paginacion.
- Catalogo reforzado: Categorias con update/status y proteccion de `Por clasificar`; Unidades con update/status y validacion de estado.
- Catalogo frontend operativo: Categorias y Unidades ya tienen mantenimiento basico completo en UI (crear/editar/estado) con tablas sin ID.
- Inventario/Almacenes con alta/baja logica operativa: `PATCH /api/v1/warehouses/{id}/status`, `DELETE` como alias de desactivacion y UI con desactivar/reactivar.
- Catalogo expone lookup compacto `GET /api/v1/products/lookup` para autocomplete de productos por nombre/SKU/barcode.

## Estado QA

- Sin hallazgos CRITICAL/HIGH abiertos en reportes de estabilizacion.
- Persisten deudas LOW/MEDIUM de hardening/operacion no bloqueantes.
- Checklist de regresion actualizado con validaciones por rol y smoke full-stack.

## Estado Docker y Flyway

- Docker Compose operativo con postgres/backend/frontend.
- Flyway aplicado en arranque backend, con migraciones versionadas en uso.
- Evidencia de runtime saludable en reportes QA recientes.

## Advertencias importantes antes de seguir trabajando

1. Respetar alcance de cada tarea para evitar regresiones cruzadas.
2. No usar datos reales sin autorizacion explicita.
3. Evitar mezclar cambios funcionales con cambios de estilo/documentacion.
4. Mantener compatibilidad temporal v1/v2 mientras frontend no migre completo.
5. En QA frontend, controlar riesgo de cache visual (segun protocolo UX-011).
6. No realizar commits/tags/push automaticos desde agentes.

## Fase 2E.0 Storefront MVP Shell Planning

- Fase 2E.0 iniciada como documentacion tecnica de stack, estructura y shell minimo.
- ADR-021 creado: confirma Next.js 16, App Router, TypeScript, npm, Tailwind CSS.
- Plan MVP Shell creado: define estructura de carpetas, configuracion base, variables de entorno y wrapper API futuro.
- Checklist QA Fase 2E creado.
- Fase 2E.0 NO crea `storefront/`, NO instala Next.js, NO instala dependencias, NO implementa paginas reales.
- Restricciones vigentes: no backend funcional, no Angular, no Flyway/DB, no Docker, no `.env` raiz, no AWS/staging, no checkout/pagos/pedidos/stock reservado/delivery/Merchant Center.

## Fase 2E.1 Storefront MVP Shell Implementation

- Implementacion completada y pusheada en commit `c049e3e feat(storefront): add Next.js MVP shell`.
- Next.js 16.2.7 instalado con App Router, TypeScript, Tailwind CSS, ESLint, npm.
- Estructura creada: `app/`, `lib/api.ts`, `types/storefront.ts`, `public/robots.txt`, `.env.local.example`, `next.config.ts`.
- Build, lint y typecheck: OK.
- `npm audit`: 2 vulnerabilidades moderadas en `postcss` (dependencia transitiva de Next.js) como deuda no bloqueante.
- Warning Turbopack por multiples lockfiles como deuda no bloqueante.
- `robots.txt` bloquea crawlers (`Disallow: /`). Layout con `robots: { index: false, follow: false }`.
- `.env.local` real no existe. `.env.local.example` es la plantilla commiteable.
- Sin paginas reales, sin consumo real de API, sin `sitemap.xml`.
- Sin cambios en backend, Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.
- Pendientes no bloqueantes: README.md generico, SVGs default de Next.js en `public/`, warning Turbopack.

## Fase 2F.0 Public SEO Catalog MVP Planning

- Plan documental creado: `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md`.
- Checklist QA creado: `docs/qa/PHASE2F_PUBLIC_SEO_CATALOG_QA_CHECKLIST.md`.
- Limpieza documental ejecutada:
  - Duplicados 2E eliminados de `ECOMMERCE_BACKLOG.md`.
  - Duplicados 2E eliminados de `PHASE2E_STOREFRONT_MVP_SHELL_QA_CHECKLIST.md`.
  - `STOREFRONT_SEO_FIRST_STRATEGY.md` actualizado: `storefront/` ya existe, sitemap.xml real diferido.
- Subfases 2F.0 a 2F.5 definidas en plan documental.
- Google Stitch documentado como subfase 2F.1: herramienta de diseño visual, no generador de código final.
- Restricciones vigentes:
  - No paginas reales, no consumo real de API, no checkout, no pagos, no pedidos.
  - No sitemap.xml real, no marcas publicas, no filtros avanzados.
  - No AWS/staging, no Docker raiz, no .env raiz.
  - No cambios backend, Angular, Flyway/DB.
- Cerrada documentalmente en commit `4e22712`.

## Fase 2F.1 Diseno Visual - Catalogo Creativo Profesional

- Direccion visual aprobada: "Catalogo Creativo Profesional".
- Documentos creados:
  - `docs/ecommerce/STOREFRONT_VISUAL_APPROVAL_2F1.md`
  - `docs/qa/PHASE2F1_VISUAL_APPROVAL_QA_CHECKLIST.md`
- Paleta: Azul `#0A2540`, Amarillo `#FFD166`, Rojo `#EF476F`, blanco y grises suaves.
- Tipografias: Fraunces (titulos), DM Sans (cuerpo/UI).
- Componentes visuales definidos: Header, Footer, BottomNavigation, Button, Badge, Chip, ProductCard, CategoryCard, EmptyState, ProductImageFrame, Accordion, StickyProductCTA, Breadcrumbs, SectionHeading.
- Navegacion MVP: Inicio, Categorias, Buscar, Tiendas.
- CTAs: "Ver detalle", "Ver categoria", "Consultar en tienda".
- Badges: Disponible, Agotado, Disponible en tienda.
- Ajustes menores registrados: sticky CTA safe area, chips scroll horizontal, productos relacionados opcionales.
- Restricciones: sin checkout, carrito, pagos, pedidos, login, perfil, admin, ERP interno, Merchant Center.
- Siguiente paso: Fase 2F.2 Componentes base Next.js + Tailwind.

## Fase 2F.2 Componentes base Next.js + Tailwind

- Fase 2F.2A completada: foundations visuales y componentes UI base.
  - Button, Badge, Chip, Breadcrumbs, SectionHeading, ProductImageFrame.
  - Tokens visuales en `globals.css` con `@theme inline` de Tailwind v4.
- Fase 2F.2B completada: componentes de layout.
  - StorefrontHeader, StorefrontFooter, BottomNavigation.
  - Logo real InkToy integrado desde `storefront/public/assets/images/brand/logo-inktoy.png`.
- Fase 2F.2C completada: componentes visuales de catálogo.
  - ProductCard, CategoryCard, EmptyState, Accordion, StickyProductCTA.
  - Preview técnico en `storefront/app/page.tsx` con datos mock/static.
  - Commit: `1a55ec0 feat(storefront): add catalog visual components`.
- Validaciones:
  - `npm run build`: OK (compiled successfully, 0 errors).
  - `npm run lint`: OK (0 warnings).
  - `npx tsc --noEmit`: OK (0 errors).
- Confirmaciones:
  - Sin páginas reales `/productos`, `/productos/[slug]`, `/categorias`, `/categorias/[slug]`.
  - Sin consumo real de endpoints Storefront.
  - Sin `sitemap.xml` real.
  - Sin checkout, pagos, pedidos, delivery, Merchant Center, login, perfil ni admin.
  - Sin cambios en backend, Angular, Flyway/DB, Docker, `.env` raíz, AWS/staging.
- Deudas no bloqueantes registradas:
  - Logo puede requerir ajuste fino en páginas reales.
  - Placeholders visuales no son assets finales.
  - Páginas reales con BottomNavigation deben reservar padding inferior.
  - Chips requieren scroll horizontal controlado.
  - Imágenes reales pendientes.
  - StickyProductCTA implementado pero no montado en preview.
  - Warning Turbopack por múltiples lockfiles.
  - ProductImageFrame/next/image requerirá configuración de patrones remotos.
  - Preview en `/` debe ser reemplazado por Home real.
- Fase 2F.2D QA técnica/documentación de componentes cerrada documentalmente.
- Documentación creada:
  - `docs/ecommerce/STOREFRONT_COMPONENTS_SYSTEM_2F2.md`
  - `docs/qa/PHASE2F2_STOREFRONT_COMPONENTS_QA_CHECKLIST.md`
- Documentación actualizada:
  - `docs/ecommerce/ECOMMERCE_ROADMAP.md`
  - `docs/ecommerce/ECOMMERCE_BACKLOG.md`
  - `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md`
  - `docs/ai/CURRENT_STATUS.md`
  - `docs/ai/CHANGE_CONTROL.md`

## Siguiente etapa recomendada

1. Abrir Fase 2G.3A — Indicador de perfil online en Productos (Angular frontend).
2. No avanzar a carrito, checkout, pagos, pedidos ni login sin completar 2G.3A.
3. Preparar carga inicial real controlada (catalogo, almacenes, stock base y parametros operativos), solo cuando exista autorizacion explicita del responsable de negocio/tecnico.

## Fase 2G.1 Publicacion de producto operativo a perfil ecommerce

- Fase 2G.1 completada: endpoint `POST /api/v1/ecommerce-admin/products/{id}/online-profile` implementado.
- Permite crear perfil online DRAFT directamente desde un producto ERP/POS existente.
- Commit: `f766397 feat(ecommerce): add create online profile from product`.
- Tests: `EcommerceAdminProfilesIntegrationTest` 11 tests, 0 failures, BUILD SUCCESS.
- Sin cambios en frontend Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.
- Sin checkout, carrito, pagos, pedidos, login cliente, perfil cliente, Merchant Center.

## Fase 2G.2 Smoke Test Real de Producto Publicado → Storefront

- Fase 2G.2 completada y validada end-to-end.
- Producto ERP/POS (ProductId 5839) → Perfil online DRAFT → PUBLISHED → Storefront `/productos/producto-smoke-test-2g2-1780622524` (200 OK).
- Storefront valida: H1 correcto, precio PEN 25.90, descripcion, categoria/marca badges, breadcrumbs, CTA "Consultar en tienda", metadata SEO (noindex, canonical, OG tags), header/footer/bottom navigation.
- Casos negativos validados: 404 slug inexistente, 404 DRAFT no publicado, 409 duplicado, 403 SUPERVISOR.
- Backend Docker requirio rebuild (`docker compose up --build -d`) para incluir codigo 2G.1.
- Configuracion local: `storefront/.env.local` con `STOREFRONT_API_BASE_URL=http://localhost:8080` y `STOREFRONT_INDEXING_ENABLED=false` (ignorado por git).
- Deudas no bloqueantes: asset externo no renderiza (getSafeImageSrc solo acepta paths relativos), disponibilidad "No disponible temporalmente" por falta de stock operativo.
- Documentacion creada: `docs/qa/PHASE2G2_PUBLISHED_PRODUCT_SMOKE_TEST.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`, `docs/qa/REGRESSION_CHECKLIST.md`, `docs/ecommerce/ECOMMERCE_ROADMAP.md`, `docs/ecommerce/ECOMMERCE_BACKLOG.md`.
- Sin cambios en codigo funcional durante fase documental 2G.2D.
- Sin cambios en frontend Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.
- Sin checkout, carrito, pagos, pedidos, login cliente, perfil cliente, Merchant Center.

## Fase 2H.5D QA Detalle de Perfil Online

- Fase 2H.5C-FIX cerrada funcionalmente en commit `fcf6017 feat(ecommerce-admin): refine online profile detail workflow`.
- Pantalla validada: `Catalogo online > Perfiles online > Detalle de Perfil online`.
- Archivo funcional validado: `frontend/src/app/features/ecommerce-admin/online-profile-detail-page.component.ts`.
- Alcance validado: tabs Contenido/SEO/Imagen/Precio, checklist lateral clicable, `Ir al primer pendiente`, panel `Requisitos para publicar` como guia operativa, pendientes primero, completados colapsados/discretos, copy/paleta/tipografia/jerarquia visual.
- Validaciones: `npm run build` OK, smoke UI Docker/headless OK, desktop/tablet/mobile OK, caso con pendientes OK, caso sin pendientes OK, sin errores JS.
- Documentacion QA creada: `docs/qa/PHASE2_2H5D_ONLINE_PROFILE_DETAIL_QA.md`.
- Sin cambios en backend, endpoints, DTOs, servicios, Storefront, Flyway/DB, Docker, `.env`, secretos, reglas de publicacion, payloads ni contratos durante el cierre documental.
