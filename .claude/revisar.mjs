// Con un solo ámbito compartido, dos declaraciones con el mismo nombre en
// archivos distintos tiran la página entera («Identifier X has already been
// declared») y el navegador no dice cuál es el otro. Esto lo dice.
//   node .claude/revisar.mjs
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ORDEN = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);

// Lo que eval() necesita del global para poder tocar: un const/let de primer
// nivel con uno de estos nombres no choca con ningún archivo nuestro, pero tapa
// la propiedad de window y el síntoma es «no suena nada», que es peor de
// rastrear que un choque. Van también los globales del navegador que se
// declaran sin querer.
const RESERVADOS = new Set([
  's', 'n', 'note', 'sound', 'stack', 'setcpm', 'setcps', 'sine', 'saw', 'square',
  'tri', 'rand', 'perlin', 'hush', 'evaluate', 'samples', 'initStrudel', 'getTime',
  'getAudioContext', 'strudel', 'chord', 'voicing',
  // las que ahora aparecen adentro del código que se genera: si alguna quedara
  // tapada por una declaración nuestra, el síntoma es una línea que no suena
  'every', 'sometimes', 'rarely', 'arp', 'rev', 'iter', 'ply', 'palindrome',
  'clip', 'crush', 'vowel', 'distort', 'jux', 'orbit', 'range',
  'arrange', 'silence', 'timeCat', 'cat', 'slowcat', 'seq',
  'name', 'status', 'origin', 'length', 'top', 'event', 'self', 'parent', 'closed',
]);

// Un declarador puede traer varios nombres: «const a = 1, b = 2». Hay que
// separar por las comas de afuera de todo paréntesis, si no «const f = (x, y) =>»
// aportaría una «y» fantasma.
function nombresDe(linea) {
  const m = linea.match(/^(?:const|let|var)\s+/);
  if (!m) {
    const f = linea.match(/^(?:function|class)\s+([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)/);
    return f ? [f[1]] : [];
  }
  const nombres = [];
  let profundidad = 0, esperando = true;
  for (let i = m[0].length; i < linea.length; i++) {
    const c = linea[i];
    if (c === '/' && linea[i + 1] === '/') break;
    if ('([{'.includes(c)) profundidad++;
    else if (')]}'.includes(c)) profundidad--;
    else if (profundidad === 0) {
      if (c === ';') break;
      if (c === ',') { esperando = true; continue; }
      if (esperando) {
        if (/\s/.test(c)) continue;               // el espacio de después de la coma
        const id = linea.slice(i).match(/^[A-Za-zÀ-ÿ_$][\w$À-ÿ]*/);
        if (id) { nombres.push(id[0]); i += id[0].length - 1; }
        esperando = false;
      }
    }
  }
  return nombres;
}

const donde = new Map();
let choques = 0;
for (const archivo of ORDEN) {
  let fuente;
  try { fuente = readFileSync(new URL('../' + archivo, import.meta.url), 'utf8'); }
  catch (e) { console.error('falta: %s, y está en index.html', archivo); choques++; continue; }
  for (const linea of fuente.split('\n')) {
    if (!/^(const|let|var|function|class)\s/.test(linea)) continue;
    for (const nombre of nombresDe(linea)) {
      if (RESERVADOS.has(nombre)) {
        console.error('reservado: %s en %s — tapa un global que eval() necesita', nombre, archivo);
        choques++;
      } else if (donde.has(nombre)) {
        console.error('repetido: %s — %s y %s', nombre, donde.get(nombre), archivo);
        choques++;
      } else donde.set(nombre, archivo);
    }
  }
}
// Los temas viven en temas/*.txt y js/ejemplos.js sale de ahí. Si el js quedó
// viejo no hay ningún síntoma —la página abre y anda, con los temas de antes—,
// que es exactamente la clase de problema que este script existe para decir. Le
// pregunta al generador en vez de rehacer la cuenta: el que sabe es él.
const temas = spawnSync(process.execPath, [new URL('temas.mjs', import.meta.url).pathname, '--ver'],
  { encoding: 'utf8' });
if (temas.status) {
  console.error((temas.stderr || '').trim() || 'no se pudo revisar temas/');
  choques++;
}

console.log('%d nombres de primer nivel, %d problemas', donde.size, choques);
process.exit(choques ? 1 : 0);
