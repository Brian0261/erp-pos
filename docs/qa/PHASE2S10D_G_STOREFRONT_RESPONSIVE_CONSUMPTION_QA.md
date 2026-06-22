# QA - 2S.10D-G Storefront Responsive Consumption

## Objetivo

Validar la implementacion frontend-only minima para que Storefront consuma `primaryImage.responsive.variants[]` sin perder `primaryImage.url` como fallback obligatorio, manteniendo `next/image`, `sizes` en frontend y sin tocar backend.

## Alcance

- Tipado Storefront para `primaryImage.responsive.variants[]`.
- Helper seguro para filtrar, ordenar y deduplicar variants responsive.
- `ProductImageFrame` con loader conservador de `next/image`.
- Paso de props responsive desde home, listado, categoria y detalle de producto.
- Sin cambios en backend, contrato publico, gallery, AVIF, cache avanzada ni infraestructura.

## Archivos Tocados

- `storefront/types/storefront.ts`
- `storefront/lib/images.ts`
- `storefront/components/ui/product-image-frame.tsx`
- `storefront/components/catalog/product-card.tsx`
- `storefront/app/page.tsx`
- `storefront/app/productos/page.tsx`
- `storefront/app/categorias/[slug]/page.tsx`
- `storefront/app/productos/[slug]/page.tsx`
- `docs/qa/PHASE2S10D_G_STOREFRONT_RESPONSIVE_CONSUMPTION_QA.md`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`

## Reglas Validadas

- `primaryImage.url` sigue siendo fallback obligatorio.
- `responsive.variants` es opcional.
- Si `responsive` no existe o `variants` esta vacio, el Storefront se comporta igual que antes.
- Variants invalidas se filtran si:
  - URL no pasa sanitizacion.
  - `mimeType !== image/webp`.
  - `width <= 0` o `height <= 0`.
- Las variants validas se ordenan por `width asc`.
- Las variants validas se deduplican por `width` y `url`.
- No se usan variants si `primaryImage.url` no pasa sanitizacion.
- `ProductImageFrame` sigue usando `next/image`.
- `ProductImageFrame` mantiene `sizes` en frontend.
- No se uso `<picture>`.
- No se cambio a `<img>`.
- No se toco gallery.
- No se implemento AVIF.
- No se implemento cache avanzada.

## Checks Ejecutados

### Build

Comando:

```powershell
npm run build
```

Resultado:

- PASS.
- `next build` completo sin errores.
- Warning no bloqueante heredado: deteccion de multiples lockfiles/Turbopack root.

### Lint

Comando:

```powershell
npm run lint
```

Resultado:

- PASS.

### TypeScript

Comando:

```powershell
npx tsc --noEmit
```

Resultado:

- PASS.

## Rutas Revisadas

- Verificacion runtime directa de `/`, `/productos`, `/categorias/[slug]` y `/productos/[slug]` no se ejecuto en esta subfase.
- Motivo: el Storefront consume backend vivo via `STOREFRONT_API_BASE_URL` / `http://localhost:8080`, y esta fase no orquesto servidor backend local ni deploy/staging por alcance.
- Evidencia usada en su lugar:
  - `next build` exitoso sobre rutas App Router afectadas.
  - `tsc --noEmit` verde.
  - `eslint` verde.
  - Contrato backend ya validado en F/F2/F3.

## Resumen Tecnico

- `storefront/types/storefront.ts` ahora representa `responsive.variants[]` opcional.
- `storefront/lib/images.ts` concentra sanitizacion y seleccion segura de variants responsive.
- `ProductImageFrame` recibe `responsiveVariants` opcional y solo aplica loader custom si hay variants validas.
- El loader elige la variant valida mas cercana al width solicitado por Next; si no encuentra una adecuada, usa `src` fallback.
- Home/listado/categoria/detalle siguen pasando `primaryImage.url` saneada y ahora tambien variants saneadas.

## Confirmaciones

- `primaryImage.url` sigue presente como fallback obligatorio.
- `responsive.variants` sigue siendo opcional.
- `sizes` permanece en frontend dentro de `ProductImageFrame`.
- `next/image` se mantiene.
- No se uso `<picture>`.
- No se cambio a `<img>`.
- No se toco backend.
- No se toco infraestructura.
- No se toco gallery.
- No se implemento AVIF; sigue deferred/blocked.
- No se implemento cache avanzada; sigue diferida.

## Riesgos Residuales

- No hay tests frontend automaticos dedicados; la validacion depende de build/lint/typecheck y futura revision visual manual.
- El loader custom depende de que Next solicite widths compatibles con `sizes`; si la grilla cambia mucho en el futuro, conviene revisar `sizes` por contexto.
- No se ejecuto smoke runtime de rutas con backend vivo en esta subfase.
- Warning de multiples lockfiles/Turbopack root sigue siendo deuda no bloqueante heredada.

## Resultado

- PASS local.
