// -------------------------------------------- cambiar una palabra sin teclado
const menu = document.createElement('div');
menu.id = 'menu';
menu.className = 'panel';
document.body.appendChild(menu);
let pidiendoCuadro = false, relojFamilia, esperaOir;
// lo escribe el rastro del mouse, al final; lo lee pintar() para el subrayado
let señalado = null;

// la franja a la derecha de un token cuenta como el token: así la palabra sigue
// señalada mientras el mouse va hacia su ▾. Un espacio de ancho, el renglón de alto


// estado del menú, no del documento
let familiaElegida = null;

function tokenEn(x, y, conManija) {
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
      if (conManija && !franja && r === trozos[trozos.length - 1] &&
          x > r.right && x <= r.right + anchoManija()) franja = { ...d, enManija: true };
    }
  }
  return franja;
}

const datosDe = t => (marcasActuales[t.l] || []).find(x => x.i === t.i) || {};
const textoDe = t => src.value.split('\n')[t.l].substr(t.i, t.len);

// el sujeto de una línea de golpes no se toca: la caja va como cláusula al final
function ponerClausula(l, texto) {
  const lineas = src.value.split('\n');
  const vieja = (marcasActuales[l] || []).find(x => x.tipo === 'instrumento' && x.conEn);
  lineas[l] = vieja
    ? lineas[l].slice(0, vieja.i) + texto + lineas[l].slice(vieja.i + vieja.len)
    : lineas[l] + ', ' + texto;
  const donde = vieja ? vieja.i + texto.length : lineas[l].length;
  escribir(lineas.join('\n'), baseDe(lineas, l) + donde);
  registrar(src.value, { l, i: vieja ? vieja.i : lineas[l].length - texto.length, len: texto.length });
  actualizar(true);
}

function reemplazar(t, texto, grupo) {
  const lineas = src.value.split('\n');
  lineas[t.l] = lineas[t.l].slice(0, t.i) + texto + lineas[t.l].slice(t.i + t.len);
  escribir(lineas.join('\n'), baseDe(lineas, t.l) + t.i + texto.length);
  registrar(src.value, { l: t.l, i: t.i, len: texto.length }, grupo);
  actualizar(true);
  mostrarDeshacer({ l: t.l, i: t.i, len: texto.length }, false);
}

const arrastrable = t => t && (t.tipo === 'tempo' || (t.tipo === 'nota' && datosDe(t).raiz));

function seccionesDe(t) {
  const d = datosDe(t), hoy = textoDe(t), voz = vozDeLinea(t.l);
  // «-» y «_» van al pie: sonar, callar o estirar es una sola dimensión
  const golpes = Object.entries(SONIDOS).map(([p, [, desc]]) =>
    ({ txt: p, desc, nuevo: p, puesto: norm(hoy) === p, receta: recetaDe('golpe', p) }));
  // sin rótulo: en versalitas chicas «o nada» se leía «0 nada»
  const alPie = { titulo: '', pie: true, ops: [
    { txt: '-', desc: 'este paso queda en silencio', nuevo: '-', puesto: hoy === '-' },
    { txt: '_', desc: 'sigue sonando la anterior',   nuevo: '_', puesto: hoy === '_' },
  ] };

  if (t.tipo === 'paso' && d.modo !== 'nota')
    return [{ titulo: 'golpes', ops: golpes }, alPie];

  if (t.tipo === 'paso' || t.tipo === 'nota') {
    const p = { raiz: d.raiz || 'do', altN: d.altN || '', octN: d.octN || '', acorde: d.acorde || '' };
    const con = (campo, val) => armarNota({ ...p, [campo]: val });
    return [
      { titulo: 'notas',     ops: Object.keys(NOTAS).map(x =>
          ({ txt: x, nuevo: con('raiz', x), puesto: p.raiz === x, receta: recetaDe('nota', x, voz) })) },
      { titulo: 'medio tono', ops: [{ txt: 'sin alterar', nuevo: con('altN', ''), puesto: !p.altN }].concat(
          Object.keys(ALTERACIONES).map(x =>
          ({ txt: x, nuevo: con('altN', x), puesto: p.altN === x, receta: recetaDe('alteracion', x, voz) }))) },
      { titulo: 'altura',    ops: [{ txt: 'normal', nuevo: con('octN', ''), puesto: !p.octN }].concat(
          Object.keys(OCTAVAS).map(x =>
          ({ txt: x, nuevo: con('octN', x), puesto: p.octN === x, receta: recetaDe('octava', x, voz) }))) },
      { titulo: 'acorde',    ops: [{ txt: 'una nota sola', nuevo: con('acorde', ''), puesto: !p.acorde }].concat(
          Object.keys(ACORDES).map(x =>
          ({ txt: x, nuevo: con('acorde', x), puesto: norm(p.acorde) === norm(x), receta: recetaDe('acorde', x, voz) }))) },
      alPie,
    ];
  }

  if (t.tipo === 'instrumento' && d.modo === 'sonido') {
    const todas = [...new Map(Object.values(maquinas()).map(m => [m.banco, m])).values()];
    if (!todas.length) return null;
    const marcas = [...new Set(todas.map(m => m.marca))].sort();
    const puesta = d.conEn ? maquinaDe(hoy.replace(/^en (un |una |el |la |los |las )?/, '')) : null;
    const marca = marcas.includes(familiaElegida) ? familiaElegida
      : ((puesta || {}).marca || 'roland');
    return [
      { titulo: 'marcas', ops: marcas.map(x => ({ txt: x, familia: x, puesto: x === marca })) },
      { titulo: marca, detalle: true, ops: todas.filter(m => m.marca === marca).map(m =>
          ({ txt: m.nombre, clausula: 'en una ' + m.nombre,
             puesto: !!puesta && puesta.banco === m.banco, receta: recetaDe('maquina', m.banco) })) },
    ];
  }

  if (t.tipo === 'instrumento') {
    const pre = d.conEn ? 'en ' : '';
    const op = i => ({ txt: i.nombre, nuevo: pre + i.nombre,
      puesto: puesta === i, receta: recetaDe('instrumento', i.nombre) });
    // ver REGLAS.md, 133 instrumentos
    const secs = [];
    const pedido = norm(hoy.replace(/^en (un |una |el |la |los |las )?/, ''));
    const familias = [...FAMILIAS.map(f => f[0]), 'osciladores'];
    const deFamilia = fam => [...new Set(Object.values(INSTRUMENTOS))].filter(i => i.fam === fam);
    const puesta = instrumentoDe(pedido);   // «en un piano» y «en piano» son el mismo
    const suya = (puesta || {}).fam;
    const fam = familias.includes(familiaElegida) ? familiaElegida : (suya || familias[0]);

    secs.push({ titulo: 'familias', ops: familias.map(f =>
      ({ txt: f, familia: f, puesto: f === fam })) });
    secs.push({ titulo: fam, detalle: true, ops: deFamilia(fam).map(op) });
    return secs;
  }

  if (t.tipo === 'modificador')
    return [{ titulo: 'cómo', ops: MODIFICADORES.map(m =>
      ({ txt: m[0], desc: m[2], nuevo: m[0], puesto: norm(hoy) === norm(m[0]) })) }];

  // las dos mitades se leen del texto: elegir una respeta la otra
  if (t.tipo === 'euclides') {
    const puesto = leerEuclides(hoy);
    return [{ titulo: 'el reparto', ops: EUCLIDES.map(([n, m]) => ({
      txt: fraseEuclides(n, m), desc: n + ' golpes en ' + m + ' pasos',
      nuevo: fraseEuclides(n, m),
      puesto: !!puesto && puesto.n === n && puesto.m === m })) }];
  }

  if (t.tipo === 'veces') {
    const partida = partirEnvoltura(hoy);
    const pre = partida ? partida.frase : ENVOLTURAS[2];
    const dentro = (partida && partida.dentro) || 'al doble';
    const cuanSeguido = p => {
      const v = VECES.find(x => norm(x[0]) === norm(p));
      if (v) return v[2];
      const k = (norm(p).match(/^cada (\S+) vueltas?$/) || [])[1];
      return 'una de cada ' + (k || '') + ', y las otras como está';
    };
    return [
      { titulo: 'cada cuánto', ops: ENVOLTURAS.map(p =>
        ({ txt: p, desc: cuanSeguido(p), nuevo: p + ' ' + dentro, puesto: norm(p) === norm(pre) })) },
      { titulo: 'y ahí, qué', detalle: true, ops: MODIFICADORES.filter(envolvible).map(m =>
        ({ txt: m[0], desc: m[2], nuevo: pre + ' ' + m[0], puesto: norm(m[0]) === norm(dentro) })) },
    ];
  }

  if (t.tipo === 'arreglo') {
    const puesta = leerArreglo(hoy);
    return [{ titulo: 'entra y sale', ops: ARREGLOS.map(([n, q]) => ({
      txt: fraseArreglo(n, q), desc: (n + q) + ' vueltas', nuevo: fraseArreglo(n, q),
      puesto: !!puesta && puesta.n === n && puesta.q === q })) }];
  }

  if (t.tipo === 'forma') {
    const vistas = seccionesEscritas();
    if (!vistas.size) return null;
    return [{ titulo: 'secciones', ops: [...vistas].map(([clave, escrito]) =>
      ({ txt: escrito, nuevo: escrito, puesto: norm(hoy) === clave })) }];
  }

  if (t.tipo === 'tempo') {
    const n = parseFloat(hoy.replace(',', '.')) || 90;
    const acotado = paso => Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, n + paso));
    return [{ titulo: 'tiempos por minuto', ops: [-10, -5, -1, 1, 5, 10].map(paso =>
      ({ txt: (paso > 0 ? '+' : '') + paso, desc: acotado(paso) + '',
         nuevo: String(acotado(paso)) })) }];
  }

  if (t.tipo === 'mal') {
    const s = parecida(hoy);
    return s ? [{ titulo: '¿será…?', ops: [{ txt: s, nuevo: s }] }] : null;
  }
  return null;
}

// corre en cada cuadro del hover (ver REGLAS.md, 133 instrumentos): sólo «mal»
// obliga a armar el menú para saber
const CON_MENU = ['tempo', 'paso', 'nota', 'instrumento', 'modificador', 'arreglo',
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
      '<div class="op' + (o.puesto ? ' puesto' : '') + (o.familia ? ' conSub' : '') +
      '" data-op="' + j + '" data-sec="' + secs.indexOf(s) + '">' +
      '<span>' + esc(o.txt) + '</span>' +
      (o.desc ? '<span class="d">' + esc(o.desc) + '</span>' : '') +
      (o.familia ? '<span class="d">' + icono('chevron', 'chica derecha') + '</span>' : '') +
      '</div>').join('') + '</div>').join('');

  // con auto-fit el pie, que abarca 1/-1, impide colapsar las pistas vacías y el
  // menú mide la pantalla entera: se fija la cantidad real de columnas
  const columnas = secs.filter(x => x.ops.length && !x.pie).length;
  panel.style.gridTemplateColumns = 'repeat(' + columnas + ', minmax(118px, max-content))';

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
      // al repintar, el blanco del mousedown queda suelto del documento y window
      // lo vería «afuera»
      e.stopPropagation();
      if (o.hacer) { o.hacer(); return cerrarMenu(); }
      if (o.familia) return verFamilia(o.familia, t);
      if (o.clausula) { ponerClausula(t.l, o.clausula); return cerrarMenu(); }
      reemplazar(t, o.nuevo);
      cerrarMenu();
    });
  });
}

function acomodar(el, r) {
  const alto = el.offsetHeight, ancho = el.offsetWidth;
  const abajo = r.bottom + 4 + alto < innerHeight;
  el.style.top = (abajo ? r.bottom + 4 : Math.max(4, r.top - alto - 4)) + 'px';
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - ancho - 8)) + 'px';
}

// ------------------------------------------------- el triángulo de seguridad
// en diagonal de una familia al detalle se cruzan otras familias: mientras el
// puntero va dentro del triángulo entre donde estaba y el borde del detalle no se
// cambia. Un rastro y no un punto: con el vértice pegado el triángulo tapa todo
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
  // apiladas las notas miden 738 px y «acorde» queda abajo del scroll
  menu.classList.toggle('columnas',
    t.tipo === 'instrumento' || t.tipo === 'nota' || t.tipo === 'paso');
  pintarPanel(menu, secs, t);
  menu.classList.add('abierto');
  acomodar(menu, t.r);
  ponerManija(t);
}

function cerrarMenu() {
  clearTimeout(relojFamilia);
  familiaElegida = null;
  tokenDelMenu = null;
  menu.classList.remove('abierto');
  ponerManija(señalado);
}

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
  const sp = t && hl.querySelector('span[data-l="' + t.l + '"][data-i="' + t.i + '"]');
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

// ------------------------------------------ el rastro del mouse, y el arrastre
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
    src.style.cursor = !t ? ''
      : t.tipo === 'tempo' ? 'ew-resize'
      : e.altKey && arrastrable(t) ? 'ns-resize' : '';
    if (antes === ahora) return;
    señalado = t && { l: t.l, i: t.i, m: !!t.enManija };
    realzar();
    ponerManija(señalado);
  });
});
src.addEventListener('mouseleave', e => {
  // irse al ▾ o al menú no es irse
  if (tokenDelMenu || dentroDe(e.relatedTarget, manija, menu)) return;
  if (!señalado) return;
  señalado = null; realzar(); ponerManija(null);
});
// en mousedown y no en click: le gana al textarea antes de que mueva el cursor
let arrastre = null;
const UMBRAL = 3;

// sin mover el mouse no hay mousemove que limpie el cursor
addEventListener('keyup', e => { if (e.key === 'Alt') src.style.cursor = ''; });

src.addEventListener('mousedown', e => {
  cerrarMenu();
  // el tempo se arrastra sin Alt: es un número suelto y no hay texto que
  // seleccionar; las notas lo piden para no pelearse con la selección
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
// botonSel abre el menú en su mousedown y éste llega después: lo cerraría
addEventListener('mousedown', e => {
  if (!dentroDe(e.target, menu, src, botonSel, manija)) cerrarMenu();
});
addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });
src.addEventListener('input', cerrarMenu);

