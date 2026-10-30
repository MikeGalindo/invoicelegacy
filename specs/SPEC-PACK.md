# SPEC-PACK — GesFact 2.4

**Proyecto:** GesFact 2.4, sistema heredado de facturación de Suministros Hidalgo, S.L.
**Fecha:** 30 de octubre de 2026.
**Fase:** reconocimiento y protección. No se ha modificado ningún fichero de la aplicación,
la configuración ni los datos.
**Documento de entrada:** este fichero es el punto único de entrada al paquete. Resume el
trabajo, prioriza los riesgos, explica qué contiene cada documento y declara qué parte del
sistema está protegida por tests y qué parte no.

**Estado de las decisiones:** el acta de entrevista de negocio de 2026-10-30 es una
**simulación no ratificada** (`acta-entrevista-negocio.md:4-7`). Sus 25 decisiones no son
decisiones reales hasta que las firme la persona competente. Del mismo modo, las 7 decisiones
marcadas `RESUELTA_PROPUESTA` son propuestas del analista, no del negocio
(`registro-anomalias.md:57-73`).

---

## 1. Resumen ejecutivo para el gerente

### 1.1 Qué se ha hecho

Se ha levantado el plano del programa que emite las facturas: qué hace, por qué, qué está mal y
cómo evitar que empeore. No se ha tocado el sistema. El resultado son 18 documentos de
reconocimiento, **39 reglas de negocio**, **9 contradicciones**, **23 anomalías**, **28 riesgos**
y la historia del programa en 36 hitos. Además, **116 comprobaciones automáticas** que hoy pasan
todas.

### 1.2 Qué se ha descubierto

**Facturas que no cuadran.** De las 9 facturas de ejemplo, 6 tienen un total distinto a la suma
de sus líneas. La FA-2026-000105 muestra **2.756,38 €** en el pie y **2.674,52 €** en el detalle:
**81,86 €** de diferencia. El fichero de la gestoría usa la cabecera y el resumen de IVA usa las
líneas, así que la misma factura cuenta distinto según la salida.

**Dos formas de prorratear el mes de baja.** La pantalla usa 30 días y la remesa los días reales.
Con una cuota de 90 € y baja el día 15: **45,00 €** frente a **43,55 €** en marzo, y 45,00 €
frente a **48,21 €** en febrero. Es un descuadre sistemático, no un redondeo.

**Descuentos sin explicación en la remesa.** Por encima de 1.000 € se aplica un 2 % y por encima
de 5.000 € un 5 %. La factura manual lo anota; la de remesa, no. Una cuota de 1.200 € sale
**29,04 € más barata al mes** (348,48 € al año) sin que se vea el motivo.

**Doble lanzamiento de la remesa.** No se comprueba si el mes ya se facturó: lanzarla dos veces
duplica todas las facturas y consume numeración. Ya ocurrió en abril de 2026.

Fuera del cálculo: el sistema no tiene contraseña ni control de accesos y cualquier equipo de la
red puede emitir o rectificar facturas; la copia es semanal aunque el negocio exige diaria (hasta
seis días de pérdida); y las claves del correo y del fichero de la gestoría están en un fichero
versionado.

### 1.3 Qué protección se ha instalado

**116 comprobaciones** con `npm test`, en menos de un segundo. Fijan importes, fechas, numeración
y líneas del fichero de la gestoría, y fallan si algo cambia aunque sea un céntimo. La pieza
central es una foto de 12 operaciones completas. Protegen el cálculo y las reglas puras; no
ejecutan aún las pantallas ni la remesa completa (sección 4).

### 1.4 Qué decisiones tiene pendientes el negocio

| Prioridad | Decisión | Recomendación |
|---|---|---|
| 1 | **Ratificar el acta de 25 decisiones.** Hoy es una simulación sin firma. | Una sesión con Puri, Marga, Paco y Julián; firmar o corregir. Sin esto, ninguna decisión es exigible. |
| 2 | **Facturas históricas descuadradas.** | No modificarlas; anexo de conciliación y suma de líneas también en el histórico. |
| 3 | **Procedimiento de arranque y restauración.** Hoy depende de Julián. | Marga responsable, Julián autor técnico; prueba trimestral sobre copia desechable. |
| 4 | **Factura incompleta y rectificación a medias.** | Proceso de Marga; abono espejo y factura nueva, sin editar la base; la original solo pasa a «rectificada» con el abono completo. |
| 5 | **Abono cobrable, orden de la remesa y alta de contratos.** | No cobrar la RE; numerar por contrato ascendente; alta por plantilla SQL mientras no haya pantalla. |

El detalle técnico, con los códigos de anomalía, está en `registro-anomalias.md:57-73`; la
agenda completa, en `acta-entrevista-negocio.md:117-152`.

### 1.5 Base de las cifras

Las cifras de facturas proceden de la base de referencia que el sistema crea con el depósito
vacío (`db.js:123-177`), no de la base de producción, que no está en el repositorio. Los ejemplos
de 29,04 € y 1,45 €/3,21 € son aritmética sobre casos concretos, no una estimación del volumen
real. La fórmula y el código que producen cada resultado están en
`contradiccion-07-totales-cabecera-lineas.md`, `contradiccion-01-prorrateo-cuotas-contrato.md` y
`contradiccion-06-traza-descuento-volumen.md`.

---

## 2. Inventario de riesgos priorizado

### 2.1 Criterio de prioridad

Se combinan impacto y probabilidad según `registro-riesgos.md:21-24`, y se añade el criterio de
esta fase: **P1** exige una medida antes de tocar el sistema; **P2** se aborda al principio de
la modernización; **P3** es deuda que se planifica y no bloquea. Un riesgo P1 no implica cambiar
código hoy: implica que el negocio conozca la exposición y decida.

### 2.2 Prioridad P1 — exposición inmediata

| ID | Riesgo | Impacto en una frase | Recomendación para la modernización |
|---|---|---|---|
| R1 | Numeración no atómica y sin `UNIQUE` | Un número repetido invalida la serie correlativa ante la gestoría y Hacienda; ya ocurrió en 2021. | Restricción única sobre `numero`, reserva transaccional y prueba de concurrencia con dos conexiones reales. Spec 004. |
| R2 | Credenciales en texto plano y versionadas | Una filtración del repositorio permite suplantar el correo corporativo y alterar el fichero que se entrega a la gestoría. | Sacar `config.js` del control de versiones, rotar las claves y usar variables de entorno; decidir el orden con el negocio. |
| R3 | Sin autenticación ni CSRF; escucha en todas las interfaces | Cualquier equipo de la red de la oficina puede emitir, cobrar o rectificar facturas reales. | Restringir el acceso a la red mientras no haya autenticación; implantar sesión, permisos y CSRF en la modernización. |
| R4 | Remesa no idempotente ni transaccional | Un doble lanzamiento duplica todas las facturas del mes y consume numeración. | Guarda de «mes ya facturado», transacción por factura y ensayo sobre copia desechable. Spec 006. |
| R5 | Copia semanal, manual y sin prueba de restauración | Se pueden perder hasta seis días de facturación si falla el disco. | Copia diaria automatizada, verificación de integridad y restauración trimestral probada. Spec 009. |
| R27 | La copia diaria decidida por el negocio no está implantada | La exposición de R5 sigue vigente aunque la decisión exista. | Implantar la copia diaria y registrar la fecha en que queda operativa. Spec 009. |
| R26 | El arranque y la restauración dependen de Julián | Una ausencia de Julián puede impedir facturar o recuperar la base. | Procedimiento escrito, con Marga como responsable y prueba trimestral firmada. Spec 009 y A-18. |
| R25 | Factura incompleta sin proceso de completado | El cliente puede recibir un total que no cuadra con el detalle y el aviso puede perderse. | Responsable definido, aviso visible y corrección con abono espejo más factura nueva, sin editar la base. Spec 002 y A-17. |

### 2.3 Prioridad P2 — primera fase de modernización

| ID | Riesgo | Impacto en una frase | Recomendación para la modernización |
|---|---|---|---|
| R6 | `package-lock.json` desincronizado y vulnerable | Una reinstalación puede reintroducir una vulnerabilidad crítica de suplantación de IP y denegación de servicio. | Regenerar el lock con revisión, fijar versiones y añadir auditoría al proceso de despliegue. |
| R7 | Dos prorrateos para el mismo mes de baja | La cuota del último mes discrepa entre administración y gestoría. | Unificar a días reales (decisión D-03) en una sola función y cubrirlo con golden master. Spec 005/006. |
| R8 | Importes y fechas sin validar en el alta manual | Una fecha o un importe inválido se graba y contamina la serie y el cuadre. | Validación de entrada en servidor, rechazo con mensaje y tests de ruta. Spec 002/008. |
| R9 | El NIF solo se valida por longitud | Un NIF con la letra errónea llega a facturas y al fichero de la gestoría. | Validar la letra y conservar la revisión humana como segunda barrera. Spec 008. |
| R10 | Alta de factura sin transacción | Si falla una línea, queda una factura emitida sin su detalle. | Transacción única para cabecera y líneas. Spec 002. |
| R11 | Rectificación sin transacción y con errores ignorados | Un abono incompleto o una original sin marcar produce dos documentos contables vivos. | Transacción y marcado de la original solo con el abono completo. Spec 003. |
| R12 | Siembra automática de datos y contadores falsos | Un arranque con la base perdida presenta datos y numeración de ejemplo como si fueran reales. | Separar la siembra de desarrollo de cualquier arranque operativo; bloquearla en producción. |
| R15/A-02 | El año del número es el de ejecución, no el de la factura | La serie por año y el ejercicio contable pueden quedar desalineados. | Usar la fecha de la factura (decisión D-11) y probar el cruce de año. Spec 004. |
| R16/A-01 | Descuento por volumen sin nota en la remesa | Una cuota alta se factura rebajada sin que nadie vea el motivo. | Anotar el porcentaje en observaciones también en la remesa (D-15). Spec 006. |
| R17 | `LEEME.txt` desactualizado | Quien instale o restaure siguiendo el documento puede dejar el sistema inoperativo. | Reescribir las instrucciones con la versión real de Node y el procedimiento vigente. |
| R19/A-07 | La remesa numera sin `ORDER BY` | El orden de los números no es reproducible ni auditable. | Orden explícito por identificador de contrato. Spec 006. |
| R20 | Sin tests de integración ni CI | Una regresión en rutas o en la remesa pasa inadvertida hasta que llega a una factura real. | Completar la red con rutas HTTP, remesa y base temporal; automatizar `npm test` en cada cambio. |
| R28 | Reutilizar el número reservado sobre una factura parcial | Un número reutilizado sobre una grabación parcial duplica la serie. | Comprobar que no queda rastro antes de reutilizar; transacción previa. Spec 004. |

### 2.4 Prioridad P3 — deuda planificada

| ID | Riesgo | Impacto en una frase | Recomendación para la modernización |
|---|---|---|---|
| R13 | Correo automático muerto desde 2022 | Todas las facturas se envían a mano, con riesgo de olvido y trabajo diario. | Mantener el envío manual (D-18) y retirar el código y las credenciales muertas cuando se decida. |
| R14 | `sumarDias` con milisegundos | Un cambio de hora puede desplazar un vencimiento un día. | Sumar días con calendario, no con milisegundos; probar los cambios de hora. Spec 008. |
| R18 | Rutas relativas al directorio de trabajo | Un arranque desde otra carpeta factura contra una base vacía sin aviso. | Resolver rutas desde la ubicación del proyecto y fallar de forma visible si la base no existe. |
| R21 | Trimestre sin validar en el informe de IVA | Una URL manipulada o un enlace roto tumba la pantalla. | Validar el parámetro y devolver un error controlado. Spec 007. |
| R22 | El tablero oculta errores de base de datos | Una avería puede parecer un mes sin actividad. | Mostrar el error y no convertir la falta de dato en cero. Spec 007. |
| R23 | Esquema sin claves foráneas ni índices | Puede haber líneas huérfanas y consultas lentas al crecer el histórico. | Añadir integridad referencial e índices en una migración controlada. |
| R24 | Volcado MySQL de 2018 huérfano | Alguien puede ejecutarlo creyendo que es el esquema vigente. | Marcarlo como obsoleto o retirarlo con decisión documentada. |

### 2.5 Anomalías registradas

Las 23 anomalías están en `registro-anomalias.md` con evidencia, clasificación y estado. Este
resumen prioriza su efecto y su tratamiento. **Ninguna se ha corregido en esta fase.**

| ID | Estado | Impacto en una frase | Tratamiento recomendado |
|---|---|---|---|
| A-01 | `RESUELTA_NEGOCIO` (D-02/D-15) | La remesa descuenta sin explicar el porcentaje. | Anotar el descuento en observaciones. Spec 006. |
| A-02 | `RESUELTA_NEGOCIO` (D-11) | El número puede llevar un año distinto al de la factura. | Numerar con el año de la fecha. Spec 004. |
| A-03 | `RESUELTA_NEGOCIO` (D-12) | Un fallo de grabación deja un hueco en la serie. | Reutilizar el número solo si no hay rastro. Spec 004. |
| A-04 | `RESUELTA_NEGOCIO` (D-20) | Se puede facturar a un cliente dado de baja. | Bloquear clientes inactivos. Spec 002/008. |
| A-05 | `RESUELTA_NEGOCIO` (D-21) | Una fecha inválida produce vencimiento `NaN-NaN-NaN`. | Rechazar fechas inválidas. Spec 002/008. |
| A-06 | `RESUELTA_PROPUESTA` | Un abono puede marcarse como cobrado y nace sin vencimiento. | Rechazar la serie `RE` en la ruta de cobro; mantener vencimiento nulo. Spec 003. |
| A-07 | `RESUELTA_PROPUESTA` | La remesa numera en un orden no garantizado. | `ORDER BY` por identificador de contrato. Spec 006. |
| A-08 | `RESUELTA_PROPUESTA` | Una rectificación a medias deja dos documentos vivos. | Marcar la original solo con el abono completo. Spec 003. |
| A-09 | `RESUELTA_NEGOCIO` (D-07) | El descuento reduce también el recargo. | Es el comportamiento deseado: conservarlo y probarlo. Spec 001. |
| A-10 | `RESUELTA_NEGOCIO` (D-14) | El tablero muestra deuda ya abonada (122,23 € en el ejemplo). | Restar los abonos `RE`. Spec 007. |
| A-11 | `RESUELTA_NEGOCIO` (D-03) | Dos prorrateos discrepan 1,45 € o 3,21 € por baja. | Unificar a días reales. Spec 005/006. |
| A-12 | `RESUELTA_NEGOCIO` (D-09) | Manual y remesa usan fuentes distintas para el plazo de 30 días. | Una sola fuente de configuración. Spec 006/008. |
| A-13 | `RESUELTA_NEGOCIO` (D-22) | Conviven `1.234,50` y `1234.50`, con riesgo de lectura errónea. | Unificar al formato de factura. Spec 008. |
| A-14 | `RESUELTA_NEGOCIO` (D-23/D-19) | Una línea sin IVA produce `NaN`; los tipos antiguos deben conservarse. | Exigir IVA y mantener 16/18/7/8. Spec 008. |
| A-15 | `RESUELTA_NEGOCIO` (D-01/D-13) | Seis de nueve facturas de referencia descuadran; la mayor, 81,86 €. | Importe válido = suma de líneas; CSV con las tres líneas sin netear. Spec 007. |
| A-16 | `RESUELTA_NEGOCIO` (D-24) | `1.234,56` se guarda como `1,234`; `12 ud` se guarda como `12`. | Rechazar formatos no numéricos o con punto de millar. Spec 008. |
| A-17 | `RESUELTA_PROPUESTA` | Una factura incompleta queda viva sin proceso de corrección. | Proceso de Marga con abono y factura nueva, sin editar la base. Spec 002. |
| A-18 | `RESUELTA_PROPUESTA` | No hay procedimiento probado de arranque y restauración. | Procedimiento y prueba trimestral. Spec 009. |
| A-19 | `RESUELTA_PROPUESTA` | El histórico descuadrado sigue en la copia sin criterio de conciliación. | No modificarlo; anexo de conciliación y suma de líneas en el CSV. Spec 007. |
| A-20 | `RESUELTA_PROPUESTA` | Los contratos se crean sin formulario en la aplicación. | Alta asistida por plantilla SQL; interfaz solo si el negocio la prioriza. Spec 005. |
| A-21 | `ABIERTA_TECNICA` | `formatearImporte(Infinity)` produce una cadena inválida. | Deuda técnica: validar el valor antes de formatear. Spec 008. |
| A-22 | `ABIERTA_TECNICA` | Un IVA recibido como texto calcula IVA pero no recargo. | Deuda técnica: normalizar el tipo antes de calcular. Spec 001. |
| A-23 | `ABIERTA_TECNICA` | `redondear2(-0.005)` devuelve `-0`. | Deuda técnica: normalizar el cero negativo. Spec 001. |

**Lectura del estado:** no queda ninguna anomalía pendiente de respuesta de negocio
(`registro-anomalias.md:151-160`). Quedan 7 propuestas pendientes de ratificación y 3 rarezas
técnicas. La implementación de todo lo decidido sigue congelada por la constitución.

---

## 3. Índice comentado del paquete

### 3.1 Mapa de lectura

| Orden | Documento | Qué responde | Cuándo leerlo |
|---|---|---|---|
| 1 | `specs/SPEC-PACK.md` | Visión completa y prioridades. | Siempre, primero. |
| 2 | `specs/000-reconocimiento/mapa-sistema.md` | Qué piezas tiene el sistema y para qué sirve cada una. | Antes de tocar cualquier módulo. |
| 3 | `specs/000-reconocimiento/flujo-factura.md` | Cómo nace, se cobra y se rectifica una factura, paso a paso. | Antes de cambiar emisión, cobro o remesa. |
| 4 | `specs/000-reconocimiento/reglas-de-negocio.md` | Las 39 reglas que producen los importes y las fechas. | Antes de cambiar un cálculo. |
| 5 | `specs/000-reconocimiento/contradicciones.md` y `contradiccion-01` a `-09` | Dónde discrepan la convención, el código y la operación. | Al revisar una regla dudosa. |
| 6 | `specs/000-reconocimiento/registro-anomalias.md` | Qué está mal, con evidencia, estado y decisión. | En cada reunión de negocio. |
| 7 | `specs/000-reconocimiento/registro-riesgos.md` | Deuda técnica y exposición operativa. | Al planificar la modernización. |
| 8 | `specs/000-reconocimiento/propuesta-particion-specs.md` | Cómo se reparte el sistema en 9 specs. | Antes de abrir una spec formal. |
| 9 | `test/COBERTURA.md` | Qué congela la red y qué queda fuera. | Antes de confiar en los tests. |

### 3.2 Mapa del sistema

`mapa-sistema.md` describe un monolito Node.js con Express, vistas EJS y una única base SQLite
(`datos/gesfact.db`), sin autenticación ni servicios externos activos. Distingue tres capas:

- **Arranque y datos:** `server.js` (puerta de entrada), `config.js` (datos fiscales, puerto,
  ruta de la base, claves) y `db.js` (esquema, siembra y acceso a SQLite).
- **Dominio:** `routes/facturas.js` (emisión, cobro y rectificación), `routes/clientes.js`,
  `routes/articulos.js`, `routes/contratos.js`, `routes/informes.js` (IVA y CSV),
  `lib/numeracion.js` (series), `lib/util.js` (redondeo, fechas, NIF, formatos),
  `services/calculo.js` (importes, recargos, descuentos y prorrateo) y
  `scripts/remesa_mensual.js` (emisión en lote por línea de comandos).
- **Salida:** vistas EJS, CSV para la gestoría y correo (stub desactivado desde 2022).

El documento incluye 30 «zonas oscuras» con evidencia `fichero:líneas`, entre ellas la
numeración no atómica, la falta de transacciones, el tablero que ignora abonos y la siembra de
datos de referencia. Es la foto de referencia: no propone cambios.

### 3.3 Glosario

| Término | Significado en este paquete |
|---|---|
| **RN-\*** | Regla de negocio documentada en `reglas-de-negocio.md` (RN-01 a RN-39). |
| **A-\*** | Anomalía del registro (A-01 a A-23). |
| **R-\*** | Riesgo técnico u operativo de `registro-riesgos.md` (R1 a R28). |
| **H1-H8** | Hallazgos del recorrido del flujo de factura. |
| **MH\*** | Hito de la memoria histórica reconstruida de los comentarios del código. |
| **D-\* / N-\*** | Decisión y pregunta del acta de entrevista (simulación de 2026-10-30). |
| **Cabecera / líneas** | Totales grabados en la factura frente al detalle de conceptos; pueden no coincidir (A-15). |
| **Serie FA / RE** | Facturas normales y abonos rectificativos. Las facturas no se borran nunca. |
| **Remesa** | Script que emite en lote las cuotas de los contratos de un mes. |
| **Prorrateo** | Cálculo de la parte de cuota correspondiente al mes de alta o baja. |
| **Recargo de equivalencia** | Recargo de IVA aplicable a clientes minoristas, con tabla propia por tipo. |
| **Gestoría** | Destinatario externo del CSV y del modelo 303; su software, Contaplus, cuadra línea a línea. |
| **Golden master** | Foto completa de 12 operaciones cuyo resultado no puede cambiar sin decisión escrita. |
| **Test de caracterización** | Test que fija el comportamiento actual, no el deseado. |
| **Congelado por fuente** | Test que lee el código y comprueba que una línea concreta sigue existiendo; detecta cambios de texto, no de comportamiento. |
| **RPO / RTO** | Pérdida máxima de datos aceptable / tiempo máximo de recuperación. Aquí: 1 día y 1 día laborable. |

### 3.4 Las specs y su trazabilidad

**Estado real:** no existe todavía ningún fichero `specs/001-*` a `specs/009-*`. Lo que existe
es la **partición aprobada para revisión** en `propuesta-particion-specs.md`, con las
descripciones listas para pasar por `/speckit-specify`. No se ha ejecutado ese comando ni se ha
creado una spec formal. Cualquier persona que busque las specs debe saberlo antes de abrir la
carpeta.

La partición cubre las 39 reglas y las 23 anomalías sin solapamientos: cada regla tiene una spec
dueña y cada anomalía una spec primaria, con remisiones en las demás. Las 9 specs previstas son:

| Spec | Alcance | Reglas | Anomalías | Tests que la respaldan | Golden master | Dueño natural |
|---|---|---|---|---|---|---|
| 001 | Cálculo de importes, descuentos y redondeo | RN-01 a RN-10 | A-09, A-22, A-23 | `calculo`, `reglas-negocio`, `util`, `anomalias` | Sí, 8 casos | Puri / Paco |
| 002 | Emisión manual de facturas | RN-21 a RN-24 | A-04, A-05, A-17 (A-15 se cita) | `contradicciones` (04, 05, 06, 08, 09), `anomalias`, `reglas-negocio` | Sí, 3 casos | Marga / Julián |
| 003 | Cobro y rectificación | RN-25 a RN-29 | A-06, A-08 (A-15 se cita) | `golden-master` (rectificativa), `anomalias`, `contradicciones` | Sí, 1 caso | Puri / Marga |
| 004 | Numeración y series | RN-18 a RN-20 | A-02, A-03 | `numeracion`, `anomalias` | No: doble de base | Puri / Julián |
| 005 | Contratos y prorrateo de cuotas | RN-11, RN-14 | A-11, A-20 | `calculo`, `reglas-negocio`, `util`, `contradicciones`, `anomalias` | Sí, 3 casos | Paco / Marga |
| 006 | Remesa mensual | RN-35 a RN-39 | A-01, A-07, A-12 | `anomalias`, `contradicciones`, modelo del golden | Parcial: solo el prorrateo | Marga / Julián |
| 007 | Informes, CSV y tablero | RN-30 a RN-34 | A-10, A-15, A-19 | `anomalias`, `contradicciones`, fixture de facturas | Parcial: totales | Puri / Marga |
| 008 | Datos maestros, condiciones y formatos | RN-12, RN-13, RN-15 a RN-17 | A-13, A-14, A-16, A-21 | `util`, `reglas-negocio`, `anomalias`, `contradicciones` | No | Marga / Puri / Julián |
| 009 | Operación, respaldo y continuidad | — | A-18 | `anomalias` (comprobación documental) | No | Marga / Manoli / Julián |

**Trazabilidad completa:** la tabla regla por regla y anomalía por anomalía está en
`propuesta-particion-specs.md:410-445`; el reparto de las 9 contradicciones, en `:394-406`; los
casos frontera entre specs, en `:475-492`; y la tabla resumen final, en `:971-983`.

**Condición de firmeza:** las 7 decisiones `RESUELTA_PROPUESTA` (A-06, A-07, A-08, A-17, A-18,
A-19 y A-20) deben marcarse como provisionales en cada spec y ratificarse antes de considerar
la especificación cerrada.

### 3.5 Registro de anomalías

`registro-anomalias.md` es el documento de trabajo del negocio. Cada entrada lleva
identificador, título, evidencia, comportamiento observado, impacto, clasificación, estado y
decisión. Distingue cuatro bloques:

1. **Cerradas por decisión de negocio** (13 entradas): la convención está decidida, pero **no
   implementada**.
2. **Cerradas por propuesta del analista** (7 entradas): desbloquean la partición, pero no son
   decisiones del negocio.
3. **Rarezas técnicas** (3 entradas): detectadas al escribir los tests, sin decisión de negocio.
4. **Historial de cambios** de clasificación, con fecha, testigo y nota.

El registro no sustituye a `registro-riesgos.md`: las filas R1-R28 siguen allí con su detalle
técnico. Aquí solo se registran las anomalías que requieren decisión o que cambian de
clasificación tras el acta.

### 3.6 Memoria histórica

`memoria-historica.md` reconstruye la cronología del sistema a partir de 36 hitos documentados
—comentarios del código y notas de la entrevista—: el Access anterior a 2017, la reescritura en
Node en 2017, el paso a SQLite en 2018 tras corromperse los ficheros JSON, el acuerdo de
descuentos con Paco, el trimestre devuelto por Puri en mayo de 2019 al cambiar el redondeo, la
inspección de 2020 que fijó la regla de no borrar facturas, el número duplicado de 2021 y los
incidentes de 2026. Cada hito lleva fecha cuando consta, tipo, protagonista, evidencia y pregunta
al negocio.

Sirve para dos cosas: entender por qué el sistema hace cosas que parecen raras (el redondeo
línea a línea no es un capricho, es una cicatriz) y evitar que una modernización repita errores
ya pagados. Las preguntas abiertas de este documento alimentaron la entrevista de negocio.

### 3.7 Entrevista de negocio

- `acta-entrevista-negocio.md`: 25 decisiones (D-01 a D-25), 6 prohibiciones explícitas, una
  repregunta y 12 puntos para la próxima ronda. **Es una simulación no ratificada.**
- `notas-entrevista-negocio.md`: las 25 preguntas (N-01 a N-25) con la respuesta, el ejemplo
  numérico empleado y la persona a la que se dirigió.

Las decisiones más relevantes están resumidas en la sección 1.4. Ninguna se ha implementado:
el acta registra intenciones, no cambios.

### 3.8 Suite de tests

La red está descrita en `test/COBERTURA.md` y se ejecuta con:

```bash
npm install --no-package-lock   # solo la primera vez; el lock está incompleto
npm test                        # TZ=Europe/Madrid node --test test/*.test.js
```

Comprobado el 2026-10-30: **116 tests, 116 en verde**, en unos 0,12 s. Comandos útiles:

```bash
TZ=Europe/Madrid node --test test/calculo.test.js
TZ=Europe/Madrid node --test --test-name-pattern="redondeo" test/*.test.js
```

Ficheros:

| Fichero | Qué congela |
|---|---|
| `test/util.test.js` | Redondeo, fechas, días del mes, NIF, formatos y coma flotante. |
| `test/calculo.test.js` | Recargos, cálculo por línea, descuentos, totales, prorrateo, ceros, negativos y `NaN`. |
| `test/reglas-negocio.test.js` | Una batería por regla pura RN-01 a RN-17. |
| `test/numeracion.test.js` | Formato, reserva, año, series y concurrencia con un doble de `db.js`. |
| `test/contradicciones.test.js` | Cada implementación de las contradicciones 01-09, incluida la que vive en rutas o jobs. |
| `test/anomalias.test.js` | Un test por anomalía, con prefijo `CONGELA comportamiento actual:`. |
| `test/golden-master.test.js` | Salida completa del flujo central contra `test/golden/master.json`. |

El golden master se regenera **solo** con una decisión de negocio documentada, mediante
`TZ=Europe/Madrid node scripts/regenerar-golden-master.js`, y el `diff` debe corresponder
exactamente a esa decisión (`test/golden/LEEME.md`). No se regenera para hacer pasar un test.

**Advertencia operativa:** `node scripts/remesa_mensual.js YYYY-MM` emite facturas reales en la
base configurada. No debe ejecutarse contra datos reales ni como parte de las pruebas.

---

## 4. Estado de la red de seguridad

### 4.1 Qué está congelado

| Área | Cobertura | Tipo de prueba | Qué detecta |
|---|---|---|---|
| Redondeo, fechas, NIF y formatos (`lib/util.js`) | Completa | Puro | Cualquier cambio de céntimo, formato o suma de días. |
| Cálculo de importes (`services/calculo.js`) | Completa | Puro | Base, IVA, recargo, descuento, total y prorrateo comercial. |
| Reglas puras RN-01 a RN-17 | Completa | Puro | Una batería por regla, con fronteras y valores especiales. |
| Numeración (`lib/numeracion.js`) | Alta | Doble de base de datos | Formato, correlatividad, cambio de año y doble reserva simulada. |
| Contradicciones 01-09 | Alta | Puro, fuente y fixture | Cada implementación divergente, incluida la que vive en rutas o jobs. |
| Anomalías A-01 a A-23 | 23 de 23 registradas | Puro, fuente, fixture y documental | Que el comportamiento registrado —o la línea de código que lo implementa— no cambie por accidente. |
| Flujo central | Alta | Golden master de 12 casos | Cualquier diferencia en la salida completa del cálculo, el prorrateo y la rectificación. |
| Riesgos R1 y R4 | Parcial | Simulación y fuente | Doble reserva de número y ausencia de guarda de mes facturado. |

### 4.2 Qué NO está congelado

| Área | Estado | Consecuencia |
|---|---|---|
| **Rutas HTTP** (`routes/facturas.js`, `clientes.js`, `articulos.js`, `contratos.js`, `informes.js`) | **No ejecutadas.** Solo se congela por fuente cuando es posible. | No hay prueba real del alta, el cobro, la rectificación, el listado, el CSV ni el informe de IVA. Un cambio en una ruta puede pasar inadvertido. |
| **Remesa end-to-end** (`scripts/remesa_mensual.js`) | **No ejecutada.** Solo se congela la fórmula de prorrateo como modelo. | No se prueba la selección de contratos, la escritura real, el código de salida, la idempotencia ni el orden de numeración. |
| Servidor y tablero (`server.js`) | No arrancado. | Las consultas del panel y el manejo de errores no tienen prueba. |
| Base de datos (`db.js`, esquema y siembra) | No abierta con SQLite. | El esquema, la siembra, los `INSERT` y las consultas no tienen test de integración. |
| Vistas EJS y navegador (`views/*.ejs`, `public/js/factura.js`) | No renderizadas. | No se prueba el autorrelleno de precio e IVA ni la presentación. |
| Correo (`services/email.js`) | Fuera de alcance. | Es un stub desactivado; no hay envío real que probar. |
| Copias, restauración y despliegue | Proceso manual externo. | No hay código que probar; la garantía es el procedimiento de la spec 009. |
| Dependencias y configuración | No probadas. | El lock, `config.js` y las rutas relativas quedan como deuda técnica. |

**«Congelado por fuente»** significa que el test lee el fichero y comprueba que una expresión
concreta sigue escrita igual. Detecta que alguien borre o reescriba esa línea, pero no detecta
un cambio de comportamiento provocado por otra parte del código. Es una protección débil y así
se declara.

### 4.3 Primera tarea de la siguiente fase

> **Las rutas HTTP y la remesa end-to-end son la primera tarea de la siguiente fase.** Hoy no
> están cubiertas por ningún test de comportamiento. Cualquier modernización que empiece por
> ellas se hará sin red.

El orden propuesto, sin dependencias nuevas y sobre copias desechables:

1. **Arnés HTTP sin dependencias externas:** arrancar la aplicación sobre una copia desechable
   del repositorio, con una base temporal en `datos/`, y probar alta, cobro, rectificación,
   listados, CSV e informe de IVA con `node:http` y aserciones nativas.
2. **Remesa end-to-end:** copia desechable del repositorio, contratos fijos, un mes conocido y
   comparación de las facturas generadas; después, doble lanzamiento para demostrar la
   duplicación (R4) y el orden de numeración (A-07).
3. **CSV e informe de IVA** contra datos sembrados, incluido el caso de factura descuadrada.
4. **Tablero y esquema** de la base, con prueba de errores de base de datos (R22).
5. **Concurrencia real de numeración** con dos conexiones SQLite (R1).

Antes de escribir esos tests hay que resolver una cuestión de gobierno: la constitución prohíbe
dependencias nuevas, así que el arnés debe construirse con el runner nativo y los módulos
estándar, o el negocio debe aprobar una excepción por escrito. También debe decidirse si la
base temporal se crea por copia del esquema o por ejecución de `db.js` con una ruta alternativa.

### 4.4 Reglas de uso de la red

1. `npm test` antes y después de cualquier cambio. Si falla, primero se investiga si es una
   regresión; no se ajusta el test para que pase.
2. El golden master solo se regenera con una decisión de negocio documentada, con responsable y
   fecha, y el `diff` debe explicarse entero.
3. Los tests no tocan la base real, no acceden a la red y no lanzan la remesa.
4. Un test nuevo que congele un comportamiento no documentado se registra como anomalía o como
   rareza, no se presenta como decisión.
5. La red no sustituye a la revisión humana de un cambio de importes: es una alarma, no una
   autorización.

---

**Cierre.** El paquete permite entender el sistema, reproducir su comportamiento y detectar
cambios sin haber modificado una sola línea de la aplicación. No permite aún afirmar que una
modificación en las pantallas o en la remesa sea segura: esa es la deuda declarada y la primera
tarea de la siguiente fase.
