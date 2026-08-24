// Diagnostic d'un QR code déjà fabriqué, à partir de son image.
//
// Règle que je me suis fixée ici : ne dire que ce qui se mesure. Pas de « note
// de qualité » inventée, pas de « score de netteté ». Chaque verdict ci-dessous
// se déduit de l'image ou du contenu décodé, et peut être recalculé à la main.
//
// Aucune image ne quitte le navigateur : tout est calculé sur place.

/** Un point de l'image, en pixels. */
export type Point = { x: number; y: number }

/** Ce que le décodeur rend quand il a réussi à lire le code. */
export type Lecture = {
  /** Le texte encodé. */
  texte: string
  /** Les trois coins repérés (haut-gauche, haut-droit, bas-gauche). */
  hautGauche: Point
  hautDroit: Point
  basGauche: Point
  /** Largeur et hauteur de l'image analysée. */
  largeurImage: number
  hauteurImage: number
  /** Luminance moyenne (0-255) des pixels sombres et clairs du code. */
  luminanceSombre: number
  luminanceClaire: number
}

export type Gravite = "bloquant" | "risque" | "bon"

export type Constat = {
  cle: "lecture" | "contraste" | "marge" | "module" | "destination"
  gravite: Gravite
  titre: string
  detail: string
  /** Ce qu'il faut faire, seulement quand il y a quelque chose à faire. */
  correction?: string
  /** La valeur mesurée, affichée telle quelle pour que le lecteur vérifie. */
  mesure?: string
}

const arrondi = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d

/** Marge d'erreur de mesure de la marge blanche, en modules. */
export const TOLERANCE_MARGE = 0.5

/** Distance entre deux points, en pixels. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Contraste entre les modules sombres et clairs, selon la formule de luminance
 * relative du W3C. Un scanner a besoin de nettement plus qu'un œil humain : la
 * norme ISO 18004 demande un contraste franc, et en pratique tout ce qui passe
 * sous 3:1 devient capricieux selon le téléphone et l'éclairage.
 */
export function contraste(luminanceSombre: number, luminanceClaire: number): number {
  const rel = (v: number) => {
    const s = Math.min(255, Math.max(0, v)) / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const a = rel(luminanceClaire)
  const b = rel(luminanceSombre)
  const clair = Math.max(a, b)
  const sombre = Math.min(a, b)
  return (clair + 0.05) / (sombre + 0.05)
}

/**
 * Taille d'un module en pixels, déduite de la largeur du code et du nombre de
 * modules. Le nombre de modules se retrouve à partir de la version du QR :
 * 21 modules en version 1, +4 par version.
 */
export function tailleModule(largeurCodePx: number, nombreModules: number): number {
  if (nombreModules <= 0) return 0
  return largeurCodePx / nombreModules
}

/**
 * Marge blanche autour du code, exprimée en modules. La norme demande quatre
 * modules ; c'est la première chose que les gens suppriment en recadrant, et
 * c'est une des premières causes de code illisible.
 */
export function margeEnModules(l: Lecture, moduleP: number): number {
  if (moduleP <= 0) return 0
  const xs = [l.hautGauche.x, l.hautDroit.x, l.basGauche.x]
  const ys = [l.hautGauche.y, l.hautDroit.y, l.basGauche.y]
  const marges = [
    Math.min(...xs),
    Math.min(...ys),
    l.largeurImage - Math.max(...xs),
    l.hauteurImage - Math.max(...ys),
  ]
  return Math.min(...marges) / moduleP
}

/** Analyse du texte décodé, sans aucun appel réseau. */
export function analyserDestination(texte: string): Constat {
  const t = texte.trim()

  if (/^https:\/\//i.test(t)) {
    const raccourcisseurs = /^https:\/\/(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|ow\.ly|cutt\.ly)\//i
    if (raccourcisseurs.test(t)) {
      return {
        cle: "destination", gravite: "risque",
        titre: "L'adresse passe par un raccourcisseur",
        detail: "Le code mène à un service de raccourcissement. Si ce service ferme ou supprime le lien, le code imprimé devient inutilisable et vous ne pouvez rien y faire.",
        correction: "Utilisez une adresse que vous contrôlez, ou un QR code dynamique dont vous gardez la main sur la redirection.",
        mesure: t.slice(0, 120),
      }
    }
    return {
      cle: "destination", gravite: "bon",
      titre: "L'adresse est en HTTPS",
      detail: "Le téléphone ouvrira la page sans avertissement de sécurité.",
      mesure: t.slice(0, 120),
    }
  }

  if (/^http:\/\//i.test(t)) {
    return {
      cle: "destination", gravite: "risque",
      titre: "L'adresse est en HTTP, pas en HTTPS",
      detail: "Les navigateurs mobiles affichent « Non sécurisé » sur ces pages. Une partie des gens referme à ce moment-là.",
      correction: "Passez la destination en HTTPS avant d'imprimer.",
      mesure: t.slice(0, 120),
    }
  }

  if (/^(mailto|tel|sms|geo|wifi|matmsg|begin:vcard)/i.test(t)) {
    return {
      cle: "destination", gravite: "bon",
      titre: "Le code contient une action directe",
      detail: "Il ne mène pas à une page mais déclenche une action sur le téléphone : appel, message, contact ou connexion.",
      mesure: t.slice(0, 120),
    }
  }

  return {
    cle: "destination", gravite: "bon",
    titre: "Le code contient du texte",
    detail: "Il n'ouvre aucune page : le téléphone affichera ce texte tel quel.",
    mesure: t.slice(0, 120),
  }
}

export type Diagnostic = {
  lisible: boolean
  constats: Constat[]
  /** Phrase de résumé, celle qu'on lit en premier. */
  verdict: string
}

/** Diagnostic quand le décodeur n'a rien trouvé dans l'image. */
export function diagnosticIllisible(): Diagnostic {
  return {
    lisible: false,
    verdict: "Aucun QR code n'a pu être lu dans cette image.",
    constats: [{
      cle: "lecture", gravite: "bloquant",
      titre: "Le code n'a pas été lu",
      detail: "Soit l'image ne contient pas de QR code, soit il est trop flou, trop petit, coupé, ou d'un contraste insuffisant pour être décodé.",
      correction: "Reprenez le fichier d'origine plutôt qu'une photo ou une capture d'écran, et vérifiez que le code entier est visible avec sa marge blanche.",
    }],
  }
}

/** Diagnostic complet à partir d'une lecture réussie. */
export function diagnostiquer(l: Lecture, nombreModules: number): Diagnostic {
  const constats: Constat[] = []

  constats.push({
    cle: "lecture", gravite: "bon",
    titre: "Le code a été lu",
    detail: "Un décodeur a réussi à extraire le contenu de cette image. C'est la seule preuve qui compte vraiment.",
  })

  const c = contraste(l.luminanceSombre, l.luminanceClaire)
  constats.push(
    c >= 7
      ? { cle: "contraste", gravite: "bon", titre: "Le contraste est franc", detail: "Les modules sombres et clairs se distinguent nettement, y compris sous un éclairage médiocre.", mesure: `${arrondi(c)}:1` }
      : c >= 3
      ? { cle: "contraste", gravite: "risque", titre: "Le contraste est juste", detail: "Le code passe sur un bon téléphone en bonne lumière, et devient capricieux ailleurs : vitrine le soir, salle sombre, appareil ancien.", correction: "Foncez la couleur des modules ou éclaircissez le fond. Du noir sur blanc reste ce qui se lit le mieux.", mesure: `${arrondi(c)}:1` }
      : { cle: "contraste", gravite: "bloquant", titre: "Le contraste est insuffisant", detail: "À ce niveau, une partie des téléphones ne verra pas la différence entre les modules et le fond.", correction: "Repassez à des modules très sombres sur un fond très clair avant toute impression.", mesure: `${arrondi(c)}:1` },
  )

  const largeur = distance(l.hautGauche, l.hautDroit)
  const moduleP = tailleModule(largeur, nombreModules)
  constats.push(
    moduleP >= 4
      ? { cle: "module", gravite: "bon", titre: "La définition est suffisante", detail: "Chaque module occupe assez de pixels pour rester net une fois imprimé.", mesure: `${arrondi(moduleP)} pixels par module` }
      : moduleP >= 2
      ? { cle: "module", gravite: "risque", titre: "La définition est faible", detail: "À l'écran cela passe, mais à l'impression les modules vont baver et se toucher.", correction: "Réexportez le code en plus grand, ou en SVG/PDF qui ne perd rien à l'agrandissement.", mesure: `${arrondi(moduleP)} pixels par module` }
      : { cle: "module", gravite: "bloquant", titre: "L'image est trop petite", detail: "Les modules ne font qu'un ou deux pixels : l'impression les rendra illisibles.", correction: "Repartez du fichier d'origine et exportez au moins 1000 pixels de côté, ou en vectoriel.", mesure: `${arrondi(moduleP)} pixels par module` },
  )

  // Les repères que rend le décodeur tombent sur le coin du motif de position, à
  // environ un demi-module près. Sans cette tolérance, un code irréprochable se
  // faisait reprocher sa marge tout en affichant « 4 modules » — incohérence
  // relevée en passant de vraies images dans le diagnostic.
  const margeMesuree = margeEnModules(l, moduleP)
  const marge = margeMesuree + TOLERANCE_MARGE
  constats.push(
    marge >= 4
      ? { cle: "marge", gravite: "bon", titre: "La marge blanche est respectée", detail: "Le code garde les quatre modules de silence que demande la norme.", mesure: `${arrondi(margeMesuree)} modules` }
      : marge >= 1
      ? { cle: "marge", gravite: "risque", titre: "La marge blanche est trop courte", detail: "Le code est serré de trop près. Il se lit encore ici, mais posé sur un fond coloré ou une photo, il cessera de se lire.", correction: "Laissez autour du code un blanc large d'environ quatre modules, soit à peu près l'épaisseur d'un des trois carrés d'angle.", mesure: `${arrondi(margeMesuree)} modules` }
      : { cle: "marge", gravite: "bloquant", titre: "Le code n'a plus de marge", detail: "Le code touche le bord de l'image. Sur un support imprimé, il se retrouvera collé au texte ou à la découpe et ne se lira plus.", correction: "Recadrez en laissant un blanc d'environ quatre modules tout autour.", mesure: `${arrondi(margeMesuree)} modules` },
  )

  constats.push(analyserDestination(l.texte))

  const bloquants = constats.filter(c2 => c2.gravite === "bloquant").length
  const risques = constats.filter(c2 => c2.gravite === "risque").length
  const verdict = bloquants > 0
    ? "Ce code se lit sur cette image, mais il ne survivra pas à l'impression en l'état."
    : risques > 0
    ? `Ce code fonctionne, avec ${risques === 1 ? "un point" : `${risques} points`} à corriger avant un gros tirage.`
    : "Ce code est prêt à imprimer."

  return { lisible: true, constats, verdict }
}

/** Nombre de modules d'un QR code, d'après sa version (1 à 40). */
export function modulesDeLaVersion(version: number): number {
  return 21 + (Math.min(40, Math.max(1, Math.round(version))) - 1) * 4
}

/**
 * Luminance moyenne des modules sombres et des modules clairs, mesurée dans le
 * rectangle du code. On sépare les deux populations par la méthode d'Otsu :
 * elle cherche le seuil qui rend les deux groupes les plus distincts possible,
 * plutôt que de supposer que « sombre » veut dire « proche du noir » — ce qui
 * serait faux pour un code bleu nuit sur crème.
 */
export function mesurerLuminances(
  gris: Uint8ClampedArray | number[],
  largeur: number,
  boite: { x0: number; y0: number; x1: number; y1: number },
): { sombre: number; claire: number } {
  const valeurs: number[] = []
  const x0 = Math.max(0, Math.floor(boite.x0)), x1 = Math.floor(boite.x1)
  const y0 = Math.max(0, Math.floor(boite.y0)), y1 = Math.floor(boite.y1)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const v = gris[y * largeur + x]
      if (typeof v === "number") valeurs.push(v)
    }
  }
  if (valeurs.length === 0) return { sombre: 0, claire: 255 }

  const hist = new Array(256).fill(0)
  for (const v of valeurs) hist[Math.min(255, Math.max(0, Math.round(v)))]++

  const total = valeurs.length
  let somme = 0
  for (let i = 0; i < 256; i++) somme += i * hist[i]

  let sommeB = 0, poidsB = 0, meilleur = -1, seuil = 128
  for (let i = 0; i < 256; i++) {
    poidsB += hist[i]
    if (poidsB === 0) continue
    const poidsF = total - poidsB
    if (poidsF === 0) break
    sommeB += i * hist[i]
    const moyB = sommeB / poidsB
    const moyF = (somme - sommeB) / poidsF
    const variance = poidsB * poidsF * (moyB - moyF) ** 2
    if (variance > meilleur) { meilleur = variance; seuil = i }
  }

  let sSombre = 0, nSombre = 0, sClaire = 0, nClaire = 0
  for (const v of valeurs) {
    if (v <= seuil) { sSombre += v; nSombre++ } else { sClaire += v; nClaire++ }
  }

  // Une seule population : la zone analysée est unie. Ne rien inventer — rendre
  // deux fois la même valeur, donc un contraste de 1, plutôt que de compléter
  // avec du blanc par défaut et d'annoncer un contraste qui n'existe pas.
  if (nSombre === 0 || nClaire === 0) {
    const moyenne = valeurs.reduce((a, b) => a + b, 0) / valeurs.length
    return { sombre: moyenne, claire: moyenne }
  }

  return { sombre: sSombre / nSombre, claire: sClaire / nClaire }
}
