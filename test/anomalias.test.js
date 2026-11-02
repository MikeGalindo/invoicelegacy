// Un test por anomalía ejecutable del registro-anomalias.md.
// El nombre empieza por "CONGELA comportamiento actual:" y el comentario cita el ID.
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var util = require('../lib/util');
var calc = require('../services/calculo');
var config = require('../config');
var { cargarConDbFake } = require('./helpers/cargar-modulo-con-db');
var { crearDbFake } = require('./helpers/fake-db');

function fuente(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function promesa(fn) {
  return new Promise(function (resolve, reject) {
    fn(function (err, valor) {
      if (err) return reject(err);
      resolve(valor);
    });
  });
}

// A-01: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-01 descuento en remesa sin nota', function () {
  var r = calc.calcularFactura([
    { descripcion: 'Cuota', cantidad: 1, precio: 1200, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.descuentoPct, 2);
  assert.equal(r.base, 1176);
  assert.match(fuente('routes/facturas.js'), /Descuento volumen/);
  assert.doesNotMatch(fuente('scripts/remesa_mensual.js'), /Descuento volumen/);
});

// A-02: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-02 el número usa el año de ejecución', function () {
  assert.match(fuente('lib/numeracion.js'), /var anyo = new Date\(\)\.getFullYear\(\);/);
});

// A-03: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-03 el número se pierde si falla la factura', async function () {
  var db = crearDbFake();
  var anyo = new Date().getFullYear();
  db.contadores.set('FA|' + anyo, 108);
  var num = cargarConDbFake(path.join('lib', 'numeracion.js'), db);
  var primero = await promesa(function (cb) { num.siguienteNumero('FA', cb); });
  var segundo = await promesa(function (cb) { num.siguienteNumero('FA', cb); });
  assert.equal(primero, 'FA-' + anyo + '-000109');
  assert.equal(segundo, 'FA-' + anyo + '-000110');
});

// A-04: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-04 el alta acepta clientes inactivos', function () {
  var rutas = fuente('routes/facturas.js');
  assert.match(rutas, /SELECT \* FROM clientes WHERE id = \?/);
  assert.match(rutas, /SELECT \* FROM clientes WHERE activo = 1/);
});

// A-05: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-05 una fecha inválida llega a la base', function () {
  assert.equal(util.sumarDias('basura', 30), 'NaN-NaN-NaN');
  assert.equal(util.fechaBonita('2026-02-30'), '30/02/2026');
  assert.equal(util.diasDelMes('2026-13-01'), 31);
});

// A-06: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-06 una rectificativa puede cobrarse y no tiene vencimiento', function () {
  var rutas = fuente('routes/facturas.js');
  assert.match(rutas, /UPDATE facturas SET estado = 'cobrada' WHERE id = \? AND estado = 'emitida'/);
  assert.doesNotMatch(rutas, /UPDATE facturas SET estado = 'cobrada' WHERE id = \? AND estado = 'emitida' AND serie/);
  assert.match(rutas, /\[numero, 'RE', f\.cliente_id, util\.hoy\(\), null,/);
  assert.match(fuente('views/factura_detalle.ejs'), /f\.estado === 'emitida' && f\.serie === 'FA'/);
});

// A-07: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-07 la remesa no lleva ORDER BY', function () {
  var remesa = fuente('scripts/remesa_mensual.js');
  var consulta = remesa.match(/db\.all\('SELECT co\.\*[\s\S]*?function \(err2, contratos\)/);
  assert.ok(consulta);
  assert.doesNotMatch(consulta[0], /ORDER BY/);
});

// A-08: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-08 la rectificación ignora el error de línea', function () {
  var rutas = fuente('routes/facturas.js');
  assert.match(rutas, /function \(\) \{\s*pendientes--;/);
  assert.match(rutas, /UPDATE facturas SET estado = 'rectificada' WHERE id = \?/);
});

// A-09: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-09 el descuento reduce el recargo', function () {
  var r = calc.calcularFactura([
    { descripcion: 'Cuota', cantidad: 1, precio: 1200, tipoIva: 21 }
  ], { recargo_equivalencia: 1 });
  assert.equal(r.recargo, 61.15);
});

// A-10: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-10 el tablero ignora los abonos RE', function () {
  assert.match(fuente('server.js'), /WHERE estado = 'emitida' AND serie = 'FA'/);
  assert.doesNotMatch(fuente('server.js'), /serie = 'RE'/);
});

// A-11: prorrateo único por días reales (decisión A-11/D-03, spec 011).
test('CONGELA comportamiento actual: A-11 prorrateo único por días reales', function () {
  assert.equal(calc.calcularProrrateo(90, '2026-03-01', '2026-03-15'), 43.55);
  assert.match(fuente('scripts/remesa_mensual.js'), /co\.cuota \/ diasMes \* diasServicio/);
});

// A-12: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-12 el vencimiento manual y el de remesa usan fuentes distintas', function () {
  assert.equal(config.VENCIMIENTO_DIAS, 30);
  assert.match(fuente('routes/facturas.js'), /config\.VENCIMIENTO_DIAS/);
  assert.match(fuente('scripts/remesa_mensual.js'), /co\.dias_pago \|\| 30/);
});

// A-13: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-13 conviven dos formatos de importe', function () {
  assert.equal(util.formatearImporte(1234.5), '1.234,50');
  assert.equal((1234.5).toFixed(2), '1234.50');
});

// A-14: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-14 el IVA por defecto depende del maestro', function () {
  assert.equal(config.IVA_DEFECTO, 21);
  assert.match(fuente('routes/articulos.js'), /config\.IVA_DEFECTO/);
  assert.match(fuente('routes/contratos.js'), /\|\| 21/);
  assert.equal(Number.isNaN(parseInt('', 10)), true);
  assert.equal(calc.recargoPara(16), 4);
});

// A-15: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-15 seis facturas sembradas no cuadran', function () {
  var facturas = require('./fixtures/facturas-sembradas.json');
  var malas = facturas.filter(function (f) {
    var totalLineas = util.redondear2(f.lineas.base + f.lineas.iva + f.lineas.recargo);
    return util.redondear2(f.lineas.base - f.cabecera.base) !== 0 ||
      util.redondear2(f.lineas.iva - f.cabecera.iva) !== 0 ||
      util.redondear2(totalLineas - f.cabecera.total) !== 0;
  });
  assert.deepEqual(malas.map(function (f) { return f.numero; }), [
    'FA-2026-000101', 'FA-2026-000105', 'FA-2026-000106',
    'RE-2026-000001', 'FA-2026-000107', 'FA-2026-000108'
  ]);
});

// A-16: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-16 el punto de millar se interpreta mal', function () {
  assert.equal(parseFloat(('' + '1.234,56').replace(',', '.')), 1.234);
  assert.equal(parseFloat(('' + '12abc').replace(',', '.')), 12);
});

// A-17: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-17 una factura incompleta deja cabecera y responde 500', function () {
  var rutas = fuente('routes/facturas.js');
  assert.match(rutas, /INSERT INTO facturas/);
  assert.match(rutas, /INSERT INTO lineas/);
  assert.match(rutas, /huboError/);
  assert.match(rutas, /Error al grabar lineas/);
  assert.doesNotMatch(rutas, /BEGIN|COMMIT|transaction/);
});

// A-18: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-18 no hay procedimiento de arranque/restauración', function () {
  var leeme = fuente('LEEME.txt');
  assert.match(leeme, /COPIAS DE SEGURIDAD/);
  assert.doesNotMatch(leeme, /restaurar/i);
  assert.match(fuente('views/pie.ejs'), /llamar a Juli&aacute;n/);
});

// A-19: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-19 las facturas históricas descuadradas siguen en la copia', function () {
  var facturas = require('./fixtures/facturas-sembradas.json');
  assert.equal(facturas.length, 9);
  assert.equal(facturas.filter(function (f) {
    return util.redondear2(f.lineas.iva - f.cabecera.iva) !== 0;
  }).length, 6);
});

// A-20: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-20 la vista de contratos no tiene formulario de alta', function () {
  assert.match(fuente('routes/contratos.js'), /router\.post\('\/nuevo'/);
  var vista = fuente('views/contratos.ejs');
  assert.doesNotMatch(vista, /action="\/contratos\/nuevo"/);
});

// R4: comportamiento actual congelado.
test('CONGELA comportamiento actual: R4 la remesa no comprueba si el mes ya se facturó', function () {
  var remesa = fuente('scripts/remesa_mensual.js');
  assert.doesNotMatch(remesa, /ya facturad|FROM facturas|WHERE.*facturado/i);
  assert.match(remesa, /db\.all\('SELECT co\.\*[\s\S]*?fecha_baja/s);
});

// A-21: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-21 formatearImporte con infinito', function () {
  assert.equal(util.formatearImporte(Infinity), 'Infinity,undefined');
  assert.equal(util.formatearImporte(-Infinity), '-Infinity,undefined');
});

// A-22: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-22 tipoIva en cadena no genera recargo', function () {
  assert.deepEqual(calc.calcularLinea(1, 100, '21', false), { base: 100, cuotaIva: 21, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(1, 100, '21', true), { base: 100, cuotaIva: 21, cuotaRecargo: 0 });
});

// A-23: comportamiento actual congelado.
test('CONGELA comportamiento actual: A-23 redondear2 puede devolver -0', function () {
  assert.equal(Object.is(util.redondear2(-0.005), -0), true);
  assert.equal(util.formatearImporte(-0), '0,00');
});
