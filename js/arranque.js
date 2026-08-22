// ---------------------------------------------------------------- arranque
armarVacio();
seguir();
refrescarTransporte();
document.body.classList.add('cargando');
const inicial = temaInicial();
src.value = conRenglonFinal(inicial.txt);
campoNombre.value = inicial.nombre;
acomodarNombre();
registrar(src.value, null);
actualizar(false);
// la hoja vacía dice «escribí una línea»: el cursor tiene que estar ahí para
// que sea verdad. Con un tema abierto no se toca el foco, que en el teléfono
// levanta el teclado sobre lo que uno venía a leer.
if (!src.value.trim()) src.focus();
// La primera medición cae antes de que el navegador termine de acomodar el
// alto del editor y los puntitos salen todos fuera de cuadro: se vuelven a
// poner con la página ya quieta, y otra vez cuando entra la tipografía.
requestAnimationFrame(() => armarPuntos(marcasActuales, calladasActuales));
document.fonts.ready.then(() => { medirTipografia(); reacomodar(); });

// Fijado a un commit y no a «main»: si arriba renombran o sacan un sonido, acá
// cambia o se calla sin que nadie lo haya pedido. Lo nuevo se trae cambiando el hash.
const MUESTRAS = 'https://raw.githubusercontent.com/felixroos/dough-samples/9eacfc86ec4393e68a463ff52b01c19cfaa77f38/';
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

// Sin red, o con unpkg caído, strudel no llega: la hoja anda igual —se escribe,
// se guarda, se comparte— pero no suena, y eso se dice en vez de quedarse
// «cargando» para siempre.
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
    // Las cajas de ritmo se leen del propio strudel, así que hasta acá no
    // existían: un tema con «en una 808» abría con un error falso y sonando con
    // el banco de fábrica. Y recién ahora se pueden armar los espejos que
    // encienden la palabra que suena.
    actualizar(false);
  })
    .catch(() => { document.body.classList.remove('cargando'); avisar('no cargaron los sonidos.'); }),
});
