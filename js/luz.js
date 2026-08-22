// ---------------------------------------------------------------- papel o tinta
// los colores salen de la rueda y no de la hoja: hay que volver a dibujar
document.getElementById('luz').addEventListener('click', () => {
  const cual = deNoche() ? 'claro' : 'oscuro';
  document.documentElement.dataset.luz = cual;
  try { localStorage.setItem(CASA + ':luz', cual); } catch (e) { /* modo privado */ }
  dibujarCinta(actual.renglones);
  pintarMarca(actual.renglones);
  repintarTexto();
});
