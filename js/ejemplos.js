// ------------------------------------------------------------------ los temas
// Generado. No se edita acá: cada tema es un archivo en temas/, y el nombre del
// tema es el nombre del archivo. Después de tocar uno:
//
//     node .claude/temas.mjs
//
// Existe porque la página tiene que andar abriendo index.html a mano, sin
// servidor, y desde file:// no se puede ir a buscar un archivo. El orden y las
// notas de cada tema salen de temas/orden.txt.
const EJEMPLOS = [
  // ejemplos/Charly Garcia.mid — Los Dinosaurios, 1983. Dos pistas, piano y
  // cuerdas: no hay batería en el midi y acá tampoco, que es como está el archivo.
  // La forma sale de mirar los acordes compás por compás — do séptima, re menor, si
  // bemol, do séptima— y en el medio la bajada si bemol · la · la bemol · sol, que
  // es lo que hace el tema.
  { nombre: "los dinosaurios", txt:
`va a 90

la estrofa:
el piano toca mi grave re sol grave re sol grave do grave mi grave do grave | fa grave re si bemol grave re si bemol grave re grave fa grave re grave | fa grave do do si bemol muy grave fa grave do do si bemol muy grave | mi grave re sol grave re sol grave do grave mi grave do grave
el bajo toca do muy grave | re muy grave | si bemol muy grave si bemol muy grave | do muy grave
las cuerdas tocan do séptima | re menor | si bemol mayor | do séptima, bajito, con eco

el puente:
el piano toca fa grave do do si bemol muy grave fa grave do do si bemol muy grave | mi grave do la grave mi do la grave mi do | sol grave mi bemol do mi bemol sol grave mi bemol do mi bemol | re grave do fa grave do re grave si grave fa grave si grave
el bajo toca si bemol muy grave | la muy grave | la bemol muy grave la bemol muy grave | sol muy grave sol muy grave
las cuerdas tocan si bemol mayor | la menor | la bemol séptima | sol séptima, bajito, con eco

el final:
el piano toca sol mi bemol sol grave re si bemol grave fa grave re _ | si bemol grave fa grave si bemol grave si bemol muy grave fa grave si bemol grave re si bemol grave | fa grave re si bemol grave fa re la grave sol _ | si bemol grave re sol re si bemol grave sol muy grave si bemol grave re | sol re si bemol grave - - - - -
el bajo toca fa muy grave si bemol muy grave | si bemol muy grave | - - re muy grave sol muy grave | sol muy grave | sol muy grave
las cuerdas tocan si bemol séptima | si bemol mayor | sol séptima | sol menor | si bemol mayor, bajito, con eco

el tema va estrofa estrofa puente estrofa final` },

  // ejemplos/Patricio Rey.mid. La estrofa es re · mi · do sostenido · re con el la
  // de pedal abajo, y el estribillo se va a fa · do · si bemol · re en corcheas
  // parejas, que es de donde sale el envión. El riff de la viola de arriba está nota
  // por nota, tal como viene en la pista «solo».
  { nombre: "ricotero", txt:
`va a 85

la entrada:
la bata toca pum pum pum pum pum pum pum pum
el bajo toca re muy grave re muy grave re muy grave re muy grave re muy grave - - -

la estrofa:
la bata toca pum tas pum tas pum tas pum tas
el bajo toca re muy grave _ - la muy grave re muy grave _ - la muy grave | mi muy grave _ - la muy grave mi muy grave _ - la muy grave | do sostenido muy grave _ - la muy grave do sostenido muy grave _ - la muy grave | re muy grave _ - la muy grave re muy grave _ - la muy grave
la viola eléctrica toca la la la sol mi re _ re | re do sostenido re mi _ - sol fa | sol sol fa sol sol fa sol mi | do sostenido mi fa re re la grave mi sol
la viola distorsionada toca re menor | mi menor | do sostenido disminuido | re menor, bajito

el estribillo:
la bata toca pum tas pum tas pum tas pum tas
el bajo toca fa muy grave | do muy grave | si bemol muy grave | re muy grave, en corcheas
la viola distorsionada toca fa quinta | do quinta | si bemol quinta | re quinta, en corcheas

el final:
la bata toca pum tas pum tas pum tas pum tas
el bajo toca si bemol muy grave | fa muy grave | sol muy grave | la muy grave, en corcheas
la viola distorsionada toca si bemol quinta | fa quinta | sol quinta | la quinta, en corcheas

el tema va entrada estrofa estrofa estribillo estribillo final` },

  // ejemplos/Pink Floyd.mid. La entrada es la figura de la doce cuerdas, que en el
  // midi son ocho compases que después vuelven tres veces más: por eso es una
  // sección y no una introducción. La estrofa lleva la voz nota por nota. Tampoco
  // hay batería en el midi.
  { nombre: "a lo floyd", txt:
`va a 62

la entrada:
la viola criolla toca mi grave re sol sol sol grave sol sol grave mi grave | re grave sol sol grave sol sol sol muy grave si muy grave re grave | mi grave re sol sol sol mi grave sol grave mi grave | re grave sol sol grave sol sol sol muy grave si muy grave re grave | mi grave sol sol sol sol mi grave re grave si muy grave | la muy grave mi grave sol sol - sol si muy grave re grave | mi grave sol sol sol sol mi grave re grave si muy grave | la muy grave mi grave sol la muy grave sol mi grave re re

la estrofa:
la viola criolla toca do grave | fa sostenido muy grave | la muy grave mi muy grave mi muy grave la muy grave | sol muy grave | fa sostenido muy grave fa sostenido muy grave fa sostenido muy grave la muy grave | do grave | la muy grave | sol muy grave
la voz toca - do sol grave - - do do la grave | fa grave _ - - - - re re sostenido | mi si grave - - - mi mi re | re _ - - - do do sol grave | la grave re grave - - re re re si grave | do sol grave mi grave - - re re do | do - - - - do do sol grave | sol grave - - - - do re mi, en un solista voz, con eco
el piano toca do mayor | fa sostenido menor | mi séptima | sol mayor | fa sostenido menor | do mayor | la menor | sol mayor, bajito, con eco

el tema va entrada estrofa estrofa entrada estrofa entrada` },

  // ejemplos/Babasonicos.mid. Cuatro secciones de cuatro compases cada una y todas
  // sobre la misma vuelta de la menor: lo que cambia es por dónde entra el bajo. En
  // la estrofa llega tarde y arrastra; en el estribillo va en corcheas parejas y el
  // tema se para. La bata es la misma en todas y por eso está escrita una vez sola,
  // arriba de la primera sección.
  { nombre: "a lo babasónicos", txt:
`va a 110

la bata toca pum - chis chis tas chis pum - - - tas - chis chis chis -

la entrada:
el bajo toca fa muy grave _ - fa muy grave _ _ _ fa muy grave | re muy grave _ _ _ _ _ - re muy grave | do muy grave _ _ _ _ _ - do muy grave | do muy grave _ _ _ - - do muy grave _
el piano toca fa séptima | la menor | sol mayor | sol menor, bajito, con eco

la estrofa:
el bajo toca la muy grave _ _ _ _ _ - - | do muy grave do muy grave _ _ _ _ _ - | fa muy grave | do muy grave _ _ _ _ _ si muy grave _
la viola eléctrica toca - | - | mi _ la mi agudo _ _ la _ | sol _ _ _ do _ si grave _
el piano toca la menor | sol mayor | fa mayor | sol séptima, bajito, con eco

el puente:
el bajo toca fa muy grave fa muy grave - fa muy grave _ _ _ - | mi muy grave mi muy grave - mi muy grave _ _ _ - | la muy grave la muy grave - la muy grave _ _ _ - | do muy grave do muy grave - do muy grave _ _ _ -
el piano toca fa mayor | mi mayor | la menor | sol mayor, bajito, con eco

el estribillo:
el bajo toca fa muy grave fa muy grave fa muy grave fa muy grave fa muy grave sol muy grave sol muy grave do muy grave | fa muy grave fa muy grave fa muy grave fa muy grave fa muy grave sol muy grave sol muy grave do muy grave | do muy grave do muy grave do muy grave do grave do grave sol muy grave do muy grave do muy grave | do muy grave do muy grave do muy grave do grave do grave sol muy grave do muy grave _
la viola distorsionada toca fa séptima | fa séptima | do quinta | do quinta, en corcheas
el piano toca fa séptima | fa séptima | do mayor | do mayor, bajito, con eco

el tema va entrada estrofa estrofa puente estribillo estrofa puente estribillo estribillo` },

  // ejemplos/Orff Carl.mid — O Fortuna, de Carmina Burana, 1936. Dominio público, y
  // el único que se pudo cotejar de verdad: la melodía del coro es la que se
  // reconoce. Acá no hay esqueleto, está el coro nota por nota. Necesita las cuatro
  // cosas juntas —secciones, compases y un tempo por sección—, porque Orff lo
  // escribió con siete cambios de pulso: arranca en 130, se va a 264 para el susurro
  // de «semper crescis», empuja a 280 cuando el coro lo repite una octava arriba, y
  // cierra en 120. El compás es de 3/2 y acá no hace falta decirlo: la vuelta no
  // mide nada por su cuenta, la miden los pasos que le caben, así que se acomoda
  // eligiendo el tempo.
  { nombre: "o fortuna", txt:
`va a 130

la entrada:
el coro toca - mi agudo | _ fa agudo | re agudo re agudo | - mi agudo | _ fa agudo | re agudo re agudo | - la agudo | _ sol agudo | la agudo sol agudo | sol agudo fa agudo | mi agudo _ | - -, fuerte
la tuba toca re muy grave | do muy grave | si bemol muy grave | re muy grave | do muy grave | si bemol muy grave | la muy grave | la muy grave | - | - | - | -, fuerte
los timbales tocan re grave _ re grave _ | re grave _ re grave _ | re grave _ re grave _ | re grave _ re grave _ | re grave _ re grave _ | re grave _ re grave _ | la muy grave - - - | la muy grave la muy grave la muy grave la muy grave | la muy grave la muy grave la muy grave la muy grave | la muy grave la muy grave la muy grave la muy grave | la muy grave la muy grave la muy grave la muy grave | la muy grave la muy grave la muy grave la muy grave
las cuerdas tocan re menor | do mayor | si bemol mayor | re menor | do mayor | si bemol mayor | la mayor | la mayor | la mayor | la mayor | la mayor | -, bajito

el susurro:
va a 264
el coro toca - fa | fa mi | mi - | - fa | fa mi | mi - | - fa | fa mi | fa _ | sol _ | fa mi | _ _, bajito
las cuerdas tocan fa quinta | mi quinta | mi quinta | fa quinta | mi quinta | mi quinta | fa quinta | mi quinta | fa quinta | sol quinta | mi quinta | -, bajito
los timbales tocan re grave - - - | - - - - | - - - - | re grave - - - | - - - - | - - - - | re grave - - - | - - - - | re grave - - - | sol grave - - - | mi grave - - - | - - - -, bajito

el crece:
va a 280
el coro toca - fa agudo | fa agudo mi agudo | mi agudo - | - fa agudo | fa agudo mi agudo | mi agudo - | - fa agudo | fa agudo mi agudo | fa agudo _ | sol agudo _ | fa agudo mi agudo | _ _, fuerte
las cuerdas tocan fa quinta | mi quinta | mi quinta | fa quinta | mi quinta | mi quinta | fa quinta | mi quinta | fa quinta | sol quinta | mi quinta | -
los timbales tocan re grave - re grave - | re grave - re grave - | re grave - re grave - | re grave - re grave - | re grave - re grave - | re grave - re grave - | re grave - re grave - | re grave - re grave - | re grave - re grave - | sol grave - sol grave - | mi grave - mi grave - | - - - -

el final:
va a 120
el coro toca re grave fa grave | mi grave re grave | sol grave fa grave | mi grave la grave | sol grave sol grave | sol grave mi grave | re grave re grave | fa grave mi grave | re grave sol grave | - - | - - | - -, fuerte
la tuba toca re muy grave | do muy grave | si bemol muy grave | la muy grave | sol muy grave | mi muy grave | re muy grave | la muy grave | re muy grave | - | - | -, fuerte
los timbales tocan re grave re grave re grave re grave | re grave re grave re grave re grave | re grave re grave re grave re grave | la muy grave la muy grave la muy grave la muy grave | la muy grave la muy grave la muy grave la muy grave | la muy grave la muy grave la muy grave la muy grave | re grave re grave re grave re grave | la muy grave la muy grave la muy grave la muy grave | re grave - - - | - - - - | - - - - | - - - -
las cuerdas tocan re menor | do mayor | si bemol mayor | la mayor | sol menor | mi disminuido | re menor | la mayor | re menor | - | - | -, fuerte

el tema va entrada susurro crece final` },

  // ejemplos/Grieg.mid — «En la gruta del rey de la montaña», 1875. Dominio público.
  // El midi tiene el tema en mi menor y lo va subiendo: primero abajo, después la
  // frase una tercera arriba, después esa misma una octava más arriba. Grieg lo
  // escribió para que se vaya acelerando y el midi lo hace en cinco escalones; acá
  // son cuatro, uno por sección, que es para lo que sirve el tempo por sección.
  { nombre: "la gruta", txt:
`va a 130

el tema:
la melodía toca mi fa sostenido sol la | si sol si _ | la sostenido fa sostenido la sostenido - | la fa la _ | mi fa sostenido sol la | si sol si mi agudo | re agudo si sol si | re agudo _ - -, en pizzicato
el contrabajo toca mi grave | si muy grave | la sostenido muy grave | la muy grave | mi grave | si muy grave | re grave | re grave, bajito
los timbales tocan mi muy grave - - -, bajito

el arriba:
va a 165
la melodía toca do sostenido re sostenido mi fa sostenido | re sostenido fa sostenido _ sol | re sostenido sol _ fa sostenido | re sostenido fa sostenido _ si grave | do sostenido re sostenido mi fa sostenido | re sostenido fa sostenido _ sol | re sostenido sol _ fa sostenido | - si grave do sostenido agudo re sostenido agudo, en pizzicato
el contrabajo toca do sostenido grave | re sostenido grave | re sostenido grave | si muy grave | do sostenido grave | re sostenido grave | re sostenido grave | si muy grave, bajito
los timbales tocan mi muy grave - - -, bajito

la cumbre:
va a 190
la melodía toca mi agudo fa sostenido agudo re sostenido agudo fa sostenido agudo | - sol agudo re sostenido agudo sol agudo | - fa sostenido agudo re sostenido agudo fa sostenido agudo | - si do sostenido agudo re sostenido agudo | mi agudo fa sostenido agudo re sostenido agudo fa sostenido agudo | - sol agudo re sostenido agudo sol agudo | - fa sostenido agudo - - | - - - -, en pizzicato, fuerte
el contrabajo toca mi grave | sol grave | re sostenido grave | si muy grave | mi grave | sol grave | re sostenido grave | si muy grave
los timbales tocan mi muy grave - mi muy grave -

el final:
va a 220
la melodía toca sol si - la sostenido | fa sostenido la sostenido - la | fa la - mi | fa sostenido sol si sol | si mi agudo re agudo si | sol si re agudo re | si _ - - | si mi agudo fa sostenido agudo sol agudo, fuerte
el contrabajo toca sol grave | fa sostenido grave | fa grave | mi grave | mi grave | sol grave | si muy grave | mi grave, fuerte
los timbales tocan mi muy grave mi muy grave mi muy grave mi muy grave

el tema va tema tema arriba cumbre final` },
];
