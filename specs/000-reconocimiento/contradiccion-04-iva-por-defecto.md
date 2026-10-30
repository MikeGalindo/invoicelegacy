# Contradicción 04 — Tipo de IVA por defecto y tipos admitidos: configuración, literal y ausencia de valor

**Fecha:** 2026-10-30
**Estado:** registrada; no se corrige.
**Ámbito:** valor de `tipo_iva` cuando no se envía, y conjunto de tipos de IVA que el sistema
acepta en cada camino.
**Evidencia:** `fichero:líneas`; ejecuciones con `node -e` sobre `services/calculo.js` (2026-10-30).
**Documentos relacionados:** `reglas-de-negocio.md:88-108` (RN-05) y `:122-138` (RN-07);
`flujo-factura.md:93-95,444-449` (coerción de la factura manual y objeto cliente);
`registro-riesgos.md` no contiene una fila específica para este punto.

> No se decide aquí cuál debe ser el IVA por defecto ni qué tipos deben admitirse. Se documenta que
> el mismo concepto («si no viene tipo de IVA, ¿qué se graba?») tiene respuestas distintas según el
> maestro y el camino.

## 1. Implementaciones implicadas y camino que usa cada una

### A. Artículos: `config.IVA_DEFECTO`

- **Código:** `routes/articulos.js:15-19`.
- **Regla:** `var iva = req.body.tipo_iva ? parseInt(req.body.tipo_iva, 10) : config.IVA_DEFECTO;`
  (`routes/articulos.js:16`).
- **Fuente:** `config.js:24-25`, comentario «IVA por defecto para articulos nuevos»; hoy **21**.
- **Camino:** `POST /articulos/nuevo`, alta de artículo desde la pantalla de maestros.
- **Formulario:** `views/articulos.ejs:18` ofrece solo `21`, `10` y `4`; el campo tiene un valor
  preseleccionado, por lo que en el uso normal siempre llega un tipo explícito.

### B. Contratos: literal `21`

- **Código:** `routes/contratos.js:16-21`.
- **Regla:** `parseInt(req.body.tipo_iva || 21, 10)` (`routes/contratos.js:20`).
- **Fuente:** el número **21** escrito en la ruta. No lee `config.IVA_DEFECTO`.
- **Esquema:** además, `contratos.tipo_iva INTEGER NOT NULL DEFAULT 21` (`db.js:46`).
- **Camino:** `POST /contratos/nuevo` (`routes/contratos.js:16-26`). La vista `views/contratos.ejs`
  solo lista y da de baja; no contiene formulario de alta, por lo que este camino se usa por
  `POST` directo, por datos sembrados o por una pantalla que no está en el repositorio.
  `SUPOSICIÓN`: se desconoce cómo se dan de alta los contratos en la operación real.

### C. Líneas de factura manual: sin valor por defecto

- **Código:** `routes/facturas.js:55-63`.
- **Regla:** `tipoIva: parseInt(ivas[i], 10)` (`routes/facturas.js:61`). Si el campo llega vacío,
  `parseInt('', 10)` es `NaN`; no se sustituye por 21 ni por `config.IVA_DEFECTO`.
- **Esquema:** `lineas.tipo_iva INTEGER NOT NULL` sin `DEFAULT` (`db.js:71`).
- **Formulario:** `views/factura_nueva.ejs:18` ofrece solo `21`, `10` y `4`, con `21`
  preseleccionado; en uso normal siempre llega un valor.

### D. Tabla de recargos: siete tipos, incluidos los históricos

- **Código:** `services/calculo.js:12-23` (`recargoPara`).
- **Tipos reconocidos:** 21, 10, 4, 18, 16, 8 y 7; cualquier otro devuelve recargo 0 (`:22`).
- **Comentario:** los tipos 16/18 y 7/8 se conservan «por si hay que reabrir ejercicios viejos del
  Access» (`services/calculo.js:16-17`; `reglas-de-negocio.md:88-108`, RN-05).
- **Formularios:** solo ofrecen 21, 10 y 4 (`views/articulos.ejs:18`,
  `views/factura_nueva.ejs:18`). No hay validación en servidor del conjunto de tipos.

### E. Remesa: el tipo viene del contrato

- **Código:** `scripts/remesa_mensual.js:53-55`.
- **Regla:** `tipoIva: co.tipo_iva`, leído del contrato por el `JOIN`
  (`scripts/remesa_mensual.js:26-29`). No hay valor por defecto en el script; si el contrato tuviera
  un tipo ausente o inválido, se propaga tal cual.

## 2. ¿Usan la misma convención o algoritmo? Comparación paso a paso

| Caso | Artículos | Contratos | Línea de factura manual | Remesa |
|---|---|---|---|---|
| Campo ausente/vacío | `config.IVA_DEFECTO` (21 hoy) | `21` literal | `NaN` | No aplica: usa `co.tipo_iva` |
| Campo `'0'` | `parseInt('0') = 0` | `parseInt('0') = 0` (la cadena `'0'` es verdadera) | `parseInt('0') = 0` | `co.tipo_iva = 0` |
| Validación del valor | Ninguna; `parseInt` | Ninguna; `parseInt` | Ninguna; `parseInt` | Ninguna |
| Tipos que ofrece la UI | 21, 10, 4 | Sin formulario en el repo | 21, 10, 4 | Los del contrato |
| Tipos que calcula el motor | 21, 10, 4, 18, 16, 8, 7 (recargo) | Igual | Igual | Igual |
| Esquema | `NOT NULL`, sin `DEFAULT` (`db.js:36`) | `NOT NULL DEFAULT 21` (`db.js:46`) | `NOT NULL`, sin `DEFAULT` (`db.js:71`) | Depende del contrato |

Hay tres convenciones distintas para el mismo hueco: **configuración** (artículos), **literal 21**
(contratos) y **ningún valor** (líneas manuales). Además, el conjunto de tipos que la interfaz
ofrece (tres) no coincide con el que el motor de cálculo reconoce (siete): los tipos históricos
solo pueden llegar por datos antiguos o por un `POST` directo.

## 3. Ejemplos concretos y cuantificación de la divergencia

### 3.1. Hoy, con `IVA_DEFECTO = 21`

Los tres valores por defecto coinciden en 21, salvo la línea manual vacía, que produce `NaN`. Por
eso el uso normal no muestra la contradicción: los formularios siempre envían un tipo explícito.

### 3.2. Si se cambia `IVA_DEFECTO` (escenario, sin tocar código)

| Escenario | Artículo sin tipo | Contrato sin tipo | Línea manual vacía |
|---|---|---|---|
| `IVA_DEFECTO = 21` (actual) | 21 % | 21 % | `NaN` → probable error de grabación |
| `IVA_DEFECTO = 10` | **10 %** | **21 %** | `NaN` |
| `IVA_DEFECTO = 0` (exento) | **0 %** | **21 %** | `NaN` |

La diferencia es de **11 puntos porcentuales** entre artículo y contrato en el escenario del 10 %, y
de **21 puntos** en el escenario del 0 %. En una cuota de 1.000 €, 11 puntos de IVA son **110,00 €**
de cuota; 21 puntos son **210,00 €**. No es un redondeo.

### 3.3. Línea manual con IVA vacío

```bash
node -e "console.log(parseInt('',10));"        // NaN
node -e "console.log(parseInt(undefined,10));" // NaN
```

Ese `NaN` llega a `calcularFactura` (`routes/facturas.js:66`). El motor calcula
`cuotaIva = util.redondear2(base * NaN / 100)`, es decir `NaN`; el total de la factura también
queda `NaN` (`services/calculo.js:81-86`). La cabecera se intenta insertar con `iva` y `total` a
`NaN` en columnas `NOT NULL` (`db.js:57-60`), y SQLite rechaza el `INSERT` con
`SQLITE_CONSTRAINT: NOT NULL constraint failed`. El número de factura ya se había reservado
(`routes/facturas.js:71`), así que se pierde un número aunque no quede cabecera. Comprobado el
2026-10-30 con una base SQLite en memoria: insertar `NaN` o `NULL` en una columna `REAL NOT NULL`
produce ese error y no deja fila. No se ha ejecutado contra la base real.

### 3.4. Tipo histórico por `POST` directo

`recargoPara(16)` devuelve 4 (`services/calculo.js:19`) y `calcularLinea` calcula IVA al 16 %
(`:28`). La interfaz no ofrece 16, pero un `POST` directo con `iva=16` lo acepta porque no hay
validación. No hay evidencia de que esto ocurra en producción; se registra como comportamiento
alcanzable.

## 4. Cuándo se manifiesta y cuándo coinciden

**Se manifiesta** cuando:

- se crea un artículo o un contrato sin `tipo_iva` y `config.IVA_DEFECTO` no es 21;
- se envía una línea de factura con `iva` vacío o no numérico (por un `POST` directo, un formulario
  manipulado o un cambio de plantilla);
- se intenta usar un tipo que la interfaz no ofrece (0, 5, 16, 18…) por `POST` directo;
- se compara el tipo de IVA de un contrato antiguo con el que ofrecería la pantalla actual.

**Coinciden** en el uso normal porque:

- los formularios de artículos y facturas llevan un `<select>` con 21/10/4 y un valor
  preseleccionado; el navegador siempre envía uno de esos tres;
- los datos sembrados tienen todos `tipo_iva` explícito (`db.js:104-120`);
- `config.IVA_DEFECTO` vale 21 y el literal de contratos también es 21;
- el alta de contratos no tiene formulario en el repositorio, así que la rama del literal 21 casi no
  se ejerce desde la interfaz.

La contradicción es, por tanto, **latente en la operación actual** y **real en cuanto se cambie la
configuración o se llame a la ruta sin el campo**. La falta de tests (R20) y la ausencia de
validación de tipos permiten que el cambio pase inadvertido.

## 5. Historia probable

La configuración se creó para los artículos: el comentario de `config.js:24` dice literalmente «IVA
por defecto para articulos nuevos», no «para toda la aplicación». La ruta de artículos la usa
(`routes/articulos.js:16`) y el esquema de artículos no tiene `DEFAULT` (`db.js:36`).

La ruta de contratos y su esquema, en cambio, fijan 21 por su cuenta (`routes/contratos.js:20`;
`db.js:46`). Es habitual que un contrato de alquiler o mantenimiento sea al 21 %, y el autor pudo
considerarlo una constante del negocio; no hay comentario que lo justifique. La remesa, de 2021, no
introduce un valor por defecto: arrastra el del contrato (`scripts/remesa_mensual.js:54`), lo que es
coherente con que el contrato ya lo tenga grabado.

La tabla de recargos conserva los tipos del Access (`services/calculo.js:16-17`), mientras que los
formularios se quedaron con los tipos vigentes. Esa separación es intencionada para los ejercicios
antiguos (RN-05), pero deja abierta la puerta a que un tipo histórico entre por una ruta nueva sin
que la interfaz lo muestre. `SUPOSICIÓN`: los formularios se actualizaron cuando cambiaron los tipos
(2010-2012) y la tabla de recargos se conservó por mandato del comentario; nadie unificó ambos
conjuntos porque los tipos antiguos solo debían aparecer en facturas históricas.

## 6. Preguntas para el negocio (no se responde aquí)

1. ¿El IVA por defecto debe ser único para artículos, contratos y líneas de factura, o puede
   depender del tipo de maestro?
2. Si se cambia `IVA_DEFECTO`, ¿debe cambiar también el valor por defecto de los contratos?
3. ¿Qué debe hacer el alta de factura si una línea llega sin IVA: rechazarla, usar el IVA por
   defecto o usar el del artículo?
4. ¿Debe el servidor aceptar cualquier entero como `tipo_iva`, o solo el conjunto que ofrece la
   interfaz más los tipos históricos documentados?
5. ¿Cómo se dan de alta los contratos en la operación real, si la vista no tiene formulario?
