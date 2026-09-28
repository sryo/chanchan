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
  EJEMPLOS.some(e => mismoTema(e.nombre, nombre) && mismoTexto(e.txt, txt));

// el nombre es la identidad, ver REGLAS.md: renombrar e irse a otro tema llegan igual, los separa nombreViejo
function anotarTema(nombre, txt, nombreViejo) {
  if (!nombre) return true;
  const queda = misTemas().filter(t => !mismoTema(t.nombre, nombre) && !(nombreViejo && mismoTema(t.nombre, nombreViejo)));
  // un tema vacío no está en la lista, y un ejemplo que volvió a como venía tampoco
  if (txt.trim() && !esUnEjemplo(nombre, txt)) queda.unshift({ nombre, txt, t: Date.now() });
  if (queda.length > TOPE_TEMAS) avisar('la lista llegó a ' + TOPE_TEMAS + ' temas: el más viejo se fue.');
  return escribirTemas(queda.slice(0, TOPE_TEMAS));
}

const olvidarTema = nombre => escribirTemas(misTemas().filter(t => !mismoTema(t.nombre, nombre)));

// un tema tuyo con ese nombre y otro texto: con el mismo texto es el mismo tema
const chocaCon = (nombre, txt) =>
  misTemas().find(t => mismoTema(t.nombre, nombre) && !mismoTexto(t.txt, txt));

// el nombre del campo, si pisaría otro tema tuyo; se cuenta y no se lee del rojo, que llega a los 400 ms
function chocaElCampo() {
  const nombre = campoNombre.value.trim();
  return nombre && !mismoTema(nombre, nombreAbierto) && chocaCon(nombre, src.value);
}

function nombreLibre(base) {
  let nombre = base, k = 2;
  while (temaLlamado(nombre)) nombre = base + ' ' + k++;
  return nombre;
}

// al dejar la hoja, ver REGLAS.md: sin nombre, o con uno que choca y sin otro con el
// que ya esté guardada, la bautiza la casa. La hoja de bienvenida sin tocar, no
function bautizar() {
  if (!src.value.trim() || BIENVENIDAS.some(b => mismoTexto(src.value, b))) return;
  const nombre = campoNombre.value.trim();
  if (nombre && (nombreAbierto || !chocaElCampo())) return;
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

let relojGuardar, nombreAbierto = '';   // con qué nombre está la hoja en la lista

function guardarYa() {
  clearTimeout(relojGuardar);
  const nombre = campoNombre.value.trim();
  const pudo = recordar(GUARDADO, src.value) && recordar(GUARDADO_NOMBRE, campoNombre.value);
  // renombrar encima de otro no lo pisa: el campo se pone en rojo y la hoja sigue con el nombre de antes
  const choca = chocaElCampo();
  campoNombre.classList.toggle('choca', !!choca);
  if (choca) avisar('ya hay un tema que se llama «' + choca.nombre + '»' + (nombreAbierto
    ? ': éste sigue guardado como «' + nombreAbierto + '».'
    : ': éste no entra en la lista hasta que el nombre sea otro.'), null, 'choca');
  else callarAviso('choca');
  const anotado = anotarTema(choca ? nombreAbierto : nombre, src.value, nombreAbierto);
  if (!pudo || !anotado) avisar(NO_SE_GUARDO);
  // el campo vacío no es un nombre: la hoja sigue en la lista con el suyo, así el próximo la renombra
  if (!choca && nombre) nombreAbierto = nombre;
  recordar(GUARDADO_ABIERTO, nombreAbierto);
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
  const deja = chocaElCampo() ? nombreAbierto : campoNombre.value.trim();
  cambiarDeTema(tema.nombre);
  const viejo = src.value;
  cambiarHistorial(deja, tema.nombre, conRenglonFinal(tema.txt));
  src.value = conRenglonFinal(tema.txt);
  // lo que colgaba de una palabra de la hoja que se fue, se va con ella
  avisarCambio([paso(0, viejo, src.value)], viejo);
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

// los «@» que apuntaban a un nombre que llegó cambiado apuntan al nombre nuevo
function seguirRenombres(txt, nuevos) {
  if (!nuevos.size) return txt;
  return txt.split('\n').map(l => {
    const r = leerRenglon(l), n = (r.clase === 'enlace' || r.clase === 'apunte') && r.nombre;
    const a = n && n.texto && nuevos.get(claveTema(n.texto));
    return a ? l.slice(0, n.desde) + a + l.slice(n.hasta) : l;
  }).join('\n');
}

// lo que llega junto, por enlace o por archivos: el primero se abre, los otros se anotan.
// Un nombre que choca queda como «nombre 2», y los «@» de todos lo siguen
function recibirJuntos(primero, otros) {
  const nuevos = new Map(), avisos = [];
  const nombrar = t => {
    const r = recibido(t);
    if (r.aviso) { avisos.push(r.aviso); nuevos.set(claveTema(t.nombre), r.nombre); }
    return { ...r, aviso: null };
  };
  const abre = nombrar(primero);
  // de a uno, anotando cada uno antes de nombrar al que sigue: dos con el mismo nombre no se pisan
  const recibidos = otros.filter(t => t.nombre).map(t => {
    const r = nombrar(t);
    anotarTema(r.nombre, r.txt, null);
    return r;
  });
  if (nuevos.size) for (const r of recibidos) {
    r.txt = seguirRenombres(r.txt, nuevos);
    anotarTema(r.nombre, r.txt, null);
  }
  return { abre: { ...abre, txt: seguirRenombres(abre.txt, nuevos) }, recibidos, avisos };
}

// después de cargar: cargarTema() termina en actualizar(), que rehace el cajón
function abrirRecibidos(primero, otros) {
  const { abre, avisos } = recibirJuntos(primero, otros);
  cargarTema(abre);
  avisos.forEach(a => avisar(a));
}

// «;» sólo puede ser nuestro: encodeURIComponent lo escapa y base64url no lo trae
async function abrirCarga(crudo) {
  // escapado de más, por un chat o un correo: ningún separador literal, que le quedó «%3A»;
  // es lo que lo distingue de un nombre con «%» adentro
  let carga = crudo;
  try {
    for (let i = 0; i < 3 && carga.indexOf(':') < 0 && /%(25|3A)/i.test(carga); i++)
      carga = decodeURIComponent(carga);
  } catch (e) { return null; }
  const [primero, ...resto] = await Promise.all(carga.split(';').map(abrirPieza));
  return primero && { ...primero, traidos: resto.filter(Boolean) };
}

async function abrirPieza(carga) {
  try {
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
const pareceEnlace = txt => !!txt && !/\s/.test(txt) && !(/:\/\//.test(txt) && !txt.includes('#')) &&
  (/%[0-9A-Fa-f]{2}/.test(txt) || /[:|]z[A-Za-z0-9_-]+$/.test(txt));

src.addEventListener('paste', e => {
  const crudo = (e.clipboardData || window.clipboardData).getData('text').trim();
  if (!pareceEnlace(crudo)) return;                  // pegado común y corriente
  e.preventDefault();
  abrirCarga(crudo.slice(crudo.indexOf('#') + 1)).then(tema => {
    if (!tema || !pareceUnTema(tema.txt)) return avisar(noSePudo());
    abrirRecibidos(tema, tema.traidos);
  });
});

// termina en un renglón vacío: la hoja dice que ahí se puede seguir
const conRenglonFinal = txt => /\n$/.test(txt) ? txt : txt + '\n';
// los renglones vacíos del final no hacen a otro tema
const mismoTexto = (a, b) => a.replace(/\n*$/, '') === b.replace(/\n*$/, '');

// la primera visita, y «nuevo»
const PRIMERA_HOJA = [
  '* en chanchán podés escribir música con palabras, así:',
  'la bata toca pum pa pum pa',
  'el bajo toca do - sol -',
  'el piano toca do mayor | fa mayor',
  '* o saltar a otro tema, así: @ricotero',
  '* tocá una palabra y elegí en el ▾; ' + mostrarTecla('Tab') + ' te sugiere qué va; ' + mostrarTecla('Mod-Enter') + ' toca y para',
].join('\n');
// las bienvenidas de antes también son la hoja sin tocar: guardadas así, no se bautizan
const BIENVENIDAS = [PRIMERA_HOJA, ...[
  ['* o ir a un tema ya grabado, así: @ricotero'],
  ['* o saltar a otro tema, así: @ricotero', '* tocá una palabra y elegí en el ▾; ' + mostrarTecla('Mod-Enter') + ' toca y para'],
].map(cola => [...PRIMERA_HOJA.split('\n').slice(0, 4), ...cola].join('\n'))];

async function temaInicial() {
  const delEnlace = await leerHash();
  // se avisa en arranque.js: actualizar() pisa el cajón
  const sirve = delEnlace && pareceUnTema(delEnlace.txt);
  if (!sirve && location.hash.length > 1) return { txt: '', nombre: '', roto: true };
  if (sirve) {
    // el enlace se consume: si quedara en la barra, recargar abriría esa versión vieja encima de lo escrito
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ }
    const { abre, avisos } = recibirJuntos(delEnlace, delEnlace.traidos);
    return { ...abre, avisos };
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
// el hash que puso el botón, para no abrirlo de vuelta; un booleano quedaba prendido si no cambiaba nada
let hashPropio = '';
addEventListener('hashchange', async () => {
  if (location.hash === hashPropio) { hashPropio = ''; return; }
  if (location.hash.length < 2) return;
  const tema = await leerHash();
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ }
  if (!tema || !pareceUnTema(tema.txt)) return avisar(noSePudo());
  abrirRecibidos(tema, tema.traidos);
});

btnEnlace.addEventListener('click', () => {
  const direccion = armarHash().then(h => {
    hashPropio = '#' + h;
    location.hash = hashPropio;
    return location.href;
  });
  // el portapapeles se pide en el mismo click y recibe la promesa: comprimir tarda, y Safari
  // no acepta una escritura que llega después de un await
  let copia;
  try {
    copia = window.ClipboardItem && navigator.clipboard.write
      ? navigator.clipboard.write([new ClipboardItem({ 'text/plain': direccion.then(u => new Blob([u], { type: 'text/plain' })) })])
      : direccion.then(u => navigator.clipboard.writeText(u));
  } catch (e) { copia = Promise.reject(e); }
  Promise.all([direccion, copia]).then(() => {
    // lo que no se ve del enlace: los temas nombrados con «@» viajan adentro
    const adentro = nombrados(campoNombre.value.trim(), src.value);
    decirEn(btnEnlace, 'enlace copiado' + (adentro.length === 1 ? ', con ' + adentro[0].nombre + ' adentro'
      : adentro.length ? ', con ' + enLetras(adentro.length) + ' temas más adentro' : ''));
    // en la barra se queda sólo cuando es la única copia: una recarga lo pisaría sobre lo escrito
    history.replaceState(null, '', location.pathname + location.search);
  }, () => direccion.then(() => decirEn(btnEnlace, 'quedó en la barra')));
});
