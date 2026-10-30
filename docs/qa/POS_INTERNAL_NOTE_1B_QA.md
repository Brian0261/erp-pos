# POS-INTERNAL-NOTE-1B — implementación y QA local

Fecha: 2026-10-28, America/Lima. Base y HEAD sin commits nuevos:
`3afc33405b41aac094c1189c68adae9cccf274d6`. Rama autorizada: `feature/pos-internal-note-1b`.

Resultado: **PARTIAL — PHYSICAL_PRINT_VALIDATION_PENDING**. Implementación, build, QA focal y revisión visual digital satisfactorios; pendiente exclusivamente la impresión física representativa. B no está CLOSED ni se autoriza cierre Git.

## Implementación

- Ruta lazy `/ventas/:id/nota` dentro del layout y roles existentes de ventas.
- GET autorizado → lista permitida documental → A4/ticket → pdfmake bajo demanda.
- POS: referencia separada a última venta, confirmada por GET; Nueva venta enfoca búsqueda sin descartar el carrito. No se modifica checkout/recuperación. Las acciones documentales no aparecen con una preparación incierta pendiente.
- Detalle de venta: Ver nota interna; reimpresión independiente de caja, carrito y navegador original.
- Consulta inicial, cambio de formato y cada descarga/apertura/impresión realizan GET. Si cambia la revisión documental, se actualiza la nota y se exige otra acción explícita.
- Sesión documental por instancia, credencial HTTP ligada con el mecanismo existente, respuestas obsoletas descartadas, limpieza de URLs/ventanas por cambio de credencial o destrucción.
- Vista PDF nativa, contenido HTML accesible, estados de carga/generación lenta/error, reintento y alternativas de apertura/descarga. El título recibe foco; en pantallas pequeñas se lleva al contenido de la nota.
- El documento permite número, fecha Lima, cajero, caja, almacén, identidad de artículos, cantidades textuales y valores persistidos. Excluye referencias bancarias, barcode, motivo privado de anulación, JWT y datos fiscales/clientes no necesarios.
- Snapshots primero; identidad actual de catálogo expresamente rotulada para históricos. Cantidades con eliminación exclusivamente textual de ceros fraccionarios redundantes; sin fallback numérico para `quantityText`. Una cantidad textual ausente o una pareja parcial de snapshots rechaza la generación.
- Personalización tipada en `NOTE_CONFIG`; contacto vacío omitido. Logo local, Roboto del VFS local, colores InkToy; sin CDN.

## Plantillas

- A4 vertical: 595.28 × 841.89 pt; márgenes de 15 mm (42.52 pt). Columnas exteriores 78/22/26/24/30 mm, incluido padding explícito; cuerpo 9.5 pt, metadatos 8.5 pt, título 12 pt, número 14 pt y total 16 pt. Cabecera repetida y filas indivisibles; identidad a la izquierda, título/número a la derecha.
- Ticket 80 mm, útil 72 mm; ticket 58 mm, útil 50 mm. Anchos PDF 226.77/164.41 pt; margen lateral 11.34 pt. Monocromáticos.
- Tickets de altura automática: secciones documentadas de pdfmake de hasta 20 artículos, con identificación, estado y continuación repetidos. Pie en el contenido de cada sección, sin header/footer dinámico incompatible con altura automática. Totales/pagos únicamente al final; sin APIs internas de medición.
- Valores numéricos de más de nueve caracteres pasan a continuaciones etiquetadas a ancho completo, sin partir dígitos. Se incluye fecha de generación y fecha de anulación cuando está disponible.
- Totales, pagos, vuelto, agradecimiento y pie forman un bloque indivisible. Encabezado y pie identifican la venta en cada página; ANULADA se repite en ambas zonas.
- La vista previa y descarga comparten el PDF. La variante de impresión añade `/OpenAction /Print`; no afirma salida de papel ni detecta cancelación, falta de papel o desconexión.

## Gate de dependencia

- `pdfmake` **0.3.13**, licencia MIT; npm verificó integridad SHA-512:
  `Am2dbb5SuDwnpx1oNlCgZou91p9SMsyUs7Dws+yF6MmZbycfItt53MbyqdVUhFg6fWL3sWwu2acsJV7lzoRLlg==`.
- Dependencias directas resueltas del motor: pdfkit 0.20.2, xmldoc 2.0.3 y linebreak 1.1.0; cadena transitiva en lockfile con integridades/licencias.
- Tipos necesarios: `@types/pdfmake` **0.3.3**. Compilación Angular/TypeScript estricta satisfactoria; sin `any`, supresión de errores o relajación de tsconfig.
- Roboto 3.014 incluida en el VFS: metadatos de la fuente verificados con fontkit, licencia SIL OFL 1.1. Avisos MIT/OFL conservados en `frontend/src/assets/licenses/`; la fuente no fue modificada. [Licencia oficial Roboto Classic](https://github.com/googlefonts/roboto-classic/blob/main/OFL.txt).
- `npm audit --omit=dev --json`: **0 vulnerabilidades**.
- Auditoría completa: 16 avisos (1 low, 9 moderate, 6 high, 0 critical). Auditoría del lockfile HEAD en directorio temporal: exactamente los mismos 16 avisos. Altos preexistentes: Angular CLI, MCP SDK, body-parser, undici, vite y zod. No se modificaron versiones de paquetes existentes ni se ejecutó audit fix.
- pdfmake y VFS son CommonJS: el build conserva dos avisos de optimización; no se silenciaron.
- `autoPrint` de los tipos no funciona como opción de creación en 0.3.13. Se usa `getStream()` y la misma extensión `setOpenActionAsPrint()` usada por `OutputDocumentBrowser.print()`, comprobada y estrechada en runtime, conservando control de las URLs. La prueba del PDF comprueba `/OpenAction /Print`. Revalidar este punto al actualizar el motor.
- Fuentes primarias: [paquete npm](https://www.npmjs.com/package/pdfmake/v/0.3.13), [integración cliente](https://pdfmake.github.io/docs/0.3/getting-started/client-side/), [métodos](https://pdfmake.github.io/docs/0.3/getting-started/client-side/methods/). También se inspeccionó el código de la versión instalada.

## QA focal ejecutada

Toolchain portable existente, solo PATH del proceso:
`C:\Users\USUARIO\AppData\Local\InkToyToolchains\node-v22.23.3`; Node 22.23.3/npm 10.9.9.
Angular 21.2.25/CLI 21.2.26, TypeScript 5.9.3, Playwright 1.61.1, Chromium 149 en Windows.
Equipo de referencia: Intel Core i5-12400, 6 núcleos/12 hilos y 15.8 GiB de RAM.
ChromeHeadless de Karma usó el Chromium instalado por Playwright mediante CHROME_BIN.

| Categoría | Resultado | Evidencia |
| --- | --- | --- |
| Unitarias/integración frontend nuevas | 23 PASS; 0 FAIL/ERROR/SKIPPED finales | `note.spec.ts`: identidad histórica, cantidades, importes persistidos, exclusiones, tres perfiles, secciones/continuaciones, anulaciones, sesión, GET ligado, URLs, error/latencia PDF, cambios antes de salida, 0/401/403/404/422 y popup bloqueado |
| E2E controladas headless | 12 casos distintos PASS | POS confirmado/foco, incierto sin nota, detalle/reimpresión, descargas/impresión, formatos, responsive, 50/200 líneas, 20 ciclos, denegaciones, carga/red/reintento, fallo de recurso, popup, reapertura, respuesta tardía y datos históricos/markup inerte |
| Visor nativo Chromium con interfaz | 1 PASS | PDF real visible en iframe, captura `02b-native-pdf-viewer.png`, sin pageerror de aplicación |
| Build producción estricto | PASS | `npm run build`, exit 0; dos avisos CommonJS documentados |
| PDF/texto/geometría | 8 documentos regulares + 2 históricos + variante Print PASS | Pypdf/Pdfium: dimensiones, texto seleccionable, cada SKU exactamente una vez, totales persistidos completos, tildes, exclusión de valores prohibidos, ANULADA en cada página y cajas de texto dentro de la página |
| Revisión visual real | PASS | Capturas de app y renderizado de PDFs; se inspeccionaron primeras/últimas páginas y hojas de contacto completas |
| Impresión física | PENDING | Sin impresora representativa disponible para esta validación; visor/acción Print no acreditan hardware |

Todos los endpoints API de E2E están interceptados por respuestas sintéticas. El harness registra métodos/rutas y aborta cualquier método distinto de GET. No se contactó un backend, una base compartida ni datos de negocio. No se ejecutaron pruebas de A ni campañas comerciales anteriores.

Las fixtures contienen importes deliberadamente independientes de los productos para detectar recálculos: el criterio documental es reproducir el GET, no reconstruirlo.

Comandos desde `frontend` (PATH/CHROME_BIN como se indicó):

```text
npm install --save-exact --ignore-scripts pdfmake@0.3.13
npm install --save-dev --save-exact --ignore-scripts @types/pdfmake@0.3.3
npm audit --omit=dev --json
npm audit --json
npm run build
npm test -- --include=src/app/features/sales/internal-note/note.spec.ts --progress=false
npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --grep-invert @native
npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --headed --grep @native
```

Tras cambios focales se repitieron exclusivamente los casos afectados mediante `--grep 'real PDF preview|50/200 items'` (2 PASS), build y unitarias. Se reutiliza la evidencia de los demás recorridos y del visor nativo; no se suman repeticiones como casos nuevos.

Incidencias del desarrollo corregidas: fixtures/tipos de pdfmake; autoaltura con pie dinámico (resuelta con secciones y pies en contenido); aislamiento del init script de QA respecto al iframe; distinguir URL de worker de URLs documentales; opción autoPrint ignorada; pie de ticket huérfano; padding A4 fuera de sus cotas; cadena sin espacios que excedía el ticket estrecho (wordBreak condicional para texto/SKU, nunca para números). Se recuperó y contrastó el plan anterior desde el historial para ajustar cotas y criterios. Las correcciones finales se verificaron; no quedan fallos funcionales pendientes de esas incidencias.

## PDFs y evidencia visual

Directorio local externo al repositorio:
`C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\`.
No se añadieron PDFs, imágenes, vídeos o trazas al Git.

| Captura | Contenido inspeccionado |
| --- | --- |
| `01-pos-desktop.png` | Confirmación compacta y continuación sin imprimir |
| `02-note-desktop.png` | Página y alternativa cuando headless no ofrece visor |
| `02b-native-pdf-viewer.png` | Visor nativo con el PDF real |
| `03-note-tablet.png` | Acciones y contenido a 900 × 1100 |
| `04-note-mobile.png` | Acciones visibles, adaptación a 390 × 844; tabla accesible con scroll interno |
| `05-permission-error.png` | Denegación sin número, datos ni PDF |
| `a4-normal-p1.png` | A4 de varios productos |
| `a4-50-p1.png`, `a4-annulled-200-p15.png` | Cabecera repetida y cierre multipágina |
| `ticket80-normal-p1.png`, `ticket58-normal-p1.png` | Tickets breves, una página, nombres multilínea y totales |
| `ticket80-200-p10.png`, `ticket-annulled-200-p10.png` | Cierre con totales/pie agrupados; estado anulado inequívoco |
| `a4-historical-long-values-p1.png`, `ticket58-historical-long-values-p1.png` | Cantidad extrema textual y valores largos sin perder dígitos; procedencia actual e HTML como texto |
| `*-contact.png` | Hojas de contacto de todas las páginas, incluidas 15 A4 y 10 secciones ticket |

PDFs inspeccionados: `a4-normal.pdf` (1 página), `a4-50.pdf` (5), `a4-200.pdf` (15),
`ticket80-normal.pdf` (1; ancho 226.77 pt), `ticket58-normal.pdf` (1; ancho 164.41 pt), ambos con altura automática,
`ticket80-200.pdf` (10), `a4-annulled-200.pdf` (15), `ticket-annulled-200.pdf` (10).
`print-request.pdf` acredita acción Print y texto seleccionable.

Scripts de inspección locales: `inspect-pdfs.py`, `check-pdf-bounds.py`, `check-historical.py`; resultados:
`pdf-validation.json`, `pdf-bounds-and-print.json`, `historical-validation.json`. Usan Pypdf y Pdfium del runtime existente.

## Rendimiento y recursos

- Medición local de navegación hasta PDF listo con 50 artículos: **1257 ms**, incluyendo GET y recursos; es una cota superior a su generación. Umbral aprobado 2 s: PASS.
- Cambio a ticket y preparación con 200 artículos: **255 ms**. Umbral aprobado 5 s: PASS.
- Son tiempos de UI local en el navegador/equipo de referencia; no representan impresora ni red productiva. No se promete el mismo tiempo en dispositivos más lentos.
- Veinte cambios/generaciones sucesivas: una URL PDF activa; al salir mediante RouterLink/cambiar credencial: cero. Heap usado después de GC: 20,695,660 → 20,773,840 bytes; rango últimas cinco muestras 44,112 bytes, sin crecimiento sostenido por PDFs retenidos. Las ventanas temporales se cierran y sus URLs se revocan. El motor conserva un worker de código, no un documento. No es un perfil completo de memoria del proceso del navegador.
- Carga diferida confirmada por el build y por ausencia de solicitudes pdfmake/VFS en POS antes de una acción documental.
- Bundle inicial aproximado: 1.56 MB raw / 265.21 kB estimados transferidos. Motor lazy: 818.05 kB / 259.27 kB; fuentes lazy: 854.66 kB / 310.29 kB; página lazy: 14.8 kB / 4.30 kB. Payload diferido aproximadamente 1.69 MB sin compresión, menor al límite aprobado de 2.5 MB: PASS. Las estimaciones del build no son una medición de compresión de servidor.

## Inventario autorizado

Ocho archivos existentes modificados:

1. `frontend/package.json`
2. `frontend/package-lock.json`
3. `frontend/src/app/app.routes.ts`
4. `frontend/src/app/features/sales/pos-page.component.ts`
5. `frontend/src/app/features/sales/sale-detail-page.component.ts`
6. `frontend/src/app/features/sales/data/sales.service.ts`
7. `frontend/src/app/features/sales/data/sales.models.ts`
8. `frontend/src/app/features/sales/components/pos-search-panel.component.ts`

Archivos nuevos:

- `frontend/src/app/features/sales/internal-note/note-model.ts`
- `frontend/src/app/features/sales/internal-note/note-pdf.ts`
- `frontend/src/app/features/sales/internal-note/note-session.ts`
- `frontend/src/app/features/sales/internal-note/internal-note-page.component.ts`
- `frontend/src/app/features/sales/internal-note/internal-note-page.component.css`
- `frontend/src/app/features/sales/internal-note/pos-sale-note.component.ts`
- `frontend/src/app/features/sales/internal-note/note-test-data.ts`
- `frontend/src/app/features/sales/internal-note/note.spec.ts`
- `frontend/e2e/specs/internal-note.no-write.spec.ts`
- `frontend/src/assets/licenses/pdfmake-MIT.txt`
- `frontend/src/assets/licenses/Roboto-OFL.txt`
- Este informe QA.

## Riesgos y siguiente gate

- Pendiente exclusivamente la validación física de perfiles/driver/papel y cancelación/respuesta real del dispositivo. La app comunica estos límites y ofrece descarga; no afirma impresión exitosa.
- Visor y acción Print dependen del navegador. Chromium headless no ofrece visor integrado; Chromium con interfaz sí lo mostró. Otros navegadores/dispositivos no se acreditan aquí.
- Fuentes/motor lazy tienen el tamaño indicado; validar un dispositivo operativo de menores recursos antes de prometer el mismo rendimiento.
- Avisos de tooling preexistentes y CommonJS descritos arriba; sin cambios automáticos de dependencias ajenas.
- Reproducción documental por datos y plantilla vigente; no se promete identidad binaria histórica.

Git final: cambios locales sin staging, sin commits/push/PR/merge. `master` permanece en el SHA base. No se tocaron backend, DB, Auth/JWT, infraestructura ni fases CLOSED. Siguiente gate: revisión humana del diff y de esta evidencia de B; las operaciones Git requieren autorización independiente.

## Ajustes finales de presentación — 2026-10-28

**PASS — B_VISUAL_ADJUSTMENTS_READY.** Los siete ajustes autorizados quedan acreditados digitalmente. La impresión física continúa **PENDIENTE**, separada de este resultado; B no se declara CLOSED. El registro anterior describe la implementación inicial y se conserva como evidencia histórica. Las capturas y tamaños indicados en esta sección corresponden a la presentación final y sustituyen a los anteriores únicamente para evaluar estos ajustes.

### Alcance y cambios

Preflight: rama `feature/pos-internal-note-1b`, HEAD `3afc33405b41aac094c1189c68adae9cccf274d6`, índice vacío y los 8 modificados/12 nuevos acreditados. Se preservó B. Este ajuste afecta exclusivamente a:

1. `frontend/src/app/features/sales/internal-note/note-model.ts`
2. `frontend/src/app/features/sales/internal-note/note-pdf.ts`
3. `frontend/src/app/features/sales/internal-note/internal-note-page.component.ts`
4. `frontend/src/app/features/sales/internal-note/note.spec.ts`
5. `frontend/src/app/features/sales/internal-note/note-presentation.spec.ts` (nuevo)
6. `frontend/e2e/specs/internal-note.no-write.spec.ts`
7. `docs/qa/POS_INTERNAL_NOTE_1B_QA.md`

| Ajuste | Resultado observado |
|---|---|
| A. SKU | Retirado de la lista documental permitida, tablas PDF y HTML. Se conservan los campos REST y la validación conjunta de snapshots. El nombre capturado permanece; los históricos identifican expresamente el nombre del catálogo actual. |
| B. Título | `NOTA DE VENTA` en configuración, PDF A4/ticket, título de pantalla y HTML accesible. Número e identidad de venta conservados. |
| C. Datos operativos | Cajero, caja y almacén excluidos del modelo documental, PDF y HTML; sin cambios a ventas ni API. Fecha, artículos, cantidades, precios, descuentos, importes, pagos, total y vuelto conservados. |
| D. Leyenda | Eliminada de configuración, PDF y HTML, sin advertencia sustitutiva. |
| E. Encabezado térmico | Ticket normal sin REGISTRADA, fracción 1/1 ni continuación. En varias secciones, número y fracción mínima de continuidad; artículos en orden, totales/pagos una sola vez al cierre. ANULADA y fecha disponibles en cada sección anulada. |
| F. Logo | Asset local aprobado convertido en memoria a negro sobre blanco y recortado solo en su margen vacío. Centrado, sin texto InkToy duplicado, con proporción preservada mediante `fit` de 110 pt (58 mm) y 128 pt (80 mm), aproximadamente 38.8/45.2 mm de ancho. |
| G. Productos térmicos | Nombre completo multilínea y tabla inferior con CANT., P. UNIT., IMPORTE, alineados a la derecha; descuentos asociados aparte. Valores extremos pasan a pares etiqueta/valor a ancho completo. Solo se permite corte por carácter en secuencias largas sin espacios, conservando las palabras ordinarias. |

El logo global no cambió: `git hash-object` y `git rev-parse HEAD:frontend/src/assets/images/brand/logo-inktoy.png` coinciden en `31d1abc12df4b8aaa207380e2914e46799f98253`. No se instalaron dependencias. No se modificaron contratos REST, backend, DB, permisos, recuperación, checkout, caja, inventario, pagos, infraestructura ni otros archivos de B durante este ajuste. El A4 conserva su estado REGISTRADA; la simplificación del ajuste E corresponde al ticket.

### QA focal y reutilización

Toolchain existente, sin instalación: Node `v22.23.3`/npm `10.9.9` de `C:\Users\USUARIO\AppData\Local\InkToyToolchains\node-v22.23.3`; Chromium de `C:\Users\USUARIO\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe`. Comandos desde `frontend`, con esas rutas en PATH/CHROME_BIN:

| Comando final | Resultado |
|---|---|
| `npm run build` | PASS, salida 0, 18.097 s. Dos advertencias CommonJS de pdfmake/VFS conocidas; sin fallo. |
| `npm test -- --include='src/app/features/sales/internal-note/note-presentation.spec.ts' --progress=false` | **9/9 PASS**, sin fallos ni omitidos. |
| `npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --grep '@presentation'` | **2/2 PASS**, 33.7 s. |
| Python del runtime existente + `presentation-final\verify-presentation.py` | **13/13 PDFs PASS**, extracción, integridad y geometría; renders finales generados con Pdfium. |
| `git diff --check` | PASS, salida 0; avisos de normalización LF/CRLF, sin errores de whitespace. |

Comando exacto de inspección PDF, sin instalar paquetes:

```powershell
& 'C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\presentation-final\verify-presentation.py'
```

Las nueve pruebas nuevas verifican exclusión documental sin mutar el DTO, valores persistidos, nombres capturados/históricos, título y A4; para cada ancho térmico, logo/columnas, continuación numérica excepcional, orden en tres secciones, anulación y totales sin duplicar. Un primer intento no compiló por inferencia recursiva TS2589 en un matcher de tipos pdfmake; se corrigió estrechando el objeto inspeccionado y manteniendo las comprobaciones de imagen/alineación. La ejecución final anterior pasó sin desactivar aserciones.

Los dos E2E focales usan solo datos sintéticos e interceptan `/api/**`, rechazando escrituras. Acreditan:

- Título y contenido limpio en HTML, cambio A4/80/58, nombres de 180 caracteres, decimales, descuentos y cifras extremas.
- Identidad binaria entre Blob de vista previa y descarga A4 normal; documentos descargados con las plantillas nuevas y variante de impresión real con `/OpenAction /Print`.
- Reimpresión desde detalle y nueva consulta ante anulación; estado y fecha de anulación, sin modificar datos comerciales.
- Solo GET en las acciones documentales; cero errores de página. Cambio de credencial borra datos y deja cero URLs Blob activas.

Se conservaron las aserciones de seguridad e integridad anteriores. En `note.spec.ts`, la aserción de SKU del documento se reemplazó por nombre completo más ausencia explícita del SKU. En E2E se actualizó el texto de procedencia histórica y se reforzó la comprobación de sesión tardía para inspeccionar toda `.note-page`, ya que el h1 ahora es constante. Los 23 unitarios y 13 E2E de la campaña inicial **no se reejecutaron**. Su evidencia de flujos/permisos/limpieza no modificados se reutiliza, y las nuevas pruebas focales cubren las decisiones de presentación alteradas. No se repitió QA backend, DB ni campañas globales.

Build final: inicial 1.56 MB raw / 265.85 kB estimados transferidos; motor lazy 818.05/259.27 kB, fuentes lazy 854.66/310.29 kB, página lazy 14.54/4.21 kB. Se mantiene la carga diferida; no es una medición de red productiva.

### PDFs reales y evidencia visual final

Directorio fuera de Git: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\presentation-final`.

| PDF | Páginas/secciones | Evidencia renderizada |
|---|---:|---|
| `a4-normal.pdf` | 1 | `a4-normal-p1.png` |
| `a4-multi.pdf` | 13 | `a4-multi-p1.png`, `a4-multi-p13.png` |
| `a4-annulled.pdf` | 13 | `a4-annulled-p1.png`, `a4-annulled-p13.png` |
| `ticket58-normal.pdf`, `ticket80-normal.pdf` | 1 cada uno | `ticket58-normal-p1.png`, `ticket80-normal-p1.png` |
| `ticket58-long-names.pdf`, `ticket80-long-names.pdf` | 1 cada uno | `ticket58-long-names-p1.png`, `ticket80-long-names-p1.png` |
| `ticket58-long-values.pdf`, `ticket80-long-values.pdf` | 1 cada uno | `ticket58-long-values-p1.png`, `ticket80-long-values-p1.png` |
| `ticket80-multi.pdf` | 10 | `ticket80-multi-p1.png`, `ticket80-multi-p10.png` |
| `ticket58-annulled.pdf`, `ticket80-annulled.pdf` | 10 cada uno | `ticket58-annulled-p1.png`, `ticket58-annulled-p10.png`, `ticket80-annulled-p1.png`, `ticket80-annulled-p10.png` |
| `print-presentation.pdf` | 1, 58 mm | Acción Print inspeccionada en el PDF; misma presentación de valores extremos. |

`html-updated.png` muestra el panel accesible completo. Cada PDF tiene un `.expected.json` sintético obtenido de los valores GET de su escenario; `verify-presentation.py` y `presentation-validation.json` conservan la comprobación reproducible.

Extracción y geometría: título, venta y fecha correctos; ninguna SKU ni dato operativo/leyenda retirados; todos los nombres completos una vez; cantidades desde `quantityText` sin conversión numérica; igualdad exacta del multiconjunto de precios, descuentos, importes, totales y pagos. Se usan valores deliberadamente no reconstruibles por cantidad por precio para detectar recálculo. ANULADA en cada página anulada; logo en cada sección térmica; anchos 595.28/226.77/164.41 pt según perfil. Pdfium comprobó que todos los cuadros de caracteres de los 13 PDFs quedan dentro de sus páginas (tolerancia 0.5 pt).

Inspección visual real satisfactoria: A4 normal y multipágina/cierre, tickets normales de ambos anchos, nombres largos, cifras extremas, continuidad, anulación y HTML. Logo negro reconocible, centrado y proporcionado en 58/80; encabezado limpio y jerarquía clara; cantidad/precio/importe diferenciados y alineados, descuentos separados. No se observaron cifras truncadas, solapamientos, cortes de nombres ni pérdida/duplicación de productos o totales. Las cifras excepcionales usan el ancho completo sin reducir la fuente hasta volverla ilegible. Los tickets extensos mantienen altura automática y veinte artículos por sección; la validación digital no acredita el corte físico del papel.

### Estado y riesgos pendientes del ajuste

- Impresión física **PENDIENTE**: verificar escala/márgenes reales, definición del logo, driver, ancho imprimible, continuidad/corte y cancelación con las impresoras disponibles. No se declara impresión exitosa ni compatibilidad de hardware por resultados PDF/navegador.
- Visor/acción Print dependen del navegador; referencia Chromium local. No se amplía la acreditación a otros dispositivos.
- Asset global y dependencias intactos; avisos CommonJS conocidos. Ningún PDF, captura ni script de evidencia se incorpora a Git.
- Estado final: misma rama/HEAD; **8 modificados y 13 nuevos**, índice vacío, sin operaciones Git de escritura. El único archivo nuevo adicional respecto de B es `note-presentation.spec.ts`.

Siguiente gate: **revisión final del diff y QA de B antes de cualquier cierre Git**. Sin staging, commit, push, PR ni merge; B permanece sin cierre formal.

## Columnas térmicas según referencia — 2026-10-28

**PASS — B_VISUAL_ADJUSTMENTS_READY.** Ajuste posterior autorizado por el usuario: reproducir solo la disposición del bloque de productos de su imagen en tickets de 58/80 mm, incluidas ventas anuladas; el resto permanece igual. Esta sección sustituye la disposición de tres columnas descrita arriba. La impresión física sigue pendiente.

- Un encabezado Cantidad / Unidad / P. Unitario / Total por sección; abreviaturas legibles en 58 mm.
- Nombre completo a todo el ancho, debajo del encabezado y encima de sus valores. Se conservan el orden/numeración, fuente y tratamiento histórico existentes.
- Fila inferior con cantidad a la derecha, unidad centrada y precio/total a la derecha. Descuento asociado debajo, sin repetir encabezados por producto.
- **UND. es una etiqueta fija de presentación elegida expresamente por el usuario.** El detalle REST no expone unidad de medida histórica; no se infiere ni se consulta el catálogo, ni se afirma que esta etiqueta provenga de un snapshot.
- Se mantiene la continuación etiquetada a ancho completo para cantidades/precios/importes excepcionales. No se recalculan ni redondean cantidades o importes persistidos.
- A4, HTML, logo, cabeceras generales, fechas, anulación, totales, pagos, vuelto, descarga/impresión y control de sesión conservan su implementación. No hay cambios comerciales, contratos ni dependencias.

Archivos de esta intervención (cuatro):

1. `frontend/src/app/features/sales/internal-note/note-pdf.ts`: solo construcción del bloque térmico y su llamada.
2. `frontend/src/app/features/sales/internal-note/note-presentation.spec.ts`: aserciones de encabezado único, nombre a ancho completo antes de la fila de cuatro valores, alineación, UND. y continuación numérica; se conservan las de integridad/seguridad.
3. `frontend/e2e/specs/internal-note.no-write.spec.ts`: un caso `@ticket-columns`; helper de evidencia acepta carpeta opcional, manteniendo el destino anterior por defecto.
4. `docs/qa/POS_INTERNAL_NOTE_1B_QA.md`: esta sección, conservando el registro previo.

### Validación ejecutada

Mismo Node 22.23.3/npm 10.9.9 y Chromium locales acreditados arriba. Desde `frontend`:

| Comando | Resultado |
|---|---|
| `npm run build` | PASS, salida 0, 17.050 s; solo las dos advertencias CommonJS conocidas. |
| `npm test -- --include='src/app/features/sales/internal-note/note-presentation.spec.ts' --progress=false` | 9/9 PASS, cero fallos/omitidos. |
| `npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --grep '@ticket-columns'` | 1/1 PASS, 22.6 s; caso de 6.9 s. |
| `git diff --check` | PASS. |

El E2E genera siete PDFs reales con datos sintéticos: normal de ambos anchos, nombres de 180 caracteres y valores extremos de ambos anchos, 41 artículos en tres secciones de 80 mm y los dos anchos anulados con tres secciones. Verifica igualdad binaria de vista previa/descarga en ambos tickets normales, acceso desde detalle, nueva consulta ante anulación, solo GET, cero errores de página y limpieza de datos/URLs ante cambio de sesión. No se repitieron las campañas originales de 23 unitarios/13 E2E ni QA backend/DB/A4 sin cambios.

Inspección PDF con el runtime existente, desde cualquier directorio:

```powershell
& 'C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\ticket-columns\verify-columns.py'
```

**7/7 PASS.** Extracción: nombres completos una vez, cantidad textual exacta, igualdad del multiconjunto de todos los importes persistidos, UND. por producto, encabezado una vez por sección y ausencia de SKU/datos operativos/leyenda. Geometría: caracteres dentro de cada página; en ambos tickets normales se verifican además los cuatro valores en la misma fila, dentro de sus columnas y sin cruzar límites. Un primer intento del script de geometría omitía el punto decimal al agrupar por centro visual del carácter; se corrigió el agrupamiento a la franja vertical de la fila, manteniendo la igualdad exacta de cifras y los límites de columnas. No se cambió código funcional para superar ese diagnóstico.

Evidencia fuera de Git: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\ticket-columns`.

| Documento | Capturas reales |
|---|---|
| `ticket58-normal.pdf`, `ticket80-normal.pdf` | `ticket58-normal-p1.png`, `ticket80-normal-p1.png` |
| `ticket58-long-values.pdf`, `ticket80-long-values.pdf` | `ticket58-long-values-p1.png`, `ticket80-long-values-p1.png` |
| `ticket80-multi.pdf` (3 secciones) | `ticket80-multi-p1.png`, `ticket80-multi-p3.png` |
| `ticket58-annulled.pdf`, `ticket80-annulled.pdf` (3 secciones cada uno) | `ticket58-annulled-p1.png`, `ticket58-annulled-p3.png`, `ticket80-annulled-p1.png`, `ticket80-annulled-p3.png` |

Se conservan los `.expected.json` de cada escenario, `verify-columns.py`, `columns-validation.json` y snapshots/hashes previos para acreditar el alcance. Inspección visual satisfactoria de ambos anchos, cifras/nombres largos, continuaciones y anulaciones: encabezados separados, nombre sobre valores, UND. legible, decimales y descuentos íntegros, sin cortes o solapamientos observados.

Git permanece en `feature/pos-internal-note-1b`, HEAD `3afc33405b41aac094c1189c68adae9cccf274d6`, índice vacío, 8 modificados/13 nuevos. Sin commit, tag, push, cambio de rama/worktree ni cierre formal de B. Riesgo residual: verificar escala, definición, driver, ancho imprimible y corte en impresora física. Siguiente gate sin cambios: revisión final de diff y QA antes de cualquier cierre Git.

## Texto negro sin negrita — 2026-10-28

**PASS — B_VISUAL_ADJUSTMENTS_READY.** A petición posterior del usuario, todo el texto documental de A4, 58/80 mm y anulaciones queda negro y sin negrita. Este criterio sustituye las referencias anteriores a texto azul/rojo o resaltado en negrita; el resto del diseño y contenido se conserva.

- Configuración documental `#000000`, estilo base sin negrita y retirada de todos los pesos bold de títulos, estado, productos, columnas, cifras, totales, agradecimiento, cabeceras y pies.
- ANULADA conserva texto, ubicación y fecha, con el mismo tratamiento negro sin negrita.
- HTML accesible con color calculado negro y peso 400, incluidos títulos, elementos strong, columnas, totales y estado. Su superficie documental se mantiene blanca y el fondo de vuelto claro para conservar contraste en tema claro/oscuro. Controles de la aplicación fuera del documento sin cambios.
- Logo sin alteraciones: se conserva la imagen original de A4 y la adaptación térmica ya aprobada. Columnas, UND. fija, datos, importes y cantidades permanecen intactos. No hay cambios comerciales, de contratos, seguridad ni dependencias.

Archivos de esta intervención (seis): `frontend/src/app/features/sales/internal-note/note-model.ts`, `note-pdf.ts`, `internal-note-page.component.css`, `note-presentation.spec.ts` (los últimos tres bajo el mismo directorio internal-note), `frontend/e2e/specs/internal-note.no-write.spec.ts` y este informe. El cambio del modelo se limita al color de configuración; el mapeo de valores no se modifica.

### Validación focal

Mismo toolchain local acreditado, desde `frontend`:

| Comando | Resultado |
|---|---|
| `npm run build` | PASS, salida 0, 12.958 s; solo las dos advertencias CommonJS conocidas. |
| `npm test -- --include='src/app/features/sales/internal-note/note-presentation.spec.ts' --progress=false` | 10/10 PASS. Nueva aserción recursiva de color/peso para tres formatos y ambos estados, incluidas cabeceras/pies dinámicos. Se mantienen las comprobaciones anteriores. |
| `npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --grep '@regular-black'` | 1/1 PASS, 21.9 s; caso de 7.7 s. |
| `git diff --check` | PASS. |

El E2E usa datos sintéticos y acredita estilos calculados de todos los elementos con texto del HTML documental en temas claro y oscuro (peso 400, RGB 0/0/0), igualdad binaria vista previa/descarga en seis escenarios, impresión solicitada, GET únicamente, cero errores de página y limpieza de URLs/datos ante cambio de sesión. No se repiten las campañas globales ni QA backend/DB.

Inspección de los PDFs reales con el runtime existente:

```powershell
& 'C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\regular-black\verify-typography.py'
```

**7/7 PASS.** Se inspeccionaron los operadores de pintado de texto y sus estados gráficos: los 4629 bloques de texto comprobados son negros y utilizan Roboto-Regular, sin fuente Medium/Bold. Se compararon los píxeles decodificados de cada logo con los PDFs anteriores: idénticos. Extracción de nombres/cantidades/importes persistidos y límites geométricos de todos los caracteres satisfactorios. La variante de impresión conserva `/OpenAction /Print`.

Evidencia fuera de Git: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\regular-black`.

- PDFs normales de una página: `a4-normal.pdf`, `ticket58-normal.pdf`, `ticket80-normal.pdf`.
- Anulados de 41 productos y tres páginas/secciones cada uno: `a4-annulled.pdf`, `ticket58-annulled.pdf`, `ticket80-annulled.pdf`; variante `print-regular.pdf` de 58 mm.
- Renders reales: primera/última página de cada PDF no destinado a Print, con nombres `*-p1.png`/`*-p3.png`; `html-regular-black.png` para el panel accesible.
- Evidencia reproducible: `.expected.json`, `verify-typography.py`, `typography-validation.json` y snapshots/hashes previos.

Inspección visual satisfactoria de A4, ambos tickets, anulaciones/cierre multipágina y HTML: texto negro sin negrita, logo conservado, columnas y cifras legibles, sin recortes o solapamientos observados. Impresión física sigue **PENDIENTE**, sin nueva afirmación de compatibilidad del dispositivo.

Git y siguiente gate sin cambios: misma rama/HEAD, 8 modificados/13 nuevos, staging vacío, sin commit/tag/push ni cierre formal de B. Pendiente revisión final de diff y QA antes de cualquier cierre Git.

## A4 adaptado a referencia visual — 2026-10-28

**PASS — B_VISUAL_ADJUSTMENTS_READY.** Petición posterior del usuario: adaptar exclusivamente la composición A4 a su imagen, utilizando únicamente datos existentes. Esta sección sustituye la composición A4 anterior; se mantienen texto negro sin negrita y los tickets/HTML acreditados.

- Logo aprobado a la izquierda, compensando su margen blanco mediante presentación, sin cambiar píxeles ni asset global. A la derecha: recuadro con NOTA DE VENTA, número y estado originales.
- Franja enmarcada con fecha de venta y medios de pago disponibles; fecha de anulación solo cuando existe.
- Tabla de cuatro columnas: cantidad textual, descripción completa, precio unitario e importe persistidos. El descuento de cada línea, incluido cero, se conserva junto a la descripción; en cifras excepcionales se usa continuación etiquetada a ancho completo.
- Área amplia de formulario para hasta tres productos breves, sin alterar datos ni añadir filas de productos ficticios. Los documentos extensos/históricos o con cifras largas fluyen según su contenido, con encabezado de columnas repetido y marco dentro de los márgenes.
- Resumen enmarcado inferior derecho con subtotal, descuento, total, pagos, pagado y vuelto originales. Cifras grandes usan etiqueta/valor en líneas independientes para conservar todos los dígitos. Agradecimiento, fecha de generación y marca de anulación existentes a la izquierda; paginación y continuidad conservadas.
- No se copiaron datos de negocio de la imagen ni se añadieron campos fiscales, cliente, dirección, vendedor, QR o identificadores ausentes de la lista documental permitida. Sin cambios comerciales, de contratos, backend, seguridad o dependencias.

Archivos de esta intervención (cinco):

1. `frontend/src/app/features/sales/internal-note/note-pdf.ts`: composición A4 y resumen; umbral de continuación de cantidad adaptado al ancho de su primera columna.
2. `frontend/src/app/features/sales/internal-note/note-presentation.spec.ts`: comprobaciones de estructura, datos permitidos, cuatro columnas y continuación numérica de A4.
3. `frontend/src/app/features/sales/internal-note/note.spec.ts`: únicamente la aserción de colSpan pasa de cinco a cuatro columnas, conservando cantidad exacta y demás comprobaciones.
4. `frontend/e2e/specs/internal-note.no-write.spec.ts`: caso focal `@a4-reference`.
5. `docs/qa/POS_INTERNAL_NOTE_1B_QA.md`: esta sección; evidencia histórica conservada.

### Validación focal ejecutada

Mismo Node/Chromium y runtime Python acreditados. Comandos frontend:

| Comando | Resultado |
|---|---|
| `npm run build` | PASS, salida 0, 11.484 s; dos advertencias CommonJS conocidas. |
| `npm test -- --include='src/app/features/sales/internal-note/note-presentation.spec.ts' --progress=false` | 11/11 PASS. |
| `npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --grep '@a4-reference'` | 1/1 PASS, 19.4 s; caso de 7.2 s. |
| `git diff --check` | PASS. |

El E2E genera cuatro vistas/descargas con igualdad binaria: A4 breve, 50 productos, anulado de 200 productos e histórico con nombre de 180 caracteres, cantidad textual extrema y cifras grandes en líneas/resumen. Además genera la variante Print. Solo datos sintéticos y GET; reimpresión desde detalle, HTML sin datos retirados, cero errores de página y limpieza ante cambio de sesión acreditados. No se repiten las campañas globales de 23 unitarios/13 E2E ni QA backend/DB. Los escenarios extensos se generan únicamente para acreditar la composición A4 modificada.

Comprobaciones adicionales, desde la raíz del repositorio para Node:

```powershell
node 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\a4-reference\check-ticket-compatibility.js'
& 'C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\a4-reference\verify-a4.py'
```

- **4/4 comparaciones PASS:** definiciones documentales completas de ticket58/ticket80, COMPLETED/VOIDED, idénticas al estado previo con fecha de generación fijada para la comparación. Motor, logo e impresión conservan su implementación.
- **5/5 PDFs PASS:** todos los nombres completos una vez, cantidades exactas y multiconjunto de importes persistidos idéntico; sin campos ausentes/fiscales añadidos. Texto negro, fuentes sin negrita (Regular/Italic para la procedencia histórica), logo con píxeles idénticos al anterior y Print con `/OpenAction /Print`.
- Todos los caracteres dentro de sus páginas; trazos del marco dentro de los márgenes, contemplando hasta 1 pt por grosor del borde de 0.8 pt. En la inspección auxiliar se normalizan espacios de extracción producidos por kerning; no se normalizan ni recalculan cifras comerciales.

Evidencia fuera de Git: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\a4-reference`.

| PDF real | Páginas | Capturas |
|---|---:|---|
| `a4-normal.pdf` | 1 | `a4-normal-p1.png` |
| `a4-multi-50.pdf` | 4 | `a4-multi-50-p1.png`, `a4-multi-50-p4.png` |
| `a4-annulled-200.pdf` | 13 | `a4-annulled-200-p1.png`, `a4-annulled-200-p13.png` |
| `a4-historical-extreme.pdf` | 1 | `a4-historical-extreme-p1.png` |
| `print-a4-reference.pdf` | 1 | Variante Print del histórico/cifras extremas. |

Se conservan `.expected.json`, `a4-validation.json`, `ticket-compatibility.json`, scripts y snapshots/hashes previos. Revisión visual real satisfactoria del A4 breve, página representativa y cierre multipágina, anulado e histórico extremo: jerarquía y marcos acordes a la referencia, descripción amplia, columnas y resumen alineados, sin recortes ni solapamientos observados.

Estado final esperado del gate: misma rama/HEAD, 8 modificados y 13 nuevos, índice vacío; sin staging/commit/tag/push ni cierre formal de B. Impresión física continúa pendiente. Siguiente gate: revisión final del diff y QA de B antes de cualquier autorización Git.

## Redondeo ligero de recuadros A4 — 2026-10-28

**PASS — B_VISUAL_ADJUSTMENTS_READY.** Se aplica radio de **3 pt** a los contornos exteriores del recuadro de identificación, franja de datos y marco principal A4, incluidas continuaciones/anulaciones. Las divisiones internas permanecen rectas. Contenido, tamaños, posiciones, paginación, texto negro sin negrita y logo conservados.

Archivos de esta intervención (tres):

1. `frontend/src/app/features/sales/internal-note/note-pdf.ts`.
2. `frontend/e2e/specs/internal-note.no-write.spec.ts`: carpeta opcional de evidencia por `INKTOY_A4_EVIDENCE_SUBDIR`; el caso focal y sus aserciones se conservan.
3. `docs/qa/POS_INTERNAL_NOTE_1B_QA.md`: esta sección; registro anterior preservado.

Implementación de presentación: anclas invisibles de altura cero y callback público de layout para obtener las posiciones reales. A4 usa `bufferPages` y dibuja las curvas en el stream público antes de obtener el Blob, en una sola generación; no hay segundo layout/PDF, dependencia nueva ni cambio en la librería. Las curvas tienen opacidad completa y un solape de 1 pt con las rectas para evitar uniones claras por antialias. Las posiciones son locales a cada generación, sin caché documental nueva. Tickets/HTML, cálculos, DTO, permisos y flujos comerciales sin cambios.

### Validación proporcional

Desde `frontend`, mismo toolchain Node/Chromium acreditado:

| Comando | Resultado |
|---|---|
| `npm run build` | PASS final, salida 0, 12.662 s; dos advertencias CommonJS conocidas. |
| `npm test -- --include='src/app/features/sales/internal-note/note-presentation.spec.ts' --progress=false` | 11/11 PASS. Se reutiliza tras el ajuste final exclusivo del empalme vectorial; la estructura/modelo comprobados por estas pruebas no cambiaron. |
| `$env:INKTOY_A4_EVIDENCE_SUBDIR='a4-rounded'` seguido de `npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --grep '@a4-reference'` | PASS final, 1/1, 22.1 s; caso de 7.9 s. |
| `git diff --check` | PASS. |

El primer intento de compilación detectó que el tipo Canvas no declara `id`, aunque el callback público de nodos lo expone y el motor lo admite. Se acotó el retorno a `ContentCanvas & {id:string}`; sin cambios globales de tipos, desactivación de checks ni debilitamiento de aserciones. Tras detectar una unión fina al ampliar las curvas, se corrigió el solape y se repitieron únicamente build, E2E y validación/render afectados. No se repitió QA global.

Comandos de evidencia, con Node desde la raíz del repositorio:

```powershell
node 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\a4-rounded\check-ticket-compatibility.js'
& 'C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\a4-rounded\verify-rounded.py'
```

- **4/4 comparaciones de tickets PASS:** definiciones de ambos anchos/estados idénticas al estado anterior.
- **5/5 PDFs finales PASS:** normal (1 página), 50 productos (4), anulado de 200 (13), histórico extremo (1) y Print (1). Vista previa y descarga idénticas en los cuatro escenarios; Print mantiene `/OpenAction /Print`. Solo GET, cero errores de página y limpieza de URLs/datos de sesión acreditados.
- Igualdad de contenido económico, nombres/cantidades completos, texto negro sin negrita y píxeles del logo conservados. Bordes dentro de márgenes y caracteres dentro de página.
- Comparación con los PDFs anteriores: paginación y posiciones de todos los bloques de texto idénticas; se excluye solo la línea de fecha/hora de generación, dependiente del reloj. Curvas negras visibles con opacidad 1: 12 en cada documento de una página, 18 en el de cuatro páginas y 36 en el de trece.

Evidencia fuera de Git: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\a4-rounded`.

Se conservan los cinco PDFs y `.expected.json`, renders `a4-normal-p1.png`, `a4-multi-50-p1.png`/`-p4.png`, `a4-annulled-200-p1.png`/`-p13.png`, `a4-historical-extreme-p1.png`, ampliación real `corners-detail.png`, `a4-validation.json`, `rounded-validation.json`, `ticket-compatibility.json`, scripts y snapshots previos. Revisión visual satisfactoria del documento y de las cuatro esquinas ampliadas, sin huecos, solapamientos ni desplazamientos observados.

Git conserva rama `feature/pos-internal-note-1b`, HEAD `3afc33405b41aac094c1189c68adae9cccf274d6`, 8 modificados/13 nuevos e índice vacío. Sin staging, commit, push, tags ni cierre formal de B. Impresión física pendiente. Siguiente gate: revisión final del diff y QA antes de cualquier autorización Git.

## Descuento en columna propia de A4 — 2026-10-28

**PASS — B_VISUAL_ADJUSTMENTS_READY.** Petición posterior del usuario: mover descuento a una columna entre descripción y precio unitario y retirarlo de la descripción. A4 queda en orden **Cantidad / Descripción / Descuento / P. unitario / Importe**. La descripción conserva únicamente nombre y procedencia histórica cuando corresponde; el descuento persistido, incluido cero, aparece una vez en su propia celda.

Los cinco anchos de tabla son 18/87/25/25/25 mm dentro del mismo ancho total. Se conserva el espacio del formulario breve compensando la línea retirada. Las cifras excepcionales mantienen la continuación etiquetada a ancho completo, ahora sobre cinco columnas y con Descuento antes de Precio unitario. No se recalculan importes ni cantidades. Resumen, pagos, descuento global, logo, texto negro sin negrita y radio exterior de 3 pt permanecen. Tickets y HTML sin modificaciones.

Archivos de esta intervención (cuatro):

1. `frontend/src/app/features/sales/internal-note/note-pdf.ts`.
2. `frontend/src/app/features/sales/internal-note/note-presentation.spec.ts`: orden de cinco columnas, importe exacto en celda propia, ausencia en descripción y continuación A4 de cinco columnas.
3. `frontend/src/app/features/sales/internal-note/note.spec.ts`: únicamente la aserción colSpan de A4 pasa de cuatro a cinco, sin retirar las de cantidad/importe.
4. `docs/qa/POS_INTERNAL_NOTE_1B_QA.md`: esta sección, preservando el registro anterior.

### QA focal

Mismo toolchain local, desde `frontend`:

| Comando | Resultado |
|---|---|
| `npm run build` | PASS, salida 0, 13.946 s; dos advertencias CommonJS conocidas. |
| `npm test -- --include='src/app/features/sales/internal-note/note-presentation.spec.ts' --progress=false` | 11/11 PASS. |
| `$env:INKTOY_A4_EVIDENCE_SUBDIR='a4-discount-column'` seguido de `npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --grep '@a4-reference'` | 1/1 PASS, 25.5 s; caso de 10.4 s. Se reutiliza el caso existente sin modificarlo. |
| `git diff --check` | PASS. |

Comprobaciones externas a Git, con Node desde la raíz del repositorio:

```powershell
node 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\a4-discount-column\check-ticket-compatibility.js'
& 'C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\a4-discount-column\verify-discount.py'
```

**4/4 comparaciones de tickets PASS**, definiciones idénticas antes/después. **5/5 PDFs PASS**: normal (1 página), 50 artículos (4), anulado de 200 (13), histórico/cifras extremas (1) y Print (1). Se acredita orden de encabezados, ausencia de `Descuento:` en descripción, todos los nombres/cantidades y multiconjunto económico exactos, logo intacto, texto negro sin negrita, márgenes y curvas conservados (12/18/36 según páginas de productos). Vista previa/descarga idénticas en los cuatro escenarios, Print habilitado, solo GET, cero errores de página y limpieza de sesión/URLs. No se repitieron campañas globales, los 23 unitarios originales ni QA backend/DB.

Evidencia: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\a4-discount-column`, fuera del repositorio. PDFs `a4-normal.pdf`, `a4-multi-50.pdf`, `a4-annulled-200.pdf`, `a4-historical-extreme.pdf`, `print-a4-reference.pdf`; renders primera/última página `*-p1.png`, `a4-multi-50-p4.png`, `a4-annulled-200-p13.png`; `.expected.json`, `a4-validation.json`, `discount-validation.json`, `ticket-compatibility.json` y snapshots/hashes previos.

Revisión visual real satisfactoria del A4 normal y representativo multipágina: descuento legible y alineado en columna propia, descripción completa sin importe repetido, marcos y resumen conservados, sin recortes/solapamientos observados. Estado Git sin cambios de rama/HEAD: 8 modificados/13 nuevos, índice vacío, sin staging/commit/push/tag ni cierre formal de B. Impresión física pendiente; siguiente gate: revisión final de diff y QA antes de cualquier autorización Git.

## Nombres sin enumeración automática — 2026-10-28

**PASS — B_VISUAL_ADJUSTMENTS_READY.** Se retira exclusivamente el prefijo de lista añadido por la plantilla (`1.`, `2.`, etc.) de los productos de A4, tickets de 58/80 mm y todos sus estados, incluidas anulaciones y continuaciones. HTML accesible también muestra el nombre sin ese prefijo. Los números que forman parte del nombre persistido se conservan literalmente; no se aplica una expresión de limpieza a los nombres.

Se mantienen orden y contenido original de las líneas, descripciones históricas/procedencia aprobadas, cantidades, precios, descuentos, importes, pagos, número de venta y paginación. A4 conserva su columna Descuento y marcos redondeados. Texto negro sin negrita, logo y resto de formato sin cambios funcionales. No se modifican modelos REST, snapshots, persistencia, seguridad ni comportamiento comercial.

Archivos de esta intervención (cinco):

1. `frontend/src/app/features/sales/internal-note/note-pdf.ts`: descripción compartida usa directamente `line.name`; se retiran los índices usados solo para su presentación.
2. `frontend/src/app/features/sales/internal-note/internal-note-page.component.ts`: retirada de índice/prefijo en la celda de producto.
3. `frontend/src/app/features/sales/internal-note/note-presentation.spec.ts`: aserciones de igualdad exacta del nombre en A4/tickets/anulados; caso de nombre original `12. Acuarelas escolares` conservado en los tres formatos.
4. `frontend/e2e/specs/internal-note.no-write.spec.ts`: igualdad exacta de nombres HTML y carpeta opcional de evidencia por `INKTOY_NOTE_EVIDENCE_SUBDIR`; se mantiene el resto del caso focal.
5. `docs/qa/POS_INTERNAL_NOTE_1B_QA.md`: esta sección, conservando el registro previo.

### QA focal ejecutada

Mismo toolchain, desde `frontend`:

| Comando | Resultado |
|---|---|
| `npm run build` | PASS, salida 0, 13.844 s; dos advertencias CommonJS conocidas. |
| `npm test -- --include='src/app/features/sales/internal-note/note-presentation.spec.ts' --progress=false` | 11/11 PASS; comprobaciones reforzadas sin retirar las de seguridad/integridad. |
| `$env:INKTOY_NOTE_EVIDENCE_SUBDIR='product-names'` seguido de `npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --grep '@regular-black'` | 1/1 PASS, 19.5 s; caso de 6.8 s. |
| `git diff --check` | PASS. |

El E2E verifica nombres HTML exactos en ventas normales/anuladas y ambos temas, peso 400/color negro, igualdad binaria vista previa/descarga en los seis escenarios documentales, Print, GET únicamente, cero errores de página y limpieza de sesión/URLs. No se repitieron las campañas globales de 23 unitarios/13 E2E ni QA backend/DB.

Comando de inspección externa:

```powershell
& 'C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\product-names\verify-names.py'
```

**7/7 PDFs PASS:** A4/ticket58/ticket80 normales (una página cada uno), los tres formatos anulados de 41 artículos (tres páginas/secciones cada uno) y variante Print de ticket58 anulado (tres secciones). Nombres originales completos una vez por línea sintética, sin prefijo numérico añadido; cantidades e importes exactos, logo intacto, texto negro sin negrita, caracteres dentro de página y marcos A4 conservados. Los números que ya aparecen en nombres sintéticos como `Artículo 041` son parte de su snapshot, no enumeración añadida.

Evidencia fuera de Git: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\product-names`. PDFs `a4-normal.pdf`, `ticket58-normal.pdf`, `ticket80-normal.pdf`, `a4-annulled.pdf`, `ticket58-annulled.pdf`, `ticket80-annulled.pdf`, `print-regular.pdf`; renders primera/última página `*-p1.png`/`*-p3.png`, `html-regular-black.png`, `.expected.json`, `typography-validation.json`, `names-validation.json`, scripts y snapshots/hashes previos.

Inspección visual real satisfactoria de A4, ambos tickets, anulado/continuación y HTML: nombres sin enumeración añadida, alineaciones y contenido conservados. Git mantiene rama/HEAD, 8 modificados y 13 nuevos, staging vacío; sin commit/push/tag ni cierre formal de B. Impresión física pendiente. Siguiente gate: revisión final de diff y QA antes de cualquier autorización Git.

## Alineación vertical de UND. en tickets — 2026-10-28

**PASS — B_VISUAL_ADJUSTMENTS_READY.** Se corrige la altura de UND. en las filas de cantidad/unidad/precio/importe. En 58 mm tenía 8 pt frente a los 9 pt de los otros valores; el PDF anterior mostraba una diferencia de línea base de 0.927734 pt. Ahora las cuatro celdas heredan los mismos 9 pt y márgenes. En 58 mm la columna Unidad pasa del 16 % al 17 % del ancho útil para conservar la etiqueta completa; las columnas monetarias pasan de 31.5 % a 31 %. En 80 mm se mantienen los anchos existentes.

Sin cambios comerciales, nombres, descuentos, cálculos o tipos de datos. Se conservan texto negro sin negrita, logo, encabezados, anulación y la continuación etiquetada para cifras excepcionales. A4 y HTML sin cambios.

Archivos de esta intervención (cuatro): `frontend/src/app/features/sales/internal-note/note-pdf.ts`, `frontend/src/app/features/sales/internal-note/note-presentation.spec.ts`, `frontend/e2e/specs/internal-note.no-write.spec.ts` y este informe. La prueba unitaria comprueba tamaño efectivo 9 pt en las cuatro celdas; el E2E existente admite carpeta opcional por `INKTOY_TICKET_EVIDENCE_SUBDIR`, manteniendo sus aserciones.

### QA focal ejecutada

Mismo toolchain, desde `frontend`:

| Comando | Resultado |
|---|---|
| `npm run build` | PASS, salida 0, 11.276 s; dos advertencias CommonJS conocidas. |
| `npm test -- --include='src/app/features/sales/internal-note/note-presentation.spec.ts' --progress=false` | 11/11 PASS. |
| `$env:INKTOY_TICKET_EVIDENCE_SUBDIR='ticket-unit-alignment'` seguido de `npx playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --grep '@ticket-columns'` | 1/1 PASS, 18.1 s; caso de 5.1 s. |
| `git diff --check` | PASS. |

Desde raíz del repositorio para Node:

```powershell
node 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\ticket-unit-alignment\check-a4-compatibility.js'
& 'C:\Users\USUARIO\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\ticket-unit-alignment\verify-unit.py'
```

**2/2 comparaciones A4 PASS:** definiciones COMPLETED/VOIDED idénticas antes/después con fecha fijada. **7/7 PDFs de tickets PASS:** normales y con nombres/cifras largas de ambos anchos (una sección), extenso de 80 mm y anulados de ambos anchos (tres secciones, 41 productos). Se midieron **131 filas en columnas**: tamaño 9 pt para los cuatro valores y diferencia máxima de línea base **0 pt**. UND. cabe dentro del ancho de contenido de Unidad, conservando su padding; caracteres dentro de página, nombres/importes exactos y logo original acreditados. La continuación excepcional a ancho completo se conserva y no se confunde con una fila de cuatro columnas.

El E2E mantiene igualdad de vista previa/descarga en ambos tickets normales, GET únicamente, cero errores de página y limpieza de sesión/URLs. No se repitieron campañas globales, QA A4, backend o DB sin cambios.

Evidencia fuera de Git: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\ticket-unit-alignment`. Se conservan `ticket58-normal.pdf`, `ticket80-normal.pdf`, `ticket58-long-values.pdf`, `ticket80-long-values.pdf`, `ticket80-multi.pdf`, `ticket58-annulled.pdf`, `ticket80-annulled.pdf`, renders primera/última sección y ampliación real `unit-row-detail.png`; `.expected.json`, `unit-alignment-validation.json`, `typography-validation.json`, `a4-compatibility.json` y snapshots/hashes previos.

Revisión visual satisfactoria de 58/80 mm y anulado: UND. y los tres valores comparten altura, sin recortes o solapamientos. Git conserva rama/HEAD, 8 modificados/13 nuevos e índice vacío, sin staging/commit/push/tag ni cierre formal de B. Impresión física pendiente; siguiente gate: revisión final de diff y QA antes de cualquier autorización Git.

## Invalidación documental por cambio de ruta — 2026-10-28

**PASS — B_ROUTE_STATE_CORRECTED.** Corrección exclusiva del hallazgo bloqueante de la revisión final. Este resultado permite retomar esa revisión; no declara B lista para commit ni CLOSED y no autoriza operaciones Git.

### Causa y corrección

La suscripción a `paramMap` solo asignaba un error si el nuevo ID era inválido. En una instancia reutilizada por Angular no incrementaba la versión de `NoteSession` ni retiraba la nota/URL anterior. La condición `ready` solo comprobaba fase y URL; un GET o PDF pendiente conservaba una versión vigente y podía publicar después del cambio.

- Ante cada cambio efectivo del parámetro ID se llama a `NoteSession.invalidate()` antes de interpretar o validar el nuevo valor. Incrementa la versión, limpia nota, URL, mensajes y fase, revoca las URLs documentales y cierra las ventanas temporales con el mecanismo existente. El HTML y el iframe desaparecen al quedar la nota/URL vacías. Se rechazan IDs ausentes, malformados, no positivos o fuera del rango entero seguro; reintentar un ID inválido tampoco emite un GET.
- `load()` reutiliza la misma invalidación y conserva el GET vinculado a la credencial y las comprobaciones existentes de ID de respuesta y versión después de cada espera. Los resultados y errores obsoletos no actualizan el estado. Un Blob tardío descartado no recibe una Object URL.
- La sesión registra por separado la venta solicitada y la venta del PDF preparado. `isReadyFor(id)` exige coincidencia de ambas con la nota, ID válido, fase lista, ausencia de error, URL y credencial actual sin cambios. El getter `ready` del componente usa esta condición. La entrada de `output()` también exige identidad y credencial vigentes; conserva la preparación bajo demanda del POS y los guardas de versión de GET, generación Print y copia para Abrir PDF.
- La destrucción mantiene la invalidación de operaciones, revocación de URLs, cierre de ventanas y retirada de listeners/timer existentes.

Archivos de esta corrección, exclusivamente cuatro:

1. `frontend/src/app/features/sales/internal-note/internal-note-page.component.ts`.
2. `frontend/src/app/features/sales/internal-note/note-session.ts`: indispensable para exponer la invalidación existente también a rutas inválidas y comprobar la identidad del PDF.
3. `frontend/src/app/features/sales/internal-note/note.spec.ts`: nuevos casos de componente con router real; los 23 casos anteriores y sus aserciones se conservan íntegros.
4. `docs/qa/POS_INTERNAL_NOTE_1B_QA.md`: esta sección; historial previo preservado.

No se modificaron templates, estilos, generador PDF, modelos/contratos, dependencias, backend, Auth/JWT/RBAC ni flujos comerciales. Los hashes previos acreditan que el resto de los 21 archivos de B permanece intacto.

### QA focal ejecutada

Mismo toolchain existente: Node 22.23.3/npm 10.9.9 y ChromeHeadless 149 de Playwright. Sin instalar dependencias. Desde `frontend`, PATH y CHROME_BIN indicados en las secciones anteriores:

```powershell
npm test -- --include='src/app/features/sales/internal-note/note.spec.ts' --karma-config='C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\route-state\karma.route.cjs' --progress=false
npm run build
```

El archivo temporal externo de Karma utiliza el runner y plugins existentes. Su filtro selecciona únicamente los casos nuevos y los anteriores de sesión directamente afectados:

```javascript
const {createRequire} = require('node:module');
const fromWorkspace = createRequire(process.cwd() + '/');
module.exports = config => config.set({
  basePath: process.cwd(),
  frameworks: ['jasmine', '@angular-devkit/build-angular'],
  plugins: ['karma-jasmine', 'karma-chrome-launcher', '@angular-devkit/build-angular/plugins/karma'].map(name => fromWorkspace(name)),
  client: {args: ['--grep', '/Internal note (route invalidation|isolated session)/'], jasmine: {random: false}},
  reporters: ['dots'], browsers: ['ChromeHeadless'], singleRun: true
});
```

| Validación | Resultado final |
|---|---|
| Nuevos casos de invalidación con `RouterTestingHarness` | **16/16 PASS**; navegador real y navegación entre rutas, con comprobación de reutilización de la misma instancia. |
| Casos existentes de sesión documental afectados por el cambio | **12/12 PASS**; se vuelven a ejecutar por la modificación de `load()`/`output()`, sin contarlos como nuevos. |
| Total focal Karma | **28/28 PASS**, salida 0; 0.380 s totales del runner, 0.355 s de casos. Los 11 casos de modelo/plantilla del archivo quedan SKIPPED por el filtro deliberado; no son pruebas fallidas ni evidencia nueva. |
| Build Angular | **PASS**, salida 0, 10.973 s; exclusivamente los dos avisos CommonJS conocidos de pdfmake/VFS. |
| E2E / campaña PDF / diseño / backend / DB | **SKIPPED**, sin repetición. El harness usa el router y DOM reales de Angular, verifica botones y acciones de ventana/descarga, y sustituye solo GET y generación por dobles sintéticos controlables. No resulta indispensable otro E2E para este defecto. |
| `git diff --check` | **PASS**; solo los avisos LF/CRLF ya conocidos. |

Los 16 casos nuevos cubren:

- PDF listo → ID inválido en la misma instancia: HTML/iframe vacíos, URL revocada, los tres botones deshabilitados, clics e invocaciones directas sin abrir/descargar ni emitir otra lectura; posterior carga de B correcta.
- GET pendiente → ruta inválida, tanto respuesta como error tardíos: mensaje de ID inválido conservado, ninguna generación ni URL activa.
- Generación pendiente → ruta inválida, tanto Blob como rechazo tardíos: no restaura nota/URL ni activa acciones; tampoco el timer de generación lenta sobrescribe el error.
- A → B con GET resueltos fuera de orden, incluido error tardío de A; y generación de A finalizada después del PDF de B: solo B permanece visible/lista, sin segunda URL obsoleta.
- Revalidación pendiente de Descargar, Abrir e Imprimir al invalidar: no publica salida; los visores temporales se cierran. Incluye Print pendiente y copia de Blob para Abrir terminada después de la invalidación.
- Revocación tanto de la vista previa como de la URL independiente del visor abierto: dos URLs antes, cero después; mismo resultado tras destrucción con generación pendiente.
- Disponibilidad vinculada a credencial, venta solicitada y PDF preparado; rechazo de ID ausente, malformado e inseguro, incluido reintento sin GET.

Datos exclusivamente sintéticos. `SalesService` se sustituye por un doble que solo ofrece `getById`; el generador retorna Blobs sintéticos y `fetch` del visor se controla en el caso correspondiente. No se contactan backend/DB ni se ejecutan POST comerciales o nuevos renders de documentos.

Diagnósticos de preparación conservados: primer intento **SKIPPED 39/39**, salida 1, por interpretar el filtro como texto literal; se corrigió únicamente el filtro externo a sintaxis regex. Segundo intento: **27 PASS / 1 FAIL / 11 SKIPPED**, por usar `Response.blob()` nativo, cuyo I/O no termina con `flushMicrotasks()`. Se sustituyó ese doble por una respuesta con `blob()` determinista en la zona de prueba. Se conservaron las aserciones de dos URLs activas y dos revocaciones; no se alteró código funcional para resolver ese diagnóstico. La ejecución final anterior pasó sin quitar comprobaciones.

Evidencia local externa a Git: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\route-state`. Contiene `before-hashes.json`, copias `.before`, `karma.route.cjs`, `tests.log`, `build.log`, los dos logs de intentos previos y el manifiesto/hashes finales de alcance. No se incorporan estos artefactos a Git.

Riesgo residual: la invalidación descarta resultados por versión; las operaciones subyacentes ya iniciadas pueden finalizar, sin volver a publicar datos ni crear URLs obsoletas. La impresión física continúa **PENDIENTE**, con los límites de navegador/driver/papel ya registrados. La composición visual aprobada y su evidencia se reutilizan sin cambios.

Estado final: misma rama `feature/pos-internal-note-1b`, HEAD/master/origin/master `3afc33405b41aac094c1189c68adae9cccf274d6`, 8 modificados/13 nuevos, índice vacío. Sin staging, commit, push, PR, merge, tags, cambios de rama/worktree ni intervención operativa. **GO para retomar la revisión final de B**, antes de solicitar autorización Git independiente.

## Smoke documental obligatorio en CI — 2026-10-29

**PASS — B_CI_QA_GATE_READY (gate local).** Se corrige la brecha demostrada: las 19 E2E documentales no estaban incluidas en los runners de CI. Se seleccionan seis casos existentes, sin añadir casos equivalentes ni ejecutar la campaña completa. La ejecución remota del nuevo paso queda pendiente de una publicación/PR autorizada. B no está CLOSED.

### Alcance de esta intervención

Solo cinco archivos cambian respecto al preflight de esta corrección:

- `frontend/e2e/specs/internal-note.no-write.spec.ts`: etiquetas estables, manifiesto de seis resultados obligatorios, descarga binaria, aserciones headless y sincronización observable de peticiones retenidas.
- `frontend/package.json`: nuevo comando `e2e:internal-note:ci`.
- `.github/workflows/ci.yml`: un paso obligatorio en el job `frontend`, después del E2E de series y reutilizando Chromium ya instalado. Triggers y demás jobs intactos.
- `frontend/playwright.config.ts`: ajuste indispensable del helper existente para este comando: Chromium headless, service workers bloqueados, servidor local propio en `127.0.0.1:4202`, sin reutilizar otro servidor ni aceptar `E2E_BASE_URL`, y resultados fuera del repositorio. Los demás comandos conservan su configuración.
- Este informe QA, mediante esta sección añadida; se conserva el registro histórico anterior.

No se cambian lógica productiva, diseño aprobado, generador, contratos, backend, DB ni dependencias. `package-lock.json` ya estaba modificado por B antes del preflight; su SHA-256 permanece idéntico al inicio de esta corrección. No se crea otro runner, workflow, job ni helper general.

### Selección estable y riesgos cubiertos

Todos llevan `@internal-note-ci`, además de la etiqueta individual siguiente. El título es el de la prueba existente.

| Etiqueta individual | Caso exacto | Riesgo y resultado comprobado |
|---|---|---|
| `@internal-note-ci-pos` | `confirmed POS reference, immediate next sale focus and detail reprint use GET only` | Venta confirmada sintética, Nueva venta sin imprimir y foco en búsqueda; acceso desde POS y detalle, navegación de regreso y reconsulta sin escrituras. |
| `@internal-note-ci-pdf` | `real PDF preview, A4/tickets, responsive screens, downloads and temporary print viewer` | Documento de V-SYN-0081 y total 150.00, controles visibles, A4/80/58 mm, descarga real idéntica al Blob generado, solicitud al visor de impresión y limpieza al cambiar sesión. |
| `@internal-note-ci-denied` | `denied sale 403 exposes no PDF or sale data` | GET denegado, alerta visible, sin iframe ni número de venta y descarga deshabilitada. Las otras tres variantes de denegación quedan en la campaña local existente. |
| `@internal-note-ci-retry` | `loading, network failure and a successful retry reveal no stale document` | Carga retenida, fallo de red y reintento correcto; navegación en el mismo documento a ID inválido, tres acciones deshabilitadas, cero URLs y sin nota anterior; respuesta GET tardía no restaura contenido. |
| `@internal-note-ci-session` | `late HTTP result is discarded after a same-tab user change` | Cambio de credencial con GET pendiente: mensaje de sesión cambiada, respuesta tardía descartada, sin documento ni URLs y tres acciones deshabilitadas. |
| `@internal-note-ci-recover` | `generation resource failure, blocked popup and regeneration after browser reload` | Recurso del generador fallido, recuperación por reintento, aviso de ventana bloqueada y regeneración/descarga después de recargar. |

Las 51 unitarias y las 19 definiciones E2E existentes se conservan; las seis anteriores son una selección, no seis casos nuevos. Se reutiliza la evidencia unitaria de productos, cantidades decimales, descuentos, totales, históricos, respuestas PDF tardías y orden de resultados. No se vuelve a ejecutar esa campaña ni el build. Las esperas de red de los dos casos seleccionados se sustituyen por promesas liberables y condiciones visibles, sin nuevos tiempos arbitrarios. La alternativa accesible se abre solo cuando está cerrada; la comprobación de visor admite iframe nativo o HTML accesible según capacidad del navegador. La prueba `@native` permanece separada para ejecución headed/manual.

### Aislamiento y fallo obligatorio

Cada caso usa el contexto aislado de Playwright y fixtures/credencial exclusivamente sintéticas. El contexto intercepta `**/api/**`, incluidos visores temporales; ninguna ruta se reenvía a backend. Todas las lecturas comerciales se cumplen con datos sintéticos o fallos controlados. El observador de peticiones registra también las rutas retenidas por los casos de concurrencia y provoca fallo explícito ante cualquier método comercial distinto de GET; el interceptor general además aborta la escritura. El GET normal de la venta exige la cabecera de autorización sintética esperada. Los seis casos finales acreditan solo GET, sin contacto con backend, DB ni sistemas comerciales.

```sh
npm run e2e:internal-note:ci
# playwright test e2e/specs/internal-note.no-write.spec.ts --project=chromium --workers=1 --retries=0 --grep @internal-note-ci --reporter=line
```

El manifiesto exige los seis identificadores con resultado aprobado; un caso omitido, saltado o fallido no completa el manifiesto. Cero casos seleccionados produce el error de Playwright `No tests found`. No hay `--pass-with-no-tests`, reintentos, `continue-on-error`, condiciones de omisión ni códigos de salida ignorados. En una futura PR, una regresión de estos recorridos hará fallar el comando y el job `frontend`; así las protecciones existentes podrán impedir el merge. Esto acredita la configuración y su comando local, no una ejecución remota ya realizada ni cambios de protección.

### PDF real y límites de la comprobación

Playwright espera el evento real de descarga, la guarda y comprueba ausencia de error, existencia, tamaño superior a 1024 bytes, firma `%PDF-1.x`/`%PDF-2.x` y `%%EOF` al final. En A4, 80 y 58 mm compara el archivo completo con los bytes del Blob realmente producido por el generador para la vista previa. El nombre descargado contiene V-SYN-0081 y las aserciones documentales comprueban la venta/total y el contenido permitido del HTML accesible. No se sustituye el generador en la ejecución positiva.

Estas comprobaciones de modelo/HTML, identidad de bytes y estructura binaria **no equivalen a extraer y validar el texto del PDF**, ni a una validación estructural completa con parser. No se dispone de un extractor PDF portable en las dependencias actuales del frontend/CI; no se añade ninguno ni se escribe un parser casero. La extracción exhaustiva de texto, geometría, paginación y revisión visual conserva su evidencia local acreditada; los verificadores Python locales no se trasladan a CI.

### Ejecuciones focales y evidencia

Entorno local: Windows, Node 22.23.3/npm 10.9.9, Playwright 1.61.1, Chromium headless existente; Angular se inicia como servidor del smoke, sin repetir un build de producción. Datos exclusivamente sintéticos.

| Comprobación | Resultado |
|---|---|
| `npm run e2e:internal-note:ci`, ejecución inicial | **6/6 PASS**, salida 0, 42.0 s de Playwright. |
| Mismo comando, estado final tras reforzar el observador de peticiones | **6/6 PASS**, salida 0, **28.8 s de Playwright**, sin omisiones ni reintentos. Esta repetición focal valida el último cambio del helper de seguridad. |
| Mismo comando con `INKTOY_NOTE_QA_PDF_FAULT=empty` | **FAIL esperado**, salida 1: `PDF vacio o trivial`; archivo vacío rechazado. |
| Mismo comando con `INKTOY_NOTE_QA_PDF_FAULT=not-pdf` | **FAIL esperado**, salida 1: `Firma PDF`; contenido HTML de tamaño no trivial rechazado. |
| Mismo comando con `INKTOY_NOTE_QA_PDF_FAULT=truncated` | **FAIL esperado**, salida 1: `PDF truncado: falta EOF final`; PDF sin terminación rechazado. |
| `npm run e2e:internal-note:ci -- --grep-invert @internal-note-ci` | **FAIL esperado**: `No tests found`; selección vacía no produce PASS. |
| `npm run e2e:internal-note:ci -- --grep-invert @internal-note-ci-pos` | **FAIL esperado**: falta `pos` en el manifiesto de seis; cinco casos seleccionados no producen PASS, aunque sus cuerpos terminen correctamente. |
| Parseo JSON/npm y YAML con bibliotecas ya instaladas | **PASS**; nuevo paso obligatorio, solo job `frontend` modificado; triggers, otros jobs y pasos previos conservados. |
| `git diff --check` y comparación de hashes con preflight | **PASS**; alcance limitado a los cinco archivos indicados, sin cambios en lockfile ni código productivo. |
| Unitarias, build, demás E2E, backend y DB | **REUTILIZADOS / NO EJECUTADOS** en esta intervención; no se repiten campañas acreditadas. |

Las tres inyecciones PDF son exclusivamente QA: sustituyen el Blob al crear su URL para ejercitar el rechazo de la descarga, solo admiten valores conocidos y solo bajo este comando. No alteran código productivo ni permiten omitir aserciones. Las variables se restablecen tras las comprobaciones. Los resultados negativos preceden únicamente al refuerzo del observador comercial; no cambian después de ellos el filtro, manifiesto, descarga ni guardas PDF. Las repeticiones y fallos deliberados no se cuentan como casos nuevos.

Evidencia externa: `C:\Users\USUARIO\AppData\Local\Temp\inktoy-note-1b-evidence\ci-smoke`. Incluye `before-hashes.json`, las cinco copias `.before`, `smoke-initial.log`, `smoke-final.log`, `smoke-final-result.json`, los cinco logs `negative-*.log`, y el inventario/hashes finales. PDFs y capturas del smoke en `%TEMP%\inktoy-internal-note-ci\evidence`; resultados Playwright en `%TEMP%\inktoy-internal-note-ci\results`. No se agregan artefactos QA a Git.

Estado final: rama `feature/pos-internal-note-1b`, HEAD/master/origin/master `3afc33405b41aac094c1189c68adae9cccf274d6`, 10 archivos modificados y 13 nuevos de B, staging vacío. Sin staging, commits, push, PR, merge ni operaciones de ramas/worktrees. La impresión A4 básica fue confirmada físicamente por el propietario, actualizando los pendientes históricos anteriores; siguen pendientes las variantes físicas adicionales y la impresión térmica. También queda pendiente observar el nuevo paso en GitHub tras publicación autorizada. **GO para retomar la solicitud de autorización independiente de staging y commit local; esta corrección no la concede ni declara B CLOSED.**
