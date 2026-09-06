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

// ── Hébergement — UNE phrase, reprise par /security, /privacy et le guide RGPD.
// Trois descriptions différentes coexistaient (« en Europe », « Union
// européenne », « infrastructure AWS ») sans qu'aucune région ait été vérifiée.
// Tant qu'un champ est null, aucune page ne promet la zone correspondante.
//
// Relevé le 6 septembre, directement dans les deux comptes :
//  · la base de données Supabase est en eu-west-1 (Irlande) ;
//  · les fonctions Vercel tournent en iad1 (Washington, États-Unis) — c'est la
//    région par défaut du plan Hobby.
//
// Les deux sont donc DIFFÉRENTES, et l'ancienne forme de cette phrase ne savait
// dire qu'une seule région : elle aurait appliqué celle des données à
// l'application, ce qui aurait été faux sur une page qui parle de RGPD. Les deux
// sont désormais nommées séparément. Si l'application doit rejoindre l'Union
// européenne, la région des fonctions se change dans Vercel › Settings ›
// Functions (cdg1 = Paris) ; il suffira alors de corriger la ligne ci-dessous.
export const HEBERGEMENT: { donnees: string | null; application: string | null } = {
  donnees: "l’Union européenne (AWS eu-west-1, Irlande)",
  application: "les États-Unis (Vercel iad1, Washington)",
}

export function phraseHebergement(): string {
  const base = "Vos données sont hébergées chez Supabase (base de données, fichiers et authentification, sur l’infrastructure AWS) et Vercel (application)"
  const d = HEBERGEMENT.donnees, a = HEBERGEMENT.application
  if (d && a) return `${base}. La base de données est située dans ${d} ; l’application est servie depuis ${a}.`
  if (d) return `${base}. La base de données est située dans ${d}.`
  if (a) return `${base}. L’application est servie depuis ${a}.`
  return `${base}.`
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
