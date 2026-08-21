// Un midi es una ejecución y chanchán es una maquinita de loops: no se puede
// copiar uno adentro de la otra, hay que adaptarlo. Esto hace la parte que es
// cuenta —qué nota cae en qué corchea, qué acorde arma cada compás, qué pistas
// tocan lo mismo— y deja para la mano lo que es criterio: dónde empieza el
// estribillo y qué sobra.
//
//   node .claude/midi.mjs "ejemplos/Pink Floyd.mid"                el mapa del tema
//   node .claude/midi.mjs "ejemplos/Pink Floyd.mid" 3 0 60         una pista
//   node .claude/midi.mjs "ejemplos/Pink Floyd.mid" 3 0 60 8 abajo forzando la grilla
//
// La segunda forma es la que se usa de verdad: saca una pista escrita en pasos
// de chanchán, compás por compás, lista para pegar y corregir a oído. Los dos
// últimos argumentos son para cuando la cuenta no acierta: cuántos pasos por
// compás, y de qué punta agarrar un acompañamiento —por arriba sale la melodía,
// por abajo el bajo del riff.
import { readFileSync } from 'node:fs';

// ------------------------------------------------------------------ leer el midi
function leerVar(b, i) {
  let v = 0;
  for (;;) {
    const c = b[i++];
    v = (v << 7) | (c & 0x7f);
    if (!(c & 0x80)) return [v, i];
  }
}

function abrir(ruta) {
  const b = readFileSync(ruta);
  if (b.toString('latin1', 0, 4) !== 'MThd') throw new Error('no es un midi: ' + ruta);
  const div = b.readUInt16BE(12);
  let i = 8 + b.readUInt32BE(4);
  const pistas = [];
  while (i < b.length && b.toString('latin1', i, i + 4) === 'MTrk') {
    const largo = b.readUInt32BE(i + 4), datos = b.subarray(i + 8, i + 8 + largo);
    i += 8 + largo;
    const ev = [];
    let j = 0, t = 0, corriendo = null;
    while (j < datos.length) {
      let d; [d, j] = leerVar(datos, j);
      t += d;
      let st = datos[j];
      if (st < 0x80) st = corriendo; else j++;
      if (st === 0xff) {
        const tipo = datos[j++];
        let n; [n, j] = leerVar(datos, j);
        ev.push({ t, meta: tipo, datos: datos.subarray(j, j + n) });
        j += n;
      } else if (st === 0xf0 || st === 0xf7) {
        let n; [n, j] = leerVar(datos, j);
        j += n;
      } else {
        corriendo = st;
        const n = (st & 0xf0) === 0xc0 || (st & 0xf0) === 0xd0 ? 1 : 2;
        ev.push({ t, st, a: datos[j], b: datos[j + 1] });
        j += n;
      }
    }
    pistas.push(ev);
  }
  return { div, pistas };
}

// Un midi trae las notas apagándose aparte de encendiéndose, y lo que hace falta
// acá es cuánto dura cada una: sin eso no se sabe si un paso lleva la nota o
// lleva la anterior estirada.
function notasDe(ev) {
  const abiertas = new Map(), out = [];
  for (const e of ev) {
    if (e.st == null) continue;
    const tipo = e.st & 0xf0;
    const clave = (e.st & 0x0f) + ':' + e.a;
    if (tipo === 0x90 && e.b > 0) abiertas.set(clave, e.t);
    else if (tipo === 0x80 || (tipo === 0x90 && e.b === 0)) {
      if (!abiertas.has(clave)) continue;
      out.push({ t: abiertas.get(clave), fin: e.t, nota: e.a, canal: e.st & 0x0f });
      abiertas.delete(clave);
    }
  }
  return out.sort((x, y) => x.t - y.t || x.nota - y.nota);
}

const meta = (ev, tipo) => ev.filter(e => e.meta === tipo);

// ---------------------------------------------------------- del midi a chanchán
const SOSTENIDOS = ['do', 'do sostenido', 're', 're sostenido', 'mi', 'fa',
                    'fa sostenido', 'sol', 'sol sostenido', 'la', 'la sostenido', 'si'];
const BEMOLES = ['do', 're bemol', 're', 'mi bemol', 'mi', 'fa',
                 'sol bemol', 'sol', 'la bemol', 'la', 'si bemol', 'si'];
const OCTAVA = { 2: ' muy grave', 3: ' grave', 4: '', 5: ' agudo', 6: ' muy agudo' };

// La misma tecla negra se llama de dos maneras y sólo una de las dos se puede
// leer: en Demoliendo Hoteles el acorde es si bemol, no la sostenido, y escrito
// al revés hay que traducirlo mentalmente en cada compás. Se elige la tonalidad
// que mejor explica las notas del tema y se escribe con sus alteraciones.
let NOTA = SOSTENIDOS;
const MAYOR = [0, 2, 4, 5, 7, 9, 11];
const CON_BEMOLES = [5, 10, 3, 8, 1];    // fa, si bemol, mi bemol, la bemol, re bemol

function elegirAlteraciones(notas) {
  const cuenta = new Array(12).fill(0);
  for (const n of notas) cuenta[n.nota % 12]++;
  let mejor = 0, punta = -1;
  for (let t = 0; t < 12; t++) {
    const p = MAYOR.reduce((a, g) => a + cuenta[(t + g) % 12], 0);
    if (p > punta) { punta = p; mejor = t; }
  }
  NOTA = CON_BEMOLES.includes(mejor) ? BEMOLES : SOSTENIDOS;
}

// Fuera del rango que chanchán sabe nombrar no hay palabra: se sube o se baja de
// a octavas hasta que entre, que es lo que hace cualquiera al pasar una parte de
// orquesta a un instrumento solo.
function palabraNota(midi) {
  let oct = Math.floor(midi / 12) - 1;
  const clase = ((midi % 12) + 12) % 12;
  while (oct < 2) oct++;
  while (oct > 6) oct--;
  return NOTA[clase] + OCTAVA[oct];
}

// Los golpes del General MIDI. Los que no están —los bongós, las claves— caen en
// el que más se le parece: chanchán tiene nueve y el GM tiene cuarenta y siete.
const GOLPE = {
  35:'pum', 36:'pum', 37:'toc', 38:'tas', 39:'chas', 40:'tas', 41:'tum', 42:'chis',
  43:'tum', 44:'chis', 45:'tum', 46:'tsss', 47:'tum', 48:'tum', 49:'chan', 50:'tum',
  51:'tin', 52:'chan', 53:'tin', 54:'chis', 55:'chan', 56:'toc', 57:'chan', 58:'tum',
  59:'tin', 60:'tum', 61:'tum', 62:'toc', 63:'tum', 64:'tum', 65:'tum', 66:'tum',
  67:'toc', 68:'toc', 69:'chis', 70:'chis', 75:'toc', 76:'toc', 77:'toc', 80:'tin', 81:'tin',
};
// De grave a agudo, igual que la tabla de SONIDOS: cuando dos caen en el mismo
// paso gana el más grave, que es el que marca el pulso.
const PESO = ['pum', 'tum', 'tas', 'toc', 'chas', 'chan', 'tin', 'chis', 'tsss'];

// Los 128 del General MIDI salen de la tabla del propio idioma y en su propio
// orden, que es el del GM: así el nombre que sale de acá es siempre uno que
// chanchán sabe leer, y si mañana se renombra un instrumento esto lo sigue.
function instrumentos() {
  const fuente = readFileSync(new URL('../js/vocabulario.js', import.meta.url), 'utf8');
  const cuerpo = fuente.slice(fuente.indexOf('const FAMILIAS = ['));
  const literal = cuerpo.slice(cuerpo.indexOf('['), cuerpo.indexOf('\n];') + 2);
  return new Function('return ' + literal)().flatMap(([, tabla]) => Object.keys(tabla));
}
const GM = instrumentos();

// --------------------------------------------------------------- la cuadrícula
// Lo humanizado se va acá. Se prueba de menos a más y gana la primera grilla que
// explique casi todo lo que suena: una parte que va en negras no tiene por qué
// escribirse en semicorcheas sólo porque el que la tocó llegó tarde a una.
function grillaDe(notas, compas) {
  for (const res of [2, 4, 8, 16]) {
    const paso = compas / res;
    const cerca = notas.filter(n => Math.abs(n.t / paso - Math.round(n.t / paso)) < 0.12).length;
    if (cerca >= notas.length * 0.9) return res;
  }
  return 16;
}

// ------------------------------------------------------------------- las pistas
function pistas(ruta) {
  const { div, pistas: crudas } = abrir(ruta);
  return crudas.map((ev, i) => {
    const notas = notasDe(ev);
    const nombre = meta(ev, 0x03).map(m => m.datos.toString('latin1'))[0] || '';
    const prog = ev.find(e => (e.st & 0xf0) === 0xc0);
    const canal = notas.length ? notas[0].canal : (prog ? prog.st & 0x0f : 0);
    return { i, nombre, notas, div, canal,
             bateria: canal === 9, gm: prog ? prog.a : 0,
             instrumento: canal === 9 ? 'bata' : GM[prog ? prog.a : 0] };
  });
}

function tempos(ruta) {
  const { div, pistas: crudas } = abrir(ruta);
  const out = [];
  for (const ev of crudas)
    for (const m of meta(ev, 0x51))
      out.push({ vuelta: m.t / div / 4, bpm: Math.round(6e7 / ((m.datos[0] << 16) | (m.datos[1] << 8) | m.datos[2])) });
  return out.sort((a, b) => a.vuelta - b.vuelta);
}

// ----------------------------------------------------- una pista, compás por compás
// El resultado es una línea de chanchán por compás. Un paso lleva la nota que
// empieza ahí; si no empieza ninguna pero la anterior todavía suena, lleva el
// «_», que es la ligadura; y si no hay nada, el silencio.
function enPasos(p, compas, desde, hasta, res, voz) {
  res = res || grillaDe(p.notas, compas);
  const paso = compas / res;
  const filas = [];
  for (let c = desde; c < hasta; c++) {
    const fila = [];
    for (let k = 0; k < res; k++) {
      const a = c * compas + k * paso, z = a + paso;
      const entran = p.notas.filter(n => n.t >= a - paso * 0.25 && n.t < z - paso * 0.25);
      if (entran.length) {
        if (p.bateria) {
          const golpes = [...new Set(entran.map(n => GOLPE[n.nota]).filter(Boolean))];
          fila.push(golpes.sort((x, y) => PESO.indexOf(x) - PESO.indexOf(y))[0] || '-');
        } else {
          // De un acompañamiento salen dos líneas distintas según de qué punta se
          // lo agarre: por arriba sale la melodía, que es la que se canta, y por
          // abajo el bajo del riff, que en un boogie es lo que se reconoce.
          const alturas = entran.map(n => n.nota);
          fila.push(palabraNota(voz === 'abajo' ? Math.min(...alturas) : Math.max(...alturas)));
        }
      } else if (!p.bateria && p.notas.some(n => n.t < a && n.fin > a + paso * 0.25)) {
        fila.push('_');
      } else fila.push('-');
    }
    filas.push(fila.join(' '));
  }
  return { res, filas };
}

// Qué acorde arma cada compás, para las partes que acompañan: mirar las notas de
// a una da una línea ilegible de treinta pasos, y lo que esa parte está diciendo
// es un acorde por compás.
const CALIDAD = [[[0, 4, 7], 'mayor'], [[0, 3, 7], 'menor'], [[0, 7], 'quinta'],
                 [[0, 4, 7, 10], 'séptima'], [[0, 3, 6], 'disminuido']];

function acordeDe(notas) {
  if (!notas.length) return '-';
  const clases = [...new Set(notas.map(n => n.nota % 12))];
  const raiz = notas.reduce((a, b) => (a.nota < b.nota ? a : b)).nota % 12;
  let mejor = null, puntos = -1;
  for (const [iv, nombre] of CALIDAD) {
    const quiere = iv.map(x => (raiz + x) % 12);
    const p = quiere.filter(x => clases.includes(x)).length - Math.abs(clases.length - quiere.length) * 0.5;
    if (p > puntos) { puntos = p; mejor = nombre; }
  }
  return NOTA[raiz] + ' ' + mejor;
}

function enAcordes(p, compas, desde, hasta) {
  const out = [];
  for (let c = desde; c < hasta; c++) {
    const dentro = p.notas.filter(n => n.t >= c * compas && n.t < (c + 1) * compas);
    out.push(acordeDe(dentro));
  }
  return out;
}

// ---------------------------------------------------------------------- el mapa
// Lo que se mira antes de escribir nada: cuántos compases hay, qué toca cada
// pista, y cuáles compases son el mismo. De ahí salen las secciones.
function mapa(ruta) {
  const ps = pistas(ruta).filter(p => p.notas.length);
  elegirAlteraciones(ps.filter(p => !p.bateria).flatMap(p => p.notas));
  const div = ps[0].div, compas = div * 4;
  const fin = Math.max(...ps.map(p => Math.max(...p.notas.map(n => n.fin))));
  const nb = Math.ceil(fin / compas);
  console.log('%s — %d compases, %d pistas', ruta, nb, ps.length);
  console.log('tempos:', tempos(ruta).map(t => t.bpm + ' desde la vuelta ' + t.vuelta.toFixed(1)).join(', '));
  for (const p of ps) {
    const g = grillaDe(p.notas, compas);
    const alturas = p.notas.map(n => n.nota);
    console.log('  pista ' + String(p.i).padStart(2) + '  ' +
      p.nombre.slice(0, 18).padEnd(19) + p.instrumento.padEnd(22) +
      String(p.notas.length).padStart(4) + ' notas, ' + String(g).padStart(2) + ' pasos/compás, ' +
      palabraNota(Math.min(...alturas)) + '..' + palabraNota(Math.max(...alturas)));
  }
  // los compases iguales, mirando la armonía: es lo que dice dónde vuelve el tema
  const armonica = ps.filter(p => !p.bateria).sort((a, b) => b.notas.length - a.notas.length)[0];
  const acordes = enAcordes(armonica, compas, 0, nb);
  const vistos = new Map();
  const letras = acordes.map(a => {
    if (!vistos.has(a)) vistos.set(a, String.fromCharCode(97 + vistos.size));
    return vistos.get(a);
  });
  console.log('\narmonía (pista %d), compás por compás:', armonica.i);
  for (let c = 0; c < nb; c += 8)
    console.log('  ' + String(c).padStart(3) + '  ' + acordes.slice(c, c + 8).map(x => x.padEnd(16)).join(''));
  console.log('\nmapa:', letras.join(' '));
  console.log('       ', [...vistos].map(([a, l]) => l + '=' + a).join('  '));
}

// ------------------------------------------------------------------------ correr
const [ruta, pista, desde, hasta, res, voz] = process.argv.slice(2);
if (!ruta) {
  console.error('node .claude/midi.mjs <archivo.mid> [pista] [desde] [hasta] [pasos por compás] [arriba|abajo]');
  process.exit(1);
}
if (pista == null) mapa(ruta);
else {
  const todas = pistas(ruta);
  elegirAlteraciones(todas.filter(p => !p.bateria).flatMap(p => p.notas));
  const p = todas[+pista];
  const compas = p.div * 4;
  const a = desde == null ? 0 : +desde, z = hasta == null ? 16 : +hasta;
  const { res: usada, filas } = enPasos(p, compas, a, z, res ? +res : null, voz);
  console.log('// pista %d · %s · %s · %d pasos por compás', p.i, p.nombre, p.instrumento, usada);
  console.log('// acordes:', enAcordes(p, compas, a, z).join(' | '));
  console.log(filas.map((f, k) => f + (k < filas.length - 1 ? ' |' : '')).join('\n'));
}
