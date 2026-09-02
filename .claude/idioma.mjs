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
const fraseArreglo = V('fraseArreglo'), fraseEuclides = V('fraseEuclides'), ACORDES = V('ACORDES');
const ENVOLTURAS = V('ENVOLTURAS'), enLetras = V('enLetras');
const VUELTAS_MAX = V('VUELTAS_MAX'), VUELTAS_FORMA = V('VUELTAS_FORMA');
const TEMPO_MIN = V('TEMPO_MIN'), TEMPO_MAX = V('TEMPO_MAX'), TIEMPOS_MAX = V('TIEMPOS_MAX');

const ACORDES_GLOSA = {
  mayor: 'el de siempre', menor: 'el triste', quinta: 'dos notas, como una viola distorsionada',
  séptima: 'el del blues', disminuido: 'el tenso',
  'menor séptima': 'el menor con una nota más, el del soul', 'mayor séptima': 'el mayor con una nota más, el de la bossa',
  suspendido: 'ni mayor ni menor, en el aire', aumentado: 'el mayor estirado, el raro',
};
const codigo = s => '`' + s + '`';
// «a, b y c»
const juntar = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];
// dos columnas en texto plano, sangradas como los ejemplos
function columnas(pares) {
  const ancho = Math.max(...pares.map(([a]) => a.length)) + 3;
  return pares.map(([a, b]) => '    ' + a.padEnd(ancho) + b).join('\n');
}
const alturas = Object.entries(OCTAVAS).sort((a, b) => a[1] - b[1]).map(([n]) => n);
const cadas = ENVOLTURAS.map(e => e.match(/^cada (\S+) vueltas$/)).filter(Boolean).map(m => m[1]);
const parejos = ARREGLOS.filter(([n, q]) => n === q), desparejos = ARREGLOS.filter(([n, q]) => n !== q);
const osciladores = Object.keys(SIN_GM).filter(n => SIN_GM[n].fam === 'osciladores');

const md = `# **el idioma**

Un tema es una hoja de texto. Cada renglón dice quién toca qué, o cómo se arma el tema. Con tres renglones ya suena. Lo demás es para cuando haga falta, y esto es todo lo que hay.

**Una parte**

    la bata toca pum pa pum pa

Quién toca, después ${codigo('toca')}, después qué. El nombre es cualquiera: la bata, el bajo, la melodía, las cuerdas tocan. Si el nombre es un instrumento de la lista del final, suena con ése. Si no, con piano.

Los pasos se reparten parejo en la vuelta. Cuatro pasos son negras, ocho son corcheas. Una vuelta son cuatro tiempos, salvo que el tempo diga otra cosa.

**Los golpes**

Para la batería. Se escriben como se cantan.

${columnas(Object.entries(SONIDOS).map(([w, [, d]]) => [w, d]))}

**Las notas**

    el bajo toca do - sol -

Do re mi fa sol la si. Después, si hace falta, ${codigo('sostenido')} o ${codigo('bemol')}. Después la altura: ${alturas.map(codigo).join(', ')}. Sin nada es la del medio.

Una nota lleva una sola alteración, una sola altura y un solo acorde. ${codigo('do sostenido bemol')} no es un do: es un error, y se marca en rojo.

Golpes y notas no van en el mismo renglón. Si la bata y el bajo tocan juntos, son dos renglones.

**Los acordes**

    el piano toca do mayor | fa mayor

El nombre va después de la nota.

${columnas(Object.keys(ACORDES).map(a => ['do ' + a, ACORDES_GLOSA[a] || '']))}

**Los signos**

Son cuatro y viven entre los pasos.

${codigo('-')} es un silencio. ${codigo('_')} estira el paso anterior. ${codigo('|')} separa compases, y cada compás dura una vuelta con sus propios pasos. ${codigo('!')} pegado al paso lo acentúa.

    el piano toca do mayor _ _ _ | fa mayor - fa mayor -
    la bata toca pum! pa pum pa

Un paso que no se entiende suena como silencio, así los otros no se corren de lugar. Queda en rojo hasta que se arregle.

**Después de la coma**

Cómo suena. Varias cosas van separadas por comas, en cualquier orden.

    la bata toca pum pa pum pa, en una 808, cada cuatro vueltas al doble, bajito

**Con qué**

${codigo('en pizzicato')}, ${codigo('en una viola criolla')}. Para la batería, una caja de ritmos: ${Object.keys(ALIAS_MAQUINA).map(a => codigo('en una ' + a)).join(', ')}. O cualquiera del pack, por marca y modelo. El ▾ las lista.

**Cómo suena**

${columnas(MODIFICADORES.map(m => [m[0], m[2]]))}

**Cada nota, tantas veces por vuelta**

${Object.entries(FIGURAS).map(([f, n], i) => codigo('en ' + f) + (i ? ' ' : ' son ') + enLetras(n)).join(', ')}. Sirve para rasguear.

    la viola toca do mayor | fa mayor, en corcheas

**El reparto**

${codigo(fraseEuclides(...EUCLIDES[0]))} pone ${enLetras(EUCLIDES[0][0])} golpes repartidos parejo en ${enLetras(EUCLIDES[0][1])} pasos. También ${juntar(EUCLIDES.slice(1).map(([n, m]) => codigo(fraseEuclides(n, m))))}.

    la bata toca pum, ${fraseEuclides(...EUCLIDES[0])}

**De a ratos**

${codigo('cada ' + cadas[0] + ' vueltas al doble')}, y lo mismo con ${juntar(cadas.slice(1)).replace(/ y (\S+)$/, ' u $1')} vueltas. O sin contar:

${columnas(VECES.map(([f, , d]) => [f, d]))}

Después de cualquiera de éstas va el cómo.

    la bata toca pum pa pum pa, a veces al doble

**Entra y sale**

${parejos.map(([n, q]) => codigo(fraseArreglo(n, q))).join(', ')}. Y desparejo: ${desparejos.map(([n, q]) => codigo(fraseArreglo(n, q))).join(', ')}.

**Lo que se pisa**

Dos frases que dicen lo mismo no van juntas. ${codigo('bajito, fuerte')} es un error. Lo mismo dos instrumentos, dos figuras o dos repartos en el mismo renglón.

Las que se suman sí van. ${codigo('al doble, al doble')} es cuatro veces más rápido, y ${codigo('un tono arriba, medio tono arriba')} es tono y medio.

**Una sección**

    la estrofa:
    la bata toca pum pa pum pa
    el bajo toca do - sol -

    el estribillo dura 8 vueltas:
    el bajo toca fa - do -

Un nombre de una palabra y dos puntos. Lo que sigue es de ella. Sin ${codigo('dura')}, la sección dura lo que tardan sus renglones en volver a caer juntos.

Los renglones de antes de la primera sección suenan en todas.

**La forma**

    el tema va estrofa estrofa estribillo estrofa

El orden en que van las secciones, y cuántas veces. Sin esta línea van una vez cada una, en el orden en que están escritas.

**El tempo**

    va a 120

Tiempos por minuto, de ${TEMPO_MIN} a ${TEMPO_MAX}. Con ${codigo('en tres')} la vuelta tiene tres tiempos en vez de cuatro, y ${codigo('va a 150 en tres')} es un vals. Sirve también en dos, en seis y hasta ${enLetras(TIEMPOS_MAX)}.

Adentro de una sección, el tempo es de esa sección. Un tema puede acelerar, o cambiar de compás.

**Un apunte**

    * esto no suena
    * escuchá @la base

Un renglón que empieza con ${codigo('*')} es para quien lee. No suena y no dice nada del tema. Si lleva un ${codigo('@')}, lo que sigue es un enlace a otro tema.

**Otro documento**

    @la base

Un renglón que empieza con ${codigo('@')} no suena: apunta a otro tema tuyo. Tipeá el ${codigo('@')} y te ofrece los que tenés. Para ir, apretá el nombre. Si ese tema no existe todavía, lo crea.

Sirve para escribir las partes de un mismo tema en documentos distintos e ir de uno a otro. Al copiar el enlace, los temas nombrados van adentro, así del otro lado también están.

**Los números**

Se escriben con letras hasta ${NUMEROS[NUMEROS.length - 1]}, o con cifras. Los arreglos y el ${codigo('cada')} llegan hasta ${VUELTAS_MAX} vueltas. Una sección, hasta ${VUELTAS_FORMA}.

**Los instrumentos**

Cualquiera de estos nombres puede ser el nombre de la parte, o ir después de la coma con ${codigo('en')}. Van por familia.

${FAMILIAS.map(([fam, tabla]) => fam + ': ' + Object.keys(tabla).join(', ')).join('\n\n')}

osciladores: ${osciladores.join(', ')}. No bajan ninguna muestra.

También se entienden ${juntar(Object.keys(ALIAS))}.
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
