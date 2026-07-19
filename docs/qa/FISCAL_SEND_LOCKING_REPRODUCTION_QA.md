# 4D-1A — PostgreSQL locking reproduction

## Resultado

PASS.

La prueba de integración reproduce de forma determinista el bloqueo identificado en el Plan de 4D sin modificar código funcional.

## Alcance

- Test creado: `backend/src/test/java/com/erppos/backend/integration/FiscalSendTransactionIntegrationTest.java`.
- PostgreSQL real: Testcontainers `postgres:16-alpine`.
- Migraciones aplicadas: Flyway V1–V24.
- Datos: fixture exclusivamente sintético, aislado por sufijo UUID y eliminado después de cada repetición.
- No se modificaron servicios, repositories productivos, entidades, migraciones, configuración, frontend ni infraestructura.

## Estructura de la reproducción

1. Se crea un documento electrónico sintético en estado `SIGNED`.
2. La conexión A desactiva autocommit y ejecuta:

   ```sql
   SELECT id
   FROM electronic_documents
   WHERE id = ?
   FOR UPDATE
   ```

3. La conexión B desactiva autocommit y configura únicamente para su transacción:

   ```sql
   SET LOCAL lock_timeout = '1000ms'
   ```

4. B intenta insertar un attempt `SEND/STARTED` real en `electronic_document_attempts`.
5. Una tercera conexión consulta `pg_blocking_pids(B)` y `pg_stat_activity`.
6. El test espera el timeout, comprueba que no existe attempt persistido y ejecuta rollback/cleanup.

La coordinación usa `CountDownLatch`, `Future` y polling de 10 ms con límite de 900 ms. No depende de sleeps largos.

## Evidencia PostgreSQL

Evidencia de la última ejecución conjunta:

- PIDs observados en esa muestra: blocker A `63`, bloqueado B `64`; son diagnóstico de la ejecución y no valores contractuales.
- `pg_blocking_pids(B)` incluyó el PID de A.
- `wait_event_type`: `Lock`.
- `wait_event`: `transactionid`.
- Excepción: `org.postgresql.util.PSQLException`.
- SQLSTATE: `55P03`.
- La FK se valida estructuralmente mediante `pg_constraint`, `pg_class`, `pg_namespace`, `conkey`, `confkey` y `pg_attribute`: `electronic_document_attempts.electronic_document_id` referencia `electronic_documents.id`.
- El mensaje de `PSQLException` queda fuera de las assertions y solo puede usarse como diagnóstico local no contractual.
- Duraciones observadas: `1023 ms`, `1009 ms`, `1007 ms`.
- Attempts persistidos después de cada timeout: `0`.

La metadata de la FK, el blocker dinámico y el SQLSTATE demuestran que el INSERT del attempt valida su referencia al documento bloqueado. PostgreSQL expresa esa espera como `transactionid` mientras la transacción A conserva el `FOR UPDATE`.

## Estabilidad

La reproducción se ejecutó tres veces mediante Maven. Cada ejecución contiene tres repeticiones JUnit:

- Total: 9 reproducciones.
- Bloqueo identificado en 9/9.
- SQLSTATE `55P03` en 9/9.
- `Lock/transactionid` en 9/9.
- Attempts persistidos: 0 en 9/9.
- Fallos, errores o skips: 0.

## Validaciones

```text
.\mvnw -Dtest=FiscalSendTransactionIntegrationTest test
```

- Primera ejecución: 3 tests, PASS.
- Segunda ejecución con assertions ajustadas a la evidencia real: 3 tests, PASS.

```text
.\mvnw "-Dtest=FiscalSendTransactionIntegrationTest,BillingEvidenceMetadataMigrationIntegrationTest,BillingEvidenceReadinessIntegrationTest" test
```

- 12 tests, PASS:
  - reproducción: 3;
  - migración de metadata fiscal: 1;
  - readiness fiscal HTTP/RBAC: 8.

```text
.\mvnw -Dtest=BillingApplicationServiceTest test
```

- 132 tests, PASS.

La suite backend completa no se ejecutó porque 4D-1A solo agregó una prueba aislada y no modificó código funcional.

## Validación posterior a la corrección de assertions

Las ejecuciones históricas 9/9 se conservan como evidencia previa; no se agregan a ningún total nuevo.

Después de retirar las assertions basadas en texto de `PSQLException` se ejecutaron tres corridas Maven independientes de la reproducción, con tres repeticiones JUnit cada una:

- Total posterior a la corrección: 9 reproducciones, 9/9 PASS.
- FK estructural, blocker dinámico, SQLSTATE `55P03` y cero attempts persistidos: 9/9.
- `Lock/transactionid` observado como evidencia auxiliar: 9/9.
- Duración observada del timeout: entre `935 ms` y `1008 ms`.

La aprobación post-corrección depende de la metadata estructural de la FK, de `pg_blocking_pids`, del SQLSTATE y del estado final. El mensaje de la excepción no es una assertion ni un contrato.

## Cleanup y seguridad

- La conexión B hace rollback después del timeout.
- La conexión A libera el lock mediante rollback.
- Executor, future y conexiones se cierran también ante fallo.
- El fixture se elimina en orden FK-safe.
- `lock_timeout` es local a la transacción de prueba.
- No se usaron datos fiscales reales, secretos, tokens ni credenciales externas.
- No se realizaron llamadas a MiFact.

## Implicación para 4D

La hipótesis del Plan queda confirmada:

- `FOR UPDATE` sobre `electronic_documents`;
- seguido de un INSERT en una transacción independiente;
- cuya FK solicita `KEY SHARE` sobre el mismo documento;
- produce espera circular a nivel de aplicación hasta que interviene un timeout.

4D-1A no implementa la corrección ni autoriza automáticamente 4D-1B. La evidencia debe utilizarse como puerta de entrada para evaluar posteriormente el hardening transaccional por fases.
