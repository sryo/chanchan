// ------------------------------------------------------------ pasar archivos
// Un tema es texto, así que un archivo de tema es ese texto pelado: no lleva
// encabezado ni nada que parsear, y el nombre del tema es el nombre del archivo.
// Lo mismo que viaja en el enlace, pero como algo que se manda y se guarda.
const btnArchivo = document.getElementById('archivo');
const EXT = '.txt';

const nombreDeArchivo = f => f.name.replace(/\.[^.]*$/, '');
// «/» y «:» no entran en un nombre de archivo en ningún sistema
const comoArchivo = nombre => (nombre.trim() || 'sin título').replace(/[\/:\\?%*|"<>]/g, '-') + EXT;

// sin una línea con «toca» no hay tema; lo mismo que pide temaPegado()
const pareceUnTema = txt => /\btocan?\b/.test(txt);

// ------------------------------------------------------------------ el handle
// Guardar dos veces tiene que escribir el mismo archivo y no dejar una fila de
// copias numeradas, así que el handle del archivo elegido queda acá, por nombre
// de tema. No entra en localStorage —no es serializable—, así que dura lo que
// dura la pestaña: al recargar, el primer guardado vuelve a preguntar dónde.
const handles = new Map();

async function puedeEscribir(h) {
  if (!h.queryPermission) return true;
  const opciones = { mode: 'readwrite' };
  if (await h.queryPermission(opciones) === 'granted') return true;
  return await h.requestPermission(opciones) === 'granted';
}

// sin la API de archivos —Firefox, Safari— queda bajar una copia
function bajarCopia(nombre, txt) {
  const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function guardarArchivo() {
  const tema = campoNombre.value.trim();
  const archivo = comoArchivo(tema);
  const txt = src.value;
  let h = handles.get(tema);
  try {
    if (!h && window.showSaveFilePicker)
      h = await showSaveFilePicker({ suggestedName: archivo,
        types: [{ description: 'un tema', accept: { 'text/plain': [EXT] } }] });
    if (!h) { bajarCopia(archivo, txt); return decirEnElEnlace('archivo bajado'); }
    if (!await puedeEscribir(h)) return avisar('no me dejaron escribir ese archivo.');
    const chorro = await h.createWritable();
    await chorro.write(txt);
    await chorro.close();
    if (tema) handles.set(tema, h);
    decirEnElEnlace('archivo guardado');
  } catch (e) {
    // cancelar el diálogo no es un error: es no querer guardar
    if (e && e.name === 'AbortError') return;
    avisar('no se pudo guardar el archivo: ' + String((e && e.message) || e));
  }
}

btnArchivo.addEventListener('click', guardarArchivo);

// ------------------------------------------------------------------ abrirlos
async function abrirArchivos(entradas) {
  const leidos = [], sobran = [];
  for (const { nombre, archivo, handle } of entradas) {
    let txt;
    try { txt = await archivo.text(); } catch (e) { sobran.push(archivo.name); continue; }
    if (!pareceUnTema(txt)) { sobran.push(archivo.name); continue; }
    leidos.push({ nombre, txt, handle });
  }
  // El aviso va después de cargar y no en el momento de descartar: cargarTema()
  // termina en actualizar(), que rehace el cajón de errores de cero y se lo
  // llevaría puesto.
  const quejarse = () => {
    for (const n of sobran)
      avisar('«' + n + '» no parece un tema: no tiene ninguna línea con «toca».');
  };
  if (!leidos.length) return quejarse();
  // el primero que soltaron es el que queda abierto; los demás van a la lista
  for (const t of leidos.slice(1)) anotarTema(t.nombre, conRenglonFinal(t.txt), null);
  for (const t of leidos) if (t.handle && t.nombre) handles.set(t.nombre, t.handle);
  cargarTema(leidos[0]);
  quejarse();
  src.focus();
}

const deArchivo = (archivo, handle) => ({ nombre: nombreDeArchivo(archivo), archivo, handle });

async function elegirArchivo() {
  if (window.showOpenFilePicker) {
    let hs;
    try {
      hs = await showOpenFilePicker({ multiple: true,
        types: [{ description: 'temas', accept: { 'text/plain': [EXT] } }] });
    } catch (e) { return; }                       // lo cancelaron
    return abrirArchivos(await Promise.all(hs.map(async h => deArchivo(await h.getFile(), h))));
  }
  // el input escondido es el que anda en todos lados; se rehace en cada uso para
  // que elegir dos veces el mismo archivo vuelva a disparar el change
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = EXT + ',text/plain';
  input.multiple = true;
  input.addEventListener('change', () => abrirArchivos([...input.files].map(f => deArchivo(f, null))));
  input.click();
}

// ------------------------------------------------------------------- soltarlos
// Vale la página entera, no hay zona a la que apuntar. Un cartel tapando el tema
// para avisar que se puede soltar un tema es justamente lo que no hace falta.
let arrastres = 0;

const marcarSoltadero = si => document.body.classList.toggle('soltando', si);

addEventListener('dragenter', e => {
  if (![...e.dataTransfer.types].includes('Files')) return;
  arrastres++;
  marcarSoltadero(true);
});
// dragenter y dragleave llegan de a pares por cada hijo que se cruza, así que
// contarlos es lo único que distingue «salí de la página» de «pasé de un span al
// de al lado»
addEventListener('dragleave', () => { if (--arrastres <= 0) { arrastres = 0; marcarSoltadero(false); } });
addEventListener('dragover', e => {
  if (![...e.dataTransfer.types].includes('Files')) return;
  e.preventDefault();                             // sin esto el drop no llega
  e.dataTransfer.dropEffect = 'copy';
});

addEventListener('drop', async e => {
  const items = [...e.dataTransfer.items].filter(x => x.kind === 'file');
  if (!items.length) return;
  e.preventDefault();
  arrastres = 0;
  marcarSoltadero(false);
  // getAsFileSystemHandle() devuelve el handle del archivo que se soltó, así que
  // soltarlo, cambiarlo y guardarlo escribe encima del original: el ciclo
  // entero sin pasar nunca por un diálogo. Donde no está, queda el File pelado y
  // guardar pregunta dónde, que es lo de siempre.
  const entradas = await Promise.all(items.map(async x => {
    const handle = x.getAsFileSystemHandle ? await x.getAsFileSystemHandle().catch(() => null) : null;
    const archivo = handle && handle.getFile ? await handle.getFile() : x.getAsFile();
    return archivo && deArchivo(archivo, handle);
  }));
  abrirArchivos(entradas.filter(Boolean));
});
