'use client'
// QRowg builder — sélecteur de thèmes intégré

import { useState, useEffect, useCallback } from 'react'
import { saveBlocks, updatePage } from '../../../actions/pages'
import { useIsMobile } from '@/lib/useIsMobile'
import {
  PRESET_THEMES,
  CATEGORY_LABELS,
  resolveTheme,
  fontsUrl,
  backgroundStyle,
  readableText,
  type PageTheme,
  type ThemeCategory,
} from '../themes'

const BLOCK_TYPES = [
  { type: 'profile', icon: '👤', label: 'Profil' },
  { type: 'bio', icon: '✍️', label: 'Bio' },
  { type: 'social_links', icon: '🔗', label: 'Réseaux sociaux' },
  { type: 'gallery', icon: '🖼️', label: 'Galerie' },
  { type: 'cta_button', icon: '⚡', label: 'Bouton CTA' },
  { type: 'contact_form', icon: '✉️', label: 'Formulaire' },
  { type: 'google_maps', icon: '📍', label: 'Carte' },
  { type: 'testimonials', icon: '💬', label: 'Témoignages' },
  { type: 'visit_counter', icon: '👁️', label: 'Compteur' },
  { type: 'video', icon: '▶️', label: 'Vidéo' },
]

type Block = {
  id: string
  type: string
  icon: string
  label: string
  position: number
  content: Record<string, unknown>
  styles: Record<string, unknown>
  is_visible: boolean
}

type Page = {
  id: string
  title: string
  slug: string
  status: string
  theme: Record<string, string> | null
}

type BuilderClientProps = {
  page: Page
  initialBlocks: Block[]
}

// Clé du preset correspondant au thème enregistré sur la page (pour la surbrillance)
function matchThemeKey(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''
  const name = (raw as { name?: string }).name
  return Object.keys(PRESET_THEMES).find(k => PRESET_THEMES[k]!.name === name) ?? ''
}

export default function BuilderClient({ page, initialBlocks }: BuilderClientProps) {
  const isMobile = useIsMobile(860) // éditeur 3 panneaux : écran d'invite sur mobile (voir return)
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')
  const [pageName, setPageName] = useState(page.title)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isPublishing, setIsPublishing] = useState(false)

  // ── Thèmes ──
  const [leftTab, setLeftTab] = useState<'blocks' | 'themes'>('blocks')
  const [theme, setTheme] = useState<PageTheme>(() => resolveTheme(page.theme))
  const [activeThemeKey, setActiveThemeKey] = useState<string>(() => matchThemeKey(page.theme))

  // Autosave des blocs toutes les 30 secondes
  const handleSave = useCallback(async () => {
    setSaveStatus('saving')
    const result = await saveBlocks(page.id, blocks.map((b, i) => ({
      type: b.type,
      position: i,
      content: b.content,
      styles: b.styles,
      is_visible: b.is_visible,
    })))
    if (!result.error) {
      setSaveStatus('saved')
    }
  }, [page.id, blocks])

  useEffect(() => {
    setSaveStatus('unsaved')
  }, [blocks, pageName])

  useEffect(() => {
    const timer = setInterval(handleSave, 30000)
    return () => clearInterval(timer)
  }, [handleSave])

  const applyTheme = async (key: string) => {
    const next = PRESET_THEMES[key]
    if (!next) return
    setTheme(next)
    setActiveThemeKey(key)
    setSaveStatus('saving')
    const result = await updatePage(page.id, { theme: next as unknown as Record<string, unknown> })
    setSaveStatus(result.error ? 'unsaved' : 'saved')
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    await handleSave()
    await updatePage(page.id, {
      title: pageName,
      status: 'published',
    })
    setIsPublishing(false)
    window.open('/' + page.slug, '_blank')
  }

  const addBlock = (type: string) => {
    const found = BLOCK_TYPES.find(b => b.type === type)
    if (!found) return
    const newBlock: Block = {
      id: Date.now().toString(),
      type: found.type,
      icon: found.icon,
      label: found.label,
      position: blocks.length,
      content: {},
      styles: {},
      is_visible: true,
    }
    setBlocks(prev => [...prev, newBlock])
    setSelectedId(newBlock.id)
  }

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (dir === 'up' && idx === 0) return prev
      if (dir === 'down' && idx === prev.length - 1) return prev
      const next = [...prev]
      const swap = dir === 'up' ? idx - 1 : idx + 1
      ;[next[idx], next[swap]] = [next[swap]!, next[idx]!]
      return next
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Presets groupés par catégorie pour l'onglet Thèmes
  const grouped: Record<string, Array<[string, PageTheme]>> = {}
  for (const [key, t] of Object.entries(PRESET_THEMES)) {
    ;(grouped[t.category] ??= []).push([key, t])
  }

  const onPrimary = readableText(theme.primary)

  // Le builder (panneaux outils + canvas + propriétés, drag-drop) nécessite un
  // grand écran. Sur mobile on invite à passer sur ordinateur (la page créée,
  // elle, reste parfaitement responsive côté public).
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 28, fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ width: 66, height: 66, borderRadius: 18, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 30 }}>🖥️</div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, color: '#F5F0E8', fontWeight: 700, margin: '0 0 10px', maxWidth: 330 }}>
          L’éditeur s’utilise sur ordinateur
        </h2>
        <p style={{ color: '#A8A190', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px', maxWidth: 340 }}>
          La construction de page (blocs, glisser-déposer, propriétés) demande un grand écran. Ouvrez QRowg sur ordinateur pour éditer « {pageName} ». Votre page publique, elle, reste 100 % responsive.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 20px', background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 78%, #000))', borderRadius: 11, color: '#080808', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Voir ma page
          </a>
          <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 11, color: '#F5F0E8', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Tableau de bord
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column' }}>

      {/* Charge les polices du thème sélectionné pour l'aperçu */}
      <link href={fontsUrl(theme)} rel="stylesheet" />

      {/* Top Bar */}
      <div style={{
        height: '56px', background: '#0C0B09',
        borderBottom: '1px solid rgba(201,168,76,0.12)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: '12px', flexShrink: 0,
      }}>
        <a href="/dashboard" style={{
          fontFamily: 'Fraunces, serif', fontSize: '20px', fontWeight: 300,
          color: '#F5F0E8', textDecoration: 'none',
        }}>
          QR<span style={{ color: '#C9A84C', fontWeight: 600 }}>folio</span>
        </a>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        <input
          value={pageName}
          onChange={e => setPageName(e.target.value)}
          onBlur={() => updatePage(page.id, { title: pageName })}
          style={{
            background: 'transparent', border: 'none', color: '#F5F0E8',
            fontSize: '14px', fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '200px',
          }}
        />

        {/* Save status */}
        <div style={{ fontSize: '12px', color: saveStatus === 'saved' ? 'var(--success)' : saveStatus === 'saving' ? '#C9A84C' : '#A8A190' }}>
          {saveStatus === 'saved' ? '✓ Sauvegardé' : saveStatus === 'saving' ? '⏳ Sauvegarde...' : '● Modifications non sauvegardées'}
        </div>

        <div style={{ flex: 1 }} />

        {/* Preview toggle */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden',
        }}>
          {(['mobile', 'desktop'] as const).map(mode => (
            <button key={mode} onClick={() => setPreviewMode(mode)} style={{
              background: previewMode === mode ? 'rgba(201,168,76,0.15)' : 'transparent',
              border: 'none', color: previewMode === mode ? '#C9A84C' : '#A8A190',
              padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>
              {mode === 'mobile' ? '📱' : '🖥️'}
            </button>
          ))}
        </div>

        <button onClick={handleSave} style={{
          background: 'transparent', border: '1px solid rgba(201,168,76,0.25)',
          color: '#C9A84C', padding: '7px 14px', borderRadius: '2px',
          fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}>
          Sauvegarder
        </button>

        <button onClick={handlePublish} disabled={isPublishing} style={{
          background: '#C9A84C', border: 'none', color: '#080808',
          padding: '8px 18px', borderRadius: '2px', fontSize: '13px',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}>
          {isPublishing ? '...' : 'Publier →'}
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — Blocs / Thèmes */}
        <div style={{
          width: '230px', background: '#0C0B09',
          borderRight: '1px solid rgba(201,168,76,0.1)',
          padding: '14px 10px', overflowY: 'auto', flexShrink: 0,
        }}>
          {/* Onglets */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px',
            overflow: 'hidden', marginBottom: '14px',
          }}>
            {(['blocks', 'themes'] as const).map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab)} style={{
                flex: 1, background: leftTab === tab ? 'rgba(201,168,76,0.15)' : 'transparent',
                border: 'none', color: leftTab === tab ? '#C9A84C' : '#A8A190',
                padding: '7px 8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}>
                {tab === 'blocks' ? 'Blocs' : 'Thèmes'}
              </button>
            ))}
          </div>

          {leftTab === 'blocks' && (
            <>
              {BLOCK_TYPES.map(block => (
                <button key={block.type} onClick={() => addBlock(block.type)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', background: 'transparent', border: '1px solid transparent',
                  borderRadius: '4px', color: '#A8A190', fontSize: '13px', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', textAlign: 'left', marginBottom: '2px',
                }}>
                  <span style={{ fontSize: '15px' }}>{block.icon}</span>
                  {block.label}
                  <span style={{ marginLeft: 'auto', opacity: 0.4 }}>+</span>
                </button>
              ))}
            </>
          )}

          {leftTab === 'themes' && (
            <>
              {Object.entries(grouped).map(([category, list]) => (
                <div key={category} style={{ marginBottom: '14px' }}>
                  <div style={{
                    fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: '#C9A84C', marginBottom: '8px', paddingLeft: '4px',
                  }}>
                    {CATEGORY_LABELS[category as ThemeCategory] ?? category}
                  </div>
                  {list.map(([key, t]) => {
                    const active = activeThemeKey === key
                    return (
                      <button key={key} onClick={() => applyTheme(key)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px', marginBottom: '4px', cursor: 'pointer', textAlign: 'left',
                        background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
                        border: '1px solid ' + (active ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.07)'),
                        borderRadius: '6px',
                      }}>
                        {/* Pastille d'aperçu des couleurs */}
                        <span style={{
                          width: '34px', height: '34px', borderRadius: '6px', flexShrink: 0,
                          background: t.background, border: '1px solid rgba(255,255,255,0.12)',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          <span style={{ position: 'absolute', left: '6px', bottom: '6px', width: '10px', height: '10px', borderRadius: '50%', background: t.primary }} />
                          <span style={{ position: 'absolute', right: '6px', top: '6px', width: '8px', height: '8px', borderRadius: '50%', background: t.accent }} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: '12px', color: '#F5F0E8', fontFamily: 'DM Sans, sans-serif' }}>{t.name}</span>
                          <span style={{ display: 'block', fontSize: '10px', color: '#8A8478' }}>{t.font_display}</span>
                        </span>
                        {active && <span style={{ color: 'var(--success)', fontSize: '13px' }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              ))}
              <div style={{ fontSize: '10px', color: '#8A8478', lineHeight: 1.5, padding: '4px 4px 0' }}>
                Le thème s'applique à l'aperçu et à ta page publiée. Pense à republier pour le voir en ligne.
              </div>
            </>
          )}
        </div>

        {/* CENTER — Canvas */}
        <div style={{
          flex: 1, background: '#0A0908', display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '24px 16px', overflowY: 'auto', gap: '3px',
        }}>
          <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#8A8478', marginBottom: '12px' }}>
            {blocks.length} bloc{blocks.length > 1 ? 's' : ''}
            {page.status === 'published' && (
              <a href={'/' + page.slug} target="_blank" style={{ marginLeft: '12px', color: 'var(--success)', textDecoration: 'none' }}>
                ↗ Voir la page live
              </a>
            )}
          </div>

          {blocks.length === 0 && (
            <div style={{
              border: '1px dashed rgba(201,168,76,0.15)', borderRadius: '8px',
              padding: '60px 40px', textAlign: 'center', color: '#8A8478', fontSize: '14px',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>+</div>
              Ajoutez des blocs depuis le panneau gauche
            </div>
          )}

          {blocks.map((block, idx) => (
            <div key={block.id} onClick={() => setSelectedId(block.id)} style={{
              width: '100%', maxWidth: '520px',
              background: selectedId === block.id ? 'rgba(201,168,76,0.05)' : '#111009',
              border: '1px solid ' + (selectedId === block.id ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.1)'),
              borderRadius: '4px', padding: '14px 18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{block.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#F5F0E8' }}>{block.label}</div>
                <div style={{ fontSize: '10px', color: '#8A8478', marginTop: '1px' }}>Bloc #{idx + 1}</div>
              </div>
              <div style={{ display: 'flex', gap: '3px' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => moveBlock(block.id, 'up')} disabled={idx === 0} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '3px', width: '24px', height: '24px', color: '#A8A190',
                  cursor: 'pointer', fontSize: '11px',
                }}>↑</button>
                <button onClick={() => moveBlock(block.id, 'down')} disabled={idx === blocks.length - 1} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '3px', width: '24px', height: '24px', color: '#A8A190',
                  cursor: 'pointer', fontSize: '11px',
                }}>↓</button>
                <button onClick={() => removeBlock(block.id)} style={{
                  background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)',
                  borderRadius: '3px', width: '24px', height: '24px', color: '#FF5252',
                  cursor: 'pointer', fontSize: '12px',
                }}>×</button>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT — Preview */}
        <div style={{
          width: '300px', background: '#0C0B09',
          borderLeft: '1px solid rgba(201,168,76,0.1)',
          padding: '20px 16px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', flexShrink: 0, overflowY: 'auto',
        }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '16px' }}>
            Aperçu · {theme.name}
          </div>

          {/* Phone frame */}
          <div style={{
            width: '220px', minHeight: '400px',
            border: '5px solid #1A1812', borderRadius: '28px', overflow: 'hidden',
            boxShadow: '0 0 32px rgba(0,0,0,0.6)', position: 'relative',
            ...backgroundStyle(theme),
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: '52px', height: '10px', background: '#1A1812', borderRadius: '0 0 6px 6px', zIndex: 10,
            }} />
            <div style={{ padding: '20px 12px 12px', fontFamily: `'${theme.font_body}', sans-serif` }}>
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <div style={{
                  width: '52px', height: '52px',
                  background: theme.primary + '26',
                  border: '2px solid ' + theme.primary,
                  borderRadius: '50%',
                  margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                }}>👤</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: theme.text, fontFamily: `'${theme.font_display}', serif` }}>{pageName}</div>
                <div style={{ fontSize: '10px', color: theme.muted }}>{appUrl.replace(/^https?:\/\//, '')}/{page.slug}</div>
              </div>

              {/* CTA d'exemple */}
              <div style={{
                background: theme.primary, color: onPrimary, textAlign: 'center',
                borderRadius: '5px', padding: '8px', fontSize: '11px', fontWeight: 600, marginBottom: '8px',
              }}>
                Bouton CTA
              </div>

              {blocks.map(block => (
                <div key={block.id} style={{
                  background: theme.surface,
                  border: '1px solid ' + theme.accent + '33',
                  borderRadius: '5px', padding: '8px 10px', marginBottom: '4px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <span style={{ fontSize: '12px' }}>{block.icon}</span>
                  <span style={{ fontSize: '10px', color: theme.muted }}>{block.label}</span>
                </div>
              ))}
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <div style={{ fontSize: '8px', color: theme.muted, letterSpacing: '0.5px' }}>Créé avec QRowg</div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '12px', background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: '3px',
            padding: '6px 10px', fontSize: '10px', color: '#A8A190',
            fontFamily: 'JetBrains Mono, monospace', width: '100%', textAlign: 'center',
          }}>
            {appUrl}/{page.slug}
          </div>
        </div>
      </div>
    </div>
  )
}
