# ADR-011 — Precios online, promociones futuras y reglas de cálculo para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, pedidos, ventas, facturación y operación interna. La futura tienda online SEO-first usará Next.js, consumirá datos mediante Storefront API/BFF y no deberá duplicar catálogo, precios ni stock fuera del ERP/POS.

Ya fueron aprobados:

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

Los ADRs previos establecieron que:

- ERP/POS será fuente de verdad del catálogo, precios, stock, pedidos, ventas y facturación.
- La tienda solo consumirá productos publicados mediante Storefront API/BFF.
- No se debe duplicar catálogo, precios ni stock.
- El precio POS será el precio base por defecto.
- Algunos productos podrán tener precio online distinto mediante override server-side.
- El frontend nunca debe definir ni manipular el precio final.
- El precio online efectivo debe calcularse server-side.
- La variante será la unidad vendible concreta cuando existan variantes.
- No se debe crear preferencia Mercado Pago sin validar stock y precios server-side.
- Las reservas, pagos, pedidos, ventas y facturación deben ser transaccionales e idempotentes cuando corresponda.
- Habrá promociones, cupones y precios por volumen en el futuro, pero no necesariamente en la primera versión.

El precio online es una pieza crítica del ecommerce. Afecta conversión, confianza del cliente, Mercado Pago, facturación electrónica, reportes, Merchant Center, SEO técnico y operación interna. Un error de precio puede causar pérdidas económicas, reclamos, comprobantes incorrectos, pagos inconsistentes o reportes no confiables.

## Problema

Se debe definir cómo calcular y administrar los precios online de InkToy sin duplicar información, sin permitir manipulación desde frontend y dejando preparada la arquitectura para promociones futuras.

La decisión debe resolver:

- cuál es la relación entre precio POS y precio online;
- cómo aplicar override online;
- cómo calcular el precio online efectivo;
- cómo manejar precios por variante;
- cómo preparar promociones, cupones y descuentos por volumen futuros;
- cómo asegurar consistencia entre catálogo, carrito, pedido, Mercado Pago, comprobante electrónico y reportes;
- qué precio se expone en Storefront API;
- qué validaciones impiden publicar o comprar productos sin precio válido.

Riesgos si se duplican precios entre POS y tienda:

- precios inconsistentes;
- mantenimiento manual duplicado;
- productos cobrados distinto a lo publicado;
- reportes incorrectos;
- Merchant Center desalineado;
- errores en facturación.

Riesgos si el frontend calcula precios:

- manipulación de precios;
- alteración de descuentos;
- total de pedido falso;
- preferencia Mercado Pago con monto incorrecto;
- comprobante electrónico inconsistente;
- pérdida económica;
- vulnerabilidad de seguridad.

Riesgos si no existe prioridad clara de reglas:

- promociones acumuladas indebidamente;
- overrides aplicados sobre precios incorrectos;
- descuentos duplicados;
- precios por variante mal mostrados;
- diferencias entre listado, detalle, carrito y checkout.

## Decisión

Se decide que el cálculo de precios online será centralizado, server-side y controlado por ERP/POS.

Decisiones principales:

1. ERP/POS será la fuente de verdad de precios.
2. El precio POS será el precio base por defecto.
3. El precio online podrá ser igual al POS por defecto.
4. Algunos productos o variantes podrán tener override online activo.
5. El precio online efectivo se calculará server-side.
6. El frontend solo mostrará precios entregados por Storefront API/BFF.
7. El checkout, pedido, Mercado Pago y facturación usarán precios recalculados por backend o snapshots confirmados por backend.
8. Las promociones futuras deberán implementarse como reglas server-side.
9. No se implementarán promociones, cupones ni precio mayorista en primera versión, salvo decisión posterior.
10. Toda regla de precio deberá ser auditable.
11. No se podrá comprar un producto si el backend no puede calcular un precio válido.
12. No se deberá crear preferencia Mercado Pago si existe inconsistencia de precio.
13. Los precios monetarios deberán manejarse con precisión decimal segura.
14. La moneda inicial será PEN.
15. Los pedidos y ventas deberán guardar snapshot del precio confirmado.

Decisión central:

> El frontend nunca calcula el precio final. El precio mostrado, validado, cobrado, registrado y facturado debe provenir del cálculo server-side del ERP/POS o de la Storefront API/BFF basada en ERP/POS.

## Modelo conceptual recomendado

### BasePrice

Precio base operativo del producto o variante.

En primera versión corresponde al precio usado por POS.

Puede vivir asociado a:

- producto simple;
- variante vendible;
- estructura actual de precios del ERP/POS.

Uso:

- precio por defecto;
- base para cálculo online;
- fallback si no existe override online.

### OnlinePriceOverride

Precio online específico que reemplaza al precio POS para tienda online cuando esté activo.

Debe tener:

- producto o variante asociada;
- monto;
- moneda;
- vigencia opcional;
- estado activo/inactivo;
- auditoría;
- usuario responsable;
- motivo o nota opcional.

Ejemplo:

```text
Precio POS: S/ 10.00
Override online: S/ 9.50
Precio online efectivo: S/ 9.50
```

### EffectiveOnlinePrice

Resultado calculado server-side que representa el precio final vigente para mostrar o usar antes de promociones futuras.

No debe almacenarse como verdad duplicada salvo como snapshot en pedido/venta.

### ProductVariantPrice

Precio asociado a variante vendible.

Ejemplo:

```text
Lapicero Faber-Castell 032 Azul: S/ 2.50
Lapicero Faber-Castell 032 Negro: S/ 2.50
Lapicero Faber-Castell 032 Rojo: S/ 2.80
```

### PriceRule

Regla de precio general.

En primera versión puede limitarse a:

- precio base POS;
- override online.

En fases futuras podrá expandirse a promociones, cupones y volumen.

### PromotionRule futura

Regla promocional futura.

Ejemplos:

- descuento por categoría;
- descuento por marca;
- descuento por producto;
- descuento por campaña escolar;
- combo escolar;
- envío gratis desde monto mínimo.

### Coupon futura

Código aplicado por cliente o por atención comercial.

Debe validarse server-side.

### VolumeDiscount futuro

Descuento por cantidad o volumen.

Ejemplo:

```text
Compra 12 unidades o más: 8% de descuento.
```

No se implementa en primera versión, pero el cálculo debe poder evolucionar.

### PriceCalculationContext

Contexto usado para calcular precio.

Puede incluir:

- producto o variante;
- canal de venta: POS u ONLINE;
- cliente;
- cantidad;
- fecha/hora server-side;
- almacén;
- cupón futuro;
- campaña futura;
- rol/tipo de cliente futuro;
- reglas activas.

### PriceCalculationResult

Resultado del cálculo.

Debe incluir:

- precio base;
- override aplicado o no;
- promociones aplicadas en futuro;
- descuentos aplicados en futuro;
- precio unitario final;
- subtotal;
- total;
- moneda;
- mensajes o advertencias;
- versión/regla de cálculo;
- snapshot para pedido.

### PriceAuditLog

Registro de decisiones relevantes de precio.

Debe permitir responder:

- qué precio se mostró;
- qué precio se cobró;
- qué override estaba activo;
- qué regla se aplicó;
- quién configuró el override;
- cuándo cambió el precio;
- qué precio quedó en el pedido y comprobante.

## Fórmula conceptual de precio online efectivo

### Sin promociones futuras

Primera versión:

```text
precioOnlineEfectivo = onlinePriceOverride activo si existe
precioOnlineEfectivo = precioPOS/base si no existe override activo
```

### Con promociones futuras

Fase futura:

```text
precioOnlineFinal =
  aplicarPromocionesPermitidas(
    precioOnlineEfectivo,
    contextoDeCalculo
  )
```

La fórmula futura no debe improvisarse. Las promociones deberán tener prioridad, acumulabilidad y exclusiones definidas.

### Producto simple

Para producto sin variantes:

```text
precioOnlineEfectivo(producto) =
  overrideOnline(producto) si existe y está activo
  precioPOS(producto) si no existe override
```

### Producto con variantes

Para producto con variantes:

```text
precioOnlineEfectivo(variante) =
  overrideOnline(variante) si existe y está activo
  precioPOS(variante) si existe precio propio de variante
  precioPOS(productoPadre) si la variante hereda precio
```

Si una variante tiene precio distinto, la tienda debe mostrarlo correctamente.

## Moneda, precisión decimal y redondeo

La moneda inicial del ecommerce será PEN.

Reglas:

1. No usar tipos de punto flotante para dinero.
2. Usar tipo decimal seguro en backend y base de datos.
3. Definir escala monetaria compatible con PEN.
4. El redondeo debe ser server-side.
5. El frontend solo formatea montos recibidos, no recalcula totales.
6. Subtotales, descuentos futuros, impuestos y total deben calcularse de forma consistente.
7. El pedido debe guardar snapshot de montos confirmados.
8. La venta y el comprobante deben usar el snapshot confirmado, no recalcular precios históricos.

Regla crítica:

> Un cambio posterior de precio u override no debe alterar pedidos, ventas o comprobantes ya confirmados.

## Prioridad de reglas de precio

Prioridad conceptual recomendada:

1. Precio base POS.
2. Precio propio de variante, si aplica.
3. Override online activo.
4. Promociones futuras.
5. Cupones futuros.
6. Descuentos por volumen futuros.
7. Envío gratis futuro, si aplica.
8. Impuestos y reglas tributarias según facturación.
9. Total final confirmado para pedido, pago y comprobante.

### Reglas que no deben mezclarse todavía

En primera versión no deben implementarse:

- promociones;
- cupones;
- descuentos por volumen;
- combos escolares;
- precios mayoristas;
- envío gratis automático;
- reglas acumulables complejas.

Primera versión recomendada:

```text
Precio POS/base
+ override online opcional
= precio online efectivo
```

Esto reduce riesgo y permite validar ecommerce con una lógica clara.

## Precio por variante

### Variante que hereda precio del producto padre

Aplica cuando todas las variantes tienen el mismo precio.

Ejemplo:

```text
Lapicero Faber-Castell 032
Azul, negro y rojo: S/ 2.50
```

### Variante con precio propio

Aplica cuando la variante cambia costo, presentación, empaque o valor comercial.

Ejemplo:

```text
Cinta satinada 1 cm: S/ 3.00
Cinta satinada 2 cm: S/ 5.00
```

### Variante con override online

Aplica cuando solo una variante tendrá precio online distinto.

Ejemplo:

```text
Precio POS variante roja: S/ 2.80
Override online variante roja: S/ 2.50
```

### Riesgo de mostrar precio del padre

Si la variante tiene precio distinto y la tienda muestra solo el precio del producto padre, puede ocurrir:

- reclamo del cliente;
- diferencia entre listado y detalle;
- diferencia entre carrito y checkout;
- Merchant Center inconsistente;
- pérdida de confianza.

Regla:

> Si las variantes tienen precios diferentes, el listado debe mostrar “desde S/ X” o rango de precios, y el detalle debe actualizar precio según variante seleccionada.

## Relación con catálogo online

### Precio en listado

El listado debe mostrar:

- precio online efectivo si producto simple;
- precio de variante por defecto si todas tienen mismo precio;
- “desde S/ X” si existen variantes con precios distintos;
- estado no comprable si no existe precio válido.

Ejemplo:

```text
Desde S/ 2.50
```

### Precio en detalle

El detalle debe mostrar:

- precio de la variante seleccionada;
- precio online efectivo calculado server-side;
- disponibilidad asociada;
- mensajes si cambia precio al seleccionar variante.

### Producto publicado sin precio válido

No debe ser comprable.

Según la política de publicación, podría bloquearse su publicación online o mostrarse como no disponible.

Regla recomendada:

> No publicar como comprable ningún producto sin precio válido calculable.

### Validaciones de publicación o compra

Antes de publicar o comprar:

- producto activo;
- publicado online;
- precio POS/base válido o override válido;
- precio mayor a cero salvo política explícita;
- moneda válida;
- stock disponible online;
- imagen principal;
- slug;
- metadata mínima.

## Relación con Storefront API/BFF

La Storefront API debe exponer precios públicos ya calculados.

### En listado

Debe exponer:

```text
price {
  currency
  amount
  displayText
  priceType
}
```

Ejemplos de `priceType`:

```text
FIXED
FROM
UNAVAILABLE
```

### En detalle

Debe exponer:

- precio online efectivo del producto o variante;
- rango si aplica;
- precio por variante;
- moneda;
- flags públicos mínimos.

### En validación de carrito

Debe recalcular:

- precio unitario efectivo;
- subtotal por línea;
- descuentos futuros si aplica;
- total final;
- moneda.

### Datos internos que no debe exponer

No debe exponer:

- costo;
- margen;
- fórmula interna completa;
- auditoría;
- reglas internas sensibles;
- usuario que configuró override;
- precios de proveedor.

### Por qué la API entrega precio ya calculado

Para evitar:

- manipulación en frontend;
- duplicidad de lógica;
- inconsistencias;
- cálculos distintos entre Next.js y backend;
- diferencias entre pedido, pago y comprobante.

## Relación con carrito y checkout

### Revalidación server-side

El carrito mostrado en frontend no es una fuente confiable.

Antes de checkout, el backend debe recalcular:

- productos publicados;
- variantes activas;
- stock disponible;
- precio online efectivo;
- cantidades;
- subtotal;
- total;
- restricciones de venta.

### Antes de crear pedido

El backend debe crear un snapshot de precios del pedido.

El pedido debe guardar:

- precio unitario confirmado;
- subtotal;
- descuentos futuros;
- total;
- moneda;
- versión/regla de cálculo si aplica.

### Antes de crear preferencia Mercado Pago

El backend debe recalcular o validar que el snapshot sigue vigente.

No debe crear preferencia si hay diferencia crítica no aceptada por el cliente.

### Si el precio cambia entre carrito y checkout

El sistema debe:

1. Bloquear avance automático.
2. Informar al cliente.
3. Mostrar precio actualizado.
4. Requerir confirmación del cliente.
5. Revalidar carrito.

Mensaje conceptual:

```text
El precio de uno o más productos cambió. Revisa el nuevo total antes de continuar.
```

## Relación con Mercado Pago

Mercado Pago debe recibir montos calculados por backend.

Reglas:

1. No confiar en monto enviado por frontend.
2. Crear preferencia con total server-side.
3. Asociar preferencia a pedido y snapshot de precio.
4. Usar idempotencia.
5. Evitar crear varias preferencias activas para el mismo pedido sin política clara.
6. No permitir pago si el precio quedó desactualizado.
7. Validar webhook contra pedido y monto esperado.

### Si el precio cambia después de creada la preferencia

Si la preferencia ya fue creada:

- no modificar silenciosamente el precio;
- si el pedido no fue pagado, puede expirar o cancelarse y crear nuevo intento;
- si el pago fue aprobado, se respeta el snapshot del pedido pagado;
- si hay inconsistencia, se crea incidencia.

Regla:

> El comprobante y la venta deben usar el precio confirmado en el pedido pagado, no un precio recalculado posteriormente.

## Relación con facturación automática

La facturación debe usar precios confirmados del pedido/venta.

Reglas:

1. No facturar con precios enviados por frontend.
2. No facturar si el total pagado no coincide con el total confirmado.
3. No facturar si existe inconsistencia de precio.
4. No facturar si hay incidencia de stock.
5. El comprobante debe reflejar:
   - precio unitario;
   - subtotal;
   - descuentos futuros si existen;
   - impuestos;
   - total.
6. La venta debe conservar snapshot de precios.

### Diferencia entre pago aprobado y total calculado

Si Mercado Pago aprueba un monto diferente al total esperado:

- no facturar automáticamente;
- no convertir automáticamente a venta;
- marcar incidencia de pago/precio;
- requerir revisión manual.

Estado conceptual futuro:

```text
PAYMENT_AMOUNT_MISMATCH
```

## Relación con promociones futuras

Las promociones no se implementarán al inicio, pero el modelo debe quedar preparado.

Tipos futuros:

- cupón;
- descuento por categoría;
- descuento por marca;
- descuento por producto;
- descuento por volumen;
- combos escolares;
- envío gratis desde cierto monto;
- campaña escolar;
- promociones por temporada.

### Reglas futuras

Las promociones deberán tener:

- vigencia;
- prioridad;
- condiciones;
- productos/categorías/marcas aplicables;
- acumulabilidad;
- exclusiones;
- límite de uso;
- auditoría;
- cálculo server-side.

### Evitar acumulaciones incorrectas

Debe definirse en una fase futura:

- si cupón acumula con promoción;
- si descuento por volumen acumula con override;
- si envío gratis se calcula antes o después de descuentos;
- si promociones aplican sobre precio POS u online efectivo;
- si hay máximo descuento permitido.

Primera versión no implementa esto para evitar complejidad prematura.

## Relación con Merchant Center

El feed futuro debe usar el precio online efectivo.

Reglas:

1. Precio del feed debe coincidir con landing page.
2. Precio debe coincidir con Storefront API.
3. Si existe override online activo, el feed debe usarlo.
4. Si existen variantes con precio distinto, el feed debe reflejar precio por variante.
5. Si existen promociones futuras, se debe definir cómo se exponen.
6. Evitar diferencias entre Merchant Center y página de producto.

Riesgo crítico:

> Si Merchant Center muestra un precio diferente al de la landing page, los productos pueden ser rechazados o generar mala experiencia.

## Relación con SEO

El precio mostrado debe ser confiable.

Impacta:

- Schema.org Product;
- disponibilidad;
- snippets enriquecidos;
- confianza del usuario;
- Merchant Center;
- consistencia de landing page.

Reglas:

1. No indexar como comprable un producto sin precio válido.
2. Schema.org debe usar precio online efectivo.
3. El precio visible debe coincidir con precio estructurado.
4. Productos sin precio válido no deben permitir compra.
5. Si un producto está publicado solo como informativo, debe tener política clara.

## Reglas de negocio

Reglas obligatorias:

1. No publicar producto comprable sin precio válido.
2. No permitir precio negativo.
3. No permitir precio cero salvo política explícita aprobada.
4. No confiar en precio enviado por frontend.
5. No crear pedido si el precio no puede recalcularse.
6. No crear preferencia Mercado Pago con precio desactualizado.
7. No facturar si hay inconsistencia de precio/pago.
8. Toda regla de precio debe auditarse.
9. El precio online efectivo debe calcularse server-side.
10. El precio del comprobante debe venir del pedido/venta confirmada.
11. El precio de Merchant Center debe coincidir con la tienda.
12. Si una variante tiene precio distinto, el frontend debe mostrarlo correctamente.
13. Si el precio cambia durante checkout, el cliente debe confirmar el nuevo total.
14. No implementar promociones sin reglas de prioridad y acumulabilidad.
15. Usar moneda PEN como moneda inicial.
16. Manejar dinero con precisión decimal, no con punto flotante.
17. Guardar snapshot de precio en pedido/venta.
18. No alterar pedidos históricos por cambios posteriores de precio.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Usar solo precio POS | Aceptable como base inicial, pero insuficiente como solución final porque InkToy necesita precio online distinto en algunos productos. |
| Duplicar precios en la tienda | Descartada. Rompe ERP/POS como fuente de verdad y genera inconsistencias. |
| Calcular precio en frontend | Descartada. Riesgo alto de manipulación y diferencias con pago/facturación. |
| Permitir override online server-side | Aceptada. Permite precio online distinto sin duplicar catálogo ni perder control. |
| Implementar promociones desde el inicio | Descartada para primera versión. Aumenta complejidad; se prepara arquitectura para fases futuras. |

## Justificación

### Seguridad

El cliente no puede modificar precios, descuentos ni totales desde frontend.

### Operación real

El negocio puede mantener precio POS como base y ajustar precios online cuando sea necesario.

### Consistencia POS/ecommerce

ERP/POS mantiene la fuente de verdad y evita duplicidad.

### Mantenibilidad

Las reglas de precio quedan centralizadas y auditables.

### Mercado Pago

El monto pagado coincide con el total calculado por backend.

### Facturación

El comprobante se genera con precios confirmados y consistentes.

### Merchant Center

El feed puede usar el mismo precio online efectivo que la tienda.

### Bajo riesgo

Primera versión usa lógica simple: precio POS más override online opcional.

## Consecuencias positivas

- Reduce riesgo de manipulación de precios.
- Mantiene ERP/POS como fuente de verdad.
- Permite precio online distinto sin duplicar catálogo.
- Prepara promociones futuras.
- Mejora consistencia con Mercado Pago.
- Mejora consistencia con facturación.
- Mejora consistencia con Merchant Center.
- Permite auditoría de cambios de precio.
- Permite manejar precios por variante.
- Reduce errores entre listado, detalle, carrito y checkout.
- Protege pedidos históricos mediante snapshots de precio.

## Consecuencias negativas o costos

- Se requiere modelo formal para override online.
- Se requiere cálculo server-side.
- Se requiere validación de precios en carrito y checkout.
- Se requiere snapshot de precio en pedido.
- Se requiere auditoría.
- Se requiere UI futura para administrar precios online.
- Las promociones futuras requerirán diseño adicional de reglas.
- Se requiere controlar redondeo, precisión decimal y consistencia tributaria.

Estos costos son aceptables porque el precio es una variable crítica de seguridad, operación y facturación.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Manipulación de precios | Cálculo server-side y rechazo de precios enviados por frontend. |
| Diferencia entre precio mostrado y cobrado | Revalidación antes de checkout y confirmación si cambia. |
| Diferencia entre Mercado Pago y comprobante | Pedido guarda snapshot y facturación usa venta/pedido confirmado. |
| Override mal configurado | Validaciones, auditoría y roles autorizados. |
| Override vencido activo | Vigencia server-side y revisión futura. |
| Promociones acumuladas incorrectamente | No implementar promociones sin reglas explícitas de prioridad. |
| Precio por variante inconsistente | Cálculo por variante vendible y UI con “desde S/” o precio seleccionado. |
| Merchant Center con precio distinto | Feed usa mismo cálculo server-side. |
| Reportes incorrectos | Guardar snapshot de precio y reglas aplicadas. |
| Errores de redondeo | Redondeo server-side y precisión decimal. |
| Cambios de precio alteran pedidos históricos | Snapshot inmutable de pedido/venta. |

## Impacto técnico

### Catálogo backend

Debe soportar precio online override y validaciones de precio.

### Variantes

Debe calcular precio por variante vendible.

### Storefront API

Debe exponer precio online efectivo ya calculado.

### Carrito

Debe revalidar precios server-side.

### Pedidos online

Debe guardar snapshot de precio confirmado.

### Mercado Pago

Debe crear preferencia con total calculado por backend.

### Facturación automática

Debe usar precios confirmados de venta/pedido.

### Reportes

Deben distinguir precio POS, override online, descuentos futuros y precio final.

### Merchant Center

Debe usar precio online efectivo.

### Frontend Angular interno

Necesitará UI futura para administrar overrides online y revisar auditoría.

### Next.js futuro

Solo mostrará precios entregados por Storefront API.

### Auditoría

Debe registrar cambios de precio y cálculo aplicado en operaciones críticas.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba que ERP/POS será fuente de verdad de precios.
2. Se aprueba que precio POS será precio base por defecto.
3. Se aprueba que puede existir override online server-side.
4. Se aprueba que precio online efectivo se calcula server-side.
5. Se aprueba que frontend no define ni manipula precio final.
6. Se aprueba que Storefront API expone precio efectivo ya calculado.
7. Se aprueba que carrito, pedido, Mercado Pago y facturación recalculan o usan snapshot backend.
8. Se aprueba que promociones futuras serán reglas server-side.
9. Se aprueba que no se implementan promociones/cupones/mayorista en primera versión.
10. Se aprueba que productos sin precio válido no serán comprables.
11. Se aprueba que precios por variante deben manejarse correctamente.
12. Se aprueba que Merchant Center futuro usará precio online efectivo.
13. Se aprueba que toda regla de precio debe auditarse.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar promociones;
- implementar cupones;
- implementar precio mayorista;
- implementar checkout;
- implementar Mercado Pago;
- crear endpoints;
- crear migraciones;
- modificar productos actuales;
- modificar POS;
- activar venta online;
- implementar Merchant Center;
- crear UI de precios online;
- crear reglas de acumulación de descuentos;
- cambiar facturación;
- tocar AWS/staging.

Este ADR solo define la estrategia de precios online, overrides y preparación para promociones futuras. La implementación debe ocurrir en fases posteriores, alineada con catálogo online, Storefront API, pedidos online, Mercado Pago, facturación, Merchant Center y reportes.

## Decisión resultante

InkToy mantendrá el ERP/POS como fuente de verdad de precios. El precio POS será el precio base por defecto para ecommerce, pero algunos productos o variantes podrán tener un precio online distinto mediante override server-side.

El precio online efectivo será calculado por backend y expuesto por Storefront API/BFF. El frontend solo mostrará precios recibidos y nunca calculará ni enviará precios finales confiables.

Carrito, checkout, pedido, Mercado Pago, venta, facturación, reportes y Merchant Center deberán usar precios calculados o confirmados por backend. Los pedidos y ventas deberán conservar snapshot de precios confirmados para evitar que cambios posteriores alteren operaciones históricas.

Las promociones, cupones, descuentos por volumen y precios mayoristas quedan preparados para fases futuras, pero no se implementan en la primera versión.
