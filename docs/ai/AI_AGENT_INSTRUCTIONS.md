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

## Lectura obligatoria antes de modificar codigo

1. README del proyecto: estado funcional, stack, rutas y reglas vigentes.
2. Documentacion AI en docs/ai (todos los archivos de esta carpeta).
3. ADR activos en docs/adr.
4. Hallazgos y checklist QA en docs/qa (especialmente REGRESSION_CHECKLIST y MVP_STABILIZATION_REPORT).
5. Estado git local:
   - git status
   - git diff --stat

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

1. Prohibido hacer commit automatico.
2. Prohibido push automatico.
3. Prohibido crear tags automaticamente.
4. Si se requiere commit/tag, esperar confirmacion humana.

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
