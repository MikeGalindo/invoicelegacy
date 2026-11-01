# Contrato de la API del motor

**Feature**: `010-motor-calculo-strangler`
**Fecha**: 2026-11-01
**Ámbito**: interfaz pública de `motor/calculo.js` y de su fachada `services/calculo.js`.
**Naturaleza**: contrato de biblioteca interna. No hay API HTTP, ni CLI, ni formato de fichero.

> Este contrato **no se diseña aquí**: se transcribe del código heredado que la suite congela
> (`services/calculo.js:12-102`). Cualquier diferencia detectable es un fallo de la extracción, no
> una propuesta de mejora.

---

## 1. Módulo y exports

```js
// motor/calculo.js — CommonJS, síncrono, puro
module.exports = {
  recargoPara,
  calcularLinea,
  porcentajeDescuento,
  calcularFactura,
  calcularProrrateo
};
```

| Requisito | Contractual | Comprobación |
|---|---|---|
| Número de exports | Exactamente **5**, ni uno más ni uno menos | `Object.keys().sort()` |
| Nombres | `recargoPara`, `calcularLinea`, `porcentajeDescuento`, `calcularFactura`, `calcularProrrateo` | Idem |
| Tipo | Las cinco son funciones | `typeof === 'function'` |
| Aridad (`Function.length`) | `1, 4, 1, 2, 3` en ese orden de funciones | Propiedad `.length` |
| Dependencias cargadas | Solo `lib/util.js` | `require.cache[require.resolve('.../motor/calculo')].children` |
| Efectos secundarios | Ninguno: no muta argumentos, no lee reloj, red ni disco | Repetición determinista + grafo de módulos |

**Prohibido**: exports adicionales, envoltorios que cambien la aridad, `async`, promesas, parámetros
por defecto en las cinco funciones públicas (alteran `.length`).

---

## 2. `recargoPara(tipoIva)`

| Aspecto | Contrato |
|---|---|
| Entrada | `tipoIva`: número o cualquier valor |
| Salida | Número: porcentaje de recargo |
| Errores | Ninguno |
| Pureza | Tabla fija; sin IO |

**Tabla vigente** (`services/calculo.js:12-23`):

| `tipoIva` | Resultado |
|---|---|
| `21` | `5.2` |
| `10` | `1.4` |
| `4` | `0.5` |
| `18` | `4` |
| `16` | `4` |
| `8` | `1` |
| `7` | `1` |
| Cualquier otro (`0`, `5`, `21.0` sí coincide, `'21'`, `null`, `undefined`) | `0` |

**Rareza congelada**: la comparación es `===`; `'21'` (cadena) devuelve `0` (A-22).

---

## 3. `calcularLinea(cantidad, precio, tipoIva, conRecargo)`

| Aspecto | Contrato |
|---|---|
| Salida | `{ base, cuotaIva, cuotaRecargo }` — objeto nuevo, tres campos siempre presentes |
| Errores | Ninguno con valores normales; una entrada no numérica produce `NaN`, no excepción |
| Mutación | Ninguna |

**Fórmulas** (`services/calculo.js:26-34`):

```text
base         = redondear2(cantidad * precio)
cuotaIva     = redondear2(base * tipoIva / 100)
cuotaRecargo = conRecargo ? redondear2(base * recargoPara(tipoIva) / 100) : 0
```

**Invariantes**:

- El IVA se calcula sobre la base **ya redondeada**, no sobre `cantidad * precio` en bruto.
- `conRecargo` se evalúa por veracidad: `0`, `''`, `null`, `undefined` y `false` desactivan; `1`,
  `'0'`, `[]` y `{}` activan.
- `tipoIva = 0` produce IVA `0` y recargo `0`.

---

## 4. `porcentajeDescuento(baseTotal)`

| Aspecto | Contrato |
|---|---|
| Salida | `0`, `2` o `5` |
| Errores | Ninguno |
| Comparación | Estricta (`>`), con coerción numérica si el valor no es número |

**Umbrales** (`services/calculo.js:39-43`):

| `baseTotal` | Resultado |
|---|---|
| `> 5000` | `5` |
| `> 1000` y `<= 5000` | `2` |
| `<= 1000` | `0` |

**Fronteras congeladas**: `1000` → `0`; `1000.01` → `2`; `5000` → `2`; `5000.01` → `5`
(`test/calculo.test.js:58-71`, casos `frontera-1000` y `frontera-5000` del golden).

---

## 5. `calcularFactura(lineas, cliente)`

| Aspecto | Contrato |
|---|---|
| Entrada | `lineas`: array de `LineaCruda`; `cliente`: objeto, `null` o `undefined` |
| Salida | `{ lineas, base, iva, recargo, total, descuentoPct }` |
| Errores | `lineas` nulo o sin `length` lanza `TypeError`; el motor no lo captura |
| Mutación | No muta `lineas` ni `cliente`; crea objetos nuevos |
| Orden | Una `LineaCalculada` por línea cruda, mismo índice |

**Algoritmo contractual** (`services/calculo.js:48-88`):

1. `conRecargo = cliente && cliente.recargo_equivalencia == 1` (comparación **laxa**).
2. Primera pasada: `baseBruta = redondear2(Σ base de cada línea)`.
3. `descuentoPct = porcentajeDescuento(baseBruta)`.
4. Segunda pasada: si `descuentoPct > 0`,
   `precio = redondear2(precio * (100 - descuentoPct) / 100)`; después se recalcula la línea.
5. Acumulación con `redondear2` tras **cada** línea en `base`, `iva` y `recargo`.
6. `total = redondear2(base + iva + recargo)`.

**Invariantes**: los cuatro de `data-model.md` §2.5. El descuento reduce base, IVA y recargo (A-09), y
se aplica línea a línea, no al total.

**Campos de `LineaCalculada`**: `descripcion`, `cantidad`, `precio`, `tipoIva`, `base`, `cuotaIva`,
`cuotaRecargo`. `precio` es el precio **ya descontado** cuando hay descuento.

---

## 6. `calcularProrrateo(cuota, desde, hasta)`

| Aspecto | Contrato |
|---|---|
| Entrada | `cuota`: número; `desde`/`hasta`: cadenas `YYYY-MM-DD` del **mismo mes** |
| Salida | Número redondeado a 2 decimales |
| Errores | Sin `.split`: `TypeError`; cadena sin guiones: `NaN`. No se captura ni se valida |
| Semántica | Mes comercial de **30 días**; solo se usa el día del mes |

**Fórmula** (`services/calculo.js:95-102`):

```text
dias = parseInt(hasta.día) - parseInt(desde.día) + 1
dias = min(dias, 30)
dias = max(dias, 0)
resultado = redondear2(cuota / 30 * dias)
```

**Casos frontera**: 31 días → 30; días invertidos → 0; mismo día → un día de cuota. No se usa
calendario real ni `Date`.

---

## 7. Fachada `services/calculo.js`

```js
// services/calculo.js — tras la conmutación
module.exports = require('../motor/calculo');
```

| Requisito | Contractual | Comprobación |
|---|---|---|
| Ruta | Se conserva `services/calculo.js` | `require.resolve` |
| API | Exactamente los mismos 5 exports y aridades que el motor | Test de contrato |
| Consumidores | `routes/facturas.js`, `routes/contratos.js` y `scripts/remesa_mensual.js` sin cambios | `git diff --name-only` |
| Identidad | El objeto exportado puede ser el del motor; no se envuelve ni se copia | `require('../services/calculo') === require('../motor/calculo')` es aceptable |
| Punto de entrada antiguo | Sigue siendo el punto de entrada de la aplicación | `require` desde los tres consumidores |

**Nota**: como la fachada reexporta el objeto completo, un export añadido en `motor/` aparecería
también aquí. El test de contrato (exactamente 5 claves y 5 aridades) es la barrera que lo detecta.

---

## 8. Arnés de equivalencia (contrato de verificación)

No es API de producción, pero su forma es contractual para que la evidencia sea reproducible.

| Elemento | Contrato |
|---|---|
| Semilla | `20261101`, fija en `test/helpers/casos-equivalencia.js` |
| Nº de casos | Exactamente **100** |
| Implementaciones | `motor/calculo.js` y `test/referencia/calculo-heredado.js`, ambas requeridas directamente (nunca a través de la fachada) |
| Comparación | Estructural, hoja a hoja con `Object.is`; `-0` distinto de `0`; `NaN` igual a `NaN` |
| Excepciones | Se comparan como resultado: mismo tipo y mismo mensaje |
| Diagnóstico | La primera diferencia se informa con ruta (`$.lineas[2].cuotaIva`) y con el `id` del caso |
| Salida | `100 casos comparados, 0 diferencias` |

---

## 9. Referencia heredada congelada

| Aspecto | Valor |
|---|---|
| Fichero | `test/referencia/calculo-heredado.js` |
| Origen | `services/calculo.js` en el commit `a42865a` |
| Git blob | `c2b175c106fd4b99d6dfdc4925008e6be80ccc1a` |
| SHA-256 | `f289c4f9804d312768a86e0e31e83fa6af37a0cb246527f1b66b8e3c428b9090` |
| Diferencia permitida | Solo el `require`: `'../lib/util'` → `'../../lib/util'` |
| Modificación | **Prohibida**. Si hay que cambiarla, la equivalencia deja de tener sentido. |
| Retirada | Fase posterior aprobada (FR-010), nunca en esta obra |
| Uso en producción | Ninguno: solo la importa el test comparativo |

---

## 10. Qué rompe el contrato

- Redondear el total en lugar de cada línea.
- Calcular el IVA o el recargo sobre la base bruta cuando hay descuento.
- Cambiar `>` por `>=` en los umbrales de descuento.
- Cambiar `==` por `===` en `recargo_equivalencia`.
- Cambiar `===` por `==` en `recargoPara` (haría que `'21'` tuviera recargo y rompería A-22).
- Normalizar `-0` a `0` o convertir `NaN` en `0`.
- Añadir validaciones, valores por defecto o recortes de decimales.
- Añadir, quitar o renombrar exports, o cambiar aridades.
- Sustituir `redondear2` por `toFixed`, `Math.trunc` o cualquier otra fórmula.
