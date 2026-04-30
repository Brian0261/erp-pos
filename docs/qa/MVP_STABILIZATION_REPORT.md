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
2. Warning backend de serializacion `PageImpl` en logs (recomendacion de estabilidad de contrato JSON).
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
