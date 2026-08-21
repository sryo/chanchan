// -------------------------------------------- cambiar una palabra sin teclado
// El textarea está arriba y tapa todo, pero #hl es un espejo exacto: misma
// fuente, mismo padding, mismo interlineado. Así que para saber qué palabra hay
// abajo del mouse alcanza con probar contra los rectángulos de los spans.
const menu = document.createElement('div');
menu.id = 'menu';
menu.className = 'panel';
document.body.appendChild(menu);
let pidiendoCuadro = false, relojFamilia;

// El ▾ es un botón de verdad que flota por encima del texto (ver «la manija»,
// más abajo). Igual hace falta saber sobre qué palabra está el mouse, y para eso
// #hl es un espejo exacto del textarea —misma fuente, mismo padding, mismo
// interlineado—, así que alcanza con probar contra los rectángulos de los spans.
// La franja a la derecha de un token cuenta como si fuera el token: es lo que
// mantiene viva la palabra señalada mientras el mouse va hacia su botón.
// Esa franja mide exactamente un espacio y ocupa el renglón entero de alto.
// Así es siempre igual de grande: si midiera más se metería en la palabra de al
// lado y sus primeros píxeles abrirían el menú de la anterior; si midiera menos
// quedaría un hueco muerto. Lo que crece es el alto, que es donde sobra sitio.
let _letra = 0, _renglon = 0;
function medirTipografia() {
  const probeta = document.createElement('span');
  probeta.textContent = '0'.repeat(10);
  probeta.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
  hl.appendChild(probeta);
  _letra = probeta.getBoundingClientRect().width / 10;
  probeta.remove();
  _renglon = parseFloat(getComputedStyle(hl).lineHeight);
}
const anchoManija = () => { if (!_letra) medirTipografia(); return _letra; };
const altoRenglon = () => { if (!_renglon) medirTipografia(); return _renglon; };


// qué familia muestra la tercera columna; es estado del menú, no del documento
let familiaElegida = null;

function tokenEn(x, y, conManija) {
  // la manija se guarda pero no corta la vuelta: el cuerpo de un token le gana a
  // la franja del anterior, si no los primeros píxeles de una palabra abren el
  // menú de la de al lado (entre dos tokens hay un espacio de 9,6px y la franja
  // mide 14)
  let manija = null;
  for (const sp of hl.querySelectorAll('span[data-tipo]')) {
    // getClientRects y no getBoundingClientRect: el de una palabra que se parte en
    // dos renglones devuelve la unión, una caja ancha que cubre medio editor donde
    // la palabra no está, y se roba los clicks de todo lo que tenga encima
    const trozos = sp.getClientRects();
    for (const r of trozos) {
      // la caja de una palabra mide lo que mide la letra, no lo que mide el
      // renglón: se la estira hasta el interlineado para que apuntar no pida
      // puntería. Los renglones no se pisan, así que no hay ambigüedad.
      const aire = Math.max(0, (altoRenglon() - r.height) / 2);
      if (y < r.top - aire || y > r.bottom + aire) continue;
      const d = { l: +sp.dataset.l, i: +sp.dataset.i, len: +sp.dataset.len, tipo: sp.dataset.tipo, r };
      if (x >= r.left && x <= r.right) return d;
      // la franja va sólo en el último trozo, que es donde se posa el botón: en
      // una palabra partida en dos renglones el ▾ cuelga del final, abajo
      if (conManija && !manija && r === trozos[trozos.length - 1] &&
          x > r.right && x <= r.right + anchoManija()) manija = { ...d, enManija: true };
    }
  }
  return manija;
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

// una nota se escribe siempre en este orden, con las partes que tenga
const armarNota = p => [p.raiz, p.altN, p.octN, p.acorde].filter(Boolean).join(' ');

// altura como un número solo, para poder subirla y bajarla de a un semitono
const OCT_NOMBRE = Object.fromEntries(Object.entries(OCTAVAS).map(([k, v]) => [v, k]));
const SEMI_MIN = 12 * 2, SEMI_MAX = 12 * 6 + 11;   // de do muy grave a si muy agudo
const semiDe = d => GRADOS[NOTAS[d.raiz]] +
  (d.altN === 'sostenido' ? 1 : d.altN === 'bemol' ? -1 : 0) +
  12 * (d.octN ? OCTAVAS[d.octN] : OCTAVA_BASE);

function notaDesdeSemi(semi, acorde) {
  const oct = Math.floor(semi / 12), clase = ((semi % 12) + 12) % 12;
  const exacta = Object.entries(NOTAS).find(([, en]) => GRADOS[en] === clase);
  const abajo = exacta || Object.entries(NOTAS).find(([, en]) => GRADOS[en] === clase - 1);
  return [abajo[0], exacta ? '' : 'sostenido',
          oct === OCTAVA_BASE ? '' : OCT_NOMBRE[oct], acorde].filter(Boolean).join(' ');
}

const arrastrable = t => t && (t.tipo === 'tempo' || (t.tipo === 'nota' && datosDe(t).raiz));

function seccionesDe(t) {
  const d = datosDe(t), hoy = textoDe(t), voz = vozDeLinea(t.l);
  // Un paso tiene una de tres cosas: un sonido, un silencio o la anterior
  // estirada. No son tres dimensiones distintas, son la misma: por eso «-» y «_»
  // van juntos al pie, con la puesta marcada igual que en las otras columnas.
  const golpes = Object.entries(SONIDOS).map(([p, [, desc]]) =>
    ({ txt: p, desc, nuevo: p, puesto: norm(hoy) === p, receta: recetaDe('golpe', p) }));
  const alPie = { titulo: 'o nada', pie: true, ops: [
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
    // en una línea de golpes el sujeto no elige instrumento: elige la caja de ritmo
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
    // 133 opciones apiladas eran nueve pantallas y media. Van en dos columnas
    // dentro de la misma caja: las familias y la que esté elegida.
    const secs = [];
    const actual = norm(hoy.replace(/^en (un |una |el |la |los |las )?/, ''));
    const familias = [...FAMILIAS.map(f => f[0]), 'osciladores'];
    const deFamilia = fam => [...new Set(Object.values(INSTRUMENTOS))].filter(i => i.fam === fam);
    // se abre en la familia del instrumento que ya tiene la línea: caés en contexto
    const puesta = instrumentoDe(actual);   // «en un piano» y «en piano» son el mismo
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

  if (t.tipo === 'arreglo') {
    const puesta = leerArreglo(hoy);
    return [{ titulo: 'entra y sale', ops: ARREGLOS.map(([n, q]) => ({
      txt: fraseArreglo(n, q), desc: (n + q) + ' vueltas', nuevo: fraseArreglo(n, q),
      puesto: !!puesta && puesta.n === n && puesta.q === q })) }];
  }

  if (t.tipo === 'tempo') {
    const n = parseFloat(hoy.replace(',', '.')) || 90;
    return [{ titulo: 'tiempos por minuto', ops: [-10, -5, -1, 1, 5, 10].map(paso =>
      ({ txt: (paso > 0 ? '+' : '') + paso, desc: Math.max(20, n + paso) + '',
         nuevo: String(Math.max(20, n + paso)) })) }];
  }

  if (t.tipo === 'mal') {
    const s = parecida(hoy);
    return s ? [{ titulo: '¿será…?', ops: [{ txt: s, nuevo: s }] }] : null;
  }
  return null;
}

// Barato a propósito: corre en cada cuadro del hover, y seccionesDe() arma el
// menú entero (hasta 133 instrumentos, o un Levenshtein contra todo el
// vocabulario si el token es un error). «mal» es el único que hay que preguntar.
const CON_MENU = ['tempo', 'paso', 'nota', 'instrumento', 'modificador', 'arreglo'];
const tieneMenu = t => !!t &&
  (CON_MENU.includes(t.tipo) || (t.tipo === 'mal' && !!seccionesDe(t)));

function editable(x, y) {
  const t = tokenEn(x, y);
  return tieneMenu(t) ? t : null;
}

// ------------------------------------------------------------- de quién es esto
// Hay tres dueños posibles y cada uno tiene su color. Una palabra de una parte
// se pinta con el instrumento de esa parte. La línea del tempo no es de ninguna
// parte pero tampoco es de nadie: es del tema entero, y el tema ya tiene color
// —el del botón de tocar y el del logo—, así que usa ése. Y lo que no es de
// nadie, como una selección de varias palabras sueltas, se queda sin dueño y ahí
// recién manda el acento, que es el color de lo tuyo.
// Lo usan las tres cosas que cuelgan de una palabra —el ▾, su menú y lo que ese
// menú marca como puesto—, así que las tres salen siempre del mismo color que la
// palabra de la que cuelgan.
const colorDelToken = t => !t ? null
  : vozDeLinea(t.l) ? colorDe(vozDeLinea(t.l))
  : t.tipo === 'tempo' ? 'var(--marca)' : null;

function pintarDeQuien(el, t) {
  const color = colorDelToken(t);
  if (color) el.style.setProperty('--parte', color);
  else el.style.removeProperty('--parte');
}

// pinta secciones en un panel y engancha lo que hace cada opción
function pintarPanel(panel, secs, t) {
  pintarDeQuien(panel, t);
  panel.innerHTML = secs.filter(s => s.ops.length).map(s =>
    '<div class="sec' + (s.detalle ? ' detalle' : '') + (s.pie ? ' pie' : '') +
    '"><h3>' + esc(s.titulo) + '</h3>' + s.ops.map((o, j) =>
      '<div class="op' + (o.puesto ? ' puesto' : '') + (o.familia ? ' conSub' : '') +
      '" data-op="' + j + '" data-sec="' + secs.indexOf(s) + '">' +
      '<span>' + esc(o.txt) + '</span>' +
      (o.desc ? '<span class="d">' + esc(o.desc) + '</span>' : '') +
      (o.familia ? '<span class="d">▸</span>' : '') + '</div>').join('') + '</div>').join('');

  // auto-fit crea tantas pistas de 118px como entren en la ventana y deja colapsar
  // las vacías, pero la franja del pie las abarca todas con 1/-1 y eso se lo
  // impide: el menú terminaba midiendo la pantalla entera con el contenido a un
  // tercio. Se fija la cantidad real de columnas.
  const columnas = secs.filter(x => x.ops.length && !x.pie).length;
  panel.style.gridTemplateColumns = 'repeat(' + columnas + ', minmax(118px, max-content))';

  panel.querySelectorAll('.op').forEach(el => {
    const o = secs[+el.dataset.sec].ops[+el.dataset.op];
    el.addEventListener('mouseenter', () => {
      clearTimeout(esperaOir);
      clearTimeout(relojFamilia);
      if (o.receta) esperaOir = setTimeout(() => oir(o.receta), 120);
      // el panel no se mueve, así que abrir familia al pasar es seguro, salvo
      // que el mouse venga cruzando en diagonal hacia el detalle
      if (o.familia) relojFamilia = setTimeout(() => {
        if (vaHaciaElDetalle()) return;
        verFamilia(o.familia, t);
      }, 80);
    });
    el.addEventListener('mouseleave', () => { clearTimeout(esperaOir); clearTimeout(relojFamilia); });
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      if (o.hacer) { o.hacer(); return cerrarMenu(); }
      if (o.familia) return verFamilia(o.familia, t);
      if (o.clausula) { ponerClausula(t.l, o.clausula); return cerrarMenu(); }
      reemplazar(t, o.nuevo);
      cerrarMenu();
    });
  });
}

// debajo de lo que lo abrió, o arriba si no entra; y sin salirse de la ventana
function acomodar(el, r) {
  const alto = el.offsetHeight, ancho = el.offsetWidth;
  const abajo = r.bottom + 4 + alto < innerHeight;
  el.style.top = (abajo ? r.bottom + 4 : Math.max(4, r.top - alto - 4)) + 'px';
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - ancho - 8)) + 'px';
}

// ------------------------------------------------- el triángulo de seguridad
// Yendo en diagonal desde una familia hacia la columna de al lado se cruzan otras
// familias, y cada una cambiaría el detalle abajo del mouse. Mientras el puntero
// va dentro del triángulo que forman su posición anterior y el borde cercano de
// la columna de detalle, se entiende que va hacia ahí y no se cambia de familia.
// Hace falta un rastro y no una sola posición: dos mousemove seguidos están a
// milisegundos, y con el vértice pegado al punto el triángulo se abre tanto que
// bloquea todo, incluso bajar derecho por la columna.
const rastro = [];
const PLAZO_TRIANGULO = 300;   // sin esto, apoyar el mouse y esperar no haría nada
const VENTANA_RASTRO = 200;    // cuánto para atrás se mira para sacar la dirección

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

// cambiar de familia repinta sólo la tercera columna; el panel se queda quieto
function verFamilia(fam, t) {
  if (fam === familiaElegida) return;
  familiaElegida = fam;
  pintarPanel(menu, seccionesDe(t), t);
}

function abrirMenu(t) {
  const secs = seccionesDe(t);
  if (!secs) return;
  tokenDelMenu = t;
  // las notas van en columnas: apiladas son 738 px y hay que scrollear para
  // llegar a «acorde», que es justo lo que más se cambia
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
// El ▾ es un botón de verdad y no un dibujo del css. Adentro del renglón no
// podía medir más que el espacio entre dos palabras —9,6px— y salía siempre
// apretado; flotando por encima mide lo que necesita, igual que el de deshacer.
// Y sobre todo puede quedarse quieto mientras el menú que abrió sigue abierto:
// si se fuera al mover el mouse, el menú quedaría colgando de un botón que ya
// no está.
const manija = document.createElement('button');
manija.id = 'manija';
manija.textContent = '▾';
manija.title = 'qué otra cosa puede ir acá';
document.body.appendChild(manija);
let tokenDelMenu = null;

// «señalado» guarda apenas dónde está el mouse, sin el tipo; el token entero se
// vuelve a armar del span, que es el que sabe qué es cada cosa. El último trozo:
// una palabra partida termina abajo, y la caja de la unión arranca en el margen
// izquierdo, donde la palabra no está.
function tokenDelSpan(t) {
  const sp = t && hl.querySelector('span[data-l="' + t.l + '"][data-i="' + t.i + '"]');
  const trozos = sp ? sp.getClientRects() : [];
  const r = trozos[trozos.length - 1];
  return r ? { l: +sp.dataset.l, i: +sp.dataset.i, len: +sp.dataset.len, tipo: sp.dataset.tipo, r } : null;
}

function ponerManija(t) {
  const quien = tokenDelSpan(tokenDelMenu || t);
  // fuera de cuadro cuando el renglón se fue con el scroll
  if (!quien || !tieneMenu(quien) || quien.r.top < hl.getBoundingClientRect().top) {
    manija.classList.remove('vivo');
    return;
  }
  manija.classList.add('vivo');
  pintarDeQuien(manija, quien);
  manija.style.left = Math.round(quien.r.right) + 'px';
  manija.style.top = Math.round(quien.r.top + (quien.r.height - manija.offsetHeight) / 2) + 'px';
  manija.classList.toggle('encendido', !!tokenDelMenu);
}

// El subrayado de la palabra sale sólo cuando el mouse está en el ▾, o mientras
// su menú está abierto: ahí dice a cuál de las palabras pertenece el botón, que
// es lo único que no se ve solo. Sobre la palabra misma sería ruido.
let sobreElBoton = false;
const enElBoton = () => sobreElBoton || !!tokenDelMenu;
const mirarBoton = quieto => { sobreElBoton = quieto; pintar(marcasActuales); };
manija.addEventListener('mouseenter', () => mirarBoton(true));
manija.addEventListener('mouseleave', () => mirarBoton(false));

manija.addEventListener('mousedown', e => {
  e.preventDefault();
  if (tokenDelMenu) { cerrarMenu(); return; }   // el mismo botón lo cierra
  const t = tokenDelSpan(señalado);
  if (t) abrirMenu(t);
});
