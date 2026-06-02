# QA Checklist - Fase 2E Storefront MVP Shell

## Estado

Checklist actualizado en Fase 2E.2 para registrar los resultados reales de la implementacion del shell Next.js en `storefront/`.

## Stack tecnico validado

- [x] ADR Storefront Tech Stack creado: `docs/adr/ecommerce/ECOM-ADR-021-storefront-tech-stack.md`.
- [x] Plan MVP Shell creado: `docs/ecommerce/STOREFRONT_MVP_SHELL_PLAN.md`.
- [x] Next.js 16.2.7 confirmado como version estable instalada.
- [x] App Router confirmado como obligatorio.
- [x] TypeScript confirmado como obligatorio.
- [x] npm confirmado como package manager.
- [x] Tailwind CSS confirmado como base visual inicial.

## Arquitectura y estructura

- [x] `storefront/` creada como carpeta raiz, al mismo nivel que `backend/` y `frontend/`.
- [x] `frontend/` Angular queda solo para ERP/POS interno.
- [x] Estructura creada: `app/`, `lib/`, `types/`, `public/`.
- [x] `.env.local.example` creado como plantilla commiteable; `.env.local` real ignorado.
- [x] Estrategia de variables de entorno respetada: sin `NEXT_PUBLIC_` para secretos.

## API y seguridad

- [x] Wrapper API creado en `lib/api.ts` como server-side por defecto.
- [x] Sin consulta directa a base de datos desde Next.js.
- [x] Sin consumo de `/api/v1/ecommerce-admin/...`.
- [x] Sin exposicion de DTOs administrativos.

## SEO y crawlers

- [x] `robots.txt` creado bloqueando crawlers (`User-agent: * Disallow: /`).
- [x] Layout raiz con `robots: { index: false, follow: false }`.
- [x] Sin `sitemap.xml` real.
- [x] Sin paginas reales `/productos/{slug}` ni `/categorias/{slug}`.

## Resultados de validacion

- [x] `npm run build`: OK, Next.js 16.2.7 compilado correctamente.
- [x] `npm run lint`: OK, sin errores.
- [x] `npx tsc --noEmit`: OK, sin errores de tipo.

## Deudas no bloqueantes registradas

- [ ] 2 vulnerabilidades moderadas en `postcss` (dependencia transitiva de Next.js 16).
- [ ] Warning Turbopack por multiples lockfiles.
- [ ] README.md generico de `create-next-app` (actualizar en fase posterior).
- [ ] SVGs default de Next.js/Vercel en `storefront/public/` (limpiar en fase posterior).

## Restricciones de no implementacion

- [x] Sin paginas reales de producto/categoria.
- [x] Sin consumo real de endpoints Storefront.
- [x] Sin `sitemap.xml` real.
- [x] Sin checkout, pagos, pedidos, delivery, Merchant Center ni stock reservado.
- [x] Sin AWS/staging.
- [x] Sin Docker nuevo.
- [x] Sin modificar `.env` raiz.
- [x] Sin tocar backend funcional.
- [x] Sin tocar frontend Angular.
- [x] Sin tocar Flyway/DB.

## Evidencia documental

- [x] Roadmap actualizado con cierre de 2E.1 y estado 2E.2.
- [x] Backlog actualizado con historias 2E.1 implementadas.
- [x] Current status actualizado con Fase 2E.1 implementada.
- [x] Change control actualizado con commit `c049e3e`.

## Recomendacion QA

Fase 2E.1 esta lista para commit (ya pusheada en `c049e3e`). Fase 2E.2 documental cierra la trazabilidad del shell. El siguiente paso recomendado es preparar Fase 2F Public SEO Catalog MVP en Plan Mode.
