// ---------------------------------------------------------------- arranque
seguir();
refrescarTransporte();
document.body.classList.add('cargando');
// sin enlace la promesa ya está resuelta y esto cae antes de la primera pintada
temaInicial().then(inicial => {
  src.value = conRenglonFinal(inicial.txt);
  campoNombre.value = inicial.nombre;
  abrirComo(inicial.abierto ?? inicial.nombre);
  acomodarNombre();
  arrancarHistorial();
  actualizar(false);
  if (inicial.roto) avisar(noSePudo());
  if (inicial.aviso) avisar(inicial.aviso);
  for (const a of inicial.avisos || []) avisar(a);
  // con un tema abierto no se toca el foco: en el teléfono levanta el teclado
  if (!src.value.trim()) src.focus();
  // la primera medición cae antes de que el navegador acomode el alto del editor
  requestAnimationFrame(() => armarPuntos(marcasActuales, calladasActuales));
});
// y otra vez cuando entra la tipografía
document.fonts.ready.then(() => { medirTipografia(); reacomodar(); });

// sin red, ver REGLAS.md: el worker guarda lo que baja; sólo lo hay bajo https o localhost
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol))
  navigator.serviceWorker.register('sw.js').catch(() => { /* sin worker se anda igual */ });

// fijado a un commit y no a «main»: si arriba sacan un sonido, acá se calla
const MUESTRAS = 'https://raw.githubusercontent.com/felixroos/dough-samples/9eacfc86ec4393e68a463ff52b01c19cfaa77f38/';
// VCSL también fijado a un commit: la percusión de verdad, y los golpes de mano
const VCSL = 'https://raw.githubusercontent.com/sgossner/VCSL/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e/';
const MUESTRAS_VCSL = Object.fromEntries([
  ...KITS.flatMap(k => Object.entries(k.piezas).map(([pieza, f]) => [k.banco + '_' + pieza, [f]])),
  ...Object.entries(DE_MANO).map(([pieza, f]) => [MANO + '_' + pieza, [f]]),
  ...Object.entries(DE_VCSL).map(([nombre, o]) => [apodo(nombre),
    Object.fromEntries(o.notas.map(n => [n.replace(/\d+$/, oct => +oct + o.octava),
      o.carpeta + o.archivo(encodeURIComponent(n))]))]),
]);
const CROMA_GM = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// una cada tres semitonos: strudel afina las del medio; cada mp3 baja recién cuando suena
function muestrario(gm) {
  const m = {};
  for (let semi = 12; semi <= 84; semi += 3) {
    const n = CROMA_GM[semi % 12] + Math.floor(semi / 12);
    m[n] = gm + '-mp3/' + n + '.mp3';
  }
  return m;
}
const MUESTRAS_GM = Object.fromEntries(
  [...new Set(Object.values(INSTRUMENTOS))].filter(i => i.gm)
    .map(i => [i.sonido, muestrario(i.gm)]));

if (typeof initStrudel !== 'function') {
  document.body.classList.remove('cargando');
  avisar(SIN_SONIDO);
} else initStrudel({
  onEvalError: strudelNoPudo,
  // una lista que no baja deja sin sus sonidos, no sin motor
  prebake: () => Promise.allSettled([
    samples(MUESTRAS + 'tidal-drum-machines.json'),
    samples(MUESTRAS + 'piano.json'),
    samples(MUESTRAS_GM, GM),
    samples(MUESTRAS_VCSL, VCSL),
  ]).then(listas => {
    motorLevantado();
    document.body.classList.remove('cargando');
    if (listas.some(x => x.status === 'rejected')) avisar('no cargaron todos los sonidos: los que faltan suenan mudos.');
    // las cajas de ritmo se leen de strudel y hasta acá no existían; y recién ahora hay espejos
    actualizar(false);
  }),
});
