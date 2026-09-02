// ---------------------------------------------------------------- oír de a uno
// superdough a mano no le pisa el patrón al reloj: se prueba sin cortar el tema

// los bajos dos octavas abajo: si no no se les oye el cuerpo
function vozPara(voz) {
  const ins = instrumentoDe(voz || '') || INSTRUMENTOS[INSTRUMENTO_POR_DEFECTO];
  return { s: ins.sonido, oct: ins.fam === 'bajos' ? OCTAVA_BASE - 2 : OCTAVA_BASE };
}

const vozDeLinea = l => (actual.renglones.find(r => r.nro - 1 === l) || {}).voz;

function recetaDe(que, clave, voz) {
  const { s, oct } = vozPara(voz);
  if (que === 'golpe' && SONIDOS[clave])
    return { voces: [{ s: SONIDOS[clave][0], bank: MAQUINA, release: .25 }], dura: .4 };
  if (que === 'nota' && NOTAS[clave])
    return { voces: [{ s, note: NOTAS[clave] + oct }], dura: .4 };
  if (que === 'acorde' && ACORDE[norm(clave)])
    return { voces: ACORDE[norm(clave)].map(i => ({ s, note: nombreNota(i, oct) })), dura: .5 };
  if (que === 'octava' && OCTAVAS[clave])
    return { voces: [{ s, note: 'c' + OCTAVAS[clave] }], dura: .4 };
  if (que === 'alteracion')
    // se oye contra el do, si no no se entiende medio tono de qué
    return { voces: [{ s, note: 'c' + oct }, { s, note: nombreNota(clave === 'bemol' ? -1 : 1, oct), en: .35 }], dura: .3 };
  if (que === 'maquina')
    return { voces: [{ s: 'bd', bank: clave, release: .25 },
                     { s: 'sd', bank: clave, release: .25, en: .22 }], dura: .35 };
  if (que === 'instrumento') {
    const ins = instrumentoDe(clave);
    return ins && { voces: [{ s: ins.sonido, note: ins.fam === 'bajos' ? 'c2' : 'c4' }], dura: .45 };
  }
  return null;
}

const precalentados = new Set();
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
  const dormido = !sonando && (getAudioContext() || {}).state === 'suspended';
  try {
    await despertar();
    let ctx = getAudioContext();
    // por banco y muestra: el «bd» de una caja no calienta el de otra
    const clave = v => (v.bank || '') + '/' + v.s;
    const frios = receta.voces.filter(v => !precalentados.has(clave(v)));
    if (frios.length) {
      frios.forEach(v => precalentados.add(clave(v)));
      await Promise.all(frios.map(v =>
        strudel.superdough({ ...v, gain: 0 }, ctx.currentTime + .001, .01)));
      // si mientras bajaba el mouse se fue a otra cosa, ésta ya no va
      if (mia !== vueltaOir) return;
      ctx = getAudioContext();
    }
    const ahora = ctx.currentTime;   // después del await ya avanzó
    for (const voz of receta.voces)
      // el release corto corta la cola: sin él la muestra sigue un segundo y medio
      strudel.superdough({ gain: .8, release: .12, ...voz }, ahora + .03 + (voz.en || 0), receta.dura);
    if (dormido) volverADormir(receta.dura + Math.max(0, ...receta.voces.map(v => v.en || 0)));
  } catch (e) { /* si falla la muestra, mejor mudo que roto */ }
}
