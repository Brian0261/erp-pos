# Phase 2S.7A — Bulk ecommerce online profile import/export MVP QA

## Objetivo

Cerrado funcional y documentalmente.
Implementar importacion/exportacion masiva de Perfiles online ecommerce separada del importador ERP, usando SKU como clave humana en Excel y reutilizando el patron seguro de plantilla/preview/confirm-file.

## Separacion ERP / ecommerce

- Productos ERP se gestionan por el importador ERP existente (`/api/v1/products/import`).
- Perfiles online ecommerce se gestionan por un flujo nuevo (`/api/v1/ecommerce-admin/products/online-profiles/import`).
- La importacion ecommerce nunca crea productos ERP.
- La importacion ecommerce nunca modifica stock, inventario, unidad, costo, precio ERP ni categoria ERP.
- Storefront consume solo perfiles online publicados.
- Readiness/publicacion de perfiles online queda separada del producto ERP.

## Endpoints creados

| Metodo | Ruta | Rol | Descripcion |
|--------|------|-----|-------------|
| GET | `/api/v1/ecommerce-admin/products/online-profiles/import/template` | ADMIN | Descarga plantilla `.xlsx` prellenada con productos ERP activos/perfiles no publicados y hojas de referencia. |
| POST | `/api/v1/ecommerce-admin/products/online-profiles/import/preview` | ADMIN | Valida archivo `.xlsx` y devuelve preview con conteos y errores por fila. |
| POST | `/api/v1/ecommerce-admin/products/online-profiles/import/confirm-file` | ADMIN | Aplica solo filas validas del archivo `.xlsx`. |

## Columnas de la plantilla

### Hoja principal `online_profiles`

| Columna | Requerida | Editable | Descripcion |
|---------|-----------|----------|-------------|
| `sku` | Si | No (clave) | SKU del producto ERP existente. |
| `productName` | No | No | Nombre ERP de referencia. |
| `publicationStatus` | No | No | Estado actual del perfil online. |
| `onlineName` | No | Si | Nombre ecommerce. Se autogenera desde nombre ERP si esta vacio en perfil nuevo. |
| `slug` | No | Si | Slug publico. Se autogenera desde `onlineName` o nombre ERP si esta vacio. |
| `onlineDescription` | No | Si | Descripcion ecommerce. |
| `onlineCategorySlug` | No | Si | Slug de categoria online existente y activa. |
| `brandSlug` | No | Si | Slug de marca existente y activa. |
| `brandAbsencePolicy` | No | Si | `GENERIC` o `UNBRANDED`. No combinar con `brandSlug`. |

### Hojas de referencia

- `online_categories`: `name`, `slug`, `active`.
- `brands`: `name`, `slug`, `active`.
- `instructions`: reglas breves de uso.

## Reglas de validacion

- SKU obligatorio.
- SKU duplicado en Excel se rechaza.
- SKU inexistente en productos ERP se rechaza.
- Producto ERP inactivo se rechaza para crear/actualizar.
- Perfil publicado se rechaza (protegido en MVP).
- `onlineCategorySlug` debe existir y estar activo.
- `brandSlug` debe existir y estar activo.
- `brandSlug` y `brandAbsencePolicy` no pueden venir juntos.
- `brandAbsencePolicy` acepta `GENERIC` o `UNBRANDED`.
- Slug informado duplicado en otro perfil se rechaza.
- Slug informado duplicado dentro del archivo se rechaza.
- Slug con `test`, `smoke`, `demo`, `prueba` o `example` se rechaza.
- `onlineName` maximo 180 caracteres.
- `onlineDescription` maximo 2000 caracteres.
- Slug maximo 180 caracteres.

## Reglas de autogeneracion

### `onlineName`

- Si viene vacio y el perfil es nuevo: se usa `Product.name` del ERP como base.
- Si el perfil ya existe: no se sobrescribe salvo que Excel traiga valor explicito.
- Si el perfil esta publicado: se rechaza la fila.
- Se limpian espacios dobles; se conservan numeros, medidas, marcas y abreviaturas.

### `slug`

- Si viene vacio: se genera desde `onlineName`; si `onlineName` tambien estaba vacio, desde `Product.name`.
- Regla: minusculas, sin tildes, sin caracteres raros, espacios a guiones, mantiene numeros relevantes, elimina simbolos innecesarios.
- Si el slug generado colisiona: se agrega sufijo `sku-<sku-normalizado>` y, si aun colisiona, sufijo numerico incremental hasta 100.
- Si el slug informado por Excel colisiona con otro perfil: se rechaza la fila.
- No se cambia slug de perfiles publicados en esta fase.

## Proteccion de perfiles publicados

- Una fila con perfil `PUBLISHED` se rechaza con error `Published profile cannot be changed by bulk import`.
- La plantilla no incluye perfiles publicados en la hoja principal.
- No se publica desde Excel.

## Confirmacion de seguridad

- No se crean productos ERP.
- No se modifica stock, inventario, unidad, costo, precio ERP ni categoria ERP.
- No se crean categorias online automaticamente.
- No se crean marcas automaticamente.
- No se publica desde Excel.
- Nuevos perfiles quedan `DRAFT`.
- Perfiles existentes no publicados mantienen estado no publicado.
- Confirmacion previa con conteos antes de aplicar.

## Validaciones ejecutadas

### Backend

- `mvn -DskipTests compile`: OK.
- `mvn "-Dtest=EcommerceOnlineProfileImportIntegrationTest,ProductImportIntegrationTest,ProductImportApplicationServiceTest,EcommerceAdminProfilesIntegrationTest,EcommerceCatalogApplicationServiceTest" test`: 57 tests, 0 failures, BUILD SUCCESS.
- Importador ERP existente sigue pasando.
- Tests de perfiles online/readiness siguen pasando.

### Frontend

- `npm run build`: OK.
- No hay script `lint`/`typecheck` separado en `frontend/package.json`; `npm run build` cubre compilacion y typecheck Angular.

### Git

- `git status --short --branch --untracked-files=all`: worktree con cambios locales y archivos nuevos.
- `git diff --stat`: OK.
- `git diff --name-status`: OK.
- `git diff --check`: sin errores de whitespace; solo warnings CRLF normales de Windows.

## Smoke

No se ejecuto smoke manual/headless en esta sesion porque no hay servidor backend/frontend corriendo en el entorno actual. El cierre se basa en tests backend focalizados y build frontend.

## Riesgos pendientes

- Filtro por categoria ERP para exportar plantilla quedo fuera del MVP porque no hay filtro de export masiva reusable sin ampliar contrato.
- No hay script `lint` separado en frontend; `npm run build` cubre typecheck.
- No hay smoke headless/e2e configurado para esta pantalla.
- La plantilla prellenada carga productos ERP activos y perfiles no publicados paginando de 500 en 500; con catalogos muy grandes puede requerir ajuste de paginacion en fases posteriores.

## Exclusiones confirmadas

- Publicar desde Excel.
- Cambiar perfiles publicados.
- Bulk SEO import.
- Bulk image import.
- ZIP de imagenes.
- Storage/CDN.
- Price overrides.
- Indexable.
- Activacion de indexacion.
- Crear productos ERP.
- Modificar stock.
- Modificar inventario.
- Modificar unidad.
- Modificar costo.
- Cambiar categoria ERP.
- Buscador.
- Filtros.
- Carrito.
- Checkout.
- Pagos.
- Storefront.
- Merchant Center.
- Structured data.
- remotePatterns.
- Imagenes externas.

## Siguiente frente recomendado

2S.8 — Discovery de gestion profesional de imagenes ecommerce.
