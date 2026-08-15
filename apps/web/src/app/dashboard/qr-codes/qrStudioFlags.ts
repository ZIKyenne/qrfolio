// Flag « QR Studio Zero » (refonte UX « zéro scroll ») — OPT-IN, côté client uniquement.
// L'ancien QR Studio reste le défaut (zéro régression) ; le nouveau shell se teste via l'URL
// `?zero=1` (persisté localStorage), et se désactive via `?zero=0`. Le propriétaire QA puis bascule.
export function qrStudioZeroEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    const u = new URL(window.location.href)
    const p = u.searchParams.get("zero")
    if (p === "1") { localStorage.setItem("qrowg-qr-zero", "1"); return true }
    if (p === "0") { localStorage.removeItem("qrowg-qr-zero"); return false }
    return localStorage.getItem("qrowg-qr-zero") === "1"
  } catch { return false }
}
