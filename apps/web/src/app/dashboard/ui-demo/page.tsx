"use client"

// Page de revue des primitives UI (design system). Interne — à regarder pour
// valider le rendu avant de propager les composants dans l'app.
import { useState } from "react"
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/Button"
import { Download, ArrowRight, Trash2 } from "lucide-react"

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"]
const SIZES: ButtonSize[] = ["sm", "md", "lg"]

export default function UiDemoPage() {
  const [loading, setLoading] = useState(false)

  const section: React.CSSProperties = { marginBottom: 40 }
  const h2: React.CSSProperties = { fontFamily: "Fraunces, serif", color: "#F5F0E8", fontSize: 20, fontWeight: 700, margin: "0 0 14px" }
  const label: React.CSSProperties = { color: "#8A8478", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px", fontWeight: 700 }
  const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 18 }

  return (
    <div style={{ minHeight: "100dvh", padding: "28px 24px 80px", maxWidth: 900, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", color: "#F5F0E8", fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>Design System — Primitives</h1>
      <p style={{ color: "#8A8478", fontSize: 14, margin: "0 0 32px" }}>Revue visuelle des composants réutilisables. Astuce : changez la couleur d'accent dans Profil — les boutons « primary » la suivent.</p>

      <div style={section}>
        <h2 style={h2}>Button — variantes × tailles</h2>
        {VARIANTS.map((v) => (
          <div key={v} style={{ marginBottom: 18 }}>
            <p style={label}>{v}</p>
            <div style={row}>
              {SIZES.map((sz) => (
                <Button key={sz} variant={v} size={sz}>Bouton {sz}</Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={section}>
        <h2 style={h2}>Avec icônes</h2>
        <div style={row}>
          <Button variant="primary" leftIcon={<Download size={16} />}>Télécharger</Button>
          <Button variant="secondary" rightIcon={<ArrowRight size={16} />}>Continuer</Button>
          <Button variant="ghost" leftIcon={<ArrowRight size={16} />}>Voir plus</Button>
          <Button variant="danger" leftIcon={<Trash2 size={16} />}>Supprimer</Button>
        </div>
      </div>

      <div style={section}>
        <h2 style={h2}>États</h2>
        <div style={row}>
          <Button variant="primary" disabled>Désactivé</Button>
          <Button variant="secondary" disabled>Désactivé</Button>
          <Button variant="primary" loading>Chargement</Button>
          <Button variant="primary" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1600) }} loading={loading}>
            Cliquez (loading 1,6s)
          </Button>
        </div>
      </div>

      <div style={section}>
        <h2 style={h2}>Pleine largeur</h2>
        <div style={{ maxWidth: 360 }}>
          <Button variant="primary" size="lg" fullWidth leftIcon={<Download size={17} />}>Action principale</Button>
        </div>
      </div>
    </div>
  )
}
