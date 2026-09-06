// ─────────────────────────────────────────────────────────────────────────────
// IDENTITÉ DE L'ÉDITEUR — la seule source pour les mentions légales.
//
// Mesuré au navigateur le 4 septembre : /legal affichait « [ Nom société ] »,
// « [ Numéro SIRET ] », « [ Adresse complète ] » — des crochets à la place de
// l'éditeur, sur une page indexée et liée depuis tous les pieds de page. La loi
// (LCEN, art. 6-III) impose ces mentions ; une page qui les promet et montre
// des crochets est pire qu'une page absente.
//
// Règle : tant qu'un champ obligatoire est vide, la page n'est PAS indexable
// et n'affiche PAS de crochets — elle dit qu'elle est en cours de mise à jour.
// Un test refuse tout crochet dans page.tsx. Il ne reste qu'à remplir ici.
// ─────────────────────────────────────────────────────────────────────────────

// ── Hébergement — UNE phrase, reprise par /security, /privacy, /legal et le
// guide RGPD. Trois descriptions différentes coexistaient (« en Europe »,
// « Union européenne », « infrastructure AWS ») sans que la région du projet
// Supabase ait été vérifiée. Tant que `region` est null, aucune page ne promet
// une zone géographique.
export const HEBERGEMENT: { region: string | null } = {
  region: null, // ex. « Union européenne (AWS eu-west-3, Paris) » — à lire dans Supabase › Settings › General
}

export function phraseHebergement(): string {
  const base = "Vos données sont hébergées chez Supabase (base de données, fichiers et authentification, sur l’infrastructure AWS) et Vercel (application)"
  return HEBERGEMENT.region ? `${base}, dans la région ${HEBERGEMENT.region}.` : `${base}.`
}

export type Editeur = {
  raisonSociale: string | null
  formeJuridique: string | null   // « SAS », « SASU », « Micro-entreprise »…
  siret: string | null            // 14 chiffres
  siege: string | null            // adresse complète
  directeurPublication: string | null
  capital?: string | null         // facultatif pour une société
  rcs?: string | null             // facultatif : « RCS Paris 123 456 789 »
  tva?: string | null             // facultatif : « FR12 123456789 »
}

/** À renseigner. Tant que c'est vide, /legal reste hors index. */
export const EDITEUR: Editeur = {
  raisonSociale: null,
  formeJuridique: null,
  siret: null,
  siege: null,
  directeurPublication: null,
  capital: null,
  rcs: null,
  tva: null,
}

const OBLIGATOIRES: (keyof Editeur)[] = ["raisonSociale", "formeJuridique", "siret", "siege", "directeurPublication"]

/** Vrai quand toutes les mentions obligatoires sont là, sans crochet ni vide. */
export function identiteRenseignee(e: Editeur = EDITEUR): boolean {
  return OBLIGATOIRES.every(k => {
    const v = e[k]
    return typeof v === "string" && v.trim().length > 0 && !/[\[\]]/.test(v)
  })
}

/** Un SIRET tient en 14 chiffres, espaces tolérés. */
export function siretValide(s: string | null | undefined): boolean {
  return !!s && /^\d{14}$/.test(s.replace(/\s/g, ""))
}
