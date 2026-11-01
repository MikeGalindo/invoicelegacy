// calculo.js - motor de cálculo de GesFact (implementación moderna).
//
// Extraído de services/calculo.js en la spec 010 sin cambio de comportamiento.
// Reproduce también las rarezas congeladas (A-22, A-23 y el cero negativo):
// no se añaden validaciones, normalizaciones ni "mejoras".
//
// AVISO (Julian, mayo 2019): NO CAMBIAR LA FORMA DE REDONDEAR.
// El Contaplus de la gestoria cuadra las facturas linea a linea. El redondeo es
// por línea y se hace con util.redondear2, igual que el código heredado.
const util = require('../lib/util');

// Recargo de equivalencia según tipo de IVA.
// La comparación es estricta a propósito: un tipo en cadena ('21') no tiene
// recargo aunque el IVA sí se calcule. Es el comportamiento congelado en A-22.
function recargoPara(tipoIva) {
  if (tipoIva === 21) return 5.2;
  if (tipoIva === 10) return 1.4;
  if (tipoIva === 4) return 0.5;
  // Tipos antiguos (16/18 general, 7/8 reducido): se conservan por si hay que
  // reabrir ejercicios viejos del Access.
  if (tipoIva === 18) return 4;
  if (tipoIva === 16) return 4;
  if (tipoIva === 8) return 1;
  if (tipoIva === 7) return 1;
  return 0;
}

// Calcula una línea: base, cuota de IVA y recargo, TODO redondeado por línea.
function calcularLinea(cantidad, precio, tipoIva, conRecargo) {
  const base = util.redondear2(cantidad * precio);
  const cuotaIva = util.redondear2(base * tipoIva / 100);
  let cuotaRecargo = 0;
  if (conRecargo) {
    cuotaRecargo = util.redondear2(base * recargoPara(tipoIva) / 100);
  }
  return { base: base, cuotaIva: cuotaIva, cuotaRecargo: cuotaRecargo };
}

// Descuento por volumen sobre la base de la factura: a partir de 1.000 € -> 2 %,
// a partir de 5.000 € -> 5 % (acordado con Paco en 2018 para fidelizar hostelería).
// Los umbrales son estrictos: 1.000,00 y 5.000,00 exactos no tienen descuento.
function porcentajeDescuento(baseTotal) {
  if (baseTotal > 5000) return 5;
  if (baseTotal > 1000) return 2;
  return 0;
}

// Calcula la factura completa a partir de las líneas "crudas".
// lineas: [{descripcion, cantidad, precio, tipoIva}]
// cliente: {recargo_equivalencia}
function calcularFactura(lineas, cliente) {
  // Comparación laxa a propósito: 1 y '1' activan el recargo (comportamiento
  // congelado en test/calculo.test.js).
  const conRecargo = cliente && cliente.recargo_equivalencia == 1;
  const resultado = { lineas: [], base: 0, iva: 0, recargo: 0, total: 0, descuentoPct: 0 };

  let baseBruta = 0;
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const calculo = calcularLinea(linea.cantidad, linea.precio, linea.tipoIva, conRecargo);
    baseBruta = util.redondear2(baseBruta + calculo.base);
  }

  const dto = porcentajeDescuento(baseBruta);
  resultado.descuentoPct = dto;

  // El descuento se aplica línea a línea para que la gestoría lo vea desglosado
  // igual (petición de Puri, 2018). No se redondea nunca sobre el total.
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    let precioConDto = linea.precio;
    if (dto > 0) {
      precioConDto = util.redondear2(linea.precio * (100 - dto) / 100);
    }
    const calculo = calcularLinea(linea.cantidad, precioConDto, linea.tipoIva, conRecargo);
    resultado.lineas.push({
      descripcion: linea.descripcion,
      cantidad: linea.cantidad,
      precio: precioConDto,
      tipoIva: linea.tipoIva,
      base: calculo.base,
      cuotaIva: calculo.cuotaIva,
      cuotaRecargo: calculo.cuotaRecargo
    });
    resultado.base = util.redondear2(resultado.base + calculo.base);
    resultado.iva = util.redondear2(resultado.iva + calculo.cuotaIva);
    resultado.recargo = util.redondear2(resultado.recargo + calculo.cuotaRecargo);
  }

  resultado.total = util.redondear2(resultado.base + resultado.iva + resultado.recargo);
  return resultado;
}

// Prorrateo de cuotas mensuales de contrato.
// Se prorratea "a lo comercial": el mes son siempre 30 días y se cobra
// (cuota/30) * días de servicio. Así lo hacía Paco a mano en el Access y así lo
// espera la gestoría. El día 31 de un mes de 31 días no se cobra.
// desde/hasta: YYYY-MM-DD dentro del MISMO mes. No se valida el formato.
function calcularProrrateo(cuota, desde, hasta) {
  const d1 = parseInt(desde.split('-')[2], 10);
  const d2 = parseInt(hasta.split('-')[2], 10);
  let dias = d2 - d1 + 1;
  if (dias > 30) dias = 30;
  if (dias < 0) dias = 0;
  return util.redondear2(cuota / 30 * dias);
}

module.exports = {
  recargoPara: recargoPara,
  calcularLinea: calcularLinea,
  porcentajeDescuento: porcentajeDescuento,
  calcularFactura: calcularFactura,
  calcularProrrateo: calcularProrrateo
};
