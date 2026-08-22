// ------------------------------------------------------ que no se pierda
// el hash le gana al guardado: un enlace es lo que se quiere oír
const CASA = 'chanchan';
const GUARDADO = CASA;
const GUARDADO_NOMBRE = CASA + ':nombre';

function recordado(clave) {
  try { return localStorage.getItem(clave); } catch (e) { return null; }   // modo privado
}

// lo de tungatunga se pasa una vez y se borra; index.html lee la luz vieja antes de esto
try {
  for (const fin of ['', ':nombre', ':luz']) {
    const viejo = localStorage.getItem('tungatunga' + fin);
    if (viejo === null) continue;
    if (localStorage.getItem(CASA + fin) === null) localStorage.setItem(CASA + fin, viejo);
    localStorage.removeItem('tungatunga' + fin);
  }
} catch (e) { /* modo privado */ }

// -------------------------------------------------------------- mis temas
// el nombre es el guardado, ver REGLAS.md; sin nombre la hoja restaurada es una sola, la última
const GUARDADO_TEMAS = CASA + ':temas';
const TOPE_TEMAS = 60;

function misTemas() {
  try { return JSON.parse(recordado(GUARDADO_TEMAS) || '[]'); } catch (e) { return []; }
}

function escribirTemas(lista) {
  try { localStorage.setItem(GUARDADO_TEMAS, JSON.stringify(lista)); }
  catch (e) { /* modo privado, o lleno */ }
  armarVacio();                         // temas.js, que carga después: sólo corre en caliente
}

// abrir un ejemplo sin tocarlo no lo hace tuyo
const esUnEjemplo = (nombre, txt) =>
  EJEMPLOS.some(e => e.nombre === nombre && conRenglonFinal(e.txt) === conRenglonFinal(txt));

// el nombre es la identidad, ver REGLAS.md: renombrar e irse a otro tema llegan igual, los separa nombreViejo
function anotarTema(nombre, txt, nombreViejo) {
  if (esUnEjemplo(nombre, txt)) return;
  const queda = misTemas().filter(t => t.nombre !== nombre && t.nombre !== nombreViejo);
  queda.unshift({ nombre, txt, t: Date.now() });
  escribirTemas(queda.slice(0, TOPE_TEMAS));
}

const olvidarTema = nombre => escribirTemas(misTemas().filter(t => t.nombre !== nombre));

// «una por vuelta» era un paso por vuelta: hoy es una barra entre paso y paso
function conBarras(linea) {
  const limpia = linea.replace(/\s*,\s*una por vuelta\b/i, '');
  const pasos = traducirLinea(limpia, 1).tk.filter(t => t.tipo === 'paso' || t.tipo === 'nota');
  let out = limpia;
  for (let k = pasos.length - 1; k >= 1; k--) out = out.slice(0, pasos[k].i) + '| ' + out.slice(pasos[k].i);
  return out;
}

const alDia = txt => txt.replace(/\btas\b/g, 'pa').replace(/\bchas\b/g, 'plas')
  .split('\n').map(l => /,\s*una por vuelta\b/i.test(l) ? conBarras(l) : l).join('\n');

try {
  const abierto = localStorage.getItem(GUARDADO);
  if (abierto && alDia(abierto) !== abierto) localStorage.setItem(GUARDADO, alDia(abierto));
  const lista = misTemas();
  if (lista.some(t => alDia(t.txt) !== t.txt)) escribirTemas(lista.map(t => ({ ...t, txt: alDia(t.txt) })));
} catch (e) { /* modo privado */ }

let relojGuardar, nombreAbierto = '';   // con qué nombre está la hoja en la lista

function guardarYa() {
  clearTimeout(relojGuardar);
  const nombre = campoNombre.value.trim();
  try {
    localStorage.setItem(GUARDADO, src.value);
    localStorage.setItem(GUARDADO_NOMBRE, campoNombre.value);
  } catch (e) { /* modo privado */ }
  if (nombre) anotarTema(nombre, src.value, nombreAbierto);
  nombreAbierto = nombre;
}

// se guarda el de ahora y la hoja pasa a ser el otro: lo que se teclee renombra a ése
function cambiarDeTema(nombre) {
  guardarYa();
  nombreAbierto = nombre;
}

// vaciar el guardado perezoso antes de pisar el texto
function cargarTema(tema) {
  cambiarDeTema(tema.nombre);
  src.value = conRenglonFinal(tema.txt);
  campoNombre.value = tema.nombre;
  acomodarNombre();
  registrar(src.value, null);
  actualizar(true);
  guardar();
}

// la tecla espera; irse a otro tema escribe ya
function guardar() {
  clearTimeout(relojGuardar);
  relojGuardar = setTimeout(guardarYa, 400);
}
// los 400 ms no pueden sobrevivir a cerrar la pestaña
addEventListener('pagehide', guardarYa);

// los dos puntos son legales en un fragmento y encodeURIComponent los escapa: el primero es siempre el nuestro
function armarHash() {
  return encodeURIComponent(campoNombre.value.trim()) + ':' + encodeURIComponent(src.value);
}

// la barra vertical es de los enlaces viejos, y la barra de direcciones la reescribe «%7C»; vale
// sólo sin dos puntos: un nombre de ahora puede traer un «%7C» adentro
function cortarNombre(carga) {
  const i = carga.indexOf(':');
  if (i >= 0) return [i, 1];
  for (const [marca, largo] of [['|', 1], ['%7C', 3]]) {
    const j = carga.indexOf(marca);
    if (j >= 0) return [j, largo];
  }
  return null;
}

function abrirCarga(crudo) {
  try {
    // escapado de más, por un chat o un correo: trae «%25» y ningún separador literal, que le
    // quedó «%3A»; es lo que lo distingue de un nombre con «%» adentro
    let carga = crudo;
    for (let i = 0; i < 3 && /%25[0-9A-Fa-f]{2}/.test(carga) && !cortarNombre(carga); i++)
      carga = decodeURIComponent(carga);
    const corte = cortarNombre(carga);
    // un enlace de antes del cambio también se pasa al idioma de ahora
    return corte
      ? { nombre: decodeURIComponent(carga.slice(0, corte[0])),
          txt:    alDia(decodeURIComponent(carga.slice(corte[0] + corte[1]))) }
      : { nombre: '', txt: alDia(decodeURIComponent(carga)) };
  } catch (e) { return null; }     // enlace roto
}

function leerHash() {
  return location.hash.length < 2 ? null : abrirCarga(location.hash.slice(1));
}

// un enlace pegado en la hoja es un tema, no un texto; vale la dirección entera o lo que sigue al numeral
function temaPegado(crudo) {
  const limpio = crudo.trim();
  // tiene que parecer un enlace, no apenas algo sin espacios
  if (!limpio || /\s/.test(limpio) || !/%[0-9A-Fa-f]{2}/.test(limpio)) return null;
  const tema = abrirCarga(limpio.slice(limpio.indexOf('#') + 1));
  return tema && /\btocan?\b/i.test(tema.txt) ? tema : null;
}

src.addEventListener('paste', e => {
  const tema = temaPegado((e.clipboardData || window.clipboardData).getData('text'));
  if (!tema) return;                                 // pegado común y corriente
  e.preventDefault();
  cargarTema(tema);
});

// termina en un renglón vacío: la hoja dice que ahí se puede seguir
const conRenglonFinal = txt => txt.replace(/\n*$/, '\n');

function temaInicial() {
  const delEnlace = leerHash();
  if (delEnlace) {
    // el enlace se consume: si quedara en la barra, recargar abriría esa versión vieja encima de lo escrito
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ }
    return delEnlace;
  }
  try {
    const guardado = recordado(GUARDADO);
    // sin nada guardado, la hoja vacía y no un ejemplo: un tema ajeno con nombre dice «esto ya es de alguien»
    return guardado
      ? { txt: guardado, nombre: recordado(GUARDADO_NOMBRE) || '' }
      : { txt: '', nombre: '' };
  } catch (e) { return { txt: '', nombre: '' }; }
}

// el input no se achica solo
const TITULO = document.title;

function acomodarNombre() {
  const largo = (campoNombre.value || campoNombre.placeholder).length;
  campoNombre.style.width = Math.min(40, Math.max(6, largo)) + 'ch';
  // sin nombre la pestaña es la página sola, ver REGLAS.md
  const nombre = campoNombre.value.trim();
  document.title = nombre ? nombre + ' — ' + TITULO : TITULO;
}
campoNombre.addEventListener('input', () => { acomodarNombre(); guardar(); });

btnEnlace.addEventListener('click', async () => {
  location.hash = armarHash();
  try {
    await navigator.clipboard.writeText(location.href);
    decirEnElEnlace('enlace copiado');
    // en la barra se queda sólo cuando es la única copia: una recarga lo pisaría sobre lo escrito
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) { decirEnElEnlace('quedó en la barra'); }
});
