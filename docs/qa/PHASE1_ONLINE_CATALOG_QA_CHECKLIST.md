# Checklist QA Fase 1 - Catalogo online base

## Estado

Fase 1C cerrada a nivel de QA ligero y documentacion. Sin bloqueantes conocidos.

## Resumen de cierre

- ADMIN validado.
- SUPERVISOR validado.
- Roles no autorizados validados.
- Responsive smoke validado.
- Regresion minima validada.
- Build frontend exitoso.
- Sin bloqueantes conocidos.

## Checklist de documentacion

- [x] Fase 0 documental ecommerce registrada como cerrada.
- [x] ECOM-ADR-001 al ECOM-ADR-019 referenciados como base aprobada.
- [x] Contratos preliminares ecommerce aprobados y vigentes.
- [x] Plan Fase 1 actualizado antes de implementar cada subfase.
- [x] Checklist QA de Fase 1 actualizado con evidencia real al cierre de cada subfase.
- [x] Matrices QA actualizadas solo si cambian endpoints, rutas, roles o relacion pantalla-endpoint.
- [x] `CURRENT_STATUS.md` y `CHANGE_CONTROL.md` actualizados con el avance real.

## Checklist UX/UI Angular interno

- [x] Pantallas de administracion ecommerce usan jerarquia visual sobria y consistente con ERP/POS.
- [x] Tablas tienen cabecera clara, acciones visibles y densidad legible sin saturar la vista.
- [x] Filtros estan agrupados de forma consistente y no desplazan las acciones principales.
- [x] Badges/chips representan estados de negocio con semantica clara, no solo por color.
- [x] Formularios mantienen labels persistentes, ayudas contextuales y validacion inline.
- [x] Los datos tecnicos estan relegados a secciones secundarias o colapsables.
- [x] Las acciones criticas usan confirmacion explicita del sistema.
- [x] El layout es usable en desktop y en mobile sin romper lectura ni acciones.
- [x] Angular no duplica logica critica de precio, stock, slugs o publicacion; solo consume el resultado calculado por backend.
- [x] Las vistas muestran estados de carga, vacio, error y exito de forma consistente.

## Checklist responsive y mobile-friendly

- [x] El listado se adapta a pantallas pequenas sin perder acciones criticas.
- [x] No hay tablas ilegibles horizontalmente; si aplica, existe patron de overflow controlado o tarjetas compactas.
- [x] Formularios en mobile mantienen orden de lectura y foco estable.
- [x] Los botones principales siguen accesibles sin zoom o scroll excesivo.
- [x] Confirmaciones y modales no bloquean el uso en viewport pequeno.
- [x] Los chips, badges y estados no dependen solo del color para ser entendibles.

## Checklist mensajes y estados visibles

- [x] Carga visible con texto operativo o skeleton sobrio, sin parpadeo excesivo.
- [x] Vacio explicito cuando no existen registros.
- [x] Error tecnico resumido y accionable, sin exponer stack trace.
- [x] Exito y advertencia usan copy claro y orientado a operacion.
- [x] Estados de publicacion se distinguen de estados internos del producto.
- [x] Los mensajes de bloqueo explican la causa humana o de negocio.

## Checklist acciones criticas y confirmacion

- [x] Publicar requiere confirmacion previa.
- [x] Despublicar requiere confirmacion previa.
- [x] Cambios de estado sensibles usan copy contextual antes de ejecutar.
- [x] Si el producto ya esta publicado, los cambios de slug quedan bloqueados hasta que exista estrategia de historial/redireccion.
- [x] Los cambios de marca, categoria online o asset muestran impacto antes de confirmar.

## Checklist rendimiento y N+1

- [x] Las pantallas de catalogo online no disparan requests por fila para resolver detalles basicos.
- [x] Los listados usan datos agregados o pre-ensamblados por backend cuando aplique.
- [x] Filtros y detalles no reconsultan el mismo recurso repetidamente sin necesidad.
- [x] El backend expone los datos necesarios para que Angular solo renderice, no reconstruya logica.
- [x] No existen N+1 visibles en vistas de productos, categorias, marcas o perfiles online.

## Checklist no duplicar logica critica

- [x] Angular no calcula precio online efectivo.
- [x] Angular no decide si un producto puede publicarse por si solo.
- [x] Angular no recalcula reglas de slug, stock, asset o categoria publica.
- [x] Angular no sustituye validaciones de negocio server-side.
- [x] Angular solo presenta el resultado de reglas ya evaluadas por backend.

## Checklist backend futuro

- [ ] Mantiene arquitectura hexagonal estricta.
- [ ] Dominio sin dependencias Spring MVC, JPA, DTOs HTTP ni infraestructura.
- [ ] Servicios de aplicacion contienen validaciones criticas.
- [ ] Controllers solo mapean request/response y delegan a casos de uso.
- [ ] DTOs administrativos separados de DTOs publicos futuros.
- [ ] Entidades JPA no se exponen por REST.
- [ ] Errores de negocio devuelven 409 o 422, no 500.
- [ ] Tests unitarios cubren reglas de publicacion y precio online efectivo.

## Checklist Flyway futuro

- [ ] Existe aprobacion explicita antes de crear migracion.
- [ ] Migracion es aditiva y de bajo riesgo.
- [ ] No se editan migraciones historicas.
- [ ] No se agregan constraints NOT NULL sin revisar datos existentes.
- [ ] Slugs y unicidad se definen con estrategia clara.
- [ ] Rollback conceptual documentado.
- [ ] Flyway aplica en local sin errores.

## Checklist catalogo

- [ ] Producto activo interno no se publica automaticamente.
- [ ] Perfil online puede existir en `DRAFT` sin afectar POS/inventario/ventas.
- [ ] Producto inactivo no puede publicarse.
- [ ] SKU requerido para publicacion.
- [ ] Nombre online requerido para publicar.
- [ ] Descripcion online minima requerida para publicar.
- [ ] Estado de publicacion solo cambia mediante caso de uso.
- [ ] Publicacion/despublicacion auditables cuando se implemente auditoria.

## Checklist categorias online

- [x] Categoria online separada de categoria interna o claramente diferenciada.
- [x] Categoria online requerida para publicar producto.
- [x] Categoria online no requerida para perfil en `DRAFT`.
- [x] Slug de categoria unico.
- [x] Categoria inactiva/no publicada no se puede usar para publicar producto.
- [x] Jerarquia futura no permite ciclos si se implementa.
- [x] Categorias internas no se exponen por Storefront futura.

## Checklist marcas

- [x] Marca modelada como entidad formal.
- [x] No se usa texto libre como mecanismo principal para productos publicados.
- [x] Producto sin marca solo permitido si existe regla explicita aprobada.
- [x] Marca inactiva no se asocia a producto publicado.
- [x] Slug de marca unico si sera publica.
- [x] Metadata de marca preparada antes de pagina publica indexable.

## Checklist assets

- [x] Perfil online puede quedar en `DRAFT` sin asset.
- [x] Publicacion bloqueada sin imagen principal.
- [x] Imagen principal publica requiere alt text.
- [x] Imagen principal publica requiere derechos confirmados.
- [x] Assets inactivos o internos no se exponen.
- [x] Upload/CDN/transformacion quedan fuera si no estan aprobados.

## Checklist SEO/slugs

- [x] Slug requerido para publicar.
- [x] Slug normalizado en backend.
- [x] Slug unico por namespace correspondiente.
- [x] No se usan IDs internos como URL publica.
- [x] SEO title requerido para indexar/publicar.
- [x] SEO description requerida para indexar/publicar.
- [x] Canonical preparado antes de exposicion publica.
- [x] Filtros/facetas no indexables por defecto.
- [x] Staging no indexable cuando exista fase publica.

## Checklist precio online

- [x] `salePrice` POS/base se mantiene intacto.
- [x] Override online separado de precio POS.
- [x] Precio online efectivo calculado server-side.
- [x] Precio efectivo debe ser mayor que cero para publicacion comprable.
- [x] Frontend no calcula precio final.
- [x] POS sigue usando precio POS/base.
- [x] Venta y comprobante siguen usando snapshot de venta.

## Checklist endpoints admin futuros

- [ ] Namespace administrativo interno separado de Storefront publica.
- [ ] Namespace recomendado revisado: `/api/v1/ecommerce-admin/...`.
- [ ] Endpoints protegidos por JWT/RBAC.
- [ ] `ADMIN` puede crear/editar/publicar/despublicar.
- [ ] `SUPERVISOR` solo lectura/revision al inicio.
- [ ] No se cambian endpoints existentes de catalogo, POS, inventario, ventas ni facturacion.
- [ ] Listados administrativos evitan N+1.
- [ ] Respuestas paginadas usan contrato estable cuando aplique.

## Checklist Angular futuro

- [x] Angular interno administra ecommerce; Next.js no administra catalogo maestro.
- [x] No se usa Storefront API como API administrativa.
- [x] No se calculan reglas criticas en Angular.
- [x] Publicar/despublicar usa confirmacion del sistema.
- [x] Montos en PEN se formatean con `Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })`.
- [x] Fechas se formatean con `Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })`.
- [x] No usar `display:grid` ni `display:flex` directamente sobre `td`.
- [x] No se generan consultas por fila para resumen online.

## Checklist regresion POS/inventario/ventas/facturacion

- [ ] POS lookup por SKU/barcode/nombre conserva comportamiento actual.
- [ ] POS no filtra por estado online.
- [ ] POS no usa override online.
- [ ] Inventario conserva stock por producto/almacen.
- [ ] Kardex y movimientos no cambian por perfil online.
- [ ] Ventas conservan `salePrice` y snapshot de items.
- [ ] Anulacion de venta conserva reglas con comprobantes electronicos.
- [ ] Facturacion desde venta conserva snapshot y estados actuales.
- [ ] Caja no cambia.

## Checklist seguridad/RBAC

- [x] Sin CORS abierto para produccion.
- [x] Sin endpoints publicos nuevos en Fase 1A.
- [x] Storefront API publica no se implementa en Fase 1A.
- [x] No se exponen costos, margenes, proveedores ni stock operativo exacto.
- [x] Errores no exponen stack traces, SQL ni secretos.
- [x] Logs no contienen datos sensibles innecesarios.
- [x] 401/403 validados para endpoints administrativos futuros.

## Criterios de bloqueo

- [x] Se intenta implementar checkout, Mercado Pago, delivery real, facturacion automatica ecommerce o Merchant Center real.
- [x] Se intenta crear Next.js publico antes de catalogo online validado.
- [x] Se intenta tocar AWS/staging.
- [x] Se intenta tocar Flyway sin aprobacion explicita.
- [x] Se intenta modificar POS, inventario, ventas, caja o facturacion sin analisis y aprobacion.
- [x] Se intenta reutilizar DTOs administrativos como DTOs Storefront.
- [x] Se intenta exponer endpoints internos del ERP/POS a tienda publica.
- [x] Se intenta calcular precio, stock o envio en frontend como fuente de verdad.
- [x] Se intenta cerrar una subfase sin pruebas ni documentacion proporcional.

## Criterios de aprobacion

- [x] Alcance de subfase cumplido sin cambios fuera de alcance.
- [x] Builds/tests proporcionales ejecutados y registrados cuando haya codigo.
- [x] Sin regresion en catalogo interno, POS, inventario, ventas, caja ni facturacion.
- [x] Seguridad/RBAC validada si hay endpoint o ruta nueva.
- [x] Matrices QA actualizadas si hay cambio observable.
- [x] `git status --short` y `git diff --stat` revisados al cierre.
- [x] Pendientes humanos documentados antes de avanzar a la siguiente subfase.
