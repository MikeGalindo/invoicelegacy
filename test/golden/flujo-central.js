// Modelo del flujo central de negocio para el golden master.
// Usa las funciones puras de producción y fija un juego cerrado de 12 casos.
var util = require('../../lib/util');
var calc = require('../../services/calculo');
var config = require('../../config');

function dinero(n) {
  return Number(n).toFixed(2);
}

function prorrateoDiasReales(cuota, mes, desde, hasta) {
  var primerDia = mes + '-01';
  var ultimoDia = mes + '-' + util.diasDelMes(primerDia);
  var desdeEf = desde > primerDia ? desde : primerDia;
  var hastaEf = hasta < ultimoDia ? hasta : ultimoDia;
  var d1 = parseInt(desdeEf.split('-')[2], 10);
  var d2 = parseInt(hastaEf.split('-')[2], 10);
  var diasMes = util.diasDelMes(primerDia);
  var diasServicio = d2 - d1 + 1;
  return util.redondear2(cuota / diasMes * diasServicio);
}

function invertirFactura(calculo, c) {
  return {
    fecha: c.fechaRectificativa,
    vencimiento: null,
    rectifica_a: c.numero,
    base: dinero(-calculo.base),
    iva: dinero(-calculo.iva),
    recargo: dinero(-calculo.recargo),
    total: dinero(-calculo.total),
    lineas: calculo.lineas.map(function (l) {
      return {
        descripcion: 'Rectificación: ' + l.descripcion,
        cantidad: -l.cantidad,
        precio: dinero(l.precio),
        tipoIva: l.tipoIva,
        base: dinero(-l.base),
        cuotaIva: dinero(-l.cuotaIva),
        cuotaRecargo: dinero(-l.cuotaRecargo)
      };
    })
  };
}

var CASOS = [
  {
    id: 'manual-simple',
    descripcion: 'Factura manual de una línea, sin recargo ni descuento',
    numero: 'FA-2026-000201',
    fecha: '2026-02-06',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [{ descripcion: 'Desengrasante cocinas 10L', cantidad: 4, precio: 18.5, tipoIva: 21 }]
  },
  {
    id: 'manual-recargo',
    descripcion: 'Factura manual de una línea con recargo de equivalencia',
    numero: 'FA-2026-000202',
    fecha: '2026-02-06',
    diasPago: null,
    cliente: { recargo_equivalencia: 1 },
    lineas: [{ descripcion: 'Desengrasante cocinas 10L', cantidad: 4, precio: 18.5, tipoIva: 21 }]
  },
  {
    id: 'manual-mixta',
    descripcion: 'Factura manual de cuatro líneas, tres tipos de IVA y recargo',
    numero: 'FA-2026-000203',
    fecha: '2026-03-31',
    diasPago: 60,
    cliente: { recargo_equivalencia: 1 },
    lineas: [
      { descripcion: 'Desengrasante cocinas 10L', cantidad: 4, precio: 18.5, tipoIva: 21 },
      { descripcion: 'Plato llano hostelería 25cm', cantidad: 1, precio: 28.9, tipoIva: 21 },
      { descripcion: 'Vaso caña 20cl', cantidad: 0.5, precio: 21.6, tipoIva: 21 },
      { descripcion: 'Café en grano natural 1kg', cantidad: 2, precio: 11.95, tipoIva: 10 }
    ]
  },
  {
    id: 'descuento-2-justo-encima',
    descripcion: 'Base 1.000,01: descuento del 2 %',
    numero: 'FA-2026-000204',
    fecha: '2026-03-05',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [{ descripcion: 'Pedido', cantidad: 1, precio: 1000.01, tipoIva: 21 }]
  },
  {
    id: 'descuento-5-justo-encima',
    descripcion: 'Base 5.001: descuento del 5 %',
    numero: 'FA-2026-000205',
    fecha: '2026-03-05',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [{ descripcion: 'Pedido', cantidad: 1, precio: 5001, tipoIva: 21 }]
  },
  {
    id: 'frontera-1000',
    descripcion: 'Base 1.000,00 justa: sin descuento',
    numero: 'FA-2026-000206',
    fecha: '2026-02-20',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [{ descripcion: 'Pedido', cantidad: 1, precio: 1000, tipoIva: 21 }]
  },
  {
    id: 'frontera-5000',
    descripcion: 'Base 5.000,00 justa: descuento del 2 %, no del 5 %',
    numero: 'FA-2026-000207',
    fecha: '2026-02-20',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [{ descripcion: 'Pedido', cantidad: 1, precio: 5000, tipoIva: 21 }]
  },
  {
    id: 'redondeo-por-linea',
    descripcion: 'Dos líneas de 0,03: el IVA se redondea por línea',
    numero: 'FA-2026-000208',
    fecha: '2026-02-28',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [
      { descripcion: 'A', cantidad: 1, precio: 0.03, tipoIva: 21 },
      { descripcion: 'B', cantidad: 1, precio: 0.03, tipoIva: 21 }
    ]
  },
  {
    id: 'prorrateo-marzo',
    descripcion: 'Cuota de 90 € con baja el 15 de marzo: 30 días frente a días reales',
    numero: 'FA-2026-000209',
    fecha: '2026-03-31',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [{ descripcion: 'Cuota marzo', cantidad: 1, precio: 90, tipoIva: 21 }],
    prorrateo: { cuota: 90, mes: '2026-03', desde: '2026-03-01', hasta: '2026-03-15' }
  },
  {
    id: 'prorrateo-febrero',
    descripcion: 'Cuota de 90 € con baja el 15 de febrero: 30 días frente a días reales',
    numero: 'FA-2026-000210',
    fecha: '2026-02-28',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [{ descripcion: 'Cuota febrero', cantidad: 1, precio: 90, tipoIva: 21 }],
    prorrateo: { cuota: 90, mes: '2026-02', desde: '2026-02-01', hasta: '2026-02-15' }
  },
  {
    id: 'febrero-bisiesto',
    descripcion: 'Factura de 2028-02-28 con vencimiento a 30 días y prorrateo de febrero bisiesto',
    numero: 'FA-2028-000001',
    fecha: '2028-02-28',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [{ descripcion: 'Cuota febrero 2028', cantidad: 1, precio: 90, tipoIva: 21 }],
    prorrateo: { cuota: 90, mes: '2028-02', desde: '2028-02-01', hasta: '2028-02-15' }
  },
  {
    id: 'rectificativa',
    descripcion: 'Rectificación espejo de la factura manual simple',
    numero: 'FA-2026-000212',
    fecha: '2026-02-06',
    diasPago: null,
    cliente: { recargo_equivalencia: 0 },
    lineas: [{ descripcion: 'Desengrasante cocinas 10L', cantidad: 4, precio: 18.5, tipoIva: 21 }],
    rectificar: true,
    fechaRectificativa: '2026-05-06'
  }
];

function construirSalida() {
  var casos = CASOS.map(function (c) {
    var calculo = calc.calcularFactura(c.lineas, c.cliente);
    var dias = c.diasPago || config.VENCIMIENTO_DIAS;
    var salida = {
      id: c.id,
      descripcion: c.descripcion,
      entrada: {
        numero: c.numero,
        fecha: c.fecha,
        diasPago: c.diasPago,
        cliente: c.cliente,
        lineas: c.lineas,
        prorrateo: c.prorrateo || null,
        rectificar: !!c.rectificar
      },
      salida: {
        factura: {
          numero: c.numero,
          serie: 'FA',
          fecha: c.fecha,
          vencimiento: util.sumarDias(c.fecha, dias),
          base: dinero(calculo.base),
          iva: dinero(calculo.iva),
          recargo: dinero(calculo.recargo),
          total: dinero(calculo.total),
          descuentoPct: calculo.descuentoPct,
          lineas: calculo.lineas.map(function (l) {
            return {
              descripcion: l.descripcion,
              cantidad: l.cantidad,
              precio: dinero(l.precio),
              tipoIva: l.tipoIva,
              base: dinero(l.base),
              cuotaIva: dinero(l.cuotaIva),
              cuotaRecargo: dinero(l.cuotaRecargo)
            };
          })
        },
        prorrateoComercial: c.prorrateo ? dinero(calc.calcularProrrateo(c.prorrateo.cuota, c.prorrateo.desde, c.prorrateo.hasta)) : null,
        prorrateoDiasReales: c.prorrateo ? dinero(prorrateoDiasReales(c.prorrateo.cuota, c.prorrateo.mes, c.prorrateo.desde, c.prorrateo.hasta)) : null,
        rectificativa: c.rectificar ? invertirFactura(calculo, c) : null
      }
    };
    return salida;
  });

  return {
    esquema: 'gesfact-golden-master-flujo-central-v1',
    descripcion: 'Salida completa del flujo central de cálculo, vencimiento, prorrateo y rectificación. Generado con las funciones puras actuales.',
    casos: casos,
    redondeos: [3.848, 1.995, 0.5616, 2.675, 1.005, 1.255, -2.675, -1.005, 0.005, 0.015, -0.015].map(function (x) {
      return { entrada: x, salida: util.redondear2(x) };
    }),
    formatos: [1234.5, -122.23, 0.5, 1000, 2.675, 1.005].map(function (x) {
      return { entrada: x, salida: util.formatearImporte(x) };
    })
  };
}

function ordenarClaves(obj) {
  if (Array.isArray(obj)) return obj.map(ordenarClaves);
  if (obj && typeof obj === 'object') {
    var salida = {};
    Object.keys(obj).sort().forEach(function (k) {
      salida[k] = ordenarClaves(obj[k]);
    });
    return salida;
  }
  return obj;
}

function serializar(obj) {
  return JSON.stringify(ordenarClaves(obj), null, 2) + '\n';
}

module.exports = {
  CASOS: CASOS,
  construirSalida: construirSalida,
  serializar: serializar,
  prorrateoDiasReales: prorrateoDiasReales
};
