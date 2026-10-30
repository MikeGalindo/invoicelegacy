// Tests de caracterización de services/calculo.js.
// Congelan la fórmula actual del dinero, incluidas sus fronteras y rarezas.
var test = require('node:test');
var assert = require('node:assert/strict');
var calc = require('../services/calculo');

test('RN-05 recargoPara devuelve la tabla de recargos vigente y los tipos antiguos', function () {
  assert.equal(calc.recargoPara(21), 5.2);
  assert.equal(calc.recargoPara(10), 1.4);
  assert.equal(calc.recargoPara(4), 0.5);
  assert.equal(calc.recargoPara(18), 4);
  assert.equal(calc.recargoPara(16), 4);
  assert.equal(calc.recargoPara(8), 1);
  assert.equal(calc.recargoPara(7), 1);
});

test('RN-05 recargoPara devuelve 0 para tipos no listados y valores no numéricos', function () {
  assert.equal(calc.recargoPara(0), 0);
  assert.equal(calc.recargoPara(5), 0);
  assert.equal(calc.recargoPara(21.0), 5.2);
  assert.equal(calc.recargoPara(null), 0);
  assert.equal(calc.recargoPara(undefined), 0);
  assert.equal(calc.recargoPara('21'), 0);
});

test('Anomalía A-22: un tipoIva en cadena calcula IVA pero no recargo', function () {
  // Comportamiento actual no documentado; registrado como A-22.
  assert.deepEqual(calc.calcularLinea(1, 100, '21', false), { base: 100, cuotaIva: 21, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(1, 100, '21', true), { base: 100, cuotaIva: 21, cuotaRecargo: 0 });
});

test('RN-02 calcularLinea redondea base = cantidad × precio por línea', function () {
  assert.deepEqual(calc.calcularLinea(4, 18.5, 21, false), { base: 74, cuotaIva: 15.54, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(0.44, 21.6, 21, false), { base: 9.5, cuotaIva: 2, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(1.41, 27.45, 4, true), { base: 38.7, cuotaIva: 1.55, cuotaRecargo: 0.19 });
});

test('RN-03 calcularLinea calcula IVA sobre la base ya redondeada', function () {
  assert.deepEqual(calc.calcularLinea(0.44, 21.6, 21, false), { base: 9.5, cuotaIva: 2, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(0.5, 21.6, 21, true), { base: 10.8, cuotaIva: 2.27, cuotaRecargo: 0.56 });
  assert.deepEqual(calc.calcularLinea(1, 27.45, 4, true), { base: 27.45, cuotaIva: 1.1, cuotaRecargo: 0.14 });
});

test('RN-04 calcularLinea solo añade recargo si conRecargo es verdadero', function () {
  assert.deepEqual(calc.calcularLinea(4, 18.5, 21, false), { base: 74, cuotaIva: 15.54, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(4, 18.5, 21, true), { base: 74, cuotaIva: 15.54, cuotaRecargo: 3.85 });
});

test('RN-04 calcularLinea con cero, negativos y tipo de IVA cero', function () {
  assert.deepEqual(calc.calcularLinea(0, 90, 21, false), { base: 0, cuotaIva: 0, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(1, 0, 21, false), { base: 0, cuotaIva: 0, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(-1, 90, 21, false), { base: -90, cuotaIva: -18.9, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(1, -90, 21, false), { base: -90, cuotaIva: -18.9, cuotaRecargo: 0 });
  assert.deepEqual(calc.calcularLinea(1, 100, 0, false), { base: 100, cuotaIva: 0, cuotaRecargo: 0 });
});

test('RN-07 porcentajeDescuento mantiene las fronteras estrictas 1.000 y 5.000', function () {
  assert.equal(calc.porcentajeDescuento(0), 0);
  assert.equal(calc.porcentajeDescuento(999.99), 0);
  assert.equal(calc.porcentajeDescuento(1000), 0);
  assert.equal(calc.porcentajeDescuento(1000.01), 2);
  assert.equal(calc.porcentajeDescuento(4999.99), 2);
  assert.equal(calc.porcentajeDescuento(5000), 2);
  assert.equal(calc.porcentajeDescuento(5000.01), 5);
  assert.equal(calc.porcentajeDescuento(10000), 5);
});

test('RN-07 porcentajeDescuento con negativos, NaN e infinito', function () {
  assert.equal(calc.porcentajeDescuento(-1), 0);
  assert.equal(calc.porcentajeDescuento(NaN), 0);
  assert.equal(calc.porcentajeDescuento(Infinity), 5);
});

test('RN-06 calcularFactura redondea línea a línea, no sobre el total', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 1, precio: 0.03, tipoIva: 21 },
    { descripcion: 'b', cantidad: 1, precio: 0.03, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.base, 0.06);
  assert.equal(r.iva, 0.02);
  assert.equal(r.total, 0.08);
});

test('RN-10 calcularFactura con factura vacía devuelve ceros', function () {
  assert.deepEqual(calc.calcularFactura([], null), {
    lineas: [], base: 0, iva: 0, recargo: 0, total: 0, descuentoPct: 0
  });
  assert.deepEqual(calc.calcularFactura([], { recargo_equivalencia: 1 }), {
    lineas: [], base: 0, iva: 0, recargo: 0, total: 0, descuentoPct: 0
  });
});

test('RN-08 calcularFactura sin descuento conserva precio y totales', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.descuentoPct, 0);
  assert.equal(r.lineas[0].precio, 18.5);
  assert.equal(r.base, 74);
  assert.equal(r.iva, 15.54);
  assert.equal(r.recargo, 0);
  assert.equal(r.total, 89.54);
});

test('RN-04 y RN-10 calcularFactura con recargo suma base + IVA + recargo', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }
  ], { recargo_equivalencia: 1 });
  assert.deepEqual(r.lineas[0], {
    descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21,
    base: 74, cuotaIva: 15.54, cuotaRecargo: 3.85
  });
  assert.equal(r.base, 74);
  assert.equal(r.iva, 15.54);
  assert.equal(r.recargo, 3.85);
  assert.equal(r.total, 93.39);
});

test('RN-08 calcularFactura aplica el 2 % línea a línea por encima de 1.000', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 10, precio: 120, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.descuentoPct, 2);
  assert.equal(r.lineas[0].precio, 117.6);
  assert.equal(r.base, 1176);
  assert.equal(r.iva, 246.96);
  assert.equal(r.total, 1422.96);
});

test('RN-09 calcularFactura aplica el descuento también al recargo', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 10, precio: 120, tipoIva: 21 }
  ], { recargo_equivalencia: 1 });
  assert.equal(r.descuentoPct, 2);
  assert.equal(r.base, 1176);
  assert.equal(r.iva, 246.96);
  assert.equal(r.recargo, 61.15);
  assert.equal(r.total, 1484.11);
});

test('RN-08 calcularFactura con 5.000 justos aplica el 2 %, no el 5 %', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 1, precio: 5000, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.descuentoPct, 2);
  assert.equal(r.lineas[0].precio, 4900);
  assert.equal(r.base, 4900);
  assert.equal(r.iva, 1029);
  assert.equal(r.total, 5929);
});

test('RN-08 calcularFactura con 5.000,01 aplica el 5 %', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 1, precio: 5001, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.descuentoPct, 5);
  assert.equal(r.lineas[0].precio, 4750.95);
  assert.equal(r.base, 4750.95);
  assert.equal(r.iva, 997.7);
  assert.equal(r.total, 5748.65);
});

test('RN-08 calcularFactura con 1.000 justos no aplica descuento', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 1, precio: 1000, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.descuentoPct, 0);
  assert.equal(r.lineas[0].precio, 1000);
  assert.equal(r.base, 1000);
  assert.equal(r.iva, 210);
  assert.equal(r.total, 1210);
});

test('RN-08 el umbral se mide sobre la base bruta de todas las líneas', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 1, precio: 500, tipoIva: 21 },
    { descripcion: 'b', cantidad: 1, precio: 500.01, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.descuentoPct, 2);
  assert.equal(r.lineas[0].precio, 490);
  assert.equal(r.lineas[1].precio, 490.01);
  assert.equal(r.base, 980.01);
});

test('RN-06 y RN-10 factura mixta con varios IVA y recargo', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 },
    { descripcion: 'b', cantidad: 1, precio: 28.9, tipoIva: 21 },
    { descripcion: 'c', cantidad: 0.5, precio: 21.6, tipoIva: 21 },
    { descripcion: 'd', cantidad: 2, precio: 11.95, tipoIva: 10 }
  ], { recargo_equivalencia: 1 });
  assert.equal(r.base, 137.6);
  assert.equal(r.iva, 26.27);
  assert.equal(r.recargo, 6.24);
  assert.equal(r.total, 170.11);
  assert.equal(r.descuentoPct, 0);
});

test('RN-04 calcularFactura activa recargo con 1 numérico y con "1" cadena', function () {
  var conNumero = calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }
  ], { recargo_equivalencia: 1 });
  var conCadena = calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }
  ], { recargo_equivalencia: '1' });
  assert.equal(conNumero.recargo, 3.85);
  assert.equal(conCadena.recargo, 3.85);
});

test('RN-04 calcularFactura no activa recargo con 2 ni con "0"', function () {
  var dos = calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }
  ], { recargo_equivalencia: 2 });
  var cero = calc.calcularFactura([
    { descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }
  ], { recargo_equivalencia: '0' });
  assert.equal(dos.recargo, 0);
  assert.equal(cero.recargo, 0);
});

test('calcularFactura con cliente nulo o indefinido no aplica recargo', function () {
  var nulo = calc.calcularFactura([
    { descripcion: 'a', cantidad: 1, precio: 100, tipoIva: 21 }
  ], null);
  var indefinido = calc.calcularFactura([
    { descripcion: 'a', cantidad: 1, precio: 100, tipoIva: 21 }
  ], undefined);
  assert.equal(nulo.recargo, 0);
  assert.equal(indefinido.recargo, 0);
});

test('calcularFactura con importes negativos (rectificativa) conserva el signo', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: -1, precio: 90, tipoIva: 21 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.base, -90);
  assert.equal(r.iva, -18.9);
  assert.equal(r.total, -108.9);
});

test('Anomalía A-14: una línea sin tipoIva produce NaN en IVA y total', function () {
  var r = calc.calcularFactura([
    { descripcion: 'a', cantidad: 1, precio: 100 }
  ], { recargo_equivalencia: 0 });
  assert.equal(r.base, 100);
  assert.equal(Number.isNaN(r.iva), true);
  assert.equal(Number.isNaN(r.total), true);
});

test('RN-11 calcularProrrateo usa mes comercial de 30 días', function () {
  assert.equal(calc.calcularProrrateo(90, '2026-03-01', '2026-03-15'), 45);
  assert.equal(calc.calcularProrrateo(90, '2026-03-01', '2026-03-30'), 90);
  assert.equal(calc.calcularProrrateo(90, '2026-03-01', '2026-03-31'), 90);
  assert.equal(calc.calcularProrrateo(90, '2026-02-01', '2026-02-15'), 45);
  assert.equal(calc.calcularProrrateo(60, '2025-09-01', '2025-09-15'), 30);
  assert.equal(calc.calcularProrrateo(60, '2025-08-01', '2025-08-15'), 30);
});

test('RN-11 calcularProrrateo topa en 30 días y no baja de 0 días', function () {
  assert.equal(calc.calcularProrrateo(90, '2026-03-01', '2026-03-31'), 90);
  assert.equal(calc.calcularProrrateo(90, '2026-03-15', '2026-03-01'), 0);
  assert.equal(calc.calcularProrrateo(90, '2026-03-01', '2026-03-01'), 3);
  assert.equal(calc.calcularProrrateo(90, '2026-03-01', '2026-03-02'), 6);
});

test('RN-11 calcularProrrateo con cero, negativo, NaN y fechas inválidas', function () {
  assert.equal(calc.calcularProrrateo(0, '2026-03-01', '2026-03-15'), 0);
  assert.equal(calc.calcularProrrateo(-90, '2026-03-01', '2026-03-15'), -45);
  assert.equal(Number.isNaN(calc.calcularProrrateo(NaN, '2026-03-01', '2026-03-15')), true);
  assert.equal(Number.isNaN(calc.calcularProrrateo(90, 'basura', '2026-03-15')), true);
  assert.equal(calc.calcularProrrateo(90, '2026-13-01', '2026-13-15'), 45);
  assert.equal(calc.calcularProrrateo(90, '2026-02-01', '2026-02-29'), 87);
});
