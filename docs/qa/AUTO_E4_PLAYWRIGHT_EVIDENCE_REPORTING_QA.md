# AUTO-E4 Playwright Evidence Reporting QA

## Resultado

Estado: PASS.

AUTO-E4 consolida la trazabilidad local de Playwright E2E no-write: configuracion de reportes, rutas de evidencia, comandos recomendados y verificacion de que los artefactos generados no se versionan.

## Objetivo

Dejar las validaciones E2E no-write reproducibles y auditables para QA local, sin ampliar flujos de negocio ni ejecutar operaciones transaccionales.

## Configuracion encontrada

Archivo principal: `frontend/playwright.config.ts`.

- `reporter`: `list` + `html`.
- HTML report: `e2e/playwright-report` con `open: "never"`.
- `outputDir`: `e2e/test-results`.
- `trace`: `retain-on-failure`.
- `screenshot`: `only-on-failure`.
- `video`: `retain-on-failure`.
- `testDir`: `frontend/e2e/specs`.
- `webServer`: se reutiliza/levanta local solo para hosts seguros.

Scripts encontrados en `frontend/package.json`:

- `npm run e2e:no-write`
- `npm run e2e:no-write:headed`
- `npm run e2e:report`

## Cambios realizados

- `frontend/e2e/README.md`: se agrega seccion de evidencia con rutas y se documenta que `npm run e2e:report` sirve el HTML report y deja la terminal ocupada hasta detenerlo.
- `docs/qa/AUTO_E4_PLAYWRIGHT_EVIDENCE_REPORTING_QA.md`: evidencia QA de la fase.

No fue necesario cambiar la configuracion global de Playwright porque ya cubria:

- HTML report disponible.
- traces, screenshots y videos retenidos en fallos.
- output de artefactos separado bajo `frontend/e2e/`.
- ejecucion no-write segura por defecto.

## Rutas de evidencia

- HTML report: `frontend/e2e/playwright-report/`
- Resultados y artefactos de fallo: `frontend/e2e/test-results/`
- Storage state local no versionado: `frontend/e2e/.auth/qa-user.json`
- Configuracion de reportes: `frontend/playwright.config.ts`
- Scripts npm: `frontend/package.json`
- Reglas de ignore: `frontend/e2e/.gitignore`

## Artefactos ignorados por Git

`frontend/e2e/.gitignore` contiene:

- `.auth/`
- `playwright-report/`
- `test-results/`

Con eso quedan fuera de versionado:

- storageState local real;
- HTML report generado;
- traces `.zip`;
- screenshots de fallo;
- videos retenidos en fallos;
- cualquier evidencia pesada bajo `frontend/e2e/test-results/`.

## Comandos recomendados

```powershell
cd frontend
npm run build
npx playwright --version
npm run e2e:no-write
npx playwright test --grep @no-write --headed --workers=1
npm run e2e:report
```

Notas de uso:

- La validacion visual principal de QA local debe usar `--headed --workers=1`.
- `npm run e2e:report` sirve el HTML report localmente y mantiene la terminal activa hasta detenerlo.

## Validaciones ejecutadas

| Comando | Resultado |
| --- | --- |
| `git status --short` inicial | Limpio |
| `git log --oneline -12` | HEAD `e381f05 test(e2e): add POS no-write interaction smoke` |
| Variables E2E en proceso | `E2E_BASE_URL` presente; `E2E_QA_USER` presente; `E2E_QA_PASSWORD` presente; valores no impresos |
| `npm run build` en `frontend` | PASS |
| `npx playwright --version` en `frontend` | `Version 1.61.1` |
| `npx playwright test --grep @no-write --headed --workers=1` en `frontend` | PASS: 3 passed |
| `npm run e2e:no-write` en `frontend` | PASS: 3 passed |

## HTML report

- El reporter HTML esta configurado y operativo en `frontend/playwright.config.ts`.
- La carpeta `frontend/e2e/playwright-report/` se genera tras ejecutar Playwright.
- El comando documentado para servirlo es `npm run e2e:report`.
- En esta fase no se dejo `npm run e2e:report` corriendo porque `playwright show-report` mantiene la terminal ocupada hasta detenerlo. Queda documentado como comando de consulta local.

## Seguridad

- No se imprimieron credenciales.
- No se guardaron credenciales reales.
- No se creo `.env`.
- `frontend/e2e/.auth/qa-user.json` sigue ignorado por Git y no esta trackeado.
- No se versionaron reportes pesados.
- No se versionaron traces, screenshots, videos ni storageState.
- No se uso produccion.

## Limites no-write confirmados

- No se confirmo el boton final `COBRAR`.
- No se acepto ninguna confirmacion de venta real.
- No se ejecutaron ventas.
- No se abrio ni cerro caja.
- No se modifico stock.
- No se emitieron comprobantes.
- No se consumieron series.

## Riesgos residuales

- `npm run e2e:report` es un comando interactivo de consulta local; no es ideal para automatizacion sin un wrapper adicional.
- traces, screenshots y videos solo quedan disponibles cuando hay fallos, que es el comportamiento buscado para no generar peso innecesario.
- El HTML report depende de haber ejecutado previamente Playwright en la maquina local.

## Recomendacion para AUTO-E5

Si la siguiente fase necesita mas trazabilidad automatizada, agregar solo evidencia ligera adicional sobre la base actual, por ejemplo captura controlada de metadatos o convenciones de nombrado de ejecuciones, sin salir de modo no-write ni introducir artefactos sensibles al repositorio.
