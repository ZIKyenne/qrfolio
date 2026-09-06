// progressionProfil.ts — Les badges et le « niveau QRowg » du profil : de la règle
// pure, qui décide ce que l'utilisateur a débloqué et où il en est.
//
// Sortie d'un composant de 3 294 lignes où elle n'était pas atteignable par un test,
// alors qu'elle décide de ce que voit chaque utilisateur en ouvrant son profil.

/** Tout ce que la progression regarde — rien d'autre. */
export type StatsJoueur = {
  plan: string
  publishedPages: number
  totalPages: number
  totalQr: number
  totalScansQR: number
  validatedRefs: number
  /** Ancienneté du compte, en mois entamés. */
  memberMonths: number
}

export type Badge = {
  id: string; emoji: string; label: string; desc: string
  category: "pages"|"scans"|"referrals"|"plan"|"milestone"
  color: string; unlocked: boolean
}

export function badges(s: StatsJoueur): Badge[] {
  const plan    = s.plan || "free"
  const isPro   = plan === "pro" || plan === "business"
  const isBiz   = plan === "business"
  const isEarly = s.memberMonths >= 0 && s.memberMonths <= 6
  return [
    { id:"first_page",     emoji:"📄", label:"Premiere page",      desc:"Publiez votre premiere page",               category:"pages",     color:"var(--accent)", unlocked: s.publishedPages >= 1      },
    { id:"builder_expert", emoji:"🏗",  label:"Builder Expert",     desc:"Publiez 10 pages differentes",              category:"pages",     color:"var(--accent)", unlocked: s.publishedPages >= 10     },
    { id:"template_master",emoji:"🎨", label:"Template Master",     desc:"Creez 3 pages ou plus",                    category:"pages",     color:"var(--accent)", unlocked: s.totalPages >= 3          },
    { id:"first_qr",       emoji:"⬛", label:"Premier QR",         desc:"Creez votre premier QR Code",              category:"scans",     color:"var(--accent)", unlocked: s.totalQr >= 1      },
    { id:"scans_100",      emoji:"📡", label:"100 Scans",          desc:"Atteignez 100 scans au total",             category:"scans",     color:"var(--accent)", unlocked: s.totalScansQR >= 100      },
    { id:"scans_1k",       emoji:"🚀", label:"1 000 Scans",        desc:"Atteignez 1 000 scans",                    category:"scans",     color:"var(--accent)", unlocked: s.totalScansQR >= 1000     },
    { id:"scans_10k",      emoji:"💫", label:"10 000 Scans",       desc:"Top 1% des utilisateurs",                  category:"scans",     color:"var(--accent)", unlocked: s.totalScansQR >= 10000    },
    { id:"first_ref",      emoji:"🤝", label:"Parrain",            desc:"Validez votre premier parrainage",         category:"referrals", color:"var(--accent)", unlocked: s.validatedRefs >= 1       },
    { id:"refs_5",         emoji:"🌟", label:"Super Parrain",      desc:"Validez 5 parrainages",                    category:"referrals", color:"var(--accent)", unlocked: s.validatedRefs >= 5       },
    { id:"pro_user",       emoji:"⚡", label:"Utilisateur Pro",    desc:"Passez au plan Pro ou superieur",          category:"plan",      color:"var(--accent)", unlocked: isPro                   },
    { id:"business_user",  emoji:"👑", label:"Business",           desc:"Atteignez le plan Business",               category:"plan",      color:"var(--accent)", unlocked: isBiz                   },
    { id:"early_user",     emoji:"🌱", label:"Early User",         desc:"Parmi les premiers utilisateurs",          category:"milestone", color:"var(--accent)", unlocked: isEarly                 },
  ]
}

export function niveau(s: StatsJoueur) {
  const score = Math.min(Math.round(
    Math.min(s.totalScansQR / 100, 30)   +
    Math.min(s.publishedPages * 5, 25)   +
    Math.min(s.validatedRefs * 5, 20)    +
    (s.plan==="business"?15 : s.plan==="pro"?10 : s.plan==="starter"?5 : 0) +
    Math.min(s.memberMonths, 10)
  ), 100)
  type LevelDef = { min:number; label:string; color:string; emoji:string; next:number }
  const LEVELS: LevelDef[] = [
    { min:0,  label:"Debutant",      color:"#A8A190", emoji:"🌱", next:15  },
    { min:15, label:"Explorateur",   color:"var(--accent)", emoji:"🧭", next:30  },
    { min:30, label:"Createur",      color:"var(--accent)", emoji:"✨", next:50  },
    { min:50, label:"Professionnel", color:"var(--accent)", emoji:"🔥", next:70  },
    { min:70, label:"Expert",        color:"var(--accent)", emoji:"💎", next:90  },
    { min:90, label:"Legende",       color:"var(--accent)", emoji:"👑", next:100 },
  ]
  const current     = [...LEVELS].reverse().find(l => score >= l.min) ?? LEVELS[0]
  const nextIdx     = LEVELS.findIndex(l => l.min === current.min) + 1
  const nextLvl     = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null
  const progressPct = nextLvl
    ? Math.round(((score - current.min) / (nextLvl.min - current.min)) * 100)
    : 100
  return { score, current, nextLvl, progressPct }
}
