<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0 (MAYOR: se redefinen principios vigentes y se levanta una
  prohibición estructural; el cambio es incompatible con la gobernanza anterior).
- Modified principles:
  - I. El comportamiento actual es sagrado (INNEGOCIABLE) → I. El comportamiento es sagrado
    por defecto (INNEGOCIABLE)
  - IV. Cero dependencias nuevas y cero refactors → IV. Dependencias justificadas y aprobadas
  - V. Todo en español de España → VI. Todo en español de España
- Added principles:
  - II. Los characterization tests son el árbitro
  - III. Estrangulamiento antes que reescritura
  - V. Ningún cambio retroactivo jamás (INNEGOCIABLE)
- Retired as principles (contenido conservado donde sigue aplicando):
  - II. Evidencia obligatoria → pasa a "Restricciones Adicionales"
  - III. Los hallazgos se registran, no se corrigen → subsumido en el Principio I
- Added sections: "Registro de enmiendas"
- Removed sections: ninguna (se reescriben "Restricciones Adicionales" y
  "Flujo de Trabajo y Verificación" para la fase de modernización)
- Deferred TODOs: TODO(NOMBRE_APROBADOR) — anotar el nombre de la persona que aprueba la
  enmienda v2.0.0 y la fecha de firma.
-->

# Constitución de GesFact

Proyecto: GesFact 2.4 — sistema heredado de facturación de Suministros Hidalgo, S.L.
Fase actual: **MODERNIZACIÓN**. La fase de documentación y protección ha terminado: el
comportamiento está descrito, congelado por characterization tests y con las anomalías
registradas. A partir de ahora el sistema se moderniza por módulos, sin perder ni un céntimo
del comportamiento que el negocio no haya decidido cambiar por escrito.

## Principios Fundamentales

### I. El comportamiento es sagrado por defecto (INNEGOCIABLE)

Ningún cambio de comportamiento observable puede introducirse sin una decisión de negocio
explícita, por escrito y registrada, que indique **quién** la tomó y **cuándo** (fecha ISO).
El registro oficial es `specs/000-reconocimiento/registro-anomalias.md`; si algún día se
sustituye, la constitución se enmienda para citar el nuevo documento.

Solo autorizan un cambio las entradas en estado `RESUELTA_NEGOCIO`. Las entradas en estado
`PENDIENTE`, `DUDOSA`, `PARCIAL`, `ABIERTA_TECNICA` o `RESUELTA_PROPUESTA` **no** autorizan
nada: una propuesta del analista no es una decisión del negocio. Las decisiones del acta de
2026-10-30 son una simulación y siguen pendientes de ratificación real; hasta que se ratifiquen
con nombre y fecha, no habilitan ningún cambio de comportamiento.

Se considera comportamiento observable, entre otros: importes, redondeos, cálculo de IVA,
recargo de equivalencia y totales, numeración y series de facturas, fechas y vencimientos,
orden y contenido de las líneas, mensajes de error visibles, respuestas HTTP y códigos de
estado, rutas y el contenido exacto de los ficheros exportados para la gestoría. La comparación
es céntimo a céntimo y carácter a carácter.

Toda decisión que habilite un cambio DEBE acotar su alcance: qué salida cambia, en qué casos y
desde cuándo. Lo no acotado sigue congelado. Un defecto evidente, una rareza o una molestia de
uso **no** son autorización: se registran y se elevan como pregunta.

Rationale: el sistema factura dinero real y la gestoría depende de que sus resultados sean
exactos. La modernización cambia cómo está hecho el sistema, no lo que el negocio ha decidido
que haga.

### II. Los characterization tests son el árbitro

La red de characterization tests es la autoridad última sobre el comportamiento. Manda sobre
documentos, comentarios, especificaciones, opiniones y sobre el propio código nuevo. Los tests
cuyo nombre empieza por `CONGELA comportamiento actual:` y el golden master
(`test/golden/master.json`, generado por `test/golden/flujo-central.js` y regenerado por
`scripts/regenerar-golden-master.js`) son el contrato ejecutable del sistema heredado.

Reglas de uso:

- Modificar, renombrar para escapar del prefijo, desactivar, saltar, debilitar o borrar un test
  `CONGELA comportamiento actual:` exige citar en el propio commit la decisión que lo autoriza,
  con su identificador del registro, el responsable y la fecha. El cuerpo del commit incluye una
  línea `Decisión: <ID> — <responsable>, <fecha ISO>`.
- Regenerar el golden master exige la misma cita en el commit y que el `diff` completo se
  explique caso por caso. Si aparecen cambios en casos que la decisión no cubre, la
  regeneración se rechaza.
- Un test `CONGELA comportamiento actual:` en rojo sin decisión que lo ampare significa que la
  modernización ha roto algo: **se revierte el cambio**, no se ajusta el test.
- Un test nuevo que fije comportamiento no documentado se acompaña de su entrada en el registro
  de anomalías; nunca se presenta como si fuera una decisión.
- Ningún módulo se extrae sin cobertura de caracterización previa de su comportamiento actual,
  incluidos los caminos que hoy solo están congelados por fuente. Esa cobertura es el criterio
  de equivalencia.
- Los tests siguen siendo aislados y no destructivos: no tocan la base de datos real de
  producción, no acceden a la red, no envían correo y no lanzan la remesa real. Trabajan sobre
  copias desechables del repositorio y bases temporales.

Rationale: en un sistema sin especificación original, el único juez fiable de «lo que hacía» es
la prueba que lo congela. Si el test se puede ablandar para que pase, la modernización no tiene
red.

### III. Estrangulamiento antes que reescritura

El sistema se moderniza por módulos, de uno en uno, siguiendo la partición registrada en
`specs/000-reconocimiento/propuesta-particion-specs.md` (specs 001 a 009) o la partición que la
sustituya mediante enmienda. Está **prohibido reescribir más de un módulo a la vez** y prohibida
la reescritura total («big bang»).

Ciclo obligatorio de cada módulo:

1. **Spec aprobada**: el módulo tiene su especificación abierta con el flujo SDD, con las
   decisiones del registro que autorizan cambios y el alcance exacto de la equivalencia.
2. **Caracterización**: el comportamiento actual del módulo queda cubierto por tests, incluidos
   los caminos que aún no lo estén (rutas HTTP, remesa end-to-end, informes y CSV).
3. **Extracción**: el código nuevo se aísla detrás de una costura o fachada, conservando el punto
   de entrada antiguo. El código heredado sigue presente y ejecutable como referencia.
4. **Verificación de equivalencia**: con las mismas entradas, la implementación antigua y la
   nueva producen la misma salida salvo lo expresamente decidido; se comprueba con el golden
   master, con los tests `CONGELA comportamiento actual:` y con fixtures de rutas y CSV.
5. **Conmutación**: solo tras la equivalencia demostrada y registrada se cambia la ruta de
   ejecución. El código antiguo se retira en un paso posterior y aprobado, nunca en el mismo
   cambio en que aparece el nuevo.

Prohibiciones expresas: refactors oportunistas, renombrados o reformateos fuera de la costura
del módulo; mover cálculos del servidor al navegador; cambiar contratos HTTP, rutas o formatos
de exportación como efecto colateral; tocar dos módulos en el mismo cambio.

Rationale: el estrangulamiento permite comparar lo viejo y lo nuevo con datos reales y volver
atrás en cualquier punto. La reescritura simultánea elimina la referencia y la posibilidad de
revertir.

### IV. Dependencias justificadas y aprobadas

Las dependencias nuevas ya no están prohibidas, pero ninguna entra por conveniencia. Cada
dependencia nueva o actualización de una existente requiere, en la spec del módulo:

- el problema concreto que resuelve y por qué la biblioteca estándar de Node (`node:*`) no basta;
- alternativas consideradas, incluida la de no usar ninguna;
- impacto en el comportamiento observable (Principio I), en el arranque y en el despliegue;
- licencia, mantenimiento, superficie de suministro y riesgo de abandono;
- plan de retirada si deja de mantenerse.

Además exige **aprobación explícita por escrito**, con nombre y fecha, anotada en la spec y en el
registro correspondiente. Sin esa aprobación, la dependencia no se instala.

Reglas permanentes:

- Preferencia obligatoria por la biblioteca estándar de Node cuando exista una solución
  razonable. Si se puede hacer con `node:*`, se hace con `node:*`.
- `node:test` y `node:assert` siguen siendo el runner por defecto. Un framework de test, un
  doble de prueba o un cliente HTTP solo entran con la misma justificación y aprobación.
- Ninguna dependencia puede alterar el comportamiento congelado ni los formatos del sistema.
- Las dependencias no se actualizan «de paso»: una actualización es un cambio con su propia
  decisión y su propia verificación.
- No se instalan dependencias en caliente ni se modifica `package-lock.json` fuera del cambio
  aprobado.

Rationale: la prohibición absoluta ya no protege nada en fase de modernización, pero una
dependencia sin dueño ni justificación es deuda que se paga en producción. El listón es la
justificación escrita y la aprobación, no el capricho.

### V. Ningún cambio retroactivo jamás (INNEGOCIABLE)

Las facturas ya emitidas y todo lo que las rodea son intocables, pase lo que pase con la lógica
nueva:

- No se recalculan, reescriben, renumeran, reordenan ni «corrigen» facturas emitidas, ni sus
  líneas, importes, fechas, vencimientos o series (`FA` y `RE`).
- No se ejecutan `UPDATE` ni `DELETE` masivos sobre facturas emitidas, ni scripts de
  recalculación, ni migraciones que reescriban filas históricas.
- Los ficheros ya entregados a la gestoría no se regeneran ni se sustituyen.
- Los errores de una factura emitida se corrigen **solo** con rectificativa `RE`, con el
  mecanismo existente y sin recalcular las líneas originales.
- Cualquier migración de esquema debe ser aditiva y preservar las filas históricas sin
  alterarlas. Antes de migrar se hace copia de seguridad y se verifica su restauración sobre una
  copia desechable.
- Los cambios de comportamiento aprobados se aplican a las facturas emitidas **a partir de la
  fecha de entrada en vigor que fije la decisión**, nunca hacia atrás.
- Si una modernización exigiera tocar datos históricos, se detiene, se registra la anomalía y se
  pregunta al negocio. «Recalcular el histórico» no es una respuesta admitida.

Rationale: el histórico es la prueba fiscal y contractual de lo que se cobró. La lógica puede
mejorar; lo ya facturado no se reescribe.

### VI. Todo en español de España

Todos los artefactos se redactan en español de España: especificaciones, planes, tareas,
documentación, mensajes de commit, comentarios, nombres y descripciones de tests, interfaz y
mensajes de error.

Los formatos del sistema no se alteran: base de datos en `YYYY-MM-DD`, pantalla e impresión en
`DD/MM/YYYY`, importes en `1.234,56`, CSV de la gestoría con `;` y coma decimal. Cualquier cambio
de formato es comportamiento observable y se rige por el Principio I.

Los identificadores de código existentes no se renombran salvo que la spec del módulo lo
justifique dentro de su costura. El estilo heredado (ES5 con `var` y callbacks, plantillas EJS,
sin capas nuevas) se conserva salvo decisión expresa en contrario.

## Restricciones Adicionales

- **Evidencia obligatoria.** Toda afirmación sobre lo que el sistema hace DEBE citar evidencia
  verificable y reproducible: `fichero:líneas`, consulta con su resultado real sobre la base de
  datos, o testimonio con nombre y fecha. Lo no verificado se marca literalmente `SUPOSICIÓN` y
  se convierte en pregunta; una `SUPOSICIÓN` no sostiene conclusiones, tareas ni decisiones.
- **Stack de partida.** Node.js, Express 4, EJS, body-parser y sqlite3, con la base de datos
  SQLite configurada en `config.js` (`RUTA_BD`). Sustituir cualquiera de estas piezas es un
  cambio de dependencia (Principio IV) y, si altera salidas, también del Principio I.
- **Configuración y secretos.** No se modifican credenciales, parámetros ni secretos de
  `config.js`. El envío de facturas por correo está roto desde 2022 (`services/email.js`,
  stub desactivado) y no se reactiva sin decisión del negocio.
- **Datos reales.** No se ejecutan operaciones destructivas sobre datos reales.
  `scripts/remesa_mensual.js` emite facturas reales: solo se ejecuta sobre copias desechables.
  Las copias de seguridad se rigen por lo indicado en `LEEME.txt` y en la spec 009.
- **Cálculo en servidor.** Los totales se calculan solo en el servidor. `public/js/factura.js`
  únicamente autorrellena precio e IVA; no se replica ni se traslada lógica de cálculo al
  navegador.
- **Repositorio limpio.** No se versionan `node_modules/`, la base local `datos/*.db` (ni sus
  `-wal`/`-shm`), logs ni cobertura. Los artefactos temporales quedan fuera del repositorio.

## Flujo de Trabajo y Verificación

1. **Línea base en verde.** Antes de abrir un módulo, `npm test` pasa completo sobre el código
   sin tocar. Si hay rojo previo, se investiga y se registra; no se empieza a modernizar encima.
2. **Spec del módulo.** Se abre con `/speckit.specify` a partir de la partición aprobada. La spec
   enumera las decisiones del registro que autorizan cambios (ID, responsable, fecha, alcance) y
   las que no. Sin decisión, el cambio queda fuera de alcance.
3. **Cobertura primero.** Se completa la caracterización del módulo, empezando por lo que hoy no
   está cubierto: rutas HTTP y remesa end-to-end (`SPEC-PACK.md` §4.3). La cobertura se anota en
   `test/COBERTURA.md`.
4. **Extracción con costura.** El código nuevo convive con el antiguo. Nada se borra antes de
   demostrar equivalencia.
5. **Equivalencia demostrada.** Comparación antigua/nueva con las mismas entradas, el golden
   master y fixtures de rutas, informes y CSV. Se registra la evidencia y el resultado.
6. **Conmutación y cierre.** Se conmuta la ruta de ejecución, se retira el código antiguo en un
   paso aprobado y se actualizan el registro de anomalías y la cobertura.

Puertas de calidad (todas obligatorias para aceptar un cambio):

- Ningún test `CONGELA comportamiento actual:` en rojo sin decisión que lo ampare.
- `git diff` del golden master vacío, salvo decisión citada y `diff` explicado.
- Ningún fichero de aplicación fuera del módulo tocado; ningún módulo segundo abierto.
- Ninguna factura emitida ni dato histórico modificado.
- Commits en español que citan las decisiones aplicadas.
- Criterio de fin de módulo: spec aprobada, equivalencia registrada, caracterización en verde,
  registro y cobertura actualizados y conmutación hecha o explícitamente aplazada.

## Gobernanza

Esta constitución prevalece sobre cualquier otra práctica, convención o instrucción de equipo,
incluidos `AGENTS.md` y `README.md` cuando hayan quedado desfasados respecto a esta enmienda. El
incumplimiento de un principio bloquea la aceptación del trabajo.

Enmiendas: cualquier cambio requiere propuesta escrita, justificación, evidencia y aprobación
explícita del negocio con nombre y fecha. La aprobación se anota en el registro de enmiendas y se
actualiza la versión.

Versionado semántico: MAYOR si se elimina o redefine un principio existente (cambio
incompatible); MENOR si se añade un principio o una sección, o se amplía materialmente la guía;
PARCHE para aclaraciones y correcciones de redacción sin cambio de significado.

La conformidad se revisa al cerrar cada módulo y al cerrar cada fase. Cualquier excepción debe
quedar registrada por escrito con responsable, fecha y alcance; no se admiten excepciones
implícitas.

### Registro de enmiendas

| Versión | Fecha | Fase declarada | Aprobación | Alcance |
|---|---|---|---|---|
| 1.0.0 | 2026-10-28 | Documentación y protección | Responsable del proyecto | Creación: comportamiento sagrado, evidencia, registro sin corrección, cero dependencias. Copia congelada en `specs/000-reconocimiento/constitucion-v1.0.0.md`. |
| 2.0.0 | 2026-10-30 | Modernización | Responsable del proyecto, instrucción directa en sesión de trabajo de 2026-10-30 — TODO(NOMBRE_APROBADOR): anotar nombre y fecha de firma | Fin de la fase de documentación; modernización por estrangulamiento, tests como árbitro, dependencias justificadas, intocabilidad del histórico. |

**Version**: 2.0.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-30
