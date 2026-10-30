# Reglas de negocio — GesFact 2.4

**Fecha:** 2026-10-28
**Fase:** reconocimiento. No se corrige nada (constitución, `.specify/memory/constitution.md`).
**Fuente:** `specs/000-reconocimiento/mapa-sistema.md` y lectura directa del código.
**Convención de evidencia:** `fichero:líneas` (función cuando aporta). Las afirmaciones no
verificadas se marcan `SUPOSICIÓN` y se convierten en preguntas al final.

> Este documento extrae las reglas de negocio de los **módulos de lógica central con criticidad
> ALTA** y de las utilidades de las que dependen. Describe **qué se cobra, qué se permite, qué se
> calcula, cuándo y cuánto**, nunca cómo está programado.

## Alcance: módulos seleccionados

Según el mapa (`mapa-sistema.md`), son de criticidad **ALTA** y contienen lógica de negocio:

| Módulo | Papel en el negocio | Criticidad |
|---|---|---|
| `services/calculo.js` | Fórmula del dinero: base, IVA, recargo, descuento, prorrateo | Alta |
| `lib/util.js` | Redondeo, vencimientos, fechas, NIF, formato de importes | Alta (utilidad) |
| `lib/numeracion.js` | Numeración correlativa legal de facturas | Alta |
| `routes/facturas.js` | Emisión, cobro y rectificación de facturas | Alta |
| `routes/informes.js` | Resumen de IVA y CSV para la gestoría | Alta |
| `scripts/remesa_mensual.js` | Emisión en lote de las cuotas de contratos | Alta |
| `config.js` | IVA por defecto, vencimiento por defecto, clave de exportación | Alta (utilidad) |
| `db.js` | Esquema, valores por defecto y datos de referencia | Alta (acceso a datos) |
| `server.js` | Tablero de cifras (lo que se muestra del negocio) | Alta |

No se incluyen las rutas de maestros (`clientes.js`, `articulos.js`, `contratos.js`, criticidad
Media) salvo donde una regla ALTA las invoca (p. ej. `validarNIF`, `calcularProrrateo`); se citan
solo como consumidores.

## Nota sobre los datos

`datos/gesfact.db` es generada y **no es la base real de producción** (AGENTS.md). Los valores
"reales" que se usan en los ejemplos son los **datos de referencia sembrados** por `db.js:91-181`,
que administración usa como patrón. Donde no hay dato de producción, el ejemplo es sintético y se
indica.

---

## A. Cálculo de importes (`services/calculo.js`, `lib/util.js`)

### RN-01 — El redondeo monetario es a dos decimales por redondeo simétrico

Todo importe intermedio se redondea a 2 decimales con `Math.round(x * 100) / 100` (el medio céntimo
redondea hacia arriba, p. ej. `1,995 → 2,00`).

- **Ejemplo:** `redondear2(3.848) = 3.85`; `redondear2(1.995) = 2.00`; `redondear2(0.5616) = 0.56`.
- **Evidencia:** `redondear2`, `lib/util.js:5-7`.
- **Clasificación:** **INTENCIONAL** — comentario «de toda la vida» y aviso de no tocar
  (`services/calculo.js:3-7`).

### RN-02 — La base imponible de una línea es `cantidad × precio`, redondeada a 2 decimales

El precio es unitario sin IVA. El producto se redondea antes de calcular el IVA.

- **Ejemplo:** 4 ud × 18,50 € = 74,00 € de base (sin redondeo visible). Con cantidad fraccionaria:
  0,44 × 21,60 = 9,504 → **9,50 €** (dato sembrado `db.js:130`).
- **Evidencia:** `calcularLinea`, `services/calculo.js:27`.
- **Clasificación:** **INTENCIONAL** — forma parte del redondeo línea a línea (RN-06).

### RN-03 — La cuota de IVA se calcula por línea sobre la base ya redondeada

`cuotaIva = redondeo(base × tipoIva / 100)`, aplicado a la base redondeada de RN-02, no al producto
en bruto.

- **Ejemplo:** base 74,00 € al 21 % → `74,00 × 0,21 = 15,54 €`. Base 23,90 € al 10 % → `2,39 €`
  (`db.js:128`). Base 9,50 € al 21 % → `9,50 × 0,21 = 1,995 → 2,00 €` (`db.js:130`).
- **Evidencia:** `calcularLinea`, `services/calculo.js:28`.
- **Clasificación:** **INTENCIONAL** — coherente con RN-06.

### RN-04 — El recargo de equivalencia se aplica solo a clientes en recargo y se calcula por línea

Si el cliente tiene `recargo_equivalencia == 1`, cada línea suma
`recargo = redondeo(base × recargoPara(tipoIva) / 100)`; si no, el recargo es 0. El recargo se
aplica sobre la base ya redondeada.

- **Ejemplo:** «Ferretería El Tornillo» está en recargo (`db.js:97`). Línea 4 ud × 18,50 € IVA 21 %:
  base 74,00 → IVA 15,54 → recargo `74,00 × 5,2 % = 3,848 → 3,85 €` (`db.js:133`). Un cliente sin
  recargo (p. ej. «Cafetería La Parada», `db.js:96`) no genera recargo en ninguna línea.
- **Evidencia:** `calcularLinea` `services/calculo.js:29-32`; activación `calcularFactura`
  `services/calculo.js:49`; valor por defecto 0 en `db.js:27`.
- **Clasificación:** **INTENCIONAL** — es un régimen fiscal deliberado. Nota de implementación: la
  comparación es `== 1` (igualdad débil), por lo que también activaría recargo con el literal `"1"`.
  `SUPOSICIÓN`: se desconoce si el negocio cuenta con recargo en clientes distintos del 0/1 entero.

### RN-05 — Tabla de recargos por tipo de IVA (incluye tipos ya derogados)

| Tipo de IVA | Recargo |
|---|---|
| 21 % | 5,2 % |
| 10 % | 1,4 % |
| 4 % | 0,5 % |
| 18 % | 4 % |
| 16 % | 4 % |
| 8 % | 1 % |
| 7 % | 1 % |
| cualquier otro | 0 % |

Los tipos 18/16 y 8/7 son los vigentes en ejercicios antiguos (2010-2012 y anteriores) y se
conservan «por si hay que reabrir ejercicios viejos del Access».

- **Ejemplo:** IVA 4 % → recargo 0,5 % (`db.js:146-147`: base 113,60 → recargo 0,57). Un tipo no
  listado (p. ej. 0 o 5) produce recargo 0.
- **Evidencia:** `recargoPara`, `services/calculo.js:12-23`.
- **Clasificación:** **INTENCIONAL** — el comentario explica por qué siguen los tipos viejos
  (`services/calculo.js:16-17`).

### RN-06 — Todos los importes se redondean línea a línea, nunca sobre el total

Cada línea se redondea por separado (base, IVA, recargo) y los totales son la suma de esos valores
redondeados. El aviso de cabecera documenta el motivo: la gestoría cuadra con Contaplus línea a
línea y devolvió un trimestre cuando se cambió a redondeo sobre base total.

- **Ejemplo:** en una factura de dos líneas, cada IVA se redondea por separado y luego se suma; no
  se suma la base y se aplica un IVA único sobre el total.
- **Evidencia:** aviso `services/calculo.js:3-7`; acumulación línea a línea
  `services/calculo.js:81-83`.
- **Clasificación:** **INTENCIONAL** — testimonio (Julián, mayo 2019; Puri, gestoría).

### RN-07 — Descuento por volumen con dos tramos y fronteras estrictas

Sobre la base bruta de la factura (antes de descontar):
- base **> 5.000 €** → 5 %;
- base **> 1.000 €** → 2 %;
- en caso contrario → 0 %.

La comparación es estricta (`>`), de modo que **1.000 € justos no entran** en el 2 % y
**5.000 € justos no entran** en el 5 % (quedan en el 2 %).

- **Ejemplo:** base 1.000,00 € → 0 % (factura sembrada `FA-2026-000103` con base 1.000,00 y total
  1.210,00, sin descuento, `db.js:139-143`); base 1.000,01 € → 2 %; base 5.000,00 € → 2 %;
  base 5.000,01 € → 5 %.
- **Evidencia:** `porcentajeDescuento`, `services/calculo.js:39-43`; el caso del 1.000 justo está
  anotado en `db.js:138` («base 1000 justa NO lleva descuento»).
- **Clasificación:** **INTENCIONAL** — comentario «acordado con Paco en 2018 para fidelizar
  hostelería» (`services/calculo.js:38`) y el caso límite documentado.

### RN-08 — El descuento se calcula sobre la base bruta y se aplica línea a línea rebajando el precio

Primero se suma la base a precio completo (RN-02) para fijar el porcentaje (RN-07). Después, para
cada línea, el precio unitario se rebaja: `precioConDto = redondeo(precio × (100 − dto) / 100)` y la
línea se recalcula entera con ese precio.

- **Ejemplo:** una línea de 10 ud × 120,00 € IVA 21 %, sin recargo → base bruta 1.200,00 → dto 2 % →
  precio 117,60 → base 1.176,00 → IVA 246,96 → total 1.422,96 €.
- **Evidencia:** cálculo de `baseBruta` `services/calculo.js:53-58`; determinación del dto
  `services/calculo.js:60-61`; rebaja del precio `services/calculo.js:67-71`.
- **Clasificación:** **INTENCIONAL** — comentario «el descuento se aplica línea a línea para que la
  gestoría lo vea desglosado igual (petición de Puri, 2018)` (`services/calculo.js:63-64`).

### RN-09 — El recargo de equivalencia se recalcula sobre la base ya descontada

Como la línea con descuento se recalcula por completo, el recargo se aplica a la base rebajada, no a
la base bruta. El descuento reduce, por tanto, base, IVA y recargo a la vez.

- **Ejemplo:** la misma línea de RN-08 en un cliente con recargo: base descontada 1.176,00 → recargo
  `1.176,00 × 5,2 % = 61,152 → 61,15 €` (en vez de `1.200,00 × 5,2 % = 62,40`).
- **Evidencia:** el recálculo pasa por `calcularLinea` con el precio ya rebajado,
  `services/calculo.js:71`.
- **Clasificación:** **DUDOSA** — es consecuencia directa de RN-08, pero no hay comentario ni
  testimonio que confirme si el negocio quiere descontar también el recargo. `SUPOSICIÓN`.

### RN-10 — El total de la factura es `base + IVA + recargo`, todo ya redondeado

Los totales de base, IVA y recargo son sumas re-redondeadas línea a línea, y el total final se
redondea una vez más.

- **Ejemplo:** factura sembrada `FA-2026-000102`: base 115,60 + IVA 24,28 + recargo 6,01 =
  145,89 € (`db.js:132`).
- **Evidencia:** acumulaciones `services/calculo.js:81-84`; total `services/calculo.js:86`.
- **Clasificación:** **INTENCIONAL** — coherente con RN-06.

### RN-11 — El prorrateo de cuotas es «a lo comercial»: mes de 30 días fijos

Al dar de baja un contrato a mitad de mes, el importe del mes es
`redondeo(cuota / 30 × días)`, donde `días = díaFin − díaInicio + 1`. Si los días superan 30 se
limitan a 30 (el día 31 no se cobra) y si son negativos quedan en 0.

- **Ejemplo:** cuota 90,00 €, servicio del 1 al 15 → `90 / 30 × 15 = 45,00 €`. Cuota 90,00 €, del
  1 al 31 → se limita a 30 días → 90,00 € (el 31 no se cobra).
- **Evidencia:** `calcularProrrateo`, `services/calculo.js:95-102`; invocado desde la baja de
  contrato `routes/contratos.js:37-40` (consumidor Media).
- **Clasificación:** **INTENCIONAL** — comentario «así lo hacía Paco a mano en el Access y así lo
  espera la gestoría» (`services/calculo.js:91-93`). **Ojo:** discrepa del prorrateo de la remesa
  (RN-34), que usa días reales.

---

## B. Fechas, vencimientos, NIF y formato (`lib/util.js`, `config.js`)

### RN-12 — El vencimiento es `fecha de factura + días de pago del cliente`

Los días de pago se toman de `cliente.dias_pago`; si está vacío o es cero, se usan
`config.VENCIMIENTO_DIAS` = 30.

- **Ejemplo:** factura del 31-01-2026 con cliente sin plazo → vencimiento 02-03-2026
  (`db.js:126`). Factura del 31-03-2026 con cliente a 60 días → vencimiento 30-05-2026
  (`db.js:102,149`).
- **Evidencia:** selección del plazo `routes/facturas.js:68`; `config.VENCIMIENTO_DIAS = 30`
  `config.js:40`; cómputo `sumarDias` `lib/util.js:20-26`.
- **Clasificación:** **INTENCIONAL** en lo general. **Hallazgo en la frontera:** `dias_pago || 30`
  trata un plazo **0** como «sin plazo» (usa 30), porque `0` es falso en JavaScript. No hay
  evidencia de que el negocio quiera distinguir «pago a 0 días» de «sin plazo». `SUPOSICIÓN`.

### RN-13 — Los días de vencimiento se suman en milisegundos (riesgo de desfase por cambio de hora)

`sumarDias` suma `días × 24 × 60 × 60 × 1000` milisegundos a la fecha y vuelve a leer el día en hora
local. En cambios de hora el resultado puede desviarse un día; el propio código documenta un caso de
marzo de 2019.

- **Ejemplo:** el comentario describe un vencimiento que salió un día menos por el cambio de hora.
- **Evidencia:** `sumarDias`, `lib/util.js:18-26` (TODO y relato del incidente).
- **Clasificación:** **ACCIDENTAL** — es un efecto de la implementación, reconocido en el propio
  código y sin resolver. Registrado en el mapa como zona oscura n.º 15.

### RN-14 — El número de días de un mes se obtiene del calendario real

`diasDelMes(fecha)` devuelve los días reales del mes de la fecha (28/29/30/31) usando
`new Date(año, mes, 0)`.

- **Ejemplo:** `diasDelMes('2026-02-01') = 28`; `diasDelMes('2026-03-01') = 31`.
- **Evidencia:** `diasDelMes`, `lib/util.js:36-39`; usada por la remesa (`remesa_mensual.js:21,47`).
- **Clasificación:** **INTENCIONAL** — utilidad neutra, pero ver RN-34 para la consecuencia.

### RN-15 — Las fechas se guardan en `YYYY-MM-DD` y se muestran en `DD/MM/YYYY`

La base de datos y los cálculos usan `YYYY-MM-DD`; pantalla e impresión usan `DD/MM/YYYY`.

- **Ejemplo:** `'2026-02-06'` → `06/02/2026` (fecha de `db.js:132`).
- **Evidencia:** `hoy` `lib/util.js:10-15`; `fechaBonita` `lib/util.js:29-33`.
- **Clasificación:** **INTENCIONAL** — comentario «la bd guarda así desde 2018` (`lib/util.js:9`).

### RN-16 — El NIF se valida solo por longitud (9 caracteres, sin espacios ni guiones)

Se eliminan espacios y guiones y se exige exactamente 9 caracteres. **No se comprueba la letra.**

- **Ejemplo:** `'B45812390'` válido; `'J4577 110 2'` válido (longitud 9 tras limpiar); `'1234'`
  inválido; un NIF con letra errónea pero 9 caracteres **pasa** como válido.
- **Evidencia:** `validarNIF`, `lib/util.js:42-48` (TODO de Julián 11/2017); consumido en
  `routes/clientes.js:18` (Media).
- **Clasificación:** **INTENCIONAL** — atajo deliberado: «de momento con la longitud vale porque los
  da de alta Marga y los mira ella» (`lib/util.js:42-43`). Registrado como zona oscura n.º 16.

### RN-17 — Los importes se muestran con punto de miles y coma decimal

`1234.5` se presenta como `1.234,50`; `null`/`undefined`/`NaN` se presentan como `0,00`; los
negativos llevan `-` delante.

- **Ejemplo:** `formatearImporte(-122.23) = "-122,23"`; `formatearImporte(null) = "0,00"`.
- **Evidencia:** `formatearImporte`, `lib/util.js:51-58`.
- **Clasificación:** **INTENCIONAL** — formato de pantalla/impresión. (El mapa anota dos vistas de
  maestros que usan `toFixed(2)` con punto en vez de este formato, zona oscura n.º 28.)

---

## C. Numeración (`lib/numeracion.js`)

### RN-18 — La numeración es correlativa, sin huecos, por serie y año

Cada factura recibe el siguiente número de su serie (`FA` o `RE`) y del año natural en curso, en
formato `SERIE-AAAA-NNNNNN` (6 dígitos con ceros a la izquierda).

- **Ejemplo:** si el contador `FA` de 2026 está en 108, la siguiente factura es `FA-2026-000109`
  (el dato sembrado deja `FA-2026 = 108` en `db.js:176`).
- **Evidencia:** `siguienteNumero` `lib/numeracion.js:14-28`; `formatear` `lib/numeracion.js:38-42`;
  motivación legal `lib/numeracion.js:3-6`.
- **Clasificación:** **INTENCIONAL** — obligación legal («correlativa y sin huecos», comentario
  `lib/numeracion.js:3-4`).

### RN-19 — Al estrenar año, la serie empieza en 1

Si no existe contador para la serie y el año en curso, se crea en 0 y la primera factura sale con el
número 1.

- **Ejemplo:** primera factura de la serie `FA` en 2027 → `FA-2027-000001`.
- **Evidencia:** `lib/numeracion.js:18-23` (comentario «año nuevo: se abre contador a cero»).
- **Clasificación:** **INTENCIONAL**.

### RN-20 — El número se asigna leyendo, incrementando y grabando sin transacción

La secuencia es `leer último → sumar 1 → actualizar` sobre la tabla `contadores`, sin bloqueo. Dos
altas simultáneas pueden repetir número; el código documenta un duplicado real del 2 de enero de
2021.

- **Ejemplo:** dos personas graban a la vez → ambas leen `ultimo = 108` y ambas emiten
  `FA-2026-000109`.
- **Evidencia:** `reservar` `lib/numeracion.js:30-36`; relato `lib/numeracion.js:8-10`; sin `UNIQUE`
  sobre `numero` en `db.js:50-63`.
- **Clasificación:** **ACCIDENTAL** (riesgo latente, no una decisión de negocio). Registrado como
  zona oscura n.º 11. Nota: la factura **no se borra nunca**; el error se corrige con rectificativa
  (RN-24), por lo que un duplicado no se anula.

---

## D. Emisión, cobro y rectificación (`routes/facturas.js`)

### RN-21 — Una factura exige al menos una línea; las filas en blanco se ignoran

Las filas del formulario sin descripción se descartan; si no queda ninguna línea, la factura no se
graba y se responde con error.

- **Ejemplo:** un formulario con 6 filas donde solo la 3.ª tiene descripción genera una factura de
  una línea; con las 6 vacías se rechaza.
- **Evidencia:** descarte `routes/facturas.js:55-63`; rechazo `routes/facturas.js:64`.
- **Clasificación:** **INTENCIONAL**. Nota (zona oscura n.º 12): `cantidad` y `precio` vacíos en una
  fila con descripción se convierten en `NaN` y no se validan; pueden provocar un grabado a medias.

### RN-22 — Cantidad y precio se capturan con coma o punto decimal; el importe lo calcula el servidor

El formulario acepta coma decimal (se sustituye por punto antes de convertir) y el servidor calcula
base, IVA, recargo y total; el navegador no calcula totales.

- **Ejemplo:** capturar `"18,50"` equivale a `18.50` y se calcula igual que el precio del artículo
  sembrado (`db.js:105`).
- **Evidencia:** normalización `routes/facturas.js:59-60`; cálculo en servidor
  `routes/facturas.js:66`; el JS de cliente solo autorrellena (`mapa-sistema.md`, `public/js/factura.js`).
- **Clasificación:** **INTENCIONAL** — los totales «solo se calculan en servidor» (AGENTS.md).

### RN-23 — La factura nueva nace en serie `FA`, estado `emitida` y con fecha de hoy por defecto

Si el formulario no trae fecha, se usa la fecha del servidor. La factura queda pendiente de cobro.

- **Ejemplo:** alta sin fecha el 28-10-2026 → fecha `2026-10-28`, estado `emitida`.
- **Evidencia:** fecha por defecto `routes/facturas.js:44`; inserción con `'emitida'` y `'FA'`
  `routes/facturas.js:74-76`; valor por defecto de estado `db.js:61`.
- **Clasificación:** **INTENCIONAL**.

### RN-24 — Si hay descuento por volumen, se anota en observaciones

Cuando se aplica un descuento (RN-07), la factura guarda en observaciones la nota
`Descuento volumen X% aplicado`. El descuento no se guarda como campo aparte: queda reflejado en los
precios e importes de las líneas y en esa nota de texto.

- **Ejemplo:** factura sembrada `FA-2026-000105` con observaciones `Descuento volumen 2% aplicado`
  (`db.js:149`).
- **Evidencia:** `routes/facturas.js:76`.
- **Clasificación:** **INTENCIONAL** — deja rastro del descuento, aunque no estructurado.

### RN-25 — Solo una factura `emitida` puede marcarse como cobrada

El cobro cambia el estado a `cobrada` únicamente si estaba `emitida`; no afecta a facturas ya
`cobrada` ni a `rectificada`.

- **Ejemplo:** cobrar una factura `emitida` la deja `cobrada`; volver a cobrarla no cambia nada.
- **Evidencia:** `UPDATE ... WHERE id = ? AND estado = 'emitida'`, `routes/facturas.js:117-121`.
- **Clasificación:** **INTENCIONAL**.

### RN-26 — La rectificación es un abono en espejo: serie `RE`, importes negativos, sin recalcular

Rectificar una factura genera una rectificativa en serie `RE` que copia los importes con el signo
invertido, **sin recalcular nada** (espejo exacto de la original, «Puri dixit»). La original pasa a
`rectificada`. La rectificativa queda en estado `emitida` (pendiente de cobro).

- **Ejemplo:** la factura sembrada `FA-2026-000106` (base 101,61, IVA 20,62, total 122,23) se
  rectifica con `RE-2026-000001` (base −101,61, IVA −20,62, total −122,23), `db.js:156-162`.
- **Evidencia:** cabecera negativa `routes/facturas.js:141-143`; líneas negativas
  `routes/facturas.js:149-150`; comentario `routes/facturas.js:127-128`.
- **Clasificación:** **INTENCIONAL** — «la rectificativa tiene que ser espejo exacto» (`Puri`).

### RN-27 — No se rectifica una factura ya rectificada ni una rectificativa

Si la factura está en estado `rectificada` o es de serie `RE`, la rectificación se rechaza.

- **Ejemplo:** intentar rectificar `RE-2026-000001` se rechaza; rectificar dos veces la misma `FA`
  se rechaza la segunda.
- **Evidencia:** `routes/facturas.js:132-133`.
- **Clasificación:** **INTENCIONAL**. Nota (zona oscura n.º 14): la ruta no rechaza las facturas
  `cobrada`; `SUPOSICIÓN` de si debe permitirse rectificar una factura ya cobrada.

### RN-28 — En la rectificativa se invierte cantidad, base, IVA y recargo; el precio conserva el signo

Cada línea se copia con `cantidad`, `base`, `cuota_iva` y `cuota_recargo` negativos, la descripción
prefijada con `Rectificación: ` y el **precio unitario con el signo original**.

- **Ejemplo:** línea original `1 × 90,00 (21 %)` → línea rectificada `-1 × 90,00`, base −90,00, IVA
  −18,90 (`db.js:161`).
- **Evidencia:** `routes/facturas.js:149-150`.
- **Clasificación:** **INTENCIONAL** — coherente con el espejo de RN-26.

### RN-29 — La rectificativa se fecha el día de hoy y no lleva vencimiento

La fecha de la rectificativa es la del servidor y su vencimiento queda a `NULL`.

- **Ejemplo:** `RE-2026-000001` con fecha 2026-05-06 y vencimiento `NULL` (`db.js:160`).
- **Evidencia:** `routes/facturas.js:142`.
- **Clasificación:** **INTENCIONAL**.

---

## E. Informes, CSV y tablero (`routes/informes.js`, `server.js`, `config.js`)

### RN-30 — El resumen de IVA trimestral suma las líneas por tipo, con las rectificativas en negativo

El informe suma `base`, `cuota_iva` y `cuota_recargo` desde las **líneas**, agrupadas por tipo de IVA,
dentro del trimestre calendario. Las rectificativas entran con signo negativo y «cuadran solas». Los
trimestres son: 1 = ene–mar, 2 = abr–jun, 3 = jul–sep, 4 = oct–dic.

- **Ejemplo:** una línea IVA 21 % de +74,00 y su rectificativa de −74,00 se anulan y el tipo 21 %
  muestra 0,00.
- **Evidencia:** consulta `routes/informes.js:23-26`; tabla de trimestres `routes/informes.js:17`.
- **Clasificación:** **INTENCIONAL** — comentario «las rectificativas entran con signo negativo y
  cuadran solas» (`routes/informes.js:21-22`).

### RN-31 — El límite superior del trimestre se fija al día 31 fijo

El rango del trimestre va del día 1 del primer mes al día **31** del último
(`anyo-MM-31`), aunque ese mes tenga 30 días. Funciona porque las fechas se comparan como texto.

- **Ejemplo:** trimestre 2 → desde `2026-04-01` hasta `2026-06-31`; `2026-06-30` queda incluido por
  comparación de texto, pero `2026-06-31` no existe como fecha real.
- **Evidencia:** `routes/informes.js:18-19`.
- **Clasificación:** **ACCIDENTAL** — constante mágica `31` que funciona por comparación
  lexicográfica, no por una decisión de negocio documentada. `SUPOSICIÓN` de si es intencional.

### RN-32 — El CSV para la gestoría tiene formato cerrado: punto y coma, coma decimal y clave en la primera línea

El fichero exporta **todas** las facturas del año (cualquier estado, incluidas las `RE` y las
`rectificada`, sin netear), ordenadas por número, con:
- primera línea `CLAVE;<clave>` (la clave fija `SH-CONTA-7731`);
- cabecera `NUMERO;FECHA;CLIENTE;NIF;BASE;IVA;RECARGO;TOTAL;ESTADO`;
- una línea por factura con `;` como separador, decimales con coma y saltos `\r\n`.

- **Ejemplo:** la factura sembrada `FA-2026-000102` se exporta como
  `FA-2026-000102;06/02/2026;Ferretería El Tornillo;03488812K;115,60;24,28;6,01;145,89;cobrada`.
- **Evidencia:** `routes/informes.js:34-50`; clave `config.js:37`.
- **Clasificación:** **INTENCIONAL** — «formato acordado con Puri en 2019` (`routes/informes.js:32-33`).
  El detalle de exportar también `RE`/`rectificada` sin netear es zona oscura n.º 10. `SUPOSICIÓN`.

### RN-33 — Año y trimestre del informe se toman por defecto del año en curso y del trimestre 1

Si no se pasa `anyo` ni `trimestre`, se usan el año actual y el trimestre 1. Un trimestre fuera de
1–4 no se valida y provoca una excepción del servidor.

- **Ejemplo:** `GET /informes/iva` el 28-10-2026 → año 2026, trimestre 1 (ene–mar).
  `GET /informes/iva?trimestre=5` → error (índice inexistente).
- **Evidencia:** `routes/informes.js:15-17` (sin validación de `t`).
- **Clasificación:** los valores por defecto son **INTENCIONALES**; la falta de validación del
  trimestre es **ACCIDENTAL** (zona oscura n.º 20).

### RN-34 — El tablero muestra el pendiente como la suma de totales de la serie `FA` en estado `emitida`

La cifra «importe pendiente» suma `total` de las facturas con `serie = 'FA'` y `estado = 'emitida'`.
Las rectificativas `RE` (negativas) y las `rectificada` no se restan ni se cuentan.

- **Ejemplo:** un abono `RE` emitido y pendiente de cobro **no** reduce el importe pendiente del
  tablero.
- **Evidencia:** `server.js:24`.
- **Clasificación:** **DUDOSA** — no hay comentario que explique por qué se excluye la serie `RE`;
  zona oscura n.º 9. `SUPOSICIÓN` de si es el criterio contable deseado.

---

## F. Remesa mensual (`scripts/remesa_mensual.js`)

### RN-35 — La remesa factura los contratos activos en el mes

Se factura cada contrato con `fecha_alta <= último día del mes` y (`fecha_baja` nula **o**
`fecha_baja >= primer día del mes`). Un contrato dado de baja antes del mes o de alta después no se
factura.

- **Ejemplo:** para la remesa de 2026-06, un contrato con alta 2026-06-16 y baja 2026-09-15 sí se
  factura (activo el 30-06); uno con baja 2026-05-31 no.
- **Evidencia:** `remesa_mensual.js:26-29`.
- **Clasificación:** **INTENCIONAL**.

### RN-36 — En la remesa, el importe se prorratea por los días reales del mes

Si el alta o la baja caen dentro del mes, el importe es
`redondeo(cuota / díasRealesDelMes × díasServicio)`, con `díasServicio = díaFin − díaInicio + 1`.
**Discrepa** del prorrateo comercial de RN-11 (30 días fijos).

- **Ejemplo:** cuota 90,00 € con baja el día 15 de marzo (31 días): la remesa calcula
  `90 / 31 × 15 = 43,55 €`, mientras que la pantalla de contratos (RN-11) calcula
  `90 / 30 × 15 = 45,00 €`.
- **Evidencia:** `remesa_mensual.js:45-51`; contraste con `services/calculo.js:95-101`.
- **Clasificación:** **DUDOSA** — dos prorrateos distintos conviven y no hay comentario que resuelva
  cuál es el correcto para la gestoría (zona oscura n.º 17). `SUPOSICIÓN`.

### RN-37 — La factura de remesa se fecha el último día del mes; el vencimiento usa `dias_pago || 30`

La fecha de la factura es el último día natural del mes facturado. El vencimiento suma
`co.dias_pago` del contrato, o 30 si está vacío/cero. **No** usa `config.VENCIMIENTO_DIAS` (a
diferencia de la factura manual, RN-12).

- **Ejemplo:** remesa de 2026-02 → fecha 28-02-2026; contrato sin `dias_pago` → vencimiento
  30-03-2026 (28-02 + 30 días).
- **Evidencia:** fecha `remesa_mensual.js:59`; vencimiento `remesa_mensual.js:60`.
- **Clasificación:** **DUDOSA** — el uso de `co.dias_pago || 30` en vez de `config.VENCIMIENTO_DIAS`
  es una diferencia no comentada (zona oscura n.º 18). `SUPOSICIÓN`.

### RN-38 — Cada contrato genera una factura `FA` de una sola línea y con nota `Remesa <mes>`

La factura de remesa tiene una única línea (cantidad 1, precio = importe prorrateado, IVA del
contrato) y en observaciones `Remesa <nombre del mes> <año>`. Si el servicio no cubre el mes entero,
la descripción añade `(<n> dias)`.

- **Ejemplo:** contrato de alquiler 90,00 € IVA 21 % en mes completo → una línea «Alquiler máquina de
  café Futurmat F3 (febrero)» por 90,00 € (base 90,00, IVA 18,90, total 108,90).
- **Evidencia:** construcción de la línea `remesa_mensual.js:53-55`; inserción con `'emitida'`
  `remesa_mensual.js:61-62`; `nombreMes` `remesa_mensual.js:80-84`.
- **Clasificación:** **INTENCIONAL**.

### RN-39 — La remesa no comprueba si el mes ya se facturó

No hay verificación de que el mes ya se haya emitido: lanzarla dos veces duplica facturas y consume
numeración.

- **Ejemplo:** lanzar `node scripts/remesa_mensual.js 2026-06` dos veces crea dos facturas por
  contrato.
- **Evidencia:** `remesa_mensual.js:23-77` (sin guarda de idempotencia).
- **Clasificación:** **ACCIDENTAL** (carencia, no decisión). Zona oscura n.º 18. `SUPOSICIÓN` de si
  existe control manual.

---

## Síntesis de los sospechosos del legacy

### Redondeos y orden de aplicación
- Redondeo simétrico a 2 decimales en **cada** línea (RN-01, RN-06) y re-redondeo de cada suma
  parcial (RN-10). Orden: base → IVA → recargo → totales (RN-02, RN-03, RN-04, RN-10).
- El descuento introduce un redondeo **extra** en el precio rebajado antes de recalcular la línea
  (RN-08), y el recargo se aplica a esa base descontada (RN-09, DUDOSA).

### Fronteras exactas
- Descuento por volumen con `>` estricto: **1.000,00 no entra en 2 %** y **5.000,00 no entra en 5 %**
  (RN-07). El caso del 1.000 justo está documentado (`db.js:138`).
- Prorrateo comercial: tope en 30 días, mínimo 0 (RN-11).
- Pago: `dias_pago || 30` hace que el valor **0** se trate como «sin plazo» (RN-12, `SUPOSICIÓN`).
- Recargo activado por `== 1` (igualdad débil), no por `===` (RN-04).

### Fechas
- Vencimientos por suma de milisegundos con desfase posible por cambio de hora (RN-13).
- Informe trimestral con límite superior `31` fijo que funciona solo por comparación de texto
  (RN-31).
- La remesa fecha el último día real del mes (RN-37) y el prorrateo usa días reales (RN-36), frente
  al mes comercial de 30 días de la pantalla (RN-11).

### Valores especiales
- Cero: `dias_pago = 0` → 30 días (RN-12); recargo 0 por defecto (RN-04).
- Negativos: rectificativas con importes negativos (RN-26) y líneas con cantidad/base/IVA/recargo
  negativos (RN-28); el tablero no los resta (RN-34).
- Vacíos: filas sin descripción ignoradas (RN-21); `NaN` no validado en cantidad/precio (nota
  RN-21); `formatearImporte` mapea `null`/`NaN` a `0,00` (RN-17).
- Duplicados: riesgo de número repetido por numeración no atómica (RN-20); remesa no idempotente
  (RN-39); artículos con nombre duplicado (zona oscura n.º 29, fuera de alcance ALTA).

### Constantes mágicas y tablas hardcodeadas
- Umbrales 1.000/5.000 (RN-07, 2018); día comercial 30 (RN-11); recargo por tipo incluyendo tipos
  derogados de 2010-2012 (RN-05); `31` del informe (RN-31); tabla de trimestres `meses` y tabla de
  nombres de mes `nombreMes`; `VENCIMIENTO_DIAS = 30` y `CLAVE_EXPORT_GESTORIA` en `config.js`.

### Discrepancias entre comentarios y código (hallazgos, no descuidos)
1. **`db.js` siembra facturas que no cuadran con el algoritmo actual.** La factura de ejemplo
   `FA-2026-000105` lleva «Descuento volumen 2% aplicado» (`db.js:149`) pero sus líneas están a
   precio completo (`db.js:150-154`) y su base (2.287,75) no coincide con la que produce `calculo.js`
   para esas líneas. Las líneas de «Portes» sembradas están 0,02 € por debajo del producto
   (p. ej. `0,32 × 6,00 = 1,92` grabado como 1,90 en `db.js:136`; `0,92 × 6,00 = 5,52` grabado como
   5,50 en `db.js:143`). Son datos de referencia, no producción; `SUPOSICIÓN` de si reflejan un
   comportamiento antiguo ya corregido o simples erratas de los datos sembrados.
2. **`lib/numeracion.js` dice «no ha vuelto a pasar (creo)»** sobre el duplicado, pero el código
   sigue sin transacción (`lib/numeracion.js:8-10` frente a `30-36`): el comentario expresa
   incertidumbre, no una corrección.
3. **`config.js:27-28` mantiene credenciales SMTP** que el código ya no usa (envío desactivado,
   `services/email.js:3-8`): configuración viva en texto plano sin consumidor.

---

## Preguntas abiertas para el negocio (`SUPOSICIÓN`)

1. ¿Debe descontarse también el recargo de equivalencia cuando hay descuento por volumen? (RN-09)
2. ¿El prorrateo correcto es el comercial de 30 días (RN-11) o el de días reales (RN-36)?
3. ¿Debe la remesa usar `config.VENCIMIENTO_DIAS` como la factura manual, o mantener su propio
   `dias_pago || 30`? (RN-37)
4. ¿Un cliente con `dias_pago = 0` debe pagar a 0 días o aplica el vencimiento por defecto? (RN-12)
5. ¿Se permite rectificar una factura ya cobrada? (RN-27)
6. ¿El tablero debe restar los abonos de la serie `RE`? (RN-34)
7. ¿La gestoría espera el CSV con todas las facturas (incluidas `RE` y `rectificada`) o el neto por
   cliente? (RN-32)
8. ¿El límite `31` fijo del informe y los tipos de IVA derogados de la tabla de recargos deben
   conservarse tal cual o revisarse? (RN-31, RN-05)
9. ¿Los datos sembrados en `db.js` deben corregirse para cuadrar con el algoritmo, o se mantienen
   como referencia histórica «tal cual quedaron grabadas»? (hallazgo 1)
