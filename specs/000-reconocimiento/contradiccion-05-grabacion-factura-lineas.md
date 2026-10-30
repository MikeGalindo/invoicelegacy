# Contradicción 05 — Grabación de cabecera y líneas: tres copias del mismo `INSERT` con tres políticas de error

**Fecha:** 2026-10-30
**Estado:** registrada; no se corrige.
**Ámbito:** persistencia de una factura y sus líneas en los tres caminos de creación.
**Evidencia:** `fichero:líneas`; búsqueda de `INSERT INTO facturas`, `INSERT INTO lineas`,
`BEGIN|COMMIT|transaction` y `DELETE FROM` (2026-10-30); lectura del esquema `db.js:50-74`.
**Documentos relacionados:** `flujo-factura.md:420-429,468-511` (puntos 6.1 y 6.2; H3, H8);
`mapa-sistema.md:455-465` (zonas oscuras 11-13); `registro-riesgos.md:31,37-38` (R4, R10, R11);
`reglas-de-negocio.md:281-293,299-308` (RN-20, RN-21); `memoria-historica.md:81,110,115`
(MH16, MH26, MH31).

> No se decide aquí qué política de error es la correcta. Se documenta que la misma operación
> (grabar cabecera + líneas) está escrita tres veces y que, ante un fallo, cada camino deja la base
> en un estado distinto.

## 1. Implementaciones implicadas y camino que usa cada una

### A. Alta manual desde la web

- **Ruta:** `POST /facturas/nueva` (`routes/facturas.js:42-102`).
- **Cabecera:** `INSERT INTO facturas` de 11 columnas, serie `'FA'`, estado `'emitida'`
  (`routes/facturas.js:74-76`).
- **Líneas:** un `INSERT INTO lineas` de 8 columnas por cada línea calculada
  (`routes/facturas.js:85-87`), dentro de un `forEach`.
- **Errores:** acumula el primer error en `huboError` (`:84,89`), sigue intentando las demás líneas,
  y solo al terminar todas responde `500 'Error al grabar lineas'` (`:91-92`). La cabecera ya está
  grabada y las líneas que hayan entrado se quedan. No hay transacción ni borrado compensatorio.
- **Comentario:** «si falla una a mitad ya se apaño en su dia a mano en la bd, no ha vuelto a pasar»
  (`routes/facturas.js:81-82`; MH26).

### B. Remesa mensual

- **Ruta:** `node scripts/remesa_mensual.js YYYY-MM` (`scripts/remesa_mensual.js:14-18`).
- **Cabecera:** `INSERT INTO facturas` de 11 columnas, serie `'FA'`, estado `'emitida'`
  (`scripts/remesa_mensual.js:61-62`).
- **Línea:** un único `INSERT INTO lineas` de 8 columnas (`scripts/remesa_mensual.js:67-68`).
- **Errores:** cualquier error de cabecera o de línea hace `console.error(err); process.exit(1)`
  (`:64,69-70`). No hay `try/catch`, transacción ni compensación. Las facturas de los contratos
  anteriores ya están grabadas; el contrato actual puede quedar con cabecera y sin línea; el
  contador ya se consumió; los contratos restantes no se procesan.
- **Secuencia:** `procesarSiguiente` es recursiva y termina cada factura antes de empezar la
  siguiente (`scripts/remesa_mensual.js:34-76`).

### C. Rectificación

- **Ruta:** `POST /facturas/:id/rectificar` (`routes/facturas.js:129-164`).
- **Cabecera:** `INSERT INTO facturas` de 12 columnas (incluye `rectifica_a`), serie `'RE'`, estado
  `'emitida'` (`routes/facturas.js:141-143`).
- **Líneas:** `INSERT INTO lineas` de 8 columnas por línea, con signos invertidos
  (`routes/facturas.js:148-150`).
- **Errores:** el callback de la línea se declara **sin parámetro de error**
  (`function () { ... }`, `routes/facturas.js:151`), de modo que el error se ignora;
  `pendientes--` se ejecuta igual (`:152`). Al llegar a cero, actualiza la original a
  `'rectificada'` (`:154`) y redirige (`:155`), también sin comprobar el error del `UPDATE`. Puede
  quedar una `RE` con líneas incompletas y la original marcada como rectificada.

### D. Esquema común

`db.js:50-74` define `facturas` y `lineas` sin claves foráneas ni `UNIQUE` sobre `numero`
(`registro-riesgos.md:50`, R23). Los `INSERT` no están dentro de `BEGIN/COMMIT` en ninguno de los
tres caminos (la búsqueda no encuentra transacciones). El estado inicial `'emitida'` está como
literal en los tres y también como `DEFAULT` en el esquema (`db.js:61`); la serie `'FA'` está como
literal en A y B y como `DEFAULT` en el esquema (`db.js:53`).

## 2. ¿Usan la misma convención o algoritmo? Comparación paso a paso

| Paso | A. Manual | B. Remesa | C. Rectificación |
|---|---|---|---|
| Reserva de número | Antes de la cabecera (`routes/facturas.js:71`) | Antes de la cabecera (`scripts/remesa_mensual.js:57`) | Antes de la cabecera (`routes/facturas.js:138`) |
| Columnas de cabecera | 11 (`routes/facturas.js:74`) | 11 (`scripts/remesa_mensual.js:61`) | 12, añade `rectifica_a` (`routes/facturas.js:141`) |
| Serie | `'FA'` literal | `'FA'` literal | `'RE'` literal |
| Estado | `'emitida'` literal | `'emitida'` literal | `'emitida'` literal |
| Columnas de línea | 8 (`routes/facturas.js:86`) | 8 (`scripts/remesa_mensual.js:67`) | 8 (`routes/facturas.js:149`) |
| Número de líneas | N, `forEach` | 1 (`calc.lineas[0]`) | N, `forEach` |
| Error de cabecera | `500`, no sigue | `exit 1`, no sigue | `500`, no sigue |
| Error de línea | Acumula, intenta todas, `500` al final; cabecera y líneas parciales quedan | Aborta todo el proceso con `exit 1`; cabecera y líneas parciales quedan | Ignora el error; marca la original como rectificada y redirige |
| Transacción | No | No | No |
| Compensación | No | No | No |
| Correo | Solo A llama a `email.enviarFactura` (`routes/facturas.js:93-95`) | No | No |

La **transformación** es la misma: insertar una cabecera y una línea por cada elemento calculado,
con los mismos nombres de columna. La **política de error** es distinta en cada copia. También
cambia el número de columnas de la cabecera, por lo que un cambio de esquema debe replicarse en tres
sitios (y el de líneas, en tres).

## 3. Ejemplos concretos y cuantificación de la divergencia

No se ha provocado un fallo sobre la base para no alterar datos. Los escenarios se deducen del
código y de las restricciones del esquema; son reproducibles sobre una copia desechable.

### 3.1. Falla la segunda línea de una factura de dos líneas

Supóngase una factura manual con dos líneas, la primera insertada y la segunda rechazada por un
error de SQLite (bloqueo, disco) o por una restricción de la tabla `lineas` en una copia. No se usa
como ejemplo un `tipo_iva` o un `base` a `NaN`: en ese caso el total de la cabecera también sería
`NaN` y fallaría antes el `INSERT` de cabecera, como se explica en la contradicción 04.

| Camino | Estado final | Respuesta / señal |
|---|---|---|
| A. Manual | Cabecera con total de dos líneas + **una** línea | `500 'Error al grabar lineas'`; la cabecera queda |
| B. Remesa | Cabecera + **cero** líneas del contrato actual; contratos anteriores ya grabados; contador consumido | `exit 1`; el operador ve el error en consola |
| C. Rectificación | Cabecera de la `RE` + **una** línea; original marcada `rectificada` | Redirección normal, sin error visible |

En A y C el total de la cabecera (por ejemplo, 122,23 €) ya no coincide con la suma de las líneas
que quedaron (por ejemplo, una línea de 90,00 €). Es el mismo tipo de divergencia que se documenta
en la contradicción 07.

### 3.2. Falla la cabecera

| Camino | Estado final | Señal |
|---|---|---|
| A. Manual | Nada grabado, pero el contador ya se consumió (`routes/facturas.js:71→74`) | `500` |
| B. Remesa | Nada grabado del contrato actual, contador consumido, proceso abortado | `exit 1` |
| C. Rectificación | Nada grabado de la `RE`, contador consumido, original intacta | `500` |

El hueco de numeración es el mismo en los tres (H3), pero la respuesta al operador y el estado del
lote son distintos.

### 3.3. Fallo a mitad de la remesa

Con 10 contratos, si falla el contrato 6:

- los contratos 1-5 quedan facturados;
- el 6 puede quedar con cabecera y sin línea (si el fallo es de línea);
- los contratos 7-10 no se procesan;
- el proceso termina con `exit 1`;
- volver a lanzar la remesa del mismo mes **duplica** los contratos 1-5 y vuelve a consumir
  numeración (R4, `registro-riesgos.md:31`).

Cuantificación: el lote puede quedar partido en dos mitades sin marca en la base que indique hasta
dónde llegó; el único rastro es la consola. No hay tabla de procesos ni estado de remesa.

### 3.4. Fallo en la rectificación

Si la línea invertida no se graba, la `RE` existe con cabecera negativa y sin esa línea; la original
pasa a `rectificada`; el usuario ve la pantalla de la `RE` como si todo hubiera ido bien. El abono
deja de ser espejo exacto de la original, que es precisamente la regla que el comentario dice
preservar («Puri dixit: la rectificativa tiene que ser espejo exacto de la original»,
`routes/facturas.js:127-128`; MH31).

## 4. Cuándo se manifiesta y cuándo coinciden

**Se manifiesta** solo cuando un `INSERT` falla. En operación normal los tres caminos graban
cabecera y líneas correctamente y el resultado es equivalente (salvo las diferencias de cálculo de
las otras contradicciones). Las causas posibles de fallo son:

- una restricción `NOT NULL` por un dato inválido (`NaN`, tipo de IVA ausente, base nula);
- un bloqueo o error de disco de SQLite;
- una línea huérfana o un fallo de la clave ajena (no hay FK declaradas, pero podría haberlas en
  una copia);
- un proceso interrumpido entre la cabecera y las líneas (Ctrl+C, cierre de la ventana, caída).

**Coinciden** en el caso normal y en el caso de fallo de cabecera (ninguno graba nada, aunque los
tres consumen número). La divergencia importante es el fallo de línea: A deja cabecera y líneas
parciales con `500`; B aborta el lote y deja un estado intermedio; C no avisa y marca la original
como rectificada. Por eso la falta de transacción no se ha visto como un problema diario: los
fallos son raros y, cuando ocurren, el comentario de A dice que se arregló a mano en la base
(MH26).

## 5. Historia probable

El alta manual es el código más antiguo de los tres. Su comentario reconoce el fallo a medias y la
reparación manual en la base (`routes/facturas.js:81-82`; MH26). La rectificación se añadió después,
asociada a la regla legal de no borrar facturas y al criterio de Puri de que el abono sea espejo
exacto (`routes/facturas.js:124-128`; `lib/numeracion.js:3-6`; MH15 y MH31). Su `INSERT` de líneas
parece copiado del alta manual, pero el callback perdió el parámetro de error: una simplificación
propia de un código escrito para “copiar e invertir” sin volver a mirar los errores.

La remesa es de 2021, la añadió Roberto (`scripts/remesa_mensual.js:5-7`; MH17). Su estilo es de
script de línea de comandos: ante cualquier error, `console.error` y `process.exit(1)`, sin
transacción ni recuperación. Reutiliza la tabla y las columnas, pero no una función común de
grabación, porque no existe.

Los tres comparten la misma secuencia (reservar número, insertar cabecera, insertar líneas) y la
misma ausencia de transacción. No hay comentario que justifique no usar `BEGIN/COMMIT`; el esquema
tampoco tiene claves foráneas ni `UNIQUE` (`db.js:50-74`). `SUPOSICIÓN`: la transacción se omitió
porque SQLite local y el uso monousuario hicieron que los fallos fueran poco frecuentes, y cada
autor resolvió el error como pudo en su propio contexto (respuesta HTTP, `exit` o silencio).

## 6. Preguntas para el negocio (no se responde aquí)

1. Si una línea no se puede grabar, ¿debe quedar la factura completa o no debe quedar nada?
2. Si la remesa falla a mitad, ¿debe poder reanudarse sin duplicar los contratos ya facturados?
3. Si la rectificación no puede copiar una línea, ¿debe marcarse la original como rectificada?
4. ¿Quién se encarga hoy de detectar y reparar una factura a medias, y con qué procedimiento?
5. ¿Se acepta que el número de factura se consuma aunque la cabecera no llegue a grabarse (H3)?
