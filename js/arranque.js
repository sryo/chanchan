// ---------------------------------------------------------------- arranque
seguir();
refrescarTransporte();
document.body.classList.add('cargando');
// sin enlace la promesa ya está resuelta y esto cae antes de la primera pintada
temaInicial().then(inicial => {
  src.value = conRenglonFinal(inicial.txt);
  campoNombre.value = inicial.nombre;
  acomodarNombre();
  registrar(src.value, null);
  actualizar(false);
  if (inicial.roto) avisar(noSePudo());
  if (inicial.aviso) avisar(inicial.aviso);
  // con un tema abierto no se toca el foco: en el teléfono levanta el teclado
  if (!src.value.trim()) src.focus();
  // la primera medición cae antes de que el navegador acomode el alto del editor
  requestAnimationFrame(() => armarPuntos(marcasActuales, calladasActuales));
});
// y otra vez cuando entra la tipografía
document.fonts.ready.then(() => { medirTipografia(); reacomodar(); });

// fijado a un commit y no a «main»: si arriba sacan un sonido, acá se calla
const MUESTRAS = 'https://raw.githubusercontent.com/felixroos/dough-samples/9eacfc86ec4393e68a463ff52b01c19cfaa77f38/';
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
  avisar('no cargó strudel: sin red no hay sonido, pero la hoja anda.');
} else initStrudel({
  prebake: () => Promise.all([
    samples(MUESTRAS + 'tidal-drum-machines.json'),
    samples(MUESTRAS + 'piano.json'),
    samples(MUESTRAS_GM, GM),
  ]).then(() => {
    motorLevantado();
    document.body.classList.remove('cargando');
    // las cajas de ritmo se leen de strudel y hasta acá no existían; y recién ahora hay espejos
    actualizar(false);
  })
    .catch(() => { document.body.classList.remove('cargando'); avisar('no cargaron los sonidos.'); }),
});
