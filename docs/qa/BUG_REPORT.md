# Bug Report - MVP Final Validation

Fecha: 2026-04-28
Ambiente: Docker Compose local (frontend proxy Nginx, backend Spring Boot, postgres)

| ID          | Modulo                  | Severidad     | Descripcion                                                                                       | Estado                            | Archivo fix | Evidencia                                                                          |
| ----------- | ----------------------- | ------------- | ------------------------------------------------------------------------------------------------- | --------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| BUG-CRH-000 | Global                  | CRITICAL/HIGH | No se identificaron bugs CRITICAL/HIGH del producto en la corrida final full-stack.               | Cerrado                           | N/A         | Backend tests 109/109 OK, endpoints clave 200, flujos criticos ejecutados sin 500. |
| BUG-LOW-001 | Caja                    | LOW           | `GET /api/v1/cash-registers/current` devuelve 404 cuando no hay sesion abierta.                   | Pendiente (by design/documentado) | N/A         | Respuesta 404 previa a `POST /cash-registers/open`; luego 200 con sesion activa.   |
| BUG-LOW-002 | Backend logging         | LOW           | Warning por serializacion directa de `PageImpl` (estabilidad de JSON futura).                     | Pendiente                         | N/A         | Log backend: `PageModule$WarningLoggingModifier`.                                  |
| BUG-HIGH-003 | Frontend Angular 18 | HIGH | Findings productivos preexistentes en el árbol Angular 18; QA-FE-1A no los introdujo. | Pendiente; nuevo despliegue Angular 18 bloqueado | `frontend/package-lock.json` | Histórico SEC-FE-1A: 8 high, 0 critical. Reevaluación SEC-FE-1B: audit productivo total 8 (4 moderate, 4 high, 0 critical). Remediación inicial NG-UP-19; consolidación en major soportado NG-UP-20. |
| BUG-CRIT-004 | Frontend dev tooling | CRITICAL | `tar@6.2.1` es dev-only, no se ejecuta en los caminos actuales de test/build/E2E/CI y no está en runtime; permanece afectado sin fix compatible dentro de Angular CLI 18. | `RENEW_SHORT_RISK_ACCEPTANCE`; remediar en NG-UP-20 | `frontend/package-lock.json` | Aceptación anterior vencida. Reevaluado el 2026-10-05 con `CAMBIO_MATERIAL` por `GHSA-r292-9mhp-454m / CVE-2026-73566`; nueva fecha máxima 2026-10-19 o cierre de NG-UP-20, lo primero; sin renovación automática. `docs/qa/SEC_FE_1_FRONTEND_DEPENDENCY_TRIAGE.md`. |
| BUG-MED-005 | CI hardening | MEDIUM | Actions de CI actualmente referenciadas mediante tags; falta pinning futuro por SHA. No fue introducido por QA-FE-1A. | Deuda futura; no bloquea el cierre QA-FE-1A | `.github/workflows/ci.yml` | Resolver en hardening CI separado; fuera de esta ejecución. |
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
