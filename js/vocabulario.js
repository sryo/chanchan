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
  clac: ['cl',  'claves'],
  plas: ['cp',  'palmas'],
  ras:  ['gu',  'güiro'],
  clon: ['cb',  'cencerro'],
  chan: ['cr',  'platillo'],
  tin:  ['rd',  'ride'],
  tilín: ['tr', 'triángulo'],
  chis: ['hh',  'hi-hat'],
  chin: ['tb',  'pandereta'],
  shh:  ['sh',  'shaker'],
  tsss: ['oh',  'hi-hat abierto'],
};
// los nombres de antes, ya normalizados: el aviso dice cómo se escriben ahora y lo arregla
const RENOMBRADOS = {
  golpe: { tas: 'pa', chas: 'plas' },
  clausula: { brillante: 'sin graves' },
  instrumento: { 'bajo acustico': 'contrabajo', 'solista charango': 'sintetizador distorsionado',
    'solista cuadrado': 'sintetizador cuadrado', 'solista sierra': 'sintetizador sierra',
    'solista caliope': 'sintetizador calíope', 'solista soplado': 'sintetizador soplado',
    'solista distorsionado': 'sintetizador distorsionado', 'solista voz': 'sintetizador de voz',
    'solista en quintas': 'sintetizador en quintas', 'solista grave': 'sintetizador grave' },
};
const NOTAS = { do:'c', re:'d', mi:'e', fa:'f', sol:'g', la:'a', si:'b' };
const ALTERACIONES = { sostenido:'#', bemol:'b' };
const ACORDES = {
  mayor:      [0, 4, 7],
  menor:      [0, 3, 7],
  quinta:     [0, 7],        // la viola distorsionada toca dos notas, no tres
  séptima:    [0, 4, 7, 10], // la de dominante, la del boogie
  disminuido: [0, 3, 6, 9],
  'menor séptima': [0, 3, 7, 10],
  'mayor séptima': [0, 4, 7, 11],
  suspendido: [0, 5, 7],
  aumentado:  [0, 4, 8],
  sexta:      [0, 4, 7, 9],
  'menor sexta': [0, 3, 7, 9],
  novena:     [0, 4, 7, 10, 14],
  semidisminuido: [0, 3, 6, 10],
};
// cómo suena cada uno, dicho para cualquiera: lo usan el ▾ y el IDIOMA.md
const ACORDES_GLOSA = {
  mayor: 'el de siempre', menor: 'el triste', quinta: 'dos notas, como una viola distorsionada',
  séptima: 'el del blues', disminuido: 'el tenso, el del tango',
  'menor séptima': 'el menor con una nota más, el del soul', 'mayor séptima': 'el mayor con una nota más, el de la bossa',
  suspendido: 'ni mayor ni menor, en el aire', aumentado: 'el mayor estirado, el raro',
  sexta: 'el mayor, más dulce', 'menor sexta': 'el menor, más oscuro',
  novena: 'el del blues, más lleno', semidisminuido: 'el tenso, más suave',
};
// como también se dicen; no se ofrecen, se entienden
const ACORDES_DICHOS = { 'séptima mayor': 'mayor séptima', 'siete mayor': 'mayor séptima',
                         siete: 'séptima', 'menor siete': 'menor séptima' };
// el cifrado de quien ya toca, de cancionero o americano: se tipea así y se escribe en palabras.
// La mayúscula es el acorde, como en un cancionero: «Do» es do mayor, y «do», la nota
const CIFRADO = {
  '': 'mayor', M: 'mayor', maj: 'mayor',
  m: 'menor', min: 'menor',
  5: 'quinta', 6: 'sexta', 7: 'séptima', 9: 'novena', m6: 'menor sexta',
  m7: 'menor séptima', min7: 'menor séptima',
  maj7: 'mayor séptima', M7: 'mayor séptima', '7M': 'mayor séptima', 'Δ': 'mayor séptima', 'Δ7': 'mayor séptima', '∆': 'mayor séptima', '∆7': 'mayor séptima',
  dim: 'disminuido', dim7: 'disminuido', '°': 'disminuido', '°7': 'disminuido', 'º': 'disminuido', 'º7': 'disminuido',
  m7b5: 'semidisminuido', 'm7(b5)': 'semidisminuido', 'm7♭5': 'semidisminuido', 'ø': 'semidisminuido', 'ø7': 'semidisminuido',
  sus: 'suspendido', sus4: 'suspendido',
  aug: 'aumentado', '+': 'aumentado',
};
const RAIZ_AMERICANA = { C: 'do', D: 're', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si' };
// al revés, para mostrarlo al lado de las palabras: una forma por acorde, y deCifrado() la entiende
const CIFRADO_DE = { mayor: '', menor: 'm', quinta: '5', séptima: '7', disminuido: '°', 'menor séptima': 'm7',
  'mayor séptima': '7M', suspendido: 'sus4', aumentado: '+', sexta: '6', 'menor sexta': 'm6', novena: '9', semidisminuido: 'm7b5' };
const cifradoDe = p => p.raiz[0].toUpperCase() + p.raiz.slice(1) +
  (p.altN === 'sostenido' ? '#' : p.altN === 'bemol' ? 'b' : '') + CIFRADO_DE[p.acorde];
// «Lam7!» → «la menor séptima!»; null si la palabra no es cifrado o ya es del idioma
function deCifrado(palabra) {
  const m = palabra.match(/^(Do|Re|Mi|Fa|Sol|La|Si|do|re|mi|fa|sol|la|si|[A-G])([#♯b♭]?)(.*?)(!?)$/);
  if (!m) return null;
  const [, raiz, alt, cola, acento] = m, acorde = /^[A-Z]/.test(raiz) || cola ? CIFRADO[cola] : '';
  if (acorde == null || (!acorde && !alt)) return null;
  const nota = RAIZ_AMERICANA[raiz] || raiz.toLowerCase();
  return [nota, alt && (/[#♯]/.test(alt) ? 'sostenido' : 'bemol'), acorde].filter(Boolean).join(' ') + acento;
}
const CROMATICA = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const GRADOS = { c:0, d:2, e:4, f:5, g:7, a:9, b:11 };
// strudel no entiende «do mayor»: hay que darle las notas
const nombreNota = (semi, oct) => CROMATICA[((semi % 12) + 12) % 12] + (oct + Math.floor(semi / 12));

// cada acorde, en semitonos, toma la vuelta que menos se mueve desde el anterior, como lo tocaría una
// mano; el primero queda como está escrito, y ninguno se va a más de seis semitonos de donde se escribió
function enlazarAcordes(acordes) {
  const media = xs => xs.reduce((a, x) => a + x, 0) / xs.length;
  const cerca = (xs, ys) => xs.reduce((a, x) => a + Math.min(...ys.map(y => Math.abs(x - y))), 0);
  // cuánto se mueve, después cuánto se aleja de lo escrito, después la vuelta más baja
  const gana = (a, b) => { const i = a.findIndex((x, j) => x !== b[j]); return i >= 0 && a[i] < b[i]; };
  let antes = null;
  return acordes.map(escrito => {
    let elegido = escrito;
    if (antes && escrito.length > 2) {
      let mejor = null;
      escrito.forEach((_, vuelta) => [0, -12].forEach(corre => {
        const cand = escrito.map((x, j) => x + (j < vuelta ? 12 : 0) + corre).sort((a, b) => a - b);
        const lejos = Math.abs(media(cand) - media(escrito));
        if (lejos > 6) return;
        const costo = [cerca(cand, antes) + cerca(antes, cand), lejos, vuelta];
        if (!mejor || gana(costo, mejor.costo)) mejor = { cand, costo };
      }));
      elegido = mejor ? mejor.cand : escrito;
    }
    antes = elegido;
    return elegido;
  });
}
const OCTAVAS = { 'muy grave':2, grave:3, agudo:5, 'muy agudo':6 };
const OCTAVA_BASE = 4;

// el acorde llega normalizado: se escribe con sus tildes, y el «!» se queda
const nombreAcorde = a => a && ([...Object.keys(ACORDES), ...Object.keys(ACORDES_DICHOS)].find(k => norm(k) === a) || a);
// el de la tabla: «siete» es séptima
const acordeDeTabla = a => { const n = nombreAcorde(a); return ACORDES_DICHOS[n] || n; };
const armarNota = p => [p.raiz, p.altN, p.octN, nombreAcorde(p.acorde)].filter(Boolean).join(' ') + (p.acento ? '!' : '');

// la altura como un número, para subirla y bajarla de a un semitono
const OCT_NOMBRE = Object.fromEntries(Object.entries(OCTAVAS).map(([k, v]) => [v, k]));
const SEMI_MIN = 12 * 2, SEMI_MAX = 12 * 6 + 11;   // de do muy grave a si muy agudo
const semiDe = d => GRADOS[NOTAS[d.raiz]] +
  (d.altN === 'sostenido' ? 1 : d.altN === 'bemol' ? -1 : 0) +
  12 * (d.octN ? OCTAVAS[d.octN] : OCTAVA_BASE);

function notaDesdeSemi(semi, acorde, acento) {
  const oct = Math.floor(semi / 12), clase = ((semi % 12) + 12) % 12;
  const exacta = Object.entries(NOTAS).find(([, en]) => GRADOS[en] === clase);
  const abajo = exacta || Object.entries(NOTAS).find(([, en]) => GRADOS[en] === clase - 1);
  return armarNota({ raiz: abajo[0], altN: exacta ? '' : 'sostenido',
                     octN: oct === OCTAVA_BASE ? '' : OCT_NOMBRE[oct], acorde, acento });
}

// ------------------------------------------------------------------- la altura
// cinco escalones, los mismos para un golpe que para una nota, así se comparan
const ALTURAS = 5;
const ALTO_GOLPE = {};
Object.keys(SONIDOS).forEach((w, i, t) =>
  ALTO_GOLPE[w] = 1 + Math.round(i / (t.length - 1) * (ALTURAS - 1)));
// los golpes por familia, para que el ▾ no sea una columna de diecisiete
const GRUPOS_GOLPES = [
  ['tambores', ['pum', 'dum', 'tum', 'tim', 'pa', 'toc']],
  ['platillos', ['chan', 'tin', 'chis', 'tsss']],
  ['de mano', ['clac', 'plas', 'ras', 'clon', 'tilín', 'chin', 'shh']],
];

// las que llevan tilde llegan del texto sin ella: se encuentran igual, y no se ofrecen dos veces
for (const t of [SONIDOS, ALTO_GOLPE])
  for (const k of Object.keys(t)) if (norm(k) !== k) Object.defineProperty(t, norm(k), { value: t[k] });
// las octavas van de 2 a 6
const altoDeOctava = oct => Math.min(ALTURAS, Math.max(1, oct - 1));

const GM = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';

// los 128 del General MIDI, en sus familias; muestras del soundfont FluidR3 (CC-BY 3.0)
const FAMILIAS = [
  ['pianos', {
    'piano de concierto':'acoustic_grand_piano', 'piano brillante':'bright_acoustic_piano',
    'piano de cola eléctrico':'electric_grand_piano', 'piano de bar':'honkytonk_piano',
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
    'contrabajo':'acoustic_bass', 'bajo':'electric_bass_finger',
    'bajo con púa':'electric_bass_pick', 'bajo sin trastes':'fretless_bass',
    'bajo slap':'slap_bass_1', 'bajo slap dos':'slap_bass_2',
    'bajo sintético':'synth_bass_1', 'bajo sintético dos':'synth_bass_2' }],
  ['cuerdas', {
    'violín':'violin', 'viola de arco':'viola', 'chelo':'cello',
    'contrabajo con arco':'contrabass', 'cuerdas trémolo':'tremolo_strings',
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
  ['sintetizadores', {
    'sintetizador cuadrado':'lead_1_square', 'sintetizador sierra':'lead_2_sawtooth',
    'sintetizador calíope':'lead_3_calliope', 'sintetizador soplado':'lead_4_chiff',
    'sintetizador distorsionado':'lead_5_charang', 'sintetizador de voz':'lead_6_voice',
    'sintetizador en quintas':'lead_7_fifths', 'sintetizador grave':'lead_8_bass__lead' }],
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

// los que el GM no tiene, grabados en VCSL (CC0). El archivo sale de la nota de su rótulo; «octava» es
// cuánto más arriba suena de lo que dice, medido: VCSL rotula casi todo con el do central como «C3»
const DE_VCSL = {
  'balafón': { fam: 'del mundo', octava: 1, carpeta: 'Idiophones/Struck%20Idiophones/Balafon/Traditional%20Mallet/',
    archivo: n => 'EthnicXylo_tradM_' + n + '_vl3_rr1_Mid.wav', notas: ['C#3', 'F3', 'C4', 'F4', 'C5', 'F5'] },
  'campanas de mano': { fam: 'percusión afinada', octava: 1, carpeta: 'Idiophones/Struck%20Idiophones/Hand%20Chimes/',
    archivo: n => 'sus_' + n + '_r01_main.wav',
    notas: ['C3', 'D3', 'E3', 'F#3', 'G#3', 'A#3', 'C4', 'D4', 'E4', 'F#4', 'G#4', 'A4',
            'C5', 'D5', 'E5', 'F#5', 'G#5', 'A#5', 'C6'] },
};

const ALIAS = {
  'guitarra':'viola', 'guitarra criolla':'viola criolla', 'guitarra española':'viola criolla',
  'guitarra eléctrica':'viola eléctrica', 'saxofón':'saxo', 'violonchelo':'chelo',
  'organo':'órgano', 'fueye':'bandoneón', 'timbales':'timbal', 'teclado':'piano',
  'piano de cola':'piano de concierto', 'quena':'shakuhachi', 'zampoña':'siku', 'voz':'voces',
  'rhodes':'piano eléctrico', 'hammond':'órgano',
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

// percusión de verdad, de VCSL (CC0): cada golpe es una grabación, y se toca con las mismas palabras
// que una caja de ritmos. Lo que no tiene, no suena y se avisa. Los golpes del cajón no traen rótulo
// en el pack: se leyeron por su espectro
const PERCUSION = 'percusión';
const KITS = [
  { nombre: 'cajón', art: 'el', un: 'un', banco: 'cajon', alias: [], piezas: {
      bd: 'Idiophones/Struck%20Idiophones/Cajon/Cajon_hit3_f_rr1.wav',
      lt: 'Idiophones/Struck%20Idiophones/Cajon/Cajon_hit2_f_rr1.wav',
      sd: 'Idiophones/Struck%20Idiophones/Cajon/Cajon_hit1_f_rr1.wav',
      rim: 'Idiophones/Struck%20Idiophones/Cajon/Cajon_hit1_mp_rr1.wav' } },
  { nombre: 'congas', art: 'las', un: 'unas', banco: 'congas', alias: ['conga'], piezas: {
      bd: 'Membranophones/Struck%20Membranophones/Conga/Tumba_HitN_v2_rr1_Sum.wav',
      lt: 'Membranophones/Struck%20Membranophones/Conga/Tumba_HitFM_v3_rr1_Sum.wav',
      mt: 'Membranophones/Struck%20Membranophones/Conga/Conga_HitN_v2_rr1_Sum.wav',
      ht: 'Membranophones/Struck%20Membranophones/Conga/Quinto_HitN_v2_rr1_Sum.wav',
      sd: 'Membranophones/Struck%20Membranophones/Conga/Conga_HitFM_v2_rr1_Sum.wav',
      rim: 'Membranophones/Struck%20Membranophones/Conga/Quinto_HitFM1_v2_rr1_Sum.wav' } },
  { nombre: 'bongós', art: 'los', un: 'unos', banco: 'bongos', alias: ['bongó'], piezas: {
      bd: 'Membranophones/Struck%20Membranophones/Bongos/BongoL_Hit1_v2_rr1_Mid.wav',
      lt: 'Membranophones/Struck%20Membranophones/Bongos/BongoL_Hit1_v2_rr1_Mid.wav',
      mt: 'Membranophones/Struck%20Membranophones/Bongos/BongoH_Hit1_v2_rr1_Mid.wav',
      ht: 'Membranophones/Struck%20Membranophones/Bongos/BongoH_Hit1_v2_rr1_Mid.wav',
      sd: 'Membranophones/Struck%20Membranophones/Bongos/BongoH_HitMuted1_v2_rr1_Mid.wav',
      rim: 'Membranophones/Struck%20Membranophones/Bongos/BongoL_HitMuted2_v2_rr1_Mid.wav' } },
  { nombre: 'murga', art: 'la', un: 'una', banco: 'murga', alias: [], piezas: {
      bd: 'Membranophones/Struck%20Membranophones/Bass%20Drum%201/BDrumNew_hit_v3_rr1_Sum.wav',
      sd: 'Membranophones/Struck%20Membranophones/Snare%20Drum%2C%20Rope%20Tension/Hi/RopeSnare_hi_sn_Main_vl2_rr1.wav',
      rim: 'Membranophones/Struck%20Membranophones/Snare%20Drum%2C%20Rope%20Tension/RopeSnare_sidestick_Main_vl2_rr1.wav',
      cr: 'Idiophones/Struck%20Idiophones/Suspended%20Cymbal%201/susCymb1_hit_f1.wav',
      hh: 'Idiophones/Struck%20Idiophones/Hi-Hat%20Cymbal/HiHat_HitC_v1_rr1_Mid.wav' } },
];
// los golpes de mano suenan igual en cualquier caja: van en su propio banco
const MANO = 'mano';
const DE_MANO = {
  cl: 'Idiophones/Struck%20Idiophones/Claves/Claves1_Hit_v2_rr1_Mid.wav',
  gu: 'Idiophones/Struck%20Idiophones/Guiro/Guiro_Hit_rr1_Mid.wav',
  tr: 'Idiophones/Struck%20Idiophones/Triangles/Triangle1_Hit_v2_rr1_Mid.wav',
  tb: 'Idiophones/Struck%20Idiophones/Tambourine%201/Tamb1_Hit_v1_rr1_Mid.wav',
};

// las cajas de siempre y las de VCSL, que están aunque strudel no haya cargado
function maquinas() {
  if (_maquinas) return _maquinas;
  const cajas = Object.create(null);
  for (const k of KITS) {
    const caja = { nombre: k.nombre, art: k.art, un: k.un, marca: PERCUSION, banco: k.banco, piezas: new Set(Object.keys(k.piezas)) };
    for (const n of [k.nombre, ...k.alias]) cajas[norm(n)] = caja;
  }
  const piezas = ['bd', 'sd', 'hh'];
  const tiene = {};
  try {
    for (const n of Object.keys(strudel.soundMap.get())) {
      const m = n.match(/^([a-z0-9]+)_([a-z]+)$/);
      if (m) (tiene[m[1]] = tiene[m[1]] || new Set()).add(m[2]);
    }
  } catch (e) { return cajas; }
  // una caja es un banco que tiene al menos bombo, redoblante y hi-hat
  const propios = new Set([...KITS.map(k => k.banco), MANO]);
  const listas = Object.entries(tiene).filter(([k, v]) => !propios.has(k) && piezas.every(p => v.has(p))).map(([k]) => k);
  if (!listas.length) return cajas;
  _maquinas = cajas;
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
  // «§v§» son las vueltas de la sección, o del tema sin secciones: crece de punta a punta y vuelve a empezar
  ['cada vez más fuerte', '.mul(velocity(saw.range(.2,1).slow(§v§)))',  'arranca suave y va subiendo', 'crece'],
  ['cada vez más bajito', '.mul(velocity(isaw.range(.2,1).slow(§v§)))', 'va bajando hasta casi no oírse', 'crece'],
  ['corto',               '.clip(.3)',          'cada nota dura un suspiro'],
  ['largo',               '.clip(2)',           'cada nota se estira sobre la siguiente'],
  ['entrando despacio',   '.attack(.3)',        'no arranca de golpe, aparece'],
  ['que se apaga',        '.release(1.2)',      'la cola tarda en irse'],
  ['apagado',             '.lpf(500)',          'como detrás de una puerta'],
  ['sin graves',          '.hpf(700)',          'le saca los graves: suena finito'],
  ['sucio',               '.distort(1).postgain(.6)', 'saturado, al borde'],
  ['temblando',           '.vib(5).vibmod(.3)', 'la afinación tiembla'],
  ['con eco',             '.room(.6)',          'suena en una sala grande'],
  ['de lejos',            '.mul(velocity(.6)).room(.8).lpf(2500)', 'como si tocara en el fondo de la sala'],
  ['como de radio',       '.hpf(600).lpf(3000)', 'finito, como por una radio vieja'],
  ['repicando',           '.delay(.5).delayfeedback(.4).delaysync(1/(2*§1§))', 'se repite y se va apagando'],
  ['a la izquierda',      '.pan(.2)',           'del parlante izquierdo'],
  ['a la derecha',        '.pan(.8)',           'del parlante derecho'],
  ['al revés',            '.rev()',             'de atrás para adelante'],
  ['con swing',           '.swingBy(1/3, §1§)', 'desparejo, arrastrado'],
  // nudge corre el sonido y no el paso: el realce sigue cayendo donde está escrito
  ['a mano',              '.nudge(rand.range(0,.02)).mul(velocity(rand.range(.8,1)))', 'no tan perfecto: como si lo tocara alguien'],
  ['arpegiado',           '.arp("arriba")',     'el acorde se desarma en notas, subiendo'],
  ['arpegiado bajando',   '.arp("abajo")',      'el acorde se desarma en notas, bajando'],
  // sólo con notas: en una línea de golpes el traductor avisa
  ['una octava arriba',   '.transpose(12)',     'lo mismo, una octava más agudo'],
  ['una octava abajo',    '.transpose(-12)',    'lo mismo, una octava más grave'],
  ['un tono arriba',      '.transpose(2)',      'lo mismo, un tono más agudo'],
  ['un tono abajo',       '.transpose(-2)',     'lo mismo, un tono más grave'],
  ['medio tono arriba',   '.transpose(1)',      'lo mismo, medio tono más agudo'],
  ['medio tono abajo',    '.transpose(-1)',     'lo mismo, medio tono más grave'],
];

// strudel toma el índice módulo el largo del acorde: tiene que ser el del más grande del renglón
const arpegiar = (codigo, voces) => codigo.replace(/\.arp\("(arriba|abajo)"\)/g, (_, hacia) => {
  const i = [...Array(voces).keys()];
  return '.arp("' + (hacia === 'abajo' ? i.reverse() : i).join(' ') + '")';
});

// las frases de cómo, agrupadas por la pregunta que contestan: así las muestran el ▾ y el sugeridor.
// Cada una va en un solo grupo, ver probar.mjs
const GRUPOS_COMO = [
  ['más rápido o más lento', ['al doble', 'a la mitad', 'a un cuarto', 'cada golpe dos veces']],
  ['más fuerte o más bajito', ['callado', 'muy bajito', 'bajito', 'fuerte', 'muy fuerte', 'cada vez más fuerte', 'cada vez más bajito']],
  ['cómo es cada nota', ['corto', 'largo', 'entrando despacio', 'que se apaga']],
  ['cómo suena', ['apagado', 'sin graves', 'como de radio', 'sucio', 'temblando']],
  ['dónde suena', ['con eco', 'de lejos', 'repicando', 'a la izquierda', 'a la derecha']],
  ['cómo se toca', ['al revés', 'con swing', 'a mano', 'arpegiado', 'arpegiado bajando']],
  ['más agudo o más grave', ['una octava arriba', 'una octava abajo', 'un tono arriba', 'un tono abajo',
                             'medio tono arriba', 'medio tono abajo']],
];

// los que ponen un valor: dos en la misma línea se pisan y el traductor avisa;
// los relativos se componen: fast, slow, ply, transpose, rev, y mute
const PISAN = new Set(['gain', 'clip', 'attack', 'release', 'lpf', 'hpf', 'distort', 'vib', 'nudge',
                       'room', 'delay', 'pan', 'arp', 'swingBy']);

// lo que se fue del idioma; el aviso dice con qué se escribe ahora, si hay con qué
const RETIRADOS = {
  'una por vuelta': 'escribí «|» entre los pasos que van en vueltas distintas: «do mayor | fa mayor»',
  'sincopado': 'escribí el ritmo con pasos: «pum - - pum - - pum -»',
  'con voz': '', 'roto': '', 'rodando': '', 'de ida y vuelta': '', 'perdiendo golpes': '',
  'de un lado al otro': '', 'cruzado': '', 'que se abre': '', 'cada golpe tres veces': '', 'a un octavo': '',
};

// «en corcheas»: cada nota, tantas veces por tiempo
const FIGURAS = { blancas: .5, negras: 1, corcheas: 2, tresillos: 3, semicorcheas: 4 };
function leerFigura(texto) {
  const m = norm(texto).match(/^en (\S+)$/);
  const k = m && FIGURAS[m[1]];
  return k ? { codigo: '.struct("x*§' + k + '§")', figura: m[1] } : null;
}

// «§k§» son k tiempos de la vuelta: el compás es de la sección, y se sabe recién con la hoja entera
const TIEMPOS_DE = /§([\d.]+)§/g;
const conTiempos = (codigo, tiempos) => codigo.replace(TIEMPOS_DE, (_, k) => String(k * tiempos));
const conTramo = (codigo, tiempos, vueltas) => conTiempos(codigo, tiempos).replace(/§v§/g, String(vueltas));

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
const envolvible = mod => !!mod && mod[1] !== 'mute' && !mod[1].includes('§v§');

// los métodos de afuera de un código, sin los que van adentro de sus paréntesis
function parametros(codigo) {
  const out = [];
  let hondo = 0;
  for (let i = 0; i < codigo.length; i++) {
    if (codigo[i] === '(') hondo++;
    else if (codigo[i] === ')') hondo--;
    else if (codigo[i] === '.' && !hondo) { const m = codigo.slice(i + 1).match(/^\w+/); if (m) out.push(m[0]); }
  }
  return out;
}
// sobre qué se pisa una frase con otra; multiplicar nunca pisa
const clavesDe = mod => mod[3] ? [mod[3]] : parametros(mod[1]).filter(p => PISAN.has(p));
// las que sólo tienen sentido con notas: el traductor las rechaza en una línea de golpes
const conAltura = mod => /^\.(transpose|arp)\b/.test(mod[1]);
const comoFuncion = codigo => 'x => x' + codigo;

function leerCada(texto) {
  const t = norm(texto).match(/^cada (\S+) vueltas?\s*(.*)$/);
  if (!t) return null;
  const n = cuantasVueltas(t[1]);
  if (!(n >= 2 && n <= VUELTAS_MAX)) return { falla: 'numero' };
  const mod = modificadorDe(t[2]);
  if (!envolvible(mod)) return { falla: mod ? 'centinela' : 'dentro', dentro: t[2] };
  return { codigo: '.every(' + n + ', ' + comoFuncion(mod[1]) + ')', vueltas: n, mod };
}

function leerVeces(texto) {
  const n = norm(texto);
  for (const [frase, fn] of VECES) {
    const frente = norm(frase);
    if (n !== frente && !n.startsWith(frente + ' ')) continue;
    const resto = n.slice(frente.length).trim();
    const mod = modificadorDe(resto);
    if (!envolvible(mod)) return { falla: mod ? 'centinela' : 'dentro', dentro: resto };
    return { codigo: fn + '(' + comoFuncion(mod[1]) + ')', vueltas: 1, mod };
  }
  return null;
}

// ------------------------------------------------------------- la forma

// más que esto la cinta no se lee como una forma
const VUELTAS_FORMA = 256;

// el mismo rango que ofrecen el menú y el arrastre
const TEMPO_MIN = 20, TEMPO_MAX = 400;
// «va a 120 en tres»: cuántos tiempos tiene una vuelta
const TIEMPOS_MAX = 12;

const ACORDE = Object.fromEntries(Object.entries(ACORDES).map(([k, v]) => [norm(k), v])
  .concat(Object.entries(ACORDES_DICHOS).map(([k, v]) => [norm(k), ACORDES[v]])));

// el nombre que strudel va a ver
const apodo = s => norm(s).replace(/[^a-z0-9]/g, '');
const INSTRUMENTOS = {};
for (const [fam, tabla] of FAMILIAS)
  for (const [nombre, gm] of Object.entries(tabla))
    INSTRUMENTOS[norm(nombre)] = { nombre, gm, fam, sonido: apodo(nombre), cola: '' };
for (const [nombre, o] of Object.entries(SIN_GM))
  INSTRUMENTOS[norm(nombre)] = { nombre, ...o };
for (const [nombre, o] of Object.entries(DE_VCSL))
  INSTRUMENTOS[norm(nombre)] = { nombre, fam: o.fam, sonido: apodo(nombre), cola: '', vcsl: o };
for (const [de, a] of Object.entries(ALIAS))
  INSTRUMENTOS[norm(de)] = INSTRUMENTOS[norm(a)];
// «constructor» es una palabra: sin prototipo, lo que no está no está
for (const t of [SONIDOS, NOTAS, ALTERACIONES, OCTAVAS, ACORDE, INSTRUMENTOS, FIGURAS, RETIRADOS, DE_MANO, ...Object.values(RENOMBRADOS)])
  Object.setPrototypeOf(t, null);
const instrumentoDe = n => INSTRUMENTOS[norm(n)];
// «en pizzicato», «en una viola criolla»: lo que sigue al «en» dice quién
const EN_QUIEN = /^en (?:un |una |unos |unas |el |la |los |las )?(.+)$/;

// la altura es del instrumento: sin nada suena en su octava de casa, y «grave» y
// «agudo» se cuentan desde ahí. «do» en un bajo es el do de un bajo
const CASAS = {
  bajos: 2, 'tuba': 2,
  'contrabajo con arco': 3, 'chelo': 3, 'fagot': 3, 'trombón': 3, 'saxo barítono': 3, 'timbal': 3, 'sintetizador grave': 3,
  'flauta': 5, 'flauta dulce': 5, 'xilofón': 5, 'celesta': 5, 'cajita de música': 5, 'silbido': 5, 'ocarina': 5,
  'flautín': 6, 'campanitas': 6,
};
const casaDe = ins => CASAS[ins.nombre] ?? CASAS[ins.fam] ?? OCTAVA_BASE;
// la que suena; las muestras van de la octava 1 a la 7
const octavaQueSuena = (octN, casa) =>
  Math.min(7, Math.max(1, (octN ? OCTAVAS[octN] : OCTAVA_BASE) - OCTAVA_BASE + casa));

// nombres que no son instrumentos pero dicen qué toca la parte: «los platillos» llevan
// golpes, «la melodía» notas. Un instrumento, notas; lo demás no se sabe
const NOMBRES_DE_GOLPES = new Set(['bata', 'batería', 'percusión', 'platillos', 'tambores', 'bombo'].map(norm));
const NOMBRES_DE_NOTAS = new Set(['melodía'].map(norm));
function modoDelNombre(nombre) {
  const n = norm(nombre || '');
  if (NOMBRES_DE_GOLPES.has(n)) return 'sonido';
  if (instrumentoDe(n) || NOMBRES_DE_NOTAS.has(n)) return 'nota';
  return null;
}

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
