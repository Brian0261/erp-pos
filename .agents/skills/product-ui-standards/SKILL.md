---
name: product-ui-standards
description: Guía de diseño UI para ERP/POS enfocada en claridad operativa, densidad útil y consistencia visual. Optimizada para trabajar con Copilot Agent en VS Code.
---

# Product UI Standards (ERP/POS)

## Objetivo
Diseñar interfaces de producto (no marketing) para flujos operativos de ERP/POS: caja, inventario, ventas, compras, reportes y configuración.

## Contexto de uso
Antes de implementar, identificar:
1. **Quién usa la pantalla** (cajero, administrador, almacén, contabilidad).
2. **Qué acción principal debe completar**.
3. **Qué error sería costoso** (monto, stock, cliente, impuesto, documento).

Si el objetivo no está claro, preguntar primero.

---

## Principios obligatorios

1. **Claridad antes que decoración**
   - La interfaz debe priorizar lectura rápida y acción segura.
   - Evitar elementos visuales que no aporten decisión.

2. **Consistencia sistémica**
   - Reutilizar patrones y componentes existentes.
   - Evitar valores aislados de spacing, radius o tipografía.

3. **Densidad útil**
   - Mostrar información suficiente sin saturar.
   - En tablas, optimizar escaneo y comparación de datos.

4. **Jerarquía operativa**
   - Una acción principal por pantalla.
   - Diferenciar claramente acciones primarias, secundarias y destructivas.

5. **Estados completos**
   - Todo elemento interactivo debe incluir: default, hover, active, focus, disabled.
   - Toda vista de datos debe cubrir: loading, empty, error.

---

## Sistema base recomendado

### Spacing
- Base: **4px**
- Escala: **4, 8, 12, 16, 24, 32**

### Bordes y profundidad
- Estrategia por defecto: **borders-only** o sombras sutiles (no mezclar estrategias en la misma pantalla).
- Evitar bordes fuertes que dominen la UI.

### Radio
- Escala recomendada: **4px, 6px, 8px**

### Tipografía
- Jerarquía mínima: título, cuerpo, etiqueta, dato.
- Datos numéricos/tabulares: usar números tabulares para alineación.

### Color
- Grises para estructura.
- Color de acento solo para énfasis y acción.
- Colores semánticos reservados para estados (éxito, alerta, error).

---

## Patrones ERP/POS prioritarios

1. **Checkout / Caja**
   - Total y acción de cobro siempre visibles.
   - Confirmaciones claras para acciones irreversibles.

2. **Inventario**
   - Priorizar visibilidad de stock crítico y variaciones.
   - Resaltar excepciones, no todos los registros.

3. **Tablas operativas**
   - Encabezados estables, columnas alineadas, filtros legibles.
   - Evitar acciones ocultas críticas.

4. **Formularios de alta frecuencia**
   - Labels claros, validación inmediata, errores accionables.
   - Mantener flujo de teclado cuando sea posible.

---

## Checklist antes de entregar

- ¿La acción principal se identifica en 3 segundos?
- ¿Todos los spacing usan la escala definida?
- ¿La pantalla usa una sola estrategia de profundidad?
- ¿Existen todos los estados interactivos y de datos?
- ¿Las acciones críticas tienen confirmación o feedback claro?
- ¿La solución reutiliza patrones existentes del proyecto?

Si alguna respuesta es no, iterar antes de cerrar.

---

## Prompt recomendado para Copilot Agent

Usar este bloque al iniciar una tarea de UI:

```text
Sigue la guía .agents/skills/product-ui-standards/SKILL.md.
Contexto:
- Usuario objetivo: [rol]
- Tarea principal: [acción]
- Riesgo principal: [error costoso]

Implementa la UI con:
1) jerarquía clara de acción principal,
2) spacing en escala 4px,
3) estados completos (default/hover/active/focus/disabled + loading/empty/error),
4) consistencia con componentes existentes del proyecto.

Al final, entrega:
- resumen de decisiones,
- lista de validaciones realizadas,
- riesgos pendientes.
```
