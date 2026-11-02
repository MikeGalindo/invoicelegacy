# Golden master — flujo central de negocio

**Fichero:** `master.json`
**Generador:** `test/golden/flujo-central.js`
**Regenerador:** `scripts/regenerar-golden-master.js`
**Test que lo compara:** `test/golden-master.test.js`

## Qué es

`master.json` es la foto completa y estable de la salida del flujo central de negocio:
factura manual, descuento por volumen, recargo de equivalencia, redondeo por línea,
vencimiento, prorrateo por días reales y rectificación espejo. Contiene
12 casos fijos y, para cada uno, la entrada y la salida completa con importes a dos decimales.

El fichero está ordenado por claves para que el `diff` sea legible. No incluye fechas de
generación ni datos variables: debe poder regenerarse y dar exactamente el mismo contenido
mientras el comportamiento no cambie.

> **Nombre heredado:** el campo `prorrateoComercial` conserva su nombre para no cambiar el
> esquema del golden. Desde la spec 011 contiene la misma convención de días reales que
> `prorrateoDiasReales`; ambos campos deben coincidir en los tres casos con prorrateo.

## Cuándo DEBE regenerarse

**Solo** cuando exista una decisión de negocio documentada —con responsable y fecha— que cambie
el comportamiento esperado de alguno de los casos. No se regenera para:

- hacer pasar un test que ha fallado;
- reflejar un cambio técnico no aprobado;
- “arreglar” una diferencia que en realidad es una regresión;
- actualizar datos de ejemplo sin decisión de negocio.

Si un test falla, primero se investiga si el cambio es una regresión. La regla de oro es que el
valor esperado es el que producía el código anterior hasta que el negocio decida otra cosa.

## Cómo regenerarlo

Desde la raíz del repositorio, con la zona horaria de la oficina:

```bash
TZ=Europe/Madrid node scripts/regenerar-golden-master.js
```

Después:

```bash
npm test
git diff -- test/golden/master.json
```

El `diff` debe corresponder exactamente a la decisión de negocio documentada. Si aparecen cambios
en casos que no debían cambiar, no se acepta la regeneración.

## Casos incluidos

1. Factura manual simple sin recargo.
2. Factura manual con recargo de equivalencia.
3. Factura manual mixta con IVA 21/10 y recargo.
4. Descuento del 2 % justo por encima de 1.000 €.
5. Descuento del 5 % justo por encima de 5.000 €.
6. Frontera de 1.000,00 € sin descuento.
7. Frontera de 5.000,00 € con 2 %, no con 5 %.
8. Redondeo por línea con dos líneas de 0,03 €.
9. Prorrateo de marzo: convención única por días reales.
10. Prorrateo de febrero: convención única por días reales.
11. Febrero bisiesto de 2028, prorrateo por días reales y vencimiento a 30 días.
12. Rectificación espejo de la factura simple.

## Limitaciones

El golden master modela el flujo con las funciones puras de producción y con dos modelos de test
para las partes inline (prorrateo de la remesa y rectificación). No ejecuta rutas HTTP, la remesa
real ni la base de datos. Esas partes están fuera de la red y se detallan en `test/COBERTURA.md`.
