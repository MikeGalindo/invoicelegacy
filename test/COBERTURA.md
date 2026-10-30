# Cobertura de la red de characterization tests — GesFact 2.4

**Fecha:** 2026-10-30
**Comando:** `npm test` (fija `TZ=Europe/Madrid`)
**Runner:** `node --test` nativo. Sin dependencias nuevas.
**Resultado de la última ejecución:** **116 tests, 116 en verde** (incluye golden master de 12 casos).

> Estos tests congelan el comportamiento **actual** del código, no el comportamiento deseado por
> el acta de negocio. Si una decisión del acta contradice el código, el test sigue congelando el
> código actual hasta que se implemente el cambio con una decisión documentada y se regenere el
> golden master.

## 1. Ficheros de test

| Fichero | Qué congela |
|---|---|
| `test/util.test.js` | Redondeo, fechas, días del mes, NIF, formato de importes y casos de coma flotante. |
| `test/calculo.test.js` | Recargos, cálculo por línea, descuento por volumen, totales, recargo, prorrateo, ceros, negativos y NaN. |
| `test/reglas-negocio.test.js` | Una batería por regla pura RN-01 a RN-17. |
| `test/numeracion.test.js` | Formato, reserva, año, series, errores y concurrencia de `lib/numeracion.js` con un doble de `db.js`. |
| `test/contradicciones.test.js` | Cada implementación de las contradicciones 01-09, por separado, incluida la que vive en rutas o jobs mediante comprobación de fuente. |
| `test/anomalias.test.js` | Un test por anomalía del registro, con prefijo `CONGELA comportamiento actual:`. |
| `test/golden-master.test.js` | Compara la salida completa del flujo central contra `test/golden/master.json`. |

## 2. Golden master

- `test/golden/flujo-central.js`: modelo de 12 casos fijos del flujo central.
- `test/golden/master.json`: salida completa, claves ordenadas, importes a dos decimales.
- `test/golden/LEEME.md`: qué es, cuándo regenerarlo y cómo.
- `scripts/regenerar-golden-master.js`: regenerador manual; **no** se ejecuta en `npm test`.

Casos: factura simple, recargo, factura mixta, descuento 2 % y 5 %, fronteras 1.000/5.000,
redondeo por línea, prorrateo marzo/febrero, febrero bisiesto y rectificación espejo.

## 3. Cobertura por regla de negocio

| Regla | Cobertura | Dónde |
|---|---|---|
| RN-01 redondeo | Completa | `util.test.js`, `reglas-negocio.test.js` |
| RN-02 base por línea | Completa | `calculo.test.js` |
| RN-03 IVA por línea | Completa | `calculo.test.js` |
| RN-04 recargo solo con recargo | Completa | `calculo.test.js` |
| RN-05 tabla de recargos | Completa | `calculo.test.js` |
| RN-06 redondeo línea a línea | Completa | `calculo.test.js` |
| RN-07 umbrales de descuento | Completa | `calculo.test.js` |
| RN-08 descuento línea a línea | Completa | `calculo.test.js` |
| RN-09 recargo sobre base descontada | Completa | `calculo.test.js` |
| RN-10 total base + IVA + recargo | Completa | `calculo.test.js` |
| RN-11 prorrateo comercial | Completa (modelo puro) | `calculo.test.js`, `contradicciones.test.js` |
| RN-12 vencimiento por defecto | Parcial: config + suma de días; la rama `dias_pago ||` vive en ruta | `reglas-negocio.test.js`; `contradicciones.test.js` |
| RN-13 suma de días en milisegundos | Completa, incluido cambio de hora | `util.test.js` |
| RN-14 días reales del mes | Completa | `util.test.js` |
| RN-15 formatos de fecha | Completa | `util.test.js` |
| RN-16 NIF solo longitud | Completa en utilidad; la ruta de clientes queda fuera | `util.test.js` |
| RN-17 formato de importes | Completa | `util.test.js` |
| RN-18 numeración correlativa | Completa con doble de DB | `numeracion.test.js` |
| RN-19 año nuevo empieza en 1 | Completa con doble de DB | `numeracion.test.js` |
| RN-20 numeración no atómica | Completa (concurrencia simulada) | `numeracion.test.js` |
| RN-21 líneas vacías y rechazo | Fuera: ruta HTTP | — |
| RN-22 normalización de cantidad/precio | Parcial: expresión copiada congelada | `contradicciones.test.js`, `reglas-negocio.test.js` |
| RN-23 factura nace FA/emitida | Fuera: ruta HTTP | — |
| RN-24 nota de descuento | Parcial: cálculo y fuente de la nota | `contradicciones.test.js`, `anomalias.test.js` |
| RN-25 solo emitida se cobra | Fuera: ruta HTTP; comportamiento congelado por fuente | `anomalias.test.js` |
| RN-26 rectificación espejo | Parcial: modelo en golden master | `golden-master.test.js` |
| RN-27 no rectificar RE/rectificada | Fuera: ruta HTTP | — |
| RN-28 inversión de líneas | Parcial: modelo en golden master | `golden-master.test.js` |
| RN-29 rectificativa fecha hoy/sin vencimiento | Fuera: ruta HTTP; fuente congelada | `anomalias.test.js` |
| RN-30 informe de IVA desde líneas | Fuera: SQL | — |
| RN-31 límite 31 del trimestre | Fuera: SQL | — |
| RN-32 formato CSV | Fuera: ruta HTTP | — |
| RN-33 año/trimestre por defecto | Fuera: ruta HTTP | — |
| RN-34 tablero solo FA | Fuera: SQL; fuente congelada | `anomalias.test.js` |
| RN-35 selección de contratos | Fuera: job + SQL | — |
| RN-36 prorrateo por días reales | Parcial: modelo inline | `contradicciones.test.js`, `golden-master.test.js` |
| RN-37 vencimiento de remesa | Parcial: fuente congelada | `anomalias.test.js`, `contradicciones.test.js` |
| RN-38 línea única y nota de remesa | Fuera: job | — |
| RN-39 remesa no idempotente | Fuera: job; ausencia de guarda congelada por fuente | `anomalias.test.js` |

## 4. Cobertura por anomalía

| ID | Test | Tipo |
|---|---|---|
| A-01 | Descuento en remesa sin nota | puro + fuente |
| A-02 | Año del número de ejecución | fuente |
| A-03 | Número perdido si falla la factura | doble de DB |
| A-04 | Alta acepta clientes inactivos | fuente |
| A-05 | Fecha inválida llega a la base | puro |
| A-06 | Rectificativa cobrable y sin vencimiento | fuente |
| A-07 | Remesa sin ORDER BY | fuente |
| A-08 | Rectificación ignora error de línea | fuente |
| A-09 | Descuento reduce recargo | puro |
| A-10 | Tablero ignora RE | fuente |
| A-11 | Dos prorrateos | puro + fuente |
| A-12 | Vencimiento manual/remesa distinto | puro + fuente |
| A-13 | Dos formatos de importe | puro |
| A-14 | IVA por defecto según maestro | puro + fuente |
| A-15 | Seis facturas sembradas descuadradas | fixture |
| A-16 | Punto de millar mal interpretado | fuente + expresión |
| A-17 | Factura incompleta deja cabecera y 500 | fuente |
| A-18 | Sin procedimiento de arranque/restauración | documental |
| A-19 | Facturas históricas descuadradas | fixture |
| A-20 | Vista de contratos sin alta | fuente |
| A-21 | `formatearImporte` con infinito | puro |
| A-22 | IVA en cadena sin recargo | puro |
| A-23 | `redondear2` puede devolver `-0` | puro |

También se congelan **R1** (dos reservas simultáneas repiten número) y **R4** (la remesa no
comprueba si el mes ya se facturó) porque son riesgos ejecutables sin infraestructura.

## 5. Partes FUERA de la red (cobertura pendiente)

Estas partes no se ejecutan en esta fase porque necesitan HTTP, SQLite, ficheros o procesos
externos. Se congelan solo por comprobación de fuente cuando es posible, pero **no** tienen test de
comportamiento real:

- **Rutas HTTP** (`routes/facturas.js`, `clientes.js`, `articulos.js`, `contratos.js`,
  `informes.js`): no se invocan con `req`/`res`; no se prueba el alta, el cobro, la rectificación,
  el listado, el CSV ni el informe de IVA.
- **Servidor y tablero** (`server.js`): no se arranca Express ni se ejecutan las consultas del
  dashboard.
- **Job de remesa** (`scripts/remesa_mensual.js`): no se ejecuta; no se prueba la selección de
  contratos, la escritura real, el `exit 1`, la idempotencia ni el orden de numeración. Su fórmula
  de prorrateo se congela como modelo en el golden master.
- **Base de datos** (`db.js`, `datos/gesfact.db`): no se abre SQLite; el esquema, la siembra, los
  `INSERT` y las consultas no tienen test de integración. `lib/numeracion` usa un doble.
- **Vistas EJS y estáticos** (`views/*.ejs`, `public/js/factura.js`, `public/css`): no se renderizan
  ni se prueba el autorrelleno del navegador.
- **Correo** (`services/email.js`): es un stub; no se prueba el envío real.
- **Copias de seguridad, restauración y despliegue**: son procesos manuales externos; no hay código
  que testear.
- **Dependencias y configuración de despliegue**: `package-lock.json`, `config.js` copiado a mano y
  variables del entorno no se prueban.

## 6. Prioridad para la siguiente fase

1. Tests de integración de rutas con SQLite temporal o doble de `db.js`.
2. Test de la remesa completa con una base desechable y contratos fijos.
3. Test del CSV y del informe de IVA con datos sembrados.
4. Test del tablero y del esquema de la base.
5. Test de concurrencia real de numeración con dos conexiones.

Cualquier cambio futuro debe ejecutar `npm test`; si un test falla, primero se investiga si es una
regresión. El golden master solo se regenera con una decisión de negocio documentada.
