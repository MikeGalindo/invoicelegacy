# Contradicción 09 — Normalización de números de entrada: la misma conversión copiada cuatro veces

**Fecha:** 2026-10-30
**Estado:** registrada; no se corrige.
**Ámbito:** conversión del texto que llega por formulario a número (`cantidad`, `precio` y `cuota`).
**Evidencia:** `fichero:líneas`; ejecuciones con `node -e` sobre expresiones equivalentes
(2026-10-30).
**Documentos relacionados:** `flujo-factura.md:93-95` (coerción del alta manual);
`reglas-de-negocio.md:310-319` (RN-22); `mapa-sistema.md:459-465` (zona oscura 12);
`registro-riesgos.md:35` (R8).

> Esta contradicción es de **duplicación**, no de divergencia actual: las cuatro copias hacen
> exactamente lo mismo. Se documenta porque el mismo concepto está escrito en cuatro sitios y
> porque un cambio en uno no llegaría a los demás. No se decide aquí cuál debe ser la
> normalización correcta.

## 1. Implementaciones implicadas y camino que usa cada una

### A. Cantidad y precio de una línea de factura manual

- **Código:** `routes/facturas.js:59-60`:
  `cantidad: parseFloat(('' + cants[i]).replace(',', '.'))` y
  `precio: parseFloat(('' + precios[i]).replace(',', '.'))`.
- **Camino:** `POST /facturas/nueva`, alta manual. El formulario envía arrays `cant[]` y `precio[]`
  (`views/factura_nueva.ejs:16-17`).

### B. Precio de un artículo

- **Código:** `routes/articulos.js:19`:
  `parseFloat(('' + req.body.precio).replace(',', '.'))`.
- **Camino:** `POST /articulos/nuevo`, alta de artículo.

### C. Cuota de un contrato

- **Código:** `routes/contratos.js:19`:
  `parseFloat(('' + req.body.cuota).replace(',', '.'))`.
- **Camino:** `POST /contratos/nuevo`, alta de contrato. La vista no tiene formulario de alta
  (`views/contratos.ejs`), así que este camino se usa por `POST` directo o por datos externos.

### D. Tipo de IVA (conversión emparentada, no idéntica)

- **Código:** `parseInt(ivas[i], 10)` en `routes/facturas.js:61`;
  `parseInt(req.body.tipo_iva, 10)` en `routes/articulos.js:16`;
  `parseInt(req.body.tipo_iva || 21, 10)` en `routes/contratos.js:20`.
- **Diferencia:** no usan `replace(',', '.')` porque el IVA es entero; pero comparten la misma
  ausencia de validación y tienen valores por defecto distintos (ver contradicción 04).

### E. No existe una función común

`lib/util.js` exporta `redondear2`, `hoy`, `sumarDias`, `fechaBonita`, `diasDelMes`, `validarNIF` y
`formatearImporte` (`lib/util.js:60-68`), pero **no** exporta una función de conversión de número de
entrada. Cada ruta repite la expresión.

## 2. ¿Usan la misma convención o algoritmo? Comparación paso a paso

Las cuatro copias de `parseFloat` siguen exactamente estos pasos:

1. `'' + valor`: convierten el valor a cadena. Si el campo no llega (`undefined`), la cadena es
   `'undefined'`; si llega `null`, es `'null'`.
2. `.replace(',', '.')`: sustituyen **la primera coma** por un punto.
3. `parseFloat(...)`: leen el número hasta el primer carácter no numérico; si la cadena no empieza
   por un número, devuelven `NaN`.

| Entrada | Resultado en A, B y C | Observación |
|---|---|---|
| `'18,50'` | `18.5` | Coma decimal aceptada |
| `'18.50'` | `18.5` | Punto decimal aceptado |
| `''` | `NaN` | No se valida |
| `undefined` | `NaN` | La cadena es `'undefined'` |
| `null` | `NaN` | La cadena es `'null'` |
| `'1.234,56'` | `1.234` | El primer punto corta la lectura; se pierde el resto |
| `'1,234,56'` | `1.234` | Solo se cambia la primera coma; el segundo punto corta |
| `'12abc'` | `12` | `parseFloat` acepta el prefijo numérico |
| `'abc'` | `NaN` | No hay prefijo numérico |

No hay diferencia entre A, B y C para la misma entrada. La convención es la misma y el algoritmo es
el mismo, copiado literalmente. La duplicación es, por tanto, **consistente hoy**; el riesgo es que
una corrección futura (por ejemplo, aceptar el punto de millar `1.234,56` o rechazar `12abc`) se
aplique solo a una de las cuatro copias.

## 3. Ejemplos concretos y cuantificación de la divergencia

### 3.1. Divergencia actual entre caminos: ninguna

Para la misma entrada, los cuatro caminos producen el mismo número. No hay un caso en el que la
factura manual acepte `18,50` y el artículo no, ni viceversa. La expresión es idéntica.

### 3.2. Punto ciego común: el punto de millar

Si un usuario copia un importe formateado como en la factura (`1.234,56`) al campo de precio:

- `('' + '1.234,56').replace(',', '.')` → `'1.234.56'`;
- `parseFloat('1.234.56')` → `1.234`;
- el importe grabado es **1,234 €**, no **1.234,56 €**.

La pérdida es de **1.233,326 €** (se queda en 1,234 €). Ocurre igual en los cuatro caminos, así que
no es una contradicción entre ellos, sino un punto ciego compartido por la duplicación. No se ha
ejecutado contra la base; es el resultado de la expresión pura.

### 3.3. Punto ciego común: texto parcial

`parseFloat('12abc')` devuelve `12` en los cuatro caminos. Un valor tecleado como `12 ud` se graba
como 12, sin aviso. La pérdida o la interpretación errónea depende del sufijo, pero el
comportamiento es idéntico en todos.

### 3.4. Interacción con la ausencia de validación de `NaN`

En los cuatro caminos, un `NaN` sigue su curso:

- en la factura manual, llega a `calcularFactura` y a los `INSERT` (contradicción 05);
- en el artículo, se inserta en `precio REAL NOT NULL` (`db.js:35`) y puede fallar;
- en el contrato, se inserta en `cuota REAL NOT NULL` (`db.js:45`) y puede fallar.

La falta de validación es común, pero las consecuencias visibles difieren por el contexto de cada
tabla y de cada ruta. Esa parte se cubre en las contradicciones 04, 05 y 08.

## 4. Cuándo se manifiesta y cuándo coinciden

**No se manifiesta como divergencia entre caminos** en ningún caso, porque el código es el mismo.
Se manifiesta como **punto ciego común** cuando:

- se pega un importe con punto de millar y coma decimal (`1.234,56`);
- se teclea un número con texto adjunto (`12 ud`, `18,50 €`);
- se deja el campo vacío y se espera un valor por defecto (no lo hay: `NaN`).

**Coinciden siempre** en el resultado de la conversión. La única diferencia está en lo que ocurre
después del `NaN`, que depende de la tabla y del camino, no de la conversión.

Por eso nadie lo ha detectado: el uso normal teclea números simples (`18,50` o `18.50`), sin punto
de millar y sin sufijos. El formulario de artículos marca el precio como `required`
(`views/articulos.ejs:17`), pero el de factura no marca `precio` como obligatorio
(`views/factura_nueva.ejs:17`), así que una línea con descripción y precio vacío sí puede llegar al
servidor y producir `NaN`. La duplicación solo se nota cuando se quiere cambiar la regla de
conversión en un sitio y hay que recordar los otros tres.

## 5. Historia probable

La normalización con `replace(',', '.')` es una solución típica de la época en que los formularios
HTML enviaban la coma decimal española y `parseFloat` solo entendía el punto. Aparece por primera
vez en el alta manual de facturas (`routes/facturas.js:59-60`), el camino más antiguo, y se copió
después a los maestros de artículos (`routes/articulos.js:19`) y contratos
(`routes/contratos.js:19`). El estilo es el mismo en los tres: expresión de una línea, sin función
auxiliar, sin comentario y sin comprobar `NaN`.

`lib/util.js` contiene las utilidades comunes, pero se limita a redondeo, fechas, NIF y formato de
salida; no incluye una conversión de entrada. Es coherente con una aplicación que creció por rutas
independientes: cada formulario resolvió su conversión localmente y nadie la extrajo después. La
regla RN-22 documenta la convención (coma o punto) pero no la duplicación
(`reglas-de-negocio.md:310-319`). `SUPOSICIÓN`: al ser una expresión corta, se copió sin considerar
que fuera una regla de negocio.

## 6. Preguntas para el negocio (no se responde aquí)

1. ¿Debe aceptarse el punto de millar (`1.234,56`) en los campos de importe, o solo la coma
   decimal?
2. ¿Debe rechazarse un valor con texto (`12 ud`) en vez de leer el prefijo numérico?
3. ¿Debe un campo vacío producir un error visible en vez de `NaN`?
4. ¿Debe existir una única función de conversión de números de entrada en `lib/util.js`, usada por
   facturas, artículos y contratos?
5. ¿Los cuatro caminos deben aceptar exactamente el mismo formato, o el precio del artículo y la
   cuota del contrato tienen convenciones distintas?
