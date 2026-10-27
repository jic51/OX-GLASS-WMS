# Si se va el administrador — lo que pasa de verdad, y qué hay que construir

Jose, 26/10, corrigiéndome:

> *"Entiendo la pregunta pero no entiendo el porqué del botón «descárgalo
> todo», porque si el administrador se va de la empresa entonces literalmente
> la app se queda fuera del alcance de todos los demás. No creo que eso
> arregle el problema como tú lo dices. Lo que creo que necesitamos es una
> forma de transferir el control que tiene la primera persona que instaló la
> app a alguien más."*

**Tiene razón, y conviene decir exactamente en qué me equivoqué:** contesté a
una pregunta distinta de la que importa. «Descárgalo todo» es una **salida**
—que el cliente se lleve sus cosas si nos deja— y lo que él está preguntando es
**continuidad**: que la empresa siga trabajando el lunes. Son dos problemas, y
el segundo es el urgente.

Y la segunda parte de su objeción es todavía más exacta: *"la cosa no es sólo
tener los archivos, sino que la app siga teniendo acceso a ellos... si tenemos
que hacerlo a mano, no es la forma correcta"*. Un ZIP de 400 PDFs no es un
sistema: es una caja.

---

## PRIMERO, QUÉ SE ROMPE EXACTAMENTE. SON **TRES** COSAS, NO UNA

Es importante verlas separadas, porque **se arreglan de formas distintas** y
sólo una de ellas la podemos resolver nosotros con código.

| | Qué es | De quién es | Qué pasa si esa cuenta desaparece |
|---|---|---|---|
| **1** | **La hoja** (y el programa, que vive dentro de ella) | Del administrador que hizo la copia | Se va con la cuenta. **Sin esto no hay app** |
| **2** | **La dirección `/exec`** — el despliegue | Del mismo | Deja de responder. Nadie entra, aunque la hoja existiera |
| **3** | **La carpeta de documentos y respaldos** en Drive | Del mismo | Se van las fotos, los albaranes y todas las copias |

Y **la 2 depende de la 1**: el programa vive dentro de la hoja, así que quien
sea dueño de la hoja es quien puede volver a desplegar.

---

## QUÉ SE PUEDE HACER HOY, SIN TOCAR CÓDIGO

Esto no es teoría: es lo que un cliente tendría que hacer **mañana** si su
encargado se fuera. Conviene tenerlo escrito antes de que pase.

### Si la empresa usa Google Workspace (correo propio: `@suempresa.com`)

**Se puede, y es la situación buena.** El administrador del Workspace de la
empresa puede **transferir la propiedad** de los archivos de un empleado que se
va, sin pedirle nada a esa persona. Eso cubre la hoja **y** la carpeta de
documentos.

Después de transferir, hace falta **volver a desplegar** la app desde la cuenta
nueva —porque la dirección va atada a quien despliega— y pegar esa dirección
nueva donde la app la guarda. Eso es un rato de trabajo, no un problema.

### Si el administrador usó un Gmail personal

**Aquí está el agujero, y es gordo.** Google **no deja** transferir la
propiedad de archivos entre cuentas personales de forma administrativa. Si esa
persona colabora, puede ceder la propiedad de la hoja a mano. Si no colabora —o
si la cuenta ya está cerrada— **no hay a quién pedírselo**.

> **Esto hay que decirlo en la instalación, no el día del problema.** Es la
> diferencia entre «la empresa es dueña de su sistema» y «el cuñado que lo
> instaló es dueño del sistema», y hoy la guía no lo menciona.

---

## LO QUE YO CONSTRUIRÍA, EN ESTE ORDEN

### 1 · Avisar en la instalación — **hoy, y es texto**

La guía tiene que decir, antes del primer clic:

> **Instálalo desde una cuenta de la empresa, no desde la cuenta personal de
> quien lo monta.** El sistema vive dentro de esa cuenta: si esa persona se va,
> la empresa necesita poder entrar. Con Google Workspace eso se arregla en
> cinco minutos; con un Gmail personal, puede no arreglarse.

Cuesta una frase y evita el caso que no tiene vuelta atrás.

### 2 · «Preparar el traspaso» — un botón que hace la lista, no el trabajo

Google no nos deja cambiar de dueño desde dentro: **el traspaso lo hace la
persona en Drive, no la app.** Lo que la app sí puede —y es lo que de verdad
falta— es **saber qué hay que traspasar y comprobar después que quedó bien**:

- **Enseña la lista:** la hoja, la carpeta de documentos, la de respaldos, el
  proyecto de script, con enlaces a cada una.
- **Dice los pasos** para la cuenta que se va y para la que entra, incluido
  volver a desplegar.
- **Comprueba al final** que la app sigue viendo sus carpetas y que la
  dirección responde — la misma comprobación que ya existe en
  **🩺 Check this installation**.

Eso convierte «se fue Juan y nadie sabe qué hacer» en una pantalla con cinco
líneas y una marca verde al final.

### 3 · Un segundo administrador de verdad, desde el primer día

Hoy puede haber varios usuarios con rol ADMIN **dentro** de la app, y eso **no
sirve de nada** si la hoja es de otro: el rol de la app no da la propiedad en
Drive.

Lo que yo pondría: que la instalación **pida una segunda cuenta** —de la
empresa, distinta— y que la app:

- la añada como **editor** de la hoja y de las carpetas, y
- **lo compruebe de vez en cuando** y avise si deja de serlo.

Un editor no es dueño, así que esto no resuelve el caso del Gmail cerrado por
sí solo — **pero sí el caso frecuente**, que no es una muerte súbita: es «ese
señor ya no trabaja aquí y no contesta». Un editor puede entrar, copiar la hoja
y seguir. Pierde el historial de propiedad, no los datos.

### 4 · Y ahora sí, «descárgalo todo» — pero en su sitio

Mi idea no era inútil: estaba **en el orden equivocado y vendida como lo que no
es**. No es continuidad. Es el **seguro de última instancia**, para el caso en
que todo lo de arriba falle y nadie pueda entrar a esa cuenta.

Y Jose tiene razón en que un ZIP no devuelve la app al aire. Lo que sí hace, y
por eso lo mantendría como cuarto:

- **Los datos se salvan** aunque el programa no. Una hoja nueva se instala en
  diez minutos; dos años de albaranes no se vuelven a conseguir.
- Hace **verdad** lo que ya prometemos. Hoy decimos *"si dejas de pagarnos tu
  archivo sigue siendo tuyo"*, y eso es cierto de la hoja y **falso de los
  documentos**, que están en una carpeta que nadie sabe que existe.

**Pero no es la respuesta a la pregunta de Jose, y decirlo así fue el error.**

---

## 🔵 LO QUE HACE FALTA DECIDIR

1. **¿La instalación va a exigir una segunda cuenta?** Yo diría que sí y que
   sea obligatoria en Pro: es el único punto en el que se puede imponer algo
   así, y el día que haga falta no hay forma de añadirla.
2. **¿Y en la edición gratis?** Ahí es **una sola persona** por diseño, y el
   permiso que tiene no alcanza para repartir accesos. Yo lo diría en la guía y
   nada más.
3. **¿Se avisa de esto en los Términos?** Hoy prometen que los datos son del
   cliente. Son suyos — **mientras exista la cuenta que los tiene**. Esa
   coletilla no está escrita y debería.
