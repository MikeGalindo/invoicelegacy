// Compara la salida actual del flujo central con el golden master fijo.
// Si falla, el mensaje indica el caso y el campo exacto.
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var { construirSalida, serializar } = require('./golden/flujo-central');

var RUTA_MASTER = path.join(__dirname, 'golden', 'master.json');

function primeraDiferencia(esperado, actual, ruta) {
  var sitio = ruta || '$';
  if (Object.is(esperado, actual)) return null;

  if (typeof esperado !== typeof actual) {
    return sitio + ': tipo esperado ' + typeof esperado + ', actual ' + typeof actual;
  }

  if (Array.isArray(esperado) || Array.isArray(actual)) {
    if (!Array.isArray(esperado) || !Array.isArray(actual)) {
      return sitio + ': uno es array y el otro no';
    }
    if (esperado.length !== actual.length) {
      return sitio + ': longitud esperada ' + esperado.length + ', actual ' + actual.length;
    }
    for (var i = 0; i < esperado.length; i++) {
      var diffArray = primeraDiferencia(esperado[i], actual[i], sitio + '[' + i + ']');
      if (diffArray) return diffArray;
    }
    return null;
  }

  if (esperado && actual && typeof esperado === 'object') {
    var claves = Array.from(new Set(Object.keys(esperado).concat(Object.keys(actual)))).sort();
    for (var j = 0; j < claves.length; j++) {
      var k = claves[j];
      if (!Object.prototype.hasOwnProperty.call(esperado, k)) {
        return sitio + '.' + k + ': falta en el master';
      }
      if (!Object.prototype.hasOwnProperty.call(actual, k)) {
        return sitio + '.' + k + ': sobra en el master';
      }
      var diffObj = primeraDiferencia(esperado[k], actual[k], sitio + '.' + k);
      if (diffObj) return diffObj;
    }
    return null;
  }

  return sitio + ': esperado ' + JSON.stringify(esperado) + ', actual ' + JSON.stringify(actual);
}

test('GOLDEN MASTER: la salida del flujo central coincide campo a campo', function () {
  var texto = fs.readFileSync(RUTA_MASTER, 'utf8');
  var esperado = JSON.parse(texto);
  var actual = construirSalida();

  var diff = primeraDiferencia(esperado, actual, '');
  assert.equal(diff, null, diff ? 'Diferencia en ' + diff : 'Diferencia en el golden master');

  assert.equal(
    serializar(actual),
    texto,
    'El golden master no está en el formato estable esperado (claves ordenadas o saltos de línea). ' +
    'No lo regeneres para hacer pasar el test: investiga primero la diferencia.'
  );
});

test('GOLDEN MASTER: contiene los 12 casos fijos del flujo central', function () {
  var master = JSON.parse(fs.readFileSync(RUTA_MASTER, 'utf8'));
  assert.equal(master.esquema, 'gesfact-golden-master-flujo-central-v1');
  assert.equal(master.casos.length, 12);
  assert.deepEqual(master.casos.map(function (c) { return c.id; }), [
    'manual-simple',
    'manual-recargo',
    'manual-mixta',
    'descuento-2-justo-encima',
    'descuento-5-justo-encima',
    'frontera-1000',
    'frontera-5000',
    'redondeo-por-linea',
    'prorrateo-marzo',
    'prorrateo-febrero',
    'febrero-bisiesto',
    'rectificativa'
  ]);
});
