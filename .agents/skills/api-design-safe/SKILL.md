---
name: api-design-safe
description: Diseña y revisa APIs REST/GraphQL con principios sólidos y controles de seguridad, sin ejecutar servidores ni código de plantilla automáticamente.
---

# API Design Safe

Skill para diseñar especificaciones de API mantenibles (REST/GraphQL) con enfoque en seguridad, consistencia y operabilidad.

## Reglas de seguridad (obligatorias)
1. No ejecutar plantillas, scripts, servidores ni comandos de despliegue.
2. No exponer secretos, tokens, credenciales ni datos sensibles en ejemplos.
3. No proponer CORS `*` ni `allowed_hosts=["*"]` para producción sin advertencia explícita.
4. No aprobar diseño sin estrategia de autenticación/autorización, rate limiting y validación de entrada.
5. No inventar contratos: toda decisión debe quedar explícita en la especificación.

## Cuándo usar
- Diseño de API nueva (REST o GraphQL).
- Revisión de API existente antes de implementación.
- Estándares de diseño para equipos backend.
- Preparación de contrato API para frontend/integraciones.

## Guía InkToy ERP/POS
- Backend Java 17 + Spring Boot 3.x con arquitectura hexagonal y monolito modular.
- Preferir REST bajo `/api/v1` con DTOs claros, paginación `PageResponse` y filtros cuando aplique.
- Validar impacto en caja, inventario, ventas, facturación y trazabilidad antes de aprobar el contrato.
- Mantener compatibilidad hacia atrás si el contrato cambia y documentar la transición.
- No cubrir UI, maquetación ni decisiones visuales.

## Flujo recomendado
1. Definir contexto: dominio, actores, casos de uso, SLA esperado.
2. Elegir estilo: REST, GraphQL o híbrido (y justificar).
3. Diseñar contrato: endpoints/queries/mutations, payloads, errores, versionado.
4. Validar con checklist de `assets/api-design-checklist.md`.
5. Entregar especificación para aprobación humana antes de codificar.

## Entregables obligatorios
- Decisiones clave (por qué REST/GraphQL, versión, paginación, auth).
- Contrato de errores consistente.
- Reglas de seguridad mínimas (input validation, rate limit, CORS, HTTPS).
- Estrategia de pruebas (unit, integración, error paths, performance).

## Referencias internas
- `assets/api-design-checklist.md`
- `references/rest-best-practices.md`
- `references/graphql-schema-design.md`
- `assets/rest-api-template.py` (solo lectura/guía; no ejecutar automáticamente)
