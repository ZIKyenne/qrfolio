// Sérialise un objet JSON-LD pour une insertion SÛRE dans
// <script type="application/ld+json">. JSON.stringify n'échappe pas `<`, `>` ni
// `&` : une valeur contenant `</script>` (ex. un titre de page saisi par
// l'utilisateur) casserait la balise et permettrait un XSS stocké. On échappe
// ces caractères en séquences \uXXXX — JSON.parse les relit à l'identique, mais
// l'analyseur HTML ne voit plus de balise fermante.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}
