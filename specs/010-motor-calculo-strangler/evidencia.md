# Evidencia de equivalencia — spec 010

**Feature**: `010-motor-calculo-strangler`
**Criterio**: FR-017 y SC-009 de `spec.md`. Cada fila se puede repetir con el comando indicado.

> Todos los comandos se ejecutan desde la raíz del repositorio. Los que usan fechas llevan
> `TZ=Europe/Madrid`.

---

## 1. Línea base (antes de tocar nada)

| Dato | Valor |
|---|---|
| Comando | `npm test` |
| Fecha | 2026-11-01 |
| Resultado | **116 tests, 116 en verde**, 0 fallos, 0 cancelados, 0 saltados |
| Duración | 128,9 ms |
| Commit de partida | `6f1cfed` |

## 2. Huellas de las implementaciones

| Fichero | Huella |
|---|---|
| `services/calculo.js` heredado, blob Git | `c2b175c106fd4b99d6dfdc4925008e6be80ccc1a` |
| `services/calculo.js` heredado, SHA-256 | `f289c4f9804d312768a86e0e31e83fa6af37a0cb246527f1b66b8e3c428b9090` |
| Commits con ese mismo contenido | `a42865a` y `6f1cfed` |
| `motor/calculo.js` nuevo, SHA-256 | `7a8d4ac605bb1c7490c5df4cdd16b94abfded390ed3c1483b0de81683aebd3cc` |
| `test/referencia/calculo-heredado.js`, SHA-256 | `aa61cf553c530f3d1c4777be78284f7702b79a10f61cb62d27c30405d1e07c38` |

**Nota sobre la copia congelada**: su hash no coincide con el del original porque incorpora la
cabecera de inmutabilidad y el `require('../../lib/util')` ajustado a su carpeta. El cuerpo del código
es idéntico, línea por línea; la única diferencia de código es esa ruta.

## 3. Anillo (a) — suite completa contra `motor/`, antes de conmutar

| Dato | Valor |
|---|---|
| Comando | `TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/*.test.js` |
| Fecha | 2026-11-01 |
| Resultado | **116 tests, 116 en verde**, 0 fallos, 0 cancelados, 0 saltados |
| Duración | 125,1 ms |

Los 116 tests preexistentes pasan con el motor nuevo **sin modificar ni un test**.

## 4. Anillo (b) — golden master sin regenerar, antes de conmutar

| Dato | Valor |
|---|---|
| Comando | `TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/golden-master.test.js` |
| Fecha | 2026-11-01 |
| Resultado | **2 tests, 2 en verde** (12 casos comparados campo a campo) |
| `git diff --exit-code test/golden/master.json` | **Sin diferencias** (código de salida 0) |

## 5. Control de sensibilidad

### 5.1 El mecanismo de precarga no es inerte

Motor falso en `/tmp` (`recargoPara` → `99`, `calcularProrrateo` → `123`) inyectado en
`services/calculo.js` mediante una precarga temporal.

| Ejecución | Resultado |
|---|---|
| `node --require <precarga-falsa> --test test/calculo.test.js` | **2 pasan, 26 fallan** |
| `node --test test/calculo.test.js` | **28 pasan, 0 fallan** |

Los dos que siguen pasando con el motor falso son casos cuyo valor esperado coincide con el valor
absurdo (ceros y `NaN`), no un fallo del mecanismo. Los ficheros temporales se borraron y el
repositorio no se modificó.

### 5.2 El comparador del anillo (c) detecta una desviación real

Mutación controlada en `motor/calculo.js` (`baseTotal > 5000` → `baseTotal >= 5000`), ejecución del
anillo (c) y restauración verificada por hash.

| Paso | Resultado |
|---|---|
| Con la mutación | **Falla**: `caso 4 porcentajeDescuento -> $.valor: heredado 2, nuevo 5` |
| Restauración | SHA-256 idéntico al anterior: `7a8d4ac6…` |
| Sin la mutación | **6 tests, 6 en verde** |

El mensaje señala el caso y la ruta exacta del campo, que es lo que exige FR-013/FR-014.

## 6. Anillo (c) — batería comparativa de 100 casos

| Dato | Valor |
|---|---|
| Comando | `TZ=Europe/Madrid node --test test/equivalencia-motor.test.js` |
| Semilla | `20261101` |
| Casos | **100** |
| Fecha | 2026-11-01 |
| Resultado | **6 tests, 6 en verde**; 100 casos comparados, **0 diferencias** |
| Duración | 72,9 ms |

Cubre además: contrato de API (5 exports y aridades `1, 4, 1, 2, 3`), invariantes del resultado,
no mutación de la entrada, reproducibilidad de la semilla, pureza (único hijo `lib/util.js`) y las
rarezas A-22, A-23, `-0`, `NaN` y las variantes de `recargo_equivalencia`.

## 7. Conmutación de la fachada

| Dato | Valor |
|---|---|
| Cambio | `services/calculo.js` → `module.exports = require('../motor/calculo');` |
| `npm test` posterior | **122 tests, 122 en verde** (116 originales + 6 nuevos), 0 fallos, 0 saltados |
| Duración | 131,2 ms |
| `git diff --exit-code test/golden/master.json` | **Sin diferencias** |
| `require('./services/calculo') === require('./motor/calculo')` | **`true`** |

## 8. Revalidación final (16:42, con la fachada ya conmutada)

| Comprobación | Resultado |
|---|---|
| Anillo (c) | 6/6 en verde, 0 diferencias |
| Anillo (a) con precarga explícita | 122/122 en verde |
| Anillo (b) con precarga explícita | 2/2 en verde |
| `npm test` | 122/122 en verde |

## 9. Perímetro del cambio

| Comando | Resultado |
|---|---|
| `git diff --name-only` | `services/calculo.js` y `specs/010-motor-calculo-strangler/data-model.md` (documentación de la spec) |
| Ficheros nuevos | `motor/`, `test/equivalencia-motor.test.js`, `test/referencia/`, `test/helpers/casos-equivalencia.js`, `test/helpers/motor-como-fachada.js`, `test/COBERTURA.md` (actualizado), `specs/010-…/evidencia.md`, `specs/010-…/tasks.md` |
| Tests existentes modificados | **Ninguno** (`git diff --name-only test/*.test.js test/golden/` vacío) |
| `git diff --exit-code package.json package-lock.json test/golden/master.json lib/util.js routes/ scripts/ views/ public/ db.js config.js server.js` | **Sin cambios** |

## 10. Conclusión

Los tres anillos están verdes y el perímetro se limita a la costura del motor. No se ha corregido
ninguna anomalía, no se ha regenerado el golden master, no se ha modificado ningún consumidor y no se
ha añadido ninguna dependencia. La equivalencia queda demostrada por comparación directa contra la
copia congelada del heredado, no solo por la red existente.
