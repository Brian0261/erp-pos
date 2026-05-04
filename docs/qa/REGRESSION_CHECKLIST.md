# Regression Checklist

Fecha de ejecucion: 2026-04-28
Ambiente: Docker Compose (frontend Nginx 4200, backend 8080, postgres 5432)

## Build y runtime

- [x] `git status` revisado antes de cambios.
- [x] Backend: `mvn clean test` => BUILD SUCCESS (109 tests OK).
- [x] Backend: `mvn clean verify` => BUILD SUCCESS.
- [x] Frontend: `npm install` ejecutado.
- [x] Frontend: `npm run build` exitoso.
- [x] `docker compose config` OK.
- [x] `docker compose up --build -d` OK.
- [x] `docker compose ps` con `postgres` healthy, `backend` up, `frontend` up.

## Protocolo UX-011 anti-cache frontend (2026-05-04)

- [x] Estado PWA/service worker revisado en configuracion actual:
  - [x] `frontend/angular.json`: sin bandera `serviceWorker`.
  - [x] `frontend/src/main.ts`: sin `provideServiceWorker`.
  - [x] `frontend/package.json`: sin dependencia `@angular/service-worker`.
  - [x] No se detecta `ngsw-config.json` ni `manifest.webmanifest` en runtime frontend.
  - [x] Conclusion: hoy no hay PWA activa; el riesgo principal es cache de navegador/CDN local/Nginx, no service worker.
- [x] Origen oficial QA para frontend en Docker: `http://localhost:4200` (evitar `127.0.0.1` por variaciones CORS/host).
- [x] Para rutas criticas usar parametro preventivo `?ngsw-bypass=true` (estandar defensivo, compatible con estado actual sin SW).
- [x] Ejecutar recarga fuerte del navegador (Hard Reload) tras cada `docker compose up --build -d`.
- [x] Si persisten dudas de cache, repetir validacion en ventana incognita.
- [x] Confirmar estado runtime:
  - [x] `docker compose up --build -d`.
  - [x] `docker compose ps`.
  - [x] `docker compose logs frontend --tail=150`.
  - [x] `docker compose logs backend --tail=150`.
- [x] Confirmaciones tecnicas minimas antes de aprobar UI:
  - [x] Sin llamadas hardcodeadas a `localhost:8080` desde Angular (`apiUrl` relativo `/api/v1`).
  - [x] Sin fuentes externas (`fonts.googleapis.com` / `fonts.gstatic.com`).
  - [x] Assets de InkToy cargan correctamente (logo y recursos locales).
  - [x] Proxy `/api` operativo desde frontend Nginx.

### Checklist estandar pre-aceptacion UI (obligatorio)

- [x] `cd frontend`.
- [x] `npm run build`.
- [x] `cd ..`.
- [x] `docker compose up --build -d`.
- [x] `docker compose ps`.
- [x] Abrir `/login?ngsw-bypass=true` sobre `http://localhost:4200`.
- [x] Validar login con usuario objetivo.
- [x] Validar ruta objetivo con `?ngsw-bypass=true`.
- [x] Validar consola sin errores inesperados.
- [x] Validar network sin `500` inesperados.
- [x] Confirmar visualmente que el cambio aparece realmente en el contenedor Docker (no en shell cacheada).
- [x] Si hay duda, repetir en incognita y con hard reload.

## Health y auth

- [x] `GET /api/v1/health` => 200.
- [x] `GET /api/v1/health/db` => 200.
- [x] Login `admin@erp.local` => 200 + token.
- [x] Login `cajero@erp.local` => 200 + token.
- [x] Login `almacenero@erp.local` => 200 + token.
- [x] Login `supervisor@erp.local` => 200 + token.
- [x] `GET /api/v1/auth/me` con token valido => 200 y rol correcto.
- [x] `GET /api/v1/auth/me` sin token => 401.
- [x] `GET /api/v1/auth/me` token invalido => 401.

## Seguridad por roles

- [x] Outbox solo ADMIN (`200` ADMIN, `403` CAJERO/ALMACENERO/SUPERVISOR).
- [x] Configuracion critica billing solo ADMIN (`/billing/company-profile`).
- [x] `CAJERO` con acceso de lectura a `/billing/series` => 200; mutaciones de series (`POST/PUT/DELETE`) se mantienen solo ADMIN.
- [x] `ALMACENERO` sin acceso a `/cash-registers/current` => 403.
- [x] `SUPERVISOR` con acceso a `/reports/sales` => 200.

## Endpoints modulo MVP (smoke)

- [x] AUTH: `/auth/login`, `/auth/me`.
- [x] CATALOG: `/products`, `/products/search`, `/categories`, `/units`.
- [x] INVENTORY: `/warehouses`, `/inventory/stocks`, `/inventory/kardex`.
- [x] PURCHASES: `/suppliers`, `/purchase-orders`.
- [x] SALES/CASH/POS: `/cash-registers/current`, `/sales`, `/pos/products/search`.
- [x] QUOTES: `/quotes`.
- [x] BILLING: `/billing/company-profile`, `/billing/series`, `/billing/documents`.
- [x] REPORTS: `/reports/sales`, `/reports/low-stock`, `/reports/top-products`, `/reports/electronic-documents`.
- [x] OUTBOX: `/integrations/outbox-events`.
- [x] HEALTH: `/health`, `/health/db`.

## Pantallas y SPA

- [x] Carga de shell Angular en rutas clave: `/login`, `/dashboard`, `/catalogo/productos`, `/inventario/stock`, `/inventario/kardex`, `/compras/proveedores`, `/compras/ordenes`, `/caja`, `/pos`, `/ventas`, `/cotizaciones`, `/facturacion/configuracion`, `/facturacion/series`, `/facturacion/comprobantes`, `/reportes`, `/integraciones/eventos`.
- [x] Refresh directo de rutas SPA sin `404` Nginx ni `Cannot GET`.
- [x] Proxy `/api` operativo sin CORS en llamadas validadas.
- [ ] Verificacion manual visual de consola navegador por cada pantalla/accion (pendiente manual UX).

## Flujos criticos A-H

- [x] A Catalogo/POS: busqueda por SKU y lookup por barcode; producto visible en POS.
- [x] B Inventario: stock consultado; kardex operativo; sin stock negativo.
- [x] C Compras: validado por consistencia SQL de `PURCHASE_IN` y endpoints de compras; flujo transaccional completo queda validado por datos existentes.
- [x] D Caja/POS/Ventas: apertura de caja, venta, anulacion por SUPERVISOR, descuento y reposicion de stock (`SALE_OUT`/`SALE_VOID_IN`).
- [x] E Cotizaciones: crear, enviar, convertir a venta, bloqueo de doble conversion (409).
- [x] F Facturacion: `from-sale`, `generate-xml`, `sign`, `send`; estado final `ACCEPTED`; historial disponible.
- [x] G Reportes: ventas, stock bajo, top productos, comprobantes sin 500.
- [x] H Outbox: listar como ADMIN, 403 en roles no ADMIN, accion `retry` ejecutada.

## Consistencia de datos SQL

- [x] `stock_balances.quantity < 0` => 0 filas.
- [x] `stock_balances` vs ultimo `inventory_movements.new_stock` => 0 mismatch.
- [x] Ventas anuladas sin movimiento `SALE_VOID_IN` => 0.
- [x] Cotizaciones `CONVERTED` sin `converted_sale_id` => 0.
- [x] Duplicado de comprobante por `sale_id + document_type` => 0.
- [x] Outbox sin referencia RabbitMQ/SQS/ecommerce real en payload => 0 coincidencias.

## Logs

- [x] Backend sin errores 500 inesperados en la corrida.
- [x] Frontend Nginx sin errores criticos de arranque.
- [x] Sin llamadas hardcodeadas a `localhost:8080` en `frontend/src`.

## Bloque D Dashboard InkToy (2026-04-29)

- [x] Dashboard reemplazo placeholder por hub operativo con KPIs por rol.
- [x] Build frontend (`npm run build`) exitoso con Bloque D.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Login y carga de `/dashboard` correctos para ADMIN/CAJERO/ALMACENERO/SUPERVISOR.
- [x] Refresh de `/dashboard` mantiene sesion valida en los 4 roles.
- [x] Logout funcional y ruta protegida `/dashboard` redirige a `/login` tras cerrar sesion.
- [x] Outbox visible solo para ADMIN en shell y accesos rapidos.
- [x] Configuracion critica de facturacion visible solo para ADMIN en shell.
- [x] Sin errores de consola durante validacion por roles en navegador.
- [x] Sin respuestas HTTP 500 inesperadas en dashboard tras ajuste de consumo de ventas/cotizaciones.
- [x] Backend/AuthService/guards/interceptor/endpoints no modificados.

## Bloque E1 Catalogo InkToy (2026-04-29)

- [x] Pantallas aplicadas: `/catalogo/productos`, `/catalogo/productos/nuevo`, `/catalogo/productos/:id/editar`, `/catalogo/categorias`, `/catalogo/unidades`.
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E1.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] ADMIN: busqueda de productos por nombre, SKU y barcode validada.
- [x] ADMIN: crear producto validado (SKU/barcode independientes).
- [x] ADMIN: editar producto validado.
- [x] ADMIN: desactivar producto validado (estado Inactivo + boton deshabilitado).
- [x] ADMIN: crear categoria validado.
- [x] ADMIN: crear unidad validado.
- [x] Refresh directo SPA sin `404` en rutas de catalogo intervenidas.
- [x] Validacion RBAC visual de menu catalogo:
  - [x] CAJERO no ve entradas de catalogo.
  - [x] ALMACENERO ve entradas de catalogo.
  - [x] SUPERVISOR ve entradas de catalogo.
- [x] Login/logout funcional para CAJERO, ALMACENERO y SUPERVISOR.
- [x] Sin errores de consola JavaScript ni errores de runtime (`pageerror`) en pruebas E1.
- [x] Logo InkToy, layout/sidebar y dashboard permanecen estables.
- [x] Backend, endpoints, rutas, AuthService, guards e interceptor sin cambios.

## Hardening RBAC Frontend (2026-04-29)

- [x] Se implemento `roleGuard` para `canActivateChild` sobre rutas protegidas por sesion.
- [x] Matriz de `allowedRoles` aplicada en `app.routes.ts` por ruta/modulo.
- [x] Usuario sin sesion redirige a `/login` al abrir rutas protegidas.
- [x] CAJERO bloqueado por frontend en `/catalogo/productos` (redirige a `/dashboard`).
- [x] CAJERO bloqueado por frontend en `/integraciones/eventos` (redirige a `/dashboard`).
- [x] ALMACENERO bloqueado por frontend en `/pos` (redirige a `/dashboard`).
- [x] SUPERVISOR bloqueado por frontend en `/integraciones/eventos` (redirige a `/dashboard`).
- [x] ADMIN mantiene acceso en rutas criticas (`/integraciones/eventos`, `/facturacion/configuracion`, `/facturacion/series`).
- [x] Login/logout sin regresion tras endurecimiento de guardias de rutas.
- [x] Build frontend (`npm run build`) exitoso.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Revalidacion puntual en `/pos` (SUPERVISOR): no se reprodujo respuesta `403`; sin impacto en bloqueo de rutas.

## Bloque E2 Inventario InkToy (2026-04-29)

- [x] Pantallas aplicadas: `/inventario/almacenes`, `/inventario/stock`, `/inventario/stock-inicial`, `/inventario/ajustes`, `/inventario/transferencias`, `/inventario/kardex`.
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E2.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Validacion visual base de E2: estructura `ui-page-head` presente en pantallas de inventario intervenidas.
- [x] Matriz de acceso por ruta (frontend) validada en navegador:
  - [x] ADMIN: acceso a las 6 rutas E2.
  - [x] ALMACENERO: acceso a `almacenes/stock/stock-inicial/ajustes/transferencias`; bloqueo en `/inventario/kardex` (redirige a `/dashboard`).
  - [x] SUPERVISOR: acceso a `almacenes/stock/kardex`; bloqueo en `stock-inicial/ajustes/transferencias` (redirige a `/dashboard`).
- [x] Refresh directo SPA sin `404` en rutas E2 intervenidas.
- [x] Servicios/endpoints de inventario sin cambios de contrato en E2.
- [x] Backend, rutas, auth, guards, interceptor y permisos no modificados por E2 (solo presentacion).

### Smoke funcional corto Inventario E2 (2026-04-29)

- [x] Usuario/rol de ejecucion principal: `admin@erp.local` (ADMIN).
- [x] Rutas abiertas en navegador: `almacenes`, `stock`, `stock-inicial`, `ajustes`, `transferencias`, `kardex`.
- [x] Dato de prueba operativo utilizado:
  - Producto: `Producto Sprint5 1777163753 (SKU: SKU-S5-1777163753)`
  - Almacen origen: `WH-01 - Almacen Principal`
  - Almacen destino: `S3DST1777141364 - Almacen Destino S3 1777141364`
- [x] Ajuste positivo valido (`+1`): `201` y mensaje `Ajuste registrado correctamente.`.
- [x] Verificacion stock post ajuste positivo: `30` -> `31`.
- [x] Ajuste negativo valido (`-0.5`): `201` y mensaje `Ajuste registrado correctamente.`.
- [x] Verificacion stock post ajuste negativo: `31` -> `30.5`.
- [x] Ajuste negativo invalido (cantidad excesiva): `422` controlado con mensaje `Validacion fallida: Adjustment leaves negative stock`.
- [x] Verificacion stock tras intento invalido: se mantiene en `30.5` (sin mutacion).
- [x] Transferencia valida (`0.2`) origen->destino: `201` y mensaje `Transferencia registrada correctamente.`.
- [x] Verificacion stock transferencia:
  - Origen `WH-01`: `30.5` -> `30.3`
  - Destino `S3DST1777141364`: `0` -> `0.2`
- [x] Kardex consultado y confirmado por motivos de prueba:
  - `ADJUSTMENT_IN`
  - `ADJUSTMENT_OUT`
  - `TRANSFER_OUT` y `TRANSFER_IN`
- [x] Estado vacio validado en kardex con rango futuro (`2099-01-01`): mensaje `No hay movimientos para los filtros seleccionados.`.
- [x] Seguridad/rutas protegidas revalidadas:
  - Sin sesion en `/inventario/stock` redirige a `/login`.
  - `almacenero@erp.local` bloqueado en `/inventario/kardex` (redirige a `/dashboard`).
  - `almacenero@erp.local` mantiene acceso a `/inventario/ajustes`.
- [x] Sin errores `500` ni `pageerror` durante el smoke.
- [x] Registro de consola con `422` esperado unicamente en la prueba negativa invalida.

## Bloque E3 POS/Caja/Ventas InkToy (2026-04-29)

- [x] Pantallas aplicadas: `/pos`, `/caja`, `/ventas`, `/ventas/:id`, `/ventas/:id/anular`.
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E3.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Smoke visual-funcional E3 en navegador con `admin@erp.local` (ADMIN):
  - [x] `/caja` renderiza cabecera InkToy, estado de sesion y paneles operativos.
  - [x] `/pos` renderiza bloques de busqueda, carrito, pagos y totales.
  - [x] Busqueda por nombre en POS (`lapiz`) ejecutada sin `pageerror`.
  - [x] `/ventas` renderiza filtros y tabla con estados.
  - [x] `/ventas/37` renderiza resumen, items, pagos y totales.
  - [x] `/ventas/37/anular` renderiza formulario de anulacion.
- [x] Matriz de acceso por ruta (frontend) revalidada en E3:
  - [x] CAJERO: acceso a `/pos`, `/caja`, `/ventas`.
  - [x] CAJERO: bloqueo en `/ventas/37/anular` (redirige a `/dashboard`).
  - [x] ALMACENERO: bloqueo en `/pos`, `/caja`, `/ventas` (redirige a `/dashboard`).
  - [x] ALMACENERO: acceso control en `/inventario/stock` (sin regresion de permisos).
  - [x] SUPERVISOR: acceso a `/ventas` y `/ventas/37/anular`.
  - [x] ADMIN: acceso a `/ventas/37/anular`.
- [x] Sin errores `500` ni `pageerror` inesperados durante validacion E3.
- [x] Evento de consola `403` observado unicamente en intento no autorizado esperado (CAJERO a ruta de anulacion).
- [x] Sin cambios en contratos API de `pos/sales/cash-register`, guards, interceptor, backend o rutas.

### Smoke transaccional corto E3 (2026-04-29)

- [x] Validacion base ejecutada:
  - [x] `cd frontend` + `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => backend/frontend up, postgres healthy.
- [x] Usuario/rol principal de ejecucion: `admin@erp.local` (ADMIN).
- [x] Usuario/rol para prueba negativa de permisos: `cajero@erp.local` (CAJERO).
- [x] Flujo caja:
  - [x] `/caja` con sesion abierta existente `#15`.
  - [x] Estado visual de caja confirmado: `OPEN`.
  - [x] No se abrio nueva caja para evitar alterar estado operativo.
- [x] Flujo POS/Venta real:
  - [x] Almacen usado: `S3DST1777141364 - Almacen Destino S3 1777141364`.
  - [x] Producto usado: `Producto S4 1777159803 (SKU: SKU-S4-1777159803)`.
  - [x] Venta registrada: `S-1777512445806` (ID `38`).
  - [x] Total/pago/vuelto validados: `25.50` / `30.50` / `5.00`.
  - [x] Mensaje de exito mostrado: `Venta S-1777512445806 registrada correctamente.`.
- [x] Listado y detalle:
  - [x] Venta visible en `/ventas` con estado `COMPLETED`.
  - [x] Detalle en `/ventas/38` con items/pagos/totales/fecha correctos.
- [x] Stock y kardex (post venta):
  - [x] Stock antes de venta: `19`.
  - [x] Stock despues de venta: `18`.
  - [x] Delta confirmado: `-1`.
  - [x] Kardex confirmado con `SALE_OUT` (motivo incluye `Sale S-1777512445806`).
- [x] Anulacion y reposicion:
  - [x] Anulacion ejecutada en `/ventas/38/anular` con motivo controlado.
  - [x] Estado final de venta: `VOIDED`.
  - [x] Stock despues de anulacion: `19`.
  - [x] Delta reposicion confirmado: `+1` (retorno al valor inicial).
  - [x] Kardex confirmado con `SALE_VOID_IN` (motivo incluye `Sale void S-1777512445806`).
- [x] Pruebas negativas/control de errores:
  - [x] Rol no permitido: `CAJERO` bloqueado en `/ventas/38/anular` (redirige a `/dashboard`).
  - [ ] Venta sin caja abierta: no ejecutada; `CAJERO` presento sesion abierta en el entorno y se evito forzar cierre para no alterar estado.
  - [x] Error `403` observado y controlado en pruebas negativas.
  - [ ] Escenarios `409/422` no forzados en E3 para evitar mutaciones no necesarias del flujo operativo.
- [x] Runtime/consola:
  - [x] Sin `pageerror`.
  - [x] Sin respuestas `500` inesperadas.
  - [x] Solo errores esperados de pruebas negativas/controladas.

  ## Bloque BT-001 Caja abierta unica por usuario (2026-05-04)
  - [x] Backend: `mvn clean test` => SUCCESS.
  - [x] Backend: `mvn clean verify` => SUCCESS.
  - [x] `docker compose up --build -d` ejecutado.
  - [x] `docker compose ps` con `postgres` healthy, `backend` up, `frontend` up.
  - [x] Backend runtime recuperado (credenciales DB runtime validadas contra `docker inspect` del contenedor backend).
  - [x] Flyway V13 verificado en DB activa (`inktoy_name_local`) con `success=true`.
  - [x] Indice parcial unico `uq_cash_register_sessions_opened_by_user_open` verificado en DB activa.
  - [x] API BT-001:
    - [x] Primera apertura por usuario (`/cash-registers/open`) => `201`.
    - [x] Segunda apertura del mismo usuario => `409`.
    - [x] Apertura de usuarios distintos en paralelo => `201` por usuario.
    - [x] Cierre + reapertura => `200`/`201`.
    - [x] Sin `500` en corrida principal BT-001.
  - [x] UI `/caja`:
    - [x] Apertura correcta y estado OPEN visible.
    - [x] Prevencion de doble apertura visible (boton deshabilitado + mensaje informativo).
    - [x] Cierre y reapertura validados.
  - [x] UI `/pos`:
    - [x] Carga estable con caja abierta.
    - [x] Busqueda por nombre devuelve estado vacio controlado (sin crash).
  - [x] Venta real + validacion stock/kardex en corrida controlada BT-001.
    - [x] Datos QA operativos creados por API (sin cambios de codigo/configuracion).
    - [x] Producto: `#2` (`SKU-BT001-1777916163`) en almacen `#2` (`WH-01`).
    - [x] Stock antes: `5.000`.
    - [x] Venta generada: `#2` (`S-1777916164455`) estado `COMPLETED`, pago `CASH`.
    - [x] Stock despues: `4.000`.
    - [x] Kardex con `SALE_OUT` confirmado (`id=4`, `referenceId=2`).
    - [x] Sin stock negativo global (`stock_balances.quantity < 0` => 0).
    - [x] Sin errores `500` en corrida controlada.
    - [x] Cierre/reapertura y restriccion BT-001 revalidadas (`409`, `200`, `201`, `409`).

## Bloque E4 Compras/Proveedores InkToy (2026-04-30)

- [x] Pantallas aplicadas:
  - [x] `/compras/proveedores`
  - [x] `/compras/ordenes`
  - [x] `/compras/ordenes/nueva`
  - [x] `/compras/ordenes/:id`
  - [x] `/compras/ordenes/:id/editar`
  - [x] `/compras/ordenes/:id/recibir`
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E4.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos (`postgres` healthy, `backend` up, `frontend` up).
- [x] Validacion por ruta (frontend) en navegador:
  - [x] `ADMIN` con acceso a rutas de proveedores/ordenes y acciones de gestion (`nueva`, `editar`, `recibir`).
  - [x] `ALMACENERO` con acceso a rutas de proveedores/ordenes y acciones de gestion (`nueva`, `editar`, `recibir`).
  - [x] `SUPERVISOR` con acceso a lectura (`/compras/proveedores`, `/compras/ordenes`, `/compras/ordenes/:id`) y bloqueo en rutas de gestion (`/nueva`, `/editar`, `/recibir`) con redireccion a `/dashboard`.
  - [x] `CAJERO` bloqueado en todas las rutas de compras intervenidas con redireccion a `/dashboard`.
- [x] Validacion API RBAC de compras:
  - [x] `GET /api/v1/suppliers` => `200` SUPERVISOR, `403` CAJERO.
  - [x] `GET /api/v1/purchase-orders` => `200` SUPERVISOR, `403` CAJERO.
  - [x] `POST /api/v1/purchase-orders/{id}/approve` => `403` SUPERVISOR.
  - [x] `POST /api/v1/purchase-orders/{id}/receive` => `403` SUPERVISOR.
- [x] Sin errores `500` inesperados durante validacion E4.
- [x] Sin cambios en backend, contratos de servicio, guards, interceptor o rutas; alcance visual-only en componentes de compras.

### Smoke transaccional corto E4 (2026-04-30)

- [x] Usuario/rol de ejecucion principal: `admin@erp.local` (ADMIN).
- [x] Usuario/rol de gestion complementaria: `almacenero@erp.local` (ALMACENERO).
- [x] Usuario/rol negativo: `supervisor@erp.local` (SUPERVISOR).
- [x] Flujo ejecutado sobre datos reales:
  - [x] Proveedor creado: `#10` (`Proveedor E4 1777509644`).
  - [x] Orden creada: `#17` en estado inicial `DRAFT`.
  - [x] Aprobacion con SUPERVISOR bloqueada (`403`).
  - [x] Aprobacion con ALMACENERO exitosa (`200`).
  - [x] Recepcion con SUPERVISOR bloqueada (`403`).
  - [x] Recepcion con ADMIN exitosa (`200`) y estado final `RECEIVED`.
- [x] Consistencia de inventario y kardex:
  - [x] Producto usado: `#15` (`SKU-S5-1777163780`).
  - [x] Almacen usado: `#8`.
  - [x] Stock antes de recepcion: `2`.
  - [x] Stock despues de recepcion: `3`.
  - [x] Delta confirmado: `+1`.
  - [x] Kardex con movimiento `PURCHASE_IN` encontrado (motivo: `Purchase receipt #19`).

## Bloque E5 Cotizaciones InkToy (2026-04-30)

- [x] Pantallas aplicadas:
  - [x] `/cotizaciones`
  - [x] `/cotizaciones/nueva`
  - [x] `/cotizaciones/:id`
  - [x] `/cotizaciones/:id/editar`
  - [x] `/cotizaciones/:id/convertir`
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E5.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos (`postgres` healthy, `backend` up, `frontend` up).
- [x] Smoke funcional E5 en navegador (ADMIN):
  - [x] Crear cotizacion desde `/cotizaciones/nueva`.
  - [x] Editar cotizacion desde `/cotizaciones/:id/editar`.
  - [x] Enviar cotizacion desde detalle (`DRAFT` -> `SENT`).
  - [x] Validar historial de estados en `/cotizaciones/:id`.
  - [x] Convertir a venta en `/cotizaciones/:id/convertir` con caja abierta y stock suficiente.
  - [x] Validar venta generada y `convertedSaleId` visible en detalle.
- [x] Evidencia de corrida E5:
  - [x] Cotizacion creada/editada/enviada/convertida: `#34` (`Q-1777515320376`).
  - [x] Venta generada por conversion: `#39`.
  - [x] Historial confirmado con transicion `SENT` -> `CONVERTED` y comentario `Conversion smoke E5`.
- [x] Doble conversion bloqueada:
  - [x] `POST /api/v1/quotes/34/convert-to-sale` (segundo intento) => `409 Quote already converted`.
  - [x] Boton `Convertir a venta` deshabilitado en UI despues de convertir.
- [x] Validacion de estabilidad E5:
  - [x] Sin errores de consola JS durante smoke E5 (navegador en `http://localhost:4200`).
  - [x] Sin respuestas HTTP `500` durante validacion E5.
- [x] Validacion de roles E5 (frontend + API):
  - [x] `ADMIN`: acceso a `/cotizaciones` y `/cotizaciones/nueva`; API `GET/POST/send` en quotes => `200/201/200`.
  - [x] `CAJERO`: acceso a `/cotizaciones` y `/cotizaciones/nueva`; API `GET/POST/send` en quotes => `200/201/200`.
  - [x] `SUPERVISOR`: acceso a `/cotizaciones` y `/cotizaciones/nueva`; API `GET/POST/send` en quotes => `200/201/200`.
  - [x] `ALMACENERO`: bloqueo frontend en `/cotizaciones` y `/cotizaciones/nueva` con redireccion a `/dashboard`; API quotes (`GET/POST`) => `403/403`.
- [x] Alcance tecnico preservado: sin cambios en backend, endpoints, contratos de servicio, guards, interceptor ni reglas de negocio de cotizaciones.

## Bloque E6 Facturacion InkToy (2026-04-30)

- [x] Pantallas aplicadas:
  - [x] `/facturacion/configuracion`
  - [x] `/facturacion/series`
  - [x] `/facturacion/comprobantes`
  - [x] `/facturacion/comprobantes/:id`
  - [x] `/facturacion/emitir/:saleId`
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E6.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos (`postgres` healthy, `backend` up, `frontend` up).
- [x] Smoke funcional E6 en navegador (ADMIN, `http://localhost:4200`):
  - [x] Configuracion: carga de perfil por ambiente y actualizacion exitosa (`Perfil tributario guardado correctamente.`).
  - [x] Series: listado, creacion (`B009`) y edicion de correlativo (`101`) exitosas.
  - [x] Comprobantes: filtros por estado (`DRAFT`) y listado operativo.
  - [x] Emision desde venta: venta `#39` emitida como `B009-00000101`.
  - [x] Detalle `#9`: flujo `DRAFT -> GENERATED -> SIGNED -> SENT -> ACCEPTED` con historial completo.
- [x] Validacion de roles E6 (frontend + smoke UI):
  - [x] `ADMIN`: acceso total a configuracion, series, comprobantes, emision y workflow de detalle.
  - [x] `CAJERO`: acceso a `/facturacion/comprobantes` y detalle; bloqueo en `/facturacion/configuracion` (redirige a `/dashboard`); botones `Firmar XML`/`Enviar mock/sandbox` deshabilitados en detalle.
  - [x] `CAJERO`: flujo `/facturacion/emitir/:saleId` validado; series cargan correctamente y emision desde venta completada sin habilitar rutas admin de series/configuracion.
  - [x] `SUPERVISOR`: acceso a comprobantes/detalle; bloqueo en `/facturacion/configuracion` (redirige a `/dashboard`); flujo de firma/envio mock validado en comprobante `#10` hasta `ACCEPTED`.
  - [x] `ALMACENERO`: bloqueo en `/facturacion/comprobantes` y `/facturacion/configuracion` con redireccion a `/dashboard`.
- [x] Sin respuestas HTTP `500` inesperadas durante validacion E6.
- [x] Sin errores de consola en rutas E6 por carga de XML prematura; comprobantes sin XML muestran estado informativo sin `404` tecnico visible.
- [x] Alcance tecnico preservado en E6: sin cambios de contratos API; ajuste puntual aplicado en backend (RBAC lectura de series) y frontend (carga condicional de XML) manteniendo reglas de negocio.

### Revalidacion UX-004 Facturacion (2026-05-04)

- [x] Alcance UX-004 aplicado solo en frontend: confirmacion previa para `Generar XML`, `Firmar XML` y `Enviar mock/sandbox` en detalle de comprobante.
- [x] Archivo validado: `frontend/src/app/features/billing/billing-document-detail-page.component.ts`.
- [x] ADMIN - comprobante `#2` (`DRAFT`):
  - [x] `Generar XML` muestra confirmacion contextual.
  - [x] `Cancelar` confirmacion mantiene estado en `DRAFT` y sin nuevo historial.
  - [x] `Confirmar` ejecuta accion y cambia estado a `GENERATED` con traza `XML generated`.
- [x] ADMIN - comprobante `#5` (`GENERATED`/`SIGNED`):
  - [x] `Firmar XML` muestra confirmacion contextual.
  - [x] `Cancelar` confirmacion mantiene estado en `GENERATED`.
  - [x] `Confirmar` ejecuta accion y cambia a `SIGNED`.
  - [x] `Enviar mock/sandbox` muestra confirmacion contextual.
  - [x] `Cancelar` confirmacion mantiene estado en `SIGNED`.
  - [x] `Confirmar` ejecuta envio y completa flujo hasta `ACCEPTED`.
- [x] SUPERVISOR - comprobante `#2`:
  - [x] `Firmar XML` habilitado y exitoso (estado `GENERATED` -> `SIGNED`).
  - [x] `Enviar mock/sandbox` habilitado; confirmacion visible y `Cancelar` sin mutacion.
- [x] CAJERO - comprobante `#2`: botones `Firmar XML` y `Enviar mock/sandbox` deshabilitados (sin ejecucion de accion critica).
- [x] ALMACENERO: bloqueo de acceso a Facturacion confirmado (sin menu de comprobantes y redireccion a `/dashboard` al forzar URL de detalle).
- [x] Estabilidad en corrida UX-004:
  - [x] Sin `pageerror` en flujo validado.
  - [x] Sin HTTP `500` inesperados en backend durante la corrida UX-004 (solo warning de Spring Security no bloqueante en arranque).

### Revalidacion UX-005 Facturacion (2026-05-04)

- [x] Alcance UX-005 aplicado solo en frontend del listado de comprobantes.
- [x] Archivo validado: `frontend/src/app/features/billing/billing-documents-page.component.ts`.
- [x] Ajuste UX aplicado:
  - [x] Se removio `Emitir desde venta` como accion por fila en la tabla de comprobantes.
  - [x] Se mantienen acciones por fila claras: `Ver detalle` y `Ver venta`.
  - [x] Se mantiene emision desde flujo global por `saleId` (campo `Emitir desde venta` + boton `Ir`).
- [x] Validacion funcional en UI (`/facturacion/comprobantes`):
  - [x] Listado carga correctamente con comprobantes existentes.
  - [x] No se muestra `Emitir desde venta` en filas del listado.
  - [x] Navegacion a detalle (`Ver detalle`) operativa.
  - [x] Navegacion a venta asociada (`Ver venta`) operativa.
  - [x] Navegacion al flujo de emision desde accion global (`Ir`) operativa (`/facturacion/emitir/:saleId`).
- [x] Estabilidad en corrida UX-005:
  - [x] Sin `pageerror` durante la validacion.
  - [x] Sin respuestas HTTP `500` inesperadas en backend durante la corrida.

### Revalidacion UX-010 Cotizaciones (2026-05-04)

- [x] Alcance UX-010 aplicado solo en frontend de edicion de cotizaciones.
- [x] Archivo validado: `frontend/src/app/features/quotes/quote-edit-page.component.ts`.
- [x] Ajuste UX aplicado:
  - [x] Se elimino redireccion inmediata en `/cotizaciones/:id/editar` cuando la cotizacion no es editable.
  - [x] Se muestra mensaje persistente de bloqueo con contexto y acciones de salida (`Volver al detalle`, `Ir al listado`, `Crear nueva cotizacion`).
  - [x] Se mantiene bloqueo de guardado para estados no editables (sin llamada de update).
- [x] Casos validados en UI:
  - [x] DRAFT (`#43`): formulario editable visible y boton `Guardar cambios` disponible.
  - [x] SENT (`#32`): sin redireccion, se muestra bloque `Edicion no disponible` y sin formulario de guardado.
  - [x] CANCELLED (`#2`): sin redireccion, mensaje persistente y acciones de salida visibles.
  - [x] CONVERTED (`#1`): sin redireccion, mensaje persistente y acciones de salida visibles.
  - [x] Accion `Volver al detalle` desde estado bloqueado navega correctamente a `/cotizaciones/:id`.
- [x] Evidencia complementaria:
  - [x] Se genero cotizacion DRAFT para prueba editable: `#43` (`Q-1777875060899`).
- [x] Estabilidad en corrida UX-010:
  - [x] Sin `pageerror` durante la validacion.
  - [x] Sin respuestas HTTP `500` inesperadas en backend durante la corrida (solo warning no bloqueante de Spring Security en arranque).

### Revalidacion UX-011 Protocolo anti-cache (2026-05-04)

- [x] Alcance UX-011 aplicado como deuda de proceso QA (sin cambios funcionales de producto).
- [x] Configuracion revisada: `angular.json`, `frontend/Dockerfile`, `frontend/nginx.conf`, `docker-compose.yml`, `frontend/src/environments/environment.ts`.
- [x] Se confirma ausencia de PWA/service worker activo en la version actual.
- [x] Se formaliza protocolo anti-cache y checklist pre-aceptacion UI en este documento.
- [x] Se mantiene recomendacion de mejora de cache-control como deuda post-piloto (sin aplicar cambios de configuracion en esta etapa).

## Bloque E7 Reportes y Outbox/Eventos InkToy (2026-04-30)

- [x] Pantallas aplicadas:
  - [x] `/reportes`
  - [x] `/reportes/ventas`
  - [x] `/reportes/caja`
  - [x] `/reportes/stock-bajo`
  - [x] `/reportes/movimientos-inventario`
  - [x] `/reportes/compras`
  - [x] `/reportes/productos-mas-vendidos`
  - [x] `/reportes/cotizaciones`
  - [x] `/reportes/comprobantes`
  - [x] `/integraciones/eventos`
  - [x] `/integraciones/eventos/:id`
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E7.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos (`postgres` healthy, `backend` up, `frontend` up).
- [x] Smoke UI E7 en navegador (`http://localhost:4200`) con `admin`:
  - [x] Carga correcta de todas las rutas E7 sin errores de compilacion/runtime.
  - [x] Filtros basicos ejecutados (accion `Filtrar`) en reportes y outbox list sin regresiones funcionales.
  - [x] Detalle de outbox validado en `/integraciones/eventos/4` con metadata, payload y acciones administrativas visibles.
- [x] Matriz RBAC frontend validada para rutas E7:
  - [x] `ADMIN`: acceso permitido a `/reportes` y `/integraciones/eventos`.
  - [x] `SUPERVISOR`: acceso permitido a `/reportes`; bloqueo en `/integraciones/eventos` (redirige a `/dashboard`).
  - [x] `ALMACENERO`: acceso permitido a `/reportes`; bloqueo en `/reportes/ventas` y `/integraciones/eventos` (redirige a `/dashboard`).
  - [x] `CAJERO`: bloqueo en `/reportes` y `/integraciones/eventos` (redirige a `/dashboard`).
- [x] Alcance tecnico preservado en E7: sin cambios en backend, contratos API, guards, interceptor, rutas ni reglas RBAC.

## Validacion final full-stack InkToy (2026-04-30)

- [x] Secuencia tecnica final ejecutada:
  - [x] `npm run build` (frontend) exitoso.
  - [x] `docker compose up --build -d` exitoso.
  - [x] `docker compose ps` con `postgres` healthy y servicios `backend/frontend` en `Up`.
  - [x] `docker compose logs frontend --tail=150` sin errores criticos de Nginx.
  - [x] `docker compose logs backend --tail=150` con arranque Spring Boot/Flyway/JPA correcto.
- [x] Login y layout:
  - [x] `/login` muestra branding InkToy (logo y cabecera).
  - [x] Login `ADMIN` correcto y carga de `/dashboard`.
  - [x] Sidebar visible con menu esperado por rol.
  - [x] Logout funcional.
  - [x] Ruta protegida `/dashboard` redirige a `/login` tras logout.
- [x] Matriz de roles (frontend/rutas) validada:
  - [x] `ADMIN`: login/menu/rutas permitidas OK; acceso a `/integraciones/eventos` y configuracion critica de facturacion.
  - [x] `CAJERO`: login/menu/rutas permitidas OK; bloqueo en `/reportes`, `/integraciones/eventos`, `/facturacion/configuracion`, `/facturacion/series`.
  - [x] `ALMACENERO`: login/menu/rutas permitidas OK; bloqueo en rutas comerciales/administrativas no permitidas (`/pos`, `/caja`, `/ventas`, `/integraciones/eventos`, `/reportes/ventas`).
  - [x] `SUPERVISOR`: login/menu/rutas permitidas OK; bloqueo en `/integraciones/eventos`, `/facturacion/configuracion`, `/facturacion/series` y rutas operativas restringidas de inventario.
- [x] Pantallas principales validadas visualmente (21 rutas) sin regresion de carga ni perdida de informacion operativa.
- [x] Navegacion SPA (refresh directo) validada en:
  - [x] `/dashboard`
  - [x] `/pos`
  - [x] `/inventario/stock`
  - [x] `/compras/ordenes`
  - [x] `/cotizaciones`
  - [x] `/facturacion/comprobantes`
  - [x] `/reportes`
  - [x] `/integraciones/eventos`
  - [x] Resultado: documento HTTP `200`, shell Angular cargada, sin `Cannot GET`.
- [x] Smoke funcional minimo completado:
  - [x] Busqueda de producto en catalogo.
  - [x] Consulta de stock.
  - [x] Consulta de kardex.
  - [x] Listado de compras.
  - [x] Carga de POS, caja, ventas, cotizaciones, comprobantes, reportes.
  - [x] Outbox visible solo para `ADMIN`; bloqueo correcto para `CAJERO`.
- [x] Consistencia visual final:
  - [x] Branding InkToy consistente (logo/paleta).
  - [x] Botones primario/secundario/danger y chips legibles.
  - [x] Tablas/formularios/estados vacios/mensajes con jerarquia clara.
  - [x] Responsive basico aceptable en rutas de control (`/dashboard`, `/pos`, `/reportes`) sin overflow horizontal.
- [x] Consola y red:
  - [x] Sin errores JS inesperados (`console error = 0` en barrido final ADMIN).
  - [x] Sin `pageerror`.
  - [x] Sin HTTP `500` inesperados.
  - [x] Sin CORS.
  - [x] Sin llamadas a `localhost:8080` desde Angular.

## Hotfix UX-001 POS post-venta (2026-04-30)

- [x] Alcance limitado aplicado solo en `frontend/src/app/features/sales/pos-page.component.ts`.
- [x] Build y runtime de verificacion ejecutados:
  - [x] `cd frontend` + `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] Login validado en ambos perfiles operativos solicitados:
  - [x] `admin@erp.local`.
  - [x] `cajero@erp.local`.
- [x] Flujo UX-001 validado en navegador con `ADMIN`:
  - [x] Acceso a `/pos`.
  - [x] Refresco de caja y estado `Caja abierta` confirmado (`#15`).
  - [x] Almacen usado: `S3DST1777141469 - Almacen Destino S3 1777141469`.
  - [x] Producto usado: `Producto QA Sprint3 1777141469 (SKU-S3-1777141469)`.
  - [x] Pago usado: `CASH 12.50`.
  - [x] Venta registrada: `S-1777590981866` (ID `40`).
  - [x] Mensaje de exito visible: `Venta S-1777590981866 registrada correctamente.`.
  - [x] CTA post-venta visible tras limpiar carrito/pagos: `Ver venta #40`.
  - [x] Click en CTA navega a `/ventas/40`.
  - [x] Detalle de venta carga correctamente (resumen, items y pagos visibles).
- [x] Estabilidad de la corrida UX-001:
  - [x] Sin errores `500` inesperados durante el flujo validado.
  - [x] Sin `pageerror` en el flujo de venta->detalle.
  - [x] Sin solicitudes a `fonts.googleapis.com`.
  - [x] Proxy `/api` operativo.

## Hotfix UX-002 Confirmacion previa en POS (2026-04-30)

- [x] Alcance limitado aplicado solo en `frontend/src/app/features/sales/pos-page.component.ts`.
- [x] Build y runtime de verificacion ejecutados:
  - [x] `cd frontend` + `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] Flujo validado en navegador (`http://localhost:4200/login?ngsw-bypass=true`) con `admin@erp.local`:
  - [x] Ruta objetivo: `/pos`.
  - [x] Caja abierta confirmada (`#15`) tras `Refrescar caja`.
  - [x] Almacen de prueba: `S3DST1777141469 - Almacen Destino S3 1777141469`.
  - [x] Producto de prueba: `Producto QA Sprint3 1777141469 (SKU-S3-1777141469)`.
- [x] Confirmacion previa UX-002:
  - [x] Al presionar `Finalizar venta` se abre modal nativo `confirm`.
  - [x] El texto de confirmacion muestra al menos: `Cantidad de items`, `Total`, `Monto pagado`, `Vuelto`.
- [x] Escenario cancelar confirmacion:
  - [x] Se cancela el dialogo (`Cancel`).
  - [x] No se crea venta en backend (sin mensaje de exito ni ID nueva de venta).
  - [x] Stock se mantiene sin cambios tras cancelar (visible en resultados POS: `1` antes y `1` despues de cancelar).
- [x] Escenario confirmar venta:
  - [x] Se acepta el dialogo (`OK`).
  - [x] Venta creada correctamente: `S-1777592459816` (ID `41`).
  - [x] Se mantiene flujo original: mensaje de exito y CTA `Ver venta #41`.
  - [x] Navegacion a `/ventas/41` valida y detalle cargado correctamente.
  - [x] Stock cambia tras confirmar (resultado POS: `1` -> `0`).
- [x] Consola/runtime durante UX-002:
  - [x] Sin `pageerror`.
  - [x] Sin HTTP `500` inesperados.

## Correccion UX FE-007 inventario (2026-04-30)

- [x] Revision tecnica completada en:
  - [x] `frontend/src/app/features/inventory/initial-stock-page.component.ts`
  - [x] `frontend/src/app/features/inventory/adjustments-page.component.ts`
  - [x] `frontend/src/app/features/inventory/transfers-page.component.ts`
  - [x] `frontend/src/app/features/catalog/data/product.service.ts`
  - [x] `frontend/src/app/features/catalog/data/catalog.models.ts`
  - [x] `frontend/src/app/features/inventory/data/inventory.models.ts`
- [x] Causa identificada: selectores operativos consumian listado general de productos (`productService.list`) y mostraban items inactivos.
- [x] Correccion UX minima aplicada sin cambios de backend/endpoints/reglas:
  - [x] Filtro frontend `active === true` en carga de lookups de las 3 pantallas objetivo.
  - [x] Filtro adicional en render de opciones para asegurar visualizacion exclusiva de productos activos.
  - [x] Mensaje UX claro mantenido si backend devuelve `422 Product is inactive` por condicion residual.
  - [x] Sin cambios de payloads ni validaciones de backend.
- [x] Comandos tecnicos ejecutados:
  - [x] `cd frontend`
  - [x] `npm run build`
  - [x] `cd ..`
  - [x] `docker compose up --build -d`
  - [x] `docker compose ps`
- [x] Validacion manual (browser QA):
  - [x] `/inventario/stock-inicial` muestra placeholder `Selecciona un producto activo` y solo productos activos.
  - [x] `/inventario/ajustes` muestra placeholder `Selecciona un producto activo` y solo productos activos.
  - [x] `/inventario/transferencias` muestra placeholder `Selecciona un producto activo` y solo productos activos.
  - [x] Productos inactivos conocidos (`Producto E1 504590 Editado`, `Producto Cierre B Editado`, `Producto Sprint2 B`) no aparecen en selectores operativos.
  - [x] Registro ajuste positivo valido con producto activo: OK.
  - [x] Registro ajuste negativo valido con producto activo: OK.
  - [x] Registro transferencia valida con producto activo: OK.
  - [x] Sin errores de consola inesperados, sin `pageerror` y sin `500` durante corrida final FE-007.
- [x] Nota operativa QA: se uso `?ngsw-bypass=true` como bypass preventivo de cache en auditoria browser; en la configuracion actual no hay service worker activo.

## Hotfix UX-003 Confirmacion en Cotizaciones (2026-04-30)

- [x] Alcance limitado aplicado solo en:
  - [x] `frontend/src/app/features/quotes/quotes-page.component.ts`
  - [x] `frontend/src/app/features/quotes/quote-detail-page.component.ts`
  - [x] `frontend/src/app/features/quotes/quote-convert-page.component.ts`
- [x] Build y runtime de verificacion ejecutados:
  - [x] `cd frontend` + `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] Confirmaciones criticas UX-003 validadas en navegador (`admin@erp.local`):
  - [x] Listado `/cotizaciones`: `Enviar` muestra confirmacion previa.
  - [x] Listado `/cotizaciones`: `Cancelar` muestra confirmacion previa.
  - [x] Conversion `/cotizaciones/:id/convertir`: `Convertir a venta` muestra confirmacion previa con numero de cotizacion, total cotizacion, total pagado y advertencia de impacto en caja/stock.
- [x] Escenarios cancelados (no ejecucion de accion):
  - [x] Cotizacion `#13`: cancelar confirmacion de `Enviar` mantiene estado sin cambio (sin mutacion en backend).
  - [x] Cotizacion `#13`: cancelar confirmacion de `Convertir a venta` no genera venta ni muestra resultado de conversion.
- [x] Escenarios confirmados (flujo original preservado):
  - [x] Cotizacion `#13`: confirmar `Enviar` cambia estado `DRAFT -> SENT`.
  - [x] Cotizacion `#6`: confirmar `Cancelar` cambia estado a `CANCELLED` y registra historial de estado.
  - [x] Cotizacion `#13`: confirmar `Convertir a venta` con almacen `S3DST1777141364 - Almacen Destino S3 1777141364` y pago `25.5` genera venta `#42`.
  - [x] Detalle `/cotizaciones/13` muestra estado `CONVERTED`, historial `SENT -> CONVERTED` y link `Ver venta`.
  - [x] Listado `/cotizaciones` muestra la cotizacion `Q-1777180203427` en estado `CONVERTED`.
- [x] Validacion de doble conversion (conflicto esperado):
  - [x] `POST /api/v1/quotes/13/convert-to-sale` tras conversion exitosa devuelve `409 Conflict` con mensaje `Quote already converted`.
- [x] Consola/runtime durante UX-003:
  - [x] Sin `pageerror`.
  - [x] Sin HTTP `500` inesperados en los flujos validados.
  - [x] Solo `409` esperados y controlados en pruebas de conflicto de conversion.

## Smoke corto por roles UX-003 (2026-04-30)

- [x] Build/runtime previo del smoke por roles ejecutado:
  - [x] `cd frontend`.
  - [x] `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] `ADMIN`:
  - [x] Acceso a `/cotizaciones` y `/cotizaciones/nueva`.
  - [x] Confirmacion `Enviar` visible y flujo aceptado (`#10`: `DRAFT -> SENT`).
  - [x] Confirmacion `Cancelar` visible y cancelada; sin mutacion (`#10` permanece `SENT`, historial sin cambios).
  - [x] Confirmacion `Convertir` visible y cancelada; sin mutacion (`#10` mantiene `convertedSaleId` null).
- [x] `CAJERO`:
  - [x] Acceso a `/cotizaciones` y `/cotizaciones/nueva`.
  - [x] Confirmacion `Enviar` visible y flujo aceptado (`#3`: `DRAFT -> SENT`, historial registra `changedBy=cajero`).
  - [x] Confirmacion `Cancelar` visible y cancelada; sin mutacion (`#3` permanece `SENT`, historial sin cambios).
  - [ ] Convertir con `CAJERO` presenta bloqueo funcional en `/cotizaciones/3/convertir`.
    - Evidencia: `GET /api/v1/warehouses?active=true` => `403 Forbidden` para `CAJERO`.
    - Impacto: la pantalla de conversion queda sin contenido operativo (no se alcanza confirmacion de `Convertir`).
- [x] `SUPERVISOR`:
  - [x] Acceso a `/cotizaciones` y `/cotizaciones/nueva`.
  - [x] Confirmacion `Enviar` visible y flujo aceptado (`#7`: `DRAFT -> SENT`, historial registra `changedBy=supervisor`).
  - [x] Confirmacion `Cancelar` visible y cancelada; sin mutacion (`#7` permanece `SENT`).
  - [x] Confirmacion `Convertir` visible y cancelada; sin mutacion (`#7` mantiene `convertedSaleId` null).
- [x] `ALMACENERO`:
  - [x] No visualiza `Cotizaciones` en menu lateral.
  - [x] Navegacion directa a `/cotizaciones` redirige a `/dashboard`.
  - [x] Navegacion directa a `/cotizaciones/nueva` redirige a `/dashboard`.
- [x] Estabilidad general del smoke por roles:
  - [x] Sin `pageerror`.
  - [x] Sin respuestas HTTP `500` inesperadas.
  - [x] Se observo `403` en flujo de conversion de `CAJERO` (hallazgo de permisos), no asociado a UX-003 de confirmaciones.

## Revalidacion UX-003 post-fix permisos de almacenes para CAJERO (2026-04-30)

- [x] Build/runtime previo de revalidacion ejecutado:
  - [x] `cd frontend`.
  - [x] `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] Caso controlado de `CAJERO` preparado y validado:
  - [x] Cotizacion propia creada por API: `#41` (`Q-1777598147957`) en estado `DRAFT`.
  - [x] Stock confirmado para conversion (producto `#13`, almacen `#8` `S3DST1777141364 - Almacen Destino S3 1777141364`, cantidad `18`).
- [x] Confirmaciones UX-003 en `CAJERO` (UI + API) validadas en ambos caminos:
  - [x] `Enviar` cancelado: sin mutacion (`STATUS=DRAFT`, `HISTORY_COUNT=0`).
  - [x] `Enviar` confirmado: ejecuta flujo (`STATUS=SENT`, historial `DRAFT -> SENT`, `changedBy=cajero`).
  - [x] `Cancelar` visible en detalle y cancelado (sin mutacion).
  - [x] `Convertir` cancelado: sin mutacion (`STATUS=SENT`, `convertedSaleId` null).
  - [x] `Convertir` confirmado: conversion exitosa con venta `#43`; UI muestra `Cotizacion convertida correctamente` y `Ver venta #43`.
- [x] Fix backend de permisos de almacenes para `CAJERO` revalidado:
  - [x] `GET /api/v1/warehouses?active=true` => `200` (11 almacenes visibles).
  - [x] `POST /api/v1/warehouses` => `403` (mutacion bloqueada).
  - [x] `DELETE /api/v1/warehouses/8` => `403` (mutacion bloqueada).
- [x] Revalidacion de restricciones por rol (sin regresion):
  - [x] `ALMACENERO` no visualiza `Cotizaciones` en menu y navegacion directa a `/cotizaciones` redirige a `/dashboard`.
  - [x] `ALMACENERO` en API quotes (`GET /api/v1/quotes`) => `403`.
  - [x] `SUPERVISOR` mantiene acceso a `/cotizaciones` y confirmacion de `Cancelar` visible.
  - [x] `ADMIN` mantiene acceso a `/cotizaciones` y confirmacion de `Cancelar` visible.
- [x] Cierre de incidencia backend de doble conversion (revalidacion final 2026-04-30):
  - [x] Caso final validado con `CAJERO`: cotizacion `#42` (`Q-1777611293014`) convertida a venta `#44`.
  - [x] Segundo intento oficial `POST /api/v1/quotes/42/convert-to-sale` => `409 Conflict` con mensaje `Quote already converted`.
  - [x] Confirmado que no se reproduce `500` en el flujo oficial de conversion.
- [x] Revalidacion final de roles y confirmaciones UX-003:
  - [x] `CAJERO`: confirmacion de `Enviar` operativa; confirmacion de `Convertir` validada en cancelar (sin mutacion) y aceptar (conversion exitosa).
  - [x] `SUPERVISOR`: confirmacion de `Cancelar` visible y cancelada sin mutacion.
  - [x] `ADMIN`: confirmacion de `Cancelar` visible y cancelada sin mutacion.
  - [x] `ALMACENERO`: bloqueo mantenido en UI (`/cotizaciones` redirige a `/dashboard`) y API quotes (`403`).
- [x] Estabilidad de la corrida final:
  - [x] Sin `pageerror`.
  - [x] Sin errores de consola inesperados en los flujos UI validados.
  - [x] Sin respuestas `500` en el flujo oficial validado de UX-003.
