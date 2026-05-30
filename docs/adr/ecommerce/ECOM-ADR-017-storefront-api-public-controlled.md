# ADR-017 — Storefront API pública/controlada para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, pedidos, ventas, facturación y operación interna. La futura tienda online SEO-first será una aplicación pública Next.js con SSR/SSG/ISR publicada en `inktoy.pe`.

El ERP/POS interno estará disponible en `app.inktoy.pe`, mientras que la API pública/controlada para ecommerce estará en `api.inktoy.pe`.

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

Decisiones base ya aprobadas:

- La tienda pública será Next.js con SSR/SSG/ISR en `inktoy.pe`.
- El ERP/POS interno estará en `app.inktoy.pe`.
- La Storefront API/API pública controlada estará en `api.inktoy.pe`.
- ERP/POS Spring Boot será la fuente de verdad de catálogo, precios, stock, pedidos, ventas y facturación.
- La tienda pública no debe consumir endpoints internos del ERP/POS.
- Storefront API/BFF será la única capa pública ecommerce.
- Storefront API debe exponer DTOs públicos, no entidades internas ni DTOs administrativos.
- El frontend nunca decide precios, stock, descuentos, totales, costo de envío, estado del pedido, estado del pago ni datos finales de facturación.
- Todo dato crítico debe validarse server-side.
- CORS será restrictivo por entorno.
- Los endpoints públicos deben tener rate limiting, validación de entrada, respuestas seguras y no exponer errores técnicos.
- Las consultas de pedidos, tracking o comprobantes deben protegerse con token seguro, sesión o mecanismo equivalente.
- Los webhooks y operaciones críticas deben ser idempotentes.
- No se deben exponer reglas internas, secretos, stock operativo interno, costos internos, márgenes ni datos personales innecesarios.

La Storefront API es la frontera pública entre la tienda Next.js y el ERP/POS. Su diseño debe permitir SEO, seguridad, rendimiento, estabilidad contractual y evolución progresiva sin exponer la operación interna.

## Problema

Se debe definir el alcance y las reglas de la Storefront API pública/controlada para evitar que la tienda pública consuma directamente endpoints internos del ERP/POS o replique lógica crítica en el frontend.

La decisión debe resolver:

- qué datos públicos puede consumir Next.js;
- qué operaciones ecommerce puede iniciar la tienda;
- cómo exponer catálogo, marcas, categorías, variantes, metadata SEO e imágenes;
- cómo resolver productos, categorías y marcas por slug;
- cómo validar carrito, stock, precio y envío server-side;
- cómo crear pedido/checkout futuro sin confiar en frontend;
- cómo proteger consultas de pedido, tracking y comprobante;
- cómo versionar contratos;
- cómo diseñar DTOs públicos;
- cómo controlar filtros, paginación y errores;
- cómo evitar exposición de entidades internas, DTOs administrativos o datos sensibles;
- cómo permitir una extracción futura hacia BFF separado sin crear complejidad prematura.

Riesgos si no se define esta capa:

- exposición accidental de endpoints internos del ERP/POS;
- reutilización de DTOs administrativos con campos sensibles;
- acoplamiento fuerte entre Next.js y controladores internos;
- duplicidad de lógica de precio, stock o envío en frontend;
- contratos inestables;
- dificultad para SSR/SSG/ISR;
- errores técnicos visibles al cliente;
- problemas de IDOR en pedidos, tracking o comprobantes;
- filtros o paginación abusivos;
- scraping excesivo;
- mala base para Merchant Center, checkout, Mercado Pago y facturación futura;
- extracción futura costosa si el módulo público queda mal acoplado desde el inicio.

## Decisión

Storefront API/BFF será la única frontera pública ecommerce para la tienda Next.js.

La implementación inicial será un módulo público/controlado dentro del monolito modular Spring Boot. No se creará un BFF separado desde el inicio, porque en esta etapa agregaría complejidad de infraestructura, seguridad, despliegue, monitoreo, debugging y consistencia transaccional sin una necesidad operativa validada.

Sin embargo, el módulo Storefront API se diseñará desde el día uno como **extraction-ready** para poder separarlo en un BFF independiente si el tráfico, la complejidad, los canales o la operación lo justifican más adelante.

Decisiones principales:

1. Storefront API/BFF será la única capa pública consumida por `inktoy.pe`.
2. No se expondrán controladores internos del ERP/POS como API pública.
3. La API expondrá solo datos y operaciones necesarias para la tienda pública.
4. La API usará DTOs públicos específicos.
5. La API resolverá entidades públicas por slug cuando corresponda.
6. La API no expondrá entidades internas, DTOs administrativos, reglas internas completas ni datos sensibles.
7. La API validará o delegará server-side precios, stock, envío, carrito, pedido, pago y facturación futura.
8. La API tendrá versionado.
9. La API mantendrá contratos estables para Next.js.
10. La API tendrá paginación, filtros y ordenamientos controlados.
11. La API devolverá errores públicos seguros.
12. La API tendrá CORS restrictivo, rate limiting, logging seguro y auditoría cuando aplique.
13. Las consultas de pedido, tracking o comprobantes estarán protegidas por token seguro, sesión o mecanismo equivalente.
14. Los webhooks estarán separados y protegidos de acuerdo con ADR-013 y ADR-016.
15. La implementación inicial será un módulo dentro del monolito modular Spring Boot.
16. El módulo se diseñará con base path propio, DTOs públicos propios, contratos versionados y bajo acoplamiento para permitir extracción futura.

Decisión central:

> Storefront API/BFF será la capa pública/controlada que permite a Next.js consumir catálogo, SEO, disponibilidad, precios efectivos, envío, carrito, checkout futuro y estado de pedido sin exponer el ERP/POS interno ni delegar lógica crítica al frontend. Inicialmente vivirá como módulo dentro del monolito modular Spring Boot, pero se diseñará como extraction-ready para una posible separación futura.

## Principios extraction-ready

Aunque la Storefront API se implemente inicialmente dentro del monolito modular, deberá cumplir estos principios para facilitar una extracción futura:

1. Base path propio: `/api/v1/storefront/...`.
2. Controladores públicos separados de controladores administrativos.
3. DTOs públicos propios.
4. Mappers públicos propios.
5. Errores públicos propios.
6. Contratos versionados.
7. No depender de controladores internos.
8. No exponer entidades JPA ni entidades de dominio directamente.
9. No reutilizar DTOs administrativos.
10. Depender de casos de uso, servicios de aplicación o puertos, no de detalles de infraestructura.
11. Mantener lógica crítica en backend/domain/application, no en Next.js.
12. Separar configuración de seguridad de endpoints públicos y administrativos.
13. Mantener documentación contractual para Next.js.
14. Preparar pruebas contractuales futuras.
15. Evitar que el módulo storefront acceda directamente a lógica que debería estar encapsulada en casos de uso.
16. Mantener posibilidad de reemplazar llamadas internas por llamadas HTTP/eventos si en el futuro se extrae a un BFF separado.

La extracción futura a BFF separado solo deberá considerarse si existe una razón real, por ejemplo:

- tráfico alto;
- múltiples canales públicos;
- app móvil;
- marketplace;
- necesidad de escalar Storefront API independiente del ERP;
- reglas de cacheo avanzadas;
- desacoplamiento de despliegues;
- integración con más servicios externos;
- límites operativos del monolito.

## Responsabilidades de Storefront API

La Storefront API será responsable de exponer de forma segura y pública/controlada:

### Catálogo público

- productos publicados online;
- productos visibles en tienda;
- productos activos;
- productos con datos mínimos válidos;
- productos no internos;
- productos no ocultos.

### Productos publicados

- listado de productos;
- detalle por slug;
- variantes públicas;
- imágenes públicas;
- precio online efectivo;
- disponibilidad pública;
- metadata SEO.

### Categorías online

- listado de categorías públicas;
- detalle por slug;
- árbol o jerarquía si aplica;
- productos asociados;
- metadata SEO;
- breadcrumbs.

### Marcas públicas

- listado de marcas publicables;
- detalle por slug;
- productos publicados asociados;
- metadata SEO;
- logo público si aplica.

### Slugs

- resolución pública por slug;
- soporte para 404;
- soporte futuro para 301 si hay historial de slugs;
- no exponer IDs internos como identificador público principal.

### Metadata SEO

- title;
- meta description;
- canonical;
- robots policy;
- Open Graph;
- structured data flags;
- datos necesarios para Schema.org.

### Imágenes públicas

- imagen principal;
- galería;
- imagen por variante;
- alt text;
- dimensiones si aplican;
- URLs públicas o preparadas para CDN.

### Disponibilidad pública

- disponible;
- bajo stock;
- agotado;
- no comprable;
- no exponer stock interno completo si no es necesario.

### Precio online efectivo

- precio POS por defecto;
- override online si aplica;
- precio por variante;
- precio final mostrado;
- no exponer reglas internas completas de cálculo.

### Validación de carrito

- validar productos publicados;
- validar variantes;
- validar cantidad;
- recalcular precio;
- recalcular disponibilidad;
- detectar cambios de precio/stock;
- devolver respuesta segura para frontend.

### Ubicación y cálculo de envío

- listar departamentos;
- listar provincias;
- listar distritos;
- validar dirección;
- validar cobertura;
- calcular costo de envío server-side;
- devolver opciones públicas de envío.

### Creación controlada de pedido/checkout futuro

- crear pedido online futuro;
- crear snapshot de carrito;
- crear snapshot de envío;
- delegar reserva de stock;
- preparar integración con Mercado Pago.

### Inicio de pago futuro

- iniciar preferencia Mercado Pago desde backend;
- no aceptar monto calculado por frontend;
- usar pedido y reserva válidos.

### Consulta segura de estado de pedido

- estado público de pedido;
- estado de pago público;
- estado de preparación;
- estado de despacho;
- tracking seguro;
- comprobante público si aplica y está autorizado.

### Webhooks

Los webhooks podrán vivir bajo rutas controladas en `api.inktoy.pe`, pero no se consideran endpoints públicos de consumo de la tienda.

Deben tener:

- validación;
- idempotencia;
- logging seguro;
- rate limiting o protección específica;
- separación clara del tráfico normal de storefront.

## Qué NO debe hacer Storefront API

Storefront API no debe:

- exponer endpoints internos del ERP/POS;
- exponer entidades JPA o entidades de dominio internas;
- exponer DTOs administrativos;
- exponer stock exacto operativo salvo decisión explícita;
- exponer costos internos;
- exponer márgenes;
- exponer reglas internas completas de precios, promociones o envío;
- exponer datos personales innecesarios;
- aceptar precios calculados por frontend;
- aceptar stock calculado por frontend;
- aceptar costo de envío calculado por frontend;
- aceptar totales calculados por frontend como verdad;
- permitir cambio de estado crítico desde frontend;
- exponer stack traces;
- exponer mensajes técnicos;
- permitir filtros arbitrarios sin control;
- permitir page size ilimitado;
- permitir acceso a pedidos por ID interno simple;
- duplicar lógica de negocio fuera del ERP/POS;
- permitir que Next.js consulte directamente la base de datos;
- depender de controladores administrativos internos;
- acoplar sus contratos públicos a componentes específicos de Next.js.

## Endpoints conceptuales recomendados

Los endpoints siguientes son conceptuales y deberán validarse antes de implementación. No implican creación inmediata de rutas.

### Catálogo

#### `GET /api/v1/storefront/products`

Propósito:

- listar productos publicados online para páginas de categoría, búsqueda o listados.

Datos mínimos que puede devolver:

- slug;
- nombre público;
- marca pública;
- categoría pública;
- imagen principal;
- precio online efectivo;
- disponibilidad pública;
- badges públicos si aplica;
- metadata mínima para listado.

No debe exponer:

- costo interno;
- margen;
- stock exacto interno;
- proveedor;
- IDs internos sensibles;
- reglas internas de precio;
- campos administrativos.

Riesgos:

- scraping agresivo;
- filtros abusivos;
- exposición de productos no publicados;
- page size excesivo.

Dependencias:

- ADR-003 catálogo online;
- ADR-004 marcas;
- ADR-005 variantes;
- ADR-007 imágenes;
- ADR-009 stock disponible;
- ADR-011 precios online;
- ADR-016 seguridad.

#### `GET /api/v1/storefront/products/{slug}`

Propósito:

- obtener detalle público de producto por slug para SSR/SSG/ISR.

Datos mínimos:

- slug;
- nombre;
- descripción online;
- marca;
- categoría;
- breadcrumbs;
- imágenes;
- variantes públicas;
- precio online efectivo;
- disponibilidad pública;
- SEO metadata;
- structured data;
- atributos públicos.

No debe exponer:

- entidades internas;
- stock operativo completo;
- costos internos;
- datos administrativos;
- historial interno.

Riesgos:

- slug inexistente;
- producto no publicado;
- producto inactivo;
- contenido duplicado;
- variante no indexable expuesta como página principal.

Dependencias:

- ADR-006 slugs;
- ADR-008 SEO metadata;
- ADR-011 precios;
- ADR-016 seguridad.

#### `GET /api/v1/storefront/categories`

Propósito:

- listar categorías online públicas.

Datos mínimos:

- slug;
- nombre;
- jerarquía si aplica;
- descripción breve;
- imagen si aplica;
- metadata mínima;
- cantidad pública opcional.

No debe exponer:

- categorías internas;
- categorías inactivas;
- campos administrativos.

Riesgos:

- categorías vacías indexadas;
- categorías pobres;
- estructura inconsistente.

Dependencias:

- ADR-003 catálogo online;
- ADR-006 URLs;
- ADR-008 SEO.

#### `GET /api/v1/storefront/categories/{slug}`

Propósito:

- obtener categoría pública por slug con metadata y configuración de listado.

Datos mínimos:

- slug;
- nombre;
- descripción;
- metadata SEO;
- breadcrumbs;
- filtros permitidos;
- productos publicados paginados o referencia para listado.

No debe exponer:

- categorías internas;
- reglas internas;
- filtros no soportados.

Riesgos:

- duplicidad SEO;
- filtros indexados sin control;
- categorías sin contenido.

Dependencias:

- ADR-006;
- ADR-008;
- ADR-016.

#### `GET /api/v1/storefront/brands`

Propósito:

- listar marcas públicas.

Datos mínimos:

- slug;
- nombre;
- logo público si aplica;
- descripción breve;
- metadata mínima.

No debe exponer:

- marcas inactivas;
- marcas internas;
- campos administrativos.

Riesgos:

- páginas de marca pobres;
- marcas duplicadas;
- datos incompletos.

Dependencias:

- ADR-004 marcas;
- ADR-008 SEO;
- ADR-016 seguridad.

#### `GET /api/v1/storefront/brands/{slug}`

Propósito:

- obtener detalle público de marca por slug.

Datos mínimos:

- slug;
- nombre;
- descripción;
- logo;
- metadata SEO;
- productos publicados asociados.

No debe exponer:

- productos internos;
- marcas no publicadas;
- reglas internas.

Riesgos:

- marca sin contenido mínimo;
- duplicidad SEO;
- asociación incorrecta de productos.

Dependencias:

- ADR-004;
- ADR-008.

### SEO

#### `GET /api/v1/storefront/seo/{entityType}/{slug}`

Propósito:

- obtener metadata SEO pública si no viene embebida en detalle.

Datos mínimos:

- title;
- description;
- canonical;
- robots;
- Open Graph;
- structured data flags.

No debe exponer:

- borradores internos;
- notas editoriales;
- campos de revisión interna.

Riesgos:

- metadata desactualizada;
- canonical incorrecto;
- indexación de páginas pobres.

Dependencias:

- ADR-008.

Recomendación:

- preferir incluir metadata en el endpoint de detalle cuando sea más eficiente para SSR/SSG/ISR.

#### `GET /api/v1/storefront/sitemap`

Propósito futuro:

- alimentar sitemap dinámico o generación de sitemap desde Next.js.

Datos mínimos:

- URLs canónicas;
- lastModified;
- tipo de entidad;
- prioridad/frecuencia si se decide usar.

No debe exponer:

- staging;
- productos no publicados;
- filtros no indexables;
- páginas noindex.

Riesgos:

- indexar contenido no preparado;
- sitemap inconsistente con canonical.

Dependencias:

- ADR-006;
- ADR-008;
- ADR-019 futuro.

### Ubicación y envío

#### `GET /api/v1/storefront/locations/departments`

Propósito:

- listar departamentos activos para checkout.

Datos mínimos:

- id público o código;
- nombre.

No debe exponer:

- configuración interna;
- reglas de tarifa;
- costos internos.

Dependencias:

- ADR-015 delivery.

#### `GET /api/v1/storefront/locations/provinces?departmentId={id}`

Propósito:

- listar provincias activas según departamento seleccionado.

Datos mínimos:

- id público o código;
- nombre;
- departmentId público.

No debe exponer:

- información interna de cobertura si no es necesaria.

Dependencias:

- ADR-015.

#### `GET /api/v1/storefront/locations/districts?provinceId={id}`

Propósito:

- listar distritos activos según provincia seleccionada.

Datos mínimos:

- id público o código;
- nombre;
- ubigeo si se decide exponer;
- indicador público de cobertura si aplica.

No debe exponer:

- reglas internas de courier;
- costos internos;
- márgenes.

Dependencias:

- ADR-015.

#### `POST /api/v1/storefront/shipping/validate-address`

Propósito:

- validar ubicación y datos mínimos de dirección.

Datos mínimos de entrada:

- departamento;
- provincia;
- distrito;
- dirección;
- referencia;
- celular;
- email.

Respuesta mínima:

- válido/no válido;
- mensajes públicos;
- requiere cotización manual si aplica.

No debe exponer:

- errores internos;
- reglas internas completas.

Riesgos:

- datos personales en logs;
- validación insuficiente;
- zona no cubierta pagada por error.

Dependencias:

- ADR-015;
- ADR-016.

#### `POST /api/v1/storefront/shipping/quote`

Propósito:

- calcular costo de envío server-side.

Datos mínimos de entrada:

- ubicación seleccionada;
- carrito o referencia de carrito;
- datos necesarios para política de envío.

Respuesta mínima:

- costo;
- moneda;
- método;
- cobertura;
- mensaje público;
- vigencia opcional;
- requiere cotización manual si aplica.

No debe exponer:

- margen;
- costo interno real;
- reglas completas;
- configuración del courier.

Riesgos:

- manipulación de envío;
- costo incorrecto;
- abuso del endpoint.

Dependencias:

- ADR-015;
- ADR-011;
- ADR-016.

### Carrito y checkout

#### `POST /api/v1/storefront/cart/validate`

Propósito:

- validar carrito antes de checkout.

Entrada mínima:

- items con slug/variant identifier público;
- cantidades;
- ubicación opcional si se requiere envío.

Respuesta mínima:

- items válidos;
- items inválidos;
- precio efectivo recalculado;
- disponibilidad pública;
- subtotal;
- cambios detectados;
- mensajes seguros.

No debe aceptar como verdad:

- precio enviado por frontend;
- stock enviado por frontend;
- descuentos enviados por frontend;
- totales enviados por frontend.

Riesgos:

- manipulación de precio;
- compra sin stock;
- productos no publicados en carrito;
- abuso por bots.

Dependencias:

- ADR-009;
- ADR-010;
- ADR-011;
- ADR-016.

#### `POST /api/v1/storefront/orders`

Propósito futuro:

- crear pedido online pendiente de pago.

Entrada mínima:

- carrito validado;
- datos de cliente;
- dirección validada;
- costo de envío confirmado;
- tipo de comprobante deseado si aplica.

Respuesta mínima:

- publicOrderNumber;
- checkout token o referencia segura;
- estado inicial;
- total confirmado;
- expiración si aplica.

No debe aceptar como verdad:

- total frontend;
- precio frontend;
- stock frontend;
- costo de envío frontend;
- estado de pago.

Riesgos:

- pedido duplicado;
- pedido sin reserva;
- dirección inválida;
- total inconsistente.

Dependencias:

- ADR-012;
- ADR-010;
- ADR-011;
- ADR-015;
- ADR-016.

#### `POST /api/v1/storefront/payments/mercado-pago/preference`

Propósito futuro:

- iniciar pago Mercado Pago server-side.

Entrada mínima:

- referencia segura de pedido;
- token de checkout o mecanismo equivalente.

Respuesta mínima:

- URL/preference id público necesario;
- expiración;
- estado.

No debe exponer:

- credenciales;
- payload interno completo;
- tokens secretos;
- reglas internas.

Riesgos:

- preferencia sin reserva;
- monto manipulado;
- pago duplicado;
- abuso de intentos de pago.

Dependencias:

- ADR-013;
- ADR-010;
- ADR-012;
- ADR-016.

### Pedido

#### `GET /api/v1/storefront/orders/{publicOrderNumber}/status?token={token}`

Propósito:

- consultar estado público de pedido de forma segura.

Datos mínimos:

- número público;
- estado público;
- estado de pago público;
- estado de preparación;
- estado de despacho;
- total si aplica;
- mensajes seguros.

No debe exponer:

- ID interno;
- datos personales completos;
- errores internos;
- detalles administrativos;
- historial interno completo.

Riesgos:

- IDOR;
- fuga de datos personales;
- enumeración de pedidos.

Dependencias:

- ADR-012;
- ADR-016.

#### `GET /api/v1/storefront/orders/{publicOrderNumber}/shipping?token={token}`

Propósito:

- consultar estado público de despacho/tracking seguro.

Datos mínimos:

- estado de despacho;
- courier público si aplica;
- tracking si está autorizado;
- mensaje público;
- fecha estimada si existe política aprobada.

No debe exponer:

- dirección completa innecesaria;
- datos internos del courier;
- incidencias técnicas;
- información de otros pedidos.

Riesgos:

- IDOR;
- exposición de tracking;
- fuga de datos personales.

Dependencias:

- ADR-015;
- ADR-016.

### Merchant Center futuro

#### `GET /api/v1/storefront/merchant-center/feed`

Propósito futuro:

- exponer feed controlado para Merchant Center o permitir que Next.js/backend genere feed.

Datos mínimos:

- productos publicados;
- precio online efectivo;
- disponibilidad;
- marca;
- imagen;
- URL canónica;
- GTIN/barcode si existe;
- identificador público.

No debe exponer:

- stock interno;
- costos;
- productos no publicados;
- productos no comprables;
- reglas internas.

Riesgos:

- precio diferente entre feed y landing page;
- productos agotados mal marcados;
- datos incompletos.

Dependencias:

- ADR-003;
- ADR-004;
- ADR-005;
- ADR-007;
- ADR-008;
- ADR-011;
- ADR-019 futuro.

## DTOs públicos recomendados

### PublicProductListItem

Campos conceptuales:

- slug;
- name;
- brandName;
- categoryName;
- mainImage;
- price;
- availability;
- badges;
- canonicalUrl.

### PublicProductDetail

Campos conceptuales:

- slug;
- name;
- description;
- brand;
- category;
- breadcrumbs;
- images;
- variants;
- attributes;
- price;
- availability;
- seoMetadata;
- structuredData.

### PublicVariant

Campos conceptuales:

- publicVariantId o slug si aplica;
- displayName;
- attributes;
- image;
- price;
- availability;
- selected;
- purchasable.

No debe exponer necesariamente el ID interno de variante.

### PublicBrand

Campos conceptuales:

- slug;
- name;
- description;
- logo;
- seoMetadata.

### PublicCategory

Campos conceptuales:

- slug;
- name;
- description;
- parent;
- children;
- seoMetadata;
- breadcrumbs.

### PublicSeoMetadata

Campos conceptuales:

- title;
- description;
- canonical;
- robots;
- ogTitle;
- ogDescription;
- ogImage;
- structuredDataEnabled;
- schemaType.

### PublicImageAsset

Campos conceptuales:

- url;
- altText;
- width;
- height;
- type;
- sortOrder.

No debe exponer storage interno sensible si no es necesario.

### PublicAvailability

Campos conceptuales:

- status: `AVAILABLE`, `LOW_STOCK`, `OUT_OF_STOCK`, `NOT_PURCHASABLE`;
- message;
- purchasable.

No debe exponer stock exacto interno salvo decisión explícita.

### PublicPrice

Campos conceptuales:

- amount;
- currency;
- formatted;
- compareAtPrice futuro;
- hasDiscount futuro.

No debe exponer margen, costo o reglas completas.

### CartValidationRequest

Campos conceptuales:

- items;
- selectedShippingLocation opcional;
- couponCode futuro.

No debe incluir precios como verdad.

### CartValidationResponse

Campos conceptuales:

- valid;
- items;
- subtotal;
- shippingRequired;
- messages;
- changes;
- unavailableItems.

### ShippingQuoteRequest

Campos conceptuales:

- location;
- cartReference o items mínimos;
- deliveryMethod.

### ShippingQuoteResponse

Campos conceptuales:

- available;
- amount;
- currency;
- method;
- coverageStatus;
- requiresManualQuote;
- message.

### PublicOrderStatus

Campos conceptuales:

- publicOrderNumber;
- orderStatus;
- paymentStatus;
- fulfillmentStatus;
- shippingStatus;
- total;
- publicMessages.

### PublicErrorResponse

Campos conceptuales:

- code;
- message;
- details públicos si aplica;
- correlationId.

No debe incluir stack trace ni excepciones internas.

## Reglas de versionado y compatibilidad

La Storefront API debe tener estrategia de versionado.

Opción recomendada inicial:

```text
/api/v1/storefront/...
```

Reglas:

1. No romper contratos sin transición.
2. Mantener compatibilidad con Next.js.
3. Agregar campos nuevos de forma compatible cuando sea posible.
4. No eliminar campos sin deprecación.
5. Documentar cambios relevantes.
6. Mantener errores estables.
7. Versionar cambios incompatibles.
8. Preparar contratos para evolución hacia BFF separado si fuera necesario.

## Reglas de paginación, filtros y búsqueda

### Paginación

Reglas:

- page size máximo definido;
- valores por defecto seguros;
- no permitir listados ilimitados;
- validar page y size;
- evitar consultas costosas.

### Filtros permitidos

Filtros conceptuales:

- categoría;
- marca;
- disponibilidad pública;
- rango de precio público;
- atributos públicos como color, tamaño, presentación;
- búsqueda textual controlada.

### Filtros no permitidos

No permitir filtros por:

- costo interno;
- proveedor;
- margen;
- stock interno exacto;
- campos administrativos;
- estados internos;
- usuario interno.

### Ordenamientos permitidos

Ordenamientos conceptuales:

- relevancia;
- nombre;
- precio ascendente;
- precio descendente;
- novedades;
- destacados;
- disponibilidad pública.

### Protección contra consultas abusivas

- limitar combinaciones;
- validar parámetros;
- rate limiting;
- cache donde aplique;
- no permitir expresiones dinámicas peligrosas.

### Relación con SEO

Los filtros pueden existir para UX, pero no deben generar páginas indexables por defecto. La canonicalización e indexación se rige por ADR-006 y ADR-008.

## Reglas de errores públicos

La Storefront API debe devolver errores seguros y consistentes.

Reglas:

1. No exponer stack traces.
2. No exponer nombres de clases internas.
3. No exponer SQL.
4. No exponer errores de proveedores completos.
5. Usar códigos de error públicos.
6. Incluir correlationId cuando aplique.
7. Diferenciar correctamente estado HTTP.

Estados recomendados:

| HTTP | Uso |
|---|---|
| 400 | Request inválido, parámetros inválidos, dirección incompleta. |
| 401 | Autenticación requerida para endpoints protegidos. |
| 403 | Acceso denegado. |
| 404 | Recurso público no encontrado, producto no publicado o slug inexistente. |
| 409 | Conflicto de negocio: stock insuficiente, precio cambió, checkout inconsistente. |
| 429 | Rate limit excedido. |
| 500 | Error inesperado con mensaje genérico. |

Casos específicos:

- producto no publicado: 404 público;
- slug inexistente: 404;
- slug anterior: 301 futuro si existe historial;
- stock insuficiente: 409;
- zona no cubierta: 409 o 400 según flujo;
- checkout inválido: 409;
- pedido sin token válido: 403 o 404 seguro, evitando enumeración.

## Relación con Next.js

Next.js consumirá Storefront API para:

- renderizar productos por slug;
- renderizar categorías;
- renderizar marcas;
- generar metadata;
- generar breadcrumbs;
- generar sitemap futuro;
- validar carrito;
- calcular envío;
- iniciar checkout futuro;
- consultar estado de pedido.

Reglas:

1. Next.js no debe duplicar catálogo maestro.
2. Next.js no debe calcular precio final.
3. Next.js no debe calcular stock final.
4. Next.js no debe calcular envío final.
5. Next.js no debe guardar secretos.
6. Next.js no debe consultar endpoints internos.
7. Next.js debe poder usar SSR/SSG/ISR con contratos estables.
8. Next.js debe recibir metadata suficiente para SEO técnico.
9. Next.js debe respetar canonical, robots y noindex entregados por backend o reglas aprobadas.
10. Revalidación futura debe activarse cuando cambien publicación, precio, stock, slug, metadata o imágenes.

## Relación con seguridad

La Storefront API debe cumplir ADR-016:

- CORS restrictivo;
- rate limiting;
- DTOs públicos;
- protección contra IDOR;
- validación server-side;
- logging seguro;
- auditoría;
- errores públicos seguros;
- no exponer datos sensibles;
- no exponer endpoints internos;
- no confiar en frontend.

Toda operación crítica debe tener:

- validación;
- idempotencia cuando aplique;
- auditoría cuando aplique;
- correlationId;
- control de abuso.

## Relación con backend ERP/POS

ERP/POS sigue siendo fuente de verdad.

La Storefront API se implementará inicialmente como módulo dentro del monolito modular Spring Boot.

Ventajas:

- menor complejidad inicial;
- acceso controlado a casos de uso existentes;
- coherencia transaccional;
- menos infraestructura;
- compatible con fase local;
- menor riesgo DevOps;
- menor duplicidad de lógica.

Condiciones obligatorias:

- mantener separación de controladores internos y storefront;
- usar DTOs públicos;
- respetar arquitectura hexagonal;
- no acoplar Next.js a controladores administrativos;
- no exponer entidades internas;
- no reutilizar DTOs administrativos;
- diseñar contratos versionados;
- mantener el módulo extraction-ready.

### BFF separado futuro

Un BFF separado podrá evaluarse cuando existan:

- mayor tráfico;
- múltiples canales;
- app móvil;
- marketplaces;
- necesidad de escalado independiente;
- requisitos avanzados de cacheo;
- despliegues independientes;
- integraciones externas más complejas;
- límites reales del monolito.

No se recomienda como primera implementación porque aumentaría complejidad sin una necesidad validada.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Exponer directamente controladores internos del ERP | Descartada. Riesgo alto de seguridad, acoplamiento y exposición de datos internos. |
| Crear Storefront API dentro del monolito modular | Aceptada como implementación inicial. Permite bajo riesgo, coherencia y menor complejidad. |
| Crear BFF separado desde el inicio | Descartada para la primera versión. Puede ser útil a futuro, pero añade infraestructura, seguridad, monitoreo, despliegue y consistencia distribuida antes de validar necesidad real. |
| Usar API Gateway sin capa de contratos públicos | Descartada. No resuelve DTOs públicos ni lógica de protección. |
| Next.js consumiendo base de datos o endpoints internos | Descartada. Rompe seguridad, arquitectura y fuente de verdad controlada. |

## Justificación

### Seguridad

La API pública reduce exposición del ERP/POS interno y permite aplicar controles específicos.

### SEO

Next.js necesita contratos estables para SSR/SSG/ISR, metadata, slugs, canonical y sitemap.

### Mantenibilidad

DTOs públicos evitan acoplar frontend público a entidades internas o controladores administrativos.

### Bajo acoplamiento

La tienda pública depende de contratos storefront, no de estructura interna del ERP/POS.

### Operación real

Checkout, pagos, stock, envío y facturación requieren validación server-side y trazabilidad.

### Escalabilidad

Permite iniciar dentro del monolito modular y evolucionar a BFF separado si el negocio lo requiere.

### Compatibilidad con Next.js

Entrega datos listos para renderizado SEO sin duplicar lógica crítica.

### Bajo riesgo inicial

Evita sumar un servicio separado antes de tener ecommerce operativo, métricas reales y necesidades de escalado comprobadas.

## Consecuencias positivas

- Menor exposición de endpoints internos.
- Mejor seguridad para tienda pública.
- Contratos claros para Next.js.
- DTOs públicos controlados.
- Mejor compatibilidad con SSR/SSG/ISR.
- Mejor base para checkout, Mercado Pago y pedidos online.
- Menor riesgo de manipulación de datos críticos.
- Mejor separación entre frontend público y ERP interno.
- Facilita pruebas contractuales.
- Facilita evolución futura hacia BFF separado.
- Menor complejidad inicial frente a microservicio/BFF separado.
- Mayor coherencia transaccional en fases iniciales.

## Consecuencias negativas o costos

- Requiere diseñar DTOs públicos.
- Requiere nuevos controladores o módulo storefront.
- Requiere documentación de contratos.
- Requiere QA específico de API pública.
- Requiere mantener compatibilidad de contratos.
- Requiere rate limiting y seguridad desde el inicio.
- Requiere evitar duplicidad con controladores internos existentes.
- Requiere disciplina arquitectónica para mantener el módulo extraction-ready.
- Si se acopla mal al monolito, la extracción futura será costosa.

Estos costos son aceptables porque la tienda será pública y tendrá tráfico real, pagos, pedidos, datos personales y SEO.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Exposición accidental de datos internos | DTOs públicos específicos y revisión de contratos. |
| Contratos inestables | Versionado y compatibilidad hacia atrás. |
| Duplicidad de lógica | Storefront API delega a casos de uso del ERP/POS, no duplica reglas. |
| DTOs demasiado amplios | Principio de mínima exposición. |
| Rate limiting insuficiente | Políticas por endpoint y borde futuro. |
| IDOR en pedidos | Token seguro, sesión o mecanismo equivalente. |
| Errores técnicos expuestos | PublicErrorResponse seguro. |
| Acoplamiento fuerte con Next.js | Contratos públicos estables y no dependientes de componentes frontend. |
| Filtros abusivos | Whitelist de filtros, límites y paginación. |
| Scraping agresivo | Rate limiting, cache y WAF/CDN futuro. |
| Storefront API acoplada a controladores internos | Depender de casos de uso/puertos, no de controladores administrativos. |
| Extracción futura costosa | Diseñar módulo con base path, DTOs, mappers, errores y contratos propios. |
| BFF separado prematuro | Postergar hasta tener métricas o necesidades reales. |

## Reglas obligatorias

1. Storefront API/BFF es la única capa pública ecommerce.
2. No exponer endpoints internos del ERP/POS.
3. No reutilizar DTOs administrativos.
4. No exponer entidades internas.
5. No confiar en frontend para precios, stock, descuentos, envío, totales, pago ni facturación.
6. No exponer datos personales innecesarios.
7. No exponer reglas internas completas.
8. No exponer errores técnicos.
9. Todo checkout futuro debe validar server-side.
10. Toda consulta de pedido, tracking o comprobante debe tener token seguro, sesión o mecanismo equivalente.
11. Toda API pública debe tener validación de entrada.
12. Toda API pública crítica debe tener rate limiting.
13. Los endpoints por slug deben respetar publicación, visibilidad y estado activo.
14. Los productos no publicados deben responder como no disponibles públicamente.
15. Los contratos deben versionarse.
16. Next.js no debe consultar directamente base de datos ni APIs internas.
17. La implementación inicial será módulo storefront dentro del monolito modular Spring Boot.
18. El módulo debe diseñarse extraction-ready.
19. El módulo storefront no debe depender de controladores administrativos internos.
20. Un BFF separado solo se evaluará en fase futura con justificación operativa o técnica real.

## Impacto técnico

### Backend Spring Boot

Se requerirá módulo/controlador Storefront separado de controladores internos.

### Arquitectura hexagonal

La Storefront API debe usar casos de uso o puertos adecuados, sin romper separación de capas.

### Storefront API

Será la frontera pública ecommerce.

### Next.js futuro

Consumirá contratos públicos estables.

### Seguridad

Debe aplicar ADR-016 desde el diseño.

### Catálogo online

Dependerá de publicación online, slugs, imágenes, metadata, marcas y categorías.

### Stock

Expondrá disponibilidad pública, no stock operativo completo.

### Precios

Expondrá precio online efectivo calculado server-side.

### Delivery

Validará ubicación y calculará envío server-side.

### Pedidos online

Creará y consultará pedidos con seguridad.

### Mercado Pago

Iniciará pagos server-side en fases futuras.

### Facturación

Expondrá estado público de comprobante si corresponde y con seguridad.

### Merchant Center

Podrá alimentar feed futuro.

### QA

Requerirá pruebas contractuales, seguridad, paginación, filtros, errores, rate limiting y SSR/SSG/ISR.

### Extracción futura

La arquitectura debe permitir mover el módulo a un BFF separado si se justifica, sin reescribir contratos públicos ni duplicar reglas de negocio.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba Storefront API/BFF como única capa pública ecommerce.
2. Se aprueba no exponer endpoints internos del ERP/POS.
3. Se aprueba usar DTOs públicos específicos.
4. Se aprueba resolver productos/categorías/marcas por slug.
5. Se aprueba que precios, stock, envío y checkout se validan server-side.
6. Se aprueba no exponer reglas internas, secretos, márgenes, costos internos ni datos personales innecesarios.
7. Se aprueba versionado de API.
8. Se aprueban endpoints conceptuales por dominio.
9. Se aprueban reglas de paginación, filtros y errores públicos.
10. Se aprueba protección de pedido/tracking/comprobante con token seguro, sesión o mecanismo equivalente.
11. Se aprueba que la implementación inicial será un módulo dentro del monolito modular Spring Boot.
12. Se aprueba no crear BFF separado desde el inicio.
13. Se aprueba diseñar el módulo Storefront API como extraction-ready.
14. Se aprueba que un BFF separado queda como evolución futura, no como obligación inicial.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar endpoints;
- crear migraciones;
- crear Next.js;
- implementar checkout;
- integrar Mercado Pago;
- modificar CORS todavía;
- tocar AWS/staging;
- activar APIs públicas reales;
- exponer controladores internos;
- crear BFF separado;
- crear feed Merchant Center;
- modificar pedidos actuales;
- modificar facturación;
- modificar POS;
- cambiar infraestructura.

Este ADR solo define alcance, responsabilidades, contratos preliminares, límites de Storefront API y estrategia de implementación modular/extraction-ready. La implementación debe ocurrir en fases posteriores, después de cerrar las decisiones arquitectónicas restantes.

## Decisión resultante

InkToy usará Storefront API/BFF como única capa pública ecommerce entre la tienda Next.js en `inktoy.pe` y el ERP/POS interno. Esta API vivirá conceptualmente bajo `api.inktoy.pe`, expondrá DTOs públicos específicos, resolverá entidades públicas por slug, validará datos críticos server-side y no expondrá endpoints internos, entidades internas, DTOs administrativos, reglas internas completas ni datos sensibles.

La implementación inicial será un módulo storefront dentro del monolito modular Spring Boot, manteniendo arquitectura hexagonal y separación estricta entre controladores públicos y controladores administrativos.

No se creará un BFF separado desde el inicio. El módulo Storefront API se diseñará como extraction-ready, con base path propio, DTOs públicos, contratos versionados, mappers públicos, errores públicos, seguridad específica y bajo acoplamiento. Un BFF separado podrá evaluarse más adelante si el tráfico, la complejidad, los canales o la operación lo justifican.
