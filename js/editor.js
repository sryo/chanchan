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
// El botón es un signo y no una frase: copiar el enlace es una acción menor y
// no se merece trece letras en versalitas al lado del logo. La palabra aparece
// sólo cuando tiene algo para decir — al copiar, y por un segundo y medio.
const ENLACE = '⚯';

function decirEnElEnlace(txt) {
  btnEnlace.textContent = txt;
  btnEnlace.classList.add('dicho');
  clearTimeout(relojDicho);
  relojDicho = setTimeout(() => {
    btnEnlace.textContent = ENLACE;
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
      // La altura sale como dato pelado y el color se lo pone la hoja: son cinco
      // escalones fijos, los mismos para un tambor que para un do.
      const alto = t.alto ? ' data-alto="' + t.alto + '"' : '';
      // Lo único que la hoja no puede saber es de qué parte es el renglón, que
      // sale de la rueda y vive en js. El nombre se tiñe entero; el realce de lo
      // que suena se tiñe sólo mientras suena, y por eso va como variable y no
      // como color: la regla de .t-activo sigue siendo una sola.
      const tinte = !t.voz ? ''
        : t.cls === 'sujeto' ? ' style="color:' + tintaDe(t.voz) + '"'
        : vivo ? ' style="--vivo:color-mix(in oklab,' + tramaDe(t.voz) + ' 30%,var(--fondo))"'
        : '';
      // la nota se parte en dos, la que se lee y la que la acompaña; el span de
      // afuera es el que sigue midiendo para el ▾ y para el realce
      const crudo = l.substr(t.i, t.len);
      const cuerpo = t.raizLen && t.raizLen < t.len
        ? esc(crudo.slice(0, t.raizLen)) + '<span class="t-cola">' + esc(crudo.slice(t.raizLen)) + '</span>'
        : esc(crudo);
      out += '<span class="t-' + t.cls + vivo + editable + bajoElMouse + '"' + datos + alto + tinte + '>' +
        cuerpo + '</span>';
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

// El espejo y los puntitos son lo único que tiene que ir al ritmo del teclado:
// no necesitan a strudel, cuestan medio milisegundo entre los dos, y son lo que
// se ve moverse al apretar enter. Todo lo demás —el eval de cada línea, la
// cinta que sale de él, y los errores— espera los 400 ms, que es exactamente lo
// que ese retardo vino a proteger. Antes viajaban juntos y el texto bajaba un
// renglón mientras los puntitos se quedaban arriba; peor, un click en ese rato
// callaba la línea de al lado, porque el data-l todavía era el viejo.
function repintarTexto() {
  const r = traducir(src.value);
  calladasActuales = r.calladas;
  pintar(r.marcas);
  armarPuntos(r.marcas, r.calladas, r.renglones);
}

function actualizar(reproducir) {
  asegurarRenglonFinal();
  guardar();
  const r = traducir(src.value);
  calladasActuales = r.calladas;
  renglonesActuales = r.renglones;
  vueltasActuales = r.vueltas;
  // Un solo eval por línea, y antes de dibujar. Del mismo patrón espejo salen
  // las dos cosas que lo necesitan: la cinta, que dibuja la vuelta larga de una
  // vez, y el reloj, que a cada cuadro pregunta qué paso cae justo ahora. Los
  // golpes quedan colgados del renglón, así que redibujar por un resize o por el
  // cambio de luz no vuelve a consultarle nada a strudel.
  if (motorListo) for (const x of r.renglones) {
    try { x.pat = eval(x.cotejo); } catch (e) { x.pat = null; }
    x.golpes = x.pat && golpesDe(x.pat, r.vueltas);
  }
  // sólo las que de verdad suenan encienden palabras: las calladas y las que
  // traducir() tuvo que saltear están escritas, pero no están sonando
  const suenan = new Set(r.partes.map(p => p.nro));
  espejos = r.renglones.filter(x => x.pat && suenan.has(x.nro));
  pintar(r.marcas);
  armarPuntos(r.marcas, r.calladas);
  dibujarCinta(r.renglones);
  pintarMarca(r.renglones);
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
