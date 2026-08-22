// --------------------------------------------------------------- el sugeridor
// autocompletar y «sugerir siguiente» son lo mismo con el prefijo vacío: cada
// ranura tiene vocabulario cerrado

// {l, c} del cursor; pintar() deja ahí el ancla de la que cuelga el panel
let anclaCaret = null;

// la pasada por palabra suelta es la que hace que «corche» encuentre «en corcheas»
function candidatos(prefijo, lista, clave = x => x, soloPega) {
  const p = norm(prefijo || '');
  if (!p) return lista.slice();
  const pega = [], parecidas = [];
  for (const c of lista) {
    const n = norm(clave(c));
    if (n === p) pega.push([c, 0, n.length]);
    else if (n.startsWith(p)) pega.push([c, 1, n.length]);
    else if (n.split(' ').some(w => w.startsWith(p))) pega.push([c, 2, n.length]);
    else {
      const d = distancia(p, n);
      if (d <= Math.max(2, Math.floor(p.length / 3))) parecidas.push([c, d, n.length]);
    }
  }
  // el Levenshtein sólo si nada empieza como lo tipeado: si no «sinc» trae «siku»
  const cual = pega.length ? pega : (soloPega ? [] : parecidas);
  return cual.sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
}

// no lo contesta el parser: traducirLinea no sabe de líneas a medio escribir
function ranuraEn(linea, col) {
  const ws = palabras(linea, 0);
  const trozo = (a, z) => ({ desde: a, hasta: z, prefijo: linea.slice(a, z).trim() });
  const palabraEn = () => trozo(
    col - linea.slice(0, col).match(/[^\s,]*$/)[0].length,
    col + linea.slice(col).match(/^[^\s,]*/)[0].length);

  if (esTempo(linea)) {
    const m = linea.match(/(\d+(?:[.,]\d+)?)/);
    return { ranura: 'tempo', ...(m ? trozo(m.index, m.index + m[1].length) : palabraEn()) };
  }

  // el tempo ya salió arriba, así que «va» acá sólo puede ser la forma
  if (/^\s*(?:(?:la banda|el tema|la cancion|la canción)\s+)?va(\s|$)/i.test(linea))
    return { ranura: 'forma', ...palabraEn() };

  const iVerbo = ws.findIndex(x => /^(toca|tocan)$/i.test(x.w));
  if (iVerbo < 0) return { ranura: 'linea', ...trozo(0, linea.length) };

  const finVerbo = ws[iVerbo].i + ws[iVerbo].w.length;
  if (col <= finVerbo) {
    // del artículo, si hay, al verbo
    const prim = ws[/^(el|la|los|las)$/i.test(ws[0].w) ? 1 : 0];
    const a = prim && prim.i < ws[iVerbo].i ? prim.i : ws[iVerbo].i;
    return { ranura: 'nombre', ...trozo(a, Math.max(a, ws[iVerbo].i - 1)) };
  }

  const cl = [];
  let pos = finVerbo;
  for (const t of linea.slice(finVerbo).split(',')) { cl.push({ txt: t, i: pos }); pos += t.length + 1; }
  const cual = cl.findIndex(c => col >= c.i && col <= c.i + c.txt.length);
  const c = cl[cual < 0 ? cl.length - 1 : cual];

  // el modo lo fija el primer paso reconocido: «en <caja>» sólo vale con golpes,
  // «en <instrumento>» sólo con notas
  const pw = palabras(cl[0].txt, cl[0].i);
  const modo = pw.some(x => SONIDOS[norm(x.w)]) ? 'sonido'
             : pw.some(x => NOTAS[norm(x.w)]) ? 'nota' : null;

  if (cual > 0) {
    // con el prefijo ya escrito se elige lo de adentro. El tramo arranca en el fin
    // del prefijo y no tras el espacio: la opción trae su propio espacio adelante
    const env = partirEnvoltura(c.txt, c.i);
    if (env && col > env.fin)
      return { ranura: 'clausula', modo, envuelve: true, ...trozo(env.fin, c.i + c.txt.length) };
    // las cláusulas se matchean enteras: el prefijo es toda la cláusula
    const a = c.i + c.txt.length - c.txt.replace(/^\s+/, '').length;
    return { ranura: 'clausula', modo, ...trozo(a, c.i + c.txt.length) };
  }

  const previa = pw.filter(x => x.i + x.w.length < col).pop();
  const n = previa && norm(previa.w);
  const trasNota = !!n && !!(NOTAS[n] || ALTERACIONES[n] || ACORDE[n] || OCTAVAS[n] || n === 'muy');
  return { ranura: 'paso', modo, trasNota, ...palabraEn() };
}

const sugeridor = document.createElement('div');
sugeridor.id = 'sugerencias';
sugeridor.className = 'panel';
document.body.appendChild(sugeridor);

let sug = null;

const APODOS_MAQUINA = {};
for (const [apodo2, banco] of Object.entries(ALIAS_MAQUINA))
  (APODOS_MAQUINA[banco] = APODOS_MAQUINA[banco] || []).push(apodo2);

// manda el sustantivo, que es la primera palabra: «bajo con púa», «flauta dulce»
const cabeza = n => n.split(' ')[0];
// los plurales en -es no dicen el género
const GENERO = Object.assign(Object.create(null),
  { voz: 'la', voces: 'las', bronces: 'los', duendes: 'los', tambores: 'los' });
const articuloDe = n => {
  const c = cabeza(n);
  return GENERO[norm(c)] || (/(cion|sion|dad|tad)$/.test(norm(c)) ? 'la'
    : /as$/.test(c) ? 'las' : /os$/.test(c) ? 'los' : /a$/.test(c) ? 'la' : 'el');
};
const verboDe = n => ['los', 'las'].includes(articuloDe(n)) ? 'tocan' : 'toca';
const unDe = n => articuloDe(n).startsWith('la') ? 'en una ' : 'en un ';

// como el menú del ▾, pero la opción lleva «pone», no «nuevo»
function seccionesEnCaret(r) {
  // el Levenshtein recién si ninguna sección pega: si no «do sost» ofrece «sol»
  const secs = armarSecciones(r, true);
  return secs.length ? secs : armarSecciones(r, false);
}

function armarSecciones(r, soloPega) {
  const op = (txt, pone, desc, receta) => ({ txt, desc, receta, pone: pone == null ? txt : pone });
  const filtrar = (ops, pref, clave) =>
    candidatos(pref === undefined ? r.prefijo : pref, ops, clave || (o => o.txt), soloPega);
  // el nombre de la parte es texto libre: «la bata» no está mal escrito
  const filtrarPega = (ops, pref, clave) => candidatos(pref, ops, clave, true);
  const sec = (titulo, ops) => ops.length ? [{ titulo, ops }] : [];
  // no son instrumentos, son lo que uno escribe
  const DE_SIEMPRE = ['melodía', 'bata', 'bajo', 'piano', 'platillos', 'voz'];

  // los alias comparten objeto con su instrumento: por .nombre «guitarra» dice «viola»
  const instrumentos = () => [...new Set(Object.values(INSTRUMENTOS))]
    .map(i => op(i.nombre, i.nombre, i.fam, recetaDe('instrumento', i.nombre)))
    .concat(Object.keys(ALIAS).map(a => op(a, a, ALIAS[a], recetaDe('instrumento', a))));

  if (r.ranura === 'linea') {
    // se matchea sólo el nombre de la parte: contra la plantilla entera «la» pega
    // con «la arpa toca» por el artículo
    const ws = norm(r.prefijo).split(/\s+/).filter(Boolean);
    if (/^(el|la|los|las)$/.test(ws[0] || '')) ws.shift();
    if (ws.length > 1 && 'tocan'.startsWith(ws[ws.length - 1])) ws.pop();
    const pelado = ws.join(' ');
    const plantilla = n => ({ ...op(articuloDe(n) + ' ' + n + ' ' + verboDe(n), null, 'una parte nueva'),
                              buscar: n });
    // sin prefijo van sólo los arranques de siempre: ver REGLAS.md
    const partes = [...new Set(pelado
      ? [...DE_SIEMPRE, ...Object.values(INSTRUMENTOS).map(i => i.nombre)] : DE_SIEMPRE)];
    const tempo = { ...op('va a 92', null, 'el pulso del tema'),
                    buscar: 'va a 92 banda tema tiempos por minuto' };
    const seccion = { ...op('la estrofa:', null, 'abre una sección: lo que sigue es de ella'),
                      buscar: 'seccion estrofa estribillo intro puente final bloque parte' };
    const forma = { ...op('el tema va estrofa estribillo', null, 'el orden en que van las secciones'),
                    buscar: 'forma orden va secciones estructura' };
    return sec('empezar una línea',
               filtrarPega([...partes.map(plantilla), tempo, seccion, forma], pelado, o => o.buscar));
  }

  if (r.ranura === 'forma')
    return sec('secciones', filtrar([...seccionesEscritas().values()].map(n => op(n))));

  if (r.ranura === 'nombre')
    return [...sec('partes de siempre', filtrarPega(DE_SIEMPRE.map(n => op(n)), r.prefijo, o => o.txt)),
            ...sec('o un instrumento', filtrarPega(instrumentos(), r.prefijo, o => o.txt))];

  if (r.ranura === 'paso') {
    const secs = [];
    const sufijos = [
      ...Object.keys(ALTERACIONES).map(w => op(w, w, 'medio tono', recetaDe('alteracion', w, vozDeLinea(r.l)))),
      ...Object.keys(OCTAVAS).map(w => op(w, w, 'otra altura', recetaDe('octava', w, vozDeLinea(r.l)))),
      ...Object.keys(ACORDES).map(w => op(w, w, 'notas juntas', recetaDe('acorde', w, vozDeLinea(r.l)))),
    ];
    if (r.modo !== 'sonido' && r.trasNota) secs.push(...sec('seguir la nota', filtrar(sufijos)));
    if (r.modo !== 'nota') secs.push(...sec('golpes', filtrar(Object.entries(SONIDOS)
      .map(([w, [, d]]) => op(w, w, d, recetaDe('golpe', w))))));
    if (r.modo !== 'sonido') secs.push(...sec('notas', filtrar(Object.keys(NOTAS)
      .map(w => op(w, w, null, recetaDe('nota', w, vozDeLinea(r.l)))))));
    secs.push(...sec('o', filtrar([op('-', null, 'este paso no suena'),
                                   op('_', null, 'sigue sonando la anterior')])));
    return secs;
  }

  if (r.ranura === 'clausula') {
    // las no envolvibles arman el patrón o sacan la línea del stack: no son código
    if (r.envuelve)
      return sec('y ahí, qué', filtrar(MODIFICADORES.filter(envolvible)
        .map(m => op(m[0], ' ' + m[0], m[2]))));
    const mods = MODIFICADORES.map(m => op(m[0], null, m[2]));
    // «en un viol» no empieza como «en una viola»: se matchea contra el nombre
    // pelado. El artículo exige espacio o fin («en laúd»), y «una» antes que «un»
    const m = norm(r.prefijo).match(/^en\s*(?:(?:una|un|los|las|el|la)(?:\s+|$))?\s*(.*)$/);
    const pelado = m ? m[1] : r.prefijo;
    const conEn = r.modo === 'sonido'
      ? [...new Map(Object.values(maquinas()).map(m2 => [m2.banco, m2])).values()]
          .map(m2 => ({ ...op('en una ' + m2.nombre, null, m2.marca, recetaDe('maquina', m2.banco)),
                        // «808» tiene que encontrar la «roland tr808»
                        buscar: m2.nombre + ' ' + (APODOS_MAQUINA[m2.banco] || []).join(' ') }))
      : instrumentos().map(o => ({ ...op(unDe(o.txt) + o.txt, null, o.desc, o.receta), buscar: o.txt }));
    const arreglos = ARREGLOS.map(([n, q]) => op(fraseArreglo(n, q), null, (n + q) + ' vueltas'));
    const euclides = EUCLIDES.map(([n, m]) =>
      op(fraseEuclides(n, m), null, n + ' golpes en ' + m + ' pasos'));
    // sólo el prefijo: al aceptarlo el sugeridor vuelve a abrirse con la otra mitad
    const envolturas = ENVOLTURAS.map(p => op(p, p + ' ', 'y después, qué hace'));
    return [...sec('cómo', filtrar(mods)),
            ...sec('el reparto', filtrar(euclides)),
            ...sec('de a ratos', filtrar(envolturas)),
            ...sec('entra y sale', filtrar(arreglos)),
            ...sec(r.modo === 'sonido' ? 'en qué caja' : 'en qué instrumento',
                   filtrar(conEn, pelado, o => o.buscar))];
  }
  return [];
}

function reemplazarRango(desde, hasta, txt) {
  const l = src.value.slice(0, desde).split('\n').length - 1;
  const i = desde - (src.value.lastIndexOf('\n', desde - 1) + 1);
  src.value = src.value.slice(0, desde) + txt + src.value.slice(hasta);
  src.selectionStart = src.selectionEnd = desde + txt.length;
  src.focus();
  // sin grupo: aceptar es su propio paso de deshacer
  registrar(src.value, { l, i, len: txt.length });
  actualizar(true);
  mostrarDeshacer({ l, i, len: txt.length }, false);
}

function aceptarSugerencia(o) {
  if (!sug || !o) return;
  const { desde, hasta } = sug;
  let txt = o.pone;
  const finLinea = hasta >= src.value.length || src.value[hasta] === '\n';
  if (finLinea && !/\s$/.test(txt)) txt += ' ';
  cerrarSugeridor();
  reemplazarRango(desde, hasta, txt);
  // asignar .value no dispara «input»; y una envoltura sola pide la otra mitad
  abrirSugeridor(false);
}

function marcarElegido() {
  const ops = sugeridor.querySelectorAll('.op');
  ops.forEach((el, k) => el.classList.toggle('elegido', k === sug.elegido));
  if (ops[sug.elegido]) ops[sug.elegido].scrollIntoView({ block: 'nearest' });
}

function cerrarSugeridor() {
  if (!sug) return;
  sug = null;
  anclaCaret = null;
  sugeridor.classList.remove('abierto');
  pintar(marcasActuales);
}

function abrirSugeridor(aPedido) {
  if (src.selectionStart !== src.selectionEnd) return cerrarSugeridor();
  const pos = src.selectionStart;
  const l = src.value.slice(0, pos).split('\n').length - 1;
  const base = src.value.lastIndexOf('\n', pos - 1) + 1;
  const linea = src.value.split('\n')[l];
  const r = ranuraEn(linea, pos - base);
  if (r) r.l = l;                       // la vista previa suena con el instrumento de la línea
  const secs = r ? seccionesEnCaret(r) : [];
  const ops = secs.flatMap(x => x.ops);
  // sólo con una palabra empezada y algo nuevo que ofrecer; la coma es la
  // excepción: recién abierta una cláusula es cuando no se sabe qué puede ir
  const reciénAbierta = r.ranura === 'clausula' && !r.prefijo;
  if (!ops.length ||
      (!aPedido && !reciénAbierta &&
       (r.prefijo.length < 2 || (ops.length === 1 && norm(ops[0].txt) === norm(r.prefijo)))))
    return cerrarSugeridor();
  ops.forEach(o => { o.hacer = () => aceptarSugerencia(o); });
  sug = { desde: base + r.desde, hasta: base + r.hasta, ops, elegido: 0 };
  pintarPanel(sugeridor, secs, null, [{ l }]);
  sugeridor.classList.add('abierto');
  anclaCaret = { l, c: r.desde };
  pintar(marcasActuales);
  const sp = hl.querySelector('#ancla');
  if (!sp) return cerrarSugeridor();
  acomodar(sugeridor, sp.getBoundingClientRect());
  marcarElegido();
}

src.addEventListener('keydown', e => {
  if (e.key === 'Tab' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    return sug ? aceptarSugerencia(sug.ops[sug.elegido]) : abrirSugeridor(true);
  }
  if (!sug) return;
  if (e.key === 'Enter') { e.preventDefault(); return aceptarSugerencia(sug.ops[sug.elegido]); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    sug.elegido = (sug.elegido + (e.key === 'ArrowDown' ? 1 : -1) + sug.ops.length) % sug.ops.length;
    return marcarElegido();
  }
  // Escape no corta la propagación: el listener de window cierra también el ▾
  if (['Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) cerrarSugeridor();
});
src.addEventListener('input', () => abrirSugeridor(false));
src.addEventListener('blur', cerrarSugeridor);
addEventListener('mousedown', e => { if (!dentroDe(e.target, sugeridor)) cerrarSugeridor(); });
