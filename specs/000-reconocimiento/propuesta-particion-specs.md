# Propuesta de partición del sistema en specs formales — GesFact 2.4

**Fecha:** 2026-10-30
**Fase:** reconocimiento → especificación.
**Estado:** propuesta para revisión y aprobación. **No se ha ejecutado ningún `/speckit-specify`**
ni se ha modificado código, configuración o datos.
**Precondición:** la lista PENDIENTE del registro está **vacía a efectos de decisión** (0 entradas
`PENDIENTE`/`DUDOSA`/`PARCIAL`). Quedan 7 entradas `RESUELTA_PROPUESTA` (A-06, A-07, A-08, A-17,
A-18, A-19 y A-20), pendientes de ratificación, y 3 `ABIERTA_TECNICA` (A-21, A-22 y A-23). Las
propuestas se marcan como **provisionales** en cada spec y no se presentan como decisiones
ratificadas.
**Fuentes:** `mapa-sistema.md`, `flujo-factura.md`, `reglas-de-negocio.md`, `contradicciones.md` y
`contradiccion-01` a `contradiccion-09`, `registro-anomalias.md`, `registro-riesgos.md`,
`memoria-historica.md`, `acta-entrevista-negocio.md`, `notas-entrevista-negocio.md`, `test/` y
`test/COBERTURA.md`.

---

## 0. Criterio aplicado

### 0.1 Reglas de partición

1. **Dominio de negocio, no fichero ni capa.** Cada spec agrupa reglas que el negocio decide juntas
   y que pueden evolucionar sin arrastrar a las demás. `services/calculo.js` aparece en varias
   specs porque sirve a varios dominios; ninguna spec se define por «el fichero de cálculo».
2. **Una spec, un contrato revisable en una sentada.** Se estima ≤ 30 minutos de lectura por spec.
   Cuando dos specs se citarían en más de la mitad de sus requisitos, se fusionan.
3. **Contradicciones.** La convención declarada vigente va a la spec que posee la regla. La
   implementación divergente se registra como anomalía en la spec del camino que la usa, con
   remisión a la spec dueña.
4. **Completitud.** Las 39 reglas `RN-*` y las 23 anomalías `A-*` tienen spec asignada. Lo que se
   excluye son riesgos puramente técnicos o de infraestructura, y se justifica en §1.5.
5. **Comportamiento actual, no deseo.** Las specs documentan lo que el sistema hace hoy. Las
   decisiones del acta y las propuestas `RESUELTA_PROPUESTA` son **tratamiento de la anomalía**, no
   requisitos ya implementados.
6. **Testigos provisionales.** El acta de 2026-10-30 es una **simulación no ratificada**
   (`acta-entrevista-negocio.md:4-7`). Las citas `D-*`/`N-*` identifican quién respondió en la
   simulación, no una decisión real con nombre y fecha; las specs deben marcarlas como
   provisionales hasta la ratificación.

### 0.2 Nomenclatura

- `RN-*`: regla de negocio de `reglas-de-negocio.md`.
- `A-*`: anomalía de `registro-anomalias.md`.
- `D-*` / `N-*`: decisión y pregunta del acta (`acta-entrevista-negocio.md` y
  `notas-entrevista-negocio.md`).
- `R-*`: riesgo técnico de `registro-riesgos.md`, fuera de las specs salvo cuando se convierte en
  anomalía observable.

---

# Parte 1 — La partición

## 1.1 Mapa resumen

| # | Spec | Reglas RN-* | Anomalías A-* | Dueño natural | Revisión |
|---|---|---|---|---|---|
| 001 | Cálculo de importes, descuentos y redondeo | RN-01 a RN-10 | A-09, A-22, A-23 | Puri (gestoría) / Paco (comercial) | ~25 min |
| 002 | Emisión manual de facturas | RN-21 a RN-24 | A-04, A-05, A-17 (A-15 se cita) | Marga (administración) / Julián (soporte) | ~30 min |
| 003 | Cobro y rectificación | RN-25 a RN-29 | A-06, A-08 (A-15 se cita) | Puri / Marga | ~25 min |
| 004 | Numeración y series | RN-18 a RN-20 | A-02, A-03 | Puri / Julián | ~20 min |
| 005 | Contratos y prorrateo de cuotas | RN-11, RN-14 | A-11, A-20 | Paco / Marga | ~20 min |
| 006 | Remesa mensual | RN-35 a RN-39 | A-01, A-07, A-12 | Marga / Julián | ~30 min |
| 007 | Informes, CSV y tablero | RN-30 a RN-34 | A-10, A-15, A-19 | Puri / Marga | ~30 min |
| 008 | Datos maestros, condiciones del cliente y formatos | RN-12, RN-13, RN-15, RN-16, RN-17 | A-13, A-14, A-16, A-21 | Marga / Puri / Julián | ~30 min |
| 009 | Operación, respaldo y continuidad | — | A-18 | Marga / Manoli / Julián | ~15 min |

**Decisión de tamaño:** se separan 005 (contratos y prorrateo) y 006 (remesa) porque la convención
de prorrateo se decide con Paco y la operación de la remesa con Marga/Julián; comparten el prorrateo
pero no la mayoría de sus requisitos. Se separan 002 (emisión) y 003 (cobro/rectificación) porque
una factura emitida y un abono tienen ciclos de vida y responsables distintos. 008 agrupa datos
maestros, condiciones del cliente y formatos porque las tres cosas se deciden al dar de alta un
cliente o un artículo y no cambian la fórmula del dinero.

---

## 1.2 Specs en detalle

### Spec 001 — Cálculo de importes, descuentos y redondeo

**Alcance.** Define cómo se obtiene cada importe de una factura: base por línea, IVA, recargo de
equivalencia, descuento por volumen y total. Es el contrato que la gestoría cuadra línea a línea con
Contaplus; cualquier cambio aquí afecta a todas las facturas, manuales o de remesa.

**Módulos que la evidencian.** `services/calculo.js` (`recargoPara`, `calcularLinea`,
`porcentajeDescuento`, `calcularFactura`), `lib/util.js` (`redondear2`), `config.js`
(`IVA_DEFECTO`), `db.js` (datos sembrados de referencia).

**Reglas RN-* que le pertenecen.** RN-01, RN-02, RN-03, RN-04, RN-05, RN-06, RN-07, RN-08, RN-09,
RN-10.

**Anomalías A-*.**

| ID | Clasificación | Tratamiento |
|---|---|---|
| A-09 | rareza / `RESUELTA_NEGOCIO` (D-07) | Se especifica que el descuento reduce base, IVA y recargo. La convención vigente confirma que es lo deseado; no hay cambio de código en esta fase. |
| A-22 | rareza / `ABIERTA_TECNICA` | Se especifica tal cual: `calcularLinea(1, 100, '21', true)` da IVA 21 y recargo 0 porque `recargoPara` usa igualdad estricta. Deuda técnica, sin decisión de negocio. |
| A-23 | rareza / `ABIERTA_TECNICA` | Se especifica tal cual: `redondear2(-0.005)` devuelve `-0`; `Object.is(..., -0)` es verdadero y `JSON.stringify` lo serializa como `0`. Deuda técnica. |

**Characterization tests.** `test/calculo.test.js` (RN-01 a RN-10, A-09, A-14, A-22),
`test/reglas-negocio.test.js` (RN-01 a RN-10), `test/util.test.js` (RN-01, A-23),
`test/anomalias.test.js` (A-09, A-22, A-23). **Golden master:** sí; casos `manual-simple`,
`manual-recargo`, `manual-mixta`, `descuento-2-justo-encima`, `descuento-5-justo-encima`,
`frontera-1000`, `frontera-5000` y `redondeo-por-linea`.

**Dueño natural.** Puri (gestoría) por el redondeo línea a línea y el IVA; Paco por los umbrales y
porcentajes del descuento. Testigos: MH13 (Puri devolvió un trimestre en 2019), MH07/MH10 (Paco y
los umbrales de 2018), acta D-07/N-07 (Puri y Paco, 2026-10-30) y D-16/N-16 (Paco, 2026-10-30).

**Frontera.** El descuento por volumen también se aplica en la remesa; la regla de cálculo vive
aquí y su traza/nota vive en 006. El recargo de equivalencia depende del cliente, pero su fórmula
vive aquí y la condición del cliente en 008.

---

### Spec 002 — Emisión manual de facturas

**Alcance.** Describe el alta de una factura desde la web: qué filas se aceptan, cómo se normalizan
cantidad y precio, qué fecha y estado toma, cuándo se anota el descuento y qué pasa si la grabación
falla. Es el camino donde administración introduce el dinero a mano.

**Módulos que la evidencian.** `routes/facturas.js` (alta `:42-102`), `views/factura_nueva.ejs`,
`public/js/factura.js`, `lib/util.js` (`sumarDias`, `hoy`), `services/calculo.js`,
`lib/numeracion.js` (consumo, se detalla en 004), `db.js` (esquema y siembra).

**Reglas RN-* que le pertenecen.** RN-21, RN-22, RN-23, RN-24.

**Anomalías A-*.**

| ID | Clasificación | Tratamiento |
|---|---|---|
| A-04 | rareza / `RESUELTA_NEGOCIO` (D-20) | Se especifica que el alta acepta un cliente inactivo por `POST` aunque el desplegable solo liste activos. La convención vigente (008) es impedir facturar a un cliente de baja; la brecha queda en esta spec. |
| A-05 | riesgo / `RESUELTA_NEGOCIO` (D-21) | Se especifica que una fecha libre llega a la columna y produce vencimiento `NaN-NaN-NaN`. La convención vigente (008) es rechazar fechas inválidas; la brecha queda aquí. |
| A-17 | riesgo / `RESUELTA_PROPUESTA` | Se especifica que, si falla una línea, queda la cabecera y responde 500. La propuesta de proceso (Marga atiende; `RE` + `FA` nueva, sin editar BD) es tratamiento provisional, no comportamiento actual. |
| A-15 | bug confirmado / `RESUELTA_NEGOCIO` (D-01/D-13) | Se cita desde aquí porque la convención «importe válido = suma de líneas» es de la factura; la manifestación en CSV/tablero se especifica en 007. |

**Characterization tests.** `test/contradicciones.test.js` (contradicciones 04, 05, 06, 08 y 09),
`test/anomalias.test.js` (A-04, A-05, A-17), `test/reglas-negocio.test.js` (RN-22, parte pura).
**Golden master:** sí; casos `manual-simple`, `manual-recargo` y `manual-mixta`. Las rutas HTTP no
se ejecutan en la red actual (`test/COBERTURA.md:116-118`); el comportamiento de ruta se congela por
fuente.

**Dueño natural.** Marga (administración) para la captura y la validación; Julián para el alta y la
recuperación. Testigos: acta D-06/N-06 (Julián y Marga), D-17/N-17 (Marga), D-20/N-20 (Marga),
D-21/N-21 (Julián y Marga), D-23/N-23 (Marga y Julián) y D-24/N-24 (Marga), todas de 2026-10-30.

**Frontera.** La fecha de la factura también alimenta el vencimiento (008) y el año del número
(004). La factura incompleta se corrige con una rectificativa (003), pero el hecho nace aquí.

---

### Spec 003 — Cobro y rectificación

**Alcance.** Define el ciclo de vida posterior a la emisión: cuándo una factura pasa a `cobrada`,
cómo se construye un abono en serie `RE`, qué se copia y qué se invierte, y qué facturas no pueden
rectificarse. Es el dominio donde se corrige un error sin borrar el documento original.

**Módulos que la evidencian.** `routes/facturas.js` (cobro `:117-122`, rectificación `:129-164`),
`views/factura_detalle.ejs`, `lib/numeracion.js` (serie `RE`), `db.js` (estados y
`rectifica_a`).

**Reglas RN-* que le pertenecen.** RN-25, RN-26, RN-27, RN-28, RN-29.

**Anomalías A-*.**

| ID | Clasificación | Tratamiento |
|---|---|---|
| A-06 | rareza / `RESUELTA_PROPUESTA` | Se especifica que una `RE` puede cobrarse por `POST` y nace sin vencimiento. Propuesta provisional: la `RE` no se cobra y el `POST` debe rechazar la serie `RE`; la `RE` sigue sin vencimiento. |
| A-08 | riesgo / `RESUELTA_PROPUESTA` | Se especifica que la rectificación ignora el error de línea y marca la original `rectificada`; si el proceso muere, quedan dos documentos vivos. Propuesta provisional: la original solo pasa a `rectificada` con la `RE` completa. |
| A-15 | bug confirmado / `RESUELTA_NEGOCIO` (D-01) | Se cita porque la `RE` copia los totales de cabecera de la original; si la original está descuadrada, el espejo arrastra el descuadre. La manifestación principal se especifica en 007. |

**Characterization tests.** `test/golden-master.test.js` (caso `rectificativa`),
`test/anomalias.test.js` (A-06, A-08), `test/contradicciones.test.js` (05 y 07).
**Golden master:** sí, caso `rectificativa`. Las rutas HTTP de cobro y rectificación no se ejecutan;
se congelan por fuente.

**Dueño natural.** Puri (gestoría) por el «espejo exacto» y la prohibición de rectificar cobradas;
Marga por la operación. Testigos: MH31 («Puri dixit»), acta D-04/N-04 (Puri y Marga), D-06/N-06
(Julián y Marga) y D-13/N-13 (Puri), 2026-10-30.

**Frontera.** La rectificativa consume numeración (004) y su efecto se ve en el tablero y el CSV
(007). El estado de la original en una rectificación incompleta es la frontera con la factura
incompleta (002).

---

### Spec 004 — Numeración y series

**Alcance.** Define la serie correlativa `FA`/`RE`, el formato `SERIE-AAAA-NNNNNN`, el reinicio en
año nuevo y el riesgo de duplicado por falta de atomicidad. Es una obligación legal y un contrato
con Hacienda y la gestoría, no una preferencia estética.

**Módulos que la evidencian.** `lib/numeracion.js` (`siguienteNumero`, `reservar`, `formatear`),
`db.js` (tabla `contadores`, ausencia de `UNIQUE`), `routes/facturas.js` y
`scripts/remesa_mensual.js` (consumidores).

**Reglas RN-* que le pertenecen.** RN-18, RN-19, RN-20.

**Anomalías A-*.**

| ID | Clasificación | Tratamiento |
|---|---|---|
| A-02 | rareza / `RESUELTA_NEGOCIO` (D-11) | Se especifica que el año del número es el de ejecución, no el de la fecha de la factura. La convención vigente es que sea el año de la fecha; la brecha queda aquí. |
| A-03 | riesgo / `RESUELTA_NEGOCIO` (D-12) | Se especifica que el número se consume aunque falle la cabecera. La convención vigente es reutilizar el número si la factura no llega a grabarse; la brecha queda aquí. |

**Characterization tests.** `test/numeracion.test.js` (RN-18, RN-19, A-02, A-03 y R1 con doble de
DB), `test/anomalias.test.js` (A-02, A-03). **Golden master:** no; la numeración se prueba con un
doble de `db.js`, no en el flujo golden.

**Dueño natural.** Puri y Julián. Testigos: MH15 (inspección de 2020), MH16 (duplicado de
2021-01-02), acta D-11/N-11 y D-12/N-12 (Puri y Julián, 2026-10-30).

**Frontera.** A-07 (orden de numeración de la remesa) es una regla de la remesa (006), no de la
numeración: la serie no decide el orden de los contratos. R1/R28 siguen en `registro-riesgos.md`.

---

### Spec 005 — Contratos y prorrateo de cuotas

**Alcance.** Define qué es un contrato de cuota mensual, cuándo está activo y cómo se calcula el
importe del mes de baja. Incluye la contradicción entre el prorrateo comercial de 30 días de la
pantalla y el prorrateo por días reales de la remesa.

**Módulos que la evidencian.** `routes/contratos.js` (alta `:16-26`, baja y prorrateo `:31-43`),
`services/calculo.js` (`calcularProrrateo` `:90-102`), `views/contratos.ejs`, `db.js` (tabla
`contratos`), `lib/util.js` (`diasDelMes`).

**Reglas RN-* que le pertenecen.** RN-11 (prorrateo comercial de 30 días, implementación de la
pantalla), RN-14 (días reales del mes). La convención D-03 (días reales) se declara aquí porque es
la regla del dominio; su implementación en la remesa se especifica en 006 (RN-36).

**Anomalías A-*.**

| ID | Clasificación | Tratamiento |
|---|---|---|
| A-11 | riesgo / `RESUELTA_NEGOCIO` (D-03) | Se especifican los dos prorrateos: pantalla `90/30×15 = 45,00 €` y remesa `90/31×15 = 43,55 €` en marzo; en febrero, `45,00 €` frente a `48,21 €`. La convención vigente es días reales; la implementación divergente de la pantalla queda aquí. |
| A-20 | deuda técnica/proceso / `RESUELTA_PROPUESTA` | Se especifica que la vista de contratos no tiene formulario de alta. Propuesta provisional: alta asistida por plantilla SQL de Julián, con Marga definiendo las condiciones; sin UI nueva en esta fase. |

**Characterization tests.** `test/calculo.test.js` (RN-11, A-14), `test/reglas-negocio.test.js`
(RN-11, RN-14), `test/util.test.js` (RN-14), `test/contradicciones.test.js` (contradicción 01),
`test/anomalias.test.js` (A-11, A-20). **Golden master:** sí; casos `prorrateo-marzo`,
`prorrateo-febrero` y `febrero-bisiesto`.

**Dueño natural.** Paco por el prorrateo original y el descuento; Marga por la operación de
contratos. Testigos: MH01 (Paco en Access), MH27 (administración emite el prorrateo a mano), acta
D-02/N-02 (Paco), D-03/N-03 (Paco y Puri), D-15/N-15 (Puri y Marga), 2026-10-30.

**Frontera.** La remesa (006) consume contratos y aplica el prorrateo por días reales; el alta de
contratos también toca datos maestros (008), pero la regla de negocio del contrato vive aquí.

---

### Spec 006 — Remesa mensual

**Alcance.** Describe la emisión en lote de las cuotas de contrato: qué contratos entran, cómo se
prorratea el mes, qué fecha y vencimiento lleva la factura, qué línea y nota genera y qué ocurre si
se relanza el mismo mes. Es un script de línea de comandos que emite facturas reales.

**Módulos que la evidencian.** `scripts/remesa_mensual.js`, `lib/util.js` (`diasDelMes`,
`sumarDias`), `services/calculo.js` (`calcularFactura`), `lib/numeracion.js`,
`views/index.ejs` (recordatorio).

**Reglas RN-* que le pertenecen.** RN-35, RN-36, RN-37, RN-38, RN-39.

**Anomalías A-*.**

| ID | Clasificación | Tratamiento |
|---|---|---|
| A-01 | riesgo/discrepancia / `RESUELTA_NEGOCIO` (D-02/D-15) | Se especifica que la remesa aplica el descuento por volumen pero no lo anota en observaciones. La convención vigente es aplicar el descuento a cuotas y anotar el porcentaje; la brecha queda aquí. |
| A-07 | rareza / `RESUELTA_PROPUESTA` | Se especifica que la consulta no lleva `ORDER BY` y el orden es el de SQLite. Propuesta provisional: `ORDER BY c.id` ascendente. |
| A-12 | rareza / `RESUELTA_NEGOCIO` (D-09) | Se especifica que la remesa usa `co.dias_pago || 30` con el `30` literal, frente a `config.VENCIMIENTO_DIAS` en la manual. La convención vigente es un único plazo de 30 días y una sola fuente; la brecha queda aquí. |

**Characterization tests.** `test/anomalias.test.js` (A-01, A-07, A-12 y R4),
`test/contradicciones.test.js` (contradicciones 01, 03 y 06), `test/calculo.test.js` (RN-11 como
modelo), `test/golden/flujo-central.js` (modelo de prorrateo). **Golden master:** parcial; cubre el
modelo de prorrateo (`prorrateo-marzo`, `prorrateo-febrero`, `febrero-bisiesto`), pero no ejecuta el
job ni la escritura real.

**Dueño natural.** Marga (lanza la remesa el día 1) y Julián (script); Puri para el descuento y el
vencimiento. Testigos: MH17 (Roberto, verano 2021), MH21 (doble remesa de abril de 2026), acta
D-02/N-02 (Paco), D-05/N-05 (Marga y Julián), D-09/N-09 (Marga) y D-15/N-15 (Puri y Marga),
2026-10-30.

**Frontera.** El prorrateo por días reales es la aplicación de la convención de 005 (RN-36); el
orden de numeración es de la remesa (A-07), no de la serie (004). La idempotencia se decide aquí
(D-05) y su falta es R4.

---

### Spec 007 — Informes, CSV y tablero

**Alcance.** Define qué cifras ve el negocio y qué fichero recibe la gestoría: resumen trimestral de
IVA por tipo, CSV anual con formato cerrado y tablero de importe pendiente. Es la salida del sistema
hacia el modelo 303 y la contabilidad externa.

**Módulos que la evidencian.** `routes/informes.js` (IVA `:14-30`, CSV `:34-51`), `server.js`
(tablero `:20-36`), `config.js` (`CLAVE_EXPORT_GESTORIA`), `views/informes.ejs`,
`views/informe_iva.ejs`, `views/index.ejs`, `db.js` (datos sembrados).

**Reglas RN-* que le pertenecen.** RN-30, RN-31, RN-32, RN-33, RN-34.

**Anomalías A-*.**

| ID | Clasificación | Tratamiento |
|---|---|---|
| A-10 | rareza / `RESUELTA_NEGOCIO` (D-14) | Se especifica que el tablero suma solo `FA` en estado `emitida` y no resta las `RE`. La convención vigente es restar los abonos `RE`; la brecha queda aquí. |
| A-15 | bug confirmado/riesgo / `RESUELTA_NEGOCIO` (D-01/D-13) | Se especifica que cabecera y líneas pueden no cuadrar y que el CSV exporta la cabecera. La convención vigente es que el importe válido es la suma de líneas y que el CSV mantiene las tres líneas sin netear; la manifestación queda aquí. |
| A-19 | bug confirmado/datos / `RESUELTA_PROPUESTA` | Se especifica que las facturas históricas descuadradas siguen en la copia. Propuesta provisional: no se modifican; se documentan en un anexo de conciliación y el CSV exporta la suma de líneas. |

**Characterization tests.** `test/anomalias.test.js` (A-10, A-15, A-19),
`test/contradicciones.test.js` (contradicciones 02 y 07), `test/fixtures/facturas-sembradas.json`
(casos descuadrados). **Golden master:** parcial; cubre los totales del flujo central, pero no el
CSV ni el informe de IVA (SQL no ejecutado).

**Dueño natural.** Puri (gestoría) por el CSV, el formato y el 303; Marga por el tablero y la
entrega. Testigos: MH11 (formato CSV de 2019), MH28 (modelo 303), acta D-01/N-01 (Puri y Marga),
D-13/N-13 (Puri) y D-14/N-14 (Marga y Puri), 2026-10-30.

**Frontera.** El importe válido (suma de líneas) es una regla de la factura (002); aquí se
especifica su manifestación en el CSV y el tablero. El formato de importes (A-13) vive en 008; el
CSV usa coma decimal por RN-32 y no se duplica.

---

### Spec 008 — Datos maestros, condiciones del cliente y formatos

**Alcance.** Define los datos que alimentan la facturación (NIF, recargo, plazo de pago, IVA de
artículos y contratos) y las convenciones de presentación (fecha e importe). Es el dominio de
calidad del dato: un NIF, un IVA o un plazo mal grabado contaminan todas las facturas futuras.

**Módulos que la evidencian.** `routes/clientes.js`, `routes/articulos.js`, `routes/contratos.js`
(datos de entrada), `lib/util.js` (`validarNIF`, `formatearImporte`, `fechaBonita`, `sumarDias`,
`diasDelMes`), `config.js` (`IVA_DEFECTO`, `VENCIMIENTO_DIAS`), `db.js` (maestros), `views/*.ejs`
(formatos).

**Reglas RN-* que le pertenecen.** RN-12, RN-13, RN-15, RN-16, RN-17.

**Anomalías A-*.**

| ID | Clasificación | Tratamiento |
|---|---|---|
| A-13 | deuda técnica/rareza / `RESUELTA_NEGOCIO` (D-22) | Se especifica que conviven `1.234,50` (`formatearImporte`) y `1234.50` (`.toFixed(2)` en artículos, contratos y tablero). La convención vigente es el formato de la factura; la brecha queda aquí y se cita en 005 y 007. |
| A-14 | deuda técnica / `RESUELTA_NEGOCIO` (D-23/D-19) | Se especifica que el IVA por defecto depende del maestro (21 en artículos/contratos) y que una línea sin IVA produce `NaN`. La convención vigente es rechazar si falta el IVA y conservar los tipos 16/18/7/8; la brecha queda aquí y se cita en 001, 002 y 005. |
| A-16 | deuda técnica / `RESUELTA_NEGOCIO` (D-24) | Se especifica que `parseFloat('1.234,56'.replace(',', '.'))` guarda `1,234` y que `12 ud` guarda `12`. La convención vigente es rechazar formatos no numéricos o con punto de millar; la brecha queda aquí y se cita en 002 y 005. |
| A-21 | rareza / `ABIERTA_TECNICA` | Se especifica tal cual: `formatearImporte(Infinity)` devuelve `"Infinity,undefined"` y `formatearImporte(-Infinity)` devuelve `"-Infinity,undefined"`. Deuda técnica. |

**Characterization tests.** `test/util.test.js` (RN-15, RN-16, RN-17, RN-13, A-21),
`test/reglas-negocio.test.js` (RN-12, RN-13, RN-15, RN-16, RN-17),
`test/anomalias.test.js` (A-13, A-14, A-16, A-21), `test/contradicciones.test.js` (02, 03, 04, 08,
09). **Golden master:** no; son reglas de utilidad y presentación, no del flujo de cálculo.

**Dueño natural.** Marga (NIF, formatos, datos de cliente), Puri (IVA y criterios de gestoría) y
Julián (validación técnica). Testigos: MH05 (NIF delegado a Marga, 2017), MH19/MH20 (correo, fuera
de alcance), acta D-10/N-10 (Marga), D-19/N-19 (Puri y Julián), D-22/N-22 (Marga) y D-23/N-23
(Marga y Julián), 2026-10-30.

**Frontera.** El vencimiento (RN-12) se usa en 002 y 006, pero la regla del plazo vive aquí. El IVA
por defecto (A-14) toca la tabla de recargos de 001, pero la política de tipos y validación vive
aquí. La validación de fechas (A-05) se manifiesta en 002, pero la convención de rechazo vive aquí.

---

### Spec 009 — Operación, respaldo y continuidad

**Alcance.** Documenta el proceso humano que mantiene el sistema en marcha: quién arranca, quién
copia la base, quién restaura y cómo se prueba. No es una spec de producto: es el contrato de
operación que hoy no existe y que el negocio necesita para no depender de una sola persona.

**Módulos que la evidencian.** No hay módulo de aplicación. Evidencia documental: `LEEME.txt`
(instalación y copia semanal), `views/pie.ejs` (soporte de Julián), `config.js` (rutas de
despliegue), `registro-riesgos.md` (R5, R26, R27) y `memoria-historica.md` (MH29, MH30, MH34).

**Reglas RN-* que le pertenecen.** Ninguna. Es un dominio de proceso, no de cálculo.

**Anomalías A-*.**

| ID | Clasificación | Tratamiento |
|---|---|---|
| A-18 | riesgo operativo/dependencia / `RESUELTA_PROPUESTA` | Se especifica que no existe procedimiento escrito y probado. Propuesta provisional: Marga posee el procedimiento, Julián lo escribe, Manoli cubre el correo; prueba de restauración trimestral sobre copia desechable, RPO 1 día y RTO 1 día laborable. |

**Characterization tests.** `test/anomalias.test.js` (A-18, comprobación documental de que no hay
procedimiento en el repo). **Golden master:** no.

**Dueño natural.** Marga y Manoli, con Julián como soporte técnico. Testigos: MH29 (copia semanal de
Marga), MH30 (soporte de Julián), acta D-08/N-08 (Marga y Julián) y D-25/N-25 (Marga y Manoli),
2026-10-30.

**Frontera.** El correo manual (D-18) y la copia diaria (D-08) son operación, no producto; no
generan RN. La seguridad (R2/R3), dependencias (R6) y despliegue (R17/R18) quedan fuera de esta
spec y en `registro-riesgos.md`.

---

## 1.3 Reparto de las contradicciones 01-09

| Contradicción | Convención vigente (decisión) | Spec dueña de la convención | Implementación divergente | Spec que la registra como anomalía |
|---|---|---|---|---|
| 01 — Prorrateo 30 días / días reales | Días reales (D-03/N-03, Paco y Puri) | 005 | Pantalla de contratos a 30 días (`services/calculo.js:95-102`); remesa a días reales (`remesa_mensual.js:47-51`) | 005 (A-11); 006 aplica la convención en RN-36 |
| 02 — Formato de importes | Formato de la factura: coma decimal y punto de millar (D-22/N-22, Marga) | 008 | `.toFixed(2)` en artículos, contratos y tablero | 008 (A-13); se cita en 005 y 007 |
| 03 — Vencimiento por defecto | 30 días y una sola fuente para manual y remesa (D-09/N-09, Marga) | 008 | Remesa con `30` literal (`remesa_mensual.js:60`) | 006 (A-12) |
| 04 — IVA por defecto y tipos | Rechazar si falta; conservar 16/18/7/8 (D-23/N-23 y D-19/N-19, Marga/Julián y Puri/Julián) | 008 | Artículos/contratos con 21 por defecto; línea sin IVA da `NaN` | 008 (A-14); se cita en 001, 002 y 005 |
| 05 — Grabación de cabecera y líneas | Factura incompleta con aviso (D-06/N-06, Julián y Marga) | 002 (emisión) y 003 (rectificación) | Tres `INSERT` con tres políticas de error | 002 (A-17) y 003 (A-08) |
| 06 — Traza del descuento | Aplicar a cuotas y anotar el porcentaje (D-02/N-02 y D-15/N-15, Paco y Puri/Marga) | 006 (remesa) y 002 (manual) | Remesa sin nota (`remesa_mensual.js:62`) | 006 (A-01); se cita en 001 |
| 07 — Totales cabecera/líneas | Importe válido = suma de líneas; CSV con las tres líneas (D-01/N-01 y D-13/N-13, Puri/Marga y Puri) | 002 (importe) y 007 (CSV) | CSV y tablero usan la cabecera; 6 de 9 facturas sembradas descuadran | 007 (A-15); se cita en 002 y 003 |
| 08 — Validación de fechas | Rechazar fechas inválidas (D-21/N-21, Julián y Marga) | 008 | Factura manual y baja de contrato no validan; remesa solo valida forma `YYYY-MM` | 002 (A-05); 006 cita la validación de la remesa |
| 09 — Normalización numérica | Rechazar formatos no numéricos o con punto de millar (D-24/N-24, Marga) | 008 | Conversión copiada en facturas, artículos y contratos | 008 (A-16); se cita en 002 y 005 |

---

## 1.4 Completitud

### Reglas RN-*

| Spec | Reglas |
|---|---|
| 001 | RN-01, RN-02, RN-03, RN-04, RN-05, RN-06, RN-07, RN-08, RN-09, RN-10 |
| 002 | RN-21, RN-22, RN-23, RN-24 |
| 003 | RN-25, RN-26, RN-27, RN-28, RN-29 |
| 004 | RN-18, RN-19, RN-20 |
| 005 | RN-11, RN-14 |
| 006 | RN-35, RN-36, RN-37, RN-38, RN-39 |
| 007 | RN-30, RN-31, RN-32, RN-33, RN-34 |
| 008 | RN-12, RN-13, RN-15, RN-16, RN-17 |
| 009 | — |

No queda ninguna RN sin spec. La única regla que se declara como convención sin RN propio es el
prorrateo por días reales (D-03), que se especifica en 005 y se implementa en 006 (RN-36).

### Anomalías A-*

| Spec | Anomalías |
|---|---|
| 001 | A-09, A-22, A-23 |
| 002 | A-04, A-05, A-17 |
| 003 | A-06, A-08 |
| 004 | A-02, A-03 |
| 005 | A-11, A-20 |
| 006 | A-01, A-07, A-12 |
| 007 | A-10, A-15, A-19 |
| 008 | A-13, A-14, A-16, A-21 |
| 009 | A-18 |

No queda ninguna A sin spec. Las anomalías que se citan en dos specs tienen una **primaria** (la de
esta tabla) y una **remisión** en la otra; no se duplica su especificación.

---

## 1.5 Exclusiones justificadas

Quedan fuera de las specs de negocio, y permanecen en `registro-riesgos.md`, los riesgos que no
tienen comportamiento de negocio observable o que son de infraestructura:

- **R2** (credenciales en texto plano), **R3** (sin autenticación ni CSRF), **R6** (lock y
  dependencias), **R17** (LEEME desactualizado), **R18** (rutas relativas), **R20** (sin tests/CI),
  **R22** (el tablero oculta errores de BD), **R23** (sin claves foráneas ni índices), **R24**
  (volcado MySQL huérfano). Son deuda técnica, seguridad o despliegue.
- **R1** y **R28** (duplicado/reutilización de número): se citan en 004 y se congelan en
  `test/numeracion.test.js`, pero su tratamiento es técnico.
- **R4** (remesa no idempotente): se cita en 006 porque D-05 decide impedir la segunda emisión; la
  falta de transacción sigue siendo técnica.
- **R5, R26 y R27** (copias y continuidad): se convierten en A-18 y se especifican en 009.
- **R13** (correo): `services/email.js` es un stub; D-18 mantiene el envío manual. No hay RN ni A
  asociada; se menciona en 009 como proceso, pero no se especifica el envío.
- **R7, R8, R9, R10, R11, R14, R15, R16, R19, R21, R25**: ya están cubiertos por las anomalías
  A-01 a A-19 y se citan en la spec correspondiente.
- **Estilos, vistas no funcionales, `datos/migracion_mysql_2018.sql`, `LEEME.txt`**: fuera del
  alcance de negocio. Las vistas solo se especifican en cuanto a formato o campo de negocio.

**Exclusión deliberada del correo:** no se crea una spec de correo porque el sistema no envía; el
proceso real es imprimir y enviar desde Outlook (MH19, D-18). Si el negocio decide reactivarlo,
será una feature nueva, no una spec de ingeniería inversa.

---

## 1.6 Casos frontera y criterio aplicado

| Concepto | Podría caer en | Recomendación | Criterio |
|---|---|---|---|
| Prorrateo de cuotas (RN-11/RN-14/RN-36) | 001, 005, 006 | 005 dueña de la regla; 006 aplica RN-36; A-11 en 005 | La regla se decide con Paco/Puri (contratos), no con la fórmula general del dinero. |
| Vencimiento (RN-12) | 002, 006, 008 | 008 dueña; 002 y 006 lo consumen; A-12 en 006 | El plazo es una condición del cliente; la divergencia es de la remesa. |
| Descuento por volumen (RN-07/08/09) | 001, 002, 005, 006 | 001 dueña del cálculo; 002 anota; 006 aplica y A-01 | La fórmula es única; la traza y el disparador son del camino. |
| Totales cabecera/líneas (A-15) | 001, 002, 007 | Convención en 002; anomalía en 007 | El importe válido es una regla de la factura; el CSV es el camino que la incumple. |
| Formatos de fecha/importe (RN-15/17, A-13) | 001, 002, 007, 008 | 008 dueña; 005 y 007 citan A-13 | Es una convención de presentación y datos maestros, no de cálculo. |
| IVA por defecto y tipos (A-14) | 001, 002, 005, 008 | 008 dueña; 001 conserva la tabla de recargos | La tabla de recargos es cálculo; la política de tipos y la validación son datos maestros. |
| NIF (RN-16) | 002, 008 | 008 dueña | Es un dato del cliente; la factura solo lo consume. |
| Factura incompleta (A-17) | 002, 003 | 002 dueña; 003 especifica el remedio | El hecho nace en la emisión; la rectificación es el camino de corrección. |
| Rectificativa cobrada (A-06) | 003, 007 | 003 dueña | Es una transición de estado de la factura; el tablero/CSV solo la leen. |
| Orden de la remesa (A-07) | 004, 006 | 006 dueña | La serie no decide el orden de los contratos; la remesa sí. |
| Año/reutilización del número (A-02/A-03) | 002, 004, 005, 006 | 004 dueña; el resto cita | Es una regla de la serie, común a todos los caminos. |
| Histórico descuadrado (A-19) | 002, 007 | 007 dueña; 002 cita la convención | La consecuencia es el CSV y la conciliación con la gestoría. |
| Alta de contratos (A-20) | 005, 008 | 005 dueña; 008 cita los datos maestros | El contrato es el objeto de negocio; los datos maestros son su soporte. |
| Continuidad (A-18) | 009 | 009 dueña | Es un dominio de proceso; no tiene código ni RN. |

---

# Parte 2 — Descripciones listas para `/speckit-specify`

> **Instrucción común:** estas descripciones no se han lanzado. Al aprobarlas, cada una se pasa a
> `/speckit-specify` tal cual. Las decisiones `RESUELTA_PROPUESTA` se marcan como provisionales y
> no se presentan como comportamiento actual ni como decisión ratificada.

---

## Spec 001 — Cálculo de importes, descuentos y redondeo

**Encuadre:** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE del cálculo de
importes, descuentos y redondeo de GesFact 2.4. No es una feature nueva: es la especificación
formal de lo que el sistema YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec:**
- Cada requisito y criterio describe el comportamiento ACTUAL con su evidencia (`services/calculo.js`
  y `lib/util.js`, función y líneas; o dato real sembrado).
- Las anomalías NO se corrigen ni se omiten: se especifican tal cual funcionan hoy, referenciadas
  por su ID del registro (A-09, A-22, A-23).
- Los criterios de aceptación deben ser verificables contra la suite de `test/`, citando el test
  cuando exista (`test/calculo.test.js`, `test/reglas-negocio.test.js`, `test/util.test.js`,
  `test/anomalias.test.js`) y el caso del golden master.
- Toda decisión de negocio se cita por su acta: D-07/N-07 (Puri y Paco, 2026-10-30) y D-16/N-16
  (Paco, 2026-10-30).

**Alcance:**
- **RN-01 — Redondeo simétrico a 2 decimales.** `Math.round(x * 100) / 100`; `1,995 → 2,00`,
  `3,848 → 3,85`, `0,5616 → 0,56`. Evidencia: `lib/util.js:5-7`, `redondear2`. Test:
  `RN-01 redondeo monetario simétrico a 2 decimales`; golden `redondeo-por-linea`.
- **RN-02 — Base de línea.** `redondear2(cantidad × precio)` antes de IVA; `4 × 18,50 = 74,00`;
  `0,44 × 21,60 = 9,504 → 9,50`. Evidencia: `services/calculo.js:27`, `calcularLinea`. Test:
  `RN-02 calcularLinea redondea base = cantidad × precio por línea`.
- **RN-03 — IVA por línea.** `redondear2(base × tipo / 100)` sobre la base ya redondeada;
  `74,00 × 21 % = 15,54`; `23,90 × 10 % = 2,39`; `9,50 × 21 % = 1,995 → 2,00`. Evidencia:
  `services/calculo.js:28`. Test: `RN-03 calcularLinea calcula IVA sobre la base ya redondeada`.
- **RN-04 — Recargo solo con recargo.** Si `recargo_equivalencia == 1`, `redondear2(base ×
  recargoPara(tipo) / 100)`; si no, 0. `74,00 × 5,2 % = 3,848 → 3,85`. Evidencia:
  `services/calculo.js:29-32,49`. Test: `RN-04 calcularLinea solo añade recargo si conRecargo es
  verdadero`; golden `manual-recargo`.
- **RN-05 — Tabla de recargos.** 21→5,2; 10→1,4; 4→0,5; 18→4; 16→4; 8→1; 7→1; otros→0.
  Ejemplo: base 113,60 al 4 % → recargo 0,57. Evidencia: `services/calculo.js:12-23`,
  `recargoPara`. Test: `RN-05 recargoPara devuelve la tabla de recargos vigente y los tipos
  antiguos`.
- **RN-06 — Redondeo línea a línea.** Cada línea se redondea por separado; los totales son suma de
  valores redondeados, nunca IVA sobre la base total. Evidencia: aviso `services/calculo.js:3-7`;
  acumulación `:81-83`. Test: `RN-06 calcularFactura redondea línea a línea, no sobre el total`;
  golden `redondeo-por-linea`.
- **RN-07 — Descuento por volumen.** Base bruta `> 5.000 €` → 5 %; `> 1.000 €` → 2 %; si no, 0;
  comparación estricta: `1.000,00 → 0`, `1.000,01 → 2`, `5.000,00 → 2`, `5.000,01 → 5`. Evidencia:
  `services/calculo.js:39-43`, `porcentajeDescuento`; `db.js:138-143` (FA-2026-000103). Test:
  `RN-07 porcentajeDescuento mantiene las fronteras estrictas 1.000 y 5.000`; golden
  `frontera-1000`, `frontera-5000`, `descuento-2-justo-encima`, `descuento-5-justo-encima`.
- **RN-08 — Descuento sobre base bruta y línea a línea.** `precioConDto = redondear2(precio ×
  (100 − dto) / 100)`; la línea se recalcula entera. Ejemplo canónico: `10 × 120,00`, IVA 21 %, sin
  recargo → base bruta 1.200,00 → dto 2 % → precio 117,60 → base 1.176,00 → IVA 246,96 → total
  1.422,96. Evidencia: `services/calculo.js:53-71`. Test: `RN-08 calcularFactura aplica el 2 %
  línea a línea por encima de 1.000`; `RN-08 el umbral se mide sobre la base bruta de todas las
  líneas`.
- **RN-09 — Recargo sobre base descontada.** `1.176,00 × 5,2 % = 61,152 → 61,15` frente a
  `1.200,00 × 5,2 % = 62,40`. Evidencia: `services/calculo.js:71`. Test: `RN-09 calcularFactura
  aplica el descuento también al recargo`.
- **RN-10 — Total.** `total = redondear2(base + IVA + recargo)`, todo ya redondeado. Ejemplo:
  FA-2026-000102, `115,60 + 24,28 + 6,01 = 145,89`. Evidencia: `services/calculo.js:81-86`. Test:
  `RN-10 total = base + IVA + recargo, todo redondeado`.
- **A-09 — Descuento reduce el recargo.** Comportamiento actual: el recargo se recalcula sobre la
  base descontada. Tratamiento ratificado D-07: es lo deseado; no hay cambio en esta fase.
- **A-22 — IVA en cadena no genera recargo.** Comportamiento actual:
  `calcularLinea(1, 100, '21', true)` → IVA 21, recargo 0. Tratamiento: deuda técnica
  (`ABIERTA_TECNICA`).
- **A-23 — `redondear2` puede devolver `-0`.** Comportamiento actual: `redondear2(-0.005)` → `-0`;
  `Object.is(..., -0)` verdadero; `JSON.stringify` lo serializa como `0`. Tratamiento: deuda
  técnica.

**Fuera de alcance:** prorrateo de cuotas (005), numeración (004), emisión y rectificación (002 y
003), formatos de presentación (008), informes y CSV (007).

---

## Spec 002 — Emisión manual de facturas

**Encuadre:** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE del alta manual de
facturas. No es una feature nueva: es la especificación formal de lo que el sistema YA hace, para
que sirva de contrato en la modernización.

**Reglas de la spec:**
- Cada requisito y criterio describe el comportamiento ACTUAL con evidencia (`routes/facturas.js`,
  `views/factura_nueva.ejs`, `public/js/factura.js`; o dato real).
- Las anomalías NO se corrigen ni se omiten: A-04, A-05 y A-17 se especifican tal cual; A-15 se
  cita con remisión a 007.
- Los criterios de aceptación deben ser verificables contra `test/contradicciones.test.js`,
  `test/anomalias.test.js`, `test/reglas-negocio.test.js` y el golden master; cuando la ruta HTTP no
  tenga test, se indica «comportamiento congelado por fuente».
- Toda decisión de negocio se cita por su acta: D-06/N-06 (Julián y Marga), D-17/N-17 (Marga),
  D-20/N-20 (Marga), D-21/N-21 (Julián y Marga), D-23/N-23 (Marga y Julián) y D-24/N-24 (Marga),
  2026-10-30.

**Alcance:**
- **RN-21 — Al menos una línea; filas en blanco ignoradas.** Se descartan filas sin descripción; si
  no queda ninguna, `400 'La factura no tiene lineas'`. Ejemplo: 6 filas, solo la 3.ª con
  descripción → 1 línea; 6 vacías → rechazo. Evidencia: `routes/facturas.js:55-64`. Test: no hay
  test de ruta; fuente congelada.
- **RN-22 — Coma o punto decimal; cálculo en servidor.** `"18,50"` equivale a `18.50`; el navegador
  solo autorrellena precio e IVA (`public/js/factura.js:3-15`). Evidencia: `routes/facturas.js:59-60`
  y `:66`. Test: `contradicciones 09` (expresión copiada) y `RN-22` parcial.
- **RN-23 — Nace `FA`, `emitida`, con fecha de hoy por defecto.** Si no llega fecha, se usa
  `util.hoy()`; ejemplo: alta sin fecha el 28-10-2026 → `2026-10-28`, estado `emitida`. Evidencia:
  `routes/facturas.js:44,74-76`; `db.js:61`. Test: no hay test de ruta; fuente congelada.
- **RN-24 — Nota del descuento.** Si hay descuento, observaciones `Descuento volumen X% aplicado`;
  ejemplo FA-2026-000105. Evidencia: `routes/facturas.js:76`; `db.js:149`. Test:
  `contradicciones 06, la manual anota el descuento`.
- **A-04 — Cliente inactivo aceptado.** Comportamiento actual: el desplegable solo lista activos,
  pero el `POST` consulta sin `activo` y acepta la factura. Tratamiento D-20: impedir facturar a un
  cliente dado de baja (008). Test: `A-04 el alta acepta clientes inactivos` (fuente).
- **A-05 — Fecha inválida aceptada.** Comportamiento actual: cualquier texto llega a la columna y
  `sumarDias('basura', 30)` produce `NaN-NaN-NaN`. Tratamiento D-21: rechazar fechas inválidas
  (008). Test: `A-05 una fecha inválida llega a la base`.
- **A-17 — Factura incompleta con aviso.** Comportamiento actual: si falla una línea, la cabecera
  ya está grabada, se responde 500 y queda la factura parcial. Tratamiento provisional
  (`RESUELTA_PROPUESTA`): Marga atiende el aviso; se corrige con `RE` espejo de lo grabado y `FA`
  nueva completa, sin editar la BD. Test: `A-17 una factura incompleta deja cabecera y responde
  500`.
- **A-15 (remisión).** La convención «importe válido = suma de líneas» (D-01/N-01, Puri y Marga;
  D-13/N-13, Puri) se declara aquí; su manifestación en CSV y tablero se especifica en 007.

**Fuera de alcance:** cálculo y redondeo (001), cobro y rectificación (003), numeración (004),
contratos y remesa (005 y 006), informes y CSV (007), datos maestros y formatos (008).

---

## Spec 003 — Cobro y rectificación

**Encuadre:** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE del cobro y la
rectificación de facturas. No es una feature nueva: es la especificación formal de lo que el
sistema YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec:**
- Cada requisito y criterio describe el comportamiento ACTUAL con evidencia (`routes/facturas.js`,
  `views/factura_detalle.ejs`, `db.js`; o dato real).
- Las anomalías NO se corrigen ni se omiten: A-06 y A-08 se especifican tal cual; A-15 se cita con
  remisión a 007.
- Los criterios de aceptación deben ser verificables contra `test/golden-master.test.js`,
  `test/anomalias.test.js` y `test/contradicciones.test.js`; cuando la ruta HTTP no tenga test, se
  indica «comportamiento congelado por fuente».
- Toda decisión de negocio se cita por su acta: D-04/N-04 (Puri y Marga), D-06/N-06 (Julián y
  Marga), D-13/N-13 (Puri), 2026-10-30; y MH31 («Puri dixit»).

**Alcance:**
- **RN-25 — Solo `emitida` se cobra.** `UPDATE ... WHERE id = ? AND estado = 'emitida'`; una
  factura `cobrada` o `rectificada` no cambia. Evidencia: `routes/facturas.js:117-121`. Test: no
  hay test de ruta; fuente congelada.
- **RN-26 — Rectificativa espejo.** La `RE` copia los importes con signo invertido, sin recalcular;
  la original pasa a `rectificada`; la `RE` nace `emitida`. Ejemplo: FA-2026-000106 (base 101,61,
  IVA 20,62, total 122,23) → RE-2026-000001 (−101,61, −20,62, −122,23). Evidencia:
  `routes/facturas.js:127-143`; `db.js:156-162`. Test: golden `rectificativa`.
- **RN-27 — No se rectifica una `rectificada` ni una `RE`.** Guardas `400 'Ya esta rectificada'` y
  `400 'No se rectifica una rectificativa'`. Evidencia: `routes/facturas.js:132-133`. Test: no hay
  test de ruta; fuente congelada.
- **RN-28 — Inversión de líneas.** `cantidad`, `base`, `cuota_iva` y `cuota_recargo` negativos;
  precio con signo original; descripción prefijada `Rectificación: `. Ejemplo: `1 × 90,00 (21 %)` →
  `-1 × 90,00`, base −90,00, IVA −18,90. Evidencia: `routes/facturas.js:149-150`. Test: golden
  `rectificativa`.
- **RN-29 — Fecha de hoy y sin vencimiento.** `util.hoy()`; `vencimiento: null`; ejemplo
  RE-2026-000001, fecha 2026-05-06, vencimiento `NULL`. Evidencia: `routes/facturas.js:142`;
  `db.js:160`. Test: `A-06` (fuente congelada).
- **A-06 — `RE` cobrable y sin vencimiento.** Comportamiento actual: la ruta de cobro no filtra
  serie y una `RE` nace `emitida`; el botón está oculto para `RE`. Tratamiento provisional
  (`RESUELTA_PROPUESTA`): la `RE` no se cobra y el `POST` debe rechazar la serie; sigue sin
  vencimiento. Test: `A-06 una rectificativa puede cobrarse y no tiene vencimiento`.
- **A-08 — Rectificación a medias.** Comportamiento actual: el callback ignora el error de línea y
  la original se marca `rectificada`; si el proceso muere, quedan dos documentos vivos. Tratamiento
  provisional: la original solo pasa a `rectificada` con la `RE` completa. Test: `A-08 la
  rectificación ignora el error de línea`.
- **A-15 (remisión).** La `RE` copia los totales de cabecera; si la original está descuadrada, el
  espejo arrastra el descuadre. La convención y la manifestación principal están en 002 y 007.

**Fuera de alcance:** emisión manual (002), numeración (004), informes y CSV (007), cálculo de
importes (001), datos maestros (008).

---

## Spec 004 — Numeración y series

**Encuadre:** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de la numeración
correlativa de facturas. No es una feature nueva: es la especificación formal de lo que el sistema
YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec:**
- Cada requisito y criterio describe el comportamiento ACTUAL con evidencia (`lib/numeracion.js`,
  `db.js`; o dato real).
- Las anomalías NO se corrigen ni se omiten: A-02 y A-03 se especifican tal cual.
- Los criterios de aceptación deben ser verificables contra `test/numeracion.test.js` y
  `test/anomalias.test.js`; la concurrencia se prueba con doble de `db.js`, no con SQLite real.
- Toda decisión de negocio se cita por su acta: D-11/N-11 y D-12/N-12 (Puri y Julián, 2026-10-30);
  y MH15/MH16.

**Alcance:**
- **RN-18 — Correlativa por serie y año.** Formato `SERIE-AAAA-NNNNNN`; si `FA-2026` está en 108,
  la siguiente es `FA-2026-000109`. Evidencia: `lib/numeracion.js:14-28,38-42`. Test:
  `RN-18 formatear usa SERIE-AAAA-NNNNNN con 6 dígitos`; `RN-18 siguienteNumero reserva el
  siguiente de un contador existente`.
- **RN-19 — Año nuevo empieza en 1.** Si no hay contador, se crea en 0; primera factura
  `FA-2027-000001`. Evidencia: `lib/numeracion.js:18-23`. Test: `RN-19 al estrenar año el contador
  se abre a cero y la primera factura es 1`.
- **RN-20 — Reserva no atómica.** `leer último → +1 → actualizar` sin transacción; dos altas
  simultáneas pueden repetir número; no hay `UNIQUE` sobre `numero`. Evidencia:
  `lib/numeracion.js:30-36`; `db.js:50-63`. Test: `R1 dos reservas simultáneas pueden repetir
  número`.
- **A-02 — Año de ejecución.** Comportamiento actual: `new Date().getFullYear()`, no el año de la
  fecha de la factura; la remesa de diciembre lanzada el 1 de enero numera con el año nuevo.
  Tratamiento D-11: el año del número debe ser el de la fecha. Test: `A-02 el número usa el año de
  ejecución`; `Anomalía A-02 / R15`.
- **A-03 — Número consumido si falla la cabecera.** Comportamiento actual: se reserva antes del
  `INSERT`; si falla, el contador avanza y la serie sufre un hueco. Tratamiento D-12: reutilizar el
  número si la factura no llega a grabarse. Test: `A-03 el número se pierde si falla la factura`;
  `Anomalía A-03 / H3`.
- **R1/R28 (remisión).** El duplicado por concurrencia y la reutilización sobre una factura parcial
  siguen en `registro-riesgos.md`; se citan como riesgo, no como decisión.

**Fuera de alcance:** emisión manual (002), remesa y orden de contratos (006), rectificación (003),
cálculo de importes (001).

---

## Spec 005 — Contratos y prorrateo de cuotas

**Encuadre:** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de los contratos de
cuota mensual y el prorrateo del mes de baja. No es una feature nueva: es la especificación formal
de lo que el sistema YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec:**
- Cada requisito y criterio describe el comportamiento ACTUAL con evidencia (`routes/contratos.js`,
  `services/calculo.js`, `views/contratos.ejs`, `db.js`; o dato real).
- Las anomalías NO se corrigen ni se omiten: A-11 y A-20 se especifican tal cual. La convención
  D-03 (días reales) se registra como tratamiento, no como comportamiento actual de la pantalla.
- Los criterios de aceptación deben ser verificables contra `test/calculo.test.js`,
  `test/reglas-negocio.test.js`, `test/util.test.js`, `test/contradicciones.test.js`,
  `test/anomalias.test.js` y el golden master.
- Toda decisión de negocio se cita por su acta: D-02/N-02 (Paco), D-03/N-03 (Paco y Puri),
  D-15/N-15 (Puri y Marga), 2026-10-30; y MH01/MH27.

**Alcance:**
- **RN-11 — Prorrateo comercial de 30 días.** `redondear2(cuota / 30 × días)`, `días = díaFin −
  díaInicio + 1`; tope 30, mínimo 0; ejemplo `90,00 €`, del 1 al 15 → `45,00 €`; del 1 al 31 → 30
  días → `90,00 €`. Evidencia: `services/calculo.js:95-102`, `calcularProrrateo`;
  `routes/contratos.js:37-40`. Test: `RN-11 calcularProrrateo usa mes comercial de 30 días`;
  golden `prorrateo-marzo`, `prorrateo-febrero`.
- **RN-14 — Días reales del mes.** `diasDelMes(fecha)` devuelve 28/29/30/31; `2026-02 → 28`,
  `2026-03 → 31`. Evidencia: `lib/util.js:36-39`. Test: `RN-14 diasDelMes usa el calendario real`.
- **Convención D-03 — Días reales.** La regla vigente del dominio es `redondear2(cuota /
  díasReales × díasServicio)`. Ejemplo: `90,00 €`, baja el 15 de marzo → `90/31×15 = 43,55 €`
  frente a `45,00 €`; en febrero, `90/28×15 = 48,21 €` frente a `45,00 €`. Es la convención
  declarada, no la implementación de la pantalla.
- **A-11 — Dos prorrateos.** Comportamiento actual: la pantalla usa 30 días y la remesa usa días
  reales. Tratamiento D-03: días reales; la pantalla es la implementación divergente. Test:
  `A-11 conviven dos prorrateos`; `contradicciones 01`.
- **A-20 — Alta de contratos sin formulario.** Comportamiento actual: `POST /contratos/nuevo`
  existe, pero `views/contratos.ejs` no tiene formulario. Tratamiento provisional
  (`RESUELTA_PROPUESTA`): alta asistida por plantilla SQL de Julián, con Marga definiendo las
  condiciones; sin UI nueva en esta fase. Datos mínimos: cliente, concepto, cuota, `tipo_iva`,
  `fecha_alta`, `fecha_baja`, `dias_pago`, `recargo_equivalencia`. Test: `A-20 la vista de contratos
  no tiene formulario de alta`.
- **A-04/A-14 (remisión).** La condición de cliente activo y los tipos de IVA se especifican en 008
  y se citan aquí porque el contrato los consume.

**Fuera de alcance:** remesa mensual (006), cálculo general de importes (001), numeración (004),
emisión manual (002), informes (007).

---

## Spec 006 — Remesa mensual

**Encuadre:** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de la remesa
mensual de contratos. No es una feature nueva: es la especificación formal de lo que el sistema YA
hace, para que sirva de contrato en la modernización.

**Reglas de la spec:**
- Cada requisito y criterio describe el comportamiento ACTUAL con evidencia
  (`scripts/remesa_mensual.js`, `services/calculo.js`, `lib/util.js`; o dato real).
- Las anomalías NO se corrigen ni se omiten: A-01, A-07 y A-12 se especifican tal cual.
- Los criterios de aceptación deben ser verificables contra `test/anomalias.test.js`,
  `test/contradicciones.test.js` y el modelo del golden master; el job no se ejecuta en la red
  actual, así que se indica «comportamiento congelado por fuente» cuando corresponda.
- Toda decisión de negocio se cita por su acta: D-02/N-02 (Paco), D-05/N-05 (Marga y Julián),
  D-09/N-09 (Marga), D-15/N-15 (Puri y Marga), 2026-10-30; y MH17/MH21.

**Alcance:**
- **RN-35 — Contratos activos en el mes.** `fecha_alta <= último día` y (`fecha_baja` nula o
  `>= primer día`). Ejemplo: alta 2026-06-16 y baja 2026-09-15 entran en la remesa de 2026-06; baja
  2026-05-31 no. Evidencia: `scripts/remesa_mensual.js:26-29`. Test: no hay test de job; fuente
  congelada.
- **RN-36 — Prorrateo por días reales.** `redondear2(cuota / díasReales × díasServicio)`; ejemplo
  `90/31×15 = 43,55 €`. Evidencia: `scripts/remesa_mensual.js:47-51`. Test:
  `contradicciones 01, prorrateo de la remesa por días reales`; golden `prorrateo-marzo`.
- **RN-37 — Fecha último día del mes; vencimiento `dias_pago || 30`.** Ejemplo: remesa 2026-02 →
  fecha 28-02-2026; sin `dias_pago` → vencimiento 30-03-2026. Evidencia:
  `scripts/remesa_mensual.js:59-60`. Test: `contradicciones 03, vencimiento de remesa con 30
  literal`; `A-12`.
- **RN-38 — Una línea y nota `Remesa <mes> <año>`.** Cantidad 1, precio prorrateado, IVA del
  contrato; sufijo `(n dias)` si el mes no es completo. Ejemplo: 90,00 € al 21 % → base 90,00, IVA
  18,90, total 108,90. Evidencia: `scripts/remesa_mensual.js:53-55,61-62,80-84`. Test: no hay test
  de job; fuente congelada.
- **RN-39 — No comprueba si el mes ya se facturó.** Relanzar duplica facturas y consume numeración;
  ejemplo: 4 contratos → 4 facturas duplicadas. Evidencia: `scripts/remesa_mensual.js:23-77`. Test:
  `R4 la remesa no comprueba si el mes ya se facturó`.
- **A-01 — Descuento silencioso en la remesa.** Comportamiento actual: el descuento por volumen se
  aplica dentro de `calcularFactura`, pero observaciones se fija a `Remesa <mes>` y no indica el
  porcentaje. Tratamiento D-02/D-15: aplicar a cuotas y anotar el porcentaje. Test:
  `A-01 descuento en remesa sin nota`; `contradicciones 06`.
- **A-07 — Sin `ORDER BY`.** Comportamiento actual: el orden es el de SQLite. Tratamiento
  provisional (`RESUELTA_PROPUESTA`): `ORDER BY c.id` ascendente. Test: `A-07 la remesa no lleva
  ORDER BY` (fuente).
- **A-12 — `30` literal.** Comportamiento actual: `co.dias_pago || 30`, no
  `config.VENCIMIENTO_DIAS`. Tratamiento D-09: un único plazo de 30 días y una sola fuente. Test:
  `A-12 el vencimiento manual y el de remesa usan fuentes distintas`.
- **A-02/A-03 (remisión).** El año del número y la reutilización del número se especifican en 004;
  la remesa es un consumidor más.

**Fuera de alcance:** contratos y prorrateo de la pantalla (005), numeración (004), cálculo general
(001), emisión manual (002), informes (007).

---

## Spec 007 — Informes, CSV y tablero

**Encuadre:** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de los informes, el
CSV para la gestoría y el tablero. No es una feature nueva: es la especificación formal de lo que el
sistema YA hace, para que sirva de contrato en la modernización.

**Reglas de la spec:**
- Cada requisito y criterio describe el comportamiento ACTUAL con evidencia (`routes/informes.js`,
  `server.js`, `config.js`, `views/*.ejs`; o dato real sembrado).
- Las anomalías NO se corrigen ni se omiten: A-10, A-15 y A-19 se especifican tal cual.
- Los criterios de aceptación deben ser verificables contra `test/anomalias.test.js`,
  `test/contradicciones.test.js`, `test/fixtures/facturas-sembradas.json` y el golden master; las
  consultas SQL no se ejecutan en la red actual.
- Toda decisión de negocio se cita por su acta: D-01/N-01 (Puri y Marga), D-13/N-13 (Puri),
  D-14/N-14 (Marga y Puri), D-22/N-22 (Marga), 2026-10-30; y MH11/MH28.

**Alcance:**
- **RN-30 — Resumen de IVA desde líneas.** Suma `base`, `cuota_iva` y `cuota_recargo` por tipo,
  dentro del trimestre; las `RE` entran negativas y «cuadran solas»; trimestres 1 = ene–mar, 2 =
  abr–jun, 3 = jul–sep, 4 = oct–dic. Ejemplo: +74,00 y −74,00 → 0,00. Evidencia:
  `routes/informes.js:17,23-26`. Test: no hay test SQL; fuente congelada.
- **RN-31 — Límite superior del trimestre al día 31 fijo.** Rango `anyo-MM-31`, aunque el mes tenga
  30 días; Q2 2026-04-01 a 2026-06-31; comparación lexicográfica. Evidencia:
  `routes/informes.js:18-19`. Test: no hay test SQL; fuente congelada.
- **RN-32 — CSV cerrado.** Primera línea `CLAVE;SH-CONTA-7731`; cabecera
  `NUMERO;FECHA;CLIENTE;NIF;BASE;IVA;RECARGO;TOTAL;ESTADO`; `;`, coma decimal, `\r\n`; todas las
  facturas del año, incluidas `RE` y `rectificada`, sin netear. Ejemplo: `FA-2026-000102` →
  `FA-2026-000102;06/02/2026;Ferretería El Tornillo;03488812K;115,60;24,28;6,01;145,89;cobrada`.
  Evidencia: `routes/informes.js:34-50`; `config.js:37`. Test: no hay test de ruta; fuente
  congelada.
- **RN-33 — Año y trimestre por defecto.** Año en curso y trimestre 1; `?trimestre=5` lanza
  excepción. Evidencia: `routes/informes.js:15-17`. Test: no hay test de ruta; fuente congelada.
- **RN-34 — Tablero solo `FA` emitida.** Suma `total` de `serie = 'FA' AND estado = 'emitida'`; las
  `RE` y las `rectificada` no se restan. Ejemplo: `RE-2026-000001` de −122,23 no reduce el
  pendiente. Evidencia: `server.js:24`. Test: `A-10 el tablero ignora los abonos RE` (fuente).
- **A-10 — Tablero ignora `RE`.** Comportamiento actual: no resta abonos. Tratamiento D-14: restar
  los abonos `RE`. Test: `A-10`.
- **A-15 — Cabecera y líneas no cuadran.** Comportamiento actual: 6 de 9 facturas sembradas
  descuadran; el CSV exporta la cabecera. Ejemplos: FA-2026-000105, cabecera 2.756,38 € frente a
  líneas 2.674,52 €; FA-2026-000101, 161,17 € frente a 157,47 €. Tratamiento D-01/D-13: importe
  válido = suma de líneas; CSV con las tres líneas sin netear. Test: `A-15 seis facturas sembradas
  no cuadran`; `contradicciones 07`.
- **A-19 — Histórico descuadrado.** Comportamiento actual: las facturas históricas siguen en la
  copia. Tratamiento provisional (`RESUELTA_PROPUESTA`): no se modifican; anexo de conciliación y
  CSV con suma de líneas. Test: `A-19 las facturas históricas descuadradas siguen en la copia`.
- **A-13 (remisión).** El formato de importes se especifica en 008; el CSV usa coma decimal por
  RN-32 y no se duplica.

**Fuera de alcance:** cálculo de importes (001), emisión y rectificación (002 y 003), numeración
(004), contratos y remesa (005 y 006), datos maestros y formatos (008).

---

## Spec 008 — Datos maestros, condiciones del cliente y formatos

**Encuadre:** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de los datos
maestros, las condiciones del cliente y los formatos de fecha e importe. No es una feature nueva: es
la especificación formal de lo que el sistema YA hace, para que sirva de contrato en la
modernización.

**Reglas de la spec:**
- Cada requisito y criterio describe el comportamiento ACTUAL con evidencia (`lib/util.js`,
  `routes/clientes.js`, `routes/articulos.js`, `routes/contratos.js`, `config.js`, `db.js`,
  `views/*.ejs`; o dato real).
- Las anomalías NO se corrigen ni se omiten: A-13, A-14, A-16 y A-21 se especifican tal cual.
- Los criterios de aceptación deben ser verificables contra `test/util.test.js`,
  `test/reglas-negocio.test.js`, `test/anomalias.test.js` y `test/contradicciones.test.js`.
- Toda decisión de negocio se cita por su acta: D-10/N-10 (Marga), D-19/N-19 (Puri y Julián),
  D-22/N-22 (Marga), D-23/N-23 (Marga y Julián), D-24/N-24 (Marga), 2026-10-30; y MH05.

**Alcance:**
- **RN-12 — Vencimiento = fecha + días de pago.** `cliente.dias_pago` o `config.VENCIMIENTO_DIAS`
  (30); `31-01-2026` sin plazo → `02-03-2026`; `31-03-2026` a 60 días → `30-05-2026`;
  `dias_pago = 0` se trata como «sin plazo» y usa 30. Evidencia: `routes/facturas.js:68`;
  `config.js:40`; `lib/util.js:20-26`. Test: `RN-12 (parte pura) el plazo por defecto configurado
  es 30 días`.
- **RN-13 — Suma de días en milisegundos.** `días × 86400000`; puede desviarse un día en el cambio
  de hora; incidente de marzo de 2019. Evidencia: `lib/util.js:18-26`. Test: `RN-13 sumarDias
  congela el comportamiento en los cambios de hora`.
- **RN-15 — Fechas.** BD `YYYY-MM-DD`; pantalla/impresión `DD/MM/YYYY`; `2026-02-06` →
  `06/02/2026`. Evidencia: `lib/util.js:10-15,29-33`. Test: `RN-15 fechaBonita convierte
  YYYY-MM-DD a DD/MM/YYYY`.
- **RN-16 — NIF solo longitud.** Limpia espacios y guiones y exige 9 caracteres; no comprueba la
  letra; `B45812390` válido; `J4577 110 2` válido; `1234` inválido; una letra errónea con 9
  caracteres pasa. Evidencia: `lib/util.js:42-48`. Test: `RN-16 validarNIF solo comprueba longitud
  9 tras limpiar espacios y guiones`.
- **RN-17 — Importes.** `1.234,50`; `null`/`undefined`/`NaN` → `0,00`; negativos con `-`; ejemplo
  `formatearImporte(-122.23) = "-122,23"`. Evidencia: `lib/util.js:51-58`. Test: `RN-17
  formatearImporte usa punto de millar y coma decimal`.
- **A-13 — Dos formatos.** Comportamiento actual: `formatearImporte` en factura/CSV frente a
  `.toFixed(2)` en artículos, contratos y tablero. Tratamiento D-22: unificar al formato de la
  factura. Test: `A-13 conviven dos formatos de importe`; `contradicciones 02`.
- **A-14 — IVA por defecto y tipos.** Comportamiento actual: artículos y contratos toman 21 si
  falta; una línea sin IVA produce `NaN`; los tipos 16/18/7/8 se conservan. Tratamiento D-23/D-19:
  rechazar si falta el IVA y conservar los tipos antiguos. Test: `A-14 el IVA por defecto depende
  del maestro`; `Anomalía A-14: una línea sin tipoIva produce NaN`; `contradicciones 04`.
- **A-16 — Punto de millar mal interpretado.** Comportamiento actual:
  `parseFloat('1.234,56'.replace(',', '.'))` guarda `1,234`; `12 ud` guarda `12`. Tratamiento D-24:
  rechazar formatos no numéricos o con punto de millar. Test: `A-16 el punto de millar se interpreta
  mal`; `contradicciones 09`.
- **A-21 — `formatearImporte` con infinito.** Comportamiento actual: `"Infinity,undefined"` y
  `"-Infinity,undefined"`. Tratamiento: deuda técnica (`ABIERTA_TECNICA`). Test: `A-21
  formatearImporte con infinito`.
- **A-04/A-05 (convención).** La regla «no facturar a cliente de baja» (D-20) y «rechazar fechas
  inválidas» (D-21) se declaran aquí; su manifestación divergente se especifica en 002.

**Fuera de alcance:** cálculo de importes (001), emisión y rectificación (002 y 003), numeración
(004), contratos y remesa (005 y 006), informes y CSV (007), operación (009).

---

## Spec 009 — Operación, respaldo y continuidad

**Encuadre:** Spec de ingeniería inversa: documenta el comportamiento EXISTENTE de la operación,
el respaldo y la continuidad de GesFact 2.4. No es una feature nueva: es la especificación formal de
lo que el sistema YA hace —incluida la ausencia de procedimiento— para que sirva de contrato en la
modernización.

**Reglas de la spec:**
- Cada requisito y criterio describe el proceso ACTUAL con evidencia documental (`LEEME.txt`,
  `views/pie.ejs`, `config.js`, `registro-riesgos.md`, `memoria-historica.md`); no hay código de
  aplicación que ejecutar.
- La anomalía A-18 NO se corrige ni se omite: se especifica tal cual, incluida la ausencia de
  procedimiento escrito y probado.
- Los criterios de aceptación deben ser verificables contra `test/anomalias.test.js` (A-18,
  comprobación documental) y contra la lista de comprobación que se propone; no hay golden master.
- Toda decisión de negocio se cita por su acta: D-08/N-08 (Marga y Julián), D-18/N-18 (Manoli) y
  D-25/N-25 (Marga y Manoli), 2026-10-30; y MH29/MH30/MH34.

**Alcance:**
- **A-18 — No hay procedimiento escrito y probado.** Comportamiento actual: el conocimiento está en
  Julián (soporte), Marga (copias y envíos) y Manoli (correo); no hay runbook ni prueba de
  restauración. Tratamiento provisional (`RESUELTA_PROPUESTA`): Marga posee el procedimiento,
  Julián lo escribe, Manoli cubre el correo; prueba trimestral (primer lunes de enero, abril, julio
  y octubre) sobre copia desechable, con lista de comprobación firmada; RPO 1 día (D-08) y RTO 1
  día laborable. Test: `A-18 no hay procedimiento de arranque/restauración` (documental).
- **Respaldo actual.** Copia semanal de `datos/gesfact.db` a un pendrive los viernes (`LEEME.txt:18`,
  MH29); la decisión D-08 exige copia diaria, no implantada. R5/R27.
- **Arranque y despliegue actual.** Copia manual de la carpeta y de `config.js` al servidor de la
  oficina (`LEEME.txt:4-9`, `config.js:2-3`); soporte telefónico de Julián (ext. 22,
  `views/pie.ejs:2`). R17/R18.
- **Correo actual.** Envío manual desde Outlook de Marga; el envío automático está fuera de servicio
  desde 2022 (MH19, D-18). No se reactiva.
- **Continuidad.** No hay plan de relevo para Julián, Marga, Puri, Paco o Manoli (MH29/MH30,
  Anexo A de `memoria-historica.md`); la propuesta A-18 cubre el procedimiento, no el relevo de
  personas.

**Fuera de alcance:** todas las reglas de producto (001 a 008); seguridad (R2/R3), dependencias
(R6), documentación de instalación (R17), rutas relativas (R18), tests/CI (R20), esquema (R23) y
volcado MySQL (R24), que quedan en `registro-riesgos.md`.

---

# Tabla resumen final

| Spec | Reglas RN-* | Anomalías A-* | Dueño natural | Tests que la respaldan | Golden master |
|---|---|---|---|---|---|
| 001 — Cálculo de importes, descuentos y redondeo | RN-01 a RN-10 | A-09, A-22, A-23 | Puri / Paco | `calculo.test.js`, `reglas-negocio.test.js`, `util.test.js`, `anomalias.test.js` | Sí: manual-simple, manual-recargo, manual-mixta, descuento-2, descuento-5, frontera-1000, frontera-5000, redondeo-por-linea |
| 002 — Emisión manual de facturas | RN-21 a RN-24 | A-04, A-05, A-17 (A-15 se cita) | Marga / Julián | `contradicciones.test.js` (04, 05, 06, 08, 09), `anomalias.test.js` (A-04, A-05, A-17), `reglas-negocio.test.js` (RN-22) | Sí: manual-simple, manual-recargo, manual-mixta |
| 003 — Cobro y rectificación | RN-25 a RN-29 | A-06, A-08 (A-15 se cita) | Puri / Marga | `golden-master.test.js` (rectificativa), `anomalias.test.js` (A-06, A-08), `contradicciones.test.js` (05, 07) | Sí: rectificativa |
| 004 — Numeración y series | RN-18 a RN-20 | A-02, A-03 | Puri / Julián | `numeracion.test.js`, `anomalias.test.js` (A-02, A-03) | No (doble de DB) |
| 005 — Contratos y prorrateo de cuotas | RN-11, RN-14 | A-11, A-20 | Paco / Marga | `calculo.test.js` (RN-11), `reglas-negocio.test.js` (RN-11, RN-14), `util.test.js` (RN-14), `contradicciones.test.js` (01), `anomalias.test.js` (A-11, A-20) | Sí: prorrateo-marzo, prorrateo-febrero, febrero-bisiesto |
| 006 — Remesa mensual | RN-35 a RN-39 | A-01, A-07, A-12 | Marga / Julián | `anomalias.test.js` (A-01, A-07, A-12, R4), `contradicciones.test.js` (01, 03, 06) | Parcial: modelo de prorrateo |
| 007 — Informes, CSV y tablero | RN-30 a RN-34 | A-10, A-15, A-19 | Puri / Marga | `anomalias.test.js` (A-10, A-15, A-19), `contradicciones.test.js` (02, 07), `fixtures/facturas-sembradas.json` | Parcial: totales del flujo |
| 008 — Datos maestros, condiciones del cliente y formatos | RN-12, RN-13, RN-15, RN-16, RN-17 | A-13, A-14, A-16, A-21 | Marga / Puri / Julián | `util.test.js`, `reglas-negocio.test.js` (RN-12, RN-13, RN-15, RN-16, RN-17), `anomalias.test.js` (A-13, A-14, A-16, A-21), `contradicciones.test.js` (02, 03, 04, 08, 09) | No |
| 009 — Operación, respaldo y continuidad | — | A-18 | Marga / Manoli / Julián | `anomalias.test.js` (A-18, documental) | No |

---

**Cierre.** La partición cubre las 39 reglas y las 23 anomalías. Las 7 decisiones
`RESUELTA_PROPUESTA` (A-06, A-07, A-08, A-17, A-18, A-19 y A-20) se han incorporado como
tratamiento provisional y deben ratificarse antes de considerar las specs firmes. No se ha
ejecutado `/speckit-specify`: la propuesta se revisa y se aprueba antes de invertir.
