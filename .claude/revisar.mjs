// Con un solo ámbito compartido, dos declaraciones con el mismo nombre en
// archivos distintos tiran la página entera («Identifier X has already been
// declared») y el navegador no dice cuál es el otro. Esto lo dice.
//   node .claude/revisar.mjs
import { readFileSync } from 'node:fs';

const ORDEN = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  .matchAll(/<script src="(js\/[^"]+)"/g);
const DECLARA = /^(?:const|let|var|function|class)\s+([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)/gm;

const donde = new Map();
let choques = 0;
for (const [, archivo] of ORDEN) {
  const fuente = readFileSync(new URL('../' + archivo, import.meta.url), 'utf8');
  for (const [, nombre] of fuente.matchAll(DECLARA)) {
    if (donde.has(nombre)) {
      console.error('repetido: %s — %s y %s', nombre, donde.get(nombre), archivo);
      choques++;
    } else donde.set(nombre, archivo);
  }
}
console.log('%d nombres de primer nivel, %d repetidos', donde.size, choques);
process.exit(choques ? 1 : 0);
