# ADR-018 — Administración ecommerce en Angular interno para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, pedidos, ventas, facturación y operación interna. La futura tienda online SEO-first será una aplicación pública Next.js publicada en `inktoy.pe`, mientras que el ERP/POS interno continuará usando Angular en `app.inktoy.pe`.

Ya fueron aprobados:

- ADR-001: Arquitectura ecommerce SEO-first.
- ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ADR-003: Catálogo online y publicación de productos.
- ADR-004: Marcas.
- ADR-005: Variantes de producto.
- ADR-006: Slugs y URLs SEO.
- ADR-007: Imágenes y assets de producto.
- ADR-008: SEO metadata.
- ADR-009: Almacén online configurable, stock disponible online y stock reservado.
- ADR-010: Stock reservado, concurrencia y estrategia anti-sobreventa.
- ADR-011: Precios online, promociones futuras y reglas de cálculo.
- ADR-012: Pedidos online y lifecycle ecommerce.
- ADR-013: Mercado Pago, webhook e idempotencia.
- ADR-014: Facturación automática ecommerce.
- ADR-015: Delivery nacional y couriers.
- ADR-016: Seguridad ecommerce y protección de APIs públicas.
- ADR-017: Storefront API pública/controlada.

Decisiones base ya aprobadas:

- La tienda pública será Next.js con SSR/SSG/ISR en `inktoy.pe`.
- El ERP/POS interno estará en `app.inktoy.pe`.
- La Storefront API/API pública controlada estará en `api.inktoy.pe`.
- ERP/POS Spring Boot será la fuente de verdad de catálogo, precios, stock, pedidos, ventas y facturación.
- Angular seguirá siendo el frontend interno del ERP/POS.
- La tienda pública no consumirá endpoints internos del ERP/POS.
- Storefront API será la única capa pública ecommerce.
- La implementación inicial de Storefront API será un módulo dentro del monolito modular Spring Boot, diseñado como extraction-ready.
- El frontend público nunca decidirá precios, stock, descuentos, totales, costo de envío, estado del pedido, estado del pago ni datos finales de facturación.
- Todo dato crítico debe validarse server-side.
- El catálogo online, marcas, variantes, imágenes, metadata SEO, precios online, almacén online, stock reservado, pedidos online, pagos, delivery y facturación deberán administrarse de forma controlada desde el ERP/POS.
- La seguridad, trazabilidad, auditoría y control por roles son obligatorios.

Este ADR define cómo debe organizarse la administración ecommerce dentro del Angular interno, diferenciándola claramente de la tienda pública Next.js y de la Storefront API.

## Problema

Se debe definir cómo el equipo interno de InkToy administrará la operación ecommerce desde el ERP/POS sin mezclar responsabilidades con la tienda pública ni exponer herramientas internas.

La decisión debe resolver:

- qué módulos ecommerce se administrarán desde Angular;
- qué pantallas internas serán necesarias;
- qué roles y permisos se requerirán;
- qué acciones deben auditarse;
- qué validaciones deben ejecutarse server-side;
- cómo separar endpoints administrativos internos de Storefront API pública;
- cómo evitar que usuarios sin permiso modifiquen precios, SEO, stock, cobertura, pedidos, pagos o facturación;
- cómo evitar pantallas demasiado técnicas o difíciles de operar;
- cómo manejar incidencias de pedidos, pagos, stock, delivery y facturación.

Riesgos de no definir esta administración:

- productos incompletos publicados online;
- precios online mal configurados;
- cambios SEO sin revisión;
- sobreventa por mala configuración de almacén o stock;
- pedidos online sin seguimiento operativo;
- pagos aprobados sin gestión de incidencia;
- facturación fallida sin responsable;
- datos personales visibles para usuarios no autorizados;
- Storefront API usada incorrectamente como API administrativa;
- mezcla peligrosa entre operación POS física y operación ecommerce;
- pérdida de trazabilidad en cambios críticos.

## Decisión

Angular interno será la interfaz principal para administrar ecommerce dentro del ERP/POS.

Decisiones principales:

1. La administración ecommerce se realizará desde `app.inktoy.pe`.
2. Angular interno consumirá endpoints administrativos internos protegidos.
3. Angular interno no usará Storefront API pública para administración.
4. Storefront API será exclusiva para tienda pública y operaciones públicas/controladas.
5. La administración ecommerce se organizará por módulos/pantallas internas.
6. Cada operación crítica requerirá permisos explícitos.
7. Todo cambio relevante deberá auditarse.
8. Toda decisión crítica se validará server-side.
9. Las pantallas internas deberán ser sobrias, claras, operativas y no excesivamente técnicas.
10. Los datos técnicos deberán mostrarse solo en secciones secundarias o colapsables.
11. ADMIN/SUPERVISOR podrán asumir temporalmente funciones ecommerce en la primera etapa.
12. Roles ecommerce específicos podrán incorporarse cuando la operación crezca.
13. La tienda pública Next.js no administrará catálogo, precios, stock, pedidos, pagos, delivery ni facturación.
14. Storefront API no será usada como API administrativa.

Decisión central:

> Angular interno será la consola operativa y administrativa del ecommerce de InkToy. La tienda pública Next.js no administrará catálogo, pedidos, precios, stock, pagos, delivery ni facturación. Storefront API no será usada como API administrativa.

## Módulos y pantallas internas recomendadas

### Configuración ecommerce

Objetivo:

- centralizar parámetros globales de ecommerce.

Acciones permitidas:

- activar/desactivar funcionalidades ecommerce por feature flags;
- configurar almacén online;
- configurar políticas generales de publicación;
- definir reglas base de visibilidad;
- ver estado general de integración ecommerce.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager futuro.

Validaciones:

- no cambiar almacén online si hay pedidos/reservas activas sin política definida;
- no activar venta online si faltan reglas críticas;
- confirmar acciones de alto impacto.

Riesgos:

- activar ecommerce incompleto;
- cambiar configuración crítica sin control;
- romper consistencia con POS.

Dependencias:

- ADR-009;
- ADR-010;
- ADR-016;
- ADR-017.

Prioridad:

- Inicial.

### Catálogo online

Objetivo:

- administrar qué productos del ERP/POS se publican en la tienda online.

Acciones permitidas:

- marcar producto como publicable;
- completar datos online;
- revisar validaciones de publicación;
- publicar/despublicar producto;
- ver estado de publicación.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- SEO/Content Manager con límites.

Validaciones:

- producto activo;
- SKU obligatorio;
- slug único;
- categoría online;
- imagen principal;
- metadata mínima;
- precio válido;
- disponibilidad o regla de no compra si está agotado.

Riesgos:

- publicar productos incompletos;
- exponer productos internos;
- generar páginas SEO pobres.

Dependencias:

- ADR-003;
- ADR-006;
- ADR-007;
- ADR-008;
- ADR-011.

Prioridad:

- Inicial.

### Productos publicables

Objetivo:

- listar productos candidatos a tienda online y mostrar qué les falta para publicarse.

Acciones permitidas:

- filtrar por estado;
- ver checklist de publicación;
- corregir datos faltantes;
- enviar a revisión;
- publicar si cumple reglas.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- SEO/Content Manager parcial.

Validaciones:

- reglas del ADR-003;
- warnings por datos SEO débiles;
- bloqueo si falta imagen, slug, precio o categoría.

Riesgos:

- publicar por error;
- duplicar productos;
- no detectar datos incompletos.

Prioridad:

- Inicial.

### Marcas

Objetivo:

- administrar marcas como entidades formales.

Acciones permitidas:

- crear marca;
- editar marca;
- activar/desactivar;
- configurar slug;
- configurar metadata SEO;
- subir logo futuro;
- asociar productos.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- SEO/Content Manager para contenido.

Validaciones:

- nombre normalizado único;
- slug único;
- no publicar marca sin contenido mínimo;
- no asociar producto online a marca inactiva.

Riesgos:

- marcas duplicadas;
- páginas de marca pobres;
- inconsistencias con Merchant Center.

Dependencias:

- ADR-004;
- ADR-006;
- ADR-008.

Prioridad:

- Inicial/preparar, según estado actual del catálogo.

### Variantes

Objetivo:

- administrar variantes vendibles de productos.

Acciones permitidas:

- crear/editar variantes;
- definir atributos como color, tamaño, presentación o diseño;
- asignar SKU;
- asignar barcode cuando exista;
- configurar precio por variante si aplica;
- configurar imagen por variante;
- activar/desactivar variante.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager.

Validaciones:

- SKU obligatorio y único;
- barcode único si existe;
- no vender variante inactiva;
- stock a nivel de variante;
- no crear variante si no aporta valor operativo.

Riesgos:

- stock descontado incorrectamente;
- POS vendiendo producto padre en vez de variante;
- Merchant Center inconsistente.

Dependencias:

- ADR-005;
- ADR-009;
- ADR-011.

Prioridad:

- Inicial si el catálogo real ya contiene productos con variantes; de lo contrario, preparar.

### Imágenes/assets

Objetivo:

- administrar imágenes públicas de productos, variantes y marcas.

Acciones permitidas:

- asignar imagen principal;
- gestionar galería;
- configurar imagen por variante;
- registrar alt text;
- registrar fuente;
- confirmar derechos de uso;
- activar/desactivar asset.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- SEO/Content Manager.

Validaciones:

- producto publicado requiere imagen principal;
- alt text obligatorio;
- derechos confirmados;
- no exponer assets inactivos;
- evitar imágenes pesadas sin optimización futura.

Riesgos:

- imágenes sin permiso;
- mala UX;
- bajo rendimiento;
- problemas de Core Web Vitals.

Dependencias:

- ADR-007;
- ADR-008.

Prioridad:

- Inicial.

### SEO metadata

Objetivo:

- administrar metadata SEO de productos, categorías, marcas y futuras páginas públicas.

Acciones permitidas:

- editar title;
- editar meta description;
- configurar canonical;
- configurar robots policy;
- configurar Open Graph;
- revisar contenido mínimo;
- marcar revisión humana.

Roles:

- SEO/Content Manager;
- Ecommerce Manager;
- ADMIN/SUPERVISOR temporalmente.

Validaciones:

- title único;
- description útil;
- canonical válido;
- no indexar páginas pobres;
- no indexar filtros/facetas por defecto;
- revisión humana para páginas estratégicas.

Riesgos:

- contenido duplicado;
- titles repetidos;
- metadata genérica;
- indexación incorrecta.

Dependencias:

- ADR-008;
- ADR-006.

Prioridad:

- Inicial.

### Slugs y redirecciones futuras

Objetivo:

- administrar slugs públicos y preparar historial de redirecciones.

Acciones permitidas:

- editar slug bajo reglas controladas;
- ver historial futuro;
- marcar necesidad de redirección 301;
- bloquear duplicados.

Roles:

- SEO/Content Manager;
- Ecommerce Manager;
- ADMIN/SUPERVISOR.

Validaciones:

- slug único;
- formato válido;
- no cambiar slug sin motivo;
- redirección futura obligatoria si una URL pública cambia.

Riesgos:

- pérdida de tráfico SEO;
- URLs duplicadas;
- enlaces rotos.

Dependencias:

- ADR-006;
- ADR-008.

Prioridad:

- Preparar.

### Precios online y overrides

Objetivo:

- administrar overrides de precio online cuando difieran del precio POS.

Acciones permitidas:

- ver precio POS/base;
- definir override online;
- activar/desactivar override;
- ver precio efectivo;
- auditar cambios.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager.
- Marketing futuro solo con permisos limitados si se define.

Validaciones:

- no permitir precio negativo;
- no permitir precio cero salvo política explícita;
- auditar cambios;
- confirmar cambios de alto impacto;
- backend calcula precio efectivo.

Riesgos:

- precio online incorrecto;
- diferencia con Mercado Pago;
- diferencia con facturación;
- Merchant Center inconsistente.

Dependencias:

- ADR-011;
- ADR-013;
- ADR-014.

Prioridad:

- Inicial.

### Almacén online

Objetivo:

- configurar qué almacén se usará para ventas online.

Acciones permitidas:

- seleccionar almacén online;
- ver almacén actual;
- ver impacto;
- cambiar almacén bajo reglas;
- ver historial futuro.

Roles:

- ADMIN;
- SUPERVISOR.

Validaciones:

- no cambiar con reservas/pedidos activos sin política definida;
- confirmación obligatoria;
- auditar cambio;
- validar existencia del almacén.

Riesgos:

- sobreventa;
- stock incoherente;
- pedidos pendientes afectados.

Dependencias:

- ADR-009;
- ADR-010.

Prioridad:

- Inicial.

### Stock reservado

Objetivo:

- visualizar reservas online y apoyar resolución de incidencias.

Acciones permitidas:

- ver reservas pendientes;
- ver reservas confirmadas;
- ver reservas vencidas;
- ver reserva asociada a pedido;
- liberar o corregir solo bajo flujo controlado futuro.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- Soporte de pagos con vista limitada.

Validaciones:

- no liberar reserva confirmada sin flujo formal;
- no confirmar manualmente sin validación;
- auditar acciones.

Riesgos:

- liberar stock incorrectamente;
- doble venta;
- reserva huérfana.

Dependencias:

- ADR-009;
- ADR-010.

Prioridad:

- Preparar/inicial cuando existan pedidos online.

### Pedidos online

Objetivo:

- gestionar lifecycle de pedidos online.

Acciones permitidas:

- listar pedidos;
- ver detalle;
- filtrar por estado;
- ver pago;
- ver reserva;
- ver dirección;
- ver facturación;
- ver delivery;
- cambiar estados permitidos;
- registrar observaciones.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- Fulfillment/Despacho;
- Atención al cliente;
- Soporte de pagos con límites.

Validaciones:

- transiciones permitidas;
- no convertir a venta sin pago aprobado y reserva confirmada;
- no facturar si hay incidencia;
- auditar cambios.

Riesgos:

- estados inconsistentes;
- pedidos duplicados;
- mala atención al cliente.

Dependencias:

- ADR-012;
- ADR-013;
- ADR-014;
- ADR-015.

Prioridad:

- Inicial cuando se implemente checkout/pedidos.

### Incidencias de pedidos

Objetivo:

- revisar y resolver incidencias operativas.

Tipos:

- incidencia de stock;
- pago inconsistente;
- reserva expirada;
- facturación fallida;
- delivery fallido;
- datos tributarios inválidos.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- Soporte de pagos;
- Responsable de facturación;
- Fulfillment según tipo.

Validaciones:

- cada incidencia debe tener estado;
- cada resolución debe auditarse;
- no permitir acciones fuera de rol.

Riesgos:

- pedidos pagados sin atención;
- pagos aprobados sin facturación;
- errores no visibles.

Dependencias:

- ADR-010;
- ADR-012;
- ADR-013;
- ADR-014;
- ADR-015.

Prioridad:

- Inicial cuando existan pedidos online.

### Pagos / Mercado Pago

Objetivo:

- revisar pagos, intentos, webhooks e incidencias.

Acciones permitidas:

- ver estado del pago;
- ver intento de pago;
- ver referencia Mercado Pago;
- ver incidencia;
- reintentar conciliación futura;
- marcar revisión manual.

Roles:

- ADMIN;
- SUPERVISOR;
- Soporte de pagos;
- Ecommerce Manager con vista.

Validaciones:

- no editar monto manualmente;
- no aprobar pago manualmente sin flujo formal;
- no procesar webhook duplicado como venta nueva;
- auditar revisión.

Riesgos:

- venta duplicada;
- pago sin pedido;
- pago aprobado sin stock.

Dependencias:

- ADR-013;
- ADR-016.

Prioridad:

- Inicial cuando se integre Mercado Pago.

### Facturación ecommerce

Objetivo:

- revisar comprobantes generados desde pedidos online y resolver incidencias.

Acciones permitidas:

- ver venta asociada;
- ver comprobante;
- ver estado de emisión;
- reintentar emisión controlada;
- registrar resolución;
- ver motivo de error seguro.

Roles:

- ADMIN;
- SUPERVISOR;
- Responsable de facturación.

Validaciones:

- no emitir sin venta válida;
- no emitir sin pago aprobado;
- no emitir sin reserva confirmada;
- no duplicar comprobante;
- auditar reintentos.

Riesgos:

- comprobante duplicado;
- pago aprobado sin comprobante;
- errores tributarios no resueltos.

Dependencias:

- ADR-014;
- ADR-013;
- ADR-012.

Prioridad:

- Inicial cuando exista facturación automática ecommerce.

### Delivery/couriers

Objetivo:

- administrar preparación, courier, tracking y estados de entrega.

Acciones permitidas:

- ver pedidos listos para preparar;
- marcar preparando;
- marcar listo para despacho;
- asignar courier;
- registrar tracking;
- marcar enviado;
- registrar entrega;
- registrar incidencia.

Roles:

- Fulfillment/Despacho;
- Ecommerce Manager;
- ADMIN/SUPERVISOR;
- Atención al cliente con vista limitada.

Validaciones:

- no asignar courier si pedido no está listo;
- no exponer datos personales a roles no autorizados;
- auditar cambios de tracking;
- no cambiar costo después del pago sin flujo formal.

Riesgos:

- pedido enviado sin tracking;
- dirección expuesta;
- delivery mal gestionado.

Dependencias:

- ADR-015;
- ADR-016.

Prioridad:

- Inicial cuando existan pedidos online.

### Zonas, cobertura, tarifas y UBIGEO

Objetivo:

- administrar cobertura nacional, zonas logísticas, tarifas y catálogo geográfico.

Acciones permitidas:

- ver departamentos/provincias/distritos;
- configurar cobertura;
- asignar zona logística;
- configurar tarifa;
- marcar cotización manual;
- asociar courier disponible;
- auditar cambios.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager.

Validaciones:

- no permitir texto libre para departamento/provincia/distrito;
- no permitir pago en distrito sin cobertura/tarifa;
- auditar cambios de tarifa;
- confirmar cambios de alto impacto.

Riesgos:

- costo de envío incorrecto;
- pedido pagado en zona no cubierta;
- pérdida por tarifa mal configurada.

Dependencias:

- ADR-015;
- ADR-016.

Prioridad:

- Inicial/preparar antes de checkout real.

### Merchant Center futuro

Objetivo:

- administrar estado del feed y validaciones para Google Merchant Center.

Acciones futuras:

- ver productos elegibles;
- ver errores de feed;
- validar precio, disponibilidad, imagen, marca y GTIN/barcode;
- excluir productos;
- revisar sincronización.

Roles:

- Ecommerce Manager;
- SEO/Content Manager;
- ADMIN/SUPERVISOR.

Prioridad:

- Futura, relacionada con ADR-019.

### Promociones/cupones futuros

Objetivo:

- administrar promociones cuando se implemente la capacidad.

Acciones futuras:

- crear cupón;
- definir vigencia;
- definir descuento;
- definir límites;
- configurar envío gratis;
- auditar uso.

Roles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- Marketing futuro si aplica.

Prioridad:

- Futura.

Dependencias:

- ADR-011.

### Listas escolares futuras

Objetivo:

- administrar listas escolares como módulo ecommerce futuro.

Acciones futuras:

- crear lista;
- asociar colegio;
- asociar grado;
- asociar productos;
- publicar landing SEO;
- revisar disponibilidad.

Roles:

- Ecommerce Manager;
- SEO/Content Manager;
- ADMIN/SUPERVISOR.

Prioridad:

- Futura.

### Auditoría ecommerce

Objetivo:

- consultar historial de cambios críticos.

Debe registrar:

- usuario;
- fecha/hora;
- acción;
- entidad;
- valor anterior;
- valor nuevo;
- motivo si aplica;
- origen;
- resultado.

Roles:

- ADMIN;
- SUPERVISOR;
- Auditor/Soporte futuro.

Prioridad:

- Inicial para operaciones críticas.

## Roles ecommerce recomendados

### ADMIN

Permisos:

- acceso total;
- configuración ecommerce;
- precios;
- almacén online;
- pedidos;
- pagos;
- facturación;
- delivery;
- roles;
- auditoría.

Límites:

- acciones críticas deben confirmar y auditarse.

Necesario desde el inicio:

- Sí.

### SUPERVISOR

Permisos:

- supervisión operativa;
- publicación controlada;
- revisión de pedidos;
- revisión de incidencias;
- cambios operativos autorizados.

Límites:

- no debería administrar seguridad global ni configuraciones sensibles si se separan roles.

Necesario desde el inicio:

- Sí.

### Ecommerce Manager

Permisos:

- catálogo online;
- publicación;
- precios online según política;
- pedidos;
- delivery;
- incidencias;
- coordinación ecommerce.

Límites:

- no debería gestionar seguridad global ni facturación técnica avanzada.

Necesario desde el inicio:

- Puede ser asumido temporalmente por ADMIN/SUPERVISOR.

### SEO/Content Manager

Permisos:

- metadata SEO;
- descripciones online;
- slugs bajo control;
- imágenes/alt text;
- categorías/marcas públicas.

Límites:

- no puede cambiar precio, stock, almacén, pagos ni facturación.

Necesario desde el inicio:

- Puede esperar o ser asumido por Ecommerce Manager/ADMIN.

### Fulfillment/Despacho

Permisos:

- ver pedidos listos para preparar;
- ver dirección necesaria;
- marcar preparación;
- asignar courier si se permite;
- registrar tracking;
- registrar incidencias de entrega.

Límites:

- no puede cambiar precios, pagos, facturación ni SEO.

Necesario desde el inicio:

- Sí, cuando existan pedidos online.

### Atención al cliente

Permisos:

- ver estado de pedido;
- ver estado de pago público/interno limitado;
- ver estado de delivery;
- registrar observaciones;
- apoyar reclamos.

Límites:

- acceso limitado a datos personales;
- no puede cambiar precio, stock, pago ni comprobante.

Necesario desde el inicio:

- Puede esperar hasta operación real.

### Soporte de pagos

Permisos:

- ver pagos;
- ver intentos;
- ver webhooks;
- revisar incidencias;
- marcar revisión manual;
- reintentar conciliación si se autoriza.

Límites:

- no puede alterar montos;
- no puede aprobar pagos manualmente sin flujo formal;
- no puede facturar.

Necesario desde el inicio:

- Cuando se integre Mercado Pago.

### Responsable de facturación

Permisos:

- ver ventas ecommerce;
- ver comprobantes;
- revisar errores;
- reintentar emisión;
- gestionar incidencias tributarias.

Límites:

- no puede cambiar precio/pago original;
- no puede duplicar comprobantes.

Necesario desde el inicio:

- Cuando se implemente facturación automática ecommerce.

### Supervisor ecommerce

Permisos:

- visión integral;
- aprobación de acciones críticas;
- revisión de incidencias;
- reportes operativos.

Límites:

- según política de empresa.

Necesario desde el inicio:

- Puede esperar.

## Reglas de permisos

| Acción | Roles permitidos |
|---|---|
| Publicar producto online | ADMIN, SUPERVISOR, Ecommerce Manager |
| Editar SEO metadata | ADMIN, SUPERVISOR, SEO/Content Manager, Ecommerce Manager |
| Modificar precio online | ADMIN, SUPERVISOR, Ecommerce Manager autorizado |
| Cambiar almacén online | ADMIN, SUPERVISOR |
| Ver/gestionar pedidos | ADMIN, SUPERVISOR, Ecommerce Manager, Fulfillment según alcance |
| Revisar pagos | ADMIN, SUPERVISOR, Soporte de pagos |
| Reintentar facturación | ADMIN, SUPERVISOR, Responsable de facturación |
| Asignar courier/tracking | ADMIN, SUPERVISOR, Fulfillment, Ecommerce Manager |
| Cambiar cobertura/tarifas | ADMIN, SUPERVISOR, Ecommerce Manager autorizado |
| Ver datos personales completos | Solo roles operativos autorizados |
| Ver auditoría | ADMIN, SUPERVISOR |

Regla general:

> Todo permiso debe seguir mínimo privilegio y toda acción crítica debe validarse server-side y auditarse.

## Flujos internos principales

### Publicar producto online

1. Usuario selecciona producto interno.
2. Completa datos online.
3. Configura slug.
4. Asocia categoría online.
5. Asocia marca si aplica.
6. Configura imágenes.
7. Configura metadata SEO.
8. Revisa precio online efectivo.
9. Revisa disponibilidad.
10. Ejecuta validación de publicación.
11. Publica producto.
12. Backend audita la operación.

Reglas:

- no publicar si faltan datos mínimos;
- no publicar producto inactivo;
- no publicar sin SKU;
- no publicar sin imagen principal;
- no publicar sin precio válido.

### Configurar precio online

1. Usuario ve precio POS/base.
2. Define override online si aplica.
3. Backend valida precio.
4. Usuario confirma cambio.
5. Backend audita.
6. Storefront API reflejará precio efectivo.

Reglas:

- Angular no calcula precio final;
- backend calcula precio efectivo;
- cambios críticos requieren auditoría.

### Configurar imágenes y metadata SEO

1. Usuario asigna imagen principal.
2. Completa alt text.
3. Confirma derechos de uso.
4. Configura title, description, canonical y robots.
5. Backend valida datos mínimos.
6. Producto queda elegible para publicación.

### Revisar stock online

1. Usuario visualiza stock físico del almacén online.
2. Visualiza stock reservado.
3. Visualiza stock de seguridad.
4. Visualiza disponibilidad online calculada.
5. No edita disponibilidad directamente.

Regla:

- disponibilidad online se calcula server-side.

### Gestionar pedido pagado

1. Pedido aparece como pagado.
2. Sistema valida reserva confirmada.
3. Usuario revisa dirección y datos.
4. Pedido pasa a preparación.
5. Fulfillment prepara.
6. Se asigna courier.
7. Se registra tracking.
8. Pedido pasa a enviado.

### Revisar incidencia de pago

1. Soporte de pagos ve incidencia.
2. Revisa payment attempt.
3. Revisa pedido asociado.
4. Ejecuta acción permitida.
5. Backend audita.
6. Pedido se actualiza según resultado.

### Revisar incidencia de facturación

1. Responsable de facturación ve error.
2. Revisa venta, pedido y comprobante.
3. Corrige datos si el flujo lo permite.
4. Reintenta emisión controlada.
5. Backend evita duplicidad.
6. Auditoría registra intento.

### Reintentar operación controlada

Aplica a:

- conciliación de pago;
- emisión de comprobante;
- actualización de tracking;
- liberación de reserva en casos permitidos.

Reglas:

- idempotencia;
- permisos;
- auditoría;
- confirmación;
- no duplicar efectos.

## Relación con Storefront API

Angular interno no debe administrar usando Storefront API pública.

Reglas:

1. Angular usa endpoints internos protegidos.
2. Storefront API expone solo datos públicos/controlados.
3. Cambios internos se reflejan en Storefront API según reglas de publicación, estado y validación.
4. Storefront API no debe tener acciones administrativas.
5. Storefront API no debe exponer campos internos solo porque Angular los necesita.
6. Si Angular necesita campos administrativos, deben existir endpoints administrativos separados y protegidos.
7. Angular puede mostrar vistas comparativas o previsualizaciones, pero la administración debe ejecutarse mediante endpoints internos administrativos.

## Relación con backend Spring Boot

El backend debe mantener arquitectura hexagonal.

Reglas:

1. Separar controladores administrativos internos de controladores Storefront.
2. Validar server-side toda operación crítica.
3. Auditar cambios críticos.
4. No depender de lógica en Angular para decisiones de negocio.
5. Usar casos de uso o servicios de aplicación.
6. No mapear entidades directamente desde requests.
7. Aplicar permisos en backend.
8. Aplicar confirmaciones o estados intermedios para acciones de alto impacto.

## Relación con seguridad

La administración ecommerce debe cumplir ADR-016.

Controles:

- autenticación;
- autorización por roles;
- mínimo privilegio;
- protección de datos personales;
- no exponer errores técnicos;
- logging seguro;
- auditoría;
- confirmación en acciones críticas;
- rate limiting o protección para login;
- separación de superficies;
- no usar credenciales productivas en staging/local.

Acciones críticas que requieren confirmación:

- publicar/despublicar producto;
- cambiar precio online;
- cambiar almacén online;
- liberar reserva;
- reintentar facturación;
- cancelar pedido;
- cambiar cobertura/tarifa;
- modificar slug público;
- asignar courier/tracking final.

## Relación con UX interna

Las pantallas internas deben ser:

- sobrias;
- claras;
- operativas;
- orientadas a tareas;
- con estados visibles;
- con mensajes comprensibles;
- con filtros útiles;
- con búsqueda;
- con confirmaciones;
- con secciones técnicas colapsables;
- con advertencias para acciones críticas;
- sin saturar al usuario con UUIDs o datos técnicos en primer plano.

Reglas UX:

1. Mostrar información operativa primero.
2. Mostrar IDs internos solo en “Datos técnicos”.
3. Usar badges/chips legibles y sobrios.
4. Mostrar errores accionables.
5. Evitar mensajes técnicos de backend al usuario final interno.
6. Respetar consistencia visual del ERP/POS.
7. Mantener pantallas rápidas y sin layout shift.
8. Incluir estados vacíos claros.
9. Incluir confirmaciones en acciones irreversibles o sensibles.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Administrar ecommerce desde Next.js | Descartada. La tienda pública no debe administrar operación interna ni tener permisos administrativos. |
| Administrar ecommerce desde CMS externo desde el inicio | Descartada como primera fase. Puede servir para contenido editorial futuro, pero catálogo, precios, stock y pedidos pertenecen al ERP/POS. |
| Administrar ecommerce directamente en base de datos | Descartada. Riesgo alto, sin validaciones, auditoría ni permisos. |
| Administrar ecommerce desde Angular interno | Aceptada. Es coherente con ERP/POS como fuente de verdad, seguridad, roles y operación real. |

## Justificación

### Seguridad

La administración debe estar detrás de autenticación, roles y endpoints internos protegidos.

### Operación real

El equipo necesita gestionar productos, precios, pedidos, pagos, facturación y delivery desde una consola interna.

### Mantenibilidad

Centralizar administración en Angular evita duplicar paneles y mantiene coherencia con ERP/POS.

### Trazabilidad

Toda acción crítica puede auditarse desde el sistema fuente de verdad.

### Bajo riesgo

Evita que la tienda pública tenga capacidades administrativas.

### Coherencia con ERP/POS

El ERP/POS conserva control de catálogo, precios, stock, pedidos, ventas y facturación.

## Consecuencias positivas

- Administración ecommerce centralizada.
- Mejor control por roles.
- Menor riesgo de exposición pública.
- Mejor trazabilidad.
- Mejor operación de pedidos.
- Mejor control de publicación online.
- Mejor control de SEO, precios y stock.
- Mejor gestión de incidencias.
- Separación clara entre tienda pública y administración interna.
- Base sólida para escalar operación ecommerce.

## Consecuencias negativas o costos

- Requiere nuevas pantallas Angular.
- Requiere endpoints administrativos internos.
- Requiere permisos granulares.
- Requiere auditoría.
- Requiere QA por rol.
- Requiere diseño UX cuidadoso.
- Requiere mantener separación estricta con Storefront API.
- Requiere capacitación operativa.

Estos costos son aceptables porque ecommerce manejará dinero, stock, pagos, delivery, facturación, datos personales y SEO.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Permisos demasiado amplios | Mínimo privilegio y roles específicos. |
| Cambios SEO sin revisión | Flujo de revisión y auditoría. |
| Precios online mal configurados | Validación server-side, confirmación y auditoría. |
| Productos incompletos publicados | Checklist de publicación obligatorio. |
| Cambio peligroso de almacén online | Bloqueo si hay pedidos/reservas activas y confirmación. |
| Datos personales expuestos | Acceso por rol, masking y logs seguros. |
| Incidencias de pago mal gestionadas | Pantalla específica de pagos/incidencias. |
| Facturación duplicada | Idempotencia y reintentos controlados. |
| Delivery sin trazabilidad | Estados, courier, tracking y auditoría. |
| Operación ecommerce mezclada con POS sin claridad | Módulos ecommerce separados y navegación clara. |
| Storefront API usada como admin API | Prohibición explícita y endpoints administrativos separados. |

## Reglas obligatorias

1. Angular interno es la interfaz de administración ecommerce.
2. La tienda pública no administra catálogo ni operación interna.
3. Storefront API no se usa como API administrativa.
4. Angular debe consumir endpoints internos protegidos.
5. Toda operación crítica requiere validación server-side.
6. Toda operación crítica debe auditarse.
7. Los permisos deben seguir mínimo privilegio.
8. Los datos personales solo se muestran a roles autorizados.
9. No se deben publicar productos sin validaciones mínimas.
10. No se deben modificar precios, stock, cobertura o facturación sin permisos adecuados.
11. No se deben mostrar errores técnicos al usuario interno.
12. No se debe permitir cambio crítico sin confirmación.
13. No se deben exponer datos técnicos en primer plano si no aportan valor operativo.
14. No se deben mezclar endpoints administrativos con Storefront API pública.
15. ADMIN/SUPERVISOR pueden asumir roles ecommerce temporalmente, pero el diseño debe permitir roles específicos futuros.
16. Angular no debe decidir precio final, stock final, envío final, estado final de pago ni resultado de facturación.
17. Los endpoints administrativos deben validar autorización en backend, no solo ocultar botones en frontend.

## Impacto técnico

### Angular interno

Requerirá nuevos módulos, rutas, componentes y servicios internos para administración ecommerce.

### Backend Spring Boot

Requerirá endpoints administrativos protegidos, casos de uso, validaciones, auditoría y permisos.

### Seguridad y roles

Requerirá granularidad de permisos y control por rol.

### Catálogo online

Administración de publicación, checklist, slugs, imágenes y metadata.

### SEO metadata

Edición, revisión y validación.

### Precios

Gestión de overrides online y auditoría.

### Stock

Visualización de stock disponible online y reservas.

### Pedidos online

Pantallas de lifecycle e incidencias.

### Mercado Pago

Pantallas de revisión, conciliación e incidencias.

### Facturación

Pantallas de comprobantes, errores y reintentos.

### Delivery

Gestión de preparación, courier, tracking, zonas y tarifas.

### Auditoría

Registro de cambios críticos.

### QA

Pruebas por rol, permisos, validaciones, flujos críticos y UX.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba Angular interno como interfaz principal de administración ecommerce.
2. Se aprueba que la tienda pública no administrará operación interna.
3. Se aprueba que Storefront API no será usada como API administrativa.
4. Se aprueba el conjunto de módulos/pantallas recomendadas.
5. Se aprueban roles ecommerce propuestos y uso temporal de ADMIN/SUPERVISOR.
6. Se aprueban reglas de permisos.
7. Se aprueban flujos internos principales.
8. Se aprueba auditoría obligatoria para operaciones críticas.
9. Se aprueba validación server-side para toda operación crítica.
10. Se aprueba protección de datos personales por rol.
11. Se aprueba separación entre endpoints internos administrativos y endpoints storefront públicos.
12. Se aprueba que diseño visual detallado e implementación quedan para fases posteriores.

## Qué NO hacer todavía

En este ADR no se debe:

- diseñar pantallas finales en detalle visual;
- definir todos los componentes Angular específicos;
- implementar módulos;
- crear endpoints;
- crear migraciones;
- modificar roles actuales;
- cambiar permisos actuales;
- cerrar implementación de promociones;
- cerrar implementación de listas escolares;
- cerrar Merchant Center;
- mezclar endpoints administrativos con Storefront API pública;
- activar venta online;
- modificar checkout;
- modificar Mercado Pago;
- modificar facturación;
- tocar AWS/staging.

Este ADR solo define la administración ecommerce interna en Angular, sus módulos, roles, reglas, flujos, límites y relación con backend/Storefront API. La implementación debe ocurrir en fases posteriores con prompts específicos, QA y documentación incremental.

## Decisión resultante

InkToy administrará ecommerce desde el Angular interno del ERP/POS en `app.inktoy.pe`. Esta administración cubrirá catálogo online, marcas, variantes, imágenes, SEO metadata, slugs, precios online, almacén online, stock reservado, pedidos online, pagos, facturación, delivery, zonas, cobertura, tarifas, UBIGEO, incidencias, auditoría y módulos futuros como Merchant Center, promociones y listas escolares.

Angular interno consumirá endpoints administrativos internos protegidos, no Storefront API pública. Storefront API se mantendrá como capa pública/controlada para la tienda Next.js. Toda operación crítica tendrá validación server-side, permisos, auditoría y confirmación cuando corresponda.

ADMIN y SUPERVISOR podrán asumir temporalmente funciones ecommerce al inicio, pero la arquitectura debe permitir roles específicos como Ecommerce Manager, SEO/Content Manager, Fulfillment/Despacho, Atención al cliente, Soporte de pagos y Responsable de facturación cuando la operación crezca.
