# Phase 2S.8D AWS S3 + CloudFront Image Upload QA

## Objetivo

Implementar upload manual de imagen principal ecommerce desde Angular admin hacia backend, con validacion binaria local y storage via S3 privado + URL publica CloudFront/CDN configurada.

## Alcance

- Backend Spring Boot ecommerce admin.
- `ProductAsset` sigue siendo la entidad de imagen publica del Perfil online.
- Upload multipart ADMIN para imagen principal de producto ecommerce.
- Storage port testeable y adapter S3 real desactivado por defecto.
- Metadata tecnica nullable en `ecommerce_product_assets`.
- Angular detalle de Perfil online con selector de archivo manual.

## Fuera De Alcance Confirmado

- No se crearon recursos AWS reales.
- No se agregaron access keys ni secretos.
- No se implementaron presigned URLs.
- No se implemento ZIP ni importacion masiva de imagenes.
- No se agrego columna de imagen a Excel 2S.7A.
- No se implemento galeria, WebP obligatorio, AVIF, antivirus avanzado ni transformaciones.
- No se toco Producto ERP, POS, stock, inventario, unidad, costo ni precio ERP.
- No se toco Storefront funcional ni `next.config.ts` en esta fase.
- No se activo indexacion.
- No se implemento structured data, Merchant Center, carrito, checkout ni pagos.

## Backend

- Nuevo endpoint ADMIN:
  - `POST /api/v1/ecommerce-admin/products/{productId}/primary-asset/upload`
  - `multipart/form-data`
  - Part requerido: `file`
  - Params opcionales/controlados: `altText`, `source`, `rightsConfirmed`, `displayOrder`
- Endpoint URL manual existente se mantiene:
  - `PUT /api/v1/ecommerce-admin/products/{productId}/primary-asset`
- Nueva configuracion segura:
  - `ECOMMERCE_IMAGE_STORAGE_PROVIDER=none|s3`
  - `AWS_REGION`
  - `ECOMMERCE_IMAGE_S3_BUCKET`
  - `ECOMMERCE_IMAGE_S3_PREFIX`
  - `ECOMMERCE_IMAGE_PUBLIC_BASE_URL`
  - `ECOMMERCE_IMAGE_CACHE_CONTROL`
  - `ECOMMERCE_IMAGE_MAX_SIZE_BYTES`
  - `ECOMMERCE_IMAGE_MAX_WIDTH`
  - `ECOMMERCE_IMAGE_MAX_HEIGHT`
  - `ECOMMERCE_IMAGE_MULTIPART_MAX_FILE_SIZE`
  - `ECOMMERCE_IMAGE_MULTIPART_MAX_REQUEST_SIZE`
- Default operativo: storage desactivado con `ECOMMERCE_IMAGE_STORAGE_PROVIDER=none`.
- Si se activa `s3`, las credenciales se resuelven por la cadena default del AWS SDK, no por propiedades commiteadas.

## DB/Flyway

- Migracion nullable: `V18__ecommerce_product_asset_storage_metadata.sql`.
- Columnas nuevas en `ecommerce_product_assets`:
  - `storage_provider`
  - `storage_bucket`
  - `storage_key`
  - `mime_type`
  - `width`
  - `height`
  - `size_bytes`
  - `checksum_sha256`
  - `original_filename`
- Assets historicos URL-only siguen siendo validos si cumplen politica de URL publica.

## Validacion De Archivo

- Permitido: JPEG y PNG.
- Bloqueado: SVG, AVIF, GIF, archivos vacios, MIME declarado no permitido y mismatch entre MIME declarado y firma binaria.
- Se lee dimension real con `ImageIO`.
- Se valida peso maximo y dimensiones maximas por env.
- Se calcula `checksumSha256`.
- Naming de key:
  - `{prefix}/ecommerce/products/{productId}/profiles/{profileId}/main/{slug}-{sha256-12}.{ext}`

## Politica URL Publica

- La URL publica final devuelta por storage se valida con `PublicImageUrlPolicy`.
- `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS` debe permitir el host de `ECOMMERCE_IMAGE_PUBLIC_BASE_URL`.
- `STOREFRONT_IMAGE_ALLOWED_DOMAINS` debe mantener el mismo host para render seguro en Storefront.

## Angular Admin

- Pantalla impactada: `frontend/src/app/features/ecommerce-admin/online-profile-detail-page.component.ts`.
- Se agrego selector manual de archivo JPEG/PNG en la pestaña Imagen.
- El upload usa los mismos campos de alt text, fuente, derechos y orden.
- El guardado por URL manual se mantiene intacto.
- Se muestra metadata devuelta cuando existe: provider, MIME, dimensiones, peso y nombre original.

## Validaciones Ejecutadas

| Command | Result |
|---|---|
| `mvn -DskipTests compile` in `backend` | OK |
| `mvn -Dtest=EcommerceCatalogApplicationServiceTest test` in `backend` | 29 tests, 0 failures, BUILD SUCCESS |
| `mvn "-Dtest=EcommerceCatalogPersistenceIntegrationTest,EcommerceAdminProfilesIntegrationTest" test` in `backend` | 29 tests, 0 failures, BUILD SUCCESS |
| `npm run build` in `frontend` | OK |
| `git diff --check` | OK; solo warnings CRLF de Git en Windows |

Nota: la corrida de integracion levanto Testcontainers/PostgreSQL, valido 18 migraciones y aplico `V18__ecommerce_product_asset_storage_metadata.sql` correctamente.

## Riesgos Pendientes

- No se hizo smoke manual porque no hay servidores locales activos en esta sesion.
- Adapter S3 no fue probado contra AWS real por restriccion de no crear/tocar recursos AWS.
- Si `ECOMMERCE_IMAGE_PUBLIC_BASE_URL` no esta allowlisted en backend y Storefront, el upload puede guardar/servir una URL que luego no renderice en Storefront.
- No hay limpieza automatica del objeto S3 si el upload a S3 fue exitoso pero falla el guardado DB posterior.

## Checklist Manual Futuro

1. Configurar bucket privado, OAC/OAI y CloudFront real fuera del repo.
2. Configurar `ECOMMERCE_IMAGE_STORAGE_PROVIDER=s3` y `ECOMMERCE_IMAGE_PUBLIC_BASE_URL=https://<cdn-real>`.
3. Agregar el host CDN a `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS` y `STOREFRONT_IMAGE_ALLOWED_DOMAINS`.
4. Subir PNG valido desde Perfil online y confirmar metadata.
5. Subir JPEG valido desde Perfil online y confirmar URL publica.
6. Probar rechazo de SVG y archivo vacio.
7. Confirmar que Storefront renderiza solo si el dominio esta allowlisted.
