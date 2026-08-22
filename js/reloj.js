// ------------------------------------------------- qué se está tocando ahora
// getTime() es el reloj de strudel, contado en vueltas
let claveActivos = '', bpmPuesto = null;
let sonando = false, ultimoCodigo = '', motorListo = false;
function motorLevantado() { motorListo = true; }

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

// rAF se frena en una pestaña escondida y strudel sigue; y un cuadro ya es tarde: mira 0,1 s adelante
setInterval(() => {
  if (!sonando) return;
  let t;
  try { t = getTime(); } catch (e) { return; }
  const bpm = bpmPuesto || (actual.tempos[0] || {}).bpm || 90;
  seguirTempo(t + 0.1 * bpm / 240);     // 0,1 s, contado en vueltas
}, 40);

// hush() corta el reloj pero no las notas que ya salieron: sin apagar el audio queda la cola
function silenciar() {
  hush();
  // el último stack evaluado queda cargado y lo que arranque el reloj lo reviviría;
  // con un silencio cargado, revive el silencio
  Promise.resolve(evaluate('silence')).catch(() => { /* strudel a medio cargar */ });
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') ctx.suspend();
}

function despertar() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') return ctx.resume();
}

// el tempo es del reloj, ver REGLAS.md: decírselo directo deja arrastrar el número
// mientras suena; re-evaluar cambia recién en el borde de la vuelta
function ponerTempo(bpm) {
  try { setcpm(bpm / 4); } catch (e) { /* strudel todavía no levantó */ }
}

function correr(codigo) {
  // evaluate() es async: lo que falla después del primer await se va como promesa rechazada
  const caido = e => {
    sonando = false;
    refrescarTransporte();
    cajaErr.innerHTML += '<p><b>strudel:</b> ' + esc(String((e && e.message) || e)) + '</p>';
  };
  // el «setcpm» del código pisa lo que la tabla de tempos dejó puesto
  bpmPuesto = null;
  try {
    Promise.resolve(evaluate(codigo)).catch(caido);
  } catch (e) {
    caido(e);
  }
}

function seguirElTema(r) {
  if (!sonando || r.codigo === ultimoCodigo) return;
  // el tempo es la primera línea del código: si el resto quedó igual hay un número
  // que decirle al reloj, no un tema que cortar y arrancar de nuevo
  const soloElTempo = ultimoCodigo && r.codigo &&
    ultimoCodigo.slice(ultimoCodigo.indexOf('\n')) === r.codigo.slice(r.codigo.indexOf('\n'));
  ultimoCodigo = r.codigo;
  // sin nada que tocar hay que apagar: strudel seguiría con el último stack
  if (!r.codigo) { sonando = false; silenciar(); refrescarTransporte(); }
  // con secciones el número lo pone seguirTempo() en el tic que sigue; acá sólo se olvida el de antes
  else if (soloElTempo) { bpmPuesto = null; ponerTempo(r.bpm); }
  else correr(r.codigo);
}

// ------------------------------------------------------------- tocar y parar
// el atajo va en el title: es lo único del transporte que la pantalla no muestra
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

// la barra espaciadora es una tecla del idioma, así que el atajo es meta+Enter; anda también escribiendo
addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
  e.preventDefault();
  alternarTocar();
});
