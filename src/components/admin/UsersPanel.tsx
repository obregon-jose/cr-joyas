"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/lib/supabase";

type UserRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  has_access: boolean;
  role: "root" | "admin" | null;
  active: boolean | null;
};

// Pestaña "Usuarios": lista todas las cuentas de Supabase y el root da o quita acceso con un clic.
// Solo la ve el root; el servidor además lo exige con funciones protegidas (migración 003).
export default function UsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  const setAccess = async (r: UserRow, enabled: boolean) => {
    if (!supabase) return;
    setBusyId(r.user_id);
    setMsg(null);
    const { error } = await supabase.rpc("set_user_access", { p_user: r.user_id, p_enabled: enabled });
    setBusyId(null);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: enabled ? `${r.email} ahora tiene acceso al panel ✓` : `${r.email} ya no tiene acceso ✓` });
    load();
  };

  const hasAccess = (r: UserRow) => Boolean(r.has_access && r.active);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl">Usuarios ({rows.length})</h2>
        <p className="mt-1 text-sm text-white/50">
          Aquí aparecen todas las cuentas creadas en Supabase. Da o quita el acceso al panel con un clic.
          Para agregar una persona nueva, créala primero en Supabase &gt; Authentication &gt; Users (con <b>Auto Confirm User</b>)
          y recarga esta lista.
        </p>
      </div>

      {msg && <p className={`text-sm ${msg.ok ? "text-gold-300" : "text-rose-gold"}`}>{msg.text}</p>}
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
              <button
                onClick={() => setAccess(r, !access)}
                disabled={busy || (isMe && access)}
                title={isMe && access ? "No puedes quitarte el acceso a ti mismo" : access ? "Quitar acceso" : "Dar acceso"}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest transition hover:border-gold-300 hover:text-gold-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : access ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                {access ? "Quitar acceso" : "Dar acceso"}
              </button>
            </div>
          );
        })}
        {!loading && rows.length === 0 && !msg && <p className="text-white/40">No hay cuentas todavía.</p>}
      </div>

      <button onClick={() => { setLoading(true); load(); }} className="btn-ghost !px-5 !py-2.5">
        Recargar lista
      </button>
    </section>
  );
}
