# Contradicción 06 — Traza del descuento por volumen: la factura manual lo anota y la remesa no

**Fecha:** 2026-10-30
**Estado:** registrada; no se corrige.
**Ámbito:** registro visible del descuento por volumen cuando se aplica en una factura.
**Evidencia:** `fichero:líneas`; ejecuciones con `node -e` sobre `services/calculo.js` (2026-10-30);
consulta de solo lectura a `datos/gesfact.db`.
**Documentos relacionados:** `flujo-factura.md:249-252,439-443,480-485` (punto 6.5 y H1);
`registro-riesgos.md:43` (R16); `reglas-de-negocio.md:122-163,330-339` (RN-07, RN-08, RN-09 y
RN-24); `memoria-historica.md:57-58,82` (MH07, MH08 y MH17).

> No se decide aquí si la remesa debe anotar el descuento. Se documenta que el mismo hecho de
> negocio (se ha aplicado un descuento por volumen) deja rastro en un camino y no en el otro, aunque
> el cálculo sea el mismo.

## 1. Implementaciones implicadas y camino que usa cada una

### A. Cálculo común del descuento

- **Función:** `calcularFactura` en `services/calculo.js:48-88`.
- **Umbrales:** `porcentajeDescuento(baseTotal)` (`services/calculo.js:39-43`): más de 5.000 € →
  5 %; más de 1.000 € → 2 %; en otro caso 0. La comparación es estricta (`>`), de modo que 1.000,00
  € justos no llevan descuento (RN-07; `db.js:138`).
- **Aplicación:** se calcula la base bruta (`:53-58`), se obtiene el porcentaje (`:60`) y se rebaja
  el precio línea a línea (`:65-71`); el resultado devuelve `descuentoPct` (`:50,61`) y las líneas
  ya con el precio descontado (`:72-80`).
- **Camino:** lo usan tanto el alta manual (`routes/facturas.js:66`) como la remesa
  (`scripts/remesa_mensual.js:55`). Los **importes** son, por tanto, los mismos en ambos caminos.

### B. Factura manual: nota en observaciones

- **Código:** `routes/facturas.js:74-76`. La observación se construye así:
  `(req.body.obs || '') + (calc.descuentoPct > 0 ? ' Descuento volumen ' + calc.descuentoPct + '% aplicado' : '')`.
- **Camino:** `POST /facturas/nueva`, alta manual desde la web.
- **Efecto:** si el descuento es 2 %, la factura guarda un texto con «Descuento volumen 2%
  aplicado» (con un espacio delante si no había observaciones previas).
- **Evidencia histórica:** la factura sembrada `FA-2026-000105` lleva exactamente
  «Descuento volumen 2% aplicado» (`db.js:149`).

### C. Remesa: observaciones fijas, sin mención del descuento

- **Código:** `scripts/remesa_mensual.js:61-62`. La observación es
  `'Remesa ' + nombreMes(mes)`, sin condición ni uso de `calc.descuentoPct`.
- **Camino:** `node scripts/remesa_mensual.js YYYY-MM`.
- **Efecto:** si una cuota o su prorrateo supera el umbral, `calcularFactura` aplica el descuento y
  graba el precio rebajado, pero la factura solo dice «Remesa <mes>».

### D. Rectificación: nota propia, sin arrastrar la del descuento

- **Código:** `routes/facturas.js:141-143`. La observación es
  `'Rectifica ' + f.numero + '. ' + (req.body.motivo || '')`.
- **Camino:** `POST /facturas/:id/rectificar`.
- **Efecto:** no copia la observación de la original ni menciona el descuento; copia los importes
  con signo invertido (`:142,150`). Si la original tenía descuento, la `RE` no lo dice.

### E. Aviso en pantalla

`views/factura_nueva.ejs:26` informa al operario: «(los descuentos por volumen se aplican solos)».
No hay un aviso equivalente en la remesa, que no tiene interfaz.

## 2. ¿Usan la misma convención o algoritmo? Comparación paso a paso

| Paso | A. Manual | B. Remesa | C. Rectificación |
|---|---|---|---|
| ¿Calcula el descuento? | Sí, vía `calcularFactura` | Sí, vía `calcularFactura` | No recalcula: copia los importes |
| ¿Aplica el descuento a las líneas? | Sí, precio rebajado | Sí, precio rebajado | Copia el importe ya rebajado, con signo negativo |
| ¿Conoce el porcentaje aplicado? | Sí, `calc.descuentoPct` | Sí, `calc.descuentoPct` | No lo necesita para copiar |
| ¿Lo escribe en observaciones? | Sí, texto `Descuento volumen X% aplicado` | **No**: texto fijo `Remesa <mes>` | **No**: texto `Rectifica <numero>. <motivo>` |
| ¿Lo guarda en un campo estructurado? | No | No | No |
| ¿Dónde se ve el descuento? | Observaciones y precio de línea | Solo el precio de línea (si se compara con la cuota) | Solo el precio de línea negativo |

El **cálculo** es único y compartido; la **traza** es distinta. La contradicción no está en el
importe, sino en la información que acompaña al importe. Para la gestoría, que revisa el desglose
línea a línea (MH08), el precio rebajado es visible; lo que falta es la explicación de por qué el
precio no coincide con la cuota del contrato.

## 3. Ejemplos concretos y cuantificación de la divergencia

### 3.1. Contrato de 1.200 € al 21 %, mes completo

```bash
node -e "
var calc=require('./services/calculo');
var r=calc.calcularFactura([{descripcion:'Cuota',cantidad:1,precio:1200,tipoIva:21}],{recargo_equivalencia:0});
console.log(JSON.stringify(r,null,1));
"
```

Resultado: base bruta 1.200,00 €, descuento 2 %, precio 1.176,00 €, base 1.176,00 €, IVA 246,96 €,
total **1.422,96 €**. Sin descuento serían 1.200,00 + 252,00 = **1.452,00 €**; el descuento rebaja
**29,04 €** (24,00 € de base y 5,04 € de IVA).

| Camino | Importe | Observaciones grabadas |
|---|---:|---|
| Manual | 1.422,96 € | ` Descuento volumen 2% aplicado` (o el texto previo + nota) |
| Remesa | 1.422,96 € | `Remesa <mes>` |
| Rectificación de la manual | −1.422,96 € | `Rectifica FA-... . <motivo>` (sin mención del 2 %) |

El importe coincide; la diferencia es que en la remesa no hay ninguna palabra que explique por qué
la línea vale 1.176,00 € y no 1.200,00 €. Un revisor que solo mire la factura de la remesa puede
pensar que la cuota del contrato es 1.176,00 €.

### 3.2. Cuota de 1.000 € justos

`porcentajeDescuento(1000)` devuelve 0 porque la comparación es `>` (`services/calculo.js:41`). La
factura queda en 1.000,00 + 210,00 = **1.210,00 €** y **no** lleva nota en ninguno de los dos
caminos. Este caso está documentado con la factura sembrada `FA-2026-000103`
(`db.js:138-143`; RN-07).

### 3.3. Datos de referencia actuales

Los contratos sembrados tienen cuotas de 90,00 €, 145,00 €, 60,00 € y 90,00 €
(`db.js:115-120`), todas por debajo de 1.000 €. Por eso **hoy ninguna factura de remesa activa el
descuento** y la falta de nota no se ha manifestado en los datos de referencia. La factura manual
`FA-2026-000105` sí lleva la nota porque su base declarada es 2.287,75 € (`db.js:149`), pero sus
líneas sembradas no cuadran con esa base (ver contradicción 07). `SUPOSICIÓN`: en producción puede
haber contratos o cuotas superiores; la base real no está en el repositorio.

## 4. Cuándo se manifiesta y cuándo coinciden

**Se manifiesta** cuando una factura de remesa supera el umbral de descuento:

- cuota mensual del contrato > 1.000 € (2 %) o > 5.000 € (5 %);
- o un prorrateo que, aunque la cuota sea menor, no puede superar la cuota; el umbral se mide sobre
  la base bruta de la línea, que en la remesa es el importe prorrateado (`scripts/remesa_mensual.js:53-55`);
- o una factura manual con descuento que luego se rectifica: la `RE` no arrastra la nota.

**Coinciden** en dos sentidos:

- el importe calculado es idéntico en manual y remesa, porque ambos llaman a `calcularFactura`;
- cuando no hay descuento (`descuentoPct = 0`), ninguno de los dos añade la nota y las observaciones
  solo difieren por el texto propio de cada camino (`obs` del usuario frente a `Remesa <mes>`).

Por eso nadie lo ha detectado: los contratos actuales están por debajo del umbral y el descuento
solo se ha visto en facturas manuales, que sí lo anotan. El riesgo aparece al crear un contrato
grande o al prorratear una cuota alta.

## 5. Historia probable

El descuento por volumen es una regla de 2018 acordada con Paco para fidelizar hostelería
(`services/calculo.js:36-38`; MH07). Puri pidió que se aplicara línea a línea para verlo desglosado
(`services/calculo.js:63-64`; MH08). La nota en observaciones parece añadida en el alta manual para
dejar constancia no estructurada del descuento; la factura sembrada `FA-2026-000105` la conserva
(`db.js:149`; RN-24).

La remesa es de 2021, de Roberto (`scripts/remesa_mensual.js:5-7`; MH17). Reutilizó
`calcularFactura`, pero escribió sus propias observaciones fijas (`scripts/remesa_mensual.js:62`) y
no copió la lógica de la nota, porque esa lógica estaba dentro de la ruta manual y no en una función
compartida. La rectificación, posterior, también escribió su propio texto
(`routes/facturas.js:143`). No hay una función común que construya las observaciones de una factura.

La contradicción ya está registrada como H1 en `flujo-factura.md:480-485` y como R16 en
`registro-riesgos.md:43`. `SUPOSICIÓN`: el autor de la remesa no consideró que una cuota de contrato
pudiera superar 1.000 €, o no vio la nota como parte del contrato de la función.

## 6. Preguntas para el negocio (no se responde aquí)

1. ¿Debe aplicarse el descuento por volumen a una cuota mensual de contrato, o solo a facturas
   manuales?
2. Si se aplica, ¿debe quedar anotado en observaciones como en el camino manual?
3. ¿Basta con que el precio de línea esté rebajado, o la gestoría necesita la explicación escrita?
4. ¿Debe una rectificativa arrastrar la nota de descuento de la factura original?
5. ¿Debe guardarse el descuento en un campo propio en vez de en texto libre?
