# Fase 2G.2 — Smoke Test Real de Producto Publicado

Fecha de ejecucion: 2026-06-04
Ejecutado por: opencode (agente automatizado asistido)
Ambiente: local (backend Docker 8080, frontend Docker 4200, storefront Next.js 3000, postgres 5432)

## Objetivo

Validar end-to-end que un producto operativo del ERP/POS puede convertirse en producto publicado ecommerce y mostrarse correctamente en Storefront mediante `/productos/{slug}`.

## Producto de prueba

| Campo | Valor |
|---|---|
| Nombre operativo | Producto Smoke Test 2g2-1780622524 |
| ProductId | 5839 |
| Slug | `producto-smoke-test-2g2-1780622524` |
| Estado final del perfil | PUBLISHED |
| Precio | S/ 25.90 (PEN 25.90) |
| Categoria online | Online Cat IT 2g2-1780622524 |
| Marca ecommerce | Marca IT 2g2-1780622524 |
| SEO title | Producto Smoke Test 2g2-1780622524 |
| SEO description | Descripcion SEO para smoke test 2G.2 |
| Canonical path | `/productos/producto-smoke-test-2g2-1780622524` |
| Robots policy | INDEX_FOLLOW |
| Indexable | true (env `STOREFRONT_INDEXING_ENABLED=false` suprime indexacion global) |
| Asset principal | `https://cdn.example.test/product-2g2-1780622524.jpg` (URL externa, rechazada por `getSafeImageSrc`) |

## Flujo ejecutado

1. Login como `admin@erp.local` → token JWT obtenido.
2. Creacion de categoria operativa → categoryId=8.
3. Creacion de unidad operativa → unitId=6.
4. Creacion de producto operativo → productId=5839, salePrice=25.90.
5. Creacion de perfil online DRAFT via `POST /api/v1/ecommerce-admin/products/5839/online-profile` → 201 DRAFT.
6. Creacion de marca ecommerce → brandId=2.
7. Creacion de categoria online → onlineCategoryId=2.
8. Actualizacion de perfil (slug, nombre online, descripcion, categoria, marca) → 200.
9. SEO (title, description, canonical, INDEX_FOLLOW, indexable=true) → 200.
10. Asset principal (PRODUCT_IMAGE, URL externa, alt, rightsConfirmed=true) → 200.
11. Validacion de publicacion → `publishable=true`, sin errores.
12. Publicacion → 200 PUBLISHED.
13. Verificacion Storefront → pagina `/productos/producto-smoke-test-2g2-1780622524` responde 200 con contenido correcto.

## Endpoints probados

| Endpoint | Metodo | Resultado | Observaciones |
|---|---|---|---|
| `POST /api/v1/ecommerce-admin/products/5839/online-profile` | POST | 201 DRAFT | Perfil creado desde producto ERP/POS. |
| `PUT /api/v1/ecommerce-admin/products/5839/online-profile` | PUT | 200 | Slug, nombre, descripcion, categoria, marca actualizados. |
| `PUT /api/v1/ecommerce-admin/products/5839/seo` | PUT | 200 | SEO title, description, canonical, robots, indexable. |
| `PUT /api/v1/ecommerce-admin/products/5839/primary-asset` | PUT | 200 | Asset principal registrado. |
| `GET /api/v1/ecommerce-admin/products/5839/publication-validation` | GET | publishable=true | Sin errores de checklist. |
| `POST /api/v1/ecommerce-admin/products/5839/publish` | POST | 200 PUBLISHED | Estado cambia a PUBLISHED. |
| `GET /api/v1/storefront/catalog/products/producto-smoke-test-2g2-1780622524` | GET | 200 | API publica retorna producto publicado. |
| `GET /productos/producto-smoke-test-2g2-1780622524` (storefront) | GET | 200 | Pagina Next.js renderiza correctamente. |

## Storefront validado

| Validacion | Resultado | Evidencia |
|---|---|---|
| Status HTTP | 200 | `Invoke-WebRequest` retorna StatusCode=200 |
| H1 correcto | "Producto Smoke Test Online 2g2-1780622524" | `<h1>` presente en HTML |
| Precio renderizado | "PEN 25.90" | `<p>` con formato de precio |
| Descripcion renderizada | "Descripcion comercial completa para smoke test 2G.2." | Parrafo visible |
| Categoria renderizada | Badge "Online Cat IT 2g2-1780622524" | `<span>` con badge neutral |
| Marca renderizada | Badge "Marca IT 2g2-1780622524" | `<span>` con badge accent |
| Breadcrumbs correctos | Inicio / Productos / Online Cat IT / Producto Smoke Test Online | `<nav>` con `<ol>` de breadcrumbs |
| CTA "Consultar en tienda" | Presente | `<a>` con texto "Consultar en tienda" |
| Metadata noindex/nofollow | `noindex, nofollow` | `<meta name="robots" content="noindex, nofollow">` |
| Canonical presente | `/productos/producto-smoke-test-2g2-1780622524` | `<link rel="canonical">` |
| OG tags presentes | og:title, og:description, og:image, og:type | Meta tags Open Graph presentes |
| Sin carrito | No aparece "carrito" | Busqueda en HTML negativa |
| Sin checkout | No aparece "checkout" | Busqueda en HTML negativa |
| Sin "Comprar" | No aparece "Comprar" | Busqueda en HTML negativa |
| Sin login | No aparece "Iniciar sesion" | Busqueda en HTML negativa |
| Sin perfil cliente | No aparece "Mi cuenta" | Busqueda en HTML negativa |
| Fallback imagen | "Imagen no disponible" | URL externa rechazada por `getSafeImageSrc` |
| Accordion Especificaciones | Visible, contenido presente | Seccion accordion renderizada |
| Accordion Disponibilidad | Visible, contenido presente | Seccion accordion renderizada |
| Footer Storefront | Renderizado con links | InkToy, Categorias, Informacion, Tiendas |
| Header Storefront | Renderizado con logo y nav | Logo InkToy, navegacion Inicio/Categorias/Buscar/Tiendas |
| BottomNavigation | Renderizado (mobile) | Inicio, Categorias, Buscar, Tiendas |
| StickyProductCTA | Renderizado | CTA fijo inferior "Consultar en tienda" |

## Casos negativos validados

| Caso | Resultado esperado | Resultado obtenido |
|---|---|---|
| Slug inexistente (`no-existe-99999`) | 404 | 404 |
| Perfil DRAFT no publicado | 404 publico | 404 |
| Duplicado de perfil | 409 | 409 |
| SUPERVISOR intenta crear perfil | 403 | 403 |

## Validaciones automaticas

| Comando | Resultado |
|---|---|
| `mvn -Dtest=EcommerceAdminProfilesIntegrationTest test` | 11 tests, 0 failures, BUILD SUCCESS |
| `npm run build` (frontend Angular) | SUCCESS |
| `npm run build` (storefront Next.js) | Compiled successfully |
| `git status -sb` | `master...origin/master` limpio |
| `git diff --check` | Sin errores |

## Configuracion local

| Archivo | Contenido | Estado Git |
|---|---|---|
| `storefront/.env.local` | `STOREFRONT_API_BASE_URL=http://localhost:8080`, `STOREFRONT_INDEXING_ENABLED=false` | Ignorado por `.gitignore` (`.env*`) |

## Deudas no bloqueantes registradas

1. **Asset externo no renderiza**: `getSafeImageSrc` solo acepta paths relativos (`/...`). URLs externas como `https://cdn.example.test/...` son rechazadas y muestran "Imagen no disponible". Para produccion se necesitaran assets con paths relativos o ajustar la politica de URLs.
2. **Disponibilidad "No disponible temporalmente"**: El producto de prueba no tiene stock operativo registrado. En un flujo real, el stock inicial debe existir para que `purchasable` sea `true`.
3. **Backend Docker requirio rebuild**: El contenedor corria la version anterior sin el endpoint POST de 2G.1. Tras `docker compose up --build -d` todo funciono correctamente.

## Confirmaciones de restricciones

- [x] Sin cambios en `storefront/` codigo (solo `.env.local` local, ignorado por git).
- [x] Sin migraciones Flyway nuevas.
- [x] Sin slug agregado a `products`.
- [x] Sin Docker, `.env` raiz, secretos, AWS/staging.
- [x] Sin checkout, carrito, pagos, pedidos, delivery, login cliente, perfil cliente, panel publico ni Merchant Center.
- [x] Sin importacion Excel ni pestaña Ecommerce.
- [x] Sin codigo funcional nuevo implementado durante el smoke test.

## Conclusion

El flujo end-to-end Producto ERP/POS → Perfil online publicado → API publica → Storefront `/productos/{slug}` fue validado exitosamente. Todos los endpoints respondieron correctamente, la pagina Storefront renderizo con contenido esperado, y los casos negativos fueron manejados de forma segura.
