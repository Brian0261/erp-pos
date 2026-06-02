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
