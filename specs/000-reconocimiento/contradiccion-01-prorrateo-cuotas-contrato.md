# Contradicción 01 — Prorrateo de la cuota de un contrato: 30 días comerciales frente a días reales del mes

**Fecha:** 2026-10-30
**Estado:** registrada; no se corrige ni se decide aquí cuál es la correcta.
**Ámbito:** cuota mensual de contrato cuando el servicio no cubre el mes completo (alta o baja a
mitad de mes).
**Evidencia:** `fichero:líneas`; consultas de solo lectura a `datos/gesfact.db` y ejecuciones con
`node -e` sobre módulos puros (2026-10-30).
**Documentos relacionados:** `flujo-factura.md:235-254,434-438,513-522`;
`mapa-sistema.md:473-477,527-528`; `registro-riesgos.md:34` (R7);
`reglas-de-negocio.md:175-187,468-479` (RN-11 y RN-36); `memoria-historica.md:41,82,111`
(MH01, MH17 y MH27).

> La base de datos de producción no está en el repositorio (`AGENTS.md`). `datos/gesfact.db` es la
> base local generada por la siembra de `db.js`, descrita por el propio código como «resumen, tal
> cual quedaron grabadas» (`db.js:91-92,122`). Los ejemplos con datos sembrados se identifican como
> datos de referencia, no como cifras de producción. Las fechas se han calculado con
> `TZ=Europe/Madrid` para reproducir la zona horaria de la oficina.

## 1. Implementaciones implicadas y camino que usa cada una

### A. `calculo.calcularProrrateo`: mes comercial de 30 días

- **Función:** `calcularProrrateo(cuota, desde, hasta)` en `services/calculo.js:95-102`.
- **Algoritmo:** extrae solo el día del mes de `desde` y `hasta`
  (`services/calculo.js:96-97`), cuenta `dias = d2 - d1 + 1` (`:98`), limita a 30 si supera 30
  (`:99`), limita a 0 si es negativo (`:100`) y devuelve
  `util.redondear2(cuota / 30 * dias)` (`:101`).
- **Convención declarada:** «Se prorratea "a lo comercial": el mes son siempre 30 dias… Asi lo
  hacia Paco a mano en el Access y asi lo espera la gestoria» (`services/calculo.js:90-93`).
- **Camino que la usa:** `POST /contratos/:id/baja` (`routes/contratos.js:31-43`). Al dar de baja
  un contrato calcula `primeroDeMes = fechaBaja.slice(0, 8) + '01'` (`:38`) y llama a
  `calculo.calcularProrrateo(contrato.cuota, primeroDeMes, fechaBaja)` (`:39`); el importe viaja en
  la URL `?prorrateo=<importe>` (`:40`). La vista avisa de que administración copia ese importe y
  emite la factura **a mano** (`views/contratos.ejs:17`). Es decir: pantalla de contratos → factura
  manual.

### B. Fórmula inline de la remesa: días reales del mes

- **Función:** no hay función; el cálculo está escrito dentro de `procesarSiguiente` en
  `scripts/remesa_mensual.js:43-51`.
- **Algoritmo:** calcula `desde = max(fecha_alta, primerDia)` y
  `hasta = min(fecha_baja, ultimoDia)` (`scripts/remesa_mensual.js:45-46`); obtiene
  `diasMes = util.diasDelMes(primerDia)` (`:47`); extrae los días (`:48-49`), cuenta
  `diasServicio = d2 - d1 + 1` (`:50`) y calcula
  `importe = util.redondear2(co.cuota / diasMes * diasServicio)` (`:51`).
- **Convención declarada:** «si el alta o la baja caen dentro del mes se prorratea por los dias
  reales del mes» (`scripts/remesa_mensual.js:43-44`).
- **Camino que la usa:** `node scripts/remesa_mensual.js YYYY-MM`
  (`scripts/remesa_mensual.js:14-18`), que recorre los contratos seleccionados
  (`:26-31`) y emite una factura automática por contrato (`:55-68`). Es decir: remesa mensual →
  factura automática.

### C. Utilidad común de días del mes

`util.diasDelMes(fecha)` (`lib/util.js:36-39`) devuelve los días reales del mes
(`new Date(año, mes, 0).getDate()`). La implementación A **no** la usa; la B sí.

## 2. ¿Usan la misma convención o algoritmo? Comparación paso a paso

| Paso | A. `calcularProrrateo` (pantalla) | B. Fórmula inline (remesa) |
|---|---|---|
| Punto de partida | `desde`, `hasta` ya recortados por el llamador; el comentario exige «dentro del MISMO mes» (`services/calculo.js:94`) | Recorta `fecha_alta`/`fecha_baja` contra el primer y último día del mes (`scripts/remesa_mensual.js:45-46`) |
| Días de servicio | `día(hasta) - día(desde) + 1` | `día(hasta) - día(desde) + 1` |
| Días del mes | **30 fijos** (`services/calculo.js:101`) | **Días reales** del mes (`util.diasDelMes`, `scripts/remesa_mensual.js:47`) |
| Tope | Si `dias > 30`, se limita a 30 (`:99`) | No hay tope; como máximo llega a `diasMes` |
| Mínimo | Si `dias < 0`, se pone a 0 (`:100`) | No hay guarda; unos datos con alta posterior a la baja producirían días negativos |
| Redondeo | `util.redondear2` (`:101`) | `util.redondear2` (`scripts/remesa_mensual.js:51`) |
| Resultado | Importe suelto que se copia a mano | Precio de una línea que después pasa por `calculo.calcularFactura` (`scripts/remesa_mensual.js:53-55`) |

**Coinciden** en la cuenta inclusiva de días y en el redondeo a dos decimales. **Difieren** en el
denominador (30 frente a 28/29/30/31), en el tope de 30 días y en el tratamiento de fechas fuera
del mes. A usa el día del mes y no mira el año ni el mes; B sí acota contra el mes facturado.

Consecuencia aritmética: para un mes de 30 días ambas fórmulas son idénticas. Para un mes de 31
días, B divide entre 31 y A entre 30, por lo que B es un 3,2258 % menor para los mismos días de
servicio. Para febrero, B divide entre 28 (o 29) y A entre 30, por lo que B es un 7,1429 % mayor
(un 3,4483 % en febrero bisiesto). En mes completo ambas coinciden porque A topa en 30 y B llega a
`diasMes` (30/30, 31/31, 28/28).

## 3. Ejemplos concretos y cuantificación de la divergencia

Datos de referencia: contratos sembrados en `db.js:115-120` (contrato 1, cuota 90,00 €; contrato 2,
cuota 145,00 €; contrato 3, cuota 60,00 €, alta 2025-06-16 y baja 2025-09-15). Los meses de baja
marcados como «hipotético» no están en la siembra; se usan para comparar las dos fórmulas sobre la
misma cuota real.

| Caso | Cuota | Mes | Días de servicio | A: 30 días | B: días reales | Diferencia (B − A) |
|---|---:|---|---:|---:|---:|---:|
| Contrato 1, baja hipotética 2026-03-15 | 90,00 | marzo (31 días) | 15 | **45,00** | **43,55** | **−1,45** (−3,22 %) |
| Contrato 1, baja hipotética 2026-03-30 | 90,00 | marzo (31 días) | 30 | **90,00** | **87,10** | **−2,90** (−3,22 %) |
| Contrato 1, baja hipotética 2026-02-15 | 90,00 | febrero (28 días) | 15 | **45,00** | **48,21** | **+3,21** (+7,13 %) |
| Contrato 2, baja hipotética 2026-03-15 | 145,00 | marzo (31 días) | 15 | **72,50** | **70,16** | **−2,34** (−3,23 %) |
| Contrato 3, baja real 2025-09-15 | 60,00 | septiembre (30 días) | 15 | **30,00** | **30,00** | **0,00** |
| Contrato 3, baja hipotética 2025-08-15 | 60,00 | agosto (31 días) | 15 | **30,00** | **29,03** | **−0,97** (−3,23 %) |

Comprobación reproducible (2026-10-30):

```bash
TZ=Europe/Madrid node -e "
var util=require('./lib/util'); var calc=require('./services/calculo');
console.log(calc.calcularProrrateo(90,'2026-03-01','2026-03-15')); // 45
console.log(util.redondear2(90/31*15));                            // 43.55
console.log(calc.calcularProrrateo(90,'2026-02-01','2026-02-15')); // 45
console.log(util.redondear2(90/28*15));                            // 48.21
"
```

La divergencia no es un céntimo de redondeo: en el caso de 90 € y baja el 15 de marzo son **1,45 €**
de diferencia; en febrero, **3,21 €**. En una cuota de 1.000 € la diferencia sería de **32,26 €** en
marzo (3,2258 %) y de **71,43 €** en febrero (7,1429 %). El signo cambia según el mes: en meses de
31 días la remesa cobra **menos** que la pantalla; en febrero, **más**.

## 4. Cuándo se manifiesta y cuándo coinciden

**Se manifiesta** cuando se compara el importe del mismo mes parcial calculado por las dos vías y el
mes no tiene 30 días:

- baja a mitad de mes en enero, marzo, mayo, julio, agosto, octubre o diciembre (31 días);
- baja a mitad de mes en febrero (28/29 días);
- alta a mitad de mes, si se compara la remesa con un prorrateo comercial equivalente (la pantalla
  de contratos solo calcula bajas, no altas: `routes/contratos.js:31-40`).

**Coinciden** en estos casos, que explican por qué la divergencia ha pasado desapercibida:

- **Mes completo:** A topa en 30 y B usa los días reales; ambos devuelven la cuota íntegra.
- **Mes de 30 días:** el denominador coincide. La única baja parcial sembrada, el contrato 3
  (60,00 €, baja 2025-09-15), cae precisamente en septiembre, de 30 días: ambas fórmulas dan
  **30,00 €** (`db.js:118`). Es el caso que administración pudo comprobar sin ver diferencia.
- **Uso operativo separado:** la pantalla solo se usa para la baja y la remesa para el lote mensual.
  Si el mes de baja se factura por una sola de las dos vías, no hay comparación directa. Ahora bien,
  la consulta de la remesa **sí incluye** los contratos con `fecha_baja >= primerDia`
  (`scripts/remesa_mensual.js:26-29`), por lo que el mes de baja puede entrar en la remesa; la
  documentación de práctica operativa dice que administración emite ese último mes a mano
  (`routes/contratos.js:28-30`, `views/contratos.ejs:17`, `memoria-historica.md:111`). Si se
  hicieran las dos cosas sobre el mismo contrato y mes, no solo divergiría el importe: habría dos
  facturas. `SUPOSICIÓN`: no consta en el repositorio si la remesa del mes de baja se lanza, se
  salta el contrato o se lanza antes de grabar la baja.
- **Importes bajos:** una diferencia de 1,45 € o 3,21 € sobre una cuota de 90 € puede pasar como
  «céntimos» en una revisión manual, sobre todo si la gestoría cuadra por totales y no por la
  comparación de las dos pantallas.

## 5. Historia probable

La regla de los 30 días es la más antigua y la única con testimonio explícito: venía del GesFact
1.x en Access, la aplicaba Paco a mano y la gestoría la asumía (`services/calculo.js:90-93`;
`memoria-historica.md:41`, MH01). Esa regla se trasladó a `calcularProrrateo` y se usa en la
pantalla de baja, que además deja el importe en la barra de direcciones para que administración lo
copie (`routes/contratos.js:37-40`; MH27).

La remesa es posterior: la añadió Roberto, becario, en verano de 2021 para no meter las cuotas a
mano (`scripts/remesa_mensual.js:5-7`; `server.js:4`; `memoria-historica.md:82`, MH17). El script
se escribió como pieza de línea de comandos, con su propia fórmula y su propio comentario («dias
reales del mes», `scripts/remesa_mensual.js:43-44`), sin reutilizar `calcularProrrateo`. El estilo
encaja con una implementación independiente: usa `util.diasDelMes`, que ya existía en `lib/util.js`,
pero no la función de prorrateo del módulo de cálculo. No hay comentario que explique la elección de
días reales ni que advierta de la discrepancia; la contradicción se documenta por primera vez en el
reconocimiento de 2026 (`mapa-sistema.md:473-477`, R7). `SUPOSICIÓN`: o Roberto no vio
`calcularProrrateo`, o decidió que la remesa debía prorratear por días naturales; el repositorio no
permite saberlo.

## 6. Preguntas para el negocio (no se responde aquí)

1. ¿El prorrateo correcto para la gestoría es el comercial de 30 días (Paco/Access) o el de días
   reales del mes (remesa de 2021)?
2. Si es el comercial, ¿la remesa debe dejar de prorratear por días reales, o solo se usa para el
   alta y la baja se factura siempre a mano?
3. Si es el de días reales, ¿la pantalla de baja debe cambiar el importe que administración copia
   de la URL?
4. ¿Qué ocurre operativamente el mes de la baja: se lanza la remesa de ese mes, se salta el
   contrato o se emite a mano? ¿Puede haber dos facturas del mismo mes?
5. ¿La regla del día 31 («el dia 31 no se cobra», `services/calculo.js:99`) sigue vigente en meses
   de 31 días, o era una consecuencia del mes comercial de 30?
