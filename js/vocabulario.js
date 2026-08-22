// ---------------------------------------------------------------- vocabulario
// La tabla va de grave a agudo, y ese orden después se lee: de él salen la luz
// con la que el editor pinta cada golpe y el lugar de la percusión en la rueda
// de colores. Mover una fila mueve un color, así que no es un orden cualquiera.
const SONIDOS = {
  pum:  ['bd',  'bombo'],
  tum:  ['mt',  'tom'],
  tas:  ['sd',  'redoblante'],
  toc:  ['rim', 'aro'],
  chas: ['cp',  'palmas'],
  chan: ['cr',  'platillo'],
  tin:  ['rd',  'ride'],
  chis: ['hh',  'hi-hat'],
  tsss: ['oh',  'hi-hat abierto'],
};
const NOTAS = { do:'c', re:'d', mi:'e', fa:'f', sol:'g', la:'a', si:'b' };
const ALTERACIONES = { sostenido:'#', bemol:'b' };
const ACORDES = {
  mayor:      [0, 4, 7],
  menor:      [0, 3, 7],
  quinta:     [0, 7],        // la viola distorsionada toca dos notas, no tres
  séptima:    [0, 4, 7, 10], // el acorde del boogie: do séptima = do mi sol si bemol
  disminuido: [0, 3, 6],
};
const CROMATICA = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const GRADOS = { c:0, d:2, e:4, f:5, g:7, a:9, b:11 };
// strudel no entiende «do mayor» como acorde: hay que darle las tres notas juntas
const nombreNota = (semi, oct) => CROMATICA[((semi % 12) + 12) % 12] + (oct + Math.floor(semi / 12));
const OCTAVAS = { 'muy grave':2, grave:3, agudo:5, 'muy agudo':6 };
const OCTAVA_BASE = 4;

const armarNota = p => [p.raiz, p.altN, p.octN, p.acorde].filter(Boolean).join(' ');

// altura como un número solo, para poder subirla y bajarla de a un semitono
const OCT_NOMBRE = Object.fromEntries(Object.entries(OCTAVAS).map(([k, v]) => [v, k]));
const SEMI_MIN = 12 * 2, SEMI_MAX = 12 * 6 + 11;   // de do muy grave a si muy agudo
const semiDe = d => GRADOS[NOTAS[d.raiz]] +
  (d.altN === 'sostenido' ? 1 : d.altN === 'bemol' ? -1 : 0) +
  12 * (d.octN ? OCTAVAS[d.octN] : OCTAVA_BASE);

function notaDesdeSemi(semi, acorde) {
  const oct = Math.floor(semi / 12), clase = ((semi % 12) + 12) % 12;
  const exacta = Object.entries(NOTAS).find(([, en]) => GRADOS[en] === clase);
  const abajo = exacta || Object.entries(NOTAS).find(([, en]) => GRADOS[en] === clase - 1);
  return [abajo[0], exacta ? '' : 'sostenido',
          oct === OCTAVA_BASE ? '' : OCT_NOMBRE[oct], acorde].filter(Boolean).join(' ');
}

// ------------------------------------------------------------------- la altura
// Cinco escalones, los mismos para un tambor que para un do, así que las dos
// maneras de escribir un paso se pueden comparar. El editor los
// pinta con la luz de la tinta —lo grave pesa, lo agudo es aire—, así que un
// bajo se ve hundido y una melodía que sube se ve subir sin leer las palabras.
const ALTURAS = 5;
const ALTO_GOLPE = {};
Object.keys(SONIDOS).forEach((w, i, t) =>
  ALTO_GOLPE[w] = 1 + Math.round(i / (t.length - 1) * (ALTURAS - 1)));
// las octavas van de 2 a 6 y ya vienen ordenadas: alcanza con correrlas al uno
const altoDeOctava = oct => Math.min(ALTURAS, Math.max(1, oct - 1));

const GM = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';

// El nombre de la parte elige el instrumento: «la viola toca» ya suena a viola.
// Son los 128 del General MIDI, agrupados como los agrupa el propio GM.
// Muestras: soundfont FluidR3 (CC-BY 3.0) vía gleitz.github.io/midi-js-soundfonts.
const FAMILIAS = [
  ['pianos', {
    'piano de concierto':'acoustic_grand_piano', 'piano brillante':'bright_acoustic_piano',
    'piano de cola':'electric_grand_piano', 'piano de bar':'honkytonk_piano',
    'piano eléctrico':'electric_piano_1', 'piano dulce':'electric_piano_2',
    'clavecín':'harpsichord', 'clavinet':'clavinet' }],
  ['láminas', {
    'celesta':'celesta', 'campanitas':'glockenspiel', 'cajita de música':'music_box',
    'vibráfono':'vibraphone', 'marimba':'marimba', 'xilofón':'xylophone',
    'campanas':'tubular_bells', 'salterio':'dulcimer' }],
  ['órganos', {
    'órgano':'drawbar_organ', 'órgano percusivo':'percussive_organ',
    'órgano de rock':'rock_organ', 'órgano de iglesia':'church_organ',
    'armonio':'reed_organ', 'acordeón':'accordion',
    'armónica':'harmonica', 'bandoneón':'tango_accordion' }],
  ['violas', {
    'viola criolla':'acoustic_guitar_nylon', 'viola':'acoustic_guitar_steel',
    'viola de jazz':'electric_guitar_jazz', 'viola eléctrica':'electric_guitar_clean',
    'viola muteada':'electric_guitar_muted', 'viola saturada':'overdriven_guitar',
    'viola distorsionada':'distortion_guitar', 'armónicos':'guitar_harmonics' }],
  ['bajos', {
    'bajo acústico':'acoustic_bass', 'bajo':'electric_bass_finger',
    'bajo con púa':'electric_bass_pick', 'bajo sin trastes':'fretless_bass',
    'bajo slap':'slap_bass_1', 'bajo slap dos':'slap_bass_2',
    'bajo sintético':'synth_bass_1', 'bajo sintético dos':'synth_bass_2' }],
  ['cuerdas', {
    'violín':'violin', 'viola de arco':'viola', 'chelo':'cello',
    'contrabajo':'contrabass', 'cuerdas trémolo':'tremolo_strings',
    'pizzicato':'pizzicato_strings', 'arpa':'orchestral_harp', 'timbal':'timpani' }],
  ['conjuntos', {
    'cuerdas':'string_ensemble_1', 'cuerdas suaves':'string_ensemble_2',
    'cuerdas sintéticas':'synth_strings_1', 'cuerdas sintéticas dos':'synth_strings_2',
    'coro':'choir_aahs', 'voces':'voice_oohs', 'coro sintético':'synth_choir',
    'golpe de orquesta':'orchestra_hit' }],
  ['metales', {
    'trompeta':'trumpet', 'trombón':'trombone', 'tuba':'tuba',
    'trompeta con sordina':'muted_trumpet', 'corno':'french_horn',
    'bronces':'brass_section', 'bronces sintéticos':'synth_brass_1',
    'bronces sintéticos dos':'synth_brass_2' }],
  ['cañas', {
    'saxo soprano':'soprano_sax', 'saxo alto':'alto_sax', 'saxo':'tenor_sax',
    'saxo barítono':'baritone_sax', 'oboe':'oboe', 'corno inglés':'english_horn',
    'fagot':'bassoon', 'clarinete':'clarinet' }],
  ['flautas', {
    'flautín':'piccolo', 'flauta':'flute', 'flauta dulce':'recorder',
    'siku':'pan_flute', 'botella':'blown_bottle', 'shakuhachi':'shakuhachi',
    'silbido':'whistle', 'ocarina':'ocarina' }],
  ['solistas', {
    'solista cuadrado':'lead_1_square', 'solista sierra':'lead_2_sawtooth',
    'solista calíope':'lead_3_calliope', 'solista soplado':'lead_4_chiff',
    'solista charango':'lead_5_charang', 'solista voz':'lead_6_voice',
    'solista en quintas':'lead_7_fifths', 'solista grave':'lead_8_bass__lead' }],
  ['colchones', {
    'colchón':'pad_1_new_age', 'colchón tibio':'pad_2_warm',
    'colchón polifónico':'pad_3_polysynth', 'colchón coral':'pad_4_choir',
    'colchón frotado':'pad_5_bowed', 'colchón metálico':'pad_6_metallic',
    'colchón halo':'pad_7_halo', 'colchón barrido':'pad_8_sweep' }],
  ['efectos', {
    'lluvia':'fx_1_rain', 'banda de sonido':'fx_2_soundtrack', 'cristal':'fx_3_crystal',
    'atmósfera':'fx_4_atmosphere', 'brillo':'fx_5_brightness', 'duendes':'fx_6_goblins',
    'ecos':'fx_7_echoes', 'ciencia ficción':'fx_8_scifi' }],
  ['del mundo', {
    'sitar':'sitar', 'banjo':'banjo', 'shamisen':'shamisen', 'koto':'koto',
    'kalimba':'kalimba', 'gaita':'bagpipe', 'violín folk':'fiddle', 'shanai':'shanai' }],
  ['percusión afinada', {
    'campanilla':'tinkle_bell', 'agogó':'agogo', 'tambores de acero':'steel_drums',
    'caja china':'woodblock', 'taiko':'taiko_drum', 'tom melódico':'melodic_tom',
    'tambor sintético':'synth_drum', 'platillo al revés':'reverse_cymbal' }],
  ['ruidos', {
    'roce de cuerdas':'guitar_fret_noise', 'respiración':'breath_noise', 'mar':'seashore',
    'pájaros':'bird_tweet', 'teléfono':'telephone_ring', 'helicóptero':'helicopter',
    'aplausos':'applause', 'disparo':'gunshot' }],
];

// Los que no salen del soundfont. El piano de dough-samples tiene 29 muestras y
// suena mejor que el del GM, así que «piano» es ése. Los osciladores no dependen
// de la red: si el soundfont no carga, siempre queda algo con qué sonar.
const SIN_GM = {
  'piano':      { fam:'pianos',      sonido:'piano',    cola:'' },
  'zumbido':    { fam:'osciladores', sonido:'sine',     cola:'.attack(.05).release(.3)' },
  'sierra':     { fam:'osciladores', sonido:'sawtooth', cola:'.lpf(1800)' },
  'cuadrada':   { fam:'osciladores', sonido:'square',   cola:'.lpf(1800)' },
  'triangular': { fam:'osciladores', sonido:'triangle', cola:'' },
};

const ALIAS = {
  'guitarra':'viola', 'guitarra criolla':'viola criolla', 'guitarra española':'viola criolla',
  'guitarra eléctrica':'viola eléctrica', 'saxofón':'saxo', 'violonchelo':'chelo',
  'organo':'órgano', 'fueye':'bandoneón', 'timbales':'timbal', 'teclado':'piano',
};

const INSTRUMENTO_POR_DEFECTO = 'piano';
const MAQUINA = 'linndrum';

// Las cajas de ritmo salen del pack que ya se carga. Se leen del propio strudel
// en vez de escribirlas a mano, así la lista siempre es la que de verdad hay.
const MARCAS = ['rolandcompurhythm', 'roland', 'akai', 'korg', 'yamaha', 'boss', 'casio',
  'alesis', 'linn', 'emu', 'oberheim', 'sequentialcircuits', 'simmons', 'mfb', 'doepfer',
  'sakata', 'univox', 'soundmaster'];
const ALIAS_MAQUINA = { '808':'rolandtr808', '909':'rolandtr909', '606':'rolandtr606',
  '707':'rolandtr707', '505':'rolandtr505', 'dmx':'oberheimdmx', 'mpc':'akaimpc60' };
let _maquinas = null;

function maquinas() {
  if (_maquinas) return _maquinas;
  const piezas = ['bd', 'sd', 'hh'];
  const tiene = {};
  try {
    for (const n of Object.keys(strudel.soundMap.get())) {
      const m = n.match(/^([a-z0-9]+)_([a-z]+)$/);
      if (m && piezas.includes(m[2])) (tiene[m[1]] = tiene[m[1]] || new Set()).add(m[2]);
    }
  } catch (e) { return {}; }
  const listas = Object.entries(tiene).filter(([, v]) => v.size === 3).map(([k]) => k);
  if (!listas.length) return {};
  _maquinas = Object.create(null);
  for (const n of listas.sort()) {
    const marca = MARCAS.find(x => n.startsWith(x)) || 'otras';
    const modelo = marca === 'otras' ? n : (n.slice(marca.length) || marca);
    _maquinas[norm(marca + ' ' + modelo)] = { nombre: marca + ' ' + modelo, marca, banco: n };
  }
  for (const [corto, largo] of Object.entries(ALIAS_MAQUINA)) {
    const halla = Object.values(_maquinas).find(m => m.banco === largo);
    if (halla) _maquinas[corto] = halla;
  }
  return _maquinas;
}
const maquinaDe = n => maquinas()[norm(n)];

// La cuarta columna, cuando está, es cada cuántas vueltas el modificador vuelve
// al principio. No es lo mismo que «.slow(2)», que estira la línea: «rodando»
// dura lo mismo pero tarda cuatro vueltas en repetirse.
const MODIFICADORES = [
  ['al doble',            '.fast(2)',           'el doble de rápido'],
  ['a la mitad',          '.slow(2)',           'la mitad de rápido'],
  ['a un cuarto',         '.slow(4)',           'cuatro veces más lento'],
  ['a un octavo',         '.slow(8)',           'ocho veces más lento'],
  ['cada golpe dos veces',  '.ply(2)',          'cada paso suena dos veces seguidas'],
  ['cada golpe tres veces', '.ply(3)',          'cada paso suena tres veces seguidas'],
  // separan el qué del cuándo: la nota la pone la línea, el pulso lo ponen estos
  ['en negras',           '.struct("x*4")',     'cada nota, cuatro veces por vuelta'],
  ['en corcheas',         '.struct("x*8")',     'cada nota, ocho veces por vuelta'],
  ['sincopado',           '.struct("x ~ ~ x ~ ~ x ~")', 'en el uno, la y de dos y el cuatro'],
  ['callado',             'mute',               'no suena, pero queda escrito'],
  ['bajito',              '.gain(.45)',         'más callado'],
  ['fuerte',              '.gain(1.3)',         'más alto'],
  // cuánto dura cada nota, que no es lo mismo que cada cuánto entra
  ['corto',               '.clip(.3)',          'cada nota dura un suspiro'],
  ['largo',               '.clip(2)',           'cada nota se estira sobre la siguiente'],
  ['entrando despacio',   '.attack(.3)',        'no arranca de golpe, aparece'],
  ['que se apaga',        '.release(1.2)',      'la cola tarda en irse'],
  ['apagado',             '.lpf(500)',          'como detrás de una puerta'],
  ['brillante',           '.hpf(700)',          'más filoso'],
  ['que se abre',         '.lpf(sine.range(300, 4000).slow(4))', 'el filtro respira, abriendo y cerrando'],
  ['con voz',             '.vowel("<a e i o u>")', 'una vocal distinta por vuelta'],
  ['roto',                '.crush(4)',          'como si entrara en un aparato viejo'],
  ['sucio',               '.distort(1).postgain(.6)', 'saturado, al borde'],
  ['temblando',           '.vib(5).vibmod(.3)', 'la afinación tiembla'],
  ['con eco',             '.room(.6)',          'suena en una sala grande'],
  ['repicando',           '.delay(.5).delaytime(.125).delayfeedback(.4)', 'se repite y se va apagando'],
  ['al revés',            '.rev()',             'de atrás para adelante'],
  ['de ida y vuelta',     '.palindrome()',      'una vuelta como está y la que sigue al revés', 2],
  ['rodando',             '.iter(4)',           'cada vuelta arranca un paso más adelante', 4],
  ['con swing',           '.swingBy(1/3, 4)',   'desparejo, arrastrado'],
  ['perdiendo golpes',    '.degradeBy(.3)',     'de a ratos falta uno'],
  ['de un lado al otro',  '.pan(sine)',         'se mueve entre los parlantes'],
  ['cruzado',             '.jux(rev)',          'a un parlante como está, al otro al revés'],
  // el acorde ya lo arma la línea: esto elige si suena junto o de a una nota
  ['arpegiado',           '.arp("0 1 2 3")',    'el acorde se desarma en notas, subiendo'],
  ['arpegiado bajando',   '.arp("2 1 0")',      'el acorde se desarma en notas, bajando'],
  ['una por vuelta',      '<>',                 'en vez de sonar juntos, se turnan'],
];

// ------------------------------------------------------------------ el arreglo
// «cuatro vueltas sí y cuatro no» no puede ser una fila más de la tabla: los
// números los pone el que escribe. Se arma y se lee acá, y de las mismas dos
// funciones salen las que ofrecen el menú y el sugeridor, así nunca discrepan.
const NUMEROS = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete',
                 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis'];
const VUELTAS_MAX = 32;                    // más que esto es una máscara ilegible

const enLetras = n => NUMEROS[n] || String(n);
const fraseArreglo = (n, q) =>
  enLetras(n) + (n === 1 ? ' vuelta' : ' vueltas') + ' sí y ' + enLetras(q) + ' no';

function cuantasVueltas(palabra) {
  if (/^\d+$/.test(palabra)) return parseInt(palabra, 10);
  if (palabra === 'uno') return 1;
  return NUMEROS.findIndex(x => norm(x) === palabra);
}

function leerArreglo(texto) {
  const m = norm(texto).match(/^(\S+) vueltas? si y (\S+) no$/);
  if (!m) return null;
  const n = cuantasVueltas(m[1]), q = cuantasVueltas(m[2]);
  return n >= 1 && q >= 1 && n + q <= VUELTAS_MAX ? { n, q } : null;
}

// Un elemento de <> dura una vuelta, así que <1 1 0 0> son dos sonando y dos
// calladas, y la cuenta vuelve a empezar sola.
const mascaraDe = (n, q) => '.mask("<' + ('1 '.repeat(n) + '0 '.repeat(q)).trim() + '>")';

const ARREGLOS = [[1, 1], [2, 2], [4, 4], [8, 8], [3, 1], [1, 3], [2, 6], [6, 2]];

// -------------------------------------------------------- el reparto euclidiano
// «tres en ocho» acomoda tres golpes en ocho pasos lo más parejo que se puede.
// Con dos números salen el tresillo, la clave y la chacarera.
const PASOS_MAX = 32;
const EUCLIDES = [[3, 8], [5, 8], [3, 4], [5, 16], [7, 16], [2, 3]];
const fraseEuclides = (n, m) => enLetras(n) + ' en ' + enLetras(m);

function leerEuclides(texto) {
  const t = norm(texto).match(/^(\S+) en (\S+)$/);
  if (!t) return null;
  const n = cuantasVueltas(t[1]), m = cuantasVueltas(t[2]);
  return n >= 2 && m > n && m <= PASOS_MAX ? { n, m, codigo: '.struct("x(' + n + ',' + m + ')")' } : null;
}

// ------------------------------------------------- las que envuelven a otra frase
// Adentro llevan otra frase de la tabla y la aplican de a ratos. Sirven todas
// menos las dos que no son código: «callado» y «una por vuelta».
const VECES = [
  ['de vez en cuando', '.rarely',       'una de cada cuatro vueltas, más o menos'],
  ['a veces',          '.sometimes',    'la mitad de las veces'],
  ['casi siempre',     '.almostAlways', 'casi todas'],
  ['casi nunca',       '.almostNever',  'muy de tanto en tanto'],
];

const ENVOLTURAS = [2, 3, 4, 8].map(k => 'cada ' + enLetras(k) + ' vueltas')
  .concat(VECES.map(v => v[0]));

// Se mide por palabras y no cortando el string: «de vez en cuando» son cuatro y
// «a veces» dos, y normalizar el texto entero movería los índices.
function partirEnvoltura(texto, base = 0) {
  const ws = palabras(texto, base);
  for (let k = Math.min(4, ws.length); k >= 2; k--) {
    const frase = ws.slice(0, k).map(x => norm(x.w)).join(' ');
    const cada = frase.match(/^cada (\S+) vueltas?$/);
    const vale = cada ? cuantasVueltas(cada[1]) >= 2 : VECES.some(v => norm(v[0]) === frase);
    if (!vale) continue;
    const fin = ws[k - 1].i + ws[k - 1].w.length;
    return { frase: ws.slice(0, k).map(x => x.w).join(' '), fin,
             dentro: ws.slice(k).map(x => x.w).join(' ') };
  }
  return null;
}

const modificadorDe = t => MODIFICADORES.find(m => norm(m[0]) === norm(t));
const envolvible = mod => !!mod && mod[1] !== 'mute' && mod[1] !== '<>';
const comoFuncion = codigo => 'x => x' + codigo;

// Las dos devuelven, además del código, cada cuántas vueltas vuelven al principio;
// si lo de adentro tiene su propio período, la línea es el mcm de los dos.
function leerCada(texto) {
  const t = norm(texto).match(/^cada (\S+) vueltas?\s*(.*)$/);
  if (!t) return null;
  const n = cuantasVueltas(t[1]);
  if (!(n >= 2 && n <= VUELTAS_MAX)) return { falla: 'numero' };
  const mod = modificadorDe(t[2]);
  if (!envolvible(mod)) return { falla: mod ? 'centinela' : 'dentro', dentro: t[2] };
  return { codigo: '.every(' + n + ', ' + comoFuncion(mod[1]) + ')', vueltas: n, adentro: mod[3] || 1 };
}

function leerVeces(texto) {
  const n = norm(texto);
  for (const [frase, fn] of VECES) {
    const frente = norm(frase);
    if (n !== frente && !n.startsWith(frente + ' ')) continue;
    const resto = n.slice(frente.length).trim();
    const mod = modificadorDe(resto);
    if (!envolvible(mod)) return { falla: mod ? 'centinela' : 'dentro', dentro: resto };
    return { codigo: fn + '(' + comoFuncion(mod[1]) + ')', vueltas: 1, adentro: mod[3] || 1 };
  }
  return null;
}

const SUJETOS_BANDA = ['la banda', 'el tema', 'la cancion'];
const SUJETO_BANDA = /^(?:la banda |el tema |la cancion )?/;

// ------------------------------------------------------------- la forma

// cuántas vueltas puede durar un tema entero: es lo que la cinta dibuja de punta
// a punta, y más que esto no se ve como una forma, se ve como una tira
const VUELTAS_FORMA = 256;

// Devuelve el nombre dos veces: «nombre» normalizado, que es con el que se
// compara, y «escrito» como se tecleó, que es el que se muestra —quien escribe
// «la sección:» tiene que ver «sección» y no «seccion»—. Las dos listas de
// palabras se corresponden una a una porque norm() no parte ni junta palabras.
function leerSeccion(texto) {
  if (/\b(toca|tocan)\b/i.test(texto)) return null;
  const m = texto.match(/^\s*(.*?)\s*:\s*$/);
  if (!m) return null;
  const cuerpo = norm(m[1]).replace(SUJETO_BANDA, '').replace(/^(?:el|la|los|las) /, '');
  if (!cuerpo) return { falla: 'sinNombre' };
  const crudas = m[1].split(/\s+/).filter(Boolean);
  const suyas = crudas.slice(-cuerpo.split(' ').length);
  const dura = cuerpo.match(/^(\S+)\s+dura\s+(\S+)\s+vueltas?$/);
  const nombre = dura ? dura[1] : cuerpo;
  // el que no entra se muestra entero y como se escribió, y va bajo «escrito» para
  // que «nombre» sea siempre el normalizado
  if (!/^[a-z0-9]+$/.test(nombre)) return { falla: 'nombre', escrito: suyas.join(' ') };
  const escrito = suyas[0];
  if (!dura) return { nombre, escrito, vueltas: null };
  const v = cuantasVueltas(dura[2]);
  if (!(v >= 1 && v <= VUELTAS_FORMA)) return { falla: 'dura' };
  return { nombre, escrito, vueltas: v };
}

// «va estrofa estrofa estribillo». Lo que decide entre la forma y el tempo es lo
// que sigue a «va»: se pide el número y no sólo el «a» porque una sección se
// puede llamar «a», y entonces «va a b c» es una forma de tres.
function leerForma(texto) {
  if (/\b(toca|tocan)\b/i.test(texto)) return null;
  const m = norm(texto).replace(SUJETO_BANDA, '').match(/^va\s+(.+)$/);
  if (!m || /^a(\s+\d|$)/.test(m[1])) return null;
  return { nombres: m[1].split(' ').filter(Boolean) };
}

// lo que acepta el reloj, y lo mismo que el menú y el arrastre ofrecen:
// una sola cuenta, así el ▾ nunca escribe un número que después es un error
const TEMPO_MIN = 20, TEMPO_MAX = 400;

function esTempo(texto) {
  // una línea con «toca» es una parte, aunque se llame «la banda»: sin esto,
  // «la banda toca pum - pum -» salía con un error sobre el tempo
  if (/\b(toca|tocan)\b/i.test(texto)) return false;
  // «el tema va estrofa» es la forma y no un tempo mal escrito; sin este corte
  // caía acá por el sujeto y pedía que le escribieran un número
  if (leerForma(texto)) return false;
  const dos = norm(texto).split(' ').slice(0, 2).join(' ');
  return dos === 'va a' || SUJETOS_BANDA.includes(dos);
}

// «séptima» se busca sin tilde, como sale escrito de cualquier teclado apurado
const ACORDE = Object.fromEntries(Object.entries(ACORDES).map(([k, v]) => [norm(k), v]));

// el nombre que strudel va a ver: sin tildes, sin espacios, una sola palabra
const apodo = s => norm(s).replace(/[^a-z0-9]/g, '');
const INSTRUMENTOS = {};
for (const [fam, tabla] of FAMILIAS)
  for (const [nombre, gm] of Object.entries(tabla))
    INSTRUMENTOS[norm(nombre)] = { nombre, gm, fam, sonido: apodo(nombre), cola: '' };
for (const [nombre, o] of Object.entries(SIN_GM))
  INSTRUMENTOS[norm(nombre)] = { nombre, ...o };
for (const [de, a] of Object.entries(ALIAS))
  INSTRUMENTOS[norm(de)] = INSTRUMENTOS[norm(a)];
// Se consultan con la palabra tal como la escribió el usuario, y «constructor»
// es una palabra: sin prototipo, lo que no está en la tabla no está.
for (const t of [SONIDOS, NOTAS, ALTERACIONES, OCTAVAS, ACORDE, INSTRUMENTOS]) Object.setPrototypeOf(t, null);
const instrumentoDe = n => INSTRUMENTOS[norm(n)];

// Los alias van aparte: INSTRUMENTOS[«guitarra»] apunta al mismo objeto que
// «viola», así que su .nombre es «viola» y la palabra que el usuario escribió no
// aparecería nunca en esta lista.
const TODAS_LAS_PALABRAS = () => [
  ...Object.keys(SONIDOS), ...Object.keys(NOTAS), ...Object.keys(ALTERACIONES), ...Object.keys(ACORDES),
  ...Object.keys(OCTAVAS), ...new Set(Object.values(INSTRUMENTOS).map(i => i.nombre)), ...Object.keys(ALIAS),
  ...MODIFICADORES.map(m => m[0]),
];

function parecida(palabra) {
  const p = norm(palabra);
  let mejor = null, min = Infinity;
  for (const c of TODAS_LAS_PALABRAS()) {
    const d = distancia(p, norm(c));
    if (d < min) { min = d; mejor = c; }
  }
  return min <= Math.max(2, Math.floor(p.length / 3)) ? mejor : null;
}
