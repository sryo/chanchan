// ---------------------------------------------------------------- arranque
armarVacio();
seguir();
refrescarTransporte();
document.body.classList.add('cargando');
const inicial = temaInicial();
src.value = conRenglonFinal(inicial.txt);
campoNombre.value = inicial.nombre;
medirNombre();
registrar(src.value, null);
actualizar(false);
// La primera medición cae antes de que el navegador termine de acomodar el
// alto del editor y los puntitos salen todos fuera de cuadro: se vuelven a
// poner con la página ya quieta, y otra vez cuando entra la tipografía.
requestAnimationFrame(() => armarPuntos(marcasActuales, calladasActuales));
document.fonts.ready.then(() => { medirTipografia(); reacomodar(); });

const MUESTRAS = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';
const CROMA_GM = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Una muestra cada tres semitonos, de do1 a do7: strudel afina las del medio y no
// se llega a notar. Registrar es instantáneo, cada mp3 baja recién cuando suena.
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

initStrudel({
  prebake: () => Promise.all([
    samples(MUESTRAS + 'tidal-drum-machines.json'),
    samples(MUESTRAS + 'piano.json'),
    samples(MUESTRAS_GM, GM),
  ]).then(() => { motorListo = true; document.body.classList.remove('cargando'); })
    .catch(() => { document.body.classList.remove('cargando'); avisar('no cargaron los sonidos.'); }),
});
