// ---------------------------------------------------------------- texto
// no sabe nada del idioma: acá no hay ni una nota ni un instrumento
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const esc = s => s.replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));

function distancia(a, b) {
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++)
      m[i][j] = b[i-1] === a[j-1] ? m[i-1][j-1]
        : Math.min(m[i-1][j-1] + 1, m[i][j-1] + 1, m[i-1][j] + 1);
  return m[b.length][a.length];
}

function palabras(txt, base) {
  const out = [], re = /\S+/g;
  let m;
  while ((m = re.exec(txt))) out.push({ w: m[0], i: base + m.index });
  return out;
}
