---
name: changelog-safe
description: Genera changelogs orientados a usuario desde commits de git de forma segura, sin ejecutar scripts externos ni publicar automáticamente.
---

# Changelog Safe

Skill para transformar historial técnico de git en notas de versión claras para usuarios finales, con controles de seguridad y revisión humana obligatoria.

## Objetivo
Reducir el tiempo de redacción de changelogs manteniendo precisión, tono entendible y bajo riesgo operativo.

## Reglas de seguridad (obligatorias)
1. No ejecutar scripts externos ni binarios descargados.
2. No usar red para publicar, enviar o sincronizar changelog automáticamente.
3. No modificar tags o historial git (`rebase`, `reset --hard`, `push --force`).
4. No incluir secretos, tokens, rutas privadas, IPs internas o datos sensibles.
5. No inventar cambios: todo punto del changelog debe rastrearse a commits reales.
6. Si hay ambigüedad, marcarlo como “requiere validación” en lugar de asumir.

## Cuándo usar
- Notas de release por versión.
- Resumen semanal/mensual de producto.
- Actualizaciones para clientes/no técnicos.
- Draft de changelog para app store o comunicación interna.

## Flujo seguro (en orden)

1. **Definir alcance**
   - por rango de fechas,
   - por rango de commits,
   - por tags (ej. `v2.4.0..v2.5.0`).

2. **Recolectar commits**
   - listar commits relevantes,
   - excluir ruido (merge técnico, formateo, chore sin impacto usuario).

3. **Clasificar cambios**
   - Nuevas funcionalidades,
   - Mejoras,
   - Correcciones,
   - Cambios potencialmente disruptivos,
   - Seguridad (si aplica).

4. **Traducir a lenguaje usuario**
   - describir beneficio/impacto,
   - evitar jerga interna,
   - mantener mensajes breves y verificables.

5. **Validación interna obligatoria**
   - verificar trazabilidad commit → entrada,
   - revisar que no se filtró info sensible,
   - confirmar que no hay afirmaciones no sustentadas.

6. **Entrega para revisión humana**
   - entregar borrador marcado como “pendiente de aprobación”.

## Formato recomendado

### Encabezado
- Producto / módulo:
- Versión o rango:
- Fecha:

### Secciones
- ✨ Nuevas funcionalidades
- 🔧 Mejoras
- 🐛 Correcciones
- ⚠️ Cambios importantes
- 🔒 Seguridad

### Cierre
- Notas de compatibilidad (si aplica)
- Pendientes por validar (si aplica)

## Plantilla de salida

```markdown
# Novedades - [versión o periodo]

## ✨ Nuevas funcionalidades
- ...

## 🔧 Mejoras
- ...

## 🐛 Correcciones
- ...

## ⚠️ Cambios importantes
- ...

## 🔒 Seguridad
- ...

---
**Estado:** Borrador para revisión humana.
**Fuente:** Commits en rango [X..Y].
```

## Checklist final
- ¿Cada punto proviene de uno o más commits verificables?
- ¿El texto está en lenguaje usuario y no técnico interno?
- ¿Se excluyó información sensible?
- ¿Se marcaron explícitamente los puntos inciertos?
- ¿El resultado está listo para revisión final del equipo?
