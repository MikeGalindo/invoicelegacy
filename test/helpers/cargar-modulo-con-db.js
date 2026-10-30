// Carga un módulo de la aplicación sustituyendo `db.js` por un doble de prueba.
// No toca la base de datos real. Solo para tests de caracterización.
var path = require('node:path');

function cargarConDbFake(rutaRelativaRaiz, fakeDb) {
  var rutaDb = path.resolve(__dirname, '../../db.js');
  var rutaModulo = path.resolve(__dirname, '../../', rutaRelativaRaiz);
  var original = require.cache[rutaDb];

  require.cache[rutaDb] = {
    id: rutaDb,
    filename: rutaDb,
    loaded: true,
    exports: fakeDb,
    children: [],
    paths: []
  };

  delete require.cache[rutaModulo];
  var exportado = require(rutaModulo);

  if (original) {
    require.cache[rutaDb] = original;
  } else {
    delete require.cache[rutaDb];
  }

  return exportado;
}

module.exports = { cargarConDbFake: cargarConDbFake };
