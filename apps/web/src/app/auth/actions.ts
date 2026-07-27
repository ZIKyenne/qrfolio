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

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const ref = (formData.get('ref') as string | null)?.trim().toLowerCase() || null

  const { error } = await supabase.auth.signUp({
    email,
    password,
    // `referred_by_code` est lu par le trigger handle_new_user pour créer
    // l'enregistrement de parrainage (affiliation via lien ?ref=CODE).
    options: { data: ref ? { full_name, referred_by_code: ref } : { full_name } },
  })

  // Trigger welcome email
  if (!error) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': process.env.CRON_SECRET || '',
        },
        body: JSON.stringify({ email, name: full_name }),
      })
    } catch {}
  }
  if (error) redirect('/auth/signup?error=' + encodeURIComponent(error.message))
  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) redirect('/auth/login?error=' + encodeURIComponent(error.message))
  // Redirection interne sûre (ex. lien d'invitation) ; sinon dashboard.
  const to = (formData.get('redirect') as string | null) || ''
  redirect(to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
