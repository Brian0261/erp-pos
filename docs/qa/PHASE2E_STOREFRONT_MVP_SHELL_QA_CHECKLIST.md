# QA Checklist - Fase 2E Storefront MVP Shell

## Estado

Checklist documental para validar Fase 2E.0: decision tecnica del shell Next.js. No ejecuta runtime, no crea `storefront/` y no implementa codigo funcional.

## Stack tecnico validado

- [x] ADR Storefront Tech Stack creado: `docs/adr/ecommerce/ECOM-ADR-021-storefront-tech-stack.md`.
- [x] Plan MVP Shell creado: `docs/ecommerce/STOREFRONT_MVP_SHELL_PLAN.md`.
- [x] Next.js 16 confirmado como version objetivo estable/LTS.
- [x] App Router confirmado como obligatorio.
- [x] TypeScript confirmado como obligatorio.
- [x] npm confirmado como package manager.
- [x] Tailwind CSS confirmado como base visual inicial.

## Arquitectura y estructura

- [x] `storefront/` definida como carpeta raiz futura, al mismo nivel que `backend/` y `frontend/`.
- [x] `frontend/` Angular queda solo para ERP/POS interno.
- [x] Estructura de carpetas interna documentada: `app/`, `components/`, `lib/`, `types/`, `public/`.
- [x] `.env.local.example` definido como plantilla commiteable; `.env.local` real ignorado.
- [x] Estrategia de variables de entorno documentada: no usar `NEXT_PUBLIC_` para secretos.

## API y seguridad

- [x] Wrapper API definido como server-side por defecto.
- [x] Sin consulta directa a base de datos desde Next.js.
- [x] Sin consumo de `/api/v1/ecommerce-admin/...`.
- [x] Sin exposicion de DTOs administrativos.

## SEO y crawlers

- [x] `robots.txt` futuro definido para bloquear crawlers durante desarrollo (`Disallow: /`).
- [x] Paginas placeholder definidas como `noindex`.
- [x] Sin `sitemap.xml` real en esta fase.
- [x] Paginas reales `/productos/{slug}` y `/categorias/{slug}` diferidas.

## Restricciones de no implementacion

- [x] Sin crear `storefront/`.
- [x] Sin instalar Next.js.
- [x] Sin instalar dependencias.
- [x] Sin crear paginas reales.
- [x] Sin consumir endpoints reales.
- [x] Sin `sitemap.xml` real.
- [x] Sin `robots.txt` productivo.
- [x] Sin checkout, pagos, pedidos, delivery, Merchant Center ni stock reservado.
- [x] Sin AWS/staging.
- [x] Sin Docker nuevo.
- [x] Sin modificar `.env` raiz.
- [x] Sin tocar backend funcional.
- [x] Sin tocar frontend Angular.
- [x] Sin tocar Flyway/DB.

## Evidencia documental

- [x] Roadmap actualizado con Fase 2E.
- [x] Backlog actualizado con historias Fase 2E.
- [x] Current status actualizado con Fase 2E iniciada.
- [x] Change control actualizado con alcance, archivos y restricciones.

## Criterio de salida QA documental

Fase 2E.0 queda lista para revision humana si:

1. Los documentos creados y actualizados son consistentes entre si.
2. No existen cambios fuera de `docs/`.
3. No se creo `storefront/` ni se instalaron dependencias.
4. No se toco codigo funcional, entorno ni infraestructura.
5. `git diff --check` no reporta errores.

## Recomendacion QA

Antes de cualquier commit, validar que Fase 2E tecnica futura quede correctamente acotada como shell minimo y no como tienda transaccional ni como avance prematuro de paginas SEO reales.
