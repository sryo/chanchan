// --------------------------------------------------------------- el sugeridor
// Autocompletar y «sugerir siguiente» son la misma cosa con el prefijo vacío: cada
// ranura de la plantilla tiene vocabulario cerrado, así que lo que se ofrece no es
// una adivinanza sino toda la gramática legal en ese punto.

// Ordena por qué tan bien pega lo tipeado. La pasada por palabra suelta es la que
// hace que «corche» encuentre «en corcheas», que por prefijo de frase no pegaría.
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
  // el Levenshtein es la red de última hora: si algo empieza como lo tipeado, los
  // errores de dedo sólo agregan ruido («sinc» traía «si», «tin» y «siku»)
  const cual = pega.length ? pega : (soloPega ? [] : parecidas);
  return cual.sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
}

// En qué ranura de la plantilla cae el cursor, y qué pedazo de texto reemplazaría
// una sugerencia. No lo puede contestar el parser: traducirLinea compila líneas
// enteras, y hacerlo consciente del cursor obligaría a manejar entrada a medio
// escribir en cada una de sus ramas. Con ubicar el verbo y cortar por comas alcanza.
function ranuraEn(linea, col) {
  const ws = palabras(linea, 0);
  const trozo = (a, z) => ({ desde: a, hasta: z, prefijo: linea.slice(a, z).trim() });
  // la palabra suelta bajo el cursor, para las ranuras que van palabra por palabra
  const palabraEn = () => trozo(
    col - linea.slice(0, col).match(/[^\s,]*$/)[0].length,
    col + linea.slice(col).match(/^[^\s,]*/)[0].length);

  if (esTempo(linea)) {
    const m = linea.match(/(\d+(?:[.,]\d+)?)/);
    return { ranura: 'tempo', ...(m ? trozo(m.index, m.index + m[1].length) : palabraEn()) };
  }

  // «va estrofa estribillo»: los nombres se eligen de a uno, como los pasos, y no
  // de a línea entera. El tempo ya se fue arriba, así que acá «va» sólo puede ser
  // la forma —incluso a medio escribir, que es cuando hace falta la lista.
  if (/^\s*(?:(?:la banda|el tema|la cancion|la canción)\s+)?va(\s|$)/i.test(linea))
    return { ranura: 'forma', ...palabraEn() };

  const iVerbo = ws.findIndex(x => /^(toca|tocan)$/i.test(x.w));
  if (iVerbo < 0) return { ranura: 'linea', ...trozo(0, linea.length) };

  const finVerbo = ws[iVerbo].i + ws[iVerbo].w.length;
  if (col <= finVerbo) {
    // el nombre de la parte es un solo blanco: del artículo (si hay) al verbo
    const prim = ws[/^(el|la|los|las)$/i.test(ws[0].w) ? 1 : 0];
    const a = prim && prim.i < ws[iVerbo].i ? prim.i : ws[iVerbo].i;
    return { ranura: 'nombre', ...trozo(a, Math.max(a, ws[iVerbo].i - 1)) };
  }

  const cl = [];
  let pos = finVerbo;
  for (const t of linea.slice(finVerbo).split(',')) { cl.push({ txt: t, i: pos }); pos += t.length + 1; }
  const cual = cl.findIndex(c => col >= c.i && col <= c.i + c.txt.length);
  const c = cl[cual < 0 ? cl.length - 1 : cual];

  // el modo lo fija el primer paso reconocido, y decide qué es legal más adelante:
  // «en <caja de ritmo>» sólo vale con golpes, «en <instrumento>» sólo con notas
  const pw = palabras(cl[0].txt, cl[0].i);
  const modo = pw.some(x => SONIDOS[norm(x.w)]) ? 'sonido'
             : pw.some(x => NOTAS[norm(x.w)]) ? 'nota' : null;

  if (cual > 0) {
    // «cada cuatro vueltas al doble» se elige en dos tiempos, como en el ▾: si el
    // prefijo ya está escrito, lo que se está eligiendo es lo que va adentro. El
    // tramo arranca en el final del prefijo y no después del espacio, así que la
    // opción se puede pegar con su propio espacio adelante aunque no haya ninguno.
    const env = partirEnvoltura(c.txt, c.i);
    if (env && col > env.fin)
      return { ranura: 'clausula', modo, envuelve: true, ...trozo(env.fin, c.i + c.txt.length) };
    // las cláusulas se matchean enteras («al doble», «en un piano»), así que el
    // prefijo es toda la cláusula y no la última palabra
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

// al revés que ALIAS_MAQUINA: de banco a los apodos con que uno la escribe
const APODOS_MAQUINA = {};
for (const [apodo2, banco] of Object.entries(ALIAS_MAQUINA))
  (APODOS_MAQUINA[banco] = APODOS_MAQUINA[banco] || []).push(apodo2);

// «bajo con púa» es masculino y «flauta dulce» femenina: manda el sustantivo, que
// es la primera palabra, no la última.
const cabeza = n => n.split(' ')[0];
// los plurales en -es no dicen el género, y el parser se come el artículo igual;
// pero la lista de sugerencias es lo que enseña cómo se escribe el idioma
const GENERO = Object.assign(Object.create(null),
  { voz: 'la', voces: 'las', bronces: 'los', duendes: 'los', tambores: 'los' });
const articuloDe = n => {
  const c = cabeza(n);
  return GENERO[norm(c)] || (/(cion|sion|dad|tad)$/.test(norm(c)) ? 'la'
    : /as$/.test(c) ? 'las' : /os$/.test(c) ? 'los' : /a$/.test(c) ? 'la' : 'el');
};
const verboDe = n => ['los', 'las'].includes(articuloDe(n)) ? 'tocan' : 'toca';
const unDe = n => articuloDe(n).startsWith('la') ? 'en una ' : 'en un ';

// Mismas listas que el menú del ▾, pero para insertar en el cursor y no para
// reemplazar un token ya parseado: acá la opción lleva «pone», no «nuevo».
function seccionesEnCaret(r) {
  // dos pasadas: primero exigiendo que algo empiece de verdad como lo tipeado, y
  // sólo si no hay nada se acepta el Levenshtein. Si no, cada sección dispara su
  // propia red de errores de dedo y «do sost» termina ofreciendo «sol».
  const secs = armarSecciones(r, true);
  return secs.length ? secs : armarSecciones(r, false);
}

function armarSecciones(r, soloPega) {
  const op = (txt, pone, desc, receta) => ({ txt, desc, receta, pone: pone == null ? txt : pone });
  const filtrar = (ops, pref, clave) =>
    candidatos(pref === undefined ? r.prefijo : pref, ops, clave || (o => o.txt), soloPega);
  // el nombre de la parte es texto libre: «la bata» no está mal escrito, así que
  // acá el Levenshtein no corrige nada, sólo ofrece pisar la línea con otra cosa
  const filtrarPega = (ops, pref, clave) => candidatos(pref, ops, clave, true);
  const sec = (titulo, ops) => ops.length ? [{ titulo, ops }] : [];
  // «melodía», «bata» o «voz» no son instrumentos, pero son lo que uno escribe;
  // el nombre libre cae en el piano por defecto
  const DE_SIEMPRE = ['melodía', 'bata', 'bajo', 'piano', 'platillos', 'voz'];

  // los alias van aparte: comparten objeto con el instrumento al que apuntan, así
  // que por .nombre nunca aparecerían («guitarra» dice «viola»)
  const instrumentos = () => [...new Set(Object.values(INSTRUMENTOS))]
    .map(i => op(i.nombre, i.nombre, i.fam, recetaDe('instrumento', i.nombre)))
    .concat(Object.keys(ALIAS).map(a => op(a, a, ALIAS[a], recetaDe('instrumento', a))));

  if (r.ranura === 'linea') {
    // el prefijo es la línea entera, pero lo único que se elige acá es el nombre de
    // la parte. Matchear la plantilla completa haría que «la» pegue con «la arpa
    // toca» por el artículo, y que «la bata toc» pegue con «la gaita toca» por
    // Levenshtein — y aceptarlo pisaría la línea entera.
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
    // adentro de un «cada cuatro vueltas» sólo entran las que son código: las otras
    // dos de la tabla arman el patrón o sacan la línea del stack
    if (r.envuelve)
      return sec('y ahí, qué', filtrar(MODIFICADORES.filter(envolvible)
        .map(m => op(m[0], ' ' + m[0], m[2]))));
    const mods = MODIFICADORES.map(m => op(m[0], null, m[2]));
    // «en un viol» no empieza como «en una viola»: el artículo no coincide. Se
    // matchea contra el nombre pelado y se le saca la preposición a lo tipeado.
    // el artículo puede ser lo último tipeado («en un ») o venir pegado a una
    // palabra que empieza igual («en laúd»), así que se exige espacio o fin; y va
    // de más largo a más corto para que «una» no matchee como «un» + «a»
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
    // el prefijo solo, sin lo que va adentro: al aceptarlo la cláusula queda a
    // medio escribir y el sugeridor vuelve a abrirse con la otra mitad
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
  // sin grupo: aceptar una sugerencia es su propio paso de deshacer y no se funde
  // con la ráfaga de tecleo de alrededor
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
  // Aceptar una opción escribe el valor a mano, así que no dispara el «input» que
  // reabre esto. Y hay una que deja la cláusula a medio escribir a propósito:
  // «cada cuatro vueltas» sin nada adentro; volver a mirar es lo que la termina.
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
  if (r) r.l = l;                       // para que la vista previa suene con el instrumento de la línea
  const secs = r ? seccionesEnCaret(r) : [];
  const ops = secs.flatMap(x => x.ops);
  // No molestar: sólo aparece con una palabra ya empezada, y nunca si lo único
  // que hay para ofrecer es lo que ya está escrito. La excepción es la coma:
  // abrir una cláusula nueva es justo el momento en que no se sabe qué puede ir,
  // y ahí no hay nada tipeado que pueda estorbar.
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
  // Escape no corta la propagación a propósito: el listener de window también
  // cierra el menú del ▾, y cerrar uno ya cerrado no hace nada
  if (['Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) cerrarSugeridor();
});
src.addEventListener('input', () => abrirSugeridor(false));
src.addEventListener('blur', cerrarSugeridor);
addEventListener('mousedown', e => { if (!dentroDe(e.target, sugeridor)) cerrarSugeridor(); });

src.addEventListener('mousemove', e => {
  if (pidiendoCuadro) return;
  pidiendoCuadro = true;
  requestAnimationFrame(() => {
    pidiendoCuadro = false;
    if (arrastre) return;
    const bajo = tokenEn(e.clientX, e.clientY, true);
    const t = tieneMenu(bajo) ? bajo : null;
    const antes = señalado && señalado.l + ':' + señalado.i + ':' + señalado.m;
    const ahora = t && t.l + ':' + t.i + ':' + !!t.enManija;
    // el ns-resize de las notas pide Alt; el tempo se arrastra sin apretar nada
    src.style.cursor = !t ? ''
      : t.tipo === 'tempo' ? 'ew-resize'
      : e.altKey && arrastrable(t) ? 'ns-resize' : '';
    if (antes === ahora) return;
    señalado = t && { l: t.l, i: t.i, m: !!t.enManija };
    pintar(marcasActuales);
    ponerManija(señalado);
  });
});
src.addEventListener('mouseleave', e => {
  // irse hacia el propio ▾, o hacia el menú que abrió, no es irse
  if (tokenDelMenu || dentroDe(e.relatedTarget, manija, menu)) return;
  if (!señalado) return;
  señalado = null; pintar(marcasActuales); ponerManija(null);
});
// va en mousedown y no en click, para ganarle al textarea antes de que mueva el cursor
let arrastre = null;
const UMBRAL = 3;

// soltar Alt sin mover el mouse tiene que limpiar el cursor de resize
addEventListener('keyup', e => { if (e.key === 'Alt') src.style.cursor = ''; });

src.addEventListener('mousedown', e => {
  cerrarMenu();
  // El click del ▾ lo recibe el propio botón, que está por encima del textarea.
  // El tempo se arrastra sin apretar nada: es un número suelto y ahí no hay
  // texto que uno quiera seleccionar arrastrando —para eso queda el doble
  // click—. Las notas siguen pidiendo Alt, que es lo que las salva de pelearse
  // con la selección en medio de una línea llena de palabras.
  const t = editable(e.clientX, e.clientY);
  if (!t || !arrastrable(t) || (!e.altKey && t.tipo !== 'tempo')) return;
  e.preventDefault();
  const d = datosDe(t);
  arrastre = { t, x: e.clientX, y: e.clientY, movido: false, len: t.len,
               grupo: 'tira' + Date.now(),
               acorde: d.acorde || '',
               base: t.tipo === 'tempo' ? (parseFloat(textoDe(t).replace(',', '.')) || 90)
                 : semiDe(d) };
});

function moverArrastre(dx, dy) {
  const a = arrastre;
  let texto;
  if (a.t.tipo === 'tempo') {
    texto = String(Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(a.base + dx / 4))));
  } else {
    const semi = Math.min(SEMI_MAX, Math.max(SEMI_MIN, a.base + Math.round(-dy / 10)));
    texto = notaDesdeSemi(semi, a.acorde);
    a.semi = semi;
  }
  if (texto === a.ultimo) return;
  a.ultimo = texto;
  reemplazar({ ...a.t, len: a.len }, texto, a.grupo);   // el token cambia de largo al ganar «sostenido»
  a.len = texto.length;
  if (!sonando && a.t.tipo !== 'tempo')
    oir({ voces: [{ s: 'piano', note: nombreNota(a.semi, 0) }], dura: .3 });
}

addEventListener('mousemove', e => {
  if (!arrastre) return;
  const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
  if (!arrastre.movido && Math.hypot(dx, dy) < UMBRAL) return;
  if (!arrastrable(arrastre.t)) return;
  arrastre.movido = true;
  moverArrastre(dx, dy);
});

addEventListener('mouseup', () => { arrastre = null; });
// el botón de la selección abre el menú en su propio mousedown, y este listener
// corre después por burbujeo: sin exceptuarlo cierra lo que aquél acaba de abrir
addEventListener('mousedown', e => {
  if (!dentroDe(e.target, menu, src, botonSel, manija)) cerrarMenu();
});
addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });
src.addEventListener('input', cerrarMenu);

