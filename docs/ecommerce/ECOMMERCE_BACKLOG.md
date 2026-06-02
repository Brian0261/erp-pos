# Backlog Ecommerce InkToy

## Estado

Backlog ecommerce incremental. Fase 2A quedo cerrada documentalmente y Fase 2B agrega diseno tecnico documental de API publica. No autoriza implementacion funcional por si mismo.

## Epicas iniciales

- Catalogo publico SEO.
- Categorias publicas.
- Detalle de producto.
- Slugs y URLs publicas.
- Metadata SEO.
- Sitemap y robots/canonical.
- Contratos publicos read-only.
- Separacion DTO admin/public.
- QA SEO tecnico.
- Diseno API publica read-only.
- Diseno DTOs publicos.

## Historias iniciales

### HIST-2A-001 Catalogo publico SEO

- Descripcion breve: definir el alcance funcional y contractual del listado publico de productos publicados.
- Valor de negocio: habilita el descubrimiento organico del catalogo sin exponer operacion interna.
- Criterios de aceptacion:
  - existe definicion de listado publico read-only;
  - se limita a productos `PUBLISHED` y aptos para publicacion;
  - se documentan filtros publicos permitidos y no permitidos.
- Reglas de negocio:
  - solo se muestran productos publicados;
  - no se expone stock operativo interno;
  - no se exponen datos administrativos ni flags internos.
- Restricciones tecnicas:
  - sin implementacion backend/frontend;
  - DTO publico separado de DTO admin;
  - sin reutilizar `/api/v1/ecommerce-admin/...`.
- Evidencia QA esperada:
  - contrato draft revisado;
  - checklist documental marcado;
  - consistencia con ADR-001, ADR-017 y ADR-019.

### HIST-2A-002 Categorias publicas

- Descripcion breve: definir paginas y contratos para categorias publicas indexables.
- Valor de negocio: estructura navegacion SEO, agrupacion comercial y landing pages organicas.
- Criterios de aceptacion:
  - existe definicion de `GET /api/v1/storefront/catalog/categories` y `GET /api/v1/storefront/catalog/categories/{slug}` draft;
  - se documenta uso de `/categorias/{slug}` como URL publica draft;
  - se definen restricciones de indexacion minima.
- Reglas de negocio:
  - solo categorias publicables/indexables;
  - categorias internas no se exponen como contrato publico;
  - categorias sin contenido minimo pueden quedar no indexables.
- Restricciones tecnicas:
  - sin endpoints reales;
  - sin mezcla con taxonomia interna del ERP;
  - canonical obligatorio en fase futura.
- Evidencia QA esperada:
  - estrategia SEO y contratos draft consistentes;
  - decision de URLs documentada.

### HIST-2A-003 Detalle de producto publico

- Descripcion breve: definir la respuesta publica minima para detalle de producto por slug.
- Valor de negocio: habilita pagina indexable de producto con base para conversion futura.
- Criterios de aceptacion:
  - existe DTO draft de producto publico;
  - incluye datos SEO/publicos minimos;
  - excluye campos internos innecesarios.
- Reglas de negocio:
  - solo producto publicado;
  - precio efectivo es server-side;
  - publicacion no la decide el frontend.
- Restricciones tecnicas:
  - sin frontend publico;
  - sin calculos cliente;
  - sin exponer costos, proveedores ni IDs internos innecesarios.
- Evidencia QA esperada:
  - revision documental del payload;
  - trazabilidad con ADR-003, ADR-008 y ADR-017.

### HIST-2A-004 Slugs y URLs publicas

- Descripcion breve: documentar la arquitectura draft de URLs publicas y la resolucion por slug.
- Valor de negocio: sienta base SEO, UX y estabilidad de indexacion.
- Criterios de aceptacion:
  - `/productos/{slug}` y `/categorias/{slug}` definidos;
  - `/marcas/{slug}` queda como posibilidad futura o pendiente;
  - no se usan IDs internos en URLs publicas.
- Reglas de negocio:
  - slugs limpios, unicos y estables;
  - cambios de slug requieren estrategia posterior de historial/redireccion;
  - filtros no son indexables por defecto.
- Restricciones tecnicas:
  - sin resolver routing publico real;
  - sin cambiar slugs actuales admin;
  - sin Next.js.
- Evidencia QA esperada:
  - documento SEO-first actualizado;
  - alineacion con ADR-006.

### HIST-2A-005 Metadata SEO

- Descripcion breve: definir metadata publica minima para producto y categoria.
- Valor de negocio: mejora indexacion y CTR organico.
- Criterios de aceptacion:
  - se documentan `title`, `meta description`, `canonical` y politica `index/noindex`;
  - se define separacion entre metadata backend/fallback futuro;
  - se documentan riesgos de metadata inventada por frontend.
- Reglas de negocio:
  - paginas indexables requieren metadata minima;
  - frontend publico no inventa metadata critica;
  - no indexar contenido pobre por defecto.
- Restricciones tecnicas:
  - sin schema.org avanzado en esta fase;
  - sin generacion automatica compleja;
  - sin modificar SEO admin actual.
- Evidencia QA esperada:
  - estrategia SEO creada;
  - criterios de metadata validados documentalmente.

### HIST-2A-006 Sitemap

- Descripcion breve: definir el alcance del sitemap publico y su fuente de verdad.
- Valor de negocio: facilita descubrimiento tecnico por buscadores.
- Criterios de aceptacion:
  - existe decision draft sobre `sitemap.xml`;
  - se documenta si sera endpoint JSON futuro o generacion directa;
  - solo incluye URLs canónicas, publicadas e indexables.
- Reglas de negocio:
  - no incluir staging;
  - no incluir productos no publicados;
  - no incluir filtros/facetas por defecto.
- Restricciones tecnicas:
  - sin implementacion XML/JSON real;
  - decision final puede quedar pendiente para Fase 2B/2D.
- Evidencia QA esperada:
  - decision pendiente o cerrada registrada;
  - checklist documental actualizado.

### HIST-2A-007 Robots y canonical

- Descripcion breve: definir politicas draft de `robots.txt`, canonical e indexacion.
- Valor de negocio: evita duplicados, staging indexado y ruido tecnico SEO.
- Criterios de aceptacion:
  - politica de `robots.txt` documentada;
  - canonical descrito para producto/categoria;
  - `noindex` definido para filtros o paginas pobres.
- Reglas de negocio:
  - staging nunca indexable;
  - filtros no indexables por defecto;
  - canonical siempre apunta a URL publica principal.
- Restricciones tecnicas:
  - sin archivo robots real;
  - sin middleware publico;
  - sin infraestructura SEO productiva.
- Evidencia QA esperada:
  - estrategia SEO validada contra ADR-008 y ADR-019.

### HIST-2A-008 Contratos publicos read-only

- Descripcion breve: definir el set inicial de endpoints publicos read-only como draft.
- Valor de negocio: prepara integracion controlada sin mezclar admin/public.
- Criterios de aceptacion:
  - base path draft `/api/v1/storefront/...` documentado;
  - endpoints candidatos listados;
  - errores publicos seguros documentados.
- Reglas de negocio:
  - solo lectura;
  - solo datos publicables;
  - sin operacion de carrito, checkout, pago ni pedido.
- Restricciones tecnicas:
  - sin crear endpoints;
  - sin reusar DTO admin;
  - sin abrir CORS publico real.
- Evidencia QA esperada:
  - documento de contratos draft creado;
  - checklist Fase 2A actualizado.

### HIST-2A-009 Separacion DTO admin/public

- Descripcion breve: dejar explicitado que la API publica requiere DTOs propios.
- Valor de negocio: reduce riesgo de filtrado de datos internos y deuda tecnica contractual.
- Criterios de aceptacion:
  - la separacion queda escrita en roadmap, backlog y contratos;
  - se prohíbe reutilizar `/api/v1/ecommerce-admin` como contrato publico;
  - se listan campos que no deben exponerse.
- Reglas de negocio:
  - no exponer costos, margenes, proveedores, stock operativo exacto ni flags administrativos;
  - no exponer IDs internos salvo necesidad contractual justificada.
- Restricciones tecnicas:
  - sin cambios en DTOs existentes;
  - sin mappers nuevos;
  - sin backend.
- Evidencia QA esperada:
  - documento de contratos draft con exclusiones claras.

### HIST-2A-010 QA SEO tecnico

- Descripcion breve: definir el checklist de validacion documental previa a implementacion publica.
- Valor de negocio: reduce errores de arquitectura antes de invertir en API o Storefront.
- Criterios de aceptacion:
  - checklist QA Fase 2A creado;
  - decisiones cerradas y pendientes visibles;
  - alcance prohibido documentado.
- Reglas de negocio:
  - no cerrar Fase 2A sin contratos draft y estrategia SEO;
  - no pasar a Fase 2B sin revision documental.
- Restricciones tecnicas:
  - sin smoke tecnico funcional;
  - sin runtime publico;
  - sin staging.
- Evidencia QA esperada:
  - checklist documental completo y revisable.

## Historias Fase 2B - Public Catalog API Design

### HIST-2B-001 Namespace publico MVP

- Descripcion breve: cerrar el namespace definitivo del MVP para catalogo publico.
- Valor de negocio: evita contratos duplicados y reduce riesgo de integracion futura con Storefront.
- Criterios de aceptacion:
  - `/api/v1/storefront/catalog/...` queda como namespace MVP;
  - no se adopta `/api/v1/storefront/products` en el MVP;
  - la decision queda reflejada en contratos, API design y QA.
- Restricciones tecnicas:
  - sin crear endpoints reales;
  - sin modificar seguridad ni controllers.
- **Estado: IMPLEMENTADO (Fase 2C)** — namespace aplicado en controllers y seguridad.

### HIST-2B-002 Endpoints MVP read-only

- Descripcion breve: definir endpoints publicos read-only para productos, categorias y sitemap JSON futuro.
- Valor de negocio: prepara implementacion local de Fase 2C con alcance claro.
- Criterios de aceptacion:
  - `GET /api/v1/storefront/catalog/products` definido;
  - `GET /api/v1/storefront/catalog/products/{slug}` definido;
  - `GET /api/v1/storefront/catalog/categories` definido;
  - `GET /api/v1/storefront/catalog/categories/{slug}` definido;
  - `GET /api/v1/storefront/seo/sitemap` definido como fuente JSON futura.
- Restricciones tecnicas:
  - sin `sitemap.xml` real;
  - sin Next.js;
  - sin backend funcional.
- **Estado: IMPLEMENTADO (Fase 2C)** — los 5 endpoints implementados y testeados. `sitemap.xml` real sigue diferido.

### HIST-2B-003 DTOs publicos y campos prohibidos

- Descripcion breve: definir DTOs publicos separados de DTOs admin y matriz de campos prohibidos.
- Valor de negocio: evita fuga de datos internos y acoplamiento al ERP/POS interno.
- Criterios de aceptacion:
  - DTOs candidatos publicos documentados;
  - costos, margenes, proveedores, stock exacto, IDs internos innecesarios, flags admin y auditoria quedan prohibidos;
  - precio efectivo y disponibilidad quedan como datos calculados server-side.
- Restricciones tecnicas:
  - sin crear DTOs Java reales;
  - sin reusar `EcommerceAdmin...` como contrato publico.
- **Estado: IMPLEMENTADO (Fase 2C)** — DTOs publicos Java creados y separados de admin. Campos prohibidos respetados.

### HIST-2B-004 Reglas publicas de productos y categorias

- Descripcion breve: cerrar comportamiento para producto publicado, agotado, no publicado, slug inexistente, categoria activa, vacia e inactiva.
- Valor de negocio: evita ambiguedad en SEO, seguridad y UX publica.
- Criterios de aceptacion:
  - producto no publicado y slug inexistente responden `404 PUBLIC_RESOURCE_NOT_FOUND`;
  - producto agotado publicado puede responder `200`, `OUT_OF_STOCK`, `purchasable=false`;
  - categoria activa vacia puede responder `200`, pero `indexable=false` y queda fuera de sitemap;
  - categoria inactiva o inexistente responde `404 PUBLIC_RESOURCE_NOT_FOUND`.
- Restricciones tecnicas:
  - sin compra, reserva ni checkout;
  - sin exponer stock exacto.
- **Estado: IMPLEMENTADO (Fase 2C)** — reglas aplicadas en application service y tests.

### HIST-2B-005 Marcas publicas y sitemap

- Descripcion breve: cerrar alcance inicial de marcas publicas y sitemap.
- Valor de negocio: evita paginas pobres de marca y prepara SEO tecnico progresivo.
- Criterios de aceptacion:
  - marca se permite embebida en producto si existe;
  - `brandSlug` puede documentarse como filtro si hay dato suficiente;
  - paginas publicas de marca quedan diferidas;
  - sitemap se disena como endpoint JSON, no como `sitemap.xml` real.
- Restricciones tecnicas:
  - sin Merchant Center;
  - sin robots-policy real;
  - sin Storefront publico.
- **Estado: PARCIALMENTE IMPLEMENTADO (Fase 2C)** — sitemap JSON implementado; marcas publicas y paginas de marca siguen diferidas.

### HIST-2B-006 QA documental API publica

- Descripcion breve: crear checklist QA documental para validar el diseno antes de Fase 2C.
- Valor de negocio: reduce riesgo de implementar un contrato incompleto o inseguro.
- Criterios de aceptacion:
  - checklist Fase 2B creado;
  - separacion admin/public validable;
  - errores publicos seguros documentados;
  - criterios de salida hacia Fase 2C definidos.
- Restricciones tecnicas:
  - sin smoke runtime;
  - sin tests automatizados en esta fase.
- **Estado: COMPLETADO (Fase 2C)** — checklist actualizado a Fase 2C, tests focalizados 52/52, BUILD SUCCESS.

## Historias explicitamente fuera de alcance en Fase 2A/2B/2C

- Checkout.
- Mercado Pago.
- Pedidos online.
- Delivery.
- Merchant Center implementado.
- Next.js funcional.
- Storefront publica (frontend).
- `sitemap.xml` real (solo existe fuente JSON).
- Filtros `categorySlug` en productos publicos.
- Marcas publicas como paginas independientes.

## Deuda QA resuelta

- [x] Deuda `ProductCleanupPreviewIntegrationTest` resuelta en commit `eb56641`:
  - Causa: helper `insertElectronicDocument` no respetaba constraint `uq_billing_series_doc_type_environment_active` al siempre insertar billing_series activa `RECEIPT`/`LOCAL`.
  - Solucion: metodo `findOrCreateBillingSeries` find-or-create para fixture idempotente.
  - `mvn test` completo: 348 tests, 0 failures, 0 errors, BUILD SUCCESS.
