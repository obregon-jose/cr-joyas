"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/ui/toast";

type UserRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  has_access: boolean;
  role: "root" | "admin" | "viewer" | null;
  active: boolean | null;
};

// Pestaña "Usuarios": lista todas las cuentas de Supabase y el root da o quita acceso con un clic.
// Solo la ve el root; el servidor además lo exige con funciones protegidas (migración 003).
export default function UsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const setMsg = (m: { ok: boolean; text: string } | null) => {
    if (m) (m.ok ? toast.success : toast.error)(m.text);
  };

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("list_users");
    if (error) {
      const missing = /list_users/i.test(error.message) && /function|schema cache|find/i.test(error.message);
      setMsg({
        ok: false,
        text: missing ? "Falta ejecutar la migración 003 en Supabase (supabase/migrations/003_listar_usuarios.sql)." : error.message,
      });
    }
    setRows((data as UserRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    load();
  }, [load]);

  // Cambia el rol de una cuenta (migración 018): admin = edita todo, viewer = solo mira, none = sin acceso.
  const setRole = async (r: UserRow, role: "admin" | "viewer" | "none") => {
    if (!supabase) return;
    setBusyId(r.user_id);
    const { error } = await supabase.rpc("set_user_role", { p_user: r.user_id, p_role: role });
    setBusyId(null);
    if (error) {
      const missing = /set_user_role/i.test(error.message) && /function|schema cache|find/i.test(error.message);
      return setMsg({ ok: false, text: missing ? "Falta ejecutar la migración 018 en Supabase (supabase/migrations/018_roles_permisos.sql)." : error.message });
    }
    setMsg({ ok: true, text: role === "none" ? `${r.email} ya no tiene acceso ✓` : `${r.email} ahora es ${role === "admin" ? "administrador" : "visitante (solo lectura)"} ✓` });
    load();
  };

  const hasAccess = (r: UserRow) => Boolean(r.has_access && r.active);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl">Usuarios ({rows.length})</h2>
        <p className="mt-1 text-sm text-white/50">
          Aquí aparecen todas las cuentas creadas en Supabase. Elige qué puede hacer cada una: <b>Administrador</b> edita todo (menos usuarios), <b>Visitante</b> entra al panel pero solo puede mirar, y <b>Sin acceso</b> no entra. Solo existe un root.
          Para agregar una persona nueva, créala primero en Supabase &gt; Authentication &gt; Users (con <b>Auto Confirm User</b>)
          y recarga esta lista.
        </p>
      </div>
      {loading && <Loader2 className="h-5 w-5 animate-spin text-gold-300" />}

      <div className="space-y-3">
        {rows.map((r) => {
          const isMe = r.user_id === me;
          const access = hasAccess(r);
          const busy = busyId === r.user_id;
          return (
            <div
              key={r.user_id}
              className={`flex flex-wrap items-center gap-4 rounded-2xl border border-white/5 bg-ink-900 p-4 ${access ? "" : "opacity-70"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 truncate font-serif text-lg">
                  {r.email ?? "(sin correo)"}
                  {r.role === "root" && (
                    <span className="flex items-center gap-1 rounded-full bg-gold-300 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-widest text-ink-950">
                      <ShieldCheck className="h-3 w-3" /> Root
                    </span>
                  )}
                  {r.role === "viewer" && access && (
                    <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-sans text-[10px] uppercase tracking-widest text-white/70">
                      <Eye className="h-3 w-3" /> Visitante
                    </span>
                  )}
                  {isMe && <span className="rounded-full bg-white/10 px-2 py-0.5 font-sans text-[10px] uppercase tracking-widest">Tú</span>}
                  <span
                    className={`rounded-full px-2 py-0.5 font-sans text-[10px] uppercase tracking-widest ${
                      access ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {access ? "Con acceso" : r.has_access ? "Desactivado" : "Sin acceso"}
                  </span>
                </p>
                <p className="text-xs text-white/40">
                  Creada el {new Date(r.created_at).toLocaleDateString("es-CO")} ·{" "}
                  {r.last_sign_in_at ? `último ingreso ${new Date(r.last_sign_in_at).toLocaleDateString("es-CO")}` : "nunca ha ingresado"}
                </p>
              </div>
              {r.role === "root" ? (
                <span className="text-xs uppercase tracking-widest text-white/35">Único root</span>
              ) : (
                <div className="flex items-center gap-2">
                  {busy && <Loader2 className="h-4 w-4 animate-spin text-gold-300" />}
                  <select
                    aria-label={`Rol de ${r.email ?? "la cuenta"}`}
                    value={access ? (r.role === "viewer" ? "viewer" : "admin") : "none"}
                    disabled={busy || isMe}
                    title={isMe ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
                    onChange={(e) => setRole(r, e.target.value as "admin" | "viewer" | "none")}
                    className="input !w-auto !py-2 text-xs disabled:opacity-40"
                  >
                    <option value="none" className="bg-ink-900">Sin acceso</option>
                    <option value="viewer" className="bg-ink-900">Visitante (solo lectura)</option>
                    <option value="admin" className="bg-ink-900">Administrador</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
        {!loading && rows.length === 0 && <p className="text-white/40">No hay cuentas todavía.</p>}
      </div>

      <button onClick={() => { setLoading(true); load(); }} className="btn-ghost !px-5 !py-2.5">
        Recargar lista
      </button>
    </section>
  );
}