# QRowg — Service d'export print (CMYK / PDF-X vectoriel)

> Microservice **conteneurisé** qui produit un **PDF vectoriel CMYK / PDF-X** prêt
> imprimeur à partir du SVG de composition du Print Studio. **Ne tourne PAS sur Vercel**
> (Ghostscript = binaire natif, Chromium lourd) → à déployer sur un hôte **Docker**
> (Fly.io / Railway / Render / VM). L'app Next appelle ce service via HTTP.

## Pourquoi un service séparé (et pas une fonction Vercel)
- Le **vrai CMYK/PDF-X** exige **Ghostscript** (conversion couleur + intention de sortie
  ICC) — binaire système indisponible sur les fonctions Vercel.
- Le **PDF vectoriel à polices correctes** exige un moteur qui a **les polices installées**.
  On utilise **Chromium headless** (les Google Fonts sont installées dans l'image) →
  `page.pdf()` produit un PDF **vectoriel** avec le **bon texte** (résout le blocage
  « polices cassées » du côté navigateur).
- Ces deux briques imposent une **image Docker** dédiée.

## Pipeline
```
SVG (composition Print Studio, QR déjà vectoriel)
  → HTML minimal embarquant le SVG à la taille physique (mm)
  → Chromium headless  page.pdf()   → PDF VECTORIEL sRGB (vraies polices)
  → Ghostscript  -sColorConversionStrategy=CMYK -dPDFX (+ ICC FOGRA39)  → PDF/X CMYK
  → renvoi du PDF au client
```

## Contrat d'API
`POST /export`  (protégé par `Authorization: Bearer $PRINT_EXPORT_TOKEN`)
```jsonc
{
  "svg":     "<svg …>…</svg>",   // SVG de composition (obligatoire)
  "widthMm": 210,                  // largeur physique (obligatoire)
  "heightMm": 297,                 // hauteur physique (obligatoire)
  "bleedMm": 3,                    // fond perdu (défaut 3)
  "cmyk":    true,                 // true = PDF/X CMYK ; false = PDF vectoriel sRGB
  "cropMarks": true                // traits de coupe
}
```
Réponse : `application/pdf` (le fichier), ou `4xx/5xx` + `{ error }`.

`GET /health` → `{ ok: true }`.

## Déploiement (exemple Fly.io)
```bash
cd services/print-export
fly launch --no-deploy          # crée fly.toml
fly secrets set PRINT_EXPORT_TOKEN=<un-secret-partagé>
fly deploy                      # build l'image Docker + déploie
# -> note l'URL publique (ex https://qrowg-print.fly.dev)
```
Puis, côté app Next (Vercel), variables d'env :
```
PRINT_EXPORT_URL=https://qrowg-print.fly.dev
PRINT_EXPORT_TOKEN=<le même secret>
```
L'app expose ensuite une route `/api/print-export` (à ajouter) qui **proxifie** vers ce
service (gate Pro + rate-limit), pour ne jamais exposer l'URL/secret au client.

## ICC
Placer un profil CMYK dans `icc/` (ex. `CoatedFOGRA39.icc`, librement dispo chez ECI).
Le `Dockerfile` le copie ; `server.js` le passe à Ghostscript comme intention de sortie.

## Itération (l'assistant ne peut PAS exécuter ce service)
Le rendu PDF/CMYK n'est **pas vérifiable** sans l'exécuter. Boucle : je livre le code →
**tu déploies** → tu ouvres le PDF (Acrobat : vérifier « espace colorimétrique = CMYK »,
polices vectorielles, fond perdu/coupe) → tu me remontes ce qui cloche → je corrige.

## Statut
**Scaffold** — pipeline + contrat + Docker posés. À compléter/durcir au fil des déploiements
(gestion d'erreurs Ghostscript, polices exactes du design, PDF/X-4 strict, timeouts).
