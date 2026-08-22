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

// con el mismo nombre gana el tuyo, ver REGLAS.md
function temasTodos() {
  const mios = misTemas();
  return [...mios, ...EJEMPLOS.filter(e => !mios.some(m => norm(m.nombre) === norm(e.nombre)))];
}

const temaLlamado = nombre => temasTodos().find(t => norm(t.nombre) === norm(nombre));

function irAlTema(nombre) {
  cargarTema(temaLlamado(nombre) || { nombre, txt: '' });
  src.focus();
}

// la tecla espera; irse a otro tema escribe ya
function guardar() {
  clearTimeout(relojGuardar);
  relojGuardar = setTimeout(guardarYa, 400);
}
// los 400 ms no pueden sobrevivir a cerrar la pestaña
addEventListener('pagehide', guardarYa);

// comprimido porque en claro son miles de caracteres; la «z» lo marca
const aBase64 = b => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
  const vistos = new Set([norm(nombre)]), lista = [], cola = [txt];
  while (cola.length)
    for (const n of traducir(cola.shift()).enlaces) {
      const t = !vistos.has(norm(n)) && temaLlamado(n);
      if (!t) continue;
      vistos.add(norm(n)); lista.push(t); cola.push(t.txt);
    }
  return lista;
}

// el abierto y, tras «;», los que nombra
async function armarHash() {
  const nombre = campoNombre.value.trim();
  const piezas = [[nombre, src.value], ...nombrados(nombre, src.value).map(t => [t.nombre, t.txt])];
  return (await Promise.all(piezas.map(([n, x]) => hashDe(n, x)))).join(';');
}

// el tuyo no se pisa
function guardarTraidos(traidos) {
  const mios = misTemas();
  for (const t of traidos || [])
    if (!mios.some(m => norm(m.nombre) === norm(t.nombre))) anotarTema(t.nombre, t.txt, null);
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
    for (let i = 0; i < 3 && /%25[0-9A-Fa-f]{2}/.test(carga) && !cortarNombre(carga); i++)
      carga = decodeURIComponent(carga);
    const corte = cortarNombre(carga);
    const nombre = corte ? decodeURIComponent(carga.slice(0, corte[0])) : '';
    const cuerpo = corte ? carga.slice(corte[0] + corte[1]) : carga;
    // el comprimido es base64url y nada más; el plano siempre trae algún «%»
    const comprimido = /^z[A-Za-z0-9_-]+$/.test(cuerpo);
    if (comprimido && !hayZip()) return null;
    // si inflar falla, era texto plano que empezaba con «z»
    if (comprimido)
      try { return { nombre, txt: alDia(await inflar(cuerpo.slice(1))) }; } catch (e) { /* texto plano */ }
    return { nombre, txt: alDia(decodeURIComponent(cuerpo)) };
  } catch (e) { return null; }     // enlace roto
}

function leerHash() {
  return location.hash.length < 2 ? null : abrirCarga(location.hash.slice(1));
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
    if (!tema || !/\btocan?\b/i.test(tema.txt)) return avisar(noSePudo());
    guardarTraidos(tema.traidos);
    cargarTema(tema);
  });
});

// termina en un renglón vacío: la hoja dice que ahí se puede seguir
const conRenglonFinal = txt => txt.replace(/\n*$/, '\n');

async function temaInicial() {
  const delEnlace = await leerHash();
  // se avisa en arranque.js: actualizar() pisa el cajón
  if (!delEnlace && location.hash.length > 1) return { txt: '', nombre: '', roto: true };
  if (delEnlace) {
    // el enlace se consume: si quedara en la barra, recargar abriría esa versión vieja encima de lo escrito
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ }
    guardarTraidos(delEnlace.traidos);
    return delEnlace;
  }
  const guardado = recordado(GUARDADO);
  return guardado
    ? { txt: guardado, nombre: recordado(GUARDADO_NOMBRE) || '' }
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
  guardarTraidos(tema.traidos);
  cargarTema(tema);
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
