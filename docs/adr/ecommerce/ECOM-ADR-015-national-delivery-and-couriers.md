# ADR-015 — Delivery nacional y couriers para la futura tienda online SEO-first de InkToy

## Estado

Aprobado.

## Contexto

InkToy ERP/POS será la fuente de verdad para catálogo, precios, stock, pedidos, ventas, facturación y operación interna. La futura tienda online SEO-first usará Next.js, será publicada en `inktoy.pe` y consumirá datos mediante Storefront API/BFF desde `api.inktoy.pe`.

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
- ADR-011: Precios online, promociones futuras y reglas de cálculo.
- ADR-012: Pedidos online y lifecycle ecommerce.
- ADR-013: Mercado Pago, webhook e idempotencia.
- ADR-014: Facturación automática ecommerce.

Los ADRs previos establecieron que:

- ERP/POS será fuente de verdad de catálogo, precios, stock, pedidos, ventas y facturación.
- El pedido online será una entidad formal dentro del ERP/POS.
- El pedido online no será venta hasta cumplir condiciones específicas.
- El pedido guardará snapshot de productos, precios, cliente, dirección, envío y totales.
- El frontend nunca decidirá precios, stock, descuentos, totales, estado del pedido, estado del pago ni costo final de envío.
- No se convertirá pedido a venta sin pago aprobado, monto validado y reserva confirmada.
- La facturación automática ecommerce se ejecutará sobre ventas válidas derivadas de pedidos online consistentes.
- No habrá recojo en tienda ni pago contraentrega en la primera versión.
- Habrá delivery a todo el Perú, pero la implementación debe ser realista, segura y operativamente controlada.
- Se están evaluando couriers como Shalom, Olva Courier, Urbano u otros.
- La política exacta de costos de envío aún no está cerrada.
- La integración API con couriers no debe asumirse como obligatoria desde la primera versión.
- El sistema debe quedar preparado para integración courier futura, tracking, estados de despacho, costos configurables y operación de fulfillment.

El delivery es una parte crítica del ecommerce porque afecta conversión, costo total, satisfacción del cliente, reclamos, devoluciones, facturación, atención postventa y reputación de la tienda.

## Problema

Se debe definir cómo funcionará el delivery nacional de InkToy sin prometer más de lo que la operación puede cumplir y sin acoplar prematuramente el sistema a un courier específico.

La decisión debe resolver:

- cómo capturar dirección de envío;
- cómo validar datos mínimos de entrega;
- cómo calcular costo de envío;
- cómo mostrar el costo antes del pago;
- cómo guardar snapshot de envío en el pedido;
- cómo asignar courier;
- cómo registrar tracking;
- cómo manejar estados de preparación y despacho;
- cómo manejar incidencias de entrega;
- cómo preparar integración API futura con couriers;
- cómo evitar exponer datos personales o información interna;
- cómo administrar departamentos, provincias y distritos de forma controlada;
- cómo evitar texto libre en ubicaciones estructuradas;
- cómo relacionar ubicación con cobertura, zonas logísticas, courier y tarifa.

Riesgos de ofrecer delivery nacional sin reglas claras:

- pedidos pagados en zonas no operables;
- costos de envío mal calculados;
- pérdidas por envíos subsidiados sin control;
- reclamos por tiempos de entrega no cumplidos;
- direcciones incompletas;
- pedidos sin tracking;
- atención al cliente sin trazabilidad;
- facturación o pago con total incorrecto;
- mala experiencia del cliente.

Riesgos de integrar courier demasiado pronto:

- dependencia prematura de un proveedor;
- API incompleta o inestable;
- reglas de negocio del courier no validadas;
- sobreingeniería antes de tener volumen real;
- errores por cobertura, tarifas o tracking no confirmados;
- dificultad para cambiar de courier.

Riesgos de permitir texto libre para departamento, provincia o distrito:

- ubicaciones inconsistentes;
- duplicidad de nombres;
- costos mal calculados;
- courier incorrecto;
- pedidos pagados en zonas no cubiertas;
- errores de despacho;
- dificultad de tracking;
- reportes logísticos poco confiables.

## Decisión

Se decide soportar delivery nacional con una estrategia progresiva, comenzando con un flujo manual o semi-automatizado, pero modelado formalmente para permitir integración futura con couriers.

Decisiones principales:

1. Delivery nacional será soportado, pero con cobertura y reglas configurables.
2. La primera versión usará flujo manual o semi-automatizado, sin integración API obligatoria con courier.
3. El costo de envío se calculará server-side.
4. El costo de envío formará parte del snapshot del pedido.
5. El cliente deberá ver y aceptar el costo de envío antes de pagar.
6. El pedido deberá guardar dirección estructurada y datos de contacto.
7. El ERP/POS deberá registrar courier asignado, tracking y estados de despacho.
8. La integración con Shalom, Olva Courier, Urbano u otro courier se evaluará en fase posterior.
9. No se debe prometer cobertura, tiempos o costos que no puedan operarse.
10. El sistema debe quedar preparado para reglas de envío configurables, zonas, tarifas, envío gratis futuro e integración API futura.
11. No se debe activar delivery nacional real sin checklist operativo mínimo.
12. Departamento, provincia y distrito se seleccionarán desde catálogos controlados.
13. El ERP/POS será la fuente de verdad del catálogo geográfico/logístico.
14. El cliente no deberá escribir libremente departamento, provincia ni distrito.
15. El backend validará ubicación, cobertura, zona logística y costo antes de permitir el pago.

Decisión central:

> InkToy ofrecerá delivery nacional mediante una estrategia controlada: primero con reglas configurables y operación semi-automatizada; luego con integración courier por API cuando exista validación operativa, técnica y económica suficiente. La ubicación del cliente se seleccionará desde catálogos controlados de departamento, provincia y distrito, y el backend calculará cobertura y costo de envío antes del pago.

## Modelo conceptual recomendado

### ShippingAddress

Dirección estructurada asociada al pedido.

Debe contener:

- destinatario;
- celular;
- email;
- departamento;
- provincia;
- distrito;
- UBIGEO o código geográfico normalizado cuando aplique;
- dirección;
- referencia;
- documento si aplica;
- observaciones;
- validaciones mínimas.

### DeliveryMethod

Método de entrega.

En primera versión:

```text
DELIVERY_NACIONAL
```

No se incluirá recojo en tienda ni pago contraentrega en la primera versión.

### Courier

Courier o transportista.

Debe permitir registrar:

- nombre;
- tipo;
- activo/inactivo;
- cobertura;
- datos de contacto;
- integración futura;
- estado operativo;
- observaciones.

Ejemplos conceptuales:

```text
SHALOM
OLVA_COURIER
URBANO
OTHER
MANUAL
```

### ShippingRate

Regla de tarifa de envío.

Puede depender de:

- departamento;
- provincia;
- distrito;
- zona;
- monto de compra;
- courier;
- política de envío gratis;
- vigencia;
- estado activo.

### ShippingZone

Agrupación operativa de cobertura.

Ejemplos:

- Lima Metropolitana;
- Lima Provincias;
- Costa;
- Sierra;
- Selva;
- zonas especiales;
- zona no disponible;
- zona con cotización manual.

La definición exacta debe poder evolucionar sin tocar código.

### Shipment

Entidad o subentidad que representa el despacho de un pedido.

Debe contener:

- pedido asociado;
- courier asignado;
- tracking;
- estado;
- fecha de preparación;
- fecha de despacho;
- fecha estimada;
- fecha de entrega;
- incidencia si aplica;
- auditoría.

### ShipmentStatus

Estado del envío o despacho.

Debe ser controlado por backend.

### TrackingReference

Referencia de tracking entregada por courier o registrada manualmente.

Debe poder existir aunque la integración API aún no esté implementada.

### DeliveryIncident

Incidencia logística.

Ejemplos:

```text
ADDRESS_INCOMPLETE
ZONE_NOT_COVERED
COURIER_REJECTED
TRACKING_NOT_AVAILABLE
DELIVERY_DELAYED
DELIVERY_FAILED
CUSTOMER_NOT_REACHABLE
RETURN_REQUIRED
```

### ShippingCostSnapshot

Snapshot del costo de envío usado en el pedido.

Debe conservar:

- costo confirmado;
- moneda;
- regla aplicada;
- zona;
- courier si aplica;
- envío gratis si aplica;
- fecha/hora de cálculo.

### OnlineOrderDeliveryInfo

Bloque de información de delivery dentro del pedido online.

Debe permitir relacionar:

- dirección;
- costo;
- método;
- courier;
- tracking;
- estado;
- incidencias.

## Catálogo geográfico, UBIGEO y selección controlada de ubicación

La tienda online no debe permitir que el cliente escriba libremente el departamento, provincia o distrito. Para reducir errores operativos, mejorar el cálculo de envío y preparar futuras integraciones courier, la ubicación del cliente deberá seleccionarse desde catálogos controlados.

El ERP/POS será la fuente de verdad del catálogo geográfico usado para delivery. La tienda pública podrá consumir esta información mediante Storefront API/BFF, pero no deberá mantener un catálogo geográfico independiente.

### Modelo conceptual geográfico

El modelo de delivery deberá contemplar, como mínimo:

- Departamento.
- Provincia.
- Distrito.
- UBIGEO o código geográfico normalizado cuando aplique.
- Estado activo/inactivo.
- Cobertura de delivery.
- Zona logística.
- Tarifa asociada.
- Courier disponible.
- Indicador de cotización manual si aplica.

Modelo conceptual recomendado:

```text
Department
Province
District
ShippingZone
ShippingCoverage
ShippingRate
CourierCoverage
```

El catálogo geográfico debe separarse de las reglas comerciales de envío. Un distrito puede existir en el catálogo maestro aunque InkToy aún no lo cubra o aunque requiera cotización manual.

### Campos recomendados

Para `Department`:

- id;
- code;
- name;
- normalizedName;
- active.

Para `Province`:

- id;
- departmentId;
- code;
- name;
- normalizedName;
- active.

Para `District`:

- id;
- provinceId;
- ubigeo;
- name;
- normalizedName;
- active.

Para `ShippingCoverage`:

- districtId;
- coverageStatus: `COVERED`, `NOT_COVERED`, `MANUAL_QUOTE`;
- shippingZoneId;
- active.

Para `ShippingZone`:

- id;
- name;
- description;
- active.

Para `ShippingRate`:

- id;
- shippingZoneId;
- districtId opcional;
- provinceId opcional;
- departmentId opcional;
- amount;
- currency;
- freeShippingThreshold opcional;
- active;
- validFrom;
- validTo opcional.

Para `CourierCoverage`:

- courierId;
- districtId o shippingZoneId;
- active;
- manualOnly.

### Carga inicial y mantenimiento

La información de departamentos, provincias, distritos y UBIGEO debe cargarse desde un dataset inicial confiable, revisado y versionado. No se recomienda registrar esta información manualmente uno por uno porque aumenta el riesgo de duplicados, errores de escritura, nombres inconsistentes o códigos incorrectos.

La carga inicial debería realizarse mediante seed controlado o migración versionada en una fase futura. La administración interna podrá modificar cobertura, zona logística, tarifa, courier y estado operativo, pero no debería editar libremente nombres oficiales o códigos geográficos sin un proceso controlado.

Reglas de mantenimiento:

1. La carga inicial debe ser repetible y versionada.
2. La fuente del dataset debe documentarse.
3. Los cambios de nombres oficiales o códigos geográficos deben controlarse.
4. Las reglas comerciales de cobertura y tarifas pueden evolucionar sin tocar el catálogo geográfico base.
5. Los cambios de cobertura, zona, tarifa o courier deben ser auditables.

### Comportamiento en checkout

El selector de ubicación deberá funcionar de forma jerárquica:

1. El cliente selecciona departamento.
2. El sistema muestra provincias activas del departamento seleccionado.
3. El cliente selecciona provincia.
4. El sistema muestra distritos activos de la provincia seleccionada.
5. El cliente selecciona distrito.
6. El backend valida distrito, cobertura y zona logística.
7. El backend calcula el costo de envío.
8. El cliente ve el costo de envío antes de pagar.
9. El pedido guarda snapshot de ubicación, zona, regla aplicada y costo de envío.

El frontend no debe calcular el costo final de envío ni decidir cobertura. Solo debe mostrar opciones y resultados entregados por Storefront API/BFF.

### Relación con Storefront API/BFF

Storefront API/BFF deberá exponer endpoints públicos controlados para:

- listar departamentos activos;
- listar provincias activas por departamento;
- listar distritos activos por provincia;
- validar distrito seleccionado;
- calcular costo de envío;
- informar si una zona está cubierta, no cubierta o requiere cotización manual.

Storefront API/BFF no debe exponer:

- costos internos del courier;
- márgenes;
- reglas internas completas;
- configuración sensible;
- información operativa no necesaria para checkout.

### Relación con Angular interno

Angular interno deberá permitir en una fase futura:

- administrar cobertura por distrito o zona;
- asignar zonas logísticas;
- configurar tarifas;
- activar/desactivar cobertura;
- definir cotización manual;
- asociar couriers disponibles;
- auditar cambios de cobertura y tarifas.

No se recomienda que usuarios internos editen libremente nombres oficiales de departamentos, provincias o distritos sin proceso controlado.

### Reglas obligatorias de ubicación

- No permitir texto libre para departamento, provincia ni distrito.
- Departamento, provincia y distrito deben seleccionarse desde catálogos controlados.
- El distrito debe tener UBIGEO o identificador geográfico normalizado cuando aplique.
- No permitir pago si el distrito no existe, está inactivo, no tiene cobertura o requiere cotización manual pendiente.
- El costo de envío debe calcularse server-side.
- El pedido debe guardar snapshot de departamento, provincia, distrito, UBIGEO, zona logística, regla aplicada y costo de envío.
- La tienda pública no debe duplicar ni administrar el catálogo geográfico maestro.
- Las tarifas y cobertura deben administrarse desde el ERP/POS o configuración interna autorizada.
- No exponer al cliente reglas internas completas, costos internos, márgenes ni información operativa sensible.
- Los cambios de cobertura, zona o tarifa deben ser auditables.

### Riesgos mitigados

Esta decisión mitiga:

- direcciones inconsistentes;
- costos de envío mal calculados;
- courier incorrecto;
- pedidos pagados en zonas no cubiertas;
- errores de despacho;
- dificultad para tracking;
- pérdida de trazabilidad;
- mala experiencia del cliente;
- reportes logísticos poco confiables;
- problemas futuros de integración con courier.

## Datos mínimos de dirección

Para permitir pago y delivery, el pedido debe tener como mínimo:

- nombres y apellidos del destinatario;
- celular;
- email;
- departamento seleccionado desde catálogo;
- provincia seleccionada desde catálogo;
- distrito seleccionado desde catálogo;
- UBIGEO o código geográfico normalizado cuando aplique;
- dirección exacta;
- referencia;
- documento si aplica;
- observaciones opcionales;
- costo de envío calculado;
- método de envío;
- estado de envío inicial.

Datos que podrán agregarse en fases posteriores:

- courier seleccionado o asignado;
- tracking;
- fecha estimada;
- comprobante de entrega;
- geolocalización si se decide usarla;
- validación externa de dirección;
- zona logística normalizada.

Regla crítica:

> No se debe permitir pago si la dirección mínima, ubicación controlada o costo de envío aplicable no están definidos.

## Estados recomendados de delivery/despacho

### PENDING_SHIPPING_INFO

Estado opcional cuando falta información de envío.

Uso:

- dirección incompleta;
- zona no validada;
- falta costo de envío.

No debe permitir pago si el envío es obligatorio.

### SHIPPING_PENDING

Pedido con envío pendiente de preparación.

Uso:

- pedido creado;
- dirección y costo definidos;
- todavía no inicia preparación.

### READY_TO_PREPARE

Pedido pagado, reserva confirmada y listo para preparación.

Puede coincidir con el lifecycle de pedido definido en ADR-012.

### PREPARING

El equipo está preparando el pedido.

Uso:

- productos separándose;
- embalaje en proceso;
- verificación operativa.

### READY_TO_SHIP

Pedido preparado y listo para entregar a courier.

Uso:

- paquete listo;
- pendiente de asignación o recojo por courier.

### COURIER_ASSIGNED

Courier asignado.

Uso:

- se eligió Shalom, Olva, Urbano, courier manual u otro;
- puede o no existir tracking todavía.

### SHIPPED

Pedido despachado.

Uso:

- entregado al courier;
- enviado al cliente;
- tracking puede estar registrado.

### IN_TRANSIT

Pedido en tránsito.

Uso:

- courier informa movimiento;
- o se registra manualmente el estado.

### DELIVERED

Pedido entregado.

Uso:

- entrega confirmada por courier, operador o cliente.

### DELIVERY_FAILED

Entrega fallida.

Uso:

- dirección incorrecta;
- cliente ausente;
- courier no pudo entregar;
- incidencia logística.

### RETURN_PENDING

Estado futuro para devolución pendiente.

Uso:

- pedido debe retornar al origen;
- se definirá en fase posterior.

### RETURNED

Estado futuro para pedido retornado.

Uso:

- producto regresó a InkToy;
- requiere tratamiento operativo, contable y tributario.

### DELIVERY_CANCELLED

Despacho cancelado.

Uso:

- pedido cancelado antes de despacho;
- courier cancelado;
- error operativo.

## Flujo recomendado

### 1. Cliente selecciona ubicación e ingresa dirección

En checkout, el cliente selecciona:

- departamento;
- provincia;
- distrito.

Luego ingresa:

- dirección exacta;
- referencia;
- celular;
- email;
- datos del destinatario.

### 2. Backend valida zona y datos mínimos

Storefront API/BFF valida:

- departamento/provincia/distrito existentes y activos;
- distrito asociado correctamente a provincia;
- provincia asociada correctamente a departamento;
- UBIGEO o código geográfico válido cuando aplique;
- cobertura configurada;
- política de envío aplicable;
- si requiere cotización manual.

### 3. Backend calcula costo de envío

El backend calcula costo según reglas configuradas.

El frontend solo muestra el resultado.

### 4. Cliente ve costo antes del pago

El cliente debe ver:

- subtotal de productos;
- costo de envío;
- total;
- restricciones o mensaje de cobertura si aplica.

No debe pagar sin conocer el costo final.

### 5. Pedido guarda snapshot de envío

Al crear pedido:

- se guarda ubicación;
- se guarda dirección;
- se guarda costo;
- se guarda zona;
- se guarda regla aplicada;
- se guarda método de delivery.

### 6. Pago con Mercado Pago

El monto enviado a Mercado Pago incluye productos + envío confirmado.

### 7. Pedido pagado y reserva confirmada

El pedido puede pasar a preparación solo si:

- pago aprobado;
- monto validado;
- reserva confirmada;
- dirección válida;
- costo de envío confirmado.

### 8. Operador prepara pedido

Desde Angular interno futuro:

- ver pedidos listos para preparar;
- revisar items;
- embalar;
- marcar como `PREPARING` o `READY_TO_SHIP`.

### 9. Operador asigna courier

El operador selecciona:

- Shalom;
- Olva Courier;
- Urbano;
- otro courier;
- despacho manual.

### 10. Operador registra tracking

Si existe tracking:

- se registra número;
- se registra fecha;
- se registra courier;
- se marca `SHIPPED` o `IN_TRANSIT`.

### 11. Pedido pasa a enviado

El cliente puede ver estado público seguro:

```text
Pedido enviado
Pedido en camino
```

### 12. Pedido se actualiza a entregado o incidencia

Operador o integración futura actualiza:

- `DELIVERED`;
- `DELIVERY_FAILED`;
- `RETURN_PENDING`;
- `RETURNED`.

### 13. Futuro: integración API courier

Cuando se valide el courier:

- generación automática de guía;
- cotización automática;
- tracking automático;
- actualización de estados;
- conciliación logística.

## Costos de envío

### Alternativas evaluadas

#### Tarifa plana nacional

Ventajas:

- simple para el cliente;
- fácil de comunicar;
- rápida de implementar.

Desventajas:

- alto riesgo de perder dinero en zonas lejanas;
- puede ser injusta para clientes cercanos;
- no refleja variación real de courier.

No se recomienda como única política nacional si no hay datos suficientes.

#### Tarifa por departamento/provincia/distrito

Ventajas:

- más realista;
- permite ajustar costos según zona;
- reduce pérdida por envíos caros.

Desventajas:

- requiere mantener tabla de tarifas;
- requiere datos operativos;
- puede ser más complejo para administración.

Recomendada como base progresiva.

#### Tarifa por zona

Ventajas:

- balance entre simplicidad y control;
- más fácil de administrar que distrito por distrito;
- permite agrupar costos.

Desventajas:

- puede ser imprecisa para algunas zonas;
- requiere definición operativa de zonas.

Recomendada para primera versión.

#### Envío gratis desde cierto monto

Ventajas:

- aumenta ticket promedio;
- mejora conversión;
- útil para campañas.

Desventajas:

- puede generar pérdida si no se calcula margen;
- requiere reglas de rentabilidad.

Debe prepararse, pero no activarse sin análisis de margen.

#### Cotización manual

Ventajas:

- reduce riesgo en zonas no claras;
- útil para pedidos especiales;
- útil antes de tener integración courier.

Desventajas:

- reduce conversión;
- aumenta trabajo operativo;
- puede frustrar al cliente si se abusa.

Útil para zonas no configuradas o pedidos especiales.

### Política inicial recomendada

Recomendación inicial de bajo riesgo:

1. Usar tarifas configurables por zona.
2. Definir zonas iniciales simples:
   - Lima Metropolitana;
   - Lima Provincias;
   - Costa;
   - Sierra;
   - Selva;
   - zonas con cotización manual.
3. Permitir tarifa por departamento/provincia/distrito cuando se tenga más información.
4. Permitir envío gratis como regla futura, pero no activarla sin análisis.
5. Bloquear pago si no existe tarifa o política de envío aplicable.
6. Para zonas dudosas, usar cotización manual o no permitir checkout automático.

Regla crítica:

> El costo de envío debe calcularse en backend y formar parte del total antes de crear pedido, reserva, preferencia de pago y comprobante.

## Cobertura nacional

InkToy puede plantear delivery a todo el Perú como objetivo comercial, pero operativamente debe implementarse con control.

### Qué significa delivery nacional

Significa que el sistema debe poder registrar pedidos a cualquier departamento/provincia/distrito configurado, siempre que exista una política operativa válida:

- courier disponible;
- tarifa configurada;
- condiciones conocidas;
- datos completos del cliente;
- flujo de seguimiento;
- soporte para incidencias.

### Recomendación

No se debe interpretar “delivery nacional” como promesa automática de:

- cobertura inmediata de todos los distritos;
- costo fijo para todos;
- tiempos exactos garantizados;
- integración con todos los couriers;
- despacho automático sin revisión.

### Zonas con validación manual

Deben existir zonas donde:

- el cliente no pueda pagar automáticamente;
- se indique que el envío requiere confirmación;
- el equipo valide costo/cobertura;
- se convierta a pedido pagable solo después de confirmar.

Esto reduce reclamos y pérdidas.

### Comunicación al cliente

Evitar prometer tiempos exactos sin datos reales.

Usar mensajes públicos como:

- “El tiempo de entrega puede variar según destino y courier.”
- “Confirmaremos el despacho cuando tu pedido esté preparado.”
- “Algunas zonas pueden requerir validación de cobertura.”

## Couriers

### Shalom

Valor operativo conceptual:

- puede ser útil para envíos interprovinciales;
- puede tener cobertura en varias regiones;
- puede ser relevante para paquetes medianos o zonas específicas.

Riesgos:

- necesidad de validar modalidad de envío;
- necesidad de validar generación de guías;
- tracking y actualizaciones pueden requerir proceso manual si no hay API adecuada;
- tiempos y costos pueden variar.

Cuándo integrarlo:

- después de validar cobertura, costos, proceso operativo, tracking y documentación técnica.

Datos necesarios para integración futura:

- origen;
- destino;
- peso/volumen si aplica;
- datos de destinatario;
- valor declarado si aplica;
- tipo de servicio;
- tracking;
- estado.

### Olva Courier

Valor operativo conceptual:

- courier conocido para ecommerce nacional;
- puede ser candidato para cobertura amplia;
- puede permitir operación más estructurada.

Riesgos:

- costos por zona;
- reglas de peso/volumen;
- disponibilidad de API o acuerdos;
- manejo de incidencias y devoluciones.

Cuándo integrarlo:

- cuando se valide documentación, costos, cobertura y flujo de guías/tracking.

Datos necesarios:

- dirección normalizada;
- ubigeo o zona;
- datos del cliente;
- dimensiones/peso futuro;
- número de pedido;
- tracking;
- estado.

### Urbano

Valor operativo conceptual:

- puede ser candidato para logística ecommerce;
- puede ser útil si ofrece cobertura, tracking e integración compatibles.

Riesgos:

- dependencia de API;
- condiciones comerciales;
- estabilidad del servicio;
- cobertura real por zona.

Cuándo integrarlo:

- después de prueba técnica y operativa con sandbox o documentación.

Datos necesarios:

- dirección;
- zona;
- contacto;
- detalle de paquete;
- costo;
- tracking;
- eventos de estado.

### Otros couriers

El modelo no debe acoplarse a un courier específico.

Debe permitir:

- courier manual;
- courier local;
- courier nacional;
- futura integración API;
- cambio de proveedor sin rediseñar pedidos.

### Validaciones antes de diseñar integración API

Antes de integrar cualquier courier:

1. Confirmar cobertura real.
2. Confirmar tarifas.
3. Confirmar si existe API.
4. Confirmar documentación técnica.
5. Confirmar autenticación.
6. Confirmar sandbox o ambiente de pruebas.
7. Confirmar generación de guía.
8. Confirmar tracking.
9. Confirmar webhooks o consulta de estado.
10. Confirmar manejo de devoluciones.
11. Confirmar SLA operativo.
12. Confirmar costos adicionales.

## Relación con pedido online

Reglas:

1. El pedido debe guardar snapshot de envío.
2. El costo de envío forma parte del total del pedido.
3. El pedido no debe pagarse sin costo de envío calculado cuando aplique.
4. El pedido debe tener dirección válida antes del pago.
5. El pedido debe tener estado de preparación/despacho.
6. Delivery no debe modificar precios de productos.
7. Delivery puede generar incidencias operativas.
8. Cambios de dirección después del pago requieren flujo formal.
9. Cambios de costo después del pago requieren revisión y política explícita.
10. El pedido debe guardar courier/tracking cuando estén disponibles.
11. El pedido debe conservar snapshot de departamento, provincia, distrito, UBIGEO, zona logística, tarifa y regla aplicada.

## Relación con Mercado Pago

Reglas:

1. El monto enviado a Mercado Pago debe incluir costo de envío confirmado.
2. No se debe confiar en costo de envío enviado por frontend.
3. Si cambia el costo de envío antes del pago, el cliente debe confirmar.
4. Si el pago fue aprobado, se respeta el snapshot del envío.
5. No se debe cobrar sin dirección y costo de envío válidos.
6. Si el pago aprobado no coincide con total de productos + envío, generar incidencia.
7. No se debe crear preferencia de pago sin envío válido cuando el pedido requiere delivery.

## Relación con facturación automática

Debe definirse en la implementación tributaria si el costo de envío se representa como:

- ítem independiente;
- cargo/servicio;
- concepto facturable;
- parte del total según regla interna/proveedor.

Reglas:

1. Mantener consistencia entre pedido, pago, venta y comprobante.
2. No facturar si el total de venta no coincide con pago aprobado.
3. No facturar si el costo de envío no está reflejado correctamente.
4. Preparar el modelo para que delivery pueda aparecer en venta/comprobante según decisión tributaria futura.
5. Guardar snapshot del costo de envío y regla aplicada.

## Relación con Storefront API/BFF

Storefront API/BFF debe permitir:

### Listar ubicación controlada

Endpoints conceptuales futuros:

```text
GET /api/v1/storefront/locations/departments
GET /api/v1/storefront/locations/provinces?departmentId={id}
GET /api/v1/storefront/locations/districts?provinceId={id}
```

Deben exponer solo ubicaciones activas y necesarias para checkout.

### Validar dirección

Endpoint conceptual futuro:

```text
POST /api/v1/storefront/shipping/validate-address
```

Debe validar estructura, ubicación y cobertura configurada.

### Calcular costo de envío

Endpoint conceptual futuro:

```text
POST /api/v1/storefront/shipping/quote
```

Debe devolver costo calculado server-side.

### Exponer opciones públicas

Puede exponer:

- método disponible;
- costo;
- mensaje de cobertura;
- si requiere cotización manual;
- tiempo estimado general si existe política aprobada.

No debe exponer:

- reglas internas completas;
- margen;
- costos internos del courier;
- errores técnicos;
- datos de otros clientes.

### Crear pedido con snapshot de envío

El checkout debe guardar dirección, ubicación y costo confirmados.

### Consultar estado público

Endpoint conceptual futuro:

```text
GET /api/v1/storefront/orders/{publicOrderNumber}/shipping
```

Debe mostrar estado seguro:

- pendiente;
- preparando;
- enviado;
- entregado;
- incidencia de entrega.

## Relación con Angular interno

Debe existir una pantalla futura para operación ecommerce.

Funciones recomendadas:

- ver pedidos por preparar;
- ver datos de envío;
- filtrar por estado;
- asignar courier;
- registrar tracking;
- cambiar estado de despacho;
- registrar incidencia;
- marcar entregado;
- ver historial de cambios;
- imprimir o preparar guía/manual;
- registrar observaciones;
- administrar cobertura por distrito o zona;
- administrar tarifas;
- administrar zonas logísticas;
- administrar courier disponible por zona;
- marcar zonas como cotización manual.

Roles autorizados posibles:

- ADMIN;
- SUPERVISOR;
- Ecommerce Manager;
- Fulfillment/Despacho;
- Atención al cliente.

La definición formal de roles puede cerrarse en ADR de administración ecommerce.

## Seguridad y datos personales

Delivery maneja datos sensibles:

- nombre;
- celular;
- email;
- dirección;
- referencia;
- documento si aplica.

Reglas:

1. No exponer datos personales innecesarios por Storefront API.
2. Proteger consulta pública de pedido.
3. Evitar IDOR en tracking y pedidos.
4. Registrar accesos internos relevantes.
5. No mostrar datos completos a roles no autorizados.
6. No enviar datos al courier sin necesidad operativa.
7. No registrar direcciones completas en logs técnicos.
8. No exponer errores internos de courier al cliente.

## Reglas obligatorias

1. No permitir pago sin dirección válida.
2. No permitir pago sin costo de envío definido cuando aplique.
3. No confiar en costo de envío enviado por frontend.
4. No cambiar costo de envío después del pago sin flujo formal.
5. No prometer cobertura o tiempos imposibles.
6. No exponer datos personales innecesarios.
7. No integrar courier sin validar API, costos y operación real.
8. No activar delivery nacional sin checklist operativo mínimo.
9. Toda transición importante debe auditarse.
10. No crear preferencia Mercado Pago sin delivery válido cuando el pedido requiere envío.
11. No facturar total distinto al pago aprobado.
12. No usar reglas de envío hardcodeadas si deben ser operativas/configurables.
13. No exponer costos internos o márgenes de envío.
14. No permitir tracking público sin control de acceso o token seguro.
15. No asignar courier si el pedido no está listo para despacho.
16. No permitir texto libre para departamento, provincia ni distrito.
17. Departamento, provincia y distrito deben seleccionarse desde catálogos controlados.
18. El distrito debe tener UBIGEO o identificador geográfico normalizado cuando aplique.
19. No permitir pago si el distrito no existe, está inactivo, no tiene cobertura o requiere cotización manual pendiente.
20. La tienda pública no debe duplicar ni administrar el catálogo geográfico maestro.
21. Las tarifas y cobertura deben administrarse desde el ERP/POS o configuración interna autorizada.
22. Los cambios de cobertura, zona o tarifa deben ser auditables.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Integrar courier por API desde el inicio | Descartada como primera fase. Alto riesgo sin validar documentación, costos, cobertura y volumen real. |
| Manejar todo manualmente sin modelo formal | Descartada. Rápido al inicio, pero genera deuda técnica y mala trazabilidad. |
| Usar tarifa plana nacional | Descartada como única regla. Es simple, pero puede generar pérdidas en zonas lejanas. |
| Usar tarifa por zona/departamento/provincia/distrito | Aceptada como base configurable. Permite equilibrio entre control y operación. |
| Usar cotización manual para todo | Descartada como flujo principal. Reduce conversión y aumenta carga operativa. |
| Permitir texto libre para departamento/provincia/distrito | Descartada. Genera errores operativos, logísticos y de costo. |
| Usar catálogo geográfico controlado con UBIGEO | Aceptada. Es la opción más robusta para checkout, tarifas, cobertura y couriers. |
| Flujo semi-automatizado inicial con modelo preparado para API futura | Aceptada. Es la opción más segura y escalable para InkToy. |

## Justificación

### Operación real

Permite vender online sin depender desde el día uno de una integración courier no validada.

### Bajo riesgo

Evita prometer costos, tiempos o cobertura que no se pueden cumplir.

### Seguridad

Evita confiar en el frontend y protege datos personales.

### Escalabilidad

Permite empezar semi-automatizado y evolucionar hacia APIs de courier.

### Experiencia del cliente

El cliente conoce el costo antes de pagar y puede consultar estado de despacho.

### Consistencia

El costo de envío queda alineado con pedido, Mercado Pago, venta y comprobante.

### Calidad logística

El catálogo geográfico controlado evita errores de ubicación, mejora cobertura, facilita tarifas y prepara tracking futuro.

## Consecuencias positivas

- Menor riesgo de pérdidas por envío mal calculado.
- Mejor control de cobertura.
- Mejor trazabilidad del despacho.
- Preparación para tracking futuro.
- Preparación para integración courier API.
- Mejor experiencia de atención al cliente.
- Mejor consistencia entre pedido, pago y facturación.
- Menor deuda técnica que un flujo manual sin modelo.
- Flexibilidad para cambiar courier.
- Menos errores por direcciones inconsistentes.
- Mejor reporte por zona, distrito, provincia o departamento.

## Consecuencias negativas o costos

- Requiere modelar zonas, tarifas y estados de despacho.
- Requiere catálogo geográfico.
- Requiere carga inicial de departamentos, provincias, distritos y UBIGEO.
- Requiere UI interna futura.
- Requiere mantenimiento de tarifas.
- Requiere operación manual inicial.
- Requiere validación de cobertura antes de prometer tiempos.
- Requiere QA de dirección, costo, pago, pedido y despacho.
- Requiere proteger datos personales de envío.

Estos costos son aceptables porque el delivery nacional es una operación sensible y debe controlarse antes de automatizarse.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Costo de envío mal calculado | Cálculo server-side y tarifas configurables. |
| Courier no cubre una zona | Zonas con cotización manual o bloqueo de checkout. |
| Pedido pagado con dirección inválida | Validación antes del pago. |
| Tracking no registrado | UI interna para asignar courier/tracking. |
| Cliente reclama por tiempo de entrega | No prometer tiempos exactos sin datos reales. |
| Delivery nacional prometido sin capacidad real | Cobertura configurable y mensajes claros. |
| Courier API no disponible o inestable | Primera versión semi-automatizada. |
| Datos personales expuestos | Storefront API pública limitada y control de acceso. |
| Desalineación entre pedido, pago y comprobante | Snapshot de envío incluido en total. |
| Envío gratis mal configurado | Reglas configurables y validación de margen antes de activar. |
| Dirección modificada después del pago | Flujo formal de cambio con auditoría. |
| Costo cambia después del pago | Mantener snapshot; cambios requieren revisión formal. |
| Ubicación escrita de forma inconsistente | Selectores controlados por catálogo geográfico. |
| Distrito sin cobertura pagado por error | Backend bloquea pago si no hay cobertura o tarifa. |
| Reportes logísticos poco confiables | UBIGEO/zona logística normalizados. |

## Impacto técnico

### Pedidos online

Deberán almacenar dirección, ubicación normalizada, costo, estado de envío, courier y tracking.

### Storefront API

Deberá exponer catálogos geográficos públicos, validar dirección, calcular envío y exponer estado público seguro.

### Angular interno

Deberá permitir gestión de preparación, courier, tracking, incidencias, cobertura, zonas y tarifas.

### Next.js futuro

Deberá mostrar selectores de departamento/provincia/distrito, costo de envío antes de pago y estado público del despacho.

### Mercado Pago

El monto de pago debe incluir costo de envío confirmado.

### Facturación automática

El costo de envío debe reflejarse correctamente en venta/comprobante según decisión tributaria.

### Clientes

Datos de dirección y contacto deben conservarse de forma segura.

### Auditoría

Debe registrar cambios de estado de despacho, courier, tracking, cobertura, tarifas e incidencias.

### Reportes

Futuros reportes pueden incluir:

- pedidos por zona;
- pedidos por distrito/provincia/departamento;
- costos de envío;
- couriers usados;
- incidencias de delivery;
- tiempos de despacho;
- entregas fallidas.

### Seguridad

Se debe evitar exposición de datos personales e IDOR.

### Integraciones futuras

El modelo debe permitir conectar courier API sin reescribir el pedido.

## Criterios de aceptación

Este ADR queda aprobado porque se cumplen los siguientes criterios:

1. Se aprueba delivery nacional con estrategia progresiva.
2. Se aprueba primera versión manual o semi-automatizada.
3. Se aprueba no integrar courier por API desde el inicio.
4. Se aprueba cálculo server-side del costo de envío.
5. Se aprueba que el costo de envío forma parte del snapshot del pedido.
6. Se aprueba que el cliente ve el costo antes del pago.
7. Se aprueba que no hay pago sin dirección válida.
8. Se aprueba que el ERP/POS registra courier, tracking y estado de despacho.
9. Se aprueba que Shalom, Olva, Urbano u otros se evaluarán antes de integración.
10. Se aprueba que no se prometen tiempos/costos/cobertura no validados.
11. Se aprueba que Storefront API no expone información interna del courier ni datos personales innecesarios.
12. Se aprueba que el sistema queda preparado para reglas configurables e integración futura.
13. Se aprueba que departamento, provincia y distrito se seleccionan desde catálogos controlados.
14. Se aprueba no permitir texto libre para departamento, provincia ni distrito.
15. Se aprueba que el distrito tendrá UBIGEO o identificador geográfico normalizado cuando aplique.
16. Se aprueba que el backend valida ubicación, cobertura y tarifa antes del pago.
17. Se aprueba que Angular interno administrará cobertura, zonas, tarifas y couriers en una fase futura.

## Qué NO hacer todavía

En esta etapa no se debe:

- implementar integración API con courier;
- implementar delivery automático;
- crear endpoints;
- crear migraciones;
- modificar pedidos actuales;
- activar delivery real;
- definir contrato final con courier sin validación operativa;
- prometer tiempos exactos sin datos reales;
- implementar tracking automático;
- implementar envío gratis sin análisis de margen;
- modificar Mercado Pago;
- modificar facturación;
- tocar AWS/staging;
- exponer estados de tracking públicos sin seguridad;
- hardcodear tarifas definitivas en frontend;
- cargar dataset geográfico sin revisión;
- permitir texto libre de departamento/provincia/distrito;
- duplicar catálogo geográfico en Next.js.

Este ADR solo define la estrategia de delivery nacional, couriers, catálogo geográfico, UBIGEO, selección controlada de ubicación y cálculo de envío. La implementación debe ocurrir en fases posteriores, alineada con pedidos online, Storefront API, Mercado Pago, facturación, Angular interno, seguridad y operación logística real.

## Decisión resultante

InkToy soportará delivery nacional mediante una estrategia progresiva y controlada. La primera versión será manual o semi-automatizada, con dirección estructurada, costo de envío calculado server-side, snapshot de envío en el pedido, estados de despacho, asignación de courier y registro de tracking desde el ERP/POS interno.

No se integrará Shalom, Olva Courier, Urbano u otro courier por API desde el inicio. Primero se validarán cobertura, costos, documentación, estabilidad, tracking y operación real. El sistema quedará preparado para integración futura sin acoplar el dominio a un proveedor específico.

El cliente deberá seleccionar departamento, provincia y distrito desde catálogos controlados. No se permitirá texto libre para ubicación estructurada. El ERP/POS será la fuente de verdad del catálogo geográfico/logístico, incluyendo UBIGEO o identificador geográfico normalizado cuando aplique. El backend validará ubicación, cobertura, zona logística y costo de envío antes del pago.

El cliente deberá ver el costo de envío antes de pagar. No se permitirá pago sin dirección válida ni costo de envío definido cuando aplique. El costo de envío formará parte del total enviado a Mercado Pago y deberá mantenerse consistente con pedido, venta y comprobante. No se prometerán tiempos, cobertura ni costos que no puedan operarse.
