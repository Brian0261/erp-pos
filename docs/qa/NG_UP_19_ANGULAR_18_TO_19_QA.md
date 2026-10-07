# NG-UP-19 — Angular 18 → Angular 19: QA local

Fecha: 2026-10-07. Estado: **IMPLEMENTADA Y VALIDADA LOCALMENTE, PENDIENTE DE CIERRE GIT/CI**.

## Base y alcance

- Rama `master`; `HEAD` y `origin/master`: `ff7f2ee7e984a9744f2c54979943c08161e9c6bd`; árbol inicial limpio y sin tag.
- Sesión PowerShell persistente `19657`; Node portable oficial `22.23.3`, npm/npx `10.9.9` desde `%LOCALAPPDATA%\InkToyToolchains\node-v22.23.3`. La instalación global `22.16.0` no se usó.
- SHA-256 inicial de `frontend/package-lock.json`: `33B65DF001263708E13266B61F3CFBED03BB50441CE5609E4245A09A23000EDDC`; el `npm ci` de baseline no cambió el archivo.
- Baseline efectiva: Angular y compiler-cli `18.2.13`; CLI y build-angular `18.2.12`; zone.js `0.14.10`; TypeScript `5.5.4`; RxJS `7.8.1`; shell-quote `1.12.0`; tar `6.2.1`.

## Migración

Comando: `npx ng update '@angular/cli@^19' '@angular/core@^19'`. Exit code `0`. Angular usó temporalmente CLI `22.2.1` como runner de actualización; no quedó declarada en `package.json`.

| Dependencia | Antes | Después |
|---|---:|---:|
| Ocho paquetes Angular runtime | 18.2.13 | 19.2.25 |
| `@angular/compiler-cli` | 18.2.13 | 19.2.25 |
| `@angular/cli`, `@angular-devkit/build-angular` | 18.2.12 | 19.2.27 |
| `zone.js` | 0.14.10 | 0.15.1 |
| TypeScript / RxJS / tslib | 5.5.4 / 7.8.1 / 2.6.3 | Sin cambio |

- Migration oficial obligatoria: 66 archivos de componentes; se retiró `standalone: true`. La revisión del diff ignorando whitespace mostró 66 retiros y normalización mecánica de la coma final del arreglo `imports` en 65 archivos, sin cambio funcional manual.
- Migrations completadas sin cambios: `ExperimentalPendingTasks` → `PendingTasks`, `BootstrapContext` para SSR, imports SSR y opciones de `angular.json`.
- Opcionales omitidas: `provide-initializer` y `use-application-builder` (esta última venía preseleccionada y fue desmarcada). `angular.json`, builder `application`, dev-server y Karma quedaron intactos.
- No se agregaron dependencias directas. El lockfile cambió ampliamente por el grafo Angular: 1.050 nodos en la baseline frente a 1.086 después. No se editó a mano.

## Validación local

| Comando / comprobación | Resultado |
|---|---|
| `npm ci` antes del upgrade | PASS; 951 paquetes añadidos, lockfile sin cambios |
| `npm ls --all`, `npx ng version` antes | PASS; baseline exacta |
| `npm ci` después del upgrade | PASS; 948 paquetes añadidos |
| `npm ls --all`, `npx ng version` después | PASS; versiones target exactas, sin peer conflict |
| `npm test` | PASS; 13/13, 0 skipped, ChromeHeadless Windows |
| `npm run build` | PASS; 1,44 MB iniciales; sin warning de build |
| `npm run e2e:billing-series:ci` | PASS; 6/6 |
| `npm run e2e:no-write` | PARTIAL; 1 PASS, 2 autenticados skipped porque no hay credenciales QA en la sesión |
| Bundle productivo | Sin huellas de `shell-quote`, `launch-editor`, `webpack-dev-server`, `node_modules/tar` ni `pacote` |
| Docker build | PASS: `npm ci`, Angular build y etapa final Nginx |
| Inspección runtime Docker | Nginx y bundle presentes; `node`, `npm`, `npx` y `/app/node_modules` ausentes |

El Dockerfile original se copió sin cambios a un contexto temporal fuera del repositorio, junto con los archivos necesarios para build. Se excluyeron `node_modules` de Windows, artefactos previos y credenciales E2E. La imagen `inktoy-ngup19-local-qa:latest` quedó solo local, sin publicación. El build stage continúa en `node:22.23.3-alpine3.24` y el runtime en `nginx:alpine`.

Warnings observados: avisos `deprecated` de dependencias transitivas durante `npm ci` y conflicto informativo `NO_COLOR`/`FORCE_COLOR` en Playwright. No se alteraron dependencias para acallarlos.

## Audit sin fix

Los dos audits se ejecutaron sobre el lockfile de `HEAD` extraído temporalmente fuera del repositorio y sobre el lockfile migrado, con el mismo Node/npm y registry. El exit code `1` de `npm audit --json` indica findings residuales, no fallo del comando de instalación.

| Alcance | Antes | Después |
|---|---|---|
| Completo | 82: 6 low, 22 moderate, 51 high, 3 critical | 50: 3 low, 13 moderate, 32 high, 2 critical |
| Producción (`--omit=dev`) | 8: 4 moderate, 4 high, 0 critical | 8: 4 moderate, 4 high, 0 critical |

Los conteos de arriba son paquetes marcados por npm audit. A nivel de IDs directos de advisory: 122 antes, 73 después, 51 eliminados, 71 persistentes y 2 nuevos. En producción: 18 IDs antes, 9 después, 9 eliminados y ninguno nuevo. Una disminución de IDs puede coexistir con igual número de paquetes afectados por otros advisories.

IDs eliminados del audit completo:

```text
GHSA-2g4f-4pwh-qvx6 GHSA-356w-63v5-8wf4 GHSA-38r7-794h-5758
GHSA-3jxr-9vmj-r5cp GHSA-3v7f-55p6-f55p GHSA-4r4m-qw57-chr8
GHSA-4v9v-hfq4-rm2v GHSA-4w7w-66w2-5vf9 GHSA-4www-5p9h-95mh
GHSA-52f5-9888-hmc6 GHSA-58c5-g7wp-6w37 GHSA-67mh-4wv8-2f99
GHSA-692r-grfm-v8x7 GHSA-6g55-p6wh-862q GHSA-73wf-gq98-2v4g
GHSA-859w-5945-r5v3 GHSA-8fgc-7cc6-rx7x GHSA-93m4-6634-74q7
GHSA-968p-4wvh-cqc8 GHSA-9gqv-wp59-fq42 GHSA-9jgg-88mc-972h
GHSA-c27g-q93r-2cwf GHSA-c2c7-rcm5-vvqj GHSA-c83g-rgw3-j3cx
GHSA-ch52-4w7c-c8xp GHSA-f3m7-gqxr-g87x GHSA-fv7c-fp4j-7gwp
GHSA-g4jq-h2w9-997c GHSA-g93w-mfhg-p222 GHSA-h3mg-xc3c-68pw
GHSA-j6r3-76f7-8jcv GHSA-jqcg-44mw-7w3h GHSA-jqfw-vq24-v9c3
GHSA-jrmj-c5cx-3cw6 GHSA-mw96-cpmx-2vgc GHSA-mwp4-54f8-5fhr
GHSA-p3vc-36g9-x9gr GHSA-ph9p-34f9-6g65 GHSA-prjf-86w9-mfqv
GHSA-q6f4-qqrg-jv6x GHSA-qx2v-qp2m-jg93 GHSA-rpw4-54j3-4h4q
GHSA-v2v4-37r5-5v8g GHSA-v4hv-rgfq-gp49 GHSA-v56q-mh7h-f735
GHSA-vc2v-76pw-4v95 GHSA-vg6x-rcgg-rjx6 GHSA-w5vr-8v7q-w6rv
GHSA-x574-m823-4x7w GHSA-xcj6-pq6g-qj4x GHSA-xvcm-6775-5m9r
```

Advisories nuevos y su ruta:

| ID | Severidad | Versión/ruta | Evaluación |
|---|---|---|---|
| [GHSA-gcq2-9pq2-cxqm](https://github.com/advisories/GHSA-gcq2-9pq2-cxqm) | High | `@angular-devkit/build-angular@19.2.27 → http-proxy-middleware@3.0.5`; baseline `3.0.3` | Dev-only. El advisory requiere uso explícito de `fixRequestBody`, body parser previo y salida multipart. El `proxy.conf.json` de InkToy solo enruta `/api` a localhost; no configura el helper ni transforma multipart. No se observó esa ruta vulnerable en el builder `application`/dev-server actual. Finding residual a reevaluar si cambia la configuración del proxy. |
| [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) | Low | `@angular-devkit/build-angular@19.2.27 → esbuild@0.28.0` | Dev-only; el advisory afecta el servidor `esbuild --serve --servedir` en Windows. Ese modo no se ejecuta en los scripts actuales. |

El high nuevo no aparece en `npm audit --omit=dev` ni en el bundle final. La conclusión de ausencia de ruta vulnerable se limita a la configuración actual; no se equipara a una corrección de la dependencia. No se usaron `--force`, overrides, resolutions ni `npm audit fix`.

Triage read-only posterior al QA: `RESIDUAL_RISK_DOCUMENTATION_AND_CLOSE_ALLOWED`. `GHSA-gcq2-9pq2-cxqm` mantiene severidad oficial High y se clasifica `NON_REACHABLE_DEV_TOOLING_RESIDUAL`: el builder `application` usa Vite para `ng serve`, no el builder SSR que importa la copia vulnerable; no hay parser previo, transformación multipart ni llamada a `fixRequestBody`. Reevaluar si se habilita SSR, cambia el proxy o se usa ese helper. `@angular-devkit/build-angular@19.2.27` exige exactamente `http-proxy-middleware@3.0.5`, de modo que `3.0.7` no puede entrar mediante una actualización natural del lockfile; la vía soportada observada pertenece a NG-UP-20, no a este cierre.

`GHSA-g7r4-m6w7-qqqr` mantiene severidad oficial Low. esbuild se usa para compilar, pero InkToy no ejecuta su servidor `--serve` con `servedir` en Windows: se clasifica `VULNERABLE_CODE_NOT_REACHED`. Los parents Angular 19 fijan exactamente `esbuild@0.28.0`, por lo que `0.28.1` requiere un parent posterior. Ambos advisories siguen presentes en el audit completo y ausentes del productivo; no se declaran corregidos ni eliminados.

## Riesgos conocidos que continúan

- `shell-quote@1.12.0` permanece como única copia en `@angular-devkit/build-angular → webpack-dev-server → launch-editor → shell-quote`; `GHSA-pqg4-j6r4-53mv` está ausente del audit final.
- `tar@6.2.1` permanece dev-only en `@angular/cli@19.2.27 → pacote@20.0.0 → tar@6.2.1`. Existen también dos copias transitivas de `tar@7.5.22`. La aceptación temporal de `tar@6.2.1` no se renueva: vence con el cierre NG-UP-20 o el 2026-10-19, lo primero.
- Los 2 casos E2E no-write autenticados siguen sin evidencia en esta sesión por falta de credenciales QA. No se inventaron credenciales ni se ejecutaron ventas, caja o escrituras.

## Estado de salida

Cambios esperados: `frontend/package.json`, `frontend/package-lock.json`, 66 componentes migrados y los tres documentos NG-UP-19. No hay cambios en `angular.json`, `.github/workflows/ci.yml`, Dockerfile, backend, Storefront, Flyway, `.env` o secretos. Sin commit, push ni tag. NG-UP-20, NG-UP-CF, NG-UP-21, QA-FE-2 y 4D-2C no se iniciaron.
