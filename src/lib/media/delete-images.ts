import { toast } from "@/lib/ui/toast";

const safeHost = (u: string) => {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
};

export type DeleteSummary = { deleted: number; failed: number; unknown: number };

/**
 * Pide al servidor que elimine de ImgBB imágenes que ya no se usan.
 * Nunca lanza error ni bloquea lo que el admin está haciendo; si alguna no se pudo borrar, avisa con un toast
 * (la imagen deja de verse en la tienda de todos modos y queda pendiente para reintentar en Configuración).
 */
export async function deleteImages(urls: string[], token: string | null, opts: { retryPending?: boolean } = {}): Promise<DeleteSummary> {
  const summary: DeleteSummary = { deleted: 0, failed: 0, unknown: 0 };
  const list = Array.from(new Set(urls.filter(Boolean)));
  if ((list.length === 0 && !opts.retryPending) || !token) return summary;
  try {
    const res = await fetch("/api/upload/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ urls: list, retryPending: opts.retryPending === true }),
    });
    const json = (await res.json().catch(() => ({}))) as { results?: { url: string; status: "deleted" | "unknown" | "failed"; detail?: string }[] };
    for (const r of json.results ?? []) summary[r.status === "deleted" ? "deleted" : r.status === "failed" ? "failed" : "unknown"]++;
    if (summary.failed > 0) {
      console.warn("[upload/delete] no se pudieron borrar:", json.results?.filter((r) => r.status === "failed"));
      toast.error(
        `No se pudo borrar ${summary.failed === 1 ? "1 foto" : `${summary.failed} fotos`} del servidor de imágenes. Ya no se ve en la tienda; puedes reintentar en Configuración → Imágenes.`
      );
    }
    // Fotos alojadas en ImgBB sin enlace de borrado guardado: no se pueden eliminar solas (se subieron antes de activar el borrado).
    const orphan = (json.results ?? []).filter((r) => r.status === "unknown" && /(^|\.)ibb\.co/.test(safeHost(r.url)));
    if (orphan.length > 0) {
      console.warn("[upload/delete] ImgBB sin enlace de borrado:", orphan);
      toast.info(
        `${orphan.length === 1 ? "Una foto no se pudo" : `${orphan.length} fotos no se pudieron`} borrar sola${orphan.length === 1 ? "" : "s"}: no tienen enlace de borrado guardado. Bórral${orphan.length === 1 ? "a" : "as"} a mano en tu cuenta de ImgBB.`
      );
    }
  } catch {
    // se ignora: lo peor que pasa es que la imagen quede en ImgBB
  }
  return summary;
}