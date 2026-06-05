# Backlog Ecommerce InkToy

## Estado

Backlog ecommerce incremental. Fase 2A y Fase 2B quedaron cerradas documentalmente. Fase 2C quedo cerrada funcional y documentalmente con Storefront API read-only. Fase 2D agrega decision arquitectonica y plan de delivery SEO-first para la futura Storefront Next.js. No autoriza implementacion funcional por si mismo.

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
- Arquitectura Storefront Next.js.
- Delivery SEO-first.

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

## Historias Fase 2D - Storefront Architecture Decision & SEO Delivery Plan

### HIST-2D-001 ADR Storefront Next.js

- Descripcion breve: crear ADR de arquitectura de entrega para la futura Storefront publica Next.js.
- Valor de negocio: evita mezclar Angular interno con tienda publica y reduce retrabajo SEO.
- Criterios de aceptacion:
  - Next.js queda documentado como tecnologia de Storefront publica SEO-first;
  - Angular `frontend/` queda solo para ERP/POS interno;
  - `storefront/` queda definido como ubicacion futura raiz separada, sin crearse en Fase 2D;
  - Storefront API queda dentro del monolito Spring Boot por ahora y extraction-ready.
- Restricciones tecnicas:
  - sin crear Next.js;
  - sin crear `storefront/`;
  - sin dependencias;
  - sin cambios funcionales.
- Estado: DOCUMENTADO (Fase 2D).

### HIST-2D-002 Plan delivery SEO-first

- Descripcion breve: documentar el plan de delivery para paginas publicas SEO, consumo API y entorno local futuro.
- Valor de negocio: permite abrir Fase 2E con limites claros y sin adelantar checkout o infraestructura.
- Criterios de aceptacion:
  - arquitectura propuesta documentada;
  - estructura futura de carpetas documentada;
  - consumo de endpoints Storefront documentado;
  - estrategia local/dev sin AWS documentada;
  - riesgos y criterios para Fase 2E documentados.
- Restricciones tecnicas:
  - sin AWS/staging;
  - sin Docker;
  - sin `.env`;
  - sin secretos.
- Estado: DOCUMENTADO (Fase 2D).

### HIST-2D-003 QA checklist arquitectura

- Descripcion breve: crear checklist documental para validar decisiones de arquitectura Storefront.
- Valor de negocio: confirma que Fase 2D no introdujo codigo ni scope transaccional.
- Criterios de aceptacion:
  - ADR y plan validados documentalmente;
  - separacion admin/public validada;
  - restricciones de no implementacion marcadas;
  - criterio de salida QA definido.
- Restricciones tecnicas:
  - sin runtime;
  - sin tests automatizados nuevos;
  - sin cambios fuera de docs.
- Estado: DOCUMENTADO (Fase 2D).

### HIST-2D-004 Decision de rutas publicas

- Descripcion breve: cerrar rutas objetivo para el MVP SEO inicial.
- Valor de negocio: da estabilidad a slugs, canonical y sitemap futuro.
- Criterios de aceptacion:
  - `/productos/{slug}` queda como ruta objetivo de producto;
  - `/categorias/{slug}` queda como ruta objetivo de categoria;
  - `/marcas/{slug}` queda diferido;
  - no se usan IDs internos en URLs publicas.
- Restricciones tecnicas:
  - sin routing real;
  - sin pagina publica real;
  - sin redirecciones implementadas.
- Estado: DOCUMENTADO (Fase 2D).

### HIST-2D-005 Decision de rendering

- Descripcion breve: definir SSG/ISR como estrategia principal y SSR como diferida.
- Valor de negocio: balancea SEO, rendimiento, costo y frescura de catalogo.
- Criterios de aceptacion:
  - SSG/ISR documentado para productos y categorias;
  - SSR reservado para casos realmente necesarios;
  - catalogo no depende de renderizado cliente para indexacion.
- Restricciones tecnicas:
  - sin implementacion Next.js;
  - sin configuracion ISR real;
  - sin cache/invalidation runtime.
- Estado: DOCUMENTADO (Fase 2D).

### HIST-2D-006 Sitemap, robots y canonical

- Descripcion breve: cerrar estrategia tecnica para sitemap, robots, canonical y noindex staging.
- Valor de negocio: reduce riesgo de staging indexado, duplicados y paginas pobres en buscadores.
- Criterios de aceptacion:
  - `sitemap.xml` futuro definido como generado por Next.js usando `GET /api/v1/storefront/seo/sitemap`;
  - `robots.txt` futuro definido como responsabilidad/control de Storefront;
  - canonical definido desde `canonicalPath` o regla backend/contractual aprobada;
  - staging no indexable por defecto;
  - filtros/facetas no indexables por defecto.
- Restricciones tecnicas:
  - sin `sitemap.xml` real;
  - sin `robots.txt` real;
  - sin cambios de backend.
- Estado: DOCUMENTADO (Fase 2D).

### HIST-2D-007 Limites fuera de alcance

- Descripcion breve: registrar explicitamente lo que Fase 2D no autoriza.
- Valor de negocio: evita scope creep hacia tienda transaccional o infraestructura prematura.
- Criterios de aceptacion:
  - sin checkout, pagos, pedidos, stock reservado, delivery ni Merchant Center;
  - sin frontend Angular;
  - sin backend funcional;
  - sin Flyway/DB, Docker, `.env`, secretos, dependencias ni AWS/staging;
  - sin commit ni push automatico.
- Estado: DOCUMENTADO (Fase 2D).

## Historias Fase 2E - Storefront MVP Shell

### HIST-2E-001 Stack tecnico del shell

- Descripcion breve: cerrar decisiones tecnicas minimas para el proyecto Next.js futuro.
- Valor de negocio: reduce incertidumbre tecnica antes de crear `storefront/`.
- Criterios de aceptacion:
  - Next.js 16 confirmado;
  - App Router confirmado;
  - TypeScript confirmado;
  - npm confirmado;
  - Tailwind CSS confirmado.
- Restricciones tecnicas:
  - sin instalar Next.js;
  - sin crear `storefront/`;
  - sin dependencias.
- Estado: IMPLEMENTADO (Fase 2E.1) — Next.js 16.2.7 instalado en `storefront/`.

### HIST-2E-002 Estructura de carpetas del shell

- Descripcion breve: definir la estructura interna de `storefront/`.
- Valor de negocio: evita retrabajo estructural y mantiene separacion de responsabilidades.
- Criterios de aceptacion:
  - carpetas `app/`, `components/`, `lib/`, `types/`, `public/` documentadas;
  - `.env.local.example` definido como plantilla;
  - `.env.local` real debe quedar ignorado.
- Restricciones tecnicas:
  - sin crear carpeta real;
  - sin archivos de configuracion reales.
- Estado: IMPLEMENTADO (Fase 2E.1) — estructura creada con `app/`, `lib/`, `types/`, `public/`, `.env.local.example`.

### HIST-2E-003 Configuracion base del shell

- Descripcion breve: documentar configuracion minima de Next.js para build exitoso futuro.
- Valor de negocio: acelera la fase de implementacion evitando decisiones sobre la marcha.
- Criterios de aceptacion:
  - `next.config.ts` documentado con `output: 'standalone'`;
  - `tsconfig.json` con modo estricto;
  - `tailwind.config.ts` basico;
  - metadata base placeholder en layout;
  - `robots.txt` de desarrollo bloqueando crawlers.
- Restricciones tecnicas:
  - sin implementar paginas reales;
  - sin consumir endpoints reales;
  - sin sitemap.xml.
- Estado: IMPLEMENTADO (Fase 2E.1) — `next.config.ts` con `output: 'standalone'`, `robots.txt` con `Disallow: /`, layout con `noindex`.

### HIST-2E-004 Wrapper API futuro

- Descripcion breve: definir estrategia del wrapper de consumo de Storefront API.
- Valor de negocio: asegura que el consumo sea server-side por defecto y no exponga datos internos.
- Criterios de aceptacion:
  - wrapper server-side por defecto documentado;
  - sin consulta directa a base de datos;
  - sin consumo de endpoints admin.
- Restricciones tecnicas:
  - sin implementacion funcional;
  - sin consumo real de endpoints.
- Estado: IMPLEMENTADO (Fase 2E.1) — `lib/api.ts` creado con wrapper server-side preparado, sin consumo real.

### HIST-2E-005 Shell minimo implementado

- Descripcion breve: crear y validar el shell publico minimo Next.js en `storefront/`.
- Valor de negocio: tener el andamiaje tecnico listo antes de implementar paginas reales.
- Criterios de aceptacion:
  - `npm run build` exitoso;
  - `npm run lint` sin errores;
  - `npx tsc --noEmit` sin errores;
  - metadata base y noindex en layout;
  - `robots.txt` bloqueando crawlers;
  - wrapper API compilable sin consumo real;
  - sin paginas reales.
- Restricciones tecnicas:
  - sin implementar paginas de producto/categoria;
  - sin consumir endpoints reales;
  - sin sitemap.xml real.
- Estado: IMPLEMENTADO (Fase 2E.1) — commit `c049e3e`, build/lint/tsc OK.

## Historias Fase 2F - Public SEO Catalog MVP

### HIST-2F-001 Plan documental MVP SEO catalog

- Descripcion breve: crear plan de Fase 2F con subfases, alcance, riesgos y criterios de salida.
- Valor de negocio: alinea equipo y evita scope creep antes de diseno e implementacion.
- Criterios de aceptacion:
  - existe `docs/ecommerce/STOREFRONT_PUBLIC_SEO_CATALOG_MVP_PLAN.md`;
  - subfases 2F.0 a 2F.5 definidas;
  - Google Stitch ubicado como 2F.1;
  - rutas objetivo documentadas;
  - fuera de alcance explicito.
- Estado: IMPLEMENTADO (Fase 2F.0).

### HIST-2F-002 Diseno visual con Google Stitch

- Descripcion breve: producir artefactos visuales de referencia para home, productos, categorias y layout.
- Valor de negocio: reduce incertidumbre visual antes de codificar y evita retrabajo estetico.
- Criterios de aceptacion:
  - mockups aprobados de home, listado producto, detalle producto, listado categoria, detalle categoria;
  - layout, header, footer, navegacion definidos;
  - componentes visuales identificados;
  - paleta, tipografia, responsive mobile/tablet/desktop;
  - estados vacios, error, sin imagen, agotado;
  - sin checkout, carrito, pagos ni CTA transaccional.
- Estado: IMPLEMENTADO (Fase 2F.1) — diseno "Catalogo Creativo Profesional" aprobado. Paleta, tipografias, componentes y restricciones documentados.

### HIST-2F-002B Aprobacion visual 2F.1

- Descripcion breve: documentar aprobacion visual del sistema "Catalogo Creativo Profesional".
- Valor de negocio: establece contrato visual antes de implementar componentes Next.js/Tailwind.
- Criterios de aceptacion:
  - `docs/ecommerce/STOREFRONT_VISUAL_APPROVAL_2F1.md` creado;
  - `docs/qa/PHASE2F1_VISUAL_APPROVAL_QA_CHECKLIST.md` creado;
  - direccion visual, paleta, tipografia, componentes y restricciones documentados;
  - ajustes menores registrados como deuda de implementacion.
- Estado: IMPLEMENTADO (Fase 2F.1).

### HIST-2F-003 Conversion a componentes base Next.js/Tailwind

- Descripcion breve: transformar disenos aprobados en componentes base funcionales sin API real.
- Valor de negocio: permite validar estructura visual y responsive antes de integrar datos.
- Criterios de aceptacion:
  - layout general implementado;
  - header/footer/navegacion funcionales;
  - product card, category card, badges, price block, image frame, breadcrumb;
  - estados vacios y error visuales;
  - responsive validado;
  - build/lint/typecheck sin errores.
- Estado: IMPLEMENTADO (Fase 2F.2) — commits `dd8f1a3` (2F.2A + 2F.2B) y `1a55ec0` (2F.2C). Preview tecnico en `/` con datos mock.

### HIST-2F-004 Integracion real Storefront API

- Descripcion breve: conectar paginas reales con endpoints publicos de backend.
- Valor de negocio: habilita contenido dinamico real en la tienda publica.
- Criterios de aceptacion:
  - `/productos` consume listado paginado;
  - `/productos/{slug}` consume detalle por slug;
  - `/categorias` consume listado de categorias;
  - `/categorias/{slug}` consume detalle por slug;
  - fetch server-side desde Server Components;
  - no consumo de endpoints admin;
  - no consulta directa a DB.
- Estado: PENDIENTE (Fase 2F.3).

### HIST-2F-005 SEO tecnico inicial

- Descripcion breve: implementar metadata, canonical, notFound, noindex e ISR en paginas publicas.
- Valor de negocio: asegura que las paginas sean indexables y seguras para SEO.
- Criterios de aceptacion:
  - `generateMetadata` en detalle producto y categoria;
  - canonical desde backend;
  - Open Graph basico;
  - `notFound()` para slugs invalidos/no publicados;
  - ISR con revalidate conservador;
  - `robots.txt` y layout protegen desarrollo;
  - paginas `indexable=false` devuelven noindex.
- Estado: PENDIENTE (Fase 2F.4).

### HIST-2F-006 QA y cierre documental 2F

- Descripcion breve: validar build, lint, typecheck, smoke local y cerrar trazabilidad documental.
- Valor de negocio: garantiza calidad antes de considerar la fase completada.
- Criterios de aceptacion:
  - build/lint/typecheck sin errores;
  - smoke test local de slugs validos/invalidos y listados vacios/con datos;
  - documentacion actualizada: roadmap, backlog, status, change control;
  - deudas no bloqueantes registradas.
- Estado: PENDIENTE (Fase 2F.5).

## Historias Fase 2G - Publicacion y Smoke Test

### HIST-2G-001 Crear perfil online desde producto ERP/POS

- Descripcion breve: endpoint POST para crear perfil online DRAFT desde producto ERP/POS existente.
- Valor de negocio: permite publicar productos operativos directamente a ecommerce sin flujo manual duplicado.
- Criterios de aceptacion:
  - `POST /api/v1/ecommerce-admin/products/{id}/online-profile` retorna 201 DRAFT;
  - producto inexistente retorna 404;
  - producto con perfil existente retorna 409;
  - solo ADMIN puede crear; SUPERVISOR retorna 403.
- Restricciones tecnicas:
  - sin cambios en frontend Angular;
  - sin Flyway/DB;
  - sin checkout, carrito, pagos, pedidos.
- Estado: IMPLEMENTADO (Fase 2G.1) — commit `f766397`. Tests 11/11, BUILD SUCCESS.

### HIST-2G-002 Smoke Test Real Producto Publicado → Storefront

- Descripcion breve: validacion end-to-end de producto ERP/POS → perfil publicado → Storefront `/productos/{slug}`.
- Valor de negocio: confirma que el flujo completo funciona antes de invertir en paginas reales.
- Criterios de aceptacion:
  - producto creado y publicado → Storefront 200 OK;
  - H1, precio, descripcion, categoria/marca, breadcrumbs, CTA visibles;
  - metadata SEO (noindex, canonical, OG tags) presente;
  - casos negativos: 404, 409, 403 validados;
  - sin carrito, checkout, login, perfil.
- Restricciones tecnicas:
  - sin cambios en codigo funcional durante fase documental;
  - sin frontend Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.
- Estado: IMPLEMENTADO (Fase 2G.2) — validacion completa. Documentacion en `docs/qa/PHASE2G2_PUBLISHED_PRODUCT_SMOKE_TEST.md`.

### HIST-2G-003 Indicador de perfil online en Productos

- Descripcion breve: implementar indicador visual en el listado de Productos (Angular ERP/POS) que muestre si un producto tiene perfil online y en que estado esta (DRAFT / PUBLISHED / NONE).
- Valor de negocio: permite a los operadores identificar rapidamente que productos estan listos para ecommerce, cuales faltan publicar y cuales no tienen perfil, facilitando la gestion de miles de productos.
- Criterios de aceptacion:
  - columna o badge en tabla de Productos que indique estado del perfil online;
  - estados: Sin perfil, DRAFT, PUBLISHED;
  - integracion con backend `GET /api/v1/ecommerce-admin/products/online-profile-status` o campo en listado existente;
  - sin cambios en Storefront.
- Restricciones tecnicas:
  - solo frontend Angular ERP/POS;
  - sin cambios en Storefront Next.js;
  - sin Flyway/DB;
  - sin checkout, carrito, pagos, pedidos, login cliente.
- Estado: PENDIENTE (Fase 2G.3A).

## Historias explicitamente fuera de alcance en Fase 2A/2B/2C/2D/2E/2F/2G

Los siguientes puntos estuvieron fuera de alcance hasta Fase 2E inclusive. En Fase 2F entran al alcance progresivo:

- Pagina de producto real `/productos/{slug}` (dentro de alcance 2F).
- Pagina de categoria real `/categorias/{slug}` (dentro de alcance 2F).
- Consumo real de endpoints Storefront desde paginas (dentro de alcance 2F).

## Historias explicitamente fuera de alcance en Fase 2F

- Checkout.
- Carrito.
- Pagos.
- Pedidos online.
- Delivery.
- Stock reservado.
- Merchant Center implementado.
- Marcas publicas como paginas independientes (diferidas).
- Filtros avanzados.
- Sort por precio.
- `sitemap.xml` real (diferido).
- AWS/staging.
- Cambios backend/Flyway/Docker.
- Cambios en Angular interno.

## Deuda QA resuelta

- [x] Deuda `ProductCleanupPreviewIntegrationTest` resuelta en commit `eb56641`:
  - Causa: helper `insertElectronicDocument` no respetaba constraint `uq_billing_series_doc_type_environment_active` al siempre insertar billing_series activa `RECEIPT`/`LOCAL`.
  - Solucion: metodo `findOrCreateBillingSeries` find-or-create para fixture idempotente.
  - `mvn test` completo: 348 tests, 0 failures, 0 errors, BUILD SUCCESS.
