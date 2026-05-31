# Plan de implementacion Fase 1 - Catalogo online base

## Estado

Fase 1C cerrada a nivel de implementacion frontend interna y QA ligero. Sin bloqueantes conocidos.

## Decisiones humanas aprobadas para Fase 1

1. Producto sin marca: no se permite texto libre; solo marca formal o regla explicita auditada tipo `Sin marca` / `Generico`.
2. Categoria online: obligatoria para publicar producto online; opcional mientras el perfil online permanezca en `DRAFT`.
3. Assets: el perfil online puede existir en `DRAFT` sin asset, pero `PUBLISHED` queda bloqueado sin imagen principal formal, alt text y derechos confirmados.
4. Namespace administrativo: usar `/api/v1/ecommerce-admin/...` para administracion interna protegida; no mezclar con la Storefront API publica.
5. Permisos iniciales: `ADMIN` puede crear, editar, publicar y despublicar; `SUPERVISOR` puede leer y revisar, pero no publicar ni modificar precios.
6. Flyway: no tocar en Fase 1A.2; Fase 1B futura solo puede tocarlo con aprobacion explicita y migracion aditiva de bajo riesgo.
7. Categorias: usar categoria online separada para ecommerce SEO; no reutilizar directamente la categoria interna como categoria publica SEO.
8. Slugs: mientras no exista historial de slugs/redirecciones, bloquear cambios de slug si el producto ya esta publicado.

## Lineamientos UX/UI Angular interno para catalogo online

- La administracion ecommerce en Angular interno debe verse profesional, sobria, responsive y mobile-friendly.
- Usar patrones consistentes de tabla con cabecera clara, filtros agrupados y acciones primarias visibles sin saturar la vista.
- Mostrar estados con badges o chips semanticos para `DRAFT`, `PUBLISHED`, `ARCHIVED` o equivalentes, sin depender solo de color.
- Priorizar formularios compactos, con labels persistentes, ayuda contextual y validacion inline visible.
- Las acciones criticas deben pedir confirmacion explicita del sistema antes de ejecutar cambios irreversibles o de alto impacto.
- Los mensajes de vacio, carga, error y exito deben ser claros, breves y orientados a operacion.
- Los datos tecnicos, IDs internos, trazas de sincronizacion, reglas avanzadas y metadata secundaria deben ir en secciones secundarias o colapsables.
- No duplicar en Angular la logica critica de publicacion, precio, stock, slugs o validaciones de negocio; solo mostrar datos calculados por backend.
- Mantener consistencia visual con ERP/POS usando los mismos tokens, densidad moderada, jerarquia sobria y componentes reutilizables.

## Cierre Fase 1C

- Perfiles online implementados y auditados.
- Detalle/editor de perfil online implementado con checklist backend y publicacion protegida.
- Marcas ecommerce implementadas con CRUD y activacion/desactivacion.
- Categorias online implementadas con CRUD y activacion/desactivacion.
- RBAC visual ADMIN/SUPERVISOR validado.
- Errores 400/401/403/404/409/422 manejados con copy operativo.
- Polish visual y responsive aplicados en formularios y empty states.
- Build frontend exitoso.
- QA manual ligero sin bloqueantes conocidos.

## Objetivo

Preparar la publicacion online controlada de productos desde InkToy ERP/POS, manteniendo el ERP como fuente de verdad y protegiendo catalogo interno, inventario, POS, ventas, caja y facturacion.

## Alcance

- Diferenciar producto interno de producto online publicable.
- Definir estado de publicacion online.
- Preparar slug, categoria online, marca formal, imagen principal conceptual, metadata SEO basica y precio online efectivo.
- Definir validaciones server-side de publicacion.
- Definir endpoints administrativos internos futuros, sin crearlos en Fase 1A.
- Definir impacto Angular interno futuro, sin implementarlo en Fase 1A.
- Definir QA y criterios de bloqueo por subfase.

## Fuera de alcance

- Codigo backend o frontend funcional en Fase 1A.
- Migraciones Flyway o cambios DB en Fase 1A.
- Storefront API publica productiva.
- Next.js publico.
- Checkout, carrito real, Mercado Pago, facturacion automatica ecommerce y delivery real.
- Merchant Center real.
- AWS/staging.
- Cambios en POS, inventario, ventas, caja o facturacion.
- Promociones, cupones, listas escolares, variantes y stock reservado.

## Fase 1B boundary

- Fase 1B puede proponer migracion aditiva y modelo persistente base, pero no debe tocar POS, inventario, ventas ni facturacion.
- Fase 1B no implementa Next.js, checkout, Mercado Pago, facturacion automatica ecommerce, delivery real ni Merchant Center.
- Fase 1B sigue requiriendo aprobacion explicita antes de tocar Flyway, crear endpoints o persistir cambios.

## Subfases

| Subfase | Objetivo | Resultado esperado |
|---|---|---|
| Fase 1A | Preparacion documental/tecnica | Cierre Fase 0, plan Fase 1, checklist QA y decisiones pendientes documentadas. |
| Fase 1B | Modelo backend persistente base | Propuesta aprobada, migracion aditiva y modelos/puertos/servicios internos para catalogo online base. |
| Fase 1C | Endpoints administrativos internos | Endpoints protegidos para administrar perfiles online, marcas/categorias online si aplica. |
| Fase 1D | Validacion de publicacion | Reglas server-side para bloquear publicacion incompleta. |
| Fase 1E | Angular interno minimo | Consola interna para revisar/editar/publicar catalogo online, sin Storefront publica. |
| Fase 1F | QA y documentacion de cierre | Tests, builds, matrices y checklist actualizados con evidencia. |

## Decisiones registradas y aprobadas

| Tema | Decision propuesta | Estado |
|---|---|---|
| Producto sin marca | No usar texto libre; permitir solo marca formal o regla explicita `Sin marca`/`Generico`. | Aprobada. |
| Categoria online | Obligatoria para publicar; no obligatoria para `DRAFT`. | Aprobada. |
| Asset formal | Perfil online puede existir en `DRAFT` sin asset; publicacion bloqueada hasta imagen principal con alt text y derechos confirmados. | Aprobada. |
| Namespace admin | `/api/v1/ecommerce-admin/...`. | Aprobada. |
| Permisos iniciales | `ADMIN` crea/edita/publica/despublica; `SUPERVISOR` solo lectura/revision. | Aprobada. |
| Flyway | No tocar en Fase 1A; Fase 1B requiere aprobacion explicita y migracion aditiva de bajo riesgo. | Aprobada como regla de control. |

## Riesgos

| Riesgo | Mitigacion |
|---|---|
| Publicar productos internos incompletos | Producto activo no equivale a publicado online; usar estado online y validaciones server-side. |
| Romper POS por cambios en producto | No modificar contratos POS ni semantica de `salePrice`. |
| Romper inventario por variantes prematuras | No implementar variantes ni stock reservado en Fase 1 base. |
| Exponer endpoints internos | Separar endpoints admin internos de Storefront API publica futura. |
| Duplicar precios | Precio POS/base sigue siendo fuente; override online separado y calculado server-side. |
| Slugs duplicados o inestables | Validar unicidad y bloquear cambios de slug publicado hasta tener historial. |
| Imagenes sin derechos | Bloquear publicacion sin asset principal con derechos confirmados. |
| Deuda por migracion agresiva | Usar cambios aditivos, nullable donde aplique y validaciones de aplicacion. |

## Modulos protegidos

- POS: no cambiar lookup, busqueda, calculo de venta ni payloads.
- Inventario: no cambiar stock, kardex, movimientos, almacenes ni reservas.
- Ventas/caja: no cambiar ventas, anulacion, caja ni pagos.
- Facturacion: no cambiar emision desde venta, series, XML, firma/envio ni estados.
- Seguridad: no abrir CORS ni endpoints publicos sin aprobacion.

## Restricciones tecnicas

- Mantener arquitectura hexagonal estricta.
- No exponer entidades JPA ni modelos de dominio por REST.
- No reutilizar DTOs administrativos como DTOs Storefront futuros.
- Toda regla critica debe validarse server-side.
- No calcular precio, stock, envio ni estados finales en frontend.
- Mantener endpoints existentes compatibles.
- No tocar AWS/staging hasta fase local estable y validada.

## Criterios para permitir Fase 1B

- Aprobacion explicita para tocar Flyway y crear migracion aditiva.
- Aprobacion del namespace administrativo interno.
- Aprobacion de politica de marca para productos sin marca.
- Aprobacion de obligatoriedad de categoria online para publicar.
- Aprobacion de regla de asset principal para publicacion.
- Aprobacion de permisos iniciales ADMIN/SUPERVISOR.
- Plan de pruebas backend definido antes de implementar.
- Confirmacion de que no se tocara POS, inventario, ventas, caja ni facturacion.
- Confirmacion de que Fase 1B no implementara Next.js, checkout, Mercado Pago, facturacion automatica ecommerce, delivery real ni Merchant Center.

## Primera subfase implementable despues de Fase 1A

Fase 1B backend-only con DB/Flyway aprobada explicitamente: crear modelo persistente aditivo de catalogo online base en estado `DRAFT`, sin endpoints publicos, sin Angular obligatorio y sin cambiar endpoints existentes.

Base documental asociada:

- `docs/adr/core/CORE-ADR-001-monolito-modular-hexagonal.md`
- `docs/adr/core/CORE-ADR-002-facturacion-electronica-mvp.md`
- `docs/adr/core/CORE-ADR-003-outbox-eventos-ecommerce-futuro.md`
- `docs/adr/ecommerce/ECOM-ADR-001-ecommerce-seo-first-architecture.md`
- `docs/adr/ecommerce/ECOM-ADR-019-merchant-center-and-advanced-technical-seo.md`

La Fase 1B debe limitarse a estructura base y tests de aplicacion/persistencia. La publicacion real y la UI pueden quedar para subfases posteriores.
