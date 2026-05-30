# ADR-002 — Dominios, entornos y estrategia local/staging/producción para InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS es un sistema empresarial para una tienda real de papelería, útiles escolares, artículos escolares y pasamanería. El sistema actual utiliza Java Spring Boot 3.x, PostgreSQL, frontend interno Angular, Docker local y arquitectura hexagonal estricta.

El ADR-001 — Arquitectura ecommerce SEO-first para InkToy ya fue aprobado. Ese ADR definió que la futura tienda online usará:

- tienda pública en Next.js con SSR/SSG/ISR;
- ERP/POS Spring Boot como fuente de verdad;
- Storefront API/BFF como capa pública/controlada;
- Angular actual solo como ERP interno;
- PostgreSQL como base principal del ERP/POS;
- REST primero y eventos RabbitMQ/AWS SQS después;
- trabajo inicial en local;
- AWS/staging actualizado más adelante, cuando exista una fase local estable.

Actualmente existe un entorno staging en AWS Lightsail bajo `staging.inktoy.pe`, con Docker Compose, Caddy y HTTPS. Sin embargo, ese entorno está desactualizado frente al desarrollo local y no debe bloquear el avance de la arquitectura ecommerce.

El dominio comprado para la marca es:

```text
inktoy.pe
```

La futura tienda online debe usar el dominio principal para concentrar autoridad SEO. El ERP interno, la API pública/controlada y staging deben quedar separados para reducir riesgos de seguridad, evitar confusión entre entornos y permitir despliegues progresivos.

## Problema

Se debe definir formalmente cómo se organizarán los dominios, subdominios y entornos de InkToy antes de implementar tienda online, Storefront API, checkout, Mercado Pago o producción.

La decisión debe resolver:

- qué dominio usará la tienda pública;
- dónde vivirá el ERP/POS interno;
- qué dominio usará la API pública/controlada;
- cómo se mantendrá staging;
- cómo se trabajará localmente;
- cuándo se actualizará AWS/staging;
- cómo evitar mezclar configuraciones, secretos o datos entre entornos;
- cómo evitar que staging sea indexado por Google;
- cómo evitar exponer endpoints internos como API pública.

Si se mezclan dominios, entornos o configuraciones, los riesgos serían:

- staging indexado por Google;
- ERP interno expuesto como si fuera tienda pública;
- CORS inseguro o demasiado permisivo;
- cookies mal configuradas entre subdominios;
- secretos de staging usados en producción o viceversa;
- endpoints internos expuestos en `api.inktoy.pe`;
- pérdida de autoridad SEO por duplicidad `www`/no-`www`;
- confusión entre datos reales, datos staging y datos locales;
- despliegues difíciles de reproducir;
- problemas al integrar Mercado Pago, webhooks y futuras APIs públicas.

## Decisión

Se adopta la siguiente estrategia de dominios y entornos:

| Dominio / entorno | Uso aprobado |
|---|---|
| `inktoy.pe` | Tienda pública SEO-first en Next.js |
| `www.inktoy.pe` | Redirección 301 hacia `inktoy.pe` |
| `app.inktoy.pe` | ERP/POS interno Angular |
| `api.inktoy.pe` | Storefront API / API pública controlada |
| `staging.inktoy.pe` | Staging interno controlado |
| Local | Base inicial de desarrollo ecommerce |

La implementación inicial continuará en local, tomando el ERP/POS local como base de trabajo.

AWS/staging no debe actualizarse todavía. Se actualizará cuando exista una fase local estable con:

- decisiones ADR aprobadas;
- contratos preliminares;
- migraciones probadas localmente;
- Storefront API básica o primer vertical slice estable;
- Docker Compose actualizado;
- variables documentadas;
- feature flags definidos;
- QA local aprobado.

## Arquitectura de entornos

### Local

El entorno local será la base inicial de desarrollo.

Uso:

- diseño de ADRs;
- desarrollo backend ERP/POS;
- pruebas de migraciones;
- pruebas de Storefront API;
- pruebas del frontend Angular interno;
- futura tienda Next.js local;
- validaciones unitarias, integración y build.

Reglas:

- no depender de AWS para avanzar;
- toda decisión debe quedar documentada;
- toda nueva variable debe reflejarse en `.env.example`;
- toda migración debe probarse localmente antes de staging;
- los feature flags ecommerce deben iniciar desactivados.

Variables esperadas a futuro:

```text
ECOMMERCE_ENABLED=false
STOREFRONT_API_ENABLED=false
ONLINE_CHECKOUT_ENABLED=false
MERCADO_PAGO_ENABLED=false
AUTO_BILLING_ENABLED=false
```

### Staging

El staging actual vive en:

```text
staging.inktoy.pe
```

Uso recomendado:

- pruebas internas;
- QA por roles;
- validación de despliegue;
- pruebas HTTPS;
- pruebas CORS reales;
- pruebas futuras de integración sandbox;
- nunca producción.

Reglas:

- no usar datos reales sensibles hasta completar hardening;
- no usar credenciales seed en staging compartido;
- no exponer PostgreSQL;
- no exponer backend interno directamente;
- no permitir indexación;
- mantener HTTPS;
- mantener backups;
- mantener variables separadas de producción;
- no activar Mercado Pago productivo.

Cuando staging se actualice en fases futuras, se podrá evaluar si conviene separar también:

```text
staging.inktoy.pe
staging-api.inktoy.pe
staging-store.inktoy.pe
```

No es obligatorio crear esos subdominios ahora, pero la arquitectura debe permitirlos.

### Producción

Producción futura usará:

```text
inktoy.pe
app.inktoy.pe
api.inktoy.pe
```

Uso:

- `inktoy.pe`: tienda pública SEO.
- `app.inktoy.pe`: ERP/POS interno para trabajadores.
- `api.inktoy.pe`: API pública/controlada.

Reglas:

- solo producción puede usar datos reales;
- solo producción puede usar credenciales productivas;
- Mercado Pago productivo solo en producción;
- facturación electrónica productiva solo con configuración real;
- WAF/CDN recomendado desde el inicio público;
- monitoreo, backups y logging seguro obligatorios.

### Futuro entorno de tienda pública

La tienda pública se construirá en Next.js y vivirá en:

```text
inktoy.pe
```

Debe priorizar:

- SSR/SSG/ISR;
- URLs limpias;
- Core Web Vitals;
- sitemap;
- robots.txt;
- canonical;
- schema.org;
- Merchant Center;
- seguridad pública;
- caché controlado.

No debe compartir frontend con Angular ERP interno.

### Futuro entorno API

La API pública/controlada vivirá en:

```text
api.inktoy.pe
```

Debe exponer únicamente contratos públicos diseñados para ecommerce, por ejemplo:

```text
/api/v1/storefront/products
/api/v1/storefront/products/{slug}
/api/v1/storefront/categories
/api/v1/storefront/brands
/api/v1/storefront/cart/validate
/api/v1/storefront/orders
/api/v1/webhooks/mercado-pago
```

`api.inktoy.pe` no debe ser un alias directo del backend interno. No debe exponer endpoints internos de ERP/POS, POS, caja, inventario operativo, ventas internas o reportes administrativos.

## Estrategia de dominios

### Dominio raíz

```text
inktoy.pe
```

Será el dominio principal de la tienda pública.

Motivo:

- concentra autoridad SEO;
- representa la marca;
- es más recordable;
- evita dividir señales SEO entre subdominios innecesarios.

### `www.inktoy.pe`

Debe redirigir permanentemente a `inktoy.pe`:

```text
www.inktoy.pe -> 301 -> inktoy.pe
```

La versión canónica será `inktoy.pe`.

### ERP interno

El ERP/POS interno usará:

```text
app.inktoy.pe
```

Este subdominio alojará el frontend Angular interno y será usado por trabajadores autorizados.

### API pública/controlada

La API pública/controlada usará:

```text
api.inktoy.pe
```

Debe servir como entrada controlada para Storefront API/BFF, webhooks y contratos públicos definidos. No debe exponer directamente endpoints internos.

### Staging

```text
staging.inktoy.pe
```

Debe seguir siendo entorno interno.

Debe tener:

- `noindex`;
- protección por credenciales seguras;
- datos no sensibles;
- secretos separados;
- CORS específico;
- puertos cerrados;
- backups;
- QA controlado.

### HTTPS

Todos los entornos accesibles por navegador deben usar HTTPS:

- tienda pública;
- ERP interno;
- API pública;
- staging.

En local se puede usar HTTP, salvo pruebas específicas de cookies, CORS o webhooks donde sea necesario simular HTTPS.

### CORS

CORS debe ser explícito por entorno.

Ejemplo conceptual:

```text
Local:
- http://localhost:4200
- http://localhost:3000

Staging:
- https://staging.inktoy.pe
- futuro https://staging-store.inktoy.pe si aplica

Producción:
- https://inktoy.pe
- https://app.inktoy.pe
```

No se debe usar `*` para endpoints autenticados o sensibles.

### Cookies

Si en el futuro se usan cookies para sesión de clientes o ERP, deben separarse por dominio/subdominio y entorno.

Reglas:

- cookies seguras en producción: `Secure`, `HttpOnly`, `SameSite`;
- no compartir cookies del ERP interno con la tienda pública;
- no usar cookies amplias para `.inktoy.pe` salvo decisión explícita y justificada;
- checkout y cuentas de cliente deben tener política propia.

### Seguridad por subdominio

| Subdominio | Política |
|---|---|
| `inktoy.pe` | Público, CDN/WAF, caché, SEO |
| `app.inktoy.pe` | Interno, autenticación, RBAC y controles adicionales |
| `api.inktoy.pe` | Rate limiting, CORS estricto, validación server-side |
| `staging.inktoy.pe` | Noindex, credenciales rotadas, datos no sensibles |

## Alternativas consideradas

| Alternativa | Motivo por el que no se elige |
|---|---|
| Usar todo bajo `inktoy.pe` con rutas como `/app`, `/api`, `/store` | Mezcla SEO, ERP interno y API pública. Aumenta riesgo de seguridad, cookies mal configuradas y caché incorrecto. |
| Usar staging como base inmediata | Staging está desactualizado y tiene pendientes de hardening. No debe bloquear el desarrollo local ni usarse como base ecommerce aún. |
| Usar el mismo dominio para ERP y tienda | Mezcla tráfico público con operación interna. Riesgo de exposición, problemas de seguridad y confusión operativa. |
| Exponer backend interno bajo `api.inktoy.pe` | Los endpoints internos no fueron diseñados como API pública. Debe existir Storefront API/BFF con contratos controlados. |
| Actualizar AWS antes de trabajar local | Puede consumir tiempo de infraestructura antes de cerrar arquitectura, contratos y modelo ecommerce. Mejor local primero. |

## Justificación

### SEO

Usar `inktoy.pe` como tienda pública concentra autoridad SEO y evita dividir señales entre subdominios. La redirección 301 de `www` evita duplicidad. Staging debe quedar fuera del índice para no generar contenido duplicado o páginas de prueba indexadas.

### Seguridad

Separar tienda, ERP interno y API reduce superficie de ataque. Permite aplicar CORS, cookies, WAF, rate limiting, caché y autenticación de forma distinta por subdominio.

### Mantenibilidad

Separar entornos evita que cambios de ecommerce rompan la operación interna. También permite mantener variables, secretos y despliegues diferenciados.

### Separación operativa

El ERP interno es para trabajadores. La tienda pública es para clientes. La API pública es para contratos controlados. Staging es para QA. Mezclarlos haría más difícil operar el sistema con seguridad.

### Bajo riesgo

Trabajar primero en local evita que AWS/staging desactualizado bloquee el diseño ecommerce. Actualizar staging después de un vertical slice estable reduce retrabajo.

### Despliegue progresivo

La estrategia permite avanzar en fases:

1. local;
2. Storefront API básica;
3. tienda Next.js local;
4. staging actualizado;
5. staging ecommerce;
6. producción.

## Consecuencias positivas

- Claridad entre tienda pública, ERP interno, API y staging.
- Menor riesgo de exponer módulos internos.
- Mejor base SEO para `inktoy.pe`.
- Mejor control de CORS y cookies.
- Staging no bloquea el avance local.
- Menor riesgo de usar credenciales o datos del entorno equivocado.
- Facilita feature flags por entorno.
- Permite actualización progresiva de AWS/staging.
- Prepara futura integración con Mercado Pago, Storefront API y tienda Next.js.

## Consecuencias negativas o costos

- Se deberán administrar varios subdominios.
- Habrá más configuración de DNS, HTTPS, CORS y variables.
- En el futuro se requerirá ajustar Docker/Caddy o infraestructura para más aplicaciones.
- El equipo deberá mantener documentación de entornos actualizada.
- Habrá que cuidar redirecciones, canonical y `robots.txt`.
- La separación puede parecer más compleja al inicio, pero evita riesgos mayores después.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| CORS mal configurado | Definir allowed origins por entorno; no usar comodines en endpoints sensibles. |
| Exposición accidental del ERP | Mantener ERP en `app.inktoy.pe` y no publicar endpoints internos en `api.inktoy.pe`. |
| Confusión entre staging y producción | Variables, nombres de dominio, banners visuales y datos separados. |
| Variables de entorno mezcladas | `.env` por entorno, `.env.example` sin secretos y documentación de variables. |
| Secretos filtrados | Nunca subir `.env`, certificados, JWT secrets ni credenciales reales. |
| Cookies mal configuradas | No compartir cookies entre tienda y ERP salvo decisión explícita. Usar `Secure`, `HttpOnly`, `SameSite`. |
| Duplicidad `www`/no-`www` | Redirección 301 y canonical único. |
| Staging indexado por Google | `noindex`, robots restrictivo y, si aplica, protección adicional. |
| Backend interno expuesto como API pública | Storefront API/BFF separada y contratos públicos mínimos. |
| AWS/staging se aleja demasiado de local | Documentar cambios, usar feature flags y actualizar staging al cerrar vertical slice estable. |

## Reglas obligatorias

1. No usar staging como producción.
2. No cargar datos reales sensibles en staging sin hardening.
3. No exponer PostgreSQL públicamente.
4. No exponer backend interno directamente a internet.
5. No exponer endpoints internos como API pública.
6. No actualizar AWS/staging hasta tener una fase local estable.
7. No permitir indexación de staging.
8. No mezclar secretos entre entornos.
9. No usar credenciales seed en entornos compartidos.
10. No usar `*` como CORS para endpoints sensibles.
11. No compartir cookies de ERP interno con tienda pública.
12. No desplegar Mercado Pago productivo en staging.
13. No usar `api.inktoy.pe` como alias del backend interno.
14. No activar checkout online en producción sin feature flag.
15. No omitir redirección canónica entre `www` y no-`www`.

## Impacto técnico

### Configuración frontend

Angular interno debe apuntar a su API según entorno. La futura tienda Next.js tendrá su propia configuración:

```text
NEXT_PUBLIC_STOREFRONT_API_BASE_URL
```

No debe reutilizar configuración del Angular interno.

### Configuración backend

El backend deberá diferenciar:

- origins locales;
- origins staging;
- origins producción;
- endpoints internos;
- endpoints storefront;
- webhooks.

### CORS

Se requerirá una estrategia explícita por entorno y subdominio.

### Docker Compose

En local podrá ampliarse para incluir Next.js y, eventualmente, BFF. En staging/producción se decidirá después si se mantiene Docker Compose o se evoluciona a infraestructura más robusta.

### Caddy / reverse proxy

El staging actual usa Caddy. En fases futuras, Caddy podría enrutar:

- frontend interno;
- API;
- tienda pública staging;
- healthchecks.

No debe modificarse todavía.

### Variables `.env`

Toda variable nueva debe documentarse en `.env.example` sin secretos reales.

Ejemplos futuros:

```text
ECOMMERCE_ENABLED
STOREFRONT_API_ENABLED
ONLINE_CHECKOUT_ENABLED
MERCADO_PAGO_ENABLED
AUTO_BILLING_ENABLED
STOREFRONT_ALLOWED_ORIGINS
```

### Storefront API

Debe diseñarse como capa pública, no como exposición del backend interno.

### Next.js futuro

Debe usar `inktoy.pe` y consumir Storefront API. No debe depender del Angular interno.

### Seguridad y SEO

La decisión afecta:

- robots.txt;
- sitemap;
- canonical;
- CORS;
- cookies;
- headers;
- WAF/CDN;
- rate limiting;
- protección de staging;
- separación de datos.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba que `inktoy.pe` será la tienda pública SEO-first.
2. Se aprueba que `www.inktoy.pe` redirigirá 301 a `inktoy.pe`.
3. Se aprueba que `app.inktoy.pe` será el ERP/POS interno.
4. Se aprueba que `api.inktoy.pe` será API pública/controlada, no alias del backend interno.
5. Se aprueba que `staging.inktoy.pe` seguirá siendo staging interno.
6. Se aprueba trabajar primero en local.
7. Se aprueba no actualizar AWS/staging hasta tener una fase local estable.
8. Se documentan las reglas de CORS por entorno.
9. Se documenta que staging no debe indexarse.
10. Se documenta que no se deben mezclar secretos ni credenciales entre entornos.
11. Se documenta que PostgreSQL y backend interno no deben exponerse públicamente.
12. No quedan decisiones de dominio/entorno que bloqueen la Fase 1 de catálogo online.

## Qué NO hacer todavía

En esta etapa no se debe:

- tocar AWS/staging;
- cambiar DNS;
- crear tienda Next.js;
- crear `api.inktoy.pe`;
- modificar CORS;
- crear endpoints;
- modificar Docker Compose;
- modificar Caddy;
- crear migraciones;
- tocar DB/Flyway;
- instalar dependencias;
- implementar código;
- activar feature flags ecommerce;
- configurar Mercado Pago;
- configurar producción;
- cambiar certificados;
- hacer deploy.

## Decisión resultante

InkToy usará `inktoy.pe` como tienda pública SEO-first, `app.inktoy.pe` como ERP/POS interno, `api.inktoy.pe` como Storefront API/API pública controlada y `staging.inktoy.pe` como staging interno.

El desarrollo ecommerce continuará primero en local. AWS/staging se actualizará más adelante, cuando exista una fase local estable, contratos definidos, variables documentadas, migraciones probadas y QA local aprobado.
