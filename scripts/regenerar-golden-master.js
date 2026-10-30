// Regenera test/golden/master.json.
// Solo debe ejecutarse con una decisión de negocio documentada que cambie el
// comportamiento esperado. No forma parte de `npm test`.
var fs = require('node:fs');
var path = require('node:path');
var { construirSalida, serializar } = require('../test/golden/flujo-central');

var destino = path.join(__dirname, '..', 'test', 'golden', 'master.json');
fs.writeFileSync(destino, serializar(construirSalida()), 'utf8');
console.log('Golden master regenerado en ' + destino);
