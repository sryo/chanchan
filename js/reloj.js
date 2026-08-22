// ------------------------------------------------- qué se está tocando ahora
// getTime() es el reloj de strudel, contado en vueltas
let claveActivos = '', bpmPuesto = null;
// el transporte: si suena, con qué código, y si strudel ya tiene los sonidos
let sonando = false, ultimoCodigo = '', motorListo = false;
function motorLevantado() { motorListo = true; }

// decírselo directo al reloj es lo que deja arrastrar el número mientras suena
function seguirTempo(t) {
  if (!actual.tempos.length) return;
  const v = Math.max(1, actual.vueltas);
  const donde = ((t % v) + v) % v;
  let cual = actual.tempos[0].bpm;
  for (const x of actual.tempos) if (donde >= x.desde) cual = x.bpm;
  if (cual === bpmPuesto) return;
  bpmPuesto = cual;
  ponerTempo(cual);
}

function seguir() {
  requestAnimationFrame(seguir);
  moverAguja();
  const nuevos = new Set();
  if (sonando) {
    let t;
    try { t = getTime(); } catch (e) { t = null; }
    if (t != null) for (const e of actual.espejos) {
      let haps;
      try { haps = e.pat.queryArc(t, t + 0.0001); } catch (err) { continue; }
      for (const h of haps) {
        const p = e.lugares[h.value && h.value.n];
        if (p) nuevos.add((e.nro - 1) + ':' + p.i);
      }
    }
  }
  const clave = [...nuevos].sort().join('|');
  if (clave === claveActivos) return;
  claveActivos = clave;
  realzar(nuevos);
}

// El cambio de tempo en el borde de una sección no puede esperar al cuadro que
// sigue: el navegador frena requestAnimationFrame en una pestaña escondida y
// strudel sigue tocando desde su worker, así que la estrofa quedaba al tempo
// de antes hasta que uno volvía a mirar. Y un cuadro es tarde de todos modos:
// strudel ya agendó un décimo de segundo del tramo nuevo al tempo viejo. Un
// timer aparte, mirando ese décimo adelante, le gana al agendador.
setInterval(() => {
  if (!sonando) return;
  let t;
  try { t = getTime(); } catch (e) { return; }
  const bpm = bpmPuesto || (actual.tempos[0] || {}).bpm || 90;
  seguirTempo(t + 0.1 * bpm / 240);     // 0,1 s, contado en vueltas
}, 40);

// strudel corta el reloj pero no las notas que ya salieron: sin apagar el
// audio, «parar» deja sonando la cola de los acordes largos y del eco.
function silenciar() {
  hush();
  // hush() para el reloj, pero el último stack que se evaluó queda cargado: lo
  // que vuelva a arrancarlo —una vista previa del menú, por ejemplo— reviviría
  // el tema. Con un silencio cargado, lo que revive es el silencio.
  Promise.resolve(evaluate('silence')).catch(() => { /* strudel a medio cargar */ });
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') ctx.suspend();
}

function despertar() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') return ctx.resume();
}

// El tempo no vive en el patrón: es del reloj, y el «setcpm» de la primera línea
// del código sólo se lo va diciendo cada vez que se re-evalúa el tema. Decírselo
// directo es lo que deja arrastrar el número mientras suena: volver a evaluar
// cambia el tema recién en el borde de la vuelta, así que el arrastre se sentía a
// saltos y las partes largas volvían a empezar de cero en cada escalón.
function ponerTempo(bpm) {
  try { setcpm(bpm / 4); } catch (e) { /* strudel todavía no levantó */ }
}

function correr(codigo) {
  // evaluate() es async: el try sólo agarra lo que revienta antes del primer
  // await, y lo que falla más adentro —el transpilador, un sonido que no está—
  // se iba como promesa rechazada sin dueño. La página no decía nada y el botón
  // quedaba en «parar» con el silencio puesto.
  const caido = e => {
    sonando = false;
    refrescarTransporte();
    cajaErr.innerHTML += '<p><b>strudel:</b> ' + esc(String((e && e.message) || e)) + '</p>';
  };
  // el «setcpm» del código vuelve a poner el de arranque, así que lo que la tabla
  // de tempos haya dejado puesto deja de valer
  bpmPuesto = null;
  try {
    Promise.resolve(evaluate(codigo)).catch(caido);
  } catch (e) {
    caido(e);
  }
}

// Lo que el editor le dice al reloj después de cada vuelta por la hoja: si está
// sonando y el código cambió, lo nuevo reemplaza a lo viejo.
function seguirElTema(r) {
  if (!sonando || r.codigo === ultimoCodigo) return;
  // El tempo es la primera línea del código y nada más que eso: si el resto
  // quedó igual, no hay patrón nuevo que armar, hay un número que decirle al
  // reloj. Es la diferencia entre que el tempo se mueva mientras suena y que el
  // tema se corte y arranque de nuevo en cada escalón del arrastre.
  const soloElTempo = ultimoCodigo && r.codigo &&
    ultimoCodigo.slice(ultimoCodigo.indexOf('\n')) === r.codigo.slice(r.codigo.indexOf('\n'));
  ultimoCodigo = r.codigo;
  // sin nada que tocar hay que apagar: si no, strudel sigue con el último
  // stack que evaluó y el parlante suena mientras la pantalla dice que no hay nada
  if (!r.codigo) { sonando = false; silenciar(); refrescarTransporte(); }
  // con secciones el número que vale es el de la tabla nueva, y quién lo mira es
  // seguirTempo(), en el tic que sigue: acá sólo se le hace olvidar el de antes
  else if (soloElTempo) { bpmPuesto = null; ponerTempo(r.bpm); }
  else correr(r.codigo);
}

// ------------------------------------------------------------- tocar y parar
// Macizo como el puntito del margen: lleno si suena, hueco si no. Y una forma
// llena se agranda a veintidós sin que se le ensucien los pelos.
// el atajo vive en el title del botón: es lo único del transporte que la pantalla
// no muestra sola, y el botón es donde se va a buscar
const TECLA_TOCAR = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘↩' : 'ctrl↩';
function refrescarTransporte() {
  btnTocar.innerHTML = icono(sonando ? 'parar' : 'tocar', 'maciza');
  const que = sonando ? 'parar' : 'tocar';
  btnTocar.title = que + ' · ' + TECLA_TOCAR;
  btnTocar.setAttribute('aria-label', que);
}

function alternarTocar() {
  if (sonando) {
    sonando = false;
    ultimoCodigo = '';
    silenciar();
  } else {
    if (typeof evaluate !== 'function') { avisar('no cargó strudel: sin red no hay sonido.'); return; }
    const r = actualizar(false);
    if (!r.codigo) { avisar('escribí algo primero: «el bombo toca pum - pum -».'); return; }
    sonando = true;
    ultimoCodigo = r.codigo;
    Promise.resolve(despertar()).then(() => correr(r.codigo));
  }
  refrescarTransporte();
}

btnTocar.addEventListener('click', alternarTocar);

// La barra espaciadora es una tecla del idioma —separa las palabras—, así que el
// atajo es el de siempre para «esto, ya»: Enter con el meta apretado. Anda
// también escribiendo, que es justo cuando se quiere oír lo que se acaba de
// cambiar sin sacar las manos del teclado.
addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
  e.preventDefault();
  alternarTocar();
});
