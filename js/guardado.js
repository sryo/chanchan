// ------------------------------------------------------ que no se pierda
// el hash le gana al guardado: si alguien te pasó un enlace, querés oír eso y no lo tuyo de ayer
const CASA = 'chanchan';
const GUARDADO = CASA;
const GUARDADO_NOMBRE = CASA + ':nombre';

function recordado(clave) {
  try { return localStorage.getItem(clave); } catch (e) { return null; }   // modo privado
}

// Lo guardado cuando el proyecto se llamaba tungatunga se pasa una vez y se borra.
// Leer las dos claves en cada consulta tenía un agujero: un nombre vacío guardado
// caía en el de antes como si no hubiera ninguno, y resucitaba. (index.html lee
// la luz vieja una vez más, antes de la primera pintada; después de esto ya no está.)
try {
  for (const fin of ['', ':nombre', ':luz']) {
    const viejo = localStorage.getItem('tungatunga' + fin);
    if (viejo === null) continue;
    if (localStorage.getItem(CASA + fin) === null) localStorage.setItem(CASA + fin, viejo);
    localStorage.removeItem('tungatunga' + fin);
  }
} catch (e) { /* modo privado */ }

// -------------------------------------------------------------- mis temas
// El nombre es el guardado: en cuanto el tema tiene uno queda en la lista. No hay
// un «guardar» aparte que aprender, y es la misma palabra que viaja en el enlace.
// Sin nombre no se pierde nada, pero la hoja restaurada es una sola, la última.
const GUARDADO_TEMAS = CASA + ':temas';
const TOPE_TEMAS = 60;

function misTemas() {
  try { return JSON.parse(recordado(GUARDADO_TEMAS) || '[]'); } catch (e) { return []; }
}

function escribirTemas(lista) {
  try { localStorage.setItem(GUARDADO_TEMAS, JSON.stringify(lista)); }
  catch (e) { /* modo privado, o lleno */ }
  // la hoja vacía muestra esta lista, y se rehacía sólo al abrir un tema: borrar
  // uno con la × y vaciar la hoja lo seguía ofreciendo, y abrirlo lo volvía a anotar
  armarVacio();                         // temas.js, que carga después: sólo corre en caliente
}

// El nombre es la identidad —ver REGLAS.md—. Renombrar e irse a otro tema llegan
// acá igual; los separa con qué nombre estaba la hoja en la lista: al renombrar,
// esa entrada es este mismo tema y se va; al irse a otro, cambiarDeTema() ya dijo
// que la hoja es el otro. Adivinarlo por el texto borraba el tema que se acababa
// de dejar cuando los dos decían lo mismo —dos hojas nuevas, por ejemplo—. Y
// abrir un ejemplo sin tocarlo no lo hace tuyo, la lista de arriba espejaría la de abajo.
const esUnEjemplo = (nombre, txt) =>
  EJEMPLOS.some(e => e.nombre === nombre && conRenglonFinal(e.txt) === conRenglonFinal(txt));

function anotarTema(nombre, txt, nombreViejo) {
  if (esUnEjemplo(nombre, txt)) return;
  const queda = misTemas().filter(t => t.nombre !== nombre && t.nombre !== nombreViejo);
  // los guardados de antes no traen «t» y no muestran nada, que es la verdad
  queda.unshift({ nombre, txt, t: Date.now() });
  escribirTemas(queda.slice(0, TOPE_TEMAS));
}

const olvidarTema = nombre => escribirTemas(misTemas().filter(t => t.nombre !== nombre));

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

// Irse a otro tema: se guarda el de ahora y la hoja pasa a ser el otro, así lo
// que se escriba en el campo de ahí en más renombra a ése y no al que se dejó.
function cambiarDeTema(nombre) {
  guardarYa();
  nombreAbierto = nombre;
}

// vaciar el guardado perezoso antes de pisar el texto: si no se pierde lo último
function cargarTema(tema) {
  cambiarDeTema(tema.nombre);
  src.value = conRenglonFinal(tema.txt);
  campoNombre.value = tema.nombre;
  acomodarNombre();
  registrar(src.value, null);
  actualizar(true);
  guardar();
}

// Cada tecla no escribe en el disco, pero irse a otro tema sí: por eso las dos
// puertas. Borrarle el nombre a un tema no lo saca de la lista —para eso está
// la × del panel—, apenas deja de escribirle encima.
function guardar() {
  clearTimeout(relojGuardar);
  relojGuardar = setTimeout(guardarYa, 400);
}
// los 400 ms no pueden sobrevivir a cerrar la pestaña
addEventListener('pagehide', guardarYa);

// El nombre va adelante del texto, separado por dos puntos: son legales dentro de
// un fragmento —ningún navegador los toca— y encodeURIComponent sí los escapa,
// así que el primero que aparece es siempre el nuestro. Van siempre, aunque el
// tema no tenga nombre.
function armarHash() {
  return encodeURIComponent(campoNombre.value.trim()) + ':' + encodeURIComponent(src.value);
}

// Los enlaces del primer día llevaban una barra vertical, que la barra de
// direcciones reescribe como «%7C». Se aceptan sólo cuando no hay dos puntos: un
// enlace de ahora no tiene ninguno literal fuera del separador, pero sí puede
// tener un «%7C» adentro del nombre, y buscar las tres marcas a la vez lo cortaba ahí.
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
  return tema && /\btocan?\b/i.test(tema.txt) ? tema : null;
}

src.addEventListener('paste', e => {
  const tema = temaPegado((e.clipboardData || window.clipboardData).getData('text'));
  if (!tema) return;                                 // pegado común y corriente
  e.preventDefault();
  cargarTema(tema);
});

// Un tema abierto termina en un renglón vacío: si no, para agregar una parte hay
// que apretar enter primero, y la hoja no dice que ahí se puede seguir.
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
    // Sin nada guardado, la hoja vacía: es la que explica cómo se escribe, y los
    // ejemplos están ahí mismo. Abrir un tema ajeno con su nombre puesto le decía
    // «esto ya es de alguien» justo a quien llega por primera vez.
    return guardado
      ? { txt: guardado, nombre: recordado(GUARDADO_NOMBRE) || '' }
      : { txt: '', nombre: '' };
  } catch (e) { return { txt: '', nombre: '' }; }
}

// El nombre del tema sale del campo por dos lados: el ancho del propio input —que
// no se achica solo al contenido, y el subrayado tiene que terminar donde termina
// el nombre— y la pestaña, que es donde el nombre queda escrito para cuando la
// página no se está viendo: el historial, un marcador, la lista de ventanas.
// El de la página se lee del html y no se escribe otra vez acá.
const TITULO = document.title;

function acomodarNombre() {
  const largo = (campoNombre.value || campoNombre.placeholder).length;
  campoNombre.style.width = Math.min(40, Math.max(6, largo)) + 'ch';
  // «sin título» es lo que dice un campo vacío, no un nombre: dejarlo en un
  // marcador sería inventarle uno. Sin nombre la pestaña es la página sola.
  const nombre = campoNombre.value.trim();
  document.title = nombre ? nombre + ' — ' + TITULO : TITULO;
}
campoNombre.addEventListener('input', () => { acomodarNombre(); guardar(); });

btnEnlace.addEventListener('click', async () => {
  location.hash = armarHash();
  try {
    await navigator.clipboard.writeText(location.href);
    decirEnElEnlace('enlace copiado');
    // Ya está en el portapapeles. En la barra sería una foto de ahora, y una
    // recarga de acá a una hora la pisaría sobre lo escrito mientras tanto:
    // sólo se queda cuando es la única copia que hay.
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) { decirEnElEnlace('quedó en la barra'); }
});
