# Mapa del sistema — GesFact 2.4

**Fecha:** 2026-10-28
**Alcance:** foto actual del repositorio (`invoicelegacy`), sin modificar código.
**Método:** lectura completa de los ficheros de la aplicación y consultas de solo lectura a la
base de datos local.
**Convención de evidencia:** `fichero:líneas`. Las afirmaciones no verificadas se marcan como
`SUPOSICIÓN` y se convierten en preguntas al final.

> Documento de reconocimiento. No propone cambios ni correcciones: los hallazgos se registran en
> «Zonas oscuras» para que el negocio decida en la fase siguiente, conforme a la constitución
> (`.specify/memory/constitution.md`).

## Resumen de negocio

GesFact es una aplicación web de uso interno para facturar a clientes de hostelería y comercio:
mantiene clientes, artículos y contratos de cuota mensual; emite facturas con IVA y recargo de
equivalencia; permite cobrarlas y rectificarlas; y produce el resumen trimestral de IVA y el CSV
que se entrega a la gestoría. Es un monolito Node/Express con vistas EJS y una única base SQLite
(`datos/gesfact.db`), sin autenticación ni servicios externos activos.

Flujo principal: maestros (clientes, artículos, contratos) → emisión de factura (cálculo y
numeración) → cobro o rectificación → informes/CSV. La remesa mensual de contratos es un script
de línea de comandos que se lanza a mano.

## 1. Núcleo de arranque y configuración

### `server.js`

**Responsabilidad:** es la puerta de entrada; atiende al navegador y decide qué pantalla o acción
corresponde a cada dirección.
**Depende de:** `express`, `body-parser`, `db.js`, `config.js` y las cinco rutas de negocio.
**Dependen de él:** el navegador del usuario; no lo importa ningún otro módulo (es el ejecutable).
**Criticidad:** **Alta** — si no arranca, no se puede facturar ni consultar nada.
**Evidencia:** requires y configuración `server.js:9-18`; dashboard `server.js:20-36`; montaje de
rutas `server.js:38-42`; inicialización y escucha `server.js:44-55`.

### `config.js`

**Responsabilidad:** guarda los datos fiscales de la empresa, el puerto, la ubicación de la base
de datos, el IVA por defecto, los plazos de pago y las claves operativas.
**Depende de:** nada.
**Dependen de él:** `db.js`, `server.js`, `routes/facturas.js`, `routes/articulos.js`,
`routes/informes.js`, `services/email.js`.
**Criticidad:** **Alta** — sus datos salen impresos en las facturas y determinan qué base de datos
se abre y con qué clave se exporta a la gestoría.
**Evidencia:** datos de empresa `config.js:8-17`; ruta de BD `config.js:20`; puerto `config.js:22`;
IVA `config.js:25`; SMTP `config.js:29-34`; clave de exportación `config.js:37`; vencimiento
`config.js:40`.

### `db.js`

**Responsabilidad:** abre la contabilidad, crea las tablas y, si el sistema está vacío, lo rellena
con clientes, artículos, contratos y facturas de referencia.
**Depende de:** `fs`, `path`, `sqlite3` y `config.js`.
**Dependen de él:** `server.js`, las cinco rutas, `lib/numeracion.js` y
`scripts/remesa_mensual.js`.
**Criticidad:** **Alta** — es la única vía de acceso a los datos que producen dinero; sin ella no
hay facturación.
**Evidencia:** conexión y creación del directorio `db.js:11-15`; tablas `db.js:17-81`; condición de
siembra `db.js:83-87`; datos iniciales `db.js:91-181`; contadores iniciales `db.js:176-178`;
exportación `db.js:183-184`.

### `package.json` y `package-lock.json`

**Responsabilidad:** declaran con qué piezas se monta el programa, qué versión es y cómo se
arranca.
**Depende de:** nada.
**Dependen de él:** `npm` para instalar y arrancar.
**Criticidad:** **Media** — no interviene en la facturación, pero una instalación incorrecta deja
el sistema inoperativo (el lock actual está incompleto; ver zonas oscuras).
**Evidencia:** nombre, versión y licencia `package.json:1-4`; único script `package.json:6-8`;
dependencias `package.json:11-16`; versiones fijadas en `package-lock.json:49-50` (body-parser),
`package-lock.json:204-205` (ejs), `package-lock.json:273-274` (express) y
`package-lock.json:853-854` (sqlite3).

## 2. Módulos de negocio

### `routes/facturas.js`

**Responsabilidad:** emite facturas nuevas, las lista, las marca cobradas y genera abonos
rectificativos.
**Depende de:** `db.js`, `lib/util.js`, `services/calculo.js`, `lib/numeracion.js`,
`services/email.js`, `config.js` y las vistas `facturas`, `factura_nueva` y `factura_detalle`.
**Dependen de él:** `server.js` y los usuarios desde el navegador.
**Criticidad:** **Alta** — es donde nace y se modifica el documento que se cobra y se declara.
**Evidencia:** listado y filtro `routes/facturas.js:15-27`; formulario `routes/facturas.js:30-38`;
alta `routes/facturas.js:42-102` (lectura de líneas `55-63`, cálculo `66`, vencimiento `68-69`,
numeración `71`, cabecera `74-76`, líneas y correo `85-99`); detalle `routes/facturas.js:105-114`;
cobro `routes/facturas.js:117-122`; rectificación `routes/facturas.js:129-164`.

### `routes/clientes.js`

**Responsabilidad:** mantiene la ficha de cada cliente (NIF, dirección, recargo de equivalencia y
plazo de pago) y permite darlo de baja.
**Depende de:** `db.js`, `lib/util.js` y la vista `clientes`.
**Dependen de él:** `server.js`; los datos que graba alimentan las facturas y la remesa.
**Criticidad:** **Media** — no calcula importes, pero un NIF, un recargo o un plazo mal grabados
contaminan todas las facturas futuras del cliente.
**Evidencia:** listado `routes/clientes.js:8-13`; alta y validación de NIF
`routes/clientes.js:15-30`; baja `routes/clientes.js:32-37`.

### `routes/articulos.js`

**Responsabilidad:** mantiene el catálogo de artículos con su precio sin IVA, su tipo de IVA y su
unidad de venta.
**Depende de:** `db.js`, `config.js` y la vista `articulos`.
**Dependen de él:** `server.js`; sus precios e IVA se usan al preparar facturas.
**Criticidad:** **Media** — un precio o IVA erróneo se propaga a las facturas, pero la factura
siempre puede corregirse a mano al capturarla.
**Evidencia:** listado `routes/articulos.js:8-13`; alta con IVA por defecto
`routes/articulos.js:15-24`; baja `routes/articulos.js:26-31`.

### `routes/contratos.js`

**Responsabilidad:** gestiona las cuotas mensuales por alquileres y mantenimientos y calcula el
importe del mes de baja para que administración lo facture a mano.
**Depende de:** `db.js`, `lib/util.js`, `services/calculo.js` y la vista `contratos`.
**Dependen de él:** `server.js`; la remesa mensual lee los mismos contratos.
**Criticidad:** **Media** — alimenta la facturación recurrente, pero la emisión masiva la hace el
script, no esta pantalla.
**Evidencia:** listado `routes/contratos.js:9-14`; alta `routes/contratos.js:16-26`; baja con
prorrateo `routes/contratos.js:31-43`.

### `routes/informes.js`

**Responsabilidad:** prepara el resumen trimestral de IVA y el fichero CSV que se entrega a la
gestoría.
**Depende de:** `db.js`, `lib/util.js`, `config.js` y las vistas `informes` e `informe_iva`.
**Dependen de él:** `server.js` y la gestoría (consumidora externa del CSV).
**Criticidad:** **Alta** — un error aquí traslada importes incorrectos al modelo 303 y a la
contabilidad externa.
**Evidencia:** menú `routes/informes.js:9-11`; resumen de IVA `routes/informes.js:14-30`; CSV
`routes/informes.js:34-51`.

### `services/calculo.js`

**Responsabilidad:** calcula base, IVA, recargo de equivalencia y descuentos de una factura,
redondeando línea a línea como exige la gestoría.
**Depende de:** `lib/util.js`.
**Dependen de él:** `routes/facturas.js`, `routes/contratos.js` y
`scripts/remesa_mensual.js`.
**Criticidad:** **Alta** — es la fórmula del dinero; un céntimo de diferencia invalida el cuadre
con Contaplus.
**Evidencia:** aviso de no cambiar el redondeo `services/calculo.js:3-7`; recargos
`services/calculo.js:12-23`; cálculo por línea `services/calculo.js:26-34`; descuento por volumen
`services/calculo.js:39-43`; factura completa `services/calculo.js:48-88`; prorrateo
`services/calculo.js:90-102`.

### `lib/numeracion.js`

**Responsabilidad:** asigna el número correlativo de cada factura dentro de su serie y año, sin
huecos.
**Depende de:** `db.js`.
**Dependen de él:** `routes/facturas.js` y `scripts/remesa_mensual.js`.
**Criticidad:** **Alta** — la numeración correlativa es una obligación legal y un duplicado
invalida la serie completa.
**Evidencia:** motivo legal y antecedente de duplicado `lib/numeracion.js:3-10`; reserva
`lib/numeracion.js:14-36`; formato `lib/numeracion.js:38-42`.

### `lib/util.js`

**Responsabilidad:** redondea importes, calcula fechas de vencimiento, formatea cifras y valida
NIF para toda la aplicación.
**Depende de:** nada.
**Dependen de él:** `services/calculo.js`, las rutas de facturas, clientes, contratos e informes,
las vistas (reciben `util`) y la remesa.
**Criticidad:** **Alta** — su redondeo interviene en todos los importes y su suma de días fija los
vencimientos.
**Evidencia:** redondeo `lib/util.js:5-7`; fecha de hoy `lib/util.js:10-15`; suma de días y su
incidencia conocida `lib/util.js:18-26`; formato de fecha `lib/util.js:29-33`; días del mes
`lib/util.js:36-39`; validación de NIF `lib/util.js:42-48`; formato de importe
`lib/util.js:51-58`.

### `services/email.js`

**Responsabilidad:** debía enviar la factura por correo al cliente; hoy solo anota que el envío
queda pendiente para hacerlo a mano.
**Depende de:** `config.js` (y de `nodemailer`, comentado).
**Dependen de él:** `routes/facturas.js`.
**Criticidad:** **Baja** — está fuera de servicio desde 2022 y no bloquea la emisión; el envío real
se hace desde Outlook.
**Evidencia:** estado y motivo `services/email.js:3-6`; dependencia comentada
`services/email.js:8`; implementación desactivada `services/email.js:11-29`; llamada desde el alta
`routes/facturas.js:93-95`.

### `scripts/remesa_mensual.js`

**Responsabilidad:** emite de una sola vez las facturas de las cuotas mensuales de los contratos
activos en un mes.
**Depende de:** `db.js`, `lib/util.js`, `services/calculo.js` y `lib/numeracion.js`.
**Dependen de él:** el operador que lo lanza a mano el día 1 (recordatorio en `views/index.ejs:9-10`).
**Criticidad:** **Alta** — crea facturas reales en lote; un error se multiplica por todos los
contratos y consume números de la serie.
**Evidencia:** uso `scripts/remesa_mensual.js:3-7`; validación del mes
`scripts/remesa_mensual.js:14-18`; contratos a facturar `scripts/remesa_mensual.js:23-31`;
prorrateo propio `scripts/remesa_mensual.js:45-51`; emisión `scripts/remesa_mensual.js:57-75`.

## 3. Interfaz (vistas y estáticos)

Todas las vistas comparten `cabecera.ejs` y `pie.ejs`; reciben los datos ya consultados por la
ruta correspondiente. EJS escapa las variables con `<%=`, salvo los `include`.

### `views/cabecera.ejs` y `views/pie.ejs`

**Responsabilidad:** dan la cabecera, el menú de navegación y el pie comunes a todas las
pantallas.
**Depende de:** `public/css/estilos.css`.
**Dependen de ellos:** las otras nueve vistas.
**Criticidad:** **Media** — sin ellos no se navega, pero no alteran datos.
**Evidencia:** cabecera y menú `views/cabecera.ejs:1-21`; pie `views/pie.ejs:1-4`.

### `views/index.ejs`

**Responsabilidad:** muestra el tablero de cuatro cifras (facturas, pendientes, importe y clientes
activos) y recuerda cómo lanzar la remesa.
**Depende de:** los totales calculados en `server.js:20-36` y de `cabecera`/`pie`.
**Dependen de él:** la ruta `/`.
**Criticidad:** **Media** — es informativo; un error de lectura no cambia datos, pero oculta la
situación real.
**Evidencia:** tabla de cifras `views/index.ejs:3-8`; recordatorio de remesa `views/index.ejs:9-10`.

### `views/facturas.ejs`

**Responsabilidad:** lista las facturas y permite filtrarlas por estado.
**Depende de:** los datos de `routes/facturas.js:15-27` y de `util`.
**Dependen de él:** la ruta `/facturas`.
**Criticidad:** **Media** — es la vía de consulta, pero no modifica importes.
**Evidencia:** filtro `views/facturas.ejs:3-11`; tabla `views/facturas.ejs:12-23`.

### `views/factura_nueva.ejs`

**Responsabilidad:** captura las líneas de una factura nueva y las envía para su emisión.
**Depende de:** `public/js/factura.js`, de los maestros que carga `routes/facturas.js:30-38` y de
`cabecera`/`pie`.
**Dependen de él:** la ruta `/facturas/nueva`.
**Criticidad:** **Alta** — es la entrada manual del dinero; un dato mal capturado genera una
factura incorrecta.
**Evidencia:** formulario `views/factura_nueva.ejs:3-27`; seis filas fijas
`views/factura_nueva.ejs:13-20`; catálogo de autorrelleno `views/factura_nueva.ejs:22-24`; script
`views/factura_nueva.ejs:28`.

### `views/factura_detalle.ejs`

**Responsabilidad:** presenta la factura con formato legal para imprimirla o guardarla como PDF y
ofrece cobrarla o rectificarla.
**Depende de:** los datos de `routes/facturas.js:105-164`, de `util`, de `config.EMPRESA` y de
`cabecera`/`pie`.
**Dependen de él:** la ruta `/facturas/:id`.
**Criticidad:** **Alta** — es el documento que recibe el cliente y que se archiva.
**Evidencia:** bloque imprimible `views/factura_detalle.ejs:2-44`; botones de impresión, cobro y
rectificación `views/factura_detalle.ejs:45-53`.

### `views/clientes.ejs`

**Responsabilidad:** lista los clientes y permite darlos de alta o de baja.
**Depende de:** `routes/clientes.js` y de `cabecera`/`pie`.
**Dependen de él:** la ruta `/clientes`.
**Criticidad:** **Media** — mantiene el maestro que alimenta la facturación.
**Evidencia:** listado `views/clientes.ejs:4-14`; formulario `views/clientes.ejs:15-26`.

### `views/articulos.ejs`

**Responsabilidad:** lista el catálogo y permite añadir artículos o darlos de baja.
**Depende de:** `routes/articulos.js` y de `cabecera`/`pie`.
**Dependen de él:** la ruta `/articulos`.
**Criticidad:** **Media** — mantiene precios e IVA que luego se usan al facturar.
**Evidencia:** listado `views/articulos.ejs:3-12`; formulario `views/articulos.ejs:13-21`.

### `views/contratos.ejs`

**Responsabilidad:** lista los contratos de cuota mensual y permite dar de baja uno indicando la
fecha.
**Depende de:** `routes/contratos.js`, de `util` y de `cabecera`/`pie`.
**Dependen de él:** la ruta `/contratos`.
**Criticidad:** **Media** — alimenta la remesa y el prorrateo del último mes.
**Evidencia:** listado y baja `views/contratos.ejs:3-16`; nota del prorrateo
`views/contratos.ejs:17`.

### `views/informes.ejs`

**Responsabilidad:** ofrece los enlaces a los cuatro trimestres de IVA y a la exportación anual
para la gestoría.
**Depende de:** `routes/informes.js:9-11` y de `cabecera`/`pie`.
**Dependen de él:** la ruta `/informes`.
**Criticidad:** **Baja** — es un menú; los cálculos están en la ruta.
**Evidencia:** enlaces `views/informes.ejs:3-9`.

### `views/informe_iva.ejs`

**Responsabilidad:** muestra el resumen de IVA por tipo con los totales que revisa la gestoría
antes del modelo 303.
**Depende de:** los datos de `routes/informes.js:14-30`, de `util` y de `cabecera`/`pie`.
**Dependen de él:** la ruta `/informes/iva`.
**Criticidad:** **Media** — es revisión; el dato que trasciende es el que se entrega fuera.
**Evidencia:** tabla y sumas en la vista `views/informe_iva.ejs:3-15`; nota de uso
`views/informe_iva.ejs:16`.

### `public/js/factura.js`

**Responsabilidad:** al elegir un artículo en el formulario, rellena su precio y su IVA.
**Depende de:** el HTML de `factura_nueva.ejs` (clases y `datalist`).
**Dependen de él:** `views/factura_nueva.ejs:28`.
**Criticidad:** **Baja** — es una comodidad; los totales se calculan en el servidor.
**Evidencia:** autorrelleno `public/js/factura.js:1-15`.

### `public/css/estilos.css`

**Responsabilidad:** da el aspecto visual y define qué se oculta al imprimir.
**Depende de:** nada.
**Dependen de él:** `views/cabecera.ejs:6`.
**Criticidad:** **Baja** — solo presentación.
**Evidencia:** reglas generales `public/css/estilos.css:1-27`; reglas de impresión
`public/css/estilos.css:28`.

## 4. Datos y artefactos

### `datos/gesfact.db` (generada, no versionada)

**Responsabilidad:** contiene toda la facturación real: clientes, artículos, contratos, facturas,
líneas y contadores.
**Depende de:** `db.js`.
**Dependen de él:** toda la aplicación.
**Criticidad:** **Alta** — es el activo irrecuperable si no hay copia; las copias son manuales
(`LEEME.txt:18`).
**Evidencia:** ruta configurada `config.js:20`; apertura `db.js:15`; exclusión local en
`.git/info/exclude` (verificada con `git check-ignore`).

### `datos/migracion_mysql_2018.sql`

**Responsabilidad:** pretendía trasladar la facturación a MySQL; nunca se ejecutó y su esquema
está desfasado.
**Depende de:** nada.
**Dependen de él:** nada.
**Criticidad:** **Baja** — no participa en la operación.
**Evidencia:** aviso y contenido `datos/migracion_mysql_2018.sql:1-5`.

### `LEEME.txt`

**Responsabilidad:** explica cómo instalar el programa y qué quedó pendiente; es la única
documentación de operación, pero está desactualizada.
**Depende de:** nada.
**Dependen de él:** el personal de oficina.
**Criticidad:** **Baja** como software; **Media** como referencia operativa (copias, arranque).
**Evidencia:** instalación con Node 8 `LEEME.txt:4-9`; pendientes de MySQL, correo y albaranes
`LEEME.txt:11-16`; copias manuales `LEEME.txt:18`; fecha de la última revisión `LEEME.txt:20`.

### Artefactos de proceso (`.specify/`, `.opencode/`, `AGENTS.md`, `.gitignore`)

**Responsabilidad:** soportan el flujo de trabajo asistido (constitución, comandos de Spec Kit) y
evitan versionar dependencias y datos locales.
**Depende de:** nada de la aplicación.
**Dependen de él:** el equipo de desarrollo, no la facturación.
**Criticidad:** **Baja** para el negocio.
**Evidencia:** constitución `.specify/memory/constitution.md`; hooks `.specify/extensions.yml`;
comandos `.opencode/commands/`; exclusiones en `.gitignore`.

## (a) Diagrama de dependencias

```
Navegador (HTML + CSS + JS)
        │ HTTP :3000
        ▼
    server.js
        │
        ├──► routes/facturas.js ──► services/calculo.js ──► lib/util.js
        │        │                    ▲                      ▲
        │        ├──► lib/numeracion.js ──► db.js            │
        │        ├──► services/email.js ──► config.js        │
        │        └──► views/factura_nueva|facturas|detalle   │
        │                                                   │
        ├──► routes/clientes.js ──► lib/util.js             │
        ├──► routes/articulos.js ──► config.js              │
        ├──► routes/contratos.js ──► services/calculo.js ───┘
        ├──► routes/informes.js ──► lib/util.js + config.js
        │
        ├──► db.js ──► datos/gesfact.db
        └──► config.js

Vistas: cabecera.ejs + pie.ejs envuelven a las otras nueve;
        reciben los datos de su ruta y usan lib/util.js para formatear.

CLI manual: scripts/remesa_mensual.js
        └──► db.js, lib/util.js, services/calculo.js, lib/numeracion.js
```

No hay ciclos entre módulos: `config.js` y `lib/util.js` son hojas; `db.js` solo depende de
`config.js`; las rutas y los servicios dependen de ellos, nunca al revés.

## (b) Tecnologías y versiones reales

Deducidas del código, de `package.json`/`package-lock.json` y de la instalación verificada el
2026-10-28. No se usa `LEEME.txt` como fuente.

| Tecnología | Versión real | Evidencia |
|---|---|---|
| Node.js | **v24.19.0** | `node -v` (entorno verificado); no hay `engines` en `package.json:1-16` |
| npm | **11.17.0** | `npm -v` |
| Express | **4.22.3 instalado** (lock fija 4.22.2; rango `^4.22.2`) | `package.json:14`; `package-lock.json:273-274`; `npm ls --depth=0` |
| body-parser | **1.20.9 instalado** (lock fija 1.20.5; rango `^1.20.5`) | `package.json:12`; `package-lock.json:49-50`; `npm ls --depth=0` |
| EJS | **3.1.10** | `package.json:13`; `package-lock.json:204-205`; `npm ls --depth=0` |
| sqlite3 (Node) | **5.1.7** (binario N-API) | `package.json:15`; `package-lock.json:853-854`; `npm ls --depth=0` |
| SQLite (motor) | **3.44.2** | consulta `select sqlite_version()` sobre `datos/gesfact.db` |
| HTML + CSS + JavaScript | sin versión ni empaquetador | `views/*.ejs`; `public/css/estilos.css`; `public/js/factura.js` |
| Framework de tests / lint / build | **ninguno** | `package.json:6-8` solo define `start`; no hay ficheros de test ni CI |

**Nota de reproducibilidad:** la instalación se hizo con `npm install --no-package-lock` porque el
lock versionado no incluye dependencias internas de `sqlite3` (falta `node-addon-api`), lo que hizo
fallar el `npm install` normal con `Cannot find module 'node-addon-api'`. Por eso las versiones
instaladas de Express y body-parser son un parche superiores a las fijadas en el lock.

## (c) Zonas oscuras

Clasificación orientativa: **[muerto]**, **[huérfano]**, **[a medias]**, **[rareza]**,
**[riesgo]**, **[bug]**, **[deuda]**, **[SUPOSICIÓN]**. No se corrige nada en esta fase.

### Código muerto y ficheros huérfanos

1. **[muerto] Envío de correo desactivado.** `services/email.js:3-8` explica que dejó de funcionar
   en 2022 y que el `require('nodemailer')` está comentado; `services/email.js:11-29` solo escribe
   un aviso por consola. Aun así, el alta de factura lo invoca en `routes/facturas.js:93-95`.
2. **[muerto] Configuración SMTP sin uso.** `config.js:29-34` mantiene host, usuario y clave, pero
   el único consumidor es el bloque comentado de `services/email.js:14-17`.
3. **[muerto] Exportaciones sin consumidor externo.** `services/calculo.js:104-110` exporta
   `recargoPara`, `calcularLinea` y `porcentajeDescuento`, que solo se usan dentro del propio
   módulo (`services/calculo.js:31,56,60,71`); `lib/numeracion.js:44-47` exporta `formatear`, usado
   solo en `lib/numeracion.js:34`.
4. **[huérfano] Volcado de migración a MySQL.** `datos/migracion_mysql_2018.sql:1-5` declara que
   nunca se ejecutó y que el esquema está desfasado; ningún fichero lo referencia.

### Funcionalidades a medias, desactivadas o con trabajo manual

5. **[a medias] Adjunto de factura por correo.** El envío comentado no adjunta PDF
   (`services/email.js:19-24`) y el alta solo pasa el número (`routes/facturas.js:93-95`); el
   procedimiento real es imprimir la vista y enviarla desde Outlook (`services/email.js:3-5`).
6. **[muerto] Módulo de albaranes.** `LEEME.txt:15-16` lo menciona como trabajo inacabado de
   Roberto, pero no existe ningún fichero, ruta ni vista de albaranes en el repositorio.
7. **[rareza] Formulario limitado a seis líneas.** `views/factura_nueva.ejs:13-20` genera siempre
   seis filas y `public/js/factura.js:1-15` solo autorrellena: no hay forma de añadir más líneas
   desde la interfaz. `SUPOSICIÓN`: se desconoce si el negocio asume ese límite.
8. **[rareza] Prorrateo visible solo en la barra de direcciones.** `routes/contratos.js:39-40`
   redirige con `?prorrateo=...`, pero ninguna vista lo muestra; `views/contratos.ejs:17` indica que
   administración lo copia de la URL y emite la factura a mano.
9. **[SUPOSICIÓN] El tablero ignora la serie `RE`.** `server.js:24` suma solo
   `serie = 'FA' AND estado = 'emitida'`. Como las facturas rectificadas quedan en estado
   `rectificada`, el par original/abono no aparece; si existiera un abono pendiente de cobro, no se
   restaría. Pregunta: ¿es el criterio contable deseado?
10. **[SUPOSICIÓN] Contenido del CSV para la gestoría.** `routes/informes.js:36-45` exporta todas
    las facturas del año, incluidas `rectificada` y las `RE`, sin netear. El formato está acordado
    (`routes/informes.js:32-33`), pero no hay evidencia en el repo de que la gestoría espere el
    detalle y no el neto.

### Riesgos y defectos latentes

11. **[riesgo] Numeración no atómica.** `lib/numeracion.js:8-10` reconoce un duplicado histórico y
    `lib/numeracion.js:30-35` hace `leer último → sumar 1 → actualizar` sin transacción; la tabla
    `facturas` no tiene `UNIQUE` sobre `numero` (`db.js:50-63`). Dos altas simultáneas pueden
    repetir número.
12. **[riesgo] Alta de factura sin transacción.** `routes/facturas.js:74-99` inserta primero la
    cabecera y después cada línea; si una línea falla, responde 500 pero la cabecera ya está
    grabada. Además, `routes/facturas.js:57-63` no valida `NaN`: un precio vacío puede llegar al
    `INSERT` y provocar ese fallo a medias.
13. **[bug] La rectificación ignora errores de línea.** `routes/facturas.js:148-158` no recibe el
    error en el callback, descuenta `pendientes` igualmente y marca la original como `rectificada`
    aunque alguna línea no se haya grabado.
14. **[rareza] Se puede rectificar una factura cobrada por POST directo.** La vista solo muestra el
    botón para `emitida` (`views/factura_detalle.ejs:47`), pero la ruta solo rechaza las ya
    `rectificada` o de serie `RE` (`routes/facturas.js:132-133`). `SUPOSICIÓN`: ¿debe permitirse?
15. **[bug] Riesgo de desfase de un día en vencimientos.** `lib/util.js:18-26` suma milisegundos y
    el propio comentario documenta el incidente de marzo de 2019 por el cambio de hora.
16. **[bug] Validación de NIF incompleta.** `lib/util.js:42-48` solo comprueba longitud 9; el
    `TODO` de `lib/util.js:42-43` reconoce que falta la letra.
17. **[riesgo alto] Dos prorrateos distintos para el mismo mes de baja.**
    `services/calculo.js:95-101` usa mes comercial de 30 días, mientras que
    `scripts/remesa_mensual.js:45-51` usa los días reales del mes. Ejemplo con cuota 90 € y baja el
    día 15 de marzo: la remesa calcula `90/31*15 = 43,55 €` y la pantalla de contratos
    `90/30*15 = 45,00 €`. `SUPOSICIÓN`: ¿cuál es el importe correcto para la gestoría?
18. **[riesgo] La remesa no es idempotente.** `scripts/remesa_mensual.js:23-77` no comprueba si el
    mes ya se facturó; volver a lanzarlo duplica facturas y consume numeración. Tampoco usa
    `config.VENCIMIENTO_DIAS`: aplica `co.dias_pago || 30` (`scripts/remesa_mensual.js:60`), frente
    a `routes/facturas.js:68`.
19. **[riesgo] Siembra automática de datos de ejemplo.** `db.js:83-87` rellena la base si
    `clientes` está vacía y `db.js:176-178` deja los contadores en `FA-2026 = 108` y `RE-2026 = 1`.
    En un equipo con la base vacía por error, el sistema arrancaría con datos falsos y numeración
    avanzada. Las líneas de ejemplo asumen además que las facturas empiezan en `id = 1`
    (`db.js:126-166`).
20. **[bug] Trimestre inválido tumba el informe.** `routes/informes.js:16-19` hace
    `meses[t][0]` sin validar `t`; con `?trimestre=5` la ruta lanza una excepción.
21. **[riesgo] El tablero oculta errores de base de datos.** `server.js:20-35` ignora los errores
    de las consultas y pinta ceros (`f ? f.n : 0`), de modo que una avería puede parecer un mes
    sin actividad.
22. **[riesgo de seguridad] Sin autenticación ni CSRF; escucha en todas las interfaces.**
    `server.js:14-18` solo registra `body-parser` y estáticos, `server.js:49` llama a
    `app.listen(puerto)` sin host, y no hay coincidencias de `session`, `auth` o `csrf` en el
    código. Cualquiera con acceso a la red podría emitir o modificar facturas.
23. **[riesgo de seguridad] Secretos en texto plano y versionados.** `config.js:32-34` contiene la
    contraseña SMTP y `config.js:37` la clave de exportación a la gestoría; ambos valores están en
    el repositorio (no se reproducen aquí).
24. **[riesgo operativo] Rutas relativas al directorio de trabajo.** `config.RUTA_BD` es
    `./datos/gesfact.db` (`config.js:20`) y `express.static('public')` es relativa
    (`server.js:18`): arrancar desde otra carpeta crea o abre otra base y no encuentra los
    estáticos.
25. **[deuda] Copias y despliegue manuales.** `LEEME.txt:4-9` describe copiar la carpeta a mano y
    `LEEME.txt:18` una copia semanal a un pendrive; no hay script de backup ni de despliegue en el
    repositorio.
26. **[deuda] Sin tests ni integración continua.** `package.json:6-8` solo define `start`; no hay
    ficheros de test ni `.github/`. Cualquier cambio se valida a mano.
27. **[deuda] Lock incompleto y runtime sin fijar.** El `package-lock.json` no incluye
    `node-addon-api`/`prebuild-install` de `sqlite3` (el `npm install` normal falla) y
    `package.json:1-16` no declara `engines`; la versión instalada de Express/body-parser ya difiere
    del lock.
28. **[rareza] Formatos de importe distintos en pantalla.** `views/articulos.ejs:8` y
    `views/contratos.ejs:8` usan `toFixed(2)` con punto, mientras que el resto usa
    `util.formatearImporte` con coma (`lib/util.js:51-58`).
29. **[rareza] Nombres de artículo duplicados.** `public/js/factura.js:5-12` busca la opción por
    nombre y se queda con la primera; dos artículos con el mismo nombre comparten precio/IVA
    autorrellenados.
30. **[deuda] Sin claves foráneas ni índices secundarios.** El esquema de `db.js:19-81` no declara
    `FOREIGN KEY` ni índices fuera de las claves primarias; son posibles líneas huérfanas y
    consultas lentas al crecer los ejercicios.

### Preguntas abiertas para el negocio (SUPOSICIÓN)

1. ¿El importe pendiente del tablero debe restar los abonos de la serie `RE`? (`server.js:24`)
2. ¿La gestoría espera el CSV con todas las facturas o solo con el neto por cliente?
   (`routes/informes.js:36-45`)
3. ¿El prorrateo correcto es el comercial de 30 días o el de días reales del mes?
   (`services/calculo.js:95-101` frente a `scripts/remesa_mensual.js:45-51`)
4. ¿Se permite rectificar una factura ya cobrada? (`routes/facturas.js:132-133`)
5. ¿Seis líneas por factura es un límite aceptado o una carencia de la pantalla?
   (`views/factura_nueva.ejs:13-20`)
