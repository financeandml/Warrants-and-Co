/* ============================================================================
   Tema de la interfaz — solo claro.
   La aplicación no ofrece cambio de tema ni sigue la preferencia del sistema.
   ============================================================================ */

export function temaVigente() {
  return 'claro';
}

export function aplicarTema() {
  document.documentElement.dataset.tema = 'claro';
  document.dispatchEvent(new CustomEvent('tema:cambiado', { detail: { tema: 'claro' } }));
}

export function iniciarTema() {
  document.documentElement.dataset.tema = 'claro';
  document.dispatchEvent(new CustomEvent('tema:cambiado', { detail: { tema: 'claro' } }));
}
