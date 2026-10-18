/**
 * Pide al servidor que elimine de ImgBB imágenes que ya no se usan.
 * Es "mejor esfuerzo": nunca lanza error ni bloquea lo que el admin está haciendo.
 */
export async function deleteImages(urls: string[], token: string | null) {
  const list = Array.from(new Set(urls.filter(Boolean)));
  if (list.length === 0 || !token) return;
  try {
    await fetch("/api/upload/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ urls: list }),
    });
  } catch {
    // se ignora: lo peor que pasa es que la imagen quede en ImgBB
  }
}