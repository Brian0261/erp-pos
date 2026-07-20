# 4D-1B — Fiscal submission transaction boundary hardening

## Resultado

**PASS local.**

4D-1B elimina la llamada al provider dentro de una transacción PostgreSQL y adopta:

`prepare/commit -> provider sin transacción -> finalize local/reconciliable`

Base validada:

- rama: `master`;
- HEAD y `origin/master`: `a6eac475d93c19fedcd078fb3741ab996cd12dd0`;
- working tree inicial: limpio;
- tag en HEAD: ninguno;
- 4D-1A: cerrada y publicada.

No se creó commit, no se hizo push y no se creó tag durante 4D-1B.

## Riesgo anterior

El flujo anterior ejecutaba `send()` y `retrySend()` dentro de una transacción exterior:

1. bloqueaba `electronic_documents` con `FOR UPDATE`;
2. retenía el lock y la conexión;
3. intentaba crear/finalizar attempts mediante `REQUIRES_NEW`;
4. invocaba al provider antes del commit exterior.

4D-1A demostró en PostgreSQL que el INSERT independiente del attempt necesita validar la FK mediante un lock compatible con `FOR KEY SHARE` y espera a la transacción que conserva el `FOR UPDATE`. La reproducción termina por `lock_timeout` con SQLSTATE `55P03`.

Además, la latencia remota retenía una conexión y el lock del documento, y una aceptación remota podía quedar seguida por un rollback local que ocultara el estado ambiguo.

## Diseño implementado

### Orquestación

`ElectronicDocumentApplicationService.send()` ya no tiene una transacción exterior. Coordina:

1. `FiscalSendTransactionService.prepareSend(documentId)`;
2. una única llamada a `ElectronicBillingProviderPort.send(...)`;
3. `finalizeSend(...)` o `finalizeAmbiguousFailure(...)`.

El orquestador comprueba que no exista una transacción Spring activa antes de preparar y antes de invocar al provider. La preparación es un record inmutable con el snapshot de documento requerido por el provider, attempt ID, request hash y XML firmado; no expone una entidad JPA administrada.

`retrySend()` también rechaza una transacción exterior para evitar que el registro `BLOCKED` participe accidentalmente en una transacción del caller.

### Preparación

`prepareSend()` usa una transacción `REQUIRED` corta:

- bloquea el documento;
- valida lifecycle, ambiente/readiness productiva y XML firmado;
- detecta attempts `STARTED` o `PENDING`;
- registra metadata segura del XML firmado si falta;
- crea el attempt `STARTED`;
- cambia el documento a `SENT`;
- registra historial;
- confirma todo junto.

Si una validación esperada bloquea el envío, devuelve un resultado interno `Blocked` para permitir que el attempt `BLOCKED` se confirme antes de lanzar el error fuera de la transacción.

### Provider

La llamada provider ocurre después del commit de preparación:

- sin transacción Spring activa;
- sin conexión PostgreSQL retenida por el envío;
- sin lock `FOR UPDATE` del documento;
- exactamente una vez por preparación válida.

No se incorporó cliente HTTP MiFact ni se realizaron llamadas externas reales.

### Finalización

`finalizeSend()` y `finalizeAmbiguousFailure()` usan transacciones `REQUIRED` cortas:

- bloquean de forma pesimista el attempt por ID y el documento relacionado;
- verifican document ID, attempt ID, operación y request hash;
- exigen que el attempt en vuelo sea `STARTED` y el documento esté `SENT`;
- actualizan documento, attempt, historial y metadata de respuesta en el mismo commit;
- comparan una finalización ya aplicada para hacerla idempotente;
- rechazan una finalización contradictoria.

Una repetición idéntica no crea historial ni evidencia duplicada. Un fallo al guardar la evidencia revierte toda la finalización y conserva el punto durable `SENT + STARTED`.

## Propagación de attempts

Los métodos de escritura de `FiscalAttemptAuditService` cambiaron:

- antes: `REQUIRES_NEW`;
- ahora: `MANDATORY`.

Por tanto, STARTED/BLOCKED participan en la preparación y SUCCESS/FAILED/PENDING participan en la finalización. Ya no se abre una segunda transacción mientras una transacción exterior conserva el lock del documento.

`ElectronicDocumentAttemptRepositoryPort` incorpora `findByIdForUpdate()` y el adapter JPA usa `PESSIMISTIC_WRITE` para serializar finalizaciones.

## Resultados y retry

Mapping vigente:

| Resultado provider | Documento | Attempt | Retry directo |
|---|---|---|---|
| `ACCEPTED` | `ACCEPTED` | `SUCCESS` | Bloqueado |
| `OBSERVED` | `ACCEPTED` | `SUCCESS` | Bloqueado |
| `REJECTED` | `REJECTED` | `FAILED` | Bloqueado hasta una política futura demostrablemente segura |
| `PENDING` | `SENT` | `PENDING` | Bloqueado |
| `TIMEOUT` | `SENT` | `PENDING` | Bloqueado |
| `UNAVAILABLE` | `SENT` | `PENDING` | Bloqueado |
| `COMMUNICATION_ERROR` | `SENT` | `PENDING` | Bloqueado |
| excepción potencialmente posterior al despacho | `SENT` | `PENDING` | Bloqueado |
| respuesta remota + fallo local de finalización | `SENT` | `STARTED` | Bloqueado |

Los resultados ambiguos usan `recoverable=false` para reenvío directo. `retrySend()` permanece como contrato interno, pero siempre falla cerrado hasta que exista query/reconcile remoto. No consume correlativo, no regenera XML, no refirma y no invoca al provider.

## Evidencia QA

### Focal 4D-1B

Comando:

```powershell
.\mvnw -Dtest=FiscalSendTransactionBoundaryIntegrationTest test
```

Resultado final:

- 16 tests;
- 0 failures;
- 0 errors;
- `BUILD SUCCESS`.

Cobertura:

- provider observa `TransactionSynchronizationManager.isActualTransactionActive() == false`;
- mientras el provider espera mediante latch, otra conexión observa `SENT + STARTED`;
- la conexión observadora obtiene `FOR UPDATE NOWAIT`;
- dos envíos concurrentes del mismo documento producen una sola llamada provider y un solo attempt en vuelo;
- matriz `ACCEPTED`, `REJECTED`, `OBSERVED`, `PENDING`;
- finalización repetida idempotente;
- finalización contradictoria rechazada sin modificar attempt, documento, historial o evidencia;
- timeout, unavailable y communication conservadores;
- excepción provider persistida como `PENDING`;
- fallo local posterior a aceptación conserva `SENT + STARTED`;
- rollback de preparación deja `SIGNED`, cero attempts y cero llamadas;
- retry sobre `STARTED`/`PENDING` no llama provider ni consume correlativo;
- transacción exterior rechazada para send y retry;
- Hikari con pool máximo 2 permite dos providers concurrentes y una conexión observadora.

### 4D-1A

Comando:

```powershell
.\mvnw -Dtest=FiscalSendTransactionIntegrationTest test
```

Resultado:

- 3 tests;
- 0 failures;
- 0 errors;
- SQLSTATE `55P03`;
- `wait_event_type=Lock`;
- `wait_event=transactionid`;
- 0 attempts persistidos;
- `BUILD SUCCESS`.

El test 4D-1A no fue modificado. Sigue demostrando el mecanismo nativo `FOR UPDATE -> FK FOR KEY SHARE -> transactionid wait`.

### Integraciones billing relacionadas

Comando:

```powershell
.\mvnw "-Dtest=FiscalSendTransactionBoundaryIntegrationTest,FiscalSendTransactionIntegrationTest,BillingEvidenceMetadataMigrationIntegrationTest,BillingEvidenceReadinessIntegrationTest" test
```

Resultado:

- 28 tests;
- 0 failures;
- 0 errors;
- `BUILD SUCCESS`.

### BillingApplicationServiceTest

Incluido en la validación conjunta final:

- 132 tests;
- 0 failures;
- 0 errors.

Estos tests validan semántica, mapping, sanitización, auditoría y retry, pero no se usan como evidencia de proxies/locks porque construyen servicios con `new`. La evidencia transaccional proviene de la integración Spring/PostgreSQL.

### Suite backend completa

Comando:

```powershell
.\mvnw test
```

Resultado:

- 601 tests;
- 0 failures;
- 0 errors;
- 0 skipped;
- `BUILD SUCCESS`.

## Exclusiones confirmadas

4D-1B no modificó ni implementó:

- contratos REST o controllers;
- frontend;
- migraciones, V25 o esquema;
- `.env`, secretos, tokens, credenciales o certificados;
- infraestructura o configuración productiva;
- storage S3/filesystem productivo;
- cliente HTTP, DTOs o mapper MiFact;
- llamadas MiFact demo o producción;
- query/reconcile remoto;
- endpoint de retry;
- retry automático, scheduler, polling u outbox fiscal;
- hardening de update/deactivate de series;
- identidad fiscal por ambiente;
- snapshot tributario completo;
- XML/CDR/PDF/QR reales;
- skill `inktoy-mifact-integration`.

## Limitaciones diferidas

- Diseñar y construir query/reconcile provider-neutral antes de autorizar cualquier reenvío.
- Diseñar el comando/snapshot fiscal provider-neutral antes del adapter MiFact.
- Resolver identidad fiscal por ambiente en una fase/migración separada.
- Resolver concurrencia de actualización/desactivación de series en una fase separada.
- Completar el snapshot tributario por línea antes de mapear MiFact.
- Mantener 3B-3B y la skill de integración diferidas.
