/* ============================================================================
   Tema de la interfaz — claro, oscuro o el del sistema.
   La eleccion persiste entre sesiones; sin eleccion explicita se sigue la
   preferencia del sistema operativo.
   ========================================================================= */

const CLAVE = 'warrants.tema';
const consulta = window.matchMedia('(prefers-color-scheme: dark)');

function almacenado() {
  try {
    const t = localStorage.getItem(CLAVE);
    return t === 'claro' || t === 'oscuro' ? t : null;
  } catch {
    return null; // almacenamiento no disponible (modo privado, politica del navegador)
  }
}

/** Tema efectivo: el elegido o, en su defecto, el del sistema. */
export function temaVigente() {
  return almacenado() ?? (consulta.matches ? 'oscuro' : 'claro');
}

function reflejarBotones() {
  const vigente = temaVigente();
  for (const boton of document.querySelectorAll('.conmutador-tema button')) {
    boton.setAttribute('aria-pressed', String(boton.dataset.tema === vigente));
  }
}

/** Aplica un tema. Con `null` se vuelve a seguir al sistema. */
export function aplicarTema(tema) {
  if (tema === 'claro' || tema === 'oscuro') {
    document.documentElement.dataset.tema = tema;
    try { localStorage.setItem(CLAVE, tema); } catch { /* sin persistencia */ }
  } else {
    delete document.documentElement.dataset.tema;
    try { localStorage.removeItem(CLAVE); } catch { /* sin persistencia */ }
  }
  reflejarBotones();
  document.dispatchEvent(new CustomEvent('tema:cambiado', { detail: { tema: temaVigente() } }));
}

export function iniciarTema() {
  for (const boton of document.querySelectorAll('.conmutador-tema button')) {
    boton.addEventListener('click', () => {
      // Volver a pulsar el tema activo devuelve el control a la preferencia del sistema.
      aplicarTema(temaVigente() === boton.dataset.tema ? null : boton.dataset.tema);
    });
  }

  // Si no hay eleccion explicita, se sigue al sistema en caliente.
  consulta.addEventListener('change', () => {
    if (!almacenado()) {
      reflejarBotones();
      document.dispatchEvent(new CustomEvent('tema:cambiado', { detail: { tema: temaVigente() } }));
    }
  });

  reflejarBotones();
}
