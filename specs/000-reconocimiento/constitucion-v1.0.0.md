<!--
Sync Impact Report
- Version change: (sin versión previa) → 1.0.0
- Modified principles: ninguna (creación inicial; se definen I–V)
- Added sections: Principios Fundamentales (I–V), Restricciones Adicionales,
  Flujo de Trabajo y Verificación, Gobernanza
- Removed sections: ninguna
- Deferred TODOs: ninguno
-->

# Constitución de GesFact

Proyecto: GesFact 2.4 — sistema heredado de facturación de Suministros Hidalgo, S.L.
Fase actual: documentación y protección del sistema en producción. El objetivo NO es
mejorarlo, sino entenderlo con evidencia y preservar su comportamiento exacto.

## Principios Fundamentales

### I. El comportamiento actual es sagrado (INNEGOCIABLE)

Ningún cambio de comportamiento observable puede introducirse sin una decisión explícita y
por escrito del negocio, registrada con responsable y fecha. Un comportamiento que parezca
un error NO autoriza su corrección: se registra (Principio III) y se eleva como pregunta.

Se considera comportamiento observable, entre otros: importes, redondeos, cálculo de IVA y
totales, numeración y series de facturas, fechas y vencimientos, orden y contenido de las
líneas, mensajes de error visibles, respuestas HTTP, rutas y el contenido exacto de los
ficheros exportados para la gestoría. La comparación se hace céntimo a céntimo.

Toda propuesta que pueda alterar una salida DEBE incluir una comparación antes/después y la
aprobación del negocio. Ante la duda, el comportamiento se conserva.

Rationale: el sistema factura dinero real y terceros (la gestoría) dependen de que sus
resultados sean exactos. Un cambio aparentemente inocuo puede producir facturas o
declaraciones incorrectas.

### II. Evidencia obligatoria

Toda afirmación sobre lo que el sistema hace DEBE ir acompañada de evidencia verificable y
reproducible: fichero y líneas de código, consulta con su resultado real sobre la base de
datos, o testimonio del negocio con nombre y fecha. Sin evidencia, la afirmación no se
acepta como hecho.

Las suposiciones se marcan literalmente como `SUPOSICIÓN` y se convierten en preguntas para
el negocio. Una `SUPOSICIÓN` no puede sostener una conclusión, una tarea de implementación
ni una decisión de cambio.

La evidencia debe poder repetirse: se indica el comando, la consulta o los datos de entrada
empleados, y el resultado obtenido.

### III. Los hallazgos se registran, no se corrigen

Los bugs, riesgos y rarezas detectados se anotan en el registro de anomalías del proyecto;
no se corrigen en esta fase. Cada entrada DEBE incluir, como mínimo: identificador, título,
evidencia, comportamiento observado, impacto, clasificación y estado.

Clasificaciones admitidas: bug confirmado, riesgo, rareza (comportamiento no documentado o
intencionado), deuda técnica y dependencia obsoleta. Corregir un hallazgo es una decisión
del módulo siguiente, sujeta al Principio I.

Quedan prohibidos los arreglos silenciosos y los refactors de paso, aunque el defecto sea
evidente.

### IV. Cero dependencias nuevas y cero refactors

No se añade ningún paquete, dependencia, herramienta de build ni servicio. No se actualizan
las dependencias existentes. No se reorganizan ficheros, directorios, módulos, nombres ni
interfaces, ni se reformatea el código.

Los tests de caracterización usan exclusivamente el runner nativo de Node (`node:test` y
`node:assert`), sin librerías externas de test, dobles de prueba ni frameworks adicionales.

Los tests DEBEN ser aislados y no destructivos: no tocan la base de datos real de
producción, no acceden a la red y trabajan sobre copias temporales o datos de prueba.

Rationale: en un sistema heredado en producción, cada dependencia y cada refactor añaden
riesgo sin aportar valor a esta fase.

### V. Todo en español de España

Todos los artefactos de esta fase se redactan en español de España: especificaciones,
planes, tareas, documentación, mensajes de commit, nombres de tests y sus descripciones.

Los identificadores de código existentes no se renombran (Principio IV). Los formatos
numéricos y de fecha del sistema no se alteran: son comportamiento observable y se rigen por
el Principio I.

## Restricciones Adicionales

- Stack congelado: Node.js, Express 4, EJS, body-parser y sqlite3, con la base de datos
  SQLite configurada en `config.js` (`RUTA_BD`). No se sustituye ni se amplía.
- No se modifican credenciales, parámetros de configuración ni secretos de `config.js`. El
  envío de facturas por correo está roto desde 2022 y no se toca sin decisión del negocio.
- No se ejecutan operaciones destructivas sobre datos reales. Las copias de seguridad se
  rigen por lo indicado en `LEEME.txt`.
- No se alteran el puerto, las rutas, los contratos HTTP ni la estructura de las vistas.
- `node_modules/` y la base de datos generada al arrancar no se versionan. Los artefactos
  locales y temporales quedan fuera del repositorio.

## Flujo de Trabajo y Verificación

1. Caracterizar antes de tocar nada: describir el comportamiento actual y respaldarlo con
   evidencia (Principio II).
2. Escribir tests de caracterización que fijen ese comportamiento con `node:test`, sobre
   copias de datos, y comprobar que pasan con el código sin modificar.
3. Registrar cada hallazgo en el registro de anomalías con su clasificación, sin corregirlo.
4. Revisar todo artefacto contra los cinco principios. Si contradice alguno, se rechaza.
5. Criterio de fin de fase: comportamiento documentado y con evidencia, tests de
   caracterización en verde, registro de anomalías actualizado y ningún fichero de
   aplicación modificado.

## Gobernanza

Esta constitución prevalece sobre cualquier otra práctica, convención o instrucción de
equipo. El incumplimiento de un principio bloquea la aceptación del trabajo.

Enmiendas: cualquier cambio requiere propuesta escrita, justificación, evidencia y
aprobación explícita del negocio con nombre y fecha. La aprobación se anota en esta
constitución y se actualiza la versión.

Versionado semántico: MAYOR si se elimina o redefine un principio existente (cambio
incompatible); MENOR si se añade un principio o una sección, o se amplía materialmente la
guía; PARCHE para aclaraciones y correcciones de redacción sin cambio de significado.

La conformidad se revisa al cerrar cada fase. Cualquier excepción debe quedar registrada por
escrito con responsable, fecha y alcance; no se admiten excepciones implícitas.

**Version**: 1.0.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28
