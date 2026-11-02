// Congela cada implementación de las contradicciones documentadas.
// Cuando la implementación vive en una ruta o job no importable sin IO, se
// congela también su texto fuente para detectar cambios.
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var util = require('../lib/util');
var calc = require('../services/calculo');
var config = require('../config');

function fuente(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function redondear(x) {
  return util.redondear2(x);
}

function prorrateoDiasReales(cuota, mes, desde, hasta) {
  // Modelo de la fórmula inline de scripts/remesa_mensual.js:43-51.
  var primerDia = mes + '-01';
  var ultimoDia = mes + '-' + util.diasDelMes(primerDia);
  var desdeEf = desde > primerDia ? desde : primerDia;
  var hastaEf = hasta < ultimoDia ? hasta : ultimoDia;
  var d1 = parseInt(desdeEf.split('-')[2], 10);
  var d2 = parseInt(hastaEf.split('-')[2], 10);
  var diasMes = util.diasDelMes(primerDia);
  var diasServicio = d2 - d1 + 1;
  return redondear(cuota / diasMes * diasServicio);
}

test('CONGELA comportamiento actual: contradicción 01, prorrateo único por días reales', function () {
  assert.equal(calc.calcularProrrateo(90, '2026-03-01', '2026-03-15'), 43.55);
  assert.equal(calc.calcularProrrateo(90, '2026-02-01', '2026-02-15'), 48.21);
});

test('CONGELA comportamiento actual: contradicción 01, prorrateo de la remesa por días reales', function () {
  assert.equal(prorrateoDiasReales(90, '2026-03', '2026-03-01', '2026-03-15'), 43.55);
  assert.equal(prorrateoDiasReales(90, '2026-02', '2026-02-01', '2026-02-15'), 48.21);
  assert.equal(prorrateoDiasReales(60, '2025-09', '2025-09-01', '2025-09-15'), 30);
});

// A-11/D-03 y spec 011: el motor y la remesa comparten la convención de días
// reales. La remesa no admite periodos invertidos (su SQL garantiza
// desde <= hasta), así que esos se comprueban solo en el motor.
test('CONGELA comportamiento actual: contradicción 01, motor y remesa coinciden', function () {
  var meses = [
    '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    '2028-02'
  ];

  for (var i = 0; i < meses.length; i++) {
    var mes = meses[i];
    var primerDia = mes + '-01';
    var ultimoDia = mes + '-' + util.diasDelMes(primerDia);
    var dia15 = mes + '-15';

    assert.equal(
      calc.calcularProrrateo(90, primerDia, ultimoDia),
      prorrateoDiasReales(90, mes, primerDia, ultimoDia),
      mes + ': mes completo'
    );
    assert.equal(
      calc.calcularProrrateo(90, primerDia, dia15),
      prorrateoDiasReales(90, mes, primerDia, dia15),
      mes + ': del 1 al 15'
    );
  }

  var parciales = [
    ['2026-07', '2026-07-16', '2026-07-30'],
    ['2026-07', '2026-07-01', '2026-07-30'],
    ['2026-07', '2026-07-16', '2026-07-31'],
    ['2026-07', '2026-07-16', '2026-07-16'],
    ['2026-02', '2026-02-01', '2026-02-28'],
    ['2028-02', '2028-02-01', '2028-02-29']
  ];

  for (var j = 0; j < parciales.length; j++) {
    assert.equal(
      calc.calcularProrrateo(60, parciales[j][1], parciales[j][2]),
      prorrateoDiasReales(60, parciales[j][0], parciales[j][1], parciales[j][2]),
      parciales[j][0] + ': ' + parciales[j][1] + ' a ' + parciales[j][2]
    );
  }

  assert.equal(calc.calcularProrrateo(90, '2026-03-15', '2026-03-01'), 0);
});

test('CONGELA comportamiento actual: contradicción 01, la remesa usa días reales inline', function () {
  var remesa = fuente('scripts/remesa_mensual.js');
  assert.match(remesa, /var diasMes = util\.diasDelMes\(primerDia\);/);
  assert.match(remesa, /var diasServicio = d2 - d1 \+ 1;/);
  assert.match(remesa, /co\.cuota \/ diasMes \* diasServicio/);
});

test('CONGELA comportamiento actual: contradicción 02, formato español de importes', function () {
  assert.equal(util.formatearImporte(1234.5), '1.234,50');
  assert.equal(util.formatearImporte(-122.23), '-122,23');
});

test('CONGELA comportamiento actual: contradicción 02, formato nativo con punto', function () {
  assert.equal((1234.5).toFixed(2), '1234.50');
  assert.equal((-122.23).toFixed(2), '-122.23');
  assert.notEqual(util.formatearImporte(1234.5), (1234.5).toFixed(2));
});

test('CONGELA comportamiento actual: contradicción 02, las vistas y la consola usan toFixed', function () {
  assert.match(fuente('views/index.ejs'), /importePendiente\.toFixed\(2\)/);
  assert.match(fuente('views/articulos.ejs'), /a\.precio\.toFixed\(2\)/);
  assert.match(fuente('views/contratos.ejs'), /co\.cuota\.toFixed\(2\)/);
  assert.match(fuente('scripts/remesa_mensual.js'), /calc\.total\.toFixed\(2\)/);
  assert.match(fuente('routes/contratos.js'), /importe\.toFixed\(2\)/);
});

test('CONGELA comportamiento actual: contradicción 03, vencimiento manual con config', function () {
  assert.equal(config.VENCIMIENTO_DIAS, 30);
  assert.equal(0 || config.VENCIMIENTO_DIAS, 30);
  assert.match(fuente('routes/facturas.js'), /cliente\.dias_pago \|\| config\.VENCIMIENTO_DIAS/);
});

test('CONGELA comportamiento actual: contradicción 03, vencimiento de remesa con 30 literal', function () {
  assert.equal(0 || 30, 30);
  assert.match(fuente('scripts/remesa_mensual.js'), /co\.dias_pago \|\| 30/);
});

test('CONGELA comportamiento actual: contradicción 04, IVA por defecto de artículos', function () {
  assert.equal(config.IVA_DEFECTO, 21);
  assert.match(fuente('routes/articulos.js'), /config\.IVA_DEFECTO/);
  assert.match(fuente('db.js'), /tipo_iva INTEGER NOT NULL,/);
});

test('CONGELA comportamiento actual: contradicción 04, IVA literal de contratos y línea sin defecto', function () {
  assert.match(fuente('routes/contratos.js'), /parseInt\(req\.body\.tipo_iva \|\| 21, 10\)/);
  assert.match(fuente('db.js'), /tipo_iva INTEGER NOT NULL DEFAULT 21/);
  assert.match(fuente('routes/facturas.js'), /tipoIva: parseInt\(ivas\[i\], 10\)/);
  assert.equal(Number.isNaN(parseInt('', 10)), true);
});

test('CONGELA comportamiento actual: contradicción 05, tres INSERT de líneas con tres errores', function () {
  var facturas = fuente('routes/facturas.js');
  var remesa = fuente('scripts/remesa_mensual.js');
  var ocurrencias = (facturas.match(/INSERT INTO lineas/g) || []).length +
    (remesa.match(/INSERT INTO lineas/g) || []).length;
  assert.equal(ocurrencias, 3);
  assert.match(facturas, /huboError/);
  assert.match(remesa, /process\.exit\(1\)/);
  assert.match(facturas, /function \(\) \{\s*pendientes--;/);
  assert.doesNotMatch(facturas, /BEGIN|COMMIT|transaction/);
  assert.doesNotMatch(remesa, /BEGIN|COMMIT|transaction/);
});

test('CONGELA comportamiento actual: contradicción 06, la manual anota el descuento', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 10, precio: 120, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.descuentoPct, 2);
  assert.match(fuente('routes/facturas.js'), /Descuento volumen/);
});

test('CONGELA comportamiento actual: contradicción 06, la remesa no anota el descuento', function () {
  assert.doesNotMatch(fuente('scripts/remesa_mensual.js'), /Descuento volumen/);
  assert.match(fuente('scripts/remesa_mensual.js'), /'Remesa ' \+ nombreMes\(mes\)/);
});

test('CONGELA comportamiento actual: contradicción 07, cabecera y líneas pueden no cuadrar', function () {
  var facturas = require('./fixtures/facturas-sembradas.json');
  var desviaciones = [];

  facturas.forEach(function (f) {
    var totalLineas = redondear(f.lineas.base + f.lineas.iva + f.lineas.recargo);
    var difBase = redondear(f.lineas.base - f.cabecera.base);
    var difIva = redondear(f.lineas.iva - f.cabecera.iva);
    var difTotal = redondear(totalLineas - f.cabecera.total);
    if (difBase !== 0 || difIva !== 0 || difTotal !== 0) {
      desviaciones.push({ numero: f.numero, difBase: difBase, difIva: difIva, difTotal: difTotal });
    }
  });

  assert.deepEqual(desviaciones, [
    { numero: 'FA-2026-000101', difBase: 0, difIva: -3.7, difTotal: -3.7 },
    { numero: 'FA-2026-000105', difBase: 47.75, difIva: -129.61, difTotal: -81.86 },
    { numero: 'FA-2026-000106', difBase: 0, difIva: -0.56, difTotal: -0.56 },
    { numero: 'RE-2026-000001', difBase: 0, difIva: 0.56, difTotal: 0.56 },
    { numero: 'FA-2026-000107', difBase: 0, difIva: -0.56, difTotal: -0.56 },
    { numero: 'FA-2026-000108', difBase: 0, difIva: -1.93, difTotal: -1.93 }
  ]);
  assert.equal(desviaciones.length, 6);
});

test('CONGELA comportamiento actual: contradicción 08, la remesa valida solo la forma del mes', function () {
  assert.match(fuente('scripts/remesa_mensual.js'), /\/\^\\d\{4\}-\\d\{2\}\$\//);
  assert.equal(/^\d{4}-\d{2}$/.test('2026-13'), true);
  assert.equal(/^\d{4}-\d{2}$/.test('2026-6'), false);
});

test('CONGELA comportamiento actual: contradicción 08, la factura y la baja no validan en servidor', function () {
  assert.match(fuente('routes/facturas.js'), /var fecha = req\.body\.fecha \|\| util\.hoy\(\);/);
  assert.match(fuente('routes/contratos.js'), /var fechaBaja = req\.body\.fecha_baja \|\| util\.hoy\(\);/);
  assert.doesNotMatch(fuente('lib/util.js'), /function validarFecha/);
  assert.equal(util.sumarDias('basura', 30), 'NaN-NaN-NaN');
});

test('CONGELA comportamiento actual: contradicción 09, la conversión numérica está copiada', function () {
  var archivos = ['routes/facturas.js', 'routes/articulos.js', 'routes/contratos.js'];
  var total = 0;
  archivos.forEach(function (rel) {
    var coincidencias = fuente(rel).match(/replace\(',', '\.'\)/g) || [];
    total += coincidencias.length;
  });
  assert.equal(total, 4);
  assert.equal(parseFloat(('' + '1.234,56').replace(',', '.')), 1.234);
  assert.equal(parseFloat(('' + '12abc').replace(',', '.')), 12);
  assert.equal(Number.isNaN(parseFloat(('' + '').replace(',', '.'))), true);
});
