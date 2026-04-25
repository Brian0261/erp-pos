# ADR-0001: Monolito Modular con Arquitectura Hexagonal

## Contexto
El MVP del ERP/POS necesita salir rapido, mantener calidad de arquitectura y permitir evolucion por modulos (catalogo, inventario, ventas, cotizaciones, facturacion) sin romper el sistema.

El equipo es una celula pequena con sprints de 2 semanas, por lo que se requiere bajo overhead operativo para el Sprint 1 y una base tecnica sostenible.

## Decision
Se adopta un **Monolito Modular** con **Arquitectura Hexagonal (Puertos y Adaptadores)**:

- Un solo despliegue backend Spring Boot.
- Modulos por bounded context dentro del mismo repositorio.
- Separacion por capas: `domain`, `application`, `infrastructure`, `adapter`.
- En Sprint 1 se implementa funcionalmente solo `shared` y `security`.

## Alternativas evaluadas
1. **Microservicios desde el inicio**
   - Pros: aislamiento fuerte por dominio.
   - Contras: complejidad operativa alta (observabilidad, despliegue, contratos, versionado) para equipo y fase actual.

2. **Monolito tradicional por capas globales**
   - Pros: menor curva inicial.
   - Contras: mayor acoplamiento y riesgo de erosion arquitectonica al crecer.

3. **Backend serverless por funciones**
   - Pros: escalado por demanda.
   - Contras: complejidad en transacciones de dominio ERP y pruebas integradas.

## Consecuencias
- Se acelera la entrega del MVP manteniendo limites de modulo.
- El despliegue y CI son simples en Sprint 1.
- Futuras extracciones a servicios son posibles si se respetan contratos de aplicacion.
- Se exige disciplina de equipo para no romper encapsulamiento entre modulos.

## Justificacion
Esta decision maximiza velocidad de entrega, mantenibilidad y costo operativo para el contexto actual del proyecto, alineado con el roadmap de integracion por eventos en fases posteriores.

