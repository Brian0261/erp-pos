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
- POS polish visual cerrado con PASS: estado de caja compacto, empty state del carrito compacto y limpieza explícita de búsqueda con accion `Limpiar búsqueda`; validaciones `build`, `e2e:no-write` y `e2e:no-write:headed` en PASS.
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
4. Opcionalmente, abrir fase visual de alineacion Storefront mobile-first basada en disenos Stitch (refinamiento visual, `/categorias/[slug]`, Home real, buscador, filtros).

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

## Fase 2S.2A Catalogo Publico Navegable Minimo

- Fase 2S.2A cerrada funcional y documentalmente.
- Paginas publicas creadas en Storefront Next.js:
  - `storefront/app/productos/page.tsx` — Listado publico de productos.
  - `storefront/app/categorias/page.tsx` — Listado publico de categorias.
- Microajustes visuales/copy aplicados (2S.2A-FIX):
  - Copy comercial/orientado al cliente en ambas paginas.
  - Eliminados textos tecnicos orientados al ERP/POS.
  - `/categorias` muestra "Detalle proximamente" en lugar de CTA enganoso con href="#".
- Validaciones: `npm run build` OK, `npm run lint` OK, `npx tsc --noEmit` OK, `git diff --check` OK.
- Smoke HTTP: `/productos` 200 OK, `/categorias` 200 OK, `/productos/{slug}` 200 OK, `/categorias/[slug]` 404 esperado, `/buscar` 404 esperado.
- Confirmado: sin llamadas a `/api/v1/ecommerce-admin`, robots/noindex activos, Server Components, consumo exclusivo de `/api/v1/storefront/**`.
- NO se implemento: Home real, buscador, filtros, `/categorias/[slug]`, carrito, checkout, pagos, pedidos, login cliente, Merchant Center, sitemap XML, imagenes externas.
- NO se toco: backend, Angular, ecommerce-admin, contratos, DTOs, Flyway/DB, Docker, `.env`, secretos, seguridad, endpoints, `/productos/[slug]`.
- Documentacion QA creada: `docs/qa/PHASE2S2A_STOREFRONT_NAVIGABLE_CATALOG_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: fase visual de alineacion Storefront mobile-first basada en disenos Stitch.

## Fase 2S.2B-A Alineacion Visual Storefront Mobile-First de Listados

- Fase 2S.2B-A cerrada funcional y documentalmente.
- Ajustes visuales aplicados en Storefront Next.js:
  - `/productos` usa grid mobile-first de 2 columnas: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.
  - `ProductCard` mas compacta: menos padding, textos mas pequenos en mobile, nombre limitado a 2 lineas, boton "Ver detalle" con `size="sm"`.
  - `ProductImageFrame` con fallback mas de marca: "Imagen InkToy proximamente".
  - `/categorias` con cards tipo fila comerciales: bloque visual lateral, nombre destacado, descripcion con limite visual, estado discreto "Detalle proximamente", sin CTA falsa.
- Validaciones: `npm run build` OK, `npm run lint` OK, `npx tsc --noEmit` OK, `git diff --check` OK.
- Smoke HTTP: `/productos` 200 OK (grid 2 columnas), `/categorias` 200 OK (sin CTA falsa), `/productos/{slug}` 200 OK, `/categorias/[slug]` 404 esperado, `/buscar` 404 esperado.
- Confirmado: sin llamadas a `/api/v1/ecommerce-admin`, robots/noindex activos, Server Components, consumo exclusivo de `/api/v1/storefront/**`.
- NO se implemento: Home real, buscador, filtros, `/categorias/[slug]`, carrito, checkout, pagos, pedidos, login cliente, Merchant Center, sitemap XML, imagenes externas, `remotePatterns`.
- NO se toco: backend, Angular, ecommerce-admin, contratos, DTOs, Flyway/DB, Docker, `.env`, secretos, seguridad, endpoints, `/productos/[slug]`, `globals.css`.
- Documentacion QA creada: `docs/qa/PHASE2S2B_A_STOREFRONT_VISUAL_ALIGNMENT_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: discovery separado para categoria publica `/categorias/[slug]` y productos por categoria.

## Fase 2S.3A Categoria Publica /categorias/[slug] con Productos por Categoria

- Fase 2S.3A cerrada funcional y documentalmente.
- Backend: `GET /api/v1/storefront/catalog/products` ahora acepta `categorySlug` opcional.
  - Sin `categorySlug`: comportamiento identico al anterior.
  - Con `categorySlug`: filtra server-side por categoria online activa.
  - Mantiene `page`, `size`, `sort=name_asc`.
  - `categorySlug` inexistente o categoria inactiva: pagina vacia `200`, sin romper contrato.
  - No se agregaron DTOs nuevos ni endpoint duplicado.
- Storefront:
  - `storefront/lib/api.ts`: `getStorefrontProducts()` acepta `categorySlug` opcional.
  - `storefront/app/categorias/[slug]/page.tsx`: nueva pagina dinamica con metadata SEO, canonical, noindex.
  - `storefront/app/categorias/page.tsx`: cada categoria enlaza a `/categorias/{slug}`.
- Validaciones: tests backend focalizados OK (43 tests, 0 failures), `npm run build` OK, `npm run lint` OK, `npx tsc --noEmit` OK, `git diff --check` OK.
- Smoke HTTP: `/categorias/{slug-con-productos}` 200 OK, `/categorias/{slug-inexistente}` 404 OK, `/productos` 200 OK, `/productos/{slug}` 200 OK, `/buscar` 404 OK.
- Confirmado: sin llamadas a `/api/v1/ecommerce-admin`, robots/noindex activos, Server Components, consumo exclusivo de `/api/v1/storefront/**`.
- NO se implemento: Home real, buscador, filtros UI, carrito, checkout, pagos, pedidos, login cliente, Merchant Center, sitemap XML, imagenes externas, `remotePatterns`, productos relacionados, marcas publicas, client-side filtering, endpoints duplicados.
- NO se toco: Angular, ecommerce-admin, Flyway/DB, Docker, `.env`, secretos, seguridad, `/productos/[slug]`, `globals.css`, DTOs publicos.
- Riesgo de despliegue: Storefront nuevo debe desplegarse junto con backend nuevo porque depende de `categorySlug`.
- Documentacion QA creada: `docs/qa/PHASE2S3A_PUBLIC_CATEGORY_PRODUCTS_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: discovery de Home real SEO-first.

## Fase 2S.4A Home real SEO-first Storefront

- Fase 2S.4A cerrada funcional y documentalmente.
- `storefront/app/page.tsx` reemplazo el preview/mock por una Home real MVP SEO-first.
- La Home consume datos reales de contratos publicos existentes:
  - categorias publicas con `getStorefrontCategories({ page: 0, size: 6 })`;
  - productos publicos con `getStorefrontProducts({ page: 0, size: 8 })`.
- Secciones implementadas:
  - hero comercial real;
  - categorias reales con enlaces a `/categorias/{slug}`;
  - productos reales con enlaces a `/productos/{slug}`;
  - bloque simple de confianza/beneficios;
  - header/footer/bottom navigation existentes.
- Confirmado: no quedan mocks funcionales, no quedan textos de preview tecnico, no quedan `href="#"`, no hay funciones falsas.
- Validaciones: `npm run build` OK, `npm run lint` OK, `npx tsc --noEmit` OK, `git diff --check` OK.
- Smoke HTTP: `/` 200 OK, `/productos` 200 OK, `/categorias` 200 OK, `/buscar` 404 OK.
- Confirmado: sin llamadas nuevas a `/api/v1/ecommerce-admin`, robots/noindex activos, Server Components, consumo exclusivo de `/api/v1/storefront/**`.
- NO se implemento: buscador funcional, filtros, carrito, checkout, pagos, login cliente, pedidos, promociones, banners administrables, sitemap XML, backend nuevo, contratos nuevos, `remotePatterns`, imagenes externas nuevas.
- NO se toco: backend, Angular, ecommerce-admin, contratos, DTOs, endpoints, Flyway/DB, Docker, seguridad, robots/noindex, sitemap, otras paginas.
- Documentacion QA creada: `docs/qa/PHASE2S4A_STOREFRONT_HOME_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: discovery de SEO tecnico de publicacion.

## Fase 2S.5A Base SEO tecnica del Storefront

- Fase 2S.5A cerrada funcional y documentalmente.
- Se creo la base SEO tecnica del Storefront sin activar indexacion.
- Se creo `storefront/app/sitemap.ts` para generar `sitemap.xml` desde el sitemap JSON backend.
- Se creo `storefront/app/robots.ts` como unica fuente efectiva de `/robots.txt`.
- Se creo `storefront/lib/seo.ts` para resolver base URL publica, URL absolutas y robots por entorno.
- Se agrego `STOREFRONT_PUBLIC_BASE_URL` en `storefront/.env.local.example` con fallback seguro a `http://localhost:3000`.
- Se normalizo canonical/metadata en `storefront/app/page.tsx`, `storefront/app/productos/page.tsx` y `storefront/app/categorias/page.tsx`.
- Se elimino `storefront/public/robots.txt` para evitar ambiguedad entre dos fuentes de robots.
- Confirmado: indexacion sigue bloqueada por defecto y `noindex` sigue activo por defecto.
- Validaciones: `npm run build`, `npm run lint`, `npx tsc --noEmit`, `git diff --check`.
- Smoke: `/`, `/productos`, `/categorias`, `/sitemap.xml`, `/robots.txt` 200 y `/buscar` 404 esperado.
- Excluido: backend, contratos, structured data, buscador, filtros, carrito, checkout, pagos, Merchant Center, `remotePatterns`, imagenes externas.
- Riesgos pendientes: dominio real en `STOREFRONT_PUBLIC_BASE_URL`, limpieza de datos de prueba antes de indexar, activacion posterior y controlada de indexacion.
- Documentacion QA creada: `docs/qa/PHASE2S5A_STOREFRONT_TECHNICAL_SEO_QA.md`.
- Pendiente recomendado: discovery de readiness de indexacion/publicacion real.

## Fase 2S.5C Storefront indexing readiness guardrails

- Fase 2S.5C cerrada funcional y documentalmente.
- Se centralizo la decision de indexacion en `canStorefrontAllowIndexing()`.
- Se bloqueo indexacion cuando `STOREFRONT_INDEXING_ENABLED=true` no viene acompanado de una base URL publicable.
- Se bloquearon `localhost`, `127.0.0.1`, `0.0.0.0` y dominios `example/test` como base publica indexable.
- `robots.ts`, `layout.tsx` y metadatos dinamicos usan el helper compartido para evitar inconsistencias.
- Confirmado: indexacion sigue bloqueada por defecto y `localhost` no puede quedar indexable aunque el flag sea true.
- Validaciones: `npm run build`, `npm run lint`, `npx tsc --noEmit`, `git diff --check`.
- Smoke: `/`, `/productos`, `/categorias`, `/sitemap.xml`, `/robots.txt` 200 y `/buscar` 404 esperado.
- Excluido: backend, contratos, structured data, buscador, filtros, carrito, checkout, pagos, Merchant Center, `remotePatterns`.
- Riesgos pendientes: limpiar datos smoke/test, configurar dominio real, mejorar contenido comercial real, activar indexacion solo en fase posterior separada y controlada.
- Documentacion QA creada: `docs/qa/PHASE2S5C_STOREFRONT_INDEXING_GUARDRAILS_QA.md`.
- Pendiente recomendado: discovery de limpieza de datos publicos y contenido indexable.

## Fase 2S.7A Bulk ecommerce online profile import/export MVP

- Fase 2S.7A cerrada funcional y documentalmente.
- Flujo separado de importacion/exportacion masiva de Perfiles online ecommerce.
- Endpoints ADMIN creados:
  - `GET /api/v1/ecommerce-admin/products/online-profiles/import/template`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/import/preview`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/import/confirm-file`
- Importacion por SKU con resolver batch a productId.
- SKU inexistente, duplicado en Excel o producto ERP inactivo se rechaza.
- Perfil publicado se protege/rechaza en MVP.
- No se crean productos ERP ni se modifica stock, inventario, unidad, costo, precio ERP ni categoria ERP.
- No se crean marcas/categorias online automaticamente.
- No se publica desde Excel; nuevos perfiles quedan DRAFT.
- `onlineName` y `slug` se autogeneran cuando corresponde.
- Slugs con `test`, `smoke`, `demo`, `prueba` o `example` se rechazan.
- Categoria online y marca se validan contra referencias existentes y activas.
- Frontend Angular con pantalla `/ecommerce-admin/perfiles/importar`.
- Microajustes UX: texto superior mas corto, boton Quitar archivo con limpieza completa, tabla con anchos estables/truncado, confirmacion previa con conteos.
- Validaciones: tests backend focalizados 57/57 OK, `npm run build` OK, `git diff --check` OK.
- Smoke manual no ejecutado porque no hay servidor local activo en esta sesion.
- Exclusiones: sin publicar desde Excel, sin bulk SEO/imagenes, sin crear productos ERP, sin modificar stock/inventario/unidad/costo/precio ERP, sin Storefront/POS/carrito/checkout/pagos/Merchant Center/structured data/remotePatterns.
- Riesgos pendientes: filtro por categoria ERP para plantilla fuera del MVP, sin script lint separado en frontend, sin smoke headless/e2e para esta pantalla.
- Documentacion QA creada: `docs/qa/PHASE2S7A_ONLINE_PROFILE_BULK_IMPORT_QA.md`.
- Documentacion actualizada: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md`.
- Pendiente recomendado: 2S.8 — Discovery de gestion profesional de imagenes ecommerce.

## Fase 2S.8A Public image URL policy

- Fase 2S.8A cerrada funcional y documentalmente, con commit/push a `master`.
- Se mantuvo la imagen publica ecommerce como `ProductAsset` asociado al Perfil online.
- No se movio imagen al Producto ERP.
- No se tocaron POS, stock, inventario, unidad, costo, precio ERP, importacion ERP, Storefront, `next.config.ts`, `remotePatterns`, Docker, Flyway, seguridad ni indexacion.
- Backend agrega politica centralizada para `ProductAsset.assetUrl`.
- Se permiten paths publicos relativos que empiezan con `/`.
- URLs absolutas deben ser `https://` y pertenecer a `app.ecommerce.public-images.allowed-domains` / `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS`.
- Allowlist externa queda vacia por defecto; sin configurar dominios, no se aceptan hosts externos.
- Se bloquea `http`, `file`, `data`, `ftp`, URLs con credenciales, host ausente, localhost, `127.0.0.1`, `0.0.0.0`, IPs privadas, `.test`, `.example`, `.example.com` y `.example.test`.
- Readiness/publicacion conserva asset primario activo, `PRODUCT_IMAGE`, alt text y derechos confirmados, y ahora exige URL publica permitida.
- Readiness de listado admin tambien valida path publico relativo o dominio `https` permitido.
- Angular detalle de Perfil online restringe tipos de asset a `PRODUCT_IMAGE` y agrega ayuda sobre URL publica/dominio permitido, alt text y derechos.
- Validaciones: `mvn -DskipTests compile` OK, `EcommerceCatalogApplicationServiceTest` 27/27 OK, integracion ecommerce/storefront focalizada 79/79 OK, `npm run build` frontend OK.
- Documentacion QA creada: `docs/qa/PHASE2S8A_PUBLIC_IMAGE_URL_POLICY_QA.md`.
- Riesgos pendientes: sin upload/storage/CDN/ZIP/galeria/metadatos tecnicos, Storefront aun no renderiza dominios externos sin fase posterior, datos historicos con URLs invalidas requieren limpieza antes de indexacion.
- Pendiente recomendado: 2S.8B — Storefront render seguro de imagenes permitidas.

## Fase 2S.8B Storefront safe image render

- Fase 2S.8B implementada y validada localmente; sin commit/push por instruccion explicita.
- Se agrego `STOREFRONT_IMAGE_ALLOWED_DOMAINS` para dominios `https` permitidos de imagenes publicas en Storefront.
- Default restrictivo: sin dominios externos permitidos cuando la variable esta vacia.
- `storefront/next.config.ts` genera `images.remotePatterns` estrictos desde la allowlist, sin wildcard global y sin `http`.
- Se creo helper central `storefront/lib/images.ts` para validar/renderizar imagenes publicas.
- El helper permite paths relativos publicos que empiezan con `/` y URLs `https` de dominio permitido.
- El helper bloquea localhost, `127.0.0.1`, `0.0.0.0`, IPs privadas, `.test`, `.example`, `.example.com`, `.example.test`, protocolos inseguros, credenciales, strings vacios y whitespace/control chars.
- Se actualizaron Home, Productos, Detalle producto y Detalle categoria para usar el helper con `primaryImage.url`.
- Metadata/OG image de producto/categoria usa validacion segura y omite imagen si no esta permitida.
- Fallback visual actual se mantiene cuando la imagen no es segura o no esta permitida.
- No se tocaron backend, Angular admin, Producto ERP, POS, base de datos, Flyway, Docker, auth/security ni indexacion.
- No se implemento upload, storage/CDN, ZIP, importacion masiva de imagenes, galeria, structured data, Merchant Center, buscador, filtros, carrito, checkout ni pagos.
- Validaciones: `npm run build` Storefront OK, `npm run lint` Storefront OK, `git diff --check` OK.
- Documentacion QA creada: `docs/qa/PHASE2S8B_STOREFRONT_SAFE_IMAGE_RENDER_QA.md`.
- Pendiente recomendado: 2S.8C — Decision e implementacion controlada de storage/CDN o carga manual inicial de imagenes, sin activar indexacion.

## Fase 2S.8D AWS S3 + CloudFront image upload manual

- Fase 2S.8D implementada localmente; sin commit/push.
- Se mantiene `ProductAsset` como entidad de imagen publica del Perfil online ecommerce.
- Backend agrega endpoint ADMIN multipart:
  - `POST /api/v1/ecommerce-admin/products/{productId}/primary-asset/upload`
- El endpoint URL manual existente se conserva:
  - `PUT /api/v1/ecommerce-admin/products/{productId}/primary-asset`
- Se agrego storage port testeable y adapter S3 real, desactivado por defecto con `ECOMMERCE_IMAGE_STORAGE_PROVIDER=none`.
- No se crearon recursos AWS reales ni se agregaron credenciales/access keys.
- Configuracion backend documentada en `.env.example`: bucket, prefix, public base URL CloudFront/CDN, region, cache-control, limites de peso/dimensiones y limites multipart.
- Flyway `V18__ecommerce_product_asset_storage_metadata.sql` agrega metadata nullable a `ecommerce_product_assets`: provider, bucket, key, MIME, dimensiones, size, SHA-256 y nombre original.
- Validacion binaria MVP: JPEG/PNG, firma binaria, MIME declarado, peso maximo, dimensiones reales con ImageIO, checksum SHA-256 y key segura.
- URL publica final se valida con `PublicImageUrlPolicy`; `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS` debe incluir el host de `ECOMMERCE_IMAGE_PUBLIC_BASE_URL`.
- `storefront/.env.local.example` recuerda alinear `STOREFRONT_IMAGE_ALLOWED_DOMAINS` con el host CDN del backend.
- Angular detalle de Perfil online agrega selector de archivo JPEG/PNG, usa alt/fuente/derechos/orden existentes y muestra metadata tecnica devuelta.
- Validaciones: `mvn -DskipTests compile` OK, `EcommerceCatalogApplicationServiceTest` 29/29 OK, integracion `EcommerceCatalogPersistenceIntegrationTest,EcommerceAdminProfilesIntegrationTest` 29/29 OK, `npm run build` frontend OK, `git diff --check` OK con warnings CRLF normales.
- No se toco Producto ERP, POS, stock, inventario, unidad, costo, precio ERP, importacion masiva 2S.7A, Storefront funcional, `next.config.ts`, Docker, seguridad ni indexacion.
- No se implemento presigned URL, ZIP, importacion masiva de imagenes, columna imagen Excel, galeria, WebP obligatorio, antivirus avanzado, structured data, Merchant Center, carrito, checkout ni pagos.
- Documentacion QA creada: `docs/qa/PHASE2S8D_AWS_S3_CLOUDFRONT_IMAGE_UPLOAD_QA.md`.
- Riesgos pendientes: sin smoke manual por servidores locales no activos; adapter S3 no probado contra AWS real; no hay cleanup automatico del objeto S3 si falla el guardado DB posterior.

## Fase 2S.8E AWS staging smoke validation

- Fase 2S.8E cerrada documentalmente con validacion manual reportada por el operador.
- Opencode NO ejecuto el smoke real ni verifico directamente la infraestructura cloud.
- Lightsail staging actualizado desde `origin/master` con Docker Compose, Caddy, backend, Angular y PostgreSQL.
- Flyway aplicado hasta V18 inclusive.
- Login staging 200, health 200, puertos seguros (Caddy 80/443, Angular 127.0.0.1:4200, backend 8080 no publico, PostgreSQL 5432 no publico).
- Upload manual de imagen principal desde Angular Admin funciona end-to-end: Angular Admin -> Backend -> S3 privado -> CloudFront.
- Imagen servida desde `cdn-staging.inktoy.pe` con patron `staging/ecommerce/ecommerce/products/...`.
- Storefront Next.js aun no desplegado en Lightsail; render end-to-end Storefront -> CloudFront queda pendiente.
- Detalle tecnico observado: ruta contiene segmento duplicado `/staging/ecommerce/ecommerce/...`; funcional pero a revisar antes de produccion.
- Credenciales AWS solo en `.env` del servidor, no en repo.
- Documentacion QA creada: `docs/qa/PHASE2S8E_AWS_STAGING_SMOKE_QA.md`.
- Pendiente recomendado: 2S.8F -- Importacion masiva de imagen principal por URL publica.

## Fase 2S.8F importacion masiva de imagen principal por URL publica

- Fase 2S.8F implementada localmente; sin commit/push.
- Se agrego flujo separado para importar imagen principal URL-only de perfiles online existentes por SKU.
- Formato MVP: solo `.xlsx`; sin CSV.
- Endpoints ADMIN nuevos:
  - `GET /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/template`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file`
- Backend agrega use case, service, workbook port, adapter POI, controller y DTOs separados para 2S.8F.
- Preview no persiste cambios; confirm-file revalida el archivo completo y aplica solo filas validas `CREATE`/`UPDATE`.
- `NO_CHANGE` queda sin cambios y `REJECT` se reporta como importacion parcial si hay filas validas aplicadas.
- `ProductAsset` se crea/actualiza como URL-only: `PRODUCT_IMAGE`, primary, active, `assetUrl` validada, metadata storage nula.
- Se reutiliza `PublicImageUrlPolicy`; no se duplican reglas de URL publica.
- Se respeta `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS`.
- Validaciones por fila: SKU requerido/existente/no duplicado, perfil online existente, producto activo, `imageUrl` valida, `altText` requerido max 250, `source` valido, `rightsConfirmed=true`, `assetType` solo `PRODUCT_IMAGE`, `displayOrder` entero no negativo.
- Perfiles `PUBLISHED` con cambio requieren `publishedUpdateConfirmed=true`; si se confirma, se permite con warning.
- Warnings: overwrite, cambio visible en publicado, metadata S3 limpiada sin borrar objeto S3, URL no verificada por HEAD/GET, Storefront staging no validado, allowlists backend/Storefront alineadas.
- Angular Admin agrega pantalla `/ecommerce-admin/perfiles/imagenes/importar`, navegacion en Catalogo online y acceso desde Perfiles online.
- Angular incluye descarga de plantilla, selector `.xlsx`, preview, filtros por todas/validas/errores/warnings, conteos y confirm dialog.
- No se toco Storefront Next.js, Flyway, docker-compose, AWS/Lightsail/S3/CloudFront/IAM ni `.env` real.
- No se implemento CSV, ZIP, carga binaria masiva, presigned URL, galeria, Merchant Center, structured data, indexacion, carrito, checkout ni pagos.
- No se toco Producto ERP, POS, stock, inventario, unidades, costos, precios ERP ni categorias ERP.
- Validaciones: `./mvnw -DskipTests compile` OK, `EcommercePrimaryImageUrlImportIntegrationTest` 8/8 OK, `EcommerceCatalogApplicationServiceTest` 29/29 OK, `npm run build` frontend OK.
- Documentacion QA creada: `docs/qa/PHASE2S8F_PRIMARY_IMAGE_URL_IMPORT_QA.md`.
- Riesgos pendientes: Storefront Next.js staging no desplegado, URL remota no verificada por contenido, posible orphan S3 si se reemplaza asset S3, 2S.9 ZIP requiere consistencia DB/S3.

## Fase 2S.8G staging smoke de importacion masiva de imagen principal por URL publica

- Fase 2S.8G cerrada documentalmente con evidencia manual reportada por el operador en Lightsail staging.
- Commit validado en staging: `ebb1726 feat(ecommerce-admin): add primary image URL import`.
- Infraestructura staging usada: Lightsail con Docker Compose, Caddy, backend, Angular y PostgreSQL.
- Pasos ejecutados por operador: `docker compose config`, `docker compose build backend`, `docker compose build frontend`, `docker compose up -d` y `docker compose ps`.
- Resultado de arranque: postgres healthy, backend up, frontend up en `127.0.0.1:4200`.
- Backend inicio correctamente y Flyway valido 18 migraciones sin migraciones pendientes.
- HTTP staging: `https://staging.inktoy.pe/login` respondio 200 y `https://staging.inktoy.pe/api/v1/health` respondio 200.
- Flujo validado en staging: Catalogo online -> Importar imagenes.
- La plantilla `.xlsx` se descargo correctamente desde staging.
- La importacion con Excel funciono correctamente.
- El preview uso el endpoint correcto: `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview`.
- La imagen se importo correctamente.
- El producto pudo colocarse en linea dentro del ERP.
- La pantalla post-confirmacion funciono correctamente.
- No quedo activo el boton para reimportar el mismo archivo.
- `Nueva importacion` limpio correctamente el flujo.
- No se detectaron errores visuales o funcionales relevantes en el smoke staging.
- Lo no validado en esta fase: Storefront desplegado en Lightsail, Storefront Docker, Excel + ZIP, carga binaria masiva, presigned URLs, galeria, Merchant Center, structured data, indexacion, carrito/checkout/pagos.
- Riesgo pendiente: en Storefront local el producto aparece, pero la imagen aun no se muestra; se trata como fase posterior corta fuera de 2S.8G.

## Fase 2S.8H Storefront local image render smoke/diagnostic

- Fase 2S.8H cerrada documentalmente con validacion manual reportada por el operador.
- Causa confirmada: backend publico y Storefront usan el mismo contrato `primaryImage.url`; el problema era configuracion local de Storefront.
- Validacion manual reportada por el operador:
  - Se agrego `STOREFRONT_IMAGE_ALLOWED_DOMAINS=cdn-staging.inktoy.pe` en `storefront/.env.local`.
  - Se reinicio `npm run dev`.
  - Se valido `http://localhost:3000/`.
  - El producto publicado ya muestra correctamente la imagen importada desde `cdn-staging.inktoy.pe`.
- No se requirio cambiar backend, contratos API ni logica del Storefront.
- Storefront sigue sin estar desplegado en Docker ni en Lightsail.
- Recomendacion antes de 2S.9: no iniciar 2S.9 sin validar el render basico de imagen en Storefront local.
- Ejemplo no sensible actualizado: `storefront/.env.local.example` documenta `STOREFRONT_IMAGE_ALLOWED_DOMAINS=cdn-staging.inktoy.pe` y la necesidad de reiniciar Next.js tras cambiarlo.
- Proximo paso recomendado: revisar si hace falta un smoke documental corto para Storefront local antes de avanzar a 2S.9.

## Fase 2S.8J Storefront Docker local support

- Fase 2S.8J implementada localmente sin desplegar en Lightsail.
- Se agrego `storefront/Dockerfile` para Next.js standalone.
- Se agrego `storefront/.dockerignore` para excluir dependencias, builds, caches y `.env` reales del contexto Docker.
- `docker-compose.yml` agrega servicio `storefront` con `profiles: ["storefront"]` para evitar que se levante automaticamente con `docker compose up -d` normal.
- Storefront Docker usa puerto interno 3000 y se expone localmente como `127.0.0.1:3000:3000`.
- Angular Admin queda en `127.0.0.1:4200:80`.
- Backend queda ligado a loopback y PostgreSQL queda solo en la red interna Docker para no exponerse publicamente desde host.
- Storefront dentro de Docker consume backend por red interna: `STOREFRONT_API_BASE_URL=http://backend:8080`.
- Storefront Docker configura `STOREFRONT_IMAGE_ALLOWED_DOMAINS=cdn-staging.inktoy.pe` y `STOREFRONT_INDEXING_ENABLED=false`.
- Las variables se pasan como build args y runtime env porque `remotePatterns` se calcula en build y el helper seguro valida en runtime.
- QA documental creada: `docs/qa/PHASE2S8J_STOREFRONT_DOCKER_LOCAL_QA.md`.
- Validaciones CLI Docker locales OK: `docker compose config`, `docker compose build storefront`, `docker compose --profile storefront up -d storefront`, `docker compose ps`, logs Storefront, `curl -I http://localhost:3000/` y `curl -I http://localhost:4200/`.
- Esta fase quedo validada posteriormente en Lightsail mediante el smoke documental `2S.8K`.
- Pendiente separado: definir en otra fase si Storefront staging necesitara exposicion publica con Caddy/host dedicado.

## Fase 2S.8K Storefront Lightsail Docker tunnel smoke

- Fase 2S.8K cerrada documentalmente con smoke visual PASS en Lightsail staging.
- Commit desplegado en Lightsail: `f87f401 chore(storefront): add Docker local support`.
- Evidencia Docker en Lightsail:
  - backend `Up` en `127.0.0.1:8080->8080/tcp`
  - frontend `Up` en `127.0.0.1:4200->80/tcp`
  - postgres `Up healthy` sin puerto publico
  - storefront `Up` en `127.0.0.1:3000->3000/tcp`
- Evidencia HTTP en Lightsail:
  - `/` HTTP 200
  - `/productos` HTTP 200
  - `/productos/cuaderno-a4` HTTP 200
- Evidencia visual manual via tunel SSH:
  - `http://localhost:3001/` OK
  - `http://localhost:3001/productos` OK
  - `http://localhost:3001/productos/cuaderno-a4` OK
  - producto `Cuaderno A4` visible
  - imagen principal importada visible
  - sin fallback de imagen
  - sin error de API
  - sin error de Next/Image por dominio no permitido
- Limitacion explicita: no se configuro host publico/Caddy para Storefront en esta fase.
- Recomendacion: tratar Caddy/host publico como fase separada si se decide exponer Storefront staging publicamente.
- Siguiente paso sugerido: mantener 2S.9 bloqueado hasta definir si se requiere exposicion publica adicional para Storefront staging.

## Fase 2S.8L Storefront public Caddy staging

- Fase 2S.8L cerrada documentalmente con smoke visual PASS en HTTPS publico.
- Storefront expuesto en `https://storefront-staging.inktoy.pe` sin afectar el Admin Angular existente.
- Evidencia funcional reportada por el operador:
  - DNS resuelve a `52.205.169.234`.
  - Caddy backup creado.
  - `caddy validate` OK.
  - `systemctl reload caddy` OK.
  - Caddy activo.
  - `https://storefront-staging.inktoy.pe/` HTTP 200.
  - `https://storefront-staging.inktoy.pe/productos` HTTP 200.
  - `https://storefront-staging.inktoy.pe/productos/cuaderno-a4` HTTP 200.
  - `https://staging.inktoy.pe/` HTTP 200.
  - `robots.txt` con `User-Agent: *` y `Disallow: /`.
  - Home, catalogo y producto visibles.
  - Imagen principal importada visible.
  - Sin fallback de imagen.
  - Sin error de API.
  - Sin error de Next/Image.
  - Admin Angular no afectado.
- Evidencia de logs:
  - `docker compose logs storefront --since=5m` sin errores.
  - `journalctl` de Caddy sin entradas recientes.
- Limitaciones confirmadas:
  - No es produccion.
  - No hay indexacion activa.
  - No se implemento checkout ni pagos.
- Siguiente paso sugerido: mantener 2S.9 bloqueado hasta que exista una decision explicita sobre la siguiente fase de ecommerce.

## Fase 2S.9C Binary Image Import Local QA

- Fase 2S.9C cerrada documentalmente con PASS local con limitacion.
- Backend compile: OK.
- Backend tests focalizados: 43/43 OK.
- Frontend build: OK.
- Navegacion y rutas: OK.
- Preview local: OK.
- Confirmacion local: bloqueada de forma segura por storage no configurado.
- Evidencia reportada por operador:
  - La pantalla Importar Excel + ZIP carga correctamente.
  - El Excel y el ZIP fueron leidos correctamente.
  - El preview mostro 3 filas validas con advertencias y 0 rechazadas.
  - Los filtros, detalle de fila, advertencias y resumen funcionan.
  - Al confirmar en local, las filas no se aplicaron porque el storage ecommerce no esta configurado.
  - Mensaje observado: `Ecommerce image storage is not configured.`
  - Resultado seguro: no se subieron imagenes ni se modificaron datos.
  - La pantalla Importar imagenes por URL sigue disponible.
  - La pantalla Importar perfiles sigue disponible.
- Limitacion aceptada: la confirmacion real con subida a storage queda pendiente para 2S.9D staging smoke.
- Documento QA creado: `docs/qa/PHASE2S9C_BINARY_IMAGE_IMPORT_LOCAL_QA.md`.

## Fase 2S.9D Binary Image Import Staging Smoke

- Fase 2S.9D cerrada documentalmente con PASS en staging.
- HEAD staging: `8ebaa9f docs(ecommerce): close binary image import local QA`.
- Admin staging responde 200.
- Storefront staging responde 200.
- `robots.txt` mantiene `Disallow: /`.
- docker compose ps muestra backend, frontend, postgres y storefront arriba.
- git status final limpio: `## master...origin/master`.
- SKU controlado usado: `CUAD`.
- Slug validado: `cuaderno-a4`.
- URL validada: `https://storefront-staging.inktoy.pe/productos/cuaderno-a4`.
- Excel + ZIP con una sola fila y una imagen PNG valida.
- Preview valido 1 fila aplicable y 0 rechazadas.
- Confirmacion real funciono en staging.
- Se genero `assetUrl`/`storageKey`.
- La imagen se actualizo correctamente.
- La nueva imagen ya se visualiza en Storefront staging publico.
- Logs recientes sin errores criticos.
- Observacion: se valido previamente que un archivo con formato real incorrecto fue rechazado con el mensaje "Solo se aceptan imagenes JPEG o PNG", validando control por formato real.
- Riesgos pendientes: objeto S3 anterior puede quedar como orphan, cache CDN/Next/Image puede retrasar visibilidad, no se probo con multiples filas, no se valido WebP.
- Recomendacion: considerar fase futura para politica unificada de formatos de imagen y limpieza automatica de objetos orphan.
- Documento QA creado: `docs/qa/PHASE2S9D_BINARY_IMAGE_IMPORT_STAGING_SMOKE_QA.md`.

## Fase 2S.10A Image Policy Plan

- Fase 2S.10A cerrada documentalmente en Plan Mode.
- No se implemento codigo ni cambios de infraestructura.
- Se definio politica unificada de imagenes ecommerce para fases futuras.
- Formatos actuales: JPEG/PNG.
- Formatos recomendados para 2S.10B: JPEG/PNG/WebP con validacion real, sin conversion.
- Riesgo tecnico principal: WebP requiere validacion real de dimensiones; ImageIO estandar no lo soporta de forma confiable.
- Orden de ejecucion recomendado:
  1. 2S.10B: aceptar WebP con validacion real, sin conversion.
  2. 2S.10C: conservar original y generar derivados WebP.
  3. 2S.10D: responsive images, AVIF y estrategia avanzada de cache.
  4. Fase posterior: limpieza segura de objetos orphan S3.
- Decisiones clave:
  - No descargar imagenes remotas en URL import.
  - No convertir imagenes en 2S.10B.
  - Dejar derivados WebP para 2S.10C.
  - Dejar AVIF/responsive/cache avanzada para 2S.10D.
- Documentos creados:
  - `docs/ecommerce/ECOMMERCE_IMAGE_POLICY.md`
  - `docs/qa/PHASE2S10A_IMAGE_POLICY_PLAN_QA.md`
- Siguiente fase recomendada: 2S.10B Plan Mode antes de Build.

## Fase 2S.10B WebP Support Build

- Fase 2S.10B cerrada localmente con PASS.
- Backend acepta WebP junto con JPEG/PNG.
- Parser WebP propio para VP8, VP8L y VP8X.
- ImageIO se mantiene solo para JPEG/PNG.
- WebP genera storageKey .webp y Content-Type image/webp.
- Admin Angular acepta image/webp y actualiza textos.
- No se tocó Storefront, Docker, .env, migraciones ni infraestructura.
- Auditoría final: APTO PARA COMMIT/PUSH.
- Correcciones durante auditoría:
  - Rechazo de cola RIFF truncada.
  - Rechazo de VP8X mal ubicado.
- Pruebas ejecutadas:
  - Backend focalizado: 40 tests PASS.
  - Backend completo: 407 tests PASS.
  - Frontend build: PASS.
- Documentos creados:
  - `docs/qa/PHASE2S10B_WEBP_LOCAL_QA.md`
- Pendiente: staging smoke con WebP real servido por CDN/Storefront.

## Fase 2S.10B-S WebP Staging Smoke

- Fase 2S.10B-S cerrada con PASS en staging.
- Commit desplegado: `ef81154 feat(ecommerce): support WebP primary image uploads`.
- Deploy mínimo ejecutado: backend + frontend reconstruidos, Storefront no tocado.
- SKU controlado usado: `CUAD` (Cuaderno A4).
- Slug validado: `cuaderno-a4`.
- URL validada: `https://storefront-staging.inktoy.pe/productos/cuaderno-a4`.
- Importación Excel + ZIP con WebP real ejecutada correctamente.
- Total filas: 1, Actualizadas: 1, Rechazadas: 0.
- mimeType detectado: `image/webp`.
- Dimensiones: 1200 x 1200 px.
- Peso: 48.1 KB (49,212 bytes).
- checksumSha256: presente.
- assetUrl generado con dominio CDN esperado.
- storageKey termina en `.webp`.
- Validación CDN con curl -I:
  - HTTP/2 200
  - Content-Type: image/webp
  - Content-Length: 49212
  - Cache-Control: public, max-age=31536000, immutable
  - x-amz-meta-checksum-sha256 presente
  - x-cache: Miss from cloudfront
- Imagen WebP se visualiza correctamente en Storefront staging.
- Sin fallback de imagen.
- Sin error Next/Image.
- Sin error API.
- robots.txt mantiene Disallow: /.
- docker compose ps muestra postgres healthy, backend up, frontend up, storefront up.
- Backend health HTTP 200.
- Admin staging HTTP 200.
- Storefront home HTTP 200.
- Logs recientes sin errores críticos asociados al smoke.
- Warnings no bloqueantes observados:
  - Warning PageImpl serialization (deuda técnica preexistente).
  - Nginx multipart body buffered to temporary file (warning operativo esperado).
- git status final limpio: `## master...origin/master`.
- Documento QA creado: `docs/qa/PHASE2S10B_WEBP_STAGING_SMOKE_QA.md`.
- Riesgos residuales:
  - Cache CDN/Next puede retrasar visibilidad en algunos casos.
  - Objetos S3 anteriores pueden quedar orphan al reemplazar imagen.
  - Parser WebP valida contenedor/chunks/dimensiones, pero no decodifica pixeles completos.
- Siguiente fase sugerida: 2S.10C Derivados WebP conservando original (fase posterior).

## Fase 2S.10C-B/B2 WebP Conversion Spike

- Fase 2S.10C-B/B2 cerrada localmente con PASS.
- Objetivo: validar viabilidad técnica de conversión WebP antes de implementar derivados.
- Dependencia evaluada: `org.sejda.imageio:webp-imageio:0.1.6` (scope test).
- Validación local (Windows): PASS.
- Validación Docker/Linux Java 17 (eclipse-temurin:17-jdk-jammy): PASS.
- Archivos creados:
  - `backend/src/test/java/com/erppos/backend/erp/ecommerce/WebpConversionSpikeService.java`
  - `backend/src/test/java/com/erppos/backend/erp/ecommerce/WebpConversionSpikeServiceTest.java`
- Resultados JPEG → WebP:
  - Conversión exitosa.
  - Reducción de tamaño: 49.2% (1501 → 762 bytes).
  - Dimensiones preservadas: 96x72.
  - Tiempo ejecución: 8-10ms.
- Resultados PNG transparente → WebP:
  - Conversión exitosa.
  - Alpha preservado correctamente.
  - Aumento de tamaño: 13.9% (402 → 458 bytes) para PNG pequeño.
  - Tiempo ejecución: 18-27ms.
- Parser WebP existente (2S.10B) lee WebP generado correctamente.
- Tests ejecutados:
  - WebpConversionSpikeServiceTest: 3 tests PASS.
  - EcommercePrimaryImageBinaryImportIntegrationTest: 9 tests PASS.
  - EcommerceCatalogApplicationServiceTest: 31 tests PASS.
  - Total: 43 tests PASS, 0 failures.
- Restricciones cumplidas:
  - No se tocó DB, migraciones, ProductAsset, ProductAssetEntity.
  - No se tocó Storefront, Dockerfile, docker-compose.yml, .env.
  - No se tocó S3, staging, infraestructura.
  - Dependencia webp-imageio en scope test (NO runtime).
  - No se implementó AVIF, responsive images, srcset.
  - No se integró al flujo ecommerce real.
- Riesgos residuales:
  - webp-imageio 0.1.6 no mantenida activamente (última versión 2020).
  - Binarios nativos embebidos requieren validación adicional.
  - PNG pequeño puede crecer en WebP.
  - No se evaluó calidad visual (PSNR/SSIM).
  - No se probó con imágenes grandes reales.
- Conclusión: APTO para pasar a 2S.10C-C.
- Advertencia: Dependencia webp-imageio NO aprobada todavía como dependencia runtime/productiva.
- Documento QA creado: `docs/qa/PHASE2S10C_WEBP_CONVERSION_SPIKE_QA.md`.
- Siguiente fase: 2S.10C-C (migración + modelo variants + repositorio + tests).

## Fase 2S.10C-C Asset Variants Model

- Fase 2S.10C-C implementada con PASS.
- Objetivo: crear modelo persistente para variantes/derivados ecommerce, preservando `ProductAsset` como original.
- Migracion creada: `V19__ecommerce_product_asset_variants.sql`.
- Tabla nueva: `ecommerce_product_asset_variants`.
- Variante inicial modelada: `PRIMARY_OPTIMIZED_WEBP`.
- Archivos creados:
  - `backend/src/main/resources/db/migration/V19__ecommerce_product_asset_variants.sql`
  - `backend/src/main/java/com/erppos/backend/erp/ecommerce/domain/model/ProductAssetVariantKind.java`
  - `backend/src/main/java/com/erppos/backend/erp/ecommerce/infrastructure/persistence/ProductAssetVariantEntity.java`
  - `backend/src/main/java/com/erppos/backend/erp/ecommerce/infrastructure/persistence/ProductAssetVariantJpaRepository.java`
  - `backend/src/test/java/com/erppos/backend/integration/ProductAssetVariantPersistenceIntegrationTest.java`
- Constraints principales:
  - FK a `ecommerce_product_assets(id)` con `ON DELETE CASCADE`.
  - `variant_kind IN ('PRIMARY_OPTIMIZED_WEBP')`.
  - `mime_type = 'image/webp'`.
  - `width > 0`, `height > 0`, `size_bytes > 0`.
  - checks de checksum SHA-256 de 64 caracteres.
  - `preferred=true` solo si `active=true`.
- Indices creados:
  - `idx_ecommerce_asset_variants_asset`.
  - `idx_ecommerce_asset_variants_storage_key`.
  - `uq_ecommerce_asset_variants_active_kind`.
  - `uq_ecommerce_asset_variants_preferred_active`.
- Tests ejecutados:
  - `ProductAssetVariantPersistenceIntegrationTest`: 10 tests PASS.
  - Regresion ecommerce requerida: 53 tests PASS.
  - Backend completo: 420 tests PASS.
- Restricciones cumplidas:
  - No se integro conversion WebP real.
  - No se generaron derivados.
  - No se modificaron upload manual ni Excel + ZIP.
  - No se modifico Storefront ni contrato publico.
  - No se cambio `primaryImage.url`.
  - No se toco S3, staging, infraestructura, Dockerfile, docker-compose.yml ni `.env`.
  - `webp-imageio` sigue en `scope test`.
- Documento QA creado: `docs/qa/PHASE2S10C_ASSET_VARIANTS_MODEL_QA.md`.
- Siguiente fase sugerida: integrar seleccion/registro de variantes en servicios reales solo cuando se apruebe explicitamente pipeline de conversion runtime.

## Fase 2S.10C-D1 Manual Upload WebP Derivative

- Fase 2S.10C-D1 implementada con PASS.
- Objetivo: generar derivado WebP real solo para upload manual ecommerce, preservando `ProductAsset` como original.
- `webp-imageio` pasa de `scope test` a `scope runtime` para habilitar generacion runtime mediante `ImageIO` estandar.
- Servicio nuevo: `EcommerceWebpDerivativeGenerationService`.
- Modelo hexagonal agregado para variantes:
  - `ProductAssetVariant` dominio.
  - `ProductAssetVariantRepositoryPort`.
  - `ProductAssetVariantMapper`.
  - `ProductAssetVariantPersistenceAdapter`.
- Integracion limitada a `EcommerceCatalogApplicationService.uploadPrimaryProductAsset(...)`.
- Regla productiva D1: persistir `ProductAssetVariant.PRIMARY_OPTIMIZED_WEBP` active/preferred solo si el WebP generado es valido y pesa menos que el original.
- Reemplazo de imagen manual desactiva variante WebP active previa antes de guardar la nueva preferred.
- Cleanup best-effort cubre fallas al subir derivado o persistir DB sin ocultar el error principal.
- Tests ejecutados:
  - Unitarios focalizados WebP/upload manual: PASS.
  - Integracion HTTP/PostgreSQL upload manual: PASS.
  - Regresion ecommerce requerida: 65 tests PASS.
  - Backend completo: 432 tests PASS.
- Restricciones cumplidas:
  - No se modifico Storefront ni contrato publico.
  - No se cambio `primaryImage.url`.
  - No se modifico Excel + ZIP ni `confirm-file`.
  - No se integro generacion de derivados en importacion masiva.
  - No se toco Admin UI.
  - No se toco staging, produccion, Caddy, DNS, AWS, S3 real, CloudFront, IAM ni secretos.
  - No se modificaron `.env` reales, Dockerfile ni `docker-compose.yml`.
  - No se implemento AVIF, responsive images, `srcset` ni cleanup masivo de objetos orphan.
- Documento QA creado: `docs/qa/PHASE2S10C_D1_MANUAL_UPLOAD_WEBP_DERIVATIVE_QA.md`.
- Riesgos residuales: dependencia `webp-imageio` 0.1.6 no mantenida activamente, falta medicion con imagenes grandes reales, Storefront aun no consume variantes.

## Fase 2S.10C-D2 Binary Import WebP Derivative

- Fase 2S.10C-D2 implementada con PASS.
- Objetivo: extender generacion real de derivado WebP al flujo Excel + ZIP `confirm-file`, preservando `ProductAsset` como original.
- Integracion limitada a `EcommercePrimaryImageBinaryImportApplicationService.confirmFile(...)`.
- Preview se mantiene sin efectos secundarios: no sube storage, no genera derivados, no persiste `ProductAsset` ni `ProductAssetVariant`.
- Regla productiva D2: persistir variante `PRIMARY_OPTIMIZED_WEBP` active/preferred solo si el WebP generado es valido y pesa menos que el original.
- WebP original se conserva como original y no genera derivado adicional.
- Reemplazo de imagen desactiva variante WebP activa previa incluso cuando la nueva imagen no genera variante, evitando WebP stale.
- Escritura DB por fila usa `TransactionTemplate` para rollback de la fila si falla persistencia, manteniendo partial success del lote.
- Cleanup best-effort por fila limpia solo objetos nuevos de la operacion cuando falla storage de derivado o DB.
- Tests ejecutados:
  - D2 focalizado: 7 tests PASS.
  - Regresion requerida D2: 67 tests PASS.
  - Backend completo: 439 tests PASS.
- Restricciones cumplidas:
  - No se modifico Storefront, contrato publico ni `primaryImage.url`.
  - No se modifico Admin UI.
  - No se toco URL import.
  - No se toco staging, deploy, Caddy, DNS, AWS, S3 real, CloudFront, IAM ni secretos.
  - No se modificaron `.env` reales, Dockerfile ni `docker-compose.yml`.
  - No se implemento AVIF, responsive images, `srcset` ni cleanup masivo de objetos orphan.
- Documento QA creado: `docs/qa/PHASE2S10C_D2_BINARY_IMPORT_WEBP_DERIVATIVE_QA.md`.
- Riesgos residuales: dependencia `webp-imageio` 0.1.6 no mantenida activamente, falta medicion con imagenes grandes reales, Storefront aun no consume variantes.

## Fase 2S.10C-D3 Local QA: WebP Derivatives

- Fase 2S.10C-D3 implementada con PASS.
- Objetivo: validar localmente que D1 (upload manual) y D2 (Excel + ZIP) conviven correctamente antes de 2S.10C-E.
- No se implementó nueva funcionalidad.
- Solo se ejecutaron pruebas y se documentó evidencia.
- Tests ejecutados:
  - Focalizados D1+D2: 72 tests PASS.
  - Backend completo: 439 tests PASS.
- Validaciones:
  - Upload manual: JPEG/WebP/PNG con reglas de preferred y descarte.
  - Excel + ZIP preview: sin efectos secundarios.
  - Excel + ZIP confirm-file: JPEG/WebP/PNG con partial success y cleanup.
  - Consistencia: `ProductAsset` original, `ProductAssetVariant` WebP, `preferred=true` solo si activo y menor.
  - Desactivación de variantes previas en reemplazos.
- Riesgos residuales documentados:
  - URL import fuera de alcance (puede requerir desactivación de variantes antes de 2S.10C-E).
  - Storefront no consume variantes todavía.
  - `webp-imageio` 0.1.6 no mantenida activamente.
  - Objetos orphan de reemplazos anteriores.
  - Cleanup best-effort puede fallar.
- Documento QA creado: `docs/qa/PHASE2S10C_D3_LOCAL_DERIVATIVES_QA.md`.
- Restricciones cumplidas:
  - No se modificó Storefront, contrato público, `primaryImage.url`, Admin UI, staging, deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM, infraestructura.
  - No se implementó AVIF, responsive images, `srcset`, limpieza masiva de objetos orphan.
  - No se inició 2S.10C-E todavía.
  - Solo cambios documentales en D3.
- Conclusión: D1 y D2 conviven correctamente. Listo para 2S.10C-E.

## Fase 2S.10C-E1 URL Stale Variants

- Fase 2S.10C-E1 implementada con PASS.
- Objetivo: evitar variantes WebP stale cuando la imagen original se reemplaza mediante flujos URL-only antes de 2S.10C-E2.
- Flujos corregidos:
  - URL import `confirm-file` desactiva variantes activas `PRIMARY_OPTIMIZED_WEBP` del `ProductAsset` guardado en CREATE/UPDATE.
  - Admin URL upsert desactiva variantes activas `PRIMARY_OPTIMIZED_WEBP` del `ProductAsset` guardado.
- Reglas preservadas:
  - URL import `NO_CHANGE` no toca variantes.
  - Preview URL import sigue sin efectos secundarios.
  - No se generan derivados WebP nuevos en URL import.
  - No se borran objetos storage.
  - `ProductAsset` sigue representando la imagen original.
  - Storefront, contrato publico y `primaryImage.url` no cambian.
- Tests ejecutados:
  - Focalizados E1 + regresion D1/D2/Storefront: 87 tests PASS.
  - Backend completo: 442 tests PASS.
- Documento QA creado: `docs/qa/PHASE2S10C_E1_URL_STALE_VARIANTS_QA.md`.
- Riesgos residuales:
  - Storefront todavia no consume variantes.
  - `primaryImage.url` todavia devuelve el original hasta E2.
  - E2 debe preferir variantes solo si pertenecen al `ProductAsset` primario activo vigente.
  - Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
- Conclusión: riesgo anti-stale URL-only corregido. Listo para plan/build 2S.10C-E2 cuando se autorice.

## Fase 2S.10C-E2 Public Image Variant Preference

- Fase 2S.10C-E2 implementada con PASS.
- Objetivo: API publica ecommerce prefiere `ProductAssetVariant.PRIMARY_OPTIMIZED_WEBP` active/preferred como `primaryImage.url` cuando existe variante valida, con fallback al `ProductAsset.assetUrl` original.
- Flujos publicos cubiertos:
  - `GET /api/v1/storefront/catalog/products`.
  - `GET /api/v1/storefront/catalog/products/{slug}`.
- Regla implementada:
  - Primero se selecciona el `ProductAsset` primario activo vigente.
  - Si hay variante del mismo `ProductAsset`, kind `PRIMARY_OPTIMIZED_WEBP`, `active=true`, `preferred=true` y `asset_url` no blank, se devuelve esa URL.
  - Si no hay variante valida, se devuelve la URL original del `ProductAsset`.
  - `altText`, `type` y `displayOrder` siguen saliendo del `ProductAsset` original.
- Contrato publico sin cambios:
  - `PublicImageResponse(url, altText, type, displayOrder)`.
  - No se exponen variantes, `mimeType`, `width`, `height`, `srcset` ni metadata.
- Tests ejecutados:
  - Focalizados E2 + regresion E1/D1/D2: 94 tests PASS.
  - Backend completo: 449 tests PASS.
- Documento QA creado: `docs/qa/PHASE2S10C_E2_PUBLIC_IMAGE_VARIANT_PREFERENCE_QA.md`.
- Restricciones cumplidas:
  - No se modifico `storefront/`, Admin UI, contrato publico, staging, deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
  - No se modifico generacion de derivados, upload manual, Excel + ZIP ni URL import.
  - No se implemento AVIF, responsive images ni `srcset`.
- Riesgos residuales:
  - Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
  - Cache CDN/Next/Image puede retrasar visibilidad de cambios en ambientes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- Conclusión: API publica lista para servir WebP optimizado con fallback seguro sin cambiar contrato.

## Fase 2S.10C-E3 Local Public API QA

- Fase 2S.10C-E3 cerrada documentalmente con PASS.
- Objetivo: validar localmente que la API publica ecommerce devuelve correctamente la URL WebP preferida cuando existe variante valida y mantiene fallback seguro al original.
- No se implemento nueva funcionalidad.
- Solo se ejecutaron pruebas y se documento evidencia.
- Endpoints validados:
  - `GET /api/v1/storefront/catalog/products`
  - `GET /api/v1/storefront/catalog/products/{slug}`
- Regla validada:
  - Si existe variante `PRIMARY_OPTIMIZED_WEBP` active/preferred valida del mismo `ProductAsset`, se devuelve esa URL.
  - Si no existe variante valida, se devuelve URL original del `ProductAsset`.
  - `altText`, `type` y `displayOrder` siguen saliendo del `ProductAsset` original.
- Casos validados:
  - Producto con variante active/preferred valida: devuelve URL WebP en listado y detalle.
  - Producto sin variante: devuelve URL original en listado y detalle.
  - Variante inactive: se ignora y devuelve original.
  - Variante preferred=false: se ignora y devuelve original.
  - Variante asociada a otro ProductAsset: se ignora y devuelve original.
  - Variante stale despues de reemplazo URL-only: no se devuelve.
  - Contrato publico: mantiene solo 4 campos sin metadata adicional.
- Tests ejecutados:
  - Focalizados E2 + regresion E1/D1/D2: 103 tests PASS.
  - Backend completo: 449 tests PASS.
- Documento QA creado: `docs/qa/PHASE2S10C_E3_LOCAL_PUBLIC_API_QA.md`.
- Restricciones cumplidas:
  - No se modifico `storefront/`, Admin UI, contrato publico, staging, deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
  - No se modifico generacion de derivados, upload manual, Excel + ZIP ni URL import.
  - No se implemento AVIF, responsive images ni `srcset`.
  - Solo cambios documentales en E3.
- Riesgos residuales:
  - Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
  - Cache CDN/Next/Image puede retrasar visibilidad de cambios en ambientes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
  - No se ha validado con data real de productos en staging.
- Conclusión: API publica lista para staging smoke. Todos los casos criticos cubiertos por tests de integracion.

## Fase 2S.10C-S Staging WebP Variant Public API QA

- Fase 2S.10C-S cerrada documentalmente con PASS.
- Objetivo: validar en staging el flujo completo de derivados WebP ecommerce.
- No se implemento nueva funcionalidad.
- Solo se ejecuto deploy minimo y se documento evidencia.
- Commit desplegado: `fb0445f docs(ecommerce): close local public WebP API QA`.
- Backup DB staging creado: `/home/ubuntu/inktoy-backups/2s10c-staging-smoke/20260621T160535Z/staging-db-before-2s10c-s.sql`.
- Flyway V19 aplicado correctamente: `success = t`.
- Tabla `ecommerce_product_asset_variants` existe.
- SKU usado: `CUAD`, slug `cuaderno-a4`.
- Upload manual desde Admin staging genero `ProductAssetVariant` WebP.
- ProductAsset original JPG preservado: 13890 bytes.
- ProductAssetVariant WebP creado: 4130 bytes (70.3% reduccion).
- CDN del derivado: HTTP 200, `Content-Type: image/webp`.
- API publica detalle: `primaryImage.url` apunta al derivado WebP.
- API publica listado: `primaryImage.url` apunta al derivado WebP.
- Storefront staging: HTTP 200, imagen visible en incognito.
- Robots.txt mantiene `Disallow: /`.
- Backend/Admin/Storefront responden 200.
- Sin errores criticos en logs.
- Contrato publico sin cambios: solo `url`, `altText`, `type`, `displayOrder`.
- Documento QA creado: `docs/qa/PHASE2S10C_STAGING_WEBP_VARIANT_PUBLIC_API_QA.md`.
- Restricciones cumplidas:
  - No se reconstruyo frontend/Admin ni Storefront.
  - No se toco Caddy, DNS, AWS/S3/CloudFront/IAM, `.env`, Dockerfile, `docker-compose.yml` ni infraestructura.
  - Solo deploy minimo backend.
- Riesgos residuales:
  - Objetos storage anteriores pueden quedar orphan hasta una fase futura de limpieza segura.
  - Cache CDN/Next/Image puede retrasar visibilidad de cambios en ambientes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
  - Calidad de conversion WebP depende de `webp-imageio`.
- Recomendacion siguiente: iniciar 2S.10D en Plan Mode, no Build directo.
- Conclusion: Staging smoke PASS. Flujo completo de derivados WebP validado en staging.

## Fase 2S.10D-B Responsive WebP and AVIF Spike

- Fase 2S.10D-B implementada como spike test-only con PASS y AVIF BLOQUEADO.
- Objetivo: validar resize responsive WebP y evaluar viabilidad AVIF sin tocar infraestructura, Dockerfile, docker-compose, staging ni contrato publico.
- Cambios realizados solo en `backend/src/test/java` y documentacion.
- No se modifico codigo productivo backend, Storefront, Admin UI, migraciones, `PublicImageResponse`, upload manual, Excel + ZIP, URL import, `.env`, Dockerfile, `docker-compose.yml`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
- Tests agregados:
  - `ResponsiveImageResizeSpikeServiceTest`.
  - `AvifResponsiveSpikeTest`.
- Servicio experimental test-only agregado:
  - `ResponsiveImageResizeSpikeService`.
- WebP responsive validado:
  - JPEG 1600x1200 genera `320w`, `640w`, `960w`, `1280w`.
  - PNG transparente 800x800 genera `320w`, `640w` preservando alpha.
  - No-upscaling: JPEG 240x180 no genera `320w` ni `640w`.
  - Variantes validadas con `EcommerceProductImageBinaryService.validate(...)`.
  - Checksums SHA-256 y `sizeBytes` consistentes.
- Resultado local:
  - `./mvnw.cmd "-Dtest=ResponsiveImageResizeSpikeServiceTest,AvifResponsiveSpikeTest" test`: 5 tests PASS.
- Resultado Docker/Linux:
  - `docker run --rm -v "${PWD}:/workspace" -w /workspace/backend eclipse-temurin:17-jdk-jammy sh ./mvnw "-Dtest=ResponsiveImageResizeSpikeServiceTest,AvifResponsiveSpikeTest" test`: 5 tests PASS.
- AVIF:
  - Estado: BLOQUEADO/NO APTO por ahora.
  - No hay writer/reader ImageIO AVIF en classpath actual.
  - No se agrego dependencia AVIF runtime ni test-scope.
  - No se debe tocar Dockerfile ni instalar paquetes del sistema para habilitar AVIF en 2S.10D-B.
- Documento QA creado: `docs/qa/PHASE2S10D_RESPONSIVE_AVIF_SPIKE_QA.md`.
- Riesgos residuales:
  - `webp-imageio` 0.1.6 sigue siendo dependencia no mantenida activamente.
  - Uso de memoria/CPU debe controlarse en implementacion productiva.
  - Calidad visual requiere validacion con imagenes reales.
  - AVIF requiere decision tecnica posterior o queda fuera de 2S.10D.
- Recomendacion siguiente: avanzar a 2S.10D-C Modelo para soportar multiples tamanos WebP activos. Continuar 2S.10D con WebP responsive primero y dejar AVIF para fase posterior.

## Fase 2S.10D-C Responsive WebP Variants Model

- Fase 2S.10D-C implementada con PASS.
- Objetivo: extender el modelo `ProductAssetVariant` para permitir multiples variantes WebP responsive activas por `ProductAsset`, sin generar variantes responsive todavia.
- Migracion creada: `backend/src/main/resources/db/migration/V20__ecommerce_responsive_webp_asset_variants.sql`.
- V20 agrega columnas:
  - `format`.
  - `purpose`.
  - `target_width`.
  - `sort_order`.
- Backfill V20 para filas existentes 2S.10C:
  - `format = WEBP`.
  - `purpose = PRIMARY`.
  - `target_width = width`.
  - `sort_order = 0`.
- Constraints V20:
  - `variant_kind IN ('PRIMARY_OPTIMIZED_WEBP', 'PRIMARY_RESPONSIVE_WEBP')`.
  - `mime_type = 'image/webp'`.
  - `format IN ('WEBP')`.
  - `purpose IN ('PRIMARY', 'RESPONSIVE')`.
  - `target_width > 0`.
  - `sort_order >= 0`.
- Unique activo reemplazado por identidad responsive:
  - `(product_asset_id, variant_kind, format, purpose, target_width) WHERE active = TRUE`.
- Unique `preferred=true` activo por `ProductAsset` preservado.
- Modelo dominio actualizado:
  - `ProductAssetVariantKind.PRIMARY_RESPONSIVE_WEBP` agregado.
  - `ProductAssetVariantFormat.WEBP` agregado.
  - `ProductAssetVariantPurpose.PRIMARY/RESPONSIVE` agregado.
  - `ProductAssetVariant` ahora incluye `format`, `purpose`, `targetWidth`, `sortOrder`.
- Compatibilidad preservada:
  - Constructor compatible mantiene `WEBP/PRIMARY/targetWidth=width/sortOrder=0` para D1/D2.
  - D1 upload manual sigue insertando `PRIMARY_OPTIMIZED_WEBP` como antes.
  - D2 Excel + ZIP sigue insertando `PRIMARY_OPTIMIZED_WEBP` como antes.
  - E2 API publica sigue usando solo `PRIMARY_OPTIMIZED_WEBP active/preferred` para `primaryImage.url`.
  - `PublicImageResponse(url, altText, type, displayOrder)` no cambio.
- Tests ejecutados:
  - `ProductAssetVariantPersistenceIntegrationTest`: 13 tests PASS.
  - Regresion focalizada ecommerce: 96 tests PASS.
  - Backend completo: 457 tests PASS.
- Documento QA creado: `docs/qa/PHASE2S10D_RESPONSIVE_VARIANTS_MODEL_QA.md`.
- Restricciones cumplidas:
  - No se toco Storefront, Admin UI, contrato publico, `PublicImageResponse`, API responsive, generacion WebP responsive productiva, staging/deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
  - No se implemento AVIF ni se permitio `image/avif`.
- Riesgos residuales antes de 2S.10D-D:
  - D debe implementar generacion real de `PRIMARY_RESPONSIVE_WEBP` sin upscaling.
  - Al generar responsive, URL import/Admin URL upsert deberan desactivar tambien variantes responsive activas para evitar stale variants.
  - Cleanup best-effort debe cubrir multiples objetos nuevos por fila.
- Recomendacion siguiente: avanzar a 2S.10D-D WebP Responsive Generation en Build separado, sin API publica responsive, Storefront ni AVIF.

## Fase 2S.10D-D1 Manual Upload Responsive WebP

- Fase 2S.10D-D1 implementada localmente con PASS.
- Objetivo: generar variantes `PRIMARY_RESPONSIVE_WEBP` solo para upload manual ecommerce, sin cambiar API publica ni Storefront.
- Servicio productivo agregado: `EcommerceResponsiveWebpVariantGenerationService`.
- Targets configurados: `320w`, `640w`, `960w`, `1280w`.
- Reglas implementadas:
  - JPEG/PNG generan responsive WebP.
  - WebP original no genera responsive.
  - No-upscaling: si el original es menor que el target, ese target se omite.
  - Cada variante se valida con `EcommerceProductImageBinaryService.validate(...)`.
  - `PRIMARY_RESPONSIVE_WEBP` se persiste con `format=WEBP`, `purpose=RESPONSIVE`, `targetWidth`, `sortOrder`, `active=true`, `preferred=false`.
  - `PRIMARY_OPTIMIZED_WEBP` sigue siendo la unica variante `preferred=true` para `primaryImage.url`.
  - Reemplazo manual desactiva variantes responsive previas del mismo `ProductAsset`.
  - Cleanup best-effort cubre original, optimized y responsive nuevos ante fallos storage/DB.
- Storage key responsive agregado bajo `/variants/responsive/` con target width y checksums fuente/derivado.
- Tests ejecutados:
  - Focalizados iniciales: 47 tests PASS.
  - Regresion ecommerce focalizada: 104 tests PASS.
  - Backend completo: 465 tests PASS.
- Documento QA creado: `docs/qa/PHASE2S10D_D1_MANUAL_UPLOAD_RESPONSIVE_WEBP_QA.md`.
- Restricciones cumplidas:
  - No se toco Storefront, Admin UI, contrato publico, `PublicImageResponse`, API publica responsive, Excel + ZIP, URL import, staging/deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
  - No se implemento AVIF ni se permitio `image/avif`.
- Riesgos residuales:
  - Calidad visual responsive requiere validacion con imagenes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
  - Objetos storage anteriores pueden quedar orphan hasta fase futura de limpieza segura.
- Recomendacion siguiente: cerrar commit D1; no iniciar D2 hasta autorizacion explicita.

## Fase 2S.10D-D2 Binary Import Responsive WebP

- Fase 2S.10D-D2 implementada localmente con PASS.
- Objetivo: extender `PRIMARY_RESPONSIVE_WEBP` al flujo Excel + ZIP `confirm-file`, manteniendo preview sin efectos secundarios.
- Reutiliza `EcommerceResponsiveWebpVariantGenerationService` creado en D1.
- Flujo productivo modificado: `EcommercePrimaryImageBinaryImportApplicationService.applyRow(...)`.
- Reglas implementadas:
  - JPEG/PNG del ZIP generan responsive WebP.
  - WebP original no genera responsive.
  - No-upscaling por target `320w`, `640w`, `960w`, `1280w`.
  - Cada variante se valida con `EcommerceProductImageBinaryService.validate(...)`.
  - `PRIMARY_RESPONSIVE_WEBP` se persiste con `format=WEBP`, `purpose=RESPONSIVE`, `targetWidth`, `sortOrder`, `active=true`, `preferred=false`.
  - `PRIMARY_OPTIMIZED_WEBP` sigue siendo la unica variante `preferred=true` para `primaryImage.url`.
  - Reemplazo por import desactiva `PRIMARY_OPTIMIZED_WEBP` y `PRIMARY_RESPONSIVE_WEBP` previas del mismo `ProductAsset`.
  - No se desactivan variantes de otro `ProductAsset`.
  - Partial success por fila se mantiene.
  - Cleanup best-effort por fila cubre original, optimized y responsive nuevos ante fallos storage/DB.
- Preview Excel + ZIP sigue sin subir objetos, sin persistir variantes y sin tocar DB.
- Tests ejecutados:
  - Focalizados D2: 12 tests PASS.
  - Regresion ecommerce solicitada: 115 tests PASS.
  - Backend completo: 470 tests PASS.
- Documento QA creado: `docs/qa/PHASE2S10D_D2_BINARY_IMPORT_RESPONSIVE_WEBP_QA.md`.
- Restricciones cumplidas:
  - No se toco Storefront, Admin UI, contrato publico, `PublicImageResponse`, API publica responsive, URL import, Admin URL upsert, staging/deploy, Dockerfile, `docker-compose.yml`, `.env`, Caddy, DNS, AWS/S3/CloudFront/IAM ni infraestructura.
  - No se implemento AVIF ni se permitio `image/avif`.
- Riesgos residuales:
  - Calidad visual responsive requiere validacion con imagenes reales.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
  - URL import/Admin URL upsert no generan responsive por alcance; revisar stale responsive antes de exponer API publica responsive.
  - Objetos storage anteriores pueden quedar orphan hasta fase futura de limpieza segura.
- Recomendacion siguiente: cerrar commit D2; no iniciar API publica responsive ni Storefront responsive sin autorizacion explicita.

## Fase 2S.10D-F Public Responsive API Backend-Only

- Fase 2S.10D-F implementada localmente con PASS.
- Objetivo: exponer variantes `PRIMARY_RESPONSIVE_WEBP` en `primaryImage` de la API publica ecommerce mediante contrato opcional backward-compatible.
- Contrato publico preservado:
  - `PublicImageResponse.url`.
  - `PublicImageResponse.altText`.
  - `PublicImageResponse.type`.
  - `PublicImageResponse.displayOrder`.
- Campo publico agregado:
  - `PublicImageResponse.responsive.variants[]`.
- Campos por variante publica:
  - `url`.
  - `mimeType`.
  - `width`.
  - `height`.
- Reglas implementadas:
  - `primaryImage.url` mantiene preferencia por `PRIMARY_OPTIMIZED_WEBP active/preferred` con URL valida.
  - Fallback de `primaryImage.url` a `ProductAsset.assetUrl` se conserva.
  - `responsive.variants` se carga solo desde `PRIMARY_RESPONSIVE_WEBP` activas, `format=WEBP`, `purpose=RESPONSIVE`, `mimeType=image/webp`, URL no blank, `width/height/targetWidth` positivos.
  - Orden por `sortOrder asc`, `targetWidth asc`.
  - Si no hay responsive validas, `responsive` queda `null` y `primaryImage.url` se mantiene.
  - Variantes responsive invalidas/blank/inactivas se ignoran sin romper la respuesta.
  - Listado y detalle exponen el mismo contrato responsive para `primaryImage`.
- Alcance limitado a `primaryImage`; gallery no se modifico.
- Tests ejecutados:
  - Focalizados `StorefrontPublicProductsIntegrationTest`: 30 tests PASS.
  - Regresion ecommerce relacionada: 81 tests PASS.
  - Backend completo: 472 tests PASS.
- Documento QA creado: `docs/qa/PHASE2S10D_F_PUBLIC_RESPONSIVE_API_QA.md`.
- Restricciones cumplidas:
  - No se toco Storefront ni `storefront/`.
  - No se toco generacion de imagenes, upload manual, Excel + ZIP, URL import, AVIF, Flyway/migraciones, staging/deploy ni infraestructura.
  - No se agregaron `sizes`, `sources` ni `srcSet` como contrato unico.
  - No se expusieron campos internos como `productAssetId`, storage keys/providers/buckets, checksums, `active`, `preferred`, `variantKind`, `purpose`, `sortOrder`, auditoria ni metadata interna.
  - No se implemento AVIF; queda deferred/blocked.
- Riesgos residuales:
  - Storefront aun no consume `responsive.variants`; seguira usando `primaryImage.url` hasta una fase frontend explicita.
  - Payload de listado crece cuando hay variantes responsive.
  - URL import/Admin URL upsert no fueron modificados por alcance; si existen responsive variants historicas activas sobre el mismo `ProductAsset`, podrian requerir una subfase anti-stale especifica.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- Recomendacion siguiente: revision manual y commit; no iniciar consumo Storefront responsive sin autorizacion explicita.

## Fase 2S.10D-F2 URL Responsive Anti-Stale

- Fase 2S.10D-F2 implementada localmente con PASS.
- Objetivo: cerrar riesgo de `PRIMARY_RESPONSIVE_WEBP` stale en flujos URL-only antes de tocar Storefront.
- Flujos corregidos:
  - URL import `confirm-file`.
  - Admin URL upsert `PUT /api/v1/ecommerce-admin/products/{productId}/primary-asset`.
- Reglas implementadas:
  - Si URL import CREATE/UPDATE cambia el asset, desactiva `PRIMARY_OPTIMIZED_WEBP` y `PRIMARY_RESPONSIVE_WEBP` activas del `ProductAsset` guardado.
  - Si Admin URL upsert cambia/guarda el asset URL-only, desactiva `PRIMARY_OPTIMIZED_WEBP` y `PRIMARY_RESPONSIVE_WEBP` activas del `ProductAsset` guardado.
  - URL import NO_CHANGE no toca variantes.
  - Multiples responsive variants activas del asset afectado quedan desactivadas.
  - Variantes de otro `ProductAsset` no se tocan.
  - API publica mantiene `primaryImage.url` fallback y deja de exponer responsive stale tras Admin URL upsert.
- Tests ejecutados:
  - Focalizados anti-stale: 82 tests PASS.
  - Regresion ecommerce relacionada: 113 tests PASS.
  - Backend completo: 473 tests PASS.
- Documento QA creado: `docs/qa/PHASE2S10D_F2_URL_RESPONSIVE_ANTI_STALE_QA.md`.
- Restricciones cumplidas:
  - No se toco Storefront ni `storefront/`.
  - No se modifico contrato publico, `PublicImageResponse`, `StorefrontProductReadAdapter`, generacion de imagenes, upload manual, Excel + ZIP, AVIF, Flyway/migraciones, staging/deploy ni infraestructura.
  - No se agregaron `sizes`, `sources`, `srcSet` ni gallery responsive.
  - No se implemento AVIF; queda deferred/blocked.
- Riesgos residuales:
  - Storefront aun no consume `responsive.variants`.
  - Objetos storage antiguos asociados a variantes desactivadas no se eliminan en esta subfase.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- Recomendacion siguiente: revision manual y commit; no iniciar consumo Storefront responsive sin autorizacion explicita.

## Fase 2S.10D-F3 Local API JSON Smoke + Git Readiness

- Fase 2S.10D-F3 completada con PASS.
- Objetivo: cerrar QA local/API smoke y revision Git antes de 2S.10D-G Storefront consume responsive.
- Estado Git revisado:
  - 14 archivos modificados (F + F2).
  - 2 documentos QA nuevos (F + F2).
  - `StorefrontPublicProductsIntegrationTest.java` contiene tests de F y F2 mezclados.
- Tests smoke ejecutados:
  - `shouldExposeResponsiveWebpVariantsInListAndDetailPrimaryImage`: PASS.
  - `shouldNotReturnStaleVariantAfterUrlOnlyReplacement`: PASS.
  - `confirmFileNoChangeShouldKeepExistingWebpVariantActive`: PASS.
- Contrato JSON validado:
  - `primaryImage.url` sigue presente y mantiene fallback.
  - `primaryImage.responsive.variants[]` aparece cuando existen variantes validas.
  - Cada variant expone solo `url`, `mimeType`, `width`, `height`.
  - No se exponen campos internos (productAssetId, storageKey, checksumSha256, etc.).
  - Listado y detalle mantienen el mismo contrato responsive.
  - Backward compatible cuando no hay responsive variants.
- Recomendacion de commit:
  - **Un commit conjunto para F y F2** (no separar).
  - Motivo: `StorefrontPublicProductsIntegrationTest.java` tiene tests que dependen de ambos cambios.
- Documento QA creado: `docs/qa/PHASE2S10D_F3_LOCAL_PUBLIC_RESPONSIVE_JSON_SMOKE_QA.md`.
- Restricciones cumplidas:
  - No se toco Storefront ni `storefront/`.
  - No se toco infraestructura, staging, deploy, Docker, Caddy, DNS, AWS, secretos ni `.env`.
  - No se modifico backend funcional (solo se valido).
  - No se crearon migraciones.
  - No se implemento AVIF; queda deferred/blocked.
  - No se hizo commit, push ni tag.
- Riesgos residuales antes de 2S.10D-G:
  - Storefront aun no consume `responsive.variants`.
  - Objetos storage antiguos no se eliminan en esta subfase.
  - `webp-imageio` 0.1.6 sigue siendo dependencia runtime no mantenida activamente.
- Recomendacion siguiente: autorizar commit conjunto de F y F2, luego iniciar 2S.10D-G Storefront consume responsive.

## Fase 2S.10D-G Storefront Responsive Consumption

- Fase 2S.10D-G-B implementada localmente con PASS.
- Storefront ahora tipa y consume `primaryImage.responsive.variants[]` de forma opcional y frontend-only.
- `primaryImage.url` se mantiene como fallback obligatorio.
- `ProductImageFrame` conserva `next/image`, `sizes` en frontend y placeholder visual actual.
- Variants invalidas o inseguras se filtran en `storefront/lib/images.ts`.
- El loader custom de `next/image` solo se usa si existen variants validas; si no, el comportamiento queda igual que antes.
- Sin cambios en backend, API publica, gallery, AVIF, cache avanzada ni infraestructura.
- Checks ejecutados:
  - `npm run build`: PASS.
  - `npm run lint`: PASS.
  - `npx tsc --noEmit`: PASS.
- Documento QA creado: `docs/qa/PHASE2S10D_G_STOREFRONT_RESPONSIVE_CONSUMPTION_QA.md`.
- Riesgos residuales:
  - No hay tests frontend automaticos dedicados.
  - No se ejecuto smoke runtime de rutas con backend vivo en esta subfase.
  - Warning heredado de multiples lockfiles/Turbopack root sigue no bloqueante.

## Fase 2S.10D-G-C Local Storefront Runtime Smoke

- Fase 2S.10D-G-C completada con PASS.
- Objetivo: validar runtime local del Storefront con backend vivo antes de autorizar commit.
- Servicios levantados:
  - PostgreSQL: `erp-pos-postgres` (puerto 5432).
  - Backend Spring Boot: `erp-pos-backend` (puerto 8080).
  - Storefront Next.js: `erp-pos-storefront` (puerto 3000).
- Rutas validadas:
  - `/` (pagina de inicio): HTTP 200 OK ✅.
  - `/productos` (listado): HTTP 200 OK ✅.
  - `/categorias/categoria-online-1` (detalle categoria): HTTP 200 OK ✅.
  - `/productos/producto-6` (detalle producto): HTTP 200 OK ✅.
- Validaciones confirmadas:
  - Storefront renderiza correctamente sin errores de JavaScript.
  - `next/image` funciona correctamente con `srcSet` y `sizes`.
  - `primaryImage.url` sigue siendo fallback obligatorio.
  - `responsive.variants` es opcional (backward compatibility confirmada).
  - HTML renderizado es valido y completo.
  - No se uso `<picture>`, se mantiene `next/image`.
- Nota importante:
  - Backend en Docker usa imagen anterior (pre-2S.10D-F).
  - Campo `responsive` no esta presente en respuestas de API.
  - Esto confirma backward compatibility del Storefront.
- Documento QA creado: `docs/qa/PHASE2S10D_GC_LOCAL_STOREFRONT_RUNTIME_SMOKE_QA.md`.
- Restricciones cumplidas:
  - No se toco backend funcional.
  - No se toco infraestructura.
  - No se toco gallery.
  - No se implemento AVIF (sigue deferred/blocked).
  - No se implemento cache avanzada (sigue diferida).
  - No se hizo commit, push ni tag.
- Riesgos residuales:
  - No se valido consumo real de `responsive.variants[]` (backend no las devuelve).
  - Se validara en staging con backend completo.
- Recomendacion siguiente: autorizar commit de 2S.10D-G-B + 2S.10D-G-C, luego desplegar en staging.

## Fase 2S.10D-S Staging Responsive Images Smoke

- Fase 2S.10D-S ejecutada con resultado PARTIAL.
- Commits desplegados en staging:
  - `cb6f77e feat(ecommerce): expose responsive variants and prevent stale URL assets`
  - `2a4645c feat(storefront): consume responsive product image variants`
- Push a `origin/master`: realizado.
- Deploy minimo staging ejecutado via `git pull --ff-only origin master` + `docker compose --profile storefront up -d --build backend storefront`.
- API publica staging responde y ya expone el contrato nuevo con `primaryImage.responsive = null` en el producto visible `cuaderno-a4`.
- Storefront staging responde 200 en `/`, `/productos`, `/categorias/categoria-1` y `/productos/cuaderno-a4`.
- `primaryImage.url` sigue funcionando como fallback y Storefront renderiza sin error con `next/image`.
- No se observo ningun producto staging con `responsive.variants[]` poblado, por lo que la validacion end-to-end de variants responsive queda pendiente.
- Documento QA creado: `docs/qa/PHASE2S10D_STAGING_RESPONSIVE_IMAGES_SMOKE_QA.md`.
- Restricciones cumplidas:
  - No se tocaron archivos funcionales nuevos ni infraestructura.
  - No se toco gallery.
  - No se implemento AVIF.
  - Cache avanzada sigue diferida.

## Fase 2S.10D-S2 Staging Responsive Variants Real-Data Smoke

- Fase 2S.10D-S2 ejecutada con resultado FAIL.
- Se creo y publico un producto de prueba staging via flujos existentes:
  - SKU `SMOKE-2S10D`
  - slug `smoke-test-2s10d`
  - upload manual JPEG 1600x1200 con metadata valida
  - SEO metadata y publicacion via endpoints admin existentes
- La API publica staging ya expone `primaryImage.responsive.variants[]` real y no vacio para ese producto.
- Variants reales observadas: `320w`, `640w`, `960w`, `1280w`.
- Todas las URLs responsive WebP respondieron HTTP 200 con `content-type: image/webp`.
- Storefront staging fallo al renderizar el producto y contagio rutas principales con HTTP 500.
- Error observado en logs:
  - `Functions cannot be passed directly to Client Components ... loader: function ...`
- Conclusion:
  - Backend/API/CDN responsive: PASS.
  - Storefront runtime con variants reales: FAIL.
  - 2S.10D no puede cerrarse como PASS total hasta corregir el consumo frontend y repetir smoke staging.

## Fase 2S.10D-G-D Storefront Responsive Loader Boundary Fix

- Fase 2S.10D-G-D completada con resultado PASS.
- Commit funcional/documental:
  - `96dc6c3 fix(storefront): keep responsive image loader inside client boundary`
- Push a `origin/master`: realizado.
- Staging actualizado por fast-forward a `96dc6c3`.
- Causa raiz confirmada:
  - `ProductImageFrame` era Server Component.
  - Creaba `responsiveLoader` inline.
  - Pasaba esa funcion a `next/image` como `loader`.
  - Next.js 16 / React 19 rechaza funciones no serializables cruzando Server Component -> Client Component.
- Solucion aplicada localmente:
  - `ProductImageFrame` se mantiene como Server Component.
  - Nuevo `ProductImageFrameClient` con `"use client"` encapsula `next/image` y el custom loader.
  - `ProductImageFrame` solo pasa props serializables al componente cliente.
  - `primaryImage.url` sigue siendo fallback.
  - `responsive.variants[]` sigue consumiendose cuando hay variants validas.
- Validaciones locales:
  - `npm run lint`: PASS.
  - `npx tsc --noEmit`: PASS.
  - `npm run build`: PASS.
  - Smoke local Storefront `/`, `/productos`, `/categorias/categoria-online-1`, `/productos/producto-6`: HTTP 200.
- Validaciones staging:
  - API publica `smoke-test-2s10d`: HTTP 200, `primaryImage.url` presente y `responsive.variants[]` real no vacio.
  - URLs WebP responsive `320w`, `640w`, `960w`, `1280w`: HTTP 200 con `content-type: image/webp`.
  - Storefront `/`, `/productos`, `/categorias/categoria-1`, `/productos/smoke-test-2s10d`: HTTP 200 tras estabilizar servicios.
  - Logs Storefront estabilizados sin `Functions cannot be passed directly to Client Components` ni `loader: function`.
- 2S.10D puede cerrarse como PASS total para el alcance responsive WebP/API/Storefront actual.
- Siguen diferidos/bloqueados: AVIF, cache avanzada y gallery responsive.

## Cierre final 2S.10D

- `2S.10D - Build: responsive, AVIF y caché avanzada` cerrada formalmente como PASS para responsive WebP end-to-end, API publica y Storefront.
- Documento final de cierre creado: `docs/qa/PHASE2S10D_FINAL_CLOSURE_QA.md`.
- Se mantiene explicito:
  - AVIF deferred/blocked.
  - Caché avanzada deferred.
  - Gallery responsive fuera de alcance.
- No hay bloqueantes para continuar con el ERP/POS cuando el usuario defina la siguiente seccion.
- No se inicia ninguna fase nueva automaticamente.
- Siguiente accion: esperar definicion del usuario sobre la proxima seccion del ERP/POS.
