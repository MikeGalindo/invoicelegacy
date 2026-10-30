# Registro de riesgos y deuda técnica — GesFact 2.4

**Fecha:** 2026-10-28
**Alcance:** deuda técnica y riesgos **visibles** en el código y la configuración actuales, sin
proponer ni aplicar ninguna corrección. Complementa a `specs/000-reconocimiento/mapa-sistema.md`
(zonas oscuras 8–30) y a `specs/000-reconocimiento/flujo-factura.md` (hallazgos H1–H8), que este
registro reordena y clasifica por riesgo de negocio.
**Método:** lectura de `config.js`, `server.js`, `routes/facturas.js`, `routes/clientes.js`,
`routes/articulos.js`, `routes/informes.js`, `routes/contratos.js`, `scripts/remesa_mensual.js`,
`lib/numeracion.js`, `lib/util.js`, `services/calculo.js`, `services/email.js`, `db.js`,
`package.json`, `package-lock.json`, `LEEME.txt` y `datos/migracion_mysql_2018.sql`; búsquedas de
secretos (`pass|clave|secret|password|contrase|token|api key`) y de deudas reconocidas
(`TODO|FIXME|apañ...`); `npm audit --json` y `npm ls` (solo lectura, ejecutados el 2026-10-28);
`git ls-files` y `git check-ignore` para determinar qué queda versionado.
**Convención de evidencia:** `fichero:líneas`; lo no verificado se marca `SUPOSICIÓN`.

> Registro puro: no se corrige nada (constitución `.specify/memory/constitution.md`, Principios I
> y III). Cada fila lleva su evidencia y una estimación de impacto y de probabilidad para que el
> negocio priorice en la fase siguiente. Los IDs `R1…` son de este documento.

**Ordenación:** impacto × probabilidad (ALTO×MEDIA → … → BAJO×BAJA). Escala de probabilidad:
**alta** = ya materializado o se da en cada uso; **media** = se dará ante una condición plausible
(dos grabaciones a la vez, doble lanzamiento, reinstalación, cambio de hora, dato mal tecleado);
**baja** = requiere una condición poco frecuente o manipulación deliberada.

| ID | Categoría | Descripción | Evidencia | Impacto de negocio | Prob. |
|---|---|---|---|---|---|
| R1 | carrera · discrepancia | Numeración no atómica (leer último → +1 → actualizar) y sin `UNIQUE` sobre `facturas.numero`: dos altas simultáneas (o una alta web + la remesa) pueden repetir número. El comentario la da por resuelta («no ha vuelto a pasar (creo)»), pero el código no tiene transacción, bloqueo ni restricción. | `lib/numeracion.js:8-10,14-36` (lectura `:16`, `UPDATE :32` sin transacción); sin `UNIQUE` en `db.js:50-63`; consumo desde `routes/facturas.js:71` y `scripts/remesa_mensual.js:57` | Un número duplicado invalida la serie ante la gestoría y Hacienda (obligación de correlatividad). | media |
| R2 | secretos | Credenciales en texto plano, versionadas en git: la contraseña SMTP y la clave que autentica el CSV ante la gestoría están en `config.js`, que **no** está ignorado ni fuera del índice. | `config.js:32-33` (`usuario` y `clave: 'Hidalgo2019!'`), `config.js:37` (`CLAVE_EXPORT_GESTORIA`); `git ls-files` devuelve `config.js` y `git check-ignore` no lo excluye; fichero copiado a mano a la oficina según `config.js:2-3` | Una filtración expone el correo corporativo y permite suplantar/alterar el fichero que se entrega a la gestoría. | media |
| R3 | validación · seguridad | Sin autenticación ni protección CSRF y el servidor escucha en todas las interfaces: cualquier equipo con acceso a la red puede emitir, cobrar o rectificar facturas por `POST`. | `server.js:14-18` (solo `body-parser` y estáticos; sin sesión/auth/csrf) y `server.js:49` (`app.listen(puerto)` sin host); sin coincidencias de `auth|session|csrf` en el código (zona oscura 22 del mapa) | Cualquier usuario de la red interna (o un visitante con wifi) puede alterar la facturación real. | media |
| R4 | transacción | La remesa no es idempotente ni transaccional: no comprueba si el mes ya se facturó y cada factura inserta cabecera y línea por separado; relanzar el mes duplica facturas y consume numeración. | `scripts/remesa_mensual.js:23-77` (sin consulta previa de «mes ya facturado»; `INSERT facturas :61-62` y `INSERT lineas :67-68` sin `BEGIN/COMMIT`); comentario que solo dice «el mes que acaba de terminar» (`:5-6`) sin guarda | Un doble lanzamiento emite decenas de facturas duplicadas y deja huecos en la serie. | media |
| R5 | otro (operación) | Copias de seguridad manuales y no verificadas: la única protección de la BD es copiarla a un pendrive los viernes, sin automatización ni comprobación de restauración. | `LEEME.txt:18` («Marga copia datos/gesfact.db a un pendrive los viernes»); sin script de backup en el repo | La pérdida del fichero `gesfact.db` supone perder toda la facturación desde la última copia del viernes. | media |
| R6 | dependencias | `package-lock.json` está desincronizado de `node_modules`: fija versiones vulnerables (body-parser 1.20.5, express 4.22.2) mientras lo instalado es más nuevo (1.20.9, 4.22.3). `npm audit` lee el lock y reporta 4 vulnerabilidades (1 crítica); una reinstalación desde el lock las reintroduce. | `package-lock.json:50` (body-parser 1.20.5) y `:274` (express 4.22.2); `npm audit` 2026-10-28: proxy-addr **crítica** (spoofing de IP, GHSA-jqcg-44mw-7w3h), body-parser alta (DoS, GHSA-27r3-jxmh-p828), brace-expansion alta (DoS) y qs moderada; `npm ls`: instalados body-parser@1.20.9, express@4.22.3, proxy-addr@2.0.8, qs@6.16.2; instalación forzada con `--no-package-lock` (`mapa-sistema.md:407-410`) | Una instalación nueva con el lock puede quedar expuesta a spoofing de IP y denegación de servicio, y el aviso de seguridad es engañoso. | media |
| R7 | fechas | Dos prorrateos distintos para el mismo mes de baja: la remesa divide por los **días reales** del mes y la pantalla de contratos por un **mes comercial de 30 días**; el importe del último mes no es único. | `scripts/remesa_mensual.js:47-51` (días reales, `util.diasDelMes`) frente a `services/calculo.js:95-102` (mes de 30 días), usado en `routes/contratos.js:39`; ejemplo numérico en `mapa-sistema.md:473-477` | La cuota del mes de baja puede discrepar céntimos entre lo que ve administración y lo que cuadra la gestoría. | media |
| R8 | validación | Importes y fecha sin validar en el alta manual: `parseFloat` de campos vacíos da `NaN` y la fecha se acepta tal cual; una fecha inválida produce vencimiento `NaN-NaN-NaN` y una factura grabada con datos basura. | `routes/facturas.js:59-60` (parseFloat sin comprobar `NaN`) y `:44,69` (fecha libre → `util.sumarDias`); repro 2026-10-28: `util.sumarDias('basura',30) → 'NaN-NaN-NaN'`; flujo hasta el `INSERT` en `routes/facturas.js:74-87` | Una factura con importes o fechas inválidos se graba y contamina la serie y el cuadre con la gestoría. | media |
| R9 | validación | `validarNIF` solo comprueba la longitud (9), no la letra; la validación «fuerte» se delega a revisión humana de Marga. | `lib/util.js:42-48` (solo `nif.length === 9`) y su `TODO` en `:42-43`; comentario de delegación en `routes/clientes.js:16`; uso en `routes/clientes.js:18-20` | Un NIF mal tecleado pero de 9 dígitos se graba y llega a facturas y al CSV de la gestoría. | media |
| R10 | transacción | Alta manual sin transacción: se inserta primero la cabecera y después cada línea; si una línea falla, responde 500 pero la cabecera ya está grabada (factura emitida sin líneas). | `routes/facturas.js:74-76` (cabecera) y `:85-92` (líneas, error → 500 tras grabar cabecera); sin `BEGIN/COMMIT` en todo el flujo (grep sin resultados); comentario que lo reconoce en `:81-82` | Una factura «emitida» con totales pero sin líneas rompe el detalle y el cuadre línea a línea de la gestoría. | baja |
| R11 | transacción | Rectificación sin transacción y con errores ignorados: el `INSERT` de las líneas invertidas no revisa el error y la original se marca `rectificada` aunque alguna línea no se haya grabado; si el proceso muere a medias quedan dos documentos vivos. | `routes/facturas.js:141-150` (INSERT de la `RE` y de líneas), callback sin parámetro de error en `:151`, `UPDATE` de la original en `:154`; hallazgo H8 de `flujo-factura.md` | Un abono espejo incompleto o una original sin marcar produce un doble documento contable para la misma rectificación. | baja |
| R12 | discrepancia | La siembra de «datos de referencia» se carga automáticamente en cualquier base vacía (incluidos contadores `FA-2026=108`, `RE-2026=1`), pese a que el comentario dice «no tocar, administración los usa de referencia». | Condición de carga `db.js:83-87`; comentario `db.js:91-92`; facturas y contadores de ejemplo `db.js:123-177`; zona oscura 19 del mapa | Un arranque con la BD borrada o descolocada pone datos y numeración falsos como si fueran reales. | baja |
| R13 | dependencias (muertas) | Envío de correo muerto y configuración SMTP huérfana: `nodemailer` se desinstaló «por un aviso de seguridad» y la ruta sigue llamando a un stub que solo escribe un aviso; el envío real es manual desde Outlook. | `services/email.js:3-8` (desinstalado 2023) y `:11-29` (stub); `config.js:29-34` (SMTP sin consumidor real); llamada `routes/facturas.js:93` | Toda factura se envía a mano (trabajo diario y riesgo de olvido), con credenciales de correo muertas aún en el código. | alta |
| R14 | fechas | `sumarDias` opera con milisegundos: los cambios de hora pueden desplazar un vencimiento un día (incidente de marzo de 2019 documentado y no reproducido). | `lib/util.js:20-26` (`getTime()` + días·86400000) y su `TODO` en `:18-19`; usado en `routes/facturas.js:69` y `scripts/remesa_mensual.js:60` | Un vencimiento desviado un día altera plazos de cobro y puede reclamarse de más o de menos. | baja |
| R15 | fechas | El año del número de factura es el año de **ejecución**, no el de la fecha de la factura: la remesa de diciembre lanzada el 1 de enero numeraría con el año nuevo una factura fechada en el anterior. | `lib/numeracion.js:15` (`new Date().getFullYear()`) frente a `scripts/remesa_mensual.js:59` (fecha = último día del mes facturado) y `routes/facturas.js:44` (fecha editable); hallazgo H2 de `flujo-factura.md` | La serie «por año» y el ejercicio contable quedan desalineados, complicando la declaración. | baja |
| R16 | discrepancia | El descuento por volumen se aplica en la remesa igual que en el alta manual, pero sin la nota de observaciones que sí añade el camino web: una cuota > 1000 € se grabaría rebajada sin rastro visible. | `services/calculo.js:39-43,60-71` (descuento dentro de `calcularFactura`, invocado desde `scripts/remesa_mensual.js:55`) frente a `scripts/remesa_mensual.js:62` (observaciones fijas) y `routes/facturas.js:76` (sí anota); hallazgo H1 de `flujo-factura.md` | Una cuota alta se facturaría de menos sin que nadie lo vea al revisar la factura. | baja |
| R17 | discrepancia | Documentación operativa desfasada respecto al código: `LEEME.txt` manda instalar Node 8 y data de 2019, mientras el sistema corre en Node 24 y el correo ya está roto. | `LEEME.txt:4-9` (Node 8) y `:20` (11/03/2019) frente a `mapa-sistema.md:397-410` (Node 24.19.0, npm 11.17.0); pendientes sin actualizar en `LEEME.txt:11-16` | Quien instale o restaure siguiendo el `LEEME` puede dejarlo inoperativo o con una versión incompatible. | baja |
| R18 | otro (configuración) | Rutas relativas al directorio de trabajo: `RUTA_BD` es `./datos/gesfact.db` y los estáticos son `public/`; arrancar desde otra carpeta abre (o crea) otra base y no sirve los estáticos. | `config.js:20` (ruta relativa) y `server.js:18` (`express.static('public')`); zona oscura 24 del mapa | Un arranque desde el directorio equivocado factura contra una base vacía/equivocada sin aviso. | baja |
| R19 | carrera · orden | La consulta de contratos de la remesa no lleva `ORDER BY`: la numeración se asigna en el orden de devolución de SQLite, no en un orden de negocio explícito. | `scripts/remesa_mensual.js:26-29` (SELECT sin `ORDER BY`); hallazgo H7 de `flujo-factura.md` | El orden correlativo de números dentro de la remesa no es predecible ni reproducible. | media |
| R20 | otro (deuda) | Sin tests ni integración continua: el único script es `start` y no hay suite; cualquier cambio se valida a mano sobre datos reales. | `package.json:6-8` (solo `start`); sin ficheros de test ni CI; zona oscura 26 del mapa | Cualquier regresión pasa inadvertida hasta que aparece en una factura real. | media |
| R21 | validación | Trimestre sin validar en el informe de IVA: `meses[t][0]` indexa un mapa con un `t` no comprobado; `?trimestre=5` lanza una excepción. | `routes/informes.js:15-19` (parseInt de `trimestre` y acceso `meses[t]` sin guarda); zona oscura 20 del mapa | La pantalla de informe cae con una URL manipulada o un enlace roto. | baja |
| R22 | otro (deuda) | El tablero ignora los errores de BD y pinta ceros (`f ? f.n : 0`): una avería de la base puede parecer un mes sin actividad. | `server.js:20-35` (callbacks sin manejo de error, con `|| 0`); zona oscura 21 del mapa | Una caída de la BD se disfraza de inactividad y retrasa la detección del problema. | baja |
| R23 | otro (deuda) | Esquema sin claves foráneas ni índices secundarios: son posibles líneas huérfanas y consultas lentas al crecer los ejercicios. | `db.js:19-81` (tablas sin `FOREIGN KEY` ni `CREATE INDEX`); zona oscura 30 del mapa | Datos huérfanos pasan inadvertidos y el rendimiento se degrada con el histórico. | baja |
| R24 | dependencias (muertas) | Fichero de migración a MySQL huérfano y desfasado (falta recargo y rectificativas), conservado «por si acaso». | `datos/migracion_mysql_2018.sql:1-3`; referencia en `LEEME.txt:12-13`; zona oscura 4 del mapa | Riesgo de que alguien lo ejecute por error pensando que es el esquema vigente. | baja |
| R25 | proceso manual | El negocio acepta que una factura quede incompleta con aviso, pero no hay proceso definido para completarla: no se sabe quién atiende el aviso ni cómo se reconstruyen las líneas que faltan. | **NEGOCIO** — `acta-entrevista-negocio.md`, D-06/N-06, Julián y Marga, 2026-10-30; `registro-anomalias.md` A-17 | Una factura puede quedar con cabecera y líneas parciales, y el aviso puede perderse; el cliente recibe un total que no cuadra con el detalle. | media |
| R26 | otro (operación) | No existe procedimiento escrito y probado para arrancar el sistema y restaurar una copia sin Julián; el conocimiento está repartido entre Julián, Marga y Manoli. | **NEGOCIO** — `acta-entrevista-negocio.md`, D-25/N-25, Marga y Manoli, 2026-10-30; `registro-anomalias.md` A-18 | Una ausencia de Julián puede impedir arrancar o restaurar el sistema, con pérdida de facturación o retraso grave. | media |
| R27 | otro (operación) | La copia de la base de datos es semanal, pero el negocio exige copia diaria; la decisión no está implantada ni se ha definido prueba de restauración. | **NEGOCIO** — `acta-entrevista-negocio.md`, D-08/N-08, Marga y Julián, 2026-10-30; actualiza R5 | Hasta que se implante, sigue vigente la exposición de R5: perder hasta 6 días de facturación. | media |
| R28 | carrera · numeración | La reutilización del número reservado cuando falla la grabación (D-12) exige que la factura fallida no haya dejado rastro; si la cabecera o una línea se grabaron parcialmente, reutilizar el número puede producir un duplicado. | **NEGOCIO** — `acta-entrevista-negocio.md`, D-12/N-12, Puri y Julián, 2026-10-30; `registro-anomalias.md` A-03 | Un número reutilizado sobre una factura parcialmente existente duplica la serie y complica la rectificación. | baja |

## Actualizaciones por el acta de entrevista (2026-10-30)

Se anotan aquí los cambios de política sin sobrescribir las filas originales. El detalle y el
historial de clasificación están en `registro-anomalias.md`.

- **R4** — D-05/N-05 (Marga y Julián, 2026-10-30) decide impedir la segunda emisión de la remesa de
  un mes ya facturado. La parte de idempotencia queda resuelta por negocio; la falta de transacción
  sigue siendo técnica y no se implanta en esta fase.
- **R5** — D-08/N-08 (Marga y Julián, 2026-10-30) exige copia diaria. Se añade R27 para la brecha
  entre la decisión y la copia semanal actual.
- **R7** — D-03/N-03 (Paco y Puri, 2026-10-30) decide prorrateo por días reales.
- **R8** — D-21/N-21 (Julián y Marga, 2026-10-30) y D-24/N-24 (Marga, 2026-10-30) deciden rechazar
  fechas inválidas y formatos numéricos no válidos.
- **R9** — D-10/N-10 (Marga, 2026-10-30) decide que el sistema valide la letra del NIF.
- **R10 y R11** — D-06/N-06 (Julián y Marga, 2026-10-30) fija el criterio general de factura
  incompleta con aviso; no resuelve por sí solo el estado de la original en una rectificación
  (H8/A-08). Se añade R25 para el proceso manual de completado.
- **R13** — D-18/N-18 (Manoli, 2026-10-30) decide mantener el envío manual; el código muerto y la
  configuración SMTP siguen como deuda.
- **R15** — D-11/N-11 (Puri y Julián, 2026-10-30) decide que el año del número sea el de la fecha de
  la factura.
- **R16** — D-02/N-02 (Paco, 2026-10-30) y D-15/N-15 (Puri, 2026-10-30) deciden aplicar el descuento
  a cuotas de contrato y anotarlo en la factura.
- **R19** — H7 sigue pendiente: no se ha decidido el orden de numeración de la remesa. Se mantiene
  en la agenda (`registro-anomalias.md` A-07).

## Discrepancias comentario ↔ código (resumen)

Las discrepancias detectadas entre lo que prometen los comentarios y lo que hace el código quedan
registradas en las filas correspondientes de la tabla, para no duplicarlas:

- **R1** — `lib/numeracion.js:8-10` da por resuelto el duplicado («no ha vuelto a pasar
  (creo)»), pero el código sigue sin transacción y sin `UNIQUE`.
- **R4** — `scripts/remesa_mensual.js:5-6` dice «normalmente el que acaba de terminar», pero el
  código acepta cualquier `YYYY-MM` y no impide refacturar el mismo mes.
- **R12** — `db.js:91-92` dice «no tocar, administración los usa de referencia», pero `db.js:83-87`
  carga esos datos en cualquier base vacía como si fueran reales.
- **R13** — `services/email.js:3-6` documenta el envío «a mano desde Outlook», pero
  `routes/facturas.js:93` sigue invocando el módulo (stub) como si enviara.
- **R16** — el cálculo de descuento se aplica en dos caminos con resultados visibles distintos
  (solo el manual lo anota), sin que ningún comentario lo advierta.
- **R17** — `LEEME.txt` (Node 8, 2019) discrepa del runtime real (Node 24).
