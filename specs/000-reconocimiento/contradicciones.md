# Contradicciones de negocio por duplicidad — índice

**Fecha:** 2026-10-30
**Fase:** reconocimiento. No se corrige nada (constitución `.specify/memory/constitution.md`,
Principios I y III; `AGENTS.md`).
**Alcance:** conceptos de negocio implementados más de una vez en el repositorio: cálculos,
validaciones, formatos y transformaciones. El registro de anomalías está en
`registro-anomalias.md`; este documento conserva el detalle de cada duplicidad para que el negocio
decida.
**Método:** lectura completa de los módulos de aplicación y las vistas; búsquedas de patrones
(`toFixed`, `formatearImporte`, `redondear2`, `parseFloat`, `replace(',', '.')`, `dias_pago`,
`VENCIMIENTO_DIAS`, `IVA_DEFECTO`, `prorrateo`, `INSERT INTO`, `estado`, `serie`); consultas de solo
lectura a `datos/gesfact.db` y ejecuciones con `node -e` sobre módulos puros, con
`TZ=Europe/Madrid` cuando la fecha importa (2026-10-30).

> La base de datos de producción no está en el repositorio (`AGENTS.md`). `datos/gesfact.db` es la
> base local generada por la siembra de `db.js`, que el propio código describe como «resumen, tal
> cual quedaron grabadas» (`db.js:91-92,122`). Los ejemplos con datos sembrados se marcan como datos
> de referencia, no como cifras de producción. Las conclusiones que dependen de ellos se marcan
> `SUPOSICIÓN` en el documento correspondiente.

## Lista

| ID | Título | Implementaciones | ¿Diverge hoy? | Evidencia principal | Documentos relacionados |
|---|---|---|---|---|---|
| 01 | Prorrateo de cuotas: 30 días comerciales frente a días reales | `calculo.calcularProrrateo` (pantalla) y fórmula inline de la remesa | **Sí**, en meses ≠ 30 días | `services/calculo.js:95-102`; `scripts/remesa_mensual.js:43-51`; `routes/contratos.js:31-43` | R7; zonas 17; RN-11/RN-36; MH01/MH17/MH27 |
| 02 | Formato de importes: `1.234,50` frente a `1234.50` | `util.formatearImporte` y `.toFixed(2)` | **Sí**, en toda pantalla/consola que usa `.toFixed` | `lib/util.js:51-58`; `views/index.ejs:6`; `views/articulos.ejs:8`; `views/contratos.ejs:8`; `routes/contratos.js:40`; `scripts/remesa_mensual.js:71` | Zona 28; RN-17 |
| 03 | Vencimiento por defecto: `config.VENCIMIENTO_DIAS` frente a `30` literal | Ruta manual y remesa | **No hoy** (ambos 30); **sí** si cambia la configuración | `routes/facturas.js:68-69`; `scripts/remesa_mensual.js:60`; `config.js:39-40` | Zona 18; RN-12/RN-37; MH17 |
| 04 | IVA por defecto y tipos admitidos: configuración, literal 21 y ausencia | Artículos, contratos, líneas manuales y tabla de recargos | **Latente**: hoy 21 = 21, pero la línea vacía da `NaN` | `routes/articulos.js:16`; `routes/contratos.js:20`; `routes/facturas.js:61`; `db.js:36,46,71`; `services/calculo.js:12-23` | RN-05/RN-07 |
| 05 | Grabación de cabecera y líneas: tres copias del `INSERT` con tres políticas de error | Alta manual, remesa y rectificación | **Sí**, ante un fallo de inserción | `routes/facturas.js:71-100,138-160`; `scripts/remesa_mensual.js:57-75`; `db.js:50-74` | R4/R10/R11; zonas 11-13; H3/H8; MH16/MH26/MH31 |
| 06 | Traza del descuento por volumen: la manual lo anota y la remesa no | `calcularFactura` + nota manual + observaciones fijas de remesa | **Sí**, cuando el descuento se activa | `services/calculo.js:39-43,60-71`; `routes/facturas.js:74-76`; `scripts/remesa_mensual.js:61-62` | R16; H1; RN-07/RN-08/RN-24; MH07/MH08 |
| 07 | Totales de factura: cabecera almacenada frente a suma de líneas | Cabecera (`facturas`) y detalle (`lineas`), leídos por caminos distintos | **Sí** en 6 de las 9 facturas sembradas | `services/calculo.js:81-86`; `routes/informes.js:23-26,36-38`; `server.js:24`; `views/factura_detalle.ejs:24-40`; `db.js:122` | R10/R11; RN-06/RN-10/RN-30; discrepancia 1 de `reglas-de-negocio.md` |
| 08 | Validación de fechas: regex de mes, ninguna validación y fecha del navegador | Remesa, factura manual y baja de contrato | **Sí** ante entradas inválidas | `scripts/remesa_mensual.js:14-18`; `routes/facturas.js:44`; `routes/contratos.js:21,32`; `lib/util.js:20-39` | R8/R14; H5; RN-13/RN-14/RN-22; MH12 |
| 09 | Normalización de números de entrada: la misma conversión copiada cuatro veces | Facturas, artículos y contratos | **No** entre caminos; punto ciego común | `routes/facturas.js:59-60`; `routes/articulos.js:19`; `routes/contratos.js:19`; `lib/util.js:60-68` | R8; RN-22; zona 12 |

## Cómo leer cada documento

Cada fichero `contradiccion-NN-<nombre>.md` contiene las cinco partes pedidas:

1. **Implementaciones implicadas y camino que usa cada una**, con `fichero:líneas`.
2. **¿Misma convención o algoritmo?** Comparación paso a paso.
3. **Ejemplos concretos y cuantificación** de la divergencia, con datos sembrados cuando existen y
   con escenarios marcados cuando no.
4. **Cuándo se manifiesta y cuándo coinciden**, incluida la explicación de por qué no se ha
   detectado antes.
5. **Historia probable**, reconstruida desde comentarios, estilo y cronología, con `SUPOSICIÓN`
   donde no hay evidencia.

Al final de cada documento hay preguntas para el negocio. **No se decide cuál de las
implementaciones es la correcta**: eso es una pregunta de negocio, no técnica.

## Criterios de inclusión y exclusiones

Se han incluido duplicidades que cumplen al menos uno de estos criterios:

- el mismo cálculo produce resultados distintos para la misma entrada (01, 02, 07);
- la misma regla tiene dos fuentes de verdad y divergiría ante un cambio de configuración o dato
  (03, 04);
- la misma transformación se ejecuta con políticas de error distintas (05);
- el mismo hecho de negocio deja traza distinta (06);
- la misma validación se aplica con criterios distintos (08);
- la misma transformación está copiada literalmente, aunque hoy no diverja (09).

No se han incluido como contradicciones independientes:

- la **rectificación que no recalcula** (`routes/facturas.js:124-128`): es una regla de negocio
  intencionada y documentada («Puri dixit»), no una duplicidad accidental; se menciona en 05, 06 y
  07 por su efecto;
- el **envío de correo solo en el alta manual** (`routes/facturas.js:93-95`): no es una
  implementación duplicada, sino una funcionalidad desactivada y ausente en los otros caminos;
- la **numeración con año de ejecución** (`lib/numeracion.js:15`): es una discrepancia entre la
  fecha del número y la fecha de la factura, no dos implementaciones del mismo cálculo; ya está en
  H2/R15;
- las **constantes de estado y serie** repetidas (`'emitida'`, `'FA'`, `'RE'`): se mencionan dentro
  de 05 como parte de la duplicación de los `INSERT`, pero no constituyen por sí solas una
  divergencia funcional.

## Relación con los documentos previos

- `flujo-factura.md` — sección 6, «Puntos donde dos caminos hacen lo mismo con código distinto»
  (`:418-466`), y hallazgos H1-H8.
- `mapa-sistema.md` — zonas oscuras 8-18 y 28.
- `registro-riesgos.md` — R4, R7, R8, R10, R11, R14, R16, R20 y R23.
- `reglas-de-negocio.md` — RN-05 a RN-14, RN-17, RN-22, RN-24, RN-30, RN-36 y RN-37.
- `memoria-historica.md` — MH01, MH07, MH08, MH12, MH13, MH15, MH16, MH17, MH21, MH24, MH26, MH27 y
  MH31.

### Cobertura de los once puntos de `flujo-factura.md` §6

| Punto de `flujo-factura.md` §6 | Contradicción que lo recoge |
|---|---|
| 6.1 `INSERT` de cabecera repetido | 05 |
| 6.2 `INSERT` de líneas con tres gestiones de error | 05 |
| 6.3 Vencimiento: `config.VENCIMIENTO_DIAS` frente a `30` literal | 03 |
| 6.4 Prorrateo: días reales frente a mes comercial de 30 | 01 |
| 6.5 Nota del descuento por volumen | 06 |
| 6.6 Objeto «cliente» completo frente a objeto sintético | No se documenta como contradicción propia: hoy `calcularFactura` solo lee `recargo_equivalencia` (`services/calculo.js:49`), por lo que no hay divergencia observable. Se menciona como contrato implícito en 05/06. |
| 6.7 Año del número frente a año de la fecha | No se documenta como duplicidad: es una única fuente (`lib/numeracion.js:15`) frente a la fecha de la factura, ya registrada como H2/R15. |
| 6.8 Estado inicial `'emitida'` literal | 05 |
| 6.9 Envío por correo solo en el alta manual | No se documenta como duplicidad: no hay dos implementaciones, sino una funcionalidad desactivada y ausente en los otros caminos. |
| 6.10 Consumo de numeración antes de la cabecera | 05 |
| 6.11 Recalcular frente a copiar en la rectificación | Se trata en 05 y 07 como regla intencionada («Puri dixit»), no como duplicidad accidental. |

### Estado tras el acta de entrevista (2026-10-30)

| Contradicción | Entrada del registro | Estado |
|---|---|---|
| 01 — Prorrateo 30 días frente a días reales | A-11 | `RESUELTA_NEGOCIO`: días reales (D-03/N-03). |
| 02 — Formato de importes | A-13 | `RESUELTA_NEGOCIO`: formato único de la factura (D-22/N-22). |
| 03 — Vencimiento por defecto | A-12 | `RESUELTA_NEGOCIO`: 30 días y una sola fuente (D-09/N-09). |
| 04 — IVA por defecto y tipos | A-14 | `RESUELTA_NEGOCIO`: IVA obligatorio y tipos antiguos conservados (D-23/N-23, D-19/N-19). |
| 05 — Grabación de cabecera y líneas | A-08 / A-17 | `PARCIAL`: D-06 fija el criterio general de factura incompleta con aviso; el estado de la original en una rectificación y el proceso de completado siguen pendientes. |
| 06 — Traza del descuento | A-01 | `RESUELTA_NEGOCIO`: descuento en contratos y nota en remesa (D-02/N-02, D-15/N-15). |
| 07 — Totales cabecera frente a líneas | A-15 | `RESUELTA_NEGOCIO`: suma de líneas como importe válido (D-01/N-01, D-13/N-13). |
| 08 — Validación de fechas | A-05 | `RESUELTA_NEGOCIO`: rechazar fechas inválidas (D-21/N-21). |
| 09 — Normalización numérica | A-16 | `RESUELTA_NEGOCIO`: rechazar formatos no válidos (D-24/N-24). |

El detalle, el historial de clasificación y la agenda pendiente están en
`registro-anomalias.md`.

## Preguntas transversales para la entrevista al negocio

1. ¿Qué importe manda cuando cabecera y líneas no coinciden (07)?
2. ¿El prorrateo de una cuota es comercial de 30 días o por días reales (01)?
3. ¿El descuento por volumen se aplica a cuotas de contrato y debe anotarse (06)?
4. ¿El plazo de pago por defecto es único para toda la aplicación (03)?
5. ¿El IVA por defecto es único para artículos, contratos y líneas (04)?
6. ¿Una factura debe quedar completa o no quedar nada si falla una línea (05)?
7. ¿Qué fechas y meses debe rechazar el servidor, aunque el navegador los permita (08)?
8. ¿Qué formato de importe debe verse en toda la aplicación (02)?
9. ¿Debe aceptarse el punto de millar y rechazarse el texto en los campos numéricos (09)?
