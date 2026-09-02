// ------------------------------------------------------ que no se pierda
// el hash le gana al guardado: un enlace es lo que se quiere oír
const CASA = 'chanchan';
const GUARDADO = CASA;
const GUARDADO_NOMBRE = CASA + ':nombre';
const GUARDADO_ABIERTO = CASA + ':abierto';   // con qué nombre está en la lista, que puede no ser el del campo

function recordado(clave) {
  try { return localStorage.getItem(clave); } catch (e) { return null; }   // modo privado
}
// falla en modo privado o con el disco lleno, y el que escribe tiene que enterarse
function recordar(clave, valor) {
  try { localStorage.setItem(clave, valor); return true; } catch (e) { return false; }
}
const NO_SE_GUARDO = 'no se pudo guardar en este navegador: lo escrito se pierde al cerrar la pestaña. Copiá el enlace o bajá el archivo.';

// dos nombres que se leen igual son el mismo tema, ver REGLAS.md
const claveTema = nombre => norm(nombre || '');
const mismoTema = (a, b) => claveTema(a) === claveTema(b);

// -------------------------------------------------------------- mis temas
// el nombre es el guardado, ver REGLAS.md; la hoja sin nombre vive en su casillero
// hasta que se deja, y ahí la casa la bautiza
const GUARDADO_TEMAS = CASA + ':temas';
const TOPE_TEMAS = 500;

function misTemas() {
  try { return JSON.parse(recordado(GUARDADO_TEMAS) || '[]'); } catch (e) { return []; }
}

const escribirTemas = lista => recordar(GUARDADO_TEMAS, JSON.stringify(lista));

// abrir un ejemplo sin tocarlo no lo hace tuyo
const esUnEjemplo = (nombre, txt) =>
  EJEMPLOS.some(e => mismoTema(e.nombre, nombre) && conRenglonFinal(e.txt) === conRenglonFinal(txt));

// el nombre es la identidad, ver REGLAS.md: renombrar e irse a otro tema llegan igual, los separa nombreViejo
function anotarTema(nombre, txt, nombreViejo) {
  if (!nombre || esUnEjemplo(nombre, txt)) return true;
  const queda = misTemas().filter(t => !mismoTema(t.nombre, nombre) && !(nombreViejo && mismoTema(t.nombre, nombreViejo)));
  // un tema vacío no está en la lista
  if (txt.trim()) queda.unshift({ nombre, txt, t: Date.now() });
  if (queda.length > TOPE_TEMAS) avisar('la lista llegó a ' + TOPE_TEMAS + ' temas: el más viejo se fue.');
  return escribirTemas(queda.slice(0, TOPE_TEMAS));
}

const olvidarTema = nombre => escribirTemas(misTemas().filter(t => !mismoTema(t.nombre, nombre)));

// un tema tuyo con ese nombre y otro texto: con el mismo texto es el mismo tema
const chocaCon = (nombre, txt) =>
  misTemas().find(t => mismoTema(t.nombre, nombre) && conRenglonFinal(t.txt) !== conRenglonFinal(txt));

function nombreLibre(base) {
  let nombre = base, k = 2;
  while (temaLlamado(nombre)) nombre = base + ' ' + k++;
  return nombre;
}

// al dejar la hoja, ver REGLAS.md: sin nombre, o con uno que choca y sin otro con el
// que ya esté guardada, la bautiza la casa. La hoja de bienvenida sin tocar, no
function bautizar() {
  if (!src.value.trim() || conRenglonFinal(src.value) === conRenglonFinal(PRIMERA_HOJA)) return;
  const nombre = campoNombre.value.trim();
  if (nombre && (nombreAbierto || !campoNombre.classList.contains('choca'))) return;
  campoNombre.value = nombreLibre(nombre || 'sin título');
  campoNombre.classList.remove('choca');
  acomodarNombre();
}

// lo que llega por enlace o archivo no pisa un tema tuyo distinto: queda como «nombre 2»
function recibido(tema) {
  const mio = tema.nombre && chocaCon(tema.nombre, tema.txt);
  if (!mio) return tema;
  const nombre = nombreLibre(tema.nombre);
  return { ...tema, nombre, aviso: 'ya tenías un «' + mio.nombre + '» distinto: el que llegó quedó como «' + nombre + '».' };
}

// después de cargar: cargarTema() termina en actualizar(), que rehace el cajón
function cargarRecibido(tema) {
  const t = recibido(tema);
  cargarTema(t);
  if (t.aviso) avisar(t.aviso);
}

let relojGuardar, nombreAbierto = '';   // con qué nombre está la hoja en la lista

function guardarYa() {
  clearTimeout(relojGuardar);
  const nombre = campoNombre.value.trim();
  const pudo = recordar(GUARDADO, src.value) && recordar(GUARDADO_NOMBRE, campoNombre.value);
  recordar(GUARDADO_ABIERTO, nombreAbierto);
  // renombrar encima de otro no lo pisa: el campo se pone en rojo y la hoja sigue con el nombre de antes
  const choca = nombre && !mismoTema(nombre, nombreAbierto) && chocaCon(nombre, src.value);
  campoNombre.classList.toggle('choca', !!choca);
  if (choca) avisar('ya hay un tema que se llama «' + choca.nombre + '»' + (nombreAbierto
    ? ': éste sigue guardado como «' + nombreAbierto + '».'
    : ': éste no entra en la lista hasta que el nombre sea otro.'));
  const anotado = anotarTema(choca ? nombreAbierto : nombre, src.value, nombreAbierto);
  if (!pudo || !anotado) avisar(NO_SE_GUARDO);
  if (!choca) nombreAbierto = nombre;
}

// con qué nombre está guardada la hoja que se abre
const abrirComo = nombre => { nombreAbierto = nombre; };

// se guarda el de ahora y la hoja pasa a ser el otro: lo que se teclee renombra a ése
function cambiarDeTema(nombre) {
  guardarYa();
  nombreAbierto = nombre;
}

// vaciar el guardado perezoso antes de pisar el texto
function cargarTema(tema) {
  bautizar();
  // el historial es de la hoja: se guarda bajo el nombre con el que la hoja está en la lista
  const deja = campoNombre.classList.contains('choca') ? nombreAbierto : campoNombre.value.trim();
  cambiarDeTema(tema.nombre);
  cambiarHistorial(deja, tema.nombre, conRenglonFinal(tema.txt));
  src.value = conRenglonFinal(tema.txt);
  campoNombre.value = tema.nombre;
  campoNombre.classList.remove('choca');
  acomodarNombre();
  arrancarHistorial();
  actualizar(true);
  guardar();
}

// con el mismo nombre gana el tuyo, ver REGLAS.md
function temasTodos() {
  const mios = misTemas();
  return [...mios, ...EJEMPLOS.filter(e => !mios.some(m => mismoTema(m.nombre, e.nombre)))];
}

const temaLlamado = nombre => temasTodos().find(t => mismoTema(t.nombre, nombre));

function irAlTema(nombre) {
  cargarTema(temaLlamado(nombre) || { nombre, txt: '' });
  src.focus();
}

// la tecla espera; irse a otro tema escribe ya
function guardar() {
  clearTimeout(relojGuardar);
  relojGuardar = setTimeout(guardarYa, 400);
}
// los 400 ms no pueden sobrevivir a cerrar la pestaña; cerrarla es irse: se bautiza
addEventListener('pagehide', () => { bautizar(); guardarYa(); });

// comprimido porque en claro son miles de caracteres; la «z» lo marca
// de a bloques: desparramar el arreglo entero como argumentos tiene tope
function aBase64(b) {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const deBase64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const hayZip = () => typeof CompressionStream === 'function';
const noSePudo = () => hayZip() ? 'ese enlace no se pudo abrir.'
  : 'ese enlace viene comprimido y este navegador no sabe abrirlo: hace falta uno más nuevo.';

async function porElTubo(datos, tubo) {
  return new Uint8Array(await new Response(new Blob([datos]).stream().pipeThrough(tubo)).arrayBuffer());
}
const desinflar = txt => porElTubo(new TextEncoder().encode(txt), new CompressionStream('deflate-raw'));
const inflar = async b64 => new TextDecoder().decode(await porElTubo(deBase64(b64), new DecompressionStream('deflate-raw')));

// los dos puntos son legales en un fragmento y encodeURIComponent los escapa: el primero es siempre el nuestro
async function hashDe(nombre, txt) {
  const antes = encodeURIComponent(nombre.trim()) + ':';
  const plano = antes + encodeURIComponent(txt);
  if (!hayZip()) return plano;
  try {
    const corto = antes + 'z' + aBase64(await desinflar(txt));
    return corto.length < plano.length ? corto : plano;
  } catch (e) { return plano; }
}

// los temas que éste nombra con «@», y los que ésos nombran, una vez cada uno
function nombrados(nombre, txt) {
  const vistos = new Set([claveTema(nombre)]), lista = [], cola = [txt];
  while (cola.length)
    for (const n of traducir(cola.shift()).enlaces) {
      const k = claveTema(n), t = !vistos.has(k) && temaLlamado(n);
      if (!t) continue;
      vistos.add(k); lista.push(t); cola.push(t.txt);
    }
  return lista;
}

// el abierto y, tras «;», los que nombra
async function armarHash() {
  const nombre = campoNombre.value.trim();
  const piezas = [[nombre, src.value], ...nombrados(nombre, src.value).map(t => [t.nombre, t.txt])];
  return (await Promise.all(piezas.map(([n, x]) => hashDe(n, x)))).join(';');
}

// los que vienen con el enlace entran como cualquier recibido; devuelve los avisos
function guardarTraidos(traidos) {
  const avisos = [];
  for (const t of traidos || []) {
    if (!t.nombre) continue;
    const r = recibido(t);
    anotarTema(r.nombre, r.txt, null);
    if (r.aviso) avisos.push(r.aviso);
  }
  return avisos;
}

// «;» sólo puede ser nuestro: encodeURIComponent lo escapa y base64url no lo trae
async function abrirCarga(crudo) {
  const [primero, ...resto] = await Promise.all(crudo.split(';').map(abrirPieza));
  return primero && { ...primero, traidos: resto.filter(Boolean) };
}

async function abrirPieza(crudo) {
  try {
    // escapado de más, por un chat o un correo: trae «%25» y ningún separador literal, que le
    // quedó «%3A»; es lo que lo distingue de un nombre con «%» adentro
    let carga = crudo;
    for (let i = 0; i < 3 && /%25[0-9A-Fa-f]{2}/.test(carga) && carga.indexOf(':') < 0; i++)
      carga = decodeURIComponent(carga);
    const corte = carga.indexOf(':');
    const nombre = corte >= 0 ? decodeURIComponent(carga.slice(0, corte)) : '';
    const cuerpo = carga.slice(corte + 1);
    // el comprimido es base64url y nada más; el plano siempre trae algún «%»
    const comprimido = /^z[A-Za-z0-9_-]+$/.test(cuerpo);
    if (comprimido && !hayZip()) return null;
    // si inflar falla, era texto plano que empezaba con «z»
    if (comprimido)
      try { return { nombre, txt: await inflar(cuerpo.slice(1)) }; } catch (e) { /* texto plano */ }
    return { nombre, txt: decodeURIComponent(cuerpo) };
  } catch (e) { return null; }     // enlace roto
}

function leerHash() {
  return location.hash.length < 2 ? null : abrirCarga(location.hash.slice(1));
}

// un tema es lo que el traductor entiende como tal: alguna parte, o algún enlace a otro tema
function pareceUnTema(txt) {
  const r = traducir(txt);
  return r.renglones.length > 0 || r.enlaces.length > 0;
}

// un enlace pegado en la hoja es un tema, no un texto; vale la dirección entera o lo que sigue al numeral.
// Se decide por la forma: inflar es asíncrono y el pegado se corta o no ahora mismo
const pareceEnlace = txt => !!txt && !/\s/.test(txt) &&
  (/%[0-9A-Fa-f]{2}/.test(txt) || /[:|]z[A-Za-z0-9_-]+$/.test(txt));

src.addEventListener('paste', e => {
  const crudo = (e.clipboardData || window.clipboardData).getData('text').trim();
  if (!pareceEnlace(crudo)) return;                  // pegado común y corriente
  e.preventDefault();
  abrirCarga(crudo.slice(crudo.indexOf('#') + 1)).then(tema => {
    if (!tema || !pareceUnTema(tema.txt)) return avisar(noSePudo());
    const avisos = guardarTraidos(tema.traidos);
    cargarRecibido(tema);
    avisos.forEach(a => avisar(a));
  });
});

// termina en un renglón vacío: la hoja dice que ahí se puede seguir
const conRenglonFinal = txt => txt.replace(/\n*$/, '\n');

// la primera visita, y «nuevo»
const PRIMERA_HOJA = [
  '* en chanchán podés escribir música con palabras, así:',
  'la bata toca pum pa pum pa',
  'el bajo toca do - sol -',
  'el piano toca do mayor | fa mayor',
  '* o ir a un tema ya grabado, así: @ricotero',
].join('\n');

async function temaInicial() {
  const delEnlace = await leerHash();
  // se avisa en arranque.js: actualizar() pisa el cajón
  if (!delEnlace && location.hash.length > 1) return { txt: '', nombre: '', roto: true };
  if (delEnlace) {
    // el enlace se consume: si quedara en la barra, recargar abriría esa versión vieja encima de lo escrito
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ }
    const avisos = guardarTraidos(delEnlace.traidos);
    return { ...recibido(delEnlace), avisos };
  }
  const guardado = recordado(GUARDADO);
  return guardado
    ? { txt: guardado, nombre: recordado(GUARDADO_NOMBRE) || '', abierto: recordado(GUARDADO_ABIERTO) || '' }
    : { txt: PRIMERA_HOJA, nombre: '' };
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

// un enlace pegado en la barra abre sin recargar
let hashPropio = false;
addEventListener('hashchange', async () => {
  if (hashPropio) { hashPropio = false; return; }
  if (location.hash.length < 2) return;
  const tema = await leerHash();
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ }
  if (!tema) return avisar(noSePudo());
  const avisos = guardarTraidos(tema.traidos);
  cargarRecibido(tema);
  avisos.forEach(a => avisar(a));
});

btnEnlace.addEventListener('click', async () => {
  hashPropio = true;
  location.hash = await armarHash();
  try {
    await navigator.clipboard.writeText(location.href);
    decirEnElEnlace('enlace copiado');
    // en la barra se queda sólo cuando es la única copia: una recarga lo pisaría sobre lo escrito
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) { decirEnElEnlace('quedó en la barra'); }
});
