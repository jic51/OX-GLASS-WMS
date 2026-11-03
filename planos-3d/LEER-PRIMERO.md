# Planos 3D — rescatado de una rama, **sin terminar de enchufar**

Esto vivía en la rama `claude/ox-glass-warehouse-3d-plans-rnj3gs`, parada desde
el **22/09/2026**, y se trajo aquí el 3/11 por un motivo concreto:

> **Una rama que nadie va a fusionar nunca es la peor forma de guardar algo.**
> Es como se pierde. Jose pidió borrar las ramas sueltas y ésta no lo era:
> tiene trece archivos que no existen en ningún otro sitio.

## Qué es

Un generador de planos 3D de la bodega. Un solo motor, dos destinos:

```
tools/plan3d-engine.js        ← toda la lógica
        │  node tools/build.js  (lo inyecta en los dos destinos)
        ├──→ dist/OX_PLANO_CAPTURA.html   app de campo, offline, para el teléfono
        └──→ Index_v3_fixed.html          pestaña "📐 Plano 3D" del WMS
```

Más `docs/PROTOCOLO_MEDICION.md`, que es cómo se mide una bodega de verdad para
alimentarlo, y `layout/ejemplo-bodega.*` con un ejemplo entero que sale en PDF,
PNG y SVG (en `dist/`).

## ⚠️ Lo que NO está, y hay que saberlo antes de tocarlo

**La pestaña «📐 Plano 3D» no está en la app de hoy.** Se escribió contra la app
de septiembre (sobre la v12.x), nunca se fusionó, y desde entonces el
`Index_v3_fixed.html` ha cambiado treinta versiones. Lo mismo con la hoja
`WAREHOUSE_LAYOUT` que `Code_v3_fixed.gs` tendría que leer y guardar: **no
existe en la v13.6**.

Y `tools/build.js` apunta a rutas de la raíz del repositorio (`Index_v3_fixed.html`),
que desde esta carpeta **ya no son esas**. O sea: **el motor y el ejemplo están
enteros; el enchufe a la app, no.**

Esto se escribe aquí y no se "arregla" de paso a propósito. Enchufarlo es una
decisión con coste —una pestaña nueva en la app, una hoja nueva en el Sheet de
cada cliente— y esa decisión es de Jose, no un efecto secundario de rescatar
unos archivos.

## Si algún día se retoma, por dónde empezar

1. Correr `node tools/make-plan.js` con el ejemplo y ver si todavía produce el
   PDF. Eso dice si el motor sobrevivió solo, que es lo que vale.
2. Decidir si la pestaña va en la app o si se queda como **app de campo aparte**
   (`dist/OX_PLANO_CAPTURA.html`, que funciona sin conexión y sin tocar Acopio).
   La segunda es mucho más barata y puede que sea suficiente.
3. Sólo si va dentro: rehacer la inyección contra el `Index_v3_fixed.html` de
   hoy, y añadir `WAREHOUSE_LAYOUT` al estándar de la plantilla.

**Nada de esto corre en la suite de pruebas de Acopio.** `tools/test-engine.js`
de aquí dentro es suyo y se ejecuta a mano.
