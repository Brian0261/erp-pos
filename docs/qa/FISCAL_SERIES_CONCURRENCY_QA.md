# 4D-2A — Fiscal series administrative row-lock alignment

## Resultado

**PASS local.**

4D-2A alinea las mutaciones administrativas de series con el mismo lock pesimista que ya utiliza la emisión. No cierra toda 4D-2: 4D-2B y 4D-2C permanecen diferidas.

Base validada:

- rama: `master`;
- HEAD y `origin/master`: `cd9cd212ccb3c1bda6c3642a02ce83b58e40c2fa`;
- working tree inicial: limpio;
- tag en HEAD: ninguno;
- 4D-1B: cerrada y publicada.

No se creó commit, no se hizo push y no se creó tag durante 4D-2A.

## Riesgo anterior

`ElectronicDocumentApplicationService.createFromSale()` ya obtenía `PESSIMISTIC_WRITE` sobre `billing_series`, incrementaba `currentNumber` y persistía documento/historial dentro de una sola transacción.

Sin embargo:

- `BillingSeriesApplicationService.update()` usaba `getById()` sin lock;
- `deactivate()` usaba `getById()` sin lock;
- la reactivación reutiliza `update(active=true)` y heredaba el mismo problema.

Un administrador podía enviar un payload construido con `currentNumber=N`, una emisión confirmar el documento `N` y avanzar el contador a `N+1`, y finalmente la actualización administrativa guardar nuevamente el snapshot con `N`.

## Corrección

### Update y reactivación

`update()` ahora:

1. obtiene la serie mediante `BillingSeriesRepositoryPort.findByIdForUpdate()`;
2. falla con el mismo `BillingNotFoundException` si no existe;
3. valida formato, tipo, ambiente y prefijo;
4. comprueba identidad y serie activa por tipo/ambiente;
5. consulta `maxIssuedNumber` bajo el lock;
6. valida el `currentNumber` propuesto contra documentos confirmados;
7. construye el resultado desde la serie fresca bloqueada;
8. persiste y confirma.

La reactivación mediante `update(active=true)` usa exactamente el mismo flujo.

### Deactivate

`deactivate()` ahora:

1. obtiene la fila mediante `findByIdForUpdate()`;
2. retorna idempotentemente si ya está inactiva;
3. conserva el `currentNumber` observado después de esperar cualquier emisión anterior;
4. modifica únicamente `active` y auditoría relacionada;
5. persiste y confirma.

### Puerto y adapter

No se modificaron. El contrato y adapter existentes ya ofrecían:

```text
BillingSeriesRepositoryPort.findByIdForUpdate()
BillingSeriesJpaRepository @Lock(PESSIMISTIC_WRITE)
```

## Orden de locks

Orden preservado:

```text
serie
  -> validaciones dependientes
  -> actualización de serie
  -> escrituras dependientes
  -> commit/rollback
```

No se introdujo un camino `documento -> serie`. No se ejecutan llamadas externas ni esperas remotas mientras se conserva el lock.

## Integración PostgreSQL

Test:

```text
backend/src/test/java/com/erppos/backend/integration/FiscalSeriesConcurrencyIntegrationTest.java
```

Características:

- PostgreSQL 16 real mediante Testcontainers;
- Flyway V1-V24;
- fixtures exclusivamente sintéticos;
- conexiones y transacciones independientes;
- executors/futures y coordinación por locks reales;
- observación mediante `pg_blocking_pids`;
- CTE recursivo para incluir waiters directos y waiters en cola;
- polling de 10 ms y límites de 8/30 segundos;
- sin sleeps largos;
- cleanup inverso por FK;
- cierre de conexiones, futures y executors también ante fallo.

## Escenarios verificados

### Emisión frente a update

- la emisión sintética bloquea la serie en `N`;
- incrementa a `N+1` e inserta el documento `N` en la misma transacción;
- update con payload obsoleto basado en `N` espera;
- después del commit reanuda sobre estado fresco;
- el check de `maxIssuedNumber` produce conflicto seguro;
- el contador final permanece `N+1`;
- se conserva `currentNumber > max(number)`.

### Emisión frente a deactivate

- deactivate espera el lock de la emisión;
- la emisión confirma contador y documento;
- deactivate carga `N+1`, conserva el incremento y deja la serie inactiva;
- no existe documento parcial.

### Emisión frente a reactivate

- la serie inicia inactiva;
- un intento de emisión encolado antes de la reactivación obtiene el lock primero y falla sin consumir número;
- la reactivación posterior usa estado fresco;
- una emisión posterior confirma exactamente `N` y avanza a `N+1`.

### Dos emisiones concurrentes

- dos ventas sintéticas distintas usan la misma serie;
- ambas esperan el mismo lock;
- reciben `N` y `N+1`;
- el contador final es `N+2`;
- los números son distintos;
- no se reutiliza un correlativo;
- ambas operaciones terminan dentro del timeout.

### Update frente a deactivate

- ambas operaciones esperan la misma fila;
- update entra primero en la cola y confirma;
- deactivate carga después la versión fresca;
- el resultado conserva campos y contador del update y termina inactivo;
- no existen campos mezclados de snapshots incompatibles.

### Rollback

Antes de escrituras:

- se adquiere el lock y se fuerza rollback;
- contador sin cambios;
- cero documentos;
- una operación administrativa posterior adquiere el lock.

Después de escrituras:

- se actualiza el contador e inserta documento dentro de la transacción;
- ambos cambios son visibles dentro de esa transacción;
- rollback restaura el contador y elimina el documento;
- una emisión posterior reutiliza correctamente el número no confirmado;
- el lock queda disponible mediante `FOR UPDATE NOWAIT`.

### Duplicación, reutilización y deadlock

Después de cada escenario relevante se comprueba:

- `COUNT(*) == COUNT(DISTINCT number)` por serie;
- cada número confirmado se observa una sola vez;
- `currentNumber > MAX(number)`;
- futures/executors terminan dentro de límites acotados;
- no aparece deadlock ni queda thread/conexión esperando.

## Pruebas ejecutadas

### Focal 4D-2A

```powershell
.\mvnw -Dtest=FiscalSeriesConcurrencyIntegrationTest test
```

- 8 tests;
- 0 failures;
- 0 errors;
- 0 skipped;
- `BUILD SUCCESS`.

La primera corrida de desarrollo reveló que el segundo waiter puede quedar bloqueado por el primer waiter de la cola y no directamente por la sesión raíz. La observación se corrigió para recorrer la cadena de `pg_blocking_pids` mediante CTE recursivo. La corrida final completa pasó 8/8; no se relajaron invariantes funcionales.

### Unitarios billing

```powershell
.\mvnw -Dtest=BillingApplicationServiceTest test
```

- 134 tests;
- 0 failures;
- 0 errors;
- `BUILD SUCCESS`.

Los unitarios verifican uso del finder bloqueado, reactivación, estado fresco y preservación del contador; no sustituyen la evidencia PostgreSQL.

### Billing y regresiones 4D

```powershell
.\mvnw "-Dtest=BillingApplicationServiceTest,FiscalSeriesConcurrencyIntegrationTest,BillingEvidenceMetadataMigrationIntegrationTest,BillingEvidenceReadinessIntegrationTest,FiscalSendTransactionIntegrationTest,FiscalSendTransactionBoundaryIntegrationTest" test
```

- 170 tests;
- 0 failures;
- 0 errors;
- `BUILD SUCCESS`.

Incluye:

- 4D-1A: 3 PASS y SQLSTATE `55P03`;
- 4D-1B: 16 PASS;
- metadata/readiness billing: 9 PASS;
- 4D-2A: 8 PASS;
- `BillingApplicationServiceTest`: 134 PASS.

### Suite backend completa

```powershell
.\mvnw test
```

- 611 tests;
- 0 failures;
- 0 errors;
- 0 skipped;
- `BUILD SUCCESS`.

## Riesgos diferidos

### 4D-2B

4D-2A no detecta dos formularios administrativos que parten del mismo snapshot antiguo pero se ejecutan uno después del otro. Permanecen diferidos:

- `@Version`;
- token de revisión;
- ETag;
- `If-Match`;
- precondición REST;
- cambios frontend.

### 4D-2C

Permanecen diferidos a Plan/migración separados:

- identidad fiscal por ambiente;
- unicidad global de `fullNumber`;
- perfil/emisor congelado;
- cambios de constraints o índices;
- V25.

No se exige numeración gapless. Un rollback puede dejar disponible un número no confirmado y una operación administrativa autorizada puede avanzar el próximo correlativo siempre que permanezca por encima del máximo emitido.

## Exclusiones confirmadas

4D-2A no modificó ni implementó:

- puerto o adapter de series;
- entidades, columnas, constraints o índices;
- Flyway, migraciones o V25;
- `@Version`, ETag, `If-Match` o CAS SQL;
- controllers, REST o DTOs públicos;
- frontend;
- `fullNumber` o identidad por ambiente;
- 4D-1B;
- cliente, DTOs, mapper, token o llamadas MiFact;
- query/reconcile o retry;
- storage o infraestructura;
- `.env`, secretos o certificados;
- skill `inktoy-mifact-integration`.
