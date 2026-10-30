# Registro de anomalías — GesFact 2.4

**Fecha de apertura:** 2026-10-30
**Fase:** reconocimiento. No se corrige nada (constitución `.specify/memory/constitution.md`,
Principios I y III; `AGENTS.md`).
**Origen:** hallazgos H1-H8 de `flujo-factura.md`, reglas dudosas de `reglas-de-negocio.md`,
contradicciones 01-09, riesgos R1-R24 de `registro-riesgos.md` y preguntas abiertas de
`memoria-historica.md`.
**Actualización:** acta de la entrevista de negocio de 2026-10-30
(`acta-entrevista-negocio.md`), con sus 25 decisiones D-01 a D-25.

> Este registro no sustituye a `registro-riesgos.md`: las filas R1-R24 siguen allí con su detalle
> técnico. Aquí se registran las anomalías que requieren una decisión de negocio o que cambian de
> clasificación tras el acta. Las decisiones del acta son de una **simulación** y están pendientes de
> ratificación real; se citan como testigo `NEGOCIO` con acta, pregunta, persona y fecha.

## Leyenda de estado

| Estado | Significado |
|---|---|
| `PENDIENTE` | Requiere una decisión del negocio; no hay respuesta concluyente. |
| `DUDOSA` | Regla documentada pero no confirmada por el negocio. |
| `PARCIAL` | Una parte está decidida y otra sigue pendiente. |
| `RESUELTA_NEGOCIO` | El negocio ha decidido; **no se ha implementado** en esta fase. |
| `ABIERTA_TECNICA` | Riesgo o deuda técnica sin decisión de negocio pendiente. |
| `CERRADA` | No requiere acción o no es una anomalía. |

**Lista PENDIENTE** = entradas en estado `PENDIENTE`, `DUDOSA` o `PARCIAL` con pregunta de negocio.
Las entradas `ABIERTA_TECNICA` no forman parte de la agenda de negocio, sino de la deuda técnica.

## 1. Anomalías cerradas por decisión de negocio

Todas pasan a `RESUELTA_NEGOCIO`. La implementación queda pendiente: esta fase no modifica código,
configuración ni datos.

| ID | Título | Clasificación (antes → ahora) | Evidencia NEGOCIO | Decisión registrada |
|---|---|---|---|---|
| A-01 | Descuento por volumen en la remesa sin nota en observaciones (H1) | `PENDIENTE` → `RESUELTA_NEGOCIO` (riesgo/discrepancia) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-02/N-02, Paco, 2026-10-30; D-15/N-15, Puri, 2026-10-30 | Se aplica a cuotas de contrato y la factura de remesa debe indicar el porcentaje. |
| A-02 | El año del número no es el año de la factura (H2) | `PENDIENTE` → `RESUELTA_NEGOCIO` (rareza) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-11/N-11, Puri y Julián, 2026-10-30 | El año del número debe ser el de la fecha de la factura. |
| A-03 | El número se consume aunque falle la cabecera (H3) | `PENDIENTE` → `RESUELTA_NEGOCIO` (riesgo) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-12/N-12, Puri y Julián, 2026-10-30 | Si falla la grabación, el número reservado se reutiliza en la siguiente factura. |
| A-04 | El alta manual acepta clientes inactivos (H4) | `PENDIENTE` → `RESUELTA_NEGOCIO` (rareza) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-20/N-20, Marga, 2026-10-30 | Se impide facturar a un cliente dado de baja. |
| A-05 | Fecha libre sin validar en el alta manual (H5) | `PENDIENTE` → `RESUELTA_NEGOCIO` (riesgo) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-21/N-21, Julián y Marga, 2026-10-30 | Las fechas inválidas deben rechazarse. |
| A-09 | El descuento por volumen reduce también el recargo de equivalencia (RN-09) | `DUDOSA` → `RESUELTA_NEGOCIO` (rareza) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-07/N-07, Puri y Paco, 2026-10-30 | Sí, el descuento reduce la base y el recargo. |
| A-10 | El tablero no resta los abonos de la serie RE (RN-34) | `DUDOSA` → `RESUELTA_NEGOCIO` (rareza) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-14/N-14, Marga y Puri, 2026-10-30 | El importe pendiente debe restar los abonos RE. |
| A-11 | Dos prorrateos para el mismo mes de baja (RN-36; contradicción 01) | `DUDOSA` → `RESUELTA_NEGOCIO` (riesgo) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-03/N-03, Paco y Puri, 2026-10-30 | El prorrateo correcto es por días reales del mes. |
| A-12 | La remesa usa `30` literal frente a `config.VENCIMIENTO_DIAS` (RN-37; contradicción 03) | `DUDOSA` → `RESUELTA_NEGOCIO` (rareza) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-09/N-09, Marga, 2026-10-30 | Plazo por defecto de 30 días y el mismo para manual y remesa. |
| A-13 | Dos formatos de importe: `1.234,50` frente a `1234.50` (contradicción 02) | `PENDIENTE` → `RESUELTA_NEGOCIO` (deuda técnica/rareza) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-22/N-22, Marga, 2026-10-30 | Se unifica al formato de la factura, con coma decimal y punto de millar. |
| A-14 | IVA por defecto y tipos admitidos distintos según el maestro (contradicción 04) | `PENDIENTE` → `RESUELTA_NEGOCIO` (deuda técnica) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-23/N-23, Marga y Julián, 2026-10-30; D-19/N-19, Puri y Julián, 2026-10-30 | Si falta el IVA se rechaza; los tipos 16/18/7/8 se mantienen porque se prevé reabrir ejercicios anteriores a 2018. |
| A-15 | Cabecera y líneas dan totales distintos (contradicción 07) | `PENDIENTE` → `RESUELTA_NEGOCIO` (bug confirmado/riesgo) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-01/N-01, Puri y Marga, 2026-10-30; D-13/N-13, Puri, 2026-10-30 | El importe válido es la suma de líneas; el CSV mantiene las tres líneas sin netear. |
| A-16 | Normalización numérica copiada y punto de millar mal interpretado (contradicción 09) | `PENDIENTE` → `RESUELTA_NEGOCIO` (deuda técnica) | **NEGOCIO** — `acta-entrevista-negocio.md`, D-24/N-24, Marga, 2026-10-30 | Se rechazan formatos no numéricos o con punto de millar. |

## 2. Anomalías que siguen PENDIENTES

| ID | Título | Clasificación / estado | Motivo | Evidencia NEGOCIO | Pregunta para la próxima ronda |
|---|---|---|---|---|---|
| A-06 | Una rectificativa puede cobrarse por `POST` aunque el botón esté oculto, y nace sin vencimiento (H6) | `rareza` / `PENDIENTE` | D-04 prohíbe rectificar una factura cobrada, pero **no decide** si una `RE` puede marcarse cobrada ni si debe llevar vencimiento. | Sin testigo concluyente. El acta §7, punto 1, deja la pregunta abierta. | ¿Una rectificativa puede marcarse cobrada? ¿Debe llevar vencimiento? |
| A-07 | La remesa asigna números sin `ORDER BY` (H7) | `rareza` / `PENDIENTE` | No se preguntó en la sesión. | Sin testigo. Acta §7, punto 2. | ¿Qué orden de contratos debe seguir la numeración de la remesa? |
| A-08 | Una rectificación a medias puede dejar dos documentos vivos (H8) | `riesgo` / `PARCIAL` | D-06 fija el criterio general de factura incompleta con aviso, pero no decide el estado de la original. | **NEGOCIO** — `acta-entrevista-negocio.md`, D-06/N-06, Julián y Marga, 2026-10-30 (solo criterio general). | Si el abono no se completa, ¿la original sigue `emitida` o se marca `rectificada`? |
| A-17 | Factura incompleta con aviso: no hay proceso definido de completado (nueva) | `riesgo` / `PENDIENTE` | El negocio acepta que quede cabecera y líneas parciales con aviso, pero no se ha definido quién lo atiende ni cómo se completa. | **NEGOCIO** — `acta-entrevista-negocio.md`, D-06/N-06, Julián y Marga, 2026-10-30. | ¿Quién atiende el aviso y cómo se completa la factura? |
| A-18 | No hay procedimiento escrito y probado para arrancar o restaurar sin Julián (nueva) | `riesgo operativo/dependencia` / `PENDIENTE` | El acta confirma la ausencia; falta decidir quién lo posee y cuándo se prueba. | **NEGOCIO** — `acta-entrevista-negocio.md`, D-25/N-25, Marga y Manoli, 2026-10-30. | ¿Quién debe tener el procedimiento y cuándo se prueba? |
| A-19 | Facturas históricas descuadradas: no se ha decidido qué hacer con ellas (nueva) | `bug confirmado/datos` / `PENDIENTE` | D-01 fija el criterio hacia adelante, pero no si las facturas antiguas se corrigen, se documentan o se dejan como están. | **NEGOCIO** — `acta-entrevista-negocio.md`, D-01/N-01, Puri y Marga, 2026-10-30 (solo criterio general). | ¿Se corrigen las facturas históricas descuadradas o solo se aplica el criterio hacia adelante? ¿Y en el CSV? |
| A-20 | Alta de contratos sin formulario en la vista (nueva) | `deuda técnica/proceso` / `PENDIENTE` | La ruta `POST /contratos/nuevo` existe, pero `views/contratos.ejs` no tiene formulario; no se ha preguntado cómo se crean los contratos. | Sin testigo. Detectado en `contradiccion-04-iva-por-defecto.md`. | ¿Cómo se dan de alta los contratos en la operación real? |

## 2 bis. Entradas técnicas nuevas detectadas al escribir los tests

Estas dos rarezas no estaban documentadas en el reconocimiento. No requieren decisión de negocio
para esta fase, pero se congelan en la red de tests y quedan como deuda técnica.

| ID | Título | Clasificación / estado | Evidencia | Comportamiento actual |
|---|---|---|---|---|
| A-21 | `formatearImporte` con infinito produce una cadena inválida | `rareza` / `ABIERTA_TECNICA` | `test/util.test.js`; `test/anomalias.test.js` | `formatearImporte(Infinity)` devuelve `"Infinity,undefined"` y `formatearImporte(-Infinity)` devuelve `"-Infinity,undefined"`. |
| A-22 | Un `tipoIva` en cadena calcula IVA pero no recargo | `rareza` / `ABIERTA_TECNICA` | `test/calculo.test.js`; `test/anomalias.test.js` | `calcularLinea(1, 100, '21', true)` devuelve IVA 21 y recargo 0: `calcularLinea` coacciona la cadena, pero `recargoPara` usa igualdad estricta. |
| A-23 | `redondear2` puede devolver `-0` | `rareza` / `ABIERTA_TECNICA` | `test/util.test.js`; `test/anomalias.test.js` | `redondear2(-0.005)` devuelve `-0`; `Object.is(..., -0)` es verdadero y `JSON.stringify` lo serializa como `0`. |

## 3. Historial de cambios de clasificación

No se sobrescribe la clasificación anterior: se conserva aquí el cambio y su testigo.

| Fecha | ID | Antes | Después | Evidencia | Nota |
|---|---|---|---|---|---|
| 2026-10-30 | A-01 | `PENDIENTE` | `RESUELTA_NEGOCIO` | NEGOCIO D-02/N-02 y D-15/N-15 | Se cierra la duda de aplicación y de nota en remesa. |
| 2026-10-30 | A-02 | `PENDIENTE` | `RESUELTA_NEGOCIO` | NEGOCIO D-11/N-11 | El año del número sigue la fecha de la factura. |
| 2026-10-30 | A-03 | `PENDIENTE` | `RESUELTA_NEGOCIO` | NEGOCIO D-12/N-12 | Se reutiliza el número si falla la grabación. |
| 2026-10-30 | A-04 | `PENDIENTE` | `RESUELTA_NEGOCIO` | NEGOCIO D-20/N-20 | Se impide facturar a clientes inactivos. |
| 2026-10-30 | A-05 | `PENDIENTE` | `RESUELTA_NEGOCIO` | NEGOCIO D-21/N-21 | Se rechazan fechas inválidas. |
| 2026-10-30 | A-06 | `PENDIENTE` | `PENDIENTE` (sin cambio) | Acta §7.1 | D-04 no la resuelve; sigue en la agenda. |
| 2026-10-30 | A-07 | `PENDIENTE` | `PENDIENTE` (sin cambio) | Acta §7.2 | No se preguntó. |
| 2026-10-30 | A-08 | `PENDIENTE` | `PARCIAL` | NEGOCIO D-06/N-06 | Criterio general de factura incompleta; falta el estado de la original. |
| 2026-10-30 | A-09 | `DUDOSA` | `RESUELTA_NEGOCIO` | NEGOCIO D-07/N-07 | El descuento reduce el recargo. |
| 2026-10-30 | A-10 | `DUDOSA` | `RESUELTA_NEGOCIO` | NEGOCIO D-14/N-14 | El tablero resta los abonos RE. |
| 2026-10-30 | A-11 | `DUDOSA` | `RESUELTA_NEGOCIO` | NEGOCIO D-03/N-03 | Prorrateo por días reales. |
| 2026-10-30 | A-12 | `DUDOSA` | `RESUELTA_NEGOCIO` | NEGOCIO D-09/N-09 | Plazo único de 30 días. |
| 2026-10-30 | A-13 | `PENDIENTE` | `RESUELTA_NEGOCIO` | NEGOCIO D-22/N-22 | Formato único de importes. |
| 2026-10-30 | A-14 | `PENDIENTE` | `RESUELTA_NEGOCIO` | NEGOCIO D-23/N-23 y D-19/N-19 | IVA obligatorio y tipos antiguos conservados. |
| 2026-10-30 | A-15 | `PENDIENTE` | `RESUELTA_NEGOCIO` | NEGOCIO D-01/N-01 y D-13/N-13 | Suma de líneas como importe válido; CSV con las tres líneas. |
| 2026-10-30 | A-16 | `PENDIENTE` | `RESUELTA_NEGOCIO` | NEGOCIO D-24/N-24 | Se rechazan formatos numéricos no válidos. |
| 2026-10-30 | A-17 | — (nueva) | `PENDIENTE` | NEGOCIO D-06/N-06 | Se abre por el proceso manual de completado. |
| 2026-10-30 | A-18 | — (nueva) | `PENDIENTE` | NEGOCIO D-25/N-25 | Se abre por la ausencia de procedimiento de continuidad. |
| 2026-10-30 | A-19 | — (nueva) | `PENDIENTE` | NEGOCIO D-01/N-01 | Se abre al aplicar el criterio a las facturas históricas. |
| 2026-10-30 | A-20 | — (nueva) | `PENDIENTE` | Detección documental (`contradiccion-04`) | Se abre al no existir formulario de alta de contratos. |
| 2026-10-30 | A-21 | — (nueva) | `ABIERTA_TECNICA` | Tests de caracterización (`test/anomalias.test.js`) | Rareza detectada al congelar `formatearImporte` con infinito. |
| 2026-10-30 | A-22 | — (nueva) | `ABIERTA_TECNICA` | Tests de caracterización (`test/anomalias.test.js`) | Rareza detectada al congelar `recargoPara` y `calcularLinea` con IVA en cadena. |
| 2026-10-30 | A-23 | — (nueva) | `ABIERTA_TECNICA` | Tests de caracterización (`test/anomalias.test.js`) | Rareza detectada al congelar el redondeo de `-0,005`. |

## 4. Agenda de la próxima conversación con el negocio

La lista PENDIENTE del registro no está vacía. Estas son las entradas que requieren decisión:

1. **A-06 (H6):** ¿una rectificativa puede marcarse cobrada? ¿Debe llevar vencimiento?
2. **A-07 (H7):** ¿qué orden de contratos debe seguir la numeración de la remesa?
3. **A-08 (H8):** si el abono no se completa, ¿la original sigue `emitida` o se marca `rectificada`?
4. **A-17:** ¿quién atiende el aviso de factura incompleta y cómo se completa?
5. **A-18:** ¿quién debe tener el procedimiento de arranque/restauración y cuándo se prueba?
6. **A-19:** ¿se corrigen las facturas históricas descuadradas o solo se aplica el criterio hacia adelante? ¿Y en el CSV?
7. **A-20:** ¿cómo se dan de alta los contratos en la operación real?

Además, el acta §7 recoge otras preguntas nuevas que no son anomalías de este registro: prueba de
restauración de la copia diaria, duración del envío manual, alcance de los tipos antiguos y
ratificación real del acta.

## 5. Estado de la lista PENDIENTE

**No está vacía.** Quedan **7 entradas** en estado `PENDIENTE`/`PARCIAL` con pregunta de negocio:
A-06, A-07, A-08, A-17, A-18, A-19 y A-20. Además hay **3 entradas técnicas** en
`ABIERTA_TECNICA` (A-21, A-22 y A-23) que no forman parte de la agenda de negocio.

Por tanto, el reconocimiento **no está todavía listo para pasar a specs formales**. La agenda de la
próxima conversación es la de la sección 4, más los temas adicionales del acta §7 que no son
anomalías de este registro (prueba de restauración, duración del envío manual, alcance de los tipos
antiguos y ratificación real). Cuando estas 7 entradas y esos temas se cierren o se reclasifiquen
con testigo `NEGOCIO`, la lista PENDIENTE quedará vacía y el reconocimiento podrá cerrarse.

## 6. Trazabilidad

- `flujo-factura.md` — H1-H8.
- `reglas-de-negocio.md` — RN-09, RN-34, RN-36, RN-37 y demás reglas citadas.
- `mapa-sistema.md` — zonas oscuras 8-18 y 28.
- `registro-riesgos.md` — R1-R24; actualizado con las nuevas entradas R25-R28.
- `memoria-historica.md` — MH01-MH31; actualizada con MH32-MH36.
- `contradicciones.md` y `contradiccion-01` a `contradiccion-09`.
- `acta-entrevista-negocio.md` y `notas-entrevista-negocio.md` — testigo `NEGOCIO`.
