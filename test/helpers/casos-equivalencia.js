// casos-equivalencia.js - Generador determinista de casos para el anillo (c).
//
// Semilla fija: dos ejecuciones producen exactamente los mismos 100 casos.
// No usa Math.random. Ver specs/010-motor-calculo-strangler/research.md (R-06)
// y spec.md FR-015/FR-016.
//
// Los valores se eligen por ciclos (no solo al azar) para garantizar que la
// batería cubre siempre los tipos de IVA, las fronteras de descuento y los
// prorrateos exigidos, sin depender de la suerte del PRNG.
var SEMILLA = 20261101;
var NUM_CASOS = 100;

// PRNG mulberry32: 32 bits, determinista y reproducible en cualquier máquina.
function mulberry32(semilla) {
  var a = semilla >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

var TIPOS_IVA = [21, 10, 4, 16, 18, 8, 7, 0, 5, -1, '21', null, undefined];

var CANTIDADES = [1, 2, 4, 0.5, 0.44, 1.41, 0, -1, 21.6, 0.1 + 0.2, undefined];

var PRECIOS = [18.5, 21.6, 27.45, 90, 1000.01, 5000, 0.03, -5.5, 0, 0.07, undefined];

// Variantes de cliente: con y sin recargo, incluida la cadena '1' (comparación laxa).
var CLIENTES = [
  null,
  undefined,
  { recargo_equivalencia: 0 },
  { recargo_equivalencia: 1 },
  { recargo_equivalencia: '1' },
  { recargo_equivalencia: '0' },
  { recargo_equivalencia: 2 }
];

// Fronteras del descuento por volumen: exactas, justo por encima y por debajo.
var BASES = [1000, 1000.01, 999.99, 5000, 5000.01, 4999.99, 0, -1, 1000000];

// Prorrateos válidos y malformados. El de `desde: null` lanza TypeError y el de
// `hasta` sin guiones produce NaN: ambos comportamientos deben ser equivalentes.
var PRORRATEOS = [
  { cuota: 90, desde: '2026-03-01', hasta: '2026-03-15' },
  { cuota: 90, desde: '2026-03-01', hasta: '2026-03-31' },
  { cuota: 90, desde: '2026-03-15', hasta: '2026-03-01' },
  { cuota: 90, desde: '2026-02-10', hasta: '2026-02-10' },
  { cuota: 90, desde: '2028-02-01', hasta: '2028-02-15' },
  { cuota: 0, desde: '2026-01-05', hasta: '2026-01-31' },
  { cuota: 90, desde: '2026-03-01', hasta: '20260315' },
  { cuota: 90, desde: null, hasta: '2026-03-15' }
];

function elegir(lista, indice) {
  return lista[((indice % lista.length) + lista.length) % lista.length];
}

function generarCasos() {
  var azar = mulberry32(SEMILLA);
  var casos = [];

  for (var i = 0; i < NUM_CASOS; i++) {
    var numLineas;
    if (i % 17 === 0) {
      numLineas = 0;                       // factura sin líneas
    } else if (i % 5 === 0) {
      numLineas = 4;                       // varias líneas
    } else {
      numLineas = 1 + Math.floor(azar() * 3); // 1 a 3 líneas
    }

    var lineas = [];
    if (numLineas > 0) {
      // La primera línea recorre los catálogos por ciclo: cobertura garantizada.
      lineas.push({
        descripcion: 'Línea fija ' + (i + 1),
        cantidad: elegir(CANTIDADES, i),
        precio: elegir(PRECIOS, i),
        tipoIva: elegir(TIPOS_IVA, i)
      });
      for (var j = 1; j < numLineas; j++) {
        lineas.push({
          descripcion: 'Línea ' + (i + 1) + '.' + (j + 1),
          cantidad: elegir(CANTIDADES, i + j * 3),
          precio: elegir(PRECIOS, i + j * 5),
          tipoIva: elegir(TIPOS_IVA, i + j * 7)
        });
      }
    }

    casos.push({
      id: i + 1,
      lineas: lineas,
      cliente: elegir(CLIENTES, i),
      conRecargo: i % 2 === 0,
      cantidad: elegir(CANTIDADES, i),
      precio: elegir(PRECIOS, i),
      tipoIva: elegir(TIPOS_IVA, i),
      baseTotal: elegir(BASES, i),
      prorrateo: elegir(PRORRATEOS, i)
    });
  }

  return casos;
}

module.exports = {
  SEMILLA: SEMILLA,
  NUM_CASOS: NUM_CASOS,
  generarCasos: generarCasos
};
