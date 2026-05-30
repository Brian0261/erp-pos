# Decisions Log - InkToy ERP/POS

## Formato de registro

Cada decision debe incluir:

- Decision
- Motivo
- Impacto
- Estado
- Fuente

## Decisiones vigentes

| ID    | Decision                                                                               | Motivo                                                                             | Impacto                                                                | Estado                             | Fuente                        |
| ----- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------- | ----------------------------- |
| D-001 | Adoptar monolito modular con arquitectura hexagonal.                                   | Balance entre velocidad de entrega MVP y mantenibilidad.                           | Permite crecer por modulos sin complejidad temprana de microservicios. | Aceptada y activa                  | CORE-ADR-001                 |
| D-002 | Mantener endpoints /api/v1 como legado temporal.                                       | Evitar ruptura de clientes frontend existentes durante transicion.                 | Compatibilidad operativa mientras se migra consumo a v2.               | Activa (temporal)                  | README + QA backend           |
| D-003 | Agregar /api/v2 con contrato paginado estable (items/page/size/totalItems/totalPages). | Reducir riesgo de cambios de serializacion en PageImpl y estabilizar contrato API. | Base estable para migracion frontend gradual.                          | Implementada                       | README (BT-006 Fase 1)        |
| D-004 | Diferir productores automaticos de outbox desde modulos de negocio (BT-005).           | Priorizar cierre MVP y control operativo antes de asincronia avanzada.             | Outbox sigue con publisher mock y reproceso manual/administrativo.     | Diferida                           | README + CORE-ADR-003        |
| D-005 | Diferir migracion completa frontend de /api/v1 a /api/v2.                              | Evitar regresiones masivas en etapa pre-piloto.                                    | Convivencia temporal de contratos v1/v2.                               | Diferida                           | README                        |
| D-006 | Diferir tuning de indices/reportes hasta tener metricas reales de uso (BT-007C).       | Evitar optimizacion prematura sin perfil de carga real.                            | Performance avanzada queda para post-piloto con evidencia.             | Diferida                           | README                        |
| D-007 | No desarrollar app movil completa antes del piloto.                                    | Foco en estabilizar core web (ERP/POS) y operacion de tienda.                      | Menor dispersion de esfuerzo y menor riesgo de plazo.                  | Diferida / fuera de alcance actual | Lineamiento de alcance actual |
| D-008 | Evaluar app movil reducida solo post-piloto y si se justifica por operacion real.      | Tomar decision con datos reales de uso y retorno operativo.                        | Posible fase incremental posterior, no comprometida aun.               | Condicionada                       | Lineamiento de alcance actual |
| D-009 | Mantener integracion e-commerce real fuera del alcance actual.                         | Reducir dependencias externas durante estabilizacion MVP.                          | Integracion queda planificada para fase posterior.                     | Fuera de alcance actual            | README + CORE-ADR-003        |
| D-010 | Mantener SUNAT/OSE/PSE productivo fuera del alcance actual; usar mock/sandbox en MVP.  | Reducir riesgo de compliance/operacion temprana.                                   | Flujo funcional validado sin bloqueo de proveedor externo real.        | Aceptada para MVP actual           | README + CORE-ADR-002        |
| D-011 | Proteger `Por clasificar` por nombre normalizado y diferir `is_system`.                | Evitar cambio estructural de schema/Flyway para una regla puntual de negocio.      | Bloqueo operativo inmediato sin migracion adicional.                   | Aceptada y activa                  | QA + Catalogo                  |
| D-012 | Mantener `active` como estado operativo de categorias y unidades sin proteger bases.   | Evitar sobredimensionar reglas reservadas antes de necesitarlo en produccion.       | `UND/PQT/CJA/PLG` siguen editables/inactivables en esta fase.          | Aceptada y activa                  | QA + Catalogo                  |
| D-013 | Mantener `active` en almacenes sin Flyway y usar `PATCH status` para alternar estado.   | Evitar migracion estructural para un flujo de estado ya soportado por dominio/UI.   | `DELETE` queda como alias de desactivacion y la UI expone Desactivar/Reactivar. | Aceptada y activa                  | QA + Inventario               |
| D-014 | No proteger `MAIN_WAREHOUSE` todavia.                                                   | Dejar la reserva para una fase posterior con criterio explicito.                   | El almacen principal sigue editable/inactivable en esta etapa.         | Aceptada y activa                  | QA + Inventario               |
| D-015 | No permitir texto libre para producto sin marca.                                        | Evitar ambiguedad comercial y mantener trazabilidad de catalogo.                   | Solo marca formal o regla explicita auditada `Sin marca` / `Generico`. | Aprobada para Fase 1              | Fase 1A.2 documental          |
| D-016 | Exigir categoria online para publicar, pero no para `DRAFT`.                           | Separar preparacion de contenido de la publicacion real.                           | El draft puede existir sin categoria online; publicado no.            | Aprobada para Fase 1              | Fase 1A.2 documental          |
| D-017 | Permitir `DRAFT` sin asset pero bloquear `PUBLISHED` sin imagen principal, alt y derechos. | Proteger calidad visual y legal antes de exponer catalogo.                        | Publicacion incompleta queda bloqueada.                                | Aprobada para Fase 1              | Fase 1A.2 documental          |
| D-018 | Usar `/api/v1/ecommerce-admin/...` como namespace administrativo interno.            | Separar administracion protegida de la futura Storefront API publica.               | Menor riesgo de mezclar contratos internos y publicos.                 | Aprobada para Fase 1              | Fase 1A.2 documental          |
| D-019 | Iniciar permisos con `ADMIN` full control y `SUPERVISOR` solo lectura/revision.       | Limitar cambios sensibles mientras madura la operacion ecommerce.                   | Publicacion y cambios de precio quedan restringidos a `ADMIN`.         | Aprobada para Fase 1              | Fase 1A.2 documental          |
| D-020 | Posponer Flyway para Fase 1A.2 y exigir aprobacion explicita para Fase 1B.           | Evitar cambios de schema sin cierre documental y sin validacion humana.             | Fase 1B queda condicionada a migracion aditiva de bajo riesgo.         | Aprobada para Fase 1              | Fase 1A.2 documental          |
| D-021 | Separar categoria online SEO de la categoria interna.                                  | Evitar arrastrar jerarquia interna al modelo publico de busqueda.                   | SEO ecommerce queda aislado de catalogacion interna.                   | Aprobada para Fase 1              | Fase 1A.2 documental          |
| D-022 | Bloquear cambios de slug en productos publicados sin historial/redireccion.           | Proteger SEO y enlaces ya expuestos.                                                | Slugs publicados se vuelven estables hasta definir estrategia de historial. | Aprobada para Fase 1          | Fase 1A.2 documental          |
| D-023 | Cerrar documentalmente Fase 1A.2 y preparar commit documental antes de Fase 1B.        | Asegurar trazabilidad y orden de entrega antes de abrir implementacion persistente. | El siguiente paso es commit documental; luego se valida Fase 1B.      | Aprobada y activa                 | CURRENT_STATUS + CHANGE_CONTROL |

## Reglas de actualizacion del log

1. No borrar decisiones historicas; usar estado actualizado.
2. Registrar cambios de estado (Aceptada, Activa, Diferida, Cancelada, Reemplazada).
3. Si una decision depende de evidencia no disponible, marcar "pendiente de verificar".
4. Vincular siempre con fuente documental (README, ADR, QA o lineamiento formal).
