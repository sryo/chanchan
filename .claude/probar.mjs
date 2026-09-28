// fotos del traductor, y las cuentas puras de los pasos: sin strudel
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
for (const f of ['texto', 'cambios', 'ejemplos', 'vocabulario', 'color', 'renglon', 'traductor'])
  runInContext(leer('js/' + f + '.js'), ctx, { filename: f + '.js' });
const traducir = runInContext('traducir', ctx);
const EJEMPLOS = runInContext('EJEMPLOS', ctx);

// renglones que alguna vez salieron mal
const CASOS = [
  ['al revés es una llamada',           'la viola toca do re, al revés'],
  ['lo que se fue avisa',               'el bajo toca do - - -, que se abre'],
  ['una por vuelta avisa con la barra', 'el piano toca do mayor fa mayor, una por vuelta'],
  ['el punto ya no es silencio',        'la bata toca pum . pa'],
  ['las figuras',                       'el piano toca do mayor | fa mayor, en semicorcheas\nla viola toca do, en tresillos\nel bajo toca do, en blancas'],
  ['a la mitad sí la estira',           'el bajo toca do - - -, a la mitad'],
  ['constructor no es un golpe',        'la bata toca pum constructor'],
  ['constructor no es un instrumento',  'el constructor toca do re'],
  ['el tempo tiene techo',              'va a 405\nla bata toca pum pa'],
  ['el nombre no corta el comentario',  'x alert(1),// toca pum\nla bata toca pum pa'],
  ['la ligadura abre un compás',        'la viola toca do - | _ re'],
  ['secciones, forma y tempo por sección',
   'va a 90\nla estrofa:\nla bata toca pum pa\nel estribillo dura 2 vueltas:\nva a 120\nel bajo toca do re\nva estrofa estribillo estrofa'],
  ['una parte callada no suena pero está', 'la bata toca pum pa, callado\nel bajo toca do'],
  ['acorde con altura',                  'el piano toca do mayor grave | fa menor agudo'],
  ['acordes de dos palabras',            'el piano toca do menor séptima | re mayor séptima agudo | mi suspendido | fa aumentado'],
  ['transponer, sólo con notas',         'el bajo toca do re, una octava abajo\nla bata toca pum, un tono arriba'],
  ['cada dos vueltas, al doble',         'la bata toca pum pa, cada dos vueltas al doble'],
  ['un enlace a otro tema',            '@la base\nla bata toca pum pa'],
  ['un enlace sin nombre',             '@\nla bata toca pum pa'],
  ['una nota no es sección ni tempo',  '* la estrofa:\n* va a 200\nla bata toca pum pa'],
  ['un tema que nombra a otros',       '@la base\n@o fortuna\nla bata toca pum'],
  ['un enlace adentro de una nota',    '* escuchá @o fortuna.\n* sin nombre @\nla bata toca pum'],
  ['compás de tres',                     'va a 150 en tres\nel bajo toca do - -'],
  ['volumen y lugar',                    'el bajo toca do, muy bajito, a la izquierda\nla viola toca re, muy fuerte, a la derecha'],
  ['golpes nuevos',                      'la bata toca pum dum tum tim clon shh'],
  ['los golpes viejos avisan',           'la bata toca pum tas chas'],
  ['acento por paso',                    'la bata toca pum! pa - pa!, bajito\nel bajo toca do! _ re | - mi!\nla viola toca do -!'],
  ['compás por sección, y lo que no es compás', 'la estrofa:\nva a 120 en tres\nla bata toca pum - -\nel final:\nva a 120\nla bata toca pum pa\nva a 120 por minuto'],
  ['el acento cierra el grupo de la nota',  'el piano toca do mayor! re sostenido! mi muy grave! fa! menor séptima'],
  ['cada campo de la nota, una vez',        'el piano toca do sostenido bemol | re grave agudo | mi mayor menor | fa menor séptima mayor'],
  ['un sufijo suelto va después de una nota', 'la bata toca pum mayor pa\nel piano toca sostenido do'],
  ['las cláusulas que se pisan avisan',      'el bajo toca do, bajito, fuerte\nla viola toca re, en corcheas, en negras, tres en ocho\nel piano toca mi, en un piano, en una viola\nla bata toca pum, en una 808, en una 909, una vuelta sí y una no, dos vueltas sí y dos no'],
  ['las relativas se componen',              'el bajo toca do, al doble, al doble, un tono arriba, medio tono arriba, cada golpe dos veces, cada golpe dos veces'],
  ['un paso desconocido es un silencio',     'la bata toca pum xx pa\nel bajo toca do . re\nla bata toca xx yy'],
  ['un «!» suelto deja el paso o el corte',  'el bajo toca do -! re\nel bajo toca do |! re'],
  ['muy sin altura, y el acento en la raíz cierra el grupo', 'el piano toca do muy re\nel piano toca do! sostenido mi! menor'],
  ['una caja en las notas, y un instrumento en los golpes', 'el bajo toca do re, en una 808\nla bata toca pum pa, en un piano'],
  ['la forma con comas',                     'la estrofa:\nla bata toca pum\nel estribillo:\nel bajo toca do\nel tema va estrofa, estribillo, estrofa'],
  ['el tema va a medio escribir no es tempo', 'el tema va\nel tema\nla bata toca pum'],
  ['la altura es del instrumento',           'el bajo toca do\nel flautín toca do\nla melodía toca do, en un bajo\nla tuba toca do muy grave\nel bajo toca do agudo mayor'],
  ['los nombres de antes avisan y se arreglan', 'la bata toca pum, brillante\nla bata toca pum, a veces brillante\nel bajo acústico toca do\nel piano toca do, en un bajo acústico\nla bata toca tas'],
  ['los acordes como se dicen',              'el piano toca do séptima mayor | re siete | la menor siete | si disminuido'],
  ['por tiempo, con el compás de cada sección', 'va a 150 en tres\nel piano toca do, en negras, con swing, repicando\nla viola toca do, en blancas\nla a:\nla bata toca pum\nla b:\nva a 90\nla bata toca pa\nel tema va a b'],
  ['un instrumento se sugiere con su «en»',  'el piano toca do, violn'],
  ['los acordes se enlazan',                 'el piano toca do mayor | fa mayor | sol mayor | do mayor\nel piano toca la menor | re menor | mi séptima | la menor, arpegiado\nel piano toca do mayor | _ fa mayor\nel piano toca do quinta | fa quinta'],
  ['crece de punta a punta',                 'la bata toca pum pa, cada vez más fuerte, al doble'],
  ['crece por sección',                      'el piano toca do, cada vez más fuerte\nla estrofa:\nla bata toca pum, cada vez más fuerte\nel estribillo dura 2 vueltas:\nla bata toca pa, cada vez más bajito\nel tema va estrofa estribillo estrofa'],
  ['percusión de verdad',                    'la bata toca pum pa pum pa, en un cajón\nla bata toca pum tum tim pa, en unas congas\nla bata toca pum pa, en unos bongós\nla bata toca pum pa chis chan, en una murga\nla bata toca pum pa chan pa, en un cajón'],
  ['los golpes de mano van en cualquier caja', 'la bata toca pum clac pa chin\nla bata toca pum - tilín | ras chin, en unos bongós\nla bata toca tilin tilín!'],
  ['lo que el GM no tiene',                  'el balafón toca do mayor | fa mayor\nlas campanas de mano tocan do mi sol'],
  ['las frases nuevas se pisan donde deben', 'la bata toca pum, de lejos, con eco\nla bata toca pum, de lejos, apagado\nla bata toca pum, como de radio, sin graves\nla bata toca pum, cada vez más fuerte, cada vez más bajito\nla bata toca pum, a mano, a mano\nla bata toca pum! pa, de lejos, bajito, a mano, cada vez más fuerte\nla bata toca pum, a veces cada vez más fuerte\nla bata toca pum, cada dos vueltas a mano'],
];

const foto = txt => {
  const r = traducir(txt);
  return { codigo: r.codigo, vueltas: r.vueltas, bpm: r.bpm,
           errores: r.errores.map(e => e.nro + ': ' + e.msg + (e.arreglo ? ' → «' + e.arreglo.texto + '»' : '')),
           tramos: r.tramos.map(t => t.nom + '×' + t.largo), tempos: r.tempos, enlaces: r.enlaces };
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
// ---- ningún token pisa a otro
for (const [clave, txt] of [...EJEMPLOS.map(e => ['tema: ' + e.nombre, e.txt]), ...CASOS])
  traducir(txt).marcas.forEach((tks, l) => {
    const orden = tks.slice().sort((a, b) => a.i - b.i);
    for (let k = 1; k < orden.length; k++)
      if (orden[k].i < orden[k - 1].i + orden[k - 1].len) {
        distintas++;
        console.error('tokens pisados en «%s», renglón %d: %j y %j', clave, l + 1, orden[k - 1], orden[k]);
      }
  });

// ---- los pasos: ida y vuelta entre dos textos, y las posiciones que corren
const C = n => runInContext(n, ctx);
const es = (que, a, b) => {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  distintas++;
  console.error('paso: «%s»\n    da:    %s\n    debía: %s', que, JSON.stringify(a), JSON.stringify(b));
};
for (const [viejo, nuevo] of [['la bata toca pum', 'la bata toca pum pa'], ['do re mi', 'do mi'], ['', 'x'], ['abc', ''],
                              ['pum pa', 'pum! pa'], ['aaa', 'aa'], ['aa', 'aaa'], ['do mayor', 'do menor'], ['xyx', 'xx']]) {
  const p = C('pasoEntre')(viejo, nuevo);
  es('ida ' + viejo + ' → ' + nuevo, C('aplicarPaso')(viejo, p), nuevo);
  es('vuelta ' + nuevo + ' → ' + viejo, C('aplicarPaso')(nuevo, C('invertir')(p)), viejo);
}
es('igual no es paso', C('pasoEntre')('a', 'a'), null);
const q = C('paso')(5, 'cinco', 'xx');       // en 5 se sacan cinco letras y se ponen dos
es('antes queda', C('mapear')(3, q), 3);
es('después corre', C('mapear')(12, q), 9);
es('al borde de adelante se queda', C('mapear')(5, q, 1), 5);
es('al borde de atrás se va al final de lo puesto', C('mapear')(10, q, -1), 7);
es('adentro, al lado que se pida', [C('mapear')(7, q, -1), C('mapear')(7, q, 1)], [5, 7]);
const ins = C('paso')(5, '', 'xx');
es('inserción justo encima, según el lado', [C('mapear')(5, ins, -1), C('mapear')(5, ins, 1)], [5, 7]);
es('un rango sobrevive con lo insertado afuera', C('mapearRango')({ desde: 5, hasta: 8 }, [ins]), { desde: 7, hasta: 10 });
es('un rango borrado se va', C('mapearRango')({ desde: 5, hasta: 8 }, [C('paso')(4, 'abcdef', '')]), null);
let mal = 0; try { C('aplicarPaso')('hola', q); } catch (e) { mal++; }
es('un paso que no calza rompe', mal, 1);

// dos instrumentos con el mismo sonido serían uno solo para strudel; el GM son 128 en su orden
const sonidos = [...new Set(Object.values(C('INSTRUMENTOS')))].map(i => i.sonido);
es('ningún sonido repetido', sonidos.filter((x, k) => sonidos.indexOf(x) !== k), []);
es('el GM entero', C('FAMILIAS').flatMap(([, t]) => Object.values(t)).length, 128);

// cada frase de cómo está en una sola pregunta del árbol, y cada golpe en una sola familia
const enGrupos = grupos => grupos.flatMap(([, lista]) => lista);
const frases = C('MODIFICADORES').map(m => m[0]), agrupadas = enGrupos(C('GRUPOS_COMO'));
es('cada frase en un grupo', frases.filter(f => agrupadas.filter(x => x === f).length !== 1), []);
es('ningún grupo nombra lo que no hay', agrupadas.filter(f => !frases.includes(f)), []);
const golpes = Object.keys(C('SONIDOS')), enFamilias = enGrupos(C('GRUPOS_GOLPES'));
es('cada golpe en una familia', golpes.filter(g => enFamilias.filter(x => x === g).length !== 1), []);

// un tema que viene hecho no puede traer errores
for (const e of EJEMPLOS)
  if (ahora['tema: ' + e.nombre].errores.length) { distintas++; console.error('«%s» trae errores: %s', e.nombre, ahora['tema: ' + e.nombre].errores.join(' | ')); }

console.log('%d fotos, %d distintas', Object.keys(ahora).length, distintas);
process.exit(distintas ? 1 : 0);
