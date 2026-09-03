# marketing-design — chaîne de design QRowg corrigée

1. `AUDIT-DESIGN-2026-09-03.md` — le rapport complet, à lire en premier.
2. `INSTALLER-CORRECTIFS.ps1` — pose tous les correctifs dans la skill `qrowg-marketing`
   (sauvegarde les originaux). **À lancer hors session Cowork.**

| Dossier | Contenu |
|---|---|
| `generateur-v2/` | Générateur d'images corrigé (QR réel tracké, 4 gabarits d'épingle, autoréduction des titres, accent secteur) + `qrowg_qc.py`, le contrôle qualité automatique. |
| `references-corrigees/` | Playbooks carrousel et Pinterest débarrassés de l'ancienne palette violet/cyan. |
| `motion-corrige/` | Motion System avec la palette de marque et le seuil de durée paramétrable. |
| `theme-qc/` | `theme_contraste.py` — contrôle des ratios de contraste d'un thème QRfolio. |
| `apercu-gabarit-A..D.png` | Les 4 compositions d'épingle, QR vérifiés au décodeur. |

Deux skills accompagnent ce dossier : **qrowg-design-qc** (direction artistique et
contrôle) et **qrowg-stock** (réserve et réinjection).

## Contrôles rapides

```
python3 generateur-v2/qrowg_qc.py out/ attendus.json     # visuels : 0 alerte exigée
python3 theme-qc/theme_contraste.py theme.json --strict  # thème : code 1 si échec
node motion-corrige/render.mjs clips/x.json --validate   # vidéo : plus besoin de --no-validate
```
