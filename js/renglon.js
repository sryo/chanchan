// ---------------------------------------------------------------- el renglón
// el esqueleto de un renglón, aunque esté a medio escribir: qué clase es y dónde
// está cada pedazo. Nunca falla; validar y traducir es del traductor. Ver REGLAS.md
const ARTICULO = /^(el|la|los|las)$/i;
const pedazo = (texto, desde, hasta) => ({ desde, hasta, texto: texto.slice(desde, hasta) });

const SUJETOS_BANDA = ['la banda', 'el tema', 'la cancion'];
const SUJETO_BANDA = new RegExp('^(?:' + SUJETOS_BANDA.map(s => s + ' ').join('|') + ')?');
// una línea con el verbo es una parte, sea lo que sea el resto
const VERBO = /^(toca|tocan)$/i, CON_VERBO = /\b(toca|tocan)\b/i;

// «nombre» es el normalizado, para comparar; «escrito» como se tecleó, para mostrar.
// crudas y cuerpo van palabra a palabra porque norm() no parte ni junta palabras
function leerSeccion(texto) {
  if (CON_VERBO.test(texto)) return null;
  const m = texto.match(/^\s*(.*?)\s*:\s*$/);
  if (!m) return null;
  const cuerpo = norm(m[1]).replace(SUJETO_BANDA, '').replace(/^(?:el|la|los|las) /, '');
  if (!cuerpo) return { falla: 'sinNombre' };
  const crudas = m[1].split(/\s+/).filter(Boolean);
  const suyas = crudas.slice(-cuerpo.split(' ').length);
  const dura = cuerpo.match(/^(\S+)\s+dura\s+(\S+)\s+vueltas?$/);
  const nombre = dura ? dura[1] : cuerpo;
  if (!/^[a-z0-9]+$/.test(nombre)) return { falla: 'nombre', escrito: suyas.join(' ') };
  const escrito = suyas[0];
  if (!dura) return { nombre, escrito, vueltas: null };
  const v = cuantasVueltas(dura[2]);
  if (!(v >= 1 && v <= VUELTAS_FORMA)) return { falla: 'dura' };
  return { nombre, escrito, vueltas: v };
}

// «va a» es tempo sólo con número: una sección se puede llamar «a»
function leerForma(texto) {
  if (CON_VERBO.test(texto)) return null;
  const m = norm(texto).replace(SUJETO_BANDA, '').match(/^va\s+(.+)$/);
  if (!m || /^a(\s+\d|$)/.test(m[1])) return null;
  return { nombres: m[1].split(/[\s,]+/).filter(Boolean) };
}

// tempo es «va a»: «el tema va» a medio escribir no lo es
function esTempo(texto) {
  if (CON_VERBO.test(texto) || leerForma(texto)) return false;
  return /\bva a\b/.test(norm(texto));
}

function leerRenglon(texto) {
  const ws = palabras(texto, 0);
  if (!texto.trim()) return { clase: 'vacia', palabras: ws };

  // * un apunte, que puede llevar «@la base»; va primero: «* la estrofa:» no es una sección
  if (texto.trimStart().startsWith('*')) {
    const ast = texto.indexOf('*'), arroba = texto.indexOf('@', ast);
    const nombre = arroba < 0 ? '' : texto.slice(arroba + 1).replace(/[.,;:!?\s]+$/, '').trim();
    const desde = nombre ? texto.indexOf(nombre, arroba + 1) : -1;
    return { clase: 'apunte', palabras: ws, ast, arroba, nombre: nombre ? pedazo(texto, desde, desde + nombre.length) : null };
  }

  const sec = leerSeccion(texto);
  if (sec) return { clase: 'seccion', palabras: ws, ...sec };

  // @la base: un signo y no una palabra, ver REGLAS.md
  const arroba = texto.indexOf('@');
  if (arroba >= 0 && !texto.slice(0, arroba).trim()) {
    const nombre = texto.slice(arroba + 1).trim();
    const desde = nombre ? texto.indexOf(nombre, arroba + 1) : arroba + 1;
    return { clase: 'enlace', palabras: ws, arroba, nombre: pedazo(texto, desde, desde + nombre.length) };
  }

  const forma = leerForma(texto);
  if (forma) return { clase: 'forma', palabras: ws, nombres: forma.nombres };

  if (esTempo(texto)) {
    const m = texto.match(/(\d+(?:[.,]\d+)?)/);
    const numero = m ? pedazo(texto, m.index, m.index + m[1].length) : null;
    return { clase: 'tempo', palabras: ws, numero, cola: numero ? pedazo(texto, numero.hasta, texto.length) : null };
  }

  // la <parte> toca <pasos>[, <cláusula>]*
  const iVerbo = ws.findIndex(x => VERBO.test(x.w));
  if (iVerbo < 0) return { clase: 'suelta', palabras: ws };
  const iNombre = ARTICULO.test(ws[0].w) ? 1 : 0;
  const sujeto = iNombre < iVerbo ? pedazo(texto, ws[iNombre].i, ws[iVerbo - 1].i + ws[iVerbo - 1].w.length) : null;
  const verbo = pedazo(texto, ws[iVerbo].i, ws[iVerbo].i + ws[iVerbo].w.length);
  const clausulas = [];
  let pos = verbo.hasta;
  for (const trozo of texto.slice(verbo.hasta).split(',')) {
    clausulas.push({ desde: pos, hasta: pos + trozo.length, texto: trozo, palabras: palabras(trozo, pos) });
    pos += trozo.length + 1;
  }
  // el modo lo fija el primer paso reconocido: golpes o notas
  const primero = clausulas[0].palabras.map(x => norm(x.w).replace(/!$/, '')).find(w => SONIDOS[w] || NOTAS[w]);
  const modo = !primero ? null : SONIDOS[primero] ? 'sonido' : 'nota';
  return { clase: 'parte', palabras: ws, articulo: ws.slice(0, iNombre), sujeto, verbo, clausulas, modo,
           nombre: ws.slice(iNombre, iVerbo).map(x => x.w).join(' ') || 'parte' };
}
