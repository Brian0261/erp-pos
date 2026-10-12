# QA-E2E-AUTH-1A — Ephemeral authenticated no-write gate

Fecha: 2026-10-12. Alcance: Build/QA local y cierre formal Git/CI autorizado.

## Estado y base

- Base verificada: `master`, HEAD y `origin/master`
  `98280045d0b5223034f03b708ab4c206085cf637`, ahead/behind 0/0, sin tag.
- Working tree inicial limpio. Solo cambios propios E2E/test-only/CI/documentación.
- QA local: **PASS_LOCAL**. Estado actual: **QA-E2E-AUTH-1A: CI funcional
  validado; cierre documental remoto pendiente**.
- Commit funcional publicado mediante push normal; sin tag, reescritura de
  historial ni cambios de protección. No se repitieron suites locales en el cierre.

## Arquitectura y frontera verificable

La preparación de herramientas ocurre antes del runtime: imagen Node 22.23.3 /
npm 10.9.9 + Playwright 1.61.1, `npm ci` con lockfile intacto y compilación Maven.
Se utilizan PostgreSQL `16-alpine` y Java 17. Las imágenes runtime se resuelven
a IDs locales, sin `latest`. No se alteran dependencias del proyecto.

El runtime utiliza un contenedor ancla con `--network none`. PostgreSQL, Spring,
Angular y Chromium comparten exclusivamente su namespace mediante
`--network container:<ID propio>`. No se usa Docker Compose ni una red bridge
con acceso al gateway. Se comprueba misma inode del namespace, solo interfaz
loopback y tabla de rutas vacía, antes y después de los recorridos.

Todos los contenedores runtime usan raíz read-only, `cap-drop ALL`,
`no-new-privileges`, sin puertos publicados, sin Docker socket y sin volúmenes
comerciales. PostgreSQL guarda datos en tmpfs propio; el backend recibe una
copia explícita de clases/dependencias con bind read-only. No se monta el repo
completo ni `.env`. El navegador ejecuta como usuario no root (UID 1001).

Prueba independiente de Playwright: un servidor señuelo propio en el loopback
del host y otro contenedor señuelo en una red interna distinta responden a sus
pruebas de control, pero resultan inaccesibles desde el namespace QA. No se
sondean IPs/servicios comerciales. La ausencia de rutas/capacidades impide que
backend y navegador salten a otras redes o cambien la frontera.

## Identidad y orden de inicialización

1. `runId` aleatorio de 24 hex, nombres y etiquetas `inktoy.qa.run`, registro
   interno de IDs creados; no se aceptan contenedores preexistentes.
2. Usuario/base PostgreSQL y credenciales aleatorias exclusivos de la instancia.
   Marcador aleatorio en GUC del servidor y `system_identifier` del clúster.
3. Antes de Flyway: inspección Docker + consulta read-only por TCP que verifica
   base, usuario, marcador, runId, system ID, dirección y puerto.
4. El launcher Java repite la consulta JDBC antes de crear Spring. El DataSource
   se verifica nuevamente; URL Flyway y DataSource se fijan al destino propio.
5. Solo entonces Flyway existente y fixtures sintéticos. Un marcador incorrecto
   o datasource adicional aborta con exit 1; el esquema público sigue vacío.
6. Perfil efectivo exactamente `e2e-qa`, bind 127.0.0.1:8080, PID Java 1 dentro
   del contenedor propio. Devtools se desactiva antes del bootstrap; no reinicios.
7. Diagnóstico test-only consulta el DataSource real y confirma identidad,
   readiness, filtro, stock y contadores comerciales. No devuelve secretos.
8. Angular 127.0.0.1:4201 usa proxy privado temporal a 127.0.0.1:8080 con nonce
   de ejecución. La respuesta extremo a extremo prueba Angular → backend → DB.

Los puertos 5432/8080/4201 son privados del namespace nuevo, no del host. Se
verifica disponibilidad antes del arranque; no se mata ningún proceso ajeno ni
se cambia de puerto silenciosamente. Una identidad/proxy diferente falla.

## Autenticación y no-write

- CAJERO aleatorio, contraseña aleatoria, BCrypt real y JWT efímero. Usuario
  ALMACENERO adicional solo para rechazo de rol. Seeds desactivados únicamente
  en la DB desechable. Producto `Cartulina QA <runId>` y stock inicial 10.
- Setup real: login + `auth/me`, identidad exacta y solo rol CAJERO. No ADMIN,
  mock de login, bypass, credenciales heredadas ni refresh silencioso.
- StorageState nuevo por ejecución, reutilizado por dos contextos aislados.
  Archivo en `/qa-run/qa-user.json`, tmpfs privado 0700, archivo 0600; fuera del
  host/repositorio/OneDrive. Traces, vídeos y screenshots autenticados apagados.
- Guard de contexto: origen exacto, lecturas explícitas, único POST login;
  service workers bloqueados, WebSockets rechazados, clientes HTTP arbitrarios
  deshabilitados. Un intento bloqueado hace fallar el test, no solo la petición.
- Filtro backend test-only obligatorio y previo a Security/servicios: rechaza
  mutaciones y lecturas no autorizadas; login sigue pasando por Auth/JWT/RBAC
  reales. No existe flag para desactivar el filtro.
- POST `/sales` deliberado recibe 405 antes de negocio. El contador de esta
  prueba negativa es la línea base; durante los tres recorridos no aumenta.
- Antes/después: cero sales/cash sessions/electronic documents/inventory
  movements; stock 10. No se pulsa la confirmación final de venta.

## Pruebas negativas y nivel de evidencia

| Requisito | Evidencia automatizada |
|---|---|
| Datasource externo | Contenedor Java con configuración no autorizada: exit 1 antes de Spring; unidad JDBC rechaza URL antes de ejecutar SQL |
| Marcador PostgreSQL incorrecto | Arranque Java real sobre DB propia con marcador equivocado: exit 1, sin tablas Flyway/fixtures |
| Puerto ocupado/backend preexistente | Señuelo TCP propio: EADDRINUSE, propietario sigue vivo; preflight no reutiliza puertos/servidores |
| Backend/DB/proxy incorrectos | Pruebas unitarias de la misma política de atestación usada por el orquestador |
| Configuración heredada y bypasses | Presencia de variables inseguras rechazada, incluidos E2E_ALLOW_WRITES/STAGING; rechazo local observado sin iniciar recursos |
| Mutación HTTP | Navegador real bloquea/contabiliza intento; misma aserción de teardown lo rechaza; filtro real 405 y unit test verifica cero llamadas a la cadena |
| Origen externo | Allowlist rechaza origen; socket sin rutas/interceptación no alcanza ambos señuelos |
| Credenciales inválidas | Login real 401 |
| Rol incorrecto | Login real ALMACENERO y perfil real rechazado por precondición CAJERO |
| Sesión expirada | JWT sintético expirado firmado por secret QA, validador JWT real devuelve 401 |
| Producto faltante | Búsqueda autenticada real vacía y precondición produce fallo |
| Filtro ausente/desactivado | Atestación rechaza propiedad ausente/equivocada y prueba HTTP exige 405/header obligatorio |
| Preparación/limpieza fallida | Propiedad ajena rechazada, fallos de cleanup nunca PASS; arranques fallidos anteriores ejecutaron cleanup real satisfactorio |
| Pruebas faltantes/SKIPPED | Verificación de JSON exige títulos de los tres recorridos, setup separado, 12 negativos, una ejecución exitosa por test |

Las simulaciones de identidad/cleanup son pruebas de política, no una afirmación
de caída real del daemon. Se combinan con atestación y cleanup reales de cada run.

## Evidencia local

- `E2eQaSafetyTest`: 8 PASS / 0 FAIL / 0 ERROR / 0 SKIPPED.
- Backend `mvnw -B clean test`: 672 PASS / 0 FAIL / 0 ERROR / 0 SKIPPED;
  incluye los ocho tests nuevos y regresión PostgreSQL/Testcontainers existente.
  No se inició el launcher QA en esos tests ni se reutilizó una base comercial.
- Gate headless: 3 PASS / 0 FAIL / 0 SKIPPED, setup 1 PASS y seguridad 12 PASS;
  ejecución `b4f52383443b898f716bf5bd`. Su regresión opcional falló entonces por
  el entorno de Chrome; ese comando completo no se cuenta como PASS.
- Ejecución final: `node e2e/qa/run-qa.mjs --headed --regression`, runId
  `95920f9227aa566e488bd635`, exit 0. Headed usa Xvfb dentro del contenedor.
- Tres recorridos existentes: **3 PASS / 0 FAIL / 0 SKIPPED** (login público,
  POS autenticado y POS interacciones). Setup **1 PASS**, separado; seguridad
  **12 PASS**, separada. Identidad/red/no-write/postcondiciones PASS.
- Regresión Angular existente: **32 SUCCESS**, build **PASS**, E2E fiscal de
  series mockeado **6/6 PASS**, sin retries ni omisiones.
- La regresión adicional usa otro contenedor `network:none`, sin backend,
  credenciales ni sesión QA; salidas solo en tmpfs. No se alteró Karma/Jasmine.
- Cleanup final **PASS**: recursos propios y temporales eliminados; ningún
  archivo de sesión autenticada exportado. `git diff --check`: PASS, únicamente
  advertencias informativas LF/CRLF; fuentes productivas/lockfiles intactos.

Incidencias de implementación resueltas: normalización de
`inet_server_addr` con `host()`, Devtools reiniciando el launcher, UID real 1001
de pwuser, importación ESM por el loader CommonJS de Playwright, tmpfs noexec
para el wrapper de Chrome, HOME read-only para Crashpad y salida de Playwright
en raíz de mount read-only. HOME/XDG y resultados ahora usan tmpfs privado;
el wrapper ejecutable existe solo en la regresión sin credenciales. El tmpfs
de sesiones conserva noexec. Todas detuvieron el gate o la regresión; no se
marcaron como PASS ni se relajaron controles para omitir pruebas.

## CI, artefactos y limpieza

- Job nuevo independiente `e2e-auth`, `contents: read`, checkout sin persistir
  credenciales, Node aprobado, Java 17 y mismo orquestador. Sin secrets de negocio,
  `pull_request_target`, publicación de sesiones o cambios de branch protection.
- Jobs backend/frontend existentes preservados. CI funcional remoto verificado;
  el CI del commit documental debe comprobarse por separado después de publicarlo.
- `jar tf` verificó ausencia de `/e2e/`/`E2eQa` en jar productivo. Configuración
  `@TestConfiguration` no forma parte de component scan productivo ni otros tests.
- Recursos se limpian por ID y etiqueta propios; se recuperan IDs perdidos por
  timeout mediante inventario filtrado del run. Nunca prune global ni borrado
  de recursos ajenos. Tmpfs/session desaparecen al eliminar los contenedores.
- No se exporta JSON de autenticación: solo se imprimen etapas, conteos, ubicaciones
  y categorías seguras de error. Datos sensibles permanecen en memoria/tmpfs.
- Cache de herramientas Docker/Maven no equivale a recursos runtime: contiene
  herramientas/código/dependencias sin secretos QA y puede permanecer.

## Cierre funcional remoto verificado

- Commit: `ce869d0b1751d2f88474b2c2f06cdf9f6e6afc92`
  (`test(e2e): add isolated authenticated no-write CI gate`), 21 archivos del
  grupo de implementación. Los tres documentos formales quedaron pendientes.
- Push normal a `master`; remoto base comprobado mediante fetch, 1 ahead / 0
  behind antes de publicar. No amend, rebase, force push ni tags.
- Workflow `ci`, evento `push`, rama `master`, SHA funcional exacto:
  [38289820058](https://github.com/Brian0261/erp-pos/actions/runs/38289820058),
  **completed / success**. Los tres jobs y sus pasos terminaron en success.

| Job | Evidencia real |
|---|---|
| backend (`114946934886`) | `./mvnw -B clean verify`, 672 tests, 0 failures/errors/skipped, BUILD SUCCESS; `E2eQaSafetyTest` 8/8 incluido |
| frontend (`114946934982`) | npm ci, unitarios 32/32, build y E2E de series 6/6 PASS |
| e2e-auth (`114946934913`) | runId `9a6469a8680ba9508f16dc6e`; 3 PASS / 0 FAIL / 0 SKIPPED; setup 1 PASS; seguridad 12 PASS; cleanup PASS |

Los logs sanitizados del gate acreditan: jar productivo sin clases QA; namespace
loopback sin rutas y ambos señuelos inaccesibles; identidad PostgreSQL comprobada
antes de Flyway; arranques con marcador/datasource incorrectos rechazados con
esquema público todavía vacío; datasource/backend/proxy/filtro/proceso/fixtures
verificados; mutación rechazada antes de negocio y postcondiciones sin ventas,
caja, documentos o movimientos, con stock sintético intacto. No se reutilizaron
entornos comerciales. El workflow publicó **0 artefactos**; las sesiones existieron
solo en tmpfs privado y la limpieza de recursos propios terminó satisfactoriamente.

La revisión final no requirió modificar código, pruebas ni workflow. Confirma
fuentes funcionales, Auth/JWT/RBAC, Flyway, dependencias y lockfile intactos; sin
datos comerciales, credenciales reales o storageState versionado.

`master` reportó `protected=false` durante el cierre. El job se ejecuta
automáticamente, pero no se configura aquí como requisito administrativo de
integración. Branch protection, rulesets y required checks requieren autorización
separada; no se modificaron.

Estado al preparar este commit documental: **QA-E2E-AUTH-1A: CI funcional
validado; cierre documental remoto pendiente**. No se anticipa el segundo CI.

## Archivos adicionales indispensables

Además del alcance nombrado, se añaden exclusivamente:

- `frontend/e2e/qa/Dockerfile`: prepara herramientas sin dar red al runtime.
- `frontend/e2e/qa/safety-policy.cjs`: políticas puras compartidas con Playwright
  sin importar el entry point ESM ni cambiar el tipo del package/dependencias.

Inventario de cambios de la subfase (rutas relativas a la raíz):

- Nuevos backend test-only: `backend/src/test/java/com/erppos/backend/e2e/`
  `E2eQaApplication.java`, `E2eQaConfiguration.java`, `E2eQaReadOnlyFilter.java`
  y `E2eQaSafetyTest.java`.
- Nuevos frontend QA: `frontend/e2e/qa/run-qa.mjs`, `Dockerfile` y
  `safety-policy.cjs` en el mismo directorio; `frontend/playwright.auth.config.ts`;
  `frontend/e2e/specs/safety/no-write-safety.spec.ts`.
- Modificados en `frontend/e2e/`: `fixtures/qa-users.ts`,
  `fixtures/test-fixtures.ts`, `guards/environment.guard.ts`,
  `guards/network-write.guard.ts`, `helpers/login.ts`, `helpers/pos.ts`,
  `setup/auth.setup.ts`, `specs/no-write/pos-auth.no-write.spec.ts`,
  `specs/no-write/pos-interactions.no-write.spec.ts` y `README.md`.
- `frontend/package.json`: solo cuatro scripts; sin dependencias ni lockfile.
- `.github/workflows/ci.yml`: únicamente job adicional `e2e-auth`.
- Documentación: este nuevo documento, `docs/ai/CURRENT_STATUS.md` y
  `docs/ai/CHANGE_CONTROL.md`.

No se cambian fuentes funcionales, Auth/JWT/RBAC, Flyway, dependencias/lockfiles,
Karma/Jasmine, Docker Compose, Storefront, `.env` ni configuración fiscal.
NG-UP-CF sigue pospuesta; QA-FE-2 y 4D-2C no se iniciaron.

## Riesgos y siguiente acción

La frontera presupone daemon/host e imágenes de herramientas confiables; no
protege contra un administrador local malicioso ni un escape del kernel.
Una caída abrupta del host/daemon/SIGKILL impide ejecutar finally: se requiere
inventariar etiquetas del run antes de limpiar exclusivamente sus recursos.
Los tags fijan versiones, no supply-chain digests permanentes; cada run resuelve
IDs concretos antes de iniciar procesos. No se cambió esta política de suministro.
Requisitos operativos del runner: Docker Linux local, Node 22.23.3/npm 10.9.9,
Java 17/java/jar, espacio y memoria para herramientas/contenedores, red durante
la preparación y soporte de namespaces/tmpfs/capabilities durante el runtime.
La preparación puede descargar imágenes/dependencias; los procesos de aplicación
se ejecutan después dentro de la frontera aislada comprobada.

Siguiente acción exacta: publicar este commit documental autorizado y verificar
su workflow `ci`, SHA exacto y los tres jobs, incluidos conteos/aislamiento/cleanup
de `e2e-auth`. Solo entonces declarar la fase cerrada. No iniciar QA-FE-2, 4D-2C
ni NG-UP-CF.
