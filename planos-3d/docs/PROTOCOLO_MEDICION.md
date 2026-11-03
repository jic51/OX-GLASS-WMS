# Cómo levantar el plano de la bodega con un teléfono Android

Objetivo: pasar de “no tengo nada” a un plano a escala, confiable, en **una tarde**,
y que ese plano quede vivo dentro del WMS.

La idea central, y la única que importa de verdad:

> **No necesitas escanear la bodega en 3D para optimizar el espacio.
> Necesitas ~10 medidas correctas y saber qué guardas.**

Un escaneo 3D se ve espectacular y sirve para enseñar, pero arrastra 2–5 % de error.
En una nave de 100 ft eso son **2 a 5 pies** de error: suficiente para que un rack
de 12 ft “quepa” en el dibujo y no quepa en el piso. La cinta métrica tiene 0.1 %.
Por eso el método es: **cinta para las medidas, teléfono para todo lo demás.**

---

## 0 · Lo que necesitas

| Cosa | Para qué | Costo |
|---|---|---|
| Cinta métrica de 100 ft (fiberglass) | Perímetro y diagonales | ~$20 |
| Cinta azul de pintor + marcador | Marcar esquinas y puntos de referencia | ~$6 |
| El teléfono | Fotos, notas, y la app de captura | ya lo tienes |
| *Opcional pero cambia todo:* medidor láser (Bosch GLM 20 / similar) | Alturas y tramos largos, solo | ~$30 |

Sin el láser también se puede: abajo está cómo medir la altura libre sin escalera.

---

## 1 · Los 10 números que de verdad necesitas (30–45 min)

Captúralos directo en la app: abre **`OX_PLANO_CAPTURA.html`** en Chrome del
teléfono (funciona sin señal; agrégala a la pantalla de inicio).

1. **Ancho** de la pared frontal (la del portón), pegado al piso, no a media altura.
2. **Fondo** de la nave.
3. **Diagonal A**: esquina fondo-izquierda → esquina frente-derecha.
4. **Diagonal B**: esquina fondo-derecha → esquina frente-izquierda.
5. **Altura libre**: del piso a **la parte más baja de la estructura** (la viga, el
   tirante, la luminaria, el ducto). No a la cumbrera: lo que manda es lo más bajo.
6. **Cada puerta**: distancia desde la esquina izquierda de esa pared, ancho y alto.
7. **Cada columna**: posición X (desde la pared izquierda), Y (desde el fondo) y
   su sección (una columna de acero típica es 6"×6" u 8"×8").
8. **Oficina, baño, compresor, mesa de corte**: rectángulo y posición.
9. **Cualquier estorbo alto**: tablero eléctrico, calentador colgado, ducto que baja.
10. **Racks que ya tienes**: largo, fondo, alto y cuántos.

### Por qué las diagonales no son opcionales

Cuatro paredes medidas no prueban nada: un rombo también tiene cuatro lados iguales.
Las dos diagonales son lo único que demuestra que el edificio es rectangular y que
tus medidas cierran.

- Diagonales **iguales** (±2") → rectángulo, medición confiable.
- Diferencia de **1 ft o más** → la nave no está a escuadra o una pared está mal medida.

La app te lo dice en verde/amarillo/rojo apenas escribes los cuatro números.

### Medir 100 ft con la cinta, solo

Pega la punta de la cinta al piso con cinta azul en la esquina, camina hasta la
esquina opuesta y lee. Si la cinta no alcanza: marca el piso a los 50 ft con una X
de cinta azul, mide el segundo tramo desde ahí y suma. **Nunca midas “a pasos”**
para el plano final: 3 % de error garantizado.

### Medir la altura libre sin escalera

1. **Con láser**: apunta al techo, listo (±1/16").
2. **Contando bloques**: la mayoría de las naves son de CMU. Un bloque + junta =
   **8" exactos**. Cuenta bloques hasta la viga y multiplica. Verifica midiendo 3
   bloques con la cinta (deben dar 24").
3. **Con una referencia parada**: para un perfil de storefront de largo conocido
   (por ejemplo 12 ft) contra la columna, marca el piso y la punta con cinta azul, y
   repite hacia arriba. Dos tiros de 12 ft = 24 ft.
4. **Por proporción en foto**: pon algo vertical de largo conocido (una regla de 4 ft
   o una hoja de 6 ft) contra la columna, aléjate ~30 ft y toma la foto **de frente,
   con el teléfono a la altura del pecho y sin zoom**. Mide en la foto cuántas veces
   cabe la referencia hasta la viga. Da ±2 %: suficiente para saber si te caben racks
   de 3 niveles, no para pedir acero a medida.

---

## 2 · Si la bodega no es un rectángulo

Muchas naves tienen un “mordisco”: la oficina en la esquina, un cuarto eléctrico, un
retranqueo.

**No intentes dibujar un polígono raro.** Mide el rectángulo envolvente completo
(como si el mordisco no existiera) y captura el mordisco como un **obstáculo** con su
posición y tamaño. Para planear espacio da exactamente el mismo resultado, y el
validador lo respeta: la propuesta automática recorta los racks que chocarían contra él.

Si de plano la nave es un trapecio o una L grande (>20 % del área), usa
**trilateración**: elige dos puntos base A y B sobre una pared, con distancia AB
medida, y desde ahí mide a cada esquina (AC y BC). Con esos pares cualquiera puede
reconstruir el polígono exacto. Anótalos en las notas de la app y ajustamos el
contorno a mano.

---

## 3 · Las fotos (20 min)

Las fotos no miden, **documentan**. Toma, sin prisa:

- Una foto de cada pared completa, parado en la pared de enfrente.
- Una foto por esquina, con la cinta azul visible.
- Una foto de cada columna con algo de escala al lado.
- Una foto de cada rack existente, de frente y de lado.
- Un video lento caminando por el pasillo principal, teléfono a la altura del pecho.

Nómbralas `pared-norte.jpg`, `columna-C1.jpg`, etc. Cuando dentro de dos meses dudes
si esa columna estaba a 20 ft o a 22 ft, la foto te salva el viaje.

---

## 4 · El 3D bonito (opcional, 1 hora)

Si quieres el modelo 3D “de verdad” para enseñarle a alguien:

- **Polycam** o **RealityScan** (ambas en Android, versión gratis suficiente).
- Camina despacio, ~1 paso por segundo, cubriendo el mismo objeto desde 3 ángulos.
- Bloquea la exposición antes de empezar; la luz cambiante arruina la reconstrucción.
- **El vidrio y los espejos no escanean.** Son transparentes o reflejan: la
  fotogrametría los interpreta como agujeros. Irónico en una vidriera: escanea la
  estructura vacía, o tapa los racks con lona para el escaneo.
- Escala el modelo con una referencia conocida antes de exportar.

Ese modelo es para mirar. **El plano que manda es el de la cinta**, y ese es el que
vive en el WMS.

---

## 5 · Dimensionar las zonas con datos, no con corazonadas

Antes de decidir cuánto espacio le toca a cada familia, saca los números reales del
WMS (pestaña Stock Dashboard, o la hoja `LIVE_STOCK`):

| Dato | Dónde | Para qué |
|---|---|---|
| Piezas promedio en piso por categoría | `LIVE_STOCK` | Tamaño de cada zona |
| Pico de los últimos 60 días | `MASTER_ARCHIVE_V3` | Que no se desborde en temporada alta |
| Rotación (entradas/salidas por mes) | `MASTER_ARCHIVE_V3` | Qué va cerca del portón |

Regla simple y difícil de mejorar: **lo que más se mueve, más cerca del portón.**
En una vidriera casi siempre es ventanas. Los espejos, que casi no rotan y se rompen
si los rozas, van al rincón de menor tráfico.

---

## 6 · Reglas por familia de producto

Lo que la propuesta automática aplica, y por qué:

### Ventanas
- A-frames a doble cara, inclinación de 5–8°, **nunca acostadas**.
- Apoyo en madera o goma, nunca metal contra vidrio.
- ~3.5" por ventana con cajón; una A-frame de 12 ft a doble cara guarda ~80 piezas.
- Pasillo de 5 ft mínimo (dos personas cargando una unidad de 6 ft).

### Screens (window + door)
- Livianos y frágiles: ranuras verticales con divisores cada 2–3", o estante plano.
- **No los apiles sueltos**: la malla se marca con el peso.
- Agrúpalos por proyecto, no por tamaño: salen juntos a la obra.
- Pasillo de 3.5 ft basta, los carga una persona.

### Espejos
- Siempre **parados**, con fieltro o alfombra entre pieza y pieza.
- Zona de mínimo tráfico, lejos del portón y de montacargas.
- Nunca contra pared exterior de metal expuesta al sol: el delta térmico los revienta.

### Shower doors
- Llegan en caja: rack de pallets, máximo 3 niveles, la caja más pesada abajo.
- Los paneles de vidrio sueltos van parados, con los espejos.
- Junto a espejos: los arma la misma cuadrilla, un solo viaje.

### Storefront
- Perfilería de 20–24 ft: **cantilever** en un tramo recto de 25 ft mínimo, con
  apoyos cada 4 ft como máximo o el aluminio se pandea.
- Necesita espacio para maniobrar 24 ft al sacarlo: nunca en el fondo de un pasillo ciego.
- Es lo primero que decide el layout: si el tramo recto no existe, el resto se reacomoda.

### Y lo que casi todos hacen mal
Dejar libre la franja frente al portón. Parece desperdicio (10–20 % del piso) y es lo
contrario: sin ella se descarga sobre el pasillo, se bloquea el acceso a tres racks y
todo el mundo pierde 20 minutos moviendo material para llegar a lo de atrás.

### Seguridad — verifícalo con tu AHJ / fire marshal
El validador avisa, pero **no sustituye al código local**:
- 18" libres bajo los rociadores.
- 36" mínimo en la ruta de salida.
- 3 ft libres frente a extintores y tableros eléctricos.
- Racks altos anclados a piso o a pared.
- Carga máxima por nivel rotulada en cada rack.

---

## 7 · Flujo completo

```
teléfono (cinta + app de captura)
        ↓  exportar CSV / JSON
WMS → pestaña "📐 Plano 3D" → Importar captura      [solo ADMIN]
        ↓  se guarda en la hoja WAREHOUSE_LAYOUT
plano 2D a escala (imprimible) + vista 3D + validación + conciliación con el stock
```

Los **IDs de rack deben ser los mismos que usas en el WMS** (`A1A`, `B2C`…). Cuando
coinciden, el plano se pinta con el inventario real y la pestaña te avisa de:

- ubicaciones con material que **no existen en el plano**;
- racks dibujados que están **vacíos**.

Esa comparación es la que mantiene el plano honesto seis meses después.

---

## 8 · Errores que arruinan el levantamiento

1. Medir a pasos “para salir del paso”: 3 % de error, y el plano ya no sirve para comprar racks.
2. Medir el ancho a la altura del pecho: las paredes de metal se abomban; mide a ras de piso.
3. Olvidar las diagonales: nunca sabrás si tus medidas cierran.
4. Medir hasta la cumbrera en vez de hasta la viga más baja.
5. Dibujar la oficina “más o menos ahí”: es exactamente donde no cabrá el rack.
6. Ignorar el radio de giro del montacargas o del carro de vidrio.
7. Dimensionar con el stock de hoy en vez del pico de temporada.
8. Dejar el plano sin actualizar cuando se mueve un rack. Se actualiza el mismo día.
