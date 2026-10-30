# Contradicción 02 — Formato de los importes: `1.234,50` frente a `1234.50`

**Fecha:** 2026-10-30
**Estado:** registrada; no se corrige.
**Ámbito:** presentación de importes monetarios en pantallas, listados, consola y URL internas.
**Evidencia:** `fichero:líneas`; ejecuciones con `node -e` sobre `lib/util.js` (2026-10-30).
**Documentos relacionados:** `mapa-sistema.md:512-514` (zona oscura 28);
`reglas-de-negocio.md:246-254` (RN-17); `flujo-factura.md:154-156` y
`views/factura_nueva.ejs:26` (el navegador no calcula totales).

> No se decide aquí qué formato es el correcto. Se compara lo que hace cada implementación y se
> muestran ejemplos en los que el mismo importe se ve distinto.

## 1. Implementaciones implicadas y camino que usa cada una

### A. `util.formatearImporte`: formato español de pantalla e impresión

- **Función:** `formatearImporte(x)` en `lib/util.js:51-58`.
- **Algoritmo:** si `x` es `null`, `undefined` o `NaN`, devuelve `'0,00'` (`:52`); separa el signo
  negativo (`:53`); formatea con `Math.abs(x).toFixed(2)` (`:54`); inserta puntos de millar en la
  parte entera (`:55-56`); devuelve `'-' + entero + ',' + decimales` (`:57`).
- **Convención:** punto para miles, coma para decimales, siempre dos decimales; `null`/`NaN` se
  convierten en `0,00`. El comentario lo define como «importe para pantalla: 1234.5 -> "1.234,50"»
  (`lib/util.js:50`).
- **Caminos que la usan:**
  - factura imprimible: líneas y totales en `views/factura_detalle.ejs:28-40`;
  - listado de facturas: `views/facturas.ejs:19`;
  - informe trimestral de IVA: `views/informe_iva.ejs:7-14`;
  - CSV para la gestoría: `routes/informes.js:44-45`.

### B. `Number.prototype.toFixed(2)`: formato nativo, con punto decimal

- **Implementaciones:**
  - `views/index.ejs:6` — importe pendiente de cobro del tablero;
  - `views/articulos.ejs:8` — precio del artículo en el listado de maestros;
  - `views/contratos.ejs:8` — cuota mensual en el listado de contratos;
  - `scripts/remesa_mensual.js:71` — total que se imprime por consola al emitir cada factura;
  - `routes/contratos.js:40` — importe del prorrateo que viaja en la URL
    `?prorrateo=<importe>`.
- **Convención:** `toFixed(2)` usa siempre punto decimal, no añade separador de miles y no tiene
  tratamiento especial para `null`/`NaN` (si se le pasa `null` lanzaría una excepción; en estos
  usos los valores vienen de columnas `NOT NULL` o de una suma convertida a 0).
- **Caminos:** tablero de inicio, listados de maestros, consola de la remesa y URL de la baja de
  contrato. Ninguno de ellos es el documento fiscal ni el CSV que recibe la gestoría.

## 2. ¿Usan la misma convención o algoritmo? Comparación paso a paso

| Paso | A. `util.formatearImporte` | B. `.toFixed(2)` |
|---|---|---|
| Redondeo a 2 decimales | `Math.abs(x).toFixed(2)` (`lib/util.js:54`) | `x.toFixed(2)` |
| Signo negativo | Se extrae antes y se antepone `'-'` (`:53,57`) | `toFixed` ya incluye `'-'` |
| Separador decimal | Coma `,` (`:57`) | Punto `.` |
| Separador de miles | Punto `.` cada tres cifras (`:56`) | No existe |
| Valores nulos/no numéricos | `'0,00'` (`:52`) | Sin tratamiento; fallaría o mostraría `NaN` |
| Resultado para 1234,5 | `1.234,50` | `1234.50` |
| Resultado para 60 | `60,00` | `60.00` |

No hay diferencia en el valor numérico ni en el redondeo: ambos usan `toFixed(2)`. La diferencia es
de **convención de presentación**. Aun así, el mismo importe puede leerse con dos separadores
distintos en la misma sesión de trabajo: la factura impresa usa coma y el listado de contratos usa
punto.

## 3. Ejemplos concretos y cuantificación de la divergencia

Ejecución reproducible (2026-10-30):

```bash
node -e "
var util=require('./lib/util');
[1234.5,1000,60,0.5,-122.23].forEach(function(x){
  console.log(x, '|', util.formatearImporte(x), '|', x.toFixed(2));
});
"
```

| Importe | A. `util.formatearImporte` | B. `.toFixed(2)` | Diferencia visible |
|---:|---|---|---|
| 1234,50 | `1.234,50` | `1234.50` | Separador de miles y decimal |
| 1000,00 | `1.000,00` | `1000.00` | Separador de miles y decimal |
| 60,00 | `60,00` | `60.00` | Separador decimal |
| 0,50 | `0,50` | `0.50` | Separador decimal |
| −122,23 | `-122,23` | `-122.23` | Separador decimal |

La divergencia es **total en la representación** y **nula en el valor**. No hay un importe que A
calcule distinto de B; lo que cambia es cómo se lee. El riesgo no es aritmético, sino de
interpretación y de copia manual:

- el tablero muestra `154.24` donde la factura del mismo día muestra `154,24`;
- el listado de contratos muestra `90.00` donde la factura muestra `90,00`;
- la consola de la remesa imprime `1422.96 eur` donde la factura impresa dirá `1.422,96 €`;
- la URL de la baja de contrato lleva `prorrateo=45.00`; administración lo copia al campo de precio
  del alta manual, que acepta punto y coma (`routes/facturas.js:59-60`), por lo que el valor
  numérico no se altera, pero el texto no coincide con el de la factura.

En importes de cuatro cifras la diferencia añade el punto de millar: `1234.50` puede leerse como
mil doscientos treinta y cuatro con cincuenta, pero también invita a confundir el punto con un
separador de miles si se copia a otra herramienta. En el CSV, en cambio, el formato es el de A
(`routes/informes.js:44-45`), que es el acordado con la gestoría (`routes/informes.js:32-33`).

## 4. Cuándo se manifiesta y cuándo coinciden

**Se manifiesta siempre** que se compara una pantalla o consola de B con una pantalla, factura o CSV
de A. La diferencia existe para cualquier importe, incluso 60,00 €, porque el separador decimal
siempre cambia. Para importes menores de 1.000 € no hay separador de miles y la diferencia se
reduce a la coma frente al punto; para importes de 1.000 € o más se añade la ausencia de punto de
millar.

**No se manifiesta como error de cálculo** porque ambos formatos representan el mismo número y
porque los documentos que trascienden (factura imprimible y CSV) usan A. Los caminos con B son
listados de maestros, el tablero, la consola y una URL interna. Esa separación explica que nadie lo
haya detectado como incidencia: el dinero que se cobra y se declara se ve con coma; el resto son
pantallas de apoyo. Tampoco hay tests ni comparación automática entre pantallas
(`registro-riesgos.md:47`, R20).

## 5. Historia probable

`lib/util.js` se presenta como una colección de funciones que «vienen del gesfact 1.x en Access»
(`lib/util.js:1-2`), y `formatearImporte` conserva el formato español de la gestoría
(`lib/util.js:50-58`; `reglas-de-negocio.md:246-254`, RN-17). Es la función que usan las vistas
antiguas de facturación y el CSV acordado con Puri en 2019
(`routes/informes.js:32-33`; `memoria-historica.md:66`, MH11).

Los usos de `.toFixed(2)` tienen aspecto de atajos locales añadidos después, en pantallas que no
pasan por la utilidad común: el tablero se describe como «cuatro numeros y a correr»
(`server.js:21`), los listados de artículos y contratos muestran el valor crudo de la base
(`views/articulos.ejs:8`, `views/contratos.ejs:8`) y la remesa imprime por consola con
`.toFixed(2)` (`scripts/remesa_mensual.js:71`), un estilo propio de un script de 2021
(`scripts/remesa_mensual.js:5-7`; MH17). La URL de la baja de contrato también usa `.toFixed(2)`
(`routes/contratos.js:40`), coherente con una pantalla que se añadió sin pasar por
`formatearImporte`.

No hay un comentario que explique la elección. La explicación más probable es la cronología y la
autoría dispersa: la utilidad heredada del Access se quedó en los documentos, y cada pantalla nueva
resolvió el formato con la función nativa de JavaScript. `SUPOSICIÓN`: los autores de los listados
y del tablero no consideraron que el formato fuera una regla de negocio, sino un detalle de
presentación.

## 6. Preguntas para el negocio (no se responde aquí)

1. ¿El formato oficial de toda la aplicación debe ser el de la factura y el CSV (`1.234,50`), o se
   acepta que los listados internos usen `1234.50`?
2. ¿El importe pendiente del tablero y la cuota de los contratos deben verse con coma y punto de
   millar, igual que la factura?
3. ¿El valor que administración copia de la URL de prorrateo (`45.00`) debe mostrarse ya formateado
   (`45,00`) para evitar errores de copia?
4. ¿Debe unificarse el formato también en la consola de la remesa, que es el único registro que ve
   quien la lanza?
