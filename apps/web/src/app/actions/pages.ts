'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// ─── PAGES ────────────────────────────────────────────────────

export async function getMyPages() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('pages')
    .select('*, qr_codes(short_code, total_scans)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getPageBySlug(slug: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pages')
    .select('*, blocks(*)')
    .eq('slug', slug)
    .single()

  return data
}

export async function getPageById(id: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pages')
    .select('*, blocks(*)')
    .eq('id', id)
    .single()

  return data
}

export async function updatePage(pageId: string, data: {
  title?: string
  slug?: string
  status?: 'draft' | 'published' | 'archived'
  seo_title?: string
  seo_description?: string
  theme?: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const updateData: Record<string, unknown> = { ...data }
  if (data.status === 'published') {
    updateData.published_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('pages')
    .update(updateData)
    .eq('id', pageId)
    .eq('user_id', user.id)

  return { error: error?.message ?? null }
}

export async function deletePage(pageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('pages')
    .delete()
    .eq('id', pageId)
    .eq('user_id', user.id)

  if (!error) redirect('/dashboard')
  return { error: error?.message ?? null }
}

// ─── BLOCS ────────────────────────────────────────────────────

export async function saveBlocks(pageId: string, blocks: Array<{
  id?: string
  type: string
  position: number
  content: Record<string, unknown>
  styles: Record<string, unknown>
  is_visible: boolean
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Vérifier que la page appartient à l'utilisateur
  const { data: page } = await supabase
    .from('pages')
    .select('id')
    .eq('id', pageId)
    .eq('user_id', user.id)
    .single()

  if (!page) return { error: 'Page non trouvée' }

  // Supprimer les anciens blocs
  await supabase.from('blocks').delete().eq('page_id', pageId)

  // Insérer les nouveaux
  if (blocks.length > 0) {
    const { error } = await supabase.from('blocks').insert(
      blocks.map((b, i) => ({
        page_id: pageId,
        type: b.type,
        position: i,
        content: b.content,
        styles: b.styles,
        is_visible: b.is_visible,
      }))
    )
    if (error) return { error: error.message }
  }

  return { error: null }
}
