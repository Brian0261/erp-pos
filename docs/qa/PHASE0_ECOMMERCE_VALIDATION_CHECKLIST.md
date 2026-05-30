# Checklist de validación Fase 0 ecommerce — InkToy

## Estado

Aprobado para cierre formal de Fase 0 documental ecommerce.

## Cierre formal Fase 0

Fecha de cierre documental: 2026-05-30.

Evidencia revisada:

| Evidencia | Resultado |
|---|---|
| ECOM-ADR-001 al ECOM-ADR-019 en `docs/adr/ecommerce/` | Encontrados y con estado `Aprobado`. |
| `docs/ecommerce/PRELIMINARY_ECOMMERCE_CONTRACTS.md` | Encontrado y aprobado para cierre formal de Fase 0 documental ecommerce. |
| `docs/qa/PHASE0_ECOMMERCE_VALIDATION_CHECKLIST.md` | Encontrado y revisado como checklist documental. |
| `docs/ai/CURRENT_STATUS.md` | Actualizado para registrar cierre de Fase 0 y proxima Fase 1. |
| `docs/ai/CHANGE_CONTROL.md` | Actualizado con reglas de control ecommerce y restricciones Fase 1A. |
| `docs/ecommerce/PHASE1_ONLINE_CATALOG_IMPLEMENTATION_PLAN.md` | Creado como plan tecnico/documental de Fase 1. |
| `docs/qa/PHASE1_ONLINE_CATALOG_QA_CHECKLIST.md` | Creado como checklist QA de Fase 1. |

Conclusion:

Fase 0 queda cerrada como fase documental. Este cierre no valida codigo funcional, no crea endpoints, no crea migraciones, no toca DB/Flyway, no activa ecommerce y no habilita venta online.

Restricciones que siguen vigentes:

- No tocar AWS/staging hasta fase local estable y validada.
- No crear Next.js todavia.
- No implementar Storefront API publica productiva todavia.
- No implementar checkout, carrito real, Mercado Pago, facturacion automatica ecommerce, delivery real ni Merchant Center real.
- No modificar POS, inventario, ventas, caja ni facturacion para Fase 1A.
- Fase 1B futura requiere aprobacion explicita antes de Flyway, endpoints administrativos internos o cambios persistentes.

Nota sobre checkboxes:

Las casillas originales se conservan como matriz de revision granular. El cierre formal se registra en esta seccion con evidencia documental para evitar marcar items no verificados por ejecucion funcional.

## Objetivo

Validar que la Fase 0 documental ecommerce de InkToy está completa antes de iniciar implementación funcional.

Este checklist verifica que las decisiones arquitectónicas, contratos preliminares, reglas de seguridad, criterios QA, estándares técnicos, trazabilidad documental y lineamientos UX/UI estén suficientemente definidos para avanzar con bajo riesgo.

## Alcance

Este checklist cubre arquitectura, documentación y trazabilidad, control de cambios, contratos preliminares, catálogo, categorías online, marcas, variantes, imágenes, SEO metadata, stock, precios, pedidos y pagos, clientes y datos personales, facturación, delivery, seguridad, Storefront API, Angular interno, Next.js futuro, Merchant Center y SEO técnico, UX/UI, calidad de código, QA por fase futura, criterios de bloqueo, criterios de aprobación y próxima fase recomendada.

Este checklist no valida código implementado porque Fase 0 es documental.

## Estado esperado para cerrar Fase 0

La Fase 0 ecommerce puede considerarse cerrada cuando:

- ECOM-ADR-001 al ECOM-ADR-019 están aprobados.
- ECOM-ADR-001 al ECOM-ADR-019 están guardados como archivos `.md` en `docs/adr/ecommerce/`.
- Existe documento de contratos preliminares ecommerce.
- Existe checklist formal de validación Fase 0.
- Existe trazabilidad de cierre documental.
- No hay decisiones críticas pendientes para iniciar la primera fase.
- La primera fase de implementación está claramente definida.
- Se confirma que no se implementará checkout, Mercado Pago, facturación automática ni delivery real en la primera fase.
- Se confirma que AWS/staging no bloquea el avance local.
- Se confirma que toda implementación futura respetará arquitectura hexagonal, seguridad, QA y UX/UI profesional.

---

# 1. Checklist de arquitectura

| Ítem | Estado |
|---|---|
| ECOM-ADR-001 aprobado: arquitectura ecommerce SEO-first. | [ ] |
| ECOM-ADR-002 aprobado: dominios, entornos y estrategia local/staging/producción. | [ ] |
| Tienda pública definida como Next.js SEO-first en `inktoy.pe`. | [ ] |
| ERP/POS interno definido en Angular bajo `app.inktoy.pe`. | [ ] |
| Storefront API definida en `api.inktoy.pe`. | [ ] |
| ERP/POS Spring Boot confirmado como fuente de verdad. | [ ] |
| PostgreSQL confirmado como base principal del ERP/POS. | [ ] |
| Storefront API inicial definida como módulo dentro del monolito modular. | [ ] |
| Storefront API diseñada como extraction-ready. | [ ] |
| Trabajo inicial confirmado en local. | [ ] |
| AWS/staging confirmado como no bloqueante por ahora. | [ ] |
| Eventos RabbitMQ/AWS SQS definidos como futuro, no primera fase. | [ ] |
| No hay decisión pendiente crítica sobre arquitectura base. | [ ] |

## Criterio de aprobación

Arquitectura aprobada si todos los puntos críticos están marcados y no hay contradicción entre ECOM-ADR-001, ECOM-ADR-002 y ECOM-ADR-017.

---

# 2. Checklist de documentación y trazabilidad

| Ítem | Estado |
|---|---|
| ECOM-ADR-001 al ECOM-ADR-019 guardados en `docs/adr/ecommerce/`. | [ ] |
| Todos los ADR tienen estado `Aprobado`. | [ ] |
| Existe índice o listado de ADRs. | [ ] |
| No hay contradicciones entre ADRs. | [ ] |
| `PRELIMINARY_ECOMMERCE_CONTRACTS.md` guardado en `docs/ecommerce/`. | [ ] |
| `PHASE0_ECOMMERCE_VALIDATION_CHECKLIST.md` guardado en `docs/qa/`. | [ ] |
| Se documentó que Fase 0 no implementa código. | [ ] |
| Se documentó que AWS/staging no se toca todavía. | [ ] |
| Se documentó que la primera fase será catálogo online base. | [ ] |
| Se documentó que checkout/Mercado Pago/facturación/delivery real quedan fuera de la primera fase. | [ ] |

## Criterio de aprobación

Documentación y trazabilidad aprobadas si cualquier miembro del equipo puede revisar qué se decidió, dónde está documentado y cuál es la siguiente fase sin depender del historial del chat.

---

# 3. Checklist de control de cambios

| Ítem | Estado |
|---|---|
| `CURRENT_STATUS.md` o documento equivalente actualizado con cierre de Fase 0. | [ ] |
| `CHANGE_CONTROL.md` o documento equivalente actualizado con cierre de Fase 0. | [ ] |
| Se registró que ECOM-ADR-001 al ECOM-ADR-019 están aprobados. | [ ] |
| Se registró que contratos preliminares ecommerce están aprobados. | [ ] |
| Se registró que checklist Fase 0 está aprobado. | [ ] |
| Se registró próxima fase recomendada. | [ ] |
| Se registraron restricciones de no implementar checkout/Mercado Pago/facturación/delivery todavía. | [ ] |
| Se registró que AWS/staging no se actualizará hasta fase local estable. | [ ] |
| Se registró que cada fase futura debe actualizar documentación. | [ ] |

## Criterio de aprobación

Control de cambios aprobado si el repositorio refleja claramente el estado documental y evita que otro chat, opencode/Codex o un desarrollador continúe con supuestos incorrectos.

---

# 4. Checklist de contratos preliminares

| Contrato | Estado |
|---|---|
| Storefront API preliminar definido. | [ ] |
| Catálogo online preliminar definido. | [ ] |
| Categorías online preliminar definido. | [ ] |
| Marcas preliminar definido. | [ ] |
| Variantes preliminar definido. | [ ] |
| Imágenes/assets preliminar definido. | [ ] |
| SEO metadata preliminar definido. | [ ] |
| Almacén online preliminar definido. | [ ] |
| Stock reservado preliminar definido. | [ ] |
| Pedidos online preliminar definido. | [ ] |
| Clientes online y datos personales preliminar definido. | [ ] |
| Mercado Pago preliminar definido. | [ ] |
| Facturación automática preliminar definida. | [ ] |
| Delivery nacional, UBIGEO y couriers preliminar definido. | [ ] |
| Merchant Center y SEO técnico preliminar definido. | [ ] |
| Auditoría ecommerce transversal preliminar definida. | [ ] |
| Cada contrato incluye propósito. | [ ] |
| Cada contrato incluye alcance. | [ ] |
| Cada contrato incluye datos mínimos. | [ ] |
| Cada contrato incluye estados si aplica. | [ ] |
| Cada contrato incluye validaciones server-side. | [ ] |
| Cada contrato incluye errores esperados. | [ ] |
| Cada contrato incluye seguridad. | [ ] |
| Cada contrato incluye auditoría si aplica. | [ ] |
| Cada contrato incluye ADRs relacionados. | [ ] |
| Cada contrato incluye qué NO implementar todavía. | [ ] |

## Criterio de aprobación

Contratos aprobados si existe `docs/ecommerce/PRELIMINARY_ECOMMERCE_CONTRACTS.md` y cubre todos los contratos mínimos sin contradecir ECOM-ADR-001 al ECOM-ADR-019.

---

# 5. Checklist funcional y técnico por área

## 5.1 Catálogo

| Ítem | Estado |
|---|---|
| Producto interno y producto publicado online diferenciados. | [ ] |
| No todo producto activo se publica automáticamente. | [ ] |
| `publishedOnline` o equivalente definido conceptualmente. | [ ] |
| Checklist de publicación definido. | [ ] |
| Producto online requiere SKU. | [ ] |
| Producto online requiere slug único. | [ ] |
| Producto online requiere categoría online. | [ ] |
| Producto online requiere imagen principal. | [ ] |
| Producto online requiere precio válido. | [ ] |
| Producto online requiere metadata SEO mínima. | [ ] |
| Producto inactivo no puede publicarse. | [ ] |
| Producto interno/no publicable no puede exponerse. | [ ] |
| Storefront API solo expone productos publicados. | [ ] |
| Next.js no duplica catálogo. | [ ] |

## 5.2 Categorías online

| Ítem | Estado |
|---|---|
| Categorías online definidas como entidad pública de ecommerce. | [ ] |
| Categorías online relacionadas con productos publicados. | [ ] |
| Categorías online tienen slug único. | [ ] |
| Categorías online tienen metadata SEO mínima. | [ ] |
| Categorías vacías no se indexan salvo estrategia aprobada. | [ ] |
| Jerarquía de categorías no permite ciclos. | [ ] |
| Categorías internas no se exponen por Storefront API. | [ ] |
| Categorías no publicadas no aparecen en sitemap. | [ ] |
| Breadcrumbs futuros dependen de categorías coherentes. | [ ] |
| Merchant Center puede usar categoría propia como `product_type`. | [ ] |

## 5.3 Marcas

| Ítem | Estado |
|---|---|
| Marca definida como entidad formal. | [ ] |
| No se usará texto libre para marcas publicadas online. | [ ] |
| Slug de marca único definido. | [ ] |
| Metadata SEO de marca definida. | [ ] |
| Marca inactiva no se asocia a productos online. | [ ] |
| Producto sin marca permitido solo por regla explícita. | [ ] |
| Página de marca indexable solo con contenido mínimo. | [ ] |
| Storefront API solo expone marcas públicas. | [ ] |
| Merchant Center usará marca formal cuando aplique. | [ ] |

## 5.4 Variantes

| Ítem | Estado |
|---|---|
| Producto padre + variantes definido para diferencias vendibles relevantes. | [ ] |
| Variante vendible requiere SKU propio. | [ ] |
| Barcode es opcional, pero único si existe. | [ ] |
| Stock se controla a nivel de variante vendible. | [ ] |
| Precio puede heredarse o tener override por variante. | [ ] |
| Marca normalmente pertenece al producto padre. | [ ] |
| Página SEO principal normalmente es producto padre. | [ ] |
| Variante indexable solo por excepción con valor SEO real. | [ ] |
| POS debe vender variante concreta cuando aplique. | [ ] |
| Merchant Center puede tratar variante como item comercial. | [ ] |

## 5.5 Imágenes/assets

| Ítem | Estado |
|---|---|
| Imagen principal obligatoria para producto online. | [ ] |
| Galería permitida. | [ ] |
| Imagen por variante permitida cuando cambia visualmente. | [ ] |
| Alt text obligatorio para imagen pública. | [ ] |
| Derechos de uso confirmados obligatorios. | [ ] |
| Fuente de imagen registrada conceptualmente. | [ ] |
| Assets internos/inactivos no se exponen. | [ ] |
| Optimización futura WebP/AVIF preparada. | [ ] |
| CDN futuro preparado. | [ ] |
| Imagen del feed coherente con landing page. | [ ] |

## 5.6 SEO metadata

| Ítem | Estado |
|---|---|
| SEO metadata definida como configuración formal. | [ ] |
| ERP/POS fuente de verdad de metadata SEO. | [ ] |
| Title único requerido para página indexable. | [ ] |
| Meta description útil requerida. | [ ] |
| Canonical requerido. | [ ] |
| Robots policy definida. | [ ] |
| Open Graph preparado. | [ ] |
| Structured data preparado. | [ ] |
| No indexar páginas pobres. | [ ] |
| No indexar filtros/facetas por defecto. | [ ] |
| No indexar staging. | [ ] |
| Revisión humana obligatoria para contenido IA o estratégico. | [ ] |

## 5.7 Stock

| Ítem | Estado |
|---|---|
| Almacén online configurable definido. | [ ] |
| Almacén online inicial puede compartirse con POS. | [ ] |
| Fórmula de stock disponible online definida. | [ ] |
| Stock físico, reservado y seguridad diferenciados. | [ ] |
| Stock de seguridad configurable definido. | [ ] |
| Stock reservado definido. | [ ] |
| TTL de reserva definido conceptualmente. | [ ] |
| No comprar productos agotados. | [ ] |
| POS y ecommerce comparten fuente de verdad. | [ ] |
| Concurrencia y anti-sobreventa definidos. | [ ] |
| Frontend no decide disponibilidad final. | [ ] |
| Storefront API no expone stock operativo interno completo. | [ ] |

## 5.8 Precios

| Ítem | Estado |
|---|---|
| Precio POS/base definido como precio por defecto. | [ ] |
| Override online opcional definido. | [ ] |
| Precio online efectivo se calcula server-side. | [ ] |
| Frontend no define precio final. | [ ] |
| Precio por variante considerado. | [ ] |
| Precio cero/negativo bloqueado salvo política explícita. | [ ] |
| Promociones futuras preparadas, no implementadas. | [ ] |
| Cupones futuros preparados, no implementados. | [ ] |
| Precio mayorista futuro preparado, no implementado. | [ ] |
| Mercado Pago usará monto calculado por backend. | [ ] |
| Facturación usará snapshot confirmado. | [ ] |
| Merchant Center usará precio online efectivo. | [ ] |

## 5.9 Pedidos y pagos

| Ítem | Estado |
|---|---|
| Pedido online definido como entidad formal. | [ ] |
| Pedido online no es venta hasta cumplir condiciones. | [ ] |
| Pedido guarda snapshot de productos, precios, cliente, envío y total. | [ ] |
| Pedido requiere carrito validado. | [ ] |
| Pedido requiere reserva de stock. | [ ] |
| Pedido requiere pago aprobado para avanzar. | [ ] |
| No convertir pedido a venta sin reserva confirmada. | [ ] |
| No facturar pedido con incidencia. | [ ] |
| Mercado Pago server-side definido. | [ ] |
| Webhook requiere validación e idempotencia. | [ ] |
| Pago aprobado con monto distinto genera incidencia. | [ ] |
| Pago aprobado sin reserva válida genera incidencia. | [ ] |
| No confiar en redirect ni webhook sin validación adicional. | [ ] |

## 5.10 Clientes y datos personales

| Ítem | Estado |
|---|---|
| Datos mínimos de comprador definidos. | [ ] |
| Email requerido y validado cuando aplique. | [ ] |
| Celular requerido para delivery. | [ ] |
| Datos tributarios definidos para factura. | [ ] |
| RUC requerido para factura. | [ ] |
| Razón social requerida para factura. | [ ] |
| Dirección fiscal requerida para factura. | [ ] |
| Datos personales protegidos por rol. | [ ] |
| Consulta pública de pedido protegida por token seguro o mecanismo equivalente. | [ ] |
| Logs no deben contener datos sensibles completos. | [ ] |
| Se aplica principio de minimización de datos. | [ ] |

## 5.11 Facturación

| Ítem | Estado |
|---|---|
| Facturación automática definida sobre venta válida. | [ ] |
| Pedido online no se factura directamente sin conversión a venta. | [ ] |
| No facturar sin pago aprobado validado. | [ ] |
| No facturar sin reserva confirmada. | [ ] |
| No facturar con monto inconsistente. | [ ] |
| No facturar con datos tributarios inválidos. | [ ] |
| No facturar sin serie activa. | [ ] |
| Boleta y factura diferenciadas. | [ ] |
| Factura requiere RUC, razón social y dirección fiscal. | [ ] |
| Emisión debe ser idempotente. | [ ] |
| Fallos generan incidencia y reintento controlado. | [ ] |
| No duplicar comprobante. | [ ] |

## 5.12 Delivery

| Ítem | Estado |
|---|---|
| Delivery nacional definido como estrategia progresiva. | [ ] |
| Primera versión puede ser manual/semi-automatizada. | [ ] |
| No integración courier obligatoria desde el inicio. | [ ] |
| UBIGEO/catálogo geográfico definido. | [ ] |
| Cliente selecciona departamento/provincia/distrito desde listas. | [ ] |
| No texto libre para ubicación estructurada. | [ ] |
| Backend valida cobertura. | [ ] |
| Backend calcula costo de envío. | [ ] |
| Cliente ve costo antes de pagar. | [ ] |
| Pedido guarda snapshot de envío. | [ ] |
| Courier y tracking preparados. | [ ] |
| Datos personales protegidos por rol. | [ ] |
| No prometer tiempos exactos sin datos reales. | [ ] |

---

# 6. Checklist de seguridad

| Ítem | Estado |
|---|---|
| Separación tienda pública / ERP interno / API pública definida. | [ ] |
| No exponer endpoints internos del ERP/POS. | [ ] |
| Storefront API única capa pública ecommerce. | [ ] |
| CORS restrictivo por entorno. | [ ] |
| Rate limiting definido conceptualmente. | [ ] |
| Protección contra IDOR definida. | [ ] |
| Webhooks protegidos con validación e idempotencia. | [ ] |
| Validaciones server-side obligatorias. | [ ] |
| Datos personales protegidos por rol. | [ ] |
| No registrar datos sensibles completos. | [ ] |
| Gestión de secretos separada por entorno. | [ ] |
| No mezclar secretos local/staging/producción. | [ ] |
| No usar credenciales productivas en local/staging. | [ ] |
| WAF/CDN futuro considerado. | [ ] |
| Staging no indexable. | [ ] |
| No exponer errores técnicos al cliente. | [ ] |

## Criterio de aprobación

Seguridad lista si no existe una ruta pública que exponga datos internos o permita manipular precio, stock, envío, pedido, pago o facturación.

---

# 7. Checklist de Storefront API

| Ítem | Estado |
|---|---|
| Storefront API definida como módulo interno extraction-ready. | [ ] |
| Base path conceptual `/api/v1/storefront/...` definido. | [ ] |
| DTOs públicos separados. | [ ] |
| No reutilizar DTOs administrativos. | [ ] |
| Resolver entidades públicas por slug. | [ ] |
| Exponer solo productos publicados. | [ ] |
| Exponer disponibilidad pública, no stock operativo completo. | [ ] |
| Exponer precio efectivo, no reglas internas completas. | [ ] |
| Errores públicos seguros definidos. | [ ] |
| Paginación y filtros controlados definidos. | [ ] |
| Consultas de pedido/tracking protegidas. | [ ] |
| Next.js no accede a endpoints internos. | [ ] |

## Criterio de aprobación

Storefront API lista si sus límites están claros y no se confunde con API administrativa.

---

# 8. Checklist de Angular interno

| Ítem | Estado |
|---|---|
| Angular interno definido como consola administrativa ecommerce. | [ ] |
| Angular no usa Storefront API como API administrativa. | [ ] |
| Angular consume endpoints internos protegidos. | [ ] |
| Módulos administrativos ecommerce definidos. | [ ] |
| Roles ecommerce definidos. | [ ] |
| ADMIN/SUPERVISOR pueden asumir roles temporalmente. | [ ] |
| Permisos por acción definidos. | [ ] |
| Auditoría obligatoria definida. | [ ] |
| Datos personales visibles solo a roles autorizados. | [ ] |
| Acciones críticas requieren confirmación. | [ ] |
| UX interna debe ser sobria, clara y operativa. | [ ] |
| Datos técnicos en secciones secundarias/colapsables. | [ ] |

---

# 9. Checklist de Next.js futuro

| Ítem | Estado |
|---|---|
| Next.js definido como tienda pública SEO-first. | [ ] |
| SSR/SSG/ISR definido como estrategia base. | [ ] |
| Next.js consume Storefront API, no endpoints internos. | [ ] |
| Next.js no calcula precio final. | [ ] |
| Next.js no calcula stock final. | [ ] |
| Next.js no calcula envío final. | [ ] |
| Next.js no guarda secretos. | [ ] |
| Metadata por página preparada. | [ ] |
| Canonical preparado. | [ ] |
| Structured data preparado. | [ ] |
| Sitemap futuro preparado. | [ ] |
| Robots futuro preparado. | [ ] |
| Mobile-first obligatorio. | [ ] |
| Core Web Vitals considerados. | [ ] |

---

# 10. Checklist SEO técnico y Merchant Center

| Ítem | Estado |
|---|---|
| ECOM-ADR-019 aprobado. | [ ] |
| Merchant Center definido como integración futura controlada. | [ ] |
| Feed no será manual ni hardcodeado en Next.js. | [ ] |
| Feed se generará desde datos confiables ERP/POS, Storefront API o backend. | [ ] |
| Sitemap solo incluirá URLs públicas, canónicas, publicadas e indexables. | [ ] |
| Productos no publicados excluidos de sitemap y feed. | [ ] |
| Productos sin precio válido excluidos. | [ ] |
| Productos sin imagen principal excluidos. | [ ] |
| Staging no indexable. | [ ] |
| Filtros/facetas no indexables por defecto. | [ ] |
| Structured data debe ser consistente con datos reales. | [ ] |
| Precio/disponibilidad coherentes entre tienda, feed, schema y checkout. | [ ] |
| Productos agotados no comprables, pero pueden mantenerse indexables si tienen valor SEO. | [ ] |
| Requisitos vigentes de Google Merchant Center se validarán al implementar. | [ ] |

---

# 11. Checklist de auditoría ecommerce

| Ítem | Estado |
|---|---|
| Auditoría ecommerce transversal definida. | [ ] |
| Cambios críticos de catálogo se auditan. | [ ] |
| Cambios críticos de precio se auditan. | [ ] |
| Cambios críticos de almacén online se auditan. | [ ] |
| Cambios de reserva se auditan. | [ ] |
| Cambios de pedido se auditan. | [ ] |
| Webhooks y pagos se auditan. | [ ] |
| Conversión pedido → venta se audita. | [ ] |
| Reintentos de facturación se auditan. | [ ] |
| Cambios de delivery/tracking se auditan. | [ ] |
| Auditoría no almacena secretos. | [ ] |
| Auditoría evita datos personales completos si no son necesarios. | [ ] |
| Auditoría incluye actor, acción, entidad, resultado y fecha. | [ ] |

## Criterio de aprobación

Auditoría lista si existe trazabilidad mínima para investigar incidentes operativos, pagos, stock, facturación y cambios críticos.

---

# 12. Checklist UX/UI

## UX/UI general

| Ítem | Estado |
|---|---|
| UI profesional, sobria y clara obligatoria. | [ ] |
| Diseño responsive real obligatorio. | [ ] |
| Buena visibilidad en móvil obligatoria. | [ ] |
| Buen contraste visual obligatorio. | [ ] |
| Botones cómodos para móvil. | [ ] |
| Formularios cómodos para móvil. | [ ] |
| Estados visibles y mensajes claros. | [ ] |
| Validaciones comprensibles para usuario. | [ ] |
| Estados vacíos claros. | [ ] |
| Confirmaciones para acciones críticas. | [ ] |
| Evitar pantallas saturadas. | [ ] |
| Evitar layout shift. | [ ] |

## Angular interno

| Ítem | Estado |
|---|---|
| UX interna orientada a operación real. | [ ] |
| Filtros y búsqueda en listados operativos. | [ ] |
| Badges/chips sobrios para estados. | [ ] |
| Datos técnicos en secciones colapsables. | [ ] |
| Mensajes accionables. | [ ] |
| No mostrar stack traces ni errores técnicos crudos. | [ ] |
| Acciones críticas con confirmación. | [ ] |
| Permisos reflejados en UI, pero validados en backend. | [ ] |

## Next.js público

| Ítem | Estado |
|---|---|
| UX pública SEO-first. | [ ] |
| Mobile-first. | [ ] |
| Navegación simple. | [ ] |
| Productos claros y comprables. | [ ] |
| Disponibilidad visible. | [ ] |
| Precio visible y consistente. | [ ] |
| Imágenes optimizadas. | [ ] |
| Checkout futuro simple y seguro. | [ ] |
| Mensajes de error claros. | [ ] |
| Core Web Vitals considerados. | [ ] |

---

# 13. Checklist de calidad de código

| Ítem | Estado |
|---|---|
| Buenas prácticas de programación obligatorias. | [ ] |
| Código limpio, mantenible y modular obligatorio. | [ ] |
| Arquitectura hexagonal estricta obligatoria. | [ ] |
| Dominio separado de aplicación, infraestructura y adaptadores. | [ ] |
| Casos de uso en capa de aplicación. | [ ] |
| Adaptadores REST separados. | [ ] |
| Adaptadores de persistencia separados. | [ ] |
| DTOs públicos separados de DTOs administrativos. | [ ] |
| No exponer entidades JPA. | [ ] |
| No contaminar dominio con detalles web. | [ ] |
| Validaciones server-side obligatorias. | [ ] |
| Manejo correcto de errores obligatorio. | [ ] |
| Seguridad desde el diseño. | [ ] |
| Pruebas por fase. | [ ] |
| Checklist QA por fase. | [ ] |
| No duplicar lógica crítica en frontend. | [ ] |
| No generar deuda técnica por avanzar rápido. | [ ] |
| No implementar más alcance del solicitado. | [ ] |
| No mezclar responsabilidades entre módulos. | [ ] |
| No romper funcionalidades existentes. | [ ] |

---

# 14. Checklist de QA por fase futura

Cada fase futura de implementación debe tener su propio checklist QA antes de considerarse terminada.

| Ítem | Estado |
|---|---|
| Cada fase tiene alcance limitado y documentado. | [ ] |
| Cada fase define qué archivos/módulos puede tocar. | [ ] |
| Cada fase define qué NO debe tocar. | [ ] |
| Cada fase define pruebas backend requeridas. | [ ] |
| Cada fase define pruebas frontend requeridas si aplica. | [ ] |
| Cada fase define pruebas de permisos/roles si aplica. | [ ] |
| Cada fase define pruebas de errores y validaciones. | [ ] |
| Cada fase define pruebas responsive si hay UI. | [ ] |
| Cada fase define checklist de regresión. | [ ] |
| Cada fase actualiza documentación correspondiente. | [ ] |
| Cada fase evita mezclar módulos críticos no relacionados. | [ ] |
| Cada fase debe poder revisarse antes de continuar. | [ ] |

## QA mínimo para backend

- Pruebas de casos de uso.
- Pruebas de validaciones server-side.
- Pruebas de errores esperados.
- Pruebas de permisos.
- Pruebas de idempotencia si aplica.
- Pruebas de no regresión en módulos existentes.

## QA mínimo para Angular

- Validación de formularios.
- Estados visibles.
- Mensajes claros.
- Permisos reflejados en UI.
- Responsive básico.
- Acciones críticas con confirmación.
- No mostrar errores técnicos crudos.

## QA mínimo para Next.js futuro

- Metadata.
- Canonical.
- Structured data.
- Responsive mobile-first.
- Performance básica.
- Imágenes optimizadas.
- No duplicar lógica crítica.
- No consumir endpoints internos.

## Criterio de aprobación

Ninguna fase futura se considera terminada sin pruebas, checklist QA y documentación actualizada.

---

# 15. Criterios de bloqueo

La Fase 0 no debe cerrarse si ocurre cualquiera de estos casos:

- Falta algún ADR del 001 al 019.
- Algún ADR crítico no está aprobado.
- No existe documento de contratos preliminares.
- No existe checklist de validación Fase 0.
- No existe trazabilidad de cierre documental.
- Storefront API y endpoints administrativos se confunden.
- No está claro qué se implementará primero.
- Se pretende empezar por checkout, Mercado Pago o facturación.
- Se pretende tocar AWS/staging antes de fase local estable.
- No están claros los límites de seguridad.
- No están claros los criterios de publicación de producto.
- No está claro cómo se calculará precio online efectivo.
- No está claro cómo se evitará sobreventa.
- No están claros roles y permisos mínimos.
- No hay estándar obligatorio de UX/UI responsive.
- No hay estándar obligatorio de calidad de código.
- Se planea duplicar lógica crítica en frontend.
- Se planea exponer endpoints internos del ERP/POS.

## Criterios de bloqueo específicos para fases futuras

No se debe avanzar a implementación si:

- Se intenta implementar más de una fase crítica en un solo ciclo.
- Se intenta implementar checkout antes de catálogo online validado.
- Se intenta implementar Mercado Pago antes de pedidos y reservas.
- Se intenta implementar facturación antes de venta derivada de pedido.
- Se intenta implementar Next.js público antes de Storefront API y catálogo online.
- Se intenta implementar delivery real sin cobertura/tarifas/UBIGEO definidos.
- Se intenta implementar Merchant Center real sin catálogo, imágenes, precio y disponibilidad consistentes.
- Se intenta tocar AWS/staging sin fase local estable y QA aprobado.
- Se intenta crear migraciones sin diseño aprobado de la fase.
- Se intenta modificar POS/inventario sin análisis de impacto.
- Se intenta usar DTOs administrativos en Storefront API.
- Se intenta calcular precio, stock o envío en frontend como fuente de verdad.
- Se intenta omitir pruebas o QA por fase.
- Se intenta cerrar una fase sin actualizar documentación.

---

# 16. Criterios de aprobación

La Fase 0 puede cerrarse formalmente cuando:

1. ECOM-ADR-001 al ECOM-ADR-019 están aprobados.
2. ECOM-ADR-001 al ECOM-ADR-019 están guardados en `docs/adr/ecommerce/`.
3. `docs/ecommerce/PRELIMINARY_ECOMMERCE_CONTRACTS.md` existe.
4. `docs/qa/PHASE0_ECOMMERCE_VALIDATION_CHECKLIST.md` existe.
5. Este checklist está revisado.
6. No hay contradicciones entre ADRs y contratos.
7. Está confirmada la estrategia local primero.
8. Está confirmado que AWS/staging no se toca todavía.
9. Está confirmado que la primera implementación será catálogo online base.
10. Está confirmado que no se implementará checkout todavía.
11. Está confirmado que no se implementará Mercado Pago todavía.
12. Está confirmado que no se implementará facturación automática todavía.
13. Está confirmado que no se implementará delivery real todavía.
14. Están aprobados criterios técnicos obligatorios.
15. Están aprobados criterios UX/UI obligatorios.
16. Está definido que cada fase futura tendrá QA checklist.
17. Está definido que cada fase futura actualizará documentación correspondiente.
18. Está definido que cada fase futura respetará arquitectura hexagonal.
19. Está definido que cada fase futura tendrá alcance limitado.
20. Está definido que no se aceptará deuda técnica por avanzar rápido.

---

# 17. Próxima fase recomendada

## Fase 1 — Catálogo online base en ERP/POS

Alcance recomendado:

- campos mínimos de publicación online;
- estado de publicación;
- slug;
- marca formal si aún no está lista;
- categoría online preliminar;
- imagen principal conceptual;
- SEO metadata básica;
- precio online efectivo;
- validaciones server-side de publicación;
- endpoints administrativos internos protegidos;
- vista Angular interna mínima solo si corresponde a la fase;
- QA backend/frontend según alcance.

No incluir en esta fase:

- checkout;
- Mercado Pago;
- facturación automática;
- delivery real;
- Storefront API pública productiva;
- Next.js público;
- Merchant Center real;
- AWS/staging;
- promociones;
- listas escolares.

## Motivo

El catálogo online es la base de todo lo demás. Sin catálogo online consistente no se debe implementar tienda pública, carrito, checkout, pagos, facturación, delivery ni Merchant Center.

---

# 18. Decisión de cierre

Con ECOM-ADR-001 al ECOM-ADR-019 aprobados, contratos preliminares formalizados y este checklist completado, la Fase 0 documental ecommerce de InkToy puede considerarse cerrada.

La implementación debe iniciar en local, por fases pequeñas, con bajo riesgo, respetando arquitectura hexagonal, seguridad, QA, UX/UI profesional y documentación incremental.
