// motor-como-fachada.js - Precarga para ejecutar la suite «contra motor/».
//
// Uso:
//   TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/*.test.js
//
// Sustituye services/calculo.js por motor/calculo.js en require.cache ANTES de
// que los tests lo importen. No modifica ningún fichero de test ni el código de
// la aplicación: solo afecta al proceso de test en curso.
//
// Patrón equivalente al que ya usa test/helpers/cargar-modulo-con-db.js para
// doblar db.js. Ver specs/010-motor-calculo-strangler/research.md (R-01).
var path = require('node:path');

var rutaFachada = require.resolve('../../services/calculo');
var motor = require('../../motor/calculo');

require.cache[rutaFachada] = {
  id: rutaFachada,
  filename: rutaFachada,
  loaded: true,
  exports: motor,
  children: [],
  paths: [],
  parent: null
};

// Comprobación de que la precarga tiene la forma esperada. Si esto falla, la
// evidencia de los anillos (a) y (b) no valdría.
if (require(rutaFachada) !== motor) {
  throw new Error('La precarga no ha sustituido services/calculo por motor/calculo');
}

module.exports = { rutaFachada: rutaFachada, rutaMotor: path.resolve(__dirname, '../../motor/calculo.js') };
