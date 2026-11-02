# Specification Quality Checklist: Prorrateo único por días reales

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-01
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Delta, no módulo nuevo.** La spec se numeró **011** porque `specs/005-*` no existe en este
  checkout (`specs/SPEC-PACK.md:229-233`). El encargo se conserva como referencia y se marca como
  `SUPOSICIÓN` cuando cita documentos ausentes.
- **Trazabilidad corregida con evidencia real.** El encargo cita A-01/D-01 (julio 2026); en este
  registro el doble prorrateo es **A-11** y la decisión de días reales es **D-03/N-03 (Paco y Puri,
  2026-10-30)** (`registro-anomalias.md:50`; `acta-entrevista-negocio.md:41`). El commit debe citar
  A-11/D-03, no los identificadores del encargo que no constan.
- **Rutas de test corregidas con evidencia real.** `test/calculo.prorrateo.test.js` y
  `test/legado/calculo-heredado.js` no existen. La convención antigua está en cuatro ficheros
  (`test/calculo.test.js:250-273`, `test/contradicciones.test.js:33-36`,
  `test/anomalias.test.js:107-110`, `test/reglas-negocio.test.js:85-88`) y el oráculo del anillo C
  en `test/referencia/calculo-heredado.js`. Registrado como DESV-02 y DESV-03.
- **Golden master incluido en el alcance.** `test/golden/flujo-central.js:209` usa
  `calcularProrrateo`; sin regenerar, el golden queda en rojo. El `diff` se acota a los tres casos
  de prorrateo (DESV-04).
- **Excepción deliberada a tres ítems genéricos de la checklist.** La constitución exige citar
  `fichero:líneas` y fijar contratos observables (`.specify/memory/constitution.md:192-195`), y el
  encargo impone literalmente `motor/calculo.js`, la firma de `calcularProrrateo` y los tests. Por
  eso las referencias a ficheros y líneas son trazabilidad, no una prescripción de diseño interno.
  Los criterios de éxito se expresan como recuentos y diferencias verificables (0 diferencias,
  29,03 €, 90,00 €, 0 filas históricas tocadas).
- **Sin `[NEEDS CLARIFICATION]`.** Las tres lagunas documentales se resolvieron con una decisión
  explícita y verificable: (1) la 005 se cita como `SUPOSICIÓN`; (2) la decisión aplicable es
  A-11/D-03; (3) el oráculo del anillo C es `test/referencia/calculo-heredado.js`. Las preguntas
  abiertas de §6.3 quedan fuera del alcance del delta y no bloquean la implementación.
- **Línea base verificada:** `npm test` está en verde (122 tests, `test/COBERTURA.md:6`) y
  `node --test test/calculo.test.js` pasa 28/28 antes de tocar nada (2026-11-01).
- **Siguiente paso recomendado:** `/speckit.plan` para decidir el orden exacto de cambio
  código → tests → golden master y la forma de demostrar la paridad con la remesa sin ejecutarla
  contra datos reales.
