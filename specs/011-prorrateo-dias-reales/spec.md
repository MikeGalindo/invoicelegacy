# Especificación delta: prorrateo único por días reales

**Feature Branch**: `011-prorrateo-dias-reales`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Spec DELTA sobre `specs/005-cuotas-contrato-prorrateo-remesa`: ejecuta la decisión de negocio que declaró OFICIAL la fórmula de la remesa (días reales del mes, el día 31 SÍ se cobra) y deja la fórmula de 30 días fijos como histórica a unificar. Con el motor ya extraído, este delta cierra en CÓDIGO la anomalía de doble prorrateo divergente. `motor/calculo.js`: `calcularProrrateo` pasa a prorratear sobre los días reales del mes, no sobre 30 fijos; se elimina el tope a 30 y el día 31 se cobra. `routes/contratos.js` sigue llamando a la misma función pública, sin cambiar su firma. Ejemplo normativo: 60 €/mes, servicio del 16 al 30 de julio (31 días) pasa de 30,00 € a 29,03 €, igual que la remesa. Un mes completo sigue dando la cuota íntegra. Cero retroactividad: las facturas de baja ya emitidas no se tocan, no se rectifican y no se recalculan. Fuera de alcance: la corrección del prorrateo negativo y del cálculo intermensual, diferida a otro delta."

---

## 1. Naturaleza delta y relación con la spec 005

Esta spec **no abre un módulo nuevo**. Es un delta de comportamiento sobre la convención de
prorrateo que la spec 005 dejó fijada y que la spec 010 extrajo a `motor/calculo.js`. Su única
finalidad es que **todo el sistema use una sola convención**: los días reales del mes.

### 1.1 Qué se revoca y qué se conserva de la spec 005

| Elemento de la 005 | Estado tras este delta | Consecuencia |
|---|---|---|
| FR-001, FR-002 y FR-003 (fórmula de la remesa por días reales) | **Vigentes, sin cambios** | Siguen siendo la fórmula oficial y pasan a ser la **única** convención del sistema. |
| FR-004 (prorrateo a 30 días fijos) | **REVOCADO** como comportamiento vigente | `calcularProrrateo` deja de usar el mes comercial de 30 días. |
| FR-005 (tope de 30 días y día 31 no facturable) | **REVOCADO** como comportamiento vigente | Se elimina el tope; en un mes de 31 días el día 31 se cobra. |
| Historia de usuario 2 de la 005 (baja de contrato a 30 fijos) | **Deja de ser convención de producción** | Se conserva solo como descripción histórica de lo que se hacía antes del despliegue. |

El contenido literal de FR-001 a FR-005 de la 005 **no es verificable en este árbol**: la carpeta
`specs/005-cuotas-contrato-prorrateo-remesa` no existe en este checkout
(`specs/SPEC-PACK.md:229-233` y `specs/010-motor-calculo-strangler/spec.md:46-52`). La atribución de
esos números se toma del encargo y se marca como **SUPOSICIÓN documental**. Lo que sí está
verificado es el comportamiento actual del código y la decisión de negocio que lo autoriza
(§1.3).

### 1.2 Estado real del repositorio a 2026-11-01

| Referencia del encargo | Estado real en este checkout | Evidencia |
|---|---|---|
| `specs/005-cuotas-contrato-prorrateo-remesa` | **No existe.** | `specs/SPEC-PACK.md:229-233`; `specs/010-motor-calculo-strangler/spec.md:46-52`. |
| `specs/009-...` (motor extraído) | **No existe con ese número.** La extracción del motor está en la spec **010**. | `specs/010-motor-calculo-strangler/spec.md`; `motor/calculo.js:1-14`. |
| Anomalía **A-01** = doble prorrateo | En el registro de este checkout **A-01 es el descuento por volumen sin nota en observaciones**; el doble prorrateo es **A-11**. | `specs/000-reconocimiento/registro-anomalias.md:43` y `:50`. |
| Decisión **D-01** (Paco/Puri, julio 2026) | En este checkout **D-01 es el total de factura (suma de líneas)**; la decisión de prorrateo por días reales es **D-03/N-03, Paco y Puri, 2026-10-30**. | `specs/000-reconocimiento/acta-entrevista-negocio.md:39-41`; `registro-anomalias.md:50`. |
| Anomalía **A-15** = prorrateo negativo → 0,00 € | En este checkout **A-15 es la discrepancia cabecera/líneas**. No existe una entrada con el contenido que describe el encargo. | `registro-anomalias.md:54`; `contradiccion-07-totales-cabecera-lineas.md`. |
| `test/calculo.prorrateo.test.js` | **No existe.** El comportamiento antiguo está congelado en cuatro ficheros distintos. | `test/calculo.test.js:250-273`, `test/contradicciones.test.js:33-36`, `test/anomalias.test.js:107-110`, `test/reglas-negocio.test.js:85-88`. |
| `test/legado/calculo-heredado.js` (oráculo del anillo C) | La copia congelada del heredado está en **`test/referencia/calculo-heredado.js`**. | `test/referencia/calculo-heredado.js:105-120`; `test/equivalencia-motor.test.js:13-15,141-143`. |

Estas diferencias no cambian el objetivo del encargo. Obligan a **citar la evidencia real** en los
tests y en el commit, para que la decisión aplicada sea trazable y no se atribuya a un documento
inexistente.

### 1.3 Decisión de negocio que autoriza el cambio

| ID real | Decisión | Testigo | Alcance autorizado |
|---|---|---|---|
| **A-11** / **D-03** / **N-03** | «El prorrateo correcto es por días reales del mes». | **NEGOCIO** — Paco y Puri, 2026-10-30 (`acta-entrevista-negocio.md:41`; `registro-anomalias.md:50`). | Cambiar la convención de `calcularProrrateo` de 30 fijos a días reales, incluido el día 31. Nada más. |

El encargo cita la misma decisión como «D-01, Paco/Puri, julio 2026» y la sitúa en la spec 005.
Esa referencia **no se puede verificar** en este checkout y se marca como **SUPOSICIÓN**. La
decisión vigente y ratificada aquí es A-11/D-03, que autoriza exactamente el mismo cambio. El
commit de implementación debe citar **A-11 — Paco y Puri, 2026-10-30**, no un identificador que no
existe en el registro.

### 1.4 Frontera de módulo

- **Dentro:** la función `calcularProrrateo` de `motor/calculo.js`, los tests que congelan su
  comportamiento, el golden master y la documentación de la spec.
- **Fuera:** `routes/contratos.js` (solo se comprueba que sigue llamando a la misma función y con la
  misma firma), `scripts/remesa_mensual.js` (no se refactoriza), `lib/util.js`, `services/calculo.js`
  (la fachada no cambia), el esquema de la base de datos, las facturas históricas y cualquier otra
  anomalía.

---

## 2. Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Marga y Julián cobran lo mismo por el mismo periodo (Prioridad: P1)

Marga da de baja un contrato a mitad de mes y la pantalla le muestra el importe del último mes.
Julián lanza después la remesa de ese mismo mes. Hasta hoy, la pantalla usaba 30 días fijos y la
remesa usaba los días reales: dos importes distintos para el mismo servicio. Tras el delta, ambas
rutas aplican la misma fórmula y el importe coincide.

**Por qué esta prioridad**: es la anomalía que motiva el cambio y la que tiene riesgo económico
directo. Una diferencia de 0,97 € en una cuota de 60 € es pequeña por factura, pero sistemática y
visible para la gestoría.

**Prueba independiente**: calcular el mismo periodo con la función del motor y con la fórmula
inline de la remesa, y exigir igualdad exacta al céntimo.

**Escenarios de aceptación**:

1. **Dado** un contrato de 60 €/mes con servicio del 16 al 30 de julio de 2026 (mes de 31 días),
   **Cuando** se calcula el prorrateo, **Entonces** devuelve **29,03 €**, no 30,00 €.
2. **Dado** el mismo periodo, **Cuando** se compara con la fórmula de la remesa,
   **Entonces** ambas devuelven 29,03 € y la diferencia es 0,00 €.
3. **Dada** una baja cuyo periodo empieza el día 1 del mes, **Cuando** se calcula con el motor y con
   la remesa, **Entonces** coinciden para todos los meses del año, incluidos los de 31 días.

---

### Historia de usuario 2 - La remesa no cambia ni un céntimo (Prioridad: P1)

Julián lanza la remesa mensual como siempre. El delta no toca su código ni su fórmula. Los importes
de todas las facturas de remesa deben ser exactamente los mismos que antes del despliegue, también
en meses de 31 días, en febrero y en año bisiesto.

**Por qué esta prioridad**: la remesa es la fórmula oficial y no debe sufrir ningún efecto
colateral. El cambio es para que la baja se le una, no para mover la remesa.

**Prueba independiente**: comparar la salida de la remesa antes y después del delta sobre una
copia desechable, o comparar la fórmula inline con la nueva función del motor para una batería de
meses y periodos.

**Escenarios de aceptación**:

1. **Dado** un mes completo de 31 días con cuota de 90 €, **Cuando** se calcula la remesa,
   **Entonces** sigue dando 90,00 €.
2. **Dado** febrero de 2026 (28 días) con cuota de 90 €, **Cuando** se calcula la remesa,
   **Entonces** sigue dando 90,00 €.
3. **Dado** febrero de 2028 (29 días, bisiesto) con cuota de 90 €, **Cuando** se calcula la remesa,
   **Entonces** sigue dando 90,00 €.
4. **Dado** un periodo parcial de 15 días en un mes de 30 días con cuota de 60 €, **Cuando** se
   calcula la remesa, **Entonces** sigue dando 30,00 €.

---

### Historia de usuario 3 - Puri no ve tocada ninguna factura histórica (Prioridad: P1)

Puri revisa las facturas de baja ya emitidas con la convención antigua. El delta no las recalcula,
no las rectifica de oficio y no las renumera. El cambio solo se aplica a los prorrateos calculados
a partir de la fecha de despliegue.

**Por qué esta prioridad**: el Principio V de la constitución es innegociable. El histórico es la
prueba fiscal y contractual de lo cobrado.

**Prueba independiente**: comprobar que el cambio no incluye migraciones, `UPDATE`, `DELETE`,
scripts de recálculo ni generación de rectificativas; y que las filas históricas conservan sus
importes.

**Escenarios de aceptación**:

1. **Dada** una factura de baja emitida antes del despliegue con la convención de 30 días,
   **Cuando** se aplica el delta, **Entonces** su cabecera, líneas, importes y fechas no cambian.
2. **Dada** una factura histórica que no cuadra con la nueva convención, **Cuando** se revisa,
   **Entonces** se deja como está; solo se corrige con rectificativa `RE` si el negocio lo decide,
   nunca de oficio.
3. **Dado** el despliegue, **Cuando** se inspecciona el cambio, **Entonces** no contiene ninguna
   migración de datos ni ningún script de recalculación histórica.

---

### Historia de usuario 4 - El equipo sabe dónde está la única divergencia intencionada (Prioridad: P2)

El arnés de equivalencia del anillo C comparaba el motor nuevo con la copia congelada del heredado,
incluido el prorrateo. Tras el delta, esa comparación ya no puede exigir igualdad para
`calcularProrrateo`: es el único punto donde el motor deja de ser equivalente verbatim al legado.
El equipo necesita que esa divergencia quede documentada y acotada, no escondida.

**Por qué esta prioridad**: si el arnés sigue comparando prorrateo, el delta nace en rojo; si se
desactiva el arnés entero, se pierde la protección de las otras cuatro funciones.

**Prueba independiente**: ejecutar el anillo C y comprobar que las otras cuatro funciones siguen
con 0 diferencias y que la exclusión del prorrateo está comentada y justificada.

**Escenarios de aceptación**:

1. **Dado** el arnés de equivalencia, **Cuando** se ejecuta tras el delta, **Entonces** sigue
   comparando `recargoPara`, `calcularLinea`, `porcentajeDescuento` y `calcularFactura` con
   igualdad exacta campo a campo.
2. **Dada** la comparación de `calcularProrrateo`, **Cuando** se ejecuta, **Entonces** está excluida
   de forma explícita y el comentario cita A-11, D-03 y esta spec.
3. **Dado** `test/referencia/calculo-heredado.js`, **Cuando** se inspecciona, **Entonces** sigue
   intacto como referencia histórica y no se usa para calcular el prorrateo nuevo.

---

### Casos límite

- **Mes completo de 31 días** (`2026-03-01` a `2026-03-31`): 31 días de servicio, cuota íntegra.
- **Mes completo de 30 días** (`2026-04-01` a `2026-04-30`): 30 días, cuota íntegra.
- **Febrero de 28 días** (`2026-02-01` a `2026-02-28`): 28 días, cuota íntegra.
- **Febrero bisiesto de 29 días** (`2028-02-01` a `2028-02-29`): 29 días, cuota íntegra.
- **Día 31 cobrado**: `2026-07-16` a `2026-07-31` son 16 días, no 15.
- **Periodo que termina el día 30 en un mes de 31**: `2026-07-01` a `2026-07-30` son 30 días de
  31; no es un mes completo y no da la cuota íntegra.
- **Mismo día**: un día de servicio; en un mes de 31, `cuota / 31`.
- **Días invertidos** (`hasta` anterior a `desde`): se mantiene el mínimo de 0 días; no se lanza
  error.
- **Cuota cero o negativa**: se conserva el signo y la proporción; no se normaliza a 0.
- **Cuota `NaN`**: el resultado sigue siendo `NaN`; no se añade validación.
- **Fecha con formato inesperado** (`'basura'`, `null`): se conserva el comportamiento actual,
  incluida la excepción si la hay; no se añaden validaciones.
- **Fecha imposible** (`2026-02-29` en un año no bisiesto): no se valida y el resultado puede
  superar la cuota mensual. Es consecuencia de la falta de validación actual y queda fuera de este
  delta.
- **Periodo a caballo entre dos meses**: el denominador se toma del mes de `desde`; el cálculo
  intermensual sigue sin tener sentido y queda fuera de este delta.
- **Zona horaria**: los tests se ejecutan con `TZ=Europe/Madrid`; no se introduce reloj ni fecha
  actual en el cálculo.

---

## 3. Requisitos *(obligatorio)*

### 3.1 Requisitos funcionales

**Fórmula única**

- **FR-001**: `calcularProrrateo(cuota, desde, hasta)` MUST calcular
  `redondear2(cuota / diasMes * diasServicio)`, donde `diasMes` es el número real de días del mes de
  `desde` (`util.diasDelMes(desde)`) y `diasServicio = d2 - d1 + 1`, tomando `d1` y `d2` del día de
  cada fecha.
- **FR-002**: `calcularProrrateo` MUST eliminar el tope de 30 días. En un mes de 31 días, un
  periodo que incluya el día 31 MUST contar ese día.
- **FR-003**: `calcularProrrateo` MUST mantener el mínimo de 0 días cuando `hasta` sea anterior a
  `desde`. No se añaden validaciones nuevas ni mensajes de error.
- **FR-004**: `calcularProrrateo` MUST conservar su nombre, su aridad de 3 parámetros, su posición
  en los exports y su firma pública. No puede aparecer ni desaparecer ningún export.
- **FR-005**: Para un mes completo, `calcularProrrateo` MUST devolver exactamente la cuota íntegra
  redondeada a dos decimales: 28 días → `cuota`, 29 días → `cuota`, 30 días → `cuota`, 31 días →
  `cuota`.
- **FR-006**: Para el caso normativo de 60 €/mes y servicio del 16 al 30 de julio de 2026,
  `calcularProrrateo` MUST devolver **29,03 €**. El valor antiguo (30,00 €) MUST dejar de ser el
  resultado vigente.
- **FR-007**: Para los mismos argumentos `desde` y `hasta`, `calcularProrrateo` MUST devolver el
  mismo importe que la fórmula inline de `scripts/remesa_mensual.js:43-51`, en todos los meses del
  año y en periodos parciales.
- **FR-008**: `routes/contratos.js` MUST seguir llamando a `calculo.calcularProrrateo(contrato.cuota,
  primeroDeMes, fechaBaja)` con la misma firma y sin cambios en el fichero. La unificación es de
  fórmula, no de interfaz ni de periodo.
- **FR-009**: `scripts/remesa_mensual.js` MUST NOT modificarse. Su fórmula inline sigue siendo la
  referencia de la remesa y no se refactoriza para llamar al motor en este delta.
- **FR-010**: `services/calculo.js` MUST NOT modificarse: sigue siendo la fachada que reexporta el
  motor.

**Alcance negativo y no retroactividad**

- **FR-011**: El delta MUST NOT modificar, recalcular, renumerar, rectificar ni borrar ninguna
  factura ya emitida, ni sus líneas, importes, fechas o series. No puede incluir migraciones,
  `UPDATE` ni `DELETE` sobre datos históricos.
- **FR-012**: El delta MUST NOT corregir el prorrateo negativo, el cálculo intermensual ni las
  fechas imposibles. Se mantiene el mínimo de 0 días y no se añade ningún otro tope, validación o
  normalización. Esa corrección queda para un delta posterior.
- **FR-013**: El delta MUST NOT introducir dependencias nuevas, cambios en `package.json`,
  `package-lock.json` o `node_modules`, ni cambios en `lib/util.js`.

**Tests, equivalencia y golden master**

- **FR-014**: Los tests que congelan la convención antigua MUST sustituirse por tests de la nueva
  convención, citando A-11/D-03 y esta spec en el comentario. En este checkout son, como mínimo:
  `test/calculo.test.js:250-273`, `test/contradicciones.test.js:33-36`,
  `test/anomalias.test.js:107-110` y `test/reglas-negocio.test.js:85-88`. El fichero
  `test/calculo.prorrateo.test.js` que cita el encargo no existe; no se inventa.
- **FR-015**: Los tests nuevos MUST cubrir, como mínimo: el caso normativo 60 €/16-30 julio →
  29,03 €; mes completo de 28, 29, 30 y 31 días → cuota íntegra; día 31 cobrado; mismo día; días
  invertidos → 0; cuota negativa; y la paridad con la fórmula de la remesa.
- **FR-016**: El arnés de equivalencia `test/equivalencia-motor.test.js` MUST dejar de comparar
  `calcularProrrateo` contra `test/referencia/calculo-heredado.js`. La exclusión MUST ser explícita
  y citar A-11/D-03 y esta spec. Las otras cuatro funciones MUST seguir comparándose con igualdad
  exacta campo a campo, incluida la distinción `-0`/`0` y `NaN`/`NaN`.
- **FR-017**: `test/referencia/calculo-heredado.js` MUST conservarse intacto como copia histórica
  del heredado. No se actualiza a la nueva fórmula y no se usa como oráculo del prorrateo nuevo.
- **FR-018**: El golden master MUST regenerarse solo después del cambio de código, con la decisión
  citada en el commit y el `diff` explicado caso por caso. El cambio esperado se limita a los tres
  casos con prorrateo: `prorrateo-marzo`, `prorrateo-febrero` y `febrero-bisiesto`. En ellos,
  `prorrateoComercial` pasa a valer lo mismo que `prorrateoDiasReales` (43,55; 48,21; 46,55). Si
  aparecen cambios en cualquier otro caso o campo, la regeneración se rechaza.
- **FR-019**: Las descripciones de los tres casos de prorrateo en `test/golden/flujo-central.js` y
  la explicación de `test/golden/LEEME.md` MUST actualizarse para no afirmar una divergencia que ya
  no existe. El nombre del campo `prorrateoComercial` se conserva en este delta para no cambiar el
  esquema del golden; se documenta que es un nombre heredado y que ahora contiene la convención
  única de días reales.
- **FR-020**: `test/COBERTURA.md` MUST actualizar la descripción de RN-11 y la nota de la red para
  reflejar que la convención congelada es la de días reales, con referencia a esta spec.
- **FR-021**: El commit de implementación MUST incluir la línea `Decisión: A-11 — Paco y Puri,
  2026-10-30` y MUST explicar el `diff` del golden master. Si se modifica un test con prefijo
  `CONGELA comportamiento actual:`, el commit MUST citar también esa decisión, conforme al
  Principio II.
- **FR-022**: El registro de anomalías MUST anotar que A-11 queda implementada por esta spec, sin
  borrar el historial de la entrada ni reescribir su clasificación anterior.

### 3.2 Entidades clave

- **Convención única de prorrateo**: regla de negocio que reparte la cuota mensual entre los días
  reales del mes, con el día 31 incluido. Es la única convención vigente tras el delta.
- **Motor (`motor/calculo.js`)**: implementación efectiva de `calcularProrrateo` y de las otras
  cuatro funciones. Es el único punto de código que cambia.
- **Remesa (`scripts/remesa_mensual.js`)**: fórmula inline de días reales que se conserva intacta y
  sirve de referencia de paridad.
- **Pantalla de baja (`routes/contratos.js`)**: consumidor que llama a la función pública sin
  cambiar su firma ni su periodo.
- **Oráculo heredado (`test/referencia/calculo-heredado.js`)**: copia congelada de la convención
  antigua. Se conserva como historia, pero deja de ser oráculo del prorrateo.
- **Golden master (`test/golden/master.json`)**: contrato ejecutable del flujo central. Cambia solo
  en los tres campos de prorrateo y en las descripciones asociadas.

---

## 4. Criterios de éxito *(obligatorio)*

### 4.1 Resultados medibles

- **SC-001**: `calcularProrrateo(60, '2026-07-16', '2026-07-30')` devuelve **29,03 €**; el valor
  anterior 30,00 € ya no aparece en ningún test vigente.
- **SC-002**: Los meses completos de 28, 29, 30 y 31 días devuelven exactamente la cuota íntegra:
  0 céntimos de diferencia en los cuatro casos.
- **SC-003**: La paridad motor/remesa da **0 diferencias** en los 12 meses del año y en una batería
  de periodos parciales que incluya el día 31, febrero y año bisiesto.
- **SC-004**: La suite completa pasa en verde con 0 tests de la convención antigua y 0 tests
  saltados para evitar el cambio.
- **SC-005**: El anillo C da **0 diferencias** en las cuatro funciones no afectadas. La única
  exclusión es `calcularProrrateo`, documentada y justificada.
- **SC-006**: El `diff` del golden master se limita a los tres casos de prorrateo: tres valores de
  `prorrateoComercial` y, como máximo, las tres descripciones asociadas. Cualquier otro cambio es
  0.
- **SC-007**: 0 facturas históricas modificadas, 0 migraciones de datos, 0 rectificativas emitidas
  de oficio y 0 scripts de recálculo ejecutados.
- **SC-008**: 0 dependencias nuevas, 0 cambios en `package.json`/`package-lock.json` y 0 cambios en
  los ficheros consumidores (`routes/contratos.js`, `scripts/remesa_mensual.js`,
  `services/calculo.js`).

---

## 5. Supuestos

- **Spec 005 ausente**: se toma del encargo la relación con FR-001 a FR-005 y con la historia de
  usuario 2 de la 005. Se marca como `SUPOSICIÓN` porque la carpeta no existe en este checkout.
- **Decisión aplicable**: la decisión del encargo («D-01, julio 2026») se interpreta como la misma
  que A-11/D-03 de este registro (Paco y Puri, 2026-10-30). Es la única decisión de prorrateo
  ratificada que consta aquí.
- **Periodo de la baja**: `routes/contratos.js:37-39` sigue calculando del día 1 del mes al día de
  la baja. La igualdad con la remesa se exige **para los mismos argumentos `desde`/`hasta`**. Si el
  contrato se dio de alta a mitad del mismo mes, la pantalla y la remesa pueden seguir midiendo
  periodos distintos; corregir eso exigiría cambiar la ruta y queda fuera de este delta.
- **Remesa intacta**: no se refactoriza la fórmula inline de la remesa para que llame al motor. La
  paridad se demuestra con tests, no moviendo código.
- **Nombre del campo del golden**: `prorrateoComercial` se conserva aunque ya no describa un mes
  comercial. Renombrarlo sería un cambio de esquema no autorizado en este delta.
- **Fechas imposibles**: no se validan. Un `2026-02-29` puede producir un importe superior a la
  cuota; es deuda técnica preexistente y no se corrige aquí.
- **Entorno**: los tests se ejecutan desde la raíz del repo con `TZ=Europe/Madrid`; no se toca la
  base de datos de producción ni se lanza la remesa real.
- **Formato**: importes con dos decimales y coma en la documentación; fechas de base de datos
  `YYYY-MM-DD`; pantalla `DD/MM/YYYY`.

---

## 6. Riesgos, desviaciones y preguntas abiertas

### 6.1 Desviaciones registradas respecto al encargo

| ID | Desviación | Motivo | Mitigación |
|---|---|---|---|
| DESV-01 | La spec se numera **011**, no 005, y no modifica el fichero de la 005. | `specs/005-*` no existe en este checkout (`SPEC-PACK.md:229-233`). El flujo Spec Kit exige crear una spec nueva. | Se declara delta sobre la 005 en el título y en §1; el contenido de la 005 se cita como `SUPOSICIÓN` cuando no es verificable. |
| DESV-02 | No se sustituye un único `test/calculo.prorrateo.test.js`; se actualizan cuatro ficheros de test. | Ese fichero no existe. La convención antigua está congelada en cuatro sitios. | FR-014 enumera los ficheros y líneas reales. Si se dejara uno sin actualizar, la suite quedaría en rojo. |
| DESV-03 | El oráculo del anillo C está en `test/referencia/calculo-heredado.js`, no en `test/legado/`. | Ruta real del repo. | FR-016 y FR-017 citan la ruta real y conservan el fichero intacto. |
| DESV-04 | Se regenera el golden master, aunque el encargo no lo menciona. | `test/golden/flujo-central.js:209` usa `calcularProrrateo` para `prorrateoComercial`; sin regenerar, el golden queda en rojo. | FR-018 y SC-006 acotan el `diff` a los tres casos de prorrateo y exigen explicarlo en el commit. |
| DESV-05 | No se cambia `routes/contratos.js` para que use `fecha_alta` cuando el alta sea posterior al día 1. | El encargo solo pide unificar la fórmula y conservar la firma; cambiar el periodo sería otro comportamiento. | Se documenta en §5 y se deja como pregunta abierta. |

### 6.2 Riesgos

- **Golden master mal regenerado**: si se regenera antes de cambiar el código, el `diff` será vacío
  y el test seguirá congelando la convención antigua. Mitigación: FR-018 exige regenerar después y
  revisar el `diff`.
- **Test antiguo olvidado**: dejar uno de los cuatro ficheros con el valor 45,00 € o 30,00 € hará
  fallar la suite y puede interpretarse como regresión. Mitigación: FR-014 los enumera.
- **Citación incorrecta**: el encargo cita A-01/D-01 y julio 2026, que en este registro no
  corresponden al prorrateo. Un commit que cite esos identificadores atribuiría el cambio a una
  decisión que no consta. Mitigación: citar A-11/D-03/Paco y Puri/2026-10-30.
- **Divergencia residual por periodo**: la pantalla de baja mide del día 1 al día de la baja; la
  remesa mide del alta efectiva al fin de mes. Si el alta fue a mitad de mes, los importes pueden
  seguir difiriendo aunque la fórmula sea la misma. Mitigación: se acota la garantía a los mismos
  argumentos y se deja como pregunta abierta.
- **Fechas imposibles**: la nueva fórmula puede dar más de la cuota en un `2026-02-29`. No es una
  regresión del delta, sino deuda técnica preexistente; se congela el resultado y se difiere.
- **Zona horaria**: `util.diasDelMes` usa `Date` local. Si los tests se ejecutan en otra zona, el
  resultado podría variar en los bordes de mes. Mitigación: `TZ=Europe/Madrid` en `npm test`.

### 6.3 Preguntas abiertas

1. **Trazabilidad documental**: ¿la decisión «D-01, Paco/Puri, julio 2026» del encargo es la misma
   que A-11/D-03 (Paco y Puri, 2026-10-30) de este registro? Se asume que sí; si no, hace falta la
   ratificación escrita que la sustituya antes de implementar.
2. **Periodo de la baja**: ¿debe la pantalla usar `fecha_alta` cuando sea posterior al día 1 del
   mes, para que el periodo coincida con el de la remesa? Fuera de alcance; requiere su propia
   decisión y su propio delta.
3. **Fechas imposibles**: ¿se admite que un `2026-02-29` produzca más de la cuota mensual hasta que
   se aborde el delta de validación? Se asume que sí, por no introducir validaciones no autorizadas.

---

## 7. Anexo: cambios esperados en tests y golden master

Este anexo es orientativo para el plan y las tareas. No sustituye a la evidencia que se obtenga al
ejecutar la suite.

### 7.1 Tests que congelan la convención antigua

| Fichero:líneas | Valor actual | Valor tras el delta |
|---|---|---|
| `test/calculo.test.js:251` | 45,00 (marzo, 1-15) | 43,55 |
| `test/calculo.test.js:252` | 90,00 (marzo, 1-30) | 87,10 |
| `test/calculo.test.js:253` | 90,00 (marzo, 1-31) | 90,00 (sin cambio) |
| `test/calculo.test.js:254` | 45,00 (febrero, 1-15) | 48,21 |
| `test/calculo.test.js:255` | 30,00 (septiembre, 1-15) | 30,00 (sin cambio) |
| `test/calculo.test.js:256` | 30,00 (agosto, 1-15) | 29,03 |
| `test/calculo.test.js:262` | 3,00 (marzo, 1-1) | 2,90 |
| `test/calculo.test.js:263` | 6,00 (marzo, 1-2) | 5,81 |
| `test/calculo.test.js:268` | -45,00 (marzo, 1-15) | -43,55 |
| `test/calculo.test.js:271` | 45,00 (mes 13 inválido) | 43,55 |
| `test/calculo.test.js:272` | 87,00 (29/02 no bisiesto) | 93,21 |
| `test/contradicciones.test.js:34` | 45,00 (marzo) | 43,55 |
| `test/contradicciones.test.js:35` | 45,00 (febrero) | 48,21 |
| `test/anomalias.test.js:108` | 45,00 (marzo) | 43,55 |
| `test/reglas-negocio.test.js:86` | 45,00 (marzo) | 43,55 |
| `test/reglas-negocio.test.js:87` | 45,00 (febrero) | 48,21 |

Los valores de `test/contradicciones.test.js:39-41` (fórmula de la remesa: 43,55; 48,21; 30,00) no
cambian. Tras el delta, esos tres valores y los del motor coinciden.

### 7.2 Golden master

`test/golden/master.json` contiene tres casos con prorrateo. El cambio esperado es:

| Caso | `prorrateoComercial` actual | `prorrateoComercial` tras el delta | `prorrateoDiasReales` (no cambia) |
|---|---|---|---|
| `prorrateo-marzo` | 45,00 | 43,55 | 43,55 |
| `prorrateo-febrero` | 45,00 | 48,21 | 48,21 |
| `febrero-bisiesto` | 45,00 | 46,55 | 46,55 |

Referencias: `test/golden/master.json:504-505`, `:558-559` y `:612-613`;
`test/golden/flujo-central.js:209-210`.

### 7.3 Fórmulas de referencia

- Motor tras el delta: `redondear2(cuota / util.diasDelMes(desde) * (d2 - d1 + 1))`, con mínimo 0.
- Remesa actual: `redondear2(cuota / util.diasDelMes(primerDia) * (d2 - d1 + 1))`
  (`scripts/remesa_mensual.js:43-51`).
- Redondeo: `util.redondear2` (`lib/util.js`), por línea y a dos decimales; no se cambia.

### 7.4 Evidencia de la línea base

- La suite actual tiene **122 tests en verde** (2026-11-01, `test/COBERTURA.md:6`).
- El comportamiento antiguo de `calcularProrrateo` está en `motor/calculo.js:94-106`.
- La fachada no contiene lógica: `services/calculo.js:11` reexporta el motor.
- La pantalla de baja llama a la función pública: `routes/contratos.js:39`.
- La remesa usa días reales inline: `scripts/remesa_mensual.js:47-51`.
