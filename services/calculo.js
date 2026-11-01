// calculo.js - fachada del motor de cálculo.
//
// Desde la spec 010 la implementación vive en motor/calculo.js. Esta ruta y esta
// API se conservan intactas para no tocar a los consumidores
// (routes/facturas.js, routes/contratos.js y scripts/remesa_mensual.js).
//
// El comportamiento es el mismo que el heredado, incluidas sus rarezas (A-22,
// A-23 y el cero negativo). No añadir lógica aquí: la fachada solo reexporta.
module.exports = require('../motor/calculo');
