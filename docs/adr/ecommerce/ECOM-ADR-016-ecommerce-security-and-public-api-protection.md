# ADR-016 — Seguridad ecommerce y protección de APIs públicas para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, pedidos, ventas, facturación y operación interna. La futura tienda online SEO-first usará Next.js en `inktoy.pe` y consumirá datos mediante Storefront API/BFF desde `api.inktoy.pe`.

ADRs previos aprobados:

- ADR-001: Arquitectura ecommerce SEO-first.
- ADR-002: Dominios, entornos y estrategia local/staging/producción.
- ADR-003: Catálogo online y publicación de productos.
- ADR-004: Marcas.
- ADR-005: Variantes de producto.
- ADR-006: Slugs y URLs SEO.
- ADR-007: Imágenes y assets de producto.
- ADR-008: SEO metadata.
- ADR-009: Almacén online configurable, stock disponible online y stock reservado.
- ADR-010: Stock reservado, concurrencia y estrategia anti-sobreventa.
- ADR-011: Precios online, promociones futuras y reglas de cálculo.
- ADR-012: Pedidos online y lifecycle ecommerce.
- ADR-013: Mercado Pago, webhook e idempotencia.
- ADR-014: Facturación automática ecommerce.
- ADR-015: Delivery nacional y couriers.

Decisiones base ya aprobadas:

- La tienda pública estará en `inktoy.pe`.
- El ERP/POS interno estará en `app.inktoy.pe`.
- La Storefront API/API pública controlada estará en `api.inktoy.pe`.
- El ERP/POS Spring Boot no debe exponer endpoints internos directamente a la tienda pública.
- La tienda consumirá datos mediante Storefront API/BFF.
- El frontend nunca decide precios, stock, descuentos, totales, estado del pedido, estado del pago, costo de envío ni datos finales de facturación.
- Mercado Pago se integrará server-side.
- Los webhooks se validarán server-side y se procesarán con idempotencia.
- Pedido online, reserva de stock, pago, venta y facturación deberán ser transaccionales, auditables e idempotentes cuando corresponda.
- Delivery nacional manejará datos personales sensibles como nombre, celular, email, dirección y referencia.
- Storefront API no debe exponer datos internos, reglas internas, errores técnicos ni información sensible.

La seguridad es crítica porque la tienda será pública y estará expuesta a tráfico real, bots, scraping, ataques web, intentos de manipulación de precios, abuso de checkout, webhooks falsos, intentos de acceso indebido a pedidos, robo de datos personales y exposición accidental de endpoints internos.

## Problema

Se debe definir una estrategia formal de seguridad ecommerce para proteger la tienda pública, la Storefront API, el ERP/POS interno, los datos personales, los pagos, los pedidos, el stock, el delivery y la facturación.

La decisión debe resolver:

- cómo separar tienda pública, ERP interno, API pública y backend interno;
- cómo impedir que endpoints internos del ERP/POS queden expuestos;
- cómo proteger APIs públicas contra abuso;
- cómo aplicar CORS correctamente;
- cómo proteger consultas de pedido, tracking y comprobantes;
- cómo evitar IDOR;
- cómo validar precios, stock, envío, pago y facturación server-side;
- cómo proteger webhooks de Mercado Pago;
- cómo proteger datos personales;
- cómo administrar secretos;
- cómo registrar logs sin exponer información sensible;
- cómo auditar operaciones críticas;
- cómo preparar WAF/CDN, rate limiting, hardening y monitoreo para producción.

Riesgos si no se define seguridad desde el diseño:

- exposición de endpoints internos del ERP/POS;
- manipulación de precios, stock, envío o totales;
- pedidos falsos o duplicados;
- pagos inconsistentes;
- webhooks falsos o duplicados procesados incorrectamente;
- acceso no autorizado a pedidos, tracking o comprobantes;
- fuga de datos personales;
- scraping agresivo del catálogo;
- bots abusando del checkout;
- CORS abierto en producción;
- errores técnicos expuestos al cliente;
- secretos filtrados;
- staging indexado o expuesto;
- ERP interno accesible públicamente sin protección adecuada.

## Decisión

La seguridad ecommerce de InkToy se diseñará desde el inicio como parte de la arquitectura, no como una capa agregada al final.

Decisiones aprobadas:

1. Separar tienda pública, ERP interno y APIs públicas/controladas.
2. Usar Storefront API/BFF como única capa pública para ecommerce.
3. No exponer endpoints internos del ERP/POS directamente a la tienda pública.
4. Validar todo server-side.
5. Aplicar autenticación y autorización según tipo de endpoint.
6. Aplicar CORS restrictivo por dominio y entorno.
7. Proteger webhooks con validación, idempotencia y logging seguro.
8. Aplicar rate limiting y protección anti-abuso.
9. Proteger datos personales mediante minimización, autorización y logging seguro.
10. Usar WAF/CDN antes de producción.
11. Separar secretos por entorno.
12. Registrar auditoría en operaciones críticas.
13. No activar producción sin hardening, backups, monitoreo y checklist de seguridad.
14. No permitir que Next.js o el frontend público accedan directamente a APIs internas administrativas.
15. No confiar en datos enviados desde frontend para operaciones críticas.
16. No permitir consulta pública de pedidos, tracking o comprobantes sin token seguro, sesión o mecanismo equivalente.
17. No reutilizar DTOs internos administrativos como DTOs públicos de Storefront API.

Decisión central:

> InkToy tendrá una Storefront API/BFF pública y controlada como frontera de seguridad ecommerce. La tienda pública nunca consumirá directamente endpoints internos del ERP/POS. Toda operación crítica será validada server-side, auditada, protegida contra abuso e idempotente cuando corresponda.

## Modelo conceptual de seguridad

### PublicStorefront

Representa la tienda pública Next.js en `inktoy.pe`.

Puede acceder a:

- catálogo publicado;
- categorías públicas;
- marcas públicas;
- metadata SEO;
- imágenes públicas;
- validación de carrito;
- cálculo de envío;
- creación controlada de checkout;
- consulta pública segura de pedido.

No puede acceder directamente a:

- endpoints internos del ERP/POS;
- administración de catálogo;
- administración de stock;
- administración de precios;
- ventas internas;
- caja;
- facturación interna;
- configuración tributaria;
- usuarios internos;
- reportes internos.

### StorefrontAPI/BFF

Capa pública/controlada en `api.inktoy.pe`.

Responsabilidades:

- exponer DTOs públicos;
- validar entradas;
- proteger operaciones;
- ocultar reglas internas;
- recalcular precios, stock y envío;
- coordinar pedidos, reservas, pagos y facturación futura;
- aplicar rate limiting;
- aplicar CORS restrictivo;
- no exponer errores técnicos internos.

### InternalERPAPI

Backend interno del ERP/POS.

Responsabilidades:

- catálogo maestro;
- precios;
- stock;
- ventas;
- caja;
- facturación;
- administración interna;
- reportes;
- configuración;
- seguridad interna.

No debe ser consumido directamente por la tienda pública.

### AdminERPFrontend

Frontend Angular interno en `app.inktoy.pe`. Debe requerir autenticación y autorización por roles.

### AuthContext

Debe distinguir:

- usuario interno;
- rol interno;
- cliente futuro autenticado;
- sesión pública;
- proceso automático;
- webhook;
- job interno.

### PublicSession

Sesión pública opcional para carrito/checkout. No debe contener privilegios administrativos.

### CustomerAccessToken o token de consulta segura

Mecanismo futuro para consultar pedidos, tracking o comprobantes sin exponer datos por ID secuencial. Debe evitar IDOR.

### WebhookSecurity

Control de seguridad para webhooks:

- validación de origen/autenticidad;
- idempotencia;
- registro seguro;
- control de duplicados;
- no exposición de secretos;
- manejo de errores.

### RateLimitPolicy

Política de límites por IP, endpoint, sesión, usuario, patrón de abuso u operación crítica.

### AuditEvent

Registro de operación crítica, por ejemplo:

- login interno;
- cambio de precio;
- cambio de stock;
- cambio de cobertura;
- creación de pedido;
- creación de reserva;
- creación de pago;
- webhook recibido;
- emisión de comprobante;
- cambio de estado de delivery.

### SecurityIncident

Incidencias posibles:

```text
SUSPICIOUS_CHECKOUT_ACTIVITY
WEBHOOK_VALIDATION_FAILED
RATE_LIMIT_EXCEEDED
IDOR_ATTEMPT_DETECTED
INVALID_SIGNATURE
ADMIN_ACCESS_DENIED
SENSITIVE_DATA_ACCESS_ATTEMPT
```

### SecretManagement

Gestión de secretos por entorno:

- credenciales DB;
- JWT secret;
- Mercado Pago;
- courier futuro;
- proveedor de facturación;
- claves de API;
- certificados;
- credenciales de storage/CDN futuro.

### DataExposurePolicy

Política que define qué se puede mostrar en tienda pública, Storefront API, Angular interno, logs, reportes, webhooks y errores.

## Separación de superficies

### `inktoy.pe` — Tienda pública

Debe contener páginas públicas SEO, productos publicados, categorías públicas, marcas públicas, carrito, checkout, consulta segura de pedido y contenido SEO.

No debe contener secretos, credenciales, administración interna, reglas completas de negocio ni endpoints internos.

### `app.inktoy.pe` — ERP/POS interno

Debe contener el frontend Angular interno, administración de catálogo, inventario, POS, ventas, caja, facturación, configuración, reportes y administración ecommerce futura.

Debe estar protegido por autenticación, autorización por roles, HTTPS, sesiones seguras, rate limiting administrativo, controles de acceso y logs de auditoría.

### `api.inktoy.pe` — API pública/controlada

Debe exponer únicamente:

- Storefront API pública;
- endpoints de checkout controlados;
- endpoints de ubicación/envío públicos controlados;
- endpoints de consulta pública segura;
- endpoints de webhook específicamente protegidos.

No debe exponer APIs internas del ERP/POS, endpoints administrativos, caja, facturación interna, reportes, configuración, logs ni datos personales innecesarios.

### `staging.inktoy.pe` — Staging interno/no indexable

Debe ser no indexable, separado de producción, protegido, sin credenciales productivas y sin datos reales sensibles salvo hardening.

No debe usarse como producción.

### Endpoints que nunca deben ser públicos

- administración de usuarios internos;
- caja;
- ventas internas;
- reportes;
- configuración de facturación;
- configuración de series;
- stock interno completo;
- movimientos de inventario;
- datos de clientes completos;
- datos tributarios completos;
- auditoría interna;
- endpoints de mantenimiento;
- endpoints técnicos de infraestructura.

## Autenticación y autorización

### ERP interno

Todo endpoint administrativo debe requerir autenticación y autorización explícita.

Roles actuales/futuros:

- ADMIN;
- SUPERVISOR;
- CAJERO;
- Ecommerce Manager;
- SEO/Content Manager;
- Fulfillment/Despacho;
- Atención al cliente;
- Soporte de pagos;
- Responsable de facturación.

### Storefront API pública

Puede tener endpoints públicos, pero limitados y controlados:

- listar productos publicados;
- ver detalle de producto por slug;
- listar categorías;
- listar marcas;
- calcular envío;
- validar carrito;
- iniciar checkout.

Aunque sean públicos, deben tener validación de entrada, rate limiting, DTOs públicos y no exponer reglas internas completas.

### Cliente autenticado futuro

En fases futuras puede existir cuenta de cliente. Debe proteger historial de pedidos, direcciones, datos personales, comprobantes y tracking.

### Consulta segura de pedido

No debe ser por ID interno simple. Opciones aceptables:

- número público de pedido + token;
- sesión autenticada de cliente;
- enlace seguro de consulta;
- mecanismo equivalente.

Debe evitarse IDOR.

### Principio de mínimo privilegio

Cada rol debe acceder solo a lo que necesita.

Ejemplos:

- Fulfillment puede ver dirección y preparar pedido, pero no modificar precios.
- SEO/Content puede editar metadata, pero no ver pagos.
- Soporte de pagos puede revisar incidencias de pago, pero no cambiar stock.
- Atención al cliente puede ver estado de pedido, pero no datos internos sensibles completos.

## Validación server-side

El backend siempre será autoridad final.

Debe validar server-side:

- precio base, override online, promociones futuras, descuentos futuros, precio por variante y total de línea;
- stock físico, stock reservado, stock de seguridad, disponibilidad online y almacén online;
- cantidades mínimas/máximas y disponibilidad por variante;
- descuentos futuros, cupones, promociones, volumen, vigencia y acumulabilidad;
- costo de envío por departamento, provincia, distrito, UBIGEO, zona, cobertura, tarifa, courier y cotización manual;
- dirección, ubicación controlada, celular, email, referencia y zona cubierta;
- pago, proveedor, monto, moneda, estado, webhook, idempotencia y conciliación;
- pedido, estado, transición permitida, duplicidad, snapshot e integridad;
- facturación, venta válida, datos tributarios, serie, correlativo, estado del comprobante e idempotencia.

Ningún estado crítico debe cambiarse solo por petición de frontend.

## CORS, cookies y CSRF

### CORS

En producción no se debe usar:

```text
Access-Control-Allow-Origin: *
```

Política recomendada:

- permitir `https://inktoy.pe`;
- permitir `https://www.inktoy.pe` solo si aplica redirección/control;
- permitir `https://app.inktoy.pe` solo para endpoints internos necesarios;
- permitir dominios de staging solo en staging;
- no permitir orígenes arbitrarios.

Los dominios permitidos deben definirse por entorno: local, staging y producción.

### Cookies

Si se usan cookies:

- `HttpOnly`;
- `Secure`;
- `SameSite=Lax` o `Strict` según flujo;
- dominio restringido;
- expiración controlada.

### CSRF

CSRF aplica principalmente si se usan cookies de sesión para operaciones autenticadas.

Reglas:

- endpoints administrativos con cookies deben protegerse contra CSRF;
- endpoints públicos de checkout deben tener validación, rate limiting e idempotencia;
- webhooks no deben depender de CSRF, sino de firma/validación propia.

### Tokens

Si se usan tokens:

- no guardarlos de forma insegura;
- no exponerlos en URLs si contienen acceso sensible duradero;
- usar expiración;
- usar scopes o permisos si aplica.

## Protección contra ataques comunes

### XSS

Impacto:

- robo de sesión;
- manipulación de checkout;
- exfiltración de datos;
- inyección en páginas públicas.

Mitigación:

- sanitizar contenido administrable;
- escapar HTML;
- Content Security Policy futura;
- evitar renderizar HTML no confiable;
- validar metadata SEO y descripciones;
- revisar contenido generado por IA o proveedores.

### SQL injection

Impacto:

- acceso a datos;
- modificación de pedidos;
- fuga de clientes;
- corrupción de inventario.

Mitigación:

- ORM/queries parametrizadas;
- no concatenar SQL;
- validación de filtros;
- límites de paginación;
- tests de repositorios críticos.

### SSRF

Impacto:

- llamadas a recursos internos desde backend;
- abuso de importación de imágenes o URLs externas;
- exposición de metadatos de infraestructura.

Mitigación:

- validar URLs externas;
- bloquear rangos internos;
- limitar fetch server-side;
- no aceptar URLs arbitrarias para imágenes sin control;
- usar storage controlado para assets.

### IDOR

Impacto:

- ver pedidos ajenos;
- ver tracking ajeno;
- descargar comprobantes ajenos;
- acceder a datos personales.

Mitigación:

- no usar IDs internos como acceso público;
- tokens de consulta segura;
- verificar propiedad o autorización;
- usar números públicos no secuenciales cuando corresponda;
- tests de autorización.

### CSRF

Impacto:

- operaciones administrativas ejecutadas sin intención;
- cambios en catálogo, precios o stock si hay sesión activa.

Mitigación:

- tokens CSRF si hay cookies;
- SameSite;
- validación de origen;
- separación de dominios;
- autorización por rol.

### Path traversal

Impacto:

- lectura de archivos internos;
- exposición de comprobantes o assets.

Mitigación:

- no construir rutas con input del usuario;
- usar storage keys;
- validar nombres;
- servir archivos mediante capa controlada.

### Mass assignment

Impacto:

- usuario envía campos no permitidos;
- manipula estado de pedido;
- manipula precio, rol o stock.

Mitigación:

- DTOs específicos por caso de uso;
- whitelisting de campos;
- no mapear entidades directamente desde request;
- validación server-side.

### Broken access control

Impacto:

- acceso a endpoints internos;
- acciones de roles no autorizados.

Mitigación:

- autorización explícita;
- tests por rol;
- denegación por defecto;
- separación de APIs públicas e internas.

### Sensitive data exposure

Impacto:

- fuga de direcciones;
- fuga de documentos;
- fuga de datos tributarios;
- fuga de tokens.

Mitigación:

- minimización;
- DTOs públicos;
- masking;
- logs seguros;
- cifrado en tránsito;
- control de acceso.

### Open redirects

Impacto:

- phishing;
- redirección maliciosa después de pago o login.

Mitigación:

- allowlist de dominios;
- no aceptar redirect URLs arbitrarias;
- validar retornos de Mercado Pago.

### Header security

Controles futuros recomendados:

- HTTPS obligatorio;
- HSTS en producción;
- X-Content-Type-Options;
- X-Frame-Options o CSP `frame-ancestors`;
- Referrer-Policy;
- Content-Security-Policy;
- Permissions-Policy.

## Seguridad de Storefront API/BFF

### Datos que puede exponer

- productos publicados;
- categorías publicadas;
- marcas publicadas;
- slugs;
- metadata SEO pública;
- imágenes públicas;
- disponibilidad pública;
- precio online efectivo;
- opciones públicas de envío;
- estado público de pedido;
- estado público de despacho;
- estado público de comprobante cuando aplique.

### Datos que no debe exponer

- IDs internos sensibles si no son necesarios;
- costo interno;
- margen;
- stock exacto interno si no es necesario;
- reglas completas de precio;
- reglas completas de promociones;
- reglas internas de envío;
- datos personales de otros clientes;
- errores técnicos;
- stack traces;
- payloads de proveedores;
- tokens;
- secretos;
- configuración interna.

### DTOs públicos

La Storefront API debe usar DTOs públicos diseñados para ecommerce. No debe reutilizar DTOs internos administrativos si exponen campos innecesarios.

### Paginación y filtros

Controles:

- límite máximo de page size;
- validación de filtros;
- no permitir queries abusivas;
- no exponer filtros internos no soportados;
- protección contra scraping agresivo.

### Rate limiting

Aplicar a búsqueda, catálogo, validación de carrito, cálculo de envío, checkout, consulta de pedido, webhooks y login interno.

### Scraping agresivo

Mitigaciones:

- CDN/WAF;
- rate limiting;
- cache para catálogo público;
- límites por IP;
- monitoreo;
- robots.txt para SEO, sin tratarlo como control de seguridad.

## Seguridad de checkout

Reglas:

1. No confiar en frontend.
2. Revalidar carrito.
3. Recalcular precio.
4. Recalcular stock.
5. Recalcular envío.
6. Validar dirección.
7. Crear pedido con snapshot.
8. Crear reserva.
9. Crear preferencia Mercado Pago server-side.
10. Prevenir pedidos duplicados.
11. Usar idempotencia.
12. Aplicar rate limiting.
13. Registrar auditoría.
14. No permitir checkout si hay producto no publicado, inactivo, sin stock o sin precio válido.
15. No permitir checkout si la ubicación no tiene cobertura o tarifa válida.

Protección contra abuso:

- límites por IP/sesión;
- detección de múltiples intentos fallidos;
- expiración de intentos;
- control de reservas abandonadas;
- monitoreo de intentos de pago;
- bloqueo o desafío futuro ante patrones sospechosos.

## Seguridad de Mercado Pago y webhooks

Reglas:

1. Mercado Pago se integra server-side.
2. No confiar en redirect del cliente.
3. No confiar solo en webhook.
4. Validar autenticidad/origen según mecanismo vigente del proveedor.
5. Consultar estado real del pago cuando corresponda.
6. Validar monto.
7. Validar moneda.
8. Validar pedido.
9. Validar reserva.
10. Aplicar idempotencia.
11. No exponer credenciales.
12. No registrar tokens completos.
13. Manejar webhooks duplicados como no-op seguro.
14. Manejar webhooks tardíos con incidencia si corresponde.
15. No convertir a venta ni facturar por webhook no validado.

Estados de incidencia posibles:

```text
WEBHOOK_VALIDATION_FAILED
WEBHOOK_DUPLICATE_IGNORED
PAYMENT_AMOUNT_MISMATCH
PAYMENT_WITHOUT_VALID_ORDER
PAYMENT_WITHOUT_VALID_RESERVATION
```

## Seguridad de datos personales

Datos sensibles involucrados:

- nombre;
- celular;
- email;
- dirección;
- referencia;
- documento;
- RUC;
- razón social;
- dirección fiscal;
- datos de pedido;
- comprobante;
- tracking.

Reglas:

1. Minimizar datos recolectados.
2. Usar datos solo para finalidad operativa.
3. Limitar acceso por rol.
4. Enmascarar cuando aplique.
5. No registrar datos sensibles completos en logs.
6. No exponer datos por endpoints públicos sin control.
7. No permitir consulta de pedido solo por ID interno.
8. Proteger tracking con token o sesión segura.
9. Proteger comprobantes con autorización o enlace seguro.
10. Auditar accesos internos relevantes.

Ejemplos de minimización:

- atención al cliente puede ver lo necesario para resolver el pedido;
- fulfillment puede ver dirección y contacto, pero no necesariamente detalles de pago;
- SEO/content no debe ver datos personales;
- soporte de pagos no necesita editar dirección;
- responsable de facturación ve datos tributarios necesarios.

## Gestión de secretos

Reglas:

1. Separar secretos por entorno.
2. No subir secretos al repositorio.
3. No usar credenciales seed en entornos compartidos.
4. Usar variables de entorno en local/staging.
5. Usar gestor de secretos en producción futura cuando aplique.
6. Rotar secretos ante sospecha de exposición.
7. No compartir credenciales productivas en desarrollo.
8. No mezclar credenciales sandbox con producción.
9. No imprimir secretos en logs.
10. No exponer secretos al frontend.

Secretos a proteger:

- base de datos;
- JWT secret;
- Mercado Pago;
- proveedor de facturación;
- courier futuro;
- storage/CDN futuro;
- certificados;
- API keys;
- SMTP o email transaccional futuro;
- credenciales cloud.

## Logging, auditoría y monitoreo

### Qué registrar

Registrar eventos críticos:

- login interno;
- acceso denegado;
- cambio de precio;
- cambio de stock;
- cambio de publicación online;
- cambio de metadata SEO;
- cambio de tarifa;
- cambio de cobertura;
- creación de pedido;
- creación de reserva;
- creación de preferencia Mercado Pago;
- recepción de webhook;
- validación de pago;
- conversión a venta;
- emisión de comprobante;
- reintento de facturación;
- asignación de courier;
- cambio de tracking;
- incidencia de seguridad.

### Qué no registrar

No registrar:

- contraseñas;
- tokens completos;
- secretos;
- credenciales;
- payloads sensibles completos;
- datos completos de tarjeta;
- direcciones completas en logs técnicos innecesarios;
- documentos completos si no es necesario.

### Auditoría

Debe registrar:

- usuario o proceso;
- timestamp;
- acción;
- entidad afectada;
- resultado;
- motivo;
- origen;
- id de correlación cuando aplique.

### Monitoreo

Futuro monitoreo debe cubrir:

- errores 5xx;
- aumentos de 4xx;
- rate limits;
- webhooks fallidos;
- checkout fallidos;
- intentos sospechosos;
- errores de pago;
- errores de facturación;
- errores de delivery;
- disponibilidad de API.

### Alertas futuras

Alertar ante:

- múltiples webhooks inválidos;
- incremento de intentos de checkout;
- errores de pago;
- facturación fallida masiva;
- API caída;
- intentos de acceso a endpoints protegidos;
- staging indexado;
- uso de credenciales inválidas o sospechosas.

## WAF/CDN y hardening

### WAF/CDN

En producción futura se deberá usar una capa de borde como:

- Cloudflare;
- AWS CloudFront + WAF;
- alternativa equivalente en GCP.

Objetivos:

- TLS/HTTPS;
- protección anti-bots;
- rate limiting en borde;
- caché de assets;
- protección básica contra ataques comunes;
- reducción de carga al backend;
- mitigación de scraping agresivo.

### TLS/HTTPS

Reglas:

- HTTPS obligatorio en producción;
- redirección HTTP → HTTPS;
- certificados válidos;
- HSTS en producción cuando la configuración esté estable.

### Headers de seguridad

Recomendados:

```text
Strict-Transport-Security
Content-Security-Policy
X-Content-Type-Options
X-Frame-Options o frame-ancestors
Referrer-Policy
Permissions-Policy
```

### No indexar staging

Staging debe tener:

- `noindex`;
- control por robots/header;
- idealmente acceso restringido;
- dominio separado;
- sin datos sensibles reales salvo hardening.

### Protección de `app.inktoy.pe`

Debe contar con:

- autenticación;
- autorización;
- HTTPS;
- protección contra fuerza bruta;
- rate limiting;
- logs de acceso;
- no indexación;
- no exposición de endpoints administrativos públicos.

### Protección de `api.inktoy.pe`

Debe contar con:

- CORS restrictivo;
- rate limiting;
- validación de entrada;
- WAF/CDN futuro;
- logs seguros;
- separación de endpoints públicos y protegidos;
- no exposición de endpoints internos.

### Backups y recuperación

Antes de producción:

- backups automatizados;
- prueba de restauración;
- documentación de recuperación;
- separación de backups por entorno;
- protección de backups.

## Seguridad en staging y producción

### Separación de ambientes

Ambientes:

- local;
- staging;
- producción.

Cada ambiente debe tener:

- variables propias;
- secretos propios;
- base de datos propia;
- credenciales propias;
- configuración CORS propia;
- URLs propias;
- proveedores en modo sandbox cuando aplique.

### Datos reales en staging

No usar datos reales sensibles en staging salvo que:

- exista hardening;
- exista control de acceso;
- los datos estén minimizados o anonimizados;
- haya necesidad justificada.

### Credenciales productivas

No usar credenciales productivas en:

- local;
- staging;
- pruebas;
- demos;
- documentación.

### Checklist antes de producción

Antes de activar producción:

- HTTPS;
- CORS restrictivo;
- WAF/CDN definido;
- backups;
- logging seguro;
- variables separadas;
- secretos rotados;
- noindex removido solo en tienda pública productiva;
- staging no indexable;
- endpoints internos protegidos;
- pruebas de seguridad;
- QA de checkout;
- QA de pagos;
- QA de webhooks;
- QA de IDOR;
- QA de roles internos.

## Reglas obligatorias

1. No exponer endpoints internos del ERP/POS como API pública.
2. No confiar en frontend para precios, stock, totales, envío, pagos ni facturación.
3. No usar CORS abierto en producción.
4. No exponer errores técnicos al cliente.
5. No exponer datos personales innecesarios.
6. No procesar webhooks sin validación e idempotencia.
7. No permitir consulta de pedidos, tracking o comprobantes sin control de acceso o token seguro.
8. No registrar secretos ni datos sensibles completos.
9. No mezclar secretos entre entornos.
10. No activar producción sin hardening, WAF/CDN, backups y checklist de seguridad.
11. No usar staging como producción.
12. No indexar staging.
13. No usar credenciales productivas en local/staging.
14. No mapear entidades internas directamente a DTOs públicos.
15. No permitir mass assignment.
16. No permitir cambios de estado críticos desde frontend sin validación.
17. No crear pedidos, reservas, pagos, ventas ni comprobantes sin idempotencia donde corresponda.
18. No exponer stock operativo interno completo si no es necesario.
19. No exponer reglas internas completas de precios, promociones o envío.
20. No permitir acceso interno sin rol autorizado.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Exponer directamente backend ERP/POS | Descartada. Aumenta riesgo de exposición de endpoints internos y acopla tienda a APIs administrativas. |
| Usar Storefront API/BFF pública/controlada | Aceptada. Permite DTOs públicos, validaciones, seguridad y separación de responsabilidades. |
| Confiar en seguridad solo del frontend | Descartada. El frontend es manipulable y no puede ser autoridad de negocio. |
| Aplicar seguridad después de implementar ecommerce | Descartada. Genera deuda crítica y puede obligar a rediseñar checkout, API y roles. |
| Implementar seguridad desde el diseño | Aceptada. Reduce riesgo y alinea ecommerce con operación real. |

## Justificación

### Seguridad

La tienda será pública y expuesta a internet. La seguridad debe ser parte del diseño base.

### Bajo riesgo

Separar Storefront API, ERP interno y tienda pública evita exposición accidental y reduce superficie de ataque.

### Operación real

Pedidos, pagos, stock, facturación y delivery requieren trazabilidad y protección.

### Protección de datos

El ecommerce manejará datos personales y tributarios que deben minimizarse y protegerse.

### Escalabilidad

Una API pública controlada permite crecer sin exponer el ERP interno.

### Mantenibilidad

DTOs públicos, reglas claras y separación de superficies reducen acoplamiento y deuda técnica.

### Preparación para pagos, delivery y facturación

Mercado Pago, webhooks, comprobantes y tracking requieren seguridad desde el inicio.

## Consecuencias positivas

- Menor riesgo de exposición del ERP/POS.
- Menor riesgo de manipulación de precio, stock, envío o pago.
- Mejor protección de datos personales.
- Mejor trazabilidad de operaciones críticas.
- Mejor control sobre webhooks.
- Mejor preparación para producción.
- Mejor separación entre tienda pública y administración interna.
- Mejor defensa contra bots y scraping.
- Mejor base para Storefront API.
- Menor deuda técnica de seguridad.

## Consecuencias negativas o costos

- Mayor complejidad inicial.
- Requiere diseño de DTOs públicos.
- Requiere rate limiting.
- Requiere CORS por entorno.
- Requiere gestión de secretos.
- Requiere auditoría.
- Requiere QA de seguridad.
- Requiere WAF/CDN antes de producción.
- Requiere disciplina para no exponer endpoints internos.

Estos costos son aceptables porque la tienda será pública y manejará dinero, datos personales, pedidos, pagos, stock y facturación.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| CORS mal configurado | Allowlist por entorno, no usar `*` en producción. |
| IDOR | Tokens de consulta segura, autorización y no usar IDs internos como acceso público. |
| Webhook falso | Validación de autenticidad, consulta al proveedor e idempotencia. |
| Manipulación de precio | Recalcular server-side. |
| Manipulación de stock | Validar disponibilidad server-side y reservas. |
| Manipulación de envío | Calcular costo server-side. |
| Exposición de datos personales | DTOs mínimos, masking, roles y logs seguros. |
| Scraping agresivo | Rate limiting, CDN/WAF y caché. |
| Bots en checkout | Rate limiting, idempotencia, detección de abuso. |
| Secretos filtrados | Variables por entorno, no repositorio, rotación. |
| Logs inseguros | Política de logging seguro. |
| Staging indexado | Noindex, robots/header, acceso restringido. |
| ERP interno expuesto | Separar `app.inktoy.pe`, autenticación y no exponer APIs internas. |
| Falta de rate limiting | Rate limiting en borde y backend. |
| Mala configuración WAF/CDN | Checklist y pruebas antes de producción. |
| Mass assignment | DTOs específicos y whitelisting. |
| XSS en contenido SEO | Sanitización, revisión humana y CSP futura. |

## Impacto técnico

### Backend Spring Boot

Debe implementar separación de endpoints, validaciones, autorización, DTOs públicos, auditoría, idempotencia y protección de errores.

### Storefront API/BFF

Será la frontera pública ecommerce y debe diseñarse con seguridad desde el inicio.

### Angular interno

Debe proteger roles y operaciones administrativas ecommerce futuras.

### Next.js futuro

Debe consumir solo Storefront API y no contener secretos ni lógica final de negocio.

### Mercado Pago

Debe procesarse server-side con validación, idempotencia y logs seguros.

### Delivery

Debe proteger datos personales, tracking y estados públicos.

### Facturación

Debe proteger comprobantes, datos tributarios y estados internos.

### Pedidos online

Deben protegerse contra duplicidad, IDOR y manipulación.

### Clientes

Deben protegerse datos personales y acceso a historial futuro.

### Infraestructura

Debe preparar HTTPS, WAF/CDN, CORS, backups, secretos y monitoreo.

### CI/CD futuro

Debe evitar exponer secretos, ejecutar validaciones y separar entornos.

### Auditoría

Debe registrar operaciones críticas por usuario o proceso.

### QA de seguridad

Debe cubrir:

- CORS;
- IDOR;
- rate limiting;
- autorización por rol;
- webhooks duplicados;
- webhook inválido;
- manipulación de precio;
- manipulación de stock;
- manipulación de envío;
- exposición de errores;
- logs sin secretos;
- staging no indexado.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba separar tienda pública, ERP interno y Storefront API/API pública controlada.
2. Se aprueba no exponer endpoints internos del ERP/POS.
3. Se aprueba que Storefront API/BFF será la única capa pública ecommerce.
4. Se aprueba validación server-side para precio, stock, envío, pedido, pago y facturación.
5. Se aprueba CORS restrictivo por entorno.
6. Se aprueba protección de webhooks con validación e idempotencia.
7. Se aprueba rate limiting para endpoints públicos y críticos.
8. Se aprueba protección contra IDOR en pedidos, tracking y comprobantes.
9. Se aprueba gestión de secretos separada por entorno.
10. Se aprueba logging seguro sin secretos ni datos sensibles completos.
11. Se aprueba auditoría de operaciones críticas.
12. Se aprueba WAF/CDN como requisito antes de producción.
13. Se aprueba que staging no debe indexarse ni usar credenciales productivas.
14. Se aprueba no activar producción sin hardening y checklist de seguridad.
15. Se aprueba que los DTOs públicos no expondrán datos internos innecesarios.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar seguridad todavía;
- crear endpoints;
- modificar CORS;
- tocar AWS/staging;
- configurar WAF/CDN todavía;
- crear secretos reales;
- modificar autenticación;
- crear Storefront API;
- activar producción;
- implementar checkout;
- integrar Mercado Pago;
- exponer APIs públicas nuevas;
- cambiar infraestructura;
- modificar Docker/Caddy;
- crear migraciones;
- modificar roles;
- cambiar permisos actuales.

Este ADR solo define la estrategia de seguridad ecommerce y protección de APIs públicas. La implementación debe ocurrir en fases posteriores, alineada con Storefront API, checkout, pedidos online, Mercado Pago, delivery, facturación, infraestructura, QA y despliegue progresivo.

## Decisión resultante

InkToy implementará la seguridad ecommerce desde el diseño. La tienda pública en `inktoy.pe` no consumirá directamente endpoints internos del ERP/POS. Toda comunicación ecommerce pública pasará por Storefront API/BFF en `api.inktoy.pe`, usando DTOs públicos, validación server-side, CORS restrictivo, rate limiting, logging seguro, auditoría e idempotencia donde corresponda.

El ERP/POS interno en `app.inktoy.pe` permanecerá separado y protegido por autenticación, autorización y roles. No se expondrán endpoints internos, datos personales innecesarios, reglas internas, errores técnicos, secretos ni configuración sensible.

No se activará producción sin hardening, WAF/CDN, HTTPS, backups, secretos separados por entorno, staging no indexable, protección de webhooks, QA de seguridad y checklist operativo aprobado.
