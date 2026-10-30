# Memoria histórica — cronología de los comentarios del sistema GesFact 2.4

**Fecha:** 2026-10-28
**Alcance:** todo comentario embebido en el código del repositorio (`.js`, `.ejs`, `.css`, `.sql`),
más las notas de `LEEME.txt`. No se recorre `node_modules` ni `package-lock.json`. El objetivo es
reconstruir la cronología de eventos y decisiones del sistema: incidentes, decisiones de negocio
atribuidas a personas, advertencias del tipo «no tocar» con su motivo, y trabajos abandonados.
**Método:** lectura completa de los 28 ficheros con contenido comentado o anotado
(`server.js`, `config.js`, `db.js`, `lib/util.js`, `lib/numeracion.js`, `services/calculo.js`,
`services/email.js`, `routes/*.js`, `scripts/remesa_mensual.js`, `public/js/factura.js`,
`public/css/estilos.css`, `views/*.ejs`, `LEEME.txt`, `datos/migracion_mysql_2018.sql`); búsquedas
sistemáticas de marcadores (`OJO`, `AVISO`, `TODO`, `no tocar`, `NO `, `FUERA DE SERVICIO`,
`DEJO DE FUNCIONAR`, `pendiente`, `roto`) y de nombres propios y años
(`Julián|Julian`, `Paco`, `Marga`, `Puri`, `Roberto`, `Manoli`, `Arsys`, `gestoría`, `20xx`) sobre
todo el repositorio. Las vistas `.ejs` no contienen comentarios de código (verificado buscando
`<%#`, `//` y `<!--`): sí llevan cinco notas en texto de valor histórico, incluidas
(`views/index.ejs:9-10`, `views/pie.ejs:2`, `views/contratos.ejs:17`, `views/informe_iva.ejs:16`,
`views/factura_nueva.ejs:26`).
**Convención de evidencia:** `fichero:línea(s)`, citando el texto del comentario. Las afirmaciones
no verificadas se marcan como `SUPOSICIÓN` y se convierten en pregunta al negocio.

> Documento de reconocimiento. Los hechos se **registran**, no se corrigen ni se juzgan
> (constitución `.specify/memory/constitution.md`, Principios I y III; AGENTS.md «Los hallazgos se
> registran, no se corrigen»). Las fechas que constan en los comentarios son fechas **testificadas
> por quien escribió el comentario**, no verificadas contra la BD de producción (que no está en
> este repo, según `AGENTS.md`). IDs `MH…` son de este documento y no duplican los ya asignados en
> `registro-riesgos.md` (R…) ni en `flujo-factura.md` (H…): donde corresponde se cruzan.

## Cómo leer la cronología

- **Tipo:** `INCIDENTE` (algo salió mal), `DECISIÓN` (norma de negocio adoptada), `AVISO`
  («no tocar» y por qué), `ABANDONO` (trabajo empezado y dejado), `PRÁCTICA` (modo de operar
  corriente consignado en un comentario), `EVENTO` (hito externo: inspección, versiones).
- Las secciones van en orden cronológico; la última agrupa lo **sin fecha**.
- Los implicados aparecen como los nombra el comentario. Perfil deducido en el anexo A.

## 1. Época anterior: GesFact 1.x en Access (antes de 2017, sin fecha exacta)

| ID | Fecha | Tipo | Qué pasó / qué se decidió | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH01 | ≤2017 | PRÁCTICA→DECISIÓN | El prorrateo de cuotas de contrato se hacía «a lo comercial» (mes de 30 días, `(cuota/30)×días`) **a mano por Paco en el Access**; GesFact lo heredó igual «y así lo espera la gestoría». | Paco (hace el cálculo), Julián (lo transcribe), gestoría (lo espera) | `services/calculo.js:90-93` («Asi lo hacia Paco a mano en el Access y asi lo espera la gestoria»); regla vigente en `:95-102` | ¿Sigue vivo Paco para confirmar la regla original? ¿Qué pasa con el día 31 en meses de 31 (el comentario `:99` lo excluye: «el dia 31 no se cobra»): fue decisión suya o convención de Julián? **Ojo: la remesa de Roberto prorratea por días reales, no a lo comercial** (`scripts/remesa_mensual.js:43-44` vs `services/calculo.js:95-102`, riesgo R7) — ¿cuál de las dos es la regla de Paco? |
| MH02 | ≤2017 | AVISO | GesFact 1.x era una aplicación **Access**; funciones de `util.js` «vienen del gesfact 1.x en Access, cuidado al tocar». | Julián (autor del aviso) | `lib/util.js:2`; existencia del 1.x también en `server.js:7` | ¿Qué funciones concretas vienen del Access y qué comportamiento heredado no está ya documentado en ninguna parte? ¿Vive aún la base Access (hace falta para «reabrir ejercicios viejos», véase MH03)? |
| MH03 | ≤2017 | AVISO | Tipos de IVA antiguos (16/18 general, 7/8 reducido) y su recargo se conservan en el código «no borrar por si hay que reabrir ejercicios viejos del Access». | Julián | `services/calculo.js:16-17` | ¿Hay ejercicios anteriores a 2018 que pudieran reabrirse (rectificativas tardías, inspecciones)? ¿Dónde está el histórico de esos años: en el Access, en papeles, en la gestoría? |

## 2. 2017 — nace GesFact 2.x en Node

| ID | Fecha | Tipo | Qué pasó / qué se decidió | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH04 | 2017 | EVENTO | **v2.0: reescritura del gesfact 1.x (Access) en Node.** La hoja de estilos es de «Julian 2017». | Julián | `server.js:7`; `public/css/estilos.css:1` | ¿Qué motiva la reescritura: cierre definitivo del Access, o relevo de quien lo mantenía (jubilación, enfermedad…)? `SUPOSICIÓN`: el comentario solo consta el hecho, no el motivo. |
| MH05 | 11/2017 | DECISIÓN + AVISO (TODO) | `validarNIF` se dejó **comprobando solo la longitud (9 caracteres), no la letra**: «falta comprobar la letra, de momento con la longitud vale porque los da de alta Marga y los mira ella». La validación «fuerte» se delega en una persona. | Julián (decide), Marga (control humano) | `lib/util.js:41-43` (`TODO Julian 11/2017`); refrendo en `routes/clientes.js:16` («la validacion "fuerte" la hace Marga mirandolo :)»); riesgo R9 | ¿Confirma Marga que revisa ella todos los NIF al dar de alta? ¿Ha llegado algún NIF con letra errónea a facturas reales o al CSV de la gestoría (consecuencia legal)? ¿Se acepta formalmente este reparto de responsabilidad humana como control del sistema? |

## 3. 2018 — sqlite, descuentos con Paco y primeras normas de Puri

| ID | Fecha | Tipo | Qué pasó / qué se decidió | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH06 | 03/2018 | INCIDENTE + DECISIÓN | **Los ficheros `.json` de datos se corrompían «cuando Marga y yo grabamos a la vez»**: paso a SQLite (v2.2). Es el primer incidente de concurrencia registrado; el segundo fue en la numeración, el 02/01/2021 (MH16). | Julián (testigo), Marga (implicada) | `db.js:2-4` («Julian 03/2018: pasamos de ficheros .json a sqlite porque se corrompian los datos cuando Marga y yo grabamos a la vez»); `server.js:6`; `config.js:19` («desde 2018 usamos sqlite»); formato de fechas «la bd guarda asi desde 2018» en `lib/util.js:9` | ¿Cuánto se perdió en las corrupciones y cómo se reconstituyó? ¿Se intentó recuperar los `.json` o hay copia? La lección («dos usuarios a la vez rompen el sistema») explica los dos incidentes de concurrencia: ¿está asumida la regla operativa de no trabajar los dos a la vez? |
| MH07 | 2018 | DECISIÓN | **Descuento por volumen: >1.000 € → 2 %, >5.000 € → 5 %** «acordado con Paco en 2018 para fidelizar hostelería». La pantalla de alta recuerda al operario que la regla es automática: «los descuentos por volumen se aplican solos». | Paco (acuerdo), Julián (implementa) | `services/calculo.js:36-38` (`porcentajeDescuento` en `:39-43`); efecto visible en siembra `db.js:149` (FA-2026-000105 «Descuento volumen 2% aplicado»); nota en pantalla `views/factura_nueva.ejs:26` | ¿Ratifica el negocio hoy los umbrales y porcentajes (la pauta es de 2018, antes de la subida de precios)? ¿Quién puede autorizar cambiarlos? ¿Quién es Paco exactamente (comercial, socio…)? |
| MH08 | 2018 | DECISIÓN | El descuento se aplica **línea a línea**, no sobre el total, «para que la gestoria lo vea desglosado igual (peticion de Puri, 2018)». | Puri (gestoría) | `services/calculo.js:63-64` (implementado en `:65-84`) | ¿Sigue Puri en la gestoría y sigue necesitando el descuento desglosado por línea? |
| MH09 | 10/2018 | ABANDONO | Se preparó **la migración de la BD a MySQL del «servidor nuevo»**: volcado de prueba hecho por Julián en octubre de 2018 que «NUNCA SE LLEGO A EJECUTAR EN PRODUCCION», esquema ya desfasado (faltan recargo y rectificativas), «se guarda por si acaso». En el LEEME quedó como pendiente «SIN PRISA, sqlite va bien». | Julián (volcado); «servidor nuevo» (destino) | `datos/migracion_mysql_2018.sql:1-3`; `LEEME.txt:12-13`; `config.js:19` («la migracion a MySQL quedo pendiente»); `db.js:4`; riesgo R24 | ¿Qué era «el servidor nuevo» (proyecto de infraestructura de 2018)? ¿Se abortó la migración o quedó aplazada sine die? ¿El fichero SQL se conserva deliberadamente o puede eliminarse algún día (hoy: registrar, no borrar)? |
| MH10 | sin fecha (consta junto a una siembra de caso de 2026-02-20) | DECISIÓN | **La base de 1.000 € justos NO lleva descuento** (umbral estricto `>`), «caso comentado con la gestoria». El límite se decidió con Puri, no por código. | Puri (gestoría), Julián (consigna) | `db.js:138` («OJO caso comentado con la gestoria: base 1000 justa NO lleva descuento») con el ejemplo FA-2026-000103 (`db.js:139-143`) y el `>` de `services/calculo.js:39-42` | ¿Consta por escrito (correo, acta) esa conformidad de la gestoría? Es una regla material para el IVA repercutido: conviene blindar la interpretación compartida. |

## 4. 2019 — v2.3, el trimestre devuelto y la fecha que faltaba

| ID | Fecha | Tipo | Qué pasó / qué se decidió | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH11 | 2019 | EVENTO + DECISIÓN | **v2.3: informes de IVA y export para la gestoría.** El CSV «formato acordado con Puri en 2019: punto y coma, decimales con coma, y la clave en la primera linea»; la clave `SH-CONTA-7731» va con aviso «no cambiar». El informe trimestral alimenta el modelo 303, «lo termina la gestoria». | Puri (formato), Julián (implementa), gestoría (303) | `server.js:5`; `routes/informes.js:32-33` (y `:13`, `:40-41`); `config.js:36-37` | ¿Sigue Puri recibiendo el CSV? ¿La clave sigue siendo la vigente del convenio con la gestoría (R2: está en claro y versionada)? ¿Quién valida cada trimestre que el CSV entregado cuadra antes de enviarlo? |
| MH12 | 03/2019 | INCIDENTE | **El vencimiento de una factura salió un día menos**; «creo que fue por el cambio de hora, no he conseguido reproducirlo». Quedó como TODO abierto en `sumarDias`, que suma milisegundos. | Julián | `lib/util.js:17-19` (código sospechoso en `:20-26`); riesgos R14 | ¿Qué factura era (número, cliente)? ¿Se corrigió el vencimiento a mano en la BD? Si no se reproduce: ¿se acepta el riesgo o se pide a la gestoría que revise vencimientos de marzo de esos años? |
| MH13 | mayo 2019 | INCIDENTE + DECISIÓN + AVISO | **Julián cambió el redondeo** (sobre la base total en vez de por línea) y **Puri (gestoría) devolvió todo el trimestre**. Decisión: «NO CAMBIAR LA FORMA DE REDONDEAR», el Contaplus de la gestoría cuadra línea a línea, «se queda como esta». Es el aviso de negocio más fuerte del repo. | Julián (cambio y revés), Puri (devolución), Contaplus (herramienta) | `services/calculo.js:1-7` («AVISO (Julian, mayo 2019)…»; redondeo por línea vigente en `:25-34`) | ¿Cuánto costó la devolución (reemitir un trimestre completo)? ¿Consta así en algún sitio más que en el comentario? ¿Usa hoy la gestoría Contaplus (o el software ha cambiado: la norma «línea a línea» podría haber caducado — no cambiarla, pero preguntar)? |
| MH14 | 11/03/2019 «aprox» según el pie, pero con ediciones posteriores a 2022 por el contenido | PRÁCTICA + ABANDONO | `LEEME.txt` consigna la instalación «de toda la vida»: **Node 8**, copiar la carpeta desde `\\SERVIDOR\compartido\gesfact`, `npm install`, acceso directo en el escritorio; y tres pendientes nunca cerrados (MySQL, email, albaranes). **Contradicción interna registrada:** el pie dice «ultima actualizacion: 11/03/2019 (aprox)», pero el cuerpo cita «lo de Arsys 2022» (`:14`) y «albaranes en 2021» (`:15-16`) — el fichero se editó después de 2022 sin actualizar el pie, o el pie nunca fue fiable. Hoy el sistema corre con Node 24 (`AGENTS.md`). | Julián | `LEEME.txt:4-6,11-16,20`; pie vs cuerpo en `:14-16` frente a `:20`; desactualización verificada en `AGENTS.md` («LEEME.txt está desactualizado (habla de Node 8)»); riesgo R17 | ¿Quién mantiene hoy las instrucciones de instalación/operación de facto, y desde cuándo? ¿El «acceso directo en el escritorio» y la carpeta `\\SERVIDOR\compartido\gesfact` siguen siendo el método de despliegue real? ¿Fue Julián quien tocó el LEEME después de 2022 (para anotarlo)? |

## 5. 2020 — la inspección y la regla de no borrar facturas

| ID | Fecha | Tipo | Qué pasó / qué se decidió | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH15 | 2020 | EVENTO + DECISIÓN (legal) | **Una inspección (2020) fijó la regla legal del sistema**: numeración correlativa y sin huecos por serie y año, y «desde la inspeccion de 2020 las facturas NO SE BORRAN NUNCA: si hay un error se hace rectificativa en la serie RE y se emite una nueva». | Hacienda/inspección (implicada, no nombrada), Julián (relata) | `lib/numeracion.js:3-6`; materializado en el esquema (`db.js:50-63`: `serie`, `estado`, `rectifica_a`) y en `routes/facturas.js:124-133` | ¿Qué tipo de inspección fue (AEAT, territorial, requerimiento concreto) y qué se pidió exactamente? ¿Quién la atendió (gestoría, Manoli, Julián)? ¿Hay acta o respuesta que conservar como referencia? La serie `RE` y `rectifica_a`: ¿nacieron ahí o ya existían en 2.x? `SUPOSICIÓN`: el comentario las asocia, no lo demuestra. |

## 6. 2021 — número duplicado, temporada de Roberto (v2.4) y albaranes a medias

| ID | Fecha | Tipo | Qué pasó / qué se decidió | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH16 | 02/01/2021 | INCIDENTE | **Dos facturas con el mismo número** por grabar Marga y Julián a la vez. Julián «puso el ultimo+1 leyendo justo antes de grabar y no ha vuelto a pasar (creo)». El «creo» y el código actual (sin transacción ni `UNIQUE`) indican que quedó una mitigación débil, no una solución. | Julián (relata y «arregla»), Marga (implicada) | `lib/numeracion.js:8-10` (código de la mitigación en `:14-36`); sin `UNIQUE` en `db.js:50-63`; riesgo R1 | ¿Qué números fueron y cómo se resolvió ante la gestoría y Hacienda (encaja con la inspección de 2020)? ¿Puede la gestoría o Julián confirmar con la BD real de 2021 que no hay duplicados (verificable con una consulta de solo lectura sobre producción)? |
| MH17 | verano 2021 | EVENTO + DECISIÓN | **v2.4: Roberto («becario») añade la remesa mensual de contratos** («para no meter las cuotas a mano cada mes; se lanza el dia 1 desde el ordenador de Marga») y el autorrelleno de precio/IVA al elegir artículo («antes se copiaba a mano del listado de articulos»). Retoca además la hoja de estilos. | Roberto (autor), Marga (su PC lanza la remesa), Julián (firma v2.4) | `server.js:4`; `scripts/remesa_mensual.js:5-7` (y su uso recordado en pantalla: `views/index.ejs:9-10`); `public/js/factura.js:1-2`; `public/css/estilos.css:1` | ¿Dejó Roberto alguna nota o doc de sus trabajos? ¿Sabe Marga (u otra persona) qué hacer si la remesa falla a mitad (sin idempotencia: R4)? Nota para la fase de especificación: la remesa prorratea **por días reales** (`scripts/remesa_mensual.js:43-44,47-51`) mientras la regla «de Paco» es **mes de 30** (`services/calculo.js:95-102`) — discrepancia R7: ¿cuál manda? |
| MH18 | 2021 | ABANDONO | **Roberto empezó un módulo de albaranes, está «a medias en su ordenador»**, y el LEEME manda «preguntarle si vuelve en campaña». No hay rastro del código en el repo. | Roberto (autor), Julián (anota) | `LEEME.txt:15-16` | ¿Sigue Roberto disponible? ¿Conserva el código en su ordenador personal (fuera del control de la empresa)? ¿Se retomó alguna vez o los albaranes se hacen hoy de otra forma (¿a mano, en otro sitio)? |

## 7. 2022–2023 — el correo muere y se apaga

| ID | Fecha | Tipo | Qué pasó / qué se decidió | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH19 | 2022 | INCIDENTE + PRÁCTICA + AVISO | **Arsys cambió el servidor de correo y dejó de autenticar: el envío automático murió** («roto desde lo de Arsys 2022» en el LEEME; «DEJO DE FUNCIONAR en 2022» en config). Workaround desde entonces: **las facturas se envían A MANO desde el Outlook de Marga**, imprimiendo la vista de factura a PDF con el navegador. Aviso repetido en dos ficheros: «**hablar con Manoli** antes de tocar/reactivar esto». | Arsys (causa externa), Marga (asume el envío manual), Manoli (dueña del asunto, rol desconocido) | `services/email.js:3-6`; `config.js:27-28`; `LEEME.txt:14`; stub actual `services/email.js:11-29` (la ruta de alta sigue llamándolo: `routes/facturas.js:93`); riesgos R13 | ¿Quién es Manoli (gestoría, administración, IT externa) y qué sabe de la cuenta Arsys? ¿Sigue viva la cuenta `facturas@suministroshidalgo.es` (la contraseña `Hidalgo2019!` en `config.js:33` **sugiere** alta en 2019 — `SUPOSICIÓN`)? ¿Cuántas facturas/mes se envían a mano y qué pasa cuando se olvida alguna (hay registro de «pendiente de enviar» solo en consola: `services/email.js:26-27`)? |
| MH20 | 2023 | DECISIÓN | **Se desinstaló `nodemailer` «porque daba un aviso de seguridad»**: el código de envío quedó seccionado a mano (comentado en `services/email.js:12-25`) y el módulo reducido a un `console.log`. | Julián (autor del repo; `SUPOSICIÓN` sobre quién pulsó la tecla) | `services/email.js:8` («desinstalado en 2023, daba un aviso de seguridad»), bloque comentado `:12-25`; `config.js:29-34` (SMTP huérfano); riesgo R13 | ¿Quién decidió desinstalar y evaluó dejar el envío en stub en lugar de arreglar el SMTP? ¿Es postura del negocio «el correo se apaga y ya está» o es inercia? No se propone reactivar nada (AGENTS.md); solo fijar la decisión. |

## 8. 2026 — lo que registró la última siembra copiada del sistema real

Las facturas de ejemplo de `db.js` son «resumen, tal cual quedaron grabadas» cuando se hizo la copia
del sistema real (`db.js:91-92,122`); la BD de producción no está en el repo (`AGENTS.md`). Como
testimonio embebido en el código, registra un incidente reciente:

| ID | Fecha | Tipo | Qué pasó / qué se decidió | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH21 | abril–mayo 2026 | INCIDENTE | **FA-2026-000106 (Bar Nuevo Siglo, remesa de abril) salió con «ERROR cuota duplicada»**: se corrigió con el protocolo de siempre — `RE-2026-000001` (2026-05-06, espejo negativo) y nueva `FA-2026-000107` «Sustituye a FA-2026-000106». Coincide con el contrato de la máquina de café de ese cliente, de alta el 2026-02-15 (`db.js:119`): plausible primer trimestre de la cuota en remesa. `SUPOSICIÓN` la autoría y la causa (no constan en comentario). | administración (emite la rectificativa, sin nombre) | `db.js:156` (observaciones «Remesa abril. ERROR cuota duplicada, ver RE-2026-000001»), `db.js:160-162` (la `RE`), `db.js:164-166` (la sustituta), `db.js:119` (alta del contrato) | ¿Fue un doble lanzamiento de la remesa (riesgo R4: sin guarda de «mes ya facturado»)? ¿Cómo lo vio el cliente (Bar Nuevo Siglo)? ¿Se cobró la factura errónea antes de rectificar? Verificable contra la BD real. |
| MH22 | enero–mayo 2026 | PRÁCTICA (datos sembrados) | Las observaciones de la siembra documentan el modo operativo: remesas mensuales («Remesa enero/mayo»), «Pedido apertura temporada» (hotel), descuentos anotados a mano… Todo ello grabado por el sistema tal cual quedó (fechas de `db.js:126-171`). | administración | `db.js:122-176`; contrato de baja parcial 2025-09-15 (`db.js:118`) que implicó un prorrateo de último mes facturado a mano (práctica en `routes/contratos.js:28-30`) | Estos datos son la última foto real: ¿se corresponde el calendario de remesas (día 1) con lo que pasó de verdad en 2026? ¿El prorrateo de baja del Hotel Vega Baja (contrato 5, septiembre 2025) se emitió por pantalla (30 días) o por remesa (días reales)? Discrepancia R7 sobre un caso real. |

## 9. Sin fecha (advertencias y prácticas vivas)

| ID | Fecha | Tipo | Qué pasó / qué se decidió | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH23 | sin fecha | AVISO | `config.js` **NO RENOMBRAR** y se despliega **copiándolo a mano** al servidor de la oficina (`\\SERVIDOR\gesfact`, y en el LEEME `\\SERVIDOR\compartido\gesfact`): el despliegue no es automático y el nombre del fichero es una dependencia de facto. | Julián (consigna) | `config.js:2-3`; `LEEME.txt:6` | ¿Quién copia `config.js` y con qué periodicidad, y cómo se sabe que el servidor y los PCs tienen la misma versión? Los dos caminos UNC citados difieren (`\\SERVIDOR\gesfact` vs `\\SERVIDOR\compartido\gesfact`): ¿cuál es el real? |
| MH24 | sin fecha | AVISO | La siembra inicial de `db.js` (clientes, artículos, contratos, facturas) son «datos que habia en el sistema cuando se hizo la copia (**no tocar**, administracion los usa de referencia)». «La copia» no está fechada ni descrita. | administración (usa de referencia), Julián (anota) | `db.js:91-92` (carga automática si `clientes` está vacía: `:83-87`); riesgo R12 | ¿Qué copia es y de cuándo (2026)? ¿Estos seis clientes y ocho artículos son el catálogo real vigente de la oficina? El aviso dice «no tocar» pero el código la recarga en cualquier BD vacía: confirmar que nadie arranca GesFact sobre una BD recién borrada sin saberlo. |
| MH25 | sin fecha | ABANDONO (intención) | «Este fichero se ha ido haciendo grande, **algun dia habria que partirlo. "Algun dia".**» — deuda autoconsciente y confesada de `routes/facturas.js`. | Julián | `routes/facturas.js:2-3` | ¿Hay que registrar esto como deuda con dueño y fecha, o es una nostalgia que se archiva tal cual? (Hoy: registrar, no partir.) |
| MH26 | sin fecha («un dia») | INCIDENTE | **Una línea de factura falló a mitad de grabación y «ya se apaño en su dia a mano en la bd, no ha vuelto a pasar»**: hay al menos una factura que fue remendada con edición directa de la base de datos. | Julián | `routes/facturas.js:81-82` (contexto sin transacción: `:74-98`; riesgo R10) | ¿Qué factura, qué se editó a mano, cuándo? ¿Quedan trazas de `UPDATE`/`INSERT` manuales en la BD real? Es relevante porque la edición a mano rompe la auditoría de la serie (MH15). |
| MH27 | sin fecha | PRÁCTICA | Baja de contrato a mitad de mes: «administracion emite **despues a mano** la factura del prorrateo con el importe que calcula esta pantalla» (mes de 30 días comerciales, `:37-39`); la pantalla lo repite al usuario: «el importe del prorrateo del último mes sale arriba en la barra de direcciones; administración emite esa factura a mano». | administración | `routes/contratos.js:28-30,37-40`; `views/contratos.ejs:17`; el otro método en `scripts/remesa_mensual.js:43-51` | ¿Se emite siempre (hay control de que no se olvide)? ¿El importe de pantalla coincide con lo que después aceptó la gestoría en las bajas reales (p. ej. contrato 5, `db.js:118`)? |
| MH28 | sin fecha | PRÁCTICA | Modelo 303: GesFact solo da el resumen por tipo de IVA; «lo termina la gestoria» — la responsabilidad de la declaración es de fuera del sistema. Las rectificativas «entran con signo negativo y cuadran solas» en el informe (la pantalla lo dice igual: «Estos importes los revisa la gestoría antes del modelo 303… las rectificativas restan solas»). | gestoría (Puri), Julián | `routes/informes.js:13,21-22`; `views/informe_iva.ejs:16` | ¿La gestoría pide algo más que el CSV y la pantalla (conciliación, fichero adicional)? ¿Alguna vez el informe trimestral no ha cuadrado con el CSV? |
| MH29 | sin fecha (práctica semanal) | PRÁCTICA + AVISO implícito | Copias de seguridad: «**Marga copia datos/gesfact.db a un pendrive los viernes**». Único mecanismo de respaldo documentado. | Marga | `LEEME.txt:18`; riesgo R5 | ¿Cuántos pendrives/copias hay, dónde, desde cuándo? ¿Alguna vez se ha probado restaurar una? Si Marga falta un viernes, ¿hay quien la sustituya? |
| MH30 | sin fecha | PRÁCTICA | Soporte: «ante cualquier problema llamar a Julián (ext. 22)» — el conocimiento del sistema está en una persona y un teléfono. | Julián | `views/pie.ejs:2` | ¿Julián sigue disponible (¿es «Julian» del package.json y de los comentarios la misma persona)? ¿Hay un plan si él no está? Relacionado con MH18 (Roberto) y MH19 (Manoli): el repo sugiere que el conocimiento está en 2–3 personas. |
| MH31 | sin fecha | DECISIÓN | **La rectificativa NO se recalcula: se invierte lo grabado** — «OJO: aqui NO se recalcula nada, se invierte lo que hay (Puri dixit: la rectificativa tiene que ser espejo exacto de la original)». Es norma de la gestoría elevada a comentario; el código la cumple (`:141-150`). | Puri (gestoría, «dixit»), Julián (probable redactor, `SUPOSICIÓN`: sin firma) | `routes/facturas.js:124-128,141-150`; práctica visible en la siembra (`db.js:160-162`); hallazgo H6/H8 de `flujo-factura.md` | ¿Ratifica Puri hoy el criterio «espejo exacto» aunque la original llevara un cálculo mal hecho? ¿Hay algún caso real (p. ej. la RE-2026-000001, MH21) en que el espejo obligó a arrastrar un error a la rectificativa? |

## 9 bis. 2026-10-30 — Entrevista de negocio (simulación)

Entrada añadida a partir del acta de la entrevista de negocio de 2026-10-30
(`acta-entrevista-negocio.md`). **No es una decisión real ratificada**: es una simulación en la que
el cliente interpreta a Paco, Puri, Marga, Julián y Manoli. Se registra aquí porque aporta prácticas,
dependencias y decisiones que no estaban documentadas en los comentarios del código.

| ID | Fecha | Tipo | Qué se decidió o reveló | Quién | Evidencia | Pregunta al negocio |
|---|---|---|---|---|---|---|
| MH32 | 2026-10-30 (simulación) | DECISIÓN | La entrevista fija **25 decisiones** de negocio (D-01 a D-25): importe válido por suma de líneas, descuento en contratos y recargo, prorrateo por días reales, prohibición de rectificar cobradas, bloqueo de remesa duplicada, copia diaria, NIF, numeración, CSV, tablero, fechas, formatos, IVA, etc. | Paco, Puri, Marga, Julián y Manoli (roles simulados) | `acta-entrevista-negocio.md`; `notas-entrevista-negocio.md`; `registro-anomalias.md` | ¿Ratifica el negocio real estas 25 decisiones, con nombre y fecha, o alguna debe corregirse? |
| MH33 | 2026-10-30 (simulación) | PRÁCTICA + RIESGO | Si falla la grabación de una factura, el negocio acepta que quede la **cabecera y las líneas guardadas con un aviso** para completarla. No existe un proceso definido de quién atiende el aviso ni cómo se completan las líneas que faltan. | Julián y Marga (simulados) | **NEGOCIO** — acta D-06/N-06; `registro-anomalias.md` A-17; `registro-riesgos.md` R25 | ¿Quién completa una factura incompleta y cómo se asegura que el aviso no se pierda? |
| MH34 | 2026-10-30 (simulación) | PRÁCTICA + DEPENDENCIA | **No existe un procedimiento escrito y probado** para arrancar el sistema y restaurar una copia sin Julián. El conocimiento operativo está repartido entre Julián (soporte), Marga (copias y envíos) y Manoli (correo). | Marga y Manoli (simuladas) | **NEGOCIO** — acta D-25/N-25; `registro-anomalias.md` A-18; `registro-riesgos.md` R26 | ¿Quién debe poseer el procedimiento y cuándo se prueba la restauración? |
| MH35 | 2026-10-30 (simulación) | DECISIÓN | Se prevé **reabrir ejercicios anteriores a 2018** (rectificativas tardías, inspección o corrección de la gestoría); por eso los tipos de IVA antiguos 16/18/7/8 siguen siendo necesarios. | Puri y Julián (simulados) | **NEGOCIO** — acta D-19/N-19; `registro-anomalias.md` A-14 | ¿Los tipos antiguos se usan solo para consulta o también para emitir facturas nuevas con fecha actual? |
| MH36 | 2026-10-30 (simulación) | DECISIÓN | La copia de la base de datos debe ser **diaria**; hoy es semanal en un pendrive. La decisión no está implantada ni se ha definido una prueba de restauración. | Marga y Julián (simulados) | **NEGOCIO** — acta D-08/N-08; `registro-riesgos.md` R27 | ¿La copia diaria debe incluir una prueba periódica de restauración? |

## Anexo A — personas que aparecen en los comentarios

| Persona | Perfil según los comentarios (no verificado fuera de ellos) | Entradas donde aparece |
|---|---|---|
| **Julián / Julian** | Desarrollador y mantenedor del sistema (author en `package.json:9`; comentarios fechados 2017–2023; soporte «ext. 22»). | MH02, MH04–MH06, MH09–MH10, MH12–MH17, MH20 (`SUPOSICIÓN`), MH23–MH26, MH28, MH30, MH32–MH36 |
| **Marga** | Personal de administración: da de alta clientes y mira los NIF, trabaja en el PC que lanza la remesa, envía las facturas a mano desde su Outlook, y copia la BD a un pendrive los viernes. | MH05–MH06, MH16, MH17, MH19, MH29, MH32–MH34, MH36 |
| **Paco** | Autoridad de negocio para las condiciones comerciales: descuento por volumen (2018) y prorrateo original en Access. | MH01, MH07, MH32 |
| **Puri** | Gestoría («Puri (gestoria)», «Puri dixit»): devolvió el trimestre de 2019, pidió el descuento línea a línea (2018), acordó el formato CSV (2019) y exige la rectificativa «espejo exacto» (MH31). | MH08, MH10–MH11, MH13, MH31, MH32, MH35 |
| **Roberto** | Becario (2021): remesa mensual, autorrelleno, reto de estilos; módulo de albaranes sin terminar en su PC personal. | MH17–MH18 |
| **Manoli** | Dueña de facto del asunto del correo: «hablar con Manoli antes de tocar» (config) «antes de reactivar esto» (email). Rol exacto desconocido. | MH19, MH32, MH34 |
| **Contaplus / Arsys / AEAT** | Externalidades nombradas: software de la gestoría (cuadre línea a línea), proveedor de correo (roto desde 2022), inspección de 2020. | MH11, MH13; MH19; MH15 |

## Anexo B — coberturas y vacíos de la búsqueda

- **Comentarios sin valor cronológico** (descriptivos técnicos, revisados y descartados):
  `config.js:7,24,39` (empresa, IVA defecto 21, vencimiento 30 días), `db.js:27-28,35-37,40,45-48,52,61-62,72,76` (campos del esquema),
  `lib/util.js:4,28,35,41` (descripciones), `lib/numeracion.js:19` («año nuevo: contador a cero»),
  `server.js:2,21` (arranque, «dashboard: cuatro numeros y a correr»), `routes/*.js` (cabeceras y comentarios
  de sección: `clientes.js:1`, `articulos.js:1`, `contratos.js:1`, `facturas.js:14,29,40-41,49,56,104,116`,
  `informes.js:1,21-22` este último sí consignado en MH28), `scripts/remesa_mensual.js:1-2,16` (uso),
  `services/calculo.js:11,25,45-47,94` (firma y formatos de argumento), `services/email.js:1-2`,
  `public/js/factura.js:1` (cabecera; la atribución a Roberto está en `:2` y sí es cronológica).
- **Vistas `.ejs`:** sin comentarios de código (verificado con `<%#`, `//`, `<!--`); las cinco notas
  en texto están todas incorporadas como evidencia: `views/index.ejs:9-10` (MH17), `views/pie.ejs:2`
  (MH30), `views/contratos.ejs:17` (MH27), `views/informe_iva.ejs:16` (MH28),
  `views/factura_nueva.ejs:26` (MH07). Las demás (`cabecera`, `clientes`, `articulos`, `facturas`,
  `informes`, `factura_detalle`) contienen solo marcado y etiquetas funcionales.
- **Otros artefactos con nota histórica no analizados por estar fuera del alcance** (mención para
  coherencia): mensajes de commit del repo (3 commits, «foto inicial… octubre 2026»), `AGENTS.md`
  (reglas derivadas de estos mismos hechos), `.specify/memory/constitution.md`.
- **Vacíos temporales del testimonio:** nada consta entre 2011 y 2017 (era Access sin comentarios),
  ni sobre el origen de la serie `RE` anterior a 2020, ni sobre 2024–2025 (contratos sembrados con
  altas en esas fechas: `db.js:116-118` — sin comentario asociado).

## Anexo C — resumen de preguntas priorizadas para el negocio

1. **Redondeo por línea (MH13)** y **espejo de la rectificativa (MH31)**: ratificar por escrito con la
   gestoría actual; son las dos normas cuyo incumplimiento ya costó un trimestre devuelto.
2. **Correlatividad y no-borrado (MH15–MH16, MH26)**: qué pidió exactamente la inspección de 2020 y
   cómo se resolvieron los duplicados de 2021 y el apaño manual en BD; verificar en producción que
   no hay números duplicados (R1, R10).
3. **Correo (MH19–MH20)**: quién es Manoli, estado de la cuenta Arsys y aceptación formal del envío
   manual desde Outlook de Marga.
4. **Reglas de dinero heredadas de Paco (MH01, MH07, MH10)**: umbrales de descuento, prorrateo
   comercial frente a los días reales de la remesa (R7) y el «1.000 justos sin descuento» — ratificar
   o jubilar con nombre y fecha.
5. **Continuidad de personas (MH18, MH29, MH30 y Anexo A)**: Roberto (¿albaranes? ¿su PC?), Marga
   (¿backup y envíos?), Julián (¿ext. 22 sigue siendo el soporte?), Puri (¿sigue en la gestoría?) y
   Manoli (¿rol en el correo?): el sistema funciona hoy apoyado en personas que solo están nombradas
   en comentarios.

**Actualización 2026-10-30:** la entrevista de negocio simulada añade MH32-MH36 y fija 25 decisiones
en `acta-entrevista-negocio.md`. La lista de preguntas que siguen abiertas para el negocio está en
`registro-anomalias.md` (sección «Agenda de la próxima conversación»).
