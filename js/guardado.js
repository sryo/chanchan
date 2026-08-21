// ------------------------------------------------------ que no se pierda
// El tema es el texto, así que guardarlo es guardar el texto. El hash le gana al
// guardado: si alguien te pasó un enlace, querés oír eso y no lo tuyo de ayer.
const GUARDADO = 'tungatunga';
const GUARDADO_NOMBRE = 'tungatunga:nombre';
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
  const n = campoNombre.value.trim();
  return (n ? encodeURIComponent(n) + ':' : '') + encodeURIComponent(src.value);
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
    // «%25» es la firma de un enlace escapado de más, que es lo que pasa cuando
    // viaja por un chat o un correo que lo vuelve a escapar. En el idioma no hay
    // ningún «%» que pueda ser suyo, así que desandarlo no rompe nada.
    let carga = crudo;
    for (let i = 0; i < 3 && /%25[0-9A-Fa-f]{2}/.test(carga); i++) carga = decodeURIComponent(carga);
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

// Un enlace de tungatunga pegado en la hoja es un tema, no un texto: pegarlo
// tal cual dejaba una tira de %20 que no se puede ni leer ni tocar. Vale con la
// dirección entera o con lo que va después del numeral.
function temaPegado(crudo) {
  const limpio = crudo.trim();
  if (!limpio || /\s/.test(limpio)) return null;      // un tema escrito tiene espacios
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
  if (delEnlace) return delEnlace;
  try {
    const guardado = localStorage.getItem(GUARDADO);
    // sin nada guardado se abre el primer ejemplo, y se abre con su nombre puesto
    return guardado
      ? { txt: guardado, nombre: localStorage.getItem(GUARDADO_NOMBRE) || '' }
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
