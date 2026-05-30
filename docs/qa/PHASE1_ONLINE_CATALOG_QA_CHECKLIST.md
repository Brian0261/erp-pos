# Checklist QA Fase 1 - Catalogo online base

## Estado

Preparado en Fase 1A documental/tecnica. No representa ejecucion de QA funcional todavia.

## Checklist de documentacion

- [ ] Fase 0 documental ecommerce registrada como cerrada.
- [ ] ECOM-ADR-001 al ECOM-ADR-019 referenciados como base aprobada.
- [ ] Contratos preliminares ecommerce aprobados y vigentes.
- [ ] Plan Fase 1 actualizado antes de implementar cada subfase.
- [ ] Checklist QA de Fase 1 actualizado con evidencia real al cierre de cada subfase.
- [ ] Matrices QA actualizadas solo si cambian endpoints, rutas, roles o relacion pantalla-endpoint.
- [ ] `CURRENT_STATUS.md` y `CHANGE_CONTROL.md` actualizados con el avance real.

## Checklist UX/UI Angular interno

- [ ] Pantallas de administracion ecommerce usan jerarquia visual sobria y consistente con ERP/POS.
- [ ] Tablas tienen cabecera clara, acciones visibles y densidad legible sin saturar la vista.
- [ ] Filtros estan agrupados de forma consistente y no desplazan las acciones principales.
- [ ] Badges/chips representan estados de negocio con semantica clara, no solo por color.
- [ ] Formularios mantienen labels persistentes, ayudas contextuales y validacion inline.
- [ ] Los datos tecnicos estan relegados a secciones secundarias o colapsables.
- [ ] Las acciones criticas usan confirmacion explicita del sistema.
- [ ] El layout es usable en desktop y en mobile sin romper lectura ni acciones.
- [ ] Angular no duplica logica critica de precio, stock, slugs o publicacion; solo consume el resultado calculado por backend.
- [ ] Las vistas muestran estados de carga, vacio, error y exito de forma consistente.

## Checklist responsive y mobile-friendly

- [ ] El listado se adapta a pantallas pequenas sin perder acciones criticas.
- [ ] No hay tablas ilegibles horizontalmente; si aplica, existe patron de overflow controlado o tarjetas compactas.
- [ ] Formularios en mobile mantienen orden de lectura y foco estable.
- [ ] Los botones principales siguen accesibles sin zoom o scroll excesivo.
- [ ] Confirmaciones y modales no bloquean el uso en viewport pequeno.
- [ ] Los chips, badges y estados no dependen solo del color para ser entendibles.

## Checklist mensajes y estados visibles

- [ ] Carga visible con texto operativo o skeleton sobrio, sin parpadeo excesivo.
- [ ] Vacio explicito cuando no existen registros.
- [ ] Error tecnico resumido y accionable, sin exponer stack trace.
- [ ] Exito y advertencia usan copy claro y orientado a operacion.
- [ ] Estados de publicacion se distinguen de estados internos del producto.
- [ ] Los mensajes de bloqueo explican la causa humana o de negocio.

## Checklist acciones criticas y confirmacion

- [ ] Publicar requiere confirmacion previa.
- [ ] Despublicar requiere confirmacion previa.
- [ ] Cambios de estado sensibles usan copy contextual antes de ejecutar.
- [ ] Si el producto ya esta publicado, los cambios de slug quedan bloqueados hasta que exista estrategia de historial/redireccion.
- [ ] Los cambios de marca, categoria online o asset muestran impacto antes de confirmar.

## Checklist rendimiento y N+1

- [ ] Las pantallas de catalogo online no disparan requests por fila para resolver detalles basicos.
- [ ] Los listados usan datos agregados o pre-ensamblados por backend cuando aplique.
- [ ] Filtros y detalles no reconsultan el mismo recurso repetidamente sin necesidad.
- [ ] El backend expone los datos necesarios para que Angular solo renderice, no reconstruya logica.
- [ ] No existen N+1 visibles en vistas de productos, categorias, marcas o perfiles online.

## Checklist no duplicar logica critica

- [ ] Angular no calcula precio online efectivo.
- [ ] Angular no decide si un producto puede publicarse por si solo.
- [ ] Angular no recalcula reglas de slug, stock, asset o categoria publica.
- [ ] Angular no sustituye validaciones de negocio server-side.
- [ ] Angular solo presenta el resultado de reglas ya evaluadas por backend.

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

- [ ] Categoria online separada de categoria interna o claramente diferenciada.
- [ ] Categoria online requerida para publicar producto.
- [ ] Categoria online no requerida para perfil en `DRAFT`.
- [ ] Slug de categoria unico.
- [ ] Categoria inactiva/no publicada no se puede usar para publicar producto.
- [ ] Jerarquia futura no permite ciclos si se implementa.
- [ ] Categorias internas no se exponen por Storefront futura.

## Checklist marcas

- [ ] Marca modelada como entidad formal.
- [ ] No se usa texto libre como mecanismo principal para productos publicados.
- [ ] Producto sin marca solo permitido si existe regla explicita aprobada.
- [ ] Marca inactiva no se asocia a producto publicado.
- [ ] Slug de marca unico si sera publica.
- [ ] Metadata de marca preparada antes de pagina publica indexable.

## Checklist assets

- [ ] Perfil online puede quedar en `DRAFT` sin asset.
- [ ] Publicacion bloqueada sin imagen principal.
- [ ] Imagen principal publica requiere alt text.
- [ ] Imagen principal publica requiere derechos confirmados.
- [ ] Assets inactivos o internos no se exponen.
- [ ] Upload/CDN/transformacion quedan fuera si no estan aprobados.

## Checklist SEO/slugs

- [ ] Slug requerido para publicar.
- [ ] Slug normalizado en backend.
- [ ] Slug unico por namespace correspondiente.
- [ ] No se usan IDs internos como URL publica.
- [ ] SEO title requerido para indexar/publicar.
- [ ] SEO description requerida para indexar/publicar.
- [ ] Canonical preparado antes de exposicion publica.
- [ ] Filtros/facetas no indexables por defecto.
- [ ] Staging no indexable cuando exista fase publica.

## Checklist precio online

- [ ] `salePrice` POS/base se mantiene intacto.
- [ ] Override online separado de precio POS.
- [ ] Precio online efectivo calculado server-side.
- [ ] Precio efectivo debe ser mayor que cero para publicacion comprable.
- [ ] Frontend no calcula precio final.
- [ ] POS sigue usando precio POS/base.
- [ ] Venta y comprobante siguen usando snapshot de venta.

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

- [ ] Angular interno administra ecommerce; Next.js no administra catalogo maestro.
- [ ] No se usa Storefront API como API administrativa.
- [ ] No se calculan reglas criticas en Angular.
- [ ] Publicar/despublicar usa confirmacion del sistema.
- [ ] Montos en PEN se formatean con `Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })`.
- [ ] Fechas se formatean con `Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })`.
- [ ] No usar `display:grid` ni `display:flex` directamente sobre `td`.
- [ ] No se generan consultas por fila para resumen online.

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

- [ ] Sin CORS abierto para produccion.
- [ ] Sin endpoints publicos nuevos en Fase 1A.
- [ ] Storefront API publica no se implementa en Fase 1A.
- [ ] No se exponen costos, margenes, proveedores ni stock operativo exacto.
- [ ] Errores no exponen stack traces, SQL ni secretos.
- [ ] Logs no contienen datos sensibles innecesarios.
- [ ] 401/403 validados para endpoints administrativos futuros.

## Criterios de bloqueo

- [ ] Se intenta implementar checkout, Mercado Pago, delivery real, facturacion automatica ecommerce o Merchant Center real.
- [ ] Se intenta crear Next.js publico antes de catalogo online validado.
- [ ] Se intenta tocar AWS/staging.
- [ ] Se intenta tocar Flyway sin aprobacion explicita.
- [ ] Se intenta modificar POS, inventario, ventas, caja o facturacion sin analisis y aprobacion.
- [ ] Se intenta reutilizar DTOs administrativos como DTOs Storefront.
- [ ] Se intenta exponer endpoints internos del ERP/POS a tienda publica.
- [ ] Se intenta calcular precio, stock o envio en frontend como fuente de verdad.
- [ ] Se intenta cerrar una subfase sin pruebas ni documentacion proporcional.

## Criterios de aprobacion

- [ ] Alcance de subfase cumplido sin cambios fuera de alcance.
- [ ] Builds/tests proporcionales ejecutados y registrados cuando haya codigo.
- [ ] Sin regresion en catalogo interno, POS, inventario, ventas, caja ni facturacion.
- [ ] Seguridad/RBAC validada si hay endpoint o ruta nueva.
- [ ] Matrices QA actualizadas si hay cambio observable.
- [ ] `git status --short` y `git diff --stat` revisados al cierre.
- [ ] Pendientes humanos documentados antes de avanzar a la siguiente subfase.
