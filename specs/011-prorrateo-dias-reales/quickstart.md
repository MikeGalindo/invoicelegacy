# Guía de validación (quickstart): prorrateo único por días reales

**Feature**: `011-prorrateo-dias-reales`
**Fecha**: 2026-11-02
**Objetivo**: demostrar, con comandos reproducibles, que `calcularProrrateo` usa los días reales del
mes, que la remesa no cambia y que el resto del motor sigue siendo equivalente al heredado.

> Esta guía no contiene la implementación. La forma del dato está en [data-model.md](./data-model.md)
> y el contrato de la función en [contracts/calcular-prorrateo.md](./contracts/calcular-prorrateo.md).

---

## 1. Requisitos previos

- Ejecutar **desde la raíz del repositorio** (`config.RUTA_BD` es relativa; `AGENTS.md`).
- Node.js 24.x (verificado con **v24.19.0**).
- Zona horaria `Europe/Madrid`. `npm test` ya la fija (`package.json:8`); en los comandos con
  `node --test` directo hay que ponerla a mano.
- **No** hace falta `node_modules` para la suite: los tests solo cargan `config.js`, `lib/util.js`,
  `services/calculo.js`, `motor/calculo.js` y módulos `node:*`.

> **Advertencia**: ninguno de estos comandos abre la base de datos, emite facturas ni ejecuta
> `scripts/remesa_mensual.js`. La remesa real solo se lanza sobre copias desechables y no forma parte
> de esta validación.

---

## 2. Paso 0 — Línea base (antes de tocar nada)

```bash
npm test
```

**Esperado**: **122 tests, 122 en verde**, 0 fallos, 0 saltados, duración aproximada 130 ms
(2026-11-02).

Si la línea base no está verde, **se detiene la obra**: no se moderniza encima de un rojo previo
(`constitution.md:213-214`).

---

## 3. Caso normativo

```bash
TZ=Europe/Madrid node -e "console.log(require('./motor/calculo').calcularProrrateo(60, '2026-07-16', '2026-07-30'))"
```

**Esperado**: `29.03`.

**Comprobación de que ya no es 30,00**:

```bash
TZ=Europe/Madrid node -e "const c=require('./motor/calculo'); const v=c.calcularProrrateo(60,'2026-07-16','2026-07-30'); console.log(v === 29.03 ? 'OK' : 'FALLO: ' + v)"
```

**Esperado**: `OK`.

---

## 4. Meses completos

```bash
TZ=Europe/Madrid node - <<'NODE'
const c = require('./motor/calculo');
const casos = [
  ['febrero 2026 (28)', 90, '2026-02-01', '2026-02-28'],
  ['febrero 2028 (29)', 90, '2028-02-01', '2028-02-29'],
  ['abril 2026 (30)',   90, '2026-04-01', '2026-04-30'],
  ['marzo 2026 (31)',   90, '2026-03-01', '2026-03-31']
];
for (const [nombre, cuota, desde, hasta] of casos) {
  const v = c.calcularProrrateo(cuota, desde, hasta);
  console.log(nombre + ': ' + v + (v === 90 ? ' OK' : ' FALLO'));
}
NODE
```

**Esperado**:

```text
febrero 2026 (28): 90 OK
febrero 2028 (29): 90 OK
abril 2026 (30): 90 OK
marzo 2026 (31): 90 OK
```

---

## 5. Día 31 cobrado y periodos parciales

```bash
TZ=Europe/Madrid node - <<'NODE'
const c = require('./motor/calculo');
const casos = [
  ['16-30 julio (15/31)', 60, '2026-07-16', '2026-07-30', 29.03],
  ['1-30 julio (30/31)',  60, '2026-07-01', '2026-07-30', 58.06],
  ['16-31 julio (16/31)', 60, '2026-07-16', '2026-07-31', 30.97],
  ['mismo día en julio',  60, '2026-07-16', '2026-07-16', 1.94],
  ['días invertidos',     90, '2026-03-15', '2026-03-01', 0]
];
for (const [nombre, cuota, desde, hasta, esperado] of casos) {
  const v = c.calcularProrrateo(cuota, desde, hasta);
  console.log(nombre + ': ' + v + (v === esperado ? ' OK' : ' FALLO, esperado ' + esperado));
}
NODE
```

**Esperado**: los cinco casos con `OK`.

---

## 6. Paridad con la remesa

El test de paridad replica la fórmula inline de `scripts/remesa_mensual.js:47-51` y la compara con
`calcularProrrateo` para los 12 meses y periodos parciales. Se ejecuta con:

```bash
TZ=Europe/Madrid node --test test/contradicciones.test.js
```

**Esperado**: todos los tests en verde, incluido el de la contradicción 01, que ahora comprueba que
las dos fórmulas coinciden. Además, la comprobación por texto de que la remesa conserva
`util.diasDelMes(primerDia)` y `co.cuota / diasMes * diasServicio` debe seguir pasando.

**Comprobación de que la remesa no se ha tocado**:

```bash
git diff --exit-code scripts/remesa_mensual.js
```

**Esperado**: sin salida y código de salida 0.

---

## 7. Tests de la función

```bash
TZ=Europe/Madrid node --test test/calculo.test.js test/reglas-negocio.test.js test/anomalias.test.js
```

**Esperado**: todos en verde. En particular:

- RN-11 ya no dice «mes comercial de 30 días» ni «topa en 30 días».
- A-11 ya no dice «conviven dos prorrateos»; dice que convergen en días reales.
- El caso 60 €/16–30 julio devuelve 29,03.

**Si falla un test con prefijo `CONGELA comportamiento actual:`**: se investiga si es una regresión;
no se ablanda el test. En este delta, los cuatro tests antiguos se sustituyen con la decisión
A-11/D-03 citada en el commit (`constitution.md:69-79`).

---

## 8. Anillo C — equivalencia del resto del motor

```bash
TZ=Europe/Madrid node --test test/equivalencia-motor.test.js
```

**Esperado**:

- `calcularFactura`, `calcularLinea`, `recargoPara` y `porcentajeDescuento`: **0 diferencias**.
- `calcularProrrateo`: excluido de la comparación, con comentario que cita A-11/D-03 y esta spec.
- Contrato de API: 5 exports, aridades `1, 4, 1, 2, 3`.
- Pureza: el motor solo carga `lib/util.js`.
- Rarezas A-22, A-23, `-0` y `NaN`: siguen igual.
- Excepciones: al menos una comparada (`calcularFactura(null, null)`), no se ha eliminado la
  cobertura al quitar el prorrateo con `desde: null`.

**Comprobación de que la referencia heredada no se ha tocado**:

```bash
git diff --exit-code test/referencia/calculo-heredado.js
```

**Esperado**: sin salida y código de salida 0.

---

## 9. Golden master

```bash
TZ=Europe/Madrid node scripts/regenerar-golden-master.js
git diff -- test/golden/master.json
npm test
```

**Esperado en el `diff`**: solo los tres casos de prorrateo.

| Caso | Campo | Antes | Después |
|---|---|---|---|
| `prorrateo-marzo` | `prorrateoComercial` | `45.00` | `43.55` |
| `prorrateo-febrero` | `prorrateoComercial` | `45.00` | `48.21` |
| `febrero-bisiesto` | `prorrateoComercial` | `45.00` | `46.55` |
| Los tres | `descripcion` | «30 días frente a días reales» | «prorrateo único por días reales» |

`prorrateoDiasReales` no cambia. Cualquier otro cambio en el golden es un fallo y se revierte.

**Prohibido**: regenerar para hacer pasar un test sin decisión. La decisión es A-11/D-03 y debe
citarse en el commit (`test/golden/LEEME.md:22-33`).

---

## 10. Suite completa y perímetro

```bash
npm test
git diff --name-only
git diff --exit-code package.json package-lock.json
git diff --exit-code routes/contratos.js scripts/remesa_mensual.js services/calculo.js
```

**Esperado**:

- Suite completa en verde, sin tests saltados para evitar el cambio.
- `git diff --name-only` limitado a:

```text
motor/calculo.js
test/calculo.test.js
test/reglas-negocio.test.js
test/contradicciones.test.js
test/anomalias.test.js
test/equivalencia-motor.test.js
test/golden/flujo-central.js
test/golden/master.json
test/golden/LEEME.md
test/COBERTURA.md
specs/000-reconocimiento/registro-anomalias.md
specs/011-prorrateo-dias-reales/**
```

- `package.json`, `package-lock.json`, `routes/contratos.js`, `scripts/remesa_mensual.js` y
  `services/calculo.js` sin cambios (código de salida 0).

Cualquier otro fichero (`routes/`, `scripts/`, `services/`, `lib/util.js`, `db.js`, `config.js`,
`views/`, `public/`, `datos/`) es un fallo de perímetro.

---

## 11. No retroactividad

```bash
git diff --name-only | grep -E '^(datos/|db\.js$|.*\.sql$)' || true
git diff -- . ':!specs/011-prorrateo-dias-reales' ':!test' ':!motor' | grep -E '^\+.*(UPDATE|DELETE)' || true
```

**Esperado**: sin salida. El delta no incluye migraciones, ni `UPDATE`/`DELETE`, ni scripts de
recálculo. Las facturas históricas no se tocan.

---

## 12. Resumen de evidencias a registrar

| Comprobación | Comando | Evidencia |
|---|---|---|
| Línea base | `npm test` | 122/122, fecha y duración |
| Caso normativo | `node -e ... 60/16-30 julio` | `29.03` |
| Meses completos | script de §4 | 90,00 en 28/29/30/31 días |
| Paridad remesa | `node --test test/contradicciones.test.js` | 0 diferencias; fuente de la remesa intacta |
| Anillo C | `node --test test/equivalencia-motor.test.js` | 4 funciones con 0 diferencias; prorrateo excluido |
| Golden | `git diff -- test/golden/master.json` | solo 3 casos de prorrateo |
| Perímetro | `git diff --name-only` | lista de §10 |
| No retroactividad | `git diff` sin `datos/`, SQL, `UPDATE`/`DELETE` | 0 cambios históricos |

La evidencia va al cuerpo del commit y al registro de la spec, con fecha ISO y el resultado literal.
El commit incluye la línea:

```text
Decisión: A-11 — Paco y Puri, 2026-10-30
```

---

## 13. Qué hacer si algo falla

| Síntoma | Interpretación | Acción |
|---|---|---|
| El caso normativo da 30,00 | Se ha quedado la fórmula antigua o el tope | Revisar `motor/calculo.js:94-106`; no tocar el test. |
| Un mes completo no da la cuota | El denominador o el numerador están mal | Revisar `diasDelMes(desde)` y `d2 - d1 + 1`. |
| Falla un test `CONGELA comportamiento actual:` | Puede ser una regresión o un test antiguo no sustituido | Identificar si el test pertenece a la convención antigua; si sí, sustituirlo con la decisión citada. Si no, revertir el cambio. |
| El anillo C falla en prorrateo | La exclusión no se ha aplicado | Revisar `test/equivalencia-motor.test.js`; no actualizar la referencia heredada. |
| El anillo C falla en otra función | Regresión real | Corregir el motor; no tocar los casos ni la referencia. |
| El `diff` del golden incluye otros casos | Cambio colateral | Revertir la regeneración e investigar. |
| Aparece un fichero fuera de §10 | Se ha tocado otro módulo | Revertir ese cambio (Principio III). |
| Se ha ejecutado la remesa real | Riesgo de facturas emitidas | Detener, registrar el incidente y seguir el procedimiento de A-18; no volver a ejecutarla en pruebas. |
