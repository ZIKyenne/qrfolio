"use client"

// Coquille client : charge GoalsDashboard (et recharts) en LAZY — la route
// /dashboard/goals répond instantanément, le graphique s'hydrate ensuite.
import dynamic from "next/dynamic"
import type { ComponentProps } from "react"
import type GoalsDashboard from "../analytics/GoalsDashboard"

const GoalsDashboardLazy = dynamic(() => import("../analytics/GoalsDashboard"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#8A8478", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: 26, height: 26, border: "2px solid rgba(201,168,76,0.25)", borderTopColor: "#C9A84C", borderRadius: "50%", animation: "mo-spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13 }}>Chargement des objectifs…</span>
      <style>{``}</style>
    </div>
  ),
})

export default function GoalsShell(props: ComponentProps<typeof GoalsDashboard>) {
  return <GoalsDashboardLazy {...props} />
}
