"use client"

// Le 404 des pages publiées — et, en pratique, le SEUL 404 que le site montre :
// le segment [slug] attrape toutes les adresses d'un seul niveau, donc le grand
// not-found de la racine ne sert que pour /a/b/c.
//
// Qui arrive ici : quelqu'un qui vient de scanner un QR dont la page a été
// dépubliée — un client debout devant une vitrine, téléphone à la main. On lui
// dit ce qui se passe, sans lui vendre quoi que ce soit. La proposition de
// composer une page est reléguée en bas, en petit, pour le cas (fréquent) où la
// personne est le commerçant lui-même qui teste son propre QR.
export default function NotFound() {
  return (
    <div style={{ minHeight: "100dvh", background: "#080808", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", padding: 24 }}>
      <p style={{ fontFamily: "Fraunces, serif", fontSize: 80, color: "#C9A84C", fontWeight: 700, margin: "0 0 16px", lineHeight: 1 }}>404</p>
      <p style={{ color: "#F5F0E8", fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Page introuvable</p>
      <p style={{ color: "#A8A190", fontSize: 14, margin: "0 0 28px", textAlign: "center", maxWidth: 340, lineHeight: 1.55 }}>
        Cette page n&apos;existe pas ou n&apos;est plus publiée. Si vous venez de scanner un QR code, son propriétaire l&apos;a probablement mise en pause.
      </p>
      <a href="/" style={{ background: "linear-gradient(90deg,#C9A84C,#b8953f)", color: "#080808", textDecoration: "none", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700 }}>Retour à l&apos;accueil</a>
      <p style={{ color: "#6E685E", fontSize: 12.5, margin: "26px 0 0", textAlign: "center", lineHeight: 1.5 }}>
        C&apos;est votre page ?{" "}
        <a href="/auth/login" style={{ color: "#A8A190", textDecoration: "underline" }}>Connectez-vous pour la republier</a>
        <br />
        <a href="/creer" style={{ color: "#8A8478", textDecoration: "underline" }}>Composer une page comme celle-ci</a>
      </p>
    </div>
  )
}
