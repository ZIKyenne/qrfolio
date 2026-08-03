# Profils ICC

Déposer ici le profil CMYK d'intention de sortie, ex. **`CoatedFOGRA39.icc`**
(librement téléchargeable chez ECI — http://www.eci.org — profils « eci_offset »).

`server.js` le référence via `PRINT_ICC` (défaut `./icc/CoatedFOGRA39.icc`).
Sans profil, retirer `-sOutputICCProfile` de la commande Ghostscript (CMYK par défaut,
non color-managé) ou fournir un autre profil (GRACoL/SWOP selon le marché visé).
