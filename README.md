# ERP/POS - MVP Sprint 2

Base tecnica del MVP para un ERP/POS de tienda fisica de articulos escolares.

## Stack

- Backend: Java 17 + Spring Boot 3.x
- Base de datos: PostgreSQL
- Migraciones: Flyway
- Frontend: Angular (standalone)
- Infra local: Docker Compose
- CI: GitHub Actions

## Alcance Sprint 2

Implementado:

- Estructura base con monolito modular hexagonal.
- Seguridad JWT + login + endpoint `/me`.
- Roles iniciales: `ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR`.
- Migraciones Flyway V1-V4 (seguridad + catalogo y data inicial).
- Modulo Catalogo backend:
  - Categorias (`POST/GET /api/v1/categories`)
  - Unidades (`POST/GET /api/v1/units`)
  - Productos (`POST/GET/PUT/DELETE /api/v1/products`, `GET /api/v1/products/{id}`, `GET /api/v1/products/search?q=`)
  - SKU obligatorio y unico.
  - Barcode opcional y unico cuando existe.
  - Desactivacion logica de productos.
- Modulo Catalogo frontend:
  - `/catalogo/productos`
  - `/catalogo/productos/nuevo`
  - `/catalogo/productos/:id/editar`
  - `/catalogo/categorias`
  - `/catalogo/unidades`
- Frontend base con login/dashboard, guard e interceptor JWT.
- CI para compilar backend y frontend.
- ADR arquitectonico inicial.

No implementado aun (Sprint 3+): inventario, POS, compras, cotizaciones, facturacion electronica y reportes funcionales.

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

- Funcionales: `/login`, `/dashboard`, `/catalogo/productos`, `/catalogo/productos/nuevo`, `/catalogo/productos/:id/editar`, `/catalogo/categorias`, `/catalogo/unidades`
- Preparadas (sin funcionalidad de negocio completa): `/pos`, `/inventario`, `/cotizaciones`, `/facturacion`, `/reportes`

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
