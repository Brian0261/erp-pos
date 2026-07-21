# 4D-2B-1 — Additive optimistic-concurrency foundation

## Resultado y alcance

4D-2B-1 agrega una base aditiva de concurrencia optimista para la administración de series fiscales. No cierra 4D-2B: el consumo del ETag en Angular corresponde a 4D-2B-2 y la obligatoriedad de `If-Match`/`428 Precondition Required` corresponde a 4D-2B-3.

Alcance implementado:

- migración Flyway V25 para `billing_series.version`;
- `@Version Long version` administrado por JPA;
- versión read-only en dominio y `BillingSeriesResponse`;
- ETag fuerte individual en POST, GET por ID, PUT y DELETE;
- `If-Match` opcional en PUT y DELETE;
- `400` para precondiciones mal formadas y `412` para tokens obsoletos;
- `If-Match` permitido y `ETag` expuesto por CORS;
- preservación del `PESSIMISTIC_WRITE` de 4D-2A.

No se modificó Angular ni se implementó 4D-2B-2, 4D-2B-3, 4D-2C, MiFact, query/reconcile, retry, storage o infraestructura.

## Migración V25

Archivo:

`backend/src/main/resources/db/migration/V25__billing_series_optimistic_concurrency.sql`

Esquema:

```sql
ALTER TABLE billing_series
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE billing_series
    ADD CONSTRAINT chk_billing_series_version
        CHECK (version >= 0);
```

Propiedades validadas con PostgreSQL 16/Testcontainers:

- una base detenida en V24 migra a V25;
- filas preexistentes reciben versión `0`;
- inserts que omiten `version` reciben `0`;
- la columna es `NOT NULL`;
- valores negativos son rechazados;
- Flyway valida V1–V25;
- una segunda schema vacía migra correctamente desde cero hasta V25.

Durante el despliegue de V25 no deben coexistir instancias backend anteriores y posteriores a la introducción de `@Version`.

## Versión JPA y persistencia

- `BillingSeriesEntity.version` usa `@Version`.
- No existe setter de versión.
- `BillingSeriesRequest` no contiene `version`.
- El mapper solo copia versión de entidad a dominio; el merge nunca reemplaza la versión de la entidad gestionada.
- Las reconstrucciones en `BillingSeriesApplicationService` y `ElectronicDocumentApplicationService` conservan la versión observada.
- `saveAndFlush()` entrega al servicio la versión realmente persistida antes de construir response y ETag.
- Una creación parte en versión `0`.
- Una mutación confirmada incrementa la versión una vez.
- Un lock pesimista sin cambios no fuerza un incremento.
- Una emisión que incrementa `currentNumber` también invalida el token administrativo anterior.

## Contrato HTTP

Formato estable:

```text
"billing-series-{id}-v{version}"
```

El parser:

- exige un ETag fuerte y entrecomillado;
- rechaza weak ETags;
- rechaza `*`;
- rechaza listas;
- rechaza formato inválido;
- rechaza un ID distinto al path;
- no usa timestamps ni datos sensibles.

Semántica de B1:

| Caso | Resultado |
|---|---|
| Sin `If-Match` | Compatible: la mutación continúa |
| ETag vigente | Mutación confirmada; response contiene versión y ETag nuevos |
| ETag válido pero obsoleto | `412 Precondition Failed`; rollback y cero cambios |
| ETag débil, wildcard, lista, ID distinto o formato inválido | `400 Bad Request` |
| Serie inexistente | `404 Not Found` |
| Conflicto de negocio | Conserva el status existente |

No se implementa `428` en B1.

## Locks, rollback y contador fiscal

PUT, reactivación y desactivación mantienen este orden:

1. `findByIdForUpdate()` / `PESSIMISTIC_WRITE`;
2. lectura de versión fresca;
3. validación opcional de `If-Match`;
4. reglas de negocio;
5. mutación;
6. flush;
7. response/ETag de la versión persistida.

Los tests demuestran:

- dos updates con el mismo token confirman una sola mutación;
- update frente a deactivate y update frente a reactivate producen un orden serial;
- el request perdedor obtiene `412`;
- un stale no cambia negocio, auditoría ni `currentNumber`;
- una colisión optimista durante flush revierte la mutación exterior;
- una emisión confirmada incrementa versión y vuelve stale el token anterior;
- `currentNumber > MAX(number)` y los locks de 4D-2A permanecen vigentes.

El overload transaccional `deactivate(id)` se conserva para callers internos anteriores; `deactivate(id, expectedVersion)` aplica la misma transacción y lock al contrato condicional.

## CORS y seguridad

- Header permitido: `If-Match`.
- Header expuesto: `ETag`.
- Origins, JWT y RBAC existentes permanecen sin cambios.
- Listado de series: `ADMIN`, `SUPERVISOR`, `CAJERO`.
- Crear, consultar por ID, actualizar y desactivar: `ADMIN`.

## Cobertura focal

- `BillingSeriesEtagTest`: 4 PASS.
- `BillingSeriesOptimisticConcurrencyMigrationIntegrationTest`: 1 PASS.
- `BillingSeriesOptimisticConcurrencyIntegrationTest`: 14 PASS.
- `GlobalExceptionHandlerTest`: 6 PASS.
- `SecurityConfigTest`: 2 PASS.
- `BillingApplicationServiceTest`: 135 PASS.
- `FiscalSeriesConcurrencyIntegrationTest`: 9 PASS.

- Regresión fiscal combinada, incluyendo 4D-1A y 4D-1B: 188 PASS.
- Integraciones `Billing*IntegrationTest`: 24 PASS.
- Suite backend completa: 634 PASS, 0 failures, 0 errors y 0 skipped.

La primera ejecución completa detectó que `SecurityConfigTest` todavía esperaba la lista CORS anterior. La aserción se actualizó para exigir `If-Match` y `ETag`; el test focal y la suite completa posterior quedaron en PASS.

## Rollout y riesgo residual

Secuencia:

1. B1: backend aditivo, `If-Match` opcional.
2. B2: clientes/Angular conservan y envían el ETag.
3. B3: `If-Match` obligatorio y `428` para mutaciones sin precondición.

Mientras B1 permita requests sin header, esos clientes conservan el riesgo temporal de last-write-wins entre dos formularios administrativos secuenciales. Los locks de 4D-2A siguen evitando corrupción frente a emisión, pero la protección completa del cliente requiere B2/B3.

## Estado posterior de B2/B3

La compatibilidad temporal descrita arriba corresponde al cierre histórico de B1. Posteriormente:

- 4D-2B-2 hizo que Angular enviara `If-Match` en update, reactivación y desactivación;
- 4D-2B-3 hizo obligatoria esa precondición y eliminó los overloads administrativos con versión nula;
- el contrato final distingue ausencia (`428`), formato inválido (`400`) y versión obsoleta (`412`);
- los clientes externos no verificables deben inventariarse antes del despliegue y constituyen una puerta de rollout, no un fallback dentro del backend.

Elementos diferidos:

- Angular y manejo visual de `412`;
- obligatoriedad de `If-Match`;
- `428 Precondition Required`;
- identidad fiscal/full number por ambiente de 4D-2C;
- MiFact, query/reconcile y retry;
- storage, infraestructura y secretos.
