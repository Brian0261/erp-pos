# Task Execution Playbook - InkToy ERP/POS

## Objetivo

Esta plantilla define el pre-flight y post-flight operativo para agentes AI que trabajan en InkToy ERP/POS. Su finalidad es reducir regresiones, evitar cambios fuera de alcance y mantener trazabilidad antes y despues de modificar el proyecto.

## Alcance

Aplica a tareas documentales, frontend, backend, DB/Flyway, RBAC, Docker/runtime, contratos API, QA regression y hotfixes urgentes.

Este documento no autoriza commits, cambios funcionales, cambios de infraestructura ni uso de datos reales por si mismo. Siempre prevalecen el alcance solicitado, `docs/ai/AI_AGENT_INSTRUCTIONS.md`, `docs/ai/CHANGE_CONTROL.md` y la confirmacion humana cuando aplique.

## Reglas de oro

1. Revisar `git status` antes de modificar archivos.
2. Trabajar por cambios pequenos, verificables y reversibles.
3. No mezclar deudas tecnicas distintas en una sola intervencion.
4. No tocar archivos fuera de alcance.
5. Si aparece un hallazgo fuera de alcance, reportarlo pero no corregirlo sin autorizacion explicita.
6. No usar datos reales de clientes, ventas, proveedores ni informacion sensible.
7. No modificar `.env` real; usar `.env.example` solo si el alcance lo autoriza.
8. No hacer commit, tag ni push automatico.
9. No mezclar backend y frontend si la tarea no lo exige.
10. No cambiar contratos API sin documentar impacto, compatibilidad y plan de validacion.

## Flujo GitHub Flow — fuente normativa

Esta sección es la fuente normativa del flujo de ramas, PR, CI, revisión y cierre. `AGENTS.md` y `docs/ai/AI_AGENT_INSTRUCTIONS.md` resumen guardrails y enlazan aquí; no mantienen protocolos paralelos.

### Política de ramas y alcance

- `master` es la rama estable y debe partir del último estado remoto actualizado.
- Para cada tarea autorizada, usar una rama temporal creada desde `master` actualizado. Convención: `feat/<id>-<resumen>`, `fix/<id>-<resumen>`, `docs/<id>-<resumen>`, `test/<id>-<resumen>` o `hotfix/<id>-<resumen>`.
- No crear ramas permanentes `develop` o `release`; no mezclar tareas o fases independientes.
- Crear o cambiar ramas requiere autorización para esa operación. Si el trabajo no autoriza Git writes, limitarse a inspección o cambios locales dentro del alcance expresamente permitido.

### Secuencia por tarea

1. **Preflight:** verificar rama, HEAD, sincronización con remoto, working tree, tags relevantes, instrucciones aplicables y CI. Si hay cambios ajenos, divergencia material o estado inesperado, detenerse y reportar `BLOCKED`; no ocultar ni reubicar cambios.
2. **Plan:** ante incertidumbre, riesgos de seguridad/datos, arquitectura, migraciones, contratos o producción, inspeccionar y presentar plan/criterios antes de Build.
3. **Alcance:** definir archivos, comportamiento, exclusiones, criterios de aceptación y QA proporcional. Una fase no autoriza iniciar otra.
4. **Build:** implementar solo el alcance aprobado en la rama temporal autorizada. Mantener cambios pequeños y revisar el diff.
5. **QA y documentación:** ejecutar checks pertinentes; no repetir suites costosas si existe evidencia válida para el mismo SHA y entorno. Actualizar documentación de la tarea en la misma rama/PR cuando corresponda, sin anticipar resultados que todavía no ocurrieron.
6. **Commit/push/PR:** son tres autorizaciones distintas. Solo realizar cada operación cuando el usuario la autorice expresamente. Publicar únicamente la rama temporal autorizada; no hacer push directo a `master` como flujo habitual.
7. **CI y revisión:** confirmar que CI corresponde al SHA/PR exacto, revisar los cambios y atender conversaciones requeridas. CI verde es requisito de calidad, nunca aprobación ni permiso de merge.
8. **Merge:** requiere autorización humana explícita e independiente. Preferir squash merge para mantener un commit coherente por tarea en `master`; no auto-merge.
9. **Post-merge:** verificar el SHA de `master`, CI posterior al merge y sincronización local/remota. Cerrar con evidencia en el PR y/o registro de fase. Eliminar la rama temporal solo con autorización explícita.

Secuencia de referencia para una tarea documental; sustituir `<id>`/`<resumen>` y ejecutar cada escritura solo con su autorización:

```powershell
git status --short
git fetch origin
git switch master
git pull --ff-only origin master
git switch -c docs/<id>-<resumen>
# editar, validar y revisar el diff
git add <archivos-autorizados>
git commit -m "docs(<area>): <resumen>"
git push -u origin docs/<id>-<resumen>
gh pr create --base master --head docs/<id>-<resumen>
```

No ejecutar el bloque completo mecánicamente: cada cambio Git requiere autorización separada. En particular, no añadir un comando de merge al flujo automático.

### Commits, PR y trazabilidad

- Mantener commits pequeños y coherentes en la rama temporal; varios commits de desarrollo son aceptables cuando están autorizados. El squash del PR conserva una historia principal compacta.
- Código, QA y documentación que pertenecen a una tarea deben viajar en la misma rama y PR. No crear como rutina un segundo commit documental después del merge para anotar SHA o CI; registrar la evidencia final en el PR o registro de fase. Una actualización versionada posterior requiere justificación y autorización propias.
- No registrar como hecho un resultado de CI aún no ocurrido. No editar documentación histórica para simular evidencia.
- La política documenta el flujo recomendado; no constituye por sí misma autorización para operaciones Git ni configuración administrativa.

### Gate y autorización por operación

- Implementar ≠ commit; commit ≠ push; push ≠ crear PR; crear/actualizar PR ≠ merge; CI verde ≠ aprobación humana.
- No ejecutar automáticamente commit, push, PR, merge, force push, rebase, amend, tag, eliminación de rama, cambios de protección/ruleset ni despliegue.
- Si una autorización no especifica con claridad la operación y su alcance, detenerse antes de esa escritura y pedir autorización.

### Configuración recomendada de `master` — pendiente de autorización administrativa

No asumir que estas reglas están activas ni cambiarlas durante una tarea normal. Cuando se autorice una fase administrativa separada, evaluar:

- requerir PR para actualizar `master`;
- requerir los checks observados `backend`, `frontend` y `e2e-auth`;
- requerir rama actualizada antes de merge, conversaciones resueltas e historial lineal;
- impedir force-push y eliminación de `master`; evitar bypass administrativo si la plataforma permite conservar una recuperación segura.

No exigir aprobación de reviewer mientras no exista una segunda persona revisora disponible. No habilitar por defecto merge queue, auto-merge, despliegue productivo requerido, restricciones por equipos/organización ni commits firmados obligatorios sin necesidad y configuración verificadas. Antes de guardar required checks, confirmar en un PR real sus contextos exactos y que sean inequívocos/no omitibles; los nombres de jobs observados son `backend`, `frontend`, `e2e-auth`. La configuración efectiva solo se confirma leyéndola después de la fase administrativa autorizada.

### Transición de adopción

1. **A — documentación local:** registrar la política en este playbook, enlazarla desde las instrucciones generales y `AGENTS.md`, y dejar constancia en `DECISIONS_LOG.md`. No crear PR/commit/push como parte de esa fase si no se autorizan.
2. **B — PR de transición:** requiere autorización independiente; rama documental temporal, PR hacia `master`, los tres checks verdes, revisión de diff y autorización humana de squash merge. Verificar CI y sincronización tras el merge. No activar protecciones desde esta fase.
3. **C — configuración administrativa:** requiere autorización separada; verificar disponibilidad de checks y capacidad operativa, aplicar únicamente la protección aprobada y luego leer/verificar las reglas efectivas y bypasses.
4. **D — adopción continua:** aplicar el flujo normal a cada tarea con alcance y autorizaciones explícitas.

El estado real de cada etapa debe reportarse con evidencia; documentar la transición no habilita ni afirma la configuración de GitHub.

## Checklist docs-only

### Que leer antes

- `docs/ai/AI_AGENT_INSTRUCTIONS.md`.
- Este playbook y `docs/ai/DECISIONS_LOG.md` cuando la tarea afecte procedimientos o decisiones.
- `docs/ai/CHANGE_CONTROL.md` o `docs/ai/CURRENT_STATUS.md` solo si el cambio registra o depende de una fase/estado actual.
- El documento objetivo y las fuentes directamente relacionadas; no recorrer toda la documentación por defecto.

### Que NO tocar

- Backend, frontend, rutas, guards, AuthService, JWT/interceptor.
- Docker, Flyway, base de datos, scripts operativos.
- Datos reales o archivos `.env` reales.

### Pre-flight checklist

- Confirmar que el alcance es documental.
- Identificar los archivos documentales exactos a editar.
- Verificar que no se mezclen cambios funcionales ni refactors.
- Revisar si el cambio debe citar evidencia de `README.md`, `docs/qa` o ADR.

### Comandos minimos

```powershell
git status
git diff --stat
```

### Validacion post-flight

- Revisar diff del documento modificado.
- Confirmar que no hay archivos funcionales modificados.
- Confirmar que el contenido no contradice `README.md`, `docs/qa` ni `docs/ai` vigente.

### Cuando actualizar docs/qa

- Solo si el documento cambia un protocolo QA, checklist de regresion o evidencia de validacion.

### Cuando hacer commit

- Solo con autorizacion humana explicita.

### Riesgos tipicos

- Documentar estado no verificado como hecho.
- Contradecir matrices QA existentes.
- Cambiar alcance tecnico por una tarea que era solo documental.

## Checklist frontend-only

### Que leer antes

- `README.md`.
- `docs/ai/CURRENT_STATUS.md`.
- `docs/qa/MATRIX_SCREENS_ENDPOINTS.md`.
- `docs/qa/MATRIX_ROLES_PERMISSIONS.md`.
- `docs/qa/FRONTEND_QA_FINDINGS.md`.
- `docs/qa/REGRESSION_CHECKLIST.md`.

### Que NO tocar

- Backend, controladores, servicios Java, repositorios, migraciones y Flyway.
- Contratos API salvo autorizacion explicita.
- Docker/Nginx salvo que el alcance sea runtime/frontend deployment.

### Pre-flight checklist

- Identificar pantalla, componente y servicio Angular involucrado.
- Confirmar roles permitidos y rutas protegidas.
- Confirmar si el cambio es visual-only o afecta flujo/estado/API.
- Revisar protocolo UX-011 anti-cache si habra validacion visual.

### Comandos minimos

```powershell
cd frontend
npm run build
```

### Validacion post-flight

- Build Angular exitoso.
- Smoke manual de la ruta objetivo.
- Validar consola sin `pageerror` ni errores criticos inesperados.
- Validar network sin `500` inesperados, sin CORS y sin llamadas directas a `localhost:8080`.
- Si aplica Docker/Nginx, validar en `http://localhost:4200` con `?ngsw-bypass=true`.

### Cuando actualizar docs/qa

- Si cambia comportamiento observable, flujo de usuario, permisos visuales, layout global o protocolo QA.

### Cuando hacer commit

- Solo con autorizacion humana explicita y despues de build/validacion proporcional.

### Riesgos tipicos

- Romper RBAC visual aunque backend siga protegido.
- Validar una version cacheada del frontend.
- Cambiar servicios o contratos por un ajuste que debia ser visual.

## Checklist backend-only sin DB

### Que leer antes

- `README.md`.
- `docs/ai/DECISIONS_LOG.md`.
- `docs/qa/MATRIX_API_ENDPOINTS.md`.
- `docs/qa/MATRIX_ROLES_PERMISSIONS.md`.
- `docs/qa/BACKEND_QA_FINDINGS.md`.

### Que NO tocar

- Frontend, rutas Angular, guards, layout y estilos.
- Migraciones Flyway y estructura DB.
- Docker Compose salvo que el alcance lo pida.

### Pre-flight checklist

- Identificar modulo, endpoint, servicio o regla de negocio afectada.
- Confirmar codigos HTTP esperados.
- Verificar roles permitidos.
- Confirmar si hay pruebas existentes cercanas.

### Comandos minimos

```powershell
cd backend
mvn clean test
```

### Validacion post-flight

- Tests backend exitosos.
- Si toca controladores, seguridad o contratos: ejecutar `mvn clean verify`.
- Smoke HTTP del endpoint afectado si hay runtime disponible y el alcance lo requiere.

### Cuando actualizar docs/qa

- Si cambia comportamiento observable, codigo HTTP, permisos, payload, regla de negocio o cobertura QA.

### Cuando hacer commit

- Solo con autorizacion humana explicita.

### Riesgos tipicos

- Cambiar contrato sin actualizar matriz API.
- Introducir respuestas `500` para errores de negocio.
- Desalinear frontend existente que consume `/api/v1`.

## Checklist backend con DB/Flyway

### Que leer antes

- `README.md`.
- `docs/ai/CURRENT_STATUS.md`.
- `docs/ai/DECISIONS_LOG.md`.
- `docs/qa/BACKEND_QA_FINDINGS.md`.
- `docs/qa/MVP_STABILIZATION_REPORT.md`.
- ADR relevantes en `docs/adr`.

### Que NO tocar

- Migraciones historicas ya aplicadas.
- Datos reales o bases productivas.
- Frontend salvo que el cambio DB altere contrato requerido por UI y este autorizado.

### Pre-flight checklist

- Confirmar que el cambio DB es imprescindible.
- Crear migracion nueva, nunca editar checksums historicos.
- Definir rollback conceptual y riesgo de datos.
- Confirmar si se requiere validacion de consistencia SQL.

### Comandos minimos

```powershell
cd backend
mvn clean verify
```

### Validacion post-flight

- Flyway aplica sin errores.
- Backend arranca correctamente.
- Health `/api/v1/health` y `/api/v1/health/db` responden OK si runtime esta levantado.
- Ejecutar smoke del modulo afectado y consistencia SQL si aplica.

### Cuando actualizar docs/qa

- Siempre que haya migracion, restriccion DB, indice, cambio de integridad o cambio observable de datos.

### Cuando hacer commit

- Solo con autorizacion humana explicita y despues de validar Maven + Docker/Flyway.

### Riesgos tipicos

- Romper Flyway por editar migraciones historicas.
- Crear migracion no idempotente para datos existentes.
- Introducir constraints sin revisar datos previos.

## Checklist RBAC/rutas protegidas

### Que leer antes

- `docs/qa/MATRIX_ROLES_PERMISSIONS.md`.
- `docs/qa/MATRIX_API_ENDPOINTS.md`.
- `docs/qa/MATRIX_SCREENS_ENDPOINTS.md`.
- `docs/qa/FRONTEND_QA_FINDINGS.md`.
- `README.md`.

### Que NO tocar

- Modulos no relacionados al permiso/ruta objetivo.
- Contratos API no involucrados.
- Datos reales.

### Pre-flight checklist

- Identificar rol, ruta frontend y endpoint backend afectado.
- Confirmar si el cambio es visual, API o ambos.
- Definir casos esperados `200`, `401` y `403`.
- Confirmar redireccion esperada en frontend cuando la ruta no esta permitida.

### Comandos minimos

```powershell
cd backend
mvn clean test
cd ../frontend
npm run build
```

### Validacion post-flight

- API: validar sin token `401`, rol no permitido `403`, rol permitido `200`.
- Frontend: validar menu/ruta permitida y ruta forzada bloqueada por rol.
- Confirmar que no se debilita seguridad backend aunque la UI oculte opciones.

### Cuando actualizar docs/qa

- Siempre que cambie una regla de rol, guard, ruta protegida, menu o acceso endpoint.

### Cuando hacer commit

- Solo con autorizacion humana explicita tras validacion cruzada frontend/backend.

### Riesgos tipicos

- Proteger solo frontend y dejar endpoint abierto.
- Cambiar menu sin cambiar ruta o viceversa.
- Romper flujos validos para `CAJERO`, `ALMACENERO` o `SUPERVISOR`.

## Checklist Docker/runtime

### Que leer antes

- `README.md`.
- `docs/ai/VALIDATION_COMMANDS.md`.
- `docs/qa/REGRESSION_CHECKLIST.md`.
- `docs/qa/MVP_STABILIZATION_REPORT.md`.

### Que NO tocar

- Docker Compose, Nginx, variables o scripts si la tarea no es runtime.
- `.env` real.
- Base de datos o volumenes sin autorizacion explicita.

### Pre-flight checklist

- Confirmar si el cambio requiere rebuild o solo runtime smoke.
- Identificar servicios afectados: `postgres`, `backend`, `frontend`.
- Confirmar variables esperadas sin exponer secretos.

### Comandos minimos

```powershell
docker compose config
```

### Validacion post-flight

- Revisar estado de servicios.
- Revisar logs backend/frontend sin errores criticos de arranque.
- Validar proxy `/api` y health si corresponde.

### Cuando actualizar docs/qa

- Si cambia comportamiento runtime, protocolo operativo, proxy, cache, CORS o evidencia de despliegue local.

### Cuando hacer commit

- Solo con autorizacion humana explicita y validacion runtime completa.

### Riesgos tipicos

- Validar contra `ng serve` en vez de Nginx Docker.
- Mezclar `localhost` y `127.0.0.1` sin control.
- Ocultar fallos de arranque por no revisar logs.

## Checklist UI/layout/theme/sidebar

### Que leer antes

- `docs/qa/REGRESSION_CHECKLIST.md`.
- `docs/qa/FRONTEND_QA_FINDINGS.md`.
- `docs/qa/MATRIX_ROLES_PERMISSIONS.md`.
- `docs/qa/MATRIX_SCREENS_ENDPOINTS.md`.
- `docs/ai/CURRENT_STATUS.md`.

### Que NO tocar

- Backend, endpoints, guards, AuthService, JWT/interceptor.
- Rutas y permisos reales salvo autorizacion explicita.
- Docker/Nginx salvo que la tarea sea de runtime visual.

### Pre-flight checklist

- Confirmar si el cambio es visual-only.
- Identificar componentes/layout afectados.
- Confirmar comportamiento por rol, responsive, tema claro/oscuro y persistencia local si aplica.
- Preparar validacion anti-cache UX-011.

### Comandos minimos

```powershell
cd frontend
npm run build
```

### Validacion post-flight

- Validar desktop y mobile/responsive basico.
- Validar roles `ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR` si afecta shell/sidebar.
- Validar tema claro/oscuro, logout, scroll y rutas protegidas si aplica.
- Confirmar sin `pageerror`, sin CORS, sin `500` inesperados.

### Cuando actualizar docs/qa

- Si cambia layout global, sidebar, tema, protocolo visual o rutas visibles por rol.

### Cuando hacer commit

- Solo con autorizacion humana explicita.

### Riesgos tipicos

- Romper scroll del shell o footer de logout.
- Validar UI cacheada.
- Cambiar permisos visibles sin actualizar matriz.

## Checklist API contract

### Que leer antes

- `docs/qa/MATRIX_API_ENDPOINTS.md`.
- `docs/qa/MATRIX_SCREENS_ENDPOINTS.md`.
- `docs/ai/DECISIONS_LOG.md`.
- `README.md`, seccion de contrato paginado estable `v2`.

### Que NO tocar

- Consumidores frontend no relacionados.
- Contratos `/api/v1` legado sin plan de compatibilidad.
- DTOs compartidos fuera de alcance.

### Pre-flight checklist

- Identificar endpoint, metodo, request DTO, response DTO y roles.
- Confirmar si el cambio es compatible o breaking.
- Confirmar impacto en frontend y tests.
- Definir codigos esperados para errores de negocio.

### Comandos minimos

```powershell
cd backend
mvn clean verify
```

### Validacion post-flight

- Validar JSON de respuesta esperado.
- Validar errores `400`, `401`, `403`, `404`, `409` o `422` segun corresponda.
- Confirmar compatibilidad `v1`/`v2` cuando aplique.

### Cuando actualizar docs/qa

- Siempre que cambie endpoint, request, response, codigo HTTP, roles o version API.

### Cuando hacer commit

- Solo con autorizacion humana explicita y contrato documentado.

### Riesgos tipicos

- Cambiar nombres de campos usados por Angular.
- Romper `v1` mientras frontend no migra a `v2`.
- Devolver `500` en reglas de negocio esperadas como `409/422`.

## Checklist QA regression

### Que leer antes

- `docs/qa/REGRESSION_CHECKLIST.md`.
- `docs/qa/MVP_STABILIZATION_REPORT.md`.
- `docs/qa/BUG_REPORT.md`.
- `docs/qa/FRONTEND_QA_FINDINGS.md`.
- `docs/qa/BACKEND_QA_FINDINGS.md`.

### Que NO tocar

- Codigo funcional durante una tarea de auditoria/regresion, salvo autorizacion explicita.
- Datos reales.
- Scripts destructivos o resets de entorno.

### Pre-flight checklist

- Definir modulo, roles y flujos a auditar.
- Identificar datos QA permitidos.
- Separar hallazgos por severidad.
- Distinguir comportamiento esperado de bug real.

### Comandos minimos

```powershell
git status
git diff --stat
```

### Validacion post-flight

- Reportar hallazgos con archivo/modulo/riesgo/severidad.
- No corregir hallazgos fuera de alcance.
- Si se ejecutaron builds o Docker, documentar resultados exactos.

### Cuando actualizar docs/qa

- Cuando se confirma nueva evidencia QA, se cierra una deuda, cambia un checklist o aparece un bug relevante.

### Cuando hacer commit

- Solo con autorizacion humana explicita y normalmente como cambio documental `docs:`.

### Riesgos tipicos

- Corregir mientras se audita sin autorizacion.
- Usar datos mutables sin registrar impacto.
- Confundir `404` esperado de caja sin sesion con bug bloqueante.

## Checklist hotfix urgente

### Que leer antes

- `docs/ai/AI_AGENT_INSTRUCTIONS.md`.
- `docs/ai/CHANGE_CONTROL.md`.
- Documento QA del modulo afectado.
- Archivo o diff relacionado al fallo reportado.

### Que NO tocar

- Archivos no necesarios para resolver el fallo.
- Refactors, mejoras cosmeticas o deudas no relacionadas.
- Configuracion, DB o datos reales si no son causa directa autorizada.

### Pre-flight checklist

- Reproducir o entender el fallo con evidencia minima.
- Identificar el cambio mas pequeno que corrige el problema.
- Confirmar impacto esperado y riesgo de regresion.
- Definir validacion minima antes de editar.

### Comandos minimos

```powershell
git status
git diff --stat
```

Adicionalmente, ejecutar la validacion proporcional al modulo afectado:

```powershell
cd frontend
npm run build
```

o

```powershell
cd backend
mvn clean test
```

### Validacion post-flight

- Confirmar que el fallo original queda resuelto.
- Confirmar que no se tocaron archivos fuera de alcance.
- Ejecutar smoke minimo del flujo afectado.
- Revisar `git diff --stat` para limitar superficie del cambio.

### Cuando actualizar docs/qa

- Si el hotfix corrige bug `CRITICAL`, `HIGH` o `MEDIUM`, cambia comportamiento observable o agrega protocolo de validacion.

### Cuando hacer commit

- Solo con autorizacion humana explicita, despues de validacion minima y resumen de riesgo residual.

### Riesgos tipicos

- Arreglar sintomas con cambios amplios.
- Introducir regresion colateral por refactor apresurado.
- Saltarse validaciones por urgencia.

## Matriz rapida de validacion

| Tipo de cambio | Comandos minimos | Validacion manual minima | Documentacion a actualizar |
| --- | --- | --- | --- |
| docs-only | `git status`, `git diff --stat` | Revisar diff y coherencia con fuentes de verdad | `docs/ai` o documento objetivo; `docs/qa` solo si cambia protocolo QA |
| frontend-only | `cd frontend`, `npm run build` | Ruta objetivo, consola, network, roles si aplica | `docs/qa/REGRESSION_CHECKLIST.md` si cambia UX/flujo/permisos |
| backend-only sin DB | `cd backend`, `mvn clean test` | Endpoint/regla afectada si hay runtime disponible | `MATRIX_API_ENDPOINTS` o findings si cambia contrato/comportamiento |
| backend con DB/Flyway | `cd backend`, `mvn clean verify`, `docker compose config`, `docker compose up --build -d`, `docker compose ps` | Flyway OK, health, smoke modulo, consistencia SQL si aplica | `BACKEND_QA_FINDINGS`, `REGRESSION_CHECKLIST`, `MVP_STABILIZATION_REPORT` |
| RBAC/rutas protegidas | `mvn clean test`, `npm run build` | `401/403/200` API y ruta forzada por rol en UI | `MATRIX_ROLES_PERMISSIONS`, `MATRIX_SCREENS_ENDPOINTS` |
| Docker/runtime | `docker compose config`, `docker compose up --build -d`, `docker compose ps` | Logs backend/frontend, health, proxy `/api` | `REGRESSION_CHECKLIST`, `MVP_STABILIZATION_REPORT` si cambia protocolo/runtime |
| UI/layout/theme/sidebar | `cd frontend`, `npm run build` | Desktop/mobile, tema, scroll, logout, roles, anti-cache | `REGRESSION_CHECKLIST`, `FRONTEND_QA_FINDINGS` si hay hallazgo |
| API contract | `cd backend`, `mvn clean verify` | JSON esperado, codigos HTTP, compatibilidad `v1/v2` | `MATRIX_API_ENDPOINTS`, `MATRIX_SCREENS_ENDPOINTS`, README si aplica |
| QA regression | `git status`, `git diff --stat` mas comandos proporcionales | Flujos criticos y roles definidos por alcance | `REGRESSION_CHECKLIST`, `BUG_REPORT`, findings correspondientes |
| hotfix urgente | `git status`, `git diff --stat`, build/test proporcional | Repro/fix del fallo y smoke del flujo afectado | `docs/qa` si bug relevante o cambio observable |

## Cierre operativo obligatorio

Antes de cerrar cualquier tarea, el agente debe reportar:

1. Objetivo atendido.
2. Alcance real aplicado.
3. Archivos modificados.
4. Validaciones ejecutadas.
5. Hallazgos fuera de alcance.
6. Riesgos residuales.
7. Confirmacion de si hubo o no cambios funcionales.
8. Confirmacion de si hubo o no commit, tag o push.
