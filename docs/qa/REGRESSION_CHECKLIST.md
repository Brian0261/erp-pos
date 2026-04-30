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
- [x] `CAJERO` sin acceso a `/billing/series` => 403.
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
