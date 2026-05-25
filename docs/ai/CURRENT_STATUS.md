# Current Status - InkToy ERP/POS

## Estado actual

Proyecto en estado pre-piloto con MVP funcional, estabilizado y con validaciones tecnicas/QA documentadas.

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

## Siguiente etapa recomendada

Preparar carga inicial real controlada (catalogo, almacenes, stock base y parametros operativos), solo cuando exista autorizacion explicita del responsable de negocio/tecnico.

## Nota de alcance

Este estado se basa en README, ADR y reportes QA actuales del repositorio. Cualquier punto no cubierto por evidencia adicional queda "pendiente de verificar".
