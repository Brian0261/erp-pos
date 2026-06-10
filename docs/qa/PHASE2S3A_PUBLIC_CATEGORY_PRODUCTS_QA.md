# Fase 2S.3A — Cierre QA: Categoría pública /categorias/[slug] con productos por categoría

## Estado

Fase cerrada. Implementación y validación completadas.

## Objetivo

Crear `/categorias/[slug]` con productos reales filtrados por categoría, sin filtrar productos globales en frontend. Extender el contrato público `GET /api/v1/storefront/catalog/products` con `categorySlug` opcional.

## Alcance implementado

### Backend — cambio de contrato público

- `GET /api/v1/storefront/catalog/products` ahora acepta query param opcional `categorySlug`.
- Sin `categorySlug`: comportamiento idéntico al anterior.
- Con `categorySlug`: filtra server-side por categoría online activa.
- Mantiene `page`, `size`, `sort=name_asc`.
- `categorySlug` inexistente o categoría inactiva: página vacía `200`, sin romper contrato.
- No se agregaron DTOs nuevos ni endpoint duplicado.
- No se cambiaron contratos existentes.

### Archivos backend modificados

- `backend/src/main/java/com/erppos/backend/erp/ecommerce/adapter/rest/storefront/StorefrontCatalogController.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/usecase/StorefrontProductCatalogUseCase.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/application/service/StorefrontProductCatalogApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/domain/port/StorefrontProductReadPort.java`
- `backend/src/main/java/com/erppos/backend/erp/ecommerce/infrastructure/persistence/StorefrontProductReadAdapter.java`
- `backend/src/test/java/com/erppos/backend/integration/StorefrontPublicProductsIntegrationTest.java`

### Storefront — nueva página y enlaces

- `storefront/lib/api.ts`: `getStorefrontProducts()` acepta `categorySlug` opcional vía `StorefrontProductPageParams`.
- `storefront/app/categorias/[slug]/page.tsx`: nueva página dinámica con metadata SEO, canonical, noindex según contrato y env.
- `storefront/app/categorias/page.tsx`: cada categoría enlaza a `/categorias/{slug}`, texto "Ver productos" en lugar de "Detalle proximamente".

### Archivos Storefront modificados

- `storefront/lib/api.ts`
- `storefront/app/categorias/page.tsx`
- `storefront/app/categorias/[slug]/page.tsx` (nuevo)

## Tests y validaciones ejecutadas

### Backend — tests focalizados Storefront

```
mvn "-Dtest=StorefrontPublicProductsIntegrationTest,StorefrontPublicCategoriesIntegrationTest,StorefrontPublicSitemapIntegrationTest" test
```

Resultado: **43 tests, 0 failures, 0 errors, BUILD SUCCESS**.

Tests nuevos agregados:
- `shouldFilterPublishedProductsByCategorySlug` — filtra correctamente por categoría activa.
- `shouldReturnEmptyPageWhenCategorySlugDoesNotExist` — slug inexistente devuelve página vacía.
- `shouldNotExposeProductsWhenOnlineCategoryIsInactive` — categoría inactiva no expone productos.

### Storefront

```
npm run build: OK (compiled successfully, 0 errors)
npm run lint: OK (0 warnings)
npx tsc --noEmit: OK (0 errors)
```

### Git

```
git diff --check: OK (sin errores whitespace)
```

### Smoke HTTP

| Ruta | Status | Resultado |
|------|--------|-----------|
| `/categorias/{slug-con-productos}` | 200 | OK — Productos reales filtrados por categoría |
| `/categorias/{slug-inexistente}` | 404 | OK — notFound() |
| `/productos` | 200 | OK — Sin cambios, sin categorySlug |
| `/productos/{slug}` | 200 | OK — Sin cambios |
| `/buscar` | 404 | OK — Ruta no existe (esperado) |

### Validaciones de contenido

- `/categorias/[slug]` consume `getStorefrontCategoryBySlug(slug)`: OK
- `/categorias/[slug]` consume `getStorefrontProducts({ categorySlug: slug })`: OK
- `/categorias/[slug]` muestra `ProductCard` con productos reales: OK
- `/categorias/[slug]` muestra `EmptyState` si no hay productos: OK
- `/categorias/[slug]` usa `notFound()` para slug inexistente: OK
- `/categorias/[slug]` genera metadata SEO con canonical/noindex: OK
- `/categorias` enlaza a `/categorias/{slug}`: OK
- NO hay llamadas a `/api/v1/ecommerce-admin`: OK
- robots/noindex siguen activos: OK

## Confirmaciones de exclusiones

### No tocado

- [x] Home real
- [x] Buscador
- [x] Filtros UI/chips
- [x] Paginación UI avanzada
- [x] Carrito
- [x] Checkout
- [x] Pagos
- [x] Pedidos
- [x] Login cliente
- [x] Merchant Center
- [x] Sitemap XML
- [x] Imágenes externas
- [x] `remotePatterns`
- [x] Productos relacionados
- [x] Marcas públicas
- [x] ecommerce-admin
- [x] Angular frontend
- [x] Flyway/DB
- [x] Docker
- [x] `.env`
- [x] Secretos
- [x] Seguridad
- [x] `/productos/[slug]`
- [x] `globals.css`
- [x] Client-side filtering de todos los productos
- [x] Endpoints duplicados
- [x] DTOs públicos (no se cambiaron)

## Riesgo de despliegue

**Storefront nuevo debe desplegarse junto con backend nuevo.**

Si se despliega Storefront nuevo contra backend viejo, `/categorias/[slug]` podría no filtrar correctamente porque el backend viejo ignora `categorySlug`. La recomendación es desplegar backend y Storefront en el mismo release.

## Pendiente recomendado

Discovery de Home real SEO-first como siguiente frente.

## Criterio de cierre

Fase 2S.3A queda cerrada si:

- [x] `GET /api/v1/storefront/catalog/products` acepta `categorySlug` opcional
- [x] `/categorias/[slug]` existe y muestra productos reales filtrados
- [x] `/categorias` enlaza a `/categorias/{slug}`
- [x] Tests backend focalizados pasan (43/43)
- [x] Storefront build/lint/typecheck pasan
- [x] Smoke HTTP confirma rutas y 404s esperados
- [x] No se consumen endpoints admin
- [x] robots/noindex siguen activos
- [x] No se implementaron funcionalidades fuera de alcance
- [x] Commits separados backend/Storefront/docs

## Archivos de documentación

- `docs/qa/PHASE2S3A_PUBLIC_CATEGORY_PRODUCTS_QA.md` (creado)
- `docs/ai/CURRENT_STATUS.md` (actualizado)
- `docs/ai/CHANGE_CONTROL.md` (actualizado)
