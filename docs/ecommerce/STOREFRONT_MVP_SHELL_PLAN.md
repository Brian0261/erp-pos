# Storefront MVP Shell Plan - Fase 2E

## Estado

Plan tecnico de Fase 2E. Fase 2E.0 documental cerrada. Fase 2E.1 implementacion completada (commit `c049e3e`). Este plan refleja la estructura real creada en `storefront/`.

## Objetivo

Definir el shell tecnico minimo de la futura Storefront Next.js en `storefront/`, incluyendo versiones, estructura, configuracion base y capas iniciales. Este plan sirve como entrada tecnica para la fase de implementacion posterior.

## Stack confirmado

| Tecnologia | Decision | Justificacion |
|---|---|---|
| Next.js | 16 (estable/LTS) | App Router maduro, Metadata API, fetch extendido. |
| App Router | Obligatorio | Server Components por defecto, metadata por pagina, layouts anidados. |
| TypeScript | Obligatorio | Reduccion de errores de contrato, mejor DX, alineado con Angular interno. |
| npm | Package manager inicial | Incluido con Node.js, sin friccion de equipo. |
| Tailwind CSS | Base visual inicial | Iteracion rapida, alineacion futura con design tokens InkToy. |

## Estructura de carpetas futura

Cuando se autorice crear `storefront/`:

```text
storefront/
├── .env.local.example          # Plantilla commiteable sin valores reales
├── .gitignore                  # Ignora .env.local, node_modules, .next
├── next.config.ts              # output: 'standalone', imagenes, rewrites
├── package.json                # next, react, react-dom, typescript, tailwindcss
├── tsconfig.json               # Estricto, paths alias si aplica
├── tailwind.config.ts          # Theme basico, content paths
├── postcss.config.mjs          # Procesamiento Tailwind
├── public/
│   └── robots.txt              # Bloquea crawlers durante desarrollo
├── app/
│   ├── layout.tsx              # Metadata base, fuente, providers
│   ├── page.tsx                # Placeholder home (noindex, no funcional)
│   ├── globals.css             # Tailwind directives + estilos base
│   └── loading.tsx             # Loading state minimal
├── components/
│   └── ui/                     # Componentes base (button, input, card)
├── lib/
│   └── api.ts                  # Wrapper fetch server-side hacia Storefront API
├── types/
│   └── storefront.ts           # Tipos TypeScript de contratos publicos
└── README.md                   # Instrucciones de instalacion y dev
```

## Configuracion base propuesta

### next.config.ts

- `output: 'standalone'` para Docker futuro.
- `images.remotePatterns` preparado para dominio de imagenes futuro.
- Sin `trailingSlash` forzado.

### Metadata base (layout.tsx)

- Title: "InkToy - Utiles escolares y pasamaneria" (placeholder).
- Description: placeholder operativo.
- `robots: { index: false }` en todas las paginas placeholder.

### Variables de entorno (.env.local.example)

```bash
# URL publica de Storefront API (no secreta, puede ser NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Reglas:

- `.env.local` real se ignora en `.gitignore`.
- Nunca commitear valores reales.
- No usar `NEXT_PUBLIC_` para secretos ni URLs internas.

### API wrapper (lib/api.ts)

Estrategia definida (no implementada en esta fase):

- Server Components o Route Handlers por defecto.
- Fetch nativo de Next.js con cache controlado.
- Manejo de errores HTTP con mensajes publicos seguros.
- Sin consulta directa a base de datos.

## Paginas placeholder

| Ruta | Estado en shell | Renderizado |
|---|---|---|
| `/` | Placeholder home basico | Static |
| `/productos` | Placeholder vacio, noindex | Static |
| `/categorias` | Placeholder vacio, noindex | Static |

- Sin rutas dinamicas `[slug]` todavia.
- Sin filtros, busqueda, paginacion.

## SEO inicial del shell

- Metadata base en layout raiz.
- Todas las paginas placeholder con `robots: { index: false }`.
- `robots.txt` en `public/`: `User-agent: * Disallow: /`.
- Sin `sitemap.xml` real.

## Comandos de desarrollo futuros

```bash
npm run dev      # localhost:3000
npm run build    # Compilacion para produccion
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

## Criterios de salida del shell tecnico — Estado REAL (Fase 2E.1)

1. `storefront/` creada con estructura definida. ✅
2. `npm run dev` levanta sin errores. ✅
3. `npm run build` compila sin errores. ✅
4. Metadata base presente. ✅
5. `robots.txt` bloquea crawlers. ✅
6. Wrapper de API compilable (sin consumir endpoints reales todavia). ✅
7. Sin paginas reales funcionales. ✅
8. Sin tocar backend, Angular, Flyway, Docker raiz, `.env` raiz ni AWS/staging. ✅

## Fuera de alcance

- Crear `storefront/` en Fase 2E.0 documental.
- Instalar dependencias.
- Implementar paginas de producto/categoria reales.
- Consumir endpoints Storefront reales.
- Generar `sitemap.xml`.
- Checkout, pagos, pedidos, delivery, Merchant Center, stock reservado.
- AWS/staging, Docker, `.env` raiz.
- Backend funcional, frontend Angular, Flyway/DB.
