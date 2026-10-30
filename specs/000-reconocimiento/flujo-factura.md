# Ciclo de vida de una factura — GesFact 2.4

**Fecha:** 2026-10-28
**Alcance:** los caminos de creación de facturas existentes en el código y las transiciones de
estado posteriores (emisión → cobro / rectificación), seguidos paso a paso. No se ha modificado
ningún fichero de la aplicación.
**Método:** lectura completa de `routes/facturas.js`, `scripts/remesa_mensual.js`,
`services/calculo.js`, `lib/numeracion.js`, `lib/util.js`, `db.js`, `config.js`,
`services/email.js`, `routes/contratos.js`, `routes/informes.js` y las vistas implicadas;
verificación por búsqueda exhaustiva (`INSERT INTO facturas`, `siguienteNumero`,
`UPDATE facturas SET estado`, `DELETE FROM`, `BEGIN|COMMIT|transaction`); consultas de solo
lectura a la base de datos local (`datos/gesfact.db`, abierta en modo `OPEN_READONLY`) y dos
comprobaciones reproducibles con módulos puros (`node -e`).
**Convención de evidencia:** `fichero:líneas`. Las afirmaciones no verificadas se marcan como
`SUPOSICIÓN` y se convierten en preguntas al final.

> Documento de reconocimiento, complementario de `specs/000-reconocimiento/mapa-sistema.md`. No
> propone cambios ni correcciones: los hallazgos se registran (sección 7) para que el negocio
> decida, conforme a la constitución (`.specify/memory/constitution.md`, Principios I y III).
> La BD local es la generada por la siembra de `db.js`, no la de producción: sus datos
> evidencian el comportamiento del código, no cifras reales.

## 0. Verificación previa: cuántos caminos de creación existen

No se asume: se comprueba con una búsqueda de todos los puntos del repositorio que insertan en
la tabla `facturas` (`grep "INSERT INTO facturas" --include=*.js`, ejecutado el 2026-10-28):

| Punto | Tipo | Evidencia |
|---|---|---|
| `routes/facturas.js:74` — alta manual desde la web | camino en ejecución | `router.post('/nueva')`, `routes/facturas.js:42` |
| `scripts/remesa_mensual.js:61` — remesa mensual de contratos | camino en ejecución (CLI) | bucle `procesarSiguiente`, `scripts/remesa_mensual.js:36-76` |
| `routes/facturas.js:141` — rectificación de una factura existente | camino en ejecución | `router.post('/:id/rectificar')`, `routes/facturas.js:129` |
| `db.js:123` — siembra de datos históricos | **no** es un camino en ejecución: solo corre en el primer arranque, si `clientes` está vacía | condición `db.js:83-87`; inserta 9 facturas de ejemplo y deja los contadores en `FA-2026 = 108`, `RE-2026 = 1` (`db.js:126-177`) |

Existen, por tanto, exactamente **tres caminos de creación en ejecución**: manual, remesa y
rectificación. Ningún otro módulo crea facturas: `routes/contratos.js` solo calcula un prorrateo
para facturarlo a mano por el camino manual (`routes/contratos.js:31-43`, nota en
`views/contratos.ejs:17`), e `routes/informes.js` y `server.js` solo leen.

Consumo de numeración (verificado con `grep "siguienteNumero" --include=*.js`): el camino manual
reserva en serie `FA` (`routes/facturas.js:71`), la remesa en serie `FA`
(`scripts/remesa_mensual.js:57`) y la rectificación en serie `RE`
(`routes/facturas.js:138`). No hay más llamadas.

## 1. Vista general del ciclo

```
  CAMINO A: manual (web)      CAMINO B: remesa mensual (CLI)   CAMINO C: rectificación (web)
  POST /facturas/nueva        node scripts/remesa_mensual.js  POST /facturas/:id/rectificar
        │                             │                               │
        │ calculo.calcularFactura     │ prorrateo propio +           │ SIN recalcular: copia
        │ + util.sumarDias            │ calculo.calcularFactura      │ invertida de la original
        │                             │ + util.sumarDias             │ (serie RE, espejo)
        ▼                             ▼                               ▼
  INSERT facturas (estado='emitida', serie FA)              INSERT facturas (estado='emitida',
  INSERT lineas ×N (calculadas)                            serie RE, importes negativos, rectifica_a)
        │                             │                    INSERT lineas ×N (invertidas)
        │                             │                    UPDATE original → estado='rectificada'
        └─────────────┬───────────────┘                    │
                      ▼                                    │
                 estado: emitida ◄──────────────────────────┘ (la RE también nace 'emitida')
                      │
                      ├── POST /facturas/:id/cobrar  ──►  cobrada   (solo desde 'emitida')
                      │     [routes/facturas.js:117-122]
                      │
                      └── POST /facturas/:id/rectificar ─► rectificada (la original) + nueva RE
                            [routes/facturas.js:129-164]  (la ruta deja pasar también las cobradas)

  · Nunca hay DELETE (grep 'DELETE FROM' sin resultados): las facturas no se borran.
  · Nunca hay vuelta de estado (solo dos UPDATE de estado: routes/facturas.js:118 y :154).
  · Una RE no puede rectificarse (guarda routes/facturas.js:133).
```

## 2. Camino A: creación manual desde la web

### 2.1 Entradas

Formulario de `views/factura_nueva.ejs:3-27`, enviado por `POST /facturas/nueva`
(`views/factura_nueva.ejs:3`), montado en `server.js:41`:

- `cliente_id`: desplegable obligatorio (`required`, `views/factura_nueva.ejs:6`) que solo
  **lista** clientes activos (consulta `routes/facturas.js:31`).
- `fecha`: campo `date` opcional; si llega vacío se usa `util.hoy()`
  (`routes/facturas.js:44`).
- Arrays `desc`/`cant`/`precio`/`iva`: seis filas fijas del formulario
  (`views/factura_nueva.ejs:13-20`); `body-parser` con `extended:false` (`server.js:17`) y
  concatenación defensiva `[].concat(...)` en el servidor (`routes/facturas.js:50-53`).
- `obs`: observaciones libres (`views/factura_nueva.ejs:25`).
- El autorrellenado de precio e IVA al elegir artículo (`public/js/factura.js:3-15`,
  `datalist` en `views/factura_nueva.ejs:22-24`) es solo una comodidad de captura: no calcula
  totales ni interviene en el alta.

Coerción en el servidor: `parseInt` de `cliente_id` e `iva`, `parseFloat` con coma convertida a
punto para `cant` y `precio` (`routes/facturas.js:43,59-61`). No hay validación de formato de
`fecha` ni de `NaN` en importes (ver hallazgo H5 y zona oscura 12 del mapa).

### 2.2 Módulos que atraviesa y en qué orden

Orden de registro de rutas: `GET /` (`routes/facturas.js:15`), `GET /nueva`
(`routes/facturas.js:30`), `POST /nueva` (`routes/facturas.js:42`), `GET /:id`
(`routes/facturas.js:105`). `/nueva` está registrado antes que el patrón `/:id`, que si no
capturaría la URL.

1. `server.js:17` decodifica el cuerpo; `server.js:41` enruta a `routes/facturas.js:42`.
2. `db.get` del cliente: `SELECT * FROM clientes WHERE id = ?`
   (`routes/facturas.js:46`). Sin comprobar `activo` (hallazgo H4).
3. Montaje de líneas desde los arrays; filas con descripción vacía se descartan
   (`routes/facturas.js:55-63`, salto en `:56`).
4. Si no queda ninguna línea: `400 'La factura no tiene lineas'` (`routes/facturas.js:64`).
5. `calculo.calcularFactura(lineas, cliente)` (`routes/facturas.js:66`).
6. Vencimiento: `cliente.dias_pago || config.VENCIMIENTO_DIAS` y `util.sumarDias(fecha, dias)`
   (`routes/facturas.js:68-69`; `config.js:40` fija 30).
7. `numeracion.siguienteNumero('FA', ...)` (`routes/facturas.js:71`).
8. `INSERT INTO facturas` con estado literal `'emitida'` (`routes/facturas.js:74-76`).
9. `INSERT INTO lineas` por cada línea calculada (`routes/facturas.js:85-87`), sin
   transacción; errores acumulados en `huboError` y respondidos con 500 al terminar
   (`routes/facturas.js:83-92`).
10. `email.enviarFactura` (`routes/facturas.js:93`): es un stub que solo imprime un aviso y
    llama al callback (`services/email.js:26-28`; fuera de servicio desde 2022,
    `services/email.js:3-6`).
11. Redirección a `/facturas/:id` (`routes/facturas.js:94`), que pinta la vista imprimible
    (`routes/facturas.js:105-114`, `views/factura_detalle.ejs`).

### 2.3 Cálculos que se aplican (función exacta)

- **`calculo.calcularFactura(lineas, cliente)`** (`services/calculo.js:48-88`), invocada en
  `routes/facturas.js:66`:
  1. `conRecargo = cliente.recargo_equivalencia == 1` (`services/calculo.js:49`).
  2. Primera pasada: base bruta acumulada línea a línea con `calcularLinea`
     (`services/calculo.js:54-58`).
  3. `dto = porcentajeDescuento(baseBruta)` (`services/calculo.js:39-43`): >5000 € → 5 %,
     >1000 € → 2 %, si no 0. La comparación es estricta: base de 1000,00 € justa no lleva
     descuento (comprobado el 2026-10-28: `porcentajeDescuento(1000) → 0`,
     `porcentajeDescuento(1000.01) → 2`; coincide con el comentario de la siembra
     `db.js:138`).
  4. Segunda pasada: el descuento se aplica **línea a línea** sobre el precio
     (`precioConDto = redondear2(precio * (100 - dto) / 100)`, `services/calculo.js:69`) y cada
     línea se recalcula (`services/calculo.js:65-71`). El precio que se graba en `lineas` es el
     ya descontado, no el tecleado (`services/calculo.js:75`).
  5. Acumulados `base`/`iva`/`recargo` redondeados tras cada línea y
     `total = redondear2(base + iva + recargo)` (`services/calculo.js:81-86`).
- **`calculo.calcularLinea(cantidad, precio, tipoIva, conRecargo)`**
  (`services/calculo.js:26-34`): `base = redondear2(cantidad*precio)`,
  `cuotaIva = redondear2(base*tipoIva/100)` y, con recargo,
  `cuotaRecargo = redondear2(base*recargoPara(tipoIva)/100)`. **Todo redondeado por línea**;
  el aviso de no cambiar la forma de redondear está en `services/calculo.js:3-7`.
- **`calculo.recargoPara(tipoIva)`** (`services/calculo.js:12-23`): 21→5,2; 10→1,4; 4→0,5; y
  los tipos históricos 16/18→4 y 7/8→1.
- **`util.redondear2(x)`** (`lib/util.js:5-7`): `Math.round(x*100)/100`.
- **`util.sumarDias(fecha, dias)`** (`lib/util.js:20-26`), para el vencimiento
  (`routes/facturas.js:69`). Opera con milisegundos: desfase conocido de un día por cambio de
  hora (zona oscura 15 del mapa).

En el navegador no se calcula nada: `public/js/factura.js:3-15` solo autorrellena precio e IVA
y la propia vista avisa de que los descuentos «se aplican solos»
(`views/factura_nueva.ejs:26`).

### 2.4 Número de factura

- `numeracion.siguienteNumero('FA')` (`routes/facturas.js:71` → `lib/numeracion.js:14-28`):
  1. `anyo = new Date().getFullYear()` — el año **en curso de ejecución**, no el de la fecha de
     la factura (`lib/numeracion.js:15`).
  2. `SELECT ultimo FROM contadores WHERE serie=? AND anyo=?` (`lib/numeracion.js:16`); si no
     existe fila (año nuevo) se abre contador a cero (`lib/numeracion.js:18-23`).
  3. `reservar`: `nuevo = ultimo + 1` y `UPDATE contadores SET ultimo = nuevo`
     (`lib/numeracion.js:30-35`). Lectura y actualización **sin transacción**: posible
     duplicado con dos altas simultáneas (incidente real documentado en
     `lib/numeracion.js:8-10`; zona oscura 11 del mapa).
  4. `formatear(serie, anyo, n)` (`lib/numeracion.js:38-42`): `FA-2026-000009` (6 dígitos con
     ceros; comprobado el 2026-10-28 con `numeracion.formatear('FA',2026,9)`).
- El número se reserva **antes** de grabar la cabecera (`routes/facturas.js:71→74`): si el
  `INSERT` falla, el contador ya está consumido y la serie sufre un hueco (hallazgo H3).

### 2.5 Escrituras en la base de datos (orden)

| # | Operación | Tabla | Evidencia |
|---|---|---|---|
| 1 | `SELECT` del cliente por id (sin comprobar `activo`) | `clientes` | `routes/facturas.js:46` |
| 2 | `SELECT` del contador | `contadores` | `lib/numeracion.js:16` (vía `routes/facturas.js:71`) |
| 3 | (solo año nuevo) `INSERT` del contador a 0 | `contadores` | `lib/numeracion.js:20-21` |
| 4 | `UPDATE` del contador a `ultimo + 1` | `contadores` | `lib/numeracion.js:32` |
| 5 | `INSERT` de cabecera: 11 columnas, serie `FA`, estado literal `'emitida'`, `vencimiento`, observaciones = `obs` + nota de descuento si lo hay | `facturas` | `routes/facturas.js:74-76` |
| 6 | `INSERT` de cada línea calculada (8 columnas), una a una y sin transacción; la clave ajena es `this.lastID` de la cabecera | `lineas` | `routes/facturas.js:79,85-87` |

No hay transacción en ningún punto (grep `BEGIN|COMMIT|transaction` sin resultados; solo
`db.serialize` de inicialización en `db.js:18` y `db.js:94`, que no es una transacción). Si
falla una línea, la cabecera ya está grabada y se responde 500 `Error al grabar lineas`
(`routes/facturas.js:81-92`; zona oscura 12 del mapa). El correo no escribe en la BD
(`services/email.js:26-28`).

### 2.6 Estado tras la creación

`'emitida'`, fijado como literal en el propio `INSERT` (`routes/facturas.js:75`), aunque la
columna ya tenga `DEFAULT 'emitida'` (`db.js:61`). A partir de ahí, el estado solo puede
cambiar por los botones de cobro y rectificación (sección 5).

## 3. Camino B: generación por remesa mensual de contratos

### 3.1 Entradas

- Argumento único de línea de comandos: el mes a facturar, `YYYY-MM`, validado con expresión
  regular; sin argumento imprime el uso y sale con código 1
  (`scripts/remesa_mensual.js:14-18`).
- Se lanza **a mano el día 1** desde el ordenador de Marga
  (`scripts/remesa_mensual.js:5-7`; recordatorio en `views/index.ejs:9-10`).
- Datos de partida: la propia BD (`db.inicializar` y `db.all` de contratos,
  `scripts/remesa_mensual.js:23-31`). No pide importes: los construye del contrato
  (`cuota`, `tipo_iva`, `fecha_alta`, `fecha_baja`) y del cliente (`recargo_equivalencia`,
  `dias_pago`) mediante un `JOIN` (`scripts/remesa_mensual.js:26-28`).

Selección de contratos: `fecha_alta <= último día del mes AND (fecha_baja IS NULL OR
fecha_baja >= primer día)` (`scripts/remesa_mensual.js:26-29`). Un contrato con alta o baja
dentro del mes **entra igualmente** y se prorratea (`scripts/remesa_mensual.js:45-46`). La
consulta no lleva `ORDER BY` (hallazgo H7).

### 3.2 Módulos que atraviesa y en qué orden

1. `db.inicializar` (`scripts/remesa_mensual.js:23`) y `db.all` de contratos
   (`scripts/remesa_mensual.js:26-29`); si no hay contratos, avisa y termina (`:31`).
2. Procesado **secuencial y recursivo** de los contratos (`procesarSiguiente`,
   `scripts/remesa_mensual.js:34-76`): cada factura se termina antes de empezar la siguiente.
3. Prorrateo propio del script (apartado 3.3).
4. `calculo.calcularFactura(lineas, {recargo_equivalencia: co.recargo_equivalencia})`
   (`scripts/remesa_mensual.js:55`).
5. `numeracion.siguienteNumero('FA', ...)` (`scripts/remesa_mensual.js:57`).
6. `INSERT INTO facturas` con estado literal `'emitida'`
   (`scripts/remesa_mensual.js:61-62`); `fecha` = último día del mes (`:59`); `venc =
   util.sumarDias(fecha, co.dias_pago || 30)` (`:60`).
7. `INSERT INTO lineas` de la línea única (`calc.lineas[0]`,
   `scripts/remesa_mensual.js:66-68`); un error aborta todo el proceso con `exit 1`
   (`:69-70`).
8. Log por consola (`:71`) y siguiente contrato (`:72`); al acabar, resumen y `exit 0`
   (`:37-40`).

### 3.3 Cálculos que se aplican (función exacta)

- **Prorrateo propio, inline**: `diasMes = util.diasDelMes(primerDia)` (**días reales** del
  mes, `lib/util.js:36-39`), `diasServicio = díaHasta - díaDesde + 1` e
  `importe = util.redondear2(cuota / diasMes * diasServicio)`
  (`scripts/remesa_mensual.js:47-51`). **No** usa `calculo.calcularProrrateo`
  (`services/calculo.js:95-102`), que divide entre 30 (mes comercial) — divergencia con la
  pantalla de baja de contratos, que sí usa esa función (`routes/contratos.js:39`; zona oscura
  17 del mapa y apartado 6.4).
- **`calculo.calcularFactura`** (`services/calculo.js:48-88`), idéntica a la del camino A, con
  una única línea `{descripcion: concepto + sufijo, cantidad: 1, precio: importe, tipoIva:
  co.tipo_iva}` (`scripts/remesa_mensual.js:53-54`). El sufijo es `'(N dias)'` si hay
  prorrateo y `'(nombre del mes)'` si el mes está completo (`scripts/remesa_mensual.js:53`;
  `nombreMes` en `:80-84`).
- Consecuencia verificable: al pasar por `calcularFactura`, una cuota prorrateada (o completa)
  por encima de 1000 € **activa el descuento por volumen** (`services/calculo.js:39-43`,
  aplicado en `:65-71`) y la línea se graba con el precio rebajado — sin que nada lo indique en
  observaciones (hallazgo H1).
- **`util.sumarDias`** (`lib/util.js:20-26`) para el vencimiento
  (`scripts/remesa_mensual.js:60`).

### 3.4 Número de factura

Mismo mecanismo que el camino A y misma serie `FA` (`scripts/remesa_mensual.js:57` →
`lib/numeracion.js:14-36`), con dos particularidades:

- El año del número es el año **en que se ejecuta** el script (`lib/numeracion.js:15`), pero
  la fecha de la factura es el último día del **mes facturado** (`scripts/remesa_mensual.js:59`).
  Lanzando el día 1 de enero la remesa de diciembre, el número llevaría el año nuevo y la fecha
  el anterior (hallazgo H2).
- El número se reserva antes del `INSERT` de cabecera (`scripts/remesa_mensual.js:57→61`):
  un fallo del `INSERT` deja el
  contador avanzado (hallazgo H3), y al abortar en mitad de la remesa (`exit 1` en `:64,70`)
  quedan facturados solo los contratos ya procesados. La remesa no es idempotente: reintentar
  el mes completo duplica facturas (zona oscura 18 del mapa).

### 3.5 Escrituras en la base de datos (orden)

Por cada contrato (repetido N veces):

| # | Operación | Tabla | Evidencia |
|---|---|---|---|
| 1 | `SELECT` de contratos con `JOIN` de clientes (una vez, al empezar) | `contratos`, `clientes` | `scripts/remesa_mensual.js:26-29` |
| 2 | `SELECT` del contador | `contadores` | `lib/numeracion.js:16` (vía `:57`) |
| 3 | (solo año nuevo) `INSERT` del contador a 0 | `contadores` | `lib/numeracion.js:20-21` |
| 4 | `UPDATE` del contador a `ultimo + 1` | `contadores` | `lib/numeracion.js:32` |
| 5 | `INSERT` de cabecera: 11 columnas, serie `FA`, estado `'emitida'`, observaciones fijas `'Remesa <mes>'` | `facturas` | `scripts/remesa_mensual.js:61-62` |
| 6 | `INSERT` de la línea única calculada | `lineas` | `scripts/remesa_mensual.js:66-68` |

Sin transacción (grep `BEGIN|COMMIT|transaction` sin resultados). Tampoco este camino llama al
módulo de correo.

### 3.6 Estado tras la creación

`'emitida'` literal (`scripts/remesa_mensual.js:62`). Después, los mismos cambios de estado
que el camino A (sección 5). Relación con el camino A: cuando una baja de contrato cae a mitad
de mes, la remesa del mes siguiente ya no la incluye y administración emite **a mano** el
prorrateo final por el formulario manual, con el importe que calcula la pantalla de contratos
(`routes/contratos.js:31-43`; nota de la vista `views/contratos.ejs:17`; zona oscura 8 del
mapa).

## 4. Camino C: rectificación de una factura existente

### 4.1 Entradas

- `:id` de la factura a rectificar en la URL, y `motivo` opcional del formulario del detalle
  (`views/factura_detalle.ejs:49-51`, campo `motivo` en `:50`).
- **No recibe importes ni líneas**: todo se copia de la factura original. El botón solo se
  ofrece si la original está `emitida` y es de serie `FA` (`views/factura_detalle.ejs:47`), pero
  la ruta no rechaza las cobradas (zona oscura 14 del mapa).

### 4.2 Módulos que atraviesa y en qué orden

1. `SELECT f.*, c.nombre FROM facturas JOIN clientes` de la original
   (`routes/facturas.js:130`); 404 si no existe (`:131`).
2. Guardas: `400 'Ya esta rectificada'` si el estado es `rectificada` (`:132`);
   `400 'No se rectifica una rectificativa'` si la serie es `RE` (`:133`).
3. `SELECT * FROM lineas WHERE factura_id = ?` (`routes/facturas.js:135`).
4. `numeracion.siguienteNumero('RE', ...)` (`routes/facturas.js:138`).
5. `INSERT INTO facturas` de la rectificativa, con estado literal `'emitida'`
   (`routes/facturas.js:141-143`).
6. `INSERT INTO lineas` por línea, copiada con signo invertido
   (`routes/facturas.js:148-150`); el callback **ignora el error** de cada insert
   (`:151-158`; zona oscura 13 del mapa).
7. `UPDATE facturas SET estado = 'rectificada'` sobre la original (`:154`), que también ignora
   su error.
8. Redirección al detalle de la rectificativa (`:155`).

El comentario del propio fichero deja el diseño por escrito: «aquí NO se recalcula nada, se
invierte lo que hay (Puri dixit: la rectificativa tiene que ser espejo exacto de la original)»
(`routes/facturas.js:127-128`).

### 4.3 Cálculos que se aplican

**Ninguno.** Este camino no llama a `services/calculo.js` ni a `lib/util.js` para importes; la
única transformación es la inversión de signos hecha a mano en el `INSERT`:

- Cabecera: `-f.base`, `-f.iva`, `-f.recargo`, `-f.total` (`routes/facturas.js:142`).
- Líneas: descripción prefijada `'Rectificación: '`, `-l.cantidad`, **precio positivo**
  `l.precio`, `tipo_iva` igual, y `-l.base`, `-l.cuota_iva`, `-l.cuota_recargo`
  (`routes/facturas.js:150`).
- Fecha de la rectificativa: `util.hoy()` (día de la operación, no el de la original);
  `vencimiento: null`; `rectifica_a: f.numero` (`routes/facturas.js:142`).
- Observaciones: `'Rectifica ' + f.numero + '. ' + (motivo || '')` (`routes/facturas.js:143`).

### 4.4 Número de factura

`numeracion.siguienteNumero('RE')` (`routes/facturas.js:138`): mismo mecanismo y mismas
limitaciones que en A y B (apartado 2.4), pero con la serie `RE` y su propio contador
(`contadores` por serie-año, `db.js:77-81`). Formato resultante `RE-2026-000001`
(`lib/numeracion.js:38-42`; dato real en la BD local, sección 5.3). También aquí el número se
reserva antes de grabar la cabecera (`routes/facturas.js:138→141`).

### 4.5 Escrituras en la base de datos (orden)

| # | Operación | Tabla | Evidencia |
|---|---|---|---|
| 1 | `SELECT` de la original con cliente | `facturas`, `clientes` | `routes/facturas.js:130` |
| 2 | `SELECT` de las líneas originales | `lineas` | `routes/facturas.js:135` |
| 3 | `SELECT` del contador `RE` | `contadores` | `lib/numeracion.js:16` (vía `:138`) |
| 4 | (solo año nuevo) `INSERT` del contador a 0 | `contadores` | `lib/numeracion.js:20-21` |
| 5 | `UPDATE` del contador a `ultimo + 1` | `contadores` | `lib/numeracion.js:32` |
| 6 | `INSERT` de la rectificativa: 12 columnas (incluye `rectifica_a`), serie `RE`, estado `'emitida'` | `facturas` | `routes/facturas.js:141-143` |
| 7 | `INSERT` de cada línea invertida, una a una, sin transacción y sin gestión de error | `lineas` | `routes/facturas.js:148-150` |
| 8 | `UPDATE` de la original a `'rectificada'` — **después** de grabar todas las líneas | `facturas` | `routes/facturas.js:154` |

Si el proceso muere entre los pasos 6 y 8, la rectificativa ya existe pero la original sigue
`emitida`: dos documentos vivos para el mismo abono (hallazgo H8).

### 4.6 Estado tras la creación

La rectificativa nace `'emitida'` (`routes/facturas.js:142`) y la original pasa a
`'rectificada'` (`routes/facturas.js:154`). Una rectificativa no puede, a su vez, rectificarse
(guarda `:133`); puede marcarse cobrada por `POST` directo, aunque el botón esté oculto para su
serie (sección 5 y hallazgo H6).

## 5. Estados de la factura: quién crea cada uno y quién lo cambia

### 5.1 Valores posibles y transiciones

Los tres únicos valores que el código escribe son `emitida`, `cobrada` y `rectificada`
(verificado con grep de `INSERT INTO facturas` y `UPDATE facturas SET estado`; el comentario
del esquema enumera los mismos tres, `db.js:61`, y la columna no tiene restricción `CHECK`,
`db.js:50-63`).

| Transición | Quién la provoca | Dónde | Condición |
|---|---|---|---|
| (nacimiento) → `emitida` | el propio `INSERT` de cualquiera de los tres caminos | `routes/facturas.js:75`, `scripts/remesa_mensual.js:62`, `routes/facturas.js:142` | incondicional |
| `emitida` → `cobrada` | usuario, botón «Marcar cobrada» → `POST /facturas/:id/cobrar` | `routes/facturas.js:117-122` | `UPDATE ... WHERE id = ? AND estado = 'emitida'` (`:118`): **solo** desde `emitida`. La ruta no filtra por serie: una `RE` puede cobrarse por `POST` directo; el botón solo se muestra para serie `FA` y estado `emitida` (`views/factura_detalle.ejs:47-48`) |
| `emitida` o `cobrada` → `rectificada` | usuario, botón «Rectificar (abono total)» → `POST /facturas/:id/rectificar`, que además crea la `RE` espejo | `routes/facturas.js:129-164` | guardas solo contra `rectificada` y serie `RE` (`:132-133`); la vista ofrece el botón únicamente para `emitida` + serie `FA` (`views/factura_detalle.ejs:47`) |

- **No hay vuelta atrás**: solo existen dos `UPDATE` de estado en toda la aplicación
  (`routes/facturas.js:118` y `:154`); ninguna ruta vuelve a `emitida` ni reabre una
  `cobrada`.
- **No hay borrado**: grep `DELETE FROM` sin resultados en el código. Coherente con la regla
  legal del propio código: las facturas no se borran nunca y los errores se corrigen con
  rectificativa (`lib/numeracion.js:3-6`).
- Estados terminales: `cobrada` (salvo rectificarla por `POST`) y `rectificada` (el cobro ya no
  le aplica, `routes/facturas.js:118`, y la rectificación la bloquea, `routes/facturas.js:132`).

### 5.2 Quién lee el estado (sin cambiarlo)

- Listado con filtro: `routes/facturas.js:16-26`, desplegable `emitida/cobrada/rectificada`
  (`views/facturas.ejs:7-9`).
- Vista imprimible: pinta el estado y condiciona los botones
  (`views/factura_detalle.ejs:14,47`).
- Tablero de inicio: cuenta pendientes (`estado = 'emitida'`) y suma el importe pendiente solo
  de la serie `FA` (`server.js:22-24`); la serie `RE` queda fuera (zona oscura 9 del mapa).
- CSV para la gestoría: exporta **todas** las facturas del año con su estado, sin netear
  (`routes/informes.js:36,41,45`; zona oscura 10 del mapa).
- Informe trimestral de IVA: **no filtra por estado**: suma las líneas de todas las facturas
  del trimestre y las `RE` entran con signo negativo «y cuadran solas»
  (`routes/informes.js:21-25`).

### 5.3 Evidencia de datos reales (BD local, 2026-10-28)

Consulta de solo lectura sobre `datos/gesfact.db` (base local generada por la siembra):
agrupación por estado y serie → `cobrada/FA: 4`, `emitida/FA: 3`, `emitida/RE: 1`,
`rectificada/FA: 1`; contadores → `FA-2026: 108`, `RE-2026: 1`; par rectificativo →
`RE-2026-000001`, estado `emitida`, `rectifica_a = 'FA-2026-000106'`, total `-122,23`.
Coincide con la siembra (`db.js:126-177`) y materializa el ciclo: una `FA` marcada
`rectificada` (`db.js:156`) y su `RE` espejo nacida `emitida` (`db.js:160-162`).

## 6. Puntos donde dos caminos hacen «lo mismo» con código distinto

1. **`INSERT` de cabecera en `facturas`**: A (`routes/facturas.js:74-76`) y B
   (`scripts/remesa_mensual.js:61-62`) repiten dos textos SQL casi idénticos e independientes;
   C usa un `INSERT` distinto de 12 columnas con `rectifica_a` (`routes/facturas.js:141-143`).
   Un cambio de esquema hay que hacerlo en tres sitios.
2. **`INSERT` de líneas**: los tres repiten el mismo `INSERT` de 8 columnas
   (`routes/facturas.js:86-87`, `routes/facturas.js:149-150`,
   `scripts/remesa_mensual.js:67-68`) con **tres gestiones de error distintas** para la misma
   operación: A acumula `huboError` y responde 500 (`routes/facturas.js:83-92`); B aborta el
   proceso completo con `exit 1` (`scripts/remesa_mensual.js:69-70`); C ignora el error por
   completo (callback sin parámetro de error, `routes/facturas.js:151-158`).
3. **Vencimiento**: A usa `cliente.dias_pago || config.VENCIMIENTO_DIAS`
   (`routes/facturas.js:68`; `config.js:40` vale 30); B usa `co.dias_pago || 30` con el 30
   **literal** (`scripts/remesa_mensual.js:60`). Hoy dan el mismo número solo porque
   `VENCIMIENTO_DIAS` es 30: si el negocio cambia la configuración, la remesa no cambia.
4. **Prorrateo del mes**: B lo calcula inline con los **días reales** del mes
   (`scripts/remesa_mensual.js:47-51`); la pantalla de baja de contratos, para el mismo
   concepto, usa `calculo.calcularProrrateo` con **mes comercial de 30 días**
   (`routes/contratos.js:39`; `services/calculo.js:95-102`). Dos importes distintos para la
   misma operación de negocio (zona oscura 17 del mapa, con ejemplo numérico).
5. **Nota del descuento por volumen**: A la añade a las observaciones cuando se activa
   (`routes/facturas.js:76`); B graba siempre `'Remesa <mes>'` aunque el mismo cálculo haya
   aplicado el descuento (`scripts/remesa_mensual.js:62`); C pone su propia fórmula
   (`routes/facturas.js:143`). La misma circunstancia (hay descuento) es visible en un camino
   y no en el otro.
6. **Objeto «cliente» que entra en el cálculo**: A pasa la fila completa de `clientes`
   (`routes/facturas.js:46,66`); B pasa un objeto sintético de una propiedad,
   `{recargo_equivalencia: ...}`, construido con `JOIN` (`scripts/remesa_mensual.js:26-28,55`).
   Hoy son equivalentes porque `calcularFactura` solo lee `recargo_equivalencia`
   (`services/calculo.js:49`), pero el contrato implícito de la función es distinto en cada
   camino.
7. **Año del número**: los tres usan `new Date().getFullYear()`
   (`lib/numeracion.js:15`), el año de la **ejecución**, no el de la **fecha** de la factura
   (`routes/facturas.js:44`; `scripts/remesa_mensual.js:59`). En B (día 1) y en A (fecha
   editable) número y ejercicio pueden divergir (hallazgo H2).
8. **Estado inicial `'emitida'`**: los tres caminos lo escriben como literal en el `INSERT`
   (`routes/facturas.js:75`; `scripts/remesa_mensual.js:62`; `routes/facturas.js:142`) pese a
   existir `DEFAULT 'emitida'` en la columna (`db.js:61`).
9. **Envío por correo**: solo A llama a `email.enviarFactura`
   (`routes/facturas.js:93`), y es un stub (`services/email.js:26-28`); B y C ni lo llaman.
10. **Consumo de numeración**: los tres reservan el número **antes** de grabar la cabecera
    (`routes/facturas.js:71→74`; `scripts/remesa_mensual.js:57→61`;
    `routes/facturas.js:138→141`): mismo patrón, y mismo hueco de serie si el `INSERT` falla
    (hallazgo H3).
11. **Recalcular frente a copiar**: A y B calculan los importes desde cero con
    `services/calculo.js`; C copia e invierte lo ya grabado sin recalcular
    (`routes/facturas.js:127-128,142,150`). Mismas tablas `facturas`/`lineas`, dos semánticas
    distintas (intencionado según el testimonio interno del comentario, `:127-128`).

## 7. Hallazgos detectados al recorrer el flujo (se registran, no se corrigen)

Ya registrados en `specs/000-reconocimiento/mapa-sistema.md` y reconfirmados aquí con su
evidencia en el flujo: zonas oscuras **8** (prorrateo copiado de la URL), **9** (tablero ignora
`RE`), **10** (CSV sin netear), **11** (numeración no atómica), **12** (alta sin transacción y
`NaN`), **13** (rectificación ignora errores de línea), **14** (rectificar cobradas por
`POST`), **15** (`sumarDias` con milisegundos), **17** (dos prorrateos) y **18** (remesa no
idempotente y 30 literal).

Nuevos, pendientes de incorporar al registro de anomalías cuando este se defina (conforme a
`AGENTS.md`):

- **H1 [riesgo] Descuento por volumen silencioso en la remesa.** Una cuota mensual (o su
  prorrateo) por encima de 1000 € pasa por `porcentajeDescuento` dentro de `calcularFactura`
  (`services/calculo.js:39-43,60-71`, invocada desde `scripts/remesa_mensual.js:55`) y se
  graba rebajada, sin nota en observaciones (`scripts/remesa_mensual.js:62`), a diferencia del
  camino manual (`routes/facturas.js:76`). `SUPOSICIÓN`: ¿se desea aplicar ese descuento a
  una única cuota de contrato?
- **H2 [rareza] El año del número no es el año de la factura.** `lib/numeracion.js:15` usa el
  año en curso de ejecución; la fecha grabada puede ser de otro ejercicio
  (`scripts/remesa_mensual.js:59`; `routes/facturas.js:44`). La serie «por año» y el ejercicio
  contable pueden divergir (remesa de diciembre lanzada el 1 de enero).
- **H3 [riesgo] El número se consume aunque la cabecera falle.** Reserva del contador antes
  del `INSERT` de `facturas` en los tres caminos (`routes/facturas.js:71→74`;
  `scripts/remesa_mensual.js:57→61`;
  `routes/facturas.js:138→141`): un fallo posterior deja la serie con hueco, sin rastro en
  `facturas`. Distinto del duplicado de la zona oscura 11.
- **H4 [rareza] El alta manual acepta clientes inactivos.** El desplegable solo lista activos
  (`routes/facturas.js:31`), pero el `POST` consulta sin filtro de `activo`
  (`routes/facturas.js:46`).
- **H5 [riesgo] Fecha libre sin validar en el alta manual.** Cualquier texto llega tal cual a
  la columna `fecha` y produce un vencimiento `NaN-NaN-NaN` (reproducido el 2026-10-28 con
  `node -e` sobre módulos puros: `util.sumarDias('basura', 30)` → `'NaN-NaN-NaN'`;
  `routes/facturas.js:44,69`).
- **H6 [rareza] Una rectificativa puede cobrarse por `POST` pero no desde la pantalla.** La
  ruta del cobro no filtra serie (`routes/facturas.js:118`) y una `RE` nace `emitida`
  (`routes/facturas.js:142`); el botón se oculta para serie `RE` (`views/factura_detalle.ejs:47`). Además la
  `RE` nace sin vencimiento (`routes/facturas.js:142`, columna a `null`).
- **H7 [rareza] La remesa asigna números sin orden explícito.** La consulta de contratos no
  lleva `ORDER BY` (`scripts/remesa_mensual.js:26-29`): el orden de asignación es el de
  devolución de SQLite, no un criterio del negocio.
- **H8 [riesgo] Rectificación a medias deja dos documentos vivos.** Entre el `INSERT` de la
  `RE` (`routes/facturas.js:141-150`) y el `UPDATE` de la original (`:154`) no hay transacción
  ni recuperación: si el proceso muere, la original sigue `emitida` y ya existe su abono.

## 8. Preguntas abiertas para el negocio (SUPOSICIÓN)

1. ¿Debe aplicarse el descuento por volumen a una cuota mensual de contrato, y si se aplica,
   debe reflejarse en las observaciones como en el camino manual? (H1)
2. ¿El año del número de factura debe ser el de su fecha o el de la fecha de emisión? (H2;
   especialmente la remesa lanzada el día 1 de enero)
3. ¿Una rectificativa debe poder marcarse cobrada, y debe llevar vencimiento? (H6)
4. ¿Se admite facturar por `POST` a un cliente inactivo, o el alta manual debe rechazarlo? (H4)
5. Siguen abiertas las preguntas 3 (prorrateo correcto: 30 días frente a días reales) y 4
   (¿se permite rectificar una factura ya cobrada?) de `specs/000-reconocimiento/mapa-sistema.md`.
