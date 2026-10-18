// Identificador anónimo del dispositivo (NO usa la IP, así que sobrevive a cambios de red).
// Se guarda en localStorage y en una cookie de 2 años; si el navegador borra una, se recupera de la otra.
const KEY = "aurelia-device";
const COOKIE = "aurelia_device";
const VALID = /^[a-z0-9-]{16,100}$/i;

function readCookie(): string {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}

function newId(): string {
  try {
    if (crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = "";
  try {
    id = localStorage.getItem(KEY) ?? "";
  } catch {}
  if (!VALID.test(id)) id = readCookie();
  if (!VALID.test(id)) id = newId();
  try {
    localStorage.setItem(KEY, id);
  } catch {}
  try {
    document.cookie = `${COOKIE}=${encodeURIComponent(id)}; max-age=${60 * 60 * 24 * 730}; path=/; SameSite=Lax`;
  } catch {}
  return id;
}