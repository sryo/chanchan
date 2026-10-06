// ------------------------------------------------------------- lo que se ofrece
// las listas del ▾, la selección y el sugeridor; la receta es lo que oir() necesita
const ofrecerGolpes = () => Object.entries(SONIDOS)
  .map(([txt, [, desc]]) => ({ txt, desc, receta: recetaDe('golpe', txt) }));

// sonar, callar o estirar es una sola dimensión, así que van juntos
const ofrecerSilencios = () => [
  { txt: '-', desc: 'este paso queda en silencio' },
  { txt: '_', desc: 'sigue sonando la anterior' },
];

const ofrecerNotas = voz => Object.keys(NOTAS)
  .map(txt => ({ txt, receta: recetaDe('nota', txt, voz) }));
const ofrecerAlteraciones = voz => Object.keys(ALTERACIONES)
  .map(txt => ({ txt, receta: recetaDe('alteracion', txt, voz) }));
const ofrecerOctavas = voz => Object.keys(OCTAVAS)
  .map(txt => ({ txt, receta: recetaDe('octava', txt, voz) }));
const ofrecerAcordes = voz => Object.keys(ACORDES)
  .map(txt => ({ txt, desc: ACORDES_GLOSA[txt], receta: recetaDe('acorde', txt, voz) }));

const sirveCon = modo => m => modo !== 'sonido' || !conAltura(m);
const ofrecerModificadores = (modo, voz) => MODIFICADORES.filter(sirveCon(modo))
  .map(m => ({ txt: m[0], desc: m[2], receta: voz !== undefined ? recetaDe('modificador', m[0], voz) : null }));

// lo que va después de la coma, como árbol: primero la pregunta, después las frases
function arbolDeLaComa(modo, voz) {
  const frases = new Map(ofrecerModificadores(modo, voz).map(o => [o.txt, o]));
  return [
    ...GRUPOS_COMO.map(([nombre, lista]) => ({ nombre, ops: lista.filter(f => frases.has(f)).map(f => frases.get(f)) })),
    { nombre: 'cada nota', aparte: true, ops: ofrecerFiguras() },
    { nombre: 'el reparto', ops: ofrecerEuclides() },
    // «de a ratos» sola no es una frase: va con lo que hace, y el ▾ de la frase lo cambia
    { nombre: 'de a ratos', ops: ofrecerEnvolturas().map(o => ({ ...o, txt: o.txt + ' al doble' })) },
    { nombre: 'entra y sale', ops: ofrecerArreglos() },
  ].filter(g => g.ops.length);
}
const grupoDe = (arbol, txt) => arbol.find(g => g.ops.some(o => norm(o.txt) === norm(txt)));

// los golpes en sus familias: una fila por familia, de grave a agudo como el teclado de las notas
const golpesEnGrupos = ops => GRUPOS_GOLPES.map(([titulo, lista]) =>
  ({ titulo, fila: true, fichas: true, ops: lista.map(g => ops.find(o => norm(o.txt) === norm(g))).filter(Boolean) }));
const ofrecerEnvolvibles = modo => MODIFICADORES.filter(m => envolvible(m) && sirveCon(modo)(m)).map(m => ({ txt: m[0], desc: m[2] }));
const ofrecerFiguras = () => Object.entries(FIGURAS)
  .map(([f, k]) => ({ txt: 'en ' + f, desc: k < 1 ? 'una cada dos tiempos' : enLetras(k) + ' por tiempo' }));
const ofrecerEuclides = () => EUCLIDES.map(([n, m]) =>
  ({ txt: fraseEuclides(n, m), desc: n + ' golpes en ' + m + ' pasos', n, m }));
const ofrecerArreglos = () => ARREGLOS.map(([n, q]) =>
  ({ txt: fraseArreglo(n, q), desc: (n + q) + ' vueltas', n, q }));
const ofrecerCompases = () => [['en dos', 2], ['en tres', 3], ['en cuatro', 4], ['en seis', 6]]
  .map(([txt, tiempos]) => ({ txt, desc: tiempos + ' tiempos por vuelta', tiempos }));

// cuán seguido pasa cada envoltura; las de «cada n vueltas» no están en la tabla
const ofrecerEnvolturas = () => ENVOLTURAS.map(txt => {
  const v = VECES.find(x => norm(x[0]) === norm(txt));
  const k = (norm(txt).match(/^cada (\S+) vueltas?$/) || [])[1];
  return { txt, desc: v ? v[2] : 'una de cada ' + (k || '') + ', y las otras como está' };
});

// los alias comparten objeto con su instrumento: por .nombre «guitarra» dice «viola»
const ofrecerInstrumentos = () => [...new Set(Object.values(INSTRUMENTOS))]
  .map(i => ({ txt: i.nombre, desc: i.fam, receta: recetaDe('instrumento', i.nombre) }));
const ofrecerAlias = () => Object.keys(ALIAS)
  .map(a => ({ txt: a, desc: ALIAS[a], receta: recetaDe('instrumento', a) }));
const ofrecerFamilias = () => [...new Set([...FAMILIAS.map(f => f[0]), ...Object.values(SIN_GM).map(i => i.fam)])]
  .map(txt => ({ txt, color: tintaDeFamilia(txt) }));
// los campos de una nota después de la raíz: título, clave, cómo se dice «sin», y lo que se ofrece
const CAMPOS_NOTA = voz => [
  ['sostenido o bemol', 'altN', 'ninguno', ofrecerAlteraciones(voz)],
  ['qué tan agudo', 'octN', 'normal', ofrecerOctavas(voz)],
  ['qué acorde', 'acorde', 'una nota sola', ofrecerAcordes(voz)],
];

// el teclado del ▾ de una nota: tres octavas alrededor de la escrita, y cada tecla escribe su nota con
// el acorde y el acento como están. La negra va con la alteración de la nota, y si no tiene, sostenido
const TECLAS = [['do'], ['do', 're'], ['re'], ['re', 'mi'], ['mi'], ['fa'], ['fa', 'sol'], ['sol'], ['sol', 'la'], ['la'], ['la', 'si'], ['si']];
function ofrecerTeclas(p, voz) {
  const oct = p.octN ? OCTAVAS[p.octN] : OCTAVA_BASE;
  const centro = Math.min(OCTAVAS['muy agudo'] - 1, Math.max(OCTAVAS['muy grave'] + 1, oct));
  const bemol = p.altN === 'bemol', escrita = p.raiz ? semiDe(p) : null;
  const ops = [];
  for (let o = centro - 1; o <= centro + 1; o++) {
    const octN = o === OCTAVA_BASE ? '' : OCT_NOMBRE[o];
    TECLAS.forEach((par, k) => {
      const negra = par.length > 1, semi = 12 * o + k;
      const nota = { ...p, raiz: par[negra && bemol ? 1 : 0], altN: negra ? (bemol ? 'bemol' : 'sostenido') : '', octN };
      ops.push({ txt: armarNota({ ...nota, acento: false }), nuevo: armarNota(nota), negra, puesto: semi === escrita,
                 octava: k ? null : armarNota({ raiz: 'do', octN }), receta: recetaDe('tecla', { semi, acorde: p.acorde }, voz) });
    });
  }
  return ops;
}

// los de siempre primero, con el cifrado al lado para quien ya toca; el escrito, aunque no sea de ésos
const ACORDES_DE_SIEMPRE = ['mayor', 'menor', 'séptima', 'menor séptima', 'mayor séptima'];
function ofrecerAcordesDe(p, voz, todos) {
  const raiz = p.raiz || 'do', escrito = acordeDeTabla(p.acorde), semi = semiDe({ ...p, raiz });
  const lista = todos ? Object.keys(ACORDES)
    : ACORDES_DE_SIEMPRE.concat(escrito && !ACORDES_DE_SIEMPRE.includes(escrito) ? [escrito] : []);
  return lista.map(a => ({ txt: a, desc: cifradoDe({ ...p, raiz, acorde: a }), glosa: ACORDES_GLOSA[a], puesto: a === escrito,
                           nuevo: armarNota({ ...p, raiz, acorde: a }), receta: recetaDe('tecla', { semi, acorde: a }, voz) }))
    .concat(todos ? [] : [{ txt: 'otros', abre: 'otros acordes' }]);
}
const ofrecerMaquinas = () => [...new Map(Object.values(maquinas()).map(m => [m.banco, m])).values()]
  .map(m => ({ txt: m.nombre, desc: m.marca, marca: m.marca, banco: m.banco, un: m.un, receta: recetaDe('maquina', m.banco) }));
