// Génère un short_code unique (base62, sans caractères ambigus O/0/I/l/1) pour les liens
// dynamiques. Évite les collisions dans instant_qrs ET qr_codes. `seen` permet d'éviter aussi
// les collisions AU SEIN d'un même lot (génération en masse) avant insertion.
export async function uniqueShortCode(supabase: any, seen?: Set<string>): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ""
    const bytes = new Uint8Array(7); crypto.getRandomValues(bytes)
    for (let i = 0; i < 7; i++) code += alphabet[bytes[i] % alphabet.length]
    if (seen?.has(code)) continue
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from("instant_qrs").select("id").eq("short_code", code).maybeSingle(),
      supabase.from("qr_codes").select("id").eq("short_code", code).maybeSingle(),
    ])
    if (!a && !b) { seen?.add(code); return code }
  }
  throw new Error("short_code generation failed")
}
