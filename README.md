# ERP/POS - MVP Sprint 1

Base tecnica del MVP para un ERP/POS de tienda fisica de articulos escolares.

## Stack
- Backend: Java 17 + Spring Boot 3.x
- Base de datos: PostgreSQL
- Migraciones: Flyway
- Frontend: Angular (standalone)
- Infra local: Docker Compose
- CI: GitHub Actions

## Alcance Sprint 1
Implementado:
- Estructura base con monolito modular hexagonal.
- Modulos funcionales: `shared` y `security`.
- Seguridad JWT + login + endpoint `/me`.
- Roles iniciales: `ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR`.
- Migraciones iniciales y seed de admin.
- Frontend base con login/dashboard, guard e interceptor.
- CI para compilar backend y frontend.
- ADR arquitectonico inicial.

No implementado aun (Sprint 2+): catalogo, inventario, POS, compras, cotizaciones, facturacion electronica.

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

Endpoints Sprint 1:
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

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
- Funcionales: `/login`, `/dashboard`
- Preparadas: `/pos`, `/catalogo`, `/inventario`, `/cotizaciones`, `/facturacion`, `/reportes`

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

