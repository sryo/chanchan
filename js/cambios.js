// ---------------------------------------------------------------- cambios
// un paso es un dato: en «desde» se saca «sacado» y se pone «puesto». Se aplica, se
// invierte, viaja como json, y corre las posiciones ajenas. Ver REGLAS.md
const paso = (desde, sacado, puesto) => ({ desde, sacado, puesto });
const invertir = p => paso(p.desde, p.puesto, p.sacado);

// lo que se saca tiene que estar: si no, alguien mapeó mal y es mejor romper acá
function aplicarPaso(txt, p) {
  if (txt.substr(p.desde, p.sacado.length) !== p.sacado) throw new Error('el paso no calza con el texto');
  return txt.slice(0, p.desde) + p.puesto + txt.slice(p.desde + p.sacado.length);
}

// el paso más chico entre dos textos: el prefijo y el sufijo comunes quedan afuera
function pasoEntre(viejo, nuevo) {
  if (viejo === nuevo) return null;
  const tope = Math.min(viejo.length, nuevo.length);
  let a = 0;
  while (a < tope && viejo[a] === nuevo[a]) a++;
  let z = 0;
  while (z < tope - a && viejo[viejo.length - 1 - z] === nuevo[nuevo.length - 1 - z]) z++;
  return paso(a, viejo.slice(a, viejo.length - z), nuevo.slice(a, nuevo.length - z));
}

// una posición de antes del paso, después del paso. «lado» dice de qué lado queda si
// le insertan justo encima: -1 antes de lo puesto, 1 después. Adentro de lo sacado,
// al borde del mismo lado
function mapear(pos, p, lado = 1) {
  const fin = p.desde + p.sacado.length;
  if (pos < p.desde) return pos;
  if (pos > fin) return pos + p.puesto.length - p.sacado.length;
  const cual = !p.sacado.length ? lado : pos === p.desde ? -1 : pos === fin ? 1 : lado;
  return p.desde + (cual < 0 ? 0 : p.puesto.length);
}
// por varios pasos, en el orden en que se aplicaron
const mapearPor = (pos, pasos, lado) => pasos.reduce((q, p) => mapear(q, p, lado), pos);
// un rango sobrevive si le queda algo adentro; lo que se inserta en sus bordes queda afuera
function mapearRango(r, pasos) {
  const desde = mapearPor(r.desde, pasos, 1), hasta = mapearPor(r.hasta, pasos, -1);
  return desde < hasta ? { desde, hasta } : null;
}
