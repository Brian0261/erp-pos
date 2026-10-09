# NG-UP-21 — Angular 20 → Angular 21: QA y cierre técnico

Fecha: 2026-10-09. **TÉCNICAMENTE CERRADA** por CI funcional exitoso. Al redactar, el cierre formal queda condicionado a publicar y verificar el commit documental; no se predice su SHA ni resultado.

## Git y alcance

- Base master/origin/master: `ab80f369aba424db0f5fb2dab9425af513f634e3`.
- Rama chore/ng-up-21-selective; HEAD inicial del cierre `1bca1f4dee128bf4cb14d771e2419d4030c53ad4`.
- Checkpoint dependencias: `06b670c13e61c27dcb52c36be142b2692991c241`.
- Checkpoint TypeScript: `1bca1f4dee128bf4cb14d771e2419d4030c53ad4`.
- Commit funcional final: `8e86248e348594ccb49639242f071e57f35ccc92`, `fix(frontend): preserve Angular 21 dialog keyboard behavior`.
- Último commit: exclusivamente main.ts, confirm-dialog.component.ts y nuevo spec; staged diff/whitespace revisados.
- Diff acumulado: frontend/package.json, frontend/package-lock.json, frontend/tsconfig.json, frontend/src/main.ts, frontend/src/app/shared/dialogs/confirm-dialog.component.ts y frontend/src/app/shared/dialogs/confirm-dialog.component.spec.ts.
- Fast-forward master PASS, tres commits preservados, sin merge commit; prepush 3 ahead / 0 behind. Push normal PASS, rama local conservada.

## Targets y migraciones

| Componente | Final |
| --- | --- |
| Angular runtime/compiler-cli | 21.2.25 |
| CLI/build-angular | 21.2.26 |
| TypeScript | 5.9.3 |
| Node/npm-npx | 22.23.3/10.9.9 |
| Playwright instalado/declaración | 1.61.1/^1.61.1 |
| RxJS/ZoneJS/tslib | 7.8.1/0.15.1/2.6.3 |

Lockfile aislado validado sin dependencia local accidental file:, overrides ni resolutions. npm ci y árbol completo aprobados. Node global/PATH permanente intactos.

Migraciones oficiales ejecutadas individualmente mediante ng update --migrate-only --name, todas exit 0:

| Colección | Migración | Resultado |
| --- | --- | --- |
| CLI 21.2.26 | remove-default-karma-config | Sin cambio |
| CLI 21.2.26 | update-module-resolution | Sin cambio |
| CLI 21.2.26 | update-typescript-lib | Retira lib explícito de tsconfig |
| Core 21.2.25 | router-last-successful-navigation | Sin cambio |
| Core 21.2.25 | application-config-core | Sin cambio |
| Core 21.2.25 | add-bootstrap-context-to-server-main | Sin cambio |
| Core 21.2.25 | bootstrap-options-migration | Añade provideZoneChangeDetection() |

Router, HttpClient e interceptor JWT intactos. ZoneJS preservado; no zoneless. control-flow-migration NO ejecutada; *ngIf, *ngFor, trackBy, CommonModule y templates intactos. Sin SSR, Vitest ni modernizaciones opcionales.

## Diálogo y QA local histórica

TS2345 corregido recibiendo Event y comprobando instanceof KeyboardEvent, sin casts inseguros, any ni supresión de tipos. Algoritmo de foco conservado; listener document:keydown.shift.tab explícito porque el matcher distingue Tab de Shift+Tab.

Nuevo spec con eventos DOM: wrap directo/inverso, una invocación por pulsación, navegación interna no interceptada, control disabled excluido, Event genérico, ArrowDown, diálogo cerrado y ARIA. Trece tests previos intactos; TestBed focal con provideZoneChangeDetection(). La navegación nativa se comprobó además con teclado real.

QA aprobada reutilizada sin repetición durante el cierre; no hubo cambios invalidantes posteriores:

| Validación | Resultado |
| --- | --- |
| npm ci / npm ls --all | PASS / PASS |
| Unit tests | 14/14 PASS, sin skipped |
| Build Angular | PASS, sin warning productivo |
| E2E focal series | 6/6 PASS |
| E2E no-write | 1 PASS, 2 SKIPPED por falta de credenciales QA |
| ZoneJS/TestBed, actualización asíncrona visible | PASS |
| Tab/Shift+Tab/focus trap | PASS |
| Docker build / nginx -t | PASS / PASS |
| git diff --check | PASS; avisos LF/CRLF informativos |

Prueba asíncrona: respuesta GET sintética retrasada, dato visible al resolver sin detección manual; window.Zone presente. Teclado real: wrap y navegación interna normal, ArrowDown y cierre, ARIA conservada. Cero requests mutantes y cero errores de consola/página; sin transacciones reales.

Dockerfile vigente, contexto temporal sin node_modules de Windows ni secretos. Imagen local inktoy-ngup21-local-qa:2026-10-09, ID sha256:4e9cdc66200789fe469c5917c195ecc2072918461f8553aa90bd5a1e38342378. Nginx con bundle, sin Node/npm ni dependencias dev. Imagen no publicada y contenedor de prueba retirado. Inspección de firmas JS/CSS sin tooling afectado: complementaria, no prueba universal de ausencia de vulnerabilidades.

## CI funcional remoto verificado

- ci, Brian0261/erp-pos, master, evento push.
- SHA `8e86248e348594ccb49639242f071e57f35ccc92`.
- Run [37891729204](https://github.com/Brian0261/erp-pos/actions/runs/37891729204): completed/success; frontend y backend success.
- Frontend Node 22.23.3/npm 10.9.9; npm ci, unit 14/14, build y E2E focal 6/6 PASS.
- Backend suite existente completa: 642 tests, 0 failures/errors/skipped; BUILD SUCCESS.
- Sin modificaciones de CI/backend ni rerun artificial.

## Seguridad residual y límites

SECURITY_TRIAGE_CLEAR_TO_CONTINUE_NG_UP_21. Audit completo: 13 entradas de paquetes (11 High, 2 Moderate), no trece advisories independientes. Dos advisories de origen preexistentes, once entradas derivadas, todos dev-only. Audit productivo 0, sin regresión material identificada; no se declara tooling sin riesgos.

- [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): braces 3.0.3, High, agotamiento de pila ante patrones de llaves anidados controlados por atacante. Sin parche oficial en el triage. Exposición condicionada a patrones no confiables y rutas watch/custom glob. Karma CI singleRun sin watcher; pathname no equivale por sí solo a patrón atacante. Reevaluar cambios watch/proxy/configuración.
- [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq): uuid 8.3.2, Moderate, buffer externo en APIs afectadas. Parche 11.1.1 fuera del contrato sockjs; ruta actual v4 sin buffer externo. Builder actual usa Vite, no webpack-dev-server/SockJS. Reevaluar cambios de builder o APIs.
- Entradas derivadas: build-angular, build-webpack, @angular/build, chokidar, http-proxy-middleware, karma, karma-jasmine, karma-jasmine-html-reporter, micromatch, sockjs, webpack-dev-server. Dev-only no significa automáticamente inocuas.
- Angular 20 → 21: 23 → 13 entradas, dos orígenes persistentes, ningún origen nuevo. Sin audit fix, downgrades incompatibles, overrides ni resolutions.
- HPM 3.0.7/2.0.10 sin regresión GHSA-gcq2; esbuild 0.28.1 sin GHSA-g7r4; shell-quote 1.12.0 sin GHSA-pqg4. Única copia tar 7.5.22 sin finding actual; aceptación tar cerrada, no renovada.
- Audit productivo 0 y runtime estático no certifican seguridad de backend, Nginx, imagen base ni todo el tooling.

## Límites y roadmap

Backend, DB/Flyway, Storefront, CI, Dockerfile, .env y secretos no modificados. Sin force/rebase/amend/squash/merge commit/tags. Ninguna migración adicional durante el cierre.

NG-UP-20 CERRADA; NG-UP-CF POSPUESTA; NG-UP-21 técnicamente cerrada, cierre formal condicionado al gate documental pendiente al redactar; QA-FE-2 DESBLOQUEADA, NO INICIADA; 4D-2C NO INICIADA. No se inicia otra fase.
