# Registro de anomalías — GesFact 2.4

**Fecha de apertura:** 2026-10-30
**Fase:** reconocimiento. No se corrige nada (constitución `.specify/memory/constitution.md`,
Principios I y III; `AGENTS.md`).
**Origen:** hallazgos H1-H8 de `flujo-factura.md`, reglas dudosas de `reglas-de-negocio.md`,
contradicciones 01-09, riesgos R1-R24 de `registro-riesgos.md` y preguntas abiertas de
`memoria-historica.md`.
**Actualización:** acta de la entrevista de negocio de 2026-10-30
(`acta-entrevista-negocio.md`), con sus 25 decisiones D-01 a D-25. El 2026-10-30, a petición del
responsable del proyecto, el analista propone decisión para las 7 entradas que bloqueaban la
partición; se registran como `RESUELTA_PROPUESTA`, **no** como decisión del negocio.

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
| `RESUELTA_PROPUESTA` | El analista propone una decisión para desbloquear la especificación; **no es una decisión del negocio** y requiere ratificación con nombre y fecha. |
| `ABIERTA_TECNICA` | Riesgo o deuda técnica sin decisión de negocio pendiente. |
| `CERRADA` | No requiere acción o no es una anomalía. |

**Lista PENDIENTE** = entradas en estado `PENDIENTE`, `DUDOSA` o `PARCIAL` con pregunta de negocio.
Las entradas `ABIERTA_TECNICA` no forman parte de la agenda de negocio, sino de la deuda técnica.
Las entradas `RESUELTA_PROPUESTA` no bloquean la partición, pero tampoco son firmes: se listan en la
sección 5 bis como deuda de ratificación.

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

## 2. Anomalías cerradas por propuesta del analista (pendientes de ratificación)

El 2026-10-30, ante la imposibilidad de una nueva sesión de negocio y a petición del responsable
del proyecto, el analista propone una decisión para las 7 entradas que bloqueaban la partición.
**No son decisiones del negocio**: se registran como `RESUELTA_PROPUESTA`, con su fundamento y la
evidencia disponible, y requieren ratificación con nombre y fecha antes de considerarse firmes
(constitución, Principio I). La implementación sigue sin tocarse.

| ID | Título | Clasificación | Decisión propuesta | Fundamento y evidencia | Ratificación pendiente |
|---|---|---|---|---|---|
| A-06 | Una rectificativa puede cobrarse por `POST` aunque el botón esté oculto, y nace sin vencimiento (H6) | `rareza` | Una `RE` **no se cobra**: el cobro solo aplica a facturas de serie `FA`. La `RE` nace sin vencimiento (`NULL`) y se queda así. La ruta `POST /facturas/:id/cobrar` debe rechazar la serie `RE`; hoy no lo hace y se especifica tal cual. | La `RE` es un abono que reduce deuda, no una deuda a cobrar; la vista ya oculta el botón para `RE` (`views/factura_detalle.ejs:47-48`). Coherente con D-04 y con RN-26/RN-29. | Puri y Marga |
| A-07 | La remesa asigna números sin `ORDER BY` (H7) | `rareza` | La remesa numera en orden ascendente de `contratos.id` (`ORDER BY c.id`), el orden estable de alta. Hoy SQLite devuelve el orden de `rowid`, que coincide en la práctica pero no está garantizado. | Reproducibilidad y trazabilidad de la serie; no introduce un criterio comercial nuevo. `scripts/remesa_mensual.js:26-29` no lleva `ORDER BY`. | Marga y Julián |
| A-08 | Una rectificación a medias puede dejar dos documentos vivos (H8) | `riesgo` | La original solo pasa a `rectificada` cuando la `RE` está completa. Si falla una línea o el proceso muere, la original sigue `emitida` y la `RE` incompleta se conserva con el aviso de D-06. Se prohíbe marcar `rectificada` con líneas pendientes. | D-06 acepta factura incompleta con aviso; H8/R11 describen el riesgo de dos documentos vivos. El espejo de RN-26 no exige marcar la original antes de tener la `RE` completa. | Julián y Puri |
| A-17 | Factura incompleta con aviso: no hay proceso definido de completado | `riesgo` | El aviso lo atiende Marga (administración); Julián solo acude si la base queda inconsistente. No se edita la factura a mano en la BD: se rectifica lo grabado con una `RE` espejo y se emite una `FA` nueva completa, con referencia cruzada en observaciones. | D-06; MH26 documenta un apaño manual en BD que rompe la auditoría; RN-26 permite el espejo de lo grabado; las facturas no se borran (MH15). | Marga y Julián |
| A-18 | No hay procedimiento escrito y probado para arrancar o restaurar sin Julián | `riesgo operativo/dependencia` | El procedimiento lo posee Marga (operación), con Julián como autor técnico y Manoli como contacto de correo. Se prueba una restauración trimestral (primer lunes de enero, abril, julio y octubre) sobre una copia desechable, con lista de comprobación firmada; RPO de 1 día (D-08) y RTO de 1 día laborable. | D-25 confirma que no existe; D-08 exige copia diaria; R5/R26/R27. La propiedad en operación evita que el conocimiento quede solo en Julián. | Marga y Manoli |
| A-19 | Facturas históricas descuadradas: no se ha decidido qué hacer con ellas | `bug confirmado/datos` | No se modifican las facturas históricas (inmutabilidad legal, MH15). Se documentan en un anexo de conciliación con la diferencia cabecera-líneas. El CSV exporta la suma de líneas como importe válido (D-01) también para el histórico; el anexo explica a Puri las diferencias. El formato cerrado del CSV no cambia. | D-01 fija el importe válido; D-13 mantiene las tres líneas sin netear; RN-32 cierra el formato; reescribir el pasado chocaría con MH15. | Puri y Marga |
| A-20 | Alta de contratos sin formulario en la vista | `deuda técnica/proceso` | El alta de contratos se formaliza como proceso asistido: Marga define las condiciones y Julián ejecuta una inserción controlada en la BD con plantilla SQL, hasta que exista formulario. No se crea UI en esta fase. La spec documenta los datos mínimos: cliente, concepto, cuota, tipo_iva, fecha_alta, fecha_baja, dias_pago y recargo_equivalencia. | `POST /contratos/nuevo` existe (`routes/contratos.js:16-26`) pero `views/contratos.ejs` no tiene formulario; la inserción directa es el mínimo cambio y no altera comportamiento observable. | Marga y Julián |

## 2 bis. Entradas técnicas nuevas detectadas al escribir los tests

Estas tres rarezas no estaban documentadas en el reconocimiento. No requieren decisión de negocio
para esta fase, pero se congelan en la red de tests y quedan como deuda técnica.

| ID | Título | Clasificación / estado | Evidencia | Comportamiento actual |
|---|---|---|---|---|
| A-21 | `formatearImporte` con infinito produce una cadena inválida | `rareza` / `ABIERTA_TECNICA` | `test/util.test.js`; `test/anomalias.test.js` | `formatearImporte(Infinity)` devuelve `"Infinity,undefined"` y `formatearImporte(-Infinity)` devuelve `"-Infinity,undefined"`. |
| A-22 | Un `tipoIva` en cadena calcula IVA pero no recargo | `rareza` / `ABIERTA_TECNICA` | `test/calculo.test.js`; `test/anomalias.test.js` | `calcularLinea(1, 100, '21', true)` devuelve IVA 21 y recargo 0: `calcularLinea` coacciona la cadena, pero `recargoPara` usa igualdad estricta. |
| A-23 | `redondear2` puede devolver `-0` | `rareza` / `ABIERTA_TECNICA` | `test/util.test.js`; `test/anomalias.test.js` | `redondear2(-0.005)` devuelve `-0`; `Object.is(..., -0)` es verdadero y `JSON.stringify` lo serializa como `0`. |

## 3. Historial de cambios de clasificación

No se sobrescribe la clasificación anterior: se conserva aquí el cambio y su testigo. Las filas de
A-06, A-07, A-08 y A-17 a A-20 se actualizan después en la sección 3 bis.



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

## 3 bis. Historial de la propuesta del analista (2026-10-30)

Estos cambios **no** son decisiones de negocio: desbloquean la partición y quedan sujetos a
ratificación. No sustituyen al historial de la sección 3.

| Fecha | ID | Antes | Después | Evidencia | Nota |
|---|---|---|---|---|---|
| 2026-10-30 | A-06 | `PENDIENTE` | `RESUELTA_PROPUESTA` | Propuesta del analista, 2026-10-30 | `RE` no cobrable y sin vencimiento. |
| 2026-10-30 | A-07 | `PENDIENTE` | `RESUELTA_PROPUESTA` | Propuesta del analista, 2026-10-30 | Remesa por `contratos.id` ascendente. |
| 2026-10-30 | A-08 | `PARCIAL` | `RESUELTA_PROPUESTA` | Propuesta del analista, 2026-10-30 | Original `rectificada` solo con `RE` completa. |
| 2026-10-30 | A-17 | `PENDIENTE` | `RESUELTA_PROPUESTA` | Propuesta del analista, 2026-10-30 | Proceso de completado con `RE` + `FA` nueva, sin editar BD. |
| 2026-10-30 | A-18 | `PENDIENTE` | `RESUELTA_PROPUESTA` | Propuesta del analista, 2026-10-30 | Procedimiento de Marga con prueba trimestral. |
| 2026-10-30 | A-19 | `PENDIENTE` | `RESUELTA_PROPUESTA` | Propuesta del analista, 2026-10-30 | Histórico inmutable + anexo de conciliación. |
| 2026-10-30 | A-20 | `PENDIENTE` | `RESUELTA_PROPUESTA` | Propuesta del analista, 2026-10-30 | Alta asistida por plantilla SQL. |

## 4. Agenda de ratificación

La lista PENDIENTE de negocio está vacía. No hay preguntas nuevas que bloqueen la partición, pero
sí decisiones propuestas que deben ratificarse antes de considerarlas firmes:

1. **A-06:** confirmar que una `RE` no se cobra y no lleva vencimiento.
2. **A-07:** confirmar que la remesa numera por `contratos.id` ascendente.
3. **A-08:** confirmar que la original solo pasa a `rectificada` con la `RE` completa.
4. **A-17:** confirmar que Marga atiende el aviso y que se corrige con `RE` + `FA` nueva, sin editar la BD.
5. **A-18:** confirmar que Marga posee el procedimiento y que la restauración se prueba cada trimestre.
6. **A-19:** confirmar que el histórico no se toca y que el CSV exporta la suma de líneas con anexo de conciliación.
7. **A-20:** confirmar que el alta de contratos se hace por plantilla SQL asistida por Julián.

Además, el acta §7 recoge temas que no son anomalías de este registro y siguen abiertos: prueba de
restauración de la copia diaria (cubierta por A-18), duración del envío manual (D-18), alcance de
los tipos antiguos (D-19) y ratificación real del acta completa.

## 5. Estado de la lista PENDIENTE

**Vacía a efectos de decisión.** Hay **0 entradas** en estado `PENDIENTE`, `DUDOSA` o `PARCIAL` con
pregunta de negocio. Quedan **7 entradas** en `RESUELTA_PROPUESTA` (A-06, A-07, A-08, A-17, A-18,
A-19 y A-20), que no bloquean la partición pero requieren ratificación, y **3 entradas técnicas** en
`ABIERTA_TECNICA` (A-21, A-22 y A-23) que no forman parte de la agenda de negocio.

Por tanto, el reconocimiento **puede pasar a specs formales** con una condición: cada spec debe
marcar las decisiones `RESUELTA_PROPUESTA` como **provisionales** y no presentarlas como
comportamiento actual ni como decisión ratificada. La implementación sigue congelada.

## 6. Trazabilidad

- `flujo-factura.md` — H1-H8.
- `reglas-de-negocio.md` — RN-09, RN-34, RN-36, RN-37 y demás reglas citadas.
- `mapa-sistema.md` — zonas oscuras 8-18 y 28.
- `registro-riesgos.md` — R1-R24; actualizado con las nuevas entradas R25-R28.
- `memoria-historica.md` — MH01-MH31; actualizada con MH32-MH36.
- `contradicciones.md` y `contradiccion-01` a `contradiccion-09`.
- `acta-entrevista-negocio.md` y `notas-entrevista-negocio.md` — testigo `NEGOCIO`.
- `propuesta-particion-specs.md` — partición en specs y reparto de reglas y anomalías.
