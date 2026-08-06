// templatePlaceholders.ts — Placeholders d'images pour les templates (moteur, T4). Génère des
// data-URIs SVG (dégradés sobres + libellé) : LICENCE-LIBRES (générés), légers, self-contained, sans
// dépendance ni fichier externe ni réseau. Rendus tels quels par n'importe quel <img src> (éditeur ET
// page publique) → aucune modification du renderer. L'utilisateur remplace ensuite par ses vraies
// photos via « Ma bibliothèque ». (Le « petit set bundlé » de vraies photos licence-safe reste à
// fournir par le projet — l'agent ne peut pas sourcer d'images.)

// Palette de teintes discrètes (dégradés sombres premium), variées pour éviter la répétition.
const HUES = [40, 200, 280, 150, 20, 320, 90, 260]

// Un placeholder photo : dégradé sombre + libellé sobre. `i` fait varier la teinte (galeries).
export function photoPlaceholder(label = "Votre photo", i = 0): string {
  const h = HUES[((i % HUES.length) + HUES.length) % HUES.length]
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${h},16%,15%)'/>` +
    `<stop offset='1' stop-color='hsl(${h},24%,8%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='800' height='600' fill='url(#g)'/>` +
    `<circle cx='400' cy='250' r='46' fill='none' stroke='hsl(${h},30%,50%)' stroke-width='3'/>` +
    `<circle cx='400' cy='240' r='16' fill='none' stroke='hsl(${h},30%,50%)' stroke-width='3'/>` +
    `<path d='M360 296 l30 -34 22 22 26 -30 26 42 z' fill='hsl(${h},30%,50%)' opacity='0.7'/>` +
    `<text x='400' y='380' fill='hsl(${h},28%,58%)' font-family='DM Sans, Arial, sans-serif' font-size='26' text-anchor='middle'>${label}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Renvoie img1..imgN pour un bloc gallery (teintes variées), prêt à étaler dans le contenu.
export function placeholderGallery(n = 6, label = "Votre photo"): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 1; i <= n; i++) out[`img${i}`] = photoPlaceholder(label, i)
  return out
}

// Placeholder large (couverture / hero).
export function coverPlaceholder(label = "Votre visuel"): string {
  return photoPlaceholder(label, 0)
}
