# Contradicción 07 — Totales de factura: cabecera almacenada frente a suma de líneas

**Fecha:** 2026-10-30
**Estado:** registrada; no se corrige.
**Ámbito:** dos formas de obtener el mismo total de una factura: los campos de `facturas` o la suma
de `lineas`.
**Evidencia:** consulta de solo lectura a `datos/gesfact.db` (2026-10-30); `fichero:líneas`.
**Documentos relacionados:** `flujo-factura.md:395-407,463-466`; `mapa-sistema.md:444-451`
(zona oscura 9) y `:448-451` (zona oscura 10); `registro-riesgos.md:37-38` (R10, R11);
`reglas-de-negocio.md:110-120,165-173,394-404,554-561` (RN-06, RN-10, RN-30 y discrepancia 1 de la
síntesis).

> La base de datos de producción no está en el repositorio (`AGENTS.md`). `datos/gesfact.db` es la
> base local generada por `db.js`, descrita como «resumen, tal cual quedaron grabadas»
> (`db.js:91-92,122`). Por tanto, las diferencias que se muestran son evidencia de los datos de
> referencia sembrados; su traslado a producción es una `SUPOSICIÓN` que debe verificarse contra la
> base real.

## 1. Implementaciones implicadas y camino que usa cada una

### A. Cabecera almacenada en `facturas`

- **Escritura al emitir:** el alta manual guarda `calc.base`, `calc.iva`, `calc.recargo` y
  `calc.total` en la cabecera (`routes/facturas.js:74-76`); la remesa hace lo mismo
  (`scripts/remesa_mensual.js:61-62`); la rectificación copia e invierte los de la original
  (`routes/facturas.js:141-143`).
- **Lectura:**
  - listado de facturas: `SELECT f.*` y `views/facturas.ejs:19` muestran `f.total`
    (`routes/facturas.js:16-26`);
  - detalle imprimible: base, IVA, recargo y total salen de `f.*`
    (`views/factura_detalle.ejs:37-40`);
  - tablero: `SUM(total)` de las facturas `emitida` de serie `FA` (`server.js:24`);
  - CSV para la gestoría: `f.base`, `f.iva`, `f.recargo`, `f.total`
    (`routes/informes.js:36-38,44-45`).

### B. Suma de líneas

- **Escritura al emitir:** cada línea guarda `base`, `cuota_iva` y `cuota_recargo`
  (`routes/facturas.js:85-87`; `scripts/remesa_mensual.js:67-68`;
  `routes/facturas.js:148-150`).
- **Cálculo previo:** `calcularFactura` acumula esos mismos valores línea a línea y re-redondea
  (`services/calculo.js:81-84`), y calcula el total de cabecera a partir de ellos (`:86`). En
  condiciones normales, cabecera y líneas nacen cuadradas.
- **Lectura:**
  - informe trimestral de IVA:
    `SELECT l.tipo_iva, SUM(l.base), SUM(l.cuota_iva), SUM(l.cuota_recargo)` desde `lineas`
    (`routes/informes.js:23-26`), pintado en `views/informe_iva.ejs:5-14`;
  - detalle imprimible: las columnas de cada línea se pintan desde `lineas`
    (`views/factura_detalle.ejs:24-34`).

### C. Ausencia de reconciliación

No hay función, restricción, disparador ni proceso que compruebe que
`facturas.base = SUM(lineas.base)`, `facturas.iva = SUM(lineas.cuota_iva)` y
`facturas.recargo = SUM(lineas.cuota_recargo)`. El esquema no tiene claves foráneas ni `UNIQUE`
(`db.js:50-74`; R23). Las líneas pueden faltar por un fallo de inserción (contradicción 05) y la
cabecera seguir existiendo.

## 2. ¿Usan la misma convención o algoritmo? Comparación paso a paso

| Paso | A. Cabecera | B. Suma de líneas |
|---|---|---|
| Origen del dato | Campos `facturas.base/iva/recargo/total` | Campos `lineas.base/cuota_iva/cuota_recargo` |
| Cálculo al emitir | `calcularFactura` devuelve los acumulados (`services/calculo.js:81-86`) | El mismo `calcularFactura` devuelve cada línea (`:72-80`) |
| Redondeo | Cada acumulado se re-redondea con `util.redondear2` (`:81-84`) | Cada línea ya viene redondeada (`:71`); la suma SQL no re-redondea por línea |
| Rectificación | Copia los importes de cabecera con signo negativo (`routes/facturas.js:142`) | Copia los importes de línea con signo negativo (`:150`) |
| Momento de la verdad | Al grabar la factura; después no se recalcula | Al consultar el informe; se recalcula en cada lectura |
| ¿Se comprueba contra el otro? | No | No |

En teoría ambos caminos deben coincidir porque `calcularFactura` genera los dos desde el mismo
objeto. En la práctica pueden divergir por tres motivos:

1. **Datos históricos** calculados con otra versión del algoritmo o corregidos a mano (el propio
   `db.js:122` dice «resumen, tal cual quedaron grabadas»).
2. **Inserción parcial**: la cabecera se grabó y alguna línea no (contradicción 05), o se grabó una
   línea de más.
3. **Edición manual de la base**: el comentario de `routes/facturas.js:81-82` reconoce al menos un
   caso de factura «apañada» a mano (MH26).

## 3. Ejemplos concretos y cuantificación de la divergencia

Consulta ejecutada sobre `datos/gesfact.db` en modo solo lectura (2026-10-30):

```bash
node -e "
var sqlite3=require('sqlite3');
var db=new sqlite3.Database('./datos/gesfact.db', sqlite3.OPEN_READONLY);
db.all('SELECT f.id,f.numero,ROUND(SUM(l.base),2) AS base_lineas,'+
  'ROUND(SUM(l.cuota_iva),2) AS iva_lineas,ROUND(SUM(l.cuota_recargo),2) AS rec_lineas,'+
  'f.base AS base_cab,f.iva AS iva_cab,f.recargo AS rec_cab,f.total AS total_cab '+
  'FROM facturas f LEFT JOIN lineas l ON l.factura_id=f.id GROUP BY f.id ORDER BY f.id',
  function(e,r){ if(e) throw e; console.table(r); db.close(); });
"
```

Resultado (importes en euros):

| Factura | Base cabecera | Base líneas | IVA cabecera | IVA líneas | Total cabecera | Total líneas | Diferencia de total |
|---|---:|---:|---:|---:|---:|---:|---:|
| FA-2026-000101 | 133,20 | 133,20 | **27,97** | **24,27** | **161,17** | **157,47** | **−3,70** |
| FA-2026-000102 | 115,60 | 115,60 | 24,28 | 24,28 | 145,89 | 145,89 | 0,00 |
| FA-2026-000103 | 1.000,00 | 1.000,00 | 210,00 | 210,00 | 1.210,00 | 1.210,00 | 0,00 |
| FA-2026-000104 | 152,30 | 152,30 | 6,09 | 6,09 | 159,15 | 159,15 | 0,00 |
| FA-2026-000105 | **2.287,75** | **2.335,50** | **468,63** | **339,02** | **2.756,38** | **2.674,52** | **−81,86** |
| FA-2026-000106 | 101,61 | 101,61 | **20,62** | **20,06** | **122,23** | **121,67** | **−0,56** |
| RE-2026-000001 | −101,61 | −101,61 | **−20,62** | **−20,06** | **−122,23** | **−121,67** | **+0,56** |
| FA-2026-000107 | 101,61 | 101,61 | **20,62** | **20,06** | **122,23** | **121,67** | **−0,56** |
| FA-2026-000108 | 128,05 | 128,05 | **26,19** | **24,26** | **154,24** | **152,31** | **−1,93** |

De las 9 facturas sembradas, **6 no cuadran** (101, 105, 106, RE-001, 107 y 108) y **3 sí**
(102, 103 y 104). Las diferencias no son de redondeo de un céntimo: en la 105 son **81,86 €** de
total y **129,61 €** de IVA; en la 101, **3,70 €**; en la 108, **1,93 €**.

El caso de la 105 es especialmente visible porque la vista imprimible pinta a la vez las líneas y
los totales: las líneas suman 2.335,50 + 339,02 = 2.674,52 €, mientras el pie de la factura muestra
2.756,38 €. La nota «Descuento volumen 2% aplicado» (`db.js:149`) no explica la diferencia: el 2 %
de 2.335,50 sería 2.288,79, no 2.287,75, y el IVA de la cabecera (468,63) no corresponde al 21 %,
10 % y 4 % de las líneas. `reglas-de-negocio.md:554-561` ya señala que la factura sembrada no
cuadra con el algoritmo actual.

## 4. Cuándo se manifiesta y cuándo coinciden

**Se manifiesta** cuando se compara una magnitud calculada desde la cabecera con la misma magnitud
calculada desde las líneas:

- el informe trimestral de IVA (líneas) frente al CSV para la gestoría (cabecera);
- el total que se imprime en la factura (cabecera) frente a la suma de las líneas que el cliente
  puede sumar a mano;
- el tablero (cabecera) frente al informe (líneas);
- una rectificativa (copia ambas) frente a la original si esta ya estaba descuadrada.

**Coinciden** en las facturas nuevas emitidas por el código actual en condiciones normales: las tres
facturas sembradas que cuadran (102, 103 y 104) y, en general, cualquier factura creada por
`calcularFactura` sin fallos de inserción ni ediciones manuales. También coinciden las facturas
rectificadas si la original cuadraba, porque la rectificación invierte ambos lados por igual
(`routes/facturas.js:142,150`).

Por eso la divergencia ha pasado desapercibida: **la mayoría de las facturas nuevas cuadran**, y las
que no cuadran son datos históricos o casos raros. El informe de IVA se revisa por tipos y el CSV se
entrega con la cabecera; si ambos se miran por separado, la diferencia solo aparece al conciliar.
No hay un proceso de cuadre automático (R20).

## 5. Historia probable

El sistema guarda dos representaciones del mismo hecho desde su diseño: la cabecera con los totales
y las líneas con el detalle. `calcularFactura` las genera juntas (`services/calculo.js:48-88`), de
modo que en el código nuevo están sincronizadas por construcción, pero la base no impone esa
sincronía.

La siembra de `db.js` es una copia de «resumen, tal cual quedaron grabadas» (`db.js:122`; MH24). Eso
significa que las facturas 101, 105, 106, 107 y 108 no se generaron necesariamente con el algoritmo
actual: pueden venir de una versión anterior, de una corrección manual o de un redondeo distinto.
El incidente de mayo de 2019 es el antecedente más claro: Julián cambió el redondeo para hacerlo
sobre la base total y Puri devolvió el trimestre; se volvió al redondeo por línea
(`services/calculo.js:1-7`; MH13). Es plausible que algunas facturas históricas conserven totales
calculados con la forma antigua o corregidos a mano. `SUPOSICIÓN`: la diferencia de la 105 podría
ser un residuo de ese cambio o de una edición manual; no consta en el repositorio.

La rectificación se diseñó después como espejo exacto de lo grabado, sin recalcular
(`routes/facturas.js:124-128`; MH31). Eso conserva la coherencia del par original/abono, pero
también **arrastra** cualquier descuadre de la original: si la 106 tenía el IVA de cabecera distinto
del de sus líneas, la RE-001 reproduce la misma diferencia con signo contrario. No hay un proceso
que reconcilie cabecera y líneas antes de rectificar.

## 6. Preguntas para el negocio (no se responde aquí)

1. ¿Cuál es el total oficial de una factura: el de la cabecera o la suma de sus líneas?
2. Si no coinciden, ¿qué debe prevalecer para el CSV de la gestoría y para el modelo 303?
3. ¿Las facturas históricas descuadradas (101, 105, 106, 107 y 108 en la copia de referencia) están
   también descuadradas en producción?
4. ¿Debe un proceso de cuadre bloquear la emisión o la rectificación cuando cabecera y líneas no
   coinciden?
5. ¿La nota «Descuento volumen 2% aplicado» de la 105 debe explicar la diferencia, o la factura
   sembrada es solo un resumen y sus líneas no son las originales?
6. ¿Se acepta que una rectificativa herede un descuadre de la original en lugar de recalcularlo?
