# AUTO-E1 Playwright Base QA

## Resultado

Estado: PASS.

AUTO-E1 implemento la base tecnica minima de Playwright para el frontend Angular, con modo no-write por defecto y guardas iniciales para bloquear escrituras API peligrosas.

## Objetivo

Instalar y configurar Playwright dentro de `frontend` para habilitar pruebas E2E/visuales seguras contra local QA (`http://localhost:4200/`), sin ejecutar flujos transaccionales.

## Archivos creados o modificados

| Archivo | Cambio |
| --- | --- |
| `frontend/package.json` | Agrega scripts E2E y devDependency `@playwright/test` |
| `frontend/package-lock.json` | Actualiza lockfile por instalacion de Playwright |
| `frontend/playwright.config.ts` | Configuracion base Playwright Chromium, no-write, reportes y webServer local |
| `frontend/e2e/.gitignore` | Ignora `.auth/`, reportes y resultados |
| `frontend/e2e/README.md` | Documenta uso, entorno, secretos y seguridad |
| `frontend/e2e/guards/environment.guard.ts` | Valida baseURL local/staging autorizado y bloquea hosts productivos |
| `frontend/e2e/guards/dangerous-endpoints.ts` | Centraliza endpoints y metodos peligrosos |
| `frontend/e2e/guards/network-write.guard.ts` | Bloquea mutaciones API en modo no-write |
| `frontend/e2e/fixtures/test-fixtures.ts` | Instala guard no-write automatico por test |
| `frontend/e2e/helpers/navigation.ts` | Helper minimo de navegacion |
| `frontend/e2e/specs/no-write/login.no-write.spec.ts` | Spec minimo seguro de login |
| `docs/qa/AUTO_E1_PLAYWRIGHT_BASE_QA.md` | Evidencia QA de la fase |

## Dependencias instaladas

- `@playwright/test@1.61.1` como `devDependency` en `frontend`.
- Navegador Chromium instalado con `npm run e2e:install` en cache local de Playwright del usuario.

Nota: `npm install` reporto vulnerabilidades auditables existentes en el arbol npm. No se ejecuto `npm audit fix` porque queda fuera del alcance de AUTO-E1 y podria modificar dependencias no relacionadas.

## Scripts agregados

| Script | Proposito |
| --- | --- |
| `npm run e2e:install` | Instala Chromium para Playwright |
| `npm run e2e:no-write` | Ejecuta specs marcados `@no-write` |
| `npm run e2e:no-write:headed` | Ejecuta specs no-write en modo headed |
| `npm run e2e:report` | Abre/revisa reporte HTML local |

## Configuracion base

- `E2E_BASE_URL` default: `http://localhost:4200`.
- Navegador inicial: Chromium.
- `fullyParallel=false` para reducir riesgo operativo.
- Trace: `retain-on-failure`.
- Screenshot: `only-on-failure`.
- Video: `retain-on-failure`.
- Reporte HTML: `frontend/e2e/playwright-report`.
- Resultados: `frontend/e2e/test-results`.
- `webServer` local: `npm run start -- --host 127.0.0.1 --port 4200`, con `reuseExistingServer=true`.

## Guardas implementadas

- Valida que `E2E_BASE_URL` sea `localhost` o `127.0.0.1` por defecto.
- Bloquea hosts productivos como `inktoy.pe` y subdominios.
- Staging requiere `E2E_ALLOW_STAGING=true` y hostname con `staging`.
- Modo no-write por defecto porque `E2E_ALLOW_WRITES` no esta habilitado.
- Bloquea cualquier `POST`, `PUT`, `PATCH` o `DELETE` hacia `/api/**`, salvo login.
- Permite solo `POST /api/v1/auth/login` como escritura controlada para autenticacion futura.
- Registra y falla el test si algun request mutante fue bloqueado.
- Ignora `frontend/e2e/.auth/` para evitar versionar `storageState` real.

Endpoints peligrosos explicitamente cubiertos:

- `POST /api/v1/sales`.
- `POST /api/v1/sales/{id}/void`.
- `POST /api/v1/cash-registers/open`.
- `POST /api/v1/cash-registers/{id}/close`.
- `POST /api/v1/billing/documents/from-sale/{saleId}`.
- `POST /api/v1/billing/documents/{id}/generate-xml`.
- `POST /api/v1/billing/documents/{id}/sign`.
- `POST /api/v1/billing/documents/{id}/send`.
- Escrituras de billing series/company-profile.
- Escrituras de inventario: stock inicial, ajustes y transferencias.

## Spec minimo ejecutado

Spec: `frontend/e2e/specs/no-write/login.no-write.spec.ts`.

Alcance:

- Carga `/login`.
- Verifica heading `Iniciar sesion`.
- Verifica campos usuario/password.
- Verifica boton `Ingresar` deshabilitado cuando el formulario esta vacio.
- No autentica.
- No navega al POS.
- No toca caja, ventas, stock ni comprobantes.

## Comandos ejecutados

| Comando | Resultado |
| --- | --- |
| `git status --short` | Limpio al inicio |
| `git log --oneline -12` | HEAD inicial `dd422ff docs(pos): add ticket sales execution pack` |
| `npm install --save-dev @playwright/test` en `frontend` | PASS; agrego 3 packages |
| `npm run e2e:install` en `frontend` | PASS; instalo Chromium |
| `npm run build` en `frontend` | PASS |
| `npx playwright --version` en `frontend` | `Version 1.61.1` |
| `npm run e2e:no-write` en `frontend` | PASS; 1 test passed |

Build frontend:

- `main-GI7GMOFN.js`
- `polyfills-FFHMD2TL.js`
- `styles-P47SNDKO.css`

## Que queda bloqueado por defecto

- Ventas.
- Confirmar Cobrar/finalizar venta.
- Apertura/cierre de caja.
- Anulacion de ventas.
- Modificacion de stock.
- Stock inicial, ajustes y transferencias.
- Boleta/factura.
- Emision/generacion/firma/envio de comprobantes.
- Consumo de series/correlativos.
- SUNAT/OSE/PSE.
- Hosts no locales o staging no autorizado.

## No implementado todavia

- Login QA automatizado con variables `E2E_QA_USER` y `E2E_QA_PASSWORD`.
- `storageState` generado por setup autenticado.
- Helpers POS completos.
- Specs POS no-write.
- Capturas visuales dedicadas por modulo.
- CI e2e.
- Playwright MCP.
- Controlled-write.
- Billing-risk.

## Riesgos residuales

- Los guards cubren requests realizados por Playwright en navegador; no reemplazan permisos backend ni controles de entorno.
- `E2E_ALLOW_WRITES=true` existe como escape futuro y debe quedar reservado a fases autorizadas.
- Falta login seguro por variables para cubrir rutas protegidas.
- Aun no hay selectores `data-testid`; los specs iniciales deben priorizar roles/labels accesibles.
- No hay job CI e2e todavia.

## Recomendacion AUTO-E2

Implementar login QA seguro y helpers POS no-write:

- Variables `E2E_QA_USER` y `E2E_QA_PASSWORD` sin versionar secretos.
- Setup `auth.setup.ts` que genere `e2e/.auth/local-qa.json`.
- Fixture autenticada por rol.
- Helper `goToPos()`.
- Spec POS no-write que busque productos, manipule carrito y abra checkout sin confirmar Cobrar.
- Mantener el guard no-write como fixture obligatoria.

## Confirmaciones AUTO-E1

- No se modifico codigo funcional Angular.
- No se modificaron componentes POS.
- No se modificaron servicios POS.
- No se modifico backend.
- No se toco base de datos.
- No se tocaron migraciones.
- No se toco infraestructura productiva.
- No se toco Storefront/ecommerce.
- No se tocaron `.env` ni secretos.
- No se guardaron credenciales reales.
- No se ejecutaron ventas.
- No se confirmo Cobrar.
- No se abrio caja.
- No se cerro caja.
- No se modifico stock.
- No se emitieron comprobantes.
- No se consumieron series.
- No se toco SUNAT/OSE/PSE.
- No se hizo commit.
- No se hizo push.
- No se creo tag.
