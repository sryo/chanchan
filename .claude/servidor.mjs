// servidor estático para no depender de file://; la página anda abriendo index.html a mano
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
};

createServer(async (pedido, respuesta) => {
  const ruta = decodeURIComponent((pedido.url || '/').split('?')[0]);
  // normalize come los «..», así que no se puede salir de la carpeta del proyecto
  const archivo = join(RAIZ, normalize(ruta === '/' ? '/index.html' : ruta));
  if (!archivo.startsWith(RAIZ)) { respuesta.writeHead(403); return respuesta.end('no'); }
  try {
    const cuerpo = await readFile(archivo);
    respuesta.writeHead(200, {
      'content-type': TIPOS[extname(archivo)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    respuesta.end(cuerpo);
  } catch (e) { respuesta.writeHead(404); respuesta.end('no está'); }
}).listen(8137, '127.0.0.1', () => console.log('http://127.0.0.1:8137'));
