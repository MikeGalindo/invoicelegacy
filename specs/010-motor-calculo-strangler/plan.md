# Implementation Plan: Extracción del motor de cálculo por estrangulamiento

**Branch**: `010-motor-calculo-strangler` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-motor-calculo-strangler/spec.md`

## Summary

Sustituir la implementación de `services/calculo.js` por una nueva en `motor/` sin cambiar un solo
resultado observable. La obra es una **extracción de equivalencia**, no una corrección: el
comportamiento de referencia es el que congelan los 116 characterization tests, el golden master de
12 casos y el propio código heredado, incluidas sus rarezas (A-22, A-23 y el `-0`).

Enfoque técnico: un módulo CommonJS nuevo y puro (`motor/calculo.js`) que exporta las cinco mismas
funciones; un arnés comparativo determinista de 100 casos que ejecuta ambas implementaciones y exige
igualdad campo a campo con semántica `Object.is`; y una fachada de una línea en `services/calculo.js`
que conserva ruta, API y consumidores. La verificación se hace en tres anillos y la retirada del
código heredado queda para una spec posterior.

## Technical Context

**Language/Version**: JavaScript moderno (ES2022: `const`, funciones flecha, parámetros por defecto
donde no alteren firmas) **solo dentro de `motor/`**; CommonJS obligatorio en la frontera. Node.js
**24.19.0** verificado en el entorno. Sin transpilación y sin `type: module`.

**Primary Dependencies**: **Ninguna nueva.** El motor solo reutiliza `lib/util.redondear2`
(`lib/util.js:5-7`) sin modificarlo. Los tests usan exclusivamente `node:test`, `node:assert/strict`,
`node:path` y `node:fs`.

**Storage**: N/A. El módulo es puro: no abre SQLite, no importa `db.js` y no toca `datos/`.

**Testing**: `node:test` + `node:assert/strict` con `TZ=Europe/Madrid`, ejecutado por `npm test`
(`package.json:8`). Sin frameworks ni dobles externos.

**Target Platform**: servidor Linux de oficina con el Node de producción (24.x verificado; `LEEME.txt`
está desactualizado y habla de Node 8 — no se sigue).

**Project Type**: proyecto único: servicio web heredado (Express + EJS) del que se extrae una
librería pura.

**Performance Goals**: la suite completa sigue por debajo de 1 s (línea base medida: 116 tests en
151 ms); los 100 casos comparativos por debajo de 100 ms. Sin IO, así que el coste es despreciable.

**Constraints**: cero cambios observables; cero dependencias nuevas; cero cambios fuera de la
costura; `test/golden/master.json` no se regenera; no se ejecuta la remesa ni se abre la base real;
todo el trabajo es síncrono y determinista.

**Scale/Scope**: 5 funciones, ~90 líneas de motor nuevo, 116 tests existentes, 12 casos de golden
master y 100 casos comparativos generados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Puerta | Principio | Cómo la cumple esta obra | Estado |
|---|---|---|---|
| El comportamiento no cambia sin decisión de negocio | I (`constitution.md:34-59`) | No se implementa A-09, A-11, A-22 ni A-23. La comparación es campo a campo, incluido `-0` y `NaN`. | **PASA** |
| Los tests son el árbitro | II (`:61-91`) | Los 116 tests y el golden master se ejecutan sin modificar ni regenerar. El test comparativo es **aditivo**. | **PASA** |
| Estrangulamiento, un módulo a la vez | III (`:93-121`) | Se toca un solo módulo (`services/calculo.js`) mediante una costura de módulo; el heredado sigue ejecutable como referencia. | **PASA** (ver `DESV-01`) |
| Dependencias justificadas | IV (`:123-151`) | Cero dependencias nuevas y cero actualizaciones; `node:*` cubre todo. | **PASA** |
| Nada retroactivo | V (`:153-174`) | No hay SQL, ni migraciones, ni datos: la obra no puede tocar una factura emitida. | **PASA** |
| Español de España y formatos intactos | VI (`:176-188`) | Documentación, comentarios y tests en español; formatos e identificadores sin cambios. | **PASA** |
| Evidencia obligatoria | Restricciones (`:192-195`) | Cada afirmación del plan y de la spec cita `fichero:líneas` o una ejecución reproducible. | **PASA** |
| Línea base en verde | Flujo de trabajo (`:213-214`) | `npm test` → 116/116 verificado el 2026-11-01 antes de planificar. | **PASA** |

**Re-evaluación tras el diseño (Fase 1)**: sin cambios. El diseño no introduce dependencias, no
amplía el alcance a otros módulos y no requiere ninguna decisión de negocio. La única desviación
(`DESV-01`, incluir `calcularProrrateo`) está registrada y justificada en `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/010-motor-calculo-strangler/
├── plan.md                      # Este fichero
├── research.md                  # Fase 0: decisiones técnicas y alternativas
├── data-model.md                # Fase 1: formas de datos del motor
├── quickstart.md                # Fase 1: guía de validación de los tres anillos
├── contracts/
│   └── api-motor.md             # Fase 1: contrato de las 5 funciones y de la fachada
├── checklists/
│   └── requirements.md          # Calidad de la spec
├── spec.md                      # Especificación funcional
└── tasks.md                     # Fase 2 (/speckit.tasks) — no se crea aquí
```

### Source Code (repository root)

```text
motor/
└── calculo.js                    # NUEVO. Implementación moderna, CJS, 5 exports.

services/
└── calculo.js                    # MODIFICADO. Pasa a fachada:
                                  #   module.exports = require('../motor/calculo');

lib/
└── util.js                       # SIN CAMBIOS. Se consume `redondear2` (`lib/util.js:5-7`).

test/
├── equivalencia-motor.test.js    # NUEVO. Contrato de API + 100 casos comparativos + rarezas.
├── referencia/
│   └── calculo-heredado.js       # NUEVO. Copia congelada del heredado (solo el `require` ajustado).
└── helpers/
    ├── casos-equivalencia.js     # NUEVO. Generador determinista con semilla fija.
    └── motor-como-fachada.js     # NUEVO. Precarga para ejecutar la suite «contra motor/».
```

**Structure Decision**: se conserva la estructura heredada (raíz plana, sin capas nuevas). El motor
vive en `motor/` por exigencia del encargo y queda al mismo nivel que `services/` y `lib/`. La
fachada mantiene la ruta `services/calculo.js`, que es lo que importan
`routes/facturas.js:9`, `routes/contratos.js:7` y `scripts/remesa_mensual.js:11`.

**Ficheros que NO se tocan** (verificación en `git diff --name-only`): `routes/*`, `scripts/*`,
`server.js`, `db.js`, `config.js`, `views/*`, `public/*`, `package.json`, `package-lock.json`,
`test/*.test.js` existentes, `test/golden/*` y `lib/util.js`.

## Fase 0 — Investigación

Resultado en [research.md](./research.md). Resumen de las siete decisiones:

| ID | Decisión | Motivo |
|---|---|---|
| R-01 | Ejecutar la suite «contra `motor/`» con `node --require test/helpers/motor-como-fachada.js --test …`, inyectando el motor en `require.cache` de la fachada. | Verificado en Node 24.19.0: `--require` se propaga a los procesos hijos de `node --test` (2 procesos observados). No modifica ningún test. |
| R-02 | Mantener CommonJS en la frontera; JavaScript moderno solo dentro de `motor/calculo.js`. | `require` síncrono de los consumidores; pasar a ESM obligaría a tocar consumidores. |
| R-03 | Un solo fichero de motor, `motor/calculo.js`. | 90 líneas y cohesión total; partir el fichero abriría costuras innecesarias. |
| R-04 | Reutilizar `lib/util.redondear2`; no duplicarlo. | Duplicar el redondeo crea deriva; extraer `lib/util.js` está fuera de alcance. |
| R-05 | Congelar el heredado en `test/referencia/calculo-heredado.js`. | El anillo (c) debe seguir comparando contra el original **después** de conmutar la fachada. |
| R-06 | Generador determinista `mulberry32` con semilla `20261101`, 100 casos. | Reproducible en cualquier máquina, sin dependencias y con distribución suficiente. |
| R-07 | Comparación estructural con `Object.is` (patrón de `test/golden-master.test.js:11-49`). | `JSON.stringify` convierte `-0` en `0` y `NaN` en `null`, y ocultaría diferencias reales. |

## Fase 1 — Diseño

- [data-model.md](./data-model.md): formas de entrada y salida de las cinco funciones, invariantes y
  ausencia deliberada de validaciones nuevas.
- [contracts/api-motor.md](./contracts/api-motor.md): contrato de las cinco funciones, de la fachada y
  del arnés de equivalencia.
- [quickstart.md](./quickstart.md): comandos y resultados esperados de los tres anillos, antes y
  después de la conmutación.

## Orden de ejecución

El orden no es negociable: la conmutación solo ocurre cuando el anillo (c) demuestra equivalencia.

| Paso | Qué se hace | Comando de verificación | Resultado esperado |
|---|---|---|---|
| 0 | Línea base antes de tocar nada | `npm test` | 116/116 |
| 1 | Crear `motor/calculo.js` con las cinco funciones | — | — |
| 2 | Crear el generador y el test comparativo | `node --test test/equivalencia-motor.test.js` | 100 casos, 0 diferencias |
| 3 | **Anillo (a)** antes de conmutar | `TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/*.test.js` | 117/117 (116 + el comparativo) |
| 4 | **Anillo (b)** antes de conmutar | `TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/golden-master.test.js` | 2/2 y `git diff test/golden/master.json` vacío |
| 5 | Conmutar la fachada | `services/calculo.js` → `module.exports = require('../motor/calculo');` | — |
| 6 | **Anillos (a) y (b)** conmutados | `npm test` | 117/117 y golden 0 diferencias |
| 7 | Comprobar el perímetro | `git diff --name-only` | Solo `motor/`, `services/calculo.js`, `test/equivalencia-motor.test.js`, `test/referencia/`, `test/helpers/`, `test/COBERTURA.md`, `specs/010-…/` |
| 8 | Registrar la evidencia | FR-017 | Comandos, fecha y recuentos en `spec.md` o en el commit |

**Nota sobre el paso 3**: el recuento pasa de 116 a 117 porque se suma el test comparativo nuevo; los
116 existentes deben seguir pasando sin cambios. El criterio de aceptación se refiere a esos 116, no
al total.

## Verificación de los criterios de éxito

| Criterio | Cómo se comprueba |
|---|---|
| SC-001 | `npm test` → 116 existentes en verde (117 con el nuevo), 0 fallos y 0 saltados |
| SC-002 | `git diff --exit-code test/golden/master.json` y los 12 casos comparados campo a campo |
| SC-003 | El test comparativo informa `100 casos, 0 diferencias` |
| SC-004 | `git diff --name-only` limitado a la lista del paso 7 |
| SC-005 | `git diff --exit-code package.json package-lock.json` y ausencia de `require` de paquetes externos |
| SC-006 | `Object.keys()` de motor y fachada = las cinco funciones; aridades 1, 4, 1, 2 y 3 |
| SC-007 | Casos dedicados a A-22, A-23 y `-0` dentro del test de equivalencia |
| SC-008 | Dos ejecuciones del generador con la misma semilla producen los mismos 100 casos |
| SC-009 | Evidencia del paso 8, repetible por un tercero con los comandos de `quickstart.md` |

## Riesgos y mitigaciones

| Riesgo | Mitigación en el diseño |
|---|---|
| La inyección en `require.cache` no cubre algún camino de carga | Se inyecta por ruta resuelta absoluta, igual que `test/helpers/cargar-modulo-con-db.js:5-29`, y el paso 3 se contrasta con el paso 6 (fachada real). |
| El test comparativo se vuelve un «segundo golden» y se ablanda ante un fallo | No tiene valores esperados: compara dos implementaciones vivas. Si falla, no hay nada que «actualizar» salvo el motor nuevo. |
| Duplicar el heredado en `test/referencia/` invita a editarlo | Cabecera de inmutabilidad + hash SHA-256 del original (`f289c4f9…`) registrado en `contracts/api-motor.md`; el diff de esa copia se revisa en el commit. |
| «Modernizar» de paso el redondeo (`toFixed`, `Number.EPSILON`) | FR-006 y SC-007 lo prohíben; el caso `-0.005` lo detecta. |
| El motor importa `Date` o `Math.random` sin querer | Test de pureza sobre `require.cache`: el módulo solo tiene como hijo `lib/util.js`; además se repite una muestra dos veces y debe dar lo mismo. |

## Complexity Tracking

| Violación | Por qué es necesaria | Alternativa más simple rechazada |
|---|---|---|
| `DESV-01`: se incluye `calcularProrrateo`, que `consumidores-motor.md:5-7,161-163` asignaba a la spec 005 y a la decisión A-11. | Instrucción expresa de la sesión de 2026-11-01; es la misma función pura del mismo fichero y ya está cubierta por 7 tests. | Extraer solo cuatro funciones: habría cumplido el documento, pero dejaría `services/calculo.js` a medias y contradiría el encargo literal. No se implementa A-11 ni se toca `routes/contratos.js`, así que no se abre el módulo de contratos. |

No hay otras violaciones: cero dependencias nuevas, cero módulos adicionales abiertos y cero cambios
retroactivos.

## Notas de planificación

- **Ajuste de la spec durante el plan**: `SC-004` se amplió para nombrar el arnés completo (test,
  generador y referencia heredada) y `test/COBERTURA.md`. Sin ese ajuste, el propio arnés que exige
  FR-013 habría incumplido el criterio de perímetro. No cambia ningún requisito funcional.
- **`specs/001-003` siguen sin existir** (`SPEC-PACK.md:229-233`). Este plan asume la decisión `D-M1`
  de la spec: la suite, el golden master y el código heredado son el contrato.
- **La retirada del heredado no forma parte de esta obra** (FR-010). Cuando se apruebe, se eliminarán
  `test/referencia/calculo-heredado.js` y la copia de seguridad que corresponda, en un cambio propio.
- **La fachada no re-exporta campo a campo**, sino el objeto completo. El contrato de cinco claves y
  aridades se protege con un test, de modo que un export añadido en `motor/` no pase inadvertido.
- **No se añade cobertura de rutas HTTP ni de la remesa**: siguen fuera, tal como declara
  `SPEC-PACK.md:352-367`. Esta extracción no las necesita porque la costura está en el límite del
  módulo.
