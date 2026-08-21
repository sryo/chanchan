// ------------------------------------------------- qué se está tocando ahora
// getTime() es el reloj de strudel en vueltas; a cada patrón espejo le
// preguntamos qué paso cae justo ahí y prendemos esa palabra en el editor.
let espejos = [];
let claveActivos = '';
// dónde cambia el pulso a lo largo de la forma, y cuál está puesto ahora
let temposActuales = [], bpmPuesto = null;

// El tempo no vive en el patrón, así que un tema que acelera no se puede armar
// de una sola vez: se le va diciendo al reloj al cruzar cada borde. La aguja ya
// sabe en qué vuelta estamos, y de la misma cuenta sale en qué sección.
function seguirTempo(t) {
  if (!temposActuales.length) return;
  const v = Math.max(1, vueltasActuales);
  const donde = ((t % v) + v) % v;
  let cual = temposActuales[0].bpm;
  for (const x of temposActuales) if (donde >= x.desde) cual = x.bpm;
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
    if (t != null) seguirTempo(t);
    if (t != null) for (const e of espejos) {
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
  activos = nuevos;
  pintar(marcasActuales);
}

// strudel corta el reloj pero no las notas que ya salieron: sin apagar el
// audio, «parar» deja sonando la cola de los acordes largos y del eco.
function silenciar() {
  hush();
  // hush() limpia los patrones registrados, pero el reloj sigue con el último
  // stack que se evaluó: sin dejarle un silencio cargado, cualquier cosa que
  // despierte el audio —una vista previa del menú, por ejemplo— revive el tema.
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

// ------------------------------------------------------------- tocar y parar
const OJO_TOCAR = '<svg viewBox="0 0 24 24" width="17" height="17"><polygon points="7,4 20,12 7,20"/></svg>';
const OJO_PARAR = '<svg viewBox="0 0 24 24" width="17" height="17">' +
  '<rect x="6.5" y="4.5" width="4.6" height="15"/><rect x="13.9" y="4.5" width="4.6" height="15"/></svg>';

function refrescarTransporte() {
  btnTocar.innerHTML = sonando ? OJO_PARAR : OJO_TOCAR;
  btnTocar.title = sonando ? 'parar' : 'tocar';
  btnTocar.setAttribute('aria-label', btnTocar.title);
}

function alternarTocar() {
  if (sonando) {
    sonando = false;
    ultimoCodigo = '';
    silenciar();
  } else {
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
