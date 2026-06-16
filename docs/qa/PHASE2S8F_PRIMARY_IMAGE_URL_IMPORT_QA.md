# Phase 2S.8F Primary Image URL Import QA

## Objetivo

Implementar importacion masiva separada para asignar o actualizar la imagen principal URL-only de perfiles online ecommerce existentes, usando SKU como clave humana principal y reutilizando la politica de URL publica existente.

## Alcance Implementado

- Formato MVP: solo `.xlsx`.
- Flujo separado para imagen principal por URL publica.
- Endpoints ADMIN nuevos:
  - `GET /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/template`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview`
  - `POST /api/v1/ecommerce-admin/products/online-profiles/primary-images/import/confirm-file`
- Preview sin persistencia.
- Confirm-file revalida el archivo completo antes de persistir.
- Confirm-file aplica filas validas `CREATE` y `UPDATE`, deja `NO_CHANGE` sin cambios y reporta `REJECT` como importacion parcial.
- Persistencia en `ProductAsset` existente como URL-only:
  - `assetType = PRODUCT_IMAGE`
  - `primary = true`
  - `active = true`
  - `assetUrl = imageUrl` validada
  - metadata storage nula para URL-only
- Reuso directo de `PublicImageUrlPolicy`.
- Respeto de `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS`.
- Pantalla Angular Admin separada: `/ecommerce-admin/perfiles/imagenes/importar`.
- Navegacion agregada en Catalogo online e ingreso contextual desde Perfiles online.

## Contrato XLSX

Columnas requeridas:
- `sku`
- `imageUrl`
- `altText`
- `source`
- `rightsConfirmed`

Columnas opcionales:
- `assetType`
- `displayOrder`
- `publishedUpdateConfirmed`
- `productName`
- `publicationStatus`
- `currentImageUrl`

Columnas informativas:
- `productName`
- `publicationStatus`
- `currentImageUrl`

Estas columnas no se usan como clave ni como fuente de verdad para aplicar cambios.

## Validaciones Por Fila

- `sku` obligatorio.
- `sku` debe existir.
- `sku` duplicado en archivo es error.
- Producto inactivo es error.
- Perfil online inexistente es error.
- `imageUrl` obligatoria.
- `imageUrl` debe pasar `PublicImageUrlPolicy`.
- No se hace `HEAD` ni `GET` a `imageUrl`.
- No se descargan imagenes remotas.
- `altText` obligatorio y maximo 250 caracteres.
- `source` obligatorio y debe ser `SUPPLIER`, `OWN`, `GENERATED` u `OTHER`.
- `rightsConfirmed` debe ser `true`.
- `assetType` vacio usa `PRODUCT_IMAGE`.
- `assetType` informado solo acepta `PRODUCT_IMAGE`.
- `displayOrder` vacio usa `0`.
- `displayOrder` invalido o negativo es error.
- Perfil `PUBLISHED` con cambio `CREATE` o `UPDATE` requiere `publishedUpdateConfirmed=true`.
- Perfil `PUBLISHED` con `NO_CHANGE` no requiere confirmacion.

## Acciones

| Accion | Criterio |
|---|---|
| `CREATE` | No existe imagen principal activa y se creara una. |
| `UPDATE` | Existe imagen principal activa y cambia al menos un dato relevante. |
| `NO_CHANGE` | La fila coincide con la imagen principal actual. |
| `REJECT` | La fila tiene errores bloqueantes. |

## Warnings Implementados

- `Sobrescribira imagen principal existente.`
- `Perfil publicado cambiara imagen visible publicamente.`
- `Si reemplaza un asset con metadata S3, la importacion URL-only limpiara metadata storage del asset, pero NO borrara el objeto S3 previo en esta fase.`
- `La URL fue validada por politica, pero no se verifico MIME, dimensiones, peso ni existencia remota.`
- `Storefront Next.js no esta desplegado en Lightsail; render staging no queda validado por esta fase.`
- `Backend allowlist y Storefront allowlist deben mantenerse alineadas.`

## Angular Admin

- Nueva pantalla standalone `PrimaryImageUrlImportPageComponent`.
- Selector `.xlsx`.
- Descarga de plantilla.
- Preview con conteos.
- Filtros: todas, validas, con error, advertencias.
- Tabla compacta con fila, SKU, producto, estado, accion, URL abreviada y resultado.
- Panel lateral con detalle de fila, errores, advertencias, imagen y trazabilidad.
- Advertencias generales deduplicadas en bloque compacto colapsable.
- Confirm dialog antes de aplicar.
- Estado post-confirmacion con resultado final, conteos y accion de nueva importacion.
- Tras confirmar, no queda activo el boton para volver a importar el mismo archivo.
- Mensajes explicitos:
  - No crea productos ERP.
  - No modifica stock, inventario, unidades, costos o precios ERP.
  - No descarga imagenes remotas.
  - Storefront Next.js staging no queda validado.

## Smoke Manual Reportado Por Operador

- El Excel se carga correctamente.
- El preview usa el endpoint correcto de importacion de imagenes:
  - `/api/v1/ecommerce-admin/products/online-profiles/primary-images/import/preview`
- La fila valida se importa correctamente.
- La fila invalida queda rechazada.
- Despues de confirmar, la pantalla muestra el resultado de importacion.
- Ya no queda activo el boton para volver a importar el mismo archivo.
- La opcion "Nueva importacion" limpia el flujo correctamente.
- La tabla, filtros y panel lateral funcionan de forma clara.
- No se detectaron errores visuales o funcionales relevantes en el smoke manual.

## Validaciones Ejecutadas

| Command | Result |
|---|---|
| `./mvnw -DskipTests compile` in `backend` | OK, BUILD SUCCESS |
| `./mvnw -Dtest=EcommercePrimaryImageUrlImportIntegrationTest test` in `backend` | 8 tests, 0 failures, BUILD SUCCESS |
| `./mvnw -Dtest=EcommerceCatalogApplicationServiceTest test` in `backend` | 29 tests, 0 failures, BUILD SUCCESS |
| `./mvnw -Dtest=EcommerceAdminProfilesIntegrationTest test` in `backend` | OK |
| `./mvnw -Dtest=EcommerceOnlineProfileImportIntegrationTest test` in `backend` | OK |
| `./mvnw -Dtest=EcommerceAdminTaxonomyIntegrationTest test` in `backend` | OK |
| `npm run build` in `frontend` | OK |

Cobertura especifica agregada antes del commit:
- Perfil `PUBLISHED` con `NO_CHANGE` no requiere `publishedUpdateConfirmed`.
- Reemplazo de asset con metadata S3 por URL-only emite warning, no toca S3 y deja metadata storage nula en el asset resultante.

## Exclusiones Confirmadas

- No se modifico Storefront Next.js.
- No se modifico Flyway.
- No se modifico docker-compose.
- No se implemento CSV.
- No se implemento ZIP.
- No se implemento carga binaria masiva.
- No se implemento presigned URL.
- No se implemento galeria.
- No se implemento Merchant Center ni structured data.
- No se activo indexacion.
- No se implemento carrito, checkout ni pagos.
- No se toco AWS, Lightsail, S3, CloudFront, IAM ni `.env` real.
- No se crearon recursos cloud.
- No se agregaron secretos, access keys, tokens ni passwords.
- No se modifico Producto ERP, POS, stock, inventario, unidades, costos, precios ERP ni categorias ERP.
- No se hizo push ni tag.

## Riesgos Pendientes

- La importacion URL-only no verifica existencia real, MIME, dimensiones ni peso de la imagen remota.
- Si se reemplaza un asset proveniente de S3, el objeto anterior puede quedar orphan porque esta fase no borra objetos S3.
- Backend `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS` y Storefront `STOREFRONT_IMAGE_ALLOWED_DOMAINS` deben mantenerse alineados.
- Storefront Next.js aun no esta desplegado en Lightsail; render staging end-to-end sigue pendiente.
- 2S.9 Excel + ZIP requerira validacion binaria, matching archivo-SKU y estrategia de consistencia DB/S3.

## Resultado

- 2S.8F queda implementada localmente y validada por pruebas backend/frontend.
- Pendiente: push cuando el operador lo solicite.
