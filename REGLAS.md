# reglas

Lo que vale para más de un archivo. Una regla que gobierna una sola línea se
queda al lado de esa línea; las que están acá no tienen dónde vivir en el código
y por eso se estaban re-explicando en cada lugar que las obedece.

Cuando una regla se puede escribir como código, se escribe como código y no acá:
`dentroDe()` en `editor.js` es la regla de los eventos hecha función, y
`.claude/revisar.mjs` es la del ámbito global hecha chequeo. Nadie se puede
olvidar de una función.

---

## el texto es el tema

No hay estado escondido en la interfaz. Todo lo que cambia cómo suena está
escrito en la hoja, con palabras del idioma: callar una parte es escribir
`callado`, no prender un interruptor. Si mandás el enlace, del otro lado suena
igual.

De ahí salen dos cosas que parecen caprichos y no lo son: los puntitos del
margen y el ▾ **escriben en el texto** en vez de guardar algo aparte, y cualquier
control nuevo tiene que hacer lo mismo o no entra.

**Palabras para lo que suena, un signo para lo que no.** Todo renglón que hace
sonar algo se escribe con palabras del idioma; los signos —`-`, `_`, `|`, `!`—
viven adentro de una secuencia de pasos y los cuatro dicen algo musical. El `@`
que apunta a otro documento y el `#` de una nota son las excepciones que confirman
la regla: no suenan, y por eso no son palabras — se ve de un vistazo que ese
renglón no es música.

## los cuatro colores

El color no decora: cada canal dice una cosa y sólo una.

| canal | qué dice | dónde |
|---|---|---|
| **la rueda** | quién toca | `color.js` — el tono es la familia, 18 cada 20°; la luz es el instrumento, repartida entre los del tema |
| **la tinta de la página** | lo que el tema dice: el tempo, las secciones, la forma | `--texto` |
| **la tinta del tema** | de qué tema estamos hablando: su nombre, su lista, su enlace | `--marca-tinta` |
| **el rojo pleno** | esto no se entiende | `--mal`, croma al máximo que entra en pantalla |

### la rueda

Está **escrita a mano** y no salida de un orden cualquiera: el color tiene que
querer decir algo —el bronce dorado, las cañas en el oliva de la madera, la
flauta en el aire, las cuerdas frotadas en el azul frío—. Y a la vez las nueve
familias que de verdad conviven en un tema caen en los lugares pares, o sea a
**40° unas de otras**. Con un paso áureo, percusión y bajos quedaban a 12° y la
batería y el bajo salían del mismo verde. Las otras nueve van en el medio, al
lado del pariente que les toca, a 20°.

Esos 40° son el techo y no una holgura, y **reordenar la rueda no los levanta**:
ocho familias que conviven todas con todas no se pueden repartir el círculo mejor
que a 45°, o sea ΔE 0,103 donde hoy hay 0,092. Doce por ciento a cambio de mandar
el bajo al verde. El otro eje es el que compra.

Adentro de una familia manda la luz, y el lugar de cada instrumento **sale de los
que suenan en el tema y no del catálogo**: dos violas del catálogo son dos
casilleros pegados de los ocho que tiene la familia, y las dos que hay en el tema
se van a las dos puntas de la banda. Era el problema grande de la rueda y no el
que parecía —en cuatro de los seis temas de la casa el par más parecido era de
una misma familia, y el peor, un pizzicato y un timbal, caía en ΔE 0,027, abajo
del umbral de «el mismo color a simple vista»—.

De ahí sale que **la banda vale por su largo**: de ese largo salen las distancias
de adentro de una familia. Pero se estira sólo hasta donde no cambia lo que el
modo es —de noche la cinta tiene que seguir siendo fondo, y a 0,68 de techo pasaba
a estar adelante—, y estirarla de más tampoco compra: el piso queda igual. El
trabajo lo hace repartir la luz.

### dos trabajos, cuatro bandas

El color de una parte hace dos cosas que piden lo contrario: **teñir** una franja
ancha en el borde, y **leerse** como texto de dieciséis píxeles. Con una sola
rampa uno de los dos siempre salía mal — el nombre de una parte llegaba a dos de
contraste contra la hoja, que no es poco contraste, es no estar.

Así que la banda se parte **por trabajo y no por modo**: `trama` y `tinta`, cada
una con su versión de día y de noche. La tinta se da vuelta entera entre modos
—contra un fondo oscuro el texto tiene que subir mucho más que una franja—, y las
dos quedan del lado de acá de la tinta de la página, así que el nombre de una
parte es texto de color y nunca un subrayado fluorescente.

Entre los dos modos la diferencia no la puede hacer la luz sola: las dos bandas
ya usan todo el recorrido que el contraste permite, y correrlas encima dejaría
una punta contra su fondo. La hace
también la croma, y ésa sale gratis. De día la rueda va más clara y desaturada
—tinta sobre papel—; de noche más profunda y saturada —luz sobre vidrio—. Son dos
medios distintos, no el mismo pigmento con otro fondo atrás.

Consecuencias que ya se cobraron una discusión cada una:

- **Una sección no toca**, así que no le toca ningún tono de la rueda. Es un
  tramo de tiempo y va en tinta de página. Lo mismo el tempo y la forma.
- **`--marca-tinta` no es «el color del tema» en abstracto**: sale del primer
  instrumento escrito. Teñir con él algo que no es del tema-como-archivo lo tiñe,
  en los hechos, del color de la bata.
- **El error se distingue por saturación y no por tono.** La rueda ocupa el
  círculo entero, así que no queda ningún rojo libre: el carmín que había caía a
  ΔE 0,036 del agogó, que es el mismo color a simple vista. Lo que sí queda libre
  es la croma, porque la rueda está clavada en 0,135 y 0,15 — el error se va al
  máximo que entra en pantalla y pasa a ser lo único plenamente saturado, que lo
  aleja al doble sin tocarle el tono. Y lleva el subrayado ondulado, que no lo
  tiene ninguna otra cosa.
- **El mismo objeto lleva el mismo color en todas las superficies.** Una parte es
  del mismo color en su nombre, en su puntito del margen y en su franja de la
  cinta. Si dos superficies discrepan, una de las dos está mal.

## el espejo mide contra el textarea

`#hl` es una copia glifo a glifo de `#src`, pintada abajo. **Nada que corra el
avance del texto puede tocar un token**: ni `letter-spacing`, ni versalitas, ni
`margin`, ni `padding`, ni otro `line-height`. Un solo píxel de corrimiento y las
líneas largas cortan en distinto lugar en cada capa.

Quedan libres el **color** y el **peso**, que en monoespaciada no mueven una
letra. Toda la jerarquía que se pueda escribir adentro del editor sale de esos
dos. Lo que necesite geometría vive afuera del espejo, flotando y medido contra
el rect del token: así están los puntitos, el ▾ y el de deshacer.

### qué se puede seleccionar

Se selecciona **lo que dice algo** —el tema, su nombre, el strudel que sale de
él, el error que explica por qué no sale— y no **lo que hace algo**: botones,
menús, el desplegable del pie. Un control resaltado no es un control elegido, es
un control con una mancha encima.

Los renglones de muestra de la hoja vacía son las dos cosas: son notación —dicen
algo, y son lo que uno quiere copiar— y además se escriben al apretarlos. Se
seleccionan, y el click se ignora si hay algo seleccionado, que si no copiarlos
escribiría uno.

El espejo se excluye por otro motivo: es el mismo texto del tema pintado abajo
del textarea, así que seleccionarlo es seleccionar una copia — un resaltado que
no tiñe la parte, que el botón de la selección no ve y que el textarea no copia.
Se lee el espejo, pero se agarra el textarea.

## lo que cuelga de una palabra

El ▾, el de deshacer y el de la selección son botones de verdad que **flotan por
encima del texto**, no dibujos del css ni nada metido adentro del renglón: ahí no
podrían medir más que el espacio entre dos palabras. Se ubican a mano contra el
rect de su palabra, y por eso pueden quedarse quietos mientras el menú que
abrieron sigue abierto.

Los que salen de la misma palabra se sueldan de costado y se leen como una sola
pieza. La fila se rehace entera y no de a uno, porque el ▾ aparece y desaparece
con el mouse y el lugar que le toca al de deshacer cambia sin que éste se entere.

## el nombre es la identidad

Dos temas con el mismo nombre **son el mismo tema**. Renombrar mueve la entrada y
no deja una nueva —si no, tecleando un nombre queda una por cada letra—, pero
irse a otro tema no borra el que se deja atrás.

De ahí sale algo que parece un error y no lo es: si abriste un ejemplo, el
guardado te dejó una copia con ese nombre, y la lista muestra las dos filas. Son
el mismo tema; la marca de «abierto» va en la tuya, que es la que se escribe en
cada tecla, y la del ejemplo queda limpia porque es la manera de volver a cómo
venía.

Y es lo que dice la pestaña: `nombre — chanchán`, o la página sola mientras no
tenga nombre, porque «sin título» es lo que dice un campo vacío y no un nombre
que convenga dejar escrito en un marcador. Con el icono son las dos maneras de
contestar cuál de los chanchanes abiertos es éste: una por nombre, la otra por
color.

## la cinta se lee, el margen escribe

La cinta de arriba es el tema visto de lejos. Dentro de ella:

- las **franjas** son las voces y salen de la rueda;
- la **regla de vueltas**, los **cortes de sección**, la **aguja** y el **anillo**
  son tiempo, y van en tinta de página.

Se le puede preguntar de quién es una franja pasándole por encima, pero **no
escribe en el documento**: está dibujada detrás de todo y ocupa el borde entero
de la ventana, así que un click suyo sería un click en el fondo de la página que
cambia el texto sin que se vea dónde. Callar es del puntito del margen, que es un
botón, mide 22 píxeles y está al lado del renglón que cambia.

## el patrón espejo

Cada renglón lleva, además de su código, un **patrón gemelo donde cada paso es su
propio número**. Preguntarle a strudel en vez de contar a mano es lo que hace que
la cinta y el realce muestren lo que de verdad va a sonar —lo que estira, lo que
acelera, el pulso de «en corcheas», las vueltas que el arreglo saltea— sin
rehacer ninguna de esas cuentas de este lado.

Lo arma `traductor.js`, lo evalúa `editor.js` una vez por línea, `cinta.js` le
pide los golpes de la vuelta larga y `reloj.js` le pregunta a cada cuadro qué paso
cae justo ahora.

## el tempo es del reloj

No vive en el patrón. Por eso un tema que acelera se le va diciendo al reloj al
cruzar cada borde de sección, y por eso el número se puede arrastrar mientras
suena: volver a evaluar cambiaría el tema recién en el borde de la vuelta.

## 133 instrumentos no entran en una lista

Apilados son nueve pantallas y media. Donde se eligen por el ▾ van en dos
columnas —las familias a la izquierda, la elegida a la derecha—; en el sugeridor
no aparecen sin prefijo: sin nada tipeado van sólo los arranques de siempre. Y
cualquier cosa que recorra la lista entera corre en cada cuadro del hover, así
que se pregunta primero por el tipo del token y recién después se arma el menú.

## un solo ámbito

Los scripts de `js/` son scripts comunes, no módulos: comparten un ámbito y el
orden de `index.html` es el orden en que cargan. Lo que ese orden garantiza es lo
que pasa **al cargar**: una línea de primer nivel sólo puede nombrar lo que ya
cargó. Lo que pasa después —una función que llama a otra de un archivo que carga
más tarde— anda igual, y `actualizar()` lo hace a propósito: es la que orquesta,
y llama a la cinta, al reloj y a los puntitos, que vienen después.

De ahí las reglas que revisa `node .claude/revisar.mjs`, porque ninguna se ve a
simple vista y el navegador no dice cuál es la otra mitad del choque:

- dos declaraciones con el mismo nombre en archivos distintos tiran la página
  entera;
- una variable (`let`) se escribe sólo desde el archivo que la declara: es su
  dueño, y los demás la leen;
- una local no se llama como un global: borrar la local caería en silencio sobre
  el otro;
- nada de primer nivel nombra lo que todavía no cargó.

Un helper que usen dos archivos va en el que carga primero de los dos.

## los dibujos

Van en un sprite de `<symbol>` adentro de `index.html`, y cada lugar los apunta
con `<use>`. Ni una webfont de iconos —es texto, y hasta que la fuente baja el
botón muestra la palabra que iba a dibujar— ni un `.svg` aparte, que es otro
pedido de red para lo mismo.

Los de trazo son de **Lucide** (ISC, lucide.dev), dibujados en **grilla de 24**.
De ahí sale el trazo de `.i`: a 16 px, un `stroke-width` de 2 cae en 1,33 y se ve
blando; 2,25 lo deja en uno y medio. Los chicos van a 12 y por eso llevan 3 — la
línea tiene que caer en el mismo uno y medio, no en el mismo número. **Un dibujo
de otra librería con otra grilla obliga a rehacer esa cuenta.**

El enlace y el «papel o tinta» son de acá: ninguna librería tiene la segunda
—todas resuelven claro y oscuro con un sol y una luna, que es otra metáfora—.

### el de la pestaña

Es el único que no puede vivir en el sprite: `rel="icon"` no toma un fragmento.
Pero tampoco es un archivo — va escrito adentro del `href`, en `data:`, que es la
manera de que siga sin haber un pedido de red por un dibujo.

Y no es un logo: es **la cinta**, con los colores del tema abierto, así que la
pestaña dice qué tema está abierto y no qué página es. Por eso lo redibuja
`pintarMarca()`, que es la que ya pinta la marca en las otras superficies.

No se puede achicar a escala: la banda entera mide 65 píxeles contra una ventana
de mil, o sea un cuarto de píxel a dieciséis. Lo que se achica es la ventana —y lo
que queda es **el codo**, la esquina donde la cinta dobla, que es lo que se
reconoce de lejos.

El codo y nada más. Cerrarlo alrededor del botón, que es lo que la cinta hace en
la página, se probó y a dieciséis píxeles es demasiado dibujo: pasa a haber una
figura que entender —dónde abre, cuántos anillos, de qué lado— donde entraba una
sola curva que se lee de una.

Las franjas van de afuera para adentro, en el orden en que están escritas.
Pasadas cinco o seis dejan de contarse y quedan como una banda de colores, que es
lo que la cinta ya es cuando se la mira de lejos; lo que no hace nunca es mostrar
un color que no sea de una parte escrita.

Lo que el html trae escrito a mano es lo único que se ve sin js —el marcador, la
vista previa— y por eso es la hoja vacía: el marco solo, esperando. En una tinta
que se vea, que la del marco está calculada contra el papel de la página y la
pestaña es la barra del navegador.

La aguja no entra ahí: el navegador frena los cuadros de las pestañas de atrás,
así que una aguja en el icono miente sobre dónde está el tema.

## los eventos, desde que los botones tienen dibujos adentro

Un click sobre un botón con un `<svg>` adentro tiene como blanco el `<svg>`, no
el `<button>`. Cualquier pregunta del tipo «¿esto pasó adentro de tal control?»
va por **`dentroDe()`** y nunca por identidad. Comparar por identidad da «afuera»
justo encima del botón, y el síntoma —el panel se cierra en el mismo click que lo
abre, el ▾ parpadea— no señala la causa.

Lo mismo vale para `relatedTarget`.
