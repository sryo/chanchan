// ---------------------------------------------------------------- papel o tinta
// Los colores de las partes salen de la rueda y no de la hoja, así que no se
// recalculan solos: hay que volver a dibujar la cinta y a pintar el texto.
document.getElementById('luz').addEventListener('click', () => {
  const cual = deNoche() ? 'claro' : 'oscuro';
  document.documentElement.dataset.luz = cual;
  try { localStorage.setItem(CASA + ':luz', cual); } catch (e) { /* modo privado */ }
  dibujarCinta(renglonesActuales);
  pintarMarca(renglonesActuales);
  repintarTexto();
});
