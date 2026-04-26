# ERP/POS - Estado Tecnico (Sprint 5 Full-Stack Cerrado)

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

### Pendiente (modulos posteriores)

- Cotizaciones NO implementado.
- Facturacion electronica NO implementada.
- Reportes NO implementados.
- Integracion con e-commerce NO implementada.

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

- Funcionales: `/login`, `/dashboard`, `/pos`, `/caja`, `/ventas`, `/ventas/:id`, `/ventas/:id/anular`, `/catalogo/productos`, `/catalogo/productos/nuevo`, `/catalogo/productos/:id/editar`, `/catalogo/categorias`, `/catalogo/unidades`, `/inventario/almacenes`, `/inventario/stock`, `/inventario/stock-inicial`, `/inventario/ajustes`, `/inventario/transferencias`, `/inventario/kardex`, `/compras/proveedores`, `/compras/ordenes`, `/compras/ordenes/nueva`, `/compras/ordenes/:id`, `/compras/ordenes/:id/editar`, `/compras/ordenes/:id/recibir`
- Pendientes de funcionalidad de negocio: `/cotizaciones`, `/facturacion`, `/reportes`, integracion e-commerce

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
