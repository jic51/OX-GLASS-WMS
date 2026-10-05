# La lista de la v2

Jose, 2026-10-05: *"estaba pensando que también podemos empezar a trabajar en la
v2, o por lo menos empezar con una lista para la v2."*

Esto es esa lista. **No es un plan de trabajo todavía** — es el sitio donde las
ideas de v2 dejan de estar en el chat y empiezan a estar escritas, con lo que
costaría cada una **mirado en el código**, no estimado a ojo.

Qué es v1 y qué es v2 está decidido en `V1-Y-V2.md` y no se repite aquí. El
resumen que hace falta para leer esta lista: **v1 es lo que se vende ahora y se
arregla ahora**; v2 es lo que mejora algo que ya funciona. Nada de esta lista se
empieza mientras quede algo roto en el backlog.

---

## 1. 🔵 OTRO TIPO DE USUARIO — hay que hablarlo, y aquí están los números

Jose: *"anota para la v2: crear otro tipo de usuario (primero hablamos de esto y
si es mucho trabajo lo dejamos para la v3)."*

Lo pidió con la condición de hablarlo primero, así que esto **no es una
propuesta de hacerlo**: es lo que hace falta saber para decidirlo. Lo he mirado
en el código, función por función.

### Lo primero, porque puede ahorrar el trabajo entero: ¿un rol nuevo, o un
### nombre nuevo?

**Ya se puede renombrar el rol WAREHOUSE** desde la propia app. La propiedad
`WAREHOUSE_ROLE_LABEL` cambia lo que ve la gente —SUPERVISOR, LEAD HAND, lo que
sea— mientras el valor interno sigue siendo `WAREHOUSE` en la hoja y en todas
las comprobaciones. Y los interruptores por rol (`DEFAULT_ROLE_PERMS`:
`canSeeCosts`, `canEditMovements`, `canManageCatalog`, `canExportData`) ya
permiten moldear lo que ese rol puede hacer **sin tocar una línea de código**.

Así que la primera pregunta no es técnica, es de Jose: **¿lo que falta es un
cuarto grupo de personas con permisos distintos a la vez, o un nombre distinto
para el grupo que ya hay?** Si es lo segundo, está hecho. Si es lo primero,
sigue leyendo.

Y hay un caso intermedio que probablemente es el real: **dos grupos de gente de
almacén con permisos distintos entre sí** (por ejemplo, el que puede crear
proveedores y el que no). Eso hoy **no se puede**, porque los interruptores son
del rol, no de la persona, y sólo hay un juego de interruptores.

### Lo que habría que tocar para un cuarto rol de verdad

No es grande, pero **está repartido**, que es lo que lo hace peligroso:

| Sitio | Qué hay hoy |
|---|---|
| `requireAuth_` (servidor) | **El problema de verdad.** Ver abajo. |
| `addUser` y el asistente de instalación | Dos listas `['ADMIN','WAREHOUSE','VIEWER']` escritas a mano, en dos sitios |
| `rolePerms_` / `setRolePerms` | **Una sola** propiedad, `ROLE_PERMS_WAREHOUSE`. Los interruptores son de ese rol y de ninguno más |
| `canSeeCosts_` y `requirePerm_` | Preguntan `role === 'WAREHOUSE'` literal |
| El navegador | 9 comparaciones de rol, los dos `<option>` del selector, el color de la etiqueta |
| Pruebas | `test-cost-privacy.js` y las de permisos comprueban tres roles |

**Y éste es el que importa.** `requireAuth_` decide si puedes escribir así:

```javascript
if (minRole === 'WRITE' && a.role === 'VIEWER') throw ...
```

Eso **no es una lista de quién puede**: es una lista de quién no. Un rol nuevo
—`PURCHASING`, `DRIVER`, cualquiera— **pasaría la guardia de escritura sin que
nadie lo decidiera**, sólo por no ser VIEWER. El rol nuevo entraría con permiso
de escribir en el almacén el día en que se escriba su nombre en la hoja.

Es el mismo patrón que ya nos mordió dos veces este mes: *"una guardia que dice
que sí"* (el goteo de CONFIG en la v12.39) y *"una protección escrita y nunca
ejecutada"*. **Así que, se haga el rol nuevo o no, esa línea hay que darle la
vuelta**: de "si eres VIEWER, no" a "si no estás en la lista de los que
escriben, no". Eso es **v1, pequeño, y lo anoto en el backlog** — no depende de
que haya un cuarto rol, sino de que el día que lo haya no entre por la puerta de
atrás.

### Mi recomendación, para cuando lo hablemos

1. **Primero** dar la vuelta a la guardia de escritura (v1, una línea y su
   prueba). Barato y hay que hacerlo igual.
2. **Después** preguntarle a Jose qué grupo de personas es y qué tiene que poder
   hacer **con un ejemplo real de su almacén**. Sin eso, un rol nuevo es un
   cuarto nombre en un selector, y la app no mejora.
3. **Si la respuesta es "dos grupos de almacén con permisos distintos"**, lo que
   encaja no es un cuarto rol: son **los interruptores por persona** en vez de
   por rol. Es el mismo trabajo que el punto 2 de esta lista y los dos se
   resuelven de una vez.
4. **A la v3** sólo si al hablarlo sale que hacen falta roles que la gente pueda
   crear y nombrar ella (*"roles personalizados"*). Eso sí es grande: deja de
   haber una lista de roles y hay una tabla de roles, con pantalla propia.

**En trabajo:** el paso 1 es una tarde. Un cuarto rol fijo con sus
interruptores, dos o tres días con pruebas. Roles que el cliente se inventa,
una semana larga y una pantalla nueva — eso es v3.

---

## 2. 🔵 PERMISOS PARA CREAR CADA COSA — idea de Jose del 2026-10-05

Está razonada entera en `BACKLOG.md` (buscar *"PERMISOS PARA CREAR CADA COSA"*).
Resumen: partir `canManageCatalog` en interruptores por cosa (proveedores,
ubicaciones, proyectos, categorías).

**A favor, con dos condiciones que ya están escritas allí:** cerrar las listas
va primero (mientras el campo sea libre, quitar el permiso de crear no impide
teclear `A1p`), y empezar por dos interruptores y no por cuatro.

**Y se junta con el punto 1:** si los interruptores pasan a ser por persona, esto
y "otro tipo de usuario" son la misma obra.

---

## 3. 🔵 UX/UI — Jose va a mandar vídeos

Jose, 2026-10-05: *"también te voy a pasar unos vídeos para que veas cómo quiero
cambiar la app (en especial la UX/UI) pero eso más tarde o en los próximos
días."*

**Pendiente de los vídeos.** No apunto nada aquí todavía porque sería inventar
lo que quiere, y eso es exactamente lo que no se hace.

Lo único que dejo dicho, porque va a hacer falta cuando lleguen: **los vídeos de
Jose son la mejor fuente de defectos que tenemos.** Trabaja al **157 % de zoom**
y todas nuestras pruebas de navegador corren al 100 %, así que hay una clase
entera de fallos —alturas de fila fraccionarias, textos que se parten, botones
que saltan— que **no podemos ver desde aquí** y que sus vídeos sí muestran. Está
en el backlog como *"una prueba de navegador a un zoom que no sea el 100 %"*, y
cuando lleguen los vídeos sube de prioridad.

---

## 4. Lo que ya estaba apuntado como v2 antes de esta lista

Para que esto sea **la** lista y no otra más:

- **Códigos de barras / escáner** — v2 legítima (mejora lo que sirve, no arregla
  nada roto). Razonado en `BACKLOG.md`, sección *"¿qué falta para lanzar?"*.
- **Costes y precios** — `canSeeCosts` ya existe y no gobierna nada todavía: se
  dejó puesto a propósito para que el día que haya datos de coste no haya que
  construir esta misma fontanería dos veces.
- **Vista por pasillo** — `VISTA-POR-PASILLO.md`.
- **Panel de clientes** — `PANEL-DE-CLIENTES.md`. Es de Jose decidir camino A o
  B, y hasta que lo decida no es v2 ni v1: es una pregunta abierta.

---

## Lo que esta lista NO es

No es una promesa de orden ni de fecha. **La regla sigue siendo la del
`V1-Y-V2.md`: lo roto antes que lo nuevo.** Si algo de aquí se adelanta, será
porque arreglar algo de v1 lo trae de la mano —como el punto 1, que empieza
siendo una guardia mal escrita— y no porque sea más apetecible.
