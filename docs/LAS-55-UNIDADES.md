# Las 55 unidades de LGI-DE-TOWNHOME2 — cómo cuadrarlo

Jose, 18/11: *"el inventario ya cuenta los 55, y no hay forma de borrar el
movimiento. ¿Cómo se supone que haga otra vez el entry? Eso aumentará 55 más."*

**No hagas otra entrada. Todavía no.** Y probablemente no haga falta ninguna.

---

## Lo primero, porque cambia todo lo demás

**En Acopio el stock no es un número guardado. Es la suma de los movimientos.**

`calculateStock` recorre las filas de movimientos y va sumando y restando. No
hay ninguna celda en ninguna parte que diga «55». Así que:

> **Si el inventario cuenta 55, ES PORQUE HAY UN MOVIMIENTO QUE LOS METIÓ.**
> No puede ser de otra forma.

Y si hay un movimiento, **sí se puede borrar** — con la papelera, que además lo
guarda por si acaso.

**Eso quiere decir que lo que te dije la otra vez era incompleto**, y conviene
decirlo: yo di por hecho que la entrada se había perdido porque tu búsqueda en
Movements no encontró nada. Si el stock los cuenta, la entrada existe. Lo que
falla es **encontrarla**, no que falte.

---

## Por qué no la encontraste buscando `LGI-DE-TOWNHOME2`

Casi seguro por esto: **`LGI-DE-TOWNHOME2` es el nombre de la ENTREGA, no el del
material.**

En Incoming, ese texto estaba en la columna *Name* de la entrega. Pero al hacer
la entrada, el material pudo guardarse con **su** nombre —el del producto— y
`LGI-DE-TOWNHOME2` quedar como **PO** o como comentario. Y Movements busca en
nombre, PO, GC, proveedor y obra… pero la coincidencia tiene que ser exacta de
texto, y un guion o un espacio de más ya no casa.

---

## Los cuatro pasos, en orden

### 1 · Encuentra de dónde salen esos 55

En **Stock Dashboard**, busca el material que tenga 55 — por el nombre del
producto, no por el de la entrega. Cuando lo tengas, **ábrelo y mira su
historial**: ahí está la entrada que los metió, con su fecha y con quién.

Si no sabes qué material es: en **Movements**, pon el filtro de tipo en
**Entry** y ordena por fecha. Lo que buscas es una entrada de **55 unidades**
alrededor del **21 de octubre**. Con la cantidad y la fecha sale enseguida.

### 2 · Mira qué dice esa entrada

| Lo que encuentres | Qué significa |
|---|---|
| **Una entrada de 55, correcta** | **No hay nada que hacer.** El material está, la entrada está, y lo único que falló fue tu búsqueda. Cierra el tema |
| **Una entrada de 55 con el material equivocado** | No la borres: **edítala**. Corrige el nombre y pon el motivo. Queda el rastro de la corrección |
| **Dos entradas de 55** | Ahí sí hubo duplicado. **Borra una** — va a la papelera, no desaparece |
| **Ninguna entrada de 55** | Entonces el stock no los cuenta, y lo que viste era otra cosa. Dímelo con una captura y lo miro |

### 3 · Si de verdad hay que corregir un número: ADJUST, nunca otra entrada

Si en algún momento el número no cuadra con lo que hay en el estante, **no se
arregla con una entrada nueva**. Una entrada dice *«llegó material»*, y eso es
una mentira sobre lo que pasó.

Se arregla con **`− Exit (OUT)` → tipo `ADJUST (count fix)`**: existe justo para
esto. Dice *«la cuenta estaba mal y la corrijo»*, que es la verdad, y deja
constancia de quién y por qué.

> **La diferencia no es de estilo.** Dentro de un año, alguien que mire ese
> material verá «llegaron 55 más el 18 de noviembre» —falso— o «se corrigió la
> cuenta el 18 de noviembre porque X» —cierto—. La segunda se puede auditar; la
> primera envenena el historial y, con costes activados, también el precio
> medio.

### 4 · Y la pregunta de fondo: ¿se perdieron más?

Para saberlo:

1. **Incoming → All Status → `Arrived`.** Esa es tu lista de entregas que
   llegaron.
2. Por cada una, **busca su material en Stock**. Si tiene existencia o
   movimientos, su entrada se hizo.
3. Las que no aparezcan en ninguna parte son las candidatas.

**Son 70 entregas en Arrived**, así que esto es un rato. Si quieres, te preparo
un informe que lo cruce solo y te diga cuáles no tienen movimiento — no es
difícil y se hace una vez.

---

## Y lo que ya no puede volver a pasar

Desde la **v15.7**, el estante que no existe **se comprueba antes de mandar
nada**: la ventana no se cierra, no hay espera, y elegir el estante correcto
guarda directamente. Lo que te hizo perder esa entrada —cerrar la ventana y
dejarte sin dónde corregir— era mío, de la v15.2, y está arreglado en dos
sitios distintos (v15.6 y v15.7).
