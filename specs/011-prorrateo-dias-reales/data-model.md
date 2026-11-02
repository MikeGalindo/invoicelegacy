# Modelo de datos: prorrateo por días reales

**Feature**: `011-prorrateo-dias-reales`
**Fecha**: 2026-11-02
**Alcance**: forma de la entrada y de la salida de `calcularProrrateo`. **No hay persistencia**: la
función no abre la base de datos, no escribe ficheros y no conoce contratos ni facturas. Los nombres
de campo y de parámetros son los del código existente y **no se renombran**.

> Este documento describe la forma del dato tras el delta. El comportamiento está fijado por la
> decisión A-11/D-03 y por los tests de la spec 011. No es una propuesta de rediseño.

---

## 1. Diagrama de flujo de datos

```text
(cuota, desde, hasta)
        │
        ├─ cuota: importe mensual completo
        ├─ desde: YYYY-MM-DD, inicio del periodo (mes que se factura)
        └─ hasta: YYYY-MM-DD, fin del periodo (mismo mes por contrato de uso)
        │
        ▼
calcularProrrateo
        │
        ├─ diasMes    = util.diasDelMes(desde)      // 28, 29, 30 o 31
        ├─ d1, d2     = día de `desde`, día de `hasta`
        ├─ dias       = d2 - d1 + 1
        ├─ si dias<0 → dias = 0
        └─ resultado  = util.redondear2(cuota / diasMes * dias)
        │
        ▼
número con dos decimales (puede ser 0, negativo, -0 o NaN)
```

No se lee reloj, red, base de datos ni estado global. La función es determinista y no muta sus
argumentos.

---

## 2. Entidad `EntradaProrrateo`

| Campo | Tipo observado | Obligatorio | Notas |
|---|---|---|---|
| `cuota` | número | No se valida | Importe mensual completo. Puede ser 0, negativo o `NaN`; se conserva el signo y la proporción. |
| `desde` | cadena `YYYY-MM-DD` | No se valida | Solo se usa el día (`split('-')[2]`) y el mes para `diasDelMes`. Si no tiene `.split`, lanza `TypeError`. |
| `hasta` | cadena `YYYY-MM-DD` | No se valida | Debe caer en el mismo mes por contrato de uso; la función no lo comprueba. |

**Origen de los datos**:

| Consumidor | `cuota` | `desde` | `hasta` | Evidencia |
|---|---|---|---|---|
| Pantalla de baja | `contrato.cuota` | `fechaBaja.slice(0, 8) + '01'` (día 1 del mes) | `fechaBaja` | `routes/contratos.js:37-39` |
| Remesa | `co.cuota` | `max(co.fecha_alta, primerDia)` | `min(co.fecha_baja, ultimoDia)` | `scripts/remesa_mensual.js:45-51` |
| Test / arnés | Valor fijo | Cadena fija | Cadena fija | `test/calculo.test.js`, `test/contradicciones.test.js` |

La remesa **no llama** a `calcularProrrateo`: replica la misma fórmula inline. La igualdad se exige
para los mismos `desde`/`hasta` (ver `research.md` R-06 y R-08).

---

## 3. Entidad `SalidaProrrateo`

| Aspecto | Valor |
|---|---|
| Tipo | `number` |
| Redondeo | `util.redondear2`, dos decimales |
| Signo | Conserva el signo de `cuota`; una cuota negativa da un resultado negativo |
| Casos especiales | `NaN` se propaga; `-0` se conserva si el redondeo lo produce |
| Unidad | Euros, no céntimos |
| Mutación | Ninguna: no recibe ni devuelve objetos |

**Invariantes comprobables**:

1. **Mes completo**: si `desde` es el día 1 y `hasta` el último día real del mes, el resultado es
   exactamente `redondear2(cuota)` para 28, 29, 30 y 31 días.
2. **Proporcionalidad**: para un mismo mes y una misma `cuota`, el resultado es proporcional a
   `dias / diasMes` antes del redondeo.
3. **Día 31**: en un mes de 31 días, `hasta` el día 31 cuenta 31 días; no se recorta a 30.
4. **Días invertidos**: si `hasta < desde`, `dias` se fuerza a 0 y el resultado es `0` (o `-0` si la
   cuota es negativa y el redondeo lo produce).
5. **Sin tope superior**: no existe ningún recorte a 30 ni a `diasMes`; un día imposible puede
   producir más de la cuota. Es deuda técnica preexistente, no una regresión del delta.
6. **Determinismo**: la misma terna de entrada produce siempre el mismo número.

---

## 4. Tabla de meses y resultados de referencia

Con cuota de 90 € y periodo del día 1 al último día del mes:

| Mes | Días reales | Fórmula | Resultado |
|---|---|---|---|
| Febrero 2026 | 28 | `90 / 28 * 28` | 90,00 |
| Febrero 2028 (bisiesto) | 29 | `90 / 29 * 29` | 90,00 |
| Abril 2026 | 30 | `90 / 30 * 30` | 90,00 |
| Marzo 2026 | 31 | `90 / 31 * 31` | 90,00 |

Periodos parciales:

| Caso | Días | Fórmula | Resultado |
|---|---|---|---|
| 60 €, 16–30 julio 2026 | 15 de 31 | `60 / 31 * 15` | **29,03** |
| 60 €, 1–30 julio 2026 | 30 de 31 | `60 / 31 * 30` | 58,06 |
| 60 €, 16–31 julio 2026 | 16 de 31 | `60 / 31 * 16` | 30,97 |
| 60 €, mismo día en julio | 1 de 31 | `60 / 31 * 1` | 1,94 |
| 90 €, 1–15 marzo 2026 | 15 de 31 | `90 / 31 * 15` | 43,55 |
| 90 €, 1–15 febrero 2026 | 15 de 28 | `90 / 28 * 15` | 48,21 |
| 90 €, 1–15 febrero 2028 | 15 de 29 | `90 / 29 * 15` | 46,55 |

---

## 5. Reglas de validación

**Ninguna añadida.** Es una decisión de la spec (FR-012) y del Principio I:

- No se valida que `desde` y `hasta` sean fechas reales.
- No se valida que estén en el mismo mes.
- No se valida que `hasta >= desde`; se aplica el mínimo 0.
- No se valida que la cuota sea positiva, finita o numérica.
- No se normaliza `-0` a `0` ni `NaN` a 0.
- No se añade un tope a `diasMes` ni a 30.

Cualquier validación nueva cambiaría el resultado de entradas que hoy producen `NaN`, `-0`, una
excepción o un importe superior a la cuota, y rompería el alcance acotado por A-11.

---

## 6. Transiciones de estado

No aplica: la función no tiene estado, no persiste nada y no conoce ciclos de vida. Cada llamada es
independiente y su salida depende solo de sus argumentos.

---

## 7. Relación con el contrato y con la verificación

- El contrato de llamada (firmas, fórmula, errores y consumidores) está en
  [contracts/calcular-prorrateo.md](./contracts/calcular-prorrateo.md).
- Los invariantes de §3 se comprueban en `test/calculo.test.js`, `test/reglas-negocio.test.js`,
  `test/contradicciones.test.js` y `test/anomalias.test.js`.
- La paridad con la remesa se comprueba comparando esta salida con la fórmula inline replicada
  (`test/contradicciones.test.js:20-31`) y con la comprobación por texto de
  `scripts/remesa_mensual.js:43-51`.
- El golden master conserva `prorrateoComercial` y `prorrateoDiasReales` como dos campos; tras el
  delta deben coincidir en los tres casos con prorrateo (`test/golden/master.json:504-505`,
  `:558-559`, `:612-613`).
