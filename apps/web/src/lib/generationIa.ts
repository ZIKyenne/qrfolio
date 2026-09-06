// La génération de page par IA n'existe que si ANTHROPIC_API_KEY est définie sur
// le serveur. next.config.ts en dérive NEXT_PUBLIC_GENERATION_IA au build, pour
// que l'éditeur sache, avant tout appel réseau, s'il doit proposer la fonction.
export const GENERATION_IA_ACTIVE = process.env.NEXT_PUBLIC_GENERATION_IA === "1"
