# ERP/POS - Estado Tecnico (Sprint 7 Full-Stack Cerrado)

Base tecnica del MVP para un ERP/POS de tienda fisica de articulos escolares.

## Stack

- Backend: Java 17 + Spring Boot 3.x
- Base de datos: PostgreSQL
- Migraciones: Flyway
- Frontend: Angular (standalone)
- Infra local: Docker Compose
- CI: GitHub Actions

## Estado por Sprint

### Sprint 1 (Cerrado)

- Auth JWT implementado.
- Login implementado.
- Roles y seguridad por rol implementados.
- Endpoint `GET /api/v1/auth/me` implementado.
- Docker Compose operativo para entorno local.
- Frontend Angular base implementado (login/dashboard/guard/interceptor).
- CI operativo con GitHub Actions.

### Sprint 2 (Cerrado)

- Catalogo backend completo: categorias, unidades y productos.
- Reglas de producto implementadas: SKU obligatorio y unico; barcode opcional y unico cuando existe.
- Catalogo frontend completo:
  - `/catalogo/productos`
  - `/catalogo/productos/nuevo`
  - `/catalogo/productos/:id/editar`
  - `/catalogo/categorias`
  - `/catalogo/unidades`

### Sprint 3 (Cerrado - Backend + Frontend)

- Inventario backend completo:
  - Almacenes.
  - Stock por producto y almacen.
  - Stock inicial.
  - Ajustes positivos y negativos.
  - Transferencias entre almacenes.
  - Kardex.
- Migraciones Flyway de inventario aplicadas: V5 y V6.
- Endpoints de inventario y almacenes validados en ejecucion real con Docker.
- Frontend de inventario implementado y validado:
  - `/inventario/almacenes`
  - `/inventario/stock`
  - `/inventario/stock-inicial`
  - `/inventario/ajustes`
  - `/inventario/transferencias`
  - `/inventario/kardex`
- Seguridad por roles validada para flujos de inventario.

### Sprint 4 (Cerrado - Full-Stack)

- Compras backend/frontend implementado:
  - Proveedores.
  - Ordenes de compra.
  - Creacion de ordenes en estado DRAFT.
  - Aprobacion de ordenes.
  - Recepcion parcial y total.
  - Cancelacion de ordenes.
- Integracion con inventario mediante movimiento `PURCHASE_IN`.
- Incremento de stock validado desde compras.
- Seguridad por roles validada en modulo de compras.
- UI de compras validada manualmente.
- Migracion Flyway aplicada: V8.
- Endpoints de compras validados con Docker y HTTP real.

### Sprint 5 (Cerrado - Full-Stack)

- Caja backend/frontend implementado:
  - Apertura de caja.
  - Cierre de caja.
- POS backend/frontend implementado:
  - Busqueda de productos por SKU, barcode y nombre.
  - Carrito de venta.
  - Registro de pagos.
  - Calculo de vuelto.
- Ventas backend/frontend implementado:
  - Registro de ventas.
  - Listado y detalle de ventas.
  - Anulacion de venta.
- Integracion con inventario validada:
  - Descuento de stock mediante `SALE_OUT`.
  - Reposicion de stock por anulacion mediante `SALE_VOID_IN`.
  - Validacion de stock y kardex.

### Sprint 6 (Cerrado - Full-Stack)

- Cotizaciones backend/frontend implementado:
  - Creacion, listado, detalle y edicion de cotizaciones.
  - Envio y cancelacion de cotizaciones.
  - Conversion de cotizacion a venta con validaciones de negocio.
  - Historial de estados por cotizacion.
- Seguridad por roles validada en modulo de cotizaciones.
- Integracion validada con ventas, caja e inventario:
  - Conversion exitosa genera venta y movimiento `SALE_OUT`.
  - Conversiones invalidadas no alteran estado ni stock.

### Sprint 7 (Cerrado - Full-Stack)

- Facturacion electronica backend/frontend implementado:
  - Configuracion tributaria por ambiente (`LOCAL`, `BETA`, `PROD`).
  - Series y correlativos para boleta/factura.
  - Emision de comprobantes desde ventas completadas.
  - Detalle de comprobante con acciones de generar XML, firmar y enviar a mock/sandbox.
  - Historial de estados del comprobante.
- Seguridad por roles validada en facturacion:
  - Sin token: `401`.
  - `ALMACENERO`: `403` en endpoints de facturacion.
  - `CAJERO`: puede emitir; no puede firmar ni administrar configuracion/series.
  - `SUPERVISOR`: puede consultar y enviar mock/sandbox.
- Integracion validada con ventas:
  - Rechazo de emision duplicada por venta (`409`).
  - Rechazo de factura sin datos de cliente (`422`).
  - Rechazo de emision para venta anulada (`422`).
  - Flujo exitoso `DRAFT -> GENERATED -> SIGNED -> SENT -> ACCEPTED`.

### Pendiente (post-MVP)

- Integracion con e-commerce real NO implementada.
- Integracion real con RabbitMQ/SQS NO implementada (se mantiene outbox con publisher mock).
- Integracion productiva con SUNAT/OSE/PSE NO implementada (se mantiene adapter mock/sandbox).
- Reportes avanzados NO implementados (se cubre set MVP de Sprint 8).

## Levantar proyecto local

1. Copiar variables de entorno:

```powershell
Copy-Item .env.example .env
```

2. Levantar PostgreSQL (y backend opcional):

```powershell
docker compose up -d postgres
# o todo
docker compose up -d
```

## Backend

Ruta: `backend`

```powershell
Push-Location .\backend
.\mvnw.cmd clean test
.\mvnw.cmd clean verify
.\mvnw.cmd spring-boot:run
Pop-Location
```

Credenciales seed inicial:

- username: `admin`
- email: `admin@erp.local`
- password: `Admin123!`

> Seguridad BT-004: estas credenciales son de bootstrap para entorno local/QA. No deben considerarse credenciales seguras de piloto/produccion.

Credenciales seed local/dev para pruebas de autorizacion (403 por rol):

- CAJERO
  - username: `cajero`
  - email: `cajero@erp.local`
  - password: `Admin123*`
- ALMACENERO
  - username: `almacenero`
  - email: `almacenero@erp.local`
  - password: `Admin123*`
- SUPERVISOR
  - username: `supervisor`
  - email: `supervisor@erp.local`
  - password: `Admin123*`

## Politica CORS configurable (BT-008)

- El backend no usa origen hardcodeado; toma orígenes permitidos desde `CORS_ALLOWED_ORIGINS`.
- Propiedad interna: `app.security.cors.allowed-origins`.
- Default local seguro: `http://localhost:4200,http://127.0.0.1:4200`.
- Se mantienen credenciales JWT por header `Authorization` (sin abrir wildcard `*`).

Ejemplos:

- Local:
  - `CORS_ALLOWED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200`
- LAN piloto local:
  - `CORS_ALLOWED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200,http://192.168.1.50:4200,http://EQUIPO-QA:4200`

## Politica de hardening de usuarios seed (BT-004)

- Migraciones historicas `V2` y `V7` no se modifican para no romper checksums de Flyway.
- Se agrega `V15__security_seed_users_hardening.sql` para endurecer cuentas seed en entornos no locales.
- Control por variables de entorno:
  - `HARDEN_DEFAULT_SEED_USERS=false` (default): mantiene activos `cajero`, `almacenero`, `supervisor`.
  - `HARDEN_DEFAULT_SEED_USERS=true`: desactiva esos usuarios seed.
  - `HARDEN_DEFAULT_SEED_USERS_INCLUDE_ADMIN=true`: adicionalmente desactiva `admin` seed.
- Recomendacion de uso:
  - Local/QA: mantener ambos flags en `false`.
  - Piloto/Stage/Produccion: usar `HARDEN_DEFAULT_SEED_USERS=true`; evaluar `...INCLUDE_ADMIN=true` segun estrategia operativa.
- Nota importante: `V15` se ejecuta una sola vez por base de datos. Definir flags antes del primer arranque del entorno objetivo.
- Para entornos ya provisionados, usar script manual: `docs/deployment/HARDEN_SEED_USERS.sql`.

Endpoints actuales:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/categories`
- `GET /api/v1/categories`
- `POST /api/v1/units`
- `GET /api/v1/units`
- `POST /api/v1/products`
- `GET /api/v1/products`
- `GET /api/v1/products/{id}`
- `PUT /api/v1/products/{id}`
- `DELETE /api/v1/products/{id}`
- `GET /api/v1/products/search?q=`
- `POST /api/v1/warehouses`
- `GET /api/v1/warehouses`
- `GET /api/v1/warehouses/{id}`
- `DELETE /api/v1/warehouses/{id}`
- `GET /api/v1/inventory/stocks`
- `POST /api/v1/inventory/initial-stock`
- `POST /api/v1/inventory/adjustments`
- `POST /api/v1/inventory/transfers`
- `GET /api/v1/inventory/kardex`
- `POST /api/v1/suppliers`
- `GET /api/v1/suppliers`
- `GET /api/v1/suppliers/{id}`
- `PUT /api/v1/suppliers/{id}`
- `DELETE /api/v1/suppliers/{id}`
- `POST /api/v1/purchase-orders`
- `GET /api/v1/purchase-orders`
- `GET /api/v1/purchase-orders/{id}`
- `PUT /api/v1/purchase-orders/{id}`
- `POST /api/v1/purchase-orders/{id}/approve`
- `POST /api/v1/purchase-orders/{id}/receive`
- `POST /api/v1/purchase-orders/{id}/cancel`
- `POST /api/v1/cash-registers/open`
- `GET /api/v1/cash-registers/current`
- `GET /api/v1/cash-registers/{id}`
- `POST /api/v1/cash-registers/{id}/close`
- `GET /api/v1/pos/products/lookup?code=&warehouseId=`
- `GET /api/v1/pos/products/search?q=&warehouseId=`
- `POST /api/v1/sales`
- `GET /api/v1/sales`
- `GET /api/v1/sales/{id}`
- `POST /api/v1/sales/{id}/void`
- `POST /api/v1/quotes`
- `GET /api/v1/quotes`
- `GET /api/v1/quotes/{id}`
- `PUT /api/v1/quotes/{id}`
- `POST /api/v1/quotes/{id}/send`
- `POST /api/v1/quotes/{id}/cancel`
- `POST /api/v1/quotes/{id}/convert-to-sale`
- `GET /api/v1/quotes/{id}/history`
- `POST /api/v1/billing/company-profile`
- `GET /api/v1/billing/company-profile?environment=`
- `PUT /api/v1/billing/company-profile`
- `POST /api/v1/billing/series`
- `GET /api/v1/billing/series`
- `GET /api/v1/billing/series/{id}`
- `PUT /api/v1/billing/series/{id}`
- `DELETE /api/v1/billing/series/{id}`
- `POST /api/v1/billing/documents/from-sale/{saleId}`
- `GET /api/v1/billing/documents`
- `GET /api/v1/billing/documents/{id}`
- `POST /api/v1/billing/documents/{id}/generate-xml`
- `POST /api/v1/billing/documents/{id}/sign`
- `POST /api/v1/billing/documents/{id}/send`
- `GET /api/v1/billing/documents/{id}/history`

## Frontend

Ruta: `frontend`

```powershell
Push-Location .\frontend
npm install
npm run build
npm start
Pop-Location
```

Rutas:

- Funcionales: `/login`, `/dashboard`, `/pos`, `/caja`, `/ventas`, `/ventas/:id`, `/ventas/:id/anular`, `/catalogo/productos`, `/catalogo/productos/nuevo`, `/catalogo/productos/:id/editar`, `/catalogo/categorias`, `/catalogo/unidades`, `/inventario/almacenes`, `/inventario/stock`, `/inventario/stock-inicial`, `/inventario/ajustes`, `/inventario/transferencias`, `/inventario/kardex`, `/compras/proveedores`, `/compras/ordenes`, `/compras/ordenes/nueva`, `/compras/ordenes/:id`, `/compras/ordenes/:id/editar`, `/compras/ordenes/:id/recibir`, `/cotizaciones`, `/cotizaciones/nueva`, `/cotizaciones/:id`, `/cotizaciones/:id/editar`, `/cotizaciones/:id/convertir`
- Funcionales de facturacion: `/facturacion/configuracion`, `/facturacion/series`, `/facturacion/comprobantes`, `/facturacion/comprobantes/:id`, `/facturacion/emitir/:saleId`
- Funcionales de reportes: `/reportes`, `/reportes/ventas`, `/reportes/caja`, `/reportes/stock-bajo`, `/reportes/movimientos-inventario`, `/reportes/compras`, `/reportes/productos-mas-vendidos`, `/reportes/cotizaciones`, `/reportes/comprobantes`
- Funcionales de integraciones (outbox): `/integraciones/eventos`, `/integraciones/eventos/:id`
- Pendientes de funcionalidad de negocio: integracion e-commerce real

## Docker

```powershell
docker compose config
docker compose up -d
```

## CI

Workflow: `.github/workflows/ci.yml`

- Job backend: `mvn clean verify`
- Job frontend: `npm install` + `npm run build`

## ADR

- `docs/adr/ADR-0001-monolito-modular-hexagonal.md`
- `docs/adr/ADR-0002-facturacion-electronica-mvp.md`
- `docs/adr/ADR-0003-outbox-eventos-ecommerce-futuro.md`
