import { describe, it, expect } from "vitest"
import { actionClavier, type EtatClavier } from "./raccourcisClavier"

// Seize raccourcis, écrits dans un useEffect de 171 lignes au milieu d'un fichier
// de 3 119 lignes, sans un test. Ils décident de supprimer un bloc, de coller, de
// tout sélectionner : ce sont des actions destructrices déclenchées par une touche.

const rien: EtatClavier = { saisieEnCours: false, blocSelectionne: false, selectionMultiple: false }
const avecBloc: EtatClavier = { ...rien, blocSelectionne: true }
const avecPlusieurs: EtatClavier = { ...rien, blocSelectionne: true, selectionMultiple: true }
const enSaisie: EtatClavier = { saisieEnCours: true, blocSelectionne: true, selectionMultiple: true }

const a = (t: Parameters<typeof actionClavier>[0], e = rien) => actionClavier(t, e)?.action ?? null

describe("les raccourcis de base", () => {
  it("Ctrl+K et Cmd+K ouvrent la palette", () => {
    expect(a({ key: "k", ctrl: true })).toBe("palette")
    expect(a({ key: "K", ctrl: true })).toBe("palette")
  })
  it("« / » ouvre la palette, sans la refermer", () => {
    expect(a({ key: "/", ctrl: false })).toBe("paletteOuvrir")
  })
  it("Ctrl+Z annule, Ctrl+Maj+Z et Ctrl+Y rétablissent", () => {
    expect(a({ key: "z", ctrl: true })).toBe("annuler")
    expect(a({ key: "z", ctrl: true, shift: true })).toBe("retablir")
    expect(a({ key: "y", ctrl: true })).toBe("retablir")
  })
  it("les panneaux se replient un par un", () => {
    expect(a({ key: "b", ctrl: true })).toBe("bibliotheque")
    expect(a({ key: "e", ctrl: true })).toBe("editeur")
    expect(a({ key: "p", ctrl: true })).toBe("apercu")
  })
})

describe("rien ne se déclenche pendant qu'on écrit", () => {
  // Le seul raccourci qui traverse un champ de saisie est la palette : c'est la
  // porte de sortie. Tous les autres laisseraient le commerçant supprimer un bloc
  // en tapant son texte.
  it("Ctrl+K reste la seule exception", () => {
    expect(a({ key: "k", ctrl: true }, enSaisie)).toBe("palette")
  })
  it("Suppr et Retour arrière ne suppriment rien dans un champ", () => {
    expect(a({ key: "Delete", ctrl: false }, enSaisie)).toBeNull()
    expect(a({ key: "Backspace", ctrl: false }, enSaisie)).toBeNull()
  })
  it("Ctrl+C, Ctrl+V, Ctrl+A rendent la main au navigateur", () => {
    for (const k of ["c", "v", "a"]) expect(a({ key: k, ctrl: true }, enSaisie), k).toBeNull()
  })
  it("« f » et « / » ne changent pas de mode au milieu d'un mot", () => {
    expect(a({ key: "f", ctrl: false }, enSaisie)).toBeNull()
    expect(a({ key: "/", ctrl: false }, enSaisie)).toBeNull()
  })
  it("Échap non plus", () => {
    expect(a({ key: "Escape", ctrl: false }, enSaisie)).toBeNull()
  })
})

describe("copier n'a de sens qu'avec quelque chose de sélectionné", () => {
  it("sans sélection, Ctrl+C laisse le navigateur copier la page", () => {
    expect(actionClavier({ key: "c", ctrl: true }, rien)).toBeNull()
  })
  it("avec un bloc ou plusieurs, l'éditeur s'en empare", () => {
    expect(a({ key: "c", ctrl: true }, avecBloc)).toBe("copier")
    expect(a({ key: "c", ctrl: true }, avecPlusieurs)).toBe("copier")
  })
  it("coller ne demande aucune sélection", () => {
    expect(a({ key: "v", ctrl: true }, rien)).toBe("coller")
  })
})

describe("supprimer", () => {
  it("sans rien de sélectionné, Suppr ne fait rien", () => {
    expect(a({ key: "Delete", ctrl: false }, rien)).toBeNull()
    expect(a({ key: "Backspace", ctrl: false }, rien)).toBeNull()
  })
  it("un bloc sélectionné : ce bloc", () => {
    expect(a({ key: "Delete", ctrl: false }, avecBloc)).toBe("supprimerBloc")
  })
  it("plusieurs : la sélection entière, jamais l'un des deux à moitié", () => {
    expect(a({ key: "Backspace", ctrl: false }, avecPlusieurs)).toBe("supprimerSelection")
  })
})

describe("les flèches du canvas", () => {
  it("sans bloc sélectionné, la page défile normalement", () => {
    expect(actionClavier({ key: "ArrowDown", ctrl: false }, rien)).toBeNull()
  })
  it("flèche seule : on change de bloc", () => {
    const d = actionClavier({ key: "ArrowDown", ctrl: false }, avecBloc)!
    expect(d.action).toBe("deplacerSelection")
    expect(d.direction).toBe(1)
    expect(actionClavier({ key: "ArrowUp", ctrl: false }, avecBloc)!.direction).toBe(-1)
  })
  it("Alt+flèche : on déplace le bloc", () => {
    const d = actionClavier({ key: "ArrowUp", ctrl: false, alt: true }, avecBloc)!
    expect(d.action).toBe("deplacerBloc")
    expect(d.direction).toBe(-1)
  })
  it("Ctrl+flèche et Maj+flèche restent au navigateur", () => {
    expect(actionClavier({ key: "ArrowDown", ctrl: true }, avecBloc)).toBeNull()
    expect(actionClavier({ key: "ArrowDown", ctrl: false, shift: true }, avecBloc)).toBeNull()
  })
})

describe("le mode Focus", () => {
  it("Ctrl+F le bascule, et confisque la recherche du navigateur", () => {
    const d = actionClavier({ key: "f", ctrl: true }, rien)!
    expect(d.action).toBe("focus")
    expect(d.bloquer).toBe(true)
  })
  it("« f » seul le bascule aussi, sans rien confisquer", () => {
    const d = actionClavier({ key: "f", ctrl: false }, rien)!
    expect(d.action).toBe("focus")
    expect(d.bloquer).toBe(false)
  })
  it("Alt+F ou Maj+F ne le déclenchent pas", () => {
    expect(actionClavier({ key: "f", ctrl: false, alt: true }, rien)).toBeNull()
    expect(actionClavier({ key: "f", ctrl: false, shift: true }, rien)).toBeNull()
  })
})

describe("ce que la touche confisque au navigateur", () => {
  it("Échap ne bloque rien : une modale ouverte doit pouvoir se fermer aussi", () => {
    expect(actionClavier({ key: "Escape", ctrl: false }, rien)!.bloquer).toBe(false)
  })
  it("tout le reste bloque, sinon le navigateur ferait sa propre action", () => {
    for (const t of [{ key: "k", ctrl: true }, { key: "b", ctrl: true }, { key: "p", ctrl: true }, { key: "a", ctrl: true }]) {
      expect(actionClavier(t, avecBloc)!.bloquer, t.key).toBe(true)
    }
  })
})

describe("une touche quelconque ne déclenche rien", () => {
  it("les lettres sans rôle, et les touches inconnues", () => {
    for (const k of ["q", "w", "1", "Tab", "Enter", "Shift"]) {
      expect(a({ key: k, ctrl: false }), k).toBeNull()
    }
  })
})
