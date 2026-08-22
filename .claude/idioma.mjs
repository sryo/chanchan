// IDIOMA.md sale de las tablas del vocabulario, así nunca queda viejo; el texto
// de alrededor está acá, escrito para personas: sin nombres internos ni strudel.
//   node .claude/idioma.mjs          escribe IDIOMA.md
//   node .claude/idioma.mjs --ver    dice si quedó viejo, sin tocar nada
import { readFileSync, writeFileSync } from 'node:fs';
import { runInContext, createContext } from 'node:vm';

const raiz = new URL('../', import.meta.url);
const leer = f => readFileSync(new URL(f, raiz), 'utf8');
const ctx = createContext({ console });
for (const f of ['texto', 'vocabulario']) runInContext(leer('js/' + f + '.js'), ctx, { filename: f + '.js' });
const V = n => runInContext(n, ctx);

const SONIDOS = V('SONIDOS'), OCTAVAS = V('OCTAVAS'), MODIFICADORES = V('MODIFICADORES'), FIGURAS = V('FIGURAS');
const VECES = V('VECES'), ARREGLOS = V('ARREGLOS'), EUCLIDES = V('EUCLIDES'), FAMILIAS = V('FAMILIAS');
const SIN_GM = V('SIN_GM'), ALIAS = V('ALIAS'), ALIAS_MAQUINA = V('ALIAS_MAQUINA'), NUMEROS = V('NUMEROS');
const fraseArreglo = V('fraseArreglo'), fraseEuclides = V('fraseEuclides');
const VUELTAS_MAX = V('VUELTAS_MAX'), VUELTAS_FORMA = V('VUELTAS_FORMA'), TEMPO_MIN = V('TEMPO_MIN'), TEMPO_MAX = V('TEMPO_MAX');

const ACORDES_GLOSA = {
  mayor: 'el acorde de siempre', menor: 'el triste', quinta: 'dos notas, como una viola distorsionada',
  séptima: 'el del blues', disminuido: 'el tenso',
};
const codigo = s => '`' + s + '`';
const lista = xs => xs.map(x => '- ' + x).join('\n');
const alturas = Object.entries(OCTAVAS).sort((a, b) => a[1] - b[1]).map(([n]) => n);

const md = `# el idioma

Un tema es una hoja de texto. Cada renglón dice quién toca qué, o cómo se arma el
tema. Esto es todo lo que se puede escribir.

## una parte

    la bata toca pum tas pum tas
    el bajo toca do - sol -, bajito
    las cuerdas tocan do mayor | fa mayor, en corcheas, con eco

Quién toca (cualquier nombre: ${codigo('la bata')}, ${codigo('el bajo')}, ${codigo('la melodía')},
${codigo('las cuerdas tocan')}), después ${codigo('toca')}, después los pasos, y después de
una coma, cómo. Si el nombre es un instrumento de la lista de abajo, suena con
ese instrumento; si no, con piano.

Los pasos se reparten parejo en la vuelta: cuatro pasos son negras, ocho son
corcheas, tres son un vals. Una vuelta son cuatro tiempos al tempo del tema.

### los pasos

Golpes, para la batería:

${lista(Object.entries(SONIDOS).map(([w, [, d]]) => codigo(w) + ' ' + d))}

Notas: ${codigo('do re mi fa sol la si')}, con ${codigo('sostenido')} o ${codigo('bemol')} después. La altura
va después de la nota: ${alturas.slice(0, 2).map(codigo).join(', ')}, nada (la del medio), ${alturas.slice(2).map(codigo).join(', ')}.
Acordes, con el nombre después de la nota:

${lista(Object.keys(ACORDES_GLOSA).map(a => codigo('do ' + a) + ' ' + ACORDES_GLOSA[a]))}

Y tres signos: ${codigo('-')} es un silencio, ${codigo('_')} estira el paso anterior, ${codigo('|')} separa
compases — cada compás dura una vuelta, y cada uno reparte sus pasos por su cuenta.

    el piano toca do mayor _ _ _ | fa mayor - fa mayor -

### después de la coma

Con qué: ${codigo('en pizzicato')}, ${codigo('en una viola criolla')}, o para la batería una caja de
ritmos: ${Object.keys(ALIAS_MAQUINA).map(a => codigo('en una ' + a)).join(', ')}, o cualquiera
del pack por marca y modelo (el ▾ las lista).

Cómo suena:

${lista(MODIFICADORES.map(m => codigo(m[0]) + ' ' + m[2]))}

Cada nota, tantas veces por vuelta: ${Object.entries(FIGURAS).map(([f, n]) => codigo('en ' + f) + ' (' + n + ')').join(', ')}.
Sirve para rasguear acordes: ${codigo('do mayor | fa mayor, en corcheas')}.

El reparto: ${codigo('tres en ocho')} pone tres golpes repartidos parejo en ocho pasos.
También ${EUCLIDES.slice(1).map(([n, m]) => codigo(fraseEuclides(n, m))).join(', ')}.

De a ratos: ${codigo('cada dos vueltas al doble')} (dos, tres, cuatro u ocho vueltas), o
${VECES.map(([f, , d]) => codigo(f) + ' (' + d + ')').join(', ')} — seguido de cómo.

Entra y sale: ${ARREGLOS.map(([n, q]) => codigo(fraseArreglo(n, q))).join(', ')}.

Varias cosas después de la coma van separadas por comas:

    la bata toca pum tas pum tas, en una 808, cada cuatro vueltas al doble, bajito

## una sección

    la estrofa:
    la bata toca pum tas pum tas
    el bajo toca do - sol -

    el estribillo dura 8 vueltas:
    el bajo toca fa - do -

Un nombre de una palabra y dos puntos; lo que sigue es de ella. Sin ${codigo('dura')}, la
sección dura lo que tardan sus líneas en volver a caer juntas. Las líneas de
antes de la primera sección suenan en todas.

## la forma

    el tema va estrofa estrofa estribillo estrofa

El orden en que van las secciones, y cuántas veces. Sin esta línea van una vez
cada una, en el orden en que están escritas.

## el tempo

    va a 120

Tiempos por minuto, de ${TEMPO_MIN} a ${TEMPO_MAX}. Adentro de una sección vale para esa
sección: un tema puede acelerar.

## los instrumentos

Por familia. Cualquiera de estos nombres puede ser el nombre de la parte o ir
después de la coma con ${codigo('en')}.

${FAMILIAS.map(([fam, tabla]) => '**' + fam + '**: ' + Object.keys(tabla).join(', ')).join('\n\n')}

**osciladores**: ${Object.keys(SIN_GM).filter(n => SIN_GM[n].fam === 'osciladores').join(', ')} — suenan sin red.

También se entienden ${Object.keys(ALIAS).map(codigo).join(', ')}.

## los números

Se escriben con letras hasta ${NUMEROS[NUMEROS.length - 1]} o con cifras. Los arreglos y el ${codigo('cada')}
llegan hasta ${VUELTAS_MAX} vueltas; una sección, hasta ${VUELTAS_FORMA}.
`;

const destino = new URL('IDIOMA.md', raiz);
if (process.argv.includes('--ver')) {
  let viejo = null;
  try { viejo = readFileSync(destino, 'utf8'); } catch (e) { /* no está */ }
  if (viejo === md) { console.log('IDIOMA.md al día'); process.exit(0); }
  console.error('IDIOMA.md quedó viejo: node .claude/idioma.mjs');
  process.exit(1);
}
writeFileSync(destino, md);
console.log('IDIOMA.md escrito');
