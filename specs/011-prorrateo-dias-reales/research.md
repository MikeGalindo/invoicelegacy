# Investigación (Fase 0): prorrateo único por días reales

**Feature**: `011-prorrateo-dias-reales`
**Fecha**: 2026-11-02
**Entrada**: [spec.md](./spec.md) y [plan.md](./plan.md)

Esta investigación resuelve las incógnitas técnicas del delta. La decisión de comportamiento ya está
tomada (**A-11/D-03**) y no se rediscute aquí: solo se decide cómo aplicarla sin tocar nada más.

---

## Contexto verificado

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Versión de Node | **v24.19.0** | `node --version` |
| Línea base de tests | **122/122 en verde**, 0 fallos, 0 saltados | `npm test`, 2026-11-02 |
| Función actual | `calcularProrrateo` usa `cuota / 30 * dias`, con tope de 30 y mínimo 0 | `motor/calculo.js:94-106` |
| Consumidor de la baja | Llama a `calculo.calcularProrrateo(contrato.cuota, primeroDeMes, fechaBaja)` | `routes/contratos.js:37-39` |
| Fórmula de la remesa | `util.redondear2(co.cuota / diasMes * diasServicio)`, con `diasMes = util.diasDelMes(primerDia)` | `scripts/remesa_mensual.js:43-51` |
| Fachada | Reexporta el motor completo, sin lógica | `services/calculo.js:11` |
| Tests de la convención antigua | Cuatro ficheros, ocho aserciones principales | `test/calculo.test.js:250-273`; `test/contradicciones.test.js:33-36`; `test/anomalias.test.js:107-110`; `test/reglas-negocio.test.js:85-88` |
| Oráculo del anillo C | `test/referencia/calculo-heredado.js`, con `calcularProrrateo` en `:110-118` | `test/equivalencia-motor.test.js:13-15,141-143` |
| Golden master | Tres casos con prorrateo; `prorrateoComercial` y `prorrateoDiasReales` | `test/golden/master.json:504-505,558-559,612-613` |
| Generador del golden | Usa `calc.calcularProrrateo` para `prorrateoComercial` | `test/golden/flujo-central.js:209-210` |
| Referencia heredada | SHA-256 `aa61cf553c530f3d1c4777be78284f7702b79a10f61cb62d27c30405d1e07c38` | `sha256sum test/referencia/calculo-heredado.js` |
| Motor antes del delta | SHA-256 `7a8d4ac605bb1c7490c5df4cdd16b94abfded390ed3c1483b0de81683aebd3cc` | `sha256sum motor/calculo.js` |

---

## R-01 · Fórmula exacta del nuevo prorrateo

**Decisión**: conservar la estructura de la función y cambiar solo el denominador y el tope:

```text
d1         = parseInt(desde.split('-')[2], 10)
d2         = parseInt(hasta.split('-')[2], 10)
diasMes    = util.diasDelMes(desde)
dias       = d2 - d1 + 1
si dias < 0 → dias = 0
resultado  = util.redondear2(cuota / diasMes * dias)
```

No se añade ningún otro tope, validación ni normalización. Se elimina únicamente `if (dias > 30)
dias = 30` y se sustituye el `30` literal por `diasMes`.

**Rationale**:

- Es exactamente la fórmula inline de la remesa (`scripts/remesa_mensual.js:47-51`), que la decisión
  A-11 declara correcta.
- `util.diasDelMes` ya existe y está cubierto (`lib/util.js:35-39`; `test/util.test.js`, RN-14). No
  se abre `lib/util.js`.
- Mantener `redondear2` conserva el redondeo a dos decimales y la semántica de `-0`/`NaN` que usa el
  resto del motor.

**Valores normativos calculados**:

| Caso | Fórmula | Resultado |
|---|---|---|
| 60 €, 16–30 julio 2026 (31 días) | `60 / 31 * 15` | **29,03** |
| 60 €, 1–30 julio 2026 (31 días) | `60 / 31 * 30` | 58,06 |
| 60 €, 16–31 julio 2026 (31 días) | `60 / 31 * 16` | 30,97 |
| 60 €, mismo día en julio | `60 / 31 * 1` | 1,94 |
| 90 €, 1–15 marzo 2026 (31 días) | `90 / 31 * 15` | 43,55 |
| 90 €, 1–30 marzo 2026 (31 días) | `90 / 31 * 30` | 87,10 |
| 90 €, 1–31 marzo 2026 | `90 / 31 * 31` | 90,00 |
| 90 €, 1–15 febrero 2026 (28 días) | `90 / 28 * 15` | 48,21 |
| 90 €, 1–28 febrero 2026 | `90 / 28 * 28` | 90,00 |
| 90 €, 1–15 febrero 2028 (29 días) | `90 / 29 * 15` | 46,55 |
| 90 €, 1–29 febrero 2028 | `90 / 29 * 29` | 90,00 |
| 90 €, 1–30 abril 2026 (30 días) | `90 / 30 * 30` | 90,00 |

**Alternativas consideradas**:

| Alternativa | Por qué se rechaza |
|---|---|
| Mantener 30 fijos y adaptar la remesa | Contradice A-11 y cambiaría la remesa, que es la fórmula oficial. |
| Usar `diasMes` de `hasta` en vez de `desde` | En el mismo mes da lo mismo; en un periodo a caballo no hay una respuesta correcta y el contrato de uso exige el mismo mes. `desde` coincide con el `primerDia` de la remesa y el `primeroDeMes` de la baja. |
| Prorratear por días naturales entre dos fechas (`Date`) | Cambia el contrato y abre zona horaria, años bisiestos y periodos a caballo; además, la remesa no lo hace así. |
| Capar `dias` a `diasMes` | Añade una validación no autorizada y cambia fechas imposibles; es deuda técnica diferida. |

---

## R-02 · Denominador y periodo

**Decisión**: el denominador es `util.diasDelMes(desde)`, el mes del inicio del periodo.

**Rationale**:

- `routes/contratos.js:38` construye `primeroDeMes` a partir de la fecha de baja y lo pasa como
  `desde`; ese es el mes que se está facturando.
- `scripts/remesa_mensual.js:47` usa `util.diasDelMes(primerDia)`, donde `primerDia` es el mes que se
  factura. La equivalencia es directa.
- Para el caso normativo 16–30 julio, `desde` y `hasta` son del mismo mes y `diasDelMes` devuelve 31
  en ambos.

**Alternativas consideradas**: usar `hasta` (mismo resultado en el mismo mes, pero menos alineado
con la remesa); usar el mes de la fecha de factura (no está disponible en la firma y añadiría un
tercer estado).

---

## R-03 · Tests que hay que sustituir

**Decisión**: actualizar los cuatro ficheros que congelan la convención antigua. No se crea
`test/calculo.prorrateo.test.js`, porque ese fichero no existe y la convención está repartida.

| Fichero | Qué cambia |
|---|---|
| `test/calculo.test.js:250-273` | Renombrar los tres tests de RN-11 y actualizar los valores. Añadir el caso normativo, el día 31 y los meses completos de 28/29/30/31. |
| `test/reglas-negocio.test.js:85-88` | Renombrar RN-11 y actualizar 45,00 → 43,55 (marzo) y 45,00 → 48,21 (febrero). |
| `test/contradicciones.test.js:33-36` | La contradicción 01 deja de ser «dos convenciones»: el test del motor pasa a la nueva; el de la remesa (`:38-41`) se conserva con los mismos valores y se añade la igualdad entre ambos. |
| `test/anomalias.test.js:107-110` | Sustituir «A-11 conviven dos prorrateos» por «A-11 prorrateo único por días reales», con la cita de la decisión. |

**Valores antiguos → nuevos** (los que ya estaban en los tests):

| Aserción | Antes | Después |
|---|---|---|
| `calcularProrrateo(90, '2026-03-01', '2026-03-15')` | 45,00 | **43,55** |
| `calcularProrrateo(90, '2026-03-01', '2026-03-30')` | 90,00 | **87,10** |
| `calcularProrrateo(90, '2026-03-01', '2026-03-31')` | 90,00 | 90,00 |
| `calcularProrrateo(90, '2026-02-01', '2026-02-15')` | 45,00 | **48,21** |
| `calcularProrrateo(60, '2025-09-01', '2025-09-15')` | 30,00 | 30,00 |
| `calcularProrrateo(60, '2025-08-01', '2025-08-15')` | 30,00 | **29,03** |
| `calcularProrrateo(90, '2026-03-01', '2026-03-01')` | 3,00 | **2,90** |
| `calcularProrrateo(90, '2026-03-01', '2026-03-02')` | 6,00 | **5,81** |
| `calcularProrrateo(-90, '2026-03-01', '2026-03-15')` | -45,00 | **-43,55** |
| `calcularProrrateo(90, '2026-13-01', '2026-13-15')` | 45,00 | **43,55** |
| `calcularProrrateo(90, '2026-02-01', '2026-02-29')` | 87,00 | **93,21** |

**Rationale**: si se deja una sola aserción antigua, la suite queda en rojo y se corre el riesgo de
«arreglarla» ablandando el test. La tabla permite revisar el cambio línea a línea.

**Alternativas consideradas**: borrar los tests antiguos y crear uno nuevo (pierde la trazabilidad de
qué se congelaba); crear `test/calculo.prorrateo.test.js` (inventa una ruta que el repo no tiene).

---

## R-04 · Anillo C: exclusión del prorrateo sin debilitar el resto

**Decisión**: en `test/equivalencia-motor.test.js`, eliminar solo la llamada de comparación de
`calcularProrrateo` (`:141-143`) y sustituir la cobertura de excepciones por una llamada que sí debe
seguir siendo equivalente:

```js
lanzamientos += exigirIgual('excepción calcularFactura(null)',
  function () { return heredado.calcularFactura(null, null); },
  function () { return nuevo.calcularFactura(null, null); }) ? 1 : 0;
```

Se conservan sin cambios:

- `CLAVES` con las cinco funciones y `ARIDADES` (`:17-31`), para seguir comprobando que el motor y
  la fachada exponen las cinco funciones con la misma aridad.
- Las comparaciones de `calcularFactura`, `calcularLinea`, `recargoPara` y `porcentajeDescuento`.
- Las invariantes, la pureza, la semilla, las rarezas A-22/A-23 y las variantes de cliente.

Se conserva el comentario que explica por qué el prorrateo ya no se compara, citando **A-11/D-03** y
esta spec. `test/referencia/calculo-heredado.js` no se toca: sigue siendo la copia histórica y el
oráculo de las otras cuatro funciones.

**Rationale**:

- Es el único punto donde el motor deja de ser equivalente verbatim al legado. Ocultarlo o comparar
  con tolerancia sería peor que excluirlo explícitamente.
- La aserción `lanzamientos >= 1` (`:146-148`) existía para probar que las excepciones también se
  comparan. Si se elimina el prorrateo con `desde: null`, hay que sustituir esa cobertura; si no, el
  test falla por una razón que no tiene que ver con el delta.
- `calcularFactura(null, null)` lanza `TypeError` en ambas implementaciones (`motor/calculo.js:56`
  y `test/referencia/calculo-heredado.js`), así que la comparación de excepciones sigue teniendo
  sentido.

**Alternativas consideradas**:

| Alternativa | Por qué se rechaza |
|---|---|
| Comparar el prorrateo contra una copia actualizada del heredado | Convierte el anillo C en una tautología y falsea la historia. |
| Comparar con tolerancia solo el prorrateo | Debilita la comparación exacta y no documenta la divergencia. |
| Desactivar el anillo C entero | Pierde la protección de las otras cuatro funciones, que sí deben seguir siendo equivalentes. |
| Eliminar la aserción `lanzamientos >= 1` sin sustituto | Deja de comprobar que las excepciones se comparan. |

---

## R-05 · Golden master: orden y `diff` esperado

**Decisión**: actualizar primero las descripciones de los tres casos en
`test/golden/flujo-central.js:129,139,149`, después regenerar con
`TZ=Europe/Madrid node scripts/regenerar-golden-master.js` y revisar el `diff` caso por caso.

**Descripciones propuestas** (texto orientativo, sin cambiar el `id` ni la estructura):

- `prorrateo-marzo`: «Cuota de 90 € con baja el 15 de marzo: prorrateo único por días reales».
- `prorrateo-febrero`: «Cuota de 90 € con baja el 15 de febrero: prorrateo único por días reales».
- `febrero-bisiesto`: «Factura de 2028-02-28 con vencimiento a 30 días y prorrateo por días reales
  de febrero bisiesto».

**`diff` esperado en `test/golden/master.json`**:

| Caso | Campo | Antes | Después |
|---|---|---|---|
| `prorrateo-marzo` | `prorrateoComercial` | `45.00` | `43.55` |
| `prorrateo-febrero` | `prorrateoComercial` | `45.00` | `48.21` |
| `febrero-bisiesto` | `prorrateoComercial` | `45.00` | `46.55` |
| Los tres | `descripcion` | «30 días frente a días reales» | «prorrateo único por días reales» |

`prorrateoDiasReales` no cambia: ya valía 43,55 / 48,21 / 46,55. Tras el delta, ambos campos
coinciden, que es precisamente la prueba de la convención única.

**Rationale**: el golden master es el contrato ejecutable del flujo central. Regenerarlo sin cambiar
las descripciones dejaría un texto que afirma una divergencia inexistente; cambiar las descripciones
sin regenerar dejaría el `diff` a medias. El orden correcto es: código → descripciones → regenerar →
revisar.

**Alternativas consideradas**: no regenerar y aceptar el golden en rojo (inaceptable); regenerar
antes de cambiar el código (el `diff` sería vacío y el test seguiría congelando lo antiguo); cambiar
el nombre de `prorrateoComercial` (cambio de esquema no autorizado).

---

## R-06 · Paridad con la remesa sin ejecutar la remesa real

**Decisión**: demostrar la paridad con dos comprobaciones:

1. **Test de fórmula**: replicar en el test la fórmula inline de la remesa (ya existe
   `prorrateoDiasReales` en `test/contradicciones.test.js:20-31`) y compararla con
   `calcularProrrateo` sobre una matriz de los 12 meses y periodos parciales (incluido el día 31,
   febrero y 2028 bisiesto). Exigir 0 diferencias.
2. **Test de fuente**: conservar la comprobación por texto de que
   `scripts/remesa_mensual.js` sigue usando `util.diasDelMes(primerDia)` y
   `co.cuota / diasMes * diasServicio` (`test/contradicciones.test.js:43-48`).

Además, `git diff --exit-code scripts/remesa_mensual.js` en el perímetro demuestra que el fichero no
se ha tocado.

**Rationale**: `scripts/remesa_mensual.js` emite facturas reales y abre la base de datos configurada
(`AGENTS.md`); no se ejecuta. La fórmula inline es estable y ya está congelada por fuente. Si el
fichero no cambia y la nueva función coincide con su fórmula, los importes de la remesa son los
mismos por construcción.

**Alternativas consideradas**: ejecutar la remesa sobre una copia desechable con base temporal
(válido pero caro y con riesgo de tocar datos); extraer la fórmula de la remesa a una función común
(refactor no autorizado y segundo módulo); comparar contra una foto del golden anterior (el golden
no ejecuta la remesa real, solo modela la fórmula).

---

## R-07 · Comportamiento con entradas raras

**Decisión**: no añadir validaciones. Se conservan:

| Entrada | Comportamiento tras el delta |
|---|---|
| Días invertidos (`2026-03-15` → `2026-03-01`) | `dias < 0` → 0; resultado 0,00 |
| Mismo día | Un día; `cuota / diasMes` |
| Cuota 0 | 0,00 |
| Cuota negativa | Negativa proporcional; no se normaliza a 0 |
| Cuota `NaN` | `NaN` |
| `desde` sin `.split` (`null`) | `TypeError` |
| Fecha sin guiones (`'basura'`) | `NaN` |
| Mes fuera de rango (`2026-13-01`) | `util.diasDelMes` normaliza; el resultado cambia respecto a 30 fijos (43,55 en el caso de 15 días) |
| Día imposible (`2026-02-29` no bisiesto) | `diasMes = 28`, `dias = 29`; resultado 93,21, superior a la cuota. No se valida. |
| Periodo a caballo entre meses | Se usa el mes de `desde`; el cálculo intermensual sigue sin sentido. Fuera de alcance. |

**Rationale**: el delta solo cambia el denominador y elimina el tope. Cualquier validación nueva
sería un cambio de comportamiento no autorizado y, además, alteraría los casos que el registro
difiere (A-15 del encargo / deuda técnica de fechas).

**Alternativas consideradas**: capar `dias` a `diasMes` para que una fecha imposible no supere la
cuota (cambio no autorizado); validar el formato (cambio no autorizado); lanzar error en días
invertidos (cambio no autorizado).

---

## R-08 · Alcance de la ruta de baja

**Decisión**: no tocar `routes/contratos.js`. La igualdad con la remesa se exige para los mismos
argumentos `desde`/`hasta`. La ruta sigue calculando del día 1 del mes al día de la baja
(`routes/contratos.js:37-39`).

**Rationale**:

- El encargo pide unificar la fórmula y conservar la firma, no cambiar el periodo.
- Cambiar el `desde` a `fecha_alta` cuando sea posterior al día 1 sería un cambio de comportamiento
  de la pantalla, con su propia decisión y su propia cobertura.
- Para el caso normativo, el test llama directamente a `calcularProrrateo(60, '2026-07-16',
  '2026-07-30')`, que es el mismo periodo que usaría la remesa. La ruta, si el contrato ya estaba
  activo el 1 de julio, calcula 1–30 y también coincide con la remesa de ese contrato.

**Alternativas consideradas**: cambiar la ruta para pasar `max(fecha_alta, primeroDeMes)` (abre el
módulo de contratos y cambia la pantalla); dejar la ruta como está y documentar la limitación (la
elegida).

---

## Incógnitas del contexto técnico: estado

| Incógnita | Estado |
|---|---|
| Fórmula exacta | **Resuelta**: R-01. |
| Denominador | **Resuelta**: R-02, `util.diasDelMes(desde)`. |
| Tests que hay que tocar | **Resuelta**: R-03, cuatro ficheros. |
| Cómo excluir el prorrateo del anillo C | **Resuelta**: R-04, exclusión explícita + excepción de `calcularFactura`. |
| Cómo regenerar el golden | **Resuelta**: R-05, después del código y de las descripciones. |
| Cómo demostrar la paridad con la remesa | **Resuelta**: R-06, fórmula replicada + comprobación por texto. |
| Entradas raras | **Resuelta**: R-07, sin validaciones nuevas. |
| Alcance de la ruta | **Resuelta**: R-08, sin cambios; paridad por mismos argumentos. |
| Almacenamiento / integraciones externas | **No aplica**: motor puro, sin BD ni red. |

No quedan `NEEDS CLARIFICATION`.
