# 4D-2B-3 — Mandatory precondition enforcement QA

## Resultado

PASS funcional local. El cierre Git permanece pendiente de autorización.

## Alcance

4D-2B-3 elimina el último fallback administrativo last-write-wins en series fiscales. Las mutaciones `PUT` (incluida reactivación) y `DELETE` requieren la versión observada mediante un único ETag fuerte en `If-Match`.

No se inició QA-FE-1 ni 4D-2C.

## Contrato REST final

| Escenario | Resultado | Persistencia |
|---|---:|---|
| `If-Match` ausente | `428 Precondition Required` + `Cache-Control: no-store` | Sin cambios |
| Vacío, weak, wildcard, lista, malformed, overflow o ID distinto | `400 Bad Request` | Sin cambios |
| Token sintácticamente válido para ID inexistente | `404 Not Found` | Sin cambios |
| Token válido y vigente | `200` en PUT / `204` en DELETE | Una mutación atómica |
| Token válido pero obsoleto | `412 Precondition Failed` | Rollback, sin cambios parciales |
| Conflicto/regla de negocio | `409` / `422` | Semántica previa preservada |

Mensaje estable de ausencia:

> El header If-Match es obligatorio para modificar una serie. Recarga la serie y vuelve a intentarlo con su versión vigente.

## Implementación backend

- `BillingSeriesEtag.parseRequired` diferencia ausencia de formato inválido.
- `BillingPreconditionRequiredException` representa la precondición ausente sin filtrar detalles internos.
- `GlobalExceptionHandler` devuelve `428` y prohíbe cachear la respuesta.
- `UpdateBillingSeriesCommand` ya no ofrece constructor sin versión.
- `BillingSeriesUseCase` y `BillingSeriesApplicationService` ya no ofrecen desactivación administrativa sin versión.
- La validación defensiva de servicio rechaza `expectedVersion=null` aunque un caller interno intente eludir REST.

## Emisión y concurrencia

- La emisión no es un cliente HTTP administrativo y no requiere `If-Match`.
- `createFromSale()` conserva `PESSIMISTIC_WRITE`, `@Version`, incremento de `currentNumber` y atomicidad existentes.
- Un token observado antes de una emisión confirmada queda obsoleto y se rechaza.
- Una versión fresca obtenida después de la emisión permite una mutación administrativa válida.
- Dos mutaciones concurrentes con el mismo token confirman exactamente una operación.

No se modificaron V25, entidades JPA, repositorios, queries de lock ni esquema.

## Angular

- B2 sigue generando y enviando `If-Match` centralizadamente.
- `412` conserva el mensaje de snapshot obsoleto.
- `428` muestra: `No se pudo verificar la versión vigente de la serie. Tus cambios no fueron guardados. Revisa la información actual antes de intentarlo nuevamente.`
- Ante `428`, la UI detiene loading, limpia success, invalida token/formulario, recarga una sola vez y no reintenta la mutación.
- `400` y `409` conservan su manejo operativo genérico.

## Validación ejecutada

| Validación | Resultado |
|---|---|
| `BillingSeriesEtagTest`, `GlobalExceptionHandlerTest`, `BillingApplicationServiceTest` | PASS — 148 tests |
| `BillingSeriesOptimisticConcurrencyIntegrationTest` | PASS — 19 tests |
| `FiscalSeriesConcurrencyIntegrationTest` | PASS — 9 tests |
| Suite backend `mvnw test` | PASS — 642 tests, 0 failures/errors/skips |
| `npm run build` | PASS |
| Playwright `billing-series-concurrency.spec.ts --workers=1` | PASS — 6 tests |

Playwright interceptó todas las mutaciones; no realizó ventas, caja, stock, emisión fiscal ni escrituras reales de series.

## Compatibilidad y rollout

No se encontraron otros consumidores mutantes verificables en backend, Angular, scripts ni colecciones del repositorio. Los clientes externos no observables no bloquean esta Build local, pero sí el despliegue productivo:

1. inventariar integraciones que usen PUT/DELETE de series;
2. confirmar que capturan `version`/ETag y envían `If-Match`;
3. desplegar primero los clientes;
4. monitorear respuestas `428` durante rollout;
5. no habilitar un fallback sin precondición.

## Exclusiones confirmadas

- Sin migraciones, cambios de DB, entidades o repositorios.
- Sin cambios de locks, CORS, Auth/JWT, RBAC, guards o permisos.
- Sin cambios de provider fiscal, MiFact, query/reconcile, retry o evidencia.
- Sin infraestructura, `.env`, secretos ni certificados.
- Sin commit, push ni tag.
- QA-FE-1 y 4D-2C no iniciadas.
