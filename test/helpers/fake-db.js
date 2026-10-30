// Doble de `db.js` para congelar la numeración sin tocar SQLite.
// Reproduce la tabla `contadores` en memoria y los callbacks asíncronos.
function crearDbFake(opciones) {
  opciones = opciones || {};
  var contadores = new Map();

  function clave(serie, anyo) {
    return serie + '|' + anyo;
  }

  return {
    contadores: contadores,
    get: function (sql, params, cb) {
      setImmediate(function () {
        if (opciones.errorEnGet) return cb(opciones.errorEnGet);
        if (sql.indexOf('SELECT ultimo FROM contadores') === 0) {
          var k = clave(params[0], params[1]);
          if (!contadores.has(k)) return cb(null, undefined);
          return cb(null, { ultimo: contadores.get(k) });
        }
        cb(new Error('SQL no soportado en get: ' + sql));
      });
    },
    run: function (sql, params, cb) {
      setImmediate(function () {
        if (sql.indexOf('INSERT INTO contadores') === 0) {
          if (opciones.errorEnInsert) return cb(opciones.errorEnInsert);
          contadores.set(clave(params[0], params[1]), 0);
          return cb(null);
        }
        if (sql.indexOf('UPDATE contadores SET ultimo') === 0) {
          if (opciones.errorEnUpdate) return cb(opciones.errorEnUpdate);
          contadores.set(clave(params[1], params[2]), params[0]);
          return cb(null);
        }
        cb(new Error('SQL no soportado en run: ' + sql));
      });
    }
  };
}

module.exports = { crearDbFake: crearDbFake };
