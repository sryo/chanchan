// hornea temas/*.txt en js/ejemplos.js: desde file:// fetch no llega a un archivo local
//
//     node .claude/temas.mjs          los hornea
//     node .claude/temas.mjs --ver    dice si el js quedó viejo, sin tocar nada
//
// el js va versionado: un clon recién bajado tiene los temas sin correr nada
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const raiz = new URL('../', import.meta.url);
const carpeta = new URL('temas/', raiz);
const destino = new URL('js/ejemplos.js', raiz);
const INDICE = 'orden.txt';

// una nota es el bloque de # justo arriba de un nombre; separado por un blanco, es del archivo
function leerIndice() {
  let crudo;
  try { crudo = readFileSync(new URL(INDICE, carpeta), 'utf8'); }
  catch (e) { return { orden: [], notas: new Map() }; }
  const orden = [], notas = new Map();
  let junta = [];
  for (const linea of crudo.split('\n')) {
    const nota = linea.match(/^#\s?(.*)$/);
    if (nota) { junta.push(nota[1].trimEnd()); continue; }
    const nombre = linea.trim();
    if (!nombre) { junta = []; continue; }      // el blanco corta: la nota era de arriba
    orden.push(nombre);
    if (junta.length) notas.set(nombre, junta);
    junta = [];
  }
  return { orden, notas };
}

function leerTemas() {
  const { orden, notas } = leerIndice();
  const hay = readdirSync(carpeta)
    .filter(f => f.endsWith('.txt') && f !== INDICE)
    .map(f => f.slice(0, -4));
  // primero los que el índice nombra y en su orden; los que sobran, alfabéticos
  const nombres = orden.filter(n => hay.includes(n))
    .concat(hay.filter(n => !orden.includes(n)).sort((a, b) => a.localeCompare(b, 'es')));
  const faltan = orden.filter(n => !hay.includes(n));
  return { nombres, notas, faltan,
    temas: nombres.map(nombre => ({
      nombre,
      nota: notas.get(nombre),
      txt: readFileSync(new URL(encodeURIComponent(nombre) + '.txt', carpeta), 'utf8')
             .replace(/\r\n/g, '\n').replace(/\n*$/, '\n'),
    })) };
}

// un literal roto no se ve hasta que la página no abre
const enLiteral = txt => txt.replace(/[\\`]/g, c => '\\' + c).replace(/\$\{/g, '\\${');

const CABEZA = `// ------------------------------------------------------------------ los temas
// Generado: no se edita acá. Cada tema es un archivo en temas/ y el nombre del tema es
// el del archivo; el orden y las notas salen de temas/orden.txt. Después de tocar uno:
//
//     node .claude/temas.mjs
`;

function armar(temas) {
  let out = CABEZA + 'const EJEMPLOS = [\n';
  for (const t of temas) {
    if (t.nota) out += t.nota.map(l => '  // ' + l).join('\n').replace(/ +$/gm, '') + '\n';
    out += '  { nombre: ' + JSON.stringify(t.nombre) + ', txt:\n`' + enLiteral(t.txt.replace(/\n$/, '')) + '` },\n\n';
  }
  return out.replace(/\n+$/, '\n') + '];\n';
}

const { temas, faltan } = leerTemas();
let mal = 0;
for (const n of faltan) {
  console.error('%s nombra «%s», y ese archivo no está en temas/', INDICE, n);
  mal++;
}
for (const t of temas) {
  if (!/\btocan?\b/.test(t.txt)) {
    console.error('«%s» no tiene ninguna línea con «toca»: no es un tema', t.nombre);
    mal++;
  }
}
if (mal) process.exit(1);

const nuevo = armar(temas);
let viejo = '';
try { viejo = readFileSync(destino, 'utf8'); } catch (e) { /* todavía no está */ }

if (process.argv.includes('--ver')) {
  if (nuevo === viejo) console.log('%d temas, js/ejemplos.js al día', temas.length);
  else { console.error('js/ejemplos.js quedó viejo: corré «node .claude/temas.mjs»'); process.exit(1); }
} else if (nuevo === viejo) {
  console.log('%d temas, js/ejemplos.js ya estaba al día', temas.length);
} else {
  writeFileSync(destino, nuevo);
  console.log('%d temas horneados en js/ejemplos.js', temas.length);
}
