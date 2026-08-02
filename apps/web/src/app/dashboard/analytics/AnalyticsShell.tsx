"use client"

// Coquille client : charge AnalyticsClient (et ses ~970 Ko de recharts) en LAZY.
// La route /dashboard/analytics répond alors instantanément (données SSR déjà
// résolues côté serveur, passées en props) puis les graphiques s'hydratent.
import dynamic from "next/dynamic"
import type { ComponentProps } from "react"
import type AnalyticsClient from "./AnalyticsClient"

const AnalyticsClientLazy = dynamic(() => import("./AnalyticsClient"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#8A8478", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: 26, height: 26, border: "2px solid rgba(201,168,76,0.25)", borderTopColor: "#C9A84C", borderRadius: "50%", animation: "mo-spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13 }}>Chargement des statistiques…</span>
      <style>{``}</style>
    </div>
  ),
})

export default function AnalyticsShell(props: ComponentProps<typeof AnalyticsClient>) {
  return <AnalyticsClientLazy {...props} />
}
