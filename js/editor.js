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

const icono = (n, clase) =>
  '<svg class="i' + (clase ? ' ' + clase : '') + '"><use href="#i-' + n + '"/></svg>';

const dentroDe = (nodo, ...donde) => donde.some(el => el && el.contains(nodo));

let relojDicho;
// El botón es un signo y no una frase: copiar el enlace es una acción menor y no
// se merece trece letras en versalitas al lado del logo. La palabra aparece sólo
// cuando tiene algo para decir.
function decirEnElEnlace(txt) {
  btnEnlace.textContent = txt;
  btnEnlace.classList.add('dicho');
  clearTimeout(relojDicho);
  relojDicho = setTimeout(() => {
    btnEnlace.innerHTML = icono('enlace');
    btnEnlace.classList.remove('dicho');
  }, 1800);
}
const btnTocar = document.getElementById('tocar');

let marcasActuales = [], calladasActuales = new Set();

// Las secciones escritas en la hoja: del nombre normalizado al nombre tal como
// se tecleó. Salen de los encabezados y no de la línea de forma, porque una
// sección recién abierta todavía no está en ninguna forma. Se queda con la
// primera grafía —de ahí el «has»: armar el Map de la lista tomaría la última.
const seccionesEscritas = () => {
  const vistas = new Map();
  for (const x of marcasActuales.flat())
    if (x && x.tipo === 'seccion' && !vistas.has(x.nombre)) vistas.set(x.nombre, x.escrito);
  return vistas;
};
// dónde deja pintar() el ancla del sugeridor: {l, c} o null
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
      const editable = t.tipo && t.tipo !== 'mal' ? ' t-editable' : '';
      const bajoElMouse = !(señalado && señalado.l === n && señalado.i === t.i) ? ''
        : enElBoton() ? ' t-manija' : '';
      const datos = t.tipo ? ' data-tipo="' + t.tipo + '" data-l="' + n + '" data-i="' + t.i + '" data-len="' + t.len + '"' : '';
      const alto = t.alto ? ' data-alto="' + t.alto + '"' : '';
      // De qué parte es el renglón no lo puede saber la hoja: sale de la rueda. El realce
      // va como variable y no como color, así .t-activo sigue siendo una sola regla.
      const tinte = !t.voz ? ''
        : t.cls === 'sujeto' ? ' style="color:' + tintaDe(t.voz) + '"'
        // el «en pizzicato» dice quién, así que va del color de la parte; un
        // escalón atrás del sujeto, que es el que le puso el nombre
        : t.tipo === 'instrumento' ? ' style="color:color-mix(in oklab,' + tintaDe(t.voz) + ' 62%,var(--fondo))"'
        : vivo ? ' style="--vivo:color-mix(in oklab,' + tramaDe(t.voz) + ' 30%,var(--fondo))"'
        : '';
      // el span de afuera es el que sigue midiendo para el ▾ y para el realce
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

// Asignar .value de un textarea le manda el cursor al final: todo lo que reescribe
// el tema desde afuera pasa por acá para devolverlo a donde estaba.
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

// El espejo y los puntitos van al ritmo del teclado; lo que necesita a strudel
// —la cinta, los errores— espera los 400 ms de deshacer.js. Si los puntitos se
// van con la espera, su data-l queda viejo y un click calla la línea de al lado.
function repintarTexto() {
  const r = traducir(src.value);
  calladasActuales = r.calladas;
  repartirLaLuz(r.marcas);
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
  tramosActuales = r.tramos;
  temposActuales = r.tempos;
  // Strudel se consulta acá y en ningún otro lado, una vez por vuelta: los golpes
  // quedan colgados del renglón, así que un resize o un cambio de luz no le
  // preguntan nada, y el espejo de cada tecla tampoco. Y cada parte se prueba
  // sola: si una falla, se cae ella y no el tema entero. Lo decide el editor y no
  // traducir() porque es lo único que no se sabe leyendo la hoja.
  if (motorListo) {
    for (const x of r.renglones) {
      try { x.pat = eval(x.cotejo); } catch (e) { x.pat = null; }
      x.golpes = x.pat && golpesDe(x.pat, r.vueltas);
    }
    const vivas = r.partes.filter(p => {
      try { eval(p.codigo).queryArc(0, 1); return true; }
      catch (e) {
        r.errores.push({ nro: p.nro, msg: 'strudel no pudo con esta línea, la salteo: ' + String(e.message || e) });
        return false;
      }
    });
    if (vivas.length < r.partes.length) { r.partes = vivas; r.codigo = armarCodigo(vivas, r.tramos, r.bpm); }
  }
  // las calladas y las que strudel rechazó están escritas, pero no suenan
  const suenan = new Set(r.partes.map(p => p.nro));
  espejos = r.renglones.filter(x => x.pat && suenan.has(x.nro));
  // la luz de cada parte sale de las que hay en la hoja, así que se reparte antes
  // de que algo pregunte por un color — la cinta y la marca también lo usan
  repartirLaLuz(r.marcas);
  pintar(r.marcas);
  armarPuntos(r.marcas, r.calladas);
  dibujarCinta(r.renglones);
  pintarMarca(r.renglones);
  cajaErr.innerHTML = r.errores.map(e =>
    '<p><b>línea ' + e.nro + ':</b> ' + esc(e.msg) + '</p>').join('');
  cajaJs.textContent = r.codigo || '(todavía no hay nada que tocar)';
  cajaVacio.hidden = !!src.value.trim();
  if (reproducir && sonando && r.codigo !== ultimoCodigo) {
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
    // con secciones el número que vale es el de la tabla nueva, y quién lo mira
    // es el reloj, en el cuadro que sigue: acá sólo se le hace olvidar el de antes
    else if (soloElTempo) { bpmPuesto = null; ponerTempo(r.bpm); }
    else correr(r.codigo);
  }
  return r;
}
