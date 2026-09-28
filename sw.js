// ---------------------------------------------------------------- sin red
// el worker guarda lo que baja y lo sirve cuando la red no está. Ver REGLAS.md.
// Con red se va a la red, así una versión nueva llega en la carga siguiente
const CACHE = 'chanchan';
const CASCARA = ['./', 'index.html', 'estilo.css', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png',
  'js/texto.js',
  'js/cambios.js',
  'js/ejemplos.js',
  'js/vocabulario.js',
  'js/color.js',
  'js/renglon.js',
  'js/traductor.js',
  'js/editor.js',
  'js/teclado.js',
  'js/cinta.js',
  'js/reloj.js',
  'js/puntos.js',
  'js/guardado.js',
  'js/archivos.js',
  'js/deshacer.js',
  'js/oir.js',
  'js/ofertas.js',
  'js/menu.js',
  'js/seleccion.js',
  'js/sugeridor.js',
  'js/reglas.js',
  'js/secciones.js',
  'js/luz.js',
  'js/temas.js',
  'js/arranque.js',
  'https://unpkg.com/@strudel/web@1.3.0/dist/index.js',
  'https://fonts.googleapis.com/css2?family=Antonio:wght@600&display=swap'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CASCARA)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// una respuesta opaca ocupa en la cuota siete megas aunque pese nada: no se guarda.
// Una red que no contesta, como la de un portal cautivo, no tiene que colgar la carga
const PACIENCIA = 4000;
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const guardada = () => cache.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; });
    red.catch(() => {});
    try {
      const r = await Promise.race([red, new Promise(ok => setTimeout(ok, PACIENCIA, null))]);
      return r || (await guardada()) || red;
    } catch (err) {
      return (await guardada()) || Response.error();
    }
  }));
});
