# AGENTS.md — GesFact 2.4 (sistema heredado en producción)

Facturación real de Suministros Hidalgo, S.L. Fase actual: documentar y proteger, **no mejorar**.
Antes de tocar nada, lee `.specify/memory/constitution.md`: es normativa, no decoración.

## Reglas innegociables

- El comportamiento observable (importes, redondeos, numeración, fechas, CSV a la gestoría, rutas,
  mensajes) no se cambia sin decisión escrita del negocio. Un bug aparente tampoco autoriza cambio.
- Toda afirmación sobre el sistema debe citar evidencia: fichero:líneas, dato real de la BD o
  testimonio con nombre y fecha. Marca lo no verificado como `SUPOSICIÓN` y conviértelo en pregunta.
- Los hallazgos se **registran**, no se corrigen. El registro de anomalías está en
  `specs/000-reconocimiento/registro-anomalias.md`; cada entrada lleva evidencia, clasificación y
  estado. Nunca arregles de paso.
- Cero dependencias nuevas, cero actualizaciones, cero refactors, renombrados o reformateos.
- Todo en español de España: documentación, commits, nombres y descripciones de tests, UI.
- Conserva el estilo existente: ES5 (`var`, callbacks), plantillas EJS, sin capas nuevas.

## Comandos

```bash
npm install --no-package-lock   # el package-lock está incompleto (falta node-addon-api de sqlite3)
npm start                        # = node server.js → http://localhost:3000 (config.PUERTO)
node --test                      # no hay script npm de test; runner nativo node:test
node --test test/calculo.test.js # un solo fichero
node --test --test-name-pattern="redondeo"   # un solo test
```

- Ejecuta siempre desde la raíz del repo: `config.RUTA_BD` es relativa (`./datos/gesfact.db`).
- El primer arranque crea el esquema en `db.js` y siembra datos de ejemplo si `clientes` está vacía.
  `datos/gesfact.db` es generada, no forma parte del repo; la BD real de producción no está aquí.
- `LEEME.txt` está desactualizado (habla de Node 8); verificado con Node 24 y el binario N-API de sqlite3.
- `node scripts/remesa_mensual.js YYYY-MM` **emite facturas reales** en la BD configurada. No lo
  ejecutes contra datos reales ni en pruebas; si lo necesitas, usa una copia desechable del repo.

## Arquitectura mínima

- `server.js` monta Express + EJS y las rutas `/clientes`, `/articulos`, `/contratos`, `/facturas`,
  `/informes`; estáticos en `public/`, vistas en `views/` (incluyen `cabecera.ejs` y `pie.ejs`).
- `db.js` abre SQLite al hacer `require` y crea tablas con `CREATE TABLE IF NOT EXISTS`. No hay
  migraciones. Importar rutas o `db.js` ya toca la BD: para pruebas aisladas copia el repo a `/tmp` o
  prueba solo módulos puros (`lib/util.js`, `services/calculo.js`).
- Cálculos en `services/calculo.js`: redondeo **por línea** (la gestoría cuadra línea a línea; no
  cambiar), descuento por volumen aplicado línea a línea, recargo de equivalencia por tipo de IVA y
  prorrateo comercial con mes de 30 días. Los totales solo se calculan en servidor, no en el navegador.
- Numeración en `lib/numeracion.js` con la tabla `contadores`: series `FA` y `RE`, correlativas por año.
  Las facturas **no se borran nunca** (legal); los errores se corrigen con rectificativa `RE`, que
  copia las líneas con signo invertido sin recalcular.
- `routes/informes.js`: el CSV para la gestoría tiene formato cerrado (clave en la primera línea, `;`
  y decimales con coma). `services/email.js` es un stub desactivado desde 2022; no lo reactives.
- BD en fechas `YYYY-MM-DD`; pantalla/impresión `DD/MM/YYYY`; importes `1.234,56`.

## Trampas conocidas (registrar, no arreglar)

- Numeración no atómica (`ultimo + 1`): posible duplicado con dos altas simultáneas.
- `util.sumarDias` opera con milisegundos: puede desviarse un día con cambios de hora.
- `util.validarNIF` solo comprueba longitud, no la letra.
- El alta de factura inserta cabecera y líneas sin transacción.
- `public/js/factura.js` solo autorrellena precio/IVA; no replica cálculos.

## Git y Spec Kit

- `.gitignore` excluye `node_modules/`, la BD local `datos/*.db` (y sus `-wal`/`-shm`), logs y
  cobertura. No añadas esos artefactos al índice.
- Commits en español. El flujo Spec Kit está en `.opencode/commands/`; los artefactos de spec van a
  `specs/` (aún no existe) y pueden crearse ramas/commits automáticos mediante `.specify/extensions.yml`.
