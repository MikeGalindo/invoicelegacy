// Tests de caracterización de lib/util.js.
// Congelan el comportamiento actual, incluidas sus rarezas de coma flotante.
// Ejecutar con `npm test` (fija TZ=Europe/Madrid).
var test = require('node:test');
var assert = require('node:assert/strict');
var util = require('../lib/util');

var TZ_ES = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Madrid';
var SKIP_FECHAS = TZ_ES ? false : 'Requiere TZ=Europe/Madrid; usa `npm test`.';

test('RN-01 redondear2 usa Math.round(x * 100) / 100', function () {
  assert.equal(util.redondear2(3.848), 3.85);
  assert.equal(util.redondear2(1.995), 2);
  assert.equal(util.redondear2(0.5616), 0.56);
  assert.equal(util.redondear2(9.504), 9.5);
  assert.equal(util.redondear2(38.7045), 38.7);
  assert.equal(util.redondear2(1234.5), 1234.5);
});

test('RN-01 redondear2 congela los artefactos de coma flotante', function () {
  assert.equal(util.redondear2(2.675), 2.68);
  assert.equal(util.redondear2(1.005), 1);
  assert.equal(util.redondear2(1.255), 1.25);
  assert.equal(util.redondear2(0.005), 0.01);
  assert.equal(util.redondear2(0.015), 0.02);
  assert.equal(util.redondear2(-2.675), -2.67);
  assert.equal(util.redondear2(-1.005), -1);
  assert.equal(util.redondear2(-0.015), -0.01);
  assert.equal(Object.is(util.redondear2(-0.005), -0), true);
});

test('RN-01 redondear2 con cero, negativos y NaN', function () {
  assert.equal(util.redondear2(0), 0);
  assert.equal(Object.is(util.redondear2(-0), -0), true);
  assert.equal(util.redondear2(-122.23), -122.23);
  assert.equal(Number.isNaN(util.redondear2(NaN)), true);
});

test('RN-15 fechaBonita convierte YYYY-MM-DD a DD/MM/YYYY', function () {
  assert.equal(util.fechaBonita('2026-02-06'), '06/02/2026');
  assert.equal(util.fechaBonita('2026-12-31'), '31/12/2026');
  assert.equal(util.fechaBonita('2028-02-29'), '29/02/2028');
  assert.equal(util.fechaBonita('2026-2-6'), '6/2/2026');
});

test('RN-15 fechaBonita con vacíos y valores inexistentes', function () {
  assert.equal(util.fechaBonita(''), '');
  assert.equal(util.fechaBonita(null), '');
  assert.equal(util.fechaBonita(undefined), '');
  assert.equal(util.fechaBonita('basura'), 'undefined/undefined/basura');
  assert.equal(util.fechaBonita('2026-02-30'), '30/02/2026');
});

test('RN-14 diasDelMes devuelve los días reales del mes', function () {
  assert.equal(util.diasDelMes('2026-02-01'), 28);
  assert.equal(util.diasDelMes('2028-02-01'), 29);
  assert.equal(util.diasDelMes('2026-04-01'), 30);
  assert.equal(util.diasDelMes('2026-12-01'), 31);
  assert.equal(util.diasDelMes('2026-01-31'), 31);
});

test('RN-14 diasDelMes normaliza meses fuera de rango', function () {
  assert.equal(util.diasDelMes('2026-13-01'), 31);
  assert.equal(util.diasDelMes('2026-00-01'), 31);
  assert.equal(Number.isNaN(util.diasDelMes('basura')), true);
});

test('RN-16 validarNIF solo comprueba longitud 9 tras limpiar espacios y guiones', function () {
  assert.equal(util.validarNIF('B45812390'), true);
  assert.equal(util.validarNIF('J4577 110 2'), true);
  assert.equal(util.validarNIF('B-458-123-90'), true);
  assert.equal(util.validarNIF(123456789), true);
  assert.equal(util.validarNIF('B4581239A'), true);
  assert.equal(util.validarNIF('1234'), false);
  assert.equal(util.validarNIF('B4581239'), false);
  assert.equal(util.validarNIF('B458123900'), false);
  assert.equal(util.validarNIF(''), false);
  assert.equal(util.validarNIF('   '), false);
  assert.equal(util.validarNIF(null), false);
  assert.equal(util.validarNIF(undefined), false);
});

test('RN-17 formatearImporte usa punto de millar y coma decimal', function () {
  assert.equal(util.formatearImporte(1234.5), '1.234,50');
  assert.equal(util.formatearImporte(1000), '1.000,00');
  assert.equal(util.formatearImporte(1234567.891), '1.234.567,89');
  assert.equal(util.formatearImporte(0.5), '0,50');
  assert.equal(util.formatearImporte(-122.23), '-122,23');
  assert.equal(util.formatearImporte(0), '0,00');
});

test('RN-17 formatearImporte con null, undefined, NaN y coma flotante', function () {
  assert.equal(util.formatearImporte(null), '0,00');
  assert.equal(util.formatearImporte(undefined), '0,00');
  assert.equal(util.formatearImporte(NaN), '0,00');
  assert.equal(util.formatearImporte(2.675), '2,67');
  assert.equal(util.formatearImporte(1.005), '1,00');
});

test('Anomalía A-21: formatearImporte con infinito produce "Infinity,undefined"', function () {
  // Comportamiento actual no documentado; registrado como A-21.
  assert.equal(util.formatearImporte(Infinity), 'Infinity,undefined');
  assert.equal(util.formatearImporte(-Infinity), '-Infinity,undefined');
});

test('RN-13 sumarDias suma milisegundos y devuelve YYYY-MM-DD', { skip: SKIP_FECHAS }, function () {
  assert.equal(util.sumarDias('2026-01-31', 30), '2026-03-02');
  assert.equal(util.sumarDias('2026-02-28', 30), '2026-03-30');
  assert.equal(util.sumarDias('2026-03-05', 15), '2026-03-20');
  assert.equal(util.sumarDias('2026-03-05', 30), '2026-04-04');
  assert.equal(util.sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(util.sumarDias('2026-01-31', 0), '2026-01-31');
  assert.equal(util.sumarDias('2026-01-31', -1), '2026-01-30');
  assert.equal(util.sumarDias('2026-01-31', -30), '2026-01-01');
});

test('RN-13 sumarDias en febrero bisiesto y años no bisiestos', { skip: SKIP_FECHAS }, function () {
  assert.equal(util.sumarDias('2028-02-28', 1), '2028-02-29');
  assert.equal(util.sumarDias('2028-02-29', 1), '2028-03-01');
  assert.equal(util.sumarDias('2026-02-28', 1), '2026-03-01');
});

test('RN-13 sumarDias normaliza fechas imposibles', { skip: SKIP_FECHAS }, function () {
  assert.equal(util.sumarDias('2026-02-29', 30), '2026-03-31');
  assert.equal(util.sumarDias('2026-02-30', 30), '2026-04-01');
});

test('RN-13 sumarDias con texto inválido produce NaN-NaN-NaN', { skip: SKIP_FECHAS }, function () {
  assert.equal(util.sumarDias('basura', 30), 'NaN-NaN-NaN');
  assert.equal(util.sumarDias('2026-13-01', 30), 'NaN-NaN-NaN');
});

test('RN-13 sumarDias congela el comportamiento en los cambios de hora', { skip: SKIP_FECHAS }, function () {
  // Spain: DST starts 2026-03-29 and ends 2026-10-25.
  assert.equal(util.sumarDias('2026-03-29', 1), '2026-03-30');
  assert.equal(util.sumarDias('2026-03-29', -1), '2026-03-28');
  assert.equal(util.sumarDias('2026-10-25', 1), '2026-10-26');
  assert.equal(util.sumarDias('2026-10-25', -1), '2026-10-24');
  assert.equal(util.sumarDias('2026-10-24', 1), '2026-10-25');
});

test('hoy devuelve una fecha local con forma YYYY-MM-DD', function () {
  assert.match(util.hoy(), /^\d{4}-\d{2}-\d{2}$/);
});
