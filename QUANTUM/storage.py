"""Persistencia de carteras en Supabase: autenticacion de usuarios y CRUD.

Modulo puro (sin dependencias de Streamlit) para poder probarlo aislado, igual
que engine.py. La UI vive en app.py.

Modelo de seguridad: se usa la clave PUBLICABLE (`sb_publishable_...`), que por
diseño viaja en el cliente. Lo que impide que un usuario vea las carteras de
otro NO es esta clave, sino las políticas RLS de la tabla en Postgres
(`auth.uid() = user_id`). Sin RLS activado, esta clave da acceso a todo --
por eso `TABLA_SQL` de abajo la activa y la documentacion insiste en ello.
"""

from __future__ import annotations

from typing import Dict, List, Optional

# SQL de referencia para crear la tabla. No se ejecuta desde aqui (la clave
# publicable no tiene permisos DDL); se pega en el editor SQL de Supabase.
TABLA_SQL = """
create table public.carteras_guardadas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  pesos jsonb not null,
  divisa_base text not null default 'USD',
  benchmark text not null default '^GSPC',
  capital_inicial numeric not null default 10000,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  unique (user_id, nombre)
);

alter table public.carteras_guardadas enable row level security;

create policy "ver solo las propias" on public.carteras_guardadas
  for select using (auth.uid() = user_id);
create policy "insertar solo las propias" on public.carteras_guardadas
  for insert with check (auth.uid() = user_id);
create policy "actualizar solo las propias" on public.carteras_guardadas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "borrar solo las propias" on public.carteras_guardadas
  for delete using (auth.uid() = user_id);
"""

TABLA = "carteras_guardadas"


class StorageError(Exception):
    """Error de persistencia con mensaje ya legible para el usuario final."""


def _mensaje_legible(exc: Exception) -> str:
    """Traduce los errores más frecuentes de Supabase a algo accionable.
    Un 'PGRST205' crudo en pantalla no le dice nada a nadie."""
    texto = str(exc)
    if "PGRST205" in texto or "schema cache" in texto:
        return ("La tabla de carteras no existe todavia en Supabase. Ejecuta el SQL de "
                "creacion (storage.TABLA_SQL) en el editor SQL de tu proyecto.")
    if "duplicate key" in texto or "23505" in texto:
        return "Ya tienes una cartera guardada con ese nombre. Elige otro o sobrescribela."
    if "Invalid login credentials" in texto:
        return "Email o contraseña incorrectos."
    if "User already registered" in texto:
        return "Ese email ya esta registrado. Inicia sesión en vez de crear la cuenta."
    if "Password should be" in texto:
        return "La contraseña es demasiado corta (mínimo 6 caracteres)."
    if "row-level security" in texto or "42501" in texto:
        return ("Las políticas de seguridad (RLS) rechazaron la operacion. Revisa que las "
                "policies del SQL de creacion estén aplicadas.")
    return texto


def get_client(url: str, key: str):
    """Cliente de Supabase. Quien llama debe cachearlo (en Streamlit,
    st.cache_resource) para no reabrir conexiones en cada rerun."""
    from supabase import create_client

    if not url or not key:
        raise StorageError("Faltan SUPABASE_URL / SUPABASE_KEY en la configuración.")
    return create_client(url, key)


# ---------------------------------------------------------------------------
# Autenticacion
# ---------------------------------------------------------------------------

def registrar(client, email: str, password: str) -> Dict:
    """Crea una cuenta. Según la configuración del proyecto, Supabase puede
    exigir verificacion por email antes de permitir el login: en ese caso
    devuelve usuario pero sin sesión activa, y hay que avisar de ello."""
    try:
        resp = client.auth.sign_up({"email": email, "password": password})
    except Exception as exc:
        raise StorageError(_mensaje_legible(exc)) from exc

    return {
        "user": resp.user,
        "session": resp.session,
        "requiere_verificacion": resp.user is not None and resp.session is None,
    }


def iniciar_sesion(client, email: str, password: str) -> Dict:
    try:
        resp = client.auth.sign_in_with_password({"email": email, "password": password})
    except Exception as exc:
        raise StorageError(_mensaje_legible(exc)) from exc
    if resp.session is None:
        raise StorageError("No se pudo iniciar sesión.")
    return {"user": resp.user, "session": resp.session}


def cerrar_sesion(client) -> None:
    try:
        client.auth.sign_out()
    except Exception:
        # Cerrar sesion nunca debe romper la pagina: si el token ya expiro,
        # el objetivo (dejar de estar autenticado) se cumple igualmente.
        pass


def restaurar_sesion(client, access_token: str, refresh_token: str):
    """Reinstala una sesión previa en el cliente. Necesario porque Streamlit
    reconstruye el cliente cacheado tras un reinicio y perderia el login."""
    try:
        return client.auth.set_session(access_token, refresh_token)
    except Exception as exc:
        raise StorageError(_mensaje_legible(exc)) from exc


# ---------------------------------------------------------------------------
# CRUD de carteras
# ---------------------------------------------------------------------------

def listar_carteras(client) -> List[Dict]:
    """Carteras del usuario autenticado. RLS filtra por user_id en el servidor:
    aunque aquí no se pase ningun filtro, Postgres solo devuelve las propias."""
    try:
        resp = client.table(TABLA).select("*").order("actualizada_en", desc=True).execute()
    except Exception as exc:
        raise StorageError(_mensaje_legible(exc)) from exc
    return resp.data or []


def guardar_cartera(client, user_id: str, nombre: str, pesos: Dict[str, float],
                     divisa_base: str = "USD", benchmark: str = "^GSPC",
                     capital_inicial: float = 10000.0) -> Dict:
    """Crea o sobrescribe (upsert por user_id + nombre) una cartera."""
    nombre = (nombre or "").strip()
    if not nombre:
        raise StorageError("Ponle un nombre a la cartera antes de guardarla.")
    if not pesos:
        raise StorageError("La cartera no tiene ninguna posición que guardar.")

    fila = {
        "user_id": user_id,
        "nombre": nombre,
        "pesos": {k: float(v) for k, v in pesos.items()},
        "divisa_base": divisa_base,
        "benchmark": benchmark,
        "capital_inicial": float(capital_inicial),
        "actualizada_en": "now()",
    }
    try:
        resp = client.table(TABLA).upsert(fila, on_conflict="user_id,nombre").execute()
    except Exception as exc:
        raise StorageError(_mensaje_legible(exc)) from exc
    return (resp.data or [{}])[0]


def borrar_cartera(client, cartera_id: str) -> None:
    try:
        client.table(TABLA).delete().eq("id", cartera_id).execute()
    except Exception as exc:
        raise StorageError(_mensaje_legible(exc)) from exc
