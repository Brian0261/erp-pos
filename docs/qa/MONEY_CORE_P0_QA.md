# MONEY-CORE-P0 - Implementacion y QA local definitiva

Actualizado: 2026-10-15 (America/Lima).

**PASS_LOCAL - MONEY-CORE-P0 VALIDADA LOCALMENTE.** Implementacion y QA local completas dentro del alcance P0. Publicacion y Git/CI remoto pendientes; este resultado no declara la fase CLOSED ni autoriza commit, push, PR o merge.

## Git, aislamiento y preservacion

- Base/HEAD/master/origin-master: d24ce4fb10c60dc29f7f662e258f755a8edcc136.
- Rama original: test/money-integrity-p0-repro; ambos tests originales intactos y untracked.
- Rama local: fix/money-core-p0.
- Worktree: C:/Users/USUARIO/InkToyWorktrees/money-core-p0.
- Respaldo: C:/Users/USUARIO/InkToyBackups/money-core-p0-960694fe-8aeb-4f27-b1b0-61129c6ddf83.
- Ambos respaldos verificados antes de crear worktree. Copia backend inicialmente identica.
- Angular D no fue copiado. Originales y respaldos verifican los mismos SHA-256 al finalizar.
- Los hashes originales de la tabla tambien corresponden a sus respaldos; la copia backend adaptada del worktree es un archivo distinto y autorizado.
- Staging vacio; sin commits nuevos. La preparacion documental solo actualiza este informe, `docs/ai/CURRENT_STATUS.md` y `docs/ai/CHANGE_CONTROL.md`.

| Archivo | SHA-256 |
|---|---|
| PosMoneyPrecisionReproductionIntegrationTest.java | 9571F10AF87F1A852939AD29DF6E2A438AE00F631102D981D653BC97DDB8497D |
| pos-money-precision-repro.spec.ts | 574D7244D6B412D352F90228C843E5E3C96B48E48F4AB80FE6F9FF6FA7479D62 |

## Objetivo y alcance implementado

Corregir A/B/C y establecer un contrato compartido de precision monetaria y cantidades para catalogo, ventas/POS, caja y cotizaciones, con persistencia/conciliacion coherentes y rollback real. Mantener compatibles los historicos sin recalcularlos ni operar sobre datos comerciales; el frontend de esta fase se limita a contratos/modelos y administracion de unidades, no a resolver Angular D ni redisenar checkout.

- CommercialMoneyPolicy pura: exactitud a escala dos con UNNECESSARY, signos/capacidad NUMERIC(14,2), ceros redundantes admitidos y HALF_UP solo para bruto derivado por linea.
- Bruto = HALF_UP(precio por cantidad, 2); descuento exacto entre cero y bruto; neto = bruto menos descuento; total = suma de netos.
- Lineas con precio positivo que redondearian a cero se rechazan. Precio cero explicito y descuento completo conservan gratuidad legitima.
- QuantityPolicy: WHOLE/LEGACY_UNCLASSIFIED permiten enteros; DECIMAL_2 hasta dos decimales; cantidades positivas y capacidad NUMERIC(16,3), sin redondeo.
- NULL almacenado se mapea a LEGACY_UNCLASSIFIED, sin fallback para valores desconocidos. Crear exige clasificacion; update omitido/null conserva; no se admite desclasificacion administrativa.
- Mutaciones administrativas de unidades bloquean fila en transacciones cortas; cambios de nombre/estado conservan clasificacion.
- UnitController mantiene RBAC/endpoints y utiliza un handler local 400 para JSON/enum invalido mediante ApiError existente, sin exponer detalles del parser.
- Producto e importacion validan precios antes de persistir; errores por fila preservados.
- Ventas/cotizaciones obtienen politica de UnitUseCase; no confian en clasificacion del cliente.
- Ventas normalizan dinero antes del primer save, suman netos, limitan pagos electronicos y calculan vuelto exclusivamente desde efectivo.
- Apertura/cierre de caja validan exactitud/capacidad y conservan formula de efectivo neto existente.
- Inventario/void historico no se reinterpreta: cantidad persistida, sin modificar normalizacion global ni columnas.
- Cotizaciones usan calculo compartido; conversion valida tambien consistencia historica sin revalorar ni reescribir. Sigue pasando por SalesUseCase.
- Angular acotado a tipos y selector administrativo sin preseleccion; edicion legacy conserva clasificacion. Respuesta POS aditiva/opcional para compatibilidad con respuestas cacheadas antiguas.

## V26 y compatibilidad

V26 agrega units.quantity_policy VARCHAR(16) nullable y CHECK NULL/WHOLE/DECIMAL_2. Sin default, backfill, inferencias ni cambios de columnas monetarias o inventario.
**Flyway/PostgreSQL real PASS**: `UnitQuantityPolicyMigrationTest` se ejecuto satisfactoriamente dentro de la suite integral; V26 se aplica desde V25 y conserva la compatibilidad legacy. El CHECK se verifica con SQLSTATE `23514`; el fixture invalido usa un valor que cabe en VARCHAR(16), para no confundirlo con el error de longitud `22001`.
Crear unidades sin quantityPolicy deja de ser valido; clientes conocidos y fixture comun fueron adaptados. Updates omitidos/null conservan valor. Rutas, JWT/RBAC y estructura de errores se mantienen.
Historicos no se recalculan. Anulaciones utilizan cantidad persistida; cotizaciones incompatibles siguen consultables y rechazan conversion.
Antes de despliegue autorizado: revisar consumidores desconocidos, unidades legacy/fracciones, cotizaciones pendientes, conciliaciones historicas y capacidad. No se consultaron datos reales.

## Evidencia QA definitiva

Evidencia local acreditada el 2026-10-14/15, reutilizada en esta preparacion documental sin ejecutar pruebas de nuevo. Los resultados focales anteriores no se suman a la suite integral como si fueran una sola ejecucion.

| Validacion | Comando / procedimiento ya ejecutado | Resultado |
|---|---|---|
| Backend integral | `backend`: `.\mvnw.cmd -B clean verify` | BUILD SUCCESS, proceso terminado sin interrupciones; 60 suites, 708 PASS, 0 FAIL, 0 ERROR, 0 SKIPPED |
| Instalacion reproducible frontend | `frontend`: `npm ci`, Node 22.23.3 / npm 10.9.9, lockfile sin cambios | PASS; ENOSPC superado |
| Unitarios Angular | `frontend`: `npm test`, ChromeHeadless | 37 PASS, 0 FAIL, 0 ERROR, 0 SKIPPED; incluye administracion de unidades y no incluye Angular D |
| Build Angular | `frontend`: `npm run build` | PASS |
| Preparacion Maven del gate | `mvnw.cmd -B -DskipTests package dependency:copy-dependencies -DincludeScope=test -DoutputDirectory=target/e2e-deps` | BUILD SUCCESS; tests omitidos intencionalmente solo en esta preparacion, sin repetir la suite integral |
| Gate E2E autenticado aislado | `frontend`: `npm run e2e:no-write`, proceso hijo controlado; runId `7358210a0bee24b7cf704720` | Exit 0; 3 no-write PASS + 1 setup PASS + 12 negativos de seguridad PASS = 16 PASS, 0 FAIL, 0 ERROR, 0 SKIPPED; cleanup PASS |

Los 708 tests corresponden exclusivamente al `clean verify` final, no a una suma de ejecuciones interrumpidas o focales. Los reportes Surefire se encuentran en `backend/target/surefire-reports`; los omitidos no se cuentan como PASS. El gate procesa su reporte autenticado en memoria y no exporta sesiones ni artefactos sensibles.

### Cobertura efectivamente ejecutada en el backend integral

- `PosMoneyPrecisionReproductionIntegrationTest`: 12 PASS; A/B/C, cantidades WHOLE/legacy, overflow, precision de caja, reversibilidad fraccionaria e historica, rollback real y cotizaciones/conversiones.
- `PosMoneyIntegrationTest`: 11 PASS; pagos mixtos, vuelto, efectivo neto, exclusiones de ventas anuladas/otras sesiones y rollback completo de venta, pagos e inventario.
- `UnitQuantityPolicyIntegrationTest`: 2 PASS; contratos de clasificacion, compatibilidad legacy, RBAC y mutaciones administrativas concurrentes bajo lock PostgreSQL. `UnitIntegrationTest`: 2 PASS.
- `UnitQuantityPolicyMigrationTest`: 1 PASS, V26 sobre PostgreSQL real. `BillingSeriesOptimisticConcurrencyMigrationIntegrationTest`: 1 PASS; ambos recorridos locales limitados expresamente a V25, sin alterar su asercion original ni las migraciones. `BillingSeriesOptimisticConcurrencyIntegrationTest`: 19 PASS.
- Catalogo/importaciones: `CatalogApplicationServiceTest` 32 PASS, `ProductImportApplicationServiceTest` 8 PASS y `ProductImportIntegrationTest` 7 PASS.
- Servicios de venta/cotizacion/inventario: 43, 22 y 24 PASS respectivamente. Politicas puras: `CommercialMoneyPolicyTest` 12 PASS y `QuantityPolicyTest` 7 PASS.
- `AuthRbacCorsIntegrationTest`: 10 PASS, incluido RBAC real 401/403. `BillingApplicationServiceTest`: 136 PASS, incluidos bloqueos fiscales PROD para creacion, firma y envio no productivos.

Son subconjuntos de los 708 tests, no conteos adicionales.

### Aislamiento y no-write del E2E

- Runtime efimero propio, namespace Docker `network:none`, solo loopback y sin rutas externas ni puertos publicados; sin volumen comercial o Docker socket compartido.
- PostgreSQL/datos sinteticos exclusivos; identidad de container, namespace, database/user, marcador y cluster system ID verificada antes de Flyway. Marcador/datasource incorrectos rechazados con esquema aun vacio.
- Backend/proxy efectivos, filtro no-write y baseline sintetico verificados; Auth/JWT/RBAC reales sin bypass y credenciales QA aleatorias, no heredadas.
- Sondeos frente a senuelos propios de host y otra red confirman inaccesibilidad. La sonda deliberada de mutacion se rechaza antes de servicios de negocio; las pruebas finales no agregan violaciones inesperadas.
- Postcondiciones: cero filas comerciales y stock sintetico 10 sin cambios. Sin operaciones comerciales reales ni solicitudes externas de negocio inesperadas.
- Recursos propios (containers, red, imagen y temporal) limpiados automaticamente con comprobacion de ownership. El contenedor detenido preexistente no se elimino. Estado autenticado solo en tmpfs privado; ningun secreto o sesion exportado.

## Antes y despues

| Caso | Antes documentado MONEY-QA-0 | Despues |
|---|---|---|
| A | 0.505+0.505 persistia 0.51+0.51 frente a cabecera 1.01 | PASS PostgreSQL: pagos 0.505 rechazados con 422; snapshot sin escrituras parciales |
| B | Suma persistida 0.02 frente a cabecera 0.01 | PASS PostgreSQL: dos lineas 0.01 x 0.50 con DECIMAL_2; HALF_UP produce 0.01 por linea; cabecera y pago persistidos 0.02 |
| C | 0.0005 persistia 0.001 y stock aumentaba al anular | PASS PostgreSQL: 0.0005 rechazado sin stock/escrituras; venta y anulacion de 0.25 restauran stock exactamente y movimientos simetricos; anulacion historica 0.125 compatible |
| D | Angular comparaba 0.30000000000000004 con 0.30 | Original intacto, fuera del worktree, no corregido ni repetido |

Atomicidad acreditada por rollback PostgreSQL real despues de guardar la venta y fallar el segundo movimiento de inventario: sin persistencia parcial de venta, lineas, pagos, stock o movimientos. La conversion fallida de cotizacion conserva tambien estado/historial; creacion/edicion invalidas se rechazan y una cotizacion historica incompatible sigue consultable sin revaloracion automatica. Los cinco tests Angular administrativos se ejecutaron dentro de los 37 unitarios. No se infiere atomicidad solo de anotaciones o rechazos HTTP.

## Trazabilidad de bloqueos superados

Los siguientes son checkpoints historicos, no el estado vigente. Los intentos interrumpidos o fallidos nunca se presentaron como suites completas aprobadas.

| Bloqueo historico | Resolucion acreditada |
|---|---|
| Ryuk/Docker sin respuesta y ENOSPC en `npm ci`; suite integral interrumpida | El usuario recupero Docker y libero espacio. Posteriormente `npm ci`, PostgreSQL/Testcontainers y el `clean verify` completo terminaron PASS. No se atribuye una causa unica a ambos bloqueos; no hubo limpieza destructiva del agente |
| Fixture invalido excedia VARCHAR(16) en el test V26 | Correccion exclusivamente del fixture para verificar el CHECK mediante SQLSTATE 23514, seguida de PASS focal y PASS integral; V26 no fue alterada |
| Test fiscal esperaba V25 pero migraba hasta V26 | Las dos instancias locales de Flyway del test fijan `MigrationVersion.fromVersion("25")`; aserciones y V25/V26 intactas; PASS focal e integral |
| `UNSAFE_INHERITED_CONFIGURATION:DB_PASSWORD` | Proceso hijo con entorno vaciado y lista explicita de variables tecnicas; ninguna lectura/copia del valor, sin modificar padre ni configuracion persistente |
| `QA_TOOL_FAILED:mvnw.cmd:-B` en preparacion E2E | La construccion temporal del PATH habia combinado arrays de varias instalaciones Java en una entrada invalida. Seleccion de rutas unicas de Java/Jar del JDK 17: `mvnw.cmd --version`, preparacion exacta con `-DskipTests` y gate completo PASS; sin cambios al launcher/wrapper |

### Reproduccion segura del gate

Usar `ProcessStartInfo`, `UseShellExecute=false`, entorno hijo vaciado y directorio `C:/Users/USUARIO/InkToyWorktrees/money-core-p0/frontend`. Permitir solo `SYSTEMROOT`, `WINDIR`, `COMSPEC`, `PATHEXT`, `TEMP`, `TMP`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `PROGRAMDATA`, `OS` y `PATH`.

Construir PATH con directorios tecnicos unicos: Node 22.23.3/npm 10.9.9, Docker, Java/Jar del mismo JDK 17 y herramientas Windows. No convertir el resultado multiple de `Get-Command` en una sola entrada: seleccionar una fuente unica, verificar Java 17 y conservar separadores `;`. No se necesito agregar JAVA_HOME. El hijo verifica la lista y rechaza configuraciones inseguras antes de `npm run e2e:no-write`; el launcher existente mantiene todas sus verificaciones y usa `backend` como cwd Maven. No crear scripts permanentes ni desactivar guardas; las variables sensibles del padre no se leen ni heredan.

## Riesgos residuales y trabajo diferido

- Publicacion, PR, revision y CI remoto para el futuro SHA siguen pendientes. PASS_LOCAL no es cierre remoto ni autorizacion de despliegue.
- La creacion de unidades ahora exige quantityPolicy: antes de despliegue autorizado deben revisarse consumidores desconocidos. No se infiere clasificacion para unidades legacy ni se corrigen datos historicos automaticamente.
- Cotizaciones historicas inconsistentes permanecen legibles y rechazan conversion; no se garantiza que datos comerciales desconocidos ya esten conciliados. No se consultaron bases reales.
- Angular D y MONEY-CHECKOUT-P1 no iniciados: igualdad monetaria/checkout frontend y otras mejoras de esa fase no se consideran corregidas por este cierre.
- MONEY-FISCAL-P1 y 4D-2C fuera de alcance/no iniciadas; sin cambios tributarios, identidad fiscal por ambiente, MiFact, comprobantes o integraciones fiscales reales.
- La confianza en host/daemon/imagenes y la imposibilidad de garantizar cleanup ante caida abrupta siguen siendo limites del gate existente. Esta ejecucion si termino con cleanup PASS.

## Inventario exacto

Raiz: C:/Users/USUARIO/InkToyWorktrees/money-core-p0.

Inventario propuesto para un futuro commit, sin ejecutar staging: **48 archivos**, 38 tracked modificados y 10 nuevos; cero eliminados. Clasificacion: 29 fuentes Java productivas (catalogo, ventas/caja, cotizaciones y dos politicas), 1 migracion V26, 11 tests backend, 4 archivos Angular y 3 documentos. Los cambios test-only V25 y la copia backend adaptada pertenecen a este cierre.

### Modificados (38)

    backend/src/main/java/com/erppos/backend/erp/catalog/adapter/dto/UnitCreateRequest.java
    backend/src/main/java/com/erppos/backend/erp/catalog/adapter/dto/UnitResponse.java
    backend/src/main/java/com/erppos/backend/erp/catalog/adapter/dto/UnitUpdateRequest.java
    backend/src/main/java/com/erppos/backend/erp/catalog/adapter/rest/UnitController.java
    backend/src/main/java/com/erppos/backend/erp/catalog/application/service/ProductApplicationService.java
    backend/src/main/java/com/erppos/backend/erp/catalog/application/service/ProductImportApplicationService.java
    backend/src/main/java/com/erppos/backend/erp/catalog/application/service/UnitApplicationService.java
    backend/src/main/java/com/erppos/backend/erp/catalog/application/usecase/CreateUnitCommand.java
    backend/src/main/java/com/erppos/backend/erp/catalog/application/usecase/UnitUseCase.java
    backend/src/main/java/com/erppos/backend/erp/catalog/application/usecase/UpdateUnitCommand.java
    backend/src/main/java/com/erppos/backend/erp/catalog/domain/model/Unit.java
    backend/src/main/java/com/erppos/backend/erp/catalog/domain/port/UnitRepositoryPort.java
    backend/src/main/java/com/erppos/backend/erp/catalog/infrastructure/mapper/UnitMapper.java
    backend/src/main/java/com/erppos/backend/erp/catalog/infrastructure/persistence/UnitEntity.java
    backend/src/main/java/com/erppos/backend/erp/catalog/infrastructure/persistence/UnitJpaRepository.java
    backend/src/main/java/com/erppos/backend/erp/catalog/infrastructure/persistence/UnitPersistenceAdapter.java
    backend/src/main/java/com/erppos/backend/erp/quotes/application/service/QuoteApplicationService.java
    backend/src/main/java/com/erppos/backend/erp/quotes/domain/model/QuoteProductSnapshot.java
    backend/src/main/java/com/erppos/backend/erp/quotes/infrastructure/persistence/CatalogProductReadAdapter.java
    backend/src/main/java/com/erppos/backend/erp/sales/adapter/dto/PosProductResponse.java
    backend/src/main/java/com/erppos/backend/erp/sales/adapter/rest/PosController.java
    backend/src/main/java/com/erppos/backend/erp/sales/application/service/CashRegisterApplicationService.java
    backend/src/main/java/com/erppos/backend/erp/sales/application/service/PosApplicationService.java
    backend/src/main/java/com/erppos/backend/erp/sales/application/service/SalesApplicationService.java
    backend/src/main/java/com/erppos/backend/erp/sales/domain/model/PosProductSnapshot.java
    backend/src/main/java/com/erppos/backend/erp/sales/domain/model/PosProductView.java
    backend/src/main/java/com/erppos/backend/erp/sales/infrastructure/persistence/CatalogReadAdapter.java
    backend/src/test/java/com/erppos/backend/erp/catalog/CatalogApplicationServiceTest.java
    backend/src/test/java/com/erppos/backend/erp/catalog/ProductImportApplicationServiceTest.java
    backend/src/test/java/com/erppos/backend/erp/quotes/QuoteApplicationServiceTest.java
    backend/src/test/java/com/erppos/backend/erp/sales/SalesApplicationServiceTest.java
    backend/src/test/java/com/erppos/backend/integration/AbstractHttpIntegrationTest.java
    backend/src/test/java/com/erppos/backend/integration/BillingSeriesOptimisticConcurrencyMigrationIntegrationTest.java
    docs/ai/CHANGE_CONTROL.md
    docs/ai/CURRENT_STATUS.md
    frontend/src/app/features/catalog/data/catalog.models.ts
    frontend/src/app/features/catalog/units-page.component.ts
    frontend/src/app/features/sales/data/sales.models.ts

### Creados (10)

    backend/src/main/java/com/erppos/backend/erp/shared/domain/policy/CommercialMoneyPolicy.java
    backend/src/main/java/com/erppos/backend/erp/shared/domain/policy/QuantityPolicy.java
    backend/src/main/resources/db/migration/V26__unit_quantity_policy.sql
    backend/src/test/java/com/erppos/backend/erp/shared/domain/policy/CommercialMoneyPolicyTest.java
    backend/src/test/java/com/erppos/backend/erp/shared/domain/policy/QuantityPolicyTest.java
    backend/src/test/java/com/erppos/backend/integration/PosMoneyPrecisionReproductionIntegrationTest.java
    backend/src/test/java/com/erppos/backend/integration/UnitQuantityPolicyIntegrationTest.java
    backend/src/test/java/com/erppos/backend/integration/UnitQuantityPolicyMigrationTest.java
    frontend/src/app/features/catalog/units-page.component.spec.ts
    docs/qa/MONEY_CORE_P0_QA.md

El test backend fue copiado y adaptado solo aqui. Eliminados: 0. Staged: 0.

### Exclusiones expresas

- `frontend/src/app/features/sales/pos-money-precision-repro.spec.ts`: Angular D ausente del worktree; original untracked conservado en `test/money-integrity-p0-repro`, fuera de este commit.
- Originales/respaldos externos al worktree y todos los archivos bajo `C:/Users/USUARIO/InkToyBackups/`.
- `backend/target/`, `frontend/node_modules/`, `frontend/dist/`, `frontend/.angular/`, logs, caches, temporales y estado autenticado QA: artefactos generados/ignorados o efimeros; no candidatos a commit.
- `.env`, secretos, certificados, dependencias/lockfiles, workflows, infraestructura, instrucciones de agentes y politicas GitHub Flow: sin cambios y fuera de este inventario.
- No hay archivos ajenos o inesperados dentro de los 48 candidatos.

## Preparacion de cierre local, sin publicacion

PASS_LOCAL vigente; 38 tracked modificados y 10 nuevos untracked tras la consolidacion documental; HEAD sin commits nuevos, master intacta y staging vacio. Esta intervencion cambia exclusivamente los tres documentos autorizados; no repite pruebas ni modifica implementacion, tests o migraciones.

Sin cambios en dependencias/lockfiles, workflows, Auth/JWT/RBAC productivos, fiscalidad productiva, Storefront, infraestructura o .env. Originales y respaldos MONEY-QA-0 preservados; Angular D no se incorpora. Sin git add, commit, push, PR, merge, rebase, stash, reset, clean destructivo, tags ni eliminacion/cambio de ramas o worktrees.

Siguiente accion minima: autorizacion humana independiente para crear el commit local con el inventario anterior. Push, PR, CI/revision y eventual merge requieren sus respectivos gates/autorizaciones conforme al playbook; no se anticipan SHA ni resultados remotos. No iniciar MONEY-CHECKOUT-P1, MONEY-FISCAL-P1 ni 4D-2C.
