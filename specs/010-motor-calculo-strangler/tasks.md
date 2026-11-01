# Tasks: Extracción del motor de cálculo por estrangulamiento

**Input**: Design documents from `/specs/010-motor-calculo-strangler/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api-motor.md](./contracts/api-motor.md),
[quickstart.md](./quickstart.md)

**Tests**: **Sí, obligatorios.** No es una elección de TDD: los anillos (a), (b) y (c) son criterios
de aceptación de la spec (FR-011 a FR-017) y el contrato de la obra es la red de characterization
tests existente.

**Organización**: tareas agrupadas por historia de usuario para que cada una sea implementable y
verificable por separado.

## Format: `[ID] [P?] [Story] Descripción`

- **[P]**: paralelizable (ficheros distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (`US1`…`US4`)
- Todas las rutas son relativas a la raíz del repositorio

## Path Conventions

Proyecto único en raíz plana, según [plan.md](./plan.md) §Project Structure:

- Motor nuevo: `motor/`
- Fachada: `services/calculo.js`
- Red de pruebas: `test/` (el repositorio usa `test/`, **no** `tests/`)
- Artefactos de la spec: `specs/010-motor-calculo-strangler/`

> **Recordatorio operativo**: ninguno de estos comandos abre la base de datos ni ejecuta
> `scripts/remesa_mensual.js`. Todo se ejecuta desde la raíz del repositorio, con
> `TZ=Europe/Madrid`.

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: dejar constancia de la línea base y de la procedencia del código que se va a sustituir.

- [X] T001 Crear `specs/010-motor-calculo-strangler/evidencia.md` con las tablas de evidencias de los tres anillos (columnas: anillo, comando, fecha, resultado) y anotar en ella la línea base obtenida con `npm test` (116 tests, 116 verdes, 0 fallos, 0 saltados, fecha y duración)
- [X] T002 [P] Registrar en `specs/010-motor-calculo-strangler/evidencia.md` las huellas del heredado antes de tocarlo: `git hash-object services/calculo.js` (`c2b175c106fd4b99d6dfdc4925008e6be80ccc1a`) y `sha256sum services/calculo.js` (`f289c4f9…`), junto con el commit de partida (`a42865a`)

**Checkpoint**: hay evidencia fechada de que la red está verde antes de empezar.

---

## Phase 2: Foundational (prerrequisitos bloqueantes)

**Purpose**: crear el motor nuevo y las piezas del arnés que necesitan todas las historias.

**⚠️ CRÍTICO**: ninguna historia puede verificarse hasta que esta fase esté completa.

- [X] T003 Crear `test/referencia/calculo-heredado.js` como copia congelada de `services/calculo.js` en `a42865a`, con **una sola** diferencia: `require('../../lib/util')` en lugar de `require('../lib/util')`; añadir cabecera de inmutabilidad indicando origen, commit y SHA-256 (ver `contracts/api-motor.md` §9)
- [X] T004 [P] Crear `test/helpers/motor-como-fachada.js`: resolver la ruta absoluta de `services/calculo.js` con `require.resolve` y escribir en `require.cache` una entrada cuyo `exports` sea `motor/calculo.js`, replicando el patrón de `test/helpers/cargar-modulo-con-db.js:5-29` (ver `research.md` R-01)
- [X] T005 [P] Crear `test/helpers/casos-equivalencia.js`: PRNG `mulberry32` con semilla fija `20261101` y generador de **exactamente 100** casos, cada uno con `id`, `lineas` (0 a 4), `cliente`, `conRecargo`, `tipoIva`, `baseTotal` y `prorrateo`; cubrir la lista mínima de `spec.md` FR-015 y la forma de `data-model.md` §2.7
- [X] T006 Crear `motor/calculo.js` (CommonJS, sintaxis moderna, puro) con las cinco funciones exactas de `contracts/api-motor.md` §2-§6: `recargoPara`, `calcularLinea`, `porcentajeDescuento`, `calcularFactura`, `calcularProrrateo`; reutilizar `lib/util.redondear2` sin duplicarlo, **sin añadir validaciones** (`data-model.md` §3) y conservando las rarezas A-22, A-23 y `-0`; comprobar con `node -e "const m=require('./motor/calculo'); console.log(Object.keys(m), m.calcularLinea.length)"` que exporta 5 claves y aridad 4

**Checkpoint**: el motor existe, arranca y las piezas del arnés están listas. A partir de aquí las
historias US1 y US2 pueden ejecutarse en paralelo.

---

## Phase 3: User Story 1 - Las facturas siguen cuadrando céntimo a céntimo (Priority: P1) 🎯 MVP

**Goal**: demostrar que los 116 characterization tests y los 12 casos del golden master pasan con
`motor/` como implementación efectiva, sin modificar ni un test ni regenerar el golden.

**Independent Test**: ejecutar los comandos de esta fase y comprobar 116 preexistentes verdes y
`git diff test/golden/master.json` vacío.

### Verificación de User Story 1

- [X] T007 [US1] Ejecutar el anillo (a) antes de conmutar: `TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/*.test.js` y anotar en `evidencia.md` que los 116 tests preexistentes siguen verdes, con 0 fallos y 0 saltados
- [X] T008 [US1] Ejecutar el anillo (b) antes de conmutar: `TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/golden-master.test.js` y después `git diff --exit-code test/golden/master.json`; anotar en `evidencia.md` los 12 casos y la ausencia de diferencias
- [X] T009 [US1] Validar que el mecanismo de T007 no es inerte: copiar el motor a `/tmp`, sustituir dos fórmulas por valores absurdos (`recargoPara` → `99`, `calcularProrrateo` → `123`), inyectarlo con una precarga temporal en `/tmp` y comprobar que `test/calculo.test.js` se pone en rojo; anotar el resultado en `evidencia.md` y borrar los ficheros temporales (no se toca nada dentro del repositorio)

**Checkpoint**: el negocio tiene prueba de que el motor nuevo reproduce el comportamiento congelado.

---

## Phase 4: User Story 2 - La equivalencia se demuestra por doble ejecución (Priority: P1)

**Goal**: comparar las dos implementaciones vivas sobre 100 casos deterministas y exigir igualdad
exacta campo a campo, incluidas las distinciones que JSON no conserva.

**Independent Test**: `TZ=Europe/Madrid node --test test/equivalencia-motor.test.js` informa
`100 casos comparados, 0 diferencias`.

- [X] T010 [US2] Crear `test/equivalencia-motor.test.js` con la batería comparativa: importar `motor/calculo.js` y `test/referencia/calculo-heredado.js` **directamente**, generar los 100 casos con `test/helpers/casos-equivalencia.js`, invocar las cinco funciones en ambas implementaciones y comparar con recorrido estructural y `Object.is` en las hojas, informando `caso <id>, <ruta>: heredado <v>, nuevo <v>` (patrón de `test/golden-master.test.js:11-49`, `research.md` R-07)
- [X] T011 [US2] Ampliar `test/equivalencia-motor.test.js` para capturar y comparar los lanzamientos (`{ok:true, valor}` frente a `{ok:false, nombre, mensaje}`) y para comprobar los invariantes de `data-model.md` §2.5: `total === redondear2(base + iva + recargo)`, sumas de líneas coherentes, una línea calculada por línea cruda en el mismo orden y ausencia de mutación de los argumentos
- [X] T012 [US2] Ampliar `test/equivalencia-motor.test.js` con la reproducibilidad de la semilla (dos generaciones con `20261101` producen los mismos 100 casos) y la pureza del motor (su entrada en `require.cache` tiene como único hijo `lib/util.js`, `research.md` R-08)
- [X] T013 [US2] Ejecutar `TZ=Europe/Madrid node --test test/equivalencia-motor.test.js` y anotar en `evidencia.md` el recuento literal de casos comparados y las diferencias encontradas (0)

**Checkpoint**: la equivalencia está demostrada por comparación directa, no solo por la red existente.

---

## Phase 5: User Story 3 - La conmutación es invisible para quien usa el sistema (Priority: P2)

**Goal**: convertir `services/calculo.js` en fachada sin cambiar ruta, API ni consumidores.

**Independent Test**: `npm test` sigue verde, el golden no cambia y
`require('./services/calculo') === require('./motor/calculo')`.

- [X] T014 [US3] Añadir a `test/equivalencia-motor.test.js` el bloque de contrato de API: para `motor/calculo.js` y para `services/calculo.js`, `Object.keys().sort()` igual a las cinco claves de `contracts/api-motor.md` §1 y aridades `1, 4, 1, 2, 3`; el bloque debe pasar también antes de la conmutación
- [X] T015 [US3] Sustituir el contenido de `services/calculo.js` por la fachada de una línea `module.exports = require('../motor/calculo');`, sin tocar los otros cuatro ficheros de aplicación (`routes/facturas.js`, `routes/contratos.js`, `scripts/remesa_mensual.js`, `server.js`)
- [X] T016 [US3] Ejecutar `npm test`, `git diff --exit-code test/golden/master.json` y `node -e "console.log(require('./services/calculo') === require('./motor/calculo'))"`; anotar en `evidencia.md` el total de tests, la ausencia de diferencias en el golden y el resultado de la identidad

**Checkpoint**: la aplicación usa el motor nuevo por la misma puerta de siempre.

---

## Phase 6: User Story 4 - Lo que ya estaba mal sigue estando mal, igual (Priority: P2)

**Goal**: fijar explícitamente las rarezas que la extracción podría «mejorar» por accidente.

**Independent Test**: los casos de esta fase pasan y muestran exactamente los mismos resultados
anómalos que el heredado.

- [X] T017 [US4] Añadir a `test/equivalencia-motor.test.js` los casos dedicados de `spec.md` FR-018 y SC-007: `calcularLinea(1, 100, '21', true)` con IVA 21 y recargo 0 (A-22), `redondear2(-0.005)` con `Object.is(resultado, -0)` verdadero (A-23), un caso que produzca `NaN` en ambas implementaciones, cliente `null` y `undefined` sin recargo y `recargo_equivalencia: '1'` con recargo
- [X] T018 [US4] Ejecutar `TZ=Europe/Madrid node --test test/equivalencia-motor.test.js` y anotar en `evidencia.md` que las rarezas se reproducen sin «mejoras»

**Checkpoint**: las cuatro historias están completas y la equivalencia cubre también lo anómalo.

---

## Phase 7: Polish y preocupaciones transversales

**Purpose**: cerrar la evidencia, la cobertura y el perímetro del cambio.

- [X] T019 [P] Actualizar `test/COBERTURA.md`: añadir `test/equivalencia-motor.test.js` a la tabla de ficheros, anotar el recuento real tras la extracción y dejar una línea que indique que el motor se extrajo a `motor/` sin cambio de comportamiento
- [X] T020 [P] Completar `specs/010-motor-calculo-strangler/evidencia.md` con el resumen final de los tres anillos: comandos literales, fecha ISO, resultados y recuento de casos comparados (FR-017, SC-009)
- [X] T021 Verificar el perímetro con `git diff --name-only` y `git status --short` contra la lista de `quickstart.md` §8; cualquier fichero fuera de `motor/`, `services/calculo.js`, `test/equivalencia-motor.test.js`, `test/referencia/`, `test/helpers/`, `test/COBERTURA.md` y `specs/010-motor-calculo-strangler/` obliga a revertir
- [X] T022 [P] Verificar que no se ha tocado nada protegido: `git diff --exit-code package.json package-lock.json test/golden/master.json lib/util.js routes/ scripts/ views/ public/ db.js config.js`
- [X] T023 Ejecutar la guía `specs/010-motor-calculo-strangler/quickstart.md` completa, de la sección 2 a la 8, y comprobar que cada resultado esperado coincide con lo observado
- [X] T024 Hacer el commit en español de la extracción, con el cuerpo citando las evidencias de los tres anillos y el identificador `DESV-01`; no debe citar ninguna decisión de negocio porque no hay cambio de comportamiento

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. **Bloquea las cuatro historias.**
- **US1 (Phase 3)**: depende de T004 (precarga) y T006 (motor).
- **US2 (Phase 4)**: depende de T003 (referencia), T005 (generador) y T006 (motor). Independiente de US1.
- **US3 (Phase 5)**: depende de US1 y US2 (no se conmuta sin equivalencia demostrada).
- **US4 (Phase 6)**: depende de US2 (edita el mismo fichero de test). Independiente de US3.
- **Polish (Phase 7)**: depende de US1, US2, US3 y US4.

### User Story Dependencies

- **US1 (P1)**: independiente; se puede verificar en cuanto termina la Fase 2.
- **US2 (P1)**: independiente de US1; comparte motor y arnés, pero su prueba es propia.
- **US3 (P2)**: **no** puede empezar hasta que US1 y US2 estén verdes (Principio III: la conmutación
  solo tras equivalencia demostrada).
- **US4 (P2)**: secuencial respecto a US2 por fichero compartido (`test/equivalencia-motor.test.js`);
  puede solaparse con US3.

### Within Each User Story

- En este proyecto no hay modelos, servicios ni endpoints: el orden es **artefacto → prueba →
  evidencia**. Cada historia termina con una ejecución registrada.

### Parallel Opportunities

- Fase 2: T003, T004 y T005 son `[P]` (tres ficheros distintos). T006 puede ir en paralelo con
  T003-T005 porque no depende de ellos.
- Fase 3 y Fase 4: pueden ejecutarse a la vez por dos personas.
- Fase 7: T019 y T020 son `[P]`; T021 y T022 son `[P]` entre sí.

---

## Parallel Example: Foundational

```bash
# Tres piezas del arnés en paralelo (ficheros distintos):
Task: "Crear test/referencia/calculo-heredado.js (T003)"
Task: "Crear test/helpers/motor-como-fachada.js (T004)"
Task: "Crear test/helpers/casos-equivalencia.js (T005)"

# El motor puede construirse a la vez:
Task: "Crear motor/calculo.js con las cinco funciones (T006)"
```

## Parallel Example: US1 y US2

```bash
# Dos verificaciones independientes sobre el mismo motor:
Task: "Anillo (a): suite contra motor/ (T007)"
Task: "Batería comparativa de 100 casos (T010)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Fase 1 (Setup) y Fase 2 (Foundational).
2. Fase 3 (US1): anillos (a) y (b) antes de conmutar.
3. **PARAR Y VALIDAR**: 116 preexistentes verdes y golden intacto.
4. Si US1 no está verde, no se sigue: se corrige el motor, nunca el test.

### Incremental Delivery

1. Fase 1 + Fase 2 → motor y arnés listos.
2. US1 → evidencia de que lo congelado se reproduce (MVP).
3. US2 → equivalencia demostrada por doble ejecución.
4. US3 → conmutación invisible (solo con US1 y US2 verdes).
5. US4 → rarezas fijadas explícitamente.
6. Fase 7 → cobertura, evidencia, perímetro y commit.

### Parallel Team Strategy

Con dos personas:

1. Ambas completan Fase 1 y Fase 2 (o se reparten T003-T006).
2. Persona A: US1. Persona B: US2.
3. Al cerrar ambas: una sola persona hace US3 (conmutación) y US4.
4. Fase 7 en paralelo salvo T021-T024, que van al final y en orden.

---

## Notes

- `[P]` = ficheros distintos y sin dependencias pendientes.
- El **golden master no se regenera** en ninguna tarea (`test/golden/LEEME.md:22-33`).
- Ninguna tarea puede modificar los 116 tests existentes (`constitution.md:71-79`).
- Ninguna tarea modifica `lib/util.js`, los consumidores ni las dependencias.
- Si una tarea de verificación falla, se corrige `motor/calculo.js`; nunca el test ni la referencia.
- Cada checkpoint es una parada válida: se puede entregar lo hecho sin completar el resto.
