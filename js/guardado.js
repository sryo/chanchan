// ------------------------------------------------------ que no se pierda
// El tema es el texto, así que guardarlo es guardar el texto. El hash le gana al
// guardado: si alguien te pasó un enlace, querés oír eso y no lo tuyo de ayer.
const CASA = 'chanchan';
const CASA_VIEJA = 'tungatunga';        // el proyecto se llamaba así
const GUARDADO = CASA;
const GUARDADO_NOMBRE = CASA + ':nombre';

// Lo que quedó guardado con el nombre viejo se lee igual, así nadie pierde el
// tema que tenía abierto. Al primer guardado pasa solo a la clave nueva.
function recordado(clave) {
  try { return localStorage.getItem(clave) || localStorage.getItem(clave.replace(CASA, CASA_VIEJA)); }
  catch (e) { return null; }            // modo privado
}
let relojGuardar;

function guardar() {
  clearTimeout(relojGuardar);
  relojGuardar = setTimeout(() => {
    try {
      localStorage.setItem(GUARDADO, src.value);
      localStorage.setItem(GUARDADO_NOMBRE, campoNombre.value);
    } catch (e) { /* modo privado */ }
  }, 400);
}

// El nombre va adelante del texto, separado por dos puntos. Los dos puntos son
// legales dentro de un fragmento, así que ningún navegador los toca, y
// encodeURIComponent sí los escapa, así que el primero que aparece es siempre el
// nuestro. Antes iba una barra vertical: el navegador la reescribía como «%7C»
// al pasar por la barra de direcciones y entonces no se encontraba, y el enlace
// entero terminaba adentro de la hoja como texto.
function armarHash() {
  // Los dos puntos van siempre, aunque el tema no tenga nombre: así el primer
  // separador literal del enlace es siempre el nuestro, y un tema que adentro
  // tenga una barra vertical no se parte por la mitad al abrirlo.
  return encodeURIComponent(campoNombre.value.trim()) + ':' + encodeURIComponent(src.value);
}

// Dónde termina el nombre. Los enlaces viejos siguen abriendo: se buscan las
// tres marcas y gana la que aparezca primero.
const SEPARADORES = [[':', 1], ['|', 1], ['%7C', 3]];
function cortarNombre(carga) {
  let mejor = null;
  for (const [marca, largo] of SEPARADORES) {
    const i = carga.indexOf(marca);
    if (i >= 0 && (!mejor || i < mejor[0])) mejor = [i, largo];
  }
  return mejor;
}

function abrirCarga(crudo) {
  try {
    // Un enlace escapado de más —le pasa al viajar por un chat o un correo— trae
    // «%25» y no trae ningún separador literal, porque los dos puntos le
    // quedaron como «%3A». Ese par de condiciones es lo que lo distingue de un
    // nombre que de verdad tenga un «%» adentro, como «100%ab».
    let carga = crudo;
    for (let i = 0; i < 3 && /%25[0-9A-Fa-f]{2}/.test(carga) && !cortarNombre(carga); i++)
      carga = decodeURIComponent(carga);
    const corte = cortarNombre(carga);
    return corte
      ? { nombre: decodeURIComponent(carga.slice(0, corte[0])),
          txt:    decodeURIComponent(carga.slice(corte[0] + corte[1])) }
      : { nombre: '', txt: decodeURIComponent(carga) };
  } catch (e) { return null; }     // enlace roto
}

function leerHash() {
  return location.hash.length < 2 ? null : abrirCarga(location.hash.slice(1));
}

// Un enlace de chanchán pegado en la hoja es un tema, no un texto: pegarlo
// tal cual dejaba una tira de %20 que no se puede ni leer ni tocar. Vale con la
// dirección entera o con lo que va después del numeral.
function temaPegado(crudo) {
  const limpio = crudo.trim();
  // Tiene que parecer un enlace, no apenas «algo sin espacios»: antes bastaba
  // pegar la palabra «toca» para que se llevara puesto el tema entero.
  if (!limpio || /\s/.test(limpio) || !/%[0-9A-Fa-f]{2}/.test(limpio)) return null;
  const tema = abrirCarga(limpio.slice(limpio.indexOf('#') + 1));
  return tema && /\btocan?\b/.test(tema.txt) ? tema : null;
}

src.addEventListener('paste', e => {
  const tema = temaPegado((e.clipboardData || window.clipboardData).getData('text'));
  if (!tema) return;                                 // pegado común y corriente
  e.preventDefault();
  cargarTema(tema);
});

// Un tema abierto termina en un renglón vacío: si no, para agregar una parte hay
// que ir al final y apretar Enter antes de poder escribir. Se pone al abrir y no
// en cada tecla — mantenerlo siempre pelearía con el que quiere borrarlo.
const conRenglonFinal = txt => txt.replace(/\n*$/, '\n');

function temaInicial() {
  const delEnlace = leerHash();
  if (delEnlace) {
    // El enlace se consume y se saca de la barra. Si quedara puesto, recargar
    // media hora después abriría esa versión vieja —y el guardado automático la
    // escribiría encima de lo que estabas haciendo—. «copiar enlace» lo vuelve
    // a poner cuando hace falta.
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ }
    return delEnlace;
  }
  try {
    const guardado = recordado(GUARDADO);
    // sin nada guardado se abre el primer ejemplo, y se abre con su nombre puesto
    return guardado
      ? { txt: guardado, nombre: recordado(GUARDADO_NOMBRE) || '' }
      : { txt: EJEMPLOS[0].txt, nombre: EJEMPLOS[0].nombre };
  } catch (e) { return { txt: EJEMPLOS[0].txt, nombre: EJEMPLOS[0].nombre }; }
}

// un input no se achica solo al contenido: se le mide el texto y se le da ese
// ancho, para que el subrayado termine donde termina el nombre
function medirNombre() {
  const largo = (campoNombre.value || campoNombre.placeholder).length;
  campoNombre.style.width = Math.min(40, Math.max(6, largo)) + 'ch';
}
campoNombre.addEventListener('input', () => { medirNombre(); guardar(); });

btnEnlace.addEventListener('click', async () => {
  location.hash = armarHash();
  try {
    await navigator.clipboard.writeText(location.href);
    decirEnElEnlace('enlace copiado');
  } catch (e) { decirEnElEnlace('quedó en la barra'); }
});

// El span se rehace en cada pintada, así que lo que se ancle a un token tiene
// que volver a buscarlo por posición en vez de guardarse el nodo.
const spanDe = a => a && hl.querySelector('span[data-l="' + a.l + '"][data-i="' + a.i + '"]');

function pegarA(el, ancla) {
  const sp = spanDe(ancla);
  if (!sp) { el.classList.remove('vivo'); return false; }
  // el último renglón: si la palabra se parte, la unión daría una caja que arranca
  // en el margen izquierdo y el cartelito saldría volando
  const cajas = sp.getClientRects();
  const r = cajas[cajas.length - 1] || sp.getBoundingClientRect();
  el.style.left = (r.right + 6) + 'px';
  el.style.top = (r.top - 3) + 'px';
  el.classList.add('vivo');
  return true;
}
