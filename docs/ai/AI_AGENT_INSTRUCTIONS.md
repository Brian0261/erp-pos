# AI Agent Instructions - InkToy ERP/POS

## Objetivo

Esta guia define como debe trabajar cualquier AI Coding Agent (Copilot, ChatGPT, OpenCode u otro) dentro de este repositorio sin perder contexto ni romper estabilidad pre-piloto.

## Reglas generales para cualquier agente

1. Trabajar con alcance acotado y explicito.
2. Priorizar seguridad, trazabilidad y no regresion funcional.
3. Basar cualquier decision en evidencia del repositorio actual.
4. Si falta evidencia, documentar: "pendiente de verificar" o "segun documentacion actual".
5. Mantener separacion clara entre trabajo backend y frontend.
6. No crear ni usar datos reales sin autorizacion explicita.
7. No hacer commits ni tags automaticamente.

## Lectura previa segun alcance

1. Revisar `AGENTS.md` y las instrucciones aplicables en la ruta afectada.
2. Confirmar `git status --short`, rama y HEAD.
3. Leer `README.md` y solo los documentos vigentes directamente relacionados con la tarea: instrucciones de agente, playbook, decisiones, ADR y QA pertinente. No es necesario recorrer indiscriminadamente todos los documentos de `docs/ai` o `docs/qa`.
4. Si se modifica código, inspeccionar sus pruebas, contratos y dependencias relevantes antes de editar.

Para trabajo Git, seguir el flujo normativo de `docs/ai/TASK_EXECUTION_PLAYBOOK.md`; `docs/ai/DECISIONS_LOG.md` registra su adopcion documental y el estado pendiente de configuración administrativa.

## Estado git local

Antes de modificar, confirmar como minimo:

- `git status --short`
- `git branch --show-current`
- `git log -1 --oneline`

## Restricciones estrictas

1. No tocar backend, frontend, rutas, guards, auth ni DB si la tarea es documental.
2. No modificar Docker Compose, Flyway o configuraciones de despliegue salvo solicitud explicita.
3. No introducir cambios fuera de alcance por iniciativa propia.
4. No mezclar deuda tecnica de modulos distintos en una sola intervencion.
5. No cambiar contratos API sin documentar impacto y plan de compatibilidad.

## Reglas para no tocar archivos fuera de alcance

1. Definir alcance de archivos antes de editar.
2. Limitar cambios al subconjunto requerido por la tarea.
3. Si aparece un hallazgo fuera de alcance, reportarlo sin corregirlo.
4. Evitar refactors colaterales (nombres, formato o estructura) sin beneficio directo del objetivo.

## Reglas para no mezclar backend/frontend

1. Si la tarea es solo frontend, no editar backend.
2. Si la tarea es solo backend, no editar frontend.
3. Si la tarea exige ambos lados, separar entregables por bloque y validar impacto por interfaz.
4. Mantener trazabilidad explicita de endpoints/DTO cuando aplique.

## Politica de datos y credenciales

1. No usar data de clientes reales.
2. No cargar data productiva sin aprobacion explicita.
3. Usar solo usuarios seed/locales documentados para QA.
4. Nunca exponer secretos reales en codigo, logs o documentacion.

## Validaciones obligatorias

1. Ejecutar validaciones proporcionales al alcance.
2. Para tareas documentales puras, no correr builds largos salvo necesidad estricta.
3. Comandos base recomendados: ver docs/ai/VALIDATION_COMMANDS.md.
4. Antes de cerrar una tarea, ejecutar al menos:
   - git status
   - git diff --stat

## Regla de commits y automatizacion

1. Commit, push, creación de PR, merge, eliminación de rama, reescritura de historial y tags son operaciones separadas; cada una requiere autorización humana explícita para esa operación.
2. La autorización para implementar no autoriza commit o push; crear/actualizar un PR no autoriza merge.
3. CI verde no equivale a autorización humana de merge.
4. Seguir GitHub Flow y las revisiones del [`TASK_EXECUTION_PLAYBOOK.md`](TASK_EXECUTION_PLAYBOOK.md). No asumir que las protecciones administrativas ya están activas.

## Regla de hallazgos fuera de alcance

Cuando se detecte un problema no solicitado:

1. Registrar archivo, modulo, riesgo y severidad estimada.
2. No aplicar fix dentro de la misma tarea, salvo autorizacion explicita.
3. Sugerir accion recomendada y esfuerzo estimado.

## Formato minimo de entrega final del agente

1. Objetivo atendido.
2. Alcance real aplicado.
3. Archivos tocados.
4. Validaciones ejecutadas.
5. Hallazgos fuera de alcance (si existen).
6. Riesgos residuales.
7. Confirmacion explicita de si hubo o no cambios funcionales.
8. Confirmacion explicita de si hubo o no commit/tag/push.

## Politica de seguridad de ejecucion

1. Evitar comandos destructivos sin aprobacion explicita.
2. Evitar resets forzados de git.
3. No borrar archivos no relacionados.
4. Preservar cambios previos del equipo, aunque el arbol git este "dirty".
