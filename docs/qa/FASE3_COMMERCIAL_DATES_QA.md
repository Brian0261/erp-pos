# Fase 3 — fechas comerciales America/Lima

Estado: **PASS — FASE3_LOCAL_VALIDATED**, 2026-11-05. Validación local;
no CLOSED, commit, publicación, CI remoto ni despliegue de Fase 3.
Base `1fa09913476f5382e90807b3e750a2fc69d69e10`, rama
`feat/fase3-fechas-comerciales`. UX-POS-2 permanece CLOSED técnico.

## Contrato e implementación

- GET `/api/v1/sales` y `/api/v1/sales/list-items`: `from`/`to` son días
  ISO del calendario America/Lima. Se consulta `sold_at >= inicio` y
  `sold_at < inicio(to + 1 día)`, convirtiendo mediante la zona IANA.
  Sin fechas no hay límite temporal; un extremo ausente deja el rango abierto.
  No se cambian respuesta, orden `sold_at DESC, id DESC`, actor, caja ni estado.
- GET `/api/v1/reports/sales` y `/api/v1/reports/top-products`: mismo calendario
  y fin exclusivo. Sin fechas: últimos 30 días hasta hoy Lima; un solo extremo
  completa la ventana existente de 30 días; máximo 90 días inclusivos.
  Ranking conserva límite predeterminado 10 y máximo 100.
- Fechas malformadas/imposibles: 400 seguro en esas cuatro consultas; rango
  invertido: 422. El handler se amplió solo tras reproducir un 500 real y solo
  para parámetros LocalDate `from`/`to` de esos GET. Otros handlers no cambian.
- La agrupación diaria SQL fija America/Lima con parámetro; el WHERE conserva
  comparaciones sobre `sold_at`, sin convertir la columna indexada. JDBC usa
  OffsetDateTime para los límites TIMESTAMPTZ y LocalDate para el día agrupado.
- Los defaults/helpers de inventario, compras, cotizaciones y reportes fiscales
  conservan su comportamiento anterior. No se modificó Flyway, esquema o índices.
- Ventas VOIDED se seleccionan por `soldAt`; `voidedAt` conserva la auditoría.
  Ventas COMPLETED alimentan montos/conteos; VOIDED se cuentan por separado.
  Los pagos por método siguen representando importes recibidos, incluido efectivo
  que puede generar vuelto: no se igualan artificialmente a ventas netas.
- Frontend: backend como autoridad del conjunto; se elimina el segundo filtro
  local. Listado, detalle y actividad de ventas muestran instantes en Lima.
  Días de reporte se presentan como fechas de calendario, sin convertirlos a
  instantes. Fechas inválidas de URL no se descartan para consultar sin límites.
- El dashboard conserva su consulta histórica para actividad reciente y utiliza
  GET `/api/v1/sales/today` para el KPI. Ranking usa el default del backend.
  Lecturas afectadas se vinculan a credencial y se cancelan/invalidan por recarga,
  destrucción o cambio de sesión. HttpContext opcional mantiene consumidores previos.

## Evidencia de la implementación base

| Validación | Resultado acreditado de base |
|---|---|
| Backend focal, PostgreSQL 16 Testcontainers | 77 tests, 0 failures/errors/skipped |
| Misma selección temporal bajo JVM UTC y Asia/Tokyo | 7/7 en cada JVM; no se suman como casos distintos |
| Angular focal, ChromeHeadless | 77/77 |
| E2E sintético GET-only | 6/6, retries 0, sin escrituras ni requests inesperados |
| Build Angular | PASS; avisos CommonJS preexistentes de pdfmake |
| Typecheck E2E | PASS |
| Diff/alcance/whitespace | PASS |

Backend ejecutado desde `backend`:
```powershell
.\mvnw.cmd -B -Dtest=CommercialDatesIntegrationTest,CommercialDatesTest,ReportsHardeningIntegrationTest,ReportsApplicationServiceTest,GlobalExceptionHandlerTest,SalesApplicationServiceTest test
.\mvnw.cmd -B -Dtest=CommercialDatesIntegrationTest,CommercialDatesTest -DargLine=-Duser.timezone=UTC test
.\mvnw.cmd -B -Dtest=CommercialDatesIntegrationTest,CommercialDatesTest -DargLine=-Duser.timezone=Asia/Tokyo test
```

Frontend ejecutado desde `frontend`, con Node 22.23.3 aprobado:
```powershell
node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include=src/app/shared/utils/commercial-date.spec.ts --include=src/app/features/sales/sales-page.component.spec.ts --include=src/app/features/sales/sales-presentation.spec.ts --include=src/app/features/sales/sale-detail-page.component.spec.ts --include=src/app/features/sales/data/sales.service.spec.ts --include=src/app/features/dashboard/dashboard.component.spec.ts --include=src/app/features/reports/sales-report-page.component.spec.ts --include=src/app/features/reports/data/reports.service.spec.ts
node node_modules/@angular/cli/bin/ng.js build
node node_modules/typescript/bin/tsc --noEmit --target es2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck e2e/specs/commercial-dates.no-write.spec.ts
node node_modules/@playwright/test/cli.js test e2e/specs/commercial-dates.no-write.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line
```

- Fronteras PostgreSQL: instante anterior a medianoche Lima, inicio exacto,
  `04:59:59.999999Z` del día siguiente UTC y comienzo del próximo día Lima;
  rangos consecutivos sin solaparse y cambio de año. Valores persistidos se
  comparan antes/después. Sesiones SQL UTC/Lima/Tokyo en cada JVM probada.
- Leap day y cambios de mes/año; Clock fijo en zonas diferentes; defaults,
  rangos parciales, errores 400/422 y filtros por estado/caja/actor. Negativas
  401/403 y conservación del manejo de errores fuera del alcance.
- Reportes verifican conjunto equivalente: dos COMPLETED de 10, una VOIDED,
  venta neta 20 y pagos recibidos 28, agrupación Lima y ranking de dos unidades.
- EXPLAIN demuestra que el índice `idx_sales_sold_at` es utilizable con
  `enable_seqscan=off` en la transacción de prueba; no es un benchmark ni prueba
  de que el planner prefiera ese índice para toda cardinalidad.
- E2E: UTC, America/Lima y Asia/Tokyo, anchos 1440/390; reloj fijo, navegación
  listado/detalle/retorno, fecha de última microfracción, reporte y KPI, actividad
  histórica preservada. Todas las rutas API se interceptan, verifican credencial
  sintética y rechazan métodos distintos de GET y rutas desconocidas.
- Se conservan intentos intermedios: 500 por fecha inválida reproducido antes
  del fix; errores de fixture sintético corregidos (longitud y producto propio);
  binding JPA 42P18 corregido con flags booleanos para límites opcionales.
  Una aserción con codificación incorrecta fue corregida sin debilitarla.
  No hubo skips, aumento de retries ni cambios de timeout para obtener PASS.
- Logs y seis capturas sintéticas externos al repo:
  `%LOCALAPPDATA%/Temp/inktoy-fase3/` (`backend-validated.log`, `backend-jvm-*.log`,
  `frontend-unit-validated.log`, `angular-build.log`, `e2e.log`, `visual/`).

## Compatibilidad y límites

El conjunto por fecha cambia de UTC a Lima deliberadamente; los timestamps,
dinero, stock, recuperación, UUID, idempotencia e intención fiscal no cambian.
No se inspeccionaron bases operativas ni datos históricos reales. MONEY-QA-0
y UX-POS-2 no se reabren ni se altera su evidencia.

El KPI elige hoy mediante la referencia backend descrita en la ampliación siguiente.
Actividad reciente conserva su rango histórico.
Otros módulos y la navegación móvil global mantienen sus limitaciones existentes.
No se acredita despliegue, impresión térmica física o emisión fiscal productiva.
Commit, push, PR, CI remoto, revisión, merge y cierre siguen pendientes de sus
gates; las operaciones Git de escritura requieren autorización independiente.

## Ampliación autorizada — KPI de hoy sin reloj del cliente

- GET nuevo `/api/v1/sales/today`, permitido a CAJERO/ADMIN/SUPERVISOR con
  `Cache-Control: no-store`. No recibe fechas ni filtros; el servidor determina
  el día actual con una sola captura de su Clock y reutiliza el filtrado de
  propietario de Ventas. CAJERO continúa limitado a sus propias ventas.
- Sobre aditivo: `businessDate` (ISO date), `timeZone` (America/Lima),
  `referenceInstant`, `nextDayStartsAt` (Instant ISO) y `sales` (filas SaleResponse
  existentes). El instante es una referencia del calendario, no una promesa de
  que todos los datos financieros sean un snapshot exacto de ese instante.
- El KPI sustituye la consulta acotada con fechas del navegador por esa lectura;
  conserva la consulta histórica de actividad: siguen siendo dos GET de ventas
  al abrir el dashboard. No se consulta health ni la cabecera HTTP Date.
- El cliente valida la coherencia del sobre y calcula la vigencia con instantes
  del servidor y duración monotónica del round trip. Resta todo el tiempo de
  petición y un milisegundo de margen, por lo que puede revalidar anticipadamente.
  Nunca usa Date.now ni la fecha del dispositivo para seleccionar el día.
- Medianoche, foco/visibilidad tras suspensión y reintento consultan nuevamente
  al backend. Eventos coincidentes no duplican una petición en curso. Una
  referencia caducada en tránsito se descarta y admite una sola repetición
  automática; después queda reintento explícito. Online permite reintentar un
  fallo de red; 401/403 no provocan reintentos automáticos.
- Durante carga o error se retira el valor anterior; cero solo se muestra tras
  una respuesta válida y la suma de importes COMPLETED del conjunto autorizado.
  Un conjunto vacío o únicamente VOIDED también produce cero.
  Peticiones detenidas vencen a los 15 segundos.
  Generación/credencial, cancelación, destrucción y limpieza de timers protegen
  frente a respuestas tardías y cambios de sesión. Actividad reciente no se
  borra por un fallo del KPI.

QA incremental final, sin sumar suites solapadas a la base anterior:

| Comprobación | Resultado |
|---|---|
| TodaySalesTest + CommercialDatesIntegrationTest + SalesApplicationServiceTest | 51/51 PASS |
| Dashboard + utilidad temporal + SalesService Angular | 19/19 PASS |
| E2E actualizado UTC/Lima/Tokio, 1440/390 | 6/6 PASS, cero escrituras, retries 0 |
| Build Angular y typecheck E2E | PASS |

Comandos incrementales:
```powershell
# backend
.\mvnw.cmd -B '-Dtest=TodaySalesTest,CommercialDatesIntegrationTest,SalesApplicationServiceTest' test
# frontend
node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include=src/app/shared/utils/commercial-date.spec.ts --include=src/app/features/sales/data/sales.service.spec.ts --include=src/app/features/dashboard/dashboard.component.spec.ts
```
Build, typecheck y comando E2E son los indicados arriba. Evidencia adicional en
`%LOCALAPPDATA%/Temp/inktoy-fase3/server-today/`: `backend.log`,
`frontend-unit-validated.log`, `angular-build-validated.log`, `e2e-validated.log`, seis capturas en
`visual/`. `inventory.json` conserva los hashes de la validación funcional;
`precommit-inventory.json` registra el estado tras los ajustes documentales de
esta revisión. Se conserva también el inventario anterior de la implementación base.

Pruebas nuevas: reloj backend fijo a ambos lados de medianoche, una sola lectura
del reloj, propietario y negativas 401/403/no-store; dispositivo 2001/2042,
caducidad/latencia, suspensión y eventos duplicados, fallo/reintento, respuesta
vacía, 401/403 sin repetición, sesión, destrucción, metadatos incompatibles y
timeout. Los E2E preservan navegación y actividad histórica mientras cambian el
reloj del dispositivo y avanzan la fecha autoritativa del servidor.

Requisito operativo previo a producción, pendiente de acreditación: sincronizar
y supervisar el reloj autoritativo del backend. Sin conectividad o una
respuesta válida no se confirma el día ni el importe actual; no se promete una
actualización exacta de medianoche sin conexión. No se cambió infraestructura,
históricos, dinero, stock, caja transaccional, fiscalidad o recuperación durable.

## Corrección focal de CI PR #13 (2026-11-05)

CI #46 [run 42119990632](https://github.com/Brian0261/erp-pos/actions/runs/42119990632),
SHA remoto `d717517fa7e28f0cb07be9f87bcaa35018e543f7`: backend, e2e-auth y
e2e-commercial FAILURE; frontend SUCCESS. Esta sección complementa la evidencia
local anterior; no acredita un nuevo CI remoto ni el cierre de Fase 3.

- Backend: el Testcontainer estático de `AbstractHttpIntegrationTest` se comparte
  entre clases. Otros tests dejan ventas sintéticas del día y de usuarios seed;
  `todayUsesServerDayWithNoStoreAndPreservesPermissions` suponía erróneamente
  vacío global y cardinalidades globales 1/2. Ahora usa un CAJERO único, comprueba
  vacío por propietario aun con ventas ajenas presentes y compara IDs exactos de
  su propia caja/fixture para ADMIN y SUPERVISOR. Verifica límites Lima (inicio y
  última microfracción), metadatos, no-store, filtros no vinculantes, 401/403 y
  propiedad. Todos sus inserts siguen dentro de la transacción con rollback.
- Auth: el dashboard pide GET `/api/v1/sales/today` al terminar el login. La
  allowlist de Playwright lo rechazaba y el fixture automático registraba la
  violación, haciendo fallar el setup y omitir sus dependientes. Se añadió solo
  ese GET exacto y se extendió la prueba existente de origen/métodos/subrutas,
  manteniendo los 12 casos de seguridad obligatorios. Se identificó además la
  misma ausencia en `E2eQaReadOnlyFilter`; su cambio y prueba quedaron bloqueados
  en el primer gate hasta recibir la ampliación explícita de 2026-11-06.
- Comercial: el artifact sanitizado registra una denegación fiscal esperada y
  dos GET adicionales `/api/v1/sales/{segment}`. `RecoveryQaFilter` denegaba el
  nuevo GET; se permite exclusivamente esa ruta/método y se añaden regresiones
  del filtro real para escrituras y rutas no exactas. La anonimización se
  mantiene. `QA_FINAL_EVIDENCE_REQUIRED` deriva del resultado fallido del gate,
  cuyo único error registrado fue `QA_UNEXPECTED_DENIED_REQUEST`; aislamiento y
  limpieza del run CI fueron PASS. La correspondencia se contrasta también con
  el gate local corregido, preservando sus diez escenarios y contador estricto.

Primer gate, 2026-11-05 (evidencia histórica; sin sumar casos solapados):

- `CommercialDatesIntegrationTest,RecoveryQaFilterTest`: 12/12 PASS.
- `mvnw.cmd -B clean verify`, una ejecución: 846 tests, 3 failures, 0 errors/skips.
  Fase 3 (6/6) y filtro comercial (6/6) PASS dentro de la suite compartida. Los
  tres fallos adicionales pertenecen a `EcommerceBinaryImportWebpDerivativeIntegrationTest`:
  sus códigos `UIT` + sufijo basado en `System.nanoTime()` exceden 20 caracteres
  en este equipo y reciben 400 al crear unidades. En ese primer gate no se
  modificaron esos fixtures ni la validación productiva de unidades.
- `node e2e/qa/run-recovery.mjs`: 10/10 PASS, un intento por escenario, sin
  skips/retries. Evidencia final, aislamiento y limpieza PASS; solo la denegación
  fiscal esperada (total 1), sin GET adicionales. Run local
  `3bd0e166f3641b62bdcb3ce0`; evidencia sanitizada en
  `backend/target/recovery-e2e/3bd0e166f3641b62bdcb3ce0/evidence/` (efímera,
  ignorada por Git y eliminada por el clean verify posterior). Se conserva el
  log externo `commercial-gate.log`; este PASS acreditado se reutiliza.
- Gate Auth: pendiente de la decisión sobre su segunda barrera QA en ese momento.

Logs y artifact sanitizado en `%LOCALAPPDATA%/Temp/inktoy-fase3/ci-pr13/`:
`backend-focal.log`, `backend-full.log`, `commercial-gate.log`, `ci-artifact/`.
Estado al cierre del primer gate: BLOCKED, validación incompleta y NO-GO para
commit correctivo. La continuación autorizada y su resultado constan abajo.
El CI remoto del futuro SHA continúa pendiente; sin staging, commit o push.

### Resolución final autorizada (2026-11-06)

- Se preservaron los seis archivos pendientes del gate anterior. La ampliación
  autoriza exclusivamente el filtro Auth, su prueba y el fixture sintético WebP.
  HEAD local/remoto continúa en `d717517fa7e28f0cb07be9f87bcaa35018e543f7`.
- `E2eQaReadOnlyFilter.READS` permite ahora únicamente GET sobre la ruta exacta
  `/api/v1/sales/today`. `E2eQaSafetyTest` comprueba paso a la cadena real solo
  tras readiness, identidad en cabeceras y cero violaciones para esa lectura;
  escrituras, HEAD/OPTIONS/TRACE, subrutas y rutas desconocidas siguen denegadas
  con 405 sin llegar a seguridad ni negocio. Se conservan las negativas de
  identidad, datasource, marcador y configuración heredada.
- Confirmados los tres fallos WebP: `UIT15fywzpz58jpglarge`,
  `UIT15fyxz47ocpnglarge` y `UIT15fzcac4lkrespfail` tenían 21 caracteres frente
  al máximo productivo 20. La única corrección en
  `EcommerceBinaryImportWebpDerivativeIntegrationTest` genera el sufijo de unidad
  como `WEBP` + ID único de categoría en base 36. Con el prefijo `UIT` ocupa como
  máximo 20 caracteres incluso para Long.MAX_VALUE; se comprueban longitud y
  unicidad del fixture. Los cuerpos y aserciones originales de los diez tests,
  SKU/productos, imágenes y comportamiento ecommerce permanecen intactos.

| Validación de esta continuación | Resultado |
|---|---|
| E2eQaSafetyTest | 10/10 PASS, incluidas dos regresiones nuevas |
| Tres casos WebP originalmente fallidos | 3/3 PASS con sus aserciones originales |
| Backend completo, una ejecución clean verify tras la corrección | 848/848 PASS, 0 failures/errors/skipped |
| Dentro de esa suite compartida | Fase 3 6/6, WebP 10/10 y filtro comercial 6/6 PASS |
| Gate Auth aislado | Setup 1 PASS; 3 escenarios PASS; 12 negativos PASS; 0 FAIL/SKIPPED, retries 0 |
| Auth identidad, red, postcondiciones, evidencia de cero escrituras comerciales y limpieza | PASS |
| Diff, inventario y conservación de los cambios previos | PASS |

Los conteos focales y los subconjuntos de la suite no se suman a 848. Se reutiliza
el gate comercial 10/10 del primer paso: el filtro comercial, sus pruebas y
escenarios no cambiaron. No se repitieron matrices JVM ni campañas temporales.

Comandos, desde backend y frontend respectivamente:
```powershell
.\mvnw.cmd -B '-Dtest=E2eQaSafetyTest,EcommerceBinaryImportWebpDerivativeIntegrationTest#confirmFileShouldPersistResponsiveWebpVariantsForLargeJpeg+confirmFileShouldPersistResponsiveWebpVariantsForTransparentPngWithoutUpscaling+responsiveStorageFailureShouldCleanNewObjectsAndKeepOtherRowsSuccessful' test
.\mvnw.cmd -B clean verify
node e2e/qa/run-qa.mjs
git diff --check
```

Evidencia persistida fuera del repo:
`%LOCALAPPDATA%/Temp/inktoy-fase3/ci-pr13-final/`: `backend-focal.log`,
`backend-full.log`, `auth-gate.log`, `surefire/` e `inventory.json` con los hashes
finales. Auth run `7e5d12c7458475669716549a`, recursos efímeros retirados por el
launcher. Java 17, Node 22.23.3/npm 10.9.9, PostgreSQL 16 aislado y controles de
identidad/origen/marcador y cleanup del launcher vigente, sin relajar gates.

Estado: **PASS — FASE3_CI_CORRECTION_READY**, GO para solicitar autorización
independiente de commit correctivo. Inventario acumulado: nueve modificados,
cero nuevos, índice vacío. Solo tests, barreras QA e informe; sin código
productivo, cambios de infraestructura, staging, commit o push. El CI remoto del
futuro SHA sigue pendiente; el run #46 del SHA publicado permanece fallido.
Persisten los requisitos operativos de reloj backend correcto y conectividad,
sin acreditar despliegue ni declarar Fase 3 CLOSED.
