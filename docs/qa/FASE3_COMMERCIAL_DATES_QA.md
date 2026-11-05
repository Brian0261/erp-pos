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
