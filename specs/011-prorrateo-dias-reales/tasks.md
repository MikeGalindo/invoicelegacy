# Tasks: Prorrateo único por días reales

**Input**: Design documents from `/specs/011-prorrateo-dias-reales/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/calcular-prorrateo.md`

**Tests**: obligatorios. La spec 011 exige sustituir los tests que congelan la convención antigua
(FR-014), añadir casos nuevos (FR-015) y ajustar el anillo C (FR-016). No es TDD opcional.

**Organización**: las tareas se agrupan por historia de usuario. Cada historia se puede validar de
forma independiente después de la fase fundacional.

## Format: `[ID] [P?] [Story] Descripción`

- **[P]**: puede ejecutarse en paralelo (ficheros distintos, sin dependencia de tareas incompletas).
- **[Story]**: US1, US2, US3 o US4, según la spec.
- Todas las rutas son relativas a la raíz del repositorio.

---

## Phase 1: Setup (infraestructura compartida)

**Propósito**: fijar la línea base y la evidencia antes de tocar el motor.

- [X] T001 Comprobar la línea base con `npm test` (script en `package.json:8`) y anotar el resultado: 122 tests, 122 en verde, 0 fallos, 0 saltados.
- [X] T002 Calcular y anotar los hashes SHA-256 inmutables de `test/referencia/calculo-heredado.js`, `scripts/remesa_mensual.js`, `routes/contratos.js` y `services/calculo.js` para demostrar después que no se han tocado.
- [X] T003 Comprobar que la rama es `011-prorrateo-dias-reales` y que `git status` está limpio antes de modificar `motor/calculo.js`.

---

## Phase 2: Foundational (prerrequisito bloqueante)

**Propósito**: aplicar la única modificación de producción. Ninguna historia puede validarse hasta
que esta fase esté completa.

**⚠️ CRÍTICO**: no empezar las historias de usuario hasta terminar T004.

- [X] T004 Modificar `calcularProrrateo` en `motor/calculo.js:94-106`: usar `diasMes = util.diasDelMes(desde)`, calcular `dias = d2 - d1 + 1`, mantener `dias < 0 → 0`, eliminar el tope `dias > 30 → 30` y devolver `util.redondear2(cuota / diasMes * dias)`. Actualizar el comentario de la función para citar A-11/D-03 y la spec 011; no tocar las otras cuatro funciones ni los exports.
- [X] T005 Verificar la fórmula directamente con `node -e`: `calcularProrrateo(60, '2026-07-16', '2026-07-30')` debe devolver `29.03`; `calcularProrrateo(90, '2026-03-01', '2026-03-31')` debe devolver `90` (usar `motor/calculo.js`).

**Checkpoint**: el motor ya aplica la nueva convención; las historias pueden empezar.

---

## Phase 3: User Story 1 - Marga y Julián cobran lo mismo por el mismo periodo (P1) 🎯 MVP

**Goal**: la baja de contrato y la remesa usan la misma fórmula de días reales para el mismo periodo.

**Independent Test**: ejecutar `node --test test/calculo.test.js test/reglas-negocio.test.js test/contradicciones.test.js test/anomalias.test.js` y comprobar que el caso normativo da 29,03 € y que no queda ningún test con la convención de 30 días.

### Tests de la historia 1

- [X] T006 [P] [US1] Actualizar `test/calculo.test.js:250-273`: renombrar los tres tests de RN-11 a la convención de días reales y cambiar los valores: `:251` 45 → **43.55**; `:252` 90 → **87.10**; `:253` 90 → 90; `:254` 45 → **48.21**; `:255` 30 → 30; `:256` 30 → **29.03**; `:262` 3 → **2.90**; `:263` 6 → **5.81**; `:268` -45 → **-43.55**; `:271` 45 → **43.55**; `:272` 87 → **93.21**. Añadir en el mismo fichero los casos: 60 €/16–30 julio → 29,03; 60 €/1–30 julio → 58,06; 60 €/16–31 julio → 30,97; mismo día en julio → 1,94; meses completos de 28, 29, 30 y 31 días con cuota 90 → 90,00.
- [X] T007 [P] [US1] Actualizar `test/reglas-negocio.test.js:85-88`: renombrar RN-11 y cambiar `:86` 45 → **43.55** y `:87` 45 → **48.21**.
- [X] T008 [P] [US1] Actualizar `test/contradicciones.test.js:33-36`: sustituir el test «prorrateo comercial de 30 días» por la convención única de días reales con `:34` 45 → **43.55** y `:35` 45 → **48.21**; conservar sin cambios el test de la remesa de `:38-41` (43,55; 48,21; 30,00) y el test de fuente de `:43-48`.
- [X] T009 [P] [US1] Actualizar `test/anomalias.test.js:107-110`: sustituir «A-11 conviven dos prorrateos» por «A-11 prorrateo único por días reales», con `:108` 45 → **43.55** y un comentario que cite A-11/D-03 y la spec 011.

### Implementación y comprobaciones de la historia 1

- [X] T010 [US1] Comprobar que `routes/contratos.js:37-39` sigue llamando a `calculo.calcularProrrateo(contrato.cuota, primeroDeMes, fechaBaja)` y que `services/calculo.js:11` sigue reexportando el motor; ejecutar `git diff --exit-code routes/contratos.js services/calculo.js`.
- [X] T011 [US1] Ejecutar `TZ=Europe/Madrid node --test test/calculo.test.js test/reglas-negocio.test.js test/contradicciones.test.js test/anomalias.test.js` y comprobar que todo pasa; ejecutar además `node -e` para el caso normativo `(60, '2026-07-16', '2026-07-30')` y anotar **29.03**.

**Checkpoint**: US1 funciona de forma independiente; la baja y el motor ya usan días reales.

---

## Phase 4: User Story 2 - La remesa no cambia ni un céntimo (P1)

**Goal**: la remesa conserva su fórmula y sus importes; el golden master refleja solo el cambio de
prorrateo.

**Independent Test**: ejecutar `node --test test/contradicciones.test.js test/golden-master.test.js`; comprobar 0 diferencias motor/remesa y que el `diff` de `test/golden/master.json` solo contiene los tres casos de prorrateo.

### Tests de la historia 2

- [X] T012 [US2] Añadir en `test/contradicciones.test.js` un test de paridad que compare `calcularProrrateo` con el helper `prorrateoDiasReales` de `:20-31` para los 12 meses de 2026, febrero de 2028 y periodos parciales (16–30 julio, 1–30 julio, 16–31 julio, mismo día); exigir 0 diferencias. Los días invertidos se comprueban solo en el motor (0), porque la remesa nunca recibe periodos invertidos. Depende de T008 porque comparte fichero.
- [X] T013 [US2] Ejecutar `TZ=Europe/Madrid node --test test/contradicciones.test.js` y comprobar que la paridad da 0 diferencias y que el test de fuente de la remesa de `:43-48` sigue pasando.

### Golden master de la historia 2

- [X] T014 [P] [US2] Actualizar las descripciones de los tres casos de prorrateo en `test/golden/flujo-central.js:129,139,149` para que digan «prorrateo único por días reales» en lugar de «30 días frente a días reales»; no cambiar `id`, `numero`, `fecha`, líneas ni la estructura.
- [X] T015 [P] [US2] Actualizar `test/golden/LEEME.md` (lista de casos 9, 10 y 11 y explicación de `prorrateoComercial`) para describir la convención única; conservar el nombre del campo del golden.
- [X] T016 [US2] Regenerar `test/golden/master.json` con `TZ=Europe/Madrid node scripts/regenerar-golden-master.js`; depende de T014.
- [X] T017 [US2] Revisar `git diff -- test/golden/master.json` y comprobar que solo cambian los tres casos de prorrateo: `prorrateo-marzo` 45.00 → **43.55**, `prorrateo-febrero` 45.00 → **48.21**, `febrero-bisiesto` 45.00 → **46.55**, y como máximo sus tres descripciones. `prorrateoDiasReales` no debe cambiar.
- [X] T018 [US2] Ejecutar `TZ=Europe/Madrid node --test test/golden-master.test.js` y `git diff --exit-code scripts/remesa_mensual.js`; comprobar golden en verde y remesa intacta.

**Checkpoint**: US2 demuestra que la remesa no cambia y que el golden solo refleja el prorrateo.

---

## Phase 5: User Story 3 - Puri no ve tocada ninguna factura histórica (P1)

**Goal**: demostrar que el delta no modifica datos, no migra y no recalcula facturas emitidas.

**Independent Test**: ejecutar las comprobaciones de perímetro y confirmar que no aparece `datos/`, `db.js`, SQL, `UPDATE`/`DELETE` ni ninguna ejecución de la remesa.

### Verificación de la historia 3

- [X] T019 [P] [US3] Ejecutar `git diff --name-only` y comprobar que no aparece `datos/`, `db.js` ni ningún fichero `.sql`; anotar el resultado.
- [X] T020 [P] [US3] Ejecutar `git diff` y comprobar que no se ha añadido ninguna sentencia `UPDATE` o `DELETE` sobre `facturas`, `lineas`, `contratos` o `contadores`.
- [X] T021 [P] [US3] Comprobar que no se ha ejecutado `scripts/remesa_mensual.js` ni se ha generado ninguna rectificativa `RE`: revisar el `git diff` de `scripts/remesa_mensual.js`, `routes/facturas.js` y `lib/numeracion.js`; deben estar sin cambios.
- [X] T022 [P] [US3] Comprobar que no se han añadido migraciones, scripts de recálculo ni ficheros de copia/restauración en `scripts/` o `db.js`; revisar `git status --short`.

**Checkpoint**: US3 demuestra la no retroactividad sin tocar código de datos.

---

## Phase 6: User Story 4 - El equipo sabe dónde está la única divergencia intencionada (P2)

**Goal**: el anillo C sigue protegiendo las cuatro funciones no afectadas y documenta la exclusión
del prorrateo.

**Independent Test**: ejecutar `node --test test/equivalencia-motor.test.js`; comprobar 0 diferencias en las cuatro funciones no afectadas, la exclusión comentada del prorrateo y el hash intacto de la referencia heredada.

### Implementación de la historia 4

- [X] T023 [US4] Editar `test/equivalencia-motor.test.js:141-143` para eliminar solo la comparación de `calcularProrrateo` contra `heredado.calcularProrrateo`; añadir un comentario que cite A-11/D-03 y `specs/011-prorrateo-dias-reales/spec.md`.
- [X] T024 [US4] Añadir en `test/equivalencia-motor.test.js`, antes de la aserción `lanzamientos >= 1` de `:146-148`, una comparación de excepción con `calcularFactura(null, null)` entre `heredado` y `nuevo`; conservar la aserción.
- [X] T025 [US4] Verificar que `CLAVES` y `ARIDADES` de `test/equivalencia-motor.test.js:17-31` siguen incluyendo las cinco funciones y aridades `1, 4, 1, 2, 3`, y que las comparaciones de `calcularFactura`, `calcularLinea`, `recargoPara` y `porcentajeDescuento` siguen intactas.
- [X] T026 [P] [US4] Comprobar que `test/referencia/calculo-heredado.js` conserva el SHA-256 `aa61cf553c530f3d1c4777be78284f7702b79a10f61cb62d27c30405d1e07c38`; no actualizarlo a la nueva fórmula.
- [X] T027 [US4] Ejecutar `TZ=Europe/Madrid node --test test/equivalencia-motor.test.js` y comprobar: 4 funciones no afectadas con 0 diferencias, prorrateo excluido, contrato de 5 exports y excepción comparada.

**Checkpoint**: US4 deja la divergencia intencionada documentada y el resto del motor protegido.

---

## Phase 7: Polish y transversales

**Propósito**: actualizar documentación, registro, evidencia y perímetro final.

- [X] T028 Actualizar `test/COBERTURA.md`: cambiar RN-11 de «prorrateo comercial» a «prorrateo por días reales» y anotar que la convención congelada es la de la spec 011; actualizar la nota de la red si procede.
- [X] T029 Actualizar `specs/000-reconocimiento/registro-anomalias.md` para anotar que A-11 queda implementada por la spec 011 (fecha 2026-11-02), sin borrar el historial ni reescribir su clasificación anterior.
- [X] T030 Ejecutar `npm test` completo y comprobar que todo está en verde, sin tests saltados para evitar el cambio; anotar el recuento total (122 + tests nuevos).
- [X] T031 Ejecutar las comprobaciones de `specs/011-prorrateo-dias-reales/quickstart.md` §3–§10 (caso normativo, meses completos, día 31, paridad, anillo C, golden y perímetro) y anotar la evidencia con fecha.
- [X] T032 Ejecutar el perímetro final con `git diff --name-only` y comprobar que solo aparecen los ficheros previstos en `specs/011-prorrateo-dias-reales/quickstart.md` §10; ejecutar `git diff --exit-code package.json package-lock.json routes/contratos.js scripts/remesa_mensual.js services/calculo.js`.
- [X] T033 Comprobar que el commit de implementación de `motor/calculo.js` y `test/golden/master.json` incluye la línea `Decisión: A-11 — Paco y Puri, 2026-10-30`; si el autocommit fijo no la incluye, crear un commit manual o ejecutar `git commit --amend` antes de cerrar.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: empieza inmediatamente; T001–T003 no dependen de nada.
- **Foundational (Phase 2)**: depende de Setup; T004 bloquea todas las historias; T005 depende de T004.
- **US1 (Phase 3)**: depende de T004. T006–T009 pueden ir en paralelo entre sí; T010 depende de T004; T011 depende de T006–T010.
- **US2 (Phase 4)**: depende de T004. T012 depende de T008 (mismo fichero); T013 depende de T012; T014 y T015 pueden ir en paralelo; T016 depende de T014; T017 depende de T016; T018 depende de T017.
- **US3 (Phase 5)**: depende de T004; T019–T022 son independientes entre sí y pueden ir en paralelo.
- **US4 (Phase 6)**: depende de T004. T023 depende de T004; T024 depende de T023; T025 y T026 dependen de T024; T027 depende de T025.
- **Polish (Phase 7)**: T028 depende de US1 y US2; T029 depende de todas las historias; T030–T033 dependen de T028 y T029.

### User Story Dependencies

- **US1 (P1)**: independiente tras T004. Es el MVP técnico.
- **US2 (P1)**: independiente tras T004, salvo T012, que comparte `test/contradicciones.test.js` con T008.
- **US3 (P1)**: independiente tras T004; solo verifica perímetro y no toca código.
- **US4 (P2)**: independiente tras T004; solo toca `test/equivalencia-motor.test.js`.

### Within Each User Story

- Los tests se actualizan antes de dar la historia por válida.
- La implementación de producción (T004) es común y va en la fase fundacional.
- Las verificaciones de perímetro y no retroactividad van al final de cada historia.
- No se toca `test/referencia/calculo-heredado.js` en ninguna tarea.

### Parallel Opportunities

- US1: T006, T007, T008 y T009 tocan ficheros distintos y pueden ejecutarse en paralelo.
- US2: T014 y T015 tocan ficheros distintos y pueden ejecutarse en paralelo; T019–T022 de US3 también.
- US4: T025 y T026 pueden ejecutarse en paralelo después de T024.
- US1, US2, US3 y US4 pueden solaparse tras T004, respetando la dependencia T008 → T012 y los ficheros compartidos.

---

## Parallel Example: User Story 1

```bash
# Actualizaciones de tests en ficheros distintos:
Task: "T006 [P] [US1] Actualizar test/calculo.test.js:250-273"
Task: "T007 [P] [US1] Actualizar test/reglas-negocio.test.js:85-88"
Task: "T008 [P] [US1] Actualizar test/contradicciones.test.js:33-36"
Task: "T009 [P] [US1] Actualizar test/anomalias.test.js:107-110"
```

## Parallel Example: User Story 3

```bash
# Verificaciones de no retroactividad, sin dependencias entre sí:
Task: "T019 [P] [US3] Comprobar que no aparece datos/ ni db.js ni .sql"
Task: "T020 [P] [US3] Comprobar que no hay UPDATE/DELETE nuevos"
Task: "T021 [P] [US3] Comprobar que no se ejecutó la remesa ni se generó una RE"
Task: "T022 [P] [US3] Comprobar que no hay migraciones ni scripts de recálculo"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (T001–T003).
2. Completar Phase 2 (T004–T005).
3. Completar Phase 3 (T006–T011).
4. **Parar y validar**: caso normativo 29,03 €, meses completos y tests de RN-11/A-11 en verde.
5. Este es el mínimo que demuestra la unificación de la fórmula.

### Incremental Delivery

1. US1 → motor y tests de la nueva convención.
2. US2 → paridad con la remesa y golden master actualizado.
3. US3 → evidencia de no retroactividad.
4. US4 → anillo C con la divergencia documentada.
5. Polish → documentación, registro, suite completa y commit con la decisión.

### Nota sobre el autocommit

El hook `after_tasks` puede commitear este `tasks.md` con el mensaje fijo
`[Spec Kit] Añade las tareas`. El commit de implementación debe llevar, además, la línea
`Decisión: A-11 — Paco y Puri, 2026-10-30`; si el hook `after_implement` usa el mensaje fijo y no la
incluye, T033 exige corregirlo antes de cerrar.

---

## Notes

- [P] = ficheros distintos y sin dependencia de una tarea incompleta.
- [US*] = trazabilidad con la historia de usuario de `spec.md`.
- Cada historia se valida con su comando independiente antes de pasar a la siguiente.
- No se ejecuta `scripts/remesa_mensual.js` ni se abre la base de datos real.
- No se toca `test/referencia/calculo-heredado.js`.
- No se añaden dependencias ni se modifican `package.json`/`package-lock.json`.
- El golden master solo se regenera con la decisión A-11 citada y el `diff` explicado.
- Todos los importes se expresan con dos decimales y coma en la documentación.
