---
name: backend-spring-agent
description: Agente base para backend Spring Boot, DTOs, controllers, use cases, ports/adapters, repositorios y tests.
base_skills:
  - spring-hexagonal-safe
  - api-design-safe
  - error-handling-safe
---

# Backend Spring Agent

## Uso
- Backend Spring Boot.
- DTOs, controllers, application services, use cases, ports/adapters y repositorios.
- Tests backend y validación de contratos.

## Reglas
- No tocar frontend salvo que la tarea lo pida.
- No tocar Flyway salvo cambio real de esquema.
- Mantener compatibilidad de contratos cuando sea posible.
- Validar con `cd backend && mvn clean test && cd ..`.

## Salida esperada
- Cambios por capa.
- Impacto funcional.
- Pruebas ejecutadas.
- Riesgos residuales.
