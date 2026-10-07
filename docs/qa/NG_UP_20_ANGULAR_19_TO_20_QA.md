# NG-UP-20 — Angular 19 → Angular 20: Build y QA local

Fecha: 2026-10-07. Estado: **IMPLEMENTADA Y VALIDADA LOCALMENTE, PENDIENTE DE CIERRE GIT/CI**. No hay commit, push, tag ni workflow remoto de esta fase.

## Preflight y baseline

- Rama `master`; `HEAD == origin/master == 5ee416dbb6c430fec28a89555e739daaa07e5f58`; working tree inicial limpio, sin tag. NG-UP-19 estaba cerrada y publicada; workflow `37636659581` en `success`.
- Toolchain portable, activada únicamente en la sesión de ejecución: `C:\Users\USUARIO\AppData\Local\InkToyToolchains\node-v22.23.3\node.exe`, `npm.ps1` y `npx.ps1` del mismo directorio. Versiones efectivas: Node `v22.23.3`, npm/npx `10.9.9`. No se usó el Node global ni se cambió `.nvmrc`/`devEngines`.
- SHA-256 inicial de `frontend/package-lock.json`: `4351F1D628A3A555BAA581008DF4093FB4F60231C3D33557AFDB091C7D855045`. `npm ci` previo PASS (948 paquetes añadidos), sin cambiar ese hash; `npx ng version` confirmó Angular 19.

| Dependencia | Antes | Después |
|---|---:|---:|
| Ocho paquetes Angular runtime | 19.2.25 | 20.3.33 |
| `@angular/compiler-cli` | 19.2.25 | 20.3.33 |
| `@angular/cli`, `@angular-devkit/build-angular` | 19.2.27 | 20.3.39 |
| TypeScript | 5.5.4 | 5.9.3 |
| RxJS / zone.js / tslib | 7.8.1 / 0.15.1 / 2.6.3 | Sin cambio |
| Node / npm | 22.23.3 / 10.9.9 | Sin cambio |

## Upgrade oficial y migraciones

Comando exacto desde `frontend`: `npx ng update '@angular/cli@20.3.39' '@angular/core@20.3.33'`. Exit code `0`; CLI temporal y final `20.3.39`. TypeScript `5.9.3` fue actualizado por `ng update`, sin comando adicional. No se usaron `--force`, `--allow-dirty`, `legacy-peer-deps`, overrides, resolutions ni edición manual del lockfile.

- Migration obligatoria `previous-style-guide`: añadió únicamente ocho defaults de schematics en `frontend/angular.json` para preservar convenciones. Builder `application` y `dev-server` intactos.
- Migrations obligatorias de imports/routing SSR, `moduleResolution`, eliminación de configuración Karma por defecto, `DOCUMENT`, `InjectFlags`, `TestBed.get` y `BootstrapContext`: ejecutadas, sin cambios en archivos.
- Opcional `use-application-builder`: venía preseleccionada y se desmarcó. Opcionales `control-flow-migration` y `router-current-navigation`: no ejecutadas. No se convirtieron `*ngIf`/`*ngFor`, ni se introdujeron signals, SSR, Vitest o un nuevo builder.
- Archivos de implementación: solo `frontend/package.json`, `frontend/package-lock.json` y `frontend/angular.json`. Ningún source ni test cambió. El lockfile amplio corresponde a la resolución oficial Angular 20; SHA-256 final `8ECA66F967ACF21B23C4E0F920C54FB717B1FD18F724B39B766E197D5C26B2E7`.
- Warnings de npm: dependencias deprecated (`inflight`, `rimraf@3`, `glob@7`, `uuid@8`, además de avisos para `@angular/platform-browser-dynamic@20.3.33` y `@angular/animations@20.3.33`). No se modernizaron paquetes fuera de alcance.

## QA local

| Comando / verificación | Resultado |
|---|---|
| `npx ng version` | PASS: framework/compiler-cli `20.3.33`, CLI/build-angular `20.3.39`, TypeScript `5.9.3` |
| `npm ci` final | PASS; 981 paquetes añadidos, sin conflicto de peers |
| `npm ls --all` | PASS; exit code 0 |
| `npm test` | PASS; 13/13, 0 skipped, ChromeHeadless Windows |
| `npm run build` | PASS; chunks iniciales 1.45 MB, transferencia estimada 238.25 kB, sin warning de build |
| `npm run e2e:billing-series:ci` | PASS; 6/6 |
| `npm run e2e:no-write` | 1 PASS (login), 2 autenticados skipped por no haber credenciales QA verificadas; no se cuentan como PASS |
| `git diff --check` | PASS; solo advertencias informativas LF/CRLF de Windows |

Playwright mostró el warning informativo preexistente `NO_COLOR`/`FORCE_COLOR`. No se inventaron credenciales ni se ejecutaron operaciones transaccionales. Los dos tests autenticados quedan pendientes de un entorno QA autorizado; su omisión no prueba el flujo autenticado bajo Angular 20.

## Auditoría de dependencias, sin fix

Se ejecutaron `npm audit --json` y `npm audit --omit=dev --json` sobre la baseline Angular 19 exportada temporalmente desde `HEAD` y sobre el lock final, con el mismo npm/registry. El exit code `1` del audit completo representa findings; el audit productivo final salió con código `0`. Los conteos npm se refieren a paquetes marcados, no a IDs de advisory.

| Alcance | Antes | Después |
|---|---|---|
| Completo | 50: 3 low, 13 moderate, 32 high, 2 critical | 23: 0 low, 5 moderate, 18 high, 0 critical |
| Producción (`--omit=dev`) | 8: 4 moderate, 4 high, 0 critical | 0 de todas las severidades |
| IDs directos de advisory, completo | 73 | 29: 44 eliminados, 29 persistentes, 0 nuevos |
| IDs directos de advisory, producción | 9 | 0: 9 eliminados, 0 nuevos |

Los 23 paquetes con findings residuales son: `@angular-devkit/build-angular`, `@angular-devkit/build-webpack`, `@angular/build`, `body-parser`, `brace-expansion`, `braces`, `chokidar`, `engine.io`, `fast-glob`, `fast-uri`, `http-proxy-middleware`, `js-yaml`, `karma`, `karma-jasmine`, `karma-jasmine-html-reporter`, `micromatch`, `postcss-selector-parser`, `qs`, `sockjs`, `source-map-js`, `uuid`, `webpack-dev-middleware` y `webpack-dev-server`. Son rutas dev-only según la comparación con `--omit=dev`; no se declara eliminado todo riesgo de tooling. Los upgrades de seguridad ajenos quedan fuera de NG-UP-20.

Desglose por paquete de `npm audit --json` final (severidad agregada npm; todos salen del audit de producción al omitir devDependencies):

| Severidad | Paquetes (18 high, 5 moderate) | Alcance y riesgo residual |
|---|---|---|
| High (18) | `@angular-devkit/build-angular`, `@angular-devkit/build-webpack`, `@angular/build`, `brace-expansion`, `braces`, `chokidar`, `engine.io`, `fast-glob`, `fast-uri`, `http-proxy-middleware`, `js-yaml`, `karma`, `karma-jasmine`, `karma-jasmine-html-reporter`, `micromatch`, `source-map-js`, `webpack-dev-middleware`, `webpack-dev-server` | Cadena local de Angular CLI/build/dev-server y Karma/Jasmine. Un paquete del servidor de desarrollo o middleware puede quedar expuesto mientras la herramienta correspondiente está activa; el resultado dev-only no significa que toda ruta sea inalcanzable. El fix sugerido para parte de Angular apunta a Angular CLI/build 21 y para Karma a versiones major; ambas opciones quedan fuera de NG-UP-20. |
| Moderate (5) | `body-parser`, `postcss-selector-parser`, `qs`, `sockjs`, `uuid` | Dependencias transitivas de tooling/build/dev-server. El audit no identifica exposición en el grafo de producción; permanece el riesgo en herramientas locales/CI cuando se ejecutan rutas afectadas. |

El comando de auditoría reportó 23 paquetes, no 23 advisories: hay varias GHSA por paquete (por ejemplo `brace-expansion` y `fast-uri`). La comparación de IDs de arriba conserva los 29 IDs únicos vigentes; la severidad agregada de un paquete puede ser superior a la de algunos advisories individuales asociados. No se probó explotación de los findings residuales ni se declara que el tooling dev-only sea automáticamente seguro. Este cierre solo confirma que la rama de producción tiene cero findings en `npm audit --omit=dev` y que las remediaciones dirigidas se verificaron contra el árbol instalado.

IDs eliminados respecto de Angular 19:

```text
GHSA-23hp-3jrh-7fpw GHSA-28wg-ghj8-5hjv GHSA-2v37-7h3g-55p8
GHSA-34x7-hfp2-rc4v GHSA-39pv-4j6c-2g6v GHSA-48r7-hpm6-gfxm
GHSA-4x5r-pxfx-6jf8 GHSA-52v5-jr5w-gjxr GHSA-58w9-8g37-x9v5
GHSA-5c6j-r48x-rmvq GHSA-64mm-vxmg-q3vj GHSA-67c8-pqhq-4rmx
GHSA-79cf-xcqc-c78w GHSA-83g3-92jg-28cx GHSA-86w9-cpqp-85rv
GHSA-8qq5-rm4j-mr97 GHSA-8x88-c5mf-7j5w GHSA-9ppj-qmqm-q256
GHSA-f5vj-f2hx-8m93 GHSA-ff3f-86qr-9cv3 GHSA-fx2h-pf6j-xcff
GHSA-fxqj-rqcc-2cmp GHSA-g7r4-m6w7-qqqr GHSA-gcq2-9pq2-cxqm
GHSA-gvwx-54wh-qm9j GHSA-hh8m-fm6v-7cvg GHSA-jfc7-64v2-mr8c
GHSA-jhpw-976m-542j GHSA-jj27-h5hq-8x99 GHSA-m28w-2pqf-7qgj
GHSA-mx8g-39q3-5c79 GHSA-p297-fm68-3q8c GHSA-qffp-2rhf-9h96
GHSA-qj8w-gfj5-8c6v GHSA-r28c-9q8g-f849 GHSA-r292-9mhp-454m
GHSA-r6q2-hw4h-h46w GHSA-rgjc-h3x7-9mwg GHSA-v6wh-96g9-6wx3
GHSA-vmf3-w455-68vh GHSA-w4pp-8pjf-rmxw GHSA-w8wr-v893-vjvp
GHSA-x9g3-xrwr-cwfg GHSA-xwg4-73v4-xw9w
```

IDs persistentes, todos fuera del audit productivo:

```text
GHSA-2883-xcg3-v3hh GHSA-2gc4-cqfq-p2gv GHSA-4c8g-83qw-93j6
GHSA-4mjr-xmp4-gh2g GHSA-52cp-r559-cp3m GHSA-5p4m-2wfm-xmqj
GHSA-68fv-2mgg-jv7q GHSA-6j4f-fj2g-mc7p GHSA-7p8r-x3mc-p8w7
GHSA-f65p-4m7j-42xc GHSA-g84c-rxfj-3j2c GHSA-h67p-54hq-rp68
GHSA-hrr3-gc8f-f4qj GHSA-jqff-g426-hqxp GHSA-mh99-v99m-4gvg
GHSA-q2hr-2g5m-vwhr GHSA-q3j6-qgpj-74h6 GHSA-q8mj-m7cp-5q26
GHSA-qhr7-859c-m2p7 GHSA-qw65-cvwx-89v3 GHSA-rgw5-rvv9-x895
GHSA-rj75-hqrm-r3gf GHSA-v2hh-gcrm-f6hx GHSA-v39h-62p7-jpjc
GHSA-v422-hmwv-36x6 GHSA-vfj7-8cjw-p6xm GHSA-w5hq-g745-h8pq
GHSA-w9m9-85wc-3x92 GHSA-x5fp-wj9c-mxmx
```

### Gates individuales sobre el árbol instalado

| Gate | Evidencia | Clasificación |
|---|---|---|
| `GHSA-gcq2-9pq2-cxqm` | `npm ls/explain`: `http-proxy-middleware@3.0.7` desde build-angular y copia `2.0.10` desde webpack-dev-server; ninguna cae en los rangos `>=3.0.4 <3.0.7` o `>=4.0.0 <4.1.1` del advisory. El paquete aún tiene otros findings agregados. | `REMEDIATED` para este GHSA específico |
| `GHSA-g7r4-m6w7-qqqr` | Una sola copia `esbuild@0.28.1`, deduplicada entre Angular build/devkit y Vite; no hay `0.28.0`. | `REMEDIATED` |
| `tar@6.2.1` | `npm ls/explain`: única copia `tar@7.5.22` por `pacote@21.5.1` y `node-gyp@12.4.0`; no hay tar 6, finding tar ni ruta transitiva vulnerable detectada. | `TAR_ACCEPTANCE_RESOLVED` localmente |
| `GHSA-pqg4-j6r4-53mv` | Única copia `shell-quote@1.12.0` en tooling webpack-dev-server → launch-editor; el GHSA no figura en el audit. | Sin regresión |

La aceptación temporal anterior de `tar@6.2.1` **no se renueva**. Su condición técnica de riesgo quedó resuelta localmente; la actualización formal de estado depende del cierre Git/CI de NG-UP-20. No se introdujo una dependencia directa de tar ni override.

## Bundle y Docker

- La inspección de artefactos `.js`/`.css` de `frontend/dist` no halló firmas de `http-proxy-middleware`, `esbuild`, `pacote`, `webpack-dev-server`, `shell-quote`, `launch-editor` o `node_modules/tar`. Esta comprobación textual, junto al empaquetado final, respalda que el tooling no quedó incorporado al bundle; no pretende ser una prueba formal de ausencia de código arbitrario.
- Docker build local PASS con `frontend/Dockerfile` sin modificar, etiqueta exclusiva `inktoy-ngup20-local-qa:2026-10-07`. Se usó un contexto temporal fuera del repositorio, sin `node_modules` Windows ni archivos `.env`; el build stage usó `node:22.23.3-alpine3.24`, ejecutó `npm ci` y compiló Angular 20.
- Etapa final Nginx inspeccionada: bundle/index presentes; `node` y `npm` no ejecutables; `/app/node_modules` ausente. Imagen no publicada. Dockerfile e infraestructura intactos.

## Alcance Git y limitaciones

- Modificados por implementación: `frontend/package.json`, `frontend/package-lock.json`, `frontend/angular.json`.
- Documentación permitida: `docs/ai/CURRENT_STATUS.md`, `docs/ai/CHANGE_CONTROL.md` y este documento nuevo.
- Backend, PostgreSQL/Flyway, Auth/JWT, Storefront, CI, Dockerfile, `.nvmrc`, `devEngines`, `.env` y secretos no cambiaron. NG-UP-CF, NG-UP-21, QA-FE-2 y 4D-2C no se iniciaron.
- No se hizo commit, push ni tag. Ningún SHA ni workflow remoto NG-UP-20 se atribuye antes del cierre.
- Limitación principal: los dos E2E autenticados no se ejecutaron sin credenciales QA autorizadas. La seguridad productiva y los tests disponibles sí fueron comprobados; el audit completo mantiene findings dev-only que requieren seguimiento independiente, no un `npm audit fix` en esta fase.
