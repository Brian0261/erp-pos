# VENTAS-RD-2 — QA local de consulta y detalle

- Base: `d6d53ec43e1f3b71f46df50a138fb66c53874fee`.
- Rama: `feat/ventas-rd-2-frontend`.
- Alcance: Angular Ventas, pruebas focales con datos sintéticos y este registro.

## Comprobaciones

| Validación | Resultado y cobertura |
| --- | --- |
| `npm run build` en `frontend` | PASS con Node 22.23.3 y npm 10.9.9. Se mantienen los avisos CommonJS de pdfmake y vfs_fonts de la nota interna. |
| `npm test -- --include=… --progress=false` | 127 PASS. Incluye consulta v2, listado, presentación, detalle, anulación, servicio, nota y fechas comerciales. Comprueba validación del contrato, aislamiento de v1, descarte de respuestas antiguas, empate documental y recuperación de POST incierto mediante dobles. |
| Playwright Chromium, `sales-consultation.no-write.spec.ts` y `commercial-dates.no-write.spec.ts` | 21 PASS. Comprueba búsqueda exacta y por prefijo, filtros combinados, 20/50/100, conteos, roles, cambio de credencial, nota, cancelación del diálogo, foco y calendario Lima. El harness intercepta la API, rechaza métodos distintos de GET y verifica que el contador de escrituras quede vacío. |
| `npm run e2e:internal-note:ci` | 6 PASS. Lectura de nota y PDF, denegación, reintento y cambio de sesión. |
| Playwright focal en nota y navegación desde POS | 7 PASS. Reimpresión desde detalle y retorno al POS con el carrito preservado. Los cambios en estos specs actualizan los selectores del detalle y de la nota. |
| Revalidación visual y de navegación | 7 PASS, incluidos en el alcance de la suite principal. Regeneró las capturas tras el ajuste final de la columna móvil y comprobó atrás/adelante entre tamaños de página. |

Los ocho specs Angular fueron `sales-list-query`, `sales-page.component`,
`sales-presentation`, `sales.service`, `sale-detail-page.component`,
`sale-void-page.component`, `note` y `commercial-date`. Playwright usó un
servidor Angular local en loopback y respuestas sintéticas. No se repitió QA
backend de RD-0 o RD-1.

## Revisión visual del Build anterior

Capturas del módulo en `%TEMP%\inktoy-ventas-rd-2\visual`: listado, detalle,
sección de comprobante y anulación en 1440, 1024 y 390 px, en claro y oscuro.
La comparación se hizo con la especificación escrita aprobada. Las imágenes
originales de los wireframes no estaban disponibles.

- Escritorio: encabezado y total, búsqueda junto a Filtros, períodos, seis
  columnas y paginador al pie.
- Tablet y móvil: se agrupan venta/fecha y estado/documento. Total y acceso a
  detalle quedan visibles. Las tablas anchas de artículos y pagos conservan
  desplazamiento interno. La navegación global en anchos reducidos conserva
  la altura y el comportamiento del shell existente.
- Detalle: número comercial, fecha Lima y total histórico. Artículos, Pagos,
  Comprobante e Información operativa y auditoría en el orden acordado.
- Se corrigieron el nombre accesible de los selectores, el recorte de columnas
  móviles y el contraste del botón de página activa. Playwright comprueba
  teclado, restauración de foco, contención horizontal y contraste mínimo de
  4.5:1 del número de página activa. La comprobación de contraste es focal.

## Límites

- El paginado con OFFSET/LIMIT puede desplazar resultados entre consultas si
  los datos cambian en paralelo.
- Ante una anulación incierta, el bloqueo local es por actor y venta mientras
  vive la aplicación Angular. Un GET con estado `COMPLETED` no confirma que el
  primer intento terminó. No hay garantía de recuperación entre pestañas,
  dispositivos o recargas. La verificación transaccional sigue en el servidor.
- Un build exitoso y las pruebas sintéticas acreditan QA local. La revisión
  humana de esta fase sigue pendiente.

## Correctivo prestaging

- Listado: «Nota de venta» y «No fiscal · Sin comprobante electrónico» requieren un resumen explícito con indicador negativo y campos documentales nulos. Un resumen faltante, incompleto o contradictorio conserva «Información documental no verificable». Un comprobante verificable conserva tipo, número, estado y ambiente. Un `DRAFT` figura como «Borrador · no emitido».
- Detalle: «Ver nota de venta» conserva la consulta bajo demanda. La explicación distingue el documento interno no fiscal del bloque «Comprobante electrónico». A 600 px o menos, cada fila de artículos y pagos muestra sus campos con etiquetas en dos columnas. Se conserva una sola tabla por sección, con sus encabezados accesibles. El listado y la estructura del detalle conservan el diseño anterior.
- Anulación: el aviso y el diálogo identifican la venta, explican la reposición de inventario y la exclusión del cálculo de su sesión de caja, y aclaran que los pagos históricos se conservan, sin reembolso automático ni anulación del comprobante. Se contrastó con `SalesApplicationService.java` (373, 398, 409 y 428) y `CashRegisterSessionJpaRepository.java` (22–45).

### Matriz de recorridos

Los archivos de Angular indicados están en `frontend/src/app/features/sales/`, salvo las rutas en `frontend/src/app/app.routes.ts`. Las referencias Playwright corresponden a `frontend/e2e/specs/`. El alcance de CAJERO también aplica si su cuenta tiene roles adicionales. La UI limita las acciones visibles y el servidor decide la autorización efectiva.

| Recorrido | CAJERO | ADMIN | SUPERVISOR | Datos, estados, recuperación y contexto | Código y evidencia |
| --- | --- | --- | --- | --- | --- |
| 1. Entrada, búsqueda y filtros | «Mis ventas», propias, sin filtro por usuario. | «Ventas» y filtro por usuario. | «Ventas» y filtro por usuario. | Carga perfil y primera página sin fechas implícitas. Muestra número, fecha Lima, estado, documento e importe. Búsqueda exacta o prefijo, períodos y filtros de fechas, estado, caja y documento. Valida al aplicar o al leer la URL. Seleccionar ausencia limpia y desactiva el estado documental. Un filtro inválido se corrige antes de enviar otra consulta. Aplica desde página 1 y conserva tamaño. | `app.routes.ts` 93, `sales-page.component.ts` 81, 125 y 150, `sales-list-query.ts` 34 y 94. Angular `sales-page.component.spec.ts` 86, 101, 146 y 155. Playwright `sales-consultation.no-write.spec.ts` 387 y 448 (Build anterior). |
| 2. Paginación, actualización y recuperación | Solo resultados propios. | Resultados autorizados. | Resultados autorizados. | Páginas 20/50/100 con totales del servidor, carga separada de vacío y error. Actualiza o reintenta una lectura recuperable con la consulta aplicada. Ante 401 pide volver a iniciar sesión, 403 bloquea y 400/422 pide revisar filtros. Si el total cae, corrige la página una vez. URL conserva filtros, tamaño y página al navegar. OFFSET/LIMIT puede desplazar filas entre consultas concurrentes. | `sales-page.component.ts` 192, 206, 220 y 262. Angular `sales-page.component.spec.ts` 112, 126 y 134. Playwright `sales-consultation.no-write.spec.ts` 387 (Build anterior). |
| 3. Detalle comercial y documental | Venta propia. Puede consultar la nota y acceder a facturación si corresponde. Sin acción de anular por ese rol. | Venta autorizada. Nota, facturación y anulación sujetas al estado. | Igual que ADMIN. | Artículos, importes y pagos históricos, con datos de catálogo identificados por separado. Valida ID y respuesta. Las cargas de venta y documento son independientes. Documento ausente confirmado habilita «Crear documento electrónico» solo en venta registrada. Documento presente muestra su estado real. Error documental ofrece reintento cuando corresponde y restringe acciones sensibles. Un 401 limpia los datos. Volver conserva los filtros. | `sale-detail-page.component.html` 14, 22, 46 y 61, `sale-detail-page.component.ts` 92, 99, 142 y 171. Playwright `sales-consultation.no-write.spec.ts` 176, 322, 344 y 363 (Build anterior para el rol). |
| 4. Nota, PDF, descarga e impresión | Solo venta propia autorizada. | Venta autorizada. | Venta autorizada. | Valida ID y sesión por GET, genera PDF bajo demanda y distingue lectura, generación, demora, listo y error. Ofrece vista, descarga e impresión cuando está lista. Verifica por GET antes de cada salida. Si la venta cambió, regenera y pide repetir la acción. Ante error, revoca el PDF y ofrece reintento de consulta. Ventana bloqueada ofrece descarga. Volver al detalle conserva consulta, o retorna al POS si se entró desde allí. El navegador no confirma impresión física ni que la descarga se haya guardado. | `internal-note/internal-note-page.component.ts` 27, 38, 43 y 74, `internal-note/note-session.ts` 56, 73, 82 y 120. `internal-note/note.spec.ts` 76–106 y `internal-note.no-write.spec.ts` 156 (Build anterior). |
| 5. Anulación y cancelación | Sin acceso por rol único, también por URL directa. | Requiere venta registrada, caja abierta y estado fiscal verificado sin comprobante bloqueante. Con CAJERO, solo propias. | Igual que ADMIN. | Verifica venta, caja y comprobante. Muestra carga o bloqueo, y permite reintentar lecturas recuperables. Motivo obligatorio, sin espacios solos y máximo 400 caracteres. El diálogo identifica la venta y los efectos. Cancelar o Escape cierra sin enviar POST y devuelve el foco al botón habilitado de la misma venta o al encabezado. Confirmar vuelve a verificar y permite un solo POST mientras el intento está en curso. `VOIDED` verificado retorna al detalle con confirmación y contexto. | `sale-void-page.component.ts` 326, 407 y 465, `sale-void-page.component.spec.ts` 50, 79, 89, 99 y 117. Playwright `sales-consultation.no-write.spec.ts` 267 y 302. |
| 6. Rechazo, timeout y verificación | Sin intento por rol único. | Rechazo y verificación en su ámbito autorizado. | Igual que ADMIN. | Rechazo conocido muestra error y exige nueva verificación para volver a habilitar un intento cuando procede. Timeout, red, 5xx o respuesta ambigua muestran «Resultado por verificar». Verifica solo por GET ligado a la sesión y venta. `VOIDED` confirma. `COMPLETED` o GET fallido conservan incertidumbre y permiten consultar de nuevo cuando la sesión lo permite. No se reenvía el POST. El bloqueo se conserva en la memoria de esta aplicación por actor y venta, sin garantía entre pestañas o recargas. | `sale-void-page.component.ts` 436, 478 y 501, `sale-void-attempts.ts`. Angular `sale-void-page.component.spec.ts` 138, 153, 163 y 175. |
| 7. Cambio de sesión, tardíos y retorno | Reabre con el ámbito de su sesión actual. | Reabre con el ámbito de su sesión actual. | Igual que ADMIN. | El cambio de credencial retira datos y bloquea respuestas obsoletas. En anulación, una confirmación abierta pierde su autorización y un intento ya enviado sigue sujeto a verificación. La nota revoca sus URLs temporales. Con la misma sesión, al volver se recuperan los parámetros válidos de búsqueda y paginación, y el foco vuelve a la venta o al encabezado si ya no está visible. El contexto de foco no se comparte entre sesiones. | `sales-page.component.ts` 105 y 285, `sales-presentation.ts` 83, `sale-detail-page.component.ts` 92, `sale-void-page.component.ts` 318 y 427, `internal-note/note-session.ts` 31 y 41. Angular `sales-page.component.spec.ts` 167, `sale-void-page.component.spec.ts` 99 y Playwright `sales-consultation.no-write.spec.ts` 374, 387 y 448 (Build anterior). |

### Evidencia incremental y hallazgo de foco

Resultado del gate anterior: **FAIL** por el defecto de devolución de foco confirmado. Los cambios de contenido y presentación pasaron sus comprobaciones focales. La resolución consta en el correctivo final.

| Validación | Resultado |
| --- | --- |
| `npm run build` en `frontend` | PASS. Persisten los avisos CommonJS de pdfmake y vfs_fonts. Registro `corrective-build.log`. |
| `npm test -- --include=… --progress=false` | 75 PASS en `sales-presentation`, `sales-page.component`, `sale-detail-page.component` y `sale-void-page.component`. Incluye resumen ausente, incompleto y contradictorio, DRAFT, texto de anulación, rechazo 409 y timeout simulado con recuperación solo por GET. Registro `corrective-angular-final.log`. |
| Playwright Chromium `sales-consultation.no-write.spec.ts --grep 'responsive no-write\|document shortcut\|document failure' --project=chromium --workers=1 --retries=0` | 8 PASS. Seis combinaciones de ancho/tema y dos recorridos documentales. Fixtures sintéticos con cero escrituras HTTP, acceso por teclado a datos de catálogo y al bloque documental, estados de carga/error/reintento, reflujo, contraste focal de al menos 4.5:1 y cancelación del diálogo. Registro `corrective-playwright-final.log`. |
| Retorno de foco al cerrar la confirmación con Escape | FAIL en las seis combinaciones del gate anterior. Se conserva el sondeo en `corrective-playwright.log`. |

Los registros están en `%TEMP%\inktoy-ventas-rd-2`. Las capturas finales se guardaron aparte, en `visual-corrective`. Frente a la especificación escrita, se conserva la densidad de las tablas en escritorio. A 390 px, las etiquetas junto a los valores sustituyen el desplazamiento interno de artículos y pagos. El listado mantiene su composición, con la nueva identificación documental. La advertencia agrega los efectos verificados. Las imágenes originales de los wireframes siguen sin estar disponibles para comparación directa. La comprobación de accesibilidad es focal.

Comandos de validación desde `frontend`, con Node 22.23.3 y Chrome Headless. Playwright usó `E2E_BASE_URL=http://127.0.0.1:4201`, `E2E_ALLOW_WRITES=false` y `E2E_ALLOW_STAGING=false`.

```text
npm run build
npm test -- --include=src/app/features/sales/sales-presentation.spec.ts --include=src/app/features/sales/sales-page.component.spec.ts --include=src/app/features/sales/sale-detail-page.component.spec.ts --include=src/app/features/sales/sale-void-page.component.spec.ts --progress=false
node node_modules/@playwright/test/cli.js test e2e/specs/sales-consultation.no-write.spec.ts --grep 'responsive no-write|document shortcut|document failure' --project=chromium --workers=1 --retries=0 --reporter=line --output <directorio temporal>/corrective-results-final
```

### Correctivo final de foco

**PASS — VENTAS_RD_2_CORRECTIVE_FINAL_READY.** «Confirmar anulación» se deshabilita al activar `submitting` antes de abrir el diálogo. `ConfirmDialogService.close()` resuelve la decisión y encola la devolución de foco en una microtarea. `finally` libera `submitting`, pero Angular aplica después el cambio al atributo `disabled`, de modo que la microtarea encontraba el botón todavía deshabilitado. `ConfirmDialogComponent` ya enfoca «Cancelar», confina Tab y Shift+Tab, y usa el estilo destructivo existente. Referencias: `sale-void-page.component.ts` 116, 418 y 460, `shared/dialogs/confirm-dialog.service.ts` 56–69, `shared/dialogs/confirm-dialog.component.ts` 65, 210, 221 y 274.

La pantalla agenda la devolución de foco con `afterNextRender` cuando el diálogo termina sin enviar el POST. Recupera el botón si sigue habilitado y corresponde al mismo contexto verificado. Si cambió la sesión o la revalidación bloqueó la acción, enfoca el encabezado de anulación. Evita recuperar foco desde una vista destruida o por encima de otro diálogo activo. Se conservan `submitting` y la reserva por actor y venta para impedir confirmaciones y envíos duplicados, la revalidación tras confirmar y la recuperación por GET ante incertidumbre. Referencias: `sale-void-page.component.ts` 34, 113, 407, 430, 465 y 478. Sin cambios en estilos, textos aprobados ni diálogo compartido.

El error `Route is already handled!` pertenecía al escenario documental, separado del fallo de foco. La versión vigente espera la primera lectura dentro del interceptor de contexto, consume la espera y ejecuta un solo `route.fulfill` por solicitud. `corrective-playwright-final.log` muestra el mismo escenario como 8/8 y 8 PASS, sin ese error. Se reutilizó ese registro y se excluyó el escenario documental de la nueva ejecución. Referencias: `sales-consultation.no-write.spec.ts` 62, 76 y 344.

| Validación focal | Resultado |
| --- | --- |
| Angular, `sale-void-page.component.spec.ts` | 10 PASS. Permiso revocado y caja cerrada enfocan el encabezado sin escritura. Confirmación repetida produce un solo llamado simulado al servicio de POST. Timeout y respuesta ambigua mantienen verificación por GET sin reenviar. Registro `focus-angular.log`. |
| Playwright Chromium, `void dialog focus` | 7 PASS. A 1440, 1024 y 390 px en claro y oscuro se verificó foco inicial en «Cancelar», confinamiento con Tab y Shift+Tab, estilo destructivo, cierre por Escape y «Cancelar», y devolución de foco. El séptimo caso verifica el encabezado tras cambio de sesión. El interceptor registró cero intentos de escritura en los siete casos. Registro `focus-playwright.log`. |
| Compilación Angular | PASS. Persisten los avisos CommonJS de pdfmake y vfs_fonts. Registro `focus-build.log`. |

Comandos desde `frontend`, con el mismo entorno local y sintético documentado arriba.

```text
npm test -- --include=src/app/features/sales/sale-void-page.component.spec.ts --progress=false
node node_modules/@playwright/test/cli.js test e2e/specs/sales-consultation.no-write.spec.ts --grep 'void dialog focus' --project=chromium --workers=1 --retries=0 --reporter=line --output <directorio temporal>/focus-results
npm run build
```

La evidencia de foco corresponde a Chromium con datos sintéticos. Los límites de recuperación entre pestañas o recargas constan en la matriz. La revisión prestaging y su autorización siguen pendientes.

### Compactación de la columna Documento

**PASS — VENTAS_RD_2_COMPACT_READY.** El listado reúne tipo y número completo en una línea y estado y ambiente en otra. Los casos de boleta y factura típicos ocuparon dos líneas físicas a 1440 px, frente a tres o cuatro bloques en el diseño anterior. Los dos bloques permiten reflujo según el espacio disponible. La nota interna conserva sus dos textos y los resúmenes incompletos o contradictorios indican qué dato no se pudo verificar. `SENT` se presenta como «Resultado por verificar». Una aceptación de Local o Beta conserva el tono neutro. El detalle mantiene su presentación anterior.

| Validación | Resultado |
| --- | --- |
| Angular, `sales-presentation.spec.ts` y `sales-page.component.spec.ts` | 44 PASS. Incluye ocho estados fiscales en tres ambientes, ausencia explícita, datos inválidos, número de 30 caracteres, estado comercial independiente y consultas v2 del listado. Registro `compact-angular.log`. |
| Playwright Chromium `compact sales documents` | 8 PASS a 1440, 1024, 390 y 320 CSS px en claro y oscuro. Verificó líneas físicas de boleta y factura en escritorio, texto completo dentro de la celda, cero desplazamiento horizontal, contraste focal mínimo de 4.5:1, columnas, acceso al detalle con Tab y Enter, foco al volver y cero escrituras HTTP. Registro `compact-playwright.log`. |
| Compilación Angular y `git diff --check` | PASS. Persisten los avisos CommonJS de pdfmake y vfs_fonts. Registro `compact-build.log`. |

Las capturas sintéticas están en `%TEMP%\inktoy-ventas-rd-2\visual-compact`. `list-1440-light.png` muestra boleta y factura en dos líneas. `list-1024-light.png` y `list-390-dark.png` muestran una referencia extensa, resultado fiscal por verificar y resumen contradictorio. Se conserva la captura previa en `visual-corrective/list-1440-light.png`. En anchos estrechos los textos extensos pueden ocupar más líneas. La verificación de reflujo y contraste se limita al listado y a Chromium.

Comandos desde `frontend`, con el entorno local sintético documentado arriba.

```text
npm test -- --include=src/app/features/sales/sales-presentation.spec.ts --include=src/app/features/sales/sales-page.component.spec.ts --progress=false
node node_modules/@playwright/test/cli.js test e2e/specs/sales-consultation.no-write.spec.ts --grep 'compact sales documents' --project=chromium --workers=1 --retries=0 --reporter=line --output <directorio temporal>/compact-results
npm run build
```

Se modificaron los cuatro archivos de presentación y listado autorizados, sus tres specs y este registro. Los otros 19 archivos conservaron su hash. La numeración comercial continúa en una fase independiente.

### Inventario Git final

Rama `feat/ventas-rd-2-frontend`, HEAD `d6d53ec43e1f3b71f46df50a138fb66c53874fee`. Índice vacío. Se conservan 20 archivos modificados y 7 sin seguimiento, todos del alcance de RD-2. `git diff --check` sin errores.

El correctivo de contenido y presentación tocó 11 archivos. El correctivo final de foco tocó solo los dos archivos de Anulación, el spec Playwright de consulta de Ventas y este registro. Los otros 23 archivos del inventario conservaron el hash del preflight del correctivo final.

| Área | Archivos tocados por el correctivo |
| --- | --- |
| Listado y clasificación | `sales-page.component.html`, `sales-page.component.spec.ts`, `sales-presentation.ts`, `sales-presentation.spec.ts` |
| Detalle | `sale-detail-page.component.html`, `sale-detail-page.component.css`, `sale-detail-page.component.spec.ts` |
| Anulación | `sale-void-page.component.ts`, `sale-void-page.component.spec.ts` |
| Evidencia | `sales-consultation.no-write.spec.ts` y este registro QA |

| Estado | Directorio | Archivos |
| --- | --- | --- |
| Modificados (5) | `frontend/e2e/specs/` | `commercial-dates.no-write.spec.ts`, `internal-note.no-write.spec.ts`, `pos-recovery-delivery.no-write.spec.ts`, `pos-workspace.no-write.spec.ts`, `sales-consultation.no-write.spec.ts` |
| Modificados (4) | `frontend/src/app/features/sales/data/` | `cash-register.service.ts`, `sales.models.ts`, `sales.service.spec.ts`, `sales.service.ts` |
| Modificados (11) | `frontend/src/app/features/sales/` | `sale-detail-page.component.css`, `sale-detail-page.component.html`, `sale-detail-page.component.spec.ts`, `sale-detail-page.component.ts`, `sale-void-page.component.ts`, `sales-page.component.css`, `sales-page.component.html`, `sales-page.component.spec.ts`, `sales-page.component.ts`, `sales-presentation.spec.ts`, `sales-presentation.ts` |
| Sin seguimiento (6) | `frontend/src/app/features/sales/` | `sale-document-verification.ts`, `sale-void-attempts.ts`, `sale-void-page.component.spec.ts`, `sales-list-query.spec.ts`, `sales-list-query.ts`, `sales-return-focus.ts` |
| Sin seguimiento (1) | `docs/qa/` | `VENTAS_RD_2_FRONTEND_QA.md` |
