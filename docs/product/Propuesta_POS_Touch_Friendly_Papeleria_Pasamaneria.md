**Propuesta de implementación del módulo POS touch-friendly**

Papelería, artículos escolares y pasamanería

*Documento de contexto para integrar al proyecto ERP/POS avanzado*

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Resumen ejecutivo</strong></p>
<p>El POS recomendado debe ser touch-friendly: botones grandes, letras
claras, pocas opciones visibles y flujo de venta guiado.</p>
<p>El método principal debe ser una barra grande de búsqueda/escaneo: el
cajero escribe o escanea desde un solo lugar.</p>
<p>La IA con OpenAI debe actuar como asistente de búsqueda, no como
fuente de verdad.</p>
<p>Los precios, stock, descuentos y productos reales deben salir siempre
del backend y PostgreSQL.</p>
<p>El POS debe seguir funcionando aunque la IA falle o no haya
internet.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 1. Diseño general recomendado del POS

Para una tienda física de papelería, artículos escolares y pasamanería
con más de 5000 productos, el POS no debe obligar al cajero a navegar
por todo el catálogo. Debe comportarse como una caja registradora
moderna y touch-friendly.

Método principal:  
- Una barra grande para escanear o escribir el producto.  
  
Métodos de respaldo:  
- Escáner de código de barras.  
- Botones rápidos para productos frecuentes.  
- Categorías visuales.  
- SKU interno.  
- Etiquetas internas en estantes.  
- IA para búsquedas difíciles o ambiguas.

La barra principal debe aceptar código de barras, SKU interno, nombre
del producto, alias, sinónimos y frases naturales como "2 metros de
cinta roja".

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Decisión clave</strong></p>
<p>El buscador por teclado debe ser el método principal de venta.</p>
<p>El escáner es el método más rápido para productos con código de
barras.</p>
<p>Los botones rápidos son apoyo para productos de alta rotación.</p>
<p>La IA debe trabajar detrás del buscador, solo cuando ayude a
interpretar una búsqueda difícil.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. Interfaz para usuarios con poca facilidad usando PC

El diseño debe reducir la carga mental del cajero. La persona no debe
ver módulos administrativos ni opciones técnicas durante la venta. El
POS debe ser visual, táctil y guiado.

## Elementos visibles en caja

- Buscador grande.

- Resultados de productos.

- Carrito visible.

- Total grande.

- Botón COBRAR muy destacado.

- Botones rápidos.

- Cancelar venta.

- Cambiar cantidad.

## Elementos que deben ocultarse al cajero

- Kardex.

- Reportes.

- Configuración.

- Usuarios.

- Ajustes de inventario.

- Costos y proveedores.

- Series de comprobantes.

- Configuración de IA.

Pantalla POS touch-friendly propuesta:

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr class="header">
<th colspan="2"><strong>VENDER - Cajero: Ana</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td colspan="2">¿Qué desea vender? [ Escanear o escribir producto...
]<br />
Ejemplo: cartulina roja, satinada 1cm, copia color</td>
</tr>
<tr class="even">
<td><strong>RESULTADOS</strong></td>
<td><strong>CARRITO</strong></td>
</tr>
<tr class="odd">
<td>[Cartulina roja] S/ 1.00 unidad [Agregar]<br />
[Papelógrafo blanco] S/ 0.80 unidad [Agregar]<br />
[Cinta satinada roja 1 cm] S/ 2.00 metro [Agregar]</td>
<td>Cartulina roja x3 S/ 3.00<br />
Papelógrafo blanco x2 S/ 1.60<br />
<br />
TOTAL: S/ 4.60</td>
</tr>
<tr class="even">
<td colspan="2">ACCESOS RÁPIDOS: [Cartulina] [Papelógrafo] [Copia B/N]
[Impresión] [Cinta]</td>
</tr>
<tr class="odd">
<td colspan="2"><strong>[Cancelar] [Cambiar cantidad] [Guardar]
[COBRAR]</strong></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Reglas UX touch-friendly</strong></p>
<p>Usar botones grandes, idealmente pensados para pantalla táctil.</p>
<p>Mostrar máximo 6 a 8 accesos rápidos principales en la vista
inicial.</p>
<p>Evitar palabras técnicas como kardex, SKU, variante o integración en
la pantalla del cajero.</p>
<p>El botón COBRAR debe ser el más visible.</p>
<p>Toda acción ambigua debe pedir confirmación antes de agregar al
carrito.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 3. Venta de productos sin código de barras

Los productos sin código no deben ser tratados como excepción. En
papelerías y pasamanerías es normal vender productos sueltos, por metro
o servicios. La solución es usar SKU interno, unidades de venta, alias y
etiquetas internas.

| **Tipo de producto** | **Unidad sugerida** | **Método rápido**                  | **Ejemplo**              |
|----------------------|---------------------|------------------------------------|--------------------------|
| Papelógrafos         | Unidad              | Botón rápido / etiqueta de estante | Papelógrafo blanco       |
| Cartulinas           | Unidad              | Buscar por color / botón rápido    | Cartulina escolar roja   |
| Goma eva             | Unidad              | Buscar por color/tipo              | Goma eva azul escarchada |
| Cintas               | Metro               | Buscar por tipo, color y ancho     | Cinta satinada roja 1 cm |
| Encajes              | Metro               | Buscar por material/color/ancho    | Encaje blanco 2 cm       |
| Elásticos            | Metro               | Buscar por ancho/color             | Elástico blanco 1 cm     |
| Cordones             | Metro               | Buscar por color/material          | Cordón negro             |
| Copias/impresiones   | Servicio o unidad   | Botón rápido                       | Copia B/N x10            |

## SKU interno y etiquetas internas

Todo producto debe tener un SKU interno, aunque no tenga código de
barras del fabricante. Para productos sueltos, se puede colocar una
etiqueta con código interno en el estante, cajón o rollo, sin pegar una
etiqueta a cada unidad.

Ejemplo:  
SKU: PAP-PAPELOG-BLA  
Producto: Papelógrafo blanco  
Unidad: Unidad  
Precio: S/ 0.80  
Código de barras: opcional  
  
Etiqueta interna en estante:  
\[PAP-PAPELOG-BLA\] Papelógrafo blanco - S/ 0.80

# 4. Caso específico de pasamanería

Pasamanería requiere especial cuidado porque existen muchos tipos,
colores, anchos y materiales. El sistema debe permitir encontrar rápido
productos como cinta satinada roja 1 cm sin navegar por demasiadas
pantallas.

Producto ejemplo:  
Producto base: Cinta satinada  
Variante: Roja 1 cm  
Unidad de venta: Metro  
SKU: PAS-CIN-SAT-ROJ-1CM  
Precio: S/ 2.00 por metro

## Opción A: búsqueda guiada por categoría

Pasamanería -\> Cintas -\> Cinta satinada -\> Color rojo -\> Ancho 1 cm
-\> Metros -\> Agregar

Ventaja: es visual y fácil para usuarios nuevos. Desventaja: puede ser
lenta si se usa siempre en caja.

## Opción B: búsqueda directa por teclado con ayuda de IA

El cajero escribe:  
- satinada roja 1cm  
- cinta roja brillante  
- listón rojo delgado  
- satin rojaa  
  
El sistema sugiere:  
- Cinta satinada roja 1 cm  
- Cinta satinada roja 0.5 cm  
- Cinta organza roja 1 cm

Para una persona con poca facilidad usando PC, la mejor combinación es:
búsqueda directa por teclado como camino principal y búsqueda guiada
como respaldo visual. Escribir "satinada roja" suele ser más rápido que
navegar por muchas categorías.

# 5. Buscador inteligente con IA

El buscador debe permitir lenguaje natural, errores ortográficos y
sinónimos. La IA no debe vender sola. Solo debe interpretar lo que el
usuario quiso decir y devolver criterios de búsqueda para que el backend
consulte productos reales.

Entrada del cajero:  
"listón rojo delgado"  
  
Interpretación esperada:  
Tipo probable: cinta  
Material probable: satinada  
Color: rojo  
Ancho probable: 0.5 cm o 1 cm  
Unidad: metro  
  
Resultado mostrado:  
1. Cinta satinada roja 0.5 cm  
2. Cinta satinada roja 1 cm  
3. Cinta organza roja 1 cm

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Reglas obligatorias para IA en POS</strong></p>
<p>La IA no inventa productos.</p>
<p>La IA no define precios.</p>
<p>La IA no modifica stock.</p>
<p>La IA no aplica descuentos automáticamente.</p>
<p>La IA no agrega productos ambiguos sin confirmación del cajero.</p>
<p>Los datos reales salen siempre de PostgreSQL mediante Spring
Boot.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 6. Arquitectura técnica recomendada

Con Angular, Spring Boot y PostgreSQL, la integración con OpenAI debe
hacerse desde el backend. El frontend nunca debe llamar directamente a
OpenAI.

Flujo recomendado:  
  
Angular POS  
-\>  
Spring Boot Backend  
-\>  
Servicio de búsqueda  
-\>  
PostgreSQL  
-\>  
Si hay ambigüedad:  
Servicio IA  
-\>  
OpenAI API  
-\>  
Respuesta estructurada  
-\>  
Validación contra PostgreSQL  
-\>  
Resultados en POS

## Por qué el frontend no debe llamar a OpenAI

- Expondría la API key.

- No habría buen control de costos.

- Sería más difícil auditar búsquedas.

- No se aplicarían correctamente reglas de negocio.

- No se controlarían permisos del cajero.

- Sería más difícil validar que los productos existan en PostgreSQL.

## Control de errores, latencia, costos e internet

Si OpenAI falla:  
- Mostrar búsqueda normal.  
- Usar SKU, código de barras, nombre, alias y botones rápidos.  
- No bloquear la venta.  
  
Para reducir latencia y costos:  
- No llamar a IA en cada tecla.  
- Buscar primero en PostgreSQL.  
- Usar IA solo si hay ambigüedad.  
- Cachear búsquedas frecuentes.  
- Registrar consumo diario/mensual.

# 7. Estrategia correcta para usar IA

La IA debe ser la última capa de búsqueda, no la primera. Primero el
sistema debe usar su propia base de datos.

Estrategia de búsqueda en capas:  
1. Código de barras exacto.  
2. SKU interno exacto.  
3. Nombre exacto.  
4. Alias.  
5. Coincidencia parcial.  
6. Búsqueda aproximada.  
7. Sinónimos locales.  
8. IA solo si hay ambigüedad.  
9. Confirmación del cajero.

Usar IA cuando el texto sea ambiguo o coloquial: "cinta roja brillante",
"listón rojo delgado", "satin rojaa", "papel grande blanco". No usar IA
si hay código de barras, SKU exacto, coincidencia exacta o botón rápido.

# 8. Diseño de base de datos recomendado

Para manejar más de 5000 productos, se recomienda separar producto base,
variantes, códigos, alias, categorías y unidades de venta.

Entidades sugeridas:  
  
CATEGORIA  
- id_categoria  
- nombre  
- categoria_padre_id  
  
PRODUCTO  
- id_producto  
- nombre  
- descripcion  
- id_categoria  
- tipo_producto  
- activo  
  
VARIANTE_PRODUCTO  
- id_variante  
- id_producto  
- sku  
- nombre_comercial  
- color  
- ancho  
- tamaño  
- material  
- marca  
- unidad_venta_id  
- precio_venta  
- controla_stock  
- stock_actual  
- activo  
  
CODIGO_BARRAS  
- id_codigo  
- id_variante  
- codigo  
- tipo_codigo  
- activo  
  
ALIAS_PRODUCTO  
- id_alias  
- id_producto  
- id_variante opcional  
- alias  
  
UNIDAD_VENTA  
- id_unidad  
- nombre  
- abreviatura  
- permite_decimal

Ejemplos:  
  
Cartulina escolar roja  
SKU: PAP-CART-ROJ  
Unidad: Unidad  
Precio: S/ 1.00  
Alias: cart roja, cartulina roja  
  
Papelógrafo blanco  
SKU: PAP-PAPELOG-BLA  
Unidad: Unidad  
Precio: S/ 0.80  
Alias: papelografo, papelote blanco  
  
Cinta satinada roja 1 cm  
SKU: PAS-CIN-SAT-ROJ-1CM  
Unidad: Metro  
Precio: S/ 2.00 por metro  
Alias: satinada roja, cinta roja brillante, listón rojo delgado

# 9. Flujo completo de venta

## A. Producto con código de barras

1\. Cajero escanea.  
2. POS encuentra producto.  
3. Se agrega al carrito.  
4. Cajero cobra.

## B. Producto sin código usando botón rápido

1\. Cajero toca \[Papelógrafo\].  
2. Selecciona variante si aplica.  
3. Indica cantidad.  
4. Agrega y cobra.

## C. Producto sin código usando búsqueda con IA

1\. Cajero escribe "cart roja".  
2. Sistema busca en PostgreSQL.  
3. IA ayuda si hay ambigüedad.  
4. Cajero confirma.  
5. Se agrega al carrito.

## D. Producto por metro

1\. Cajero escribe "satinada roja 1cm".  
2. POS muestra cinta satinada roja 1 cm.  
3. Cajero ingresa metros.  
4. Sistema calcula total.  
5. Cajero confirma.

## E. Servicio como copia o impresión

1\. Cajero toca \[Copia B/N\] o escribe "copia".  
2. Ingresa cantidad.  
3. Se agrega al carrito.  
4. Cobra.

# 10. Recomendación final y MVP

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Diseño recomendado para el proyecto</strong></p>
<p>POS touch-friendly con barra grande de búsqueda/escaneo como método
principal.</p>
<p>Escáner para productos con código de barras.</p>
<p>Botones rápidos para productos frecuentes sin código.</p>
<p>SKU interno obligatorio para todos los productos.</p>
<p>Etiquetas internas en estantes para productos sueltos.</p>
<p>IA como asistente de búsqueda, no como responsable de precios, stock
ni descuentos.</p>
<p>Categorías guiadas como respaldo para usuarios nuevos.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## Prioridad de implementación

MVP Fase 1: POS rápido sin IA  
- Pantalla touch-friendly.  
- Buscador por nombre, SKU y código de barras.  
- Carrito, total y cobrar.  
- Productos con y sin código.  
- Unidades: unidad, metro, paquete, ciento, docena y servicio.  
- Botones rápidos.  
  
MVP Fase 2: Catálogo preparado  
- Producto base y variantes.  
- SKU interno.  
- Alias.  
- Categorías.  
- Etiquetas internas de estante.  
- Búsqueda aproximada local.  
  
MVP Fase 3: IA en buscador  
- Interpretación de errores ortográficos.  
- Sinónimos y lenguaje natural.  
- Sugerencia de productos.  
- Confirmación antes de agregar.  
  
Fases posteriores  
- IA para listas escolares.  
- IA para clasificación de productos nuevos.  
- IA para sugerir alias y detectar duplicados.

Conclusión: la búsqueda por teclado debe ser el método principal, pero
la IA debe funcionar de forma secundaria y oculta detrás del buscador.
El cajero simplemente escribe lo que pidió el cliente; el sistema decide
si basta con buscar en PostgreSQL o si necesita apoyo de IA. El POS debe
seguir vendiendo incluso sin internet.
