// Con un solo ámbito compartido, lo que sale mal entre archivos no se ve a simple
// vista y el navegador no dice la otra mitad: dos declaraciones con el mismo
// nombre tiran la página entera («Identifier X has already been declared»), una
// variable escrita desde un archivo que no es el suyo anda hasta que alguien
// mueve algo, una local que se llama como un global esconde al global, y una
// línea de primer nivel que nombra algo de un archivo que carga después revienta
// recién al abrir la página. Esto lo dice. Las reglas, en REGLAS.md.
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

// Se lee el código sin comentarios ni cadenas ni expresiones regulares, que es
// donde «let» o «=» aparecen sin ser nada; los renglones se conservan para poder
// decir en cuál.
function pelar(fuente) {
  let out = '', i = 0;
  const n = fuente.length;
  const anterior = () => { const m = out.match(/(\S)\s*$/); return m ? m[1] : ''; };
  while (i < n) {
    const c = fuente[i], d = fuente[i + 1];
    if (c === '/' && d === '/') { while (i < n && fuente[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      while (i < n && !(fuente[i] === '*' && fuente[i + 1] === '/')) { if (fuente[i] === '\n') out += '\n'; i++; }
      i += 2; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += q; i++;
      while (i < n && fuente[i] !== q) { if (fuente[i] === '\\') i++; if (fuente[i] === '\n') out += '\n'; i++; }
      out += q; i++; continue;
    }
    // una barra después de un valor divide; después de cualquier otra cosa abre una regex
    if (c === '/' && !/[\w$)\]]/.test(anterior())) {
      i++;
      let corchete = false;
      while (i < n && (corchete || fuente[i] !== '/')) {
        if (fuente[i] === '\\') i++;
        else if (fuente[i] === '[') corchete = true;
        else if (fuente[i] === ']') corchete = false;
        i++;
      }
      i++;
      while (/[a-z]/.test(fuente[i] || '')) i++;
      out += '/re/'; continue;
    }
    out += c; i++;
  }
  return out;
}

const ID = /[A-Za-zÀ-ÿ_$][\w$À-ÿ]*/g;

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

let choques = 0;
const avisar = (...a) => { console.error(...a); choques++; };

const archivos = [];
for (const archivo of ORDEN) {
  try { archivos.push({ archivo, lineas: pelar(readFileSync(new URL('../' + archivo, import.meta.url), 'utf8')).split('\n') }); }
  catch (e) { avisar('falta: %s, y está en index.html', archivo); }
}

// ---- quién declara qué, y quién llegó antes
const donde = new Map();                 // nombre → archivo
const variables = new Map();             // los «let»: nombre → archivo, su único dueño
for (const { archivo, lineas } of archivos)
  for (const linea of lineas) {
    if (!/^(const|let|var|function|class)\s/.test(linea)) continue;
    for (const nombre of nombresDe(linea)) {
      if (RESERVADOS.has(nombre)) avisar('reservado: %s en %s — tapa un global que eval() necesita', nombre, archivo);
      else if (donde.has(nombre)) avisar('repetido: %s — %s y %s', nombre, donde.get(nombre), archivo);
      else {
        donde.set(nombre, archivo);
        if (/^let\s/.test(linea)) variables.set(nombre, archivo);
      }
    }
  }

// ---- las otras tres, renglón por renglón, contando llaves para saber si se
// está adentro de una función o en el primer nivel
const turno = new Map(ORDEN.map((f, i) => [f, i]));
for (const { archivo, lineas } of archivos) {
  let profundidad = 0;
  lineas.forEach((linea, i) => {
    const nro = i + 1, arriba = profundidad === 0;
    // adentro de algo: por las llaves de los renglones de arriba, o por una
    // abierta más a la izquierda en este mismo renglón («const f = () => { let x»)
    const adentro = hasta => profundidad + [...linea.slice(0, hasta)].reduce((n, c) => n + ('({['.includes(c) ? 1 : ')}]'.includes(c) ? -1 : 0), 0) > 0;
    for (const d of linea.matchAll(/\b(?:const|let|var)\s+([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)/g))
      if (adentro(d.index) && donde.has(d[1])) avisar('sombra: %s:%d declara «%s», que es global en %s', archivo, nro, d[1], donde.get(d[1]));
    if (!/^\s*(const|let|var)\s/.test(linea))
      for (const m of linea.matchAll(/(?:^|[^.\w$])([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)\s*(?:=(?!=)|\+=|-=)/g))
        if (variables.has(m[1]) && variables.get(m[1]) !== archivo)
          avisar('ajeno: %s:%d escribe «%s», que es de %s', archivo, nro, m[1], variables.get(m[1]));
    // una función o una flecha de primer nivel recién corre cuando la llaman; lo
    // demás corre al cargar, y ahí lo que carga después todavía no existe
    if (arriba && linea.trim() && !/^(function|class)\b/.test(linea) && !/=>|\bfunction\b/.test(linea))
      for (const id of linea.match(ID) || [])
        if (donde.has(id) && turno.get(donde.get(id)) > turno.get(archivo))
          avisar('adelantado: %s:%d usa «%s» al cargar, y %s carga después', archivo, nro, id, donde.get(id));
    for (const c of linea) { if ('({['.includes(c)) profundidad++; else if (')}]'.includes(c)) profundidad--; }
  });
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
