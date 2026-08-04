# Builder refondu — QA staging & décision production (C08)

> **Statut d'exécution honnête.** L'agent ne peut pas exécuter la QA authentifiée réelle : son sandbox
> ne résout pas `*.supabase.co` (`ENOTFOUND`, vérifié le jour du run) et n'a pas accès à Vercel/staging.
> Ce document est donc à la fois (1) le **relevé des portes locales réellement exécutées** et (2) un
> **runbook + gabarit de résultats** à dérouler par un humain sur un environnement où Supabase est
> joignable. **Aucun résultat de connexion/sauvegarde/publication n'est inventé.** Commit de base : `73dec171`.

## A. État initial (vérifié)

| Élément | Valeur |
| --- | --- |
| HEAD | `73dec171` (C07) |
| Arbre | propre (hors `.claude/` + `skills-lock.json`, exclus de la mission) |
| Flag par défaut | **OFF** (`NEXT_PUBLIC_BUILDER_REDESIGN` non défini → `false`) |
| Activation | par variable d'env (staging) / localStorage / query (dev) — cf. `builderFlags.ts` |
| `.env` tracké | **aucun** (aucun secret dans Git) |

## Portes locales réellement exécutées (ce run)

| Porte | Résultat |
| --- | --- |
| `pnpm type-check` | **0 erreur** |
| `npx vitest run` | **1554 passés** (77 fichiers) |
| `pnpm build` | **Compiled successfully, 84/84** |
| `pnpm test:e2e` | **77 passés / 34 ignorés / 0 échec réel** (1 flake de compilation à froid `builder-canvas › plein écran`, **repassé vert** en isolation) |
| `VISUAL=1 … builder-visual.spec.ts` | **2 passés** (desktop + mobile), 2 ignorés (cross-projet) |
| Joignabilité Supabase (sandbox) | **INJOIGNABLE** (`ENOTFOUND`) → QA authentifiée **non exécutable ici** |

## B. Environnement staging (à renseigner par l'opérateur)

| Élément | Valeur (ne pas mettre de secret) |
| --- | --- |
| URL preview/staging | `https://…vercel.app` (à remplir) |
| Base Supabase | projet **dev/staging** (jamais prod, jamais données clients) |
| Compte de test | `Compte de test staging : configuré` (ne jamais afficher email/mot de passe) |
| Navigateur(s) | Chrome/Firefox/Safari desktop + mobile réel si possible |

## Procédure de déploiement staging (aucune modification de la production)

1. Déployer la branche `main` en **Vercel Preview** (ou staging dédié).
2. Sur **cet environnement uniquement**, définir la variable :
   ```env
   NEXT_PUBLIC_BUILDER_REDESIGN=1
   ```
   (Project → Settings → Environment Variables → *Preview* — **pas** *Production*.)
3. Vérifier que les variables Supabase **publiques** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) pointent la base **dev/staging**. Ne jamais exposer de clé `service_role` côté client.
4. Redéployer le preview. La **production reste OFF** (variable non définie en prod).
5. Ouvrir le preview, se connecter avec le **compte de test**, ouvrir le Builder → le nouveau shell doit apparaître.

## Runbook QA (à dérouler sur staging) + gabarit de résultats

Renseigner chaque ligne : ✅ / ❌ + note. **Ne rien cocher tant que le scénario n'a pas été réellement exécuté.**

### C. Activation canary
- [ ] Prod = ancien Builder (flag OFF) ; staging = nouveau Builder.
- [ ] Flag résolu (diagnostic dev) ; **aucun double shell** ; **aucune double nav mobile** ; aucune UI legacy ne capte les clics.
- [ ] Rollback = désactiver la variable (aucune migration).

### D. Desktop 1440×900 — parcours complet (§7, 26 étapes)
- [ ] connexion → dashboard → créer page vide → ouvrir Builder → bibliothèque → recherche → +heading/values/pricing → +1 bloc legacy → Simple → Avancé → device canvas → zoom → aperçu → **insertion entre 2 blocs** → déplacer → dupliquer → masquer → verrouiller → undo → redo → **sauvegarder (Enregistré)** → **publier** → page publique → retour Builder.

### E. Bibliothèque (§8)
- [ ] recherche accents + multi-mots ; catégories ; recommandés ; récents ; favoris ; premium ; aucun résultat ; ajout ; double-clic (1 seul ajout) ; insertion ; sélection+scroll après ajout ; 0 erreur console.

### F. Réglages — 10 pilotes + fallback legacy (§9)
- [ ] pilotes (heading/bio/values/pricing/image/video/contact_form/product_catalog/timeline/google_maps_embed) : Simple/Avancé, sections, modif, reset (champ/section/bloc) + confirmation, undo, save, reload.
- [ ] non-pilotes : fallback legacy, **aucun champ perdu**, un seul panel, save conserve tout.

### G. Canvas (§10)
- [ ] devices (mobile/tablet/desktop/fluid) ; portrait/paysage ; zoom 50/100/150 ; Ajuster ; Centrer ; Aperçu↔Édition ; Focus ; page longue + retour haut ; sélection ; insertion ; scroll ; **DnD** — overlays alignés, aucun décalage après zoom, aucun overflow global.

### H. Insertion entre blocs (§11) — avant 1er / milieu / après dernier / double-clic / page longue / mobile / zoom / bloc verrouillé proche → **ordre exact, jamais d'ajout double**, save + reload OK.

### I. Toolbar & actions (§12) — réglages/dupliquer/monter/descendre/masquer/verrouiller/brouillon/supprimer + confirmation + undo ; actions impossibles désactivées ; suppression séparée.

### J. Sauvegarde réelle (§13) — modif simple + reload ; modifs rapides (dernier état) ; add/delete + reload ; déplacement + reload ; **erreur réseau simulée → erreur affichée, aucun faux succès, contenu conservé, retry** ; mobile.

### K. Publication réelle (§14) — 1re publication ; publish après modif ; double-clic (1 mutation) ; mise à jour ; suppression+republish ; publish après insertion ; erreur save bloque publish ; erreur publish + retry ; mobile ; **aucun double bouton legacy/nouveau**.

### L. Page publique (§15) — ordre/contenu/thème/liens/CTA/images/vidéos/responsive ; **aucun outil Builder** ; refresh ; **0 erreur console, 0 requête 4xx/5xx interne**.

### M. Fallback legacy (§9) — plusieurs blocs complexes (formulaire/galerie/accordéon/paiement/événement/commerce) : édition OK, aucune valeur perdue après save.

### N. Tablette (§16) — 768×1024 & 1024×768 : shell adapté, canvas visible, biblio/réglages accessibles, orientation, **aucun overflow horizontal**.

### O. Mobile portrait (§17)
| Viewport | header | bottom nav | safe area | sheet | clavier | save status | context bar | publish | overflow |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360×800 | | | | | | | | | |
| 390×844 | | | | | | | | | |
| 430×932 | | | | | | | | | |

### P. Mobile paysage (§18)
| Viewport | header compact | nav compacte | sheet latérale | canvas visible | clavier | overflow |
| --- | --- | --- | --- | --- | --- | --- |
| 844×390 | | | | | | |
| 800×360 | | | | | | |

### Q. Clavier virtuel (§19) — focus champ → clavier → champ visible, nav masquée, sheet expanded, bouton fermer accessible, saisie conservée, restauration. *(Émulation desktop ≠ vrai appareil — noter la limite.)*

### R. DnD (§20) — zoom 100/75/125 %, page longue, auto-scroll, tablette, mobile, fallback Monter/Descendre → placeholder, index final, save, reload, **0 bloc perdu**.

### S. Raccourcis (§21) — undo/redo/save/palette/zoom/Escape/Delete ; **aucun raccourci destructeur pendant la saisie** (input/textarea/inline).

### T. Accessibilité (§22) — Tab, focus visible, labels, icon-only, biblio/réglages/tabs/toolbar/sheets/dialog suppression/publication/formulaire, zoom 200 %, reduced-motion. Classer les problèmes.

### U/V. Console & Réseau (§23)
| Route | Action | Message | Gravité | Répétition | Action |
| --- | --- | --- | --- | --- | --- |
| | | *(à remplir pendant la QA)* | | | |

### W. Performance (§24) — après warm-up : dashboard, ouverture Builder, biblio, recherche, ajout, sélection, panneau, device, zoom, save, publish, page publique, mobile ; pages 10/50/100 blocs ; freeze/retard/saisie/scroll/mémoire. **Ne pas inventer de mesures.**

### X. Visuel (§25) — régénérer sur staging puis comparer :
```bash
# PowerShell
$env:VISUAL="1"; pnpm exec playwright test e2e/builder-visual.spec.ts --update-snapshots
$env:VISUAL="1"; pnpm exec playwright test e2e/builder-visual.spec.ts
```
Vues : desktop-complet, bibliotheque, reglages, canvas, mobile-initial, mobile-sheet. Documenter identique / attendu / régression.

### Y. Bugs (P0-P4) — gabarit
| ID | Gravité | Repro | Attendu | Observé | Viewport | Origine | Capture | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

### AA. Rollback (§28) — désactiver `NEXT_PUBLIC_BUILDER_REDESIGN` → redeploy → ancien Builder, données/save/publish OK, **aucune migration/DB**. (Correctness code-level vérifiée : tous les chemins `BUILDER_REDESIGN && …` rendent le legacy quand `false` ; aucun changement de données sur toutes les vagues.)

## Décision production (C08)

**CANARY PROLONGÉ — flag OFF par défaut.** Justification (§29) : l'activation « ON par défaut » exige
des **preuves authentifiées réelles** (sauvegarde/publication sur Supabase). Ces preuves **n'ont pas
pu être produites** dans l'environnement de l'agent (Supabase injoignable). Les portes locales
(type-check/vitest/build/e2e-harness/visuel) sont **toutes vertes**, mais elles ne remplacent pas la
QA authentifiée. → Ne PAS activer en production ; dérouler d'abord ce runbook sur staging.

## Monitoring après activation (checklist, existant seulement)
- console errors / save errors / publish errors (Sentry ou logs existants) ;
- `page_events` (analytics d'engagement déjà en place) pour abandon Builder ;
- tickets support ; rollback = variable d'env.

## Prochaine action
**Dérouler ce runbook sur staging** avec le compte de test (Supabase joignable), remplir les gabarits,
classer les bugs. Si aucun P0/P1 et save/publish/rollback verts → repasser en décision « ON par défaut ».
