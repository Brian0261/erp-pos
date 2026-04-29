# Bug Report - MVP Final Validation

Fecha: 2026-04-28
Ambiente: Docker Compose local (frontend proxy Nginx, backend Spring Boot, postgres)

| ID          | Modulo                  | Severidad     | Descripcion                                                                                       | Estado                            | Archivo fix | Evidencia                                                                          |
| ----------- | ----------------------- | ------------- | ------------------------------------------------------------------------------------------------- | --------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| BUG-CRH-000 | Global                  | CRITICAL/HIGH | No se identificaron bugs CRITICAL/HIGH del producto en la corrida final full-stack.               | Cerrado                           | N/A         | Backend tests 109/109 OK, endpoints clave 200, flujos criticos ejecutados sin 500. |
| BUG-LOW-001 | Caja                    | LOW           | `GET /api/v1/cash-registers/current` devuelve 404 cuando no hay sesion abierta.                   | Pendiente (by design/documentado) | N/A         | Respuesta 404 previa a `POST /cash-registers/open`; luego 200 con sesion activa.   |
| BUG-LOW-002 | Backend logging         | LOW           | Warning por serializacion directa de `PageImpl` (estabilidad de JSON futura).                     | Pendiente                         | N/A         | Log backend: `PageModule$WarningLoggingModifier`.                                  |
| BUG-MED-003 | Frontend dependencias   | MEDIUM        | `npm audit` reporta 48 vulnerabilidades (6 low, 14 moderate, 28 high).                            | Pendiente                         | N/A         | Salida `npm install` en validacion final.                                          |
| BUG-LOW-004 | Operacion local Windows | LOW           | `localhost:4200` puede apuntar a `::1` y no al contenedor si existe proceso local en puerto 4200. | Pendiente (operativo)             | N/A         | Riesgo reproducido/documentado; validacion oficial ejecutada en `127.0.0.1:4200`.  |

## Evidencia de seguridad y permisos

- `GET /api/v1/auth/me` sin token => 401
- `GET /api/v1/auth/me` token invalido => 401
- Outbox (`/integrations/outbox-events`) solo ADMIN => 200 ADMIN, 403 CAJERO/ALMACENERO/SUPERVISOR
- Configuracion tributaria (`/billing/company-profile`) => 200 ADMIN, 403 no ADMIN
- `GET /api/v1/reports/sales` con SUPERVISOR => 200

## Evidencia de flujos criticos

- Venta creada (`201`) y anulada (`200`) con reposicion de stock confirmada.
- Cotizacion creada/enviada/convertida (`201/200/200`), doble conversion bloqueada (`409`).
- Facturacion desde venta: create (`201`), generate-xml (`200`), sign (`200`), send (`200`), estado final `ACCEPTED`.
- Outbox ADMIN: `retry` de evento FAILED => `200`.
