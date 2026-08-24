# Licencia, uso indebido e integridad del código

Decisiones de Jose (v10.8) sobre qué pasa cuando un cliente deja de pagar, y
sobre cómo saber si tocaron el código.

> **No soy abogado y esto no es asesoría legal.** Lo de abajo es la estructura
> correcta y los términos con los que hay que ir a uno. Una licencia real la
> revisa un abogado en Utah antes de que la firme el primer cliente — y hay al
> menos un punto (la cláusula penal) donde la ley de EE.UU. no funciona como
> uno esperaría.

---

## 1. Qué pasa cuando dejan de pagar

**Decisión de Jose: no se apaga nada.** El cliente sigue usando la app.

Es la decisión correcta y conviene entender por qué, para poder defenderla en
una llamada de ventas:

- Sus datos están en **su** Drive. Apagarles el inventario sería usar sus
  propios datos como rehén.
- Contradice de frente el argumento con el que se les vendió: *"esto es tuyo,
  si nosotros desaparecemos tú sigues teniendo tu sistema"*. Un interruptor de
  apagado convierte esa frase en mentira.
- Y técnicamente sería frágil de todos modos: el código corre en su cuenta
  (ver §3), así que un interruptor es lo primero que alguien borraría.

### Lo que SÍ cambia al dejar de pagar

| | Con suscripción | Sin suscripción |
|---|---|---|
| La app funciona | Sí | **Sí** |
| Sus datos | Suyos | **Suyos** |
| Actualizaciones nuevas | Sí | No |
| Soporte | Sí | No |
| Copias de seguridad automáticas | Siguen corriendo (están en su Drive) | Siguen corriendo |

### Volver después — **cuota de reinstalación**

**Decisión de Jose:** si piden soporte meses después, se cobra **como
instalación nueva + suscripción**.

Es lo correcto y tiene nombre en la industria: **reinstatement fee** (cuota de
reactivación). La razón no es castigar — es que volver de verdad cuesta
trabajo: su copia quedó varias versiones atrás, hay que actualizarla, revisar
qué se rompió mientras nadie miraba, y volver a capacitar a gente que
probablemente ya no es la misma.

**Cómo se dice en la llamada, sin sonar a multa:**
> *"Tu sistema nunca dejó de ser tuyo y nunca dejó de funcionar. Para volver a
> darte soporte tengo que ponerte al día con año y medio de versiones y volver
> a verificar la instalación — eso es el mismo trabajo que una instalación
> nueva, y por eso cuesta lo mismo."*

Poner esto **por escrito desde el contrato inicial** es lo que evita la
discusión después.

---

## 2. La palabra que Jose buscaba

Son tres conceptos distintos y conviene no mezclarlos, porque el tercero es el
que tiene trampa:

### a) **Se licencia, no se vende**

El término es **licencia de uso, no exclusiva e intransferible**. Es la base de
todo lo demás y hay que decirlo explícito:

> *El cliente adquiere el derecho a USAR Acopio. No adquiere la propiedad del
> software. El código fuente, su estructura y su diseño siguen siendo
> propiedad de Acopio, incluso cuando la copia se ejecuta dentro de la cuenta
> de Google del cliente.*

Ese último inciso —*"incluso cuando se ejecuta en su Drive"*— es
**imprescindible** en este producto. Sin él, un cliente puede argumentar con
cara seria que el archivo está en su Drive, luego es suyo.

### b) **Prohibición de modificación e ingeniería inversa**

Es la cláusula estándar, y aquí es la que de verdad importa:

> *El cliente no modificará, adaptará, traducirá, descompilará ni realizará
> ingeniería inversa sobre el software, ni creará obras derivadas de él, ni
> permitirá que un tercero lo haga.*

Y una específica de Acopio, porque el código es legible:

> *El acceso al editor de Apps Script que otorga Google al propietario del
> archivo NO constituye una licencia para modificar el código.*

### c) **La sanción — y aquí está la trampa**

Lo que Jose describe ("una multa por uso indebido") se llama:

- En derecho civil latinoamericano: **cláusula penal**.
- En EE.UU.: **liquidated damages** (daños liquidados).

**⚠️ Y en EE.UU. una cláusula penal PUNITIVA no se puede hacer cumplir.** Un
tribunal la anula si concluye que es un castigo y no una estimación razonable
del daño real. Tiene que estar redactada como *"las partes estiman de buena fe
que el daño de una modificación no autorizada asciende a $X"*, con una razón
detrás del número.

**Cómo hacerlo bien, y esto sí hay que consultarlo con un abogado:**

1. **Que el número tenga origen.** No "$5,000 de multa" — sino algo defendible:
   *el costo de auditar la instalación, revertirla a la versión oficial,
   verificar la integridad de los datos y reinstalar*. Eso es trabajo real y se
   puede cotizar.
2. **Terminación como remedio principal.** Lo más fuerte no es la multa: es que
   una modificación **termina la licencia inmediatamente**, sin devolución. Eso
   sí se hace cumplir sin discusión.
3. **Derecho de auditoría.** *"Acopio puede solicitar una copia del archivo de
   código para verificar integridad, con aviso razonable, hasta una vez al
   año."* Sin esto, §3 no tiene base contractual.
4. **Y lo que de verdad cierra el caso: el soporte queda condicionado al código
   sin modificar.** Aunque no cobres nada, *"no damos soporte a instalaciones
   modificadas"* es a la vez razonable, cierto y suficiente — porque un cliente
   que rompió su copia y no puede pedir ayuda vuelve solo.

---

## 3. Detectar si tocaron el código — lo que se puede y lo que no

Jose preguntó por *"código que no haga nada pero nos permita verificar si fue
manipulado"*. Hay que separar dos cosas.

### ❌ Lo que NO funciona, y es importante decirlo

**Ningún código dentro de la copia del cliente puede demostrar que no fue
tocado**, porque el cliente controla el entorno donde ese código corre. Todo lo
que se ponga ahí, lo puede quitar:

- ¿Una huella incrustada? La edita.
- ¿Una llamada a un servidor nuestro? La borra — y además no tenemos servidor,
  que es justamente lo que hace bueno al producto.
- ¿Un hash del fuente calculado en tiempo de ejecución? Apps Script no puede
  leer su propio código sin la API de Apps Script y su scope; y aun así, el
  hash esperado estaría en el mismo archivo que puede editar.

Es la misma conclusión de `PROTEGER-EL-CODIGO.md`: **lo único que esconde el
código de verdad es el Marketplace de Google Workspace**, y cuesta verificación
de scopes sensibles y auditoría anual.

**Un mecanismo de "protección" que se anula editando dos líneas es peor que no
tener ninguno**, porque da una confianza que no existe.

### ✅ Lo que SÍ funciona — y ya lo tenemos

**Git.** Cada versión publicada está en un commit. Cuando Jose pega el archivo
de un cliente aquí, se compara **carácter por carácter** contra la versión
oficial. Un `diff` muestra cualquier diferencia, y no se puede engañar
retocando una constante — porque **la referencia está fuera del alcance del
cliente**.

Eso es más fuerte que cualquier cosa incrustable, y no hay que construir nada.

**El procedimiento:**
1. Jose pide el archivo (respaldado por el derecho de auditoría de §2.c.3).
2. Lo pega aquí, diciendo qué versión debería ser.
3. Se compara contra el commit de esa versión.
4. Sale una de tres respuestas: **idéntico**, **diferente en estas líneas**, o
   **es otra versión distinta de la que dice**.

**Lo que hace falta para que esto sea sólido, y sí hay que construirlo:**

- **Una etiqueta de release por versión en git.** Hoy las versiones se
  identifican por el mensaje de commit. Un tag `v10.8` hace la comparación
  inequívoca y de un solo comando.
- **Una huella visible en la app.** No para *impedir* la manipulación —eso no
  se puede— sino para **hacer visible la deriva**: un `APP_BUILD` con el hash
  corto del commit, mostrado junto a la versión en el pie. Sirve para tres
  cosas honestas:
  - Jose pregunta *"¿qué dice tu pie de página?"* y sabe en qué versión están
    sin pedir el archivo.
  - Distingue *"están atrasados"* de *"lo tocaron"*, que son dos conversaciones
    completamente distintas.
  - Convierte la manipulación en un **acto deliberado**: para ocultarla hay que
    editar también la huella, y eso ya no es "le movimos algo", es esconderlo.
    Eso importa legalmente.

**Lo que NO hay que hacer:** llamar a esto "protección anticopia". No lo es, y
prometerlo es la clase de cosa que se descubre en el peor momento.

---

## 4. Qué hay que escribir, en orden

1. **Términos de Servicio** — reemplazan lo que hoy hay en `legal/`. Deben
   incluir: licencia de uso (§2.a), prohibición de modificación (§2.b),
   terminación por modificación, derecho de auditoría, soporte condicionado a
   código sin modificar, y la cuota de reinstalación (§1).
2. **Cotización / contrato de instalación** — precio, qué incluye, y una
   referencia a los Términos. Firmado antes de tocar nada.
3. **Revisión legal.** Sobre todo la cláusula penal: redactada como castigo, en
   EE.UU. no vale nada.

---

## 5. Lo que decidimos NO hacer, y por qué

| Idea | Por qué no |
|---|---|
| Interruptor de apagado remoto | Contradice la promesa central del producto, y es lo primero que alguien borraría |
| Ofuscar el código | Rompe la depuración, complica cada actualización, y se deshace con un formateador |
| Librería de Apps Script para "esconder la lógica" | **No esconde nada** — el cliente necesita permiso de lectura para usarla. Verificado en `PROTEGER-EL-CODIGO.md` |
| Huella "anti-manipulación" incrustada | Se edita. Da falsa confianza, que es peor que no tener nada |
