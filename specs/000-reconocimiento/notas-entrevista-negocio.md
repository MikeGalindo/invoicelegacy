# Notas de la entrevista de negocio — GesFact 2.4

**Fecha:** 2026-10-30
**Tipo:** simulación de entrevista de reconocimiento. Las respuestas las da el cliente en el papel
de la persona indicada; **no sustituyen una ratificación real** del negocio.
**Consultor:** reconocimiento de GesFact 2.4.
**Fuentes del guion:** `specs/000-reconocimiento/flujo-factura.md` (H1-H8),
`registro-riesgos.md` (R1-R24), `reglas-de-negocio.md` (RN-09, RN-34, RN-36, RN-37 y resto de
reglas dudosas), `contradicciones.md` y `memoria-historica.md` (preguntas abiertas).
**Criterio de orden:** impacto económico potencial, de mayor a menor. No se ha modificado ningún
fichero de la aplicación.

> En el repositorio no existe todavía un registro formal de anomalías. A efectos de esta entrevista
> se han tratado como **PENDIENTES** los hallazgos H1-H8 de `flujo-factura.md` y como **DUDOSAS**
> las reglas RN-09, RN-34, RN-36 y RN-37 de `reglas-de-negocio.md`, además de las contradicciones
> 01-09 y las preguntas abiertas de `memoria-historica.md`.

## Notas pregunta a pregunta

| ID | Pregunta (resumen) | Dirigida a | Respuesta | Decisión registrada | Condiciones, prohibiciones o información nueva |
|---|---|---|---|---|---|
| N-01 | Si cabecera y líneas no coinciden, ¿qué importe es válido? | Puri (gestoría), con Marga | **B** | El importe válido es la **suma de las líneas**, no el total de la cabecera. | Afecta al CSV y al modelo 303. Ejemplos usados: FA-2026-000105, cabecera 2.756,38 € frente a líneas 2.674,52 €; FA-2026-000101, 161,17 € frente a 157,47 €. |
| N-02 | ¿A qué se aplica el descuento por volumen? | Paco (comercial) | **A** | El descuento por volumen **también se aplica a las cuotas mensuales de contrato**. | Ejemplo: contrato de 1.200 €/mes al 21 % → 1.422,96 € en lugar de 1.452,00 €; 29,04 €/mes y 348,48 €/año. |
| N-03 | Prorrateo del último mes: 30 días o días reales | Paco, con Puri | **B** | El prorrateo correcto es por **días reales del mes**. | Ejemplo: 90 € con baja el 15 de marzo: 43,55 € (días reales) frente a 45,00 € (30 días); en febrero, 48,21 € frente a 45,00 €. |
| N-04 | ¿Se puede rectificar una factura ya cobrada? | Puri, con Marga | **No** | **Prohibido** rectificar facturas cobradas. | Ejemplo: FA-2026-000102, cobrada por 145,89 €; no se emite abono de −145,89 €. |
| N-05 | ¿Qué hace el sistema si se relanza la remesa de un mes ya facturado? | Marga, con Julián | **A** | El sistema debe **impedir** la segunda emisión de la remesa de un mes ya facturado. | Ejemplo: 4 contratos → 4 facturas duplicadas; 50 contratos → 50 duplicadas. |
| N-06 | Si falla la grabación de una factura, ¿qué debe quedar? | Julián, con Marga | **B** | Debe quedar la **cabecera y las líneas guardadas, con un aviso** para completarla. | Se acepta una factura incompleta con aviso; no se exige que desaparezca. Ejemplo: cabecera de 122,23 € con una sola línea de 90,00 €. Queda pendiente quién atiende el aviso y cómo se completa. |
| N-07 | ¿El descuento por volumen reduce también el recargo de equivalencia? | Puri, con Paco | **Sí** | El descuento reduce la base y, con ella, el **recargo de equivalencia**. | Ejemplo: línea de 1.200 € al 21 %, recargo 5,2 %, descuento 2 %: recargo 61,15 € sobre base 1.176,00 €, frente a 62,40 € sobre base sin descontar; diferencia 1,25 €. |
| N-08 | Frecuencia de copia de la base de datos | Marga, con Julián | **B** | La copia debe ser **diaria**. | Hoy es semanal en un pendrive; una avería un jueves podría perder hasta 6 días de facturas, clientes, contratos y cobros. |
| N-09 | Plazo por defecto para clientes sin plazo pactado | Marga | **A** | **30 días y el mismo** para factura manual y remesa. | Ejemplo: factura del 5 de marzo de 2026 → vencimiento 4 de abril de 2026. |
| N-10 | ¿Quién comprueba la letra del NIF? | Marga | **A** | La letra del NIF debe validarla **el sistema**. | Hoy solo se comprueban 9 caracteres; un NIF con letra errónea pero 9 caracteres se acepta y llega a factura y CSV. |
| N-11 | Año del número de factura | Puri, con Julián | **A** | El año del número debe ser el de **la fecha de la factura**. | Ejemplo: remesa de diciembre de 2025 lanzada el 1 de enero de 2026: fecha 31/12/2025, número de 2025, no FA-2026-000001. |
| N-12 | Si falla la grabación tras reservar número, ¿qué se hace con el número? | Puri, con Julián | **A** | El número reservado debe **reutilizarse** en la siguiente factura. | Ejemplo: se reserva FA-2026-000109, falla la grabación y la siguiente debe ser 109, no 110. |
| N-13 | Contenido del CSV: todas las facturas o neto | Puri | **A** | El CSV debe mantener **las tres líneas** (original, abono y sustituta), sin netear. | Ejemplo: FA-2026-000106 (122,23 €), RE-2026-000001 (−122,23 €) y FA-2026-000107 (122,23 €); neto del cliente 122,23 €. |
| N-14 | ¿El tablero resta los abonos RE? | Marga, con Puri | **A** (tras repregunta) | **Sí**, el importe pendiente del tablero debe restar los abonos de la serie RE. | Primera respuesta «a» no concluyente porque la pregunta era de sí/no; se repreguntó con opciones (a) sí / (b) no y respondió «a». Ejemplo: RE-2026-000001 de −122,23 € debe reducir el pendiente. |
| N-15 | ¿La factura de remesa debe indicar el descuento aplicado? | Puri, con Marga | **Sí** | La factura de remesa debe indicar el **porcentaje de descuento aplicado**. | Ejemplo: contrato de 1.200 €/mes → línea de 1.176,00 €; la factura debe explicar el 2 %. |
| N-16 | ¿Se mantienen umbrales y porcentajes del descuento? | Paco | **A** | Se mantienen **2 % por encima de 1.000 €** y **5 % por encima de 5.000 €**, con frontera estricta. | 1.000,00 € justos no llevan descuento; 1.000,01 € sí. Ejemplo: 1.001 € → base 980,98 €; 5.001 € → base 4.750,95 €. |
| N-17 | Límite de 6 líneas por factura | Marga | **A** | El límite de **6 líneas es suficiente** y se mantiene. | Si alguna vez se necesitaran más, habría que emitir dos facturas o dejar líneas fuera. |
| N-18 | Envío de facturas por correo | Manoli | **A** | Se mantiene el **envío manual** actual. | Hoy Marga imprime la factura y la envía desde Outlook; el envío automático está fuera de servicio desde 2022. |
| N-19 | ¿Se prevé reabrir ejercicios anteriores a 2018? | Puri, con Julián | **Sí** | Los tipos antiguos **16/18/7/8** siguen siendo necesarios. | Se prevé reabrir ejercicios anteriores a 2018 por rectificativas tardías, inspección o corrección de la gestoría. |
| N-20 | ¿Se puede facturar a un cliente dado de baja? | Marga | **Sí** (a la pregunta «¿debe impedirse?») | Debe **impedirse** facturar a un cliente dado de baja. | Ejemplo: Ferretería El Tornillo podría estar de baja y aun así emitirse una factura a su nombre por otra vía. |
| N-21 | ¿Qué hacer con una fecha inválida? | Julián, con Marga | **A** | Una fecha inválida debe **rechazarse**. | Ejemplos: 29/02/2026 no existe; un mes 2026-13 genera «undefined 2026» en la remesa. |
| N-22 | ¿Unificar el formato de importes? | Marga | **Sí** | Debe unificarse al formato de la factura: **coma decimal y punto de millar**. | Hoy factura/CSV usan 1.234,50 y tablero/listados/consola usan 1234.50. |
| N-23 | ¿Qué hacer si falta el IVA? | Marga, con Julián | **B** | Si falta el IVA, debe **rechazarse** la operación y obligar a indicarlo. | Hoy un artículo o contrato sin IVA toma 21 y una línea sin IVA provoca error al grabar. |
| N-24 | ¿Qué hacer con formatos numéricos no válidos? | Marga | **A** | Deben **rechazarse** los formatos no numéricos o con punto de millar; solo se acepta un número válido. | Ejemplos: 1.234,56 se guarda hoy como 1,234; 12 ud se guarda como 12. |
| N-25 | ¿Existe procedimiento escrito y probado para arrancar/restaurar sin Julián? | Marga, con Manoli | **No** | **No existe** un procedimiento escrito y probado para arrancar el sistema y restaurar una copia sin Julián. | El conocimiento está en Julián (ext. 22), Marga (copias y envíos) y Manoli (correo). Queda como riesgo operativo pendiente. |

## Información nueva aportada espontáneamente

No se aportaron condiciones fuera de las opciones ofrecidas. Las únicas condiciones nuevas son las
implícitas en las respuestas:

- N-06: se acepta que una factura quede incompleta **siempre que haya un aviso** para completarla.
- N-12: el número reservado no se considera definitivo si la factura no llega a grabarse; se
  reutiliza.
- N-14: la primera respuesta no fue concluyente y se repreguntó; la decisión final es «sí».
- N-19: se prevé reabrir ejercicios anteriores a 2018, lo que mantiene vivos los tipos antiguos.
- N-25: no hay procedimiento de continuidad; es un hecho nuevo, no una decisión.

## Temas no preguntados en esta sesión

Quedan fuera del guion de esta entrevista, por menor impacto económico o por ser decisiones de otra
fase:

- migración a MySQL de 2018 y utilidad del volcado `datos/migracion_mysql_2018.sql` (MH09, R24);
- actualización del `LEEME.txt` (Node 8, 2019) y del procedimiento de instalación (MH14, R17);
- módulo de albaranes de Roberto, que no está en el repositorio (MH18);
- detalle de la cuenta de correo Arsys y papel exacto de Manoli (MH19);
- continuidad de las personas (Julián, Marga, Puri, Paco, Roberto) y plan de relevo (MH29/MH30);
- formato exacto del CSV más allá del neteo: ya decidido que se mantienen las tres líneas (N-13);
- criterios de redondeo distintos de la regla general (RN-06/RN-13), ya documentados y no
  cuestionados en esta sesión.
