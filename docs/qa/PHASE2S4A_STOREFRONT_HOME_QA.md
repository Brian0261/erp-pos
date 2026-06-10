# Fase 2S.4A - Cierre QA: Home real SEO-first Storefront

## Estado

Fase cerrada. Implementacion y validacion completadas.

## Objetivo

Reemplazar la Home preview/mock por una Home real MVP SEO-first usando datos publicos reales y tomando Stitch como referencia visual, sin implementar buscador, filtros, carrito, checkout ni funciones falsas.

## Alcance implementado

### Home real MVP

- `storefront/app/page.tsx` deja de ser preview/mock y pasa a ser una Home real server-side.
- Consume datos reales desde contratos publicos existentes:
  - `getStorefrontCategories({ page: 0, size: 6 })`
  - `getStorefrontProducts({ page: 0, size: 8 })`
- Secciones implementadas:
  - hero comercial SEO-friendly;
  - categorias reales con enlaces a `/categorias/{slug}`;
  - productos reales con enlaces a `/productos/{slug}`;
  - bloque simple de confianza/beneficios;
  - header, footer y bottom navigation existentes.

### Confirmaciones funcionales

- No quedan mocks funcionales.
- No quedan textos de preview tecnico.
- No quedan `href="#"`.
- No hay botones falsos para completar diseño.
- La Home no simula buscador, filtros, carrito ni checkout.

## Archivo modificado

- `storefront/app/page.tsx`

## Validaciones ejecutadas

### Storefront

```
npm run build: OK
npm run lint: OK
npx tsc --noEmit: OK
```

### Git

```
git diff --check: OK
```

### Smoke HTTP

| Ruta | Status | Resultado |
|------|--------|-----------|
| `/` | 200 | OK - Home real, sin preview/mock |
| `/productos` | 200 | OK |
| `/categorias` | 200 | OK |
| `/buscar` | 404 | OK - esperado |

### Validaciones de contenido

- `/` no muestra textos de preview/mock: OK
- `/` no contiene `href="#"`: OK
- `/` muestra CTA principal real a `/productos`: OK
- `/` muestra CTA secundario real a `/categorias`: OK
- `/` consume datos reales de categorias y productos: OK
- `robots/noindex` siguen activos: OK
- No hay llamadas nuevas a `/api/v1/ecommerce-admin`: OK

## Confirmaciones de exclusiones

### No implementado

- [x] Buscador funcional
- [x] Filtros
- [x] Carrito
- [x] Checkout
- [x] Pagos
- [x] Login cliente
- [x] Pedidos
- [x] Promociones dinamicas
- [x] Banners administrables
- [x] Sitemap XML
- [x] Backend nuevo
- [x] Contratos nuevos
- [x] `remotePatterns`
- [x] Imagenes externas nuevas
- [x] Rutas nuevas
- [x] Navegacion falsa a rutas inexistentes

## Riesgos

- Contenido de Home insuficiente si el catalogo publico aun tiene poco volumen.
- Indexacion futura depende de contenido real suficiente en categorias y productos.
- No se debe convertir la Home en contenedor de mocks por estetica.

## Siguiente frente recomendado

Discovery de SEO tecnico de publicacion.

## Criterio de cierre

Fase 2S.4A queda cerrada si:

- [x] La Home real sustituye el preview/mock.
- [x] Consume datos reales de contratos publicos.
- [x] No quedan mocks, preview tecnico ni `href="#"`.
- [x] Build, lint, typecheck y diff check pasan.
- [x] Smoke HTTP confirma rutas publicas y 404 esperado.
- [x] No se consumen endpoints admin.
- [x] robots/noindex siguen activos.

## Archivos de documentacion

- `docs/qa/PHASE2S4A_STOREFRONT_HOME_QA.md` (creado)
- `docs/ai/CURRENT_STATUS.md` (actualizado)
- `docs/ai/CHANGE_CONTROL.md` (actualizado)
