// Les questions de l'accueil : lues par la section ET par le JSON-LD FAQPage de la
// page, qui doit rester dans le module de la page.
import { PLANS as PLANS_DEF } from "@/lib/plans"

export const FAQ_ITEMS = [
  { q:"Le QR code reste-t-il le même si je modifie ma page ?",            a:"Oui, c'est tout l'intérêt d'un QR code dynamique : vous modifiez votre page autant de fois que vous voulez, et le QR code déjà imprimé reste identique et continue de fonctionner." },
  { q:"Qu'est-ce qu'une carte de visite numérique QRowg ?",             a:"Une page mobile professionnelle qui regroupe vos informations, vos liens et vos boutons d'action (appel, WhatsApp, réservation…). On y accède en scannant votre QR code ou via un simple lien." },
  { q:"Puis-je utiliser QRowg gratuitement ?",                          a:`Oui. Le plan ${PLANS_DEF.free.label} donne accès à ${PLANS_DEF.free.limits.pages} page, des vues illimitées et ${PLANS_DEF.free.limits.qr} QR codes — dont ${PLANS_DEF.free.limits.dyn} modifiable après impression, sans expiration. Aucune carte bancaire n'est demandée.` },
  { q:"Puis-je connecter mon propre nom de domaine ?",                    a:`Oui, dès le plan ${PLANS_DEF.pro.label} : votre domaine ou sous-domaine (ex. : carte.votresite.fr) mène directement à votre page QRowg.` },
  { q:"Est-ce que je vois les statistiques de scans ?",                   a:`Oui. Vues, scans, appareils, sources de trafic et pages les plus consultées. Statistiques de base sur le plan gratuit, statistiques détaillées dès ${PLANS_DEF.pro.label}.` },
  { q:"Puis-je retirer la mention QRowg de ma page ?",                  a:"Oui, dès le plan Établissement : votre page affiche uniquement votre marque. Sur le plan gratuit, une mention discrète apparaît en bas de page." },
  { q:"Est-ce adapté aux restaurants et commerces locaux ?",             a:"Tout à fait. Des modèles prêts à l'emploi existent pour le menu numérique, les horaires, la réservation, les avis Google et les promotions — utilisables en 5 minutes." },
  { q:"Puis-je télécharger mon QR code pour l'imprimer ?",               a:"Oui. Le téléchargement est disponible en PNG haute résolution, SVG et PDF — prêts à imprimer sur cartes de visite, flyers, menus ou affiches." },
  { q:"Puis-je annuler mon abonnement à tout moment ?",                  a:"Oui, à tout moment depuis votre espace compte. Aucun engagement, aucun frais d'annulation : votre accès reste actif jusqu'à la fin de la période déjà payée." },
  { q:"Si j'arrête de payer, mon QR code imprimé cesse-t-il de fonctionner ?", a:"Jamais brutalement. Un QR code statique encode son contenu directement : il fonctionne pour toujours, même sans compte. Pour un lien dynamique, si vous arrêtez l'abonnement le lien est mis en pause — mais sa destination est conservée et il se réactive dès que vous reprenez. Nous ne faisons jamais disparaître un QR code du jour au lendemain." },
  { q:"Puis-je changer la destination de mon QR code après l'avoir imprimé ?", a:"Oui, à tout moment et sans réimprimer. C'est le principe du QR code dynamique : le QR reste identique, vous modifiez sa page ou sa destination quand vous voulez." },
  { q:"QRowg fonctionne-t-il bien sur mobile ?",                       a:"Oui. Toutes les pages sont conçues pour le mobile en priorité. Comme la majorité des scans se font sur smartphone, l'affichage est optimisé pour les petits écrans." },
  { q:"Faut-il savoir coder pour créer sa page ?",                       a:"Non, aucune compétence technique n'est requise. Vous ajoutez des blocs, vous personnalisez, vous publiez — c'est tout." },
] as const
