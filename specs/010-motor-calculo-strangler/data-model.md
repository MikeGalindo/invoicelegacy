# Modelo de datos: motor de cálculo

**Feature**: `010-motor-calculo-strangler`
**Fecha**: 2026-11-01
**Alcance**: formas de dato en memoria que atraviesan las cinco funciones del motor. **No hay
persistencia**: el motor no abre la base de datos, no escribe ficheros y no conoce entidades de
negocio como factura, cliente o contrato. Los nombres de campo son los del código heredado y **no se
renombran**.

> El comportamiento asociado a cada campo está congelado por los 116 tests y por
> `test/golden/master.json`. Este documento describe lo que hay, no lo que debería haber.

---

## 1. Diagrama de flujo de datos

```text
Cliente ─┐
         ├─► calcularFactura(lineas, cliente) ─► ResultadoFactura
LineaCruda ─┘                                        │
                                                     └─► LineaCalculada (0..n)

(cantidad, precio, tipoIva, conRecargo) ─► calcularLinea ─► CuotaLinea
tipoIva ─────────────────────────────────► recargoPara ───► número
baseTotal ───────────────────────────────► porcentajeDescuento ─► 0 | 2 | 5
(cuota, desde, hasta) ───────────────────► calcularProrrateo ──► número
```

Ninguna función lee reloj, red, base de datos ni estado global. Todas son deterministas y no mutan
sus argumentos.

---

## 2. Entidades

### 2.1 `LineaCruda`

Entrada de una línea de factura, tal como llega desde la ruta o desde la remesa.

| Campo | Tipo observado | Obligatorio | Notas |
|---|---|---|---|
| `descripcion` | cualquiera | No | Se copia sin transformar en `LineaCalculada.descripcion` (`services/calculo.js:73`). |
| `cantidad` | número, cadena o `undefined` | No | Se multiplica directamente por `precio`; sin normalización (`:27`). El repositorio documenta esa rareza en A-14 y en `contradiccion-09`. |
| `precio` | número, cadena o `undefined` | No | Igual que `cantidad`; sin normalización. |
| `tipoIva` | número o cadena | No | `recargoPara` compara con `===`, así que `'21'` da recargo 0 aunque el IVA sí se calcule (A-22, `test/calculo.test.js:26-30`). |

**Validaciones del motor**: **ninguna**. No se añaden comprobaciones de tipo, rango ni obligatoriedad.
Un valor ausente o inválido produce `NaN` o `undefined` exactamente como hoy.

### 2.2 `Cliente`

| Campo | Tipo observado | Obligatorio | Notas |
|---|---|---|---|
| `recargo_equivalencia` | número o cadena | No | Se activa con `cliente && cliente.recargo_equivalencia == 1` (`services/calculo.js:49`): comparación **laxa**, por lo que `1` y `'1'` activan recargo, y `2`, `'0'`, `null` o `undefined` no (`test/calculo.test.js:199-219`). |
| Otros campos | cualquiera | No | Ignorados; el motor no los lee. |

El cliente completo puede ser `null` o `undefined`; en ese caso no hay recargo (`:49`).

### 2.3 `CuotaLinea`

Salida de `calcularLinea`. Objeto nuevo en cada llamada.

| Campo | Tipo | Invariante |
|---|---|---|
| `base` | número | `redondear2(cantidad * precio)`; puede ser `NaN`, `-0` o negativo. |
| `cuotaIva` | número | `redondear2(base * tipoIva / 100)`, calculado **sobre la base ya redondeada**. |
| `cuotaRecargo` | número | `0` si `conRecargo` es falso; si no, `redondear2(base * recargoPara(tipoIva) / 100)`. |

Los tres campos están siempre presentes, también cuando valen `0` o `NaN`.

### 2.4 `LineaCalculada`

Elemento de `ResultadoFactura.lineas`. Conserva el orden de entrada.

| Campo | Tipo | Procedencia |
|---|---|---|
| `descripcion` | cualquiera | Copia literal de la línea cruda. |
| `cantidad` | cualquiera | Copia literal. |
| `precio` | número | Precio original o, si hay descuento, `redondear2(precio * (100 - dto) / 100)` (`:69`). |
| `tipoIva` | cualquiera | Copia literal. |
| `base` | número | Base de la línea ya descontada y redondeada. |
| `cuotaIva` | número | IVA sobre esa base. |
| `cuotaRecargo` | número | Recargo sobre esa base. |

**Invariante de orden**: se emite una `LineaCalculada` por cada `LineaCruda`, en el mismo índice, con
el mismo número de elementos.

### 2.5 `ResultadoFactura`

Salida de `calcularFactura`. Objeto nuevo; no se reutiliza ni se muta entre llamadas.

| Campo | Tipo | Invariante |
|---|---|---|
| `lineas` | `LineaCalculada[]` | Una por línea cruda, mismo orden. |
| `base` | número | Suma acumulada con `redondear2` tras cada línea (`:81`). |
| `iva` | número | Suma acumulada con `redondear2` tras cada línea (`:82`). |
| `recargo` | número | Suma acumulada con `redondear2` tras cada línea (`:83`). |
| `total` | número | `redondear2(base + iva + recargo)` sobre los totales ya acumulados (`:86`). |
| `descuentoPct` | `0`, `2` o `5` | Calculado sobre la base **bruta** (sin descuento) antes de aplicar el descuento (`:60-61`). |

**Invariantes comprobables**:

1. `total === redondear2(base + iva + recargo)` para cualquier entrada.
2. `base === redondear2(Σ lineas[i].base)`, e igual para `iva` y `recargo`.
3. El resultado **no** se obtiene redondeando el total al final: el redondeo es por línea
   (`services/calculo.js:3-7`).
4. Una entrada con cero líneas produce `{ lineas: [], base: 0, iva: 0, recargo: 0, total: 0,
   descuentoPct: 0 }`.

### 2.6 `EntradaProrrateo`

| Campo | Tipo | Formato | Notas |
|---|---|---|---|
| `cuota` | número | — | Importe mensual completo. |
| `desde` | cadena | `YYYY-MM-DD` | Solo se usa el día (`split('-')[2]`); el mes y el año se ignoran (`:96`). |
| `hasta` | cadena | `YYYY-MM-DD` | Debe caer en el mismo mes por contrato de uso; el motor no lo comprueba. |

**Salida**: número redondeado a 2 decimales con la fórmula
`redondear2(cuota / 30 * dias)`, donde `dias = d2 - d1 + 1`, con tope de 30 y mínimo de 0
(`services/calculo.js:95-102`). El mes siempre tiene 30 días: es prorrateo comercial, no calendario.

**Errores**: una cadena sin guiones produce `NaN`; un valor sin `.split` lanza `TypeError`. Ambos
comportamientos se reproducen sin cambios.

### 2.7 `CasoEquivalencia` (solo arnés de pruebas)

Envoltorio que genera `test/helpers/casos-equivalencia.js`. No forma parte del dominio.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | número | 1 a 100, determinista con la semilla. |
| `lineas` | `LineaCruda[]` | 0 a 4 líneas. |
| `cliente` | `Cliente` o `null` | Variantes de `recargo_equivalencia`. |
| `conRecargo` | booleano | Para las llamadas sueltas a `calcularLinea`. |
| `cantidad` | cualquiera | Para las llamadas sueltas a `calcularLinea`. |
| `precio` | cualquiera | Para las llamadas sueltas a `calcularLinea`. |
| `tipoIva` | cualquiera | Para las llamadas sueltas a `recargoPara`. |
| `baseTotal` | número | Para `porcentajeDescuento`, incluida la frontera 1.000/5.000. |
| `prorrateo` | `{ cuota, desde, hasta }` | Incluye casos válidos y malformados. |

---

## 3. Reglas de validación

**Ninguna añadida.** Es una decisión de la spec (FR-018, FR-019) y del Principio I:

- No se normalizan `cantidad` ni `precio` (A-14, A-16).
- No se rechaza un `tipoIva` en cadena (A-22).
- No se normaliza el cero negativo (A-23).
- No se valida que `desde`/`hasta` estén en el mismo mes ni que sean fechas reales.
- No se valida que la factura tenga al menos una línea: eso vive en la ruta, no en el motor.

Cualquier validación nueva cambiaría el resultado de entradas que hoy producen `NaN`, `-0` o una
excepción, y rompería la equivalencia.

---

## 4. Transiciones de estado

No aplica: el motor no tiene estado, no persiste nada y no conoce ciclos de vida. Cada llamada es
independiente y su salida depende solo de sus argumentos.

---

## 5. Relación con el contrato y con la verificación

- El contrato de llamada (firmas, campos y errores) está en
  [contracts/api-motor.md](./contracts/api-motor.md).
- Los invariantes de §2.5 se comprueban en `test/equivalencia-motor.test.js` sobre los 100 casos y,
  de forma indirecta, en los 12 casos del golden master.
- `test/referencia/calculo-heredado.js` produce exactamente estas mismas formas; si alguna difiere,
  el anillo (c) falla indicando la ruta del campo.
