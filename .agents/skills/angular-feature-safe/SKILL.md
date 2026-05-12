---
name: angular-feature-safe
description: Implementa features Angular standalone en InkToy ERP/POS con componentes por módulo, forms reactivos, tablas y estados de carga, sin tocar backend salvo instrucción explícita.
---

# Angular Feature Safe

Skill para trabajo frontend InkToy ERP/POS orientado a features reales, UI estable y cambios localizados.

## Reglas de seguridad
1. No tocar guards, `AuthService`, JWT ni interceptores salvo autorización explícita.
2. No tocar servicios/modelos/payload si la tarea es solo visual.
3. No cambiar backend, endpoints ni contratos sin instrucción explícita.
4. No ejecutar servidores automáticamente.
5. No mezclar cambios cross-feature sin necesidad.

## Guía InkToy
- Usar Angular standalone y trabajar en `frontend/src/app/features`.
- Mantener componentes por feature y servicios en `data`.
- Priorizar forms reactivos, tablas, filtros, paginación y estados de carga.
- Para cambios visuales, preferir CSS/template local antes que tocar shared styles.
- Mantener consistencia con `docs/design` y `frontend-design`.

## Cuándo usar
- Crear o ajustar una pantalla o feature.
- Mejorar formularios, tablas, filtros o loading states.
- Corregir problemas visuales o de UX local.

## Flujo recomendado
1. Revisar feature y dependencias visibles.
2. Identificar si el cambio es visual, funcional o mixto.
3. Limitar el alcance a la feature afectada.
4. Implementar y validar el build.
5. Ejecutar `cd frontend && npm run build && cd ..`.

## Entregables
- Archivos tocados.
- Comportamiento cambiado.
- Impacto en UX.
- Riesgos residuales.
