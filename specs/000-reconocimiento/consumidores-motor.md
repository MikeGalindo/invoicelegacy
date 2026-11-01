# Consumidores del motor de cálculo y decisión de primera extracción

**Fecha:** 2026-10-30
**Fase:** modernización, antes de abrir la spec 001.
**Módulo analizado:** `services/calculo.js` (motor de cálculo de importes, spec 001 de
`propuesta-particion-specs.md`).
**Fuentes:** `services/calculo.js`, `lib/util.js`, `lib/numeracion.js`, `routes/*.js`,
`scripts/remesa_mensual.js`, `server.js`, `test/*.test.js`, `test/golden/flujo-central.js`,
`test/COBERTURA.md`, `registro-anomalias.md` y `propuesta-particion-specs.md`.
**Línea base verificada:** `npm test` → **116 tests, 116 en verde** (2026-10-30).
**Nota de nomenclatura:** el repositorio usa `test/`, no `tests/`; los conteos de este documento
se refieren a `test/*.test.js` y al modelo `test/golden/flujo-central.js`.

> Este documento no modifica código, tests, datos ni decisiones. Solo registra evidencia y una
> recomendación de prioridad. Cualquier extracción posterior exige spec aprobada, caracterización
> previa y verificación de equivalencia (constitución, Principios I, II y III).

---

## 0. Resumen ejecutivo

Se evaluaron los módulos extraíbles que evidencian las specs 001 a 009. La recomendación es
**extraer primero `services/calculo.js` (motor de cálculo, spec 001)**, por cuatro razones:

1. Es el único módulo con caracterización completa de todas sus funciones exportadas: **46 tests lo
   ejecutan** y el golden master cubre **12 casos** del flujo central.
2. Es **puro**: no toca base de datos, red ni reloj; solo depende de `lib/util.redondear2`.
3. Tiene **bajo acoplamiento**: únicamente **3 consumidores de producción** (`routes/facturas.js`,
   `routes/contratos.js` y `scripts/remesa_mensual.js`) y **5 importadores de test**.
4. Es el punto de máximo riesgo económico: todas las facturas, manuales o de remesa, y todas las
   rectificativas pasan por él. Aislarlo reduce el riesgo de la modernización sin cambiar ni un
   céntimo del comportamiento congelado.

La extracción del motor es una **extracción de equivalencia**, no un cambio funcional: A-09 ya
describe el comportamiento actual y A-22/A-23 son deuda técnica. Por eso no requiere decidir un
cambio de negocio; requiere demostrar que la implementación nueva produce exactamente la misma
salida que la vieja.

---

## 1. Criterio y método

### 1.1 Los tres criterios pedidos

1. **Valor de negocio de modernizarlo.** Se mide por dos componentes:
   - **criticidad**: cuánto dinero, obligación legal o dependencia externa pasa por el módulo;
   - **presión de cambio**: cuántas anomalías del registro lo tocan y en qué estado están.
2. **Cobertura actual de characterization tests.** Se cuenta cuántos tests de `test/` **ejecutan**
   el módulo, separando los que solo lo congelan por inspección de fuente o por fixture.
3. **Acoplamiento.** Se listan todos los consumidores, con fichero y línea, y se clasifica cada
   función como pura o con efectos de base de datos, red o reloj.

### 1.2 Regla de conteo de tests

Un test cuenta como **ejecutor** si, al correr, llama a una función del módulo. Cuenta como
**congelación por fuente** si solo lee el texto del fichero o un fixture. Un mismo test puede tocar
varios módulos; por eso los conteos de candidatos **no son sumables** hasta 116. Se indica también
cuándo un módulo se ejecuta de forma **transitiva** a través de otro.

### 1.3 Estado real de las decisiones

La constitución (Principio I) es explícita: las decisiones del acta de 2026-10-30 son una
simulación y **siguen pendientes de ratificación real**. Por tanto:

- `RESUELTA_NEGOCIO` significa «decisión registrada, pendiente de ratificación y de implementación»;
  no autoriza por sí sola un cambio de comportamiento hasta que se ratifique con nombre y fecha.
- `RESUELTA_PROPUESTA` es una propuesta del analista; **no es una decisión del negocio**.
- `ABIERTA_TECNICA` es deuda técnica; no forma parte de la agenda de negocio.

En la tabla se citan todas las entradas que tocan cada candidato, con su estado, para que la
prioridad no se confunda con una autorización.

---

## 2. Comparativa de candidatos

| # | Candidato (módulo) | Spec(s) | Decisiones y anomalías que lo tocan | Tests que lo ejercitan | Acoplamiento e IO | Valoración |
|---|---|---|---|---|---|---|
| 1 | `services/calculo.js` — motor de cálculo | 001 | **A-09** `RESUELTA_NEGOCIO` (D-07/N-07; confirma el comportamiento actual, no lo cambia); **A-22** y **A-23** `ABIERTA_TECNICA`; citas de A-14 y A-15 | **46 ejecutan** (28 de `calculo.test.js`, 10 de `reglas-negocio.test.js`, 5 de `anomalias.test.js`, 2 de `contradicciones.test.js`, 1 del golden master). **12 casos** golden dentro de 1 test | **Puro**. Único `require`: `lib/util` (`calculo.js:9`), y solo usa `redondear2`. 3 consumidores de producción. Sin BD, red ni reloj | **Primero** |
| 2 | `lib/util.js` — utilidades de fecha, NIF y formato | 002, 005, 006, 007, 008 (transversal) | **A-13**, **A-14**, **A-16** `RESUELTA_NEGOCIO`; **A-21** `ABIERTA_TECNICA`; citas de A-05, A-12 y A-23 | **36 ejecutan directamente** (17 propios + 7 de `reglas-negocio.test.js` + 6 de `anomalias.test.js` + 5 de `contradicciones.test.js` + 1 golden). **81** si se suma la ejecución transitiva vía `redondear2` en los 46 del motor (36 + 46 − 1: el golden es el único test común) | **Mixto**: funciones puras (`redondear2`, `fechaBonita`, `diasDelMes`, `validarNIF`, `formatearImporte`) y funciones de reloj (`hoy` en `util.js:10-15`, `sumarDias` en `util.js:20-26`). **6 importadores de producción**. Muy alta fan-in y transversal a todas las specs | No primero; extraer después, con cuidado |
| 3 | `lib/numeracion.js` — numeración y series | 004 | **A-02** y **A-03** `RESUELTA_NEGOCIO`; **R1/R28** como riesgo técnico | **12 ejecutan** (11 de `numeracion.test.js` + A-03 de `anomalias.test.js`). **1 más** congela A-02 solo por fuente | **BD + reloj**. `require('../db')` en `numeracion.js:12`; `new Date().getFullYear()` en `:15`; `db.get`/`db.run` en `:16`, `:20`, `:32`. 2 ficheros de producción y 3 puntos de llamada. No es puro; callbacks asíncronos | **Segundo candidato**, pero no primero |
| 4 | `routes/facturas.js` — emisión, cobro y rectificación | 002, 003 | **A-04**, **A-05** y **A-15** `RESUELTA_NEGOCIO`; **A-17**, **A-06** y **A-08** `RESUELTA_PROPUESTA`; citas de A-01 y A-12 | **0 ejecutan la ruta HTTP**. **12 congelan por fuente** (A-01, A-04, A-06, A-08, A-12, A-17 y contradicciones 03, 04, 05, 06, 08, 09). 1 caso golden modela la rectificación; 2 fixtures (A-15/A-19) validan datos del dominio, no la ruta | **BD + red (Express) + reloj**. `util.hoy()` en `:44` y `:142`; `calculo` en `:9`; `numeracion` en `:10`; `email` en `:11`; `config` en `:12`. No es puro; 166 líneas con varias responsabilidades | No primero; exige caracterización HTTP previa |
| 5 | `routes/contratos.js` — contratos y prorrateo | 005 | **A-11** `RESUELTA_NEGOCIO`; **A-20** `RESUELTA_PROPUESTA`; citas de A-04 y A-14 | **0 ejecutan la ruta HTTP**. **6 congelan por fuente** (A-14, A-20 y contradicciones 02, 04, 08, 09). **7 tests** cubren la fórmula de prorrateo, pero lo hacen a través del motor o del golden, no de la ruta | **BD + red (Express) + reloj**. `util.hoy()` en `:21` y `:32`; `calculo.calcularProrrateo` en `:39`. No es puro | No primero; la fórmula ya vive en el motor |
| 6 | `scripts/remesa_mensual.js` — remesa mensual | 006 | **A-01** y **A-12** `RESUELTA_NEGOCIO`; **A-07** `RESUELTA_PROPUESTA`; **R4** | **0 ejecutan el job**. **11 congelan por fuente** (A-01, A-07, A-11, A-12, R4 y contradicciones 01, 02, 03, 05, 06, 08). 2 tests modelan su fórmula (C01 por días reales y golden de prorrateo), no su escritura real | **BD + reloj + proceso**. `require('../db')` en `:9`; `util.diasDelMes`/`sumarDias` en `:21`, `:47`, `:60`; `calculo` en `:11`; `numeracion` en `:12`; `process.exit` en varias ramas. No es puro y **emite facturas reales** | No primero; necesita test end-to-end sobre base desechable |
| 7 | `routes/informes.js` + `server.js` — informes, CSV y tablero | 007 | **A-10** y **A-15** `RESUELTA_NEGOCIO`; **A-19** `RESUELTA_PROPUESTA` | **0 ejecutan la ruta, el SQL o el CSV**. 1 test congela A-10 por fuente (`server.js`); 3 tests usan fixtures del dominio (A-15, A-19, contradicción 07); el CSV no tiene ningún test | **BD + red (Express) + reloj**. `new Date()` en `informes.js:10`, `:15`, `:35`; `util` para formato. No es puro | No primero, aunque el valor de negocio del CSV es alto; cobertura ejecutable nula |
| 8 | `routes/clientes.js` + `routes/articulos.js` — datos maestros | 008 | **A-13**, **A-14** y **A-16** `RESUELTA_NEGOCIO`; **A-21** `ABIERTA_TECNICA`; A-04 por la condición de cliente activo | **0 ejecutan las rutas HTTP**. 3 tests congelan por fuente (A-14 y contradicciones 04 y 09). `validarNIF` tiene 1 test puro (RN-16), pero la ruta de clientes no se ejecuta | **BD + red (Express) + config**. No es puro. Parte del problema de A-13/A-16 vive en la conversión copiada de las rutas y en `util` | No primero; además A-13/A-16 son transversales |
| 9 | `services/email.js`, `db.js` y spec 009 | 009 / infraestructura | Email: ninguna decisión (R13 excluido; stub desde 2022). `db.js`: ninguna decisión propia; soporta A-15/A-19. Spec 009: **A-18** `RESUELTA_PROPUESTA` | Email: 0. `db.js`: 0 ejecutan SQLite real. Spec 009: 1 test documental (A-18) | Email: stub con `console.log`; no red. `db.js`: abre SQLite al hacer `require` y crea esquema; infraestructura global. Spec 009: proceso humano, sin código | No son candidatos de primera extracción |

### 2.1 Lectura de la tabla

- **El motor no es el que más cambios pendientes tiene.** Si el único criterio fuera «qué decisión
  pendiente implementar antes», ganarían las rutas de facturas (002/003), la remesa (006) o los
  informes (007). Pero la constitución exige **caracterización previa** y **equivalencia** antes de
  extraer; esos módulos tienen cero tests que ejecuten HTTP, SQL o el job.
- **El motor es el que mejor combina criticidad y seguridad de extracción.** Su comportamiento es
  el más crítico y, a la vez, el mejor congelado. Es el único candidato que permite hacer la primera
  extracción sin abrir a la vez un debate de cambio de comportamiento.
- **La numeración es el segundo candidato natural**, pero su extracción toca BD y reloj y las
  decisiones A-02/A-03 sí cambian comportamiento (año de la fecha y reutilización del número). Eso
  la convierte en un módulo de comportamiento, no solo de equivalencia, y aumenta el riesgo legal.
- **`lib/util.js` no debe ir primero** aunque tenga 36 tests: es transversal, lo importan 6 módulos
  de producción y mezcla funciones puras con reloj. Extraerlo primero obligaría a tocar el motor y
  casi todas las rutas, rompiendo la regla de «un módulo a la vez».

---

## 3. Recomendación razonada

### 3.1 Decisión

**Extraer primero `services/calculo.js` con la spec 001 («Cálculo de importes, descuentos y
redondeo»), sin cambiar su comportamiento observable.**

### 3.2 Por qué

1. **Cumple la precondición de la constitución.** El Principio II exige cobertura de caracterización
   previa, incluidos los caminos congelados solo por fuente. El motor es el único módulo cuyas cinco
   funciones exportadas están cubiertas directamente por tests y por el golden master. No hay que
   abrir una línea de investigación de comportamiento antes de extraerlo.
2. **Es puro y determinista.** `calculo.js` solo hace aritmética y `Math.round`; no lee la hora, no
   abre la BD y no hace red. Su única dependencia es `util.redondear2`, también pura. Una fachada
   nueva puede compararse con la vieja función a función, sin dobles de BD ni servidor HTTP.
3. **El acoplamiento es pequeño y conocido.** Solo tres módulos de producción lo consumen, y solo
   usan dos de sus cinco exports: `calcularFactura` y `calcularProrrateo`. Los otros tres
   (`recargoPara`, `calcularLinea`, `porcentajeDescuento`) son API interna/test-facing. Esto permite
   una costura limpia: se conserva la misma API y se cambia la implementación por detrás.
4. **El coste de un error es máximo.** El aviso de `calculo.js:3-7` lo dice: la gestoría cuadra
   línea a línea y un cambio de redondeo devolvió un trimestre entero. Aislar y verificar el motor
   es la inversión de mayor retorno en reducción de riesgo.
5. **No hay que decidir un cambio de negocio para extraerlo.** A-09 ya describe el comportamiento
   actual (el descuento reduce base, IVA y recargo) y A-22/A-23 son rarezas técnicas congeladas. La
   extracción puede ser una sustitución equivalente, no una modificación funcional. Eso respeta los
   Principios I y V y evita tocar facturas históricas.
6. **Crea el patrón para los demás.** El arnés de equivalencia (viejo vs. nuevo, mismos fixtures,
   mismo golden master) queda probado en el módulo más simple y más crítico; después se reutiliza en
   numeración, rutas, remesa e informes.

### 3.3 Qué no hacer en esta primera extracción

- No cambiar la fórmula, el orden de redondeo ni los umbrales.
- No «arreglar» A-22 (IVA en cadena sin recargo) ni A-23 (`-0`); siguen congelados.
- No tocar A-09: ya es el comportamiento actual; si algún día se ratifica, seguirá sin cambio.
- No modificar `routes/facturas.js`, `routes/contratos.js` ni `scripts/remesa_mensual.js` más allá
  del punto de costura.
- No recalcular facturas emitidas ni regenerar el golden master.
- No extraer a la vez `lib/util.js`; `redondear2` se queda donde está y se consume igual.

### 3.4 Orden sugerido después del motor

1. **004 — Numeración**, tras añadir una prueba de concurrencia real o aceptar explícitamente el
   doble de BD; es pequeño y ya tiene 12 tests, pero exige seam de BD/reloj y ratificar A-02/A-03.
2. **008 — Formatos y datos maestros**, empezando por las funciones puras de `util` y dejando
   `hoy`/`sumarDias` para el final; es transversal y necesita coordinación con todos los consumidores.
3. **002/003 — Rutas de facturas**, después de crear tests HTTP con SQLite temporal o doble de
   `db.js`.
4. **006 — Remesa**, después de un test end-to-end sobre copia desechable; es el candidato de mayor
   riesgo operativo.
5. **007 — Informes/CSV**, después de tests de SQL, CSV y tablero; el formato cerrado de la gestoría
   es comportamiento observable.
6. **009 — Operación**, en paralelo como trabajo documental, sin código.

### 3.5 Acoplamiento de los demás candidatos (importadores y funciones)

Esta tabla completa el criterio (3) para los candidatos descartados como primera extracción. Los
tests se cuentan en la tabla de §2; aquí se listan los **consumidores de producción** y el tipo de IO.

| Candidato | Importadores de producción (fichero:línea) | Funciones o rutas usadas (línea) | IO |
|---|---|---|---|
| `lib/util.js` | `services/calculo.js:9`; `routes/facturas.js:8`; `routes/contratos.js:6`; `routes/clientes.js:6`; `routes/informes.js:6`; `scripts/remesa_mensual.js:10` | `calculo`: `redondear2` (`:27`, `:28`, `:31`, `:57`, `:69`, `:81-83`, `:86`, `:101`). `facturas`: `hoy` (`:44`, `:142`), `sumarDias` (`:69`). `contratos`: `hoy` (`:21`, `:32`). `clientes`: `validarNIF` (`:18`). `informes`: `fechaBonita` (`:43`), `formatearImporte` (`:44-45`). `remesa`: `diasDelMes` (`:21`, `:47`), `redondear2` (`:51`), `sumarDias` (`:60`) | Sin BD ni red. `hoy` y `sumarDias` tocan reloj; el resto es puro. **6 importadores** |
| `lib/numeracion.js` | `routes/facturas.js:10`; `scripts/remesa_mensual.js:12` | `siguienteNumero('FA')` en `facturas.js:71`; `siguienteNumero('RE')` en `facturas.js:138`; `siguienteNumero('FA')` en `remesa_mensual.js:57`. `formatear` no tiene consumidor de producción | BD (`require('../db')` en `numeracion.js:12`; `db.get`/`db.run` en `:16`, `:20`, `:32`) y reloj (`new Date().getFullYear()` en `:15`). No red |
| `routes/facturas.js` | `server.js:41` — `app.use('/facturas', require('./routes/facturas'));` | Handlers: listado `:15`; formulario `:30`; alta `:42`; detalle `:105`; cobro `:117`; rectificación `:129` | BD, HTTP/Express, reloj (`util.hoy()`), `calculo`, `numeracion`, `email` (stub) |
| `routes/contratos.js` | `server.js:40` — `app.use('/contratos', require('./routes/contratos'));` | Handlers: listado `:9`; alta `:16`; baja/prorrateo `:31` | BD, HTTP/Express, reloj (`util.hoy()`), `calculo.calcularProrrateo` |
| `routes/informes.js` | `server.js:42` — `app.use('/informes', require('./routes/informes'));` | Handlers: índice `:9`; informe IVA `:14`; CSV `:34` | BD, HTTP/Express, reloj (`new Date()` en `:10`, `:15`, `:35`), `util.fechaBonita`/`formatearImporte` |
| `routes/clientes.js` | `server.js:38` — `app.use('/clientes', require('./routes/clientes'));` | Handlers: listado `:8`; alta `:15`; baja `:32` | BD, HTTP/Express, `util.validarNIF` |
| `routes/articulos.js` | `server.js:39` — `app.use('/articulos', require('./routes/articulos'));` | Handlers: listado `:8`; alta `:15`; baja `:26` | BD, HTTP/Express, `config.IVA_DEFECTO` |
| `scripts/remesa_mensual.js` | **Ninguno**: es un punto de entrada CLI (`node scripts/remesa_mensual.js YYYY-MM`), no se importa desde la aplicación | Usa `db.inicializar` (`:23`), `db.all` (`:26`), `calcularFactura` (`:55`), `siguienteNumero` (`:57`), `db.run` (`:61`, `:67`), `process.exit` (`:17`, `:24`, `:30-31`, `:39`, `:58`, `:64`, `:70`) | BD, reloj, proceso. **Emite facturas reales** |
| `server.js` | **Ninguno**: es el punto de entrada de Express (`package.json:7`) | Monta las cinco rutas (`:38-42`); tablero con cuatro consultas (`:20-36`) | BD y HTTP/Express. El tablero usa SQL; el reloj aparece en las rutas montadas, no en `server.js` |
| `services/email.js` | `routes/facturas.js:11` — `var email = require('../services/email');` | `enviarFactura` en `routes/facturas.js:93` | Stub: `console.log` en `email.js:26-28`; no hay red. Desactivado desde 2022 |
| `db.js` | `server.js:11`; `routes/facturas.js:7`; `routes/contratos.js:5`; `routes/clientes.js:5`; `routes/articulos.js:5`; `routes/informes.js:5`; `lib/numeracion.js:12`; `scripts/remesa_mensual.js:9` | `db.get`, `db.all`, `db.run`, `db.inicializar`; abre SQLite al hacer `require` (`db.js:15`) | BD global (SQLite). No red. Efecto lateral en el `require` |

**Lectura:** fuera del motor, todos los candidatos con valor de cambio pendiente mezclan BD y/o reloj,
y varios ni siquiera tienen un importador de producción porque son routers o scripts de entrada. Eso
refuerza que el primer estrangulamiento sea el módulo puro con consumidores explícitos.

---

## 4. Mapa exhaustivo de consumidores del motor (`services/calculo.js`)

### 4.1 API exportada y pureza

| Función | Líneas | Firma | Pureza | Uso interno |
|---|---|---|---|---|
| `recargoPara(tipoIva)` | `calculo.js:12-23` | tipo de IVA → porcentaje de recargo | **Pura**: tabla fija, sin IO, sin reloj | Llamada por `calcularLinea` en `:31` |
| `calcularLinea(cantidad, precio, tipoIva, conRecargo)` | `calculo.js:26-34` | línea cruda → `{base, cuotaIva, cuotaRecargo}` | **Pura**: aritmética + `util.redondear2`; sin IO/reloj | Llamada por `calcularFactura` en `:56` y `:71` |
| `porcentajeDescuento(baseTotal)` | `calculo.js:39-43` | base bruta → 0, 2 o 5 | **Pura**: comparaciones estrictas; sin IO/reloj | Llamada por `calcularFactura` en `:60` |
| `calcularFactura(lineas, cliente)` | `calculo.js:48-88` | líneas + cliente → `{lineas, base, iva, recargo, total, descuentoPct}` | **Pura**: crea objetos nuevos; no muta la entrada; sin IO/reloj | Exportada y consumida por 3 módulos de producción |
| `calcularProrrateo(cuota, desde, hasta)` | `calculo.js:95-102` | cuota + fechas `YYYY-MM-DD` → importe | **Pura**: `split`, `parseInt`, aritmética y `redondear2`; sin IO/reloj | Exportada y consumida por `routes/contratos.js` |

**Evidencia de pureza del módulo:**

- Único `require`: `var util = require('../lib/util');` en `calculo.js:9`.
- No hay `Date`, `Math.random`, `process`, `fetch`, `http`, `db.`, `fs.`, `setTimeout` ni
  `setInterval` en `calculo.js`.
- `lib/util.redondear2` (`util.js:5-7`) es pura: `Math.round(x * 100) / 100`.
- `calculo.js` **no** usa `util.hoy()` ni `util.sumarDias()`, las dos funciones de `util` que sí
  tocan reloj.

### 4.2 Consumidores de producción

| Consumidor | Import | Función usada | Punto(s) de llamada | Uso del resultado | IO del consumidor |
|---|---|---|---|---|---|
| `routes/facturas.js` | `routes/facturas.js:9` — `var calculo = require('../services/calculo');` | `calcularFactura` | `routes/facturas.js:66` | `calc.base`, `calc.iva`, `calc.recargo`, `calc.total`, `calc.descuentoPct` en `:75-76`; `calc.lineas.length` en `:83`; `calc.lineas.forEach` en `:85` | BD (`db.get`/`db.run`), HTTP (Express), reloj (`util.hoy()` en `:44`), numeración (`:71`), email stub (`:93`) |
| `routes/contratos.js` | `routes/contratos.js:7` — `var calculo = require('../services/calculo');` | `calcularProrrateo` | `routes/contratos.js:39` | `importe` → `res.redirect('/contratos?prorrateo=' + importe.toFixed(2))` en `:40` | BD (`db.get`/`db.run`), HTTP (Express), reloj (`util.hoy()` en `:21` y `:32`) |
| `scripts/remesa_mensual.js` | `scripts/remesa_mensual.js:11` — `var calculo = require('../services/calculo');` | `calcularFactura` | `scripts/remesa_mensual.js:55` | `calc.base`, `calc.iva`, `calc.recargo`, `calc.total` en `:62`; `calc.lineas[0]` en `:66`; `calc.total.toFixed(2)` en `:71` | BD (`db.all`/`db.run`), reloj (`util.diasDelMes`/`sumarDias` en `:21`, `:47`, `:60`), numeración (`:57`), `process.exit` |

**Conclusión de producción:** solo **2 de las 5 funciones** se usan fuera del módulo:
`calcularFactura` (2 consumidores) y `calcularProrrateo` (1 consumidor). `recargoPara`,
`calcularLinea` y `porcentajeDescuento` no tienen consumidor de producción directo; solo las usan
el propio motor y los tests.

### 4.3 Consumidores de test

| Fichero | Import | Funciones y líneas | Tests que ejecutan el motor |
|---|---|---|---|
| `test/calculo.test.js` | `test/calculo.test.js:5` | `recargoPara` (`:8-14`, `:18-23`); `calcularLinea` (`:28-29`, `:33-35`, `:39-41`, `:45-46`, `:50-54`); `porcentajeDescuento` (`:58-65`, `:69-71`); `calcularFactura` (`:75-78`, `:85-90`, `:94-102`, `:106-116`, `:120-127`, `:131-138`, `:142-149`, `:153-160`, `:164-171`, `:175-182`, `:186-196`, `:200-207`, `:211-218`, `:222-229`, `:233-238`, `:242-247`); `calcularProrrateo` (`:251-256`, `:260-263`, `:267-272`) | **28** |
| `test/reglas-negocio.test.js` | `test/reglas-negocio.test.js:6` | `calcularLinea` (`:19-20`, `:24-25`); `calcularFactura` (`:29-34`, `:48-51`, `:63-68`, `:72-75`, `:79-82`); `recargoPara` (`:38-44`); `porcentajeDescuento` (`:56-59`); `calcularProrrateo` (`:86-87`) | **10** (RN-02 a RN-11) |
| `test/anomalias.test.js` | `test/anomalias.test.js:8` | `calcularFactura` (`:28-30` A-01; `:94-96` A-09); `calcularProrrateo` (`:108` A-11); `recargoPara` (`:131` A-14); `calcularLinea` (`:204-205` A-22) | **5** |
| `test/contradicciones.test.js` | `test/contradicciones.test.js:9` | `calcularProrrateo` (`:34-35`, contradicción 01 comercial); `calcularFactura` (`:108-110`, contradicción 06 manual) | **2** |
| `test/golden/flujo-central.js` | `test/golden/flujo-central.js:4` | `calcularFactura` (`:172`, para los 12 casos); `calcularProrrateo` (`:209`, casos con prorrateo) | **1** test de `test/golden-master.test.js` (`:52-66`), que cubre **12 casos** |

**Total: 46 tests ejecutan el motor.** Si se contara también el segundo test de
`test/golden-master.test.js` (`:68`), que valida la estructura del artefacto pero no llama al
módulo, el número sería 47; aquí se usa el criterio estricto de ejecución.

### 4.4 No consumidores (verificado)

- `public/js/factura.js`: **no** importa ni replica el motor. Solo autorrellena precio e IVA desde
  el desplegable (`public/js/factura.js:3-15`). Esto respeta la restricción «cálculo solo en
  servidor».
- `views/*.ejs`: no importan el motor; reciben importes ya calculados y los formatean.
- `db.js`: solo lo menciona en un comentario (`db.js:72`, «ya redondeada (ver calculo.js)»); no lo
  importa.
- `routes/clientes.js`, `routes/articulos.js`, `routes/informes.js`, `server.js` y
  `services/email.js`: no importan `services/calculo`.
- `test/helpers/*`: no importan el motor; solo doblan `db.js` para numeración.
- No hay ningún otro `require` de `services/calculo` en el repositorio (verificado con búsqueda
  global excluyendo `node_modules`).

### 4.5 Grafo de dependencias

```text
lib/util.js  (redondear2)
      ^
      |  require en calculo.js:9; llamadas en :27,:28,:31,:57,:69,:81,:82,:83,:86,:101
      |
services/calculo.js
      ^
      |-- routes/facturas.js:9        -> calcularFactura:66
      |-- routes/contratos.js:7       -> calcularProrrateo:39
      |-- scripts/remesa_mensual.js:11 -> calcularFactura:55
      |
      |-- test/calculo.test.js:5
      |-- test/reglas-negocio.test.js:6
      |-- test/anomalias.test.js:8
      |-- test/contradicciones.test.js:9
      |-- test/golden/flujo-central.js:4  (usado por test/golden-master.test.js:7)
```

### 4.6 Contrato de llamada que debe preservarse

- `calcularFactura(lineas, cliente)` devuelve un objeto con `lineas`, `base`, `iva`, `recargo`,
  `total` y `descuentoPct`, y cada línea con `descripcion`, `cantidad`, `precio`, `tipoIva`, `base`,
  `cuotaIva` y `cuotaRecargo` (`calculo.js:72-80`, `:50`, `:86`). Los consumidores dependen de esos
  nombres y del orden de las líneas.
- `calcularProrrateo(cuota, desde, hasta)` devuelve un número redondeado a 2 decimales; el tope de
  30 días y el mínimo de 0 forman parte del contrato (`calculo.js:98-101`).
- `calcularFactura` acepta `cliente` nulo o indefinido y no aplica recargo (`:49`); acepta
  `recargo_equivalencia` numérico o cadena `'1'` por comparación laxa (`==`), comportamiento
  congelado en `test/calculo.test.js:199-219`.
- El redondeo es **por línea**, nunca sobre el total (`calculo.js:3-7`, `:81-86`). Cualquier
  implementación nueva que redondee al final rompe la equivalencia y el golden master.

---

## 5. Plan mínimo de extracción del motor

1. **Línea base.** `npm test` en verde (116/116) sobre el código sin tocar. Registrar la salida.
2. **Spec 001 aprobada.** Abrir la spec con el alcance de `propuesta-particion-specs.md` §Spec 001:
   RN-01 a RN-10, A-09, A-22 y A-23. Marcar A-09 como decisión registrada pendiente de ratificación
   y A-22/A-23 como deuda técnica.
3. **Arnés de equivalencia.** Sin dependencias nuevas: un script de prueba que cargue la
   implementación vieja y la nueva y compare, con los mismos fixtures, los cinco exports. Reutilizar
   los casos de `test/golden/flujo-central.js` y los tests de `test/calculo.test.js`.
4. **Costura.** Crear el módulo nuevo detrás de una fachada que conserve exactamente la misma API y
   los mismos nombres de campos. El código viejo sigue presente y ejecutable como referencia.
5. **Verificación.** Mismos resultados en: 46 tests del motor, 12 casos del golden master, fronteras
   1.000/5.000, descuento 2/5, recargo, prorrateo marzo/febrero/bisiesto y rectificativa espejo.
   Comprobar también `-0`, `NaN` y las rarezas A-22/A-23.
6. **Conmutación.** Solo tras la equivalencia registrada. El código viejo se retira en un paso
   posterior y aprobado, nunca en el mismo cambio.
7. **Cierre.** Actualizar `test/COBERTURA.md` si cambia el conteo, registrar la evidencia y no tocar
   el golden master salvo decisión de negocio con `diff` explicado.

---

## 6. Riesgos, límites y preguntas

- **Límite de la cobertura del motor.** Los 46 tests cubren el módulo puro, pero no las rutas HTTP ni
  la remesa que lo consumen. Eso no impide extraer el motor: la costura está en el límite del
  módulo y los consumidores no cambian. Sí impide extraer después 002/003/006/007 sin añadir
  caracterización HTTP/job.
- **Dependencia oculta de `redondear2`.** Si en el futuro se extrae `lib/util.js`, cualquier cambio
  en `redondear2` altera el motor. El contrato de equivalencia debe incluir los artefactos de coma
  flotante que ya congela `test/util.test.js:20-30`.
- **Rarezas que no se arreglan.** A-22 (`'21'` en cadena calcula IVA pero no recargo) y A-23 (`-0`)
  deben reproducirse igual en la implementación nueva. No son bugs a corregir en esta extracción.
- **A-09 no es un cambio.** El descuento ya reduce base, IVA y recargo; la decisión D-07 confirma el
  comportamiento actual. No se debe introducir una «mejora» amparada en A-09.
- **SUPOSICIÓN de planificación:** se asume que la extracción se hará con una fachada que mantenga
  los cinco exports y los nombres de campos. Si el negocio o la spec exigieran cambiar la API
  pública, dejaría de ser una extracción de equivalencia y requeriría decisión expresa. Queda como
  pregunta de diseño, no como decisión tomada.
- **Pregunta abierta:** ¿se autoriza que la implementación nueva viva en un fichero distinto con la
  misma API, o se exige mantener `services/calculo.js` como fachada? Es una decisión de ingeniería
  dentro de la costura, no de comportamiento; debe quedar en la spec 001.

---

## 7. Trazabilidad de la evidencia

- `services/calculo.js:3-7` — aviso de no cambiar el redondeo; gestoría línea a línea.
- `services/calculo.js:9` — único `require`.
- `services/calculo.js:12-23,26-34,39-43,48-88,95-102` — implementación de las cinco funciones.
- `services/calculo.js:104-110` — exports.
- `lib/util.js:5-7` — `redondear2`.
- `routes/facturas.js:9,66,75-76,83,85` — consumo de `calcularFactura`.
- `routes/contratos.js:7,39-40` — consumo de `calcularProrrateo`.
- `scripts/remesa_mensual.js:11,55,62,66,71` — consumo de `calcularFactura`.
- `test/calculo.test.js:5` — importación y 28 tests.
- `test/reglas-negocio.test.js:6` — importación y 10 tests que ejecutan el motor.
- `test/anomalias.test.js:8` — importación y 5 tests que ejecutan el motor.
- `test/contradicciones.test.js:9` — importación y 2 tests que ejecutan el motor.
- `test/golden/flujo-central.js:4,172,209` — modelo del golden; `test/golden-master.test.js:7,52-66`.
- `test/COBERTURA.md:6` — 116 tests en verde; `test/COBERTURA.md:35-77` — cobertura por regla.
- `specs/000-reconocimiento/registro-anomalias.md:43-55` — A-01 a A-16 `RESUELTA_NEGOCIO`;
  `:65-73` — A-06 a A-20 `RESUELTA_PROPUESTA`; `:80-84` — A-21 a A-23 `ABIERTA_TECNICA`.
- `specs/000-reconocimiento/propuesta-particion-specs.md:79-113` — spec 001 y sus anomalías;
  `:193-215` — spec 004; `:253-287` — spec 006; `:290-322` — spec 007; `:325-360` — spec 008.
- `.specify/memory/constitution.md:34-91` — Principios I y II; `:93-121` — Principio III;
  `:153-174` — Principio V.
