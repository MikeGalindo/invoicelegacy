// Batería por regla de negocio (parte pura).
// Las reglas que viven en rutas, jobs o IO se documentan en test/COBERTURA.md.
var test = require('node:test');
var assert = require('node:assert/strict');
var util = require('../lib/util');
var calc = require('../services/calculo');
var config = require('../config');

var TZ_ES = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Madrid';
var SKIP_FECHAS = TZ_ES ? false : 'Requiere TZ=Europe/Madrid; usa `npm test`.';

test('RN-01 redondeo monetario simétrico a 2 decimales', function () {
  assert.equal(util.redondear2(3.848), 3.85);
  assert.equal(util.redondear2(1.995), 2);
  assert.equal(util.redondear2(0.5616), 0.56);
});

test('RN-02 base imponible = cantidad × precio, redondeada', function () {
  assert.equal(calc.calcularLinea(4, 18.5, 21, false).base, 74);
  assert.equal(calc.calcularLinea(0.44, 21.6, 21, false).base, 9.5);
});

test('RN-03 cuota de IVA sobre la base ya redondeada', function () {
  assert.equal(calc.calcularLinea(0.44, 21.6, 21, false).cuotaIva, 2);
  assert.equal(calc.calcularLinea(4, 18.5, 21, false).cuotaIva, 15.54);
});

test('RN-04 recargo solo para clientes con recargo y por línea', function () {
  assert.equal(calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }
  ], { recargo_equivalencia: 1 }).recargo, 3.85);
  assert.equal(calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }
  ], { recargo_equivalencia: 0 }).recargo, 0);
});

test('RN-05 tabla de recargos incluye tipos antiguos', function () {
  assert.equal(calc.recargoPara(21), 5.2);
  assert.equal(calc.recargoPara(10), 1.4);
  assert.equal(calc.recargoPara(4), 0.5);
  assert.equal(calc.recargoPara(18), 4);
  assert.equal(calc.recargoPara(16), 4);
  assert.equal(calc.recargoPara(8), 1);
  assert.equal(calc.recargoPara(7), 1);
});

test('RN-06 redondeo línea a línea, nunca sobre el total', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 1, precio: 0.03, tipoIva: 21 },
    { descripcion: 'b', cantidad: 1, precio: 0.03, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.iva, 0.02);
});

test('RN-07 descuento por volumen con fronteras estrictas', function () {
  assert.equal(calc.porcentajeDescuento(1000), 0);
  assert.equal(calc.porcentajeDescuento(1000.01), 2);
  assert.equal(calc.porcentajeDescuento(5000), 2);
  assert.equal(calc.porcentajeDescuento(5000.01), 5);
});

test('RN-08 descuento sobre base bruta y aplicado línea a línea', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 10, precio: 120, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.descuentoPct, 2);
  assert.equal(r.lineas[0].precio, 117.6);
  assert.equal(r.base, 1176);
});

test('RN-09 el recargo se recalcula sobre la base descontada', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 10, precio: 120, tipoIva: 21 }
  ], { recargo_equivalencia: 1 });
  assert.equal(r.recargo, 61.15);
});

test('RN-10 total = base + IVA + recargo, todo redondeado', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }
  ], { recargo_equivalencia: 1 });
  assert.equal(r.total, 93.39);
});

test('RN-11 prorrateo comercial de 30 días', function () {
  assert.equal(calc.calcularProrrateo(90, '2026-03-01', '2026-03-15'), 45);
  assert.equal(calc.calcularProrrateo(90, '2026-02-01', '2026-02-15'), 45);
});

test('RN-12 (parte pura) el plazo por defecto configurado es 30 días', { skip: SKIP_FECHAS }, function () {
  assert.equal(config.VENCIMIENTO_DIAS, 30);
  assert.equal(util.sumarDias('2026-03-05', config.VENCIMIENTO_DIAS), '2026-04-04');
});

test('RN-13 sumarDias opera con milisegundos', { skip: SKIP_FECHAS }, function () {
  assert.equal(util.sumarDias('2026-01-31', 30), '2026-03-02');
  assert.equal(util.sumarDias('2026-12-31', 1), '2027-01-01');
});

test('RN-14 diasDelMes usa el calendario real', function () {
  assert.equal(util.diasDelMes('2026-02-01'), 28);
  assert.equal(util.diasDelMes('2028-02-01'), 29);
  assert.equal(util.diasDelMes('2026-04-01'), 30);
  assert.equal(util.diasDelMes('2026-12-01'), 31);
});

test('RN-15 fechas en YYYY-MM-DD y pantalla DD/MM/YYYY', function () {
  assert.equal(util.fechaBonita('2026-02-06'), '06/02/2026');
  assert.match(util.hoy(), /^\d{4}-\d{2}-\d{2}$/);
});

test('RN-16 NIF solo por longitud 9', function () {
  assert.equal(util.validarNIF('B45812390'), true);
  assert.equal(util.validarNIF('B4581239A'), true);
  assert.equal(util.validarNIF('1234'), false);
});

test('RN-17 importes con punto de millar y coma decimal', function () {
  assert.equal(util.formatearImporte(1234.5), '1.234,50');
  assert.equal(util.formatearImporte(null), '0,00');
  assert.equal(util.formatearImporte(-122.23), '-122,23');
});
