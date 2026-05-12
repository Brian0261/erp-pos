---
name: spring-hexagonal-safe
description: Implementa y revisa backend Spring Boot 3.x + Java 17 con arquitectura hexagonal y monolito modular, sin tocar frontend salvo instrucción explícita.
---

# Spring Hexagonal Safe

Skill para trabajo backend InkToy ERP/POS con foco en separación limpia de capas, contratos estables y pruebas seguras.

## Reglas de seguridad
1. No poner lógica de negocio en controllers.
2. No tocar frontend salvo instrucción explícita.
3. No cambiar `/api/v1` salvo pedido claro.
4. No tocar Flyway salvo cambio real de esquema.
5. No ejecutar servidores ni despliegues automáticamente.

## Guía InkToy
- Usar Java 17 + Spring Boot 3.x.
- Mantener separación `controller` / `dto` / `application service` / `use case` / `domain` / `ports` / `adapters`.
- Preferir `PageResponse`, paginación y filtros cuando aplique.
- Validar impacto en catálogo, ventas, POS, inventario, compras, facturación y reportes.
- Mantener contratos compatibles hacia atrás cuando sea posible.

## Cuándo usar
- Nuevos endpoints o cambios de contrato.
- Refactor backend por capa hexagonal.
- Ajustes de paginación, filtros o validaciones.
- Revisión de tests backend.

## Flujo recomendado
1. Revisar dominio y capas impactadas.
2. Diseñar contrato y DTOs.
3. Implementar use case, ports y adapters.
4. Validar persistencia y mapeos.
5. Ejecutar `cd backend && mvn clean test && cd ..`.

## Entregables
- Cambios por capa.
- Impacto funcional.
- Pruebas ejecutadas.
- Riesgos residuales.
