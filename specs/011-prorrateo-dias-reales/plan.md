# Implementation Plan: Prorrateo único por días reales

**Branch**: `011-prorrateo-dias-reales` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-prorrateo-dias-reales/spec.md`

## Summary

Sustituir la convención de prorrateo de 30 días fijos por la de **días reales del mes** en la única
función que aún la aplica, `calcularProrrateo` de `motor/calculo.js`, para que la baja de contrato y
la remesa den el mismo importe para el mismo periodo. Es un delta de comportamiento autorizado por
**A-11/D-03** (Paco y Puri, 2026-10-30), no una extracción ni un refactor.

Enfoque técnico: cambiar una sola fórmula en el motor (`cuota / diasMes * diasServicio`, sin tope de
30 y con mínimo 0), actualizar los cuatro ficheros de test que congelan la convención antigua,
excluir `calcularProrrateo` del arnés de equivalencia del anillo C (única divergencia intencionada
respecto al heredado), regenerar el golden master con la decisión citada y demostrar la paridad con
la fórmula inline de la remesa sin ejecutar la remesa real. Cero cambios en rutas, scripts,
fachada, dependencias o datos históricos.

## Technical Context

**Language/Version**: JavaScript moderno (ES2022) dentro de `motor/`; CommonJS obligatorio en la
frontera. Node.js **24.19.0** verificado en el entorno. Sin transpilación y sin `type: module`.

**Primary Dependencies**: **Ninguna nueva.** Se reutiliza `lib/util.redondear2` (`lib/util.js:5-7`) y
`lib/util.diasDelMes` (`lib/util.js:35-39`) sin modificar `lib/util.js`. Los tests usan solo
`node:test`, `node:assert/strict`, `node:path` y `node:fs`.

**Storage**: N/A. El motor es puro: no abre SQLite, no importa `db.js`, no toca `datos/` y no
conoce facturas ni contratos.

**Testing**: `node:test` + `node:assert/strict` con `TZ=Europe/Madrid`, ejecutado por `npm test`
(`package.json:8`). Sin frameworks ni dobles externos.

**Target Platform**: servidor Linux de oficina con el Node de producción (24.x verificado).
`LEEME.txt` está desactualizado y habla de Node 8; no se sigue.

**Project Type**: servicio web heredado (Express + EJS) con un motor de cálculo puro extraído. Este
delta toca únicamente el motor y su red de tests.

**Performance Goals**: despreciable. Una división y un redondeo más por llamada; la suite completa
sigue por debajo de 1 s (línea base medida: **122 tests en 131,6 ms**, 2026-11-02).

**Constraints**:
- Cero cambios observables fuera de `calcularProrrateo`.
- Cero cambios en `routes/contratos.js`, `scripts/remesa_mensual.js` y `services/calculo.js`.
- Cero dependencias nuevas y cero cambios en `package*.json`.
- Cero retroactividad: ni SQL, ni migraciones, ni recalculación de facturas.
- El golden master se regenera **solo** con la decisión A-11 citada y un `diff` explicado.
- No se ejecuta `scripts/remesa_mensual.js` ni se abre la base de datos real.

**Scale/Scope**: 1 función modificada, 4 ficheros de test actualizados, 1 arnés de equivalencia
ajustado, 3 casos de golden master afectados (de 12), 1 documento de registro actualizado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Puerta | Principio | Cómo la cumple esta obra | Estado |
|---|---|---|---|
| El comportamiento no cambia sin decisión de negocio | I (`constitution.md:34-59`) | A-11/D-03 (Paco y Puri, 2026-10-30) autoriza exactamente «prorrateo por días reales del mes». El alcance se limita a `calcularProrrateo`; nada más cambia. | **PASA** |
| Los tests son el árbitro | II (`:61-91`) | Los cuatro tests que congelan la convención antigua se sustituyen con la decisión citada. El golden master se regenera con `Decisión: A-11 — Paco y Puri, 2026-10-30` y el `diff` se explica caso por caso. | **PASA** (condicionado a FR-021) |
| Estrangulamiento, un módulo a la vez | III (`:93-121`) | Se toca un solo módulo de producción (`motor/calculo.js`) y su red de tests. No se abre `routes/`, `scripts/`, `lib/` ni `services/`. | **PASA** |
| Dependencias justificadas | IV (`:123-151`) | Cero dependencias nuevas, cero actualizaciones y cero cambios en `package*.json`; `node:*` y `lib/util.js` cubren todo. | **PASA** |
| Nada retroactivo | V (`:153-174`) | No hay SQL, migraciones ni acceso a datos. Las facturas históricas quedan intactas por construcción. | **PASA** |
| Español de España y formatos intactos | VI (`:176-188`) | Documentación, tests y comentarios en español; formatos de fecha e importe sin cambios; identificadores existentes conservados. | **PASA** |
| Evidencia obligatoria | Restricciones (`:192-195`) | Cada afirmación cita `fichero:líneas` o una ejecución reproducible. La línea base es 122/122 (2026-11-02). | **PASA** |
| Línea base en verde | Flujo de trabajo (`:213-214`) | `npm test` → **122/122**, 0 fallos, 0 saltados, verificado antes de planificar. | **PASA** |

**Re-evaluación tras el diseño (Fase 1)**: sin cambios. El diseño no añade dependencias, no amplía
el alcance a otros módulos y no requiere ninguna decisión adicional. La única divergencia
intencionada con el heredado (`calcularProrrateo` en el anillo C) queda documentada y acotada en
`research.md` R-04 y en `contracts/calcular-prorrateo.md`.

## Project Structure

### Documentation (this feature)

```text
specs/011-prorrateo-dias-reales/
├── plan.md                          # Este fichero
├── research.md                      # Fase 0: decisiones técnicas y alternativas
├── data-model.md                    # Fase 1: forma de la entrada/salida del prorrateo
├── quickstart.md                    # Fase 1: validación reproducible del delta
├── contracts/
│   └── calcular-prorrateo.md        # Fase 1: contrato de la función y de sus consumidores
├── checklists/
│   └── requirements.md              # Calidad de la spec
├── spec.md                          # Especificación funcional (delta sobre la 005)
└── tasks.md                         # Fase 2 (/speckit.tasks) — no se crea aquí
```

### Source Code (repository root)

```text
motor/
└── calculo.js                       # MODIFICADO. Solo la función calcularProrrateo (:94-106).

test/
├── calculo.test.js                  # MODIFICADO. RN-11: valores y nombre de la convención.
├── reglas-negocio.test.js           # MODIFICADO. RN-11: valores y nombre.
├── contradicciones.test.js          # MODIFICADO. Contradicción 01: convención única y paridad.
├── anomalias.test.js                # MODIFICADO. A-11: de «conviven dos» a «convergen».
├── equivalencia-motor.test.js       # MODIFICADO. Excluye prorrateo del anillo C y conserva
│                                    #   la comparación de excepciones con calcularFactura.
├── golden/
│   ├── flujo-central.js             # MODIFICADO. Descripciones de los 3 casos de prorrateo.
│   ├── master.json                  # REGENERADO. 3 valores y 3 descripciones.
│   └── LEEME.md                     # MODIFICADO. Explica la convención única.
├── referencia/
│   └── calculo-heredado.js          # SIN CAMBIOS. Copia histórica; deja de ser oráculo del prorrateo.
├── helpers/
│   └── casos-equivalencia.js        # SIN CAMBIOS. Su campo `prorrateo` deja de compararse.
└── COBERTURA.md                     # MODIFICADO. RN-11 y nota de la red.

specs/000-reconocimiento/
└── registro-anomalias.md            # MODIFICADO. A-11 queda implementada por la spec 011.
```

**Structure Decision**: se conserva la estructura heredada (raíz plana, sin capas nuevas). El único
cambio de producción está en el motor ya extraído en la spec 010. La fachada
`services/calculo.js:11` sigue reexportando el objeto completo y los tres consumidores no cambian:
`routes/facturas.js:9,66`, `routes/contratos.js:7,39` y `scripts/remesa_mensual.js:11,55`.

**Ficheros que NO se tocan** (verificación en `git diff --name-only`): `routes/*`, `scripts/*`,
`services/*`, `lib/util.js`, `server.js`, `db.js`, `config.js`, `views/*`, `public/*`,
`package.json`, `package-lock.json`, `test/referencia/calculo-heredado.js`,
`test/helpers/casos-equivalencia.js` y `datos/*`.

## Fase 0 — Investigación

Resultado en [research.md](./research.md). Resumen de las ocho decisiones:

| ID | Decisión | Motivo |
|---|---|---|
| R-01 | Fórmula `redondear2(cuota / util.diasDelMes(desde) * (d2 - d1 + 1))`, con mínimo 0 y sin tope de 30. | Es la fórmula de la remesa (`scripts/remesa_mensual.js:47-51`) y la que autoriza A-11. |
| R-02 | Denominador tomado de `desde` (mes del periodo), no de `hasta`. | En el contrato de uso ambas fechas son del mismo mes; `desde` coincide con el `primerDia` de la remesa y el `primeroDeMes` de la baja. |
| R-03 | Actualizar los cuatro ficheros de test que congelan la convención antigua; no crear `test/calculo.prorrateo.test.js`. | Ese fichero no existe; la convención antigua está repartida en cuatro sitios. |
| R-04 | Excluir `calcularProrrateo` del anillo C y conservar la comparación de excepciones con `calcularFactura(null, …)`. | Es la única divergencia intencionada; el `desde: null` que hoy prueba la excepción ya no se compara. |
| R-05 | Regenerar el golden master después de cambiar el código y de actualizar las descripciones; revisar el `diff`. | `test/golden/flujo-central.js:209` usa `calcularProrrateo`; sin regenerar, el golden queda en rojo. |
| R-06 | Demostrar la paridad con la remesa comparando el motor contra la fórmula inline replicada y comprobando por texto que la remesa no cambió. | No se puede ejecutar la remesa real (emite facturas); la fórmula inline es estable y ya está congelada por fuente. |
| R-07 | No añadir validaciones, topes ni normalizaciones; conservar `NaN`, `TypeError` y días invertidos → 0. | El delta solo cambia el denominador y elimina el tope; lo demás es deuda técnica diferida. |
| R-08 | Mantener `routes/contratos.js` sin cambios; la paridad se exige para los mismos argumentos `desde`/`hasta`. | Cambiar el periodo de la baja (usar `fecha_alta`) sería otro comportamiento y otro delta. |

## Fase 1 — Diseño

- [data-model.md](./data-model.md): entrada y salida de `calcularProrrateo`, invariantes de mes
  completo, casos límite y ausencia deliberada de validaciones nuevas.
- [contracts/calcular-prorrateo.md](./contracts/calcular-prorrateo.md): contrato de la función, de la
  fachada y de los dos consumidores; qué se considera ruptura.
- [quickstart.md](./quickstart.md): comandos y resultados esperados para demostrar el caso
  normativo, los meses completos, la paridad con la remesa, el anillo C y el `diff` del golden.

## Orden de ejecución

| Paso | Qué se hace | Comando de verificación | Resultado esperado |
|---|---|---|---|
| 0 | Línea base antes de tocar nada | `npm test` | 122/122, 0 fallos, 0 saltados |
| 1 | Cambiar solo `calcularProrrateo` en `motor/calculo.js:94-106` | — | — |
| 2 | Actualizar RN-11 en `test/calculo.test.js` y `test/reglas-negocio.test.js`; añadir los casos nuevos | `node --test test/calculo.test.js test/reglas-negocio.test.js` | Verde con la nueva convención |
| 3 | Actualizar contradicción 01 y A-11; añadir la paridad con la remesa | `node --test test/contradicciones.test.js test/anomalias.test.js` | Verde; la fórmula de la remesa no cambia |
| 4 | Ajustar el anillo C: excluir prorrateo y conservar una excepción de `calcularFactura` | `node --test test/equivalencia-motor.test.js` | 4 funciones con 0 diferencias; 1 exclusión documentada |
| 5 | Actualizar descripciones de `test/golden/flujo-central.js`; regenerar el golden | `TZ=Europe/Madrid node scripts/regenerar-golden-master.js` y `git diff -- test/golden/master.json` | Solo 3 casos de prorrateo: 3 valores y 3 descripciones |
| 6 | Ejecutar la suite completa y el golden | `npm test` | 122/122 (o el total actualizado), 0 fallos |
| 7 | Comprobar el perímetro y la no retroactividad | `git diff --name-only`, `git diff --exit-code package.json package-lock.json`, `git diff --exit-code test/referencia/calculo-heredado.js` | Solo los ficheros de la lista anterior; 0 cambios en consumidores y datos |
| 8 | Registrar A-11 y preparar el commit | `git diff specs/000-reconocimiento/registro-anomalias.md` | A-11 anotada como implementada, con la cita de la decisión |

**Nota sobre el paso 4**: la batería `test/helpers/casos-equivalencia.js:45-56` incluye un prorrateo
con `desde: null` que hoy es la única excepción comparada (`test/equivalencia-motor.test.js:146-148`).
Al excluir el prorrateo, hay que añadir una comparación de excepción con
`calcularFactura(null, null)` para que la aserción `lanzamientos >= 1` siga teniendo sentido. No se
debilita la comparación de las otras cuatro funciones.

**Nota sobre el paso 5**: las descripciones de los tres casos de prorrateo en
`test/golden/flujo-central.js:131,139,149` dicen «30 días frente a días reales». Deben pasar a
describir la convención única. Eso añade tres cadenas al `diff` del golden, además de los tres
valores; cualquier otro cambio se rechaza.

## Verificación de los criterios de éxito

| Criterio | Cómo se comprueba |
|---|---|
| SC-001 | `node -e "console.log(require('./motor/calculo').calcularProrrateo(60,'2026-07-16','2026-07-30'))"` → `29.03` |
| SC-002 | Test de meses completos: 28, 29, 30 y 31 días → cuota íntegra (90,00 en los cuatro) |
| SC-003 | Test de paridad motor/remesa sobre los 12 meses y periodos parciales; 0 diferencias |
| SC-004 | `npm test` sin tests de la convención antigua y sin `skip` para evitar el cambio |
| SC-005 | `node --test test/equivalencia-motor.test.js`: 0 diferencias en las 4 funciones no afectadas; exclusión de prorrateo comentada |
| SC-006 | `git diff -- test/golden/master.json`: solo los 3 casos de prorrateo (3 valores y, como máximo, 3 descripciones) |
| SC-007 | `git diff --name-only` sin `datos/`, sin migraciones y sin scripts de recálculo; 0 `UPDATE`/`DELETE` nuevos |
| SC-008 | `git diff --exit-code package.json package-lock.json routes/contratos.js scripts/remesa_mensual.js services/calculo.js` con código 0 |

## Riesgos y mitigaciones

| Riesgo | Mitigación en el diseño |
|---|---|
| Se olvida uno de los cuatro tests antiguos y la suite queda en rojo o congela dos convenciones. | R-03 enumera los cuatro ficheros y el paso 2/3 los ejecuta por separado antes de la suite completa. |
| El anillo C falla porque la única excepción comparada era el prorrateo con `desde: null`. | R-04 exige añadir `calcularFactura(null, null)` como excepción comparada y mantener `lanzamientos >= 1`. |
| El `diff` del golden se dispara por las descripciones o por un caso no previsto. | Paso 5: primero descripciones, después regeneración, y revisión caso por caso; solo se aceptan los tres casos de prorrateo. |
| La nueva fórmula da más de la cuota en fechas imposibles (`2026-02-29`). | Es deuda técnica preexistente; no se añade validación (FR-012). Se congela el resultado nuevo y se documenta. |
| La pantalla de baja y la remesa siguen midiendo periodos distintos si el alta fue a mitad de mes. | R-08: la garantía se limita a los mismos argumentos; cambiar el periodo de la baja queda para otro delta. |
| Se cita en el commit un identificador que no existe en el registro (A-01/D-01 del encargo). | La spec y el plan exigen `Decisión: A-11 — Paco y Puri, 2026-10-30`; A-01/D-01 no autorizan este cambio. |
| Alguien ejecuta la remesa real para «comprobar» la paridad. | R-06: la paridad se demuestra con la fórmula inline y la comprobación por texto; `scripts/remesa_mensual.js` no se ejecuta. |

## Complexity Tracking

No hay violaciones constitucionales: cero dependencias, un solo módulo de producción, cero cambios
retroactivos y una decisión de negocio que acota el alcance. Las desviaciones respecto al **texto
del encargo** están registradas en la spec (§6.1) y se resumen aquí:

| Desviación | Por qué es necesaria | Alternativa rechazada |
|---|---|---|
| `DESV-01`: spec 011 en lugar de modificar la 005. | `specs/005-*` no existe en este checkout (`SPEC-PACK.md:229-233`). | Crear un fichero dentro de una carpeta inexistente o fingir que la 005 está disponible. |
| `DESV-02`: actualizar cuatro ficheros de test, no `test/calculo.prorrateo.test.js`. | Ese fichero no existe; la convención antigua está en cuatro sitios. | Dejar tests antiguos en rojo o borrarlos sin sustituto. |
| `DESV-03`: el oráculo del anillo C es `test/referencia/calculo-heredado.js`. | Es la ruta real del repo. | Crear `test/legado/` solo para que coincida con el encargo. |
| `DESV-04`: regenerar el golden master. | `test/golden/flujo-central.js:209` usa `calcularProrrateo`; sin regenerar, el golden queda en rojo. | No tocar el golden y dejar la suite roja, o falsear el generador. |
| `DESV-05`: no cambiar `routes/contratos.js` para usar `fecha_alta`. | El encargo pide unificar la fórmula y conservar la firma; el periodo es otro comportamiento. | Cambiar la ruta de paso, abriendo un segundo módulo sin decisión. |

## Notas de planificación

- **La spec 005 sigue ausente**: se cita como `SUPOSICIÓN` documental. La decisión aplicable y
  verificable es A-11/D-03 (`acta-entrevista-negocio.md:41`; `registro-anomalias.md:50`).
- **La remesa no se refactoriza**: `scripts/remesa_mensual.js:43-51` conserva su fórmula inline. La
  paridad se demuestra con tests, no moviendo código.
- **La fachada no cambia**: `services/calculo.js:11` sigue reexportando el motor; los consumidores
  no se enteran de dónde vive la fórmula.
- **El campo `prorrateoComercial` del golden conserva su nombre** aunque ya no describa un mes
  comercial; renombrarlo sería un cambio de esquema no autorizado en este delta.
- **No se añade cobertura HTTP ni de la remesa end-to-end**: la costura está en una función pura y
  los tres consumidores no cambian. La comprobación por texto de la fórmula de la remesa ya existe
  en `test/contradicciones.test.js:43-48`.
