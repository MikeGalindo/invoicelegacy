# Contradicción 08 — Validación de fechas de entrada: regex de mes, ninguna validación y fecha del navegador

**Fecha:** 2026-10-30
**Estado:** registrada; no se corrige.
**Ámbito:** validación de la fecha o del mes que introducen los tres caminos que usan fechas de
negocio (remesa, factura manual y baja de contrato).
**Evidencia:** `fichero:líneas`; ejecuciones con `node -e` bajo `TZ=Europe/Madrid` (2026-10-30).
**Documentos relacionados:** `flujo-factura.md:498-501` (H5);
`mapa-sistema.md:459-462,469-470` (zonas oscuras 12 y 15); `registro-riesgos.md:35,41` (R8 y R14);
`reglas-de-negocio.md:207-225,311-319` (RN-13, RN-14 y RN-22); `memoria-historica.md:67` (MH12).

> No se decide aquí qué validación es la correcta. Se documenta que el mismo concepto («la fecha
> que llega es válida») se comprueba con tres criterios distintos y que dos de ellos no comprueban
> nada en el servidor.

## 1. Implementaciones implicadas y camino que usa cada una

### A. Remesa: expresión regular sobre `YYYY-MM`

- **Código:** `scripts/remesa_mensual.js:14-18`.
- **Regla:** `if (!mes || !/^\d{4}-\d{2}$/.test(mes))` → muestra el uso y sale con código 1.
- **Qué valida:** solo la forma «cuatro dígitos, guion, dos dígitos». No valida que el mes esté
  entre 01 y 12 ni que el año sea razonable.
- **Después:** construye `primerDia = mes + '-01'` y
  `ultimoDia = mes + '-' + util.diasDelMes(mes + '-01')` (`scripts/remesa_mensual.js:20-21`);
  `util.diasDelMes` (`lib/util.js:36-39`) interpreta el mes con `new Date(año, mes, 0)`, que
  normaliza meses fuera de rango; `nombreMes` (`scripts/remesa_mensual.js:80-84`) indexa una tabla
  de 12 nombres.
- **Camino:** `node scripts/remesa_mensual.js YYYY-MM`, ejecución manual el día 1.

### B. Factura manual: ninguna validación en servidor

- **Código:** `routes/facturas.js:44`:
  `var fecha = req.body.fecha || util.hoy();`
- **Qué valida:** nada. Si llega una cadena, se usa tal cual; si llega vacía, se usa la fecha del
  servidor (`util.hoy()`, `lib/util.js:10-15`).
- **Después:** `util.sumarDias(fecha, dias)` (`routes/facturas.js:69`) intenta interpretar la
  fecha; con una cadena inválida devuelve `'NaN-NaN-NaN'` (`lib/util.js:20-26`).
- **Validación de navegador:** el formulario usa `<input type="date" name="fecha">`
  (`views/factura_nueva.ejs:9`), que en un navegador normal restringe el formato y el calendario,
  pero es una validación de cliente: un `POST` directo no la respeta.
- **Camino:** `POST /facturas/nueva`, alta manual desde la web.

### C. Baja de contrato: ninguna validación en servidor

- **Código:** `routes/contratos.js:32`:
  `var fechaBaja = req.body.fecha_baja || util.hoy();`
- **Qué valida:** nada. El alta de contrato también acepta `req.body.fecha_alta || util.hoy()` sin
  validar (`routes/contratos.js:21`).
- **Después:** `primeroDeMes = fechaBaja.slice(0, 8) + '01'` (`routes/contratos.js:38`) y
  `calculo.calcularProrrateo(contrato.cuota, primeroDeMes, fechaBaja)` (`:39`), que solo lee el día
  (`services/calculo.js:96-97`).
- **Validación de navegador:** `<input type="date" name="fecha_baja">` (`views/contratos.ejs:12`),
  también solo en cliente.
- **Camino:** `POST /contratos/:id/baja`, pantalla de contratos.

### D. Utilidades de fecha sin validador

`lib/util.js` tiene `hoy`, `sumarDias`, `fechaBonita` y `diasDelMes` (`lib/util.js:10-39`), pero
**no** tiene una función `validarFecha` equivalente a `validarNIF` (`:44-48`). Cada camino resuelve
la validación a su manera o no la resuelve.

## 2. ¿Usan la misma convención o algoritmo? Comparación paso a paso

| Paso | A. Remesa | B. Factura manual | C. Baja de contrato |
|---|---|---|---|
| Entrada | `YYYY-MM` por argumento | `fecha` por `POST` | `fecha_baja` por `POST` |
| Validación en servidor | Regex `^\d{4}-\d{2}$` | Ninguna | Ninguna |
| Valida rango de mes (01-12) | **No** | No aplica | No aplica |
| Valida días del mes | No aplica (solo mes) | **No** | **No** |
| Valor por defecto si vacío | Rechaza y sale | `util.hoy()` | `util.hoy()` |
| Validación en navegador | No hay navegador | `<input type="date">` | `<input type="date">` |
| Efecto de un valor inválido | Puede construir un periodo imposible | Guarda la cadena y calcula `NaN-NaN-NaN` | Guarda la cadena y calcula un prorrateo con días inventados o `NaN` |

Los tres comparten la convención de fecha `YYYY-MM-DD` en la base (`lib/util.js:9`), pero no
comparten el criterio de validación. La remesa es la única que comprueba algo, y lo que comprueba es
insuficiente: acepta `2026-13` y `2026-00`.

## 3. Ejemplos concretos y cuantificación de la divergencia

### 3.1. Cadena no numérica

| Entrada | Remesa | Factura manual | Baja de contrato |
|---|---|---|---|
| `basura` | Rechaza en `scripts/remesa_mensual.js:15-18` y sale con código 1 | Acepta; `fecha = 'basura'`; vencimiento `NaN-NaN-NaN` | Acepta; `fecha_baja = 'basura'`; `slice(0,8)` produce `'basura' + '01'`; el prorrateo da `NaN` |

Reproducción de la parte pura:

```bash
TZ=Europe/Madrid node -e "
var util=require('./lib/util');
console.log(util.sumarDias('basura',30)); // NaN-NaN-NaN
console.log(util.fechaBonita('basura'));  // undefined/undefined/basura
"
```

La factura manual guarda una fecha `'basura'` y un vencimiento `'NaN-NaN-NaN'`; la vista imprimible
la mostrará como `undefined/undefined/basura` y el vencimiento como `NaN/NaN/NaN`. Es el hallazgo H5
de `flujo-factura.md:498-501` y R8 de `registro-riesgos.md:35`.

### 3.2. Mes fuera de rango en la remesa

`/^\d{4}-\d{2}$/.test('2026-13')` es `true`. Con `mes = '2026-13'`:

```bash
TZ=Europe/Madrid node -e "
var util=require('./lib/util');
console.log(util.diasDelMes('2026-13-01')); // 31
var nombres=['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
  'septiembre','octubre','noviembre','diciembre'];
console.log(nombres[parseInt('2026-13'.split('-')[1],10)-1] + ' ' + '2026-13'.split('-')[0]);
// undefined 2026
"
```

`diasDelMes('2026-13-01')` devuelve 31 porque `new Date(2026, 13, 0)` normaliza al último día de
enero de 2027; `ultimoDia` queda como `'2026-13-31'`; `nombreMes('2026-13')` produce
`'undefined 2026'`; `util.sumarDias('2026-13-31', ...)` daría una fecha inválida. La consulta de
contratos compara fechas como texto (`scripts/remesa_mensual.js:26-29`), así que un periodo
imposible puede seleccionar contratos activos y emitir facturas con fecha inválida y descripción
`undefined 2026`. No se ha ejecutado la remesa contra la base para no alterar datos; el escenario se
deduce del código.

### 3.3. Día inexistente en la factura manual

`2026-02-29` no existe (2026 no es bisiesto), pero el servidor lo acepta. JavaScript lo normaliza al
1 de marzo al construir `Date`:

```bash
TZ=Europe/Madrid node -e "
var util=require('./lib/util');
console.log(util.sumarDias('2026-02-29',30)); // 2026-03-31
console.log(util.fechaBonita('2026-02-29'));  // 29/02/2026
"
```

La factura guarda `fecha = '2026-02-29'` (una fecha que no existe) y un vencimiento calculado desde
el 1 de marzo + 30 días = `2026-03-31`. La pantalla muestra `29/02/2026`. JavaScript normaliza el
29 de febrero al 1 de marzo al construir el `Date`, de modo que el vencimiento se calcula desde una
fecha distinta de la que queda impresa: la fecha impresa no existe y el plazo parte de otra fecha.

### 3.4. Día inexistente en la baja de contrato: divergencia con la remesa

Con cuota 90,00 € y `fecha_baja = '2026-02-29'`:

| Cálculo | Días usados | Importe |
|---|---:|---:|
| Pantalla de contratos (`calcularProrrateo(90,'2026-02-01','2026-02-29')`) | 29 | **87,00 €** |
| Remesa de 2026-02 (recorta `hasta` al último día real, 2026-02-28) | 28 | **90,00 €** |

Diferencia: **3,00 €**. La pantalla acepta un 29 de febrero inexistente y cobra 29 días; la remesa
recorta al 28 y cobra el mes completo. Es la misma divergencia de la contradicción 01, pero
provocada por una fecha que el servidor no valida. Reproducción de la parte pura:

```bash
TZ=Europe/Madrid node -e "
var calc=require('./services/calculo');
console.log(calc.calcularProrrateo(90,'2026-02-01','2026-02-29')); // 87
console.log(90/28*28);                                             // 90
"
```

### 3.5. Trimestre fuera de rango (contexto, no es la misma ruta)

Aunque no es una fecha de entrada del mismo tipo, el informe de IVA tiene un problema paralelo:
`meses[t][0]` sin validar `t` (`routes/informes.js:16-19`) hace que `?trimestre=5` lance una
excepción (R21, zona oscura 20). Se menciona solo para mostrar que la validación de parámetros
temporales es desigual en todo el sistema; no se mezcla con las fechas de factura.

## 4. Cuándo se manifiesta y cuándo coinciden

**Se manifiesta** cuando la entrada no pasa por un navegador con `<input type="date">` o cuando se
teclea un valor que el navegador acepta pero el servidor no comprueba:

- `POST` directo o formulario manipulado con `fecha=basura`, `2026-02-29`, `2026-13-01`;
- `POST` directo a la baja de contrato con una fecha imposible;
- error de tecleo al lanzar la remesa: `2026-13`, `2026-00`, `2026-6` (este último sí lo rechaza la
  regex por faltar el cero);
- importación o script que llame a las rutas sin pasar por la vista.

**Coinciden** en el uso normal porque:

- la factura manual y la baja de contrato usan un selector de fecha del navegador, que impide
  teclear un 29 de febrero o un mes 13;
- la remesa se lanza con un mes natural escrito a mano por Marga, normalmente correcto
  (`views/index.ejs:9-10`);
- las fechas sembradas son todas válidas (`db.js:126-171`);
- no hay una validación de servidor que compare, así que la coincidencia es de facto, no de diseño.

Por eso el fallo no se ha visto: el camino normal está protegido por la interfaz, y el único
validador de servidor (la regex de la remesa) da una falsa sensación de seguridad porque solo mira
la forma. El riesgo se materializa con un `POST` directo, una integración futura o un error de
tecleo en la línea de comandos.

## 5. Historia probable

La factura manual y la baja de contrato son rutas web antiguas; se apoyan en el `<input type="date">`
del navegador y no repiten la validación en servidor. Es una práctica habitual en una aplicación
interna de los 2017-2020: el navegador es la primera barrera y el usuario es de confianza. El
comentario de `lib/util.js:18-19` sobre el vencimiento que salió un día menos en marzo de 2019 (MH12)
demuestra que las fechas ya habían dado problemas, pero se quedó como `TODO` sin añadir un validador
común.

La remesa, de 2021, añadió una regex porque es un script de línea de comandos sin navegador
(`scripts/remesa_mensual.js:14-18`; MH17). La regex comprueba la forma, no el rango; probablemente
se escribió para evitar que un argumento vacío o con texto rompiera el script, no para validar el
calendario. El uso de `util.diasDelMes` para el último día sugiere que el autor sí pensó en meses de
distinta duración, pero no en meses inválidos.

La rectificación no recibe fecha del usuario: usa `util.hoy()` (`routes/facturas.js:142`), así que
queda fuera de esta contradicción. `SUPOSICIÓN`: la validación se dejó al navegador porque el
sistema es interno y monousuario; la regex de la remesa se añadió como guarda de uso, no como
validación de negocio.

## 6. Preguntas para el negocio (no se responde aquí)

1. ¿Debe el servidor rechazar una fecha que no existe, aunque el navegador la haya dejado pasar?
2. ¿Qué debe hacer el alta de factura con una fecha inválida: rechazarla, usar la de hoy o guardarla
   tal cual?
3. ¿La remesa debe validar que el mes esté entre 01 y 12, además de la forma `YYYY-MM`?
4. ¿La baja de contrato debe validar que la fecha esté dentro del mes y que exista en el calendario?
5. ¿Debe existir una única función de validación de fechas en `lib/util.js`, como existe
   `validarNIF`?
6. ¿Qué se hace con las facturas y contratos que ya tengan una fecha inválida en producción?
