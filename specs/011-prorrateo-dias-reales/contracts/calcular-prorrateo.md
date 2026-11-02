# Contrato de `calcularProrrateo`

**Feature**: `011-prorrateo-dias-reales`
**Fecha**: 2026-11-02
**Ámbito**: función pública `calcularProrrateo` de `motor/calculo.js`, expuesta sin cambios por la
fachada `services/calculo.js`.
**Naturaleza**: contrato de biblioteca interna. No hay API HTTP, ni CLI, ni formato de fichero.

> Este contrato **cambia a propósito** respecto al de la spec 010: la convención de 30 días fijos se
> sustituye por la de días reales. La decisión que lo autoriza es **A-11/D-03** (Paco y Puri,
> 2026-10-30). El resto de funciones del motor conservan su contrato sin cambios.

---

## 1. Módulo y exports

```js
// motor/calculo.js — CommonJS, síncrono, puro
module.exports = {
  recargoPara,
  calcularLinea,
  porcentajeDescuento,
  calcularFactura,
  calcularProrrateo   // misma clave, misma posición, misma aridad
};
```

| Requisito | Contractual | Comprobación |
|---|---|---|
| Número de exports | Exactamente **5**, ni uno más ni uno menos | `Object.keys().sort()` |
| Nombre | `calcularProrrateo` | `typeof modulo.calcularProrrateo === 'function'` |
| Aridad (`Function.length`) | **3** | `calcularProrrateo.length === 3` |
| Dependencias cargadas | Solo `lib/util.js` | `require.cache[...].children` |
| Efectos secundarios | Ninguno: no muta argumentos, no lee reloj, red ni disco | Repetición determinista + grafo de módulos |

**Prohibido**: renombrar la función, cambiar su aridad, envolverla en la fachada, convertirla a
`async`, añadir parámetros por defecto o añadir exports.

---

## 2. Firma

```text
calcularProrrateo(cuota, desde, hasta) → number
```

| Parámetro | Tipo esperado | Contrato |
|---|---|---|
| `cuota` | número | Importe mensual completo. No se valida; se conserva su signo. |
| `desde` | cadena `YYYY-MM-DD` | Inicio del periodo. Solo se usa el día y el mes. |
| `hasta` | cadena `YYYY-MM-DD` | Fin del periodo, en el mismo mes por contrato de uso. Solo se usa el día. |

**Salida**: número redondeado a dos decimales con `util.redondear2`.

---

## 3. Fórmula contractual

```text
d1        = parseInt(desde.split('-')[2], 10)
d2        = parseInt(hasta.split('-')[2], 10)
diasMes   = util.diasDelMes(desde)
dias      = d2 - d1 + 1
si dias < 0 → dias = 0
resultado = util.redondear2(cuota / diasMes * dias)
```

- **Denominador**: días reales del mes de `desde` (`28`, `29`, `30` o `31`).
- **Numerador**: días de servicio, ambos extremos incluidos.
- **Sin tope de 30**: el día 31 de un mes de 31 días se cobra.
- **Sin tope de `diasMes`**: una fecha imposible puede dar más de la cuota; no se valida.
- **Mínimo 0**: días invertidos dan 0.

---

## 4. Comportamiento observable

### 4.1 Casos normativos

| Entrada | Salida |
|---|---|
| `(60, '2026-07-16', '2026-07-30')` | **29.03** |
| `(90, '2026-03-01', '2026-03-31')` | **90.00** |
| `(90, '2026-02-01', '2026-02-28')` | **90.00** |
| `(90, '2028-02-01', '2028-02-29')` | **90.00** |
| `(90, '2026-04-01', '2026-04-30')` | **90.00** |

### 4.2 Casos límite

| Entrada | Salida | Nota |
|---|---|---|
| `(60, '2026-07-01', '2026-07-30')` | 58.06 | No es mes completo: faltan el día 31. |
| `(60, '2026-07-16', '2026-07-31')` | 30.97 | 16 días de 31. |
| `(90, '2026-03-15', '2026-03-01')` | 0 | Días invertidos. |
| `(90, '2026-03-01', '2026-03-01')` | 2.90 | Un día de 31. |
| `(-90, '2026-03-01', '2026-03-15')` | -43.55 | Signo conservado. |
| `(0, '2026-03-01', '2026-03-15')` | 0 | Cuota cero. |
| `(NaN, '2026-03-01', '2026-03-15')` | `NaN` | Se propaga. |
| `(90, '2026-02-01', '2026-02-29')` | 93.21 | Fecha imposible; no se valida. |
| `(90, null, '2026-03-15')` | `TypeError` | Sin `.split`; no se captura. |
| `(90, 'basura', '2026-03-15')` | `NaN` | Cadena sin guiones. |

### 4.3 Errores

| Entrada | Comportamiento |
|---|---|
| `desde`/`hasta` sin `.split` (`null`, `undefined`, número) | `TypeError`; no se captura ni se convierte en un valor por defecto |
| Cadena sin guiones (`'basura'`) | `NaN`; no se lanza error |
| Días invertidos | `0`; no se lanza error |
| Cuota `NaN` | `NaN`; no se lanza error |

No se añaden mensajes de error nuevos ni se capturan excepciones.

---

## 5. Consumidores

| Consumidor | Llamada | Cambio |
|---|---|---|
| `routes/contratos.js:39` | `calculo.calcularProrrateo(contrato.cuota, primeroDeMes, fechaBaja)` | **Ninguno**. Misma función, misma firma, mismo periodo (día 1 al día de la baja). |
| `services/calculo.js:11` | `module.exports = require('../motor/calculo')` | **Ninguno**. La fachada reexporta el objeto completo. |
| `scripts/remesa_mensual.js:43-51` | No llama a la función; replica la fórmula inline con `util.diasDelMes(primerDia)` | **Ninguno**. La paridad se exige para los mismos `desde`/`hasta`. |

**Consumidores que no deben cambiar**: `routes/facturas.js`, `routes/contratos.js`,
`scripts/remesa_mensual.js`, `services/calculo.js`. Cualquier cambio en ellos es una ruptura de
perímetro.

---

## 6. Relación con la remesa

La remesa calcula:

```text
diasMes      = util.diasDelMes(primerDia)
diasServicio = d2 - d1 + 1
importe      = util.redondear2(co.cuota / diasMes * diasServicio)
```

Tras el delta, `calcularProrrateo(cuota, desde, hasta)` con los mismos `desde`/`hasta` produce el
mismo número. La remesa **no se refactoriza** para llamar al motor: se conserva su fórmula inline y
se demuestra la paridad con tests (`test/contradicciones.test.js:20-31,38-48`).

---

## 7. Arnés de equivalencia (anillo C)

| Aspecto | Contrato tras el delta |
|---|---|
| `calcularFactura`, `calcularLinea`, `recargoPara`, `porcentajeDescuento` | Se siguen comparando con el heredado, igualdad exacta campo a campo |
| `calcularProrrateo` | **Excluido** de la comparación contra `test/referencia/calculo-heredado.js` |
| Motivo | Única divergencia intencionada del delta; la convención antigua ya no es la vigente |
| Documentación | Comentario en `test/equivalencia-motor.test.js` con A-11/D-03 y esta spec |
| Referencia heredada | `test/referencia/calculo-heredado.js` se conserva intacto; no se actualiza |
| Excepciones | Se sigue comparando al menos una excepción, con `calcularFactura(null, null)` |

El contrato de API (5 exports y aridades `1, 4, 1, 2, 3`) se conserva aunque el prorrateo no se
compare.

---

## 8. Qué rompe el contrato

- Volver a `cuota / 30 * dias` o reintroducir el tope de 30.
- Usar `hasta` en lugar de `desde` para `diasDelMes` fuera del mismo mes.
- Cambiar `redondear2` por `toFixed`, `Math.trunc` o cualquier otra fórmula.
- Añadir validaciones, topes, valores por defecto o mensajes de error.
- Normalizar `-0` a `0` o `NaN` a 0.
- Cambiar la aridad, el nombre o la posición del export.
- Modificar `routes/contratos.js`, `scripts/remesa_mensual.js` o `services/calculo.js`.
- Actualizar `test/referencia/calculo-heredado.js` para que «vuelva a coincidir».
- Comparar el prorrateo en el anillo C con tolerancia o contra una copia actualizada del heredado.
