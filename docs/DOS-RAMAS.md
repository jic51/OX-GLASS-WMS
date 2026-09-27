# Dos líneas de trabajo: estable y siguiente

Jose lo aclaró el 2026-09-27, y mi respuesta anterior contestaba otra pregunta:

> *"Yo no hablaba de arreglar problemas — los errores hay que arreglarlos sí o
> sí, siempre. Pero las mejoras de UI/UX, visualizaciones, features añadidos,
> cambios en los settings, etc., no creo que debamos seguir haciéndolo como
> hasta ahora: arreglar algo y hacer el deploy para ver cómo funciona, pero con
> cada cliente. A lo que me refiero es si podemos tener una rama donde tenemos
> la siguiente versión mejorada, con avances y cambios notables, y otra donde
> estamos trabajando para arreglar los errores de los clientes."*

**Tiene razón, y lo que yo contesté antes no valía.** Yo argumenté contra
mantener una rama vieja congelada. Él no pide eso: pide **no usar el almacén de
OX como banco de pruebas de las mejoras**. Son cosas distintas y la segunda es
sensata.

---

## Lo que cuesta hoy no tenerlo

Ahora mismo cada cambio —arreglo o mejora— sale por el mismo sitio y llega al
mismo almacén. Eso significa que **OX Glass es el entorno de pruebas de Acopio**,
y OX Glass es un negocio de verdad con material de verdad.

Esta semana lo demostró dos veces: el editor de columnas y el trabajo nocturno.
Uno era mejora y el otro arreglo, pero los dos se estrenaron sobre los datos
reales de la empresa de Jose.

---

## Cómo queda

Dos ramas permanentes:

| Rama | Qué lleva | A dónde va |
|---|---|---|
| **`estable`** | Sólo arreglos de lo que está roto | A los clientes, en cuanto está probado |
| **`siguiente`** | Mejoras, features, cambios de pantalla, ajustes | A una copia de pruebas, y a los clientes por tandas |

**La regla de a cuál va cada cosa ya la tenemos escrita** y no cambia:

- **Está roto, miente o pierde datos** → `estable`. Sale ya.
- **Funciona y se puede hacer mejor** → `siguiente`. Sale cuando toque.

### El movimiento de las ramas, en una frase

`estable` se **mezcla hacia** `siguiente` cada vez que sale un arreglo, para que
la rama de mejoras nunca se quede atrás. **Nunca al revés**: una mejora no cruza
a `estable` suelta. Cruzan **todas juntas**, cuando se decide que hay entrega
nueva, y entonces `siguiente` se vuelca sobre `estable` de una vez.

Eso evita lo único que hace insufribles las dos ramas: **arreglar la misma cosa
dos veces**. Un arreglo se hace UNA vez, en `estable`, y llega a `siguiente` por
la mezcla.

### Lo que hace falta para que funcione, y no es Git

**Una copia de Acopio para probar, separada del almacén de OX.** Sin eso, las
dos ramas no resuelven nada: las mejoras seguirían estrenándose en producción,
sólo que con más pasos. **Es la pieza que falta, y es lo único de todo esto que
no puedo hacer yo.**

Es la misma copia que hace falta para las capturas de la landing
(`CAPTURAS-PARA-LA-LANDING.md`), así que una tarde sirve para las dos cosas.

### Y una entrega es una etiqueta

Cada vez que se le pega código a un cliente, una etiqueta de Git y una fila en la
tabla de clientes. Eso no cambia con las ramas y sigue siendo lo que permite
reproducir exactamente lo que tiene cada uno.

---

## Lo que YO recomiendo, con su coste dicho

**Sí a las dos ramas, pero no todavía.** El orden importa:

1. **Primero la copia de pruebas.** Hasta que exista, las dos ramas son
   burocracia: el sitio donde se estrena una mejora sigue siendo el almacén de
   OX.
2. **Después las ramas**, el mismo día. Son cinco minutos de Git.

**Lo que cuesta, dicho claro:** dos ramas significan que de vez en cuando hay que
resolver un choque al mezclar —dos cambios que tocan la misma línea—. Con una
sola persona escribiendo código y las mezclas siempre en la misma dirección, eso
es raro y es de los problemas baratos. Es un precio bajo por dejar de estrenar
cosas encima del inventario de una empresa que trabaja.

**Lo que NO hay que hacer:** dejar `siguiente` corriendo meses sin volcarla.
Cuanto más tiempo pasa, más grande es el volcado y más se parece a un
lanzamiento a ciegas — que es exactamente lo que estas dos ramas existen para
evitar. Volcar seguido, en tandas pequeñas.

---

## ✅ HECHAS — 2026-09-27

Las dos ramas existen y están publicadas, las dos en el mismo punto: **v12.15 ·
build c0a41403**, que es lo que Jose tiene desplegado.

```
estable      ← arreglos. Lo que está roto, miente o pierde datos
siguiente    ← mejoras, features, pantallas, ajustes
```

`consolidado-v8.8` se queda **quieta**, como registro de todo lo anterior. No
recibe más trabajo. No se borra: es la historia de doce versiones y el sitio
desde donde salieron.

### El día a día, en cuatro líneas

| Qué pasó | Dónde se arregla | Cuándo sale |
|---|---|---|
| Algo está roto | `estable` | Ya |
| Una mejora | `siguiente` | Cuando se decida la entrega |
| Salió un arreglo | se mezcla `estable` → `siguiente` | En el momento |
| Hay entrega nueva | se vuelca `siguiente` → `estable` | Por tandas |

**Los arreglos suben, las mejoras bajan en bloque.** Así un arreglo se hace UNA
vez, que es el único motivo de peso para no tener dos ramas.

### La copia de pruebas — resuelto, y Jose tenía razón

Jose: *"yo tengo una copia de prueba que se llama 'MY WAREHOUSE'… no empecé una
nueva desde cero porque necesitamos los datos para trabajar; los datos reales
son mejores que los inventados, dime si estoy mal."*

**No está mal, está bien, y es mejor que lo que yo iba a proponer.** Un almacén
inventado tiene nombres del mismo largo, cantidades redondas y ningún caso raro
— y los casos raros son justo lo que rompe el producto. Toda la semana pasada lo
demuestra: la columna que se estrujaba con el nombre de veinte letras, la
insignia de categoría que no cabía, el correo más largo que se salía. Nada de eso
aparece en datos inventados.

**Lo que SÍ hay que separar es publicar.** Para eso está
`tools/demo-nombres.gs`: se hace una copia de `MY WAREHOUSE`, se le corre encima
y los nombres propios pasan a ser ficticios **sin tocar** cantidades, fechas,
estantes ni categorías. El almacén sigue siendo el de verdad en todo lo que hace
que una captura parezca real; lo único que cambia es a quién pertenece.

O sea: **`MY WAREHOUSE` para probar, una copia suya con nombres ficticios para
publicar.** Sin elegir entre las dos cosas.
