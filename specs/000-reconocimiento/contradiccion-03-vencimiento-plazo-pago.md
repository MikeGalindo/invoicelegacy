# Contradicción 03 — Días de vencimiento por defecto: `config.VENCIMIENTO_DIAS` frente a `30` literal

**Fecha:** 2026-10-30
**Estado:** registrada; no se corrige.
**Ámbito:** cálculo del vencimiento de una factura cuando el cliente no tiene `dias_pago`.
**Evidencia:** `fichero:líneas`; ejecuciones con `node -e` bajo `TZ=Europe/Madrid` (2026-10-30).
**Documentos relacionados:** `flujo-factura.md:430-433` (punto 6.3) y `:513-522` (preguntas);
`mapa-sistema.md:479-481` (zona oscura 18); `reglas-de-negocio.md:193-205,481-491`
(RN-12 y RN-37); `memoria-historica.md:82` (MH17).

> No se decide aquí si el plazo por defecto debe ser configurable o fijo. Se documenta que hoy
> existen dos fuentes para el mismo valor y que solo coinciden porque ambas valen 30.

## 1. Implementaciones implicadas y camino que usa cada una

### A. Factura manual: configuración global

- **Código:** `routes/facturas.js:68-69`:
  `var dias = cliente.dias_pago || config.VENCIMIENTO_DIAS;`
  `var vencimiento = util.sumarDias(fecha, dias);`
- **Fuente del valor:** `config.VENCIMIENTO_DIAS` en `config.js:39-40`, con el comentario «dias de
  vencimiento por defecto si el cliente no tiene forma de pago». Hoy vale **30**.
- **Camino:** `POST /facturas/nueva` (`routes/facturas.js:42-102`), alta manual desde la web.

### B. Remesa mensual: literal `30`

- **Código:** `scripts/remesa_mensual.js:60`:
  `var venc = util.sumarDias(fecha, co.dias_pago || 30);`
- **Fuente del valor:** el número **30** escrito en el propio script. No lee `config` ni
  `config.VENCIMIENTO_DIAS`.
- **Camino:** `node scripts/remesa_mensual.js YYYY-MM` (`scripts/remesa_mensual.js:14-18`), emisión
  automática de las cuotas de contrato.

### C. Dato de entrada común: `clientes.dias_pago`

Ambos caminos usan el mismo dato del cliente:

- esquema: `dias_pago INTEGER` con comentario «NULL -> el de config» (`db.js:28`);
- alta de cliente: `req.body.dias_pago ? parseInt(req.body.dias_pago, 10) : null`
  (`routes/clientes.js:24-25`), de modo que el formulario guarda `NULL` si se deja vacío;
- la remesa lo obtiene por `JOIN` desde `clientes` (`scripts/remesa_mensual.js:26-29`), no desde
  `contratos` (la tabla `contratos` no tiene columna `dias_pago`, `db.js:41-48`).

### D. La función de suma de días es la misma

Los dos caminos llaman a `util.sumarDias(fecha, dias)` (`lib/util.js:20-26`). La divergencia no está
en la suma, sino en **qué número se le pasa**.

## 2. ¿Usan la misma convención o algoritmo? Comparación paso a paso

| Paso | A. Factura manual | B. Remesa |
|---|---|---|
| ¿Toma `dias_pago` del cliente? | Sí: `cliente.dias_pago` (`routes/facturas.js:68`) | Sí: `co.dias_pago` del `JOIN` (`scripts/remesa_mensual.js:26-28,60`) |
| Si `dias_pago` es un número > 0 | Lo usa | Lo usa |
| Si `dias_pago` es `NULL` | Usa `config.VENCIMIENTO_DIAS` (`routes/facturas.js:68`) | Usa `30` literal (`scripts/remesa_mensual.js:60`) |
| Si `dias_pago` es `0` | `0` es falso en JavaScript → usa `config.VENCIMIENTO_DIAS` | `0` es falso → usa `30` |
| Función de suma | `util.sumarDias` (`lib/util.js:20-26`) | `util.sumarDias` (`lib/util.js:20-26`) |
| Resultado hoy, con `VENCIMIENTO_DIAS = 30` | Coincide | Coincide |

La convención es la misma **solo mientras `config.VENCIMIENTO_DIAS` valga 30**. En cuanto la
configuración cambie, el mismo cliente sin plazo de pago tendrá dos vencimientos distintos según la
factura se emita a mano o por remesa. Además, `config.js` se copia a mano al servidor de la oficina
(`config.js:2-3`), por lo que dos copias del fichero podrían tener valores distintos y la remesa
seguiría usando 30 en ambos casos.

## 3. Ejemplos concretos y cuantificación de la divergencia

Con el valor actual (`VENCIMIENTO_DIAS = 30`) no hay divergencia. Para mostrar el efecto latente se
supone un cambio de configuración, sin tocar el código:

| Escenario | Factura manual (config) | Remesa (literal 30) | Diferencia |
|---|---|---|---|
| `VENCIMIENTO_DIAS = 15`, factura de 2026-03-05 | `2026-03-20` | `2026-04-04` | **15 días** |
| `VENCIMIENTO_DIAS = 15`, remesa de 2026-02 (fecha 2026-02-28) | `2026-03-15` si se emitiera a mano | `2026-03-30` | **15 días** |
| `VENCIMIENTO_DIAS = 60`, factura de 2026-03-05 | `2026-05-04` | `2026-04-04` | **30 días** |
| `VENCIMIENTO_DIAS = 60`, remesa de 2026-02 (fecha 2026-02-28) | `2026-04-29` si se emitiera a mano | `2026-03-30` | **30 días** |
| Valor actual 30 | Coincide | Coincide | 0 |

Comprobación reproducible (2026-10-30):

```bash
TZ=Europe/Madrid node -e "
var util=require('./lib/util');
console.log(util.sumarDias('2026-03-05',15)); // 2026-03-20
console.log(util.sumarDias('2026-03-05',30)); // 2026-04-04
console.log(util.sumarDias('2026-02-28',15)); // 2026-03-15
console.log(util.sumarDias('2026-02-28',30)); // 2026-03-30
"
```

El impacto no es un céntimo: son **días enteros de plazo de cobro**. Una factura de la remesa con
vencimiento a 30 días y otra manual con vencimiento a 15 para el mismo cliente y fecha pueden
parecer del mismo lote y no vencer el mismo día. En el CSV para la gestoría el vencimiento no se
exporta (`routes/informes.js:36-38`), pero sí se imprime en la factura
(`views/factura_detalle.ejs:12`) y condiciona el cobro.

## 4. Cuándo se manifiesta y cuándo coinciden

**Se manifiesta** solo si se cumplen las dos condiciones:

1. el cliente no tiene `dias_pago` o lo tiene a `0` (el alta guarda `0` si se teclea `'0'`, porque
   la cadena es verdadera en JavaScript; `routes/clientes.js:25`), y ambos caminos lo tratan como
   «sin plazo» por el `||`;
2. `config.VENCIMIENTO_DIAS` deja de valer 30, o la copia de `config.js` que usa la web no es la
   misma que se documentó para la remesa.

**Coinciden** en el estado actual porque `config.VENCIMIENTO_DIAS` es exactamente 30
(`config.js:40`) y la remesa escribe 30. También coinciden, con cualquier configuración, cuando el
cliente **sí** tiene `dias_pago` (por ejemplo, 60 días en el restaurante y el hotel sembrados,
`db.js:98,100`): en ese caso ambos usan el mismo número y la configuración no interviene.

Por eso nadie lo ha detectado: el valor por defecto nunca se ha cambiado desde que se escribió el
script, y los clientes con plazo explícito no pasan por la rama divergente. El riesgo es de cambio
futuro, no de operación actual.

## 5. Historia probable

La configuración nació con el comentario que la define como plazo «por defecto si el cliente no
tiene forma de pago» (`config.js:39`), y la factura manual la usa desde el principio
(`routes/facturas.js:68`). La remesa es de 2021, la añadió Roberto para no meter cuotas a mano
(`scripts/remesa_mensual.js:5-7`; `server.js:4`; MH17). En un script de línea de comandos es habitual
escribir el 30 directamente; el propio script ya usa otros literales de negocio, como el sufijo del
mes (`scripts/remesa_mensual.js:53`) y el nombre del mes (`:80-84`). No hay comentario que explique
por qué no se reutilizó `config.VENCIMIENTO_DIAS`.

La coincidencia actual (30 = 30) hizo que la duplicación no se viera al probar. La documentación de
reconocimiento ya la recoge como punto 6.3 del flujo y como zona oscura 18, y la regla de negocio
RN-37 la describe como «dudosa» (`flujo-factura.md:430-433`; `mapa-sistema.md:479-481`;
`reglas-de-negocio.md:481-491`). `SUPOSICIÓN`: el autor de la remesa asumió que 30 era el valor
universal y no vio necesario consultar la configuración.

## 6. Preguntas para el negocio (no se responde aquí)

1. ¿El plazo por defecto debe ser un parámetro único de la aplicación
   (`config.VENCIMIENTO_DIAS`) o puede ser distinto para la factura manual y la remesa?
2. Si se cambia el plazo por defecto, ¿debe afectar a la remesa, o esta debe seguir a 30 días por
   decisión de negocio?
3. ¿Un cliente con `dias_pago = 0` debe vencer el mismo día (0 días) o aplicar el plazo por
   defecto? Hoy el alta puede guardar `0` y ambos caminos lo tratan como «sin plazo» por el `||`
   (`routes/clientes.js:25`; RN-12).
4. ¿Quién cambia `config.js` y cómo se garantiza que la copia del servidor y la de la remesa son la
   misma (`config.js:2-3`; MH23)?
