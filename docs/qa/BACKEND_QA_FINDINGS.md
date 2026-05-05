# Backend QA Findings - Auditoria MVP

Fecha de auditoria: 2026-04-28
Scope: backend Spring Boot + Docker local + Flyway + RBAC + endpoints API

## Resumen ejecutivo

- CRITICAL: 0
- HIGH: 0
- MEDIUM: 3
- LOW: 2
- Estado general: **Backend estable para auditoria frontend**

## Hallazgos

| ID     | Modulo               | Severidad | Descripcion                                                                                                                             | Causa                                                                                   | Archivo afectado                                                                                                                                                                           | Accion tomada                                                                                             | Estado   | Commit sugerido                                                   |
| ------ | -------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| QA-001 | build/tests          | CRITICAL  | No se detectaron fallos en build ni tests.                                                                                              | N/A                                                                                     | N/A                                                                                                                                                                                        | Ejecutado `mvn clean test` y `mvn clean verify`, ambos SUCCESS.                                           | Cerrado  | N/A                                                               |
| QA-002 | docker/startup       | CRITICAL  | No se detectaron fallos de arranque ni Flyway roto.                                                                                     | N/A                                                                                     | N/A                                                                                                                                                                                        | Ejecutado `docker compose up --build -d` + logs backend sin errores bloqueantes.                          | Cerrado  | N/A                                                               |
| QA-003 | security/RBAC        | HIGH      | No se detectaron rutas criticas con permisos incorrectos en muestra runtime.                                                            | N/A                                                                                     | N/A                                                                                                                                                                                        | Validacion manual: 401 sin token, 403 por rol (CAJERO/ALMACENERO), 200 con ADMIN.                         | Cerrado  | N/A                                                               |
| QA-004 | reports              | MEDIUM    | Endpoints de reportes son lista agregada (sin paginacion) para datasets potencialmente grandes.                                         | Decisiones MVP de simplicidad y menor complejidad de UI inicial.                        | `backend/src/main/java/com/erppos/backend/erp/reports/adapter/rest/ReportsController.java`                                                                                                 | No se modifica por no ser bloqueante de piloto. Documentado como deuda tecnica.                           | Abierto  | `chore(reports): add pagination for high-volume report endpoints` |
| QA-005 | CORS/hardening       | MEDIUM    | CORS originalmente restringido a `http://localhost:4200`; requeria parametrizacion por ambiente para piloto/staging/LAN local.          | Configuracion unica hardcodeada en seguridad backend.                                    | `backend/src/main/java/com/erppos/backend/erp/security/adapter/security/SecurityConfig.java`, `backend/src/main/resources/application.yaml`                                                 | Se externaliza a `app.security.cors.allowed-origins` via `CORS_ALLOWED_ORIGINS` con default local seguro. | Cerrado  | `chore(security): externalize allowed CORS origins by environment` |
| QA-006 | observability        | LOW       | Logging y healthcheck son basicos; no hay trazas estructuradas por modulo ni metricas operativas.                                       | Alcance MVP priorizo funcionalidad sobre observabilidad avanzada.                       | `backend/src/main/java/com/erppos/backend/erp/shared/adapter/rest/HealthController.java`                                                                                                   | Sin cambios funcionales. Documentado para hardening post-MVP.                                             | Abierto  | `chore(obs): add structured logs and module-level metrics`        |
| QA-007 | contracts            | LOW       | Mezcla intencional de endpoints paginados y listas simples; requiere guia de consumo para frontend nuevo.                               | Contratos definidos por sprint de manera incremental.                                   | `docs/qa/MATRIX_API_ENDPOINTS.md`                                                                                                                                                          | Matriz de contratos actualizada para evitar ambiguedad de consumo.                                        | Mitigado | `docs(qa): clarify pagination contracts per endpoint`             |
| QA-008 | contracts/pagination | MEDIUM    | Spring Data registra warning por serializacion directa de `PageImpl`; estructura JSON puede cambiar entre versiones y afectar frontend. | Uso directo de `Page<T>` en respuestas REST sin `PagedModel`/DTO de paginacion estable. | `backend/src/main/java/com/erppos/backend/erp/catalog/adapter/rest/ProductController.java`, `backend/src/main/java/com/erppos/backend/erp/inventory/adapter/rest/InventoryController.java` | No se cambia en esta estabilizacion para no romper contratos MVP; se documenta deuda tecnica prioritaria. | Abierto  | `refactor(api): wrap paginated responses in stable dto`           |

## Hallazgos cerrados historicos relevantes (verificados)

- Conflicto de beans `auditUserProvider` entre modulos: resuelto con nombres explicitos por modulo.
- Error SQL de filtros con parametros nulos en listados de facturacion: resuelto en repositorio/adapter de billing.
- Conversion de cotizacion con estados invalidos devolviendo 500: mapeado a 409/422 en manejo de negocio.

## Decision de estabilizacion

- Se corrigen solo CRITICAL/HIGH. En esta auditoria no hubo defectos abiertos de ese nivel.
- MEDIUM/LOW quedan como deuda tecnica planificada para post-MVP sin afectar piloto.

## Addendum - Validacion BT-001 caja abierta unica por usuario (2026-05-04)

### Resultado

- Estado: **Validado en runtime** (backend + frontend + Docker Compose).
- Regla BT-001 confirmada con doble proteccion:
  - Aplicacion: validacion previa y traduccion a `SalesConflictException`.
  - Base de datos: indice parcial unico Flyway V13 (`uq_cash_register_sessions_opened_by_user_open`).

### Evidencia tecnica

- Build backend:
  - `mvn clean test` => SUCCESS (119 tests, 0 fail/error).
  - `mvn clean verify` => SUCCESS.
- Runtime:
  - `docker compose up --build -d` y `docker compose ps` OK.
  - Backend restaurado y estable tras alinear credenciales reales del contenedor con PostgreSQL.
- Migraciones:
  - `flyway_schema_history` en DB activa (`inktoy_name_local`) incluye version `13` con `success=true`.
  - Indice parcial unico de BT-001 presente y operativo.
- API BT-001:
  - `POST /api/v1/cash-registers/open` primera apertura por usuario => `201`.
  - Segunda apertura del mismo usuario => `409` con mensaje de conflicto.
  - Usuarios distintos pueden abrir caja en paralelo => `201` por usuario.
  - Cierre y reapertura posterior => `200`/`201`.
  - Sin respuestas `500` en la corrida principal BT-001.
- UI BT-001:
  - `/caja` muestra estado OPEN, deshabilita boton de segunda apertura y permite cierre/reapertura.
  - `/pos` carga correctamente con estado de caja abierta y flujo base sin errores bloqueantes.

### Hallazgos y limites de esta corrida

- No se pudo ejecutar venta real + validacion de stock/kardex en esta corrida BT-001 por falta de productos seed en el ambiente (`/products` y `/pos/products/search` devuelven vacio).
- Se observaron eventos 404 no bloqueantes en consola del frontend en navegacion puntual; no afectaron la validacion funcional BT-001.

### Cierre de limite pendiente (corrida controlada)

- Fecha: 2026-05-04 (corrida controlada posterior, solo datos operativos via API existente).
- Health backend: `GET /api/v1/health` => `200`.
- Datos de prueba usados:
  - Categoria: `#6` `QA BT001 Category` (existente).
  - Unidad: `#5` `QABT001` (existente).
  - Producto creado: `#2` `SKU-BT001-1777916163` (`Producto QA BT001 1777916163`, `salePrice=25`).
  - Almacen usado: `#2` `WH-01 - Almacen Principal` (existente).
  - Seed de stock: ajuste positivo `IN` para el producto en almacen QA.
- Evidencia no-regresion POS/Venta/Stock/Kardex:
  - Stock antes de venta: `5.000`.
  - Venta creada: `#2` (`S-1777916164455`) con estado `COMPLETED` y pago `CASH` completo.
  - Stock despues de venta: `4.000`.
  - Delta stock: `-1.000` (esperado).
  - Kardex: movimiento `SALE_OUT` confirmado (`id=4`, `referenceType=SALE`, `referenceId=2`, `reason=Sale S-1777916164455`).
  - Stock negativo global: `0` filas (`stock_balances.quantity < 0`).
  - Errores `500` en corrida controlada: no detectados.
- Revalidacion restriccion BT-001 en misma corrida:
  - Segunda apertura mismo usuario: `409` (`El usuario ya tiene una caja abierta.`).
  - Cierre de caja: `200`.
  - Reapertura: `201`.
  - Segundo intento tras reapertura: `409`.

Conclusión: BT-001 queda cerrado al **100%** incluyendo la evidencia faltante de no regresión en venta/stock/kardex con datos controlados.

## Addendum - Validacion BT-002 doble conversion concurrente de cotizacion (2026-05-04)

### Resultado

- Estado: **Validado en runtime real** (Maven + Docker + API + smoke UI).
- Correccion BT-002 confirmada en comportamiento observable:
  - conversion normal funciona.
  - segundo intento secuencial retorna `409` (sin `500`).
  - doble intento concurrente retorna `200`/`409` (solo una conversion efectiva).

### Evidencia tecnica (corrida controlada)

- Build/quality:
  - `mvn clean test` => SUCCESS (`120` tests, `0` fail/error).
  - `mvn clean verify` => SUCCESS.
- Runtime:
  - `docker compose up --build -d` y `docker compose ps` OK.
  - Health backend: `GET /api/v1/health` => `200`.
- Datos QA usados:
  - Producto: `#6` (`SKU-BT002-1777919357`, `Producto QA BT002 1777919357`).
  - Almacen: `#2` (`WH-01 - Almacen Principal`).
  - Seed stock inicial: `20` unidades (ajuste `IN`).

### Conversion normal (cotizacion `#5`)

- `POST /api/v1/quotes/5/convert-to-sale` => `200`.
- Estado cotizacion final: `CONVERTED`.
- `convertedSaleId`: `4` (no nulo).
- Venta generada: `#4`.
- Stock: `20.000 -> 19.000`.
- Kardex: `SALE_OUT` unico para la venta (`movementId=10`, `referenceId=4`).

### Doble conversion secuencial (misma cotizacion `#5`)

- Segundo `POST /api/v1/quotes/5/convert-to-sale` => `409` (`Quote already converted`).
- Sin `500` en el intento secuencial.
- `convertedSaleId` se mantiene en `4`.
- Stock no vuelve a descontarse: `19.000 -> 19.000`.

### Doble conversion concurrente (cotizacion `#6`)

- Dos requests paralelos a `POST /api/v1/quotes/6/convert-to-sale`.
- Resultado observado: `200` y `409`.
- `successCount=1`, `conflictCount=1`.
- Cotizacion final: `CONVERTED` con `convertedSaleId=5` (unico).
- Venta efectiva unica: `#5`.
- Stock: `19.000 -> 18.000` (descuento unico).
- Kardex: solo un `SALE_OUT` nuevo para esta conversion (`movementId=11`, `referenceId=5`, delta `+1`).

### Roles y regresion funcional

- `CAJERO`: puede convertir (`200`) y `GET /api/v1/warehouses?active=true` permanece `200`.
- `ADMIN`: conversion OK (`200`).
- `SUPERVISOR`: conversion OK (`200`).
- `ALMACENERO`: bloqueado en cotizaciones y conversion (`403`).
- Smoke UI final:
  - `/pos` carga correctamente.
  - `/ventas` carga correctamente sin `pageerror` observado.

### Observaciones de estabilidad

- No se detectaron respuestas `500` en la corrida final de BT-002.
- Logs backend del tramo final de validacion: sin excepciones inesperadas.
- Se registraron `500` previos en intentos de depuracion por payload JSON mal formado en harness de prueba; no corresponden a la correccion BT-002 y quedaron descartados al rerun validado.

Conclusión: BT-002 queda **cerrado en runtime real** con evidencia de bloqueo efectivo ante doble conversion concurrente y sin regresion operativa en cotizaciones/caja/ventas.

## Addendum - Validacion BT-003 stock inicial unico por producto/almacen (2026-05-04)

### Resultado

- Estado: **Validado en runtime real** (Maven + Docker + API + smoke UI).
- Correccion BT-003 confirmada en comportamiento observable:
  - primera carga de stock inicial permite registro (`201`).
  - segundo intento secuencial sobre misma combinacion responde `422` controlado.
  - doble intento concurrente responde `201/422` con una sola carga inicial efectiva.

### Evidencia tecnica (corrida controlada)

- Build/quality:
  - `mvn clean test` => SUCCESS (`122` tests, `0` fail/error).
  - `mvn clean verify` => SUCCESS (`122` tests).
- Runtime:
  - `docker compose up --build -d` y `docker compose ps` OK.
  - `GET /api/v1/health` => `200`.
- Flyway/DB:
  - `flyway_schema_history`: version `14`, `success=true`, `description=inventory initial stock unique`.
  - Indice parcial unico presente:
    - `uq_inventory_movements_initial_stock_product_warehouse`
    - `CREATE UNIQUE INDEX ... ON inventory_movements(product_id, warehouse_id) WHERE movement_type = 'INITIAL_STOCK'`.

### Datos QA usados

- Producto secuencial: `#23` (`SKU-BT003-A-1777937972`).
- Producto concurrencia: `#24` (`SKU-BT003-B-1777937972`).
- Producto rol ALMACENERO: `#25` (`SKU-BT003-C-1777937972`).
- Producto roles no permitidos: `#26` (`SKU-BT003-D-1777937972`).
- Almacen origen: `#2` (`WH-01`).
- Almacen destino transferencia: `#3` (`QABT16050`).

### Stock inicial secuencial (producto `#23`, almacen `#2`)

- Stock antes: `0`.
- Primer `POST /api/v1/inventory/initial-stock` => `201`.
- Segundo `POST` misma combinacion => `422`.
- Payload de error controlado (`422`):
  - `message`: `Initial stock already registered for this product in the warehouse`.
  - Sin `500`.
- Stock despues primer intento: `12.000`.
- Stock despues segundo intento: `12.000` (sin duplicacion).
- Kardex `INITIAL_STOCK`:
  - antes: `0`.
  - despues primer intento: `1`.
  - despues segundo intento: `1` (sin duplicacion).

### Stock inicial concurrente (producto `#24`, almacen `#2`)

- Stock antes: `0`.
- Dos requests paralelos a `/inventory/initial-stock`.
- Resultado observado: `201` y `422`.
- `successCount=1`, `status422Count=1`, `status500Count=0`.
- Stock final: `9.000` (una sola carga inicial aplicada).
- Kardex `INITIAL_STOCK` final: `1` (sin duplicacion).

### No regresion inventario

- Ajuste positivo (`IN`) => `201`.
- Ajuste negativo valido (`OUT`) => `201`.
- Transferencia valida => `201`.
- Consistencia de stock/kardex en corrida:
  - Stock origen tras ajustes: `13.000`.
  - Stock origen tras transferencia: `12.000`.
  - Stock destino tras transferencia: `1.000`.
  - Kardex transferencia: `TRANSFER_OUT=1`, `TRANSFER_IN=1`.
- Stock negativo global: `0` filas (`stock_balances.quantity < 0`).

### Roles y estabilidad

- `ADMIN`: puede registrar stock inicial (`201`).
- `ALMACENERO`: mantiene permisos operativos (`initial-stock=201`, `adjustment=201`, `transfer=201`).
- `CAJERO`: bloqueado en `initial-stock` (`403`).
- `SUPERVISOR`: bloqueado en `initial-stock` (`403`).
- UI smoke final:
  - `/pos` carga correctamente.
  - `/ventas` carga correctamente.
- Logs backend (ventana de validacion): sin `500` inesperados ni excepciones no controladas; solo warning informativo de configuracion de autenticacion en arranque.

Conclusión: BT-003 queda **cerrado en runtime real** con garantia de unicidad de stock inicial por producto/almacen en secuencial y concurrente, sin duplicacion de stock/kardex y sin regresiones operativas.

## Addendum - Validacion BT-004 hardening de usuarios seed Flyway (2026-05-04)

### Resultado

- Estado: **Mitigado con control por entorno** sin cambios destructivos.
- Se mantiene compatibilidad local/QA por defecto.
- Se evita modificar migraciones historicas (`V2`, `V7`) para no romper checksums Flyway.

### Riesgo identificado

- `V2__seed_initial_admin.sql` y `V7__seed_dev_users_non_admin.sql` crean usuarios con credenciales conocidas.
- Si se usan las mismas migraciones sin hardening en piloto/stage/prod, existe riesgo de acceso no autorizado por credenciales predecibles.

### Accion tecnica aplicada

- Nueva migracion `V15__security_seed_users_hardening.sql`:
  - Desactiva (`active=false`) usuarios seed no-admin cuando `HARDEN_DEFAULT_SEED_USERS=true`.
  - Opcionalmente desactiva admin seed cuando `HARDEN_DEFAULT_SEED_USERS_INCLUDE_ADMIN=true`.
- `application.yaml` configurado con placeholders Flyway para flags de hardening.
- `.env.example`, `docker-compose.yml` y `README.md` actualizados con politica operativa BT-004.

### Decision operativa

- Local/QA: conservar usuarios seed (`false/false`).
- Piloto/Stage/Produccion: habilitar hardening (`HARDEN_DEFAULT_SEED_USERS=true`) y evaluar include admin.

### Evidencia runtime real (Docker local, 2026-05-04)

- Build backend:
  - `mvn clean test` => SUCCESS (`122` tests, `0` fallos, `0` errores).
  - `mvn clean verify` => SUCCESS (`122` tests, `0` fallos, `0` errores).
- Compose:
  - `docker compose config` valido con:
    - `HARDEN_DEFAULT_SEED_USERS: "false"`
    - `HARDEN_DEFAULT_SEED_USERS_INCLUDE_ADMIN: "false"`
  - `docker compose up --build -d` => `backend`, `frontend` y `postgres` en `Up` (`postgres` healthy).
- Flyway (DB runtime):
  - `V2` (`seed initial admin`) `success=true`, checksum `1142349541`.
  - `V7` (`seed dev users non admin`) `success=true`, checksum `-2080335429`.
  - `V15` (`security seed users hardening`) `success=true`, checksum `-105804012`.
  - Logs backend: `Successfully validated 15 migrations` y `Successfully applied 1 migration ... now at version v15`.
  - Sin evidencia de ruptura de checksums previos.
- Modo local por defecto:
  - Flags efectivas en runtime: `false/false`.
  - Usuarios seed activos en DB: `admin`, `cajero`, `almacenero`, `supervisor` con `active=true`.
- Login y `/auth/me` por rol:
  - `admin@erp.local` / `Admin123!` => login `200`, token emitido, `/auth/me` `200`, `roles=["ADMIN"]`.
  - `cajero@erp.local` / `Admin123*` => login `200`, token emitido, `/auth/me` `200`, `roles=["CAJERO"]`.
  - `almacenero@erp.local` / `Admin123*` => login `200`, token emitido, `/auth/me` `200`, `roles=["ALMACENERO"]`.
  - `supervisor@erp.local` / `Admin123*` => login `200`, token emitido, `/auth/me` `200`, `roles=["SUPERVISOR"]`.
- RBAC rapido (API):
  - `CAJERO`: `GET /quotes=200`, `GET /cash-registers/current=200`, `GET /pos/products/search=200`.
  - `ALMACENERO`: `GET /quotes=403` (bloqueo mantenido).
  - `ADMIN`: `GET /quotes=200`, `GET /cash-registers/current=200`, `GET /billing/series=200`.
  - `SUPERVISOR`: `GET /quotes=200`, `GET /cash-registers/current=200`, `GET /pos/products/search=200`.
- Script externo:
  - `docs/deployment/HARDEN_SEED_USERS.sql` confirmado fuera de `db/migration`.
  - No se ejecuta automaticamente por Flyway en local (no aparece en `flyway_schema_history`).
  - Uso documentado en `README.md`.
- Logs:
  - Sin `500` inesperados.
  - Sin errores Flyway/JWT/login en la ventana de validacion.
  - Solo warning informativo conocido de Spring Security en arranque.

Conclusión: BT-004 queda **cerrado para MVP/piloto** como control de despliegue seguro, sin romper entorno local actual ni los usuarios de QA.

## Addendum - Validacion BT-008 CORS configurable por entorno (2026-05-04)

### Resultado

- Estado: **Cerrado** con cambio minimo y seguro en backend.
- Se elimina hardcode de origen unico y se mantiene compatibilidad local.

### Accion tecnica aplicada

- `SecurityConfig` ahora lee `app.security.cors.allowed-origins`.
- Variable de entorno expuesta: `CORS_ALLOWED_ORIGINS`.
- Default local: `http://localhost:4200,http://127.0.0.1:4200`.
- Metodos permitidos: `GET, POST, PUT, DELETE, OPTIONS`.
- Headers permitidos: `Authorization, Content-Type, Accept, Origin, X-Trace-Id`.
- `allowCredentials=false` (sin cookies; JWT por header).

### Evidencia solicitada

- Configuracion actualizada en `application.yaml`, `.env.example`, `docker-compose.yml`, `README.md` y checklist QA.
- Build/test y compose deben ejecutarse en corrida BT-008 para confirmar runtime y preflight.

