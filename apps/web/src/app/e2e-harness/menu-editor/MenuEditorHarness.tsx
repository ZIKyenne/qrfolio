"use client"

// Harness : monte le VRAI panneau d'édition (EditPanel) du bloc menu_section — donc l'import tableur
// et le bouton d'aide « prompt IA » — sans Supabase. Providers requis par EditPanel inclus.
import { useState } from "react"
import { EditPanel } from "@/app/dashboard/builder/builderPanels"
import { ToastProvider } from "@/components/Toast"
import { ConfirmProvider } from "@/components/ui/Confirm"
import { type Block } from "@/app/dashboard/builder/types"
import { BLOCK_DEFS } from "@/app/dashboard/builder/blockDefs"

export function MenuEditorHarness() {
  const [block, setBlock] = useState<Block>({
    id: "menu-1", type: "menu_section", visible: true,
    content: { ...(BLOCK_DEFS.menu_section?.defaultContent as any) },
  })
  const onChange = (k: string, v: string) => setBlock(b => ({ ...b, content: { ...b.content, [k]: v } }))
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div data-testid="menu-editor-harness" style={{ minHeight: "100vh", background: "#0A0A0A", maxWidth: 460, margin: "0 auto", padding: 16 }}>
          <EditPanel block={block} onChange={onChange} only="content" />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
