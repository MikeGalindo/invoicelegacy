// Tests del arnés de equivalencia del motor (spec 010).
//
// Anillo (c): ejecuta la implementación nueva (motor/calculo.js) y la copia
// congelada del heredado (test/referencia/calculo-heredado.js) sobre 100 casos
// deterministas y exige igualdad exacta campo a campo.
//
// La comparación usa Object.is en las hojas: distingue -0 de 0 y considera NaN
// igual a NaN. No se usa JSON, que perdería ambas distinciones (FR-014).
var test = require('node:test');
var assert = require('node:assert/strict');
var path = require('node:path');
var util = require('../lib/util');
var nuevo = require('../motor/calculo');
var heredado = require('./referencia/calculo-heredado');
var casos = require('./helpers/casos-equivalencia');

var CLAVES = [
  'calcularFactura',
  'calcularLinea',
  'calcularProrrateo',
  'porcentajeDescuento',
  'recargoPara'
];

var ARIDADES = {
  recargoPara: 1,
  calcularLinea: 4,
  porcentajeDescuento: 1,
  calcularFactura: 2,
  calcularProrrateo: 3
};

// --- Utilidades de comparación ---------------------------------------------

function mostrar(valor) {
  if (Object.is(valor, -0)) return '-0';
  if (typeof valor === 'number' && Number.isNaN(valor)) return 'NaN';
  if (typeof valor === 'undefined') return 'undefined';
  if (typeof valor === 'string') return JSON.stringify(valor);
  if (valor === null) return 'null';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

// Devuelve la ruta de la primera diferencia o null si son exactamente iguales.
// Patrón de test/golden-master.test.js, con Object.is en las hojas.
function primeraDiferencia(esperado, actual, ruta) {
  var sitio = ruta || '$';
  if (Object.is(esperado, actual)) return null;

  if (typeof esperado !== typeof actual) {
    return sitio + ': tipo heredado ' + typeof esperado + ', tipo nuevo ' + typeof actual;
  }

  if (Array.isArray(esperado) || Array.isArray(actual)) {
    if (!Array.isArray(esperado) || !Array.isArray(actual)) {
      return sitio + ': uno es array y el otro no';
    }
    if (esperado.length !== actual.length) {
      return sitio + ': longitud heredada ' + esperado.length + ', nueva ' + actual.length;
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
      var clave = claves[j];
      if (!Object.prototype.hasOwnProperty.call(esperado, clave)) {
        return sitio + '.' + clave + ': sobra en el nuevo';
      }
      if (!Object.prototype.hasOwnProperty.call(actual, clave)) {
        return sitio + '.' + clave + ': falta en el nuevo';
      }
      var diffObjeto = primeraDiferencia(esperado[clave], actual[clave], sitio + '.' + clave);
      if (diffObjeto) return diffObjeto;
    }
    return null;
  }

  return sitio + ': heredado ' + mostrar(esperado) + ', nuevo ' + mostrar(actual);
}

function ejecutar(invocacion) {
  try {
    return { ok: true, valor: invocacion() };
  } catch (error) {
    return { ok: false, nombre: error.name, mensaje: error.message };
  }
}

// Compara dos invocaciones y falla con la etiqueta y la ruta de la diferencia.
// Devuelve true si la invocación heredada lanzó una excepción.
function exigirIgual(etiqueta, invocacionHeredada, invocacionNueva) {
  var resultadoHeredado = ejecutar(invocacionHeredada);
  var resultadoNuevo = ejecutar(invocacionNueva);
  var diff = primeraDiferencia(resultadoHeredado, resultadoNuevo);
  assert.equal(diff, null, etiqueta + ' -> ' + diff);
  return !resultadoHeredado.ok;
}

function sumarRedondeando(lineas, campo) {
  var total = 0;
  for (var i = 0; i < lineas.length; i++) {
    total = util.redondear2(total + lineas[i][campo]);
  }
  return total;
}

// --- Anillo (c) ------------------------------------------------------------

test('EQUIVALENCIA: 100 casos generados dan la misma salida campo a campo', function () {
  var lista = casos.generarCasos();
  assert.equal(lista.length, 100, 'la batería debe tener exactamente 100 casos');

  var lanzamientos = 0;

  for (var i = 0; i < lista.length; i++) {
    var c = lista[i];

    lanzamientos += exigirIgual('caso ' + c.id + ' calcularFactura',
      function () { return heredado.calcularFactura(c.lineas, c.cliente); },
      function () { return nuevo.calcularFactura(c.lineas, c.cliente); }) ? 1 : 0;

    lanzamientos += exigirIgual('caso ' + c.id + ' calcularLinea',
      function () { return heredado.calcularLinea(c.cantidad, c.precio, c.tipoIva, c.conRecargo); },
      function () { return nuevo.calcularLinea(c.cantidad, c.precio, c.tipoIva, c.conRecargo); }) ? 1 : 0;

    lanzamientos += exigirIgual('caso ' + c.id + ' recargoPara',
      function () { return heredado.recargoPara(c.tipoIva); },
      function () { return nuevo.recargoPara(c.tipoIva); }) ? 1 : 0;

    lanzamientos += exigirIgual('caso ' + c.id + ' porcentajeDescuento',
      function () { return heredado.porcentajeDescuento(c.baseTotal); },
      function () { return nuevo.porcentajeDescuento(c.baseTotal); }) ? 1 : 0;

    // A-11/D-03 y specs/011-prorrateo-dias-reales/spec.md: calcularProrrateo
    // es la única divergencia intencionada respecto al heredado. Se excluye de
    // esta comparación; las otras cuatro funciones siguen con igualdad exacta.
  }

  // El prorrateo ya no aporta la excepción de la batería. Se conserva la
  // comprobación de que las excepciones también se comparan con una llamada
  // que sigue siendo equivalente en ambas implementaciones.
  lanzamientos += exigirIgual('excepción calcularFactura(null)',
    function () { return heredado.calcularFactura(null, null); },
    function () { return nuevo.calcularFactura(null, null); }) ? 1 : 0;

  assert.ok(lanzamientos >= 1, 'la batería debe comparar al menos una excepción');
});

// --- Contrato de API -------------------------------------------------------

test('EQUIVALENCIA: motor y fachada exponen las cinco funciones con las mismas aridades', function () {
  var implementaciones = [
    { nombre: 'motor', modulo: nuevo },
    { nombre: 'fachada', modulo: require('../services/calculo') }
  ];

  for (var i = 0; i < implementaciones.length; i++) {
    var nombre = implementaciones[i].nombre;
    var modulo = implementaciones[i].modulo;

    assert.deepEqual(Object.keys(modulo).sort(), CLAVES, nombre + ': exports distintos de los cinco esperados');

    for (var j = 0; j < CLAVES.length; j++) {
      var clave = CLAVES[j];
      assert.equal(typeof modulo[clave], 'function', nombre + ': ' + clave + ' no es función');
      assert.equal(modulo[clave].length, ARIDADES[clave], nombre + ': aridad distinta en ' + clave);
    }
  }
});

// --- Invariantes y pureza de la entrada ------------------------------------

test('EQUIVALENCIA: el resultado cumple las invariantes y no muta la entrada', function () {
  var lista = casos.generarCasos();

  for (var i = 0; i < lista.length; i++) {
    var c = lista[i];
    var copiaLineas = structuredClone(c.lineas);
    var copiaCliente = structuredClone(c.cliente);

    var resultado = nuevo.calcularFactura(c.lineas, c.cliente);

    // Invariantes de data-model.md §2.5.
    assert.ok(Object.is(resultado.total, util.redondear2(resultado.base + resultado.iva + resultado.recargo)),
      'caso ' + c.id + ': total distinto de base + iva + recargo');
    assert.equal(resultado.lineas.length, c.lineas.length,
      'caso ' + c.id + ': número de líneas calculadas distinto');
    assert.ok(Object.is(resultado.base, sumarRedondeando(resultado.lineas, 'base')),
      'caso ' + c.id + ': base distinta de la suma de líneas');
    assert.ok(Object.is(resultado.iva, sumarRedondeando(resultado.lineas, 'cuotaIva')),
      'caso ' + c.id + ': IVA distinto de la suma de líneas');
    assert.ok(Object.is(resultado.recargo, sumarRedondeando(resultado.lineas, 'cuotaRecargo')),
      'caso ' + c.id + ': recargo distinto de la suma de líneas');

    // Sin mutación de la entrada.
    assert.equal(primeraDiferencia(copiaLineas, c.lineas), null,
      'caso ' + c.id + ': el motor ha mutado las líneas de entrada');
    assert.equal(primeraDiferencia(copiaCliente, c.cliente), null,
      'caso ' + c.id + ': el motor ha mutado el cliente de entrada');
  }
});

test('EQUIVALENCIA: la semilla y el número de casos son fijos y reproducibles', function () {
  assert.equal(casos.SEMILLA, 20261101);
  assert.equal(casos.NUM_CASOS, 100);
  assert.deepEqual(casos.generarCasos(), casos.generarCasos(),
    'dos generaciones con la misma semilla deben producir los mismos casos');
});

test('EQUIVALENCIA: el motor es puro (solo carga lib/util.js)', function () {
  var rutaMotor = require.resolve('../motor/calculo');
  var entrada = require.cache[rutaMotor];
  assert.ok(entrada, 'el motor debe estar cargado');

  var hijos = entrada.children.map(function (hijo) {
    return path.basename(hijo.filename);
  }).sort();

  assert.deepEqual(hijos, ['util.js'],
    'el motor no debe cargar base de datos, red, ficheros ni reloj');
});

// --- Rarezas congeladas ----------------------------------------------------

test('EQUIVALENCIA: se reproducen las rarezas A-22, A-23, -0, NaN y las variantes de cliente', function () {
  // A-22: un IVA en cadena calcula IVA pero no recargo.
  assert.deepEqual(nuevo.calcularLinea(1, 100, '21', true), { base: 100, cuotaIva: 21, cuotaRecargo: 0 });
  assert.deepEqual(nuevo.recargoPara('21'), 0);

  // A-23: el cero negativo se conserva y no se normaliza.
  assert.ok(Object.is(nuevo.calcularLinea(0.01, -0.5, 21, false).base, -0),
    'el motor debe devolver -0, no 0');
  assert.ok(Object.is(util.redondear2(-0.005), -0));

  // NaN se propaga igual que en el heredado (con recargo activo, las tres cuotas).
  var conNaN = nuevo.calcularLinea(undefined, 10, 21, true);
  assert.ok(Number.isNaN(conNaN.base) && Number.isNaN(conNaN.cuotaIva) && Number.isNaN(conNaN.cuotaRecargo));

  // Cliente nulo o indefinido: sin recargo y sin excepción.
  var linea = [{ descripcion: 'a', cantidad: 4, precio: 18.5, tipoIva: 21 }];
  assert.equal(nuevo.calcularFactura(linea, null).recargo, 0);
  assert.equal(nuevo.calcularFactura(linea, undefined).recargo, 0);

  // La comparación laxa mantiene el recargo con la cadena '1' (y solo con ella).
  assert.equal(nuevo.calcularFactura(linea, { recargo_equivalencia: '1' }).recargo, 3.85);
  assert.equal(nuevo.calcularFactura(linea, { recargo_equivalencia: 1 }).recargo, 3.85);
  assert.equal(nuevo.calcularFactura(linea, { recargo_equivalencia: '0' }).recargo, 0);

  // Y todo ello coincide con el heredado.
  exigirIgual('A-22', function () { return heredado.calcularLinea(1, 100, '21', true); },
    function () { return nuevo.calcularLinea(1, 100, '21', true); });
  exigirIgual('A-23', function () { return heredado.calcularLinea(0.01, -0.5, 21, false); },
    function () { return nuevo.calcularLinea(0.01, -0.5, 21, false); });
  exigirIgual('cliente cadena', function () { return heredado.calcularFactura(linea, { recargo_equivalencia: '1' }); },
    function () { return nuevo.calcularFactura(linea, { recargo_equivalencia: '1' }); });
});
