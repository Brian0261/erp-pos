---
name: qa-regression-safe
description: Valida regresión y evidencia para InkToy ERP/POS con checklist proporcional al cambio, builds y smoke tests, sin implementar cambios funcionales salvo instrucción explícita.
---

# QA Regression Safe

Skill para validar cambios de InkToy ERP/POS con evidencia mínima, foco en riesgo real y trazabilidad.

## Reglas de seguridad
1. No implementar cambios funcionales salvo que la tarea lo pida.
2. No marcar como validado lo que no se ejecutó.
3. No tocar matrices o docs si no hubo cambio real relacionado.
4. No ocultar riesgos residuales.
5. No ejecutar acciones destructivas.

## Guía InkToy
- Validación proporcional al cambio: frontend, backend o ambos.
- Usar `git status --short` y `git diff --stat` como verificación base.
- Si toca Angular, ejecutar `cd frontend && npm run build && cd ..`.
- Si toca backend, ejecutar `cd backend && mvn clean test && cd ..`.
- Si aplica runtime, usar `docker compose up --build -d`.
- Registrar evidencia en `docs/qa/REGRESSION_CHECKLIST.md` solo si hubo QA real.
- Actualizar `MATRIX_API_ENDPOINTS.md` o `MATRIX_SCREENS_ENDPOINTS.md` solo si cambió contrato o relación pantalla-endpoint.

## Cuándo usar
- Cierre de cambios funcionales.
- Revisión de regresión antes de merge/release.
- Soporte a bugs con evidencia reproducible.

## Flujo recomendado
1. Definir alcance de validación.
2. Revisar diffs y archivos afectados.
3. Ejecutar builds/tests necesarios.
4. Hacer smoke test manual o headless si corresponde.
5. Documentar evidencia y riesgos.

## Entregables
- Comandos ejecutados.
- Resultado de validación.
- Evidencia/archivo actualizado si aplica.
- Riesgos residuales.
