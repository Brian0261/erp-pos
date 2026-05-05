# MVP Stabilization Report

Fecha: 2026-04-28
Version validada: 0.0.1-SNAPSHOT
Ambiente: Docker Compose (postgres + backend + frontend Nginx)

## Comandos ejecutados

```powershell
git status --short
cd backend
mvn clean test
mvn clean verify
cd ../frontend
npm install
npm run build
cd ..
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs backend --tail=200
docker compose logs frontend --tail=200
```

Comandos adicionales de validacion:

- Health y auth por proxy: `Invoke-WebRequest/Invoke-RestMethod` contra `http://127.0.0.1:4200/api/v1/*`
- Validacion de rutas SPA (refresh directo) con `Invoke-WebRequest`
- Validacion de seguridad por roles con tokens JWT reales
- Validacion de flujos criticos (caja, venta, anulacion, quote->sale, billing, outbox)
- Consistencia de datos por SQL en PostgreSQL con `docker compose exec postgres psql`

## Modulos validados

- Auth/login/roles
- Dashboard (shell + auth me)
- Catalogo
- Inventario
- Compras
- POS/ventas
- Caja
- Cotizaciones
- Facturacion electronica MVP
- Reportes
- Outbox/eventos
- Healthcheck

## Resultado general

- Backend: `BUILD SUCCESS` en `mvn clean test` y `mvn clean verify`.
- Frontend: build Angular exitoso sin errores TypeScript/template.
- Docker: `postgres`, `backend`, `frontend` en estado `Up` (postgres healthy).
- Proxy Nginx `/api`: operativo.
- Health `/api/v1/health` y `/api/v1/health/db`: `200 OK`.
- Login 4 usuarios: `200`, token presente y `/auth/me` con rol correcto.
- Seguridad: 401/403 correctos segun rol.
- Endpoints principales por modulo: operativos (200 esperado; `/cash-registers/current` da 404 cuando no hay caja abierta, comportamiento esperado).
- Rutas SPA validadas por refresh directo: sin `404` de Nginx, sin `Cannot GET`.
- Flujos criticos API:
  - Venta creada y anulada con reposicion de stock validada.
  - Cotizacion creada, enviada, convertida a venta y doble conversion bloqueada (409).
  - Facturacion desde venta: `generate-xml`, `sign`, `send` con estado final `ACCEPTED`.
  - Outbox ADMIN: listar y retry ejecutado.
- Consistencia SQL:
  - stock negativo: 0
  - mismatch stock vs ultimo kardex: 0
  - ventas anuladas sin `SALE_VOID_IN`: 0
  - cotizaciones `CONVERTED` sin `converted_sale_id`: 0
  - duplicados de comprobante por `sale_id + document_type`: 0

## Bloqueantes encontrados (CRITICAL/HIGH)

- No se detectaron bugs CRITICAL/HIGH del producto en esta corrida final.

## Bloqueantes corregidos en esta corrida

- Ninguno (no aplico).

## Pendientes no bloqueantes (MEDIUM/LOW)

1. Dependencias frontend con vulnerabilidades reportadas por `npm audit` (riesgo de cadena de suministro, no bloqueo funcional inmediato).
2. Warning backend de serializacion `PageImpl` en endpoints `v1` legacy (mitigado con `v2` estable en BT-006 Fase 1; pendiente migracion frontend gradual).
3. Riesgo operativo local Windows: `localhost` puede resolver a `::1` y colisionar con proceso local distinto al contenedor en puerto 4200.
4. Verificacion visual fina de consola de navegador por pantalla/accion queda como paso manual QA UX (no se detectaron fallas en las validaciones API y rutas ejecutadas).

## Decision final

MVP estabilizado y apto para piloto interno controlado en el negocio, manteniendo compatibilidad Docker Compose y sin cambios de reglas de negocio.

## Addendum - Cierre final InkToy full-stack (2026-04-30)

### Comandos ejecutados

```powershell
cd frontend
npm run build
cd ..
docker compose up --build -d
docker compose ps
docker compose logs frontend --tail=150
docker compose logs backend --tail=150
```

Validaciones adicionales de cierre:

- Browser QA en `http://localhost:4200` (login/layout/logout/rutas/roles/SPA/smoke).
- Barrido de consola y red en rutas principales con sesion `ADMIN`.

### Resultado de cierre

- Build frontend: OK.
- Runtime Docker Compose: OK (`postgres` healthy, `backend` up, `frontend` up).
- Logs:
  - Frontend Nginx arranca normal, sin errores criticos.
  - Backend Spring Boot/Flyway/JPA inicia correctamente, sin fallas de migracion.
- Login/logout y ruta protegida: OK (logout redirige y `/dashboard` vuelve a `/login`).
- Matriz RBAC frontend por rol (`ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR`): OK.
- Rutas principales InkToy: OK (21 pantallas cargan correctamente).
- SPA refresh directo en rutas criticas: OK (documento `200`, sin `Cannot GET`).
- Smoke funcional minimo: OK (catalogo, inventario, compras, pos, caja, ventas, cotizaciones, facturacion, reportes, outbox).
- Outbox solo ADMIN: OK (visible para `ADMIN`, bloqueado para `CAJERO`).
- Consola/red en barrido final: sin `pageerror`, sin `500`, sin CORS, sin llamadas a `localhost:8080`, sin `fonts.googleapis.com`.

### Hallazgos

- No se detectaron hallazgos nuevos `CRITICAL` ni `HIGH` en el cierre final.
- Deudas `LOW` existentes permanecen en backlog sin incremento de riesgo.

### Decision de liberacion

Rediseño InkToy validado de forma integral y estable para piloto interno controlado.

## Addendum - Cierre UX-011 (deuda de proceso QA)

Fecha: 2026-05-04

### Causa UX-011

Riesgo de falsos positivos/falsos negativos en QA visual por validar shell o assets cacheados despues de rebuilds con Docker/Nginx o recargas parciales del navegador.

### Estado PWA/service worker

- No hay PWA activa en la configuracion actual.
- Evidencia de configuracion:
  - `frontend/angular.json` sin `serviceWorker`.
  - `frontend/src/main.ts` sin `provideServiceWorker`.
  - `frontend/package.json` sin `@angular/service-worker`.
  - Sin `ngsw-config.json` ni `manifest.webmanifest` en runtime de frontend.

### Decision y alcance aplicado

- UX-011 se cierra como deuda de proceso.
- Se formaliza protocolo anti-cache en `docs/qa/REGRESSION_CHECKLIST.md`.
- No se aplican cambios funcionales en backend/frontend, rutas, servicios, endpoints ni reglas de negocio.

### Deuda post-piloto recomendada (sin aplicar ahora)

- Evaluar ajuste minimo de cache-control en Nginx para `index.html` (por ejemplo `Cache-Control: no-store`) manteniendo cache agresiva para bundles con hash.

## Addendum - Validacion full-stack BT-001 (2026-05-04)

### Objetivo

Validar correccion backend BT-001 para garantizar **una sola caja OPEN por usuario** en condiciones reales de Docker/runtime, incluyendo API y UI.

### Resultado

- BT-001 validado end-to-end en entorno local Docker.
- Sin hallazgos CRITICAL/HIGH nuevos en el flujo evaluado.

### Evidencia principal

- Backend build:
  - `mvn clean test` y `mvn clean verify` => SUCCESS.
- Runtime:
  - `docker compose up --build -d` y `docker compose ps` => OK.
  - Backend recuperado tras corregir deriva de credenciales DB runtime (validadas desde env real del contenedor).
- DB/Flyway:
  - Migracion `V13__cash_register_open_unique.sql` aplicada en DB activa (`inktoy_name_local`).
  - Indice parcial unico `uq_cash_register_sessions_opened_by_user_open` presente.
- API BT-001:
  - Primera apertura por usuario => `201`.
  - Segunda apertura del mismo usuario => `409`.
  - Usuarios distintos con aperturas simultaneas => permitido (`201`).
  - Cierre y reapertura => correcto (`200`/`201`).
  - No se observaron `500` en la corrida principal BT-001.
- UI BT-001:
  - `/caja`: apertura, bloqueo visual de doble apertura, cierre y reapertura validados.
  - `/pos`: carga correcta con estado de caja y acciones base sin errores bloqueantes.

### Limites de la corrida BT-001

- Limite inicial resuelto en corrida controlada posterior (mismo dia): se crearon datos QA operativos por API y se ejecuto venta real con evidencia completa de no regresion.
- Evidencia de cierre controlado:
  - Producto QA: `#2` (`SKU-BT001-1777916163`) en almacen `#2` (`WH-01`).
  - Stock `5.000 -> 4.000` tras venta `#2` (`S-1777916164455`) `COMPLETED`.
  - Kardex con `SALE_OUT` (`id=4`, `referenceType=SALE`, `referenceId=2`).
  - Sin stock negativo global (`stock_balances.quantity < 0` => 0).
  - Restriccion BT-001 revalidada en la misma corrida (`409`, `200`, `201`, `409`).
  - Sin respuestas `500` en la corrida controlada.

## Addendum - Validacion full-stack BT-002 (2026-05-04)

### Objetivo

Validar en runtime real la correccion backend BT-002 para evitar doble conversion concurrente de una misma cotizacion y preservar consistencia de ventas/stock/kardex.

### Resultado

- BT-002 validado en runtime Docker con evidencia funcional y concurrente.
- Sin regresion en cotizaciones, caja, ventas ni cargas UI de `/pos` y `/ventas`.

### Evidencia principal

- Build/quality:
  - `mvn clean test` => SUCCESS (`120` tests, `0` fail/error).
  - `mvn clean verify` => SUCCESS.
- Runtime:
  - `docker compose up --build -d` y `docker compose ps` => OK.
  - `GET /api/v1/health` => `200`.
- Datos QA controlados:
  - Producto `#6` (`SKU-BT002-1777919357`).
  - Almacen `#2` (`WH-01`).
  - Stock seed `20.000` por ajuste `IN`.
- Conversion normal (`quote #5`):
  - `POST /quotes/5/convert-to-sale` => `200`.
  - Cotizacion `CONVERTED` con `convertedSaleId=4`.
  - Venta `#4` creada.
  - Stock `20.000 -> 19.000`.
  - Kardex `SALE_OUT` unico (`movementId=10`, `referenceId=4`).
- Doble conversion secuencial (`quote #5`):
  - Segundo `POST` => `409` (`Quote already converted`).
  - Sin `500`, sin segunda venta, stock sin cambio adicional (`19.000 -> 19.000`).
- Doble conversion concurrente (`quote #6`):
  - Dos requests paralelos => `200` y `409`.
  - Solo una conversion efectiva (`convertedSaleId=5`, venta `#5`).
  - Stock con descuento unico (`19.000 -> 18.000`).
  - Kardex con un solo `SALE_OUT` nuevo (delta `+1`, `movementId=11`, `referenceId=5`).
- Roles:
  - `ADMIN` convierte (`200`).
  - `CAJERO` convierte (`200`) y mantiene `GET /warehouses?active=true` en `200`.
  - `SUPERVISOR` convierte (`200`).
  - `ALMACENERO` bloqueado en cotizaciones/convert (`403`).

### Estabilidad

- Corrida final BT-002 sin respuestas `500`.
- Logs backend del tramo final de validacion sin excepciones inesperadas.
- Sin `pageerror` observado en smoke UI final.

### Nota operativa

Se observaron `500` en intentos previos de depuracion por payload JSON concurrente mal formado en el harness de prueba; fueron descartados tras corregir el mecanismo de requests paralelas y no corresponden a la correccion BT-002.

## Addendum - Validacion full-stack BT-003 (2026-05-04)

### Objetivo

Validar en runtime real la correccion backend BT-003 para garantizar **stock inicial unico por producto/almacen** en escenarios secuenciales y concurrentes, preservando consistencia de stock/kardex y sin regresion operativa.

### Resultado

- BT-003 validado en runtime Docker con evidencia secuencial y concurrente.
- Sin regresion en ajustes, transferencias, roles operativos y carga UI de `/pos` y `/ventas`.

### Evidencia principal

- Build/quality:
  - `mvn clean test` => SUCCESS (`122` tests, `0` fail/error).
  - `mvn clean verify` => SUCCESS (`122` tests).
- Runtime:
  - `docker compose up --build -d` y `docker compose ps` => OK.
  - `GET /api/v1/health` => `200`.
- Flyway/DB:
  - `flyway_schema_history` confirma version `14` aplicada (`success=true`, `inventory initial stock unique`).
  - Indice parcial unico presente: `uq_inventory_movements_initial_stock_product_warehouse`.
- Datos QA controlados:
  - Productos: `#23` (`SKU-BT003-A-1777937972`), `#24` (`SKU-BT003-B-1777937972`), `#25`, `#26`.
  - Almacenes: origen `#2` (`WH-01`), destino `#3` (`QABT16050`).
- Secuencial (`product #23`, `warehouse #2`):
  - Stock antes `0`.
  - Primer `POST /inventory/initial-stock` => `201`.
  - Segundo `POST` misma combinacion => `422` (mensaje controlado `Initial stock already registered for this product in the warehouse`).
  - Stock final `12.000` (sin duplicacion).
  - Kardex `INITIAL_STOCK`: `0 -> 1 -> 1`.
- Concurrente (`product #24`, `warehouse #2`):
  - Dos requests paralelos => `201` y `422`.
  - `successCount=1`, `status422Count=1`, `status500Count=0`.
  - Stock final `9.000` (una sola carga inicial efectiva).
  - Kardex `INITIAL_STOCK` final `1`.
- No regresion inventario:
  - Ajuste `IN` => `201`.
  - Ajuste `OUT` valido => `201`.
  - Transferencia valida => `201`.
  - Stock origen: `13.000` tras ajustes, `12.000` tras transferencia.
  - Stock destino tras transferencia: `1.000`.
  - Kardex transferencia: `TRANSFER_OUT=1`, `TRANSFER_IN=1`.
  - Stock negativo global: `0` filas.
- Roles:
  - `ADMIN` registra stock inicial (`201`).
  - `ALMACENERO` mantiene permisos (`initial-stock=201`, `adjustments=201`, `transfers=201`).
  - `CAJERO` bloqueado en stock inicial (`403`).
  - `SUPERVISOR` bloqueado en stock inicial (`403`).

### Estabilidad

- Sin respuestas `500` inesperadas en corrida BT-003.
- Logs backend de la ventana de prueba sin excepciones no controladas.
- UI smoke: `/pos` y `/ventas` cargan correctamente.

### Conclusión

BT-003 queda cerrado en runtime real con control de unicidad efectivo para `INITIAL_STOCK` (secuencial y concurrente), consistencia de inventario preservada y sin regresiones funcionales en operaciones criticas.

## Addendum - Estado consolidado pre-piloto (BT-010, 2026-05-05)

### Deudas cerradas

- BT-001: caja abierta unica por usuario.
- BT-002: conversion de cotizacion protegida contra concurrencia.
- BT-003: stock inicial unico por producto/almacen.
- BT-004: hardening de usuarios seed con control por entorno (Flyway hasta V15).
- BT-006 Fase 1: contratos paginados estables en `/api/v2` (`products`, `inventory/stocks`) sin romper `v1`.
- BT-007A/B: hardening de reportes (defaults de fechas, maximo de rango, limites por endpoint de lista).
- BT-008: CORS configurable por entorno.
- BT-009: suite minima de integracion HTTP/RBAC/DB real.

### Deudas diferidas activas

- BT-005: pendiente por planificacion funcional fuera de este cierre documental.
- BT-006 (migracion frontend a `v2`): pendiente, con compatibilidad temporal `v1` vigente.
- BT-007C (indices/tuning avanzado): diferido; evaluar con evidencia de carga real (`EXPLAIN ANALYZE`) post-piloto.

### Estado operativo documentado

- Stack Docker local: `frontend`, `backend`, `postgres`.
- CORS configurable por `CORS_ALLOWED_ORIGINS`.
- Migraciones Flyway validadas hasta `V15`.

Conclusión: con esta actualización documental, el drift menor BT-010 queda alineado con el estado real del proyecto.

