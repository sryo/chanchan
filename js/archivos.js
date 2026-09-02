// ------------------------------------------------------------ pasar archivos
// un archivo de tema es el texto pelado, sin encabezado; el nombre del tema es el del archivo
const btnArchivo = document.getElementById('archivo');
const EXT = '.txt';

const nombreDeArchivo = f => f.name.replace(/\.[^.]*$/, '');
// lo que ningún sistema acepta en un nombre de archivo
const comoArchivo = nombre => (nombre.trim() || 'sin título').replace(/[\/:\\?%*|"<>]/g, '-') + EXT;

// ------------------------------------------------------------------ el handle
// guardar dos veces tiene que escribir el mismo archivo, así que el handle queda por
// nombre de tema; no es serializable, dura lo que dura la pestaña
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
  let h = handles.get(claveTema(tema));
  try {
    if (!h && window.showSaveFilePicker)
      h = await showSaveFilePicker({ suggestedName: archivo,
        types: [{ description: 'un tema', accept: { 'text/plain': [EXT] } }] });
    if (!h) { bajarCopia(archivo, txt); return decirEnElEnlace('archivo bajado'); }
    if (!await puedeEscribir(h)) return avisar('no me dejaron escribir ese archivo.');
    const chorro = await h.createWritable();
    await chorro.write(txt);
    await chorro.close();
    if (tema) handles.set(claveTema(tema), h);
    decirEnElEnlace('archivo guardado');
  } catch (e) {
    // cancelar el diálogo no es un error
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
  // después de cargar: cargarTema() termina en actualizar(), que rehace el cajón de errores
  const quejarse = () => {
    for (const n of sobran)
      avisar('«' + n + '» no parece un tema: no tiene ninguna parte ni ningún enlace a otro tema.');
  };
  if (!leidos.length) return quejarse();
  const traidos = leidos.map(t => recibido({ ...t, txt: conRenglonFinal(t.txt) }));
  for (const t of traidos.slice(1)) anotarTema(t.nombre, t.txt, null);
  for (const t of traidos) if (t.handle && t.nombre) handles.set(claveTema(t.nombre), t.handle);
  cargarTema(traidos[0]);
  quejarse();
  for (const t of traidos) if (t.aviso) avisar(t.aviso);
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
  // se rehace en cada uso: si no, elegir dos veces el mismo archivo no dispara el change
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = EXT + ',text/plain';
  input.multiple = true;
  input.addEventListener('change', () => abrirArchivos([...input.files].map(f => deArchivo(f, null))));
  input.click();
}

// ------------------------------------------------------------------- soltarlos
// vale la página entera: no hay zona a la que apuntar
let arrastres = 0;

const marcarSoltadero = si => document.body.classList.toggle('soltando', si);

addEventListener('dragenter', e => {
  if (![...e.dataTransfer.types].includes('Files')) return;
  arrastres++;
  marcarSoltadero(true);
});
// dragenter y dragleave llegan de a pares por cada hijo que se cruza: contarlos
// es lo que distingue salir de la página de pasar de un span al de al lado
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
  // getAsFileSystemHandle() trae el handle de lo que se soltó: cambiarlo y guardarlo
  // escribe encima del original sin diálogo
  const entradas = await Promise.all(items.map(async x => {
    const handle = x.getAsFileSystemHandle ? await x.getAsFileSystemHandle().catch(() => null) : null;
    const archivo = handle && handle.getFile ? await handle.getFile() : x.getAsFile();
    return archivo && deArchivo(archivo, handle);
  }));
  abrirArchivos(entradas.filter(Boolean));
});
