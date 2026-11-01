# Feature Specification: Extracción del motor de cálculo por estrangulamiento

**Feature Branch**: `010-motor-calculo-strangler`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Extracción y modernización del motor de cálculo de GesFact según el
patrón strangler fig. Esta spec NO redefine el comportamiento del motor: el comportamiento es
EXACTAMENTE el especificado en specs/ (001, 002 y 003) que actúa como contrato inmutable de esta
obra. Alcance de esta spec: nueva implementación en motor/ con JavaScript moderno y exportando
exactamente las mismas funciones y firmas que services/calculo.js: calcularLinea, calcularFactura,
calcularProrrateo, porcentajeDescuento y recargoPara. Cero dependencias externas. Cero cambios de
comportamiento en esta spec. Las correcciones de negocio aprobadas (anomalías) NO entran aquí: se
harán después como specs delta independientes. El motor nuevo debe reproducir también los
comportamientos anómalos documentados. Verificación de equivalencia en tres anillos (criterios de
aceptación): (a) la suite de characterization tests completa pasa en verde ejecutada contra motor/;
(b) el golden master pasa sin regenerar ejecutado contra motor/; (c) un test de equivalencia
comparativa ejecuta ambas implementaciones sobre una batería masiva y determinista de casos
generados (semilla fija) y exige igualdad exacta campo a campo. Conmutación final:
services/calculo.js queda como fachada que reexporta motor/ sin cambiar su ruta ni su API; los
consumidores no se modifican. Fuera de alcance: cambiar consumidores, cambiar la interfaz, las
correcciones, y cualquier módulo que no sea el motor."

---

## Contexto y contrato de referencia

Esta spec **no define comportamiento**. Solo define cómo se sustituye una implementación por otra
sin que el comportamiento observable cambie un céntimo, conforme al Principio III de la
constitución (`strangler fig`, `.specify/memory/constitution.md:93-121`).

### Contrato inmutable

El contrato que manda en esta obra es el **contrato ejecutable existente**, en este orden de
precedencia:

| Orden | Contrato | Evidencia | Qué fija |
|---|---|---|---|
| 1 | Suite de characterization tests | `test/*.test.js`; **116 tests, 116 en verde** re-verificado el 2026-11-01; `test/COBERTURA.md:6` | Importes, redondeos, recargos, descuentos, prorrateo, ceros, negativos, `NaN`, `-0` |
| 2 | Golden master | `test/golden/master.json` (12 casos), `test/golden/LEEME.md:22-33` | Salida completa del flujo central, campo a campo |
| 3 | Implementación de referencia | `services/calculo.js:12-102`, exports en `:104-110` | Fórmula exacta y rarezas que ningún test nombre |
| 4 | Partición de specs futura | `specs/000-reconocimiento/propuesta-particion-specs.md:79-115` (spec 001) | Alcance documental de las reglas RN-01 a RN-10 |

**Estado real de `specs/001`, `specs/002` y `specs/003`:** **no existen**. El paquete lo declara
expresamente en `specs/SPEC-PACK.md:229-233` («no existe todavía ningún fichero `specs/001-*` a
`specs/009-*`»), y el 2026-11-01 solo hay `specs/000-reconocimiento/` y `specs/SPEC-PACK.md`. Por
decisión de la sesión de trabajo de 2026-11-01, esta spec trata la suite, el golden master y
`services/calculo.js` como contrato inmutable, y cita la partición 001 como referencia documental
no vinculante. Si algún día se redactan las specs 001 a 003 y contradicen la suite o el golden
master, **prevalece la suite** (Principio II, `constitution.md:61-91`).

### Decisiones registradas en esta sesión (2026-11-01)

| ID | Decisión | Consecuencia en la spec |
|---|---|---|
| D-M1 | El contrato inmutable es la suite de 116 tests, el golden master sin regenerar y `services/calculo.js`. | Las specs 001-003 se citan como ausentes, no como fuente vigente. |
| D-M2 | Se extraen **las cinco** funciones, incluida `calcularProrrateo`. | Desviación expresa respecto a `consumidores-motor.md:5-7,44-46,120-124`; ver §Desviaciones. |
| D-M3 | La spec se numera **010** para no ocupar los números 001-003 reservados por la partición. | Carpeta `specs/010-motor-calculo-strangler`; rama homónima. |
| D-M4 | La batería del anillo (c) se fija en **100 casos**, no en la batería masiva inicialmente descrita. | SC-003 exige 0 diferencias sobre 100 casos con semilla fija; FR-015 y FR-016 no cambian. |

### Frontera de módulo

- **Dentro:** la carpeta nueva `motor/` y el fichero `services/calculo.js` en su papel final de
  fachada. Nada más.
- **Fuera:** `lib/util.js` (se consume, no se modifica), `routes/*`, `scripts/*`, `server.js`,
  `db.js`, `config.js`, `views/*`, `public/*`, `test/*.test.js` existentes, `test/golden/*` y
  cualquier corrección de anomalías.

---

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Las facturas siguen cuadrando céntimo a céntimo (Prioridad: P1)

Puri, en la gestoría, recibe el fichero de facturas y lo cuadra línea a línea con Contaplus. Tras
la modernización, cada base, cuota de IVA, cuota de recargo, descuento y total debe ser idéntico al
de antes, incluidos los casos raros que ya venían mal. Si un solo céntimo cambia, el trimestre se
devuelve otra vez, como en mayo de 2019 (`services/calculo.js:3-7`).

**Por qué esta prioridad**: es el riesgo económico y legal máximo del sistema. Todas las facturas
manuales, de remesa y rectificativas pasan por este motor.

**Prueba independiente**: ejecutar la suite completa de characterization tests y el golden master con el
motor nuevo como implementación efectiva; exigir 116/116 en verde y cero diferencias en los 12
casos, sin tocar ni un test ni regenerar el golden.

**Escenarios de aceptación**:

1. **Dada** la suite de 116 tests sin modificar, **Cuando** se ejecuta con `motor/` como
   implementación efectiva, **Entonces** pasan los 116, con 0 fallos, 0 saltados y 0 omitidos.
2. **Dado** `test/golden/master.json` sin regenerar, **Cuando** se ejecuta el golden master contra
   `motor/`, **Entonces** los 12 casos coinciden campo a campo y `git diff test/golden/master.json`
   está vacío.
3. **Dada** una factura con descuento por volumen del 2 % o del 5 %, **Cuando** se calcula con el
   motor nuevo, **Entonces** el descuento se aplica línea a línea antes de IVA y recargo, sin redondear
   el total al final.

---

### Historia de usuario 2 - La equivalencia se demuestra por doble ejecución (Prioridad: P1)

El equipo de modernización y quien audite el cambio necesitan una prueba que no dependa de la
memoria de nadie: la misma entrada, ejecutada a la vez por la implementación heredada y por la
nueva, debe dar exactamente la misma salida en todos los campos.

**Por qué esta prioridad**: es la única prueba que cubre combinaciones que los tests existentes no
enumeran, y la que permite afirmar «equivalente» en lugar de «parece que pasa».

**Prueba independiente**: lanzar la batería comparativa con semilla fija y comprobar cero diferencias
campo a campo, incluidas las rarezas `-0` y `NaN`.

**Escenarios de aceptación**:

1. **Dada** una batería generada de forma determinista con semilla fija, **Cuando** se ejecutan
   ambas implementaciones sobre cada caso, **Entonces** toda diferencia campo a campo es cero.
2. **Dada** la misma semilla, **Cuando** se repite la batería en otra máquina o en otra ejecución,
   **Entonces** se generan exactamente los mismos casos y el mismo resultado.
3. **Dado** un caso que produce `-0` en la implementación heredada, **Cuando** se compara, **Entonces**
   el motor nuevo también produce `-0` y la comparación lo distingue de `0`.
4. **Dado** un caso que produce `NaN` en la implementación heredada, **Cuando** se compara, **Entonces**
   el motor nuevo también produce `NaN` y la comparación lo considera igual a `NaN`, no una
   diferencia espuria.

---

### Historia de usuario 3 - La conmutación es invisible para quien usa el sistema (Prioridad: P2)

Marga emite una factura desde la pantalla y Julián lanza la remesa del mes. Ninguno de los dos debe
enterarse de que el cálculo se hace ahora en otro sitio: la ruta del módulo, los nombres de las
funciones y la forma del resultado son los mismos.

**Por qué esta prioridad**: protege la operación diaria y evita que la modernización obligue a tocar
consumidores, que están sin cobertura HTTP (SPEC-PACK.md §4.2).

**Prueba independiente**: comprobar que los ficheros consumidores no cambian, que la fachada exporta
exactamente las cinco funciones y que las rutas y la remesa siguen funcionando igual al ejecutar la
suite.

**Escenarios de aceptación**:

1. **Dados** los consumidores actuales (`routes/facturas.js:9,66`,
   `routes/contratos.js:7,39`, `scripts/remesa_mensual.js:11,55`), **Cuando** se conmuta la fachada,
   **Entonces** ninguno de esos ficheros cambia ni una línea.
2. **Dado** el módulo `services/calculo.js`, **Cuando** se inspeccionan sus exports después de la
   conmutación, **Entonces** expone exactamente `recargoPara`, `calcularLinea`, `porcentajeDescuento`,
   `calcularFactura` y `calcularProrrateo`, sin añadir ni quitar ninguna.
3. **Dada** la fachada conmutada, **Cuando** se ejecuta la suite completa, **Entonces** siguen pasando
   los 116 tests y el golden master.

---

### Historia de usuario 4 - Lo que ya estaba mal sigue estando mal, igual (Prioridad: P2)

El negocio decidió no corregir todavía ciertas rarezas. La modernización no es la ocasión de
arreglarlas de paso: si el motor nuevo «mejora» algo, deja de ser equivalente y rompe el contrato.

**Por qué esta prioridad**: el Principio I prohíbe cualquier cambio de comportamiento no autorizado, y
las rarezas están clasificadas como `ABIERTA_TECNICA`, que no autoriza nada.

**Prueba independiente**: reproducir las rarezas documentadas contra el motor nuevo y exigir el mismo
resultado anómalo que la implementación heredada.

**Escenarios de aceptación**:

1. **Dado el caso** `calcularLinea(1, 100, '21', true)`, **Cuando** se ejecuta en el motor nuevo, **Entonces**
   devuelve IVA 21 y recargo 0, como la implementación heredada (A-22,
   `test/calculo.test.js:27-30`).
2. **Dado el caso** `redondear2(-0.005)`, **Cuando** se usa desde el motor nuevo, **Entonces** el resultado
   es `-0` y `Object.is(resultado, -0)` es verdadero (A-23, `test/util.test.js:29` y
   `test/anomalias.test.js:209-212`).
3. **Dado** un cliente `null` o `undefined`, **Cuando** se calcula la factura, **Entonces** no se aplica
   recargo y no se lanza ninguna excepción.
4. **Dado** un cliente con `recargo_equivalencia` igual a la cadena `'1'`, **Cuando** se calcula la
   factura, **Entonces** sí se aplica recargo, por la comparación laxa congelada en
   `test/calculo.test.js:199-210`.

---

### Casos límite

- Base bruta exactamente 1.000,00 € y 5.000,00 €: no hay descuento (umbrales estrictos,
  `services/calculo.js:39-43`).
- Base bruta 1.000,01 € y 5.000,01 €: descuento del 2 % y del 5 % respectivamente.
- Tipos de IVA antiguos 16, 18, 7 y 8: conservan su recargo (16/18 → 4; 7/8 → 1).
- Tipo de IVA 0, negativo, nulo o no listado: recargo 0, sin error.
- Cantidad o precio negativos, cero, `NaN` o `undefined`: se reproduce el resultado actual sin
  añadir validaciones nuevas.
- Líneas vacías: devuelve totales a cero, como hoy.
- Precio con coma flotante (`0.1 + 0.2`, `21.6`): se reproduce el artefacto de redondeo actual.
- Prorrateo de 31 días: tope de 30; días invertidos: mínimo 0; mismo día: un día; febrero y
  bisiesto: días por diferencia, sin calendario.
- Fecha de prorrateo con formato inesperado: se reproduce el resultado actual, incluida la
  excepción si la hay, sin añadir validaciones.
- `-0` frente a `0`: la comparación debe distinguirlos.
- `NaN` frente a `NaN`: la comparación no debe tratarlos como diferencia.

---

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Motor nuevo**

- **FR-001**: El sistema MUST contener una implementación nueva del motor de cálculo en la carpeta
  `motor/`, separada del código heredado y sin sustituirlo todavía durante la verificación.
- **FR-002**: `motor/` MUST exportar exactamente las cinco funciones del motor heredado, con los
  mismos nombres, el mismo número de parámetros y el mismo significado:
  `recargoPara(tipoIva)`, `calcularLinea(cantidad, precio, tipoIva, conRecargo)`,
  `porcentajeDescuento(baseTotal)`, `calcularFactura(lineas, cliente)` y
  `calcularProrrateo(cuota, desde, hasta)`.
- **FR-003**: `motor/` MUST devolver exactamente la misma forma de resultado que
  `services/calculo.js:12-102`: los mismos nombres de campo, los mismos tipos y el mismo orden de
  líneas. En `calcularFactura`, cada línea conserva `descripcion`, `cantidad`, `precio`, `tipoIva`,
  `base`, `cuotaIva` y `cuotaRecargo`, y el resultado conserva `lineas`, `base`, `iva`, `recargo`,
  `total` y `descuentoPct`.
- **FR-004**: `motor/` MUST ser puro y determinista: sin base de datos, sin red, sin reloj, sin
  ficheros, sin procesos y sin aleatoriedad. Con la misma entrada debe producir siempre la misma
  salida, sin mutar los objetos recibidos.
- **FR-005**: `motor/` MUST NOT introducir ninguna dependencia de paquete externo. Solo puede
  reutilizar `lib/util.redondear2` sin modificar `lib/util.js`, porque el redondeo es la fuente de
  la equivalencia y extraerlo sería abrir un segundo módulo.
- **FR-006**: `motor/` MUST reproducir el redondeo **por línea** y nunca redondear el total al
  final, tal como exige el aviso de `services/calculo.js:3-7`.
- **FR-007**: `motor/` MUST ser consumible con `require` desde el código heredado, sin cambiar el
  estilo de importación existente ni obligar a convertir ningún consumidor a otro formato de
  módulo.

**Fachada y conmutación**

- **FR-008**: `services/calculo.js` MUST seguir existiendo en la misma ruta y MUST pasar a
  reexportar `motor/`, conservando exactamente las cinco funciones y sus firmas. No puede añadir,
  quitar ni renombrar exports.
- **FR-009**: Ningún consumidor MUST modificarse: ni `routes/facturas.js`, ni
  `routes/contratos.js`, ni `scripts/remesa_mensual.js`, ni ningún otro fichero de aplicación,
  vista, script o configuración.
- **FR-010**: La retirada del código heredado MUST quedar fuera de esta spec. Durante toda la
  verificación, la implementación antigua MUST seguir disponible y ejecutable como referencia.

**Equivalencia (tres anillos)**

- **FR-011 (anillo a)**: La suite completa de characterization tests MUST pasar en verde ejecutada
  con `motor/` como implementación efectiva bajo prueba, **sin modificar, renombrar, saltar,
  debilitar ni borrar ningún test existente**. Se exigen 116 de 116, con 0 fallos y 0 saltados.
- **FR-012 (anillo b)**: El golden master MUST pasar sin regenerarse y con `test/golden/master.json`
  idéntico byte a byte, ejecutado con `motor/` como implementación efectiva. Los 12 casos deben
  coincidir campo a campo.
- **FR-013 (anillo c)**: MUST existir un test de equivalencia comparativa que ejecute **ambas**
  implementaciones sobre la misma batería de casos generados de forma determinista con semilla
  fija, y que exija igualdad exacta campo a campo en cada caso.
- **FR-014**: La comparación del anillo c MUST distinguir `-0` de `0` y MUST considerar `NaN` igual
  a `NaN`; no puede basarse en serialización JSON, que pierde ambas distinciones.
- **FR-015**: La batería del anillo c MUST cubrir, como mínimo: importes y cantidades con
  decimales; tipos de IVA 21, 10, 4, 16, 18, 8, 7 y 0; clientes con y sin recargo, incluido
  `recargo_equivalencia` en cadena; 0, 1 y varias líneas; las fronteras de descuento alrededor de
  1.000 € y 5.000 €; valores negativos y cero; y prorrateos dentro del mismo mes con días
  invertidos, 31 días, febrero y año bisiesto.
- **FR-016**: La batería del anillo c MUST ser reproducible: la semilla MUST quedar fijada en el
  propio control de versiones y dos ejecuciones con la misma semilla MUST generar los mismos casos.
- **FR-017**: La verificación MUST dejar constancia escrita de la evidencia: comandos ejecutados,
  fecha, resultado y recuento de casos comparados, en el registro de la spec.

**Límites de la obra**

- **FR-018**: El sistema MUST NOT corregir ninguna anomalía del registro en esta spec. A-22 y A-23
  se reproducen tal cual; A-09 se conserva porque ya describe el comportamiento actual.
- **FR-019**: El sistema MUST NOT cambiar ningún importe, redondeo, fecha, numeración, formato,
  mensaje ni salida observable.
- **FR-020**: El sistema MUST NOT añadir ni actualizar dependencias, ni modificar
  `package.json`, `package-lock.json` o `node_modules`.
- **FR-021**: El estilo JavaScript moderno MUST limitarse al interior de `motor/`; fuera de la
  costura se conserva el estilo heredado (ES5 con `var`), según `constitution.md:186-188`.

### Entidades clave

- **Motor moderno (`motor/`)**: implementación nueva y pura de las cinco operaciones de cálculo.
  Debe ser equivalente campo a campo a la heredada, incluidas sus rarezas.
- **Fachada heredada (`services/calculo.js`)**: punto de entrada estable que conserva ruta, nombre
  y API para todos los consumidores y delega en el motor moderno tras la conmutación.
- **Contrato ejecutable**: conjunto formado por la suite de 116 tests, el golden master de 12 casos
  y la implementación de referencia. Es la autoridad, no un documento.
- **Arnés de equivalencia**: prueba comparativa de doble ejecución con batería determinista. No es
  un módulo de negocio ni sustituye a la suite; la complementa.

---

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El 100 % de la suite de characterization tests pasa con el motor nuevo (116 de 116),
  con 0 fallos, 0 saltados y 0 tests modificados.
- **SC-002**: Los 12 casos del golden master coinciden campo a campo y el fichero
  `test/golden/master.json` no cambia ni un byte (diferencia vacía).
- **SC-003**: La batería comparativa registra **0 diferencias** sobre **100 casos** generados con
  semilla fija.
- **SC-004**: El 100 % de los ficheros consumidores y de la aplicación quedan intactos: la lista de
  ficheros modificados se limita a `motor/`, `services/calculo.js`, el arnés de equivalencia (test,
  generador y referencia heredada), `test/COBERTURA.md` y los artefactos de documentación de la
  spec.
- **SC-005**: 0 dependencias nuevas y 0 cambios en `package.json`, `package-lock.json` y
  `node_modules`.
- **SC-006**: Las cinco funciones del motor heredado están presentes en el motor nuevo y en la
  fachada, con 0 exports añadidos, 0 quitados y 0 renombrados.
- **SC-007**: Las tres rarezas congeladas (A-22, A-23 y el `-0`) se reproducen exactamente: 0
  comportamientos «mejorados».
- **SC-008**: Dos ejecuciones de la batería con la misma semilla generan exactamente los mismos
  casos y el mismo veredicto, en cualquier máquina y zona horaria.
- **SC-009**: La evidencia de los tres anillos queda registrada por escrito con comando, fecha y
  resultado, de modo que una tercera persona pueda repetirla sin preguntar.

---

## Supuestos

- **Contrato**: se asume que la suite, el golden master y `services/calculo.js` son la fuente
  vigente de comportamiento, y que las specs 001 a 003 se redactarán después sin contradecirlas. Si
  lo hicieran, prevalece la suite (Principio II).
- **«Cero dependencias externas»**: se interpreta como **cero paquetes npm**. Reutilizar
  `lib/util.redondear2` es una dependencia interna permitida y deseable: cambiarla obligaría a
  abrir `lib/util.js`, que está fuera de alcance, y duplicar el redondeo crearía riesgo de deriva.
  Esta lectura coincide con `consumidores-motor.md:164` («No extraer a la vez `lib/util.js`;
  `redondear2` se queda donde está y se consume igual»).
- **«JavaScript moderno»**: se aplica solo dentro de `motor/`; el módulo sigue siendo CommonJS
  para que `require('../services/calculo')` siga funcionando sin tocar consumidores.
- **Alcance del prorrateo**: se incluye `calcularProrrateo` por instrucción expresa, aunque
  `consumidores-motor.md:5-7` lo reservaba para la spec 005. La extracción es de equivalencia pura:
  no toca la ruta de contratos ni implementa A-11.
- **Numeración**: la spec usa el número 010 para no ocupar los números 001-003 que la partición
  reserva a otras specs.
- **Ejecución «contra `motor/`»**: se asume que puede demostrarse sin editar los tests existentes,
  bien conmutando la fachada y ejecutando, bien sustituyendo la resolución del módulo bajo prueba.
  El mecanismo concreto es una decisión de plan, no de esta spec.
- **Cobertura de la red**: se asume que la suite actual es suficiente para autorizar la extracción
  del motor, como sostiene `consumidores-motor.md:128-133`. Las rutas HTTP y la remesa siguen sin
  cobertura de comportamiento (SPEC-PACK.md §4.2) y eso no se resuelve aquí.
- **Datos reales**: la verificación no toca la base de datos de producción ni emite facturas. No
  se ejecuta `scripts/remesa_mensual.js` (AGENTS.md).

---

## Desviaciones, riesgos y preguntas abiertas

### Desviaciones registradas

| ID | Desviación | Motivo | Mitigación |
|---|---|---|---|
| DESV-01 | Se incluye `calcularProrrateo`, que `consumidores-motor.md:5-7,44-46,161-163` excluía del primer seam y asignaba a la spec 005 y a la decisión A-11. | Instrucción expresa de la sesión de 2026-11-01: el encargo nombra las cinco funciones. | Es la misma función, del mismo fichero, pura y ya cubierta por 7 tests. No se implementa A-11 ni se toca `routes/contratos.js`; solo se demuestra equivalencia. |

### Riesgos

- **Doble implementación viva**: mientras convivan ambas, pueden divergir por un cambio futuro en
  una sola. Mitigación: la comparativa se conserva hasta la retirada aprobada del código heredado.
- **Comparación engañosa**: `JSON.stringify` convierte `-0` en `0` y `NaN` en `null`, y ocultaría
  diferencias reales. Mitigación: FR-014 exige comparación con semántica `Object.is`.
- **Criterio (a) trivializado**: si la suite se ejecuta solo a través de la fachada ya conmutada,
  el anillo (a) no distingue motor nuevo de viejo. Mitigación: FR-011 exige que `motor/` sea la
  implementación efectivamente bajo prueba, y el anillo (c) es la prueba independiente.
- **Efecto colateral en `-0`**: cualquier refactor «limpio» que normalice el cero negativo rompe la
  equivalencia de A-23. Mitigación: SC-007.

### Preguntas abiertas para el plan

- ¿La batería comparativa vive en un fichero de test nuevo dentro de `test/` o en un script de
  verificación separado? Debe poder ejecutarse sin la base de datos y sin red.
- ¿Cómo se ejecuta la suite «contra `motor/`» antes de conmutar: sustitución de resolución de
  módulos o conmutación temporal reversible? Cualquiera de las dos es válida si no modifica los
  tests.
- ¿Se conserva la implementación heredada en un fichero aparte para que la comparativa siga
  ejecutándose después de la conmutación? El anillo (c) y FR-010 lo exigen al menos durante esta
  spec.
