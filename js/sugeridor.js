// --------------------------------------------------------------- el sugeridor
// autocompletar y «sugerir siguiente» son lo mismo con el prefijo vacío: cada
// ranura tiene vocabulario cerrado

// la pasada por palabra suelta es la que hace que «corche» encuentre «en corcheas»
function candidatos(prefijo, lista, clave, soloPega) {
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
  // el Levenshtein sólo si nada empieza como lo tipeado
  const cual = pega.length ? pega : (soloPega ? [] : parecidas);
  return cual.sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
}

// en qué pedazo del renglón cae el cursor, y qué puede ir ahí; el esqueleto lo da leerRenglon()
function ranuraEn(linea, col) {
  const r = leerRenglon(linea);
  const trozo = (a, z) => ({ desde: a, hasta: z, prefijo: linea.slice(a, z).trim() });
  const palabraEn = () => trozo(
    col - linea.slice(0, col).match(/[^\s,]*$/)[0].length,
    col + linea.slice(col).match(/^[^\s,]*/)[0].length);

  if (r.clase === 'apunte')
    return r.arroba >= 0 && col > r.arroba
      ? { ranura: 'enlace', ...trozo(r.arroba + 1, linea.length - linea.match(/[.,;:!?\s]*$/)[0].length) }
      : null;
  if (r.clase === 'enlace') return { ranura: 'enlace', ...trozo(r.arroba + 1, linea.length) };
  if (r.clase === 'tempo') return null;
  if (r.clase === 'forma') return { ranura: 'forma', ...palabraEn() };
  // el renglón vacío se ofrece solo, como la coma: recién abierto no se sabe qué puede ir
  if (r.clase !== 'parte') return { ranura: 'linea', arranque: r.clase === 'vacia', ...trozo(0, linea.length) };

  const { verbo, clausulas, modo } = r;
  // pegado al verbo ya escrito y sin pasos, lo que sigue es el primero, con su espacio adelante
  if (col === verbo.hasta && !clausulas[0].palabras.length)
    return { ranura: 'paso', arranque: true, pega: ' ', modo: modoDelNombre(r.nombre), nota: null, ...trozo(col, col) };
  if (col < verbo.hasta) {
    // del nombre, si hay, al verbo
    const a = r.sujeto ? r.sujeto.desde : verbo.desde;
    return { ranura: 'nombre', ...trozo(a, r.sujeto ? r.sujeto.hasta : a) };
  }

  const cual = clausulas.findIndex(c => col >= c.desde && col <= c.hasta);
  const c = clausulas[cual];
  if (cual > 0) {
    // con el prefijo ya escrito se elige lo de adentro. El tramo arranca en el fin
    // del prefijo y no tras el espacio: la opción trae su propio espacio adelante
    const env = partirEnvoltura(c.texto, c.desde);
    if (env && col > env.fin)
      return { ranura: 'clausula', modo, envuelve: true, ...trozo(env.fin, c.hasta) };
    // las cláusulas se matchean enteras: el prefijo es toda la cláusula; pegada a la coma, la opción trae el espacio
    return { ranura: 'clausula', modo, pega: /^\s/.test(c.texto) ? '' : ' ',
             ...trozo(c.hasta - c.texto.replace(/^\s+/, '').length, c.hasta) };
  }

  const pw = clausulas[0].palabras;
  const previa = pw.filter(x => x.i + x.w.length < col).pop();
  // la nota que termina justo antes del cursor, con lo que ya tiene: el traductor lo sabe
  const nota = previa && traducirLinea(linea, 1).tk.find(t => t.tipo === 'nota' && t.i + t.len === previa.i + previa.w.length) || null;
  // sin ningún paso escrito, el nombre dice el modo; después de un paso y un espacio
  // tampoco se sabe qué sigue: se ofrece solo, como tras el verbo
  const palabra = palabraEn();
  return { ranura: 'paso', modo: modo || modoDelNombre(r.nombre), nota, arranque: !palabra.prefijo, ...palabra };
}

const sugeridor = document.createElement('div');
sugeridor.id = 'sugerencias';
sugeridor.className = 'panel';
sugeridor.popover = 'auto';
document.body.appendChild(sugeridor);

let sug = null;

// una sugerencia no sobrevive a un cambio que no es suyo: sus opciones ya no valen.
// El tecleo la vuelve a abrir por «input», y aceptar la reabre después
alCambiar.push(() => { if (sug) cerrarSugeridor(); });

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

// lo que la hoja ya tiene, para ofrecer lo que le falta en el renglón l: el tempo
// de arriba, las secciones con su grafía, si hay forma, y las partes que las otras
// secciones tienen y la de acá no
function loQueHayEnLaHoja(l) {
  const lineas = src.value.split('\n');
  const r = traducir(src.value);
  const tk = n => r.marcas[n] || [];
  let primeraSeccion = -1, abierta = null;
  lineas.forEach((x, n) => {
    const s = tk(n).find(t => t.tipo === 'seccion');
    if (!s) return;
    if (primeraSeccion < 0) primeraSeccion = n;
    if (n < l) abierta = s.nombre;
  });
  const escritoDe = nombre => (r.secciones.find(s => s.nombre === nombre) || {}).escrito;
  const tempo = lineas.some((x, n) => (primeraSeccion < 0 || n < primeraSeccion) && tk(n).some(t => t.tipo === 'tempo'));
  const forma = r.marcas.flat().some(t => t.tipo === 'forma');
  // la parte como está escrita, del artículo al verbo
  const encabezado = x => {
    const verbo = tk(x.nro - 1).find(t => t.cls === 'verbo');
    return lineas[x.nro - 1].slice(0, verbo.i + verbo.len).trim();
  };
  const acá = new Set(r.renglones.filter(x => !x.seccion || x.seccion === abierta).map(x => norm(x.nombre)));
  const faltan = [], vistas = new Set();
  if (abierta) for (const x of r.renglones) {
    const clave = norm(x.nombre);
    if (!x.seccion || acá.has(clave) || vistas.has(clave)) continue;
    vistas.add(clave);
    faltan.push({ txt: encabezado(x), seccion: escritoDe(x.seccion) });
  }
  return { tempo, forma, abierta, secciones: r.secciones.map(s => s.escrito), faltan };
}

// un nombre de sección que la hoja todavía no usa
const SECCIONES_DE_SIEMPRE = ['estrofa', 'estribillo', 'puente', 'final', 'entrada'];
const seccionLibre = usadas => SECCIONES_DE_SIEMPRE.find(s => !usadas.some(u => norm(u) === s)) || 'estrofa';

// como el menú del ▾, pero la opción lleva «pone», no «nuevo»
function seccionesEnCaret(r) {
  // el Levenshtein recién si ninguna sección pega
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

  const comoOps = ofertas => ofertas.map(o => op(o.txt, null, o.desc, o.receta));
  const instrumentos = () => comoOps([...ofrecerInstrumentos(), ...ofrecerAlias()]);

  if (r.ranura === 'linea') {
    // se matchea sólo el nombre de la parte, sin el artículo
    const ws = norm(r.prefijo).split(/\s+/).filter(Boolean);
    if (ARTICULO.test(ws[0] || '')) ws.shift();
    if (ws.length > 1 && 'tocan'.startsWith(ws[ws.length - 1])) ws.pop();
    const pelado = ws.join(' ');
    const plantilla = n => ({ ...op(articuloDe(n) + ' ' + n + ' ' + verboDe(n), null, 'una parte nueva'),
                              buscar: n });
    // sin prefijo van sólo los arranques de siempre: ver REGLAS.md
    const partes = [...new Set(pelado
      ? [...DE_SIEMPRE, ...Object.values(INSTRUMENTOS).map(i => i.nombre)] : DE_SIEMPRE)];
    const hoja = loQueHayEnLaHoja(r.l);
    const tempo = { ...op('va a 92', null, 'el pulso del tema'),
                    buscar: 'va a 92 banda tema tiempos por minuto' };
    const compas = { ...op('va a 120 en tres', null, 'el pulso, en compás de tres'),
                     buscar: 'va a compas tres seis vals' };
    const libre = seccionLibre(hoja.secciones);
    const seccion = { ...op(articuloDe(libre) + ' ' + libre + ':', null, 'abre una sección: lo que sigue es de ella'),
                      buscar: 'seccion estrofa estribillo intro puente final bloque parte' };
    const forma = { ...op('el tema va ' + (hoja.secciones.length ? hoja.secciones.join(' ') : 'estrofa estribillo'),
                          null, 'el orden en que van las secciones'),
                    buscar: 'forma orden va secciones estructura' };
    // lo que la hoja pide va primero: el tempo si no está, y la forma si hay secciones y no está.
    // Lo que ya está escrito, al final
    const primero = [], despues = [];
    if (!hoja.tempo && !hoja.abierta) primero.push(tempo);
    const yaOfrecida = n => hoja.faltan.some(f => norm(f.txt) === norm(plantilla(n).txt));
    despues.push(...partes.filter(n => !yaOfrecida(n)).map(plantilla), seccion);
    (hoja.secciones.length && !hoja.forma ? primero : despues).push(forma);
    if (hoja.tempo || hoja.abierta) despues.push(tempo);
    despues.push(compas);
    return [
      ...sec('en las otras secciones', filtrarPega(hoja.faltan.map(f =>
        ({ ...op(f.txt, null, 'como en ' + f.seccion), buscar: f.txt })), pelado, o => o.buscar)),
      ...sec('empezar una línea', filtrarPega([...primero, ...despues], pelado, o => o.buscar)),
    ];
  }

  if (r.ranura === 'enlace')
    return sec('tus temas', filtrar(temasTodos().map(m2 => op(m2.nombre))));

  if (r.ranura === 'forma')
    return sec('secciones', filtrar([...seccionesEscritas().values()].map(n => op(n))));

  if (r.ranura === 'nombre')
    return [...sec('partes de siempre', filtrarPega(DE_SIEMPRE.map(n => op(n)), r.prefijo, o => o.txt)),
            ...sec('o un instrumento', filtrarPega(instrumentos(), r.prefijo, o => o.txt))];

  if (r.ranura === 'paso') {
    const secs = [];
    const voz = vozDeLinea(r.l);
    // lo que a la nota le falta, en su orden: alteración, altura, acorde
    if (r.modo !== 'sonido' && r.nota) {
      const n = r.nota, sufijos = comoOps([
        ...(!n.altN && !n.octN && !n.acorde ? ofrecerAlteraciones(voz) : []),
        ...(!n.octN && !n.acorde ? ofrecerOctavas(voz) : []),
        ...(!n.acorde ? ofrecerAcordes(voz) : []),
      ]);
      if (sufijos.length) secs.push(...sec('seguir la nota', filtrar(sufijos)));
    }
    if (r.modo !== 'nota') secs.push(...sec('golpes', filtrar(comoOps(ofrecerGolpes()))));
    if (r.modo !== 'sonido') secs.push(...sec('notas', filtrar(comoOps(ofrecerNotas(voz)))));
    secs.push(...sec('o', filtrar(comoOps(ofrecerSilencios()))));
    return secs;
  }

  if (r.ranura === 'clausula') {
    // las no envolvibles arman el patrón o sacan la línea del stack: no son código
    if (r.envuelve)
      return sec('y ahí, qué', filtrar(ofrecerEnvolvibles().map(o => op(o.txt, ' ' + o.txt, o.desc))));
    const mods = comoOps(ofrecerModificadores());
    const figuras = comoOps(ofrecerFiguras());
    // se matchea contra el nombre pelado: el artículo exige espacio o fin, y «una» antes que «un»
    const m = norm(r.prefijo).match(/^en\s*(?:(?:una|un|los|las|el|la)(?:\s+|$))?\s*(.*)$/);
    const pelado = m ? m[1] : r.prefijo;
    const conEn = r.modo === 'sonido'
      ? ofrecerMaquinas().map(m2 => ({ ...op('en una ' + m2.txt, null, m2.desc, m2.receta),
                                       buscar: m2.txt + ' ' + (APODOS_MAQUINA[m2.banco] || []).join(' ') }))
      : instrumentos().map(o => ({ ...op(unDe(o.txt) + o.txt, null, o.desc, o.receta), buscar: o.txt }));
    const arreglos = comoOps(ofrecerArreglos());
    const euclides = comoOps(ofrecerEuclides());
    // sólo el prefijo: al aceptarlo el sugeridor vuelve a abrirse con la otra mitad
    const envolturas = ENVOLTURAS.map(p => op(p, p + ' ', 'y después, qué hace'));
    return [...sec('cómo', filtrar(mods)),
            ...sec('cada nota', filtrar(figuras)),
            ...sec('el reparto', filtrar(euclides)),
            ...sec('de a ratos', filtrar(envolturas)),
            ...sec('entra y sale', filtrar(arreglos)),
            ...sec(r.modo === 'sonido' ? 'en qué caja' : 'en qué instrumento',
                   filtrar(conEn, pelado, o => o.buscar))];
  }
  return [];
}

function reemplazarRango(desde, hasta, txt) {
  aplicar(paso(desde, src.value.slice(desde, hasta), txt), { cursor: desde + txt.length });
  src.focus();
  // el botón cuelga de la palabra, no del espacio que la precede
  const sangria = txt.length - txt.trimStart().length;
  mostrarDeshacer(anclaDe(desde + sangria, txt.trim().length), false);
}

function aceptarSugerencia(o) {
  if (!sug || !o) return;
  const { desde, hasta } = sug, tipeado = src.value.slice(desde, hasta);
  let txt = (sug.pega || '') + o.pone;
  const finLinea = hasta >= src.value.length || src.value[hasta] === '\n';
  if (finLinea && !/\s$/.test(txt)) txt += ' ';
  cerrarSugeridor();
  reemplazarRango(desde, hasta, txt);
  // aceptar es una regla de entrada: Backspace devuelve lo tipeado, ver reglas.js
  recordarRegla(desde, txt.length, tipeado);
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
  mostrarPanel(sugeridor, false);
}
sugeridor.addEventListener('toggle', e => { if (e.newState === 'closed') cerrarSugeridor(); });

function abrirSugeridor(aPedido) {
  if (src.selectionStart !== src.selectionEnd) return cerrarSugeridor();
  const pos = src.selectionStart, { l, i } = resolver(pos), base = pos - i;
  const linea = src.value.split('\n')[l];
  const r = ranuraEn(linea, i);
  if (!r) return cerrarSugeridor();     // un apunte sin «@», o el tempo: nada que ofrecer
  r.l = l;                              // la vista previa suena con el instrumento de la línea
  // lo que ya está escrito no se ofrece: si era lo único, no hay panel, y el Enter baja
  const secs = seccionesEnCaret(r)
    .map(x => ({ ...x, ops: x.ops.filter(o => norm(o.txt) !== norm(r.prefijo)) }))
    .filter(x => x.ops.length);
  const ops = secs.flatMap(x => x.ops);
  // con una letra alcanza; la coma, el «@», el verbo y el renglón vacío son
  // la excepción: recién abiertos es cuando no se sabe qué puede ir
  const reciénAbierta = r.ranura === 'enlace' || (r.ranura === 'clausula' && !r.prefijo) || r.arranque;
  if (!ops.length || (!aPedido && !reciénAbierta && !r.prefijo))
    return cerrarSugeridor();
  ops.forEach(o => { o.hacer = () => aceptarSugerencia(o); });
  // abierto solo y sin nada tipeado no marca nada: Enter sigue siendo Enter, Tab acepta la primera
  sug = { desde: base + r.desde, hasta: base + r.hasta, ops, elegido: aPedido || r.prefijo ? 0 : -1, pega: r.pega };
  pintarPanel(sugeridor, secs, null, [{ l }]);
  mostrarPanel(sugeridor, true);
  acomodar(sugeridor, rectDe(base + r.desde));
  marcarElegido();
}

// ---- las órdenes del sugeridor
const aceptarPrimera = hacer => {
  if (!sug) return false;
  if (hacer) aceptarSugerencia(sug.ops[Math.max(0, sug.elegido)]);
  return true;
};
const pedirSugerencias = hacer => { if (hacer) abrirSugeridor(true); return true; };
// sin nada marcado, Enter cierra el panel y sigue siendo Enter: la orden no aplica
const aceptarMarcada = hacer => {
  if (!sug) return false;
  if (sug.elegido < 0) { if (hacer) cerrarSugeridor(); return false; }
  if (hacer) aceptarSugerencia(sug.ops[sug.elegido]);
  return true;
};
const moverMarca = abajo => hacer => {
  if (!sug) return false;
  if (hacer) {
    const n = sug.ops.length;
    sug.elegido = sug.elegido < 0 ? (abajo ? 0 : n - 1) : (sug.elegido + (abajo ? 1 : -1) + n) % n;
    marcarElegido();
  }
  return true;
};
// irse del lugar cierra el panel, y la tecla sigue su camino
const soltarSugerencia = hacer => { if (hacer) cerrarSugeridor(); return false; };

atajo('Tab', 'aceptar la sugerencia, o pedirla', encadenar(aceptarPrimera, pedirSugerencias));
atajo('Enter', 'aceptar la sugerencia marcada', aceptarMarcada);
atajo('ArrowDown', 'bajar en la lista', moverMarca(true));
atajo('ArrowUp', 'subir en la lista', moverMarca(false));
for (const t of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) atajo(t, 'cerrar la sugerencia', soltarSugerencia);
src.addEventListener('input', () => abrirSugeridor(false));
src.addEventListener('blur', cerrarSugeridor);
