# Acta de entrevista de negocio — GesFact 2.4

**Fecha de la sesión:** 2026-10-30
**Tipo:** acta de **simulación** de entrevista de reconocimiento.
**Estado:** borrador **no ratificado**. Las respuestas proceden de una simulación en la que el
cliente interpreta a las personas indicadas; no sustituyen una decisión real del negocio con
responsable y fecha, exigida por la constitución (`.specify/memory/constitution.md`, Principio I).
**Consultor:** reconocimiento de GesFact 2.4.
**Participantes (roles simulados):** Paco (comercial), Puri (gestoría), Marga (administración),
Julián (soporte) y Manoli (correo).
**Objeto:** decidir las cuestiones pendientes y dudosas del reconocimiento: contradicciones 01-09,
hallazgos H1-H8, reglas dudosas RN-09/RN-34/RN-36/RN-37 y preguntas abiertas de `memoria-historica.md`.
**Criterio de orden:** impacto económico potencial, de mayor a menor.
**Documento de trabajo:** `notas-entrevista-negocio.md` (notas pregunta a pregunta y condiciones).

> No se ha modificado ningún fichero de la aplicación. Este acta no implementa ninguna decisión; solo
> las registra para que el negocio las ratifique o corrija en la fase correspondiente.

## 1. Resumen ejecutivo

La sesión ha producido **25 decisiones** de negocio. Las más relevantes por impacto económico son:

1. **El importe válido de una factura es la suma de sus líneas**, no el total de la cabecera
   (D-01). Esto afecta al CSV de la gestoría y al modelo 303.
2. **El descuento por volumen se aplica también a las cuotas de contrato** (D-02), **reduce el
   recargo de equivalencia** (D-07) y **debe anotarse en la factura de remesa** (D-15). Se mantienen
   los umbrales de 2018: 2 % por encima de 1.000 € y 5 % por encima de 5.000 € (D-16).
3. **El prorrateo del último mes se calcula por días reales**, no por mes comercial de 30 días
   (D-03).
4. **No se rectifican facturas cobradas** (D-04) y **se impide relanzar la remesa de un mes ya
   facturado** (D-05).
5. **La copia de la base de datos debe ser diaria** (D-08), aunque **no existe un procedimiento
   escrito y probado para arrancar o restaurar sin Julián** (D-25).

## 2. Decisiones

| ID | Materia | Decisión | Pregunta | Dirigida a |
|---|---|---|---|---|
| D-01 | Total de factura | El importe válido es la **suma de las líneas**, no el total de la cabecera. | N-01 | Puri / Marga |
| D-02 | Descuento por volumen | Se aplica **también a las cuotas mensuales de contrato**. | N-02 | Paco |
| D-03 | Prorrateo de cuota | Se calcula por **días reales del mes**, no por mes comercial de 30 días. | N-03 | Paco / Puri |
| D-04 | Rectificación | **No** se rectifican facturas ya cobradas. | N-04 | Puri / Marga |
| D-05 | Remesa | Se **impide** la segunda emisión de la remesa de un mes ya facturado. | N-05 | Marga / Julián |
| D-06 | Grabación de factura | Si falla la grabación, queda la **cabecera y las líneas guardadas, con aviso** para completarla. | N-06 | Julián / Marga |
| D-07 | Recargo de equivalencia | El descuento por volumen **reduce también el recargo**. | N-07 | Puri / Paco |
| D-08 | Copias de seguridad | La copia de la base de datos debe ser **diaria**. | N-08 | Marga / Julián |
| D-09 | Vencimiento | El plazo por defecto es **30 días y el mismo** para factura manual y remesa. | N-09 | Marga |
| D-10 | NIF | La letra del NIF la valida **el sistema**. | N-10 | Marga |
| D-11 | Numeración | El año del número es el de **la fecha de la factura**. | N-11 | Puri / Julián |
| D-12 | Numeración | Si falla la grabación, el número reservado se **reutiliza** en la siguiente factura. | N-12 | Puri / Julián |
| D-13 | CSV gestoría | Se mantienen **las tres líneas** (original, abono y sustituta), sin netear. | N-13 | Puri |
| D-14 | Tablero | El importe pendiente **resta** los abonos de la serie RE. | N-14 | Marga / Puri |
| D-15 | Descuento por volumen | La factura de remesa debe **indicar el porcentaje** de descuento aplicado. | N-15 | Puri / Marga |
| D-16 | Descuento por volumen | Se mantienen **2 % > 1.000 €** y **5 % > 5.000 €**, con frontera estricta. | N-16 | Paco |
| D-17 | Formulario de factura | El límite de **6 líneas** es suficiente y se mantiene. | N-17 | Marga |
| D-18 | Correo | Se mantiene el **envío manual** actual. | N-18 | Manoli |
| D-19 | Ejercicios antiguos | Se prevé reabrir ejercicios anteriores a 2018; los tipos **16/18/7/8** siguen siendo necesarios. | N-19 | Puri / Julián |
| D-20 | Clientes | Se **impide** facturar a un cliente dado de baja. | N-20 | Marga |
| D-21 | Fechas | Una fecha inválida debe **rechazarse**. | N-21 | Julián / Marga |
| D-22 | Formato de importes | Se unifica al formato de la factura: **coma decimal y punto de millar**. | N-22 | Marga |
| D-23 | IVA | Si falta el IVA, se **rechaza** la operación y se obliga a indicarlo. | N-23 | Marga / Julián |
| D-24 | Números de entrada | Se **rechazan** los formatos no numéricos o con punto de millar; solo se acepta un número válido. | N-24 | Marga |
| D-25 | Continuidad | **No existe** un procedimiento escrito y probado para arrancar o restaurar sin Julián. | N-25 | Marga / Manoli |

## 3. Prohibiciones

Quedan registradas como prohibiciones explícitas:

- **No** se rectifican facturas ya cobradas (D-04).
- **No** se permite una segunda emisión de la remesa de un mes ya facturado (D-05).
- **No** se permite facturar a un cliente dado de baja (D-20).
- **No** se aceptan fechas inválidas (D-21).
- **No** se acepta una operación sin IVA: debe rechazarse (D-23).
- **No** se aceptan formatos numéricos no válidos o con punto de millar (D-24).

## 4. Condiciones y reglas de detalle

- **D-01 y D-13:** el importe válido es la suma de líneas y el CSV mantiene todas las líneas. La
  cabecera descuadrada no es la referencia para el CSV ni para el 303.
- **D-02, D-07, D-15 y D-16:** el descuento por volumen forma una regla única: se aplica a cuotas de
  contrato, reduce base, IVA y recargo, se anota en la factura y mantiene los umbrales de 2018 con
  frontera estricta.
- **D-03 y D-09:** son dos plazos distintos: el prorrateo del último mes usa días reales; el
  vencimiento por defecto sigue siendo 30 días.
- **D-06:** se acepta una factura incompleta **solo con aviso** para completarla. No se ha decidido
  quién atiende el aviso ni cómo se completa; queda como pendiente operativo.
- **D-10:** la validación del NIF deja de ser solo humana; el sistema debe comprobar la letra.
- **D-11 y D-12:** el número se ata a la fecha de la factura y, si la grabación falla, no se pierde:
  se reutiliza.
- **D-19:** la reapertura de ejercicios anteriores a 2018 mantiene vivos los tipos antiguos y sus
  recargos.
- **D-25:** la ausencia de procedimiento es un hecho, no una decisión; queda como riesgo pendiente.

## 5. Respuestas no concluyentes y repreguntas

- **N-14:** la primera respuesta fue «a» a una pregunta planteada como sí/no. Se marcó como no
  concluyente y se repreguntó con opciones (a) sí, restar; (b) no, no restar. La respuesta final fue
  **a = sí**. No queda ninguna pregunta sin respuesta concluyente al cierre.

## 6. Impacto sobre las contradicciones y anomalías documentadas

| Documento | Efecto de las decisiones |
|---|---|
| `contradiccion-01-prorrateo-cuotas-contrato.md` | D-03 fija días reales. Queda resuelta la duda de negocio; no se implementa aquí. |
| `contradiccion-02-formato-importes.md` | D-22 fija el formato de la factura para toda la aplicación. |
| `contradiccion-03-vencimiento-plazo-pago.md` | D-09 fija 30 días y una sola fuente para manual y remesa. |
| `contradiccion-04-iva-por-defecto.md` | D-23 exige indicar el IVA y rechazar si falta; D-19 mantiene los tipos antiguos. |
| `contradiccion-05-grabacion-factura-lineas.md` | D-06 acepta cabecera y líneas parciales con aviso; D-05 y D-12 añaden condiciones de remesa y numeración. |
| `contradiccion-06-traza-descuento-volumen.md` | D-02, D-07 y D-15 confirman el descuento en contratos, su efecto en recargo y su anotación. |
| `contradiccion-07-totales-cabecera-lineas.md` | D-01 fija la suma de líneas como importe válido; D-13 mantiene el detalle en el CSV. |
| `contradiccion-08-validacion-fechas.md` | D-21 exige rechazar fechas inválidas. |
| `contradiccion-09-normalizacion-numeros-entrada.md` | D-24 exige rechazar formatos no válidos o con punto de millar. |
| `flujo-factura.md` H1-H8 | H1 → D-02/D-15; H2 → D-11; H3 → D-12; H4 → D-20; H5 → D-21; **H6 no queda resuelta por D-04** (D-04 prohíbe rectificar una factura cobrada, pero no decide si una rectificativa puede marcarse cobrada ni si debe llevar vencimiento); H7 sigue pendiente; H8 → D-06 solo en el criterio general de factura incompleta, no en el estado de la original. |
| `reglas-de-negocio.md` RN-09/RN-34/RN-36/RN-37 | RN-09 → D-07; RN-34 → D-14; RN-36 → D-03; RN-37 → D-09. |
| `memoria-historica.md` | Se han cubierto, entre otras, MH01/MH17 (prorrateo), MH05 (NIF), MH07/MH10 (descuento), MH11/MH28 (CSV), MH12 (fechas), MH19/MH20 (correo), MH29 (copias) y MH03 (tipos antiguos). |

## 7. Pendiente para próxima ronda

Esta es la agenda de la siguiente conversación con el negocio. No incluye las decisiones ya tomadas
(D-01 a D-25), sino las preguntas que quedaron sin respuesta concluyente o que han surgido al
aplicar el acta.

1. **H6 — ¿Una rectificativa puede marcarse cobrada?** D-04 prohíbe rectificar una factura ya
   cobrada, pero no decide si una `RE` puede cobrarse por `POST` ni si debe llevar vencimiento.
   Dirigida a Puri (gestoría) y Marga (administración).
2. **H7 — Orden de numeración en la remesa.** No hay criterio de negocio para el orden en que se
   asignan los números a los contratos; la consulta no lleva `ORDER BY`. Dirigida a Marga y Julián.
3. **H8 — Si falla una rectificación, ¿qué pasa con la original?** D-06 fija el criterio general de
   factura incompleta con aviso, pero no decide si la original debe seguir `emitida` o marcarse
   `rectificada` cuando el abono no está completo. Dirigida a Julián y Puri.
4. **D-06 — ¿Quién atiende el aviso de factura incompleta y cómo se completa?** No se ha definido el
   proceso manual ni el responsable. Dirigida a Marga y Julián.
5. **D-25 — ¿Quién debe tener el procedimiento de arranque y restauración sin Julián?** El acta
   confirma que no existe; falta decidir quién lo posee y cuándo se prueba. Dirigida a Manoli y
   Marga.
6. **Facturas históricas descuadradas.** D-01 fija que el importe válido es la suma de líneas, pero
   no se ha decidido si las facturas antiguas descuadradas se corrigen, se documentan o solo se
   aplica el criterio hacia adelante. Dirigida a Puri y Marga.
7. **CSV de facturas históricas descuadradas.** Si la cabecera y las líneas no coinciden, ¿el CSV
   debe exportar la suma de líneas también en las facturas antiguas? Dirigida a Puri.
8. **Alta de contratos sin formulario.** La vista de contratos no tiene formulario de alta; no se ha
   preguntado cómo se crean los contratos en la operación real. Dirigida a Marga.
9. **Copia diaria: ¿incluye prueba de restauración?** D-08 fija la frecuencia diaria, pero no si se
   debe probar la restauración periódicamente. Dirigida a Marga y Julián.
10. **Envío manual: ¿indefinido o temporal?** D-18 mantiene el envío manual; no se ha decidido si es
    definitivo o hasta que se resuelva la cuenta de correo. Dirigida a Manoli.
11. **Tipos antiguos: ¿solo consulta o también emisión nueva?** D-19 confirma que se prevé reabrir
    ejercicios anteriores a 2018; falta precisar si los tipos 16/18/7/8 se usan solo para consulta o
    también para emitir facturas nuevas con fecha actual. Dirigida a Puri.
12. **Ratificación real.** Todas las decisiones de este acta son de una simulación. Deben ratificarse
    por escrito por la persona competente, con nombre y fecha, antes de considerarse decisiones del
    negocio conforme al Principio I de la constitución.

## 8. Cierre

La sesión termina con **25 decisiones registradas**, **6 prohibiciones explícitas**, **una
repregunta** (N-14), **un hecho nuevo relevante** (no existe procedimiento de continuidad) y
**12 puntos en la agenda de la próxima ronda**. No se ha modificado código ni configuración. El
siguiente paso es que el negocio ratifique o corrija este borrador y que las decisiones se
incorporen al registro de anomalías y al guion de la fase de especificación.

**Firmas (pendientes de ratificación real):**

- Negocio: ______________________  Fecha: __________
- Administración: ________________  Fecha: __________
- Gestoría: ______________________  Fecha: __________
- Soporte: _______________________  Fecha: __________
