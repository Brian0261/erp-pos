# Regression Checklist

Fecha de ejecucion: 2026-04-28
Ambiente: Docker Compose (frontend Nginx 4200, backend 8080, postgres 5432)

## Build y runtime

- [x] `git status` revisado antes de cambios.
- [x] Backend: `mvn clean test` => BUILD SUCCESS (109 tests OK).
- [x] Backend: `mvn clean verify` => BUILD SUCCESS.
- [x] Frontend: `npm install` ejecutado.
- [x] Frontend: `npm run build` exitoso.
- [x] `docker compose config` OK.
- [x] `docker compose up --build -d` OK.
- [x] `docker compose ps` con `postgres` healthy, `backend` up, `frontend` up.

## Protocolo UX-011 anti-cache frontend (2026-05-04)

- [x] Estado PWA/service worker revisado en configuracion actual:
  - [x] `frontend/angular.json`: sin bandera `serviceWorker`.
  - [x] `frontend/src/main.ts`: sin `provideServiceWorker`.
  - [x] `frontend/package.json`: sin dependencia `@angular/service-worker`.
  - [x] No se detecta `ngsw-config.json` ni `manifest.webmanifest` en runtime frontend.
  - [x] Conclusion: hoy no hay PWA activa; el riesgo principal es cache de navegador/CDN local/Nginx, no service worker.
- [x] Origen oficial QA para frontend en Docker: `http://localhost:4200` (evitar `127.0.0.1` por variaciones CORS/host).
- [x] Para rutas criticas usar parametro preventivo `?ngsw-bypass=true` (estandar defensivo, compatible con estado actual sin SW).
- [x] Ejecutar recarga fuerte del navegador (Hard Reload) tras cada `docker compose up --build -d`.
- [x] Si persisten dudas de cache, repetir validacion en ventana incognita.
- [x] Confirmar estado runtime:
  - [x] `docker compose up --build -d`.
  - [x] `docker compose ps`.
  - [x] `docker compose logs frontend --tail=150`.
  - [x] `docker compose logs backend --tail=150`.
- [x] Confirmaciones tecnicas minimas antes de aprobar UI:
  - [x] Sin llamadas hardcodeadas a `localhost:8080` desde Angular (`apiUrl` relativo `/api/v1`).
  - [x] Sin fuentes externas (`fonts.googleapis.com` / `fonts.gstatic.com`).
  - [x] Assets de InkToy cargan correctamente (logo y recursos locales).
  - [x] Proxy `/api` operativo desde frontend Nginx.

### Checklist estandar pre-aceptacion UI (obligatorio)

- [x] `cd frontend`.
- [x] `npm run build`.
- [x] `cd ..`.
- [x] `docker compose up --build -d`.
- [x] `docker compose ps`.
- [x] Abrir `/login?ngsw-bypass=true` sobre `http://localhost:4200`.
- [x] Validar login con usuario objetivo.
- [x] Validar ruta objetivo con `?ngsw-bypass=true`.
- [x] Validar consola sin errores inesperados.
- [x] Validar network sin `500` inesperados.
- [x] Confirmar visualmente que el cambio aparece realmente en el contenedor Docker (no en shell cacheada).
- [x] Si hay duda, repetir en incognita y con hard reload.

### POS touch-friendly Fase 1 (2026-05-06)

- [x] Alcance acotado a `frontend/src/app/features/sales/pos-page.component.ts` y evidencia QA en este checklist.
- [x] `npm run build` frontend exitoso tras rediseño POS Fase 1.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos tras rebuild del runtime.
- [x] Docker runtime disponible: frontend `http://localhost:4200`, backend `UP`, postgres healthy.
- [x] POS mantiene contratos y servicios existentes: lookup, busqueda, carrito, pagos y `finalizeSale()` sin cambios de payload/endpoints.
- [x] Validacion headless Chrome con `admin@erp.local` (ADMIN): login `200`, `/pos` carga, buscador principal con placeholder `Escanea o escribe el código exacto...`, carrito, pagos, total grande y `COBRAR` visibles.
- [x] ADMIN: busqueda por producto en POS devuelve resultados, requiere seleccion explicita, agrega item al carrito, permite setear cantidad y mantiene total visible.
- [x] ADMIN: `/ventas` sigue cargando y logout redirige a login.
- [x] Validacion headless Chrome con `cajero@erp.local` (CAJERO): login `200`, `/pos` carga, buscador principal, carrito, pagos, total grande y `COBRAR` visibles.
- [x] CAJERO: busqueda por producto en POS devuelve resultados, requiere seleccion explicita, agrega item al carrito, permite setear cantidad y mantiene total visible.
- [x] CAJERO: `/ventas` sigue cargando y logout redirige a login.
- [x] Sin `pageerror` observado en la validacion headless.
- [x] Sin respuestas `500` inesperadas observadas en la validacion headless.
- [x] Sin llamadas directas a `localhost:8080`; se mantiene proxy relativo `/api`.
- [x] No se ejecuto venta real de prueba en Fase 1 para evitar mutacion transaccional innecesaria; la validacion cubrio hasta carrito/pagos/CTA.
- [x] Sin cambios en backend, Flyway, DB, rutas, guards, AuthService, JWT/interceptor, endpoints, facturacion, compras, outbox, OpenAI, Dockerfile ni nginx.conf.

### Catalogo - Categorias y Unidades (2026-05-20)

- [ ] Categorias: editar categoria normal desde UI y validar persistencia en `PUT /api/v1/categories/{id}`.
- [ ] Categorias: desactivar/reactivar categoria normal desde UI y validar `PATCH /api/v1/categories/{id}/status`.
- [ ] Categorias: verificar bloqueo de `Por clasificar` en edicion y cambio de estado por nombre normalizado.
- [ ] Unidades: validar `PUT /api/v1/units/{id}` con cambio de `code`/`name` y rechazo por `code` duplicado case-insensitive.
- [ ] Unidades: validar `PATCH /api/v1/units/{id}/status` en backend.
- [ ] Unidades: verificar impacto en productos/importacion cuando la unidad queda inactiva.

### Inventario - Almacenes (2026-05-20)

- [ ] Almacenes: editar code/name desde UI y validar `PUT /api/v1/warehouses/{id}`.
- [ ] Almacenes: cancelar edicion y volver a estado Crear almacen.
- [ ] Almacenes: desactivar/reactivar desde UI con confirmacion y validar `PATCH /api/v1/warehouses/{id}/status`.
- [ ] Almacenes: validar label `Tipo de almacén *`, header de tabla `Tipo` y tipos traducidos en español.
- [ ] Almacenes: validar ID oculto, formulario estable y sin impacto en stock/compras/ventas/kardex.

### Inventario - Stock autocomplete Producto (2026-05-21)

### Reutilizable - ProductAutocompleteComponent compartido (2026-05-22)

- [ ] Buscar por nombre, SKU, código de barras y multi-palabra.
- [ ] Navegar resultados con ArrowDown/ArrowUp.
- [ ] Seleccionar con Enter y cerrar con Escape.
- [ ] Limpiar selección/query con `clear()`.
- [ ] Validar que la selección mantiene `productId` correcto en el padre.

### Inventario - Stock autocomplete Producto (2026-05-22)

- [ ] Stock: escribir 2+ caracteres en Producto y validar lookup server-side.
- [ ] Stock: buscar por nombre, SKU, código de barras y multi-palabra.
- [ ] Stock: navegar con ArrowDown/ArrowUp, seleccionar con Enter y cerrar con Escape.
- [ ] Stock: con menos de 2 caracteres no mostrar resultados útiles del lookup.
- [ ] Stock: seleccionar producto y validar que el filtro siga enviando `productId` a `/api/v1/inventory/stocks`.
- [ ] Stock: `Limpiar` general resetea producto, almacén, pagina y resultados.
- [ ] Stock: filtro por almacén sigue operativo junto al autocomplete y conserva producto seleccionado.
- [ ] Stock: no mostrar `Todos`, `Producto filtrado` ni acciones redundantes bajo el autocomplete.
- [ ] Stock: paginación sigue operativa con y sin producto seleccionado.
- [ ] Stock: columna ID y Versión ocultas; fecha visible en formato `dd/MM/yyyy HH:mm`.

### Catalogo - Productos busqueda multi-token y tabla compacta (2026-05-22)

- [ ] Productos: buscar `caja david` y validar resultados multi-token.
- [ ] Productos: buscar `lapicero rojo` y validar resultados multi-token.
- [ ] Productos: buscar por SKU exacto/parcial y validar resultados.
- [ ] Productos: buscar por codigo de barras exacto/parcial y validar resultados.
- [ ] Productos: combinar busqueda con categoria y validar filtrado.
- [ ] Productos: combinar busqueda con estado y validar filtrado.
- [ ] Productos: combinar busqueda con filtro de codigo de barras y validar filtrado.
- [ ] Productos: Limpiar vuelve al listado completo.
- [ ] Productos: paginacion sigue operativa con filtros y busqueda.
- [ ] Productos: Crear producto, Importar productos, Editar y Desactivar siguen visibles.
- [ ] Productos: Precio venta se ve completo.
- [ ] Productos: nombres largos no rompen la tabla.
- [ ] Productos: boton Desactivar no se recorta.
- [ ] Productos: filas compactas siguen legibles.
- [ ] Productos: Enter en busqueda rapida ejecuta la consulta.

### POS draft persistente y UX select/botones (2026-05-21)

- [ ] POS: entrar/salir conserva almacén, búsqueda, resultados, carrito y pagos.
- [ ] POS: Enter y Buscar ejecutan el mismo flujo de búsqueda.
- [ ] POS: cancelar limpia el draft.
- [ ] POS: cobrar limpia el draft.
- [ ] POS: logout limpia el draft.
- [ ] POS: cambio de caja/usuario limpia el draft.
- [ ] POS: agregar/cobrar sin almacén bloquea con validacion clara.
- [ ] POS: select de almacén muestra solo el nombre operativo.
- [ ] POS: botones Agregar mantienen ancho uniforme y alineacion estable.

### POS touch-friendly Fase 1.1 - Grid fijo sin scroll de pagina (2026-05-06)

- [x] Ajuste aplicado solo en `frontend/src/app/features/sales/pos-page.component.ts` y evidencia QA en este checklist.
- [x] Causa corregida: `/pos` crecia por altura natural de hero, estado de caja, resultados y columna de cobro, generando scroll vertical en `.content`.
- [x] `npm run build` frontend exitoso tras layout POS de una sola vista.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos tras rebuild del runtime.
- [x] Validacion desktop headless Chrome `1366x768`: `documentOverflowY=0`, `bodyOverflowY=0`, `contentOverflowY=0`, `posOverflowY=0`.
- [x] ADMIN (`admin@erp.local`): login `200`, `/pos` carga sin scroll vertical de pagina, busqueda, resultados, carrito, pagos, total y `COBRAR` visibles sin bajar la pagina.
- [x] ADMIN: busqueda por producto QA, seleccion explicita, agregado al carrito, cantidad `1`, pago `S/ 25.00`, total actualizado `S/ 25.00`, `COBRAR` visible.
- [x] ADMIN: venta QA generada desde POS `S-1778129942429` (`/ventas/7`), CTA `Ver venta #7` visible, detalle `/ventas/7` carga y `/ventas` carga.
- [x] ADMIN: stock/kardex confirmados para `SKU-BT003-A-1777947134` en `STORE-01`: stock `60 -> 59`, movimiento `SALE_OUT`, `referenceId=7`.
- [x] CAJERO (`cajero@erp.local`): login `200`, `/pos` carga sin scroll vertical de pagina, busqueda, resultados, carrito, pagos, total y `COBRAR` visibles sin bajar la pagina.
- [x] CAJERO: busqueda por producto QA, seleccion explicita, agregado al carrito, cantidad `1`, pago seteado, total actualizado `S/ 25.00`, `COBRAR` visible; no se finalizo una segunda venta.
- [x] Scroll interno controlado validado tras agregar item: resultados y carrito tienen overflow interno cuando el contenido excede su zona; no crece la pagina.
- [x] `/ventas` sigue cargando y logout redirige a login para ADMIN y CAJERO.
- [x] Sin `pageerror`, sin errores de consola inesperados, sin `500`, sin CORS y sin llamadas directas a `localhost:8080`.
- [x] Sin cambios en backend, Flyway, DB, rutas, guards, AuthService, JWT/interceptor, endpoints, servicios Angular, facturacion, compras, outbox, OpenAI, Dockerfile ni nginx.conf.

### POS touch-friendly Fase 1.2 - Carrito completo con 1 producto (2026-05-07)

- [x] Ajuste aplicado solo en `frontend/src/app/features/sales/pos-page.component.ts` y evidencia QA en este checklist.
- [x] Causa corregida: el alto efectivo de `.cart-list` quedaba por debajo del alto de un `.cart-item`, generando scroll interno con un solo producto.
- [x] Carrito compactado sin cambiar logica de venta: item en estructura mas densa, controles de cantidad/descuento mas compactos, pagos/totales/CTA y breakpoint desktop `<= 820px` ajustados para `1366x768`.
- [x] `npm run build` frontend exitoso tras correccion del carrito.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos tras rebuild del runtime.
- [x] ADMIN (`admin@erp.local`) headless Chrome `1366x768`: `/pos?ngsw-bypass=true`, `documentOverflowY=0`, `bodyOverflowY=0`, `contentOverflowY=0`, `posOverflowY=0`.
- [x] ADMIN: con 1 producto QA en carrito, `cartInternalOverflowY=0`, `cartListClientHeight=183`, `cartListScrollHeight=183`, `cartItemHeight=179`.
- [x] ADMIN: SKU, nombre, stock/precio, cantidad, descuento, linea/subtotal, `Quitar`, pagos, total y `COBRAR` visibles en una sola vista.
- [x] ADMIN: con 2 productos, la pagina sigue sin scroll vertical (`document/body/content/pos overflowY=0`) y el scroll queda dentro del carrito (`cartInternalOverflowY=157`) con pagos, total y `COBRAR` visibles.
- [x] CAJERO (`cajero@erp.local`) headless Chrome `1366x768`: mismas metricas visuales del carrito con 1 producto (`cartInternalOverflowY=0`) y 2 productos con scroll interno del carrito.
- [x] Sin `pageerror`, sin respuestas `500`, sin CORS y sin llamadas directas a `localhost:8080` durante validacion ADMIN/CAJERO.
- [x] No se finalizo venta real en esta fase por ser ajuste visual; no hubo mutacion transaccional de stock/kardex.
- [x] Sin cambios en backend, Flyway, DB, rutas, guards, AuthService, JWT/interceptor, endpoints, servicios Angular, facturacion, compras, outbox, OpenAI, Dockerfile ni nginx.conf.

### POS touch-friendly Fase 1.3 - Pagos sin scroll con 1 linea (2026-05-07)

- [x] Ajuste aplicado solo en `frontend/src/app/features/sales/pos-page.component.ts` y evidencia QA en este checklist.
- [x] Causa corregida: `.payment-list` tenia `max-height` agresivo y `overflow: auto`, generando scroll interno incluso con la linea de pago inicial.
- [x] Pagos reestructurado como banda horizontal desktop: `Agregar pago`, metodo, monto, referencia y `Quitar` visibles completos con una sola linea.
- [x] `.checkout-panel` reequilibrado para asignar altura minima real al bloque de pagos sin cambiar logica TypeScript de venta ni payloads.
- [x] `npm run build` frontend exitoso tras ajuste visual de Pagos.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos tras rebuild del runtime.
- [x] ADMIN (`admin@erp.local`) headless Chrome `1366x768`: `/pos?ngsw-bypass=true`, `documentOverflowY=0`, `bodyOverflowY=0`, `contentOverflowY=0`, `posOverflowY=0`.
- [x] ADMIN: con 1 linea de pago, `paymentInternalOverflowY=0`, `paymentPanelHeight=91`, `paymentListClientHeight=74`, `paymentListScrollHeight=74`, `paymentLineHeight=74`.
- [x] ADMIN: con 2 lineas de pago, el scroll aparece solo dentro de Pagos (`paymentInternalOverflowY=35`) y la pagina permanece sin scroll vertical.
- [x] ADMIN: busqueda por producto QA, agregado al carrito y total actualizado a `S/ 25.00`; busqueda, resultados, carrito, total y `COBRAR` visibles.
- [x] ADMIN: modo oscuro validado visualmente por visibilidad de controles criticos; `/ventas` carga y logout redirige a `/login`.
- [x] CAJERO (`cajero@erp.local`) headless Chrome `1366x768`: mismas metricas visuales de Pagos con 1 linea (`paymentInternalOverflowY=0`) y 2 lineas con scroll interno solo en Pagos.
- [x] CAJERO: busqueda por producto QA, agregado al carrito y total actualizado a `S/ 25.00`; `/ventas` carga y logout redirige a `/login`.
- [x] Sin `pageerror`, sin respuestas `500`, sin CORS y sin llamadas directas a `localhost:8080` durante validacion ADMIN/CAJERO.
- [x] No se finalizo venta real en esta fase por ser ajuste visual; no hubo mutacion transaccional de stock/kardex.
- [x] Sin cambios en backend, Flyway, DB, rutas, guards, AuthService, JWT/interceptor, endpoints, servicios Angular, modelos, facturacion, compras, outbox, OpenAI, Dockerfile ni nginx.conf.

### POS UX copy - Metodos de pago en espanol (2026-05-07)

- [x] Ajuste aplicado solo en `frontend/src/app/features/sales/pos-page.component.ts` y evidencia QA en este checklist.
- [x] Cambio limitado a texto visible del selector en POS: `CASH -> Efectivo`, `CARD -> Tarjeta`, `TRANSFER -> Transferencia`.
- [x] Se mantienen intactos los values internos del `option`: `value="CASH"`, `value="CARD"`, `value="TRANSFER"` (sin cambios de payload ni enum enviado al backend).
- [x] `npm run build` frontend exitoso tras el ajuste de etiquetas.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos tras rebuild del runtime.
- [x] Sin cambios en backend, Flyway, DB, endpoints, servicios Angular, rutas, guards, AuthService, JWT/interceptor, facturacion, compras, outbox, OpenAI, Dockerfile ni nginx.conf.

### POS modal de cobro propio (2026-05-21)

- [ ] POS: al cobrar aparece el modal propio del sistema, no el confirm nativo del navegador.
- [ ] POS: el modal muestra cantidad de ítems, total, monto pagado y vuelto.
- [ ] POS: Cancelar, ESC y backdrop no registran venta.
- [ ] POS: Cobrar registra la venta como antes.
- [ ] POS: el draft POS se limpia tras la venta exitosa.
- [ ] POS: sin cambios en cálculo de total/pagado/vuelto ni en el flujo de cobro.

### Stock inicial - cantidad entera positiva (2026-05-21)

- [ ] Stock inicial: `quantity=1` y `quantity=10` registran `201`.
- [ ] Stock inicial: `quantity=0`, `-1`, `0.5` y `1.25` se rechazan con validacion, no con `500`.
- [ ] Stock inicial: solo este flujo queda endurecido; ajustes/transferencias/compras/ventas no cambian.

### Inventario - Ajustes de stock UX estable y decimal controlado (2026-05-22)

- [ ] Ajustes: escribir 2+ caracteres en Producto y validar lookup server-side.
- [ ] Ajustes: buscar por nombre, SKU y codigo de barras.
- [ ] Ajustes: buscar por multi-palabra y seleccionar resultado.
- [ ] Ajustes: seleccionar producto y luego limpiar producto.
- [ ] Ajustes: Almacen muestra solo el nombre operativo.
- [ ] Ajustes: Tipo de ajuste se entiende como Aumentar stock (IN) y Disminuir stock (OUT).
- [ ] Ajustes: Cantidad acepta `1`, `1.5` y `0.5`.
- [ ] Ajustes: Cantidad rechaza `0`, `0.0`, `-1`, `0000`, `01`, `1.25` y letras/simbolos.
- [ ] Ajustes: layout no se mueve al mostrar errores de Cantidad o Motivo.
- [ ] Ajustes: cancelar modal propio no registra.
- [ ] Ajustes: confirmar modal propio registra.
- [ ] Ajustes: OUT muestra advertencia de reduccion de stock real.
- [ ] Ajustes: success aparece arriba del formulario.
- [ ] Ajustes: post-success conserva tipo y almacen.
- [ ] Ajustes: post-success limpia producto, cantidad y motivo.
- [ ] Ajustes: post-success no deja errores visibles inmediatos.
- [ ] Ajustes: impacto reflejado luego en Stock/Kardex segun el movimiento registrado.

### Inventario - Kardex enriquecido y filtros claros (2026-05-22)

- [x] Kardex: Producto usa `ProductAutocompleteComponent` y permite buscar por nombre/SKU/codigo de barras.
- [x] Kardex: Almacen muestra solo nombre operativo.
- [x] Kardex: Desde solo funciona.
- [x] Kardex: Hasta solo funciona.
- [x] Kardex: Desde + Hasta funciona.
- [x] Kardex: Desde > Hasta muestra error y no consulta.
- [x] Kardex: Buscar y Limpiar quedan juntos.
- [x] Kardex: un solo Limpiar global (autocomplete sin boton interno duplicado).
- [x] Kardex: Fecha en tabla se ve `dd/MM/yyyy HH:mm`.
- [x] Kardex: Producto muestra nombre real y ya no cae a `Producto #id` en casos normales.
- [x] Kardex: Almacen en tabla muestra solo nombre.
- [x] Kardex: Movimiento se traduce a espanol.
- [x] Kardex: Delta se muestra como Variacion con signo +/-. 
- [x] Kardex: Stock anterior/nuevo se muestran como Stock antes/despues.
- [x] Kardex: Motivo y Usuario siguen visibles.
- [x] Kardex: tabla real alineada con 10 columnas, wrappers internos y scroll horizontal controlado.
- [x] Kardex: paginacion server-side con `Anterior/Siguiente/Ir a pág.` y `pageSize=20`.
- [x] Kardex: backend responde enriquecido con `productName/productSku/productBarcode` y `warehouseName/warehouseCode`.

### Compras - Órdenes de compra rediseño Fases 1-5 (2026-05-23)

- [ ] Listado: columna `Orden` muestra `#id`, almacén visible solo por nombre.
- [ ] Listado: filtros manuales (estado, proveedor, fechas) siguen operativos.
- [ ] Listado: Aprobar usa ConfirmDialogService y cambia estado a APROBADA.
- [ ] Listado: Cancelar usa ConfirmDialogService y cambia estado a CANCELADA.
- [ ] Nueva orden: Proveedor y Almacén con errores reservados sin desalineación.
- [ ] Nueva orden: ProductAutocompleteComponent busca por nombre/SKU/código de barras.
- [ ] Nueva orden: cantidad acepta `1`, `1.5`, `0.5` y rechaza `0`, `-1`, `e`, `E`, `+`, `-`, `,`, `0000`, `1.25`.
- [ ] Nueva orden: costo unitario acepta `1`, `1.50`, `0.01` y rechaza `0`, `-1`, `e`, `E`, `+`, `-`, `,`, `0000`, `1.255`.
- [ ] Nueva orden: subtotal y total estimado recalculan al cambiar cantidad/costo.
- [ ] Nueva orden: crear orden genera DRAFT y redirige al detalle.
- [ ] Editar orden: solo visible para órdenes DRAFT.
- [ ] Editar orden: ProductAutocompleteComponent y sanitización igual a Nueva orden.
- [ ] Editar orden: guardar actualiza y redirige al detalle.
- [ ] Detalle: badge de estado legible (APROBADA, RECEPCIÓN PARCIAL, etc.).
- [ ] Detalle: Proveedor, Almacén (solo nombre), Fecha orden dd/MM/yyyy, Total S/ visibles.
- [ ] Detalle: tabla de ítems con colgroup, Producto con nombre + SKU/código secundario.
- [ ] Detalle: Ordenado, Recibido, Pendiente, Costo unit., Subtotal alineados y centrados.
- [ ] Detalle: líneas horizontales de filas rectas y continuas.
- [ ] Detalle: Aprobar/Cancelar usan ConfirmDialogService.
- [ ] Recepción: badge de estado legible y summary-grid con datos generales.
- [ ] Recepción: Proveedor y Almacén (solo nombre) resueltos correctamente.
- [ ] Recepción: Fecha orden dd/MM/yyyy y Total S/ visibles.
- [ ] Recepción: tabla de pendientes con Item, Producto, Ordenado, Recibido, Pendiente, Recibir ahora.
- [ ] Recepción: líneas horizontales de filas rectas y continuas.
- [ ] Recepción: input Recibir ahora acepta `1`, `1.5`, `0.5` y rechaza `e`, `E`, `+`, `-`, `,`, `0000`.
- [ ] Recepción: cantidad recibida no supera lo pendiente; error inline si excede.
- [ ] Recepción: confirmar con todo en 0 muestra error global.
- [ ] Recepción: ConfirmDialogService aparece antes de registrar recepción.
- [ ] Recepción: registrar recepción redirige al detalle y actualiza estado.

### Compras - Proveedores UX rediseñada (2026-05-22)

- [ ] Proveedores: la pantalla inicial muestra busqueda + tabla, sin formulario grande visible.
- [ ] Proveedores: `Nuevo proveedor` abre drawer/modal local.
- [ ] Proveedores: cancelar cierra sin cambios.
- [ ] Proveedores: `Nombre es obligatorio` no desalinear Documento/Nombre.
- [ ] Proveedores: crear proveedor valida y recarga tabla al cerrar.
- [ ] Proveedores: editar proveedor abre el mismo formulario en modo edicion.
- [ ] Proveedores: guardar cambios actualiza y recarga tabla.
- [ ] Proveedores: desactivar usa `ConfirmDialogService`.
- [ ] Proveedores: reactivar usa `ConfirmDialogService` y `update(..., active: true)`.
- [ ] Proveedores: campos largos mantienen ellipsis/title y acciones compactas.
- [ ] Proveedores: Buscar y Limpiar siguen funcionando.

### Inventario - Transferencias con autocomplete compartido (2026-05-22)

- [ ] Transferencias: buscar producto por nombre y seleccionar resultado.
- [ ] Transferencias: buscar producto por SKU y seleccionar resultado.
- [ ] Transferencias: buscar producto por codigo de barras y seleccionar resultado.
- [ ] Transferencias: buscar por multi-palabra y obtener coincidencias.
- [ ] Transferencias: ArrowDown/ArrowUp recorren resultados del autocomplete compartido.
- [ ] Transferencias: Enter selecciona el item activo.
- [ ] Transferencias: Escape cierra el panel.
- [ ] Transferencias: item activo se resalta con sombreado del sistema.
- [ ] Transferencias: seleccion por mouse/mousedown sigue funcionando.
- [ ] Transferencias: producto duplicado no se agrega silenciosamente.
- [ ] Transferencias: cantidad valida `1`, `1.5` y `0.5`.
- [ ] Transferencias: cantidad rechaza `0`, `0.0`, `-1`, `0000`, `01`, `1.25` y letras/simbolos.
- [ ] Transferencias: columnas Producto/Cantidad/Accion quedan alineadas con headers.
- [ ] Transferencias: `Quitar` no se superpone con `Cantidad`.
- [ ] Transferencias: separadores horizontales se ven rectos y consistentes.
- [ ] Transferencias: modal propio de confirmacion aparece antes de registrar.
- [ ] Transferencias: cancelar modal no registra.
- [ ] Transferencias: confirmar modal registra y deja formulario limpio.
- [ ] Transferencias: post-success conserva almacenes si sigue siendo operativo y limpia motivo, buscador y lista.

### Inventario - Carga inicial (2026-05-22)

- [ ] Carga inicial: escribir 2+ caracteres en Producto y validar lookup server-side.
- [ ] Carga inicial: buscar por nombre, SKU, código de barras y multi-palabra.
- [ ] Carga inicial: seleccionar producto y registrar con cantidad entera positiva.
- [ ] Carga inicial: `clear()`/Limpiar producto limpia selección y permite nueva búsqueda.

### Inventario - Ajustes de stock (2026-05-22)

- [ ] Ajustes: escribir 2+ caracteres en Producto y validar lookup server-side.
- [ ] Ajustes: buscar por nombre, SKU, código de barras y multi-palabra.
- [ ] Ajustes: seleccionar producto y registrar IN/OUT.
- [ ] Ajustes: cantidad decimal positiva con maximo 1 decimal.
- [ ] Ajustes: confirmacion OUT sigue apareciendo antes de registrar.

### Inventario - Transferencias (2026-05-22)

- [ ] Transferencias: autocomplete compartido mantiene lookup server-side y navegacion ArrowDown/ArrowUp/Enter/Escape.
- [ ] Transferencias: agregar producto a la tabla de items sigue funcionando.
- [ ] Transferencias: producto duplicado no se agrega silenciosamente.

### Inventario - Kardex (2026-05-22)

- [ ] Kardex: autocomplete compartido mantiene filtro por producto y paginacion server-side.
- [ ] Kardex: un solo Limpiar global sigue reseteando filtros.
- [ ] Kardex: tabla, columnas y fechas conservan formato esperado.

### Reutilizable - ProductAutocompleteComponent compartido (2026-05-22)

- [ ] Validar debounce 250 ms y minimo 2 caracteres en el componente compartido.
- [ ] Validar navegacion teclado consistente en cualquier pantalla que lo use.
- [ ] Validar `scrollIntoView` del item activo en panel con resultados largos.
- [ ] Validar sombreado hover/active con tokens InkToy.
- [ ] Validar que `clear()` limpia query, resultados y seleccion sin romper el padre.
- [ ] Validar que `disabled` reacciona cuando cambia desde el padre.
- [ ] Validar que `filterMode=true` permite filtro editable en Stock sin romper selectoras.

### POS Touch-Friendly Fase 1.x - Cierre consolidado (2026-05-07)

- [x] Cierre consolidado de mejoras visuales acumuladas en `/pos`: rediseño touch-friendly, vista unica sin scroll vertical de pagina, buscador principal grande, resultados en tarjetas, carrito visible, pagos visibles, total destacado y `COBRAR` siempre visible.
- [x] Carrito validado para mostrar completo 1 producto sin scroll interno; con varios productos, el scroll queda controlado dentro del carrito y no crece la pagina.
- [x] Pagos validado para 1 linea sin scroll interno; con varias lineas, el scroll queda controlado dentro de Pagos y no crece la pagina.
- [x] Metodos de pago visibles en espanol para cajero: `CASH -> Efectivo`, `CARD -> Tarjeta`, `TRANSFER -> Transferencia`.
- [x] Values internos conservados para backend/payload: `CASH`, `CARD`, `TRANSFER`.
- [x] Validacion tecnica consolidada: `npm run build` OK, `docker compose up --build -d` OK y `docker compose ps` OK.
- [x] Validacion funcional consolidada por rol: ADMIN y CAJERO acceden a `/pos`, visualizan busqueda, resultados, carrito, pagos, total y `COBRAR` sin scroll vertical de pagina.
- [x] Alcance mantenido como frontend visual POS: sin cambios en backend, endpoints, rutas, guards, AuthService, JWT/interceptor, DB, Flyway ni servicios Angular.

### Dark Mode Hardening Fase 1 - tokens y componentes compartidos (2026-05-07)

- [x] Alcance aplicado solo a tokens/estilos globales: `frontend/src/styles/design-tokens.css`, `frontend/src/styles/base.css`, `frontend/src/styles/components.css` y evidencia QA en este checklist.
- [x] Causa corregida: modo oscuro incompleto a nivel de tokens semanticos y componentes compartidos; badges, chips, alerts, inputs, botones disabled y links podian heredar colores de modo claro o bajo contraste.
- [x] Tokens semanticos agregados/ajustados para superficies, texto primario/secundario/muted, bordes, links, focus ring, estados success/warning/danger/info y disabled.
- [x] Componentes compartidos endurecidos: `.ui-card`, `.ui-button`, `.ui-button--secondary`, botones disabled, `.ui-badge`, `.ui-chip`, `.ui-alert`, `.ui-field`, inputs/selects/textarea, placeholders, tablas y links criticos en dark mode.
- [x] `npm run build` frontend exitoso tras la implementacion final.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos tras rebuild final; frontend `http://localhost:4200`, backend `UP`, postgres healthy.
- [x] Validacion headless Chrome final con `?ngsw-bypass=true`: 84 checks por tema/rol/ruta sobre modo oscuro y claro.
- [x] Roles validados: `ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR`; login/token correcto para cada rol.
- [x] Rutas validadas segun permisos: `/login`, `/dashboard`, `/pos`, `/caja`, `/ventas`, `/catalogo/productos`, `/catalogo/categorias`, `/catalogo/unidades`, `/inventario/stock`, `/inventario/kardex`, `/compras/ordenes`, `/cotizaciones`, `/facturacion/comprobantes`, `/reportes`, `/integraciones/eventos` para ADMIN.
- [x] Muestreo de contraste en contenido principal/formularios final: `badMainContent=[]` en modo oscuro y modo claro.
- [x] Sin `pageerror`, sin `500` inesperados, sin CORS y sin llamadas directas a `localhost:8080` durante la validacion headless final.
- [x] Sin cambios en backend, Flyway, DB, endpoints, servicios Angular, modelos, rutas, guards, AuthService, JWT/interceptor, POS logic, venta, facturacion logica, compras logica, Dockerfile ni nginx.conf.
- [x] Fase 2 local queda reservada para excepciones visuales especificas con colores hardcodeados dentro de componentes si aparecen en revision manual posterior.

### POS Fase 2A - Productos sin barcode y cantidades enteras (2026-05-07)

- [x] Alcance aplicado solo a `frontend/src/app/features/sales/pos-page.component.ts` y evidencia QA en este checklist.
- [x] Enfoque frontend-only mantenido: sin cambios en backend, Flyway, DB, endpoints, servicios Angular, modelos, rutas, guards, AuthService, JWT/interceptor, facturacion, compras, outbox, OpenAI, Dockerfile ni nginx.conf.
- [x] Copy POS actualizado para productos sin barcode: busqueda principal por SKU/barcode exacto y busqueda manual por nombre, SKU o producto sin barcode.
- [x] Botones rapidos agregados para productos sin barcode: `Cartulina`, `Papelógrafo`, `Copia`, `Impresión`, `Goma eva`, `Cinta`, `Elástico`, `Cordón`; en runtime se validaron 8 botones y codigos Unicode correctos para labels con tilde.
- [x] Boton rapido `Cartulina` validado en ADMIN y CAJERO: rellena busqueda manual, limpia codigo, dispara `GET /api/v1/pos/products/search` y no agrega producto directo al carrito (`cartCountAfterQuickSearch=0`).
- [x] Resultados ambiguos mantienen seleccion explicita: producto QA se agrega solo tras tocar `Agregar` desde resultados.
- [x] Badge `Sin barcode` validado en carrito con producto QA sin barcode.
- [x] Cantidad POS validada como entero positivo: input `min="1"`, `step="1"`, `inputmode="numeric"`, `pattern="[0-9]*"`.
- [x] POS Fase 2A: se simplifican controles de cantidad retirando presets `1`/`2`/`5`/`10` y manteniendo `+` / `-` / input entero.
- [x] Controles de cantidad validados en ADMIN y CAJERO: `+` cambia `1 -> 2`, `-` cambia `2 -> 1` y entrada decimal `2.7` se normaliza visualmente a `2`.
- [x] Total recalcula tras cambios de cantidad (`S/ 50.00` con cantidad `2` del producto QA de `S/ 25.00`).
- [x] `npm run build` frontend exitoso tras implementacion y ajuste de normalizacion visual.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos; frontend `http://localhost:4200`, backend `UP`, postgres healthy.
- [x] ADMIN (`admin@erp.local`) headless Chrome `1366x768`: `/pos?ngsw-bypass=true` carga, sin scroll vertical de pagina, sin overflow horizontal, pagos en espanol y `COBRAR` visibles.
- [x] CAJERO (`cajero@erp.local`) headless Chrome `1366x768`: `/pos?ngsw-bypass=true` carga, sin scroll vertical de pagina, sin overflow horizontal, pagos en espanol y `COBRAR` visibles.
- [x] Validacion mobile headless `390x844` para ADMIN y CAJERO: POS carga, 8 botones rapidos presentes, sin overflow horizontal y `COBRAR` existe.
- [x] `/ventas?ngsw-bypass=true` carga para ADMIN y CAJERO tras validar POS.
- [x] Sin `pageerror`, sin respuestas `500`, sin CORS observado y sin llamadas directas a `localhost:8080` durante validacion ADMIN/CAJERO.
- [x] No se finalizo venta real en esta fase; no hubo mutacion transaccional de stock/kardex.
- [x] POS Fase 2A: ajuste visual del footer del item de carrito para alinear LINEA/monto/Quitar y compactar tarjeta.
- [x] POS Fase 2A: correccion de grid del item de carrito; `LINEA`/monto/`Quitar` pasan a la columna derecha desde la primera fila y se mantiene reset responsive a una columna.
- [x] POS Fase 2A: `LINEA`/monto/`Quitar` quedan centrados verticalmente en la columna derecha del item de carrito manteniendo boton touch-friendly.
- [x] POS Fase 2A: el input de cantidad selecciona automaticamente el valor al focus/click para permitir reemplazo rapido con teclado.
- [x] POS Fase 2A: ajuste visual del bloque principal de busqueda para usar jerarquia azul/neutra y reservar amarillo para badges/advertencias.

### POS Fase 2B - Contador y carrito completo (2026-05-08)

- [x] Alcance aplicado solo a `frontend/src/app/features/sales/pos-page.component.ts` y evidencia QA en este checklist.
- [x] POS Fase 2B: agregado contador de items y modal/panel de carrito completo para revision de ventas largas, manteniendo `COBRAR` y pagos visibles en la pantalla principal.
- [x] Carrito principal mantiene estados `Carrito`, `Carrito · 1 item` y `Carrito · N items`; boton `Ver carrito completo` queda deshabilitado con carrito vacio.
- [x] Modal `Carrito completo` validado con ADMIN y CAJERO: abre con productos, muestra contador, total actual, SKU, nombre, precio unitario, badge `Sin barcode`, cantidad, descuento, linea/subtotal y `Quitar`.
- [x] Modal no incluye boton `COBRAR`; el CTA de cobro queda exclusivamente en la pantalla principal.
- [x] Cierre del modal validado por boton `Cerrar` y tecla `Escape`.
- [x] Edicion dentro del modal reutiliza la logica existente: cantidad decimal `2.7` normaliza a `2`, `+` incrementa, `-` no baja de `1`, `Quitar` actualiza el carrito principal.
- [x] Con varios productos disponibles para QA, el modal muestra 2 filas y usa scroll interno (`overflow-y: auto`) sin generar scroll vertical de pagina; pagos, total y `COBRAR` permanecen visibles en pantalla principal.
- [x] `npm run build` frontend exitoso tras implementacion de Fase 2B.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos; frontend `http://localhost:4200`, backend `UP`, postgres healthy.
- [x] ADMIN (`admin@erp.local`) headless Chrome `1366x768`: `/pos?ngsw-bypass=true` carga, carrito vacio correcto, modal con 1 producto correcto, edicion/quitar correcto, varios productos correcto, modo claro/oscuro validado.
- [x] CAJERO (`cajero@erp.local`) headless Chrome `1366x768`: mismas validaciones de contador, modal, edicion/quitar, varios productos y claro/oscuro.
- [x] Sin `pageerror`, sin respuestas `500`, sin CORS observado y sin llamadas directas a `localhost:8080` durante validacion ADMIN/CAJERO.
- [x] No se finalizo venta real en esta fase; no hubo mutacion transaccional de stock/kardex.
- [x] Sin cambios en backend, Flyway, DB, endpoints, servicios Angular, modelos, rutas, guards, AuthService, JWT/interceptor, facturacion, compras, outbox, OpenAI, Dockerfile ni nginx.conf.

### Cleanup admin UX - Tabs y jerarquia visual (2026-05-20)

- [x] Alcance visual aplicado solo a `frontend/src/app/features/admin/product-cleanup-preview-page.component.ts`.
- [x] Pantalla `/admin/test-data-cleanup/products` validada manualmente tras compactar cabecera/formulario y reducir altura del textarea.
- [x] Tarjeta principal de decision valida estado global: `Este conjunto parece purgable` / `No se puede purgar`.
- [x] Se elimino la card redundante `Puede purgarse / Sí / Sin bloqueos...` y los KPIs quedaron agrupados por dominio.
- [x] Tabs validados: `Productos`, `Ventas`, `Ordenes de compra`, `Recepciones de compra`, `Stock y movimientos`; cada tab muestra una sola tabla a ancho completo.
- [x] Producto purgable con ventas/compras/recepciones puras muestra el estado esperado y `Ejecutar purga` sigue condicionado por `preview.purgeable`.
- [x] Producto no purgable mantiene `No se puede purgar` y `Ejecutar purga` no se habilita.
- [x] Modal de ejecucion conserva `confirmationText = ELIMINAR PRUEBAS`.
- [x] Preview y execute siguen funcionando; `npm run build` frontend OK.

### POS Fase 2C - Busqueda unificada y limpieza visual (2026-05-08)

- [x] Alcance aplicado solo a `frontend/src/app/features/sales/pos-page.component.ts` y evidencia QA en este checklist.
- [x] POS consolida busqueda en un unico input para escaneo, SKU/barcode exacto y busqueda por texto, manteniendo acciones separadas `Agregar codigo` y `Buscar`.
- [x] Error 404 esperado de coincidencia exacta muestra copy operativo: `No hay coincidencia exacta. Usa Buscar para ver productos relacionados.`; no se expone `Product not found` al cajero.
- [x] Limpieza visual validada: sin kickers `Seleccion explicita`/`Venta actual`, resultados sin label `Barcode`, productos sin codigo con badge `Sin codigo`, carrito principal compacto con `P.U.` y sin stock/barcode.
- [x] Selector de almacen muestra label completo via `title` para evitar perdida de contexto visual cuando el select se recorta.
- [x] `npm run build` frontend exitoso tras los ajustes (`main-ND44DGER.js`, build 8.970 s).
- [x] `docker compose config`, `docker compose up --build -d` y `docker compose ps` exitosos; frontend `http://localhost:4200`, backend `UP`, postgres healthy.
- [x] ADMIN (`admin@erp.local`) headless Chrome `1366x768`: `/pos?ngsw-bypass=true` carga sin scroll vertical de pagina, un solo input de busqueda, `Agregar codigo`, `Buscar`, carrito, pagos, total y `COBRAR` visibles.
- [x] CAJERO (`cajero@erp.local`) headless Chrome `1366x768`: mismas validaciones de carga, busqueda unificada, carrito, pagos, total y `COBRAR`.
- [x] ADMIN/CAJERO: `lapic` + `Agregar codigo` no agrega al carrito y muestra el copy de coincidencia exacta; `lapic` + `Buscar` devuelve 6 resultados.
- [x] ADMIN/CAJERO: barcode `7678765456323` con Enter agrega `Cuaderno A4` al carrito; carrito principal muestra `P.U. S/ 5.00`, sin stock ni badge de codigo ausente.
- [x] Boton rapido `Cartulina` validado con UI asentada: input `Cartulina`, 1 resultado `Cartulina Blanca`, `Sin codigo`, carrito sigue en 0 items y no hay errores de servidor.
- [x] Modal `Carrito completo` sigue abriendo desde `Ver carrito completo`, no incluye `COBRAR`, y el CTA `COBRAR` permanece visible/dominante en pantalla principal.
- [x] Modo oscuro validado para input, botones `Agregar codigo`/`COBRAR` y superficies criticas del POS.
- [x] Sin `pageerror`, sin unhandled rejections, sin respuestas `500`, sin CORS observado y sin llamadas directas a `localhost:8080` durante validacion ADMIN/CAJERO.
- [x] No se finalizo venta real en esta fase; no hubo mutacion transaccional de stock/kardex.
- [x] Sin cambios en backend, Flyway, DB, endpoints, servicios Angular, modelos, rutas, guards, AuthService, JWT/interceptor, facturacion, compras, outbox, OpenAI, Dockerfile ni nginx.conf.

### POS Fase 2D - Jerarquía visual de resultados y carrito (2026-05-09)

- [x] Alcance aplicado solo a `frontend/src/app/features/sales/pos-page.component.ts` y evidencia QA en este checklist.
- [x] Resultados de búsqueda ajustados visualmente: primera línea compacta con SKU, código/sin código y stock; segunda línea con nombre del producto como elemento principal.
- [x] Carrito derecho ajustado visualmente: primera línea compacta con SKU y P.U.; nombre del producto con mayor protagonismo; rótulo `LINEA` reemplazado por `SUBTOTAL`.
- [x] Botón `Quitar` mantiene semántica destructiva y paleta roja del sistema, sin convertirse en acción principal.
- [x] Precio, botón `Agregar`, cantidad, descuento, subtotal y `COBRAR` permanecen visibles y operativos.
- [x] `npm run build` frontend exitoso tras los ajustes visuales.
- [x] Validación visual realizada en `/pos?ngsw-bypass=true` con resultados y carrito con varios ítems.
- [x] Sin cambios en backend, Flyway, DB, endpoints, servicios Angular, modelos, rutas, guards, AuthService, JWT/interceptor, payload de venta, pagos, cantidades ni descuentos.
- [x] No se finalizó venta real en esta fase; no hubo mutación transaccional de stock/kardex.
- [x] Modal `Carrito completo` alineado visualmente con el carrito principal: se eliminó el kicker `REVISIÓN DE VENTA`.
- [x] Modal `Carrito completo`: cada producto muestra primera línea compacta con SKU, P.U. y estado de código; nombre del producto con mayor protagonismo en segunda línea.
- [x] Modal `Carrito completo`: rótulo `LINEA` reemplazado por `Subtotal` para mayor claridad operativa.
- [x] Modal `Carrito completo`: botón `Quitar` mantiene semántica destructiva, pero con menor dominancia visual.
- [x] Modal `Carrito completo`: bloque `TOTAL ACTUAL` se mantiene como resumen y no compite con el CTA `COBRAR`.

### Ventas UX/QA - Traducciones, filtros y detalle (2026-05-10)

- [x] Alcance aplicado a:
  - `frontend/src/app/features/sales/sales-page.component.ts`
  - `frontend/src/app/features/sales/sale-detail-page.component.ts`
- [x] Listado de ventas: estados visibles traducidos a español (`COMPLETED -> Completada`, `VOIDED -> Anulada`) manteniendo valores internos sin cambios.
- [x] Detalle de venta: métodos de pago visibles traducidos a español (`CASH -> Efectivo`, `CARD -> Tarjeta`, `TRANSFER -> Transferencia`) manteniendo valores internos sin cambios.
- [x] Fechas visibles en listado y detalle formateadas a `dd/MM/yyyy HH:mm`.
- [x] Detalle de venta: `Vuelto` se muestra solo cuando existe pago en efectivo; pagos solo con tarjeta/transferencia muestran `Diferencia`, `Saldo` o `No aplica` segun corresponda, sin sugerir dinero fisico a devolver.
- [x] Detalle de venta: campos `Anulada en` y `Motivo anulación` se ocultan cuando la venta no está anulada.
- [x] Filtro `Caja` valida enteros positivos; valores `0`, negativos, decimales o texto muestran mensaje controlado y no ejecutan filtrado.
- [x] Productos: listado usa filtros backend-driven paginados por `q`, `categoryId`, `active` y `barcodeStatus`; `/search` ya no se usa en esta pantalla.
- [x] Productos: los selects de `Categoria`, `Estado` y `Código de barras` aplican el filtro al cambiar y reinician a la página 0.
- [x] Productos: contador visible mantiene coherencia con la paginacion backend.
- [x] Productos UI/QA visual final:
  - [x] Texto `CATALOGO INKTOY` eliminado.

### ConfirmDialog shared - Desactivar producto (2026-05-19)

- [x] Alcance QA acotado a `frontend/src/app/shared/dialogs/confirm-dialog.component.ts`, `frontend/src/app/shared/dialogs/confirm-dialog.service.ts`, `frontend/src/app/shared/layout/layout.component.ts` y `frontend/src/app/features/catalog/products-page.component.ts`.
- [x] `npm run build` frontend exitoso tras la implementacion del modal compartido.
- [x] Validacion manual: clic en `Desactivar` abre modal visual del sistema; `Cancelar` y `Escape` cierran sin desactivar; `Confirmar` ejecuta la desactivacion.
- [x] Validacion manual: no aparece `window.confirm` nativo; tabla de Productos, filtros, paginacion directa e Importar productos siguen funcionando.
  - [x] Pantalla compactada y visible completa en desktop estándar sin scroll vertical.
  - [x] Header, filtros, tabla, paginación y acciones siguen alineados y legibles.
  - [x] Se mantiene 10 productos por página y el espaciado inferior es legible.
  - [x] Filtros, `Importar productos`, `Crear producto`, `Editar` y `Desactivar` siguen funcionando.
- [x] Productos navegación directa a página:
  - [x] Control `Ir a pág. [ ] [Ir]` agregado en la zona de paginación.
  - [x] Entrada visual 1-based y navegación interna 0-based validada.
  - [x] Enter ejecuta igual que `Ir`.
  - [x] Valores válidos probados: 1, 2, intermedia y última página.
  - [x] Valores inválidos probados: 0, negativos, letras, decimales, vacío y mayores a `totalPages`.
  - [x] `Anterior` / `Siguiente` siguen funcionando y los filtros resetean a página visual 1.
- [x] Importación masiva de productos Fase 2 frontend:
  - [x] Acceso desde Productos a `Importar productos`.
  - [x] Descarga de plantilla `.xlsx`.

### Catalogo - Unidades frontend operativo (2026-05-20)

- [ ] Crear unidad desde el formulario superior.
- [ ] Editar unidad reutilizando el formulario superior en modo edición.
- [ ] Cancelar edición limpia el modo edición y resetea el formulario.
- [ ] Editar con `code` duplicado muestra error controlado.
- [ ] Desactivar unidad activa con confirmación.
- [ ] Reactivar unidad inactiva con confirmación.
- [ ] La tabla sigue sin mostrar ID y conserva columnas `Código`, `Nombre`, `Estado`, `Acciones`.
- [ ] Verificar impacto en productos/importación si una unidad queda inactiva.
  - [x] Selección de archivo, validación preview y confirmación final.
  - [x] Errores del preview mostrados en español.
  - [x] Banner de validación ajustado a éxito/advertencia/error según filas válidas e inválidas.
  - [x] `Confirmar importación` deshabilitado cuando no hay filas válidas.
  - [x] `Volver a productos` funcional.
  - [x] QA manual final con Excel grande (5820/5823 filas): preview paginado 50 filas, filtros funcionales, `Ver errores`, resumen de errores, CSV de filas con error, confirm-file sin 413 y sin HTML crudo.
- [x] Filtro de fechas en Ventas corregido frontend-only:
  - [x] Ya no se envían `from/to` al backend para evitar `500` del endpoint con fechas.
  - [x] Las fechas se filtran localmente por día completo.
  - [x] `Desde` incluye desde `00:00:00.000`.
  - [x] `Hasta` incluye hasta `23:59:59.999`.
- [x] Identificador visual de venta actualizado: listado muestra `Venta #id` con `Código interno: S-...` y el detalle usa `Venta #id` como título con `Código interno` en el resumen.
  - [x] Rango inválido muestra mensaje: `La fecha Desde no puede ser mayor que la fecha Hasta.`
- [x] Filtro `Estado` en Ventas se aplica automaticamente al cambiar la opcion:
  - [x] `Completada` filtra sin requerir click en `Filtrar`.
  - [x] `Anulada` filtra sin requerir click en `Filtrar`.
  - [x] `Todos` limpia el filtro de estado y recarga el listado.
  - [x] `Filtrar` sigue disponible para los demas filtros y como accion manual general.
- [x] Limpieza de datos de prueba de productos - QA manual frontend:
  - [x] Pantalla admin analizada con SKU `TIJ01` y preview purgable `true`/`false` segun bloqueos reales.
  - [x] Boton de purga solo se habilita cuando el preview es purgable.
  - [x] Modal local exige confirmationText exacto `ELIMINAR PRUEBAS`; texto incorrecto o cancelacion no ejecutan la purga.
  - [x] Confirmacion valida llama a `POST /api/v1/admin/test-data-cleanup/products/execute` y muestra resumen final de eliminacion.
  - [x] Tras la purga, los datos de prueba de producto/ventas/movimientos dejan de aparecer; no se alteraron productos reales.
  - [x] `npm run build` frontend exitoso tras la habilitacion segura del flujo destructivo.
- [x] Filtro `Caja` en Ventas acepta solo enteros positivos en frontend y mantiene el mensaje `Ingresa un número de caja válido.` para valores invalidos.

### Cleanup admin copy - completa / mezclada (2026-05-20)

- [x] Pantalla `/admin/test-data-cleanup/products` validada manualmente con copy visible reemplazado a `completa` / `mezclada`.
- [x] KPIs, badges, tablas y mensajes muestran el nuevo copy sin cambiar la logica destructiva.
- [x] Microcopy educativo visible una sola vez y aclara que solo se eliminan relaciones con productos seleccionados.
- [x] Preview sigue funcionando, `Execute` sigue condicionado por `preview.purgeable` y `ELIMINAR PRUEBAS` sigue vigente.
- [x] `npm run build` frontend exitoso tras el ajuste de copy.

### Cleanup admin evidencia preview (2026-05-20)

- [x] Boton `Descargar preview` aparece cuando existe un preview cargado.
- [x] Descarga JSON correcta con preview purgable y no purgable.
- [x] JSON incluye `generatedAt`, `criteria`, `summary`, `purgeable`, `blockers`, `warnings` y detalles principales.
- [x] Descargar preview no llama a `execute` ni borra datos.
- [x] `npm run build` frontend exitoso tras agregar descarga de evidencia.
- [x] Validación funcional del filtro de fechas:
  - [x] Sin filtros: carga ventas disponibles.
  - [x] Solo `Hasta = 09/05/2026`: incluye ventas del 09/05/2026.
  - [x] Solo `Desde = 09/05/2026`: incluye ventas del 09/05/2026 y posteriores.
  - [x] `Desde = 09/05/2026` y `Hasta = 09/05/2026`: muestra ventas de ese día.
  - [x] `Desde = 08/05/2026` y `Hasta = 10/05/2026`: incluye ventas de 08, 09 y 10.
- [x] Detalle de venta: resumen visual mejorado; `TOTAL` queda como dato principal y `Subtotal`, `Descuento`, `Pagado`, `Vuelto` mantienen contraste correcto en modo oscuro.
- [x] Detalle de venta Fase 1 enriquecido: `GET /api/v1/sales/{id}` devuelve `productName`, `sku` y `barcode`; la UI muestra nombre y SKU y usa `Producto #id` solo como fallback.
- [x] `npm run build` frontend exitoso.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Backend, DB, Flyway, endpoints, servicios Angular, modelos, rutas, guards, AuthService, JWT/interceptor y payload sin cambios.

### Facturacion - Emitir comprobante pendiente rediseño empresarial (2026-05-24)

- [ ] Abrir /facturacion/emitir/:saleId con venta completada sin comprobante y validar carga correcta.
- [ ] Confirmar eliminacion de textos `MVP` y copy tecnico innecesario.
- [ ] Confirmar header operativo con meta-line `Venta: S-... · ID interno: ...`.
- [ ] Confirmar cards key-value compactas (Venta, Referencia de venta, Operacion, Comprobante a emitir).
- [ ] Confirmar que no se llama `Cliente` a `createdBy`; se usa `Referencia de venta` y `Registrado por`.
- [ ] Confirmar que Tipo comprobante y Serie estan alineados y con mismo alto visual.
- [ ] Confirmar que mensaje `Debes seleccionar una serie` no desalinea el layout.
- [ ] Confirmar copy contextual: Boleta (consumidor final) y Factura (obligatoriedad).
- [ ] Confirmar que items muestran nombre real del producto + SKU + codigo si existe.
- [ ] Confirmar que no aparece `#6` ni ID tecnico como dato operativo.
- [ ] Confirmar que `Total linea` cambio a `Importe`.
- [ ] Confirmar montos con formato `S/ 0.50` usando Intl.NumberFormat.
- [ ] Emitir comprobante exitoso y validar redireccion al detalle.
- [ ] Validar bloqueo si la venta ya tiene comprobante asociado.
- [ ] Validar que POS, listado de Comprobantes y Detalle de comprobante no fueron afectados.
- [ ] Sin cambios en DB/Flyway, endpoints principales, POS ni contratos de payload.

### Ecommerce - Fase 2G.1 Crear perfil online desde producto ERP/POS

- [x] Backend: `POST /api/v1/ecommerce-admin/products/{id}/online-profile` retorna 201 DRAFT.
- [x] Backend: producto inexistente retorna 404.
- [x] Backend: producto sin perfil previo crea perfil DRAFT.
- [x] Backend: producto con perfil existente retorna 409.
- [x] Backend: SUPERVISOR intentando crear perfil retorna 403.
- [x] Tests: `EcommerceAdminProfilesIntegrationTest` 11 tests, 0 failures, BUILD SUCCESS.
- [x] Sin cambios en frontend Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.

### Ecommerce - Fase 2G.2 Smoke Test Real Producto Publicado → Storefront

- [x] Producto ERP/POS creado con precio S/ 25.90.
- [x] Perfil online DRAFT creado desde producto → 201.
- [x] Perfil actualizado (slug, nombre, descripcion, categoria, marca) → 200.
- [x] SEO configurado (title, description, canonical, INDEX_FOLLOW, indexable=true) → 200.
- [x] Asset principal registrado (URL externa) → 200.
- [x] Validacion de publicacion → publishable=true.
- [x] Publicacion → 200 PUBLISHED.
- [x] Storefront `/productos/{slug}` → 200 OK.
- [x] Storefront H1 correcto: "Producto Smoke Test Online 2g2-1780622524".
- [x] Storefront precio renderizado: "PEN 25.90".
- [x] Storefront descripcion, categoria/marca badges visibles.
- [x] Storefront breadcrumbs correctos.
- [x] Storefront CTA "Consultar en tienda" presente.
- [x] Storefront metadata SEO: noindex/nofollow, canonical, OG tags.
- [x] Storefront Header/Footer/BottomNavigation/StickyProductCTA renderizados.
- [x] Storefront sin carrito, checkout, "Comprar", login, perfil cliente.
- [x] Caso negativo: slug inexistente → 404.
- [x] Caso negativo: perfil DRAFT no publicado → 404 publico.
- [x] Caso negativo: duplicado de perfil → 409.
- [x] Caso negativo: SUPERVISOR intenta crear perfil → 403.
- [x] Backend Docker rebuild exitoso para incluir codigo 2G.1.
- [x] `storefront/.env.local` configurado localmente (ignorado por git).
- [x] Deudas registradas: asset externo no renderiza, disponibilidad sin stock.
- [x] Sin cambios en codigo funcional durante fase documental 2G.2D.
- [x] Sin cambios en frontend Angular, Flyway/DB, Docker, `.env` raiz, AWS/staging.

### Ecommerce - Fase 2G.3A Indicador de perfil online en Productos

- [x] Backend: `GET /api/v1/ecommerce-admin/products/online-profile-status?productIds=1,2,3` retorna estados batch sin N+1 HTTP por fila.
- [x] Backend: producto sin perfil retorna `hasOnlineProfile=false`.
- [x] Backend: producto con perfil DRAFT retorna `publicationStatus=DRAFT`.
- [x] Backend: producto PUBLISHED retorna `publicationStatus=PUBLISHED` y `slug`.
- [x] Backend: lista vacia retorna arreglo vacio; lista invalida retorna 400 controlado.
- [x] Backend: rol no autorizado retorna 403.
- [x] Backend: endpoint batch no crea ni modifica perfiles.
- [x] Frontend Productos: se solicita estado ecommerce solo para productos visibles de la pagina actual.
- [x] Frontend Productos: se muestra badge compacto `Sin perfil online`, `Borrador ecommerce`/`Pendiente ecommerce`, `Publicado online` o `No publicado` segun estado.
- [x] Frontend Productos: `Crear perfil online` queda disponible solo para ADMIN y productos sin perfil.
- [x] Frontend Productos: productos con perfil muestran `Revisar perfil`.
- [x] Sin cambios en Storefront, Flyway, Docker, `.env` raiz ni slug en `products`.

### Ecommerce - Fase 2G.4A UX administrativa ecommerce quick polish

- [ ] Productos: acciones ecommerce compactadas (`Crear perfil online` -> `Crear perfil`, `Revisar perfil` -> `Revisar`) con `title` completo conservado.
- [ ] Productos: ADMIN-only conserva `Crear perfil` para productos sin perfil.
- [ ] Productos: `Revisar` aparece para productos con perfil existente.
- [ ] Productos: carga batch por pagina visible sin N+1 HTTP por fila.
- [ ] Perfiles online: columna `Publicado` renombrada a `Publicado el`.
- [ ] Detalle perfil: `Checklist de publicacion (backend)` renombrado a `Requisitos para publicar`.
- [ ] Detalle perfil: `Actualizar` renombrado a `Actualizar datos`.
- [ ] Detalle perfil: SEO labels traducidos (`Canonical path` -> `Ruta canonica`, `Robots policy` -> `Indexacion para buscadores`, `OG title` -> `Titulo para redes sociales`, `OG description` -> `Descripcion para redes sociales`, `OG image URL` -> `Imagen para redes sociales`, `Indexable` -> `Permitir indexacion`).
- [ ] Detalle perfil: SEO enums traducidos (`INDEX_FOLLOW` -> `Indexar y seguir enlaces`, `NOINDEX_FOLLOW` -> `No indexar, seguir enlaces`, `NOINDEX_NOFOLLOW` -> `No indexar ni seguir enlaces`).
- [ ] Detalle perfil: Imagen principal labels traducidos (`Asset type` -> `Tipo de imagen`, `Alt text` -> `Texto alternativo`, `Display order` -> `Orden de visualizacion`).
- [ ] Detalle perfil: Imagen principal enums traducidos (`PRODUCT_IMAGE` -> `Imagen de producto`, `OWN` -> `Propia`, `SUPPLIER` -> `Proveedor`, `GENERATED` -> `Generada`, `OTHER` -> `Otra fuente`).
- [ ] Detalle perfil: Override de precio renombrado (`Override de precio online` -> `Precio online personalizado`, `Override activo` -> `Usar precio online diferente`, `Guardar override` -> `Guardar precio`).
- [ ] Valores internos enviados al backend sin cambios (enums, payloads, contratos).
- [ ] Sin cambios en Storefront, Flyway, Docker, `.env` raiz, slug en `products` ni backend.

### Ecommerce - Fase 2G.4B Enriquecer listado de Perfiles online

- [ ] Backend: `GET /api/v1/ecommerce-admin/products/online-profiles` retorna `brandName` y `onlineCategoryName` enriquecidos.
- [ ] Backend: batch lookup de marcas y categorías sin N+1 HTTP por fila.
- [ ] Backend: perfil sin marca retorna `brandName=null`.
- [ ] Backend: perfil sin categoría online retorna `onlineCategoryName=null`.
- [ ] Frontend Perfiles online: muestra nombre real de marca en lugar de ID.
- [ ] Frontend Perfiles online: muestra nombre real de categoría online en lugar de ID.
- [ ] Frontend Perfiles online: fallback `Sin marca` cuando `brandName` es null.
- [ ] Frontend Perfiles online: fallback `Sin categoría online` cuando `onlineCategoryName` es null.
- [ ] Paginación y filtro por estado siguen funcionando.
- [ ] Sin cambios en Storefront, Flyway, Docker, `.env` raiz ni slug en `products`.

### Caja - UX operativa frontend-only (2026-05-25)

- [ ] Estados `OPEN` y `CLOSED` se muestran como `Abierta` y `Cerrada`.
- [ ] Badge superior muestra `Sesion abierta`, `Sesion cerrada` o `Sin caja abierta`.
- [ ] Badges de Caja son visibles pero no invasivos.
- [ ] Montos se muestran con formato `PEN` usando `Intl.NumberFormat`.
- [ ] Fechas se muestran como `dd/MM/yyyy HH:mm` con `Intl.DateTimeFormat`.
- [ ] `ID interno` no domina la card principal.
- [ ] `Usuario apertura ID` no aparece en la grilla principal.
- [ ] `Datos tecnicos` colapsable conserva `ID interno` y `Usuario apertura ID`.
- [ ] Con caja abierta, `Caja actual` se muestra como resumen principal.
- [ ] Con caja abierta, `Cerrar caja actual` aparece inmediatamente despues del resumen.
- [ ] Con caja abierta, `Abrir caja` no muestra el formulario completo.
- [ ] Con caja abierta, se muestra una nota compacta indicando que ya existe una caja abierta.
- [ ] `Consultar caja por ID` queda como bloque secundario al final.
- [ ] Sin caja abierta, se muestra `Sin caja abierta`.
- [ ] Sin caja abierta, `Abrir caja` queda como accion principal.
- [ ] Sin caja abierta, `Cerrar caja` no se muestra.
- [ ] La apertura con saldo inicial valido funciona.
- [ ] Errores de saldo inicial muestran copy operativo.
- [ ] `ConfirmDialogService` aparece antes de cerrar caja.
- [ ] Cancelar la confirmacion no cierra caja.
- [ ] Confirmar ejecuta el cierre.
- [ ] Tras cerrar, se conserva visible el resumen de la sesion cerrada.
- [ ] La diferencia final se muestra desde la respuesta backend.
- [ ] Errores de efectivo contado muestran copy operativo.
- [ ] La consulta por ID sigue funcionando en bloque secundario colapsable.
- [ ] No se usa `/reports/cash-registers/{id}` en la pantalla principal de Caja.
- [ ] No se muestran consultas nuevas fuera del flujo existente.

#### Validaciones
- [ ] `cd frontend; npm run build` -> BUILD SUCCESS.
- [ ] Smoke manual con ADMIN, CAJERO y SUPERVISOR cuando haya usuarios disponibles.
- [ ] Confirmar que POS, Ventas y Facturacion no se afectaron.

### Ventas - Integracion con comprobantes electronicos Fases 1-2C + refinamiento visual (2026-05-25)

#### Listado de Ventas
- [ ] Muestra columna `Comprobante` con datos del read-model.
- [ ] Venta sin comprobante muestra `Pendiente` / `Sin comprobante`.
- [ ] Venta con comprobante muestra numero, estado traducido y ambiente.
- [ ] Estados se traducen correctamente:
  - DRAFT -> BORRADOR
  - GENERATED -> XML GENERADO
  - SIGNED -> FIRMADO
  - SENT -> ENVIADO
  - ACCEPTED -> ACEPTADO
  - REJECTED -> RECHAZADO
  - ERROR -> ERROR
  - CANCELLED -> ANULADO
- [ ] No hay consultas por fila a billing (sin N+1).
- [ ] Formato monetario PEN correcto (Intl.NumberFormat es-PE).
- [ ] Fecha/hora con Intl.DateTimeFormat es-PE.
- [ ] Chips de comprobante sobrios, no invasivos (dark-tinted, borde tenue).
- [ ] Pendiente se ve neutral, no como alerta fuerte.
- [ ] La columna Comprobante no compite con Venta, Estado y Total.

#### Detalle de Venta
- [ ] Muestra bloque `Comprobante electronico` con copy `Seguimiento del comprobante asociado.`
- [ ] Sin comprobante muestra `Emitir comprobante`.
- [ ] Con comprobante muestra `Ver comprobante`.
- [ ] No se muestran ambos CTA al mismo tiempo.
- [ ] Layout horizontal compacto de 4 columnas para comprobante: Tipo, Numero, Estado, Ambiente.
- [ ] Labels arriba y valores debajo; separacion clara entre label y value.
- [ ] No aparecen textos pegados como `TipoBoleta`, `EstadoBORRADOR`, `AmbienteSUNAT Beta`.
- [ ] Advertencia de anulacion bloqueada aparece solo cuando corresponde y como nota compacta.
- [ ] Boton `Ver comprobante` debajo del bloque, alineado a la izquierda.
- [ ] Caso sin comprobante mantiene patron compacto horizontal.

#### Anulacion de Venta
- [ ] Venta sin comprobante permite anular.
- [ ] Venta con DRAFT bloquea anulacion.
- [ ] Venta con GENERATED bloquea anulacion.
- [ ] Venta con SIGNED bloquea anulacion.
- [ ] Venta con SENT bloquea anulacion.
- [ ] Venta con ACCEPTED bloquea anulacion.
- [ ] Venta con REJECTED permite anulacion.
- [ ] Venta con ERROR permite anulacion.
- [ ] Venta con CANCELLED permite anulacion.
- [ ] Cuando bloquea, venta sigue COMPLETED.
- [ ] Cuando bloquea, stock no se restaura.
- [ ] Cuando bloquea, pagos no se modifican.
- [ ] Cuando bloquea, caja no cambia por estado VOIDED.
- [ ] Frontend muestra mensaje 409 claro con copy operativo.
- [ ] ConfirmDialogService sigue activo para anulacion permitida.
- [ ] Pantalla de anulacion muestra advertencia preventiva sobre comprobante activo.

#### Validaciones tecnicas
- [ ] `cd backend; .\mvnw.cmd -Dtest=SalesApplicationServiceTest test` -> 32 OK.
- [ ] `cd backend; .\mvnw.cmd -Dtest=BillingApplicationServiceTest test` -> OK.
- [ ] `cd backend; .\mvnw.cmd -DskipTests package` -> BUILD SUCCESS.
- [ ] `cd frontend; npm run build` -> BUILD SUCCESS.

### Facturacion - Configuracion tributaria como consola preventiva (2026-05-24)

- [ ] Abrir /facturacion/configuracion y confirmar que ya no muestra texto MVP.
- [ ] Confirmar header operativo con datos fiscales por ambiente y perfil activo + series compatibles.
- [ ] Confirmar cards LOCAL/BETA/PROD con perfil, series activas, firma, proveedor y estado.
- [ ] LOCAL: verificar card con perfil/series/estado y warning de simulacion local.
- [ ] BETA: verificar card con perfil/series/estado y warning de sandbox/mock.
- [ ] PROD: verificar card con perfil/series/estado y bloqueo de produccion (no avanza como emision real).
- [ ] Serie activa sin perfil activo: verificar advertencia de perfil no configurado.
- [ ] RUC valido (11 digitos): acepta y guarda sin error.
- [ ] RUC invalido (<11 o >11 digitos): rechaza con mensaje controlado.
- [ ] Ubigeo valido (6 digitos si se informa): acepta sin error.
- [ ] Ubigeo invalido (no 6 digitos): rechaza con mensaje controlado.
- [ ] Razon social obligatoria: rechaza si esta vacia.
- [ ] Direccion fiscal obligatoria: rechaza si esta vacia.
- [ ] Sin layout shift en RUC/Razon social al mostrar/ocultar errores.
- [ ] Sin layout shift en Ubigeo/Departamento al mostrar/ocultar errores.
- [ ] Sin layout shift en Provincia/Distrito al mostrar/ocultar errores.
- [ ] Cambiar de ambiente (LOCAL -> BETA -> PROD) no genera layout shift.
- [ ] Guardar/actualizar perfil funciona en LOCAL y BETA.
- [ ] PROD muestra bloqueo de produccion y no permite avance como emision real.
- [ ] Navegacion a Series desde CTA funciona correctamente.
- [ ] POS, Series y Comprobantes no fueron afectados por los cambios.
- [ ] Backend/POS/endpoints/DB/Flyway intactos.

### Facturacion - Configuracion tributaria loading gate + loader neutral (2026-05-24)

- [ ] F5 repetido en /facturacion/configuracion: no debe aparecer formulario vacio, cards incompletas ni skeleton con cuadros vacios.
- [ ] Navegacion interna hacia /facturacion/configuracion: no debe haber parpadeo visual ni flash de contenido parcial.
- [ ] Carga rapida: debe aparecer directamente la pantalla real con datos de LOCAL/BETA/PROD sin transicion intermedia.
- [ ] Carga lenta (throttling Slow 3G): debe aparecer loader neutral con texto "Cargando configuracion tributaria..." y mensaje operativo.
- [ ] Loader neutral no debe mostrar maquetas vacias ni placeholders graficos.
- [ ] Si la carga falla antes de 280 ms: debe aparecer error operativo con boton Recargar.
- [ ] Si la carga falla despues de 280 ms: debe reemplazar loader neutral por error operativo con boton Recargar.
- [ ] Cambio entre LOCAL, BETA y PROD: cards y formulario se actualizan sin flicker.
- [ ] Crear perfil en LOCAL/BETA: funciona correctamente y recarga datos.
- [ ] Actualizar perfil en LOCAL/BETA: funciona correctamente y mantiene datos.
- [ ] PROD muestra bloqueo de produccion y no permite avance como emision real.
- [ ] Sin cambios en backend, POS, endpoints, DB/Flyway ni servicios Angular.

### Facturacion - Hardening envio/firma por ambiente (2026-05-24)

- [ ] LOCAL: generar XML, firmar y enviar; flujo permitido como simulacion local.
- [ ] BETA: generar XML, firmar y enviar; flujo permitido como sandbox simulado.
- [ ] PROD: validar bloqueo de envio con mensaje `El envio en produccion esta bloqueado porque no hay proveedor tributario real configurado.`
- [ ] PROD: validar que no cambia estado a `SENT` ni `ACCEPTED` cuando el envio se bloquea.
- [ ] PROD: validar bloqueo de firma con mensaje `La firma en produccion requiere un certificado digital valido y firma XML real.`
- [ ] Validar que el boton de envio no se muestra/permanece bloqueado en detalle cuando el ambiente es PROD.
- [ ] Validar alertas visibles en detalle: simulacion local/sandbox para LOCAL/BETA y advertencia de bloqueo para PROD.
- [ ] Validar que historial no registra eventos falsos de envio en PROD bloqueado.
- [ ] Validar mensajes operativos para XML no generado/XML firmado no disponible y estado no permitido.
- [ ] Validar que POS, listado de comprobantes, emitir pendiente y detalle mantienen comportamiento sin regresion.

### Facturacion - Hardening series y correlativos (2026-05-24)

- [ ] Crear serie activa duplicada mismo documentType+environment: debe fallar con 409.
- [ ] Crear serie activa distinto environment mismo documentType: debe pasar sin error.
- [ ] Activar segunda serie activa mismo documentType+environment: debe fallar con 409.
- [ ] Bajar correlativo (currentNumber) por debajo o igual al ultimo emitido (maxIssuedNumber): debe fallar con 409.
- [ ] Subir correlativo (currentNumber) mayor al ultimo emitido (maxIssuedNumber): debe pasar sin error.
- [ ] Emision createFromSale() bloquea si serie tiene currentNumber <= maxIssuedNumber: debe fallar con 409 antes de crear documento o incrementar correlativo.
- [ ] Emision createFromSale() permite emitir si currentNumber > maxIssuedNumber: debe crear documento e incrementar correlativo.
- [ ] Emision sin comprobantes emitidos previos: debe pasar sin bloqueo por maxIssuedNumber.
- [ ] Serie historica desactivada conserva trazabilidad: comprobantes antiguos mantienen billingSeriesId/series/fullNumber intactos.
- [ ] Migracion Flyway V16 aplicada: indice unico parcial uq_billing_series_doc_type_environment_active existe y aborta si hay duplicados activos preexistentes.
- [ ] Mensaje de negocio para correlativo invalido: "El correlativo de la serie no es valido. Debe ser mayor al ultimo comprobante emitido."
- [ ] Runbook operativo: si serie queda con currentNumber <= maxIssuedNumber, corregir manualmente a maxIssuedNumber + 1 antes de volver a usar.
- [ ] Correccion manual aplicada: B001/LOCAL tenia current_number=1 y max_issued=2, se corrigio desde UI Series a currentNumber=3 (proximo correlativo > ultimo emitido); serie quedo INACTIVA; trazabilidad historica preservada; validacion previa a reactivacion de serie historica confirmada.
- [ ] No se modificaron datos automaticamente; riesgo residual de datos historicos inconsistentes documentado.
- [ ] POS, frontend, endpoints publicos y DB/Flyway (excepto V16) intactos.

### Facturacion - Rediseño Series y numeracion tributaria frontend (2026-05-24)

- [ ] Pantalla inicia con formulario cerrado (no abierto por defecto).
- [ ] Boton Nueva serie visible y funcional; abre formulario para creacion.
- [ ] Editar serie existente abre formulario en modo edicion con contexto "Editando serie X / ambiente Y".
- [ ] Boton Cancelar cierra formulario sin guardar cambios.
- [ ] Filtro por Tipo de comprobante filtra correctamente la tabla.
- [ ] Filtro por Ambiente filtra correctamente la tabla.
- [ ] Filtro por Estado filtra correctamente la tabla.
- [ ] Separacion visual entre Series vigentes (activas) y Series historicas (inactivas).
- [ ] Boton Mostrar/Ocultar en Series historicas alterna visibilidad de tabla colapsable.
- [ ] Copy en historicas: "Una serie inactiva conserva la trazabilidad de comprobantes emitidos."
- [ ] Confirmacion al desactivar serie con ConfirmDialogService (variante danger).
- [ ] Confirmacion al activar serie historica con ConfirmDialogService (variante warning).
- [ ] Confirmacion al crear/editar serie activa con advertencia de conflicto.
- [ ] Mensaje claro ante serie activa duplicada (409): conflicto operativo descriptivo.
- [ ] Mensaje claro ante proximo correlativo invalido (409): debe ser mayor al ultimo emitido.
- [ ] Chips LOCAL/BETA/PROD sobrios, compactos, legibles con estilo dark-tinted.
- [ ] Badge ACTIVA con verde sobrio corporativo; badge INACTIVA con gris neutro (no rojo ni blanco).
- [ ] Sin layout shift en errores de formulario (field-help persistente con min-height).
- [ ] Build frontend OK sin errores de compilacion.
- [ ] Sin cambios en backend, POS, endpoints publicos, DB/Flyway.

### Facturacion - Configuracion tributaria por ambiente (2026-05-24)

- [ ] Configuracion tributaria: header operativo sin texto MVP y con relacion perfil-serie por ambiente.
- [ ] Configuracion tributaria: cards LOCAL/BETA/PROD visibles con perfil, series activas, firma, proveedor y estado final.
- [ ] Configuracion tributaria: detectar perfil faltante con series activas y mostrar warning preventivo.
- [ ] Configuracion tributaria: crear perfil BETA activo y validar cambio de estado a listo para pruebas.
- [ ] Configuracion tributaria: PROD visible como bloqueado para envio productivo real en esta fase.
- [ ] Configuracion tributaria: RUC valida exactamente 11 digitos.
- [ ] Configuracion tributaria: ubigeo valida 6 digitos si se informa.
- [ ] Configuracion tributaria: boton `Ver series de este ambiente` navega a `/facturacion/series`.
- [ ] Reintentar emision con serie BETA tras crear perfil BETA y validar que no falla por perfil faltante.

### Facturacion - Detalle comprobante electronico e items enriquecidos (2026-05-24)

- [ ] Detalle: validar que el comprobante muestra nombre real del producto en la tabla de items.
- [ ] Detalle: validar que se muestra SKU como dato secundario.
- [ ] Detalle: validar que no se muestra ID tecnico como dato operativo.
- [ ] Detalle: validar producto con barcode y sin barcode si aplica.
- [ ] Detalle: validar historial de estados ordenado por fecha descendente.
- [ ] Detalle: validar XML tecnico colapsable.
- [ ] Detalle: validar generacion/firma/envio sin regresion.
- [ ] Detalle: validar que POS, listado de comprobantes y emision pendiente siguen funcionando.
- [ ] Sin cambios en DB/Flyway, endpoints principales, POS ni contratos de payload.

### Sidebar avanzado InkToy (2026-05-05)

- [x] Build frontend (`npm run build`) exitoso tras cambios del sidebar.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Sidebar agrupado por modulos, sin cambios de rutas ni permisos reales.
- [x] Etiquetas finales aplicadas con tildes y nombres operativos.
- [x] Grupos vacios ocultos por rol.
- [x] Estado activo visible por ruta actual.
- [x] Menu con scroll interno independiente.
- [x] Boton `Cerrar sesion` fijo y visible en shell.
- [x] Modo compacto/expandido funcional y persistente (localStorage).
- [x] Tooltips activos en modo compacto.
- [x] Fallback seguro con localStorage invalido para modo/grupos.
- [x] Logout funcional; ruta protegida redirige a `/login` tras cerrar sesion.

### Hotfix C2 - Logout anclado abajo (2026-05-06)

- [x] Build frontend (`npm run build`) exitoso tras ajuste puntual de layout sidebar.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Fix aplicado solo en `layout.component.ts` (CSS/estructura visual), sin cambios en rutas, guards, auth, interceptor ni backend.
- [x] `Cerrar sesion` permanece fuera del area scrolleable (`.sidebar-menu`) y anclado al fondo del sidebar.
- [x] Menu lateral mantiene scroll interno independiente con grupos expandidos.
- [x] Anclaje validado por rol (`ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR`) en modo expandido y compacto.
- [x] Modo responsive validado (simulacion `innerWidth` < 1200): compacto deshabilitado, logout visible y anclado.
- [x] Estado activo de enlaces y colapsables sin regresion tras el hotfix.
- [x] Logout funcional por rol; acceso posterior a ruta protegida redirige a `/login`.
- [x] Sin `pageerror`, sin `500` inesperados, sin CORS, sin llamadas directas a `localhost:8080`.

### Hotfix C2.1 - Footer fijo de logout siempre visible (2026-05-06)

- [x] Sidebar reestructurado en 3 zonas explicitas: header, navegacion scrolleable y footer fijo.
- [x] `Cerrar sesion` queda fuera de `.sidebar-menu` y no participa del scroll del menu.
- [x] `Cerrar sesion` visible y usable en todo momento (sin scroll al final del menu).
- [x] Validado por rol (`ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR`) en `/dashboard`.
- [x] En cada rol: abrir grupos, hacer scroll de menu, compactar/expandir, y verificar visibilidad constante del footer.
- [x] Caso exigente `ADMIN`: todos los grupos abiertos, `navScrollable=true`, scroll interno activo, logout permanece visible abajo.
- [x] Logout funcional y redireccion posterior de ruta protegida `/dashboard` hacia `/login`.
- [x] Build y runtime validados (`npm run build`, `docker compose up --build -d`, `docker compose ps`).

### Hotfix C2.2 - Sidebar estable en scroll de contenido principal (2026-05-06)

- [x] Causa confirmada: el scroll vertical estaba ocurriendo en `window/body`, provocando recorte visual del sidebar y franja vacia inferior al bajar por la derecha.
- [x] Ajuste aplicado en layout shell: viewport acotado (`100vh/100dvh`) y overflow global controlado.
- [x] Scroll principal movido al contenedor de contenido (`.content`) con `overflow: auto` y `min-height: 0`.
- [x] Sidebar mantiene altura completa de viewport durante scroll del contenido (`sidebar top=0`, `bottom=viewport`).
- [x] Sin franja vacia debajo del sidebar durante scroll del contenido en dashboard y rutas largas.
- [x] Logout se mantiene fijo/visible abajo y fuera de `.sidebar-menu`.
- [x] Scroll interno de menu lateral se mantiene operativo y aislado.
- [x] Validacion por rol en `/dashboard` (`ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR`) en expandido y compacto.
- [x] Validacion adicional ADMIN en rutas largas: `/reportes`, `/ventas`, `/inventario/stock`, `/facturacion/comprobantes`.
- [x] Sin `pageerror`, sin `500` inesperados, sin CORS, sin llamadas directas a `localhost:8080`.

### Hotfix C3 - Scrollbar InkToy + Theme toggle + Sidebar width (2026-05-06)

- [x] Sidebar expandido con ancho moderadamente mayor para mejorar legibilidad de etiquetas largas.
- [x] Etiquetas largas en ADMIN sin recorte visual en expandido: `Kardex / Movimientos`, `Órdenes de compra`, `Configuración tributaria`, `Series y correlativos`, `Eventos de integración`.
- [x] Modo compacto se mantiene funcional y persistente; no afecta colapsables ni tooltips.
- [x] Scrollbar interno de `.sidebar-menu` estilizado con paleta InkToy (track discreto + thumb acento).
- [x] Scrollbar del menu lateral validado en light/dark sin afectar el scroll principal del contenido.
- [x] Boton de tema (claro/oscuro) visible en topbar para todos los roles.
- [x] Boton de tema con `aria-label` dinamico y operable por teclado (`Enter`).
- [x] Persistencia de tema en localStorage (`erp_pos_theme`) validada tras recarga (dark y light).
- [x] Fallback seguro de tema: valor invalido en storage => modo claro.
- [x] Validacion por rol (`ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR`) en `/dashboard` con scroll de menu y de contenido.
- [x] Validacion de rutas por rol con tema activo y shell estable:
  - [x] ADMIN/SUPERVISOR: `/dashboard`, `/pos`, `/inventario/stock`, `/ventas`, `/facturacion/comprobantes`, `/reportes`.
  - [x] CAJERO: `/dashboard`, `/pos`, `/inventario/stock`, `/ventas`, `/facturacion/comprobantes`.
  - [x] ALMACENERO: `/dashboard`, `/inventario/stock`, `/reportes`.
- [x] Sidebar mantiene cobertura completa de viewport durante scroll de contenido (`top=0`, `bottom=viewport`) sin franja vacia inferior.
- [x] Logout se mantiene fijo y visible fuera de `.sidebar-menu` en expandido y compacto.
- [x] Sin `pageerror`, sin `500` inesperados, sin CORS, sin llamadas directas a `localhost:8080`.

### Matriz por rol - Sidebar avanzado

- [x] ADMIN:
  - [x] Grupos: Operacion, Catalogo, Inventario, Compras, Facturacion, Integraciones.
  - [x] Standalone: Inicio, Cotizaciones, Reportes.
  - [x] Rutas criticas validadas: `/dashboard`, `/pos`, `/caja`, `/ventas`, `/catalogo/productos`, `/inventario/stock`, `/compras/ordenes`, `/cotizaciones`, `/facturacion/comprobantes`, `/reportes`, `/integraciones/eventos`.
- [x] CAJERO:
  - [x] Grupos: Operacion, Consulta, Facturacion.
  - [x] Standalone: Inicio, Cotizaciones.
  - [x] No visibles: Catalogo, Compras, Integraciones, Configuracion tributaria, Series y correlativos.
  - [x] Rutas permitidas validadas: `/dashboard`, `/pos`, `/caja`, `/ventas`, `/inventario/stock`, `/cotizaciones`, `/facturacion/comprobantes`.
  - [x] Rutas bloqueadas redirigen a `/dashboard`: `/catalogo/productos`, `/integraciones/eventos`, `/facturacion/configuracion`.
- [x] ALMACENERO:
  - [x] Grupos: Catalogo, Inventario, Compras.
  - [x] Standalone: Inicio, Reportes.
  - [x] No visibles: Operacion, Cotizaciones, Facturacion, Integraciones.
  - [x] Rutas permitidas validadas: `/dashboard`, `/catalogo/productos`, `/inventario/stock`, `/inventario/stock-inicial`, `/inventario/ajustes`, `/inventario/transferencias`, `/compras/proveedores`, `/compras/ordenes`, `/reportes`.
  - [x] Rutas bloqueadas redirigen a `/dashboard`: `/pos`, `/cotizaciones`, `/facturacion/comprobantes`.
- [x] SUPERVISOR:
  - [x] Grupos: Operacion, Catalogo, Inventario, Compras, Facturacion.
  - [x] Standalone: Inicio, Cotizaciones, Reportes.
  - [x] No visibles: Integraciones, Configuracion tributaria, Series y correlativos.
  - [x] Rutas permitidas validadas: `/dashboard`, `/pos`, `/caja`, `/ventas`, `/catalogo/productos`, `/inventario/stock`, `/inventario/kardex`, `/compras/ordenes`, `/cotizaciones`, `/facturacion/comprobantes`, `/reportes`.
  - [x] Rutas bloqueadas redirigen a `/dashboard`: `/integraciones/eventos`, `/facturacion/configuracion`, `/facturacion/series`.

### Observaciones runtime

- [x] Sin `pageerror` durante la validacion de sidebar.
- [x] Sin respuestas HTTP `500` inesperadas.
- [x] Sin errores CORS.
- [x] Sin llamadas directas a `localhost:8080` desde Angular (`frontend/src`).
- [x] Se observan respuestas `404` esperadas en `/api/v1/cash-registers/current` cuando no existe caja abierta; no bloquea sidebar ni permisos.

## Health y auth

- [x] `GET /api/v1/health` => 200.
- [x] `GET /api/v1/health/db` => 200.
- [x] Login `admin@erp.local` => 200 + token.
- [x] Login `cajero@erp.local` => 200 + token.
- [x] Login `almacenero@erp.local` => 200 + token.
- [x] Login `supervisor@erp.local` => 200 + token.
- [x] `GET /api/v1/auth/me` con token valido => 200 y rol correcto.
- [x] `GET /api/v1/auth/me` sin token => 401.
- [x] `GET /api/v1/auth/me` token invalido => 401.

## Seguridad por roles

- [x] Outbox solo ADMIN (`200` ADMIN, `403` CAJERO/ALMACENERO/SUPERVISOR).
- [x] Configuracion critica billing solo ADMIN (`/billing/company-profile`).
- [x] `CAJERO` con acceso de lectura a `/billing/series` => 200; mutaciones de series (`POST/PUT/DELETE`) se mantienen solo ADMIN.
- [x] `ALMACENERO` sin acceso a `/cash-registers/current` => 403.
- [x] `SUPERVISOR` con acceso a `/reports/sales` => 200.

## Endpoints modulo MVP (smoke)

- [x] AUTH: `/auth/login`, `/auth/me`.
- [x] CATALOG: `/products`, `/products/search`, `/categories`, `/units`.
- [x] INVENTORY: `/warehouses`, `/inventory/stocks`, `/inventory/kardex`.
- [x] PURCHASES: `/suppliers`, `/purchase-orders`.
- [x] SALES/CASH/POS: `/cash-registers/current`, `/sales`, `/pos/products/search`.
- [x] QUOTES: `/quotes`.
- [x] BILLING: `/billing/company-profile`, `/billing/series`, `/billing/documents`.
- [x] REPORTS: `/reports/sales`, `/reports/low-stock`, `/reports/top-products`, `/reports/electronic-documents`.
- [x] OUTBOX: `/integrations/outbox-events`.
- [x] HEALTH: `/health`, `/health/db`.

## Pantallas y SPA

- [x] Carga de shell Angular en rutas clave: `/login`, `/dashboard`, `/catalogo/productos`, `/inventario/stock`, `/inventario/kardex`, `/compras/proveedores`, `/compras/ordenes`, `/caja`, `/pos`, `/ventas`, `/cotizaciones`, `/facturacion/configuracion`, `/facturacion/series`, `/facturacion/comprobantes`, `/reportes`, `/integraciones/eventos`.
- [x] Refresh directo de rutas SPA sin `404` Nginx ni `Cannot GET`.
- [x] Proxy `/api` operativo sin CORS en llamadas validadas.
- [ ] Verificacion manual visual de consola navegador por cada pantalla/accion (pendiente manual UX).

## Flujos criticos A-H

- [x] A Catalogo/POS: busqueda por SKU y lookup por barcode; producto visible en POS.
- [x] B Inventario: stock consultado; kardex operativo; sin stock negativo.
- [x] C Compras: validado por consistencia SQL de `PURCHASE_IN` y endpoints de compras; flujo transaccional completo queda validado por datos existentes.
- [x] D Caja/POS/Ventas: apertura de caja, venta, anulacion por SUPERVISOR, descuento y reposicion de stock (`SALE_OUT`/`SALE_VOID_IN`).
- [x] E Cotizaciones: crear, enviar, convertir a venta, bloqueo de doble conversion (409).
- [x] F Facturacion: `from-sale`, `generate-xml`, `sign`, `send`; estado final `ACCEPTED`; historial disponible.
- [x] G Reportes: ventas, stock bajo, top productos, comprobantes sin 500.
- [x] H Outbox: listar como ADMIN, 403 en roles no ADMIN, accion `retry` ejecutada.

## Consistencia de datos SQL

- [x] `stock_balances.quantity < 0` => 0 filas.
- [x] `stock_balances` vs ultimo `inventory_movements.new_stock` => 0 mismatch.
- [x] Ventas anuladas sin movimiento `SALE_VOID_IN` => 0.
- [x] Cotizaciones `CONVERTED` sin `converted_sale_id` => 0.
- [x] Duplicado de comprobante por `sale_id + document_type` => 0.
- [x] Outbox sin referencia RabbitMQ/SQS/ecommerce real en payload => 0 coincidencias.

## Logs

- [x] Backend sin errores 500 inesperados en la corrida.
- [x] Frontend Nginx sin errores criticos de arranque.
- [x] Sin llamadas hardcodeadas a `localhost:8080` en `frontend/src`.

## Bloque D Dashboard InkToy (2026-04-29)

- [x] Dashboard reemplazo placeholder por hub operativo con KPIs por rol.
- [x] Build frontend (`npm run build`) exitoso con Bloque D.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Login y carga de `/dashboard` correctos para ADMIN/CAJERO/ALMACENERO/SUPERVISOR.
- [x] Refresh de `/dashboard` mantiene sesion valida en los 4 roles.
- [x] Logout funcional y ruta protegida `/dashboard` redirige a `/login` tras cerrar sesion.
- [x] Outbox visible solo para ADMIN en shell y accesos rapidos.
- [x] Configuracion critica de facturacion visible solo para ADMIN en shell.
- [x] Sin errores de consola durante validacion por roles en navegador.
- [x] Sin respuestas HTTP 500 inesperadas en dashboard tras ajuste de consumo de ventas/cotizaciones.
- [x] Backend/AuthService/guards/interceptor/endpoints no modificados.

## Bloque E1 Catalogo InkToy (2026-04-29)

- [x] Pantallas aplicadas: `/catalogo/productos`, `/catalogo/productos/nuevo`, `/catalogo/productos/:id/editar`, `/catalogo/categorias`, `/catalogo/unidades`.
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E1.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] ADMIN: busqueda de productos por nombre, SKU y barcode validada.
- [x] ADMIN: crear producto validado (SKU/barcode independientes).
- [x] ADMIN: editar producto validado.
- [x] ADMIN: desactivar producto validado (estado Inactivo + boton deshabilitado).
- [x] ADMIN: crear categoria validado.
- [x] ADMIN: crear unidad validado.
- [x] Refresh directo SPA sin `404` en rutas de catalogo intervenidas.
- [x] Validacion RBAC visual de menu catalogo:
  - [x] CAJERO no ve entradas de catalogo.
  - [x] ALMACENERO ve entradas de catalogo.
  - [x] SUPERVISOR ve entradas de catalogo.
- [x] Login/logout funcional para CAJERO, ALMACENERO y SUPERVISOR.
- [x] Sin errores de consola JavaScript ni errores de runtime (`pageerror`) en pruebas E1.
- [x] Logo InkToy, layout/sidebar y dashboard permanecen estables.
- [x] Backend, endpoints, rutas, AuthService, guards e interceptor sin cambios.

## Hardening RBAC Frontend (2026-04-29)

- [x] Se implemento `roleGuard` para `canActivateChild` sobre rutas protegidas por sesion.
- [x] Matriz de `allowedRoles` aplicada en `app.routes.ts` por ruta/modulo.
- [x] Usuario sin sesion redirige a `/login` al abrir rutas protegidas.
- [x] CAJERO bloqueado por frontend en `/catalogo/productos` (redirige a `/dashboard`).
- [x] CAJERO bloqueado por frontend en `/integraciones/eventos` (redirige a `/dashboard`).
- [x] ALMACENERO bloqueado por frontend en `/pos` (redirige a `/dashboard`).
- [x] SUPERVISOR bloqueado por frontend en `/integraciones/eventos` (redirige a `/dashboard`).
- [x] ADMIN mantiene acceso en rutas criticas (`/integraciones/eventos`, `/facturacion/configuracion`, `/facturacion/series`).
- [x] Login/logout sin regresion tras endurecimiento de guardias de rutas.
- [x] Build frontend (`npm run build`) exitoso.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Revalidacion puntual en `/pos` (SUPERVISOR): no se reprodujo respuesta `403`; sin impacto en bloqueo de rutas.

## Bloque E2 Inventario InkToy (2026-04-29)

- [x] Pantallas aplicadas: `/inventario/almacenes`, `/inventario/stock`, `/inventario/stock-inicial`, `/inventario/ajustes`, `/inventario/transferencias`, `/inventario/kardex`.
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E2.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Validacion visual base de E2: estructura `ui-page-head` presente en pantallas de inventario intervenidas.
- [x] Matriz de acceso por ruta (frontend) validada en navegador:
  - [x] ADMIN: acceso a las 6 rutas E2.
  - [x] ALMACENERO: acceso a `almacenes/stock/stock-inicial/ajustes/transferencias`; bloqueo en `/inventario/kardex` (redirige a `/dashboard`).
  - [x] SUPERVISOR: acceso a `almacenes/stock/kardex`; bloqueo en `stock-inicial/ajustes/transferencias` (redirige a `/dashboard`).
- [x] Refresh directo SPA sin `404` en rutas E2 intervenidas.
- [x] Servicios/endpoints de inventario sin cambios de contrato en E2.
- [x] Backend, rutas, auth, guards, interceptor y permisos no modificados por E2 (solo presentacion).

### Smoke funcional corto Inventario E2 (2026-04-29)

- [x] Usuario/rol de ejecucion principal: `admin@erp.local` (ADMIN).
- [x] Rutas abiertas en navegador: `almacenes`, `stock`, `stock-inicial`, `ajustes`, `transferencias`, `kardex`.
- [x] Dato de prueba operativo utilizado:
  - Producto: `Producto Sprint5 1777163753 (SKU: SKU-S5-1777163753)`
  - Almacen origen: `WH-01 - Almacen Principal`
  - Almacen destino: `S3DST1777141364 - Almacen Destino S3 1777141364`
- [x] Ajuste positivo valido (`+1`): `201` y mensaje `Ajuste registrado correctamente.`.
- [x] Verificacion stock post ajuste positivo: `30` -> `31`.
- [x] Ajuste negativo valido (`-0.5`): `201` y mensaje `Ajuste registrado correctamente.`.
- [x] Verificacion stock post ajuste negativo: `31` -> `30.5`.
- [x] Ajuste negativo invalido (cantidad excesiva): `422` controlado con mensaje `Validacion fallida: Adjustment leaves negative stock`.
- [x] Verificacion stock tras intento invalido: se mantiene en `30.5` (sin mutacion).
- [x] Transferencia valida (`0.2`) origen->destino: `201` y mensaje `Transferencia registrada correctamente.`.
- [x] Verificacion stock transferencia:
  - Origen `WH-01`: `30.5` -> `30.3`
  - Destino `S3DST1777141364`: `0` -> `0.2`
- [x] Kardex consultado y confirmado por motivos de prueba:
  - `ADJUSTMENT_IN`
  - `ADJUSTMENT_OUT`
  - `TRANSFER_OUT` y `TRANSFER_IN`
- [x] Estado vacio validado en kardex con rango futuro (`2099-01-01`): mensaje `No hay movimientos para los filtros seleccionados.`.
- [x] Seguridad/rutas protegidas revalidadas:
  - Sin sesion en `/inventario/stock` redirige a `/login`.
  - `almacenero@erp.local` bloqueado en `/inventario/kardex` (redirige a `/dashboard`).
  - `almacenero@erp.local` mantiene acceso a `/inventario/ajustes`.
- [x] Sin errores `500` ni `pageerror` durante el smoke.
- [x] Registro de consola con `422` esperado unicamente en la prueba negativa invalida.

## Bloque E3 POS/Caja/Ventas InkToy (2026-04-29)

- [x] Pantallas aplicadas: `/pos`, `/caja`, `/ventas`, `/ventas/:id`, `/ventas/:id/anular`.
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E3.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos.
- [x] Smoke visual-funcional E3 en navegador con `admin@erp.local` (ADMIN):
  - [x] `/caja` renderiza cabecera InkToy, estado de sesion y paneles operativos.
  - [x] `/pos` renderiza bloques de busqueda, carrito, pagos y totales.
  - [x] Busqueda por nombre en POS (`lapiz`) ejecutada sin `pageerror`.
  - [x] `/ventas` renderiza filtros y tabla con estados.
  - [x] `/ventas/37` renderiza resumen, items, pagos y totales.
  - [x] `/ventas/37/anular` renderiza formulario de anulacion.
- [x] Matriz de acceso por ruta (frontend) revalidada en E3:
  - [x] CAJERO: acceso a `/pos`, `/caja`, `/ventas`.
  - [x] CAJERO: bloqueo en `/ventas/37/anular` (redirige a `/dashboard`).
  - [x] ALMACENERO: bloqueo en `/pos`, `/caja`, `/ventas` (redirige a `/dashboard`).
  - [x] ALMACENERO: acceso control en `/inventario/stock` (sin regresion de permisos).
  - [x] SUPERVISOR: acceso a `/ventas` y `/ventas/37/anular`.
  - [x] ADMIN: acceso a `/ventas/37/anular`.
- [x] Sin errores `500` ni `pageerror` inesperados durante validacion E3.
- [x] Evento de consola `403` observado unicamente en intento no autorizado esperado (CAJERO a ruta de anulacion).
- [x] Sin cambios en contratos API de `pos/sales/cash-register`, guards, interceptor, backend o rutas.

### Smoke transaccional corto E3 (2026-04-29)

- [x] Validacion base ejecutada:
  - [x] `cd frontend` + `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => backend/frontend up, postgres healthy.
- [x] Usuario/rol principal de ejecucion: `admin@erp.local` (ADMIN).
- [x] Usuario/rol para prueba negativa de permisos: `cajero@erp.local` (CAJERO).
- [x] Flujo caja:
  - [x] `/caja` con sesion abierta existente `#15`.
  - [x] Estado visual de caja confirmado: `OPEN`.
  - [x] No se abrio nueva caja para evitar alterar estado operativo.
- [x] Flujo POS/Venta real:
  - [x] Almacen usado: `S3DST1777141364 - Almacen Destino S3 1777141364`.
  - [x] Producto usado: `Producto S4 1777159803 (SKU: SKU-S4-1777159803)`.
  - [x] Venta registrada: `S-1777512445806` (ID `38`).
  - [x] Total/pago/vuelto validados: `25.50` / `30.50` / `5.00`.
  - [x] Mensaje de exito mostrado: `Venta S-1777512445806 registrada correctamente.`.
- [x] Listado y detalle:
  - [x] Venta visible en `/ventas` con estado `COMPLETED`.
  - [x] Detalle en `/ventas/38` con items/pagos/totales/fecha correctos.
- [x] Stock y kardex (post venta):
  - [x] Stock antes de venta: `19`.
  - [x] Stock despues de venta: `18`.
  - [x] Delta confirmado: `-1`.
  - [x] Kardex confirmado con `SALE_OUT` (motivo incluye `Sale S-1777512445806`).
- [x] Anulacion y reposicion:
  - [x] Anulacion ejecutada en `/ventas/38/anular` con motivo controlado.
  - [x] Estado final de venta: `VOIDED`.
  - [x] Stock despues de anulacion: `19`.
  - [x] Delta reposicion confirmado: `+1` (retorno al valor inicial).
  - [x] Kardex confirmado con `SALE_VOID_IN` (motivo incluye `Sale void S-1777512445806`).
- [x] Pruebas negativas/control de errores:
  - [x] Rol no permitido: `CAJERO` bloqueado en `/ventas/38/anular` (redirige a `/dashboard`).
  - [ ] Venta sin caja abierta: no ejecutada; `CAJERO` presento sesion abierta en el entorno y se evito forzar cierre para no alterar estado.
  - [x] Error `403` observado y controlado en pruebas negativas.
  - [ ] Escenarios `409/422` no forzados en E3 para evitar mutaciones no necesarias del flujo operativo.
- [x] Runtime/consola:
  - [x] Sin `pageerror`.
  - [x] Sin respuestas `500` inesperadas.
  - [x] Solo errores esperados de pruebas negativas/controladas.

  ## Bloque BT-001 Caja abierta unica por usuario (2026-05-04)
  - [x] Backend: `mvn clean test` => SUCCESS.
  - [x] Backend: `mvn clean verify` => SUCCESS.
  - [x] `docker compose up --build -d` ejecutado.
  - [x] `docker compose ps` con `postgres` healthy, `backend` up, `frontend` up.
  - [x] Backend runtime recuperado (credenciales DB runtime validadas contra `docker inspect` del contenedor backend).
  - [x] Flyway V13 verificado en DB activa (`inktoy_name_local`) con `success=true`.
  - [x] Indice parcial unico `uq_cash_register_sessions_opened_by_user_open` verificado en DB activa.
  - [x] API BT-001:
    - [x] Primera apertura por usuario (`/cash-registers/open`) => `201`.
    - [x] Segunda apertura del mismo usuario => `409`.
    - [x] Apertura de usuarios distintos en paralelo => `201` por usuario.
    - [x] Cierre + reapertura => `200`/`201`.
    - [x] Sin `500` en corrida principal BT-001.
  - [x] UI `/caja`:
    - [x] Apertura correcta y estado OPEN visible.
    - [x] Prevencion de doble apertura visible (boton deshabilitado + mensaje informativo).
    - [x] Cierre y reapertura validados.
  - [x] UI `/pos`:
    - [x] Carga estable con caja abierta.
    - [x] Busqueda por nombre devuelve estado vacio controlado (sin crash).
  - [x] Venta real + validacion stock/kardex en corrida controlada BT-001.
    - [x] Datos QA operativos creados por API (sin cambios de codigo/configuracion).
    - [x] Producto: `#2` (`SKU-BT001-1777916163`) en almacen `#2` (`WH-01`).
    - [x] Stock antes: `5.000`.
    - [x] Venta generada: `#2` (`S-1777916164455`) estado `COMPLETED`, pago `CASH`.
    - [x] Stock despues: `4.000`.
    - [x] Kardex con `SALE_OUT` confirmado (`id=4`, `referenceId=2`).
    - [x] Sin stock negativo global (`stock_balances.quantity < 0` => 0).
    - [x] Sin errores `500` en corrida controlada.
    - [x] Cierre/reapertura y restriccion BT-001 revalidadas (`409`, `200`, `201`, `409`).

## Bloque BT-002 Doble conversion concurrente de cotizacion (2026-05-04)

- [x] Backend: `mvn clean test` => SUCCESS (120 tests, 0 fail/error).
- [x] Backend: `mvn clean verify` => SUCCESS.
- [x] `docker compose up --build -d` ejecutado.
- [x] `docker compose ps` con `postgres` healthy, `backend` up, `frontend` up.
- [x] `GET /api/v1/health` => `200`.
- [x] Datos QA controlados creados por API:
  - [x] Producto: `#6` (`SKU-BT002-1777919357`).
  - [x] Almacen: `#2` (`WH-01`).
  - [x] Stock seed: ajuste `IN` hasta `20.000`.
- [x] Conversion normal (`quote #5`):
  - [x] `POST /quotes/5/convert-to-sale` => `200`.
  - [x] Cotizacion final `CONVERTED`.
  - [x] `convertedSaleId` no nulo (`4`).
  - [x] Venta generada `#4`.
  - [x] Stock `20.000 -> 19.000`.
  - [x] Kardex `SALE_OUT` unico (`movementId=10`, `referenceId=4`).
- [x] Doble conversion secuencial (`quote #5`):
  - [x] Segundo `POST` => `409` (`Quote already converted`).
  - [x] Sin `500`.
  - [x] Sin segunda venta.
  - [x] Stock sin descuento adicional (`19.000 -> 19.000`).
- [x] Doble conversion concurrente (`quote #6`):
  - [x] Dos requests paralelos ejecutados.
  - [x] Resultado: `200` y `409`.
  - [x] Solo una venta efectiva (`#5`).
  - [x] Cotizacion con un solo `convertedSaleId` (`5`).
  - [x] Stock descontado una sola vez (`19.000 -> 18.000`).
  - [x] Kardex con un solo `SALE_OUT` nuevo (delta `+1`, `movementId=11`, `referenceId=5`).
- [x] Roles:
  - [x] `ADMIN` convierte (`200`).
  - [x] `CAJERO` convierte (`200`).
  - [x] `SUPERVISOR` convierte (`200`).
  - [x] `ALMACENERO` bloqueado en quotes/convert (`403`).
  - [x] `GET /warehouses?active=true` para `CAJERO` => `200`.
- [x] Estabilidad:
  - [x] Sin `500` en corrida final BT-002.
  - [x] Backend logs del tramo final sin excepciones inesperadas.
  - [x] UI `/pos` y `/ventas` cargan correctamente.
  - [x] Sin `pageerror` observado en smoke UI final.

## Bloque BT-003 Stock inicial unico por producto/almacen (2026-05-04)

- [x] Backend: `mvn clean test` => SUCCESS (122 tests, 0 fail/error).
- [x] Backend: `mvn clean verify` => SUCCESS (122 tests).
- [x] `docker compose up --build -d` ejecutado.
- [x] `docker compose ps` con `postgres` healthy, `backend` up, `frontend` up.
- [x] `GET /api/v1/health` => `200`.
- [x] Flyway/DB:
  - [x] Version `14` aplicada en `flyway_schema_history` (`success=true`, `inventory initial stock unique`).
  - [x] Indice parcial unico `uq_inventory_movements_initial_stock_product_warehouse` presente.
- [x] Datos QA controlados por API:
  - [x] Producto secuencial: `#23` (`SKU-BT003-A-1777937972`).
  - [x] Producto concurrencia: `#24` (`SKU-BT003-B-1777937972`).
  - [x] Producto rol ALMACENERO: `#25` (`SKU-BT003-C-1777937972`).
  - [x] Producto roles bloqueados: `#26` (`SKU-BT003-D-1777937972`).
  - [x] Almacen origen: `#2` (`WH-01`).
  - [x] Almacen destino: `#3` (`QABT16050`).
- [x] Stock inicial secuencial (`product #23`, `warehouse #2`):
  - [x] Stock antes: `0`.
  - [x] Primer `POST /inventory/initial-stock` => `201`.
  - [x] Segundo `POST` misma combinacion => `422`.
  - [x] Error controlado `422` con mensaje `Initial stock already registered for this product in the warehouse`.
  - [x] Sin `500`.
  - [x] Stock `0 -> 12.000` y permanece `12.000` tras segundo intento.
  - [x] Kardex `INITIAL_STOCK`: `0 -> 1 -> 1` (sin duplicacion).
- [x] Stock inicial concurrente (`product #24`, `warehouse #2`):
  - [x] Dos requests paralelos ejecutados.
  - [x] Resultado: `201` y `422`.
  - [x] `successCount=1`, `status422Count=1`, `status500Count=0`.
  - [x] Stock final `9.000` (una sola carga inicial).
  - [x] Kardex `INITIAL_STOCK` final `1` (sin duplicacion).
- [x] No regresion inventario:
  - [x] Ajuste positivo `IN` => `201`.
  - [x] Ajuste negativo `OUT` valido => `201`.
  - [x] Transferencia valida => `201`.
  - [x] Stock origen tras ajustes `13.000`; tras transferencia `12.000`.
  - [x] Stock destino tras transferencia `1.000`.
  - [x] Kardex transferencia: `TRANSFER_OUT=1`, `TRANSFER_IN=1`.
  - [x] Sin stock negativo global (`stock_balances.quantity < 0` => `0`).
- [x] Roles:
  - [x] `ADMIN` puede registrar stock inicial (`201`).
  - [x] `ALMACENERO` mantiene permisos operativos (`initial-stock=201`, `adjustments=201`, `transfers=201`).
  - [x] `CAJERO` bloqueado en `initial-stock` (`403`).
  - [x] `SUPERVISOR` bloqueado en `initial-stock` (`403`).
- [x] Estabilidad/UI:
  - [x] Sin `500` inesperados en corrida BT-003.
  - [x] Logs backend sin excepciones no controladas (solo warning informativo de seguridad en arranque).
  - [x] UI `/pos` y `/ventas` cargan correctamente.

## Bloque E4 Compras/Proveedores InkToy (2026-04-30)

- [x] Pantallas aplicadas:
  - [x] `/compras/proveedores`
  - [x] `/compras/ordenes`
  - [x] `/compras/ordenes/nueva`
  - [x] `/compras/ordenes/:id`
  - [x] `/compras/ordenes/:id/editar`
  - [x] `/compras/ordenes/:id/recibir`
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E4.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos (`postgres` healthy, `backend` up, `frontend` up).
- [x] Validacion por ruta (frontend) en navegador:
  - [x] `ADMIN` con acceso a rutas de proveedores/ordenes y acciones de gestion (`nueva`, `editar`, `recibir`).
  - [x] `ALMACENERO` con acceso a rutas de proveedores/ordenes y acciones de gestion (`nueva`, `editar`, `recibir`).
  - [x] `SUPERVISOR` con acceso a lectura (`/compras/proveedores`, `/compras/ordenes`, `/compras/ordenes/:id`) y bloqueo en rutas de gestion (`/nueva`, `/editar`, `/recibir`) con redireccion a `/dashboard`.
  - [x] `CAJERO` bloqueado en todas las rutas de compras intervenidas con redireccion a `/dashboard`.
- [x] Validacion API RBAC de compras:
  - [x] `GET /api/v1/suppliers` => `200` SUPERVISOR, `403` CAJERO.
  - [x] `GET /api/v1/purchase-orders` => `200` SUPERVISOR, `403` CAJERO.
  - [x] `POST /api/v1/purchase-orders/{id}/approve` => `403` SUPERVISOR.
  - [x] `POST /api/v1/purchase-orders/{id}/receive` => `403` SUPERVISOR.
- [x] Sin errores `500` inesperados durante validacion E4.
- [x] Sin cambios en backend, contratos de servicio, guards, interceptor o rutas; alcance visual-only en componentes de compras.

### Smoke transaccional corto E4 (2026-04-30)

- [x] Usuario/rol de ejecucion principal: `admin@erp.local` (ADMIN).
- [x] Usuario/rol de gestion complementaria: `almacenero@erp.local` (ALMACENERO).
- [x] Usuario/rol negativo: `supervisor@erp.local` (SUPERVISOR).
- [x] Flujo ejecutado sobre datos reales:
  - [x] Proveedor creado: `#10` (`Proveedor E4 1777509644`).
  - [x] Orden creada: `#17` en estado inicial `DRAFT`.
  - [x] Aprobacion con SUPERVISOR bloqueada (`403`).
  - [x] Aprobacion con ALMACENERO exitosa (`200`).
  - [x] Recepcion con SUPERVISOR bloqueada (`403`).
  - [x] Recepcion con ADMIN exitosa (`200`) y estado final `RECEIVED`.
- [x] Consistencia de inventario y kardex:
  - [x] Producto usado: `#15` (`SKU-S5-1777163780`).
  - [x] Almacen usado: `#8`.
  - [x] Stock antes de recepcion: `2`.
  - [x] Stock despues de recepcion: `3`.
  - [x] Delta confirmado: `+1`.
  - [x] Kardex con movimiento `PURCHASE_IN` encontrado (motivo: `Purchase receipt #19`).

## Bloque E5 Cotizaciones InkToy (2026-04-30)

- [x] Pantallas aplicadas:
  - [x] `/cotizaciones`
  - [x] `/cotizaciones/nueva`
  - [x] `/cotizaciones/:id`
  - [x] `/cotizaciones/:id/editar`
  - [x] `/cotizaciones/:id/convertir`
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E5.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos (`postgres` healthy, `backend` up, `frontend` up).
- [x] Smoke funcional E5 en navegador (ADMIN):
  - [x] Crear cotizacion desde `/cotizaciones/nueva`.
  - [x] Editar cotizacion desde `/cotizaciones/:id/editar`.
  - [x] Enviar cotizacion desde detalle (`DRAFT` -> `SENT`).
  - [x] Validar historial de estados en `/cotizaciones/:id`.
  - [x] Convertir a venta en `/cotizaciones/:id/convertir` con caja abierta y stock suficiente.
  - [x] Validar venta generada y `convertedSaleId` visible en detalle.
- [x] Evidencia de corrida E5:
  - [x] Cotizacion creada/editada/enviada/convertida: `#34` (`Q-1777515320376`).
  - [x] Venta generada por conversion: `#39`.
  - [x] Historial confirmado con transicion `SENT` -> `CONVERTED` y comentario `Conversion smoke E5`.
- [x] Doble conversion bloqueada:
  - [x] `POST /api/v1/quotes/34/convert-to-sale` (segundo intento) => `409 Quote already converted`.
  - [x] Boton `Convertir a venta` deshabilitado en UI despues de convertir.
- [x] Validacion de estabilidad E5:
  - [x] Sin errores de consola JS durante smoke E5 (navegador en `http://localhost:4200`).
  - [x] Sin respuestas HTTP `500` durante validacion E5.
- [x] Validacion de roles E5 (frontend + API):
  - [x] `ADMIN`: acceso a `/cotizaciones` y `/cotizaciones/nueva`; API `GET/POST/send` en quotes => `200/201/200`.
  - [x] `CAJERO`: acceso a `/cotizaciones` y `/cotizaciones/nueva`; API `GET/POST/send` en quotes => `200/201/200`.
  - [x] `SUPERVISOR`: acceso a `/cotizaciones` y `/cotizaciones/nueva`; API `GET/POST/send` en quotes => `200/201/200`.
  - [x] `ALMACENERO`: bloqueo frontend en `/cotizaciones` y `/cotizaciones/nueva` con redireccion a `/dashboard`; API quotes (`GET/POST`) => `403/403`.
- [x] Alcance tecnico preservado: sin cambios en backend, endpoints, contratos de servicio, guards, interceptor ni reglas de negocio de cotizaciones.

## Bloque E6 Facturacion InkToy (2026-04-30)

- [x] Pantallas aplicadas:
  - [x] `/facturacion/configuracion`
  - [x] `/facturacion/series`
  - [x] `/facturacion/comprobantes`
  - [x] `/facturacion/comprobantes/:id`
  - [x] `/facturacion/emitir/:saleId`
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E6.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos (`postgres` healthy, `backend` up, `frontend` up).
- [x] Smoke funcional E6 en navegador (ADMIN, `http://localhost:4200`):
  - [x] Configuracion: carga de perfil por ambiente y actualizacion exitosa (`Perfil tributario guardado correctamente.`).
  - [x] Series: listado, creacion (`B009`) y edicion de correlativo (`101`) exitosas.
  - [x] Comprobantes: filtros por estado (`DRAFT`) y listado operativo.
  - [x] Emision desde venta: venta `#39` emitida como `B009-00000101`.
  - [x] Detalle `#9`: flujo `DRAFT -> GENERATED -> SIGNED -> SENT -> ACCEPTED` con historial completo.
- [x] Validacion de roles E6 (frontend + smoke UI):
  - [x] `ADMIN`: acceso total a configuracion, series, comprobantes, emision y workflow de detalle.
  - [x] `CAJERO`: acceso a `/facturacion/comprobantes` y detalle; bloqueo en `/facturacion/configuracion` (redirige a `/dashboard`); botones `Firmar XML`/`Enviar mock/sandbox` deshabilitados en detalle.
  - [x] `CAJERO`: flujo `/facturacion/emitir/:saleId` validado; series cargan correctamente y emision desde venta completada sin habilitar rutas admin de series/configuracion.
  - [x] `SUPERVISOR`: acceso a comprobantes/detalle; bloqueo en `/facturacion/configuracion` (redirige a `/dashboard`); flujo de firma/envio mock validado en comprobante `#10` hasta `ACCEPTED`.
  - [x] `ALMACENERO`: bloqueo en `/facturacion/comprobantes` y `/facturacion/configuracion` con redireccion a `/dashboard`.
- [x] Sin respuestas HTTP `500` inesperadas durante validacion E6.
- [x] Sin errores de consola en rutas E6 por carga de XML prematura; comprobantes sin XML muestran estado informativo sin `404` tecnico visible.
- [x] Alcance tecnico preservado en E6: sin cambios de contratos API; ajuste puntual aplicado en backend (RBAC lectura de series) y frontend (carga condicional de XML) manteniendo reglas de negocio.

### Revalidacion UX-004 Facturacion (2026-05-04)

- [x] Alcance UX-004 aplicado solo en frontend: confirmacion previa para `Generar XML`, `Firmar XML` y `Enviar mock/sandbox` en detalle de comprobante.
- [x] Archivo validado: `frontend/src/app/features/billing/billing-document-detail-page.component.ts`.
- [x] ADMIN - comprobante `#2` (`DRAFT`):
  - [x] `Generar XML` muestra confirmacion contextual.
  - [x] `Cancelar` confirmacion mantiene estado en `DRAFT` y sin nuevo historial.
  - [x] `Confirmar` ejecuta accion y cambia estado a `GENERATED` con traza `XML generated`.
- [x] ADMIN - comprobante `#5` (`GENERATED`/`SIGNED`):
  - [x] `Firmar XML` muestra confirmacion contextual.
  - [x] `Cancelar` confirmacion mantiene estado en `GENERATED`.
  - [x] `Confirmar` ejecuta accion y cambia a `SIGNED`.
  - [x] `Enviar mock/sandbox` muestra confirmacion contextual.
  - [x] `Cancelar` confirmacion mantiene estado en `SIGNED`.
  - [x] `Confirmar` ejecuta envio y completa flujo hasta `ACCEPTED`.
- [x] SUPERVISOR - comprobante `#2`:
  - [x] `Firmar XML` habilitado y exitoso (estado `GENERATED` -> `SIGNED`).
  - [x] `Enviar mock/sandbox` habilitado; confirmacion visible y `Cancelar` sin mutacion.
- [x] CAJERO - comprobante `#2`: botones `Firmar XML` y `Enviar mock/sandbox` deshabilitados (sin ejecucion de accion critica).
- [x] ALMACENERO: bloqueo de acceso a Facturacion confirmado (sin menu de comprobantes y redireccion a `/dashboard` al forzar URL de detalle).
- [x] Estabilidad en corrida UX-004:
  - [x] Sin `pageerror` en flujo validado.
  - [x] Sin HTTP `500` inesperados en backend durante la corrida UX-004 (solo warning de Spring Security no bloqueante en arranque).

### Revalidacion UX-005 Facturacion (2026-05-04)

- [x] Alcance UX-005 aplicado solo en frontend del listado de comprobantes.
- [x] Archivo validado: `frontend/src/app/features/billing/billing-documents-page.component.ts`.
- [x] Ajuste UX aplicado:
  - [x] Se removio `Emitir desde venta` como accion por fila en la tabla de comprobantes.
  - [x] Se mantienen acciones por fila claras: `Ver detalle` y `Ver venta`.
  - [x] Se mantiene emision desde flujo global por `saleId` (campo `Emitir desde venta` + boton `Ir`).
- [x] Validacion funcional en UI (`/facturacion/comprobantes`):
  - [x] Listado carga correctamente con comprobantes existentes.
  - [x] No se muestra `Emitir desde venta` en filas del listado.
  - [x] Navegacion a detalle (`Ver detalle`) operativa.
  - [x] Navegacion a venta asociada (`Ver venta`) operativa.
  - [x] Navegacion al flujo de emision desde accion global (`Ir`) operativa (`/facturacion/emitir/:saleId`).
- [x] Estabilidad en corrida UX-005:
  - [x] Sin `pageerror` durante la validacion.
  - [x] Sin respuestas HTTP `500` inesperadas en backend durante la corrida.

### Revalidacion UX-010 Cotizaciones (2026-05-04)

- [x] Alcance UX-010 aplicado solo en frontend de edicion de cotizaciones.
- [x] Archivo validado: `frontend/src/app/features/quotes/quote-edit-page.component.ts`.
- [x] Ajuste UX aplicado:
  - [x] Se elimino redireccion inmediata en `/cotizaciones/:id/editar` cuando la cotizacion no es editable.
  - [x] Se muestra mensaje persistente de bloqueo con contexto y acciones de salida (`Volver al detalle`, `Ir al listado`, `Crear nueva cotizacion`).
  - [x] Se mantiene bloqueo de guardado para estados no editables (sin llamada de update).
- [x] Casos validados en UI:
  - [x] DRAFT (`#43`): formulario editable visible y boton `Guardar cambios` disponible.
  - [x] SENT (`#32`): sin redireccion, se muestra bloque `Edicion no disponible` y sin formulario de guardado.
  - [x] CANCELLED (`#2`): sin redireccion, mensaje persistente y acciones de salida visibles.
  - [x] CONVERTED (`#1`): sin redireccion, mensaje persistente y acciones de salida visibles.
  - [x] Accion `Volver al detalle` desde estado bloqueado navega correctamente a `/cotizaciones/:id`.
- [x] Evidencia complementaria:
  - [x] Se genero cotizacion DRAFT para prueba editable: `#43` (`Q-1777875060899`).
- [x] Estabilidad en corrida UX-010:
  - [x] Sin `pageerror` durante la validacion.
  - [x] Sin respuestas HTTP `500` inesperadas en backend durante la corrida (solo warning no bloqueante de Spring Security en arranque).

### Revalidacion UX-011 Protocolo anti-cache (2026-05-04)

- [x] Alcance UX-011 aplicado como deuda de proceso QA (sin cambios funcionales de producto).
- [x] Configuracion revisada: `angular.json`, `frontend/Dockerfile`, `frontend/nginx.conf`, `docker-compose.yml`, `frontend/src/environments/environment.ts`.
- [x] Se confirma ausencia de PWA/service worker activo en la version actual.
- [x] Se formaliza protocolo anti-cache y checklist pre-aceptacion UI en este documento.
- [x] Se mantiene recomendacion de mejora de cache-control como deuda post-piloto (sin aplicar cambios de configuracion en esta etapa).

## Bloque E7 Reportes y Outbox/Eventos InkToy (2026-04-30)

- [x] Pantallas aplicadas:
  - [x] `/reportes`
  - [x] `/reportes/ventas`
  - [x] `/reportes/caja`
  - [x] `/reportes/stock-bajo`
  - [x] `/reportes/movimientos-inventario`
  - [x] `/reportes/compras`
  - [x] `/reportes/productos-mas-vendidos`
  - [x] `/reportes/cotizaciones`
  - [x] `/reportes/comprobantes`
  - [x] `/integraciones/eventos`
  - [x] `/integraciones/eventos/:id`
- [x] Build frontend (`npm run build`) exitoso tras cambios visuales E7.
- [x] `docker compose up --build -d` y `docker compose ps` exitosos (`postgres` healthy, `backend` up, `frontend` up).
- [x] Smoke UI E7 en navegador (`http://localhost:4200`) con `admin`:
  - [x] Carga correcta de todas las rutas E7 sin errores de compilacion/runtime.
  - [x] Filtros basicos ejecutados (accion `Filtrar`) en reportes y outbox list sin regresiones funcionales.
  - [x] Detalle de outbox validado en `/integraciones/eventos/4` con metadata, payload y acciones administrativas visibles.
- [x] Matriz RBAC frontend validada para rutas E7:
  - [x] `ADMIN`: acceso permitido a `/reportes` y `/integraciones/eventos`.
  - [x] `SUPERVISOR`: acceso permitido a `/reportes`; bloqueo en `/integraciones/eventos` (redirige a `/dashboard`).
  - [x] `ALMACENERO`: acceso permitido a `/reportes`; bloqueo en `/reportes/ventas` y `/integraciones/eventos` (redirige a `/dashboard`).
  - [x] `CAJERO`: bloqueo en `/reportes` y `/integraciones/eventos` (redirige a `/dashboard`).
- [x] Alcance tecnico preservado en E7: sin cambios en backend, contratos API, guards, interceptor, rutas ni reglas RBAC.

## Validacion final full-stack InkToy (2026-04-30)

- [x] Secuencia tecnica final ejecutada:
  - [x] `npm run build` (frontend) exitoso.
  - [x] `docker compose up --build -d` exitoso.
  - [x] `docker compose ps` con `postgres` healthy y servicios `backend/frontend` en `Up`.
  - [x] `docker compose logs frontend --tail=150` sin errores criticos de Nginx.
  - [x] `docker compose logs backend --tail=150` con arranque Spring Boot/Flyway/JPA correcto.
- [x] Login y layout:
  - [x] `/login` muestra branding InkToy (logo y cabecera).
  - [x] Login `ADMIN` correcto y carga de `/dashboard`.
  - [x] Sidebar visible con menu esperado por rol.
  - [x] Logout funcional.
  - [x] Ruta protegida `/dashboard` redirige a `/login` tras logout.
- [x] Matriz de roles (frontend/rutas) validada:
  - [x] `ADMIN`: login/menu/rutas permitidas OK; acceso a `/integraciones/eventos` y configuracion critica de facturacion.
  - [x] `CAJERO`: login/menu/rutas permitidas OK; bloqueo en `/reportes`, `/integraciones/eventos`, `/facturacion/configuracion`, `/facturacion/series`.
  - [x] `ALMACENERO`: login/menu/rutas permitidas OK; bloqueo en rutas comerciales/administrativas no permitidas (`/pos`, `/caja`, `/ventas`, `/integraciones/eventos`, `/reportes/ventas`).
  - [x] `SUPERVISOR`: login/menu/rutas permitidas OK; bloqueo en `/integraciones/eventos`, `/facturacion/configuracion`, `/facturacion/series` y rutas operativas restringidas de inventario.
- [x] Pantallas principales validadas visualmente (21 rutas) sin regresion de carga ni perdida de informacion operativa.
- [x] Navegacion SPA (refresh directo) validada en:
  - [x] `/dashboard`
  - [x] `/pos`
  - [x] `/inventario/stock`
  - [x] `/compras/ordenes`
  - [x] `/cotizaciones`
  - [x] `/facturacion/comprobantes`
  - [x] `/reportes`
  - [x] `/integraciones/eventos`
  - [x] Resultado: documento HTTP `200`, shell Angular cargada, sin `Cannot GET`.
- [x] Smoke funcional minimo completado:
  - [x] Busqueda de producto en catalogo.
  - [x] Consulta de stock.
  - [x] Consulta de kardex.
  - [x] Listado de compras.
  - [x] Carga de POS, caja, ventas, cotizaciones, comprobantes, reportes.
  - [x] Outbox visible solo para `ADMIN`; bloqueo correcto para `CAJERO`.
- [x] Consistencia visual final:
  - [x] Branding InkToy consistente (logo/paleta).
  - [x] Botones primario/secundario/danger y chips legibles.
  - [x] Tablas/formularios/estados vacios/mensajes con jerarquia clara.
  - [x] Responsive basico aceptable en rutas de control (`/dashboard`, `/pos`, `/reportes`) sin overflow horizontal.
- [x] Consola y red:
  - [x] Sin errores JS inesperados (`console error = 0` en barrido final ADMIN).
  - [x] Sin `pageerror`.
  - [x] Sin HTTP `500` inesperados.
  - [x] Sin CORS.
  - [x] Sin llamadas a `localhost:8080` desde Angular.

## Hotfix UX-001 POS post-venta (2026-04-30)

- [x] Alcance limitado aplicado solo en `frontend/src/app/features/sales/pos-page.component.ts`.
- [x] Build y runtime de verificacion ejecutados:
  - [x] `cd frontend` + `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] Login validado en ambos perfiles operativos solicitados:
  - [x] `admin@erp.local`.
  - [x] `cajero@erp.local`.
- [x] Flujo UX-001 validado en navegador con `ADMIN`:
  - [x] Acceso a `/pos`.
  - [x] Refresco de caja y estado `Caja abierta` confirmado (`#15`).
  - [x] Almacen usado: `S3DST1777141469 - Almacen Destino S3 1777141469`.
  - [x] Producto usado: `Producto QA Sprint3 1777141469 (SKU-S3-1777141469)`.
  - [x] Pago usado: `CASH 12.50`.
  - [x] Venta registrada: `S-1777590981866` (ID `40`).
  - [x] Mensaje de exito visible: `Venta S-1777590981866 registrada correctamente.`.
  - [x] CTA post-venta visible tras limpiar carrito/pagos: `Ver venta #40`.
  - [x] Click en CTA navega a `/ventas/40`.
  - [x] Detalle de venta carga correctamente (resumen, items y pagos visibles).
- [x] Estabilidad de la corrida UX-001:
  - [x] Sin errores `500` inesperados durante el flujo validado.
  - [x] Sin `pageerror` en el flujo de venta->detalle.
  - [x] Sin solicitudes a `fonts.googleapis.com`.
  - [x] Proxy `/api` operativo.

## Hotfix UX-002 Confirmacion previa en POS (2026-04-30)

- [x] Alcance limitado aplicado solo en `frontend/src/app/features/sales/pos-page.component.ts`.
- [x] Build y runtime de verificacion ejecutados:
  - [x] `cd frontend` + `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] Flujo validado en navegador (`http://localhost:4200/login?ngsw-bypass=true`) con `admin@erp.local`:
  - [x] Ruta objetivo: `/pos`.
  - [x] Caja abierta confirmada (`#15`) tras `Refrescar caja`.
  - [x] Almacen de prueba: `S3DST1777141469 - Almacen Destino S3 1777141469`.
  - [x] Producto de prueba: `Producto QA Sprint3 1777141469 (SKU-S3-1777141469)`.
- [x] Confirmacion previa UX-002:
  - [x] Al presionar `Finalizar venta` se abre modal nativo `confirm`.
  - [x] El texto de confirmacion muestra al menos: `Cantidad de items`, `Total`, `Monto pagado`, `Vuelto`.
- [x] Escenario cancelar confirmacion:
  - [x] Se cancela el dialogo (`Cancel`).
  - [x] No se crea venta en backend (sin mensaje de exito ni ID nueva de venta).
  - [x] Stock se mantiene sin cambios tras cancelar (visible en resultados POS: `1` antes y `1` despues de cancelar).
- [x] Escenario confirmar venta:
  - [x] Se acepta el dialogo (`OK`).
  - [x] Venta creada correctamente: `S-1777592459816` (ID `41`).
  - [x] Se mantiene flujo original: mensaje de exito y CTA `Ver venta #41`.
  - [x] Navegacion a `/ventas/41` valida y detalle cargado correctamente.
  - [x] Stock cambia tras confirmar (resultado POS: `1` -> `0`).
- [x] Consola/runtime durante UX-002:
  - [x] Sin `pageerror`.
  - [x] Sin HTTP `500` inesperados.

## Correccion UX FE-007 inventario (2026-04-30)

- [x] Revision tecnica completada en:
  - [x] `frontend/src/app/features/inventory/initial-stock-page.component.ts`
  - [x] `frontend/src/app/features/inventory/adjustments-page.component.ts`
  - [x] `frontend/src/app/features/inventory/transfers-page.component.ts`
  - [x] `frontend/src/app/features/catalog/data/product.service.ts`
  - [x] `frontend/src/app/features/catalog/data/catalog.models.ts`
  - [x] `frontend/src/app/features/inventory/data/inventory.models.ts`
- [x] Causa identificada: selectores operativos consumian listado general de productos (`productService.list`) y mostraban items inactivos.
- [x] Correccion UX minima aplicada sin cambios de backend/endpoints/reglas:
  - [x] Filtro frontend `active === true` en carga de lookups de las 3 pantallas objetivo.
  - [x] Filtro adicional en render de opciones para asegurar visualizacion exclusiva de productos activos.
  - [x] Mensaje UX claro mantenido si backend devuelve `422 Product is inactive` por condicion residual.
  - [x] Sin cambios de payloads ni validaciones de backend.
- [x] Comandos tecnicos ejecutados:
  - [x] `cd frontend`
  - [x] `npm run build`
  - [x] `cd ..`
  - [x] `docker compose up --build -d`
  - [x] `docker compose ps`
- [x] Validacion manual (browser QA):
  - [x] `/inventario/stock-inicial` muestra placeholder `Selecciona un producto activo` y solo productos activos.
  - [x] `/inventario/ajustes` muestra placeholder `Selecciona un producto activo` y solo productos activos.
  - [x] `/inventario/transferencias` muestra placeholder `Selecciona un producto activo` y solo productos activos.
  - [x] Productos inactivos conocidos (`Producto E1 504590 Editado`, `Producto Cierre B Editado`, `Producto Sprint2 B`) no aparecen en selectores operativos.
  - [x] Registro ajuste positivo valido con producto activo: OK.
  - [x] Registro ajuste negativo valido con producto activo: OK.
  - [x] Registro transferencia valida con producto activo: OK.
  - [x] Sin errores de consola inesperados, sin `pageerror` y sin `500` durante corrida final FE-007.
- [x] Nota operativa QA: se uso `?ngsw-bypass=true` como bypass preventivo de cache en auditoria browser; en la configuracion actual no hay service worker activo.

## Hotfix UX-003 Confirmacion en Cotizaciones (2026-04-30)

- [x] Alcance limitado aplicado solo en:
  - [x] `frontend/src/app/features/quotes/quotes-page.component.ts`
  - [x] `frontend/src/app/features/quotes/quote-detail-page.component.ts`
  - [x] `frontend/src/app/features/quotes/quote-convert-page.component.ts`
- [x] Build y runtime de verificacion ejecutados:
  - [x] `cd frontend` + `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] Confirmaciones criticas UX-003 validadas en navegador (`admin@erp.local`):
  - [x] Listado `/cotizaciones`: `Enviar` muestra confirmacion previa.
  - [x] Listado `/cotizaciones`: `Cancelar` muestra confirmacion previa.
  - [x] Conversion `/cotizaciones/:id/convertir`: `Convertir a venta` muestra confirmacion previa con numero de cotizacion, total cotizacion, total pagado y advertencia de impacto en caja/stock.
- [x] Escenarios cancelados (no ejecucion de accion):
  - [x] Cotizacion `#13`: cancelar confirmacion de `Enviar` mantiene estado sin cambio (sin mutacion en backend).
  - [x] Cotizacion `#13`: cancelar confirmacion de `Convertir a venta` no genera venta ni muestra resultado de conversion.
- [x] Escenarios confirmados (flujo original preservado):
  - [x] Cotizacion `#13`: confirmar `Enviar` cambia estado `DRAFT -> SENT`.
  - [x] Cotizacion `#6`: confirmar `Cancelar` cambia estado a `CANCELLED` y registra historial de estado.
  - [x] Cotizacion `#13`: confirmar `Convertir a venta` con almacen `S3DST1777141364 - Almacen Destino S3 1777141364` y pago `25.5` genera venta `#42`.
  - [x] Detalle `/cotizaciones/13` muestra estado `CONVERTED`, historial `SENT -> CONVERTED` y link `Ver venta`.
  - [x] Listado `/cotizaciones` muestra la cotizacion `Q-1777180203427` en estado `CONVERTED`.
- [x] Validacion de doble conversion (conflicto esperado):
  - [x] `POST /api/v1/quotes/13/convert-to-sale` tras conversion exitosa devuelve `409 Conflict` con mensaje `Quote already converted`.
- [x] Consola/runtime durante UX-003:
  - [x] Sin `pageerror`.
  - [x] Sin HTTP `500` inesperados en los flujos validados.
  - [x] Solo `409` esperados y controlados en pruebas de conflicto de conversion.

## Smoke corto por roles UX-003 (2026-04-30)

- [x] Build/runtime previo del smoke por roles ejecutado:
  - [x] `cd frontend`.
  - [x] `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] `ADMIN`:
  - [x] Acceso a `/cotizaciones` y `/cotizaciones/nueva`.
  - [x] Confirmacion `Enviar` visible y flujo aceptado (`#10`: `DRAFT -> SENT`).
  - [x] Confirmacion `Cancelar` visible y cancelada; sin mutacion (`#10` permanece `SENT`, historial sin cambios).
  - [x] Confirmacion `Convertir` visible y cancelada; sin mutacion (`#10` mantiene `convertedSaleId` null).
- [x] `CAJERO`:
  - [x] Acceso a `/cotizaciones` y `/cotizaciones/nueva`.
  - [x] Confirmacion `Enviar` visible y flujo aceptado (`#3`: `DRAFT -> SENT`, historial registra `changedBy=cajero`).
  - [x] Confirmacion `Cancelar` visible y cancelada; sin mutacion (`#3` permanece `SENT`, historial sin cambios).
  - [ ] Convertir con `CAJERO` presenta bloqueo funcional en `/cotizaciones/3/convertir`.
    - Evidencia: `GET /api/v1/warehouses?active=true` => `403 Forbidden` para `CAJERO`.
    - Impacto: la pantalla de conversion queda sin contenido operativo (no se alcanza confirmacion de `Convertir`).
- [x] `SUPERVISOR`:
  - [x] Acceso a `/cotizaciones` y `/cotizaciones/nueva`.
  - [x] Confirmacion `Enviar` visible y flujo aceptado (`#7`: `DRAFT -> SENT`, historial registra `changedBy=supervisor`).
  - [x] Confirmacion `Cancelar` visible y cancelada; sin mutacion (`#7` permanece `SENT`).
  - [x] Confirmacion `Convertir` visible y cancelada; sin mutacion (`#7` mantiene `convertedSaleId` null).
- [x] `ALMACENERO`:
  - [x] No visualiza `Cotizaciones` en menu lateral.
  - [x] Navegacion directa a `/cotizaciones` redirige a `/dashboard`.
  - [x] Navegacion directa a `/cotizaciones/nueva` redirige a `/dashboard`.
- [x] Estabilidad general del smoke por roles:
  - [x] Sin `pageerror`.
  - [x] Sin respuestas HTTP `500` inesperadas.
  - [x] Se observo `403` en flujo de conversion de `CAJERO` (hallazgo de permisos), no asociado a UX-003 de confirmaciones.

## Revalidacion UX-003 post-fix permisos de almacenes para CAJERO (2026-04-30)

- [x] Build/runtime previo de revalidacion ejecutado:
  - [x] `cd frontend`.
  - [x] `npm run build` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => `postgres` healthy, `backend` up, `frontend` up.
- [x] Caso controlado de `CAJERO` preparado y validado:
  - [x] Cotizacion propia creada por API: `#41` (`Q-1777598147957`) en estado `DRAFT`.
  - [x] Stock confirmado para conversion (producto `#13`, almacen `#8` `S3DST1777141364 - Almacen Destino S3 1777141364`, cantidad `18`).
- [x] Confirmaciones UX-003 en `CAJERO` (UI + API) validadas en ambos caminos:
  - [x] `Enviar` cancelado: sin mutacion (`STATUS=DRAFT`, `HISTORY_COUNT=0`).
  - [x] `Enviar` confirmado: ejecuta flujo (`STATUS=SENT`, historial `DRAFT -> SENT`, `changedBy=cajero`).
  - [x] `Cancelar` visible en detalle y cancelado (sin mutacion).
  - [x] `Convertir` cancelado: sin mutacion (`STATUS=SENT`, `convertedSaleId` null).
  - [x] `Convertir` confirmado: conversion exitosa con venta `#43`; UI muestra `Cotizacion convertida correctamente` y `Ver venta #43`.
- [x] Fix backend de permisos de almacenes para `CAJERO` revalidado:
  - [x] `GET /api/v1/warehouses?active=true` => `200` (11 almacenes visibles).
  - [x] `POST /api/v1/warehouses` => `403` (mutacion bloqueada).
  - [x] `DELETE /api/v1/warehouses/8` => `403` (mutacion bloqueada).
- [x] Revalidacion de restricciones por rol (sin regresion):
  - [x] `ALMACENERO` no visualiza `Cotizaciones` en menu y navegacion directa a `/cotizaciones` redirige a `/dashboard`.
  - [x] `ALMACENERO` en API quotes (`GET /api/v1/quotes`) => `403`.
  - [x] `SUPERVISOR` mantiene acceso a `/cotizaciones` y confirmacion de `Cancelar` visible.
  - [x] `ADMIN` mantiene acceso a `/cotizaciones` y confirmacion de `Cancelar` visible.
- [x] Cierre de incidencia backend de doble conversion (revalidacion final 2026-04-30):
  - [x] Caso final validado con `CAJERO`: cotizacion `#42` (`Q-1777611293014`) convertida a venta `#44`.
  - [x] Segundo intento oficial `POST /api/v1/quotes/42/convert-to-sale` => `409 Conflict` con mensaje `Quote already converted`.
  - [x] Confirmado que no se reproduce `500` en el flujo oficial de conversion.
- [x] Revalidacion final de roles y confirmaciones UX-003:
  - [x] `CAJERO`: confirmacion de `Enviar` operativa; confirmacion de `Convertir` validada en cancelar (sin mutacion) y aceptar (conversion exitosa).
  - [x] `SUPERVISOR`: confirmacion de `Cancelar` visible y cancelada sin mutacion.
  - [x] `ADMIN`: confirmacion de `Cancelar` visible y cancelada sin mutacion.
  - [x] `ALMACENERO`: bloqueo mantenido en UI (`/cotizaciones` redirige a `/dashboard`) y API quotes (`403`).
- [x] Estabilidad de la corrida final:
  - [x] Sin `pageerror`.
  - [x] Sin errores de consola inesperados en los flujos UI validados.
  - [x] Sin respuestas `500` en el flujo oficial validado de UX-003.

## Bloque BT-004 Hardening de usuarios seed Flyway (2026-05-04)

- [x] Auditadas migraciones de seguridad: `V2__seed_initial_admin.sql`, `V7__seed_dev_users_non_admin.sql`.
- [x] Confirmado riesgo de credenciales seed conocidas en entornos no locales.
- [x] Nueva migracion de control agregada: `V15__security_seed_users_hardening.sql`.
- [x] Placeholders Flyway configurados en `backend/src/main/resources/application.yaml`.
- [x] Variables de entorno documentadas en `.env.example`.
- [x] `docker-compose.yml` actualizado para exponer flags de hardening.
- [x] `README.md` actualizado con politica BT-004 por entorno.
- [x] Validacion build backend:
  - [x] `mvn clean test`.
  - [x] `mvn clean verify`.
- [x] Validacion compose:
  - [x] `docker compose config`.
  - [x] `docker compose up --build -d`.
  - [x] `docker compose ps` con `backend/frontend` arriba y `postgres` healthy.
- [x] Flyway runtime (DB local en Docker):
  - [x] `V15` aplicada con `success=true`.
  - [x] `V2` y `V7` se mantienen aplicadas (`success=true`).
  - [x] Sin ruptura de checksums historicos (validacion Flyway en logs OK).
- [x] Modo local por defecto:
  - [x] `HARDEN_DEFAULT_SEED_USERS=false` efectivo en `docker compose config`.
  - [x] `HARDEN_DEFAULT_SEED_USERS_INCLUDE_ADMIN=false` efectivo en `docker compose config`.
  - [x] Usuarios seed activos en DB local (`admin`, `cajero`, `almacenero`, `supervisor` con `active=true`).
- [x] Login y token por rol:
  - [x] `admin@erp.local` => login `200`, token valido, `/auth/me` `200`, rol `ADMIN`.
  - [x] `cajero@erp.local` => login `200`, token valido, `/auth/me` `200`, rol `CAJERO`.
  - [x] `almacenero@erp.local` => login `200`, token valido, `/auth/me` `200`, rol `ALMACENERO`.
  - [x] `supervisor@erp.local` => login `200`, token valido, `/auth/me` `200`, rol `SUPERVISOR`.
- [x] RBAC rapido (sin regresion):
  - [x] `CAJERO` accede a POS/Caja/Cotizaciones (`200` en endpoints representativos).
  - [x] `ALMACENERO` bloqueado en Cotizaciones (`GET /api/v1/quotes => 403`).
  - [x] `ADMIN` mantiene acceso amplio (`quotes`, `cash-registers/current`, `billing/series` => `200`).
  - [x] `SUPERVISOR` mantiene acceso esperado (`quotes`, `cash-registers/current`, POS search => `200`).
- [x] Script externo hardening:
  - [x] `docs/deployment/HARDEN_SEED_USERS.sql` fuera de `db/migration`.
  - [x] Confirmado que no se ejecuta automaticamente por Flyway local.
  - [x] Uso documentado en `README.md`.
- [x] Logs backend (`docker compose logs backend --tail=200`):
  - [x] Sin errores Flyway.
  - [x] Sin errores de login/JWT.
  - [x] Sin `500` inesperados.

## Bloque BT-008 CORS configurable por entorno (2026-05-04)

- [x] Revision de configuracion actualizada en:
  - [x] `backend/src/main/java/com/erppos/backend/erp/security/adapter/security/SecurityConfig.java`
  - [x] `backend/src/main/resources/application.yaml`
  - [x] `docker-compose.yml`
  - [x] `.env.example`
  - [x] `README.md`
- [x] Variable nueva documentada: `CORS_ALLOWED_ORIGINS`.
- [x] Default local confirmado en configuracion: `http://localhost:4200,http://127.0.0.1:4200`.
- [x] Metodos CORS permitidos confirmados: `GET, POST, PUT, DELETE, OPTIONS`.
- [x] Headers CORS permitidos confirmados: `Authorization, Content-Type, Accept, Origin, X-Trace-Id`.
- [x] `allowCredentials=false` confirmado (JWT por header).
- [x] Validacion build backend:
  - [x] `mvn clean test`.
  - [x] `mvn clean verify`.
- [x] Validacion compose:
  - [x] `docker compose config`.
  - [x] `docker compose up --build -d`.
  - [x] `docker compose ps`.
- [x] Validacion CORS runtime:
  - [x] Preflight `OPTIONS /api/v1/auth/login` con origen permitido `http://localhost:4200`.
  - [x] Preflight `OPTIONS /api/v1/auth/login` con origen permitido `http://127.0.0.1:4200`.
  - [x] Origen no permitido no recibe `Access-Control-Allow-Origin`.
  - [x] Sin `500` inesperados en backend durante pruebas.

## Bloque BT-009 Suite minima de integracion backend (2026-05-04)

- [x] Infraestructura de test revisada (`pom.xml`, pruebas existentes, MockMvc, SpringBootTest, Testcontainers).
- [x] Estrategia menor riesgo aplicada: `@SpringBootTest` + `MockMvc` + PostgreSQL Testcontainers + Flyway real.
- [x] Nueva base comun de pruebas creada: `backend/src/test/java/com/erppos/backend/integration/AbstractHttpIntegrationTest.java`.
- [x] Nueva suite de integracion creada:
  - [x] `backend/src/test/java/com/erppos/backend/integration/AuthRbacCorsIntegrationTest.java`.
  - [x] `backend/src/test/java/com/erppos/backend/integration/BtRulesIntegrationTest.java`.
- [x] Cobertura health/auth:
  - [x] `GET /api/v1/health` => `200`.
  - [x] `GET /api/v1/health/db` => `200`.
  - [x] `POST /api/v1/auth/login` (admin valido) => `200` + token.
  - [x] `GET /api/v1/auth/me` sin token => `401`.
  - [x] `GET /api/v1/auth/me` con token => `200` + rol correcto.
- [x] Cobertura RBAC (403 reales):
  - [x] `CAJERO` no accede a `/api/v1/integrations/outbox-events` => `403`.
  - [x] `SUPERVISOR` no accede a `/api/v1/integrations/outbox-events` => `403`.
  - [x] `ALMACENERO` no accede a `/api/v1/quotes` => `403`.
  - [x] `ADMIN` accede a endpoint permitido (`/api/v1/integrations/outbox-events`) => `200`.
- [x] Cobertura BT-001 caja:
  - [x] Primera apertura => `201`.
  - [x] Segunda apertura mismo usuario => `409`.
  - [x] Cierre => `200`.
  - [x] Reapertura tras cierre => `201`.
- [x] Cobertura BT-003 inventario:
  - [x] Primer stock inicial (producto/almacen controlados) => `201`.
  - [x] Segundo stock inicial misma combinacion => `422`.
  - [x] Sin `500`; kardex con un solo `INITIAL_STOCK`.
- [x] Cobertura BT-002 cotizaciones:
  - [x] Cotizacion de prueba creada y convertida una vez => `200`.
  - [x] Segundo intento de conversion => `409`.
  - [x] Sin `500`.
- [x] Cobertura CORS BT-008:
  - [x] Preflight permitido para `http://localhost:4200`.
  - [x] Preflight permitido para `http://127.0.0.1:4200`.
  - [x] Origen no permitido bloqueado/sin `Access-Control-Allow-Origin` permitido.
- [x] Comandos ejecutados:
  - [x] `mvn clean test` => SUCCESS.
  - [x] `mvn clean verify` => SUCCESS.
  - [x] `docker compose config` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => OK.

## Bloque BT-007 Hardening minimo de reportes (2026-05-05)

- [x] Alcance backend-only aplicado (sin cambios en frontend).
- [x] Politica de fechas segura implementada en reportes con `from/to`:
  - [x] default ultimos 30 dias si faltan ambas fechas.
  - [x] completado seguro cuando falta solo `from` o `to`.
  - [x] validacion `to >= from` mantenida.
  - [x] rango maximo 90 dias con respuesta `422`.
- [x] Limites implementados:
  - [x] `/api/v1/reports/low-stock`: `limit` opcional, default `200`, max `1000`.
  - [x] `/api/v1/reports/inventory-movements`: `limit` opcional, default `500`, max `2000`.
  - [x] `/api/v1/reports/top-products`: se mantiene `limit` `1..100`.
- [x] SQL endurecido:
  - [x] eliminados defaults de rango historico amplio (`1970..9999`) en reportes.
  - [x] agregado `LIMIT` en `low-stock` e `inventory-movements`.
- [x] Pruebas agregadas/actualizadas:
  - [x] `backend/src/test/java/com/erppos/backend/erp/reports/ReportsApplicationServiceTest.java`.
  - [x] `backend/src/test/java/com/erppos/backend/integration/ReportsHardeningIntegrationTest.java`.
- [x] Validacion build backend:
  - [x] `mvn clean test` => SUCCESS (`145` tests, `0` fail/error).
  - [x] `mvn clean verify` => SUCCESS (`145` tests, `0` fail/error).
- [x] Validacion Docker/runtime:
  - [x] `docker compose config` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => OK.
  - [x] `GET /api/v1/reports/sales` sin fechas => `200`.
  - [x] `GET /api/v1/reports/inventory-movements` sin fechas => `200`.
  - [x] `GET /api/v1/reports/low-stock` sin `limit` => `200`.
  - [x] Rango excesivo en reportes => `422`.
  - [x] `limit` fuera de maximo en reportes de lista => `422`.
- [x] Logs backend revisados sin `500` inesperados durante la validacion BT-007.

## Bloque BT-006 Fase 1 Contrato paginado estable v2 (2026-05-05)

- [x] Alcance backend-only ejecutado (sin cambios en frontend).
- [x] Nuevo DTO compartido agregado:
  - [x] `backend/src/main/java/com/erppos/backend/erp/shared/adapter/dto/PageResponse.java`.
  - [x] `backend/src/main/java/com/erppos/backend/erp/shared/adapter/dto/PageResponseMapper.java`.
- [x] Endpoints v2 agregados:
  - [x] `GET /api/v2/products`.
  - [x] `GET /api/v2/inventory/stocks`.
- [x] Compatibilidad v1 preservada:
  - [x] `GET /api/v1/products` mantiene `content`.
  - [x] `GET /api/v1/inventory/stocks` mantiene `content`.
- [x] Pruebas agregadas:
  - [x] `backend/src/test/java/com/erppos/backend/erp/shared/PageResponseMapperTest.java`.
  - [x] `backend/src/test/java/com/erppos/backend/integration/PaginationContractIntegrationTest.java`.
- [x] Validacion de contrato JSON:
  - [x] v2 expone `items`, `page`, `size`, `totalItems`, `totalPages`.
  - [x] v2 no expone `content`.
  - [x] v1 sigue exponiendo `content`.
- [x] Comandos ejecutados:
  - [x] `mvn clean test` => SUCCESS (135 tests, 0 fail/error).
  - [x] `mvn clean verify` => SUCCESS (135 tests, 0 fail/error).
  - [x] `docker compose config` => OK.
  - [x] `docker compose up --build -d` => OK.
  - [x] `docker compose ps` => OK.
- [x] Logs backend revisados sin `500` inesperados en ventana de validacion BT-006 F1.

## Fase 2G.1 - Admin Create Online Profile MVP (2026-06-04)

- [x] Alcance backend/frontend acotado:
  - [x] `POST /api/v1/ecommerce-admin/products/{productId}/online-profile` agregado como endpoint ADMIN.
  - [x] `ProductsPageComponent` agrega CTA ADMIN para crear perfil online `DRAFT` desde producto ERP/POS.
  - [x] Sin cambios en Storefront, Flyway, `products`, checkout, carrito, pagos u ordenes online.
- [x] Pruebas backend agregadas en `EcommerceAdminProfilesIntegrationTest`:
  - [x] Crear perfil de producto existente retorna `201` y `DRAFT`.
  - [x] `GET` posterior retorna el perfil creado.
  - [x] Duplicado retorna `409`.
  - [x] Producto inexistente retorna `404`.
  - [x] SUPERVISOR no puede crear (`403`).
- [x] Validacion ejecutada:
  - [x] `mvn -Dtest=EcommerceAdminProfilesIntegrationTest test` => SUCCESS (11 tests, 0 fail/error).
  - [x] `mvn test` => SUCCESS (352 tests, 0 fail/error).
  - [x] `npm run build` => SUCCESS.
  - [x] `git status --short --untracked-files=all` revisado.
  - [x] `git status --short -- . ":(exclude)backend/**" ":(exclude)frontend/**"` revisado; solo docs QA intencionales tras actualizar matrices.
  - [x] `git diff --check` sin errores de whitespace.
