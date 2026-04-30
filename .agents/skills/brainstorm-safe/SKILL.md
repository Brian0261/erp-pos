---
name: brainstorm-safe
description: Brainstorming guiado y seguro para definir requerimientos, diseño y plan antes de implementar. Compatible 100% con frontend-design mediante handoff explícito.
---

# Brainstorm Safe

Skill de diseño previo a implementación para proyectos ERP/POS, inspirado en flujos robustos de brainstorming y preparado para encadenarse con `frontend-design` sin conflicto.

## Principio central
**No implementación sin diseño aprobado.**

Mientras no exista aprobación explícita del usuario sobre el diseño propuesto:
- no escribir código de producción,
- no modificar comportamiento funcional,
- no crear scaffolding,
- no instalar dependencias.

---

## Compatibilidad 100% con `frontend-design`

Este skill está diseñado para trabajar **antes** de `frontend-design`.

### Contrato de handoff (obligatorio)
Al cerrar brainstorming, debes entregar:
1. Objetivo de negocio en 1-2 líneas.
2. Alcance en-scope / out-of-scope.
3. Usuario objetivo y contexto operativo.
4. Restricciones técnicas (framework, performance, accesibilidad, device).
5. Criterios de éxito medibles.
6. Dirección visual acordada (tono + diferenciación).
7. Riesgos y mitigaciones.

Con ese contrato, `frontend-design` entra sin ambigüedad y evita decisiones contradictorias.

### Regla de no interferencia
- `brainstorm-safe` **no** dicta estilos finales ni implementación de UI.
- `frontend-design` **sí** ejecuta la implementación estética/técnica una vez aprobado el diseño.

### Gatillo de transición
Usar esta frase exacta al terminar:
> "Diseño aprobado. Proceder con frontend-design usando este contrato de handoff."

---

## Reglas de seguridad (obligatorias)

1. No ejecutar scripts del sistema, servidores locales, websockets ni procesos en background.
2. No pedir al usuario abrir puertos, localhost, túneles o URLs internas.
3. No leer/escribir fuera del repositorio del proyecto.
4. No solicitar, exponer, copiar o transformar secretos (tokens, claves, credenciales).
5. No descargar contenido remoto salvo instrucción explícita del usuario.
6. No proponer acciones irreversibles sin advertir impacto y alternativa segura.

---

## Cuándo usar este skill

Usar cuando el usuario pida:
- crear o cambiar funcionalidades,
- rediseñar flujos de pantalla,
- definir arquitectura o integración entre módulos,
- priorizar alcance de un feature,
- preparar implementación con riesgos controlados.

No usar para tareas mecánicas ya acotadas (por ejemplo: cambiar un texto exacto ya definido por el usuario).

---

## Flujo obligatorio (en orden)

1. **Explorar contexto actual**
   - revisar estructura relevante,
   - identificar módulos impactados,
   - detectar restricciones técnicas existentes.

2. **Aclarar objetivo con preguntas de una en una**
   - una pregunta por turno,
   - priorizar propósito, restricciones y criterio de éxito.

3. **Proponer 2-3 enfoques**
   - incluir trade-offs reales,
   - marcar recomendación principal con razones.

4. **Presentar diseño por secciones**
   - arquitectura,
   - componentes/servicios,
   - datos y validaciones,
   - manejo de errores,
   - estrategia de pruebas,
   - lineamientos visuales de alto nivel (sin fijar implementación final).

5. **Pedir aprobación explícita**
   - no avanzar a implementación hasta recibir “aprobado”.

6. **Emitir contrato de handoff a frontend-design**
   - usar el formato de handoff de este archivo.

---

## Checklist de calidad del diseño

Antes de pedir aprobación final, validar:

- ¿El problema y objetivo están definidos sin ambigüedad?
- ¿El alcance evita sobre-ingeniería (YAGNI)?
- ¿Hay riesgos identificados con mitigación?
- ¿Los supuestos están explícitos?
- ¿La estrategia de pruebas cubre casos felices, borde y error?
- ¿El plan se puede ejecutar incrementalmente sin romper producción?
- ¿El contrato de handoff está completo para frontend-design?

---

## Formato de salida recomendado

### 1) Contexto
- Usuario objetivo:
- Problema principal:
- Restricciones:
- Supuestos:

### 2) Opciones
- Opción A: descripción + pros/contras
- Opción B: descripción + pros/contras
- Opción C (opcional): descripción + pros/contras

### 3) Recomendación
- Opción elegida:
- Justificación técnica/negocio:
- Riesgos y mitigaciones:

### 4) Diseño
- Arquitectura propuesta:
- Componentes impactados:
- Cambios de datos/contratos:
- Manejo de errores/observabilidad:
- Pruebas requeridas:

### 5) Contrato de handoff a frontend-design
- Objetivo de negocio:
- In-scope:
- Out-of-scope:
- Usuario objetivo:
- Restricciones técnicas:
- Criterios de éxito:
- Dirección visual acordada:
- Riesgos y mitigaciones:

### 6) Aprobación
- ¿Apruebas este diseño para pasar a frontend-design?

---

## Guía específica para ERP/POS

En cada propuesta, validar explícitamente:
- impacto en caja/checkout,
- impacto en inventario/stock,
- impacto en documentos/tributación,
- impacto en auditoría/trazabilidad,
- impacto en tiempos operativos del usuario final.

Si una decisión aumenta riesgo operativo, priorizar alternativa más segura aunque sea menos “elegante”.
