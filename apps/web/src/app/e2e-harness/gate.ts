// Porte commune des routes de harness (/e2e-harness/*).
//
// Ces routes montent de vrais composants produit avec des fixtures, sans base :
// elles servent aux tests Playwright et aux mesures. Elles n'ont rien à faire
// devant un visiteur, d'où le 404 en production.
//
// MAIS : mesurer le VRAI build (celui qui part sur Vercel) demande un serveur en
// production. Jusqu'ici la seule façon d'y arriver était de commenter la garde
// le temps d'une mesure — un fichier modifié qu'on risque d'oublier au commit.
// Une variable d'environnement, jamais définie sur Vercel, remplace ce bricolage.
//
//     E2E_HARNESS=1 npx next start
//
export function harnessAutorise(): boolean {
  if (process.env.NODE_ENV !== "production") return true
  return process.env.E2E_HARNESS === "1"
}
