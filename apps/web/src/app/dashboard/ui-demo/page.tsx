"use client"

// Page de revue des primitives UI (design system). Interne — à regarder pour
// valider le rendu avant de propager les composants dans l'app.
import { useState } from "react"
import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Badge, type BadgeTone } from "@/components/ui/Badge"
import { Tabs } from "@/components/ui/Tabs"
import { Modal } from "@/components/ui/Modal"
import { Download, ArrowRight, Trash2, QrCode, BarChart, Palette } from "lucide-react"

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"]
const SIZES: ButtonSize[] = ["sm", "md", "lg"]
const TONES: BadgeTone[] = ["accent", "success", "warning", "danger", "neutral"]

export default function UiDemoPage() {
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState("apercu")
  const [modalOpen, setModalOpen] = useState(false)

  const section: React.CSSProperties = { marginBottom: 40 }
  const h2: React.CSSProperties = { fontFamily: "Fraunces, serif", color: "#F5F0E8", fontSize: 20, fontWeight: 700, margin: "0 0 14px" }
  const lbl: React.CSSProperties = { color: "#8A8478", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px", fontWeight: 700 }
  const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 18 }

  return (
    <div style={{ minHeight: "100dvh", padding: "28px 24px 80px", maxWidth: 900, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", color: "#F5F0E8", fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>Design System — Primitives</h1>
      <p style={{ color: "#8A8478", fontSize: 14, margin: "0 0 32px" }}>Revue visuelle des composants réutilisables. Astuce : changez la couleur d'accent dans Profil — les éléments « accent/primary » la suivent.</p>

      {/* BUTTON */}
      <div style={section}>
        <h2 style={h2}>Button — variantes × tailles</h2>
        {VARIANTS.map((v) => (
          <div key={v} style={{ marginBottom: 18 }}>
            <p style={lbl}>{v}</p>
            <div style={row}>
              {SIZES.map((sz) => <Button key={sz} variant={v} size={sz}>Bouton {sz}</Button>)}
            </div>
          </div>
        ))}
        <p style={lbl}>Icônes · états · pleine largeur</p>
        <div style={row}>
          <Button variant="primary" leftIcon={<Download size={16} />}>Télécharger</Button>
          <Button variant="secondary" rightIcon={<ArrowRight size={16} />}>Continuer</Button>
          <Button variant="danger" leftIcon={<Trash2 size={16} />}>Supprimer</Button>
          <Button variant="primary" disabled>Désactivé</Button>
          <Button variant="primary" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1600) }} loading={loading}>Cliquez (loading)</Button>
        </div>
        <div style={{ maxWidth: 360 }}>
          <Button variant="primary" size="lg" fullWidth leftIcon={<Download size={17} />}>Action principale</Button>
        </div>
      </div>

      {/* BADGE */}
      <div style={section}>
        <h2 style={h2}>Badge — tons sémantiques</h2>
        <div style={row}>
          {TONES.map((t) => <Badge key={t} tone={t}>{t}</Badge>)}
          <Badge tone="success">● Actif</Badge>
          <Badge tone="warning">● En pause</Badge>
          <Badge tone="accent">Pro</Badge>
        </div>
      </div>

      {/* CARD */}
      <div style={section}>
        <h2 style={h2}>Card</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%),1fr))", gap: 16 }}>
          <Card>Carte simple (sans en-tête). Contenu libre.</Card>
          <Card title="QR actifs" icon={<QrCode size={16} />} action={<Badge tone="success">5 / 25</Badge>}>
            <p style={{ margin: 0, color: "#C9C3B6", fontSize: 14 }}>Carte avec en-tête, icône et action à droite.</p>
          </Card>
          <Card elevated title="Statistiques" icon={<BarChart size={16} />}>
            <p style={{ margin: 0, color: "#C9C3B6", fontSize: 14 }}>Variante <strong>elevated</strong> (ombre plus marquée).</p>
          </Card>
        </div>
      </div>

      {/* TABS */}
      <div style={section}>
        <h2 style={h2}>Tabs</h2>
        <Card padding={0}>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "apercu", label: "Aperçu", icon: <QrCode size={14} /> },
              { id: "stats", label: "Stats", icon: <BarChart size={14} /> },
              { id: "style", label: "Style", icon: <Palette size={14} /> },
            ]}
          />
          <div style={{ padding: 18, color: "#C9C3B6", fontSize: 14 }}>Onglet actif : <strong style={{ color: "var(--accent)" }}>{tab}</strong></div>
        </Card>
      </div>

      {/* MODAL */}
      <div style={section}>
        <h2 style={h2}>Modal (accessible : focus trap · Échap · restauration du focus)</h2>
        <Button variant="secondary" onClick={() => setModalOpen(true)}>Ouvrir la modale</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Supprimer cette page ?"
          footer={<>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="danger" leftIcon={<Trash2 size={16} />} onClick={() => setModalOpen(false)}>Supprimer</Button>
          </>}
        >
          Cette action est irréversible. Testez : <kbd>Tab</kbd> reste piégé dans la modale, <kbd>Échap</kbd> ferme, et le focus revient au bouton d'ouverture.
        </Modal>
      </div>
    </div>
  )
}
