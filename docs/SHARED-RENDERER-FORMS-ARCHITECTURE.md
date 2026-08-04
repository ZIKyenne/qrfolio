# Architecture des formulaires partagés (B09.13)

Conception d'une **infrastructure inactive** pour migrer progressivement les 6 formulaires de
leads vers le renderer partagé. **Aucune migration, aucune activation** : `SHARED_RENDERER_BLOCKS`
reste à **51** (test dédié), les 6 formulaires restent legacy, aucune route/schéma/email modifié,
aucune dépendance ajoutée. Tout vit sous `shared-renderer/forms/`, non câblé aux registres actifs.

## Audit des six formulaires

| Bloc | Champs (clés) | Requis | Type lead | Route | Notif | Accusé | Honeypot | Composant public | Divergence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| contact_form | name, email, [phone], message | name,email | contact | /api/leads | oui | si email | oui | `LeadFormPublic` | aucune |
| quote_form | name, email, [phone], [budget], project | name,email | quote | /api/leads | oui | oui | oui | `LeadFormPublic` | aucune |
| reservation_form | name, date, people | name,date | reservation | /api/leads | oui | non (pas d'email) | oui | `LeadFormPublic` | `phone` orphelin (panel, non rendu) |
| booking_request | name, email, type, date, message | name,email | booking | /api/leads | oui | oui | oui | `LeadFormPublic` | aucune |
| event_register | name, email, [phone], [company] | name,email | register | /api/leads | oui | oui | oui | `EventRegisterPublic` (dédié) | data en clés FR (nom/telephone/societe) |
| rsvp | — (3 choix oui/peut-être/non) | — | rsvp | /api/leads | oui | non | non | `RsvpPublic` (dédié) | pas un formulaire à champs |

Payload commun (submitLead) : `{ pageId, blockId, type, name, email, phone, message, data }`. Owner
résolu **côté serveur** (jamais d'ownerId/recipient fourni par le client). Notif propriétaire +
accusé visiteur = fire-and-forget côté serveur.

## Divergences (classées)

- **reservation_form.phone** — champ panel « Téléphone direct » (du commerce), **rendu nulle part**
  (ni éditeur ni public), jamais envoyé. **Orphelin NON bloquant** (déjà dans KNOWN_ORPHAN_FIELDS) :
  la migration du formulaire visiteur (name/date/people, cohérent éditeur↔public) n'en dépend pas.
  À nettoyer éventuellement dans une mission panel dédiée.
- **event_register / rsvp** — composants **dédiés** (pas `LeadFormPublic`) : register nomme sa `data`
  en français (`nom`/`telephone`/`societe`) ; rsvp est un choix à 3 boutons (pas de champs, pas de
  honeypot, envoi au clic). **Non bloquant mais pattern distinct** → pilotes plus tardifs.
- Aucun champ « éditable mais non envoyé » côté visiteur ; aucun faux succès en éditeur (legacy
  éditeur = aperçu de champs non soumis).

## Architecture cible

`content → modèle pur → (schéma de champs) → vue commune → adapter éditeur / adapter public`.

- **Modèles purs** (`leadFormModels.ts`) : 6 fonctions explicites (pas de factory magique),
  partageant des helpers de champs. Reproduisent EXACTEMENT le contrat legacy (clés, libellés,
  champs conditionnels, 2 premiers requis, leadType, subject). Aucun React/Supabase/tracking/mutation.
- **Contrats** (`formTypes.ts`) : `SharedFormField` (typé, pas de `Record<string,any>`),
  `SharedLeadFormModel` (kind "fields"), `SharedRsvpModel` (kind "choice"), + `toLeadFormFields()`
  pour alimenter `LeadFormPublic` sans réécriture.
- **Vue commune** (`SharedLeadFormView.tsx`) : présentative + accessible (label htmlFor/id,
  aria-invalid, aria-describedby, role=status/alert) ; **pas de `<form onSubmit>`** (div +
  `<button type="button">`) ; honeypot non présent (géré par l'adapter public à l'activation).
- **Adapter éditeur** (`EditorLeadFormAdapter.tsx`, INACTIF) : aperçu **non soumis** — champs
  `readOnly`, mention « Aperçu du formulaire — aucune donnée ne sera envoyée », aucun honeypot,
  aucune soumission réseau, aucun faux succès, bouton `aria-disabled`.
- **Adapter public** : **Option A retenue** (moindre risque) — `LeadFormPublic` (déjà fiable :
  honeypot, états, anti-double-submit, mailto) reste l'adapter ; le modèle l'alimente via
  `toLeadFormFields(model)`. Aucune réécriture. La logique pure testable est extraite dans
  `leadFormMachine.ts` + `leadPayload.ts`.

## Contrats de champs

Types HTML dérivés de la clé (email/tel/text/textarea/select/checkbox), `autocomplete` adapté,
`required` sur les 2 premiers champs (contrat `LeadFormPublic`). Clés canoniques : `name`, `email`,
`phone`, `message`, `project`, `date`, `time`, `people`, `type`, `budget`, `company`, `consent`.
**Ne pas renommer** les clés alimentant le backend (name/email/phone/message) — compat emails/data.

## Payload (`buildLeadPayload`, pur)

Reproduit le payload legacy : `name/email/phone` par clé, `message = message||project||subject`,
`data = { label: valeur }` des champs remplis. **Filtre les clés inconnues** (seuls les champs du
modèle), **nettoie** (trim) et **borne** (500 court / 5000 textarea). N'accepte JAMAIS
ownerId/recipient/clé interne. Déterministe, sans mutation. (Serveur = source de vérité ; les
bornes sont une sécurité du futur chemin partagé, non appliquées au legacy actuel.)

## Validation & états (`leadFormMachine`, pur)

`validateLeadForm` (requis + email regex), `canSubmit` (faux si `sending` → anti-double-submit),
`decideSubmit` (sending→blocked ; honeypot→succès silencieux ; invalide→validation_error ;
sinon→send), `decideResult` (ok→succès ; échec+ownerEmail→mailto=succès ; sinon→error). États :
`idle | validation_error | sending | success | error`. Succès uniquement après réponse OK.

## Honeypot & anti-double-submit

Honeypot (`name="website"` hors écran) et bouton désactivé pendant l'envoi = **conservés par
`LeadFormPublic`** (option A) ; le modèle pur ne contient pas le honeypot ; l'éditeur ne l'affiche
jamais. `decideSubmit`/`canSubmit` formalisent l'anti-double-submit pour les tests.

## Erreurs sûres & fallback email

Messages génériques (« Une erreur est survenue. Réessayez. ») ; jamais de SQL/RLS/stack/token/
message brut Supabase. Fallback `mailto:` **uniquement** vers `ownerEmail` (résolu serveur) — le
visiteur ne choisit jamais le destinataire.

## Tracking, accessibilité, confidentialité

- **Tracking** : conservé par `LeadFormPublic` (`trackLinkClick(..., "form")` à la soumission) ;
  aucun nouvel événement ; le modèle pur ne tracke pas ; l'éditeur ne tracke pas.
- **Accessibilité** : label par champ, association htmlFor/id, aria-invalid/aria-describedby,
  role=status/alert, bouton accessible, pas de placeholder comme unique label. Clavier/zoom/lecteur
  d'écran = QA manuelle.
- **Confidentialité** : aucune donnée visiteur dans le modèle statique, ni collectée en éditeur ;
  champs potentiellement sensibles : email, phone, message/project (données personnelles).

## Tests

`forms.test.tsx` (26) : modèles (6, champs/requis/leadType/subject/conditionnels/rsvp/non-mutation),
payload (filtrage clés inconnues/ownerId, message fallback, trim, bornes), machine
(validation/anti-double/honeypot/résultat), parité éditeur (labels/champs/bouton/mention, pas de
`<form>`/honeypot/faux succès, readOnly, aria), sécurité (échappement HTML, pas de
`dangerouslySetInnerHTML`, adapter sans submitLead), méta (51 shared, 6 legacy, registre + pilotes).
`bundleBoundary` étendu (5 modules formulaires purs). Suite : **1392 verts**. Typecheck 0. Build 84/84.

## Futurs pilotes (B09.14) — NON activés

| Bloc | Justification | Risque | Prérequis | Critère d'activation |
| --- | --- | --- | --- | --- |
| contact_form | le plus simple ; `contactFormFields` testé ; `LeadFormPublic` ; zéro divergence | faible | aucun | parité structurelle + payload identiques |
| quote_form | même socle `LeadFormPublic` ; champs conditionnels ; project→message déjà géré | faible | aucun | parité + payload identiques |

Ordre justifié : contact puis quote (mêmes fondations, aucune divergence). **Écartés des pilotes** :
reservation_form (orphelin phone à clarifier), booking_request (ok mais plus de champs),
event_register (composant dédié + data FR), rsvp (pattern à choix distinct).

## Plan de rollback futur

`formulaire ajouté au registre shared → flag actif → shared → retrait du flag → legacy immédiat`.
Aucune migration de données, aucune route modifiée, aucune perte de lead ; legacy conservé pendant
toute la phase pilote.

## Registres et flags

**51 shared / 91 legacy inchangés.** `FORM_RENDERER_CANDIDATES` et `FORM_PILOT_CANDIDATES` sont un
registre **préparatoire inactif** (aucun import dans editorRegistry/publicRegistry, aucun ajout au
flag, aucune résolution runtime).

## Risques résiduels

- event_register / rsvp : composants dédiés → l'unification générique demandera une adaptation
  (data FR pour register ; modèle « choix » pour rsvp) avant migration.
- Bornes de payload (500/5000) = choix du futur chemin partagé ; à confirmer vs limites serveur.
- Parité runtime (soumission réelle, honeypot, mailto, double-clic) non observée en navigateur.
- reservation_form.phone orphelin à nettoyer (panel) hors de cette mission.

## Prochaine action

`B09.14 — migrer les deux premiers formulaires pilotes (contact_form, quote_form) derrière un flag`.
