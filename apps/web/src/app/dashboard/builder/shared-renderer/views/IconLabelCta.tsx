"use client"
// Vue interne PARTAGÉE des CTA « icône + label » (whatsapp, email, order_online, donation).
// Contenu identique éditeur/public ; l'échelle (tailles), FONT_B et la balise du label
// (span/p, selon le legacy) sont fournis par l'appelant. Le conteneur cliquable est fourni
// par l'adapter via EditorCtaShell / PublicCtaLink.
import { createElement, type ReactNode } from "react"

export function IconLabelCta({ icon, label, color, iconSize, labelSize, fontBody, labelTag = "span" }: {
  icon: ReactNode
  label: string
  color: string
  iconSize: number
  labelSize: number
  fontBody?: string
  labelTag?: "span" | "p"
}) {
  const labelStyle: any = { color, fontSize: labelSize, fontWeight: 700, ...(fontBody ? { fontFamily: fontBody } : {}), ...(labelTag === "p" ? { margin: 0 } : {}) }
  return (
    <>
      <span style={{ fontSize: iconSize }}>{icon}</span>
      {createElement(labelTag, { style: labelStyle }, label)}
    </>
  )
}
