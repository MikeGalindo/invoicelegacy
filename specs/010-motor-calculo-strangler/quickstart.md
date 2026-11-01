# Guía de validación (quickstart)

**Feature**: `010-motor-calculo-strangler`
**Fecha**: 2026-11-01
**Objetivo**: demostrar, con comandos reproducibles, que el motor nuevo es equivalente al heredado en
los tres anillos y que la conmutación no toca nada fuera de la costura.

> Esta guía no contiene la implementación. Los detalles de forma de dato están en
> [data-model.md](./data-model.md) y los de interfaz en
> [contracts/api-motor.md](./contracts/api-motor.md).

---

## 1. Requisitos previos

- Ejecutar **desde la raíz del repositorio** (`config.RUTA_BD` es relativa; `AGENTS.md`).
- Node.js 24.x (verificado con **v24.19.0**).
- Zona horaria `Europe/Madrid` en todo lo que use fechas. `npm test` ya la fija
  (`package.json:8`); en los comandos con `node --test` directo hay que ponerla a mano.
- **No** hace falta `node_modules` para la suite: los tests solo cargan `config.js`, `lib/util.js`,
  `services/calculo.js` y módulos `node:*`. `npm install` solo es necesario para arrancar la
  aplicación.

> **Advertencia**: ninguno de estos comandos abre la base de datos, emite facturas ni ejecuta
> `scripts/remesa_mensual.js`.

---

## 2. Paso 0 — Línea base (antes de tocar nada)

```bash
npm test
```

**Esperado**: `tests 116`, `pass 116`, `fail 0`, `skipped 0`. Duración aproximada: 150 ms.

Si esta línea base no está verde, **se detiene la obra**: no se moderniza encima de un rojo previo
(`constitution.md:213-214`).

---

## 3. Anillo (c) — equivalencia comparativa

El anillo que autoriza la conmutación. Ejecuta las dos implementaciones sobre los mismos 100 casos
generados con semilla fija y compara campo a campo.

```bash
TZ=Europe/Madrid node --test test/equivalencia-motor.test.js
```

**Esperado**:

- 100 casos comparados, **0 diferencias**.
- Contrato de API: 5 exports, aridades `1, 4, 1, 2, 3`.
- Pureza: el motor solo carga `lib/util.js`.
- Rarezas: A-22 (`'21'` → recargo 0), A-23 (`-0.005` → `-0`) y `NaN` reproducidos.
- Repetibilidad: dos generaciones con la misma semilla dan los mismos casos.

**Si falla**: el mensaje indica el `id` del caso y la ruta del campo, por ejemplo
`caso 37, $.lineas[1].cuotaIva: heredado 2.1, nuevo 2.11`. Se corrige **el motor nuevo**. Nunca se
tocan los 100 casos para que pasen, y nunca se toca la referencia heredada.

---

## 4. Anillo (a) — la suite completa contra `motor/`

Ejecuta los 116 tests existentes haciendo que `services/calculo.js` resuelva al motor nuevo, **sin
editar ningún test**. Funciona porque `--require` se propaga a los procesos hijos de `node --test`
(verificado en Node 24.19.0; ver `research.md` R-01).

```bash
TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/*.test.js
```

**Esperado**: los **116 tests preexistentes** en verde (el total sube porque también se ejecuta el
test comparativo nuevo), `fail 0`, `skipped 0`.

**Comprobación de que la inyección es real**: si se temporalmente rompe a propósito una fórmula del
motor (por ejemplo, `> 5000` por `>= 5000`), este comando debe ponerse en rojo. Si sigue verde, la
inyección no está funcionando y la evidencia no vale.

---

## 5. Anillo (b) — golden master sin regenerar

```bash
TZ=Europe/Madrid node --require ./test/helpers/motor-como-fachada.js --test test/golden-master.test.js
git diff --exit-code test/golden/master.json
```

**Esperado**: los 2 tests del golden en verde (12 casos comparados campo a campo) y `git diff` sin
salida y con código de salida 0.

**Prohibido**: ejecutar `node scripts/regenerar-golden-master.js`. Solo se regenera con una decisión
de negocio documentada (`test/golden/LEEME.md:22-33`).

---

## 6. Conmutación de la fachada

`services/calculo.js` queda así (una línea, sin lógica):

```js
module.exports = require('../motor/calculo');
```

Nada más cambia: ni la ruta, ni los nombres, ni los consumidores.

---

## 7. Anillos (a) y (b) con la fachada ya conmutada

```bash
npm test
git diff --exit-code test/golden/master.json
```

**Esperado**: los 116 tests preexistentes siguen en verde, el golden sigue coincidiendo y el fichero
del golden no cambia. Es la prueba de que la conmutación es invisible para la aplicación.

Comprobación adicional de que la fachada es la que se usa de verdad:

```bash
TZ=Europe/Madrid node -e "console.log(require('./services/calculo') === require('./motor/calculo'))"
```

**Esperado**: `true`. Si da `false`, la fachada está copiando o envolviendo en lugar de reexportar;
no es un fallo funcional, pero se aparta del contrato de `contracts/api-motor.md` §7.

---

## 8. Perímetro del cambio

```bash
git diff --name-only
git status --short
git diff --exit-code package.json package-lock.json
```

**Esperado**: solo aparecen ficheros de esta lista:

```text
motor/calculo.js
services/calculo.js
test/equivalencia-motor.test.js
test/referencia/calculo-heredado.js
test/helpers/casos-equivalencia.js
test/helpers/motor-como-fachada.js
test/COBERTURA.md
specs/010-motor-calculo-strangler/**
```

Cualquier otro fichero (`routes/`, `scripts/`, `views/`, `public/`, `db.js`, `config.js`,
`lib/util.js`, `package*.json`) es un fallo de perímetro y detiene el cierre.

---

## 9. Resumen de evidencias a registrar (FR-017)

| Anillo | Comando | Evidencia a anotar |
|---|---|---|
| Línea base | `npm test` | 116/116, fecha, duración |
| (c) | `node --test test/equivalencia-motor.test.js` | 100 casos, 0 diferencias, semilla `20261101` |
| (a) | `node --require … --test test/*.test.js` | 116 preexistentes verdes, 0 saltados |
| (b) | `node --require … --test test/golden-master.test.js` | 12/12 casos, `git diff` vacío |
| Conmutado | `npm test` | 116/116 y golden intacto |
| Perímetro | `git diff --name-only` | Lista exacta de §8 |

La evidencia va al cuerpo del commit y al registro de la spec, con fecha ISO y el resultado literal.

---

## 10. Qué hacer si algo falla

| Síntoma | Interpretación | Acción |
|---|---|---|
| Falla un test `CONGELA comportamiento actual:` | El motor nuevo se desvía | Corregir el motor. **No** tocar el test (`constitution.md:78-79`). |
| Difiere el golden master | Cambió un importe, una fecha o una línea | Investigar; **no** regenerar. |
| Falla el contrato de 5 exports o las aridades | La API cambió | Corregir `motor/`; la fachada debe seguir exponiendo exactamente lo mismo. |
| El anillo (a) sigue verde tras romper el motor a propósito | La inyección no está surtiendo efecto | Revisar `test/helpers/motor-como-fachada.js` y la propagación de `--require`. |
| Aparece un fichero fuera de §8 en `git diff` | Se ha tocado otro módulo | Revertir ese cambio antes de continuar (Principio III). |
