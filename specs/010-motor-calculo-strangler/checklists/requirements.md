# Specification Quality Checklist: Extracción del motor de cálculo por estrangulamiento

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

- **Tres lagunas resueltas por decisión del usuario el 2026-11-01** (no quedan marcadores
  `[NEEDS CLARIFICATION]`):
  1. Las specs `001`, `002` y `003` **no existen** (`specs/SPEC-PACK.md:229-233`). El contrato
     inmutable pasa a ser la suite de 116 tests, el golden master sin regenerar y
     `services/calculo.js`. Queda registrado en §Contexto y §Assumptions.
  2. `calcularProrrateo` se incluye en `motor/` por instrucción expresa, pese a que
     `consumidores-motor.md:5-7` lo reservaba para la spec 005. Registrado como `DESV-01` con
     motivo y mitigación.
  3. La spec se numera **010** para no ocupar los números 001-003 reservados por la partición.
- **Excepción deliberada a tres ítems genéricos de esta checklist.** El Principio VI y la
  restricción de «Evidencia obligatoria» de la constitución (`.specify/memory/constitution.md:192-195`
  y `:176-188`) exigen citar `fichero:líneas` y fijar formatos y rutas. Además, el encargo impone
  literalmente la carpeta `motor/`, las cinco firmas y la fachada. Por eso:
  - «No implementation details» se cumple en el sentido de que **no se prescribe** algoritmo
    interno, estructura de ficheros dentro de `motor/`, librerías ni diseño de clases; las rutas y
    firmas que aparecen son el contrato observable que hay que preservar.
  - «Technology-agnostic success criteria» se cumple en el sentido de que los criterios se expresan
    como recuentos y diferencias verificables (116/116, 12/12, 0 diferencias, 0 ficheros
    consumidores tocados). Las referencias a `test/golden/master.json` y a la carpeta `motor/` son
    el objeto medido, no una elección tecnológica nueva.
  - «Written for non-technical stakeholders» se cumple en las secciones de escenarios y criterios;
    el resto es trazabilidad exigida por la gobernanza del repositorio.
- **Línea base verificada antes de escribir la spec**: `npm test` → 116 tests, 116 en verde,
  0 fallos, 0 saltados (2026-11-01). Cumple el paso 1 de
  «Flujo de Trabajo y Verificación» (`constitution.md:213-214`).
- **Sin decisiones de negocio nuevas.** Esta spec no habilita ningún cambio de comportamiento: no
  implementa A-09, A-11, A-22 ni A-23, y no requiere entradas `RESUELTA_NEGOCIO` adicionales.
- **Siguiente paso recomendado**: `/speckit.plan` para decidir el mecanismo de ejecución «contra
  `motor/`» y la ubicación del arnés comparativo, que la spec deja abiertos a propósito.
