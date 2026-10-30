// Tests de caracterización de lib/numeracion.js con un doble de db.js.
// No abren SQLite ni tocan datos reales.
var test = require('node:test');
var assert = require('node:assert/strict');
var path = require('node:path');
var { cargarConDbFake } = require('./helpers/cargar-modulo-con-db');
var { crearDbFake } = require('./helpers/fake-db');

function cargar(db) {
  return cargarConDbFake(path.join('lib', 'numeracion.js'), db);
}

function promesa(fn) {
  return new Promise(function (resolve, reject) {
    fn(function (err, valor) {
      if (err) return reject(err);
      resolve(valor);
    });
  });
}

function anyoActual() {
  return new Date().getFullYear();
}

test('RN-18 formatear usa SERIE-AAAA-NNNNNN con 6 dígitos', function () {
  var num = cargar(crearDbFake());
  assert.equal(num.formatear('FA', 2026, 1), 'FA-2026-000001');
  assert.equal(num.formatear('FA', 2026, 9), 'FA-2026-000009');
  assert.equal(num.formatear('FA', 2026, 10), 'FA-2026-000010');
  assert.equal(num.formatear('FA', 2026, 999999), 'FA-2026-999999');
  assert.equal(num.formatear('FA', 2026, 1000000), 'FA-2026-1000000');
  assert.equal(num.formatear('RE', 2026, 1), 'RE-2026-000001');
});

test('RN-18 siguienteNumero reserva el siguiente de un contador existente', async function () {
  var db = crearDbFake();
  var anyo = anyoActual();
  db.contadores.set('FA|' + anyo, 108);
  var num = cargar(db);
  var numero = await promesa(function (cb) { num.siguienteNumero('FA', cb); });
  assert.equal(numero, 'FA-' + anyo + '-000109');
  assert.equal(db.contadores.get('FA|' + anyo), 109);
});

test('RN-19 al estrenar año el contador se abre a cero y la primera factura es 1', async function () {
  var db = crearDbFake();
  var anyo = anyoActual();
  var num = cargar(db);
  var numero = await promesa(function (cb) { num.siguienteNumero('RE', cb); });
  assert.equal(numero, 'RE-' + anyo + '-000001');
  assert.equal(db.contadores.get('RE|' + anyo), 1);
});

test('RN-18 cada serie tiene su propio contador', async function () {
  var db = crearDbFake();
  var anyo = anyoActual();
  db.contadores.set('FA|' + anyo, 5);
  db.contadores.set('RE|' + anyo, 1);
  var num = cargar(db);
  var fa = await promesa(function (cb) { num.siguienteNumero('FA', cb); });
  var re = await promesa(function (cb) { num.siguienteNumero('RE', cb); });
  assert.equal(fa, 'FA-' + anyo + '-000006');
  assert.equal(re, 'RE-' + anyo + '-000002');
  assert.equal(db.contadores.get('FA|' + anyo), 6);
  assert.equal(db.contadores.get('RE|' + anyo), 2);
});

test('RN-18 dos reservas secuenciales producen números correlativos', async function () {
  var db = crearDbFake();
  var anyo = anyoActual();
  db.contadores.set('FA|' + anyo, 108);
  var num = cargar(db);
  var primero = await promesa(function (cb) { num.siguienteNumero('FA', cb); });
  var segundo = await promesa(function (cb) { num.siguienteNumero('FA', cb); });
  assert.equal(primero, 'FA-' + anyo + '-000109');
  assert.equal(segundo, 'FA-' + anyo + '-000110');
});

test('Anomalía A-02 / R15: el año del número es el año de ejecución', async function () {
  var db = crearDbFake();
  var anyo = anyoActual();
  var num = cargar(db);
  var numero = await promesa(function (cb) { num.siguienteNumero('FA', cb); });
  assert.match(numero, new RegExp('^FA-' + anyo + '-\\d{6}$'));
});

test('Anomalía A-03 / H3: el número consumido no se devuelve si la factura falla', async function () {
  var db = crearDbFake();
  var anyo = anyoActual();
  db.contadores.set('FA|' + anyo, 108);
  var num = cargar(db);

  // Simula que la factura que usaría 109 no llega a grabarse.
  var numeroFallido = await promesa(function (cb) { num.siguienteNumero('FA', cb); });
  assert.equal(numeroFallido, 'FA-' + anyo + '-000109');

  // La siguiente factura recibe 110: el 109 queda como hueco.
  var siguiente = await promesa(function (cb) { num.siguienteNumero('FA', cb); });
  assert.equal(siguiente, 'FA-' + anyo + '-000110');
});

test('CONGELA comportamiento actual: R1 dos reservas simultáneas pueden repetir número', async function () {
  var db = crearDbFake();
  var anyo = anyoActual();
  db.contadores.set('FA|' + anyo, 108);
  var num = cargar(db);

  var dos = await Promise.all([
    promesa(function (cb) { num.siguienteNumero('FA', cb); }),
    promesa(function (cb) { num.siguienteNumero('FA', cb); })
  ]);

  assert.deepEqual(dos, [
    'FA-' + anyo + '-000109',
    'FA-' + anyo + '-000109'
  ]);
  assert.equal(db.contadores.get('FA|' + anyo), 109);
});

test('siguienteNumero propaga el error de lectura del contador', async function () {
  var error = new Error('fallo de lectura');
  var num = cargar(crearDbFake({ errorEnGet: error }));
  await assert.rejects(promesa(function (cb) { num.siguienteNumero('FA', cb); }), /fallo de lectura/);
});

test('siguienteNumero propaga el error de creación del contador', async function () {
  var db = crearDbFake({ errorEnInsert: new Error('fallo de insert') });
  var num = cargar(db);
  await assert.rejects(promesa(function (cb) { num.siguienteNumero('FA', cb); }), /fallo de insert/);
});

test('siguienteNumero propaga el error de actualización del contador', async function () {
  var db = crearDbFake({ errorEnUpdate: new Error('fallo de update') });
  db.contadores.set('FA|' + anyoActual(), 1);
  var num = cargar(db);
  await assert.rejects(promesa(function (cb) { num.siguienteNumero('FA', cb); }), /fallo de update/);
});
