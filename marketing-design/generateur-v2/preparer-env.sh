#!/usr/bin/env bash
# Prépare l'environnement de rendu QRowg dans le sandbox Linux, en une commande.
# Le sandbox n'a ni chromium ni accès au téléchargement Playwright (403) : on extrait
# le binaire de @sparticuz/chromium. À relancer à chaque nouvelle session.
#
#   bash preparer-env.sh /chemin/vers/marketing-design
#
# Puis :  cd /tmp/gen && python3 qrowg_render.py content.json out/
#         python3 qrowg_qc.py out/ attendus.json
set -euo pipefail

DESIGN="${1:-}"
if [ -z "$DESIGN" ] || [ ! -d "$DESIGN/generateur-v2" ]; then
  echo "Usage : bash preparer-env.sh <dossier marketing-design>" >&2; exit 1
fi

# `find ... | head -1` ferme le tuyau : find recoit SIGPIPE et, avec pipefail,
# ferait echouer tout le script. D'ou le `|| true`.
SKILL=$( { find / -type d -path '*qrowg-marketing/references/generateur' 2>/dev/null || true; } | head -1 )
if [ -z "$SKILL" ]; then
  echo "Dossier generateur de la skill qrowg-marketing introuvable." >&2; exit 1
fi

echo "1/4  dépendances Python"
pip install playwright pillow qrcode brotli opencv-python-headless --break-system-packages -q || true

echo "2/4  chromium"
if [ ! -x /tmp/chrbin/chromium ]; then
  cd /tmp && npm i @sparticuz/chromium >/dev/null 2>&1
  mkdir -p /tmp/chrbin
  python3 -c "import brotli;open('/tmp/chrbin/chromium','wb').write(brotli.decompress(open('/tmp/node_modules/@sparticuz/chromium/bin/chromium.br','rb').read()))"
  chmod +x /tmp/chrbin/chromium
fi

echo "3/4  copie du générateur (le dossier de la skill est en lecture seule)"
mkdir -p /tmp/gen/assets
for f in README.md qrowg_render.py qrowg_visuals.py video_engine.py; do cat "$SKILL/$f" > "/tmp/gen/$f"; done
for f in $(ls "$SKILL/assets"); do cat "$SKILL/assets/$f" > "/tmp/gen/assets/$f"; done

echo "4/4  application de la version corrigée + du chromium local"
cat "$DESIGN/generateur-v2/qrowg_visuals.py" > /tmp/gen/qrowg_visuals.py
cat "$DESIGN/generateur-v2/qrowg_qc.py"      > /tmp/gen/qrowg_qc.py
sed -i "s|pw.chromium.launch(args=\[[^]]*\])|pw.chromium.launch(executable_path='/tmp/chrbin/chromium', args=['--no-sandbox','--disable-gpu','--force-color-profile=srgb'])|" /tmp/gen/video_engine.py

python3 - <<'PY'
import ast, sys
for f in ('/tmp/gen/qrowg_visuals.py', '/tmp/gen/qrowg_qc.py'):
    ast.parse(open(f, encoding='utf-8').read())
import subprocess
out = subprocess.run(['/tmp/chrbin/chromium', '--version'], capture_output=True, text=True)
print('   chromium :', (out.stdout or out.stderr).strip()[:60])
PY

echo
echo "Prêt. Générateur dans /tmp/gen."
