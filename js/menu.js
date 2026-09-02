// -------------------------------------------- cambiar una palabra sin teclado
const menu = document.createElement('div');
menu.id = 'menu';
menu.className = 'panel';
menu.popover = 'auto';
document.body.appendChild(menu);
let pidiendoCuadro = false, relojFamilia, esperaOir;
// lo escribe el rastro del mouse, al final; lo lee realzar() para la manija
let señalado = null;
// estado del menú, no del documento
let familiaElegida = null;

// la franja a la derecha de un token cuenta como el token: así la palabra sigue
// señalada mientras el mouse va hacia su ▾
function tokenEn(x, y, conFranja) {
  // el cuerpo de un token le gana a la franja de otro
  let franja = null;
  for (const sp of hl.querySelectorAll('span[data-tipo]')) {
    // getClientRects y no getBoundingClientRect: la unión de una palabra partida
    // en dos renglones cubre medio editor
    const trozos = sp.getClientRects();
    for (const r of trozos) {
      // la caja mide la letra, no el renglón: se la estira hasta el interlineado
      const aire = Math.max(0, (altoRenglon() - r.height) / 2);
      if (y < r.top - aire || y > r.bottom + aire) continue;
      const d = { l: +sp.dataset.l, i: +sp.dataset.i, len: +sp.dataset.len, tipo: sp.dataset.tipo, r };
      if (x >= r.left && x <= r.right) return d;
      // sólo en el último trozo: el ▾ cuelga del final de la palabra
      if (conFranja && !franja && r === trozos[trozos.length - 1] &&
          x > r.right && x <= r.right + anchoManija()) franja = d;
    }
  }
  return franja;
}

const datosDe = t => (marcasActuales[t.l] || []).find(x => x.i === t.i) || {};
const textoDe = t => src.value.split('\n')[t.l].substr(t.i, t.len);

// el sujeto de una línea de golpes no se toca: la caja va como cláusula al final
function ponerClausula(l, texto) {
  const lineas = src.value.split('\n'), base = baseDe(lineas, l);
  const vieja = (marcasActuales[l] || []).find(x => x.tipo === 'instrumento' && x.conEn);
  const p = vieja
    ? paso(base + vieja.i, lineas[l].substr(vieja.i, vieja.len), texto)
    : paso(base + lineas[l].length, '', ', ' + texto);
  aplicar(p, { cursor: p.desde + p.puesto.length });
}

function reemplazar(t, texto, grupo) {
  const lineas = src.value.split('\n'), desde = baseDe(lineas, t.l) + t.i;
  aplicar(paso(desde, lineas[t.l].substr(t.i, t.len), texto), { cursor: desde + texto.length, grupo });
  mostrarDeshacer({ l: t.l, i: t.i, len: texto.length }, false);
}

const arrastrable = t => t && (t.tipo === 'tempo' || (t.tipo === 'nota' && datosDe(t).raiz));

const SIN_EN = /^en (un |una |el |la |los |las )?/;

function seccionesDe(t) {
  const d = datosDe(t), hoy = textoDe(t), voz = vozDeLinea(t.l);
  const como = (ops, nuevo = o => o.txt) => ops.map(o =>
    ({ ...o, nuevo: nuevo(o), puesto: norm(hoy) === norm(nuevo(o)) }));
  // sin rótulo
  const alPie = { titulo: '', pie: true, ops: como(ofrecerSilencios()) };

  if (t.tipo === 'paso' && d.modo !== 'nota')
    return [{ titulo: 'golpes', ops: como(ofrecerGolpes()) }, alPie];

  if (t.tipo === 'paso' || t.tipo === 'nota') {
    const p = { raiz: d.raiz || 'do', altN: d.altN || '', octN: d.octN || '', acorde: d.acorde || '' };
    const con = (campo, val) => armarNota({ ...p, [campo]: val });
    const campo = (ofertas, clave, vacio) =>
      (vacio ? [{ txt: vacio, nuevo: con(clave, ''), puesto: !p[clave] }] : []).concat(
        ofertas.map(o => ({ ...o, nuevo: con(clave, o.txt), puesto: norm(p[clave]) === norm(o.txt) })));
    return [
      { titulo: 'notas', ops: campo(ofrecerNotas(voz), 'raiz') },
      ...CAMPOS_NOTA(voz).map(([titulo, clave, vacio, ofertas]) => ({ titulo, ops: campo(ofertas, clave, vacio) })),
      alPie,
    ];
  }

  // el nombre de la parte es el renglón: al pie, adónde llevarlo; ver secciones.js
  const pie = t.tipo === 'instrumento' && !d.conEn ? [{ titulo: '', pie: true, ops: ordenesDeParte(t.l) }] : [];
  if (t.tipo === 'instrumento' && d.modo === 'sonido') {
    const todas = ofrecerMaquinas();
    if (!todas.length) return pie.length ? pie : null;
    const marcas = [...new Set(todas.map(m => m.marca))].sort();
    const puesta = d.conEn ? maquinaDe(hoy.replace(SIN_EN, '')) : null;
    const marca = marcas.includes(familiaElegida) ? familiaElegida
      : ((puesta || {}).marca || 'roland');
    return [
      { titulo: 'marcas', ops: marcas.map(x => ({ txt: x, familia: x, puesto: x === marca })) },
      { titulo: marca, detalle: true, ops: todas.filter(m => m.marca === marca).map(m =>
          ({ ...m, clausula: 'en una ' + m.txt, puesto: !!puesta && puesta.banco === m.banco })) },
      ...pie,
    ];
  }

  if (t.tipo === 'instrumento') {
    // ver REGLAS.md, 133 instrumentos
    const pre = d.conEn ? 'en ' : '';
    const pedido = norm(hoy.replace(SIN_EN, ''));
    const puesta = instrumentoDe(pedido);   // «en un piano» y «en piano» son el mismo
    const familias = ofrecerFamilias();
    const suya = (puesta || {}).fam;
    const fam = familias.some(f => f.txt === familiaElegida) ? familiaElegida
      : (suya || familias[0].txt);
    return [
      { titulo: 'familias', ops: familias.map(f => ({ ...f, familia: f.txt, puesto: f.txt === fam })) },
      { titulo: fam, detalle: true, ops: ofrecerInstrumentos().filter(i => i.desc === fam).map(i =>
          ({ ...i, desc: null, nuevo: pre + i.txt, puesto: !!puesta && puesta.nombre === i.txt })) },
      ...pie,
    ];
  }

  if (t.tipo === 'seccion')
    return [{ titulo: d.escrito, ops: ordenesDeEncabezado(t.l) }];

  if (t.tipo === 'figura')
    return [{ titulo: 'cada nota', ops: como(ofrecerFiguras()) }];

  if (t.tipo === 'modificador')
    return [{ titulo: 'cómo', ops: como(ofrecerModificadores()) }];

  if (t.tipo === 'euclides') {
    const puesto = leerEuclides(hoy);
    return [{ titulo: 'el reparto', ops: ofrecerEuclides().map(o =>
      ({ ...o, nuevo: o.txt, puesto: !!puesto && puesto.n === o.n && puesto.m === o.m })) }];
  }

  // las dos mitades se leen del texto: elegir una respeta la otra
  if (t.tipo === 'veces') {
    const partida = partirEnvoltura(hoy);
    const pre = partida ? partida.frase : ENVOLTURAS[2];
    const dentro = (partida && partida.dentro) || 'al doble';
    return [
      { titulo: 'cada cuánto', ops: ofrecerEnvolturas().map(o =>
        ({ ...o, nuevo: o.txt + ' ' + dentro, puesto: norm(o.txt) === norm(pre) })) },
      { titulo: 'y ahí, qué', ops: ofrecerEnvolvibles().map(o =>
        ({ ...o, nuevo: pre + ' ' + o.txt, puesto: norm(o.txt) === norm(dentro) })) },
    ];
  }

  if (t.tipo === 'arreglo') {
    const puesta = leerArreglo(hoy);
    return [{ titulo: 'entra y sale', ops: ofrecerArreglos().map(o =>
      ({ ...o, nuevo: o.txt, puesto: !!puesta && puesta.n === o.n && puesta.q === o.q })) }];
  }

  // abrirlo no va acá: el nombre se aprieta
  if (t.tipo === 'enlace')
    return [{ titulo: 'apuntar a', ops: temasTodos().map(x =>
      ({ txt: x.nombre, nuevo: x.nombre, puesto: mismoTema(x.nombre, d.nombre) })) }];

  if (t.tipo === 'forma') {
    const vistas = seccionesEscritas();
    if (!vistas.size) return null;
    return [{ titulo: 'secciones', ops: [...vistas].map(([clave, escrito]) =>
      ({ txt: escrito, nuevo: escrito, puesto: norm(hoy) === clave })) }];
  }

  if (t.tipo === 'tempo') {
    const n = parseFloat(hoy.replace(',', '.')) || 90;
    const acotado = delta => Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, n + delta));
    const secs = [{ titulo: 'tiempos por minuto', ops: [-10, -5, -1, 1, 5, 10].map(delta =>
      ({ txt: (delta > 0 ? '+' : '') + delta, desc: acotado(delta) + '',
         nuevo: String(acotado(delta)) })) }];
    // sin compás escrito se ofrece acá, pisando el número y lo que le sigue
    if (!(marcasActuales[t.l] || []).some(x => x.tipo === 'compas')) {
      const linea = src.value.split('\n')[t.l];
      secs.push({ titulo: 'compás', ops: ofrecerCompases().map(o => ({ ...o, puesto: o.tiempos === 4,
        hacer: () => reemplazar({ ...t, len: linea.length - t.i }, hoy + (o.tiempos === 4 ? '' : ' ' + o.txt)) })) });
    }
    return secs;
  }

  if (t.tipo === 'compas')
    return [{ titulo: 'compás', ops: como(ofrecerCompases()) }];

  if (t.tipo === 'mal') {
    // «el piano toca» sin pasos: lo que puede ir ahí, según lo que el nombre diga
    if (d.falta === 'paso') {
      const modo = modoDelNombre(d.quien), ins = instrumentoDe(d.quien);
      // sin espacio después del verbo, el paso lo trae
      const linea = src.value.split('\n')[t.l];
      const pega = t.i > 0 && !/\s/.test(linea[t.i - 1] || ' ') ? ' ' : '';
      const conEspacio = ops => ops.map(o => ({ ...o, nuevo: pega + o.txt }));
      return [
        ...(modo === 'nota' ? [] : [{ titulo: 'golpes', ops: conEspacio(ofrecerGolpes()) }]),
        ...(modo === 'sonido' ? [] : [{ titulo: 'notas', ops: conEspacio(ofrecerNotas(ins && ins.nombre)) }]),
        { ...alPie, ops: conEspacio(ofrecerSilencios()) },
      ];
    }
    // el mismo arreglo que ofrece el cajón
    if (d.arreglo) return [{ titulo: d.arreglo.texto ? '¿será…?' : 'sobra', ops: [
      { txt: d.arreglo.texto || 'sacar', hacer: () => aplicarArreglo(t.l + 1, d.arreglo) }] }];
    return null;
  }
  return null;
}

// corre en cada cuadro del hover (ver REGLAS.md, 133 instrumentos): sólo «mal»
// obliga a armar el menú para saber
const CON_MENU = ['tempo', 'compas', 'enlace', 'paso', 'nota', 'instrumento', 'modificador', 'figura', 'arreglo', 'seccion',
                  'euclides', 'veces', 'forma'];
const tieneMenu = t => !!t &&
  (CON_MENU.includes(t.tipo) || (t.tipo === 'mal' && !!seccionesDe(t)));

function editable(x, y) {
  const t = tokenEn(x, y);
  return tieneMenu(t) ? t : null;
}

// ------------------------------------------------------------- de quién es esto
// sin parte, null: queda la tinta de la página
const colorDelToken = t => t && vozDeLinea(t.l) ? tintaDe(vozDeLinea(t.l)) : null;

function pintarDeQuien(el, t) {
  const colores = new Set((Array.isArray(t) ? t : [t]).map(colorDelToken));
  const [color] = colores;
  if (colores.size === 1 && color) el.style.setProperty('--parte', color);
  else el.style.removeProperty('--parte');
}

function pintarPanel(panel, secs, t, dueño = t) {
  pintarDeQuien(panel, dueño);
  panel.innerHTML = secs.filter(s => s.ops.length).map(s =>
    '<div class="sec' + (s.detalle ? ' detalle' : '') + (s.pie ? ' pie' : '') +
    '">' + (s.titulo ? '<h3>' + esc(s.titulo) + '</h3>' : '') + s.ops.map((o, j) =>
      // una op con orden que no entra se pinta y no se aprieta
      '<div class="op' + (o.puesto ? ' puesto' : '') + (o.familia ? ' conSub' : '') +
      (o.orden && !o.orden(false) ? ' noEntra' : '') +
      '" data-op="' + j + '" data-sec="' + secs.indexOf(s) + '"' +
      // .puesto lo lee de --parte
      (o.color ? ' style="--parte:' + o.color + '"' : '') + '>' +
      '<span>' + esc(o.txt) + '</span>' +
      (o.desc ? '<span class="d">' + esc(o.desc) + '</span>' : '') +
      (o.familia ? '<span class="d">' + icono('chevron', 'chica derecha') + '</span>' : '') +
      '</div>').join('') + '</div>').join('');

  // columnas fijas: el pie abarca todas, y con auto-fit eso estira el menú a la pantalla.
  // Cada una mide lo que su contenido, sin encogerse: en una pantalla angosta el panel scrollea
  const columnas = secs.filter(x => x.ops.length && !x.pie).length;
  panel.style.gridTemplateColumns = 'repeat(' + columnas + ', max-content)';

  panel.querySelectorAll('.op').forEach(el => {
    const o = secs[+el.dataset.sec].ops[+el.dataset.op];
    el.addEventListener('mouseenter', () => {
      clearTimeout(esperaOir);
      clearTimeout(relojFamilia);
      if (o.receta) esperaOir = setTimeout(() => oir(o.receta), 120);
      // el panel no se mueve: abrir familia al pasar es seguro, salvo yendo al detalle
      if (o.familia) relojFamilia = setTimeout(() => {
        if (vaHaciaElDetalle()) return;
        verFamilia(o.familia, t);
      }, 80);
    });
    el.addEventListener('mouseleave', () => { clearTimeout(esperaOir); clearTimeout(relojFamilia); });
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      // una op con orden la hace; una con «hacer», lo suyo
      const hacer = o.hacer || (o.orden && (() => o.orden(true)));
      if (hacer) { hacer(); return cerrarMenu(); }
      if (o.familia) return verFamilia(o.familia, t);
      if (o.clausula) { ponerClausula(t.l, o.clausula); return cerrarMenu(); }
      reemplazar(t, o.nuevo);
      cerrarMenu();
    });
  });
}

// lo que se ve: con el teclado del teléfono levantado la ventana mide lo mismo y se ve la mitad
const loVisible = () => visualViewport
  ? { arriba: visualViewport.offsetTop, abajo: visualViewport.offsetTop + visualViewport.height,
      izq: visualViewport.offsetLeft, der: visualViewport.offsetLeft + visualViewport.width }
  : { arriba: 0, abajo: innerHeight, izq: 0, der: innerWidth };

// el lado con más aire, y nunca más alto que el aire: taparía la palabra
function acomodar(el, r) {
  // se mide suelto: con el lugar de la vez anterior el ancho sale recortado
  el.style.left = el.style.top = el.style.maxHeight = '';
  const v = loVisible();
  const debajo = v.abajo - r.bottom - 12, encima = r.top - v.arriba - 12;
  const abajo = el.offsetHeight <= debajo || debajo >= encima;
  const aire = abajo ? debajo : encima;
  if (el.offsetHeight > aire) el.style.maxHeight = aire + 'px';
  el.style.top = (abajo ? r.bottom + 4 : r.top - 4 - el.offsetHeight) + 'px';
  el.style.left = Math.max(v.izq + 8, Math.min(r.left, v.der - el.offsetWidth - 8)) + 'px';
}

// ------------------------------------------------- el triángulo de seguridad
// en diagonal hacia el detalle se cruzan otras familias: adentro del triángulo entre el
// puntero de hace un rato y el borde del detalle no se cambia; pegado al vértice taparía todo
const rastro = [];
const PLAZO_TRIANGULO = 300;   // apoyar el mouse y esperar tiene que destrabar
const VENTANA_RASTRO = 200;

menu.addEventListener('mousemove', e => {
  const ahora = performance.now();
  rastro.push({ x: e.clientX, y: e.clientY, t: ahora });
  while (rastro.length > 2 && ahora - rastro[0].t > VENTANA_RASTRO) rastro.shift();
});

// punto dentro del triángulo por el signo de los tres productos cruzados
const dentroDelTriangulo = (p, a, b, c) => {
  const cruz = (u, v, w) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
  const d1 = cruz(a, b, p), d2 = cruz(b, c, p), d3 = cruz(c, a, p);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

function vaHaciaElDetalle() {
  if (rastro.length < 2) return false;
  const act = rastro[rastro.length - 1], ant = rastro[0];
  if (performance.now() - act.t > PLAZO_TRIANGULO) return false;  // se destraba solo
  if (act.x <= ant.x) return false;          // no está avanzando hacia el detalle
  const det = menu.querySelector('.sec.detalle');
  if (!det) return false;
  const r = det.getBoundingClientRect();
  if (act.x >= r.left) return false;         // ya llegó
  return dentroDelTriangulo(act, ant, { x: r.left, y: r.top }, { x: r.left, y: r.bottom });
}

function verFamilia(fam, t) {
  if (fam === familiaElegida) return;
  familiaElegida = fam;
  pintarPanel(menu, seccionesDe(t), t);
}

function abrirMenu(t) {
  const secs = seccionesDe(t);
  if (!secs) return;
  tokenDelMenu = t;
  // notas e instrumentos, en columnas
  menu.classList.toggle('columnas',
    t.tipo === 'instrumento' || t.tipo === 'nota' || t.tipo === 'paso');
  pintarPanel(menu, secs, t);
  mostrarPanel(menu, true);
  acomodar(menu, t.r);
  ponerManija(t);
}

function cerrarMenu() {
  clearTimeout(relojFamilia);
  familiaElegida = null;
  tokenDelMenu = null;
  mostrarPanel(menu, false);
  ponerManija(señalado);
}
// también lo cierran Esc, un click afuera y otro panel
menu.addEventListener('toggle', e => { if (e.newState === 'closed') cerrarMenu(); });

// ---------------------------------------------------------------- la manija
const manija = document.createElement('button');
manija.id = 'manija';
colgar(manija, 0);
manija.innerHTML = icono('chevron', 'chica');
manija.title = 'qué otra cosa puede ir acá';
document.body.appendChild(manija);
let tokenDelMenu = null;

// «señalado» no trae el tipo: se rearma del span. El último trozo, porque una
// palabra partida termina abajo y la unión arranca en el margen
function tokenDelSpan(t) {
  const sp = spanDe(t);
  const trozos = sp ? sp.getClientRects() : [];
  const r = trozos[trozos.length - 1];
  return r ? { l: +sp.dataset.l, i: +sp.dataset.i, len: +sp.dataset.len, tipo: sp.dataset.tipo, r } : null;
}

function ponerManija(t) {
  const quien = tokenDelSpan(tokenDelMenu || t);
  // el renglón se fue con el scroll
  if (!quien || !tieneMenu(quien) || quien.r.top < hl.getBoundingClientRect().top) {
    manija.classList.remove('vivo');
    manija.colgadoDe = null;
    acomodarColgantes();          // el deshacer recupera el lugar que le cedía
    return;
  }
  pintarDeQuien(manija, quien);
  manija.classList.toggle('encendido', !!tokenDelMenu);
  pegarA(manija, quien, 0);
}

// el subrayado sale sólo con el mouse en el ▾ o con su menú abierto: dice de qué
// palabra es el botón
let sobreElBoton = false;
const enElBoton = () => sobreElBoton || !!tokenDelMenu;
const mirarBoton = quieto => { sobreElBoton = quieto; realzar(); };
manija.addEventListener('mouseenter', () => mirarBoton(true));
manija.addEventListener('mouseleave', () => mirarBoton(false));

manija.addEventListener('mousedown', e => {
  e.preventDefault();
  if (tokenDelMenu) { cerrarMenu(); return; }   // el mismo botón lo cierra
  const t = tokenDelSpan(señalado);
  if (t) abrirMenu(t);
});
invocaPanel(manija, menu);

// ------------------------------------------ el rastro del mouse, y el arrastre
src.addEventListener('mousemove', e => {
  if (pidiendoCuadro) return;
  pidiendoCuadro = true;
  requestAnimationFrame(() => {
    pidiendoCuadro = false;
    if (arrastre) return;
    const bajo = tokenEn(e.clientX, e.clientY, true);
    // el encabezado de una sección no tiene menú, así que va por «bajo» y no por «t»
    const d = bajo && datosDe(bajo);
    señalarTramo(d && (d.tipo === 'seccion' || d.tipo === 'forma') ? d.nombre : null, d && d.tipo === 'forma' ? d.tramo : null);
    const t = tieneMenu(bajo) ? bajo : null;
    const antes = señalado && señalado.l + ':' + señalado.i;
    const ahora = t && t.l + ':' + t.i;
    src.style.cursor = !t ? ''
      : t.tipo === 'tempo' ? 'ew-resize'
      : e.altKey && arrastrable(t) ? 'ns-resize' : '';
    if (antes === ahora) return;
    señalado = t && { l: t.l, i: t.i, len: t.len };
    realzar();
    ponerManija(señalado);
  });
});
src.addEventListener('mouseleave', e => {
  // irse al ▾ o al menú no es irse
  if (tokenDelMenu || dentroDe(e.relatedTarget, manija, menu)) return;
  señalarTramo(null);
  if (!señalado) return;
  señalado = null; realzar(); ponerManija(null);
});
let arrastre = null;
const UMBRAL = 3;

// el señalado y el token del arrastre siguen a su palabra; un menú abierto se cierra,
// que sus opciones ya no valen
alCambiar.push((pasos, viejo) => {
  señalado = mapearAncla(señalado, pasos, viejo);
  if (tokenDelMenu) { tokenDelMenu = null; mostrarPanel(menu, false); }
  if (arrastre) arrastre.t = mapearAncla(arrastre.t, pasos, viejo) || arrastre.t;
});

// sin mover el mouse no hay mousemove que limpie el cursor
addEventListener('keyup', e => { if (e.key === 'Alt') src.style.cursor = ''; });

// en mousedown y no en click: le gana al textarea antes de que mueva el cursor
src.addEventListener('mousedown', e => {
  // el tempo se arrastra sin Alt: es un número suelto y no hay texto que
  // seleccionar; las notas lo piden para no pelearse con la selección
  const t = editable(e.clientX, e.clientY);
  // soltar sin moverse va al tema; arrastrar selecciona
  if (t && t.tipo === 'enlace' && e.button === 0) {
    enlaceApretado = { nombre: datosDe(t).nombre, x: e.clientX, y: e.clientY };
    return;
  }
  if (!t || !arrastrable(t) || (!e.altKey && t.tipo !== 'tempo')) return;
  e.preventDefault();
  const d = datosDe(t);
  arrastre = { t, x: e.clientX, y: e.clientY, movido: false,
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
  reemplazar(a.t, texto, a.grupo);   // el token cambia de largo al ganar «sostenido»: lo sigue alCambiar
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

let enlaceApretado = null;
addEventListener('mouseup', e => {
  arrastre = null;
  const a = enlaceApretado; enlaceApretado = null;
  if (a && Math.hypot(e.clientX - a.x, e.clientY - a.y) <= UMBRAL) irAlTema(a.nombre);
});
src.addEventListener('input', cerrarMenu);

