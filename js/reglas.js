// ------------------------------------------------------------- las reglas
// lo que se transforma al vuelo mientras se tipea, y el Backspace que lo devuelve.
// Ver REGLAS.md
// moverse olvida la última regla, salvo que el cursor esté donde la regla lo dejó
document.addEventListener('selectionchange', () => {
  if (ultimaRegla && (src.selectionStart !== ultimaRegla.hasta || src.selectionEnd !== ultimaRegla.hasta)) olvidarRegla();
});

const volverALoTipeado = hacer => {
  const r = ultimaRegla;
  if (!r || src.selectionStart !== r.hasta || src.selectionEnd !== r.hasta) return false;
  if (hacer) aplicar(paso(r.desde, src.value.slice(r.desde, r.hasta), r.tipeado), { cursor: r.desde + r.tipeado.length });
  return true;
};
atajo('Backspace', 'volver a lo tipeado', volverALoTipeado);

// cada regla mira el renglón hasta el cursor, con lo recién tipeado al final, y contesta lo que va
// en su lugar o nada; «pasos» es dónde caen los pasos en el renglón
const REGLAS_DE_ENTRADA = [
  // «Lam7» o «do#», como tipea quien ya toca: al terminar la palabra queda en palabras. Ver deCifrado()
  [/(?<=^|\s)(\S+)([\s,|])$/, (m, desde, pasos) =>
    desde >= pasos.desde && desde + m[1].length <= pasos.hasta && deCifrado(m[1]) && deCifrado(m[1]) + m[2]],
];

// sólo al tipear, y no en medio de una composición: la tilde muerta no es texto, y lo pegado queda como vino.
// Con Enter, la palabra que terminó queda en el renglón de arriba
src.addEventListener('input', e => {
  if (e.isComposing || (e.inputType && e.inputType !== 'insertText' && e.inputType !== 'insertLineBreak')) return;
  if (src.selectionStart !== src.selectionEnd) return;
  const pos = src.selectionStart, base = inicioDeRenglon(src.value, pos - 1);
  const fin = src.value.indexOf('\n', pos - 1);
  const r = leerRenglon(src.value.slice(base, fin < 0 ? undefined : fin));
  if (r.clase !== 'parte') return;
  const antes = src.value.slice(base, pos);
  for (const [re, hacer] of REGLAS_DE_ENTRADA) {
    const m = re.exec(antes);
    const puesto = m && hacer(m, m.index, r.clausulas[0]);
    if (!puesto) continue;
    const desde = base + m.index;
    aplicar(paso(desde, m[0], puesto), { cursor: desde + puesto.length });
    recordarRegla(desde, puesto.length, m[0]);
    return;
  }
});
