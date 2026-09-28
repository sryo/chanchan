// ---------------------------------------------------------------- oír de a uno
// superdough a mano no le pisa el patrón al reloj: se prueba sin cortar el tema

// se oye en la octava en que suena, la de casa del instrumento
function vozPara(voz) {
  const ins = instrumentoDe(voz || '') || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO];
  return { s: ins.sonido, oct: casaDe(ins) };
}

const renglonDeLinea = l => actual.renglones.find(r => r.nro - 1 === l) || {};
const vozDeLinea = l => renglonDeLinea(l).voz;
const modoDeLinea = l => renglonDeLinea(l).modo;

function recetaDe(que, clave, voz) {
  const { s, oct } = vozPara(voz);
  if (que === 'golpe' && SONIDOS[clave]) {
    const pieza = SONIDOS[clave][0];
    return { voces: [{ s: pieza, bank: pieza in DE_MANO ? MANO : MAQUINA, release: .25 }], dura: .4 };
  }
  if (que === 'nota' && NOTAS[clave])
    return { voces: [{ s, note: NOTAS[clave] + oct }], dura: .4 };
  if (que === 'acorde' && ACORDE[norm(clave)])
    return { voces: ACORDE[norm(clave)].map(i => ({ s, note: nombreNota(i, oct) })), dura: .5 };
  if (que === 'octava' && OCTAVAS[clave])
    return { voces: [{ s, note: 'c' + octavaQueSuena(clave, oct) }], dura: .4 };
  if (que === 'alteracion')
    // se oye contra el do, si no no se entiende medio tono de qué
    return { voces: [{ s, note: 'c' + oct }, { s, note: nombreNota(clave === 'bemol' ? -1 : 1, oct), en: .35 }], dura: .3 };
  if (que === 'maquina') {
    // las dos más graves que tenga: un cajón no tiene hi-hat, y unos bongós no tienen bombo de verdad
    const tiene = (cajaDe(clave) || {}).piezas || new Set(['bd', 'sd']);
    const dos = Object.values(SONIDOS).map(s => s[0]).filter(p => tiene.has(p)).slice(0, 2);
    return { voces: dos.map((s, i) => ({ s, bank: clave, release: .25, en: i * .22 })), dura: .35 };
  }
  // una frase se oye en una nota de la parte sólo si una nota la dice entera: el volumen, el color,
  // el lugar, el largo; la velocidad, el swing o lo que crece necesitan el tema, y se callan
  if (que === 'modificador') {
    const mod = modificadorDe(clave);
    if (!mod || mod[1] === 'mute' || /§|rand|saw|fast|slow|ply|rev|swing|arp|transpose/.test(mod[1])) return null;
    const params = {};
    let dura = .6;
    for (const [, k, v] of mod[1].matchAll(/\.(\w+)\(([\d.]+)\)/g)) if (k === 'clip') dura *= +v; else params[k] = +v;
    const vel = mod[1].match(/velocity\(([\d.]+)\)/);
    if (vel) params.velocity = +vel[1];
    const golpe = SONIDOS[voz || ''];
    return { voces: [{ ...(golpe ? { s: golpe[0], bank: MAQUINA } : { s, note: 'c' + oct }), ...params }], dura };
  }
  if (que === 'instrumento') {
    const ins = instrumentoDe(clave);
    return ins && { voces: [{ s: ins.sonido, note: 'c' + casaDe(ins) }], dura: .45 };
  }
  return null;
}

const precalentados = new Set();
// por banco, muestra y nota: cada nota del GM es otro archivo, y el «bd» de una caja no calienta el de
// otra. Se anota recién cuando bajó: una que falló se vuelve a pedir
const claveMuestra = v => [v.bank || '', v.s, v.note ?? '', v.n ?? ''].join('/');
async function calentar(voces) {
  const ctx = getAudioContext();
  const frios = [...new Map(voces.filter(v => !precalentados.has(claveMuestra(v))).map(v => [claveMuestra(v), v])).values()];
  await Promise.all(frios.map(v => strudel.superdough({ ...v, gain: 0 }, ctx.currentTime + .001, .01)
    .then(() => precalentados.add(claveMuestra(v)), () => {})));
  return frios.length;
}

// lo que suena en la primera vuelta larga de cada parte, bajado antes de arrancar; no espera
// más que un par de segundos: mejor arrancar con un golpe mudo que no arrancar
function calentarTema(r) {
  const voces = [];
  for (const p of r.partes) {
    try { for (const h of eval(p.codigo).queryArc(0, Math.min(r.vueltas, 16))) if (h.value && h.value.s) voces.push(h.value); }
    catch (e) { /* la que strudel no entiende ya avisó */ }
  }
  return Promise.race([calentar(voces), new Promise(ok => setTimeout(ok, 2500))]);
}
let vueltaOir = 0, relojDormir;

// parar no detiene el reloj de strudel, sólo suspende el audio (silenciar()):
// despertarlo para la muestra revive el tema, así que se lo vuelve a dormir
function volverADormir(dura) {
  clearTimeout(relojDormir);
  relojDormir = setTimeout(() => {
    const ctx = getAudioContext();
    if (!sonando && ctx && ctx.state === 'running') ctx.suspend();
  }, (dura + .6) * 1000);
}

// superdough agenda a 30 ms y la muestra se baja al usarla, así que la primera
// vez llega tarde y no suena: se dispara muda y se espera a que el buffer esté
async function oir(receta) {
  if (!motorListo || !receta) return;
  const mia = ++vueltaOir;
  clearTimeout(relojDormir);
  try {
    await despertar();
    let ctx = getAudioContext();
    if (await calentar(receta.voces)) {
      // si mientras bajaba el mouse se fue a otra cosa, ésta ya no va
      if (mia !== vueltaOir) return;
      ctx = getAudioContext();
    }
    const ahora = ctx.currentTime;   // después del await ya avanzó
    for (const voz of receta.voces)
      // el release corto corta la cola: sin él la muestra sigue un segundo y medio
      strudel.superdough({ gain: .8, release: .12, ...voz }, ahora + .03 + (voz.en || 0), receta.dura);
    if (!sonando) volverADormir(receta.dura + Math.max(0, ...receta.voces.map(v => v.en || 0)));
  } catch (e) { /* si falla la muestra, mejor mudo que roto */ }
}
