# **reglas**

Lo que vale para más de un archivo. Una regla que gobierna una sola línea se queda al lado de esa línea. Las de acá no tienen dónde vivir en el código, y por eso se estaban explicando de nuevo en cada lugar que las obedece.

Cuando una regla se puede escribir como código, se escribe como código y no acá. `dentroDe()` es la regla de los eventos hecha función. `revisar.mjs` es la del ámbito hecha chequeo. De una función nadie se olvida.

**El texto es el tema**

No hay estado escondido en la interfaz. Todo lo que cambia cómo suena está escrito en la hoja, con palabras del idioma. Callar una parte es escribir `callado`, no prender un interruptor. Si mandás el enlace, del otro lado suena igual.

Los puntitos del margen y el ▾ escriben en el texto en vez de guardar algo aparte. Y cualquier control nuevo hace lo mismo, o no entra.

Palabras para lo que suena, un signo para lo que no. Todo renglón que hace sonar algo se escribe con palabras del idioma. Los cuatro signos viven adentro de una secuencia de pasos, y los cuatro dicen algo musical. El `@` que apunta a otro documento y el `*` de un apunte son las excepciones: no suenan, y por eso no son palabras. Se ve de un vistazo que ese renglón no es música.

**Los cuatro colores**

El color no decora. Cada canal dice una cosa y sólo una.

La rueda dice quién toca. El tono es la familia, dieciocho cada veinte grados. La luz es el instrumento, repartida entre los que suenan en el tema. Vive en `color.js`.

La tinta de la página dice lo que el tema dice: el tempo, las secciones, la forma. Es `--texto`.

La tinta del tema dice de qué tema estamos hablando: su nombre, su lista, su enlace. Es `--marca-tinta`.

El rojo pleno dice que esto no se entiende. Es `--mal`, con la croma al máximo que entra en pantalla.

**La rueda**

Está escrita a mano y no salida de un orden cualquiera. El color tiene que querer decir algo: el bronce dorado, las cañas en el oliva de la madera, la flauta en el aire, las cuerdas frotadas en el azul frío.

Las nueve familias que de verdad conviven en un tema caen en los lugares pares, a cuarenta grados unas de otras. Con un paso áureo, percusión y bajos quedaban a doce grados, y la batería y el bajo salían del mismo verde. Las otras nueve van en el medio, al lado del pariente que les toca.

Esos cuarenta grados son el techo y no una holgura, y reordenar la rueda no los levanta. Ocho familias que conviven todas con todas no se pueden repartir el círculo mejor que a cuarenta y cinco. Es un doce por ciento de distancia a cambio de mandar el bajo al verde. El otro eje es el que compra.

Adentro de una familia manda la luz, y el lugar de cada instrumento sale de los que suenan en el tema y no del catálogo. Dos violas del catálogo son dos casilleros pegados de los ocho que tiene la familia. Las dos que hay en el tema se van a las dos puntas de la banda.

Ése era el problema grande de la rueda, y no el que parecía. En cuatro de los seis temas de la casa el par más parecido era de una misma familia. El peor, un pizzicato y un timbal, caía abajo del umbral de «el mismo color a simple vista».

La banda vale por su largo: de ese largo salen las distancias de adentro de una familia. Pero se estira sólo hasta donde no cambia lo que el modo es. De noche la cinta tiene que seguir siendo fondo, y más arriba pasaba a estar adelante. Estirarla de más tampoco compra, porque el piso queda igual. El trabajo lo hace repartir la luz.

**Dos trabajos, cuatro bandas**

El color de una parte hace dos cosas que piden lo contrario: teñir una franja ancha en el borde, y leerse como texto de dieciséis píxeles. Con una sola rampa uno de los dos siempre salía mal. El nombre de una parte llegaba a dos de contraste contra la hoja, y eso no es poco contraste, es no estar.

Así que la banda se parte por trabajo y no por modo: trama y tinta, cada una con su versión de día y de noche. La tinta se da vuelta entera entre modos, porque contra un fondo oscuro el texto tiene que subir mucho más que una franja. Las dos quedan del lado de acá de la tinta de la página. El nombre de una parte es texto de color, nunca un subrayado fluorescente.

Entre los dos modos la diferencia no la puede hacer la luz sola. Las dos bandas ya usan todo el recorrido que el contraste permite, y correrlas dejaría una punta contra su fondo. La hace también la croma, que sale gratis. De día la rueda va más clara y desaturada, tinta sobre papel. De noche más profunda y saturada, luz sobre vidrio. Son dos medios distintos, no el mismo pigmento con otro fondo atrás.

Cada una de estas cuatro ya se cobró una discusión.

Una sección no toca, así que no le toca ningún tono de la rueda. Es un tramo de tiempo y va en tinta de página. Lo mismo el tempo y la forma.

`--marca-tinta` no es el color del tema en abstracto: sale del primer instrumento escrito. Teñir con él algo que no es del tema como archivo lo tiñe, en los hechos, del color de la bata.

El error se distingue por saturación y no por tono. La rueda ocupa el círculo entero, así que no queda ningún rojo libre: el carmín que había era el mismo color que el agogó a simple vista. Lo que sí queda libre es la croma, porque la rueda está clavada en dos valores. El error se va al máximo que entra en pantalla y pasa a ser lo único plenamente saturado, y eso lo aleja al doble sin tocarle el tono. Lleva además el subrayado ondulado, que no lo tiene ninguna otra cosa.

El mismo objeto lleva el mismo color en todas las superficies. Una parte es del mismo color en su nombre, en su puntito del margen y en su franja de la cinta. Si dos superficies discrepan, una de las dos está mal.

**El espejo mide contra el textarea**

`#hl` es una copia glifo a glifo de `#src`, pintada abajo. Nada que corra el avance del texto puede tocar un token: ni `letter-spacing`, ni versalitas, ni márgenes, ni otro interlineado. Un solo píxel de corrimiento y las líneas largas cortan en distinto lugar en cada capa.

Quedan libres el color y el peso, que en monoespaciada no mueven una letra. Toda la jerarquía que se pueda escribir adentro del editor sale de esos dos. Lo que necesite geometría vive afuera del espejo, flotando y medido contra el rect del token. Así están los puntitos, el ▾ y el de deshacer.

**Qué se puede seleccionar**

Se selecciona lo que dice algo: el tema, su nombre, el error que explica por qué no suena. No se selecciona lo que hace algo: botones, menús. Un control resaltado no es un control elegido, es un control con una mancha encima.

El espejo se excluye por otro motivo. Es el mismo texto del tema pintado abajo del textarea, así que seleccionarlo es seleccionar una copia: un resaltado que no tiñe la parte, que el botón de la selección no ve y que el textarea no copia. Se lee el espejo, pero se agarra el textarea.

**Lo que cuelga de una palabra**

El ▾, el de deshacer y el de la selección son botones de verdad que flotan por encima del texto. No son dibujos del css ni nada metido adentro del renglón, porque ahí no podrían medir más que el espacio entre dos palabras. Se ubican a mano contra el rect de su palabra, y por eso pueden quedarse quietos mientras el menú que abrieron sigue abierto.

Los que salen de la misma palabra se sueldan de costado y se leen como una sola pieza. La fila se rehace entera y no de a uno. El ▾ aparece y desaparece con el mouse, y el lugar que le toca al de deshacer cambia sin que éste se entere.

**El nombre es la identidad**

Dos temas con el mismo nombre son el mismo tema. Renombrar mueve la entrada y no deja una nueva. Si no, tecleando un nombre quedaría una por cada letra. Irse a otro tema no borra el que se deja atrás.

Una hoja que persiste tiene nombre. Si al irse no lo tiene y hay algo escrito, la casa la bautiza «sin título», o «sin título 2», y entra en la lista. Irse es cambiar de tema o cerrar la pestaña. La hoja de bienvenida sin tocar no cuenta.

Dos pestañas con el mismo tema se pisan una a la otra: la última que guarda gana. Es el precio de no tener un servidor.

Ningún gesto pisa un texto distinto con el mismo nombre. Renombrar encima de otro pone el campo en rojo y la hoja sigue guardada con el nombre de antes, hasta que el campo diga uno libre. Lo que llega por enlace o por archivo y choca con uno tuyo distinto queda como «nombre 2», y el cajón lo dice. Con el mismo texto no hay choque: es el mismo tema.

Un tema vacío no está en la lista. Seguir un `@` a un tema que no existe abre la hoja con ese nombre, y recién se guarda cuando hay algo escrito.

Borrar se deshace. El aviso del cajón trae el botón para volverlo, y dura hasta la tecla que sigue.

De ahí sale algo que parece un error y no lo es. Si abriste un ejemplo y lo tocaste, el guardado te dejó una copia con ese nombre, y la lista muestra las dos filas. Son el mismo tema. La marca de abierto va en la tuya, que es la que se escribe en cada tecla. La del ejemplo queda limpia, porque es la manera de volver a cómo venía.

Dos nombres que se leen igual son el mismo: `Canción` y `cancion`. Todo lo que compare nombres pasa por `claveTema()`.

El historial es de la hoja. Deshacer nunca cruza de tema. Cambiar de tema guarda el historial de la hoja que se deja y levanta el del tema que llega. Renombrar no lo mueve, porque la hoja es la misma. Si no, un ⌘Z después de abrir otro tema traía el texto del anterior con el nombre del nuevo, y el guardado lo escribía así.

La pestaña dice el nombre, o la página sola mientras no tenga. «Sin título» es lo que dice un campo vacío, no un nombre que convenga dejar escrito en un marcador. Con el icono son las dos maneras de contestar cuál de los chanchanes abiertos es éste: una por nombre, la otra por color.

**Toda edición es un paso**

Un paso dice en qué posición se sacó qué texto y se puso cuál. Se aplica, se invierte, corre las posiciones ajenas, y viaja como json. Vive en `cambios.js`, que no sabe nada del editor.

Todo lo que cambia el texto entra por `aplicar()`, en `editor.js`: el cursor se pone o se mapea, el historial anota, la hoja se actualiza. El tecleo no se intercepta: lo que el textarea cambió se mide contra el texto de antes y sale un paso igual. Nada escribe el textarea por su cuenta, salvo cargar un tema, que no es una edición.

El historial guarda pasos y no fotos. Un grupo es lo que un ⌘Z deshace. El tecleo sigue en el mismo grupo mientras haya pasado poco tiempo y toque lo que el grupo dejó puesto: un click lejos abre grupo aunque no haya pasado el plazo. Un gesto del menú es su propio grupo. Cada grupo guarda dónde estaba el cursor antes, y al deshacer vuelve ahí; rehacer vuelve adonde se apretó ⌘Z. Cuando llegue un cambio ajeno, será un paso más por la misma puerta.

Lo que guarda una posición no se rebusca: se corre. Cada archivo anota en `alCambiar` cómo mueve lo suyo con los pasos, sobre el texto de antes, que es donde valen sus posiciones: el ▾ y el de deshacer siguen a su palabra, la selección a sus tokens, la franja a su renglón, el arrastre al token que va cambiando de largo. Lo que cae adentro de lo que se sacó, se va. Un panel abierto no se corre: se cierra, porque sus opciones ya no valen.

**Un renglón se lee una vez**

`leerRenglon()`, en `renglon.js`, dice qué clase de renglón es y dónde está cada pedazo: el apunte y su enlace, la sección, el tempo y su número, la parte con su artículo, su sujeto, su verbo y sus cláusulas. Nunca falla, ni con un renglón a medio escribir. El traductor lo toma y valida y traduce; el sugeridor le pregunta en qué pedazo cae el cursor; los puntitos buscan la marca de «callado» que dejó el traductor. Nadie vuelve a partir un renglón por su cuenta.

**Las teclas y las órdenes**

Nadie escucha el teclado por su cuenta. Cada archivo anota sus atajos en `teclado.js` con `atajo(tecla, nombre, orden)`, y un solo despachador los recorre en el orden en que se anotaron: el primero que contesta gana. `Mod` es ⌘ en Mac y ctrl en el resto, y `Meta-Enter` no es `Enter`. Cada atajo lleva su nombre, así la tabla puede mostrarse; hoy sólo se muestra en el título del botón de tocar.

Una orden es una función que recibe si tiene que hacerlo. Sin hacerlo, sólo contesta si aplica; con hacerlo, lo hace y contesta lo mismo. Así se encadenan varias en una tecla, y el menú pinta en gris lo que no entra antes de que alguien lo apriete. Cerrar un panel no es contestar la tecla: la tecla sigue su camino.

**Las reglas de entrada**

Lo que el editor transforma al vuelo mientras se tipea, en `reglas.js`, se puede devolver con una tecla: Backspace justo después trae lo que se había tipeado, y nada más. Vale para aceptar una sugerencia y para `do#`, que se vuelve `do sostenido`. Cualquier otro cambio, o mover el cursor, olvida la regla. Ninguna regla corre en medio de una composición, que es cómo entra una tilde.

**Las secciones se mueven escribiendo renglones**

Una sección es posicional: un renglón es de la última sección abierta arriba. Por eso mover un renglón es reordenar renglones, y cruzar un encabezado lo cambia de sección solo. Las órdenes de estructura viven en `secciones.js`: subir, bajar y duplicar con la selección, llevar o copiar un renglón a otra sección desde el ▾ de su nombre, abrir una sección arriba, y desde el ▾ del encabezado seleccionar la sección o unirla con la anterior. Todas escriben renglones, todas devuelven falso en los bordes, y ninguna toca la forma: si un nombre queda sin sección, el rojo lo dice.

**Sin red**

`sw.js` es un service worker: no es un script de la página y no entra en el ámbito ni en el chequeador. Al instalarse guarda la cáscara, el html, el css, los scripts, la tipografía y strudel, y después guarda lo que baja a medida que baja, las muestras incluidas. Con red se va a la red, así una versión nueva llega en la carga siguiente sin versionar nada a mano; sin red, sirve lo guardado. Suena lo que ya se escuchó, y los osciladores, que no bajan nada. Desde `file://` no hay worker y todo anda como siempre.

Los íconos son el logo en tinta sobre papel, dibujado por el mismo canvas que pinta la pestaña y guardado en png porque iOS no toma otra cosa. `manifest.webmanifest` es lo que hace que el teléfono ofrezca ponerlo en la pantalla de inicio.

**El error trae su arreglo cuando lo hay**

Un error que se arregla de una sola manera lleva el arreglo puesto: qué tramo del renglón se cambia por qué. Lo pone el traductor, que es el que sabe; el cajón lo ofrece como un botón al lado del mensaje, y el ▾ de la palabra en rojo ofrece el mismo. Tocarlo es un paso como cualquier otro, con su deshacer. Los que se arreglan de más de una manera, «muy» sin altura, una nota que falta, un tempo fuera de rango, no traen botón: el mensaje es la respuesta.

**La cinta se lee, el margen escribe**

La cinta de arriba es el tema visto de lejos. Las franjas son las voces y salen de la rueda. La regla de vueltas, los cortes de sección, la aguja y el anillo son tiempo, y van en tinta de página.

Se le puede preguntar de quién es una franja pasándole por encima, pero no escribe en el documento. Está dibujada detrás de todo y ocupa el borde entero de la ventana. Un click suyo sería un click en el fondo de la página que cambia el texto sin que se vea dónde. Callar es del puntito del margen, que es un botón, mide veintidós píxeles y está al lado del renglón que cambia.

**El patrón espejo**

Cada renglón lleva, además de su código, un patrón gemelo donde cada paso es su propio número. Preguntarle a strudel en vez de contar a mano es lo que hace que la cinta y el realce muestren lo que de verdad va a sonar: lo que estira, lo que acelera, el pulso de «en corcheas», las vueltas que el arreglo saltea. Ninguna de esas cuentas se rehace de este lado.

Lo arma `traductor.js`. Lo evalúa `editor.js` una vez por línea. `cinta.js` le pide los golpes de la vuelta larga, y `reloj.js` le pregunta a cada cuadro qué paso cae justo ahora.

**El tempo es del reloj**

No vive en el patrón. Por eso un tema que acelera se le va diciendo al reloj al cruzar cada borde de sección. Y por eso el número se puede arrastrar mientras suena: volver a evaluar cambiaría el tema recién en el borde de la vuelta.

**Ciento treinta y tres instrumentos no entran en una lista**

Apilados son nueve pantallas y media. Donde se eligen por el ▾ van en dos columnas: las familias a la izquierda, la elegida a la derecha. En el sugeridor no aparecen sin prefijo. Sin nada tipeado van sólo los arranques de siempre.

Cualquier cosa que recorra la lista entera corre en cada cuadro del hover. Así que se pregunta primero por el tipo del token, y recién después se arma el menú.

**Un solo ámbito**

Los scripts de `js/` son scripts comunes, no módulos. Comparten un ámbito, y el orden de `index.html` es el orden en que cargan.

Lo que ese orden garantiza es lo que pasa al cargar: una línea de primer nivel sólo puede nombrar lo que ya cargó. Lo que pasa después anda igual. Una función puede llamar a otra de un archivo que carga más tarde, y `actualizar()` lo hace a propósito: es la que orquesta, y llama a la cinta, al reloj y a los puntitos, que vienen después.

De ahí las cuatro reglas que revisa `node .claude/revisar.mjs`. Ninguna se ve a simple vista, y el navegador no dice cuál es la otra mitad del choque.

Dos declaraciones con el mismo nombre en archivos distintos tiran la página entera.

Una variable se escribe sólo desde el archivo que la declara. Es su dueño, y los demás la leen.

Una local no se llama como un global. Borrar la local caería en silencio sobre el otro.

Nada de primer nivel nombra lo que todavía no cargó.

Un helper que usen dos archivos va en el que carga primero de los dos.

**Los dibujos**

Van en un sprite de `<symbol>` adentro de `index.html`, y cada lugar los apunta con `<use>`. Ni una webfont de iconos ni un `.svg` aparte. La webfont es texto, y hasta que baja el botón muestra la palabra que iba a dibujar. El archivo aparte es otro pedido de red para lo mismo.

Los de trazo son de Lucide, dibujados en grilla de veinticuatro. De ahí sale el trazo de `.i`: a dieciséis píxeles un trazo de dos cae en uno y un tercio y se ve blando, y dos y cuarto lo deja en uno y medio. Los chicos van a doce y por eso llevan tres. La línea tiene que caer en el mismo uno y medio, no en el mismo número. Un dibujo de otra librería con otra grilla obliga a rehacer esa cuenta.

El enlace y el «papel o tinta» son de acá. Ninguna librería tiene la segunda: todas resuelven claro y oscuro con un sol y una luna, que es otra metáfora.

**El de la pestaña**

Es el único que no puede vivir en el sprite, porque `rel="icon"` no toma un fragmento. Tampoco es un archivo. Va escrito adentro del `href`, en `data:`, que es la manera de que siga sin haber un pedido de red por un dibujo.

Es el logo, con los dos colores del tema abierto sobre el papel de la página: la primera parte arriba, la última abajo, como en la cabecera. Así la pestaña dice qué tema está abierto y no sólo qué página es. Lo redibuja `pintarMarca()`, que es la que ya pinta la marca en las otras superficies. Sin tema, en la tinta de la página.

Va a png por un canvas y no a svg. Un svg de pestaña no carga la tipografía, y el logo es la tipografía. Hasta que Antonio baja se dibuja con la de reserva, y cuando llega se vuelve a pintar.

Lo que el html trae escrito a mano es lo único que se ve sin js, en el marcador y en la vista previa: el mismo logo en una tinta neutra, con la tipografía que haya.

La aguja no entra ahí. El navegador frena los cuadros de las pestañas de atrás, así que una aguja en el icono miente sobre dónde está el tema.

**Los eventos, desde que los botones tienen dibujos adentro**

Un click sobre un botón con un `<svg>` adentro tiene como blanco el `<svg>`, no el `<button>`. Cualquier pregunta del tipo «esto pasó adentro de tal control» va por `dentroDe()` y nunca por identidad.

Comparar por identidad da «afuera» justo encima del botón. El síntoma es que el panel se cierra en el mismo click que lo abre, o que el ▾ parpadea, y no señala la causa. Lo mismo vale para `relatedTarget`.
