// ---------------------------------------------------------------- vocabulario
// de grave a agudo: del orden salen la altura y el color de cada golpe
// la vocal dice la altura —u grave, a medio, i agudo— y la consonante el material: p parche
// al centro, t/d parche al borde y madera, ch/ts/sh metal y aire, pl/cl lo que se choca
const SONIDOS = {
  pum:  ['bd',  'bombo'],
  dum:  ['lt',  'tom grave'],
  tum:  ['mt',  'tom'],
  tim:  ['ht',  'tom agudo'],
  pa:   ['sd',  'redoblante'],
  toc:  ['rim', 'aro'],
  plas: ['cp',  'palmas'],
  clon: ['cb',  'cencerro'],
  chan: ['cr',  'platillo'],
  tin:  ['rd',  'ride'],
  chis: ['hh',  'hi-hat'],
  shh:  ['sh',  'shaker'],
  tsss: ['oh',  'hi-hat abierto'],
};
// los nombres de antes: el aviso dice cómo se escriben ahora
const GOLPES_VIEJOS = { tas: 'pa', chas: 'plas' };
const NOTAS = { do:'c', re:'d', mi:'e', fa:'f', sol:'g', la:'a', si:'b' };
const ALTERACIONES = { sostenido:'#', bemol:'b' };
const ACORDES = {
  mayor:      [0, 4, 7],
  menor:      [0, 3, 7],
  quinta:     [0, 7],        // la viola distorsionada toca dos notas, no tres
  séptima:    [0, 4, 7, 10], // la de dominante, la del boogie
  disminuido: [0, 3, 6],
  'menor séptima': [0, 3, 7, 10],
  'mayor séptima': [0, 4, 7, 11],
  suspendido: [0, 5, 7],
  aumentado:  [0, 4, 8],
};
const CROMATICA = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const GRADOS = { c:0, d:2, e:4, f:5, g:7, a:9, b:11 };
// strudel no entiende «do mayor»: hay que darle las notas
const nombreNota = (semi, oct) => CROMATICA[((semi % 12) + 12) % 12] + (oct + Math.floor(semi / 12));
const OCTAVAS = { 'muy grave':2, grave:3, agudo:5, 'muy agudo':6 };
const OCTAVA_BASE = 4;

const armarNota = p => [p.raiz, p.altN, p.octN, p.acorde].filter(Boolean).join(' ');

// la altura como un número, para subirla y bajarla de a un semitono
const OCT_NOMBRE = Object.fromEntries(Object.entries(OCTAVAS).map(([k, v]) => [v, k]));
const SEMI_MIN = 12 * 2, SEMI_MAX = 12 * 6 + 11;   // de do muy grave a si muy agudo
const semiDe = d => GRADOS[NOTAS[d.raiz]] +
  (d.altN === 'sostenido' ? 1 : d.altN === 'bemol' ? -1 : 0) +
  12 * (d.octN ? OCTAVAS[d.octN] : OCTAVA_BASE);

function notaDesdeSemi(semi, acorde) {
  const oct = Math.floor(semi / 12), clase = ((semi % 12) + 12) % 12;
  const exacta = Object.entries(NOTAS).find(([, en]) => GRADOS[en] === clase);
  const abajo = exacta || Object.entries(NOTAS).find(([, en]) => GRADOS[en] === clase - 1);
  return armarNota({ raiz: abajo[0], altN: exacta ? '' : 'sostenido',
                     octN: oct === OCTAVA_BASE ? '' : OCT_NOMBRE[oct], acorde });
}

// ------------------------------------------------------------------- la altura
// cinco escalones, los mismos para un golpe que para una nota, así se comparan
const ALTURAS = 5;
const ALTO_GOLPE = {};
Object.keys(SONIDOS).forEach((w, i, t) =>
  ALTO_GOLPE[w] = 1 + Math.round(i / (t.length - 1) * (ALTURAS - 1)));
// las octavas van de 2 a 6
const altoDeOctava = oct => Math.min(ALTURAS, Math.max(1, oct - 1));

const GM = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';

// los 128 del General MIDI, en sus familias; muestras del soundfont FluidR3 (CC-BY 3.0)
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

// «piano» es el de dough-samples, que suena mejor que el del GM; los osciladores suenan sin red
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

// las cajas de ritmo se le preguntan a strudel: son las del pack que ya carga
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
      if (m) (tiene[m[1]] = tiene[m[1]] || new Set()).add(m[2]);
    }
  } catch (e) { return {}; }
  // una caja es un banco que tiene al menos bombo, redoblante y hi-hat
  const listas = Object.entries(tiene).filter(([, v]) => piezas.every(p => v.has(p))).map(([k]) => k);
  if (!listas.length) return {};
  _maquinas = Object.create(null);
  for (const n of listas.sort()) {
    const marca = MARCAS.find(x => n.startsWith(x)) || 'otras';
    const modelo = marca === 'otras' ? n : (n.slice(marca.length) || marca);
    _maquinas[norm(marca + ' ' + modelo)] = { nombre: marca + ' ' + modelo, marca, banco: n, piezas: tiene[n] };
  }
  for (const [corto, largo] of Object.entries(ALIAS_MAQUINA)) {
    const halla = Object.values(_maquinas).find(m => m.banco === largo);
    if (halla) _maquinas[corto] = halla;
  }
  return _maquinas;
}
const maquinaDe = n => maquinas()[norm(n)];
const cajaDe = banco => Object.values(maquinas()).find(m => m.banco === banco);

const MODIFICADORES = [
  ['al doble',            '.fast(2)',           'el doble de rápido'],
  ['a la mitad',          '.slow(2)',           'la mitad de rápido'],
  ['a un cuarto',         '.slow(4)',           'cuatro veces más lento'],
  ['cada golpe dos veces',  '.ply(2)',          'cada paso suena dos veces seguidas'],
  ['callado',             'mute',               'no suena, pero queda escrito'],
  ['muy bajito',          '.gain(.25)',         'apenas se oye'],
  ['bajito',              '.gain(.45)',         'más callado'],
  ['fuerte',              '.gain(1.3)',         'más alto'],
  ['muy fuerte',          '.gain(1.6)',         'lo más alto que va'],
  ['corto',               '.clip(.3)',          'cada nota dura un suspiro'],
  ['largo',               '.clip(2)',           'cada nota se estira sobre la siguiente'],
  ['entrando despacio',   '.attack(.3)',        'no arranca de golpe, aparece'],
  ['que se apaga',        '.release(1.2)',      'la cola tarda en irse'],
  ['apagado',             '.lpf(500)',          'como detrás de una puerta'],
  ['brillante',           '.hpf(700)',          'más filoso'],
  ['sucio',               '.distort(1).postgain(.6)', 'saturado, al borde'],
  ['temblando',           '.vib(5).vibmod(.3)', 'la afinación tiembla'],
  ['con eco',             '.room(.6)',          'suena en una sala grande'],
  ['repicando',           '.delay(.5).delaytime(.125).delayfeedback(.4)', 'se repite y se va apagando'],
  ['a la izquierda',      '.pan(.2)',           'del parlante izquierdo'],
  ['a la derecha',        '.pan(.8)',           'del parlante derecho'],
  ['al revés',            '.rev()',             'de atrás para adelante'],
  ['con swing',           '.swingBy(1/3, 4)',   'desparejo, arrastrado'],
  ['arpegiado',           '.arp("0 1 2 3")',    'el acorde se desarma en notas, subiendo'],
  ['arpegiado bajando',   '.arp("2 1 0")',      'el acorde se desarma en notas, bajando'],
  // sólo con notas: en una línea de golpes el traductor avisa
  ['una octava arriba',   '.transpose(12)',     'lo mismo, una octava más agudo'],
  ['una octava abajo',    '.transpose(-12)',    'lo mismo, una octava más grave'],
  ['un tono arriba',      '.transpose(2)',      'lo mismo, un tono más agudo'],
  ['un tono abajo',       '.transpose(-2)',     'lo mismo, un tono más grave'],
  ['medio tono arriba',   '.transpose(1)',      'lo mismo, medio tono más agudo'],
  ['medio tono abajo',    '.transpose(-1)',     'lo mismo, medio tono más grave'],
];

// los que ponen un valor: dos en la misma línea se pisan y el traductor avisa.
// fast, slow, ply, transpose, rev y mute se componen, o repetirlos no cambia nada
const PISAN = new Set(['gain', 'clip', 'attack', 'release', 'lpf', 'hpf', 'distort', 'vib',
                       'room', 'delay', 'pan', 'arp', 'swingBy']);

// lo que se fue del idioma; el aviso dice con qué se escribe ahora, si hay con qué
const RETIRADOS = {
  'una por vuelta': 'escribí «|» entre los pasos que van en vueltas distintas: «do mayor | fa mayor»',
  'sincopado': 'escribí el ritmo con pasos: «pum - - pum - - pum -»',
  'con voz': '', 'roto': '', 'rodando': '', 'de ida y vuelta': '', 'perdiendo golpes': '',
  'de un lado al otro': '', 'cruzado': '', 'que se abre': '', 'cada golpe tres veces': '', 'a un octavo': '',
};

// «en corcheas»: cada nota, tantas veces por vuelta
const FIGURAS = { blancas: 2, negras: 4, corcheas: 8, tresillos: 12, semicorcheas: 16 };
function leerFigura(texto) {
  const m = norm(texto).match(/^en (\S+)$/);
  const n = m && FIGURAS[m[1]];
  return n ? { codigo: '.struct("x*' + n + '")' } : null;
}

// ------------------------------------------------------------------ el arreglo
// lleva números, así que no es una fila de la tabla; el menú y el sugeridor salen de estas mismas funciones
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

// en <> cada elemento dura una vuelta: <1 1 0 0> son dos sí y dos no
const mascaraDe = (n, q) => '.mask("<' + ('1 '.repeat(n) + '0 '.repeat(q)).trim() + '>")';

const ARREGLOS = [[1, 1], [2, 2], [4, 4], [8, 8], [3, 1], [1, 3], [2, 6], [6, 2]];

// -------------------------------------------------------- el reparto euclidiano
// «tres en ocho»: tres golpes repartidos parejo en ocho pasos
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
// llevan adentro otra frase de la tabla y la aplican de a ratos
const VECES = [
  ['de vez en cuando', '.rarely',       'una de cada cuatro vueltas, más o menos'],
  ['a veces',          '.sometimes',    'la mitad de las veces'],
  ['casi siempre',     '.almostAlways', 'casi todas'],
  ['casi nunca',       '.almostNever',  'muy de tanto en tanto'],
];

const ENVOLTURAS = [2, 3, 4, 8].map(k => 'cada ' + enLetras(k) + ' vueltas')
  .concat(VECES.map(v => v[0]));

// por palabras: normalizar el texto entero movería los índices
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
const envolvible = mod => !!mod && mod[1] !== 'mute';
const comoFuncion = codigo => 'x => x' + codigo;

function leerCada(texto) {
  const t = norm(texto).match(/^cada (\S+) vueltas?\s*(.*)$/);
  if (!t) return null;
  const n = cuantasVueltas(t[1]);
  if (!(n >= 2 && n <= VUELTAS_MAX)) return { falla: 'numero' };
  const mod = modificadorDe(t[2]);
  if (!envolvible(mod)) return { falla: mod ? 'centinela' : 'dentro', dentro: t[2] };
  return { codigo: '.every(' + n + ', ' + comoFuncion(mod[1]) + ')', vueltas: n };
}

function leerVeces(texto) {
  const n = norm(texto);
  for (const [frase, fn] of VECES) {
    const frente = norm(frase);
    if (n !== frente && !n.startsWith(frente + ' ')) continue;
    const resto = n.slice(frente.length).trim();
    const mod = modificadorDe(resto);
    if (!envolvible(mod)) return { falla: mod ? 'centinela' : 'dentro', dentro: resto };
    return { codigo: fn + '(' + comoFuncion(mod[1]) + ')', vueltas: 1 };
  }
  return null;
}

const SUJETOS_BANDA = ['la banda', 'el tema', 'la cancion'];
const SUJETO_BANDA = new RegExp('^(?:' + SUJETOS_BANDA.map(s => s + ' ').join('|') + ')?');
// una línea con el verbo es una parte, sea lo que sea el resto
const VERBO = /^(toca|tocan)$/i, CON_VERBO = /\b(toca|tocan)\b/i;

// ------------------------------------------------------------- la forma

// más que esto la cinta no se lee como una forma
const VUELTAS_FORMA = 256;

// «nombre» es el normalizado, para comparar; «escrito» como se tecleó, para mostrar.
// crudas y cuerpo van palabra a palabra porque norm() no parte ni junta palabras
function leerSeccion(texto) {
  if (CON_VERBO.test(texto)) return null;
  const m = texto.match(/^\s*(.*?)\s*:\s*$/);
  if (!m) return null;
  const cuerpo = norm(m[1]).replace(SUJETO_BANDA, '').replace(/^(?:el|la|los|las) /, '');
  if (!cuerpo) return { falla: 'sinNombre' };
  const crudas = m[1].split(/\s+/).filter(Boolean);
  const suyas = crudas.slice(-cuerpo.split(' ').length);
  const dura = cuerpo.match(/^(\S+)\s+dura\s+(\S+)\s+vueltas?$/);
  const nombre = dura ? dura[1] : cuerpo;
  if (!/^[a-z0-9]+$/.test(nombre)) return { falla: 'nombre', escrito: suyas.join(' ') };
  const escrito = suyas[0];
  if (!dura) return { nombre, escrito, vueltas: null };
  const v = cuantasVueltas(dura[2]);
  if (!(v >= 1 && v <= VUELTAS_FORMA)) return { falla: 'dura' };
  return { nombre, escrito, vueltas: v };
}

// «va a» es tempo sólo con número: una sección se puede llamar «a»
function leerForma(texto) {
  if (CON_VERBO.test(texto)) return null;
  const m = norm(texto).replace(SUJETO_BANDA, '').match(/^va\s+(.+)$/);
  if (!m || /^a(\s+\d|$)/.test(m[1])) return null;
  return { nombres: m[1].split(' ').filter(Boolean) };
}

// el mismo rango que ofrecen el menú y el arrastre
const TEMPO_MIN = 20, TEMPO_MAX = 400;
// «va a 120 en tres»: cuántos tiempos tiene una vuelta
const TIEMPOS_MAX = 12;

function esTempo(texto) {
  if (CON_VERBO.test(texto)) return false;
  // «el tema va estrofa» es la forma
  if (leerForma(texto)) return false;
  const dos = norm(texto).split(' ').slice(0, 2).join(' ');
  return dos === 'va a' || SUJETOS_BANDA.includes(dos);
}

const ACORDE = Object.fromEntries(Object.entries(ACORDES).map(([k, v]) => [norm(k), v]));

// el nombre que strudel va a ver
const apodo = s => norm(s).replace(/[^a-z0-9]/g, '');
const INSTRUMENTOS = {};
for (const [fam, tabla] of FAMILIAS)
  for (const [nombre, gm] of Object.entries(tabla))
    INSTRUMENTOS[norm(nombre)] = { nombre, gm, fam, sonido: apodo(nombre), cola: '' };
for (const [nombre, o] of Object.entries(SIN_GM))
  INSTRUMENTOS[norm(nombre)] = { nombre, ...o };
for (const [de, a] of Object.entries(ALIAS))
  INSTRUMENTOS[norm(de)] = INSTRUMENTOS[norm(a)];
// «constructor» es una palabra: sin prototipo, lo que no está no está
for (const t of [SONIDOS, NOTAS, ALTERACIONES, OCTAVAS, ACORDE, INSTRUMENTOS, FIGURAS, RETIRADOS, GOLPES_VIEJOS]) Object.setPrototypeOf(t, null);
const instrumentoDe = n => INSTRUMENTOS[norm(n)];

// los alias van aparte: su .nombre es el del instrumento al que apuntan
const TODAS_LAS_PALABRAS = () => [
  ...Object.keys(SONIDOS), ...Object.keys(NOTAS), ...Object.keys(ALTERACIONES), ...Object.keys(ACORDES),
  ...Object.keys(OCTAVAS), ...new Set(Object.values(INSTRUMENTOS).map(i => i.nombre)), ...Object.keys(ALIAS),
  ...MODIFICADORES.map(m => m[0]), ...Object.keys(FIGURAS).map(f => 'en ' + f),
];

// nunca más cambios que letras: a nada no se le parece nada
function parecida(palabra) {
  const p = norm(palabra);
  let mejor = null, min = Infinity;
  for (const c of TODAS_LAS_PALABRAS()) {
    const d = distancia(p, norm(c));
    if (d < min) { min = d; mejor = c; }
  }
  return min <= Math.min(p.length, Math.max(2, Math.floor(p.length / 3))) ? mejor : null;
}
