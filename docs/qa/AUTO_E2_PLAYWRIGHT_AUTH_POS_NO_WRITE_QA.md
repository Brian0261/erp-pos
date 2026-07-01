# AUTO-E2 Playwright Auth POS No-Write QA

## Resultado

Estado AUTO-E2 final: PASS.

AUTO-E2 agrega autenticacion QA segura con variables de entorno y primer smoke POS autenticado no-write. Las credenciales no se guardan en el repositorio y el `storageState` queda bajo una ruta ignorada por Git.

La primera ejecucion quedo PARTIAL porque faltaban `E2E_QA_USER` y `E2E_QA_PASSWORD`. En AUTO-E2.1 se reintento desde PowerShell con variables temporales del proceso, el smoke POS autenticado se ejecuto y ya no quedo skipped.

## Objetivo

Permitir que Playwright navegue autenticado al POS en local QA sin ejecutar ventas, abrir/cerrar caja, modificar stock, emitir comprobantes ni consumir series.

## Archivos creados o modificados

| Archivo | Cambio |
| --- | --- |
| `frontend/package.json` | Agrega script `e2e:auth` |
| `frontend/e2e/README.md` | Documenta variables QA y storageState ignorado |
| `frontend/e2e/fixtures/qa-users.ts` | Centraliza lectura segura de credenciales QA |
| `frontend/e2e/helpers/login.ts` | Login por UI y guardado local de storageState |
| `frontend/e2e/helpers/pos.ts` | Helpers minimos para navegar y verificar POS |
| `frontend/e2e/setup/auth.setup.ts` | Setup no-write para crear storageState si hay credenciales |
| `frontend/e2e/specs/no-write/pos-auth.no-write.spec.ts` | Smoke POS autenticado no-write |
| `docs/qa/AUTO_E2_PLAYWRIGHT_AUTH_POS_NO_WRITE_QA.md` | Evidencia QA de la fase |

## Estrategia de autenticacion

- Variables requeridas: `E2E_QA_USER` y `E2E_QA_PASSWORD`.
- Login por UI en `/login` usando los labels existentes.
- Espera redireccion a `/dashboard`.
- Guarda `storageState` solo localmente en `frontend/e2e/.auth/qa-user.json`.
- Si faltan variables, los specs autenticados se saltan con mensaje explicito.
- No se inventan credenciales.
- No se versionan contrasenas ni tokens.

## Variables de entorno

| Variable | Uso | Default |
| --- | --- | --- |
| `E2E_BASE_URL` | URL base Playwright | `http://localhost:4200` |
| `E2E_QA_USER` | Usuario/email QA para login | Sin default |
| `E2E_QA_PASSWORD` | Password QA para login | Sin default |
| `E2E_ALLOW_WRITES` | Escape futuro para suites con escritura | `false` implicito |
| `E2E_ALLOW_CONTROLLED_SALES` | Reservado para controlled-write futuro | `false` implicito |
| `E2E_ALLOW_BILLING_RISK` | Reservado para billing-risk futuro | `false` implicito |

## StorageState

- Ruta: `frontend/e2e/.auth/qa-user.json`.
- `frontend/e2e/.gitignore` contiene `.auth/`.
- Durante la ejecucion inicial PARTIAL no se genero storageState porque faltaban credenciales.
- Durante AUTO-E2.1 se genero `frontend/e2e/.auth/qa-user.json` solo localmente; esta ignorado por Git y no esta trackeado.

## Guards no-write aplicados

Se mantiene la fixture `test-fixtures.ts`, que instala el guard de red en cada test.

Permitido en modo no-write:

- `POST /api/v1/auth/login`.
- `GET` de endpoints necesarios para cargar pantallas.

Bloqueado por defecto:

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
- Cualquier `POST`, `PUT`, `PATCH` o `DELETE` hacia `/api/**` no autorizado.

## Specs creados o ajustados

| Spec | Estado | Alcance |
| --- | --- | --- |
| `login.no-write.spec.ts` | Existente | Carga `/login` sin autenticar |
| `pos-auth.no-write.spec.ts` | Nuevo | Login QA, navega a `/pos`, verifica shell POS, sin transacciones |
| `auth.setup.ts` | Nuevo | Crea storageState si existen credenciales QA |

## Comandos de validacion

| Comando | Resultado |
| --- | --- |
| `git status --short` inicial | Limpio |
| `git log --oneline -12` | HEAD `6b7b7c7 test(e2e): add Playwright no-write base` |
| `npm run build` en `frontend` | PASS |
| `npx playwright --version` en `frontend` | `Version 1.61.1` |
| `npm run e2e:no-write` en `frontend` | PASS parcial: 1 passed, 1 skipped |
| `git diff --check` | PASS; sin errores, solo advertencias LF/CRLF |

Esta tabla corresponde a la primera validacion AUTO-E2, que quedo PARTIAL por credenciales QA ausentes. El cierre final se registra en AUTO-E2.1.

## AUTO-E2.1 validacion autenticada no-write

Estado: PASS.

Se ejecuto la validacion autenticada no-write con `E2E_BASE_URL`, `E2E_QA_USER` y `E2E_QA_PASSWORD` existentes en el proceso actual. Los valores no se imprimieron ni se guardaron en archivos del repositorio.

Resultados AUTO-E2.1:

| Validacion | Resultado |
| --- | --- |
| `git status --short` inicial | Cambios pendientes solo de AUTO-E2 |
| `git diff --stat` inicial | Cambios en `frontend/e2e/README.md` y `frontend/package.json`; archivos nuevos AUTO-E2 sin trackear |
| `git log --oneline -12` | HEAD `6b7b7c7 test(e2e): add Playwright no-write base` |
| Variables QA en proceso | `E2E_BASE_URL` presente; `E2E_QA_USER` presente; `E2E_QA_PASSWORD` presente; valores no impresos |
| `git check-ignore -v frontend/e2e/.auth/qa-user.json` | PASS; cubierto por `frontend/e2e/.gitignore` regla `.auth/` |
| `npm run build` en `frontend` | PASS |
| `npx playwright --version` en `frontend` | `Version 1.61.1` |
| `npm run e2e:no-write` en `frontend` | PASS final: 2 passed |
| Spec POS autenticado | Ejecutado; no quedo skipped |
| Operaciones peligrosas | No ejecutadas |

Detalle AUTO-E2.1 final:

| Validacion | Resultado |
| --- | --- |
| Variables QA en proceso | `E2E_BASE_URL` presente; `E2E_QA_USER` presente; `E2E_QA_PASSWORD` presente; valores no impresos |
| `npm run build` en `frontend` | PASS |
| `npx playwright --version` en `frontend` | `Version 1.61.1` |
| `npm run e2e:no-write` en `frontend` | PASS: 2 passed |
| Spec POS autenticado | Login QA por UI, navegacion a `/pos` y verificacion de shell POS visible |
| `frontend/e2e/.auth/qa-user.json` | Generado localmente por Playwright; ignorado por Git y no trackeado |
| Operaciones peligrosas | No ejecutadas |

Resultado de suite AUTO-E2.1:

```text
2 passed
```

Confirmaciones AUTO-E2.1:

- No se guardaron credenciales reales.
- No se creo `.env`.
- No se imprimio password.
- Se genero `frontend/e2e/.auth/qa-user.json` solo localmente; no se versiono.
- `frontend/e2e/.auth/` sigue ignorado por Git.
- No se modifico codigo funcional Angular.
- No se toco backend, base de datos, infraestructura ni Storefront.
- No se ejecutaron ventas.
- No se confirmo Cobrar ni finalizar venta.
- No se abrio ni cerro caja.
- No se modifico caja ni stock.
- No se emitieron comprobantes.
- No se consumieron series.
- No se toco SUNAT/OSE/PSE.
- No se uso produccion.
- No se inicio AUTO-E3.
- No se creo tag.

## Como ejecutar con credenciales QA locales

Definir `E2E_QA_USER` y `E2E_QA_PASSWORD` solo como variables del proceso PowerShell actual y ejecutar `npm run e2e:no-write` desde `frontend`.

No guardar esos valores ni ejemplos de password en archivos del repositorio.

## No implementado todavia

- Interacciones POS profundas: busqueda, carrito, checkout no-write.
- Specs visuales con screenshots aprobadas.
- Fixtures por rol.
- Controlled-write.
- Billing-risk.
- Integracion CI e2e.

## Riesgos residuales

- Si faltan credenciales, el smoke POS autenticado queda skipped y no valida navegacion real al POS.
- El guard no-write bloquea requests desde Playwright, pero no reemplaza controles backend.
- AUTO-E3 debe agregar interacciones POS no-write gradualmente sin tocar `Cobrar` final.

## Confirmaciones AUTO-E2

- No se modifico codigo funcional Angular.
- No se modificaron componentes POS.
- No se modificaron servicios POS.
- No se modifico backend.
- No se toco base de datos.
- No se tocaron migraciones.
- No se toco infraestructura.
- No se toco Storefront/ecommerce.
- No se tocaron `.env` ni secretos.
- No se guardaron credenciales reales.
- No se versiono storageState real.
- No se ejecutaron ventas.
- No se confirmo Cobrar.
- No se abrio caja.
- No se cerro caja.
- No se modifico stock.
- No se emitieron comprobantes.
- No se consumieron series.
- No se creo tag.
