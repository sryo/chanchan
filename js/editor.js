// ---------------------------------------------------------------- el editor
const src = document.getElementById('src');
const hl = document.getElementById('hl');
const cajaErr = document.getElementById('errores');
const cajaJs = document.getElementById('js');
const btnEnlace = document.getElementById('enlace');
const campoNombre = document.getElementById('nombre');

// Los avisos no viven en la cabecera. El botón ya dice si suena o no; la copia
// se contesta sola, en el enlace; y lo que sale mal baja al mismo cajón donde
// caen los errores del idioma, que es donde el que escribe ya está mirando.
function avisar(msg) {
  cajaErr.innerHTML += '<p>' + esc(msg) + '</p>';
}

let relojDicho;
function decirEnElEnlace(txt) {
  btnEnlace.textContent = txt;
  btnEnlace.classList.add('dicho');
  clearTimeout(relojDicho);
  relojDicho = setTimeout(() => {
    btnEnlace.textContent = 'copiar enlace';
    btnEnlace.classList.remove('dicho');
  }, 1800);
}
const btnTocar = document.getElementById('tocar');

let marcasActuales = [], calladasActuales = new Set();
// dónde deja pintar() el ancla del sugeridor: {l, c} o null. Apunta al arranque de
// lo que se va a reemplazar y no al cursor — es como alinean los editores, y de
// paso cae en un borde de token, donde el html de la línea ya se corta solo.
let anclaCaret = null;
let activos = new Set();
let señalado = null;

function pintar(marcas) {
  marcasActuales = marcas;
  const lineas = src.value.split('\n');
  hl.innerHTML = lineas.map((l, n) => {
    const tk = (marcas[n] || []).slice().sort((a, b) => a.i - b.i);
    let out = '', cur = 0;
    // El sugeridor no tiene de dónde colgarse: no hay geometría del cursor en
    // ningún lado, y no se puede calcular con el ancho del monoespaciado porque
    // las líneas largas se parten solas (pre-wrap). Un span vacío acá adentro
    // mide exacto, no corre el texto, y se rehace en cada pintada.
    const anc = anclaCaret && anclaCaret.l === n ? anclaCaret.c : -1;
    let ancPuesto = false;
    const plano = (a, z) => {
      if (ancPuesto || anc < a || anc > z) return esc(l.slice(a, z));
      ancPuesto = true;
      return esc(l.slice(a, anc)) + '<span id="ancla"></span>' + esc(l.slice(anc, z));
    };
    for (const t of tk) {
      if (t.i < cur) continue;
      out += plano(cur, t.i);
      if (!ancPuesto && anc >= t.i && anc <= t.i + t.len) { ancPuesto = true; out += '<span id="ancla"></span>'; }
      const vivo = activos.has(n + ':' + t.i) ? ' t-activo' : '';
      // la marca de hover se aplica desde acá y no tocando el nodo: pintar()
      // reconstruye el html todo el tiempo mientras suena y se la llevaría puesta
      // marca lo que tiene menú; el subrayado sale recién con el mouse en el ▾
      // (ver .t-editable.t-manija en la hoja)
      const editable = t.tipo && t.tipo !== 'mal' ? ' t-editable' : '';
      const bajoElMouse = !(señalado && señalado.l === n && señalado.i === t.i) ? ''
        : enElBoton() ? ' t-manija' : '';
      const datos = t.tipo ? ' data-tipo="' + t.tipo + '" data-l="' + n + '" data-i="' + t.i + '" data-len="' + t.len + '"' : '';
      out += '<span class="t-' + t.cls + vivo + editable + bajoElMouse + '"' + datos + '>' +
        esc(l.substr(t.i, t.len)) + '</span>';
      cur = t.i + t.len;
    }
    return out + plano(cur, l.length);
    // sin '\n' al final: el texto ya termina en uno (asegurarRenglonFinal), y
    // sumarle otro dejaba a #hl un renglón más alto que #src — con los dos en
    // overflow:auto, alcanza para que a uno le aparezca la barra y al otro no, y
    // ahí las líneas largas cortan en distinto lugar y el espejo se corre
  }).join('\n');
  hl.scrollTop = src.scrollTop;
}

let ultimoCodigo = '';
let sonando = false;
let motorListo = false;

// El último renglón vacío no se puede borrar: es el lugar donde se empieza a
// escribir la parte que sigue. Se repone antes de traducir y sin mover el
// cursor, así que un borrar al principio de esa línea simplemente no hace nada.
// Asignar .value de un textarea le manda el cursor al final. Todo lo que
// reescribe el tema desde afuera —el menú, los puntitos, la selección— pasa por
// acá para devolverlo a donde estaba, si no cambiar una nota en la mitad de un
// tema largo te tira al final de todo.
const baseDe = (lineas, l) => lineas.slice(0, l).reduce((n, x) => n + x.length + 1, 0);

function escribir(txt, desde, hasta) {
  const a = desde ?? src.selectionStart, z = hasta ?? desde ?? src.selectionEnd;
  src.value = txt;
  src.setSelectionRange(Math.min(a, txt.length), Math.min(z, txt.length));
}

function asegurarRenglonFinal() {
  if (/\n$/.test(src.value)) return;
  const a = src.selectionStart, z = src.selectionEnd;
  src.value += '\n';
  src.setSelectionRange(a, z);
}

function actualizar(reproducir) {
  asegurarRenglonFinal();
  guardar();
  const r = traducir(src.value);
  calladasActuales = r.calladas;
  renglonesActuales = r.renglones;
  pintar(r.marcas);
  armarPuntos(r.marcas, r.calladas);
  dibujarCinta(r.renglones);
  pintarMarca(r.renglones);
  espejos = motorListo ? r.partes.map(p => {
    try { return { nro: p.nro, lugares: p.lugares, pat: eval(p.cotejo) }; } catch (e) { return null; }
  }).filter(Boolean) : [];
  cajaErr.innerHTML = r.errores.map(e =>
    '<p><b>línea ' + e.nro + ':</b> ' + esc(e.msg) + '</p>').join('');
  cajaJs.textContent = r.codigo || '(todavía no hay nada que tocar)';
  cajaVacio.hidden = !!src.value.trim();
  if (reproducir && sonando && r.codigo !== ultimoCodigo) {
    ultimoCodigo = r.codigo;
    // sin nada que tocar hay que apagar: si no, strudel sigue con el último
    // stack que evaluó y el parlante suena mientras la pantalla dice que no hay nada
    if (r.codigo) correr(r.codigo);
    else { sonando = false; silenciar(); refrescarTransporte(); }
  }
  return r;
}
