# Investigación (Fase 0): extracción del motor de cálculo

**Feature**: `010-motor-calculo-strangler`
**Fecha**: 2026-11-01
**Entrada**: [spec.md](./spec.md) y [plan.md](./plan.md)

Esta investigación resuelve las incógnitas técnicas del plan. No decide comportamiento: todas las
decisiones de comportamiento están congeladas por la suite y el golden master.

---

## Contexto verificado

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Versión de Node del entorno | **v24.19.0** | `node --version` |
| Línea base de tests | **116/116 en verde**, 0 fallos, 0 saltados | `npm test`, 2026-11-01 |
| Reparto de los 116 tests | 28 calculo + 17 reglas + 17 util + 11 numeracion + 24 anomalias + 17 contradicciones + 2 golden | `grep -c "^test(" test/*.test.js` |
| Dependencias del motor heredado | Una sola: `lib/util` (`services/calculo.js:9`) | Lectura del fichero |
| Consumidores de producción | `routes/facturas.js:9,66`; `routes/contratos.js:7,39`; `scripts/remesa_mensual.js:11,55` | `consumidores-motor.md:228-241` |
| El heredado no usa IO | Sin `Date`, `Math.random`, `process`, `fetch`, `db.`, `fs.`, `setTimeout` | `consumidores-motor.md:219-227` |
| Huella del heredado | `git hash-object` = `c2b175c106fd4b99d6dfdc4925008e6be80ccc1a`; SHA-256 = `f289c4f9804d312768a86e0e31e83fa6af37a0cb246527f1b66b8e3c428b9090` | `git rev-parse --short HEAD` = `a42865a` |

---

## R-01 · Cómo ejecutar la suite «contra `motor/`» sin modificar los tests

**Decisión**: ejecutar la suite con un módulo de precarga:

```bash
TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/*.test.js
```

El helper resuelve la ruta absoluta de `services/calculo.js` y escribe en `require.cache` una entrada
cuyo `exports` es el módulo `motor/calculo.js`, **antes** de que ningún test lo importe. Es el mismo
patrón que ya usa el repositorio para doblar `db.js`
(`test/helpers/cargar-modulo-con-db.js:5-29`).

**Rationale**:

- No modifica ni una línea de `test/*.test.js` (FR-011) ni de `test/golden/flujo-central.js`, que
  importa la fachada en `:4`.
- Es reversible y no deja rastro: el helper solo vive durante el proceso de test.
- Funciona también con el golden master, porque `test/golden/flujo-central.js:4` resuelve la misma
  ruta.

**Experimento realizado** (2026-11-01): se creó un fichero de sonda que escribe en `stderr` y se
ejecutó `node --require /tmp/probe-speckit.js --test test/util.test.js`. Resultado: **2 líneas**, una
del proceso padre (`argv="test/util.test.js"`) y otra del hijo
(`argv="/…/test/util.test.js"`, `pid` distinto). Conclusión: **`--require` se propaga a los procesos
hijos de `node --test`**, que es la condición que hacía falta.

**Experimento de inyección** (2026-11-01): se sustituyó `services/calculo.js` en `require.cache` por
un motor falso que devuelve valores absurdos (`recargoPara()` → `99`, `calcularProrrateo()` → `123`)
y se ejecutó `test/calculo.test.js`:

| Ejecución | Resultado |
|---|---|
| `node --require /tmp/preload-falso.js --test test/calculo.test.js` | **2 pasan, 26 fallan** |
| `node --test test/calculo.test.js` | **28 pasan, 0 fallan** |

Conclusión: la inyección **surte efecto real** sobre el módulo que consumen los tests; no es una
propagación inerte de la bandera. Los dos tests que siguen pasando con el motor falso son casos cuyo
resultado esperado coincide con el valor absurdo (ceros y `NaN`), no un fallo del mecanismo.

**Alternativas consideradas**:

| Alternativa | Por qué se rechaza |
|---|---|
| Conmutar la fachada antes de verificar | Convierte el anillo (a) en una tautología y adelanta el cambio irreversible antes de tener el (c). |
| Copia desechable del repositorio en `/tmp` con la fachada ya conmutada | Válida como refuerzo, pero no da la evidencia «antes de conmutar» sin duplicar el árbol y arriesgar rutas relativas (`config.RUTA_BD`, `AGENTS.md`). Se conserva como comprobación manual opcional. |
| `--experimental-loader` / `module.register` | API experimental, más superficie y no aporta nada sobre `require.cache` para CommonJS. |
| `proxyquire` u otro doble | Dependencia nueva: prohibida por el Principio IV sin aprobación escrita. |
| Variable de entorno leída por la fachada | Obligaría a que el código de producción conociera el modo de prueba. Peor: contamina la costura. |

---

## R-02 · Formato de módulo

**Decisión**: CommonJS en la frontera (`module.exports` / `require`), con sintaxis moderna dentro de
`motor/calculo.js` (`const`, funciones flecha, parámetros por defecto donde no cambien `Function.length`
observable en las cinco exportadas).

**Rationale**: los tres consumidores usan `require` síncrono y la fachada debe seguir siéndolo. Un
módulo ESM exigiría `import()` asíncrono o un interop, y ambos cambian la forma de consumo (FR-007).
La modernización de sintaxis se limita a la costura, como permite `constitution.md:186-188`.

**Alternativas consideradas**: ESM con `"type": "module"` (rompe `require` de los consumidores);
paquete dual (duplica superficie y riesgo de divergencia); transpilación (dependencia y build nuevos).

---

## R-03 · Estructura del módulo nuevo

**Decisión**: un único fichero, `motor/calculo.js`, con las cinco funciones y un helper privado si
hiciera falta. Nada de `index.js` intermedio.

**Rationale**: ~90 líneas y una sola responsabilidad. Un `index.js` añadiría un salto de resolución
sin valor. La carpeta `motor/` la exige el encargo y deja sitio a futuras extracciones sin reabrir
esta.

**Alternativas consideradas**: `motor/index.js` (salto innecesario); varios ficheros por función
(costuras artificiales y más superficie de `require`); mantener el código dentro de `services/`
(incumple el encargo y no crea costura visible).

---

## R-04 · Redondeo: reutilizar o duplicar

**Decisión**: `const util = require('../lib/util');` y usar `util.redondear2` en las cinco funciones
que lo necesiten. `lib/util.js` **no se modifica**.

**Rationale**: `redondear2` es `Math.round(x * 100) / 100` (`lib/util.js:5-7`) y es la fuente de la
equivalencia. Duplicarlo crea dos verdades y riesgo de deriva; extraerlo a `motor/` abriría el módulo
`lib/util.js`, que está fuera de alcance y afecta a seis consumidores (`consumidores-motor.md:189`).
La propia guía del repositorio lo dice: «No extraer a la vez `lib/util.js`; `redondear2` se queda
donde está y se consume igual» (`consumidores-motor.md:164`).

**Alternativas consideradas**: copia local de `redondear2` (deriva); extraer `lib/util.js` (segundo
módulo, prohibido por el Principio III); `toFixed` (semántica distinta para negativos y `-0`).

---

## R-05 · Referencia heredada para el anillo (c)

**Decisión**: congelar una copia del heredado en `test/referencia/calculo-heredado.js`, con **una sola
diferencia** respecto al original: el `require` pasa de `'../lib/util'` a `'../../lib/util'` para
compensar la profundidad de la carpeta. Cabecera que declara su inmutabilidad y su origen
(`services/calculo.js` en `a42865a`, SHA-256 `f289c4f9…`).

**Rationale**: después de conmutar la fachada, `require('../services/calculo')` ya devuelve el motor
nuevo. Sin una copia congelada, el test comparativo dejaría de comparar nada y se convertiría en un
test que se compara consigo mismo. FR-010 exige que el heredado siga disponible y ejecutable durante
la verificación.

**Alternativas consideradas**:

| Alternativa | Por qué se rechaza |
|---|---|
| `git show a42865a:services/calculo.js` en el test | Acopla los tests a Git y a un hash; el runner dejaría de ser autónomo y fallaría en un export sin `.git`. |
| `services/calculo.heredado.js` | Mete una segunda implementación en el árbol de producción y hace que `SC-004` («solo el motor y la fachada») sea falso. |
| Golden de salidas en vez de código | No cumple «ejecuta ambas implementaciones»: compararía contra una foto, no contra el heredado. |

---

## R-06 · Generador determinista de casos

**Decisión**: PRNG `mulberry32` con semilla fija **`20261101`** (fecha de la sesión), implementado en
`test/helpers/casos-equivalencia.js`, generando **exactamente 100 casos**.

**Rationale**: `mulberry32` son seis líneas, no depende de nada y es reproducible bit a bit en
cualquier máquina y versión de Node. La semilla queda en el control de versiones (FR-016) y el test
comprueba que dos ejecuciones producen los mismos casos (SC-008). Cien casos cubren con holgura la
cobertura mínima de FR-015 sin volver lento el test.

**Alternativas consideradas**: `Math.random` (no reproducible: prohibido por FR-016); tabla fija de
casos (no es «generada» y crece a mano); LCG clásico (peor distribución en los bits bajos);
`seedrandom` (dependencia nueva).

**Cobertura mínima que respeta FR-015**: importes y cantidades decimales; tipos de IVA
`21, 10, 4, 16, 18, 8, 7, 0, 5, -1`, además de `'21'`, `null` y `undefined`; clientes `null`,
`undefined`, `{recargo_equivalencia: 0}`, `{…: 1}`, `{…: '1'}`, `{…: '0'}` y `{…: 2}`; 0, 1 y varias
líneas; fronteras 1.000/5.000 con valores `-0.01`, exacto y `+0.01`; prorrateos con 31 días, días
invertidos, mismo día, febrero y 2028 bisiesto; fechas malformadas para comprobar que la excepción
también es equivalente.

---

## R-07 · Comparación exacta campo a campo

**Decisión**: recorrido estructural recursivo con `Object.is` en las hojas, siguiendo el patrón ya
probado de `test/golden-master.test.js:11-49` (`primeraDiferencia`). La batería captura también los
lanzamientos: cada invocación se envuelve y se compara `{ok:true, valor}` o
`{ok:false, nombre, mensaje}`.

**Rationale**:

- `Object.is` distingue `-0` de `0` (FR-014, A-23) y considera `NaN` igual a `NaN` (evita falsos
  positivos con los casos que producen `NaN`).
- Devuelve la **ruta exacta** del campo que difiere (`$.lineas[2].cuotaIva`), que es lo que hace
  diagnosticable un fallo, igual que el golden master.
- Es el patrón que el equipo ya sabe leer; no se introduce una utilidad nueva de comparación.

**Alternativas consideradas**: `JSON.stringify` (pierde `-0` y `NaN`, prohibido por FR-014);
`assert.deepStrictEqual` a secas (semántica correcta, pero el mensaje no señala el campo ni el caso);
comparación con tolerancia (prohibida: la igualdad es exacta).

---

## R-08 · Pureza del motor como propiedad verificable

**Decisión**: comprobar la pureza en tiempo de ejecución, no leyendo el texto. Tras requerir el
motor, su entrada en `require.cache` debe tener **un único hijo**: `lib/util.js`. Además, se repite
una muestra dos veces y debe dar exactamente lo mismo.

**Rationale**: una comprobación por texto se rompe con un comentario o un reformateo, y no prueba
nada sobre lo que se carga de verdad. El grafo de módulos sí prueba que no hay `db.js`, `fs`, `http`
ni `process` en la ruta de carga. La determinismo por repetición cubre `Date` y `Math.random`
indirectamente.

**Alternativas consideradas**: `grep` sobre el fuente (frágil); instrumentar `Date`/`Math.random`
globales (invasivo y con riesgo de afectar a otros tests del mismo proceso).

---

## Incógnitas del contexto técnico: estado

| Incógnita | Estado |
|---|---|
| Versión de Node objetivo | **Resuelta**: 24.19.0 verificado; sin características posteriores a ES2022. |
| Formato de módulo | **Resuelta**: CommonJS (R-02). |
| Cómo se ejecuta la suite contra el motor nuevo | **Resuelta**: precarga con `--require` (R-01), verificada empíricamente. |
| Dónde vive la referencia heredada | **Resuelta**: `test/referencia/calculo-heredado.js` (R-05). |
| Cómo se genera la batería | **Resuelta**: `mulberry32`, semilla `20261101`, 100 casos (R-06). |
| Cómo se compara | **Resuelta**: `Object.is` estructural (R-07). |
| Almacenamiento / integraciones externas | **No aplica**: módulo puro, sin BD ni red. |

No quedan `NEEDS CLARIFICATION`.
