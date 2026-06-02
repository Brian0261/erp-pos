# ADR-021 — Storefront Tech Stack: Next.js 16, App Router, TypeScript, Tailwind CSS

## Estado

Propuesto para Fase 2E.0 documental.

## Contexto

InkToy ya aprobo Fase 2D:

- Next.js sera la futura Storefront publica SEO-first.
- `storefront/` sera la ubicacion raiz separada de `frontend/` Angular.
- Storefront API read-only ya existe en Spring Boot bajo `/api/v1/storefront/...`.
- SSG/ISR sera la estrategia principal; SSR diferido.

Antes de crear `storefront/` o instalar dependencias, se debe cerrar el stack tecnico minimo para evitar retrabajo, incompatibilidades y decisiones implicitas.

## Decision

### Next.js

Usar **Next.js 16** (version estable/LTS actual al momento de esta decision) para el proyecto nuevo. Next.js 16 mantiene App Router maduro, Metadata API estable, fetch extendido y compatibilidad con la mayor parte del ecosistema React 19.

### App Router

**Obligatorio.** No se usara Pages Router. App Router ofrece:

- Server Components por defecto.
- Metadata API por pagina para SEO.
- `generateStaticParams` para SSG/ISR futuro.
- Layouts anidados.
- Streaming y Suspense integrados.

### TypeScript

**Obligatorio.** Todo el codigo de `storefront/` debe usar TypeScript (`.ts` y `.tsx`). Reduce errores de contrato con el backend y mejora mantenibilidad.

### Package manager

**npm** como package manager inicial. Viene con Node.js, no requiere instalacion adicional ni cambios de configuracion de equipo.

### Estilos

**Tailwind CSS** como base visual inicial. No se construira un Design System completo en esta fase, pero Tailwind permite iteracion rapida y alineacion futura con los design tokens de InkToy.

### Carpeta del proyecto

`storefront/` sera la carpeta raiz del proyecto Next.js, al mismo nivel que `backend/` y `frontend/`. **No se crea en Fase 2E.0 documental.** Solo se define en este ADR.

### Variables de entorno

En fase tecnica futura se creara `storefront/.env.local.example` (commiteable, sin valores reales) y se ignorara `storefront/.env.local` via `.gitignore`. No se modificara `.env` raiz del ERP.

Reglas:

- No usar `NEXT_PUBLIC_` para secretos, tokens ni URLs internas sensibles.
- `NEXT_PUBLIC_API_URL` solo puede exponer la URL base publica de Storefront API.
- Variables de conexion, credenciales y configuracion de servidor deben omitir `NEXT_PUBLIC_`.

### Consumo de API

El wrapper de API debe ejecutarse **server-side por defecto** (Server Components, Route Handlers o server actions). El cliente solo recibe datos ya filtrados y publicos. No se consultara la base de datos directamente desde Next.js.

En Fase 2E.0 no se implementa el wrapper funcional; solo se define la estrategia contractual.

### robots.txt

En el shell futuro, `public/robots.txt` debe contener:

```text
User-agent: *
Disallow: /
```

Mientras no exista un ambiente productivo aprobado con contenido indexable, todo debe quedar bloqueado a crawlers.

### Paginas reales y sitemap

- `/productos/{slug}` y `/categorias/{slug}` quedan para fase posterior (Fase 2F o superior).
- `sitemap.xml` real queda para fase posterior; se generara dinamicamente desde `GET /api/v1/storefront/seo/sitemap`.

## Fuera de alcance de Fase 2E.0

Fase 2E.0 no implementa ni autoriza:

- Crear `storefront/`.
- Instalar Next.js ni dependencias.
- Crear paginas reales.
- Consumir endpoints reales.
- Crear `sitemap.xml` real.
- Crear `robots.txt` productivo.
- Checkout, pagos, pedidos, delivery, Merchant Center ni stock reservado.
- AWS/staging.
- Docker.
- Modificar `.env` raiz.
- Tocar backend funcional.
- Tocar frontend Angular.
- Tocar Flyway/DB.

## Consecuencias

- Next.js 16 + App Router + TypeScript es el estandar actual para ecommerce SEO-first.
- Tailwind acelera la primera iteracion visual sin comprometer evolucion futura.
- npm reduce friccion de onboarding.
- La separacion `storefront/` / `frontend/` queda definida y no se rompe.

## Criterios de aceptacion

Este ADR queda aprobado cuando:

1. Se confirma Next.js 16 como version objetivo.
2. Se confirma App Router obligatorio.
3. Se confirma TypeScript obligatorio.
4. Se confirma npm como package manager.
5. Se confirma Tailwind CSS como base visual inicial.
6. Se documenta la estrategia de variables de entorno.
7. Se documenta que el wrapper API sera server-side por defecto.
8. Se documenta el bloqueo de crawlers en robots.txt del shell futuro.
9. Se documenta que paginas reales y sitemap quedan para fase posterior.
10. El alcance prohibido queda explicito.
