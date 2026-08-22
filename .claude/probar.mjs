// fotos del traductor: que el castellano siga dando el mismo código, sin strudel
//   node .claude/probar.mjs            compara con esperado.json
//   node .claude/probar.mjs --rehacer  acepta lo de ahora como lo esperado
import { readFileSync, writeFileSync } from 'node:fs';
import { runInContext, createContext } from 'node:vm';

const raiz = new URL('../', import.meta.url);
const leer = f => readFileSync(new URL(f, raiz), 'utf8');

// lo justo de documento para que carguen; ninguno toca el DOM para traducir
const ctx = createContext({
  console,
  document: { documentElement: { dataset: { luz: 'claro' } } },
  matchMedia: () => ({ matches: false }),
  localStorage: { getItem: () => null, setItem() {} },
  addEventListener() {},
});
for (const f of ['texto', 'ejemplos', 'vocabulario', 'color', 'traductor'])
  runInContext(leer('js/' + f + '.js'), ctx, { filename: f + '.js' });
const traducir = runInContext('traducir', ctx);
const EJEMPLOS = runInContext('EJEMPLOS', ctx);

// renglones que alguna vez salieron mal
const CASOS = [
  ['al revés es una llamada',           'la viola toca do re, al revés'],
  ['lo que se fue avisa',               'el bajo toca do - - -, que se abre'],
  ['una por vuelta avisa con la barra', 'el piano toca do mayor fa mayor, una por vuelta'],
  ['el punto ya no es silencio',        'la bata toca pum . tas'],
  ['las figuras',                       'el piano toca do mayor | fa mayor, en semicorcheas\nla viola toca do, en tresillos\nel bajo toca do, en blancas'],
  ['a la mitad sí la estira',           'el bajo toca do - - -, a la mitad'],
  ['constructor no es un golpe',        'la bata toca pum constructor'],
  ['constructor no es un instrumento',  'el constructor toca do re'],
  ['el tempo tiene techo',              'va a 405\nla bata toca pum tas'],
  ['el nombre no corta el comentario',  'x alert(1),// toca pum\nla bata toca pum tas'],
  ['la ligadura abre un compás',        'la viola toca do - | _ re'],
  ['secciones, forma y tempo por sección',
   'va a 90\nla estrofa:\nla bata toca pum tas\nel estribillo dura 2 vueltas:\nva a 120\nel bajo toca do re\nva estrofa estribillo estrofa'],
  ['una parte callada no suena pero está', 'la bata toca pum tas, callado\nel bajo toca do'],
  ['acorde con altura',                  'el piano toca do mayor grave | fa menor agudo'],
  ['acordes de dos palabras',            'el piano toca do menor séptima | re mayor séptima agudo | mi suspendido | fa aumentado'],
  ['transponer, sólo con notas',         'el bajo toca do re, una octava abajo\nla bata toca pum, un tono arriba'],
  ['cada dos vueltas, al doble',         'la bata toca pum tas, cada dos vueltas al doble'],
  ['compás de tres',                     'va a 150 en tres\nel bajo toca do - -'],
  ['volumen y lugar',                    'el bajo toca do, muy bajito, a la izquierda\nla viola toca re, muy fuerte, a la derecha'],
  ['golpes nuevos',                      'la bata toca pum dum clon shh'],
  ['acento por paso',                    'la bata toca pum! tas - tas!, bajito\nel bajo toca do! _ re | - mi!\nla viola toca do -!'],
  ['compás por sección, y lo que no es compás', 'la estrofa:\nva a 120 en tres\nla bata toca pum - -\nel final:\nva a 120\nla bata toca pum tas\nva a 120 por minuto'],
];

const foto = txt => {
  const r = traducir(txt);
  return { codigo: r.codigo, vueltas: r.vueltas, bpm: r.bpm,
           errores: r.errores.map(e => e.nro + ': ' + e.msg),
           tramos: r.tramos.map(t => t.nom + '×' + t.largo), tempos: r.tempos };
};
const ahora = {};
for (const e of EJEMPLOS) ahora['tema: ' + e.nombre] = foto(e.txt);
for (const [nombre, txt] of CASOS) ahora[nombre] = foto(txt);

const archivo = new URL('esperado.json', import.meta.url);
if (process.argv.includes('--rehacer')) {
  writeFileSync(archivo, JSON.stringify(ahora, null, 1) + '\n');
  console.log('%d fotos escritas en esperado.json', Object.keys(ahora).length);
  process.exit(0);
}

let esperado;
try { esperado = JSON.parse(readFileSync(archivo, 'utf8')); }
catch (e) { console.error('no hay esperado.json: node .claude/probar.mjs --rehacer'); process.exit(1); }

let distintas = 0;
for (const clave of new Set([...Object.keys(esperado), ...Object.keys(ahora)])) {
  const a = JSON.stringify(esperado[clave]), b = JSON.stringify(ahora[clave]);
  if (a === b) continue;
  distintas++;
  if (!esperado[clave]) { console.error('nueva: «%s» — no está en esperado.json', clave); continue; }
  if (!ahora[clave]) { console.error('falta: «%s» — está en esperado.json y ya no se prueba', clave); continue; }
  console.error('cambió: «%s»', clave);
  for (const campo of Object.keys(ahora[clave]))
    if (JSON.stringify(esperado[clave][campo]) !== JSON.stringify(ahora[clave][campo]))
      console.error('  %s\n    era:   %s\n    ahora: %s', campo, JSON.stringify(esperado[clave][campo]), JSON.stringify(ahora[clave][campo]));
}
// un tema que viene hecho no puede traer errores
for (const e of EJEMPLOS)
  if (ahora['tema: ' + e.nombre].errores.length) { distintas++; console.error('«%s» trae errores: %s', e.nombre, ahora['tema: ' + e.nombre].errores.join(' | ')); }

console.log('%d fotos, %d distintas', Object.keys(ahora).length, distintas);
process.exit(distintas ? 1 : 0);
