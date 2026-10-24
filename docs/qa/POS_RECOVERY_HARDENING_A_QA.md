# POS-RECOVERY-HARDENING-A — evidencia local

Fecha:2026-10-21. Base:`77c53fa3c4b33f3dff5271559409edd56a3f772a`.
Worktree:`C:\Users\USUARIO\InkToyWorktrees\pos-recovery-hardening-a`.
Resultado previo (backend/Angular):`PASS — POS_RECOVERY_A_LOCAL_QA`.
Gate E2E inicial (2026-10-21):`FAIL — POS_RECOVERY_A_E2E_QA`, `NOT_READY`.
Gate correctivo previo (2026-10-22):`PASS — POS_RECOVERY_A_E2E_QA`, `READY_FOR_A_COMMIT_APPROVAL`.
Gate comercial integral actual (2026-10-23):`PASS — POS_RECOVERY_A_CI_LOCAL_QA`, `READY_FOR_A_FINAL_REVIEW`.
El historial FAIL y sus limitaciones se conserva debajo; la correccion y evidencia posterior cierran UX-01.
No implica CLOSED, commit, publicacion, CI remoto ni despliegue.

## Comportamiento verificado

- PREPARED durable antes de checkout POS o conversion de cotizacion; preparacion sin efectos comerciales.
- Owner derivado del principal; autoservicio de ADMIN/SUPERVISOR/CAJERO limitado a sus operaciones.
  Sin autenticacion401, rol no permitido403, UUID ajeno o ausente404, respuestas no-store.
- Identidad actor/operationId, checkout-v1, huella separada de intencion y caja original inmutables.
  Varios pendientes y dos compras identicas con distintos operationId permitidos.
- Recuperacion mediante GET, incluso sin estado del navegador, respuesta perdida o caja cerrada.
  PREPARED requiere confirmacion explicita; COMPLETED no repite checkout; CANCELLED no se reactiva.
- Venta/pagos/inventario/COMPLETED se confirman juntos. Rollback conserva PREPARED sin efectos parciales.
- Comprobante original preservado; documento compatible reutilizado sin segundo correlativo.
  Incompatibilidades y resultados ambiguos requieren revision. DRAFT se presenta como borrador local.
- Snapshots comerciales se reducen al completar; cliente fiscal solo se conserva mientras sea necesario.
  Cancelacion, enlace de documento y purga reducen datos personales sin perder identidad/huellas/tombstone.
- Cambio de credencial invalida resultados tardios; panel invalida datos ya visibles. Autorizacion vinculada
  de P1 preservada. El almacenamiento del navegador es auxiliar; no sustituye al servidor.

## Backend: PostgreSQL16 aislado y tests focales

Java17, Maven wrapper del proyecto y Testcontainers con contenedores efimeros/puertos aleatorios.
No se utilizo una base compartida, comercial ni productiva.

| Clase | PASS | FAIL/ERROR/SKIPPED |
| --- | ---: | --- |
| SaleOperationRecoveryIntegrationTest |32|0/0/0|
| PosRecoveryCoordinationIntegrationTest |11|0/0/0|
| SaleOperationRecoveryMigrationTest |2|0/0/0|
| SalesApplicationServiceTest |43|0/0/0|
| BillingApplicationServiceTest |136|0/0/0|
| QuoteApplicationServiceTest |22|0/0/0|
| ProductCleanupPreviewApplicationServiceTest |16|0/0/0|
| CheckoutConfirmationIntegrationTest |32|0/0/0|
| PosMoneyIntegrationTest |11|0/0/0|
| PosMoneyPrecisionReproductionIntegrationTest |12|0/0/0|
| ProductCleanupPreviewIntegrationTest |22|0/0/0|

339 casos distintos acreditados entre ejecuciones focales; no son una ejecucion integral de todo el backend.
Las repeticiones no se suman. Primera regresion `verify`:337 PASS. Tras los dos casos adicionales y los
ajustes finales, `verify` de cinco clases:110 PASS. Se reutiliza evidencia de las clases no afectadas.

Comandos desde backend (PowerShell; salidas completas en target, ignoradas):

```powershell
.\mvnw.cmd -q '-Dtest=SaleOperationRecoveryIntegrationTest,SaleOperationRecoveryMigrationTest,PosRecoveryCoordinationIntegrationTest,CheckoutConfirmationIntegrationTest,PosMoneyIntegrationTest,PosMoneyPrecisionReproductionIntegrationTest,ProductCleanupPreviewIntegrationTest,QuoteApplicationServiceTest,SalesApplicationServiceTest,BillingApplicationServiceTest,ProductCleanupPreviewApplicationServiceTest' verify
.\mvnw.cmd -q '-Dtest=SaleOperationRecoveryIntegrationTest,SaleOperationRecoveryMigrationTest,PosRecoveryCoordinationIntegrationTest,SalesApplicationServiceTest,ProductCleanupPreviewIntegrationTest' verify
```

Ultimas salidas:`backend/target/recovery-a-final.log`, `backend/target/recovery-a-completion.log`
y `backend/target/surefire-reports`. Compilacion y empaquetado backend PASS.

Carreras reales con latches/futures y comprobacion `pg_blocking_pids`/wait_event_type=Lock:
checkout duplicado, checkout/cancelacion en ambos ordenes, conversion duplicada, checkout/cierre en ambos
ordenes, creadores compatibles y boleta/factura, creacion/anulacion en ambos ordenes y purga/billing en ambos.
Las pruebas verifican identidad, estado, numero de ventas/pagos/movimientos y correlativos segun el escenario.
Timeout de lock da conflicto seguro y rollback; el test no se limita a invocaciones secuenciales.

V28: upgrade sintetico V27 conserva completados y tombstones. Otro contenedor simula importacion incompatible
retirando solo alli el indice V22, introduce dos documentos activos por venta y verifica rechazo atomico de V28
sin borrar/reparar historia. El ERROR esperado de Flyway en ese caso negativo no es un fallo de suite.

Correcciones durante QA: SQLSTATE55P03 inicialmente se traducía a500; ahora409 OPERATION_BUSY.
UUID invalido ahora400. Se corrigieron comparaciones JSON de numeros sin alterar valores esperados y se
adapto housekeeping de fixtures a la nueva FK de caja. El total inconsistente se rechaza422 en preparacion;
la prueba de precio conserva409 y comprueba la propuesta vigente. No se debilitó el contrato monetario.

## Angular

Node22.23.3/npm10.9.9 ya disponibles; `npm ci --ignore-scripts --no-audit --no-fund` en el worktree.
Sin cambios de manifiesto/lockfile ni dependencias nuevas. Chrome Headless155.

```powershell
npm.cmd test -- --include=src/app/features/sales/pos-page.component.spec.ts --include=src/app/features/sales/pos-checkout-confirmation.spec.ts --include=src/app/features/sales/pos-durable-recovery.spec.ts --include=src/app/features/sales/data/sale-operations.service.spec.ts --include=src/app/features/sales/components/sale-operation-recovery.component.spec.ts --include=src/app/features/quotes/quote-convert-page.component.spec.ts --include=src/app/features/sales/data/pos-state.service.spec.ts --include=src/app/core/auth/jwt.interceptor.spec.ts --progress=false
npm.cmd run build
```

158 PASS, cero FAIL/SKIPPED. Build PASS. Logs locales ignorados:
`frontend/.angular/cache/recovery-a-tests.log` y `frontend/.angular/cache/recovery-a-build.log`.
Cobertura: preparar antes de ejecutar, perdida de respuesta de ambas fases, ausencia de storage, reload,
reauth/cambio de credencial, seleccion explicita, varios pendientes, cancelacion, precio cambiado, comprobante
conservado/ambiguo, paginacion/carga/vacio/error, invalidacion de datos del actor previo y transporte con contexto.
El interceptor real se ejercita con HTTP simulado; no se envio ninguna venta a un backend comercial.
No se eliminaron casos ni se agregaron skips/only. La suite P1 ahora verifica GET de operacion antes de
reanudar o crear un comprobante tras recuperar la sesion; no utiliza el listado general de billing como permiso.

## Limites y siguiente gate

- La entrega unitaria inicial no acreditaba E2E de navegador ni QA visual. La primera intervencion E2E
  termino con cinco recorridos PASS, uno interrumpido y dos no ejecutados; gate FAIL por UX. La seccion
  correctiva de2026-10-22 acredita los tres pendientes y los smokes UX, sin repetir los cinco aprobados.
- Se requiere despliegue coordinado futuro: drenar escritores antiguos y publicar backend/frontend con V28.
  No se ha desplegado nada. No hay bypass para clientes que omiten preparacion.
- RESULT_UNAVAILABLE, datos historicos incompletos y comprobantes incompatibles requieren revision conservadora.
  Continuidad administrativa, transferencia de propietario y reconciliacion operativa pertenecen a B.
- No se añade scheduler, polling, borrado por TTL ni nuevas operaciones fiscales. No se altera el proveedor,
  firma ni integracion SUNAT/PSE/OSE. La QA unitaria inicial no identifico defectos criticos/altos; el gate
  E2E inicial identifica UX-01 alto y el gate correctivo posterior lo cierra con evidencia focal.
- Originales archivados MONEY-QA-0/AngularD y respaldos preservados. Principal/master y refs remotas intactos.
  Staging vacio; cambios funcionales/documentales locales de A, sin commit/push/PR/merge/tags.

## Inventario de archivos

Se relaciona el inventario final a continuacion; incluye solo implementacion, pruebas y documentacion de A.

67 archivos de implementacion/QA unitaria inicial. La primera intervencion E2E agrego ocho archivos QA
(total75). La correccion UX agrega cuatro rutas al inventario pendiente (total79); detalle al final.

- `backend/src/main/java/com/erppos/backend/erp/admin/cleanup/application/service/ProductCleanupPreviewApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/admin/cleanup/domain/port/ProductCleanupExecutePort.java`
- `backend/src/main/java/com/erppos/backend/erp/admin/cleanup/infrastructure/persistence/JdbcProductCleanupExecuteAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/application/service/AuditUserProvider.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/application/service/ElectronicDocumentApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/domain/port/BillingSaleReadPort.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/infrastructure/persistence/SalesBillingReadAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/infrastructure/persistence/SalesBillingSummaryReadAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/quotes/adapter/dto/ConvertQuoteToSaleRequest.java`
- `backend/src/main/java/com/erppos/backend/erp/quotes/application/service/QuoteSaleCommandFactory.java`
- `backend/src/main/java/com/erppos/backend/erp/quotes/infrastructure/persistence/QuotePersistenceAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/quotes/infrastructure/persistence/SalesFromQuoteAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/adapter/dto/CreateSaleRequest.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/adapter/dto/PrepareSaleOperationRequest.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/adapter/dto/SaleOperationResponse.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/adapter/rest/SaleOperationCacheControlFilter.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/adapter/rest/SaleOperationController.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/application/service/CashRegisterApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/application/service/SaleOperationApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/application/service/SaleRequestIdentity.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/application/service/SalesApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/application/usecase/PrepareSaleOperationCommand.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/application/usecase/ReceiptIntent.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/application/usecase/SaleOperationPageResult.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/application/usecase/SaleOperationResult.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/application/usecase/SaleOperationUseCase.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/domain/port/CashRegisterRepositoryPort.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/domain/port/CommercialOperationCoordinationPort.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/domain/port/SaleOperationPort.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/domain/port/SaleOperationRecoveryPort.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/domain/port/SaleRepositoryPort.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/domain/port/SalesBillingSummaryReadPort.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/infrastructure/persistence/CashRegisterPersistenceAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/infrastructure/persistence/CashRegisterSessionJpaRepository.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/infrastructure/persistence/CommercialOperationCoordinationAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/infrastructure/persistence/SaleJpaRepository.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/infrastructure/persistence/SaleOperationAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/infrastructure/persistence/SaleOperationRecoveryAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/sales/infrastructure/persistence/SalePersistenceAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/shared/adapter/rest/GlobalExceptionHandler.java`
- `backend/src/main/resources/db/migration/V28__durable_sale_operation_recovery.sql`
- `backend/src/test/java/com/erppos/backend/erp/admin/cleanup/ProductCleanupPreviewApplicationServiceTest.java`
- `backend/src/test/java/com/erppos/backend/erp/billing/BillingApplicationServiceTest.java`
- `backend/src/test/java/com/erppos/backend/erp/sales/SalesApplicationServiceTest.java`
- `backend/src/test/java/com/erppos/backend/integration/AbstractHttpIntegrationTest.java`
- `backend/src/test/java/com/erppos/backend/integration/CheckoutConfirmationIntegrationTest.java`
- `backend/src/test/java/com/erppos/backend/integration/PosMoneyIntegrationTest.java`
- `backend/src/test/java/com/erppos/backend/integration/PosMoneyPrecisionReproductionIntegrationTest.java`
- `backend/src/test/java/com/erppos/backend/integration/PosRecoveryCoordinationIntegrationTest.java`
- `backend/src/test/java/com/erppos/backend/integration/ProductCleanupPreviewIntegrationTest.java`
- `backend/src/test/java/com/erppos/backend/integration/SaleOperationRecoveryIntegrationTest.java`
- `backend/src/test/java/com/erppos/backend/integration/SaleOperationRecoveryMigrationTest.java`
- `docs/ai/CURRENT_STATUS.md`
- `docs/api/SALE_OPERATION_RECOVERY_API.md`
- `docs/qa/POS_RECOVERY_HARDENING_A_QA.md`
- `frontend/src/app/features/quotes/data/quote.service.ts`
- `frontend/src/app/features/quotes/quote-convert-page.component.spec.ts`
- `frontend/src/app/features/quotes/quote-convert-page.component.ts`
- `frontend/src/app/features/sales/components/sale-operation-recovery.component.spec.ts`
- `frontend/src/app/features/sales/components/sale-operation-recovery.component.ts`
- `frontend/src/app/features/sales/data/sale-operations.service.spec.ts`
- `frontend/src/app/features/sales/data/sale-operations.service.ts`
- `frontend/src/app/features/sales/pos-checkout-confirmation.spec.ts`
- `frontend/src/app/features/sales/pos-durable-recovery.spec.ts`
- `frontend/src/app/features/sales/pos-page.component.spec.ts`
- `frontend/src/app/features/sales/pos-page.component.ts`
- `frontend/src/app/features/sales/testing/sale-operation-double.spec.ts`

## QA E2E comercial posterior — gate detenido por defecto UX

Fecha local:2026-10-21 (artefactos del contenedor fechados en UTC 2026-10-22).
Resultado:`FAIL — POS_RECOVERY_A_E2E_QA`. Estado:`NOT_READY`.
No se declara A CLOSED ni READY_FOR_A_COMMIT_APPROVAL. No se corrigio codigo productivo.

### Entorno y aislamiento acreditados

- Chromium de Playwright1.61.1, Angular real mediante `ng serve`, Spring Boot/Java17 real y PostgreSQL16.
  Node22.23.3/npm10.9.9; dependencias del lockfile existente, sin cambios de versiones ni dependencias nuevas.
- Lanzador independiente `frontend/e2e/qa/run-recovery.mjs`; las suites no-write, sus fixtures, guardas,
  configuraciones y filtro existentes permanecen sin cambios.
- Namespace Docker `network:none`, solo loopback, sin rutas externas, puertos publicados, volumenes
  persistentes ni socket Docker. Root filesystem read-only, cap-drop ALL y no-new-privileges.
- PostgreSQL nuevo en tmpfs. Base/usuario `qa_<runId>`, marcador aleatorio, system_identifier, direccion,
  puerto y ausencia de tablas verificados antes de Flyway. Backend revalida la identidad JDBC; navegador
  verifica backend efectivo y proxy. Las consultas diagnosticas QA son fijas/parametrizadas y read-only.
- Ocho cajeros/cajas/productos independientes, usuario adicional para cambio de propietario, stock100,
  precio10 y cotizacion sintetica. Sin datos reales, `.env`, credenciales heredadas ni llamadas fiscales.
- Allowlist comercial exclusiva del launcher test-only. POST fiscal `/billing/documents/1/send` denegado405
  en el preflight. El navegador nuevo de recuperacion conserva las mismas guardas de origen/metodo/backend.
- Antes de arrancar, el primer intento rechazo `DB_PASSWORD` heredada. Se excluyeron DB_PASSWORD y
  DB_USERNAME solo del proceso hijo QA, sin leer valores ni modificar archivos/configuracion.
- Limpieza PASS por etiquetas/ownership: cuatro contenedores propios por ejecucion y tag de imagen propio
  retirados; copias stage propias retiradas; artefactos sanitizados conservados en cache ignorada.
  No se limpiaron caches globales Docker ni recursos ajenos.

Comando de lanzamiento (PowerShell, desde frontend del worktree A):

```powershell
Remove-Item Env:DB_PASSWORD,Env:DB_USERNAME
$env:PATH='C:\Users\USUARIO\AppData\Local\InkToyToolchains\node-v22.23.3;'+$env:PATH
node.exe e2e/qa/run-recovery.mjs
```

Preparacion backend del launcher, solo compilacion de soporte QA, sin ejecutar tests:
`mvnw.cmd -B -DskipTests test-compile dependency:copy-dependencies -DincludeScope=test -DoutputDirectory=target/e2e-deps`.
No se repitieron las339 pruebas backend ni las158 Angular acreditadas, ni se ejecuto un nuevo build productivo.

### Resultado exacto de la ultima ejecucion

Run:`50e250208b5e5ecb5d03412b`; workers1, retries0. Cinco PASS, un interrupted y dos no ejecutados.
El resumen JSON de Playwright agrupa los tres ultimos como skipped; progress.json distingue el interrupted.
No existen `.skip`, `.only` ni assertions eliminadas. La interrupcion fue deliberada ante el defecto visual,
no un mecanismo para presentar la suite como aprobada.

| Recorrido | Resultado | Evidencia efectiva |
| --- | --- | --- |
| POS normal, ticket, cantidad2, pago20 y doble clic | PASS | PREPARED observado antes del POST de checkout; una venta, un pago20, un movimiento de salida2, stock98, COMPLETED y caja original. Un POST prepare y uno sales. Cierre de caja: esperado20, contado20, diferencia0. |
| PREPARED confirmado en PostgreSQL, respuesta abortada despues del201 real | PASS | PREPARED original; cero ventas/pagos/movimientos; stock100; cero checkout automatico. Descubrimiento desde panel con la misma identidad. |
| Venta201 real, respuesta abortada, navegador nuevo sin sessionStorage | PASS | Venta unica y COMPLETED. Nueva autenticacion del mismo cajero; mismo resultado desde panel; cero POST comercial en el contexto nuevo; snapshot DB completo igual antes/despues (pagos, stock, caja y operacion). |
| Dos pendientes, seleccion y cancelacion | PASS | Seleccionar no ejecuta ventas; CANCELLED terminal (checkout409); segunda identidad PREPARED conservada y reanudada explicitamente con una venta/pago/movimiento. |
| Logout A / login B / regreso A | PASS | B no ve operaciones de A; GET de UUID ajeno404/no-store sin propietario ni receiptIntent. A vuelve a descubrir su PREPARED. Cero POST sales. |
| Boleta: serie/cliente, respuesta perdida de documento, DRAFT sin duplicar | INTERRUMPIDO | Pantalla real preparada con datos sinteticos; sin acreditacion de emision/recuperacion. Se detuvo al detectar superposicion del modal. |
| Factura: intencion/serie/cliente y DRAFT | NO EJECUTADO | No se acredita con este E2E. Evidencia unitaria previa no sustituye al recorrido de navegador. |
| Conversion de cotizacion desde UI real | NO EJECUTADO | No se acredita en esta intervencion. |

La suite no completa y el launcher termina con exit1 (`QA_RECOVERY_E2E_NOT_PASSED`), como corresponde.
Ejecuciones preliminares: `874530ad4f66da5fb1cf69f4` (2PASS/6FAIL por localizadores/sincronizacion QA y
extraccion de tmpfs), `ee9d917c7d63e98cf1163e1a` (1PASS/7FAIL por selectores QA), y
`8c61321ce341f4464328a5b5` (timeout del lanzador; no se suma como evidencia PASS).
No se suman repeticiones ni se ocultan esos fallos. Cada ejecucion utilizo una base nueva y termino con limpieza PASS.
Se incorporo progreso incremental y conservacion de capturas incluso en interrupcion. Tras detener la ultima
ejecucion, se ajusto el helper QA para reconocer las dos etiquetas reales `COBRAR`/`COBRAR Y EMITIR`;
esa variante electronica no fue reejecutada y no se acredita como PASS.

### Hallazgo confirmado: RECOVERY-E2E-UX-01 (alto, bloquea este gate)

A1366x768, sidebar expandido, el modal de cobro queda parcialmente por detras del sidebar. Se ocultan
el titulo y parte de la seleccion Ticket interno y de las etiquetas/controles izquierdos de comprobante.
No es una simulacion de UI: aparece en capturas del checkout real y de la respuesta perdida.

Diagnostico estatico coherente con la captura:

- `layout.component.ts`: `.sidebar` position relative/z-index5; `.workspace` position relative/z-index1.
- `pos-checkout-modal.component.ts`: backdrop fixed/z-index30 dentro de workspace. Ese30 no escapa al
  stacking context de su ancestro1 frente al sidebar5. Aumentar solo el z-index interno no resolveria ese contexto.
- Esos dos archivos no tienen cambios en A ni se modificaron durante esta QA. No se atribuye el origen del
  defecto a A; si es preexistente, igualmente impide acreditar el criterio operativo solicitado.

Las capturas de incertidumbre tambien muestran el mensaje de pagina detras del backdrop mientras el modal
permanece abierto. El boton RECUPERAR COBRO y Cerrar siguen disponibles, pero el mensaje debe revisarse
en una correccion UX autorizada; no se afirma que este problema haya duplicado o perdido ventas.

Se interrumpio Playwright mediante SIGINT en su propio contenedor, se conservaron capturas/progreso y se
retiro el entorno efimero. No se alteraron estilos, componentes, contratos ni logica funcional para sortear el defecto.
La interrupcion de boleta no demuestra por si misma un fallo de emision: el helper esperaba la etiqueta
de ticket; el defecto visual se confirma independientemente mediante capturas y los contextos CSS anteriores.

Viewport960x720: lista de pendientes legible y acciones operables con scroll; cancelacion y reanudacion
funcionaron. Foco inicial Conservar, Tab hacia Reanudar mismo cobro y Enter verificados. No se afirma
compatibilidad tactil de hardware real ni validacion visual exhaustiva. Desktop: COBRAR accesible y
deshabilitado durante la solicitud; prevencion de doble confirmacion acreditada, pero gate visual FAIL.

Artefactos locales (ignorados, no incluidos en Git), bajo
`frontend/.angular/cache/recovery-e2e/50e250208b5e5ecb5d03412b/evidence/`:

- `summary.json`, `progress.json` (sin tokens ni credenciales).
- `01-desktop-checkout.png`, `01-desktop-success.png`.
- `02-preparation-uncertain-modal.png`, `02-preparation-uncertain-recovered.png`.
- `03-sale-uncertain-modal.png`, `03-new-browser-recovered.png`.
- `04-small-pending-list.png`, `04-small-success.png`, `05-other-user-empty.png`.
- Captura de boleta al interrumpir: `failure-30aa606a427f81bc799b_bcd3b806bd515813b1c7.png`.

### Archivos nuevos de esta intervencion (ocho)

- `backend/src/test/java/com/erppos/backend/e2e/RecoveryQaApplication.java`
- `backend/src/test/java/com/erppos/backend/e2e/RecoveryQaConfiguration.java`
- `backend/src/test/java/com/erppos/backend/e2e/RecoveryQaFilter.java`
- `frontend/e2e/qa/run-recovery.mjs`
- `frontend/e2e/qa/recovery-reporter.ts`
- `frontend/playwright.recovery.config.ts`
- `frontend/e2e/helpers/recovery-commercial.ts`
- `frontend/e2e/specs/recovery/pos-recovery-commercial.spec.ts`

Unico archivo previo modificado durante esta intervencion:este informe. Las huellas SHA256 de los otros66
archivos de A coinciden con el preflight. Archivos no-write y dependencias/configuracion productiva intactos.
Master/principal siguen en77c53fa; staging vacio, sin commit/push/PR/merge/tag. Originales MONEY-QA-0,
Angular D y sus respaldos externos conservan sus SHA256 acreditados. No se inicia B.

Siguiente accion indicada en ese cierre historico:solicitar autorizacion independiente para corregir
RECOVERY-E2E-UX-01 y completar los tres recorridos pendientes. Esa autorizacion se recibio posteriormente;
la ejecucion correctiva se registra a continuacion.

## Correccion autorizada UX-01 y finalizacion focal — 2026-10-22

Resultado:`PASS — POS_RECOVERY_A_E2E_QA`. Estado:`READY_FOR_A_COMMIT_APPROVAL`.
No significa A CLOSED, commit, push, PR, merge, CI remoto ni despliegue.

### Correccion de presentacion

- Se eleva el contexto real `.workspace` de1 a6 solo mientras el modal de checkout esta abierto,
  por encima del sidebar5. No se incremento el z-index interno del backdrop para intentar escapar de su padre.
- Un selector acotado al host de layout eleva ese mismo contexto cuando hay otro dialogo aria-modal
  descendiente (p.ej. carrito completo); sus propios z-index se conservan. Cerrados los dialogos, vuelve a1.
  Rail/flyout y menu lateral conservan sus capas normales fuera de un dialogo.
- El checkout marca temporalmente sus ramas de fondo como inert, preservando el valor anterior. Se excluye
  el host de la confirmacion compartida, que mantiene su capa110 por encima del checkout.
- Foco inicial en Cerrar; Tab/Shift+Tab limitados a controles visibles/habilitados; la confirmacion compartida
  recibe la propiedad del foco cuando abre. Al cerrar se restauran inert, scroll y el launcher original.
  Destruir el componente tambien libera esos recursos de presentacion.
- Avisos de error y recuperacion dentro del cuerpo desplazable del modal, con alert/status y foco en el aviso.
  La preparacion/checkout inciertos indican conservar la operacion y consultar con RECUPERAR COBRO, no
  iniciar otra venta. Para una venta ya registrada se reutiliza receiptRecoveryMessage y la accion existente.
- No cambian payloads, peticiones, idempotencia, transiciones, correlativos, backend, Auth ni contratos.
  Alturas dvh/scroll interno mantienen cabecera y acciones accesibles en pantallas reducidas.

### Validacion proporcional y resultados

No se repitieron las339 pruebas backend, las158 Angular completas, las carreras PostgreSQL ni los cinco E2E
acreditados. La compilacion test-compile necesaria para arrancar el soporte QA usa `-DskipTests`.

Tests Angular focales del estado final:43PASS, 0FAIL, 0SKIPPED:

- `pos-checkout-modal.component.spec.ts`:8 nuevos casos de presentacion/aislamiento/foco/avisos/cleanup.
- `confirm-dialog.component.spec.ts`:10 casos de la confirmacion afectada por la convivencia de overlays.
- `pos-page.component.spec.ts`:25 casos, porque se modificaron sus bindings de presentacion al modal.

Primero se ejecutaron18 casos modal/confirmacion; el conjunto posterior43 los incluye, no se suman.

```powershell
npm.cmd test -- --include=src/app/features/sales/components/pos-checkout-modal.component.spec.ts --include=src/app/shared/dialogs/confirm-dialog.component.spec.ts --include=src/app/features/sales/pos-page.component.spec.ts
npm.cmd run build
```

Build Angular del CSS final:PASS (main-C6FWH544.js). `git diff --check`:PASS.

E2E con el mismo aislamiento fisico/JDBC/allowlist ya documentado, datos nuevos por ejecucion y retries0:

| Run | Seleccion y resultado | Alcance acreditado |
| --- | --- | --- |
| `8507613b0363555c1bf5307d` | `--pending-ux`:4PASS/1FAIL, sin skipped | Boleta, factura, cotizacion y aviso de preparacion incierta PASS. Smoke responsive fallo por una expectativa QA de foco tomada despues de llenar Monto. |
| `e2a0312fb4c6a14de39ff10f` | `--modal-ux`:1PASS/0FAIL/0SKIPPED | Smoke corregido:cuatro viewport/sidebar, foco, capas de confirmacion/carrito completo y cero escrituras comerciales. |

Son cinco escenarios nuevos distintos acreditados (tres pendientes y dos smokes), no una ultima suite
5/5 ni una repeticion de los cinco comerciales anteriores. El resultado global se obtiene reutilizando
la evidencia independiente que no cambia:el CSS adicional mantiene el mismo6 para checkout y solo amplía
esa elevacion condicional a otros overlays del workspace; no afecta reglas ni contratos comerciales.

- Boleta y factura:seleccion/serie/cliente reales; POST de creacion201 procesado por Spring/PostgreSQL
  antes de abortar la respuesta. Un documento DRAFT, tipo/serie/cliente correctos, intencion conservada,
  siguiente correlativo2 (inicial1), un solo POST de creacion. Reload sin sessionStorage y consulta desde
  Mis operaciones no crean otro documento; snapshot persistido completo identico antes/despues.
  Se muestra Borrador local; pendiente de procesamiento fiscal, sin atribuir aceptacion fiscal ni fallback a TICKET.
- Cotizacion:la intercepcion observa PREPARED, el mismo operationId y quoteId antes del POST real de conversion.
  COMPLETED y convertedSaleId enlazan una unica venta; un pago10, un movimiento1, stock99. Consulta posterior
  desde su propio panel no repite conversion y conserva el snapshot. Un POST de conversion y cero POST sales.
- Aviso incierto:PREPARED durable despues del201 real perdido, cero checkout; alert y RECUPERAR COBRO visibles
  en el modal, aviso enfocado. Cerrar conserva el snapshot y la misma identidad, sin venta ni nueva preparacion.
- Mensajes de checkout incierto y venta completada reutilizan los estados previamente acreditados:los bindings
  de presentacion ahora los muestran dentro del modal. No se repitio el recorrido comercial de perdida de venta.
  La recuperacion de documento perdido vuelve a localizar DRAFT y cierra el modal segun el flujo existente.
- UX:1366x768 expandido/compacto,960x720 y390x844. Titulo, Ticket/Boleta/Factura, Monto y accion primaria
  con hit-testing real; limites del dialogo dentro del viewport. Sidebar inert y sin foco, backdrop lo cubre.
  Tab/Shift+Tab, devolucion del foco al launcher, confirmacion superior y cierre sin POST comercial.
  Carrito completo conserva su capa correcta. Revision visual de las capturas realizada; no es una auditoria
  exhaustiva de todos los dialogos ni una prueba de hardware tactil o de todos los navegadores.

El helper reconoce COBRAR y COBRAR Y EMITIR. Las confirmaciones extensas colocan el foco en su titulo
accesible; las breves lo colocan en Cancelar. La expectativa se basa en ese contrato real, no en aceptar
cualquier foco. Se verifico el foco inicial del checkout antes de que el helper lo moviera a Monto.

### Evidencia visual, ubicacion y limitacion de cache

Artefactos actuales: `backend/target/recovery-e2e/<runId>/evidence/` (ignorado por Git).

En run8507613b0363555c1bf5307d: `summary.json`, `progress.json`,
`06-receipt-draft-recovered.png`, `06-invoice-draft-recovered.png`, `08-quote-conversion.png`,
`ux01-uncertain-notice-visible.png` y captura del fallo QA de foco.

En rune2a0312fb4c6a14de39ff10f: `summary.json`, `progress.json`,
`ux01-expanded-checkout.png`, `ux01-compact-checkout.png`, `ux01-small-checkout.png`,
`ux01-mobile-checkout.png`, `ux01-confirmation-above-checkout.png`, `ux01-other-full-cart-layer.png` y
`ux01-before-stacking-reconstruction.png`.

La ultima imagen es una RECONSTRUCCION CONTROLADA de la capa previa:en QA se fuerza temporalmente
workspace1 y sidebar no-inert, se comprueba que Ticket queda cubierto y se captura; despues se retira esa
inyeccion y se prueba la solucion real. No se presenta como el PNG original de la ejecucion anterior.

Limitacion real:al ejecutar build/test Angular se purgo la carpeta no-versionada anterior
`frontend/.angular/cache/recovery-e2e`. Las capturas/JSON originales de esa cache ya no estan disponibles
en disco. Se preservan integramente sus resultados y la descripcion de intentos fallidos en este documento
y en la conversacion; no se inventaron archivos originales ni se reejecutaron sus cinco casos aprobados.
El primer arranque de esta correccion (`25e926c43f8c59c76fdfc2e2`) fallo antes de negocio por esa purga
(NoClassDefFoundError de Spring, QA_READINESS_TIMEOUT). Se retiro todo recurso propio.
Se movieron stage/evidencia a backend/target, fuera del purgado Angular, manteniendo ownership por runId.
Un intento posterior (`25172e6d580c1d94105acd75`) encontro0 tests por anclar grep al inicio del titulo completo;
se corrigio el filtro sin ampliar el conjunto seleccionado. Ambos intentos no acreditan recorridos comerciales.

Los artefactos actuales sobrevivieron al build final. Siguen siendo temporales:archivarlos antes de un
futuro `mvn clean` o retirada del worktree. No se modificaron ni perdieron originales MONEY-QA-0/Angular D
ni sus respaldos externos; esa preservacion se verifica por SHA256 y no depende de la cache QA.

### Archivos de esta correccion y preservaciones

Nueve archivos tocados respecto del preflight de75:

- `frontend/src/app/shared/layout/layout.component.ts` (solo capas condicionales).
- `frontend/src/app/features/sales/components/pos-checkout-modal.component.ts` (presentacion, foco e inert).
- `frontend/src/app/features/sales/pos-page.component.ts` (solo bindings de avisos).
- `frontend/src/app/features/sales/components/pos-checkout-modal.component.spec.ts` (nuevo).
- `frontend/e2e/qa/run-recovery.mjs` (seleccion focal y ubicacion segura de artefactos).
- `frontend/e2e/helpers/recovery-commercial.ts` (localizadores/foco/capturas).
- `frontend/e2e/specs/recovery/pos-recovery-commercial.spec.ts` (pruebas pendientes/persistencia).
- `frontend/e2e/specs/recovery/pos-recovery-ux.spec.ts` (nuevo).
- Este informe QA.

Total Git pendiente:79 archivos; staging vacio. Backend comercial/fiscal, migraciones, Auth/JWT/RBAC,
servicios, dependencias y suites no-write sin modificaciones respecto del preflight. Principal/master y
origin/master en77c53fa3c4b33f3dff5271559409edd56a3f772a; sin cambios de ramas/worktrees ni publicaciones.
Cada entorno efimero retirado exclusivamente por sus etiquetas/ownership; sin contenedores QA de estas
ejecuciones pendientes. No se usa staging/produccion, proveedor fiscal real ni datos comerciales reales.
Originales archivados y respaldos conservan los SHA256 acreditados. No se inicia ninguna fase nueva.

Riesgos residuales:alcance local Chromium, no aceptacion fiscal/produccion ni auditoria integral de accesibilidad;
limitacion de cache historica indicada y necesidad de preservar artefactos actuales antes de limpieza futura.
Sin hallazgos criticos/altos pendientes en esta correccion focal. La siguiente accion minima es revision final
del diff/documentacion para solicitar autorizacion independiente de commit. No se ejecuta commit.

## Integracion comercial CI autorizada — 2026-10-22

Alcance exclusivo: soporte QA y un nuevo job `e2e-commercial` en el workflow existente. No cambia
logica productiva, contratos, dependencias, Dockerfiles ni suites no-write. No incluye publicacion,
workflow_dispatch, proteccion de master ni inicio de B.

### Correcciones y contrato del gate

- El launcher ejecuta `package` con `-DskipTests -Dmaven.jar.forceCreation=true`, preservando
  test-compile y copy-dependencies del lifecycle. Comprueba fecha de reconstruccion y SHA256 del JAR
  generado en esta ejecucion y ausencia de clases QA en el artefacto productivo. No ejecuta `clean`
  ni utiliza el JAR previo como entrada. No se repiten las suites backend acreditadas.
- Los ocho recorridos comerciales conservan sus fixtures1..8. Los dos UX usan exclusivamente9 y10,
  cada uno con usuario, caja, producto e inventario propios. Se comprueban10 identidades distintas,
  recursos distintos y estado inicial de los fixtures UX; no se depende del orden de los archivos.
- Inventario cerrado por archivo/titulo de los diez escenarios, sin duplicados ni sustituciones.
  Exit code0, resultado passed, expectedStatus passed, un solo intento/retry0 y estadisticas coherentes
  son obligatorios. Reporte vacio/incompleto, skips, interrupted, fallos y retries rechazan el gate.
- Timeouts configurados, no mediciones: Playwright global8min, comando Playwright10min, launcher35min,
  job45min. Se conserva workers1/retries0/forbidOnly. El deadline del launcher cancela el proceso activo
  y permite cleanup; una terminacion forzada o perdida del runner no garantiza ejecutar finally.
- `summary.json` es el manifiesto desde antes de la preparacion. Incluye runId, HEAD/dirty, versiones,
  IDs de imagen, fases/duraciones, JAR reconstruido/hash, resultados, errores sanitizados, aislamiento,
  cleanup y resultado final. HEAD+dirty no se presenta como commit de cambios aun no publicados.
  El PASS final requiere tambien progreso completo, evidencia legible y limpieza PASS.
- Solo se admiten summary/progress JSON y nombres de capturas sinteticas permitidas. Se rechazan
  symlinks/junctions en entradas/stage/evidencia, mounts no aprobados, PNG invalidos y campos privados
  o tokens evidentes en JSON. No se publican variables, inspect completo, stage, dumps ni logs crudos.
  La red de preparacion descarga dependencias; el runtime comercial conserva namespace network:none,
  loopback, PostgreSQL tmpfs, identidad revalidada, allowlist comercial y bloqueo de envio fiscal.

### Workflow y autorizaciones pendientes

El nuevo job es independiente, Ubuntu GitHub-hosted, contents:read, checkout sin credenciales
persistentes, Java17 y Node aprobado. Ejecuta `node e2e/qa/run-recovery.mjs` sin seleccion parcial.
La comprobacion de evidencia corre con always(); solo habilita upload tras verificar su allowlist y
sanitizacion, incluso si el manifiesto refleja FAIL. Falta de evidencia segura falla el job y no se sube.
Upload retiene7dias, error ante archivos ausentes, sin continue-on-error.

Los triggers originales push/pull_request y los jobs backend/frontend/e2e-auth se preservan completos.
No se agregan filtros de rutas, needs ni workflow_dispatch. El futuro check tendra contexto estable
e2e-commercial; no es obligatorio por existir en YAML. Acreditarlo en GitHub y luego requerirlo en
master son pasos independientes y este ultimo necesita autorizacion administrativa.

### Validacion local de esta integracion

Resultado: `BLOCKED — NOT_READY`. No se acredita `PASS — POS_RECOVERY_A_CI_LOCAL_QA`
ni READY_FOR_A_COMMIT_APPROVAL para este cierre. La implementacion CI local esta realizada, pero
la ejecucion integral encontro dos selectores ambiguos en un noveno archivo no autorizado.

Comando unico integral, desde frontend del worktree A (se excluyeron solo los nombres DB_PASSWORD y
DB_USERNAME del proceso hijo; no se leyeron valores ni se modifico .env):

```powershell
Remove-Item Env:DB_PASSWORD,Env:DB_USERNAME -ErrorAction SilentlyContinue
$env:PATH='C:\Users\USUARIO\AppData\Local\InkToyToolchains\node-v22.23.3;'+$env:PATH
node.exe e2e/qa/run-recovery.mjs
```

Run:`1230661c37f4850796df07bf`, seleccion full, exit1. Diez escenarios ejecutados una sola vez:
8PASS, 2FAIL, 0SKIPPED, 0INTERRUPTED, 0RETRIES. Ambos UX PASS con fixtures9/10 propios.

| Recorrido | Resultado actual |
| --- | --- |
| POS normal, doble confirmacion, persistencia y cierre/conciliacion de caja | PASS |
| Preparacion201 confirmada con respuesta perdida (E2E2) | FAIL QA: locator de texto resuelve dos elementos |
| Venta201 confirmada con respuesta perdida (E2E3) | FAIL QA: locator de texto resuelve dos elementos |
| Varias pendientes, cancelacion y reanudacion | PASS |
| Cambio de propietario y aislamiento | PASS |
| Boleta DRAFT sin duplicacion | PASS |
| Factura DRAFT sin duplicacion | PASS |
| Conversion de cotizacion | PASS |
| UX capas/foco/responsive | PASS |
| UX aviso de preparacion incierta | PASS |

Trazas exactas: `pos-recovery-commercial.spec.ts:31` usa getByText global para
`No se confirmó la respuesta de preparación`; la linea43 hace lo mismo para
`No hay conexion con el servidor. Verifica que el backend este activo.`. Ambos textos estan presentes
en el aviso de pagina y en el alert dentro del dialogo Cobrar venta despues de la correccion UX previa.
Playwright rechaza esos locators por strict mode, antes de sus assertions posteriores de recuperacion.
No se acredita ese tramo posterior en esta ejecucion ni se atribuye una duplicacion comercial al fallo.

Ese spec NO esta autorizado en esta intervencion y conserva su SHA256 del preflight. No se modifico,
no se altero el helper para ocultar la ambiguedad ni se debilitaron assertions. No se repitio la suite.
La correccion minima pendiente requiere autorizacion separada para acotar esas dos expectativas al
alert del modal y volver a ejecutar una suite integral completa; no modificar codigo productivo.

Aislamiento PASS antes de negocio:10 usuarios/cajas/productos distintos, fixtures UX sin ventas/pagos/
movimientos y stock100; PostgreSQL tmpfs con identidad comprobada antes de Flyway y en JDBC; namespace
solo loopback, host inaccesible, sin puertos/volumenes persistentes/socket; envio fiscal denegado405.
Limpieza PASS: cuatro contenedores propios, tag de imagen y stage retirados por ownership. Inventario
posterior por runId vacio. No se limpiaron caches globales ni recursos ajenos.

JAR reconstruido por package/forceCreation en20.932s; size93346903bytes,
SHA256:`c08b0c7d4448a7c1129f99360bd232237cb3eb0d7d1ee0b19e827e50c0579f8b`.
Ausencia de clases e2e/RecoveryQa en el JAR comprobada. Java17.0.18/Maven3.9.14,
Node22.23.3/npm10.9.9, Docker29.8.2 y Playwright1.61.1 registrados junto con los IDs de imagen.

Tiempo total local medido:154801ms (2min34.801s), con caches existentes. Fase comercial:30168ms;
backend/Angular startup:66366ms; evidencia/cleanup:13280ms. Son observaciones locales, no estimacion
de runner GitHub frio ni SLA. Muestra Docker al final, NO picos:12.88MiB,118.4MiB,757MiB,1.194GiB
para los cuatro contenedores; CPU0.00%,0.03%,0.14%,0.29%. No se midieron picos ni consumo acumulado.

Artefactos ignorados en `backend/target/recovery-e2e/1230661c37f4850796df07bf/evidence/`:
summary.json (manifiesto final FAIL/aislamiento PASS/cleanup PASS), progress.json y18PNG sinteticos
allowlisted, incluyendo las dos capturas de fallo. Lectura segura/allowlist/PNG/campos privados PASS.
El verificador final rechaza expresamente este manifiesto FAIL; no permite presentarlo como PASS.

Comprobaciones estaticas con herramientas ya disponibles:

- `node --check frontend/e2e/qa/run-recovery.mjs`:PASS.
- js-yaml existente:parse YAML y comparacion estructural profunda; triggers y los tres jobs originales
  identicos al preflight, un unico job adicional. Sin workflow_dispatch, needs ni filtros nuevos.
- TypeScript existente:syntax transpilation de config/helper/spec UX y JavaScript embebido del workflow
  PASS. No equivale a una ejecucion de GitHub ni a actionlint (no disponible; no se instalo).
- Validadores puros exportados:2 controles positivos sinteticos y24 controles negativos PASS;
  rechazan reportes vacios/incompletos, escenarios faltantes/duplicados/sustituidos, archivo incorrecto,
  skip/interrupted/fail/retry/expected-failure, exit no cero, errores globales/estadisticas inconsistentes,
  cleanup FAIL, estado RUNNING, metadata ausente, JAR no fresco y progreso incompleto/duplicado.
  Ninguno ejecuta Docker ni negocio. La evidencia REAL del run fallido tambien se rechaza para aprobacion.
- No se repitieron339 tests backend,158 Angular, build Angular ni suites no-write/comerciales adicionales.

La primera ejecucion real en GitHub permanece pendiente de publicacion autorizada. Tampoco se activa
el nuevo required check ni se modifica master. Siguiente accion unica:autorizar la ampliacion focal al
spec comercial para corregir sus dos selectores y permitir otra ejecucion integral. No publicar cambios.

Postflight: `git diff --check` PASS;80 archivos pendientes (79 iniciales mas ci.yml), staging vacio.
Comparacion SHA256 contra el preflight:solo los ocho archivos autorizados cambian en esta intervencion;
ninguna ruta previa desaparece y las demas huellas se conservan. Ramas/refs intactas; principal/master
limpio y HEAD/master/origin-master siguen en77c53fa3c4b33f3dff5271559409edd56a3f772a.
Originales MONEY-QA-0/Angular D archivados y sus respaldos mantienen los SHA256 acreditados
9571F10A...DDB8497D y574D7244...7479D62. Sin commit/push/PR/merge/tag ni operaciones adicionales.

Archivos autorizados (ocho): `.github/workflows/ci.yml`, `frontend/e2e/qa/run-recovery.mjs`,
`frontend/playwright.recovery.config.ts`, `RecoveryQaConfiguration.java`, `RecoveryQaFilter.java`,
`frontend/e2e/helpers/recovery-commercial.ts`, `frontend/e2e/specs/recovery/pos-recovery-ux.spec.ts`
y este informe. Las dos clases Java pertenecen exclusivamente a backend/src/test/.../e2e.

## Correccion focal de dos selectores y gate integral — 2026-10-22

Autorizacion posterior limitada a `frontend/e2e/specs/recovery/pos-recovery-commercial.spec.ts`
y este informe. Estado inicial:80 archivos pendientes, staging vacio, rama feat/pos-recovery-hardening-a
y HEAD/master/origin-master77c53fa3c4b33f3dff5271559409edd56a3f772a. Sin cambios ajenos respecto
del cierre anterior. El historial8PASS/2FAIL del run1230661c37f4850796df07bf se conserva integro.

### Causa comprobada antes de editar

Las trazas del run anterior identifican exactamente dos coincidencias por consulta:un parrafo de error
en `.message-stack` y un `p role="alert"` dentro del dialogo `Cobrar venta`. Ambos representan el mismo
activeErrorMessage. El modal tiene role=dialog, aria-modal=true y titulo accesible Cobrar venta.

La inspeccion focal del template y de checkoutPanel confirma que `.pos-shell` (que contiene el aviso
de pagina) es una rama hermana del host del modal y queda inert mientras este esta abierto. Esto cubre
tambien mensajes insertados posteriormente dentro de esa rama. El parrafo de error de pagina no tiene
role alert ni aria-live; el aviso de error activo es el alert del modal. El status del modal contiene una
instruccion complementaria de recuperacion, no un segundo anuncio del mismo error. La confirmacion
compartida se excluye deliberadamente del fondo inert y el foco modal se restaura al terminarla.

No se encontro un nuevo defecto de accesibilidad/comunicacion que justificara alterar producto.
La presencia de ambos textos en el DOM explica la ambiguedad de getByText global, no una obligacion
de esconder el mensaje de pagina mediante un cambio funcional. Esta es una revision focal; no se
presenta como prueba exhaustiva con lectores de pantalla.

### Cambio exacto autorizado

- E2E2: getByText global pasa a dialog Cobrar venta exacto -> role alert -> mismo patron de texto de
  preparacion incierta. Se conserva toBeVisible y todas las assertions PREPARED/identidad/stock/POST.
- E2E3: dialog Cobrar venta exacto -> role alert -> regex anclado al texto completo original de conexion,
  con sus puntos escapados. Mantiene la coincidencia exacta, visibilidad, nueva sesion de navegador,
  propietario, mismo resultado COMPLETED, igualdad del snapshot y ausencia de POST adicionales.

Comparacion automatizada del texto normalizado:revertir solo esas dos expresiones reproduce exactamente
el spec del preflight. Ninguna otra assertion, fixture, intercepcion o escenario cambia. Sin first/last/nth
introducidos para resolver estos avisos, esperas fijas, skips, only ni retries. Sintaxis del spec PASS;
el inventario estricto del launcher mantiene los mismos diez escenarios. No se repiten los24 negativos.

### Ejecucion integral y resultado

Resultado:`BLOCKED — NOT_READY`. No se acredita PASS — POS_RECOVERY_A_CI_LOCAL_QA ni
READY_FOR_A_FINAL_REVIEW. Los dos selectores superaron sus verificaciones, pero E2E2 encontro un
bloqueo posterior de interaccion, fuera de la correccion de selectores autorizada.

Comando unico, desde frontend y con el mismo launcher sin cambios/sin filtros:

```powershell
Remove-Item Env:DB_PASSWORD,Env:DB_USERNAME -ErrorAction SilentlyContinue
$env:PATH='C:\Users\USUARIO\AppData\Local\InkToyToolchains\node-v22.23.3;'+$env:PATH
node.exe e2e/qa/run-recovery.mjs
```

Run:`635b5d7259b233abdf780e18`, seleccion full, exit1. Diez escenarios exactos identificados,
sin duplicados ni sustituciones:9PASS,1FAIL(timeout),0SKIPPED,0INTERRUPTED,0RETRIES, un intento cada uno.

| Escenario obligatorio | Resultado individual |
| --- | --- |
| E2E1 POS normal, doble confirmacion, venta/pago/stock y cierre de caja | PASS |
| E2E2 preparacion confirmada con respuesta perdida | FAIL:timeout al abrir recuperacion despues de cerrar modal |
| E2E3 venta confirmada con respuesta perdida y navegador nuevo | PASS |
| E2E4 pendientes independientes, cancelacion y reanudacion | PASS |
| E2E5 cambio de propietario y recuperacion del original | PASS |
| E2E6 RECEIPT, serie/cliente y DRAFT unico | PASS |
| E2E6 INVOICE, serie/cliente y DRAFT unico | PASS |
| E2E6 conversion real de cotizacion | PASS |
| UX01 capas/foco y cuatro configuraciones viewport/sidebar | PASS |
| UX01 aviso incierto perceptible y cierre conservando identidad | PASS |

En E2E2 el nuevo locator encuentra el alert correcto; despues pasan las verificaciones PREPARED,
identidad, cero ventas/pagos/movimientos, stock100 y cero POST checkout. Se cierra el modal y falla
el paso siguiente, `selectOperation` de la linea35. La traza en `recovery-commercial.ts:98` encuentra
el boton Recuperar operaciones visible/habilitado/estable, pero `section.ui-card.pos-page` intercepta
los eventos de puntero repetidamente. El test termina por su timeout de60000ms. No es la ambiguedad
de texto anterior ni un fallo resuelto por first/force-click/esperas adicionales.

La captura de fallo muestra el modal cerrado y el boton Recuperar operaciones visible. El componente
de recuperacion vive en pos-utility-header, otra rama que el modal hace inert mientras abre. La
restauracion del fondo inert al cerrar es una hipotesis a inspeccionar, NO una causa raiz dinamicamente
demostrada:el entorno ya se retiro y no se autoriza otra reproduccion ni una correccion funcional aqui.
No se oculta este bloqueo mediante otro selector, cambio de helper, fuerza de clic o cambio de flujo.

E2E3 ya acredita el recorrido completo:venta unica y COMPLETED, autenticacion del propietario en un
contexto nuevo sin sessionStorage, consulta GET sin POST comercial y snapshot DB original identico.
Los demas escenarios PASS conservan sus assertions de stock/pagos/movimientos/caja, cancelacion,
ownership, documento DRAFT y correlativo sin duplicar, conversion unica y UX/foco. E2E2 NO acredita
la apertura/seleccion final de la operacion desde ese boton en esta ejecucion.

PostgreSQL aislado PASS y limpieza PASS. Namespace network:none/solo loopback, identidad de DB y
backend/proxy, diez fixtures distintos y frescura UX verificados; envio fiscal denegado. JAR generado
de nuevo por package/forceCreation, sin usar resultados ni DB de la ejecucion anterior. Las caches de
dependencias disponibles son una optimizacion, no sustituyen fuentes, compilacion ni tests reales.
Cuatro contenedores, tag de imagen y stage propios retirados; inventarios por runId vacios.

Tiempo total observado:205530ms (3min25.530s); fase comercial90138ms incluyendo el timeout de E2E2,
startup66101ms, package12582ms y evidencia/cleanup12987ms. No se extrapola a GitHub ni a caches frias.

Artefactos ignorados en `backend/target/recovery-e2e/635b5d7259b233abdf780e18/evidence/`:
summary.json, progress.json y20PNG sinteticos permitidos (22archivos). Se conservan las capturas
02-preparation-uncertain-modal y03-sale-uncertain-modal/03-new-browser-recovered. Captura del nuevo
bloqueo:`failure-30aa606a427f81bc799b_7e9ab277ddb90241bbcf.png`, revisada visualmente.
Manifiesto completo con resultado FAIL, aislamiento PASS, cleanup PASS, duraciones/versiones/JAR
actual y resultados individuales. Allowlist/sanitizacion/lectura de evidencia PASS; verificador final
rechaza este manifiesto para aprobacion, como corresponde. El run historico8PASS/2FAIL sigue legible
y sin cambios; las24 comprobaciones negativas anteriores se conservan, no se repiten ni se suman.

No se repitieron builds/suites backend/Angular ni ejecuciones comerciales adicionales. No se afirma
CI real en GitHub ni ausencia exhaustiva de defectos de accesibilidad. El nuevo bloqueo requiere una
revision focal de interaccion/restauracion del fondo al cerrar el checkout con preparacion incierta,
mediante autorizacion independiente. No se implementa esa revision ni ninguna correccion adicional.

Postflight de esta correccion: `git diff --check` PASS;80 archivos pendientes, staging vacio.
Comparacion SHA256:solo este informe y el spec comercial cambian respecto del preflight actual;
implementacion, workflow, helpers, fixtures y controles no-write intactos. Sin rutas eliminadas.
Ramas/refs/worktrees iguales; principal/master limpio. Los cuatro hashes de originales archivados
MONEY-QA-0/Angular D y respaldos coinciden con los acreditados. Sin commit, push, PR, merge o tags.

## Correccion definitiva de checkoutPanel y gate comercial integral — 2026-10-23

Resultado: `PASS — POS_RECOVERY_A_CI_LOCAL_QA`; estado `READY_FOR_A_FINAL_REVIEW`.
No implica CLOSED, commit, publicacion, CI remoto ni aprobacion administrativa de un required check.

### Alcance, preflight y causa acreditada

Autorizacion limitada a este informe, `pos-checkout-modal.component.ts` y su spec.
Rama feat/pos-recovery-hardening-a; HEAD/master/origin-master
77c53fa3c4b33f3dff5271559409edd56a3f772a;80 archivos pendientes y staging vacio.
Las80 huellas SHA256 coincidieron con el postflight del diagnostico. No habia cambios ajenos.

El diagnostico aislado previo (sin HTTP ni operaciones comerciales) confirmo la reentrada de
checkoutPanel para el MISMO nodo al aparecer el aviso de incertidumbre. La inicializacion repetida
sobrescribia los originales de inert, foco, overflow y elevacion. releaseDialog SI se ejecutaba y el
modal salia del DOM, pero restauraba inert=true y overflow=hidden; no era un backdrop residual.
elementFromPoint devolvia section.ui-card.pos-page y el boton de recuperacion no podia recibir foco.

Se conserva fuera del repositorio el harness y los14 eventos completos en
`C:\Users\USUARIO\InkToyBackups\diagnostics\pos-recovery-modal-20261023`.
La prueba diagnostica original fallo en cuatro assertions de restauracion, como evidencia del defecto.
No se repitio ese diagnostico en esta correccion ni se retuvo un harness temporal en src.

### Correccion minima aplicada

- Guard de identidad DOM:un setter repetido para el mismo panel retorna sin recapturar originales.
- Un panel realmente distinto libera la propiedad anterior antes de adquirir el nuevo.
- Un contador local de generacion invalida microtareas de foco de ciclos anteriores.
- Se preserva transitoriamente el invocador si hay una reapertura antes de concluir la restauracion
  de foco encolada; una nueva generacion impide que el cierre viejo interrumpa al panel nuevo.
- El cleanup conserva inert preexistente, restituye overflow exacto y la clase original del shell,
  vacia los registros/referencias y restaura foco solo si el destino sigue conectado, habilitado y
  fuera de un subarbol inert. La confirmacion compartida conserva prioridad.
- El enfoque requiere un panel conectado y abierto; no enfoca un aviso retirado o de otra generacion.

Sin cambios de CSS, z-index, pointer-events, plantilla comercial, importes, pagos, persistencia,
identidades, rutas, servicios, Auth, backend ni CI en esta intervencion. No se elimina inert ni se
introducen dependencias o un gestor global de modales.

### Regresion Angular focal

Comando final desde frontend, con Node22.23.3/npm10.9.9 existentes:

```powershell
$env:PATH='C:\Users\USUARIO\AppData\Local\InkToyToolchains\node-v22.23.3;'+$env:PATH
npm.cmd test -- --include=src/app/features/sales/components/pos-checkout-modal.component.spec.ts --include=src/app/shared/dialogs/confirm-dialog.component.spec.ts --include=src/app/features/sales/pos-checkout-confirmation.spec.ts
npm.cmd run build
```

Resultado final unico del conjunto focal:99PASS,0FAIL,0SKIPPED; exit0.
Incluye16 casos del modal (los8 previos conservados y8 regresiones nuevas),10 de confirmacion
compartida y73 de checkout/recuperacion/credencial vinculada. No se ejecutaron las158 pruebas Angular
anteriores como suite completa ni los339 tests backend/carreras PostgreSQL.

Las regresiones verifican apertura y aislamiento inicial, repeticion del setter real, reentrada
Angular al insertar aviso, cierre normal desde el boton, hit-testing de Recuperar operaciones,
restauracion del launcher y foco posterior en recuperacion, confirmacion compartida real, valores
preexistentes inert/overflow/clase, reapertura, destruccion y reemplazo DOM mediante el contrato
publico del setter. Tambien cubren microtareas pendientes, Escape condicionado y mantienen
Tab/Shift+Tab, outputs y validaciones de comprobante existentes.

Se conservan las comprobaciones previas, sin skip/only ni assertions comerciales eliminadas.
Durante el desarrollo hubo ejecuciones focales96PASS/3FAIL y98PASS/1FAIL; un aislamiento posterior
del spec dio15PASS/1FAIL. Los fallos del nuevo montaje se corrigieron sin relajar assertions:
el launcher debe ser un hermano aislado y TestBed retira hosts previos al crear otra fixture, por lo
que ambos hosts reales deben reinsertarse en el shell sintetico. Se alineo ademas la secuencia del
nuevo test con confirmacion -> resultado incierto. El caso genuino de cierre/reapertura inmediata
motivo preservar el invocador pendiente. La ejecucion final99/99 acredita la fuente definitiva;
las repeticiones no se suman como casos distintos.

Build de produccion Angular:PASS, exit0;14.236s de compilacion, main-4RM6WCKJ.js,
salida frontend/dist/erp-pos-frontend. Se acredita compilacion de producto tras el cambio TypeScript.
No se instalaron ni actualizaron dependencias en el repositorio.

### Unica ejecucion integral comercial de esta autorizacion

Comando exacto desde frontend, sin argumentos de seleccion:

```powershell
Remove-Item Env:DB_PASSWORD,Env:DB_USERNAME -ErrorAction SilentlyContinue
$env:PATH='C:\Users\USUARIO\AppData\Local\InkToyToolchains\node-v22.23.3;'+$env:PATH
node.exe e2e/qa/run-recovery.mjs
```

Las dos variables heredadas se retiraron solo del proceso PowerShell lanzador, sin leer sus valores
ni tocar .env/configuracion persistente. Se mantuvo rejectInherited fail-closed, no se debilito.

Run:`8c6423eed9adae6a41653cc9`; selection full; exit0. Resultado integral10PASS,0FAIL,
0SKIPPED,0INTERRUPTED,0RETRIES; exactamente los10 nombres/archivos obligatorios, un intento por caso.
La fuente estaba dirty sobre el SHA base, como registra el manifiesto; no es un commit nuevo.

| Escenario exacto | Resultado | Duracion individual ms |
| --- | --- | ---: |
| E2E 1 normal POS: preparation precedes one sale, stock/payment/cash persist | PASS | 7404 |
| E2E 2 committed PREPARED response lost: no automatic checkout, same identity recovered | PASS | 2685 |
| E2E 3 committed sale response lost: empty new browser context discovers same result without POST | PASS | 4208 |
| E2E 4 two independent pending operations: select, cancel terminal identity and serve next purchase | PASS | 2954 |
| E2E 5 user switch: foreign operation hidden and 404, original owner recovers | PASS | 4052 |
| E2E 6 RECEIPT: original series/customer survive lost document response, DRAFT recovered once | PASS | 3636 |
| E2E 6 INVOICE: original series/customer survive lost document response, DRAFT recovered once | PASS | 2949 |
| E2E 6 quote consumer: real UI prepares then converts through original route once | PASS | 2452 |
| UX 01 modal stacking, ticket controls and focus at four viewport/sidebar configurations | PASS | 4736 |
| UX 01 uncertain preparation notice stays perceptible in the modal and closing preserves its identity | PASS | 2177 |

E2E2 verifica PREPARED durable tras abortar la respuesta real de preparacion, aviso incierto visible,
cero ventas/pagos/movimientos, stock100 y ningun POST checkout. Despues cierra checkout mediante su
boton normal, pulsa Recuperar operaciones normalmente y selecciona el MISMO UUID original, que sigue
PREPARED. No hay nueva venta ni reanudacion automatica. La captura recuperada muestra el modal
cerrado, panel de operaciones y accion explicita para reanudar la identidad original.

La restauracion exacta de inert/overflow/clase y foco tras incertidumbre se acredita en Angular;
E2E2 acredita el clic humano normal y la identidad durable, sin afirmar una assertion de foco que ese
spec no contiene. El escenario UX de cuatro viewport/sidebar tambien acredita el foco al launcher,
Tab/Shift+Tab, capas, carrito completo y convivencia con confirmacion compartida. El ultimo UX
verifica aviso enfocado/perceptible y snapshot comercial identico tras cerrar.
No se modificaron specs/helpers E2E ni se uso fuerza, dispatchEvent para clicar, sleeps arbitrarios,
selectores relajados, mocks de persistencia, skips o retries en esta intervencion.

Los demas escenarios conservan sus assertions de persistencia:venta/pago/stock/caja reconciliados,
recuperacion COMPLETED sin otro POST, pendientes independientes y cancelacion terminal, ownership,
serie/cliente originales con un DRAFT/correlativo, y conversion real de cotizacion unica.

### Aislamiento, manifiesto, evidencia y limpieza

Aislamiento PASS y limpieza PASS. Runtime comercial en namespace network:none, solo loopback,
sin rutas/puertos/volumenes externos; host decoy inaccesible. PostgreSQL16 efimero comprobado por
label/marker/system ID antes de Flyway, revalidacion JDBC/backend/proxy, diez fixtures sinteticos con
recursos distintos y allowlist comercial test-only. Envio fiscal denegado; sin staging/produccion.
Package de backend lo realizo el launcher con skipTests y forceCreation:es preparacion indispensable
del runtime, no una repeticion de la suite backend. JAR fresco de93346903bytes,
SHA256 `9cbd492d2faf38f2d8f70ceccb63d801f4d67ba23cc40058667799b33677546b`, sin clases QA en el artefacto productivo.

Artefactos:
`backend/target/recovery-e2e/8c6423eed9adae6a41653cc9/evidence/`.
summary.json completo (schema1, phase completed, result/isolation/cleanup PASS, errors vacio),
progress.json con10 PASS unicos y20PNG permitidos (22archivos). Lectura sanitizada y
validateRecoveryEvidence PASS despues del launcher; no se trata una evidencia parcial como aprobada.
Se revisaron visualmente02-preparation-uncertain-modal.png y02-preparation-uncertain-recovered.png.
Las evidencias historicas FAIL/PARTIAL y los runs anteriores permanecen conservados.

Duracion total observada:186597ms (3min6.597s);fase comercial39022ms,
startup77412ms, package19513ms y evidencia/cleanup21921ms. No es una estimacion de GitHub o caches frias.
El manifiesto incluye versiones e IDs de imagen;Node22.23.3/npm10.9.9, Java17.0.18,
Maven3.9.14, Docker29.8.2 y Playwright1.61.1. La muestra de recursos es de fin de tests, NO de pico.

Los4 contenedores propios, la imagen etiquetada y el stage se retiraron por ownership/runId.
Verificacion adicional de solo lectura:inventarios Docker de contenedores/imagenes por este runId
vacios y stage inexistente. No se limpiaron recursos ajenos.

### Riesgos residuales y estado Git

No quedan bloqueos criticos/altos conocidos en los recorridos acreditados. Esto no es una auditoria
exhaustiva de accesibilidad/lectores de pantalla ni una garantia de todos los navegadores.
La primera ejecucion real del job e2e-commercial en GitHub sigue pendiente de publicacion autorizada;
no se afirma CI remoto PASS ni se modifica proteccion de master.

Postflight:git diff --check PASS;80 archivos pendientes, staging vacio. Solo los3 archivos
autorizados cambian de huella respecto de este preflight;los otros77 permanecen identicos.
Principal/master limpio, HEAD/master/origin-master y refs/ramas/worktrees sin cambios.
Originales MONEY-QA-0/Angular D archivados y sus respaldos conservan los4 SHA256 acreditados
9571F10AF87F1A852939AD29DF6E2A438AE00F631102D981D653BC97DDB8497D y
574D7244D6B412D352F90228C843E5E3C96B48E48F4AB80FE6F9FF6FA7479D62.
Sin commit/push/PR/merge/rebase/tag, cambios CI/infra o nuevas fases.

Siguiente accion unica:revision final local de A, con autorizacion independiente. No hacer commit
ni publicar bajo esta autorizacion;no declarar POS-RECOVERY-HARDENING-A CLOSED.
