# Image du service d'export print QRowg : Node + Chromium (via Puppeteer) + Ghostscript
# + polices (pour un PDF vectoriel au bon texte). NE tourne PAS sur Vercel — cible un
# hôte Docker (Fly.io / Railway / Render / VM).

FROM node:20-bookworm-slim

# Dépendances système : Ghostscript (CMYK/PDF-X) + polices + libs Chromium.
# fonts-liberation/dejavu couvrent le fallback ; ajouter ici les .ttf des polices
# réellement utilisées par les designs (Inter, etc.) pour un rendu fidèle.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ghostscript \
      fontconfig fonts-liberation fonts-dejavu-core \
      ca-certificates \
      # libs requises par Chromium (téléchargé par Puppeteer)
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
WORKDIR /app

COPY package.json ./
# Installe les deps + télécharge le Chromium de Puppeteer dans l'image.
RUN npm install --omit=dev && npx puppeteer browsers install chrome

# Polices custom du projet (woff2/ttf) — décommenter si tu ajoutes des .ttf dans fonts/
# COPY fonts/ /usr/share/fonts/truetype/qrowg/
# Profil ICC CMYK (ex. CoatedFOGRA39.icc) — requis pour le CMYK color-managé.
COPY icc/ ./icc/
RUN fc-cache -f || true

COPY server.js ./

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
