# Backlog Ecommerce InkToy

## Estado

Backlog inicial de Fase 2A. No autoriza implementacion funcional por si mismo.

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

## Historias explicitamente fuera de alcance en Fase 2A

- Checkout.
- Mercado Pago.
- Pedidos online.
- Delivery.
- Merchant Center implementado.
- Next.js funcional.
