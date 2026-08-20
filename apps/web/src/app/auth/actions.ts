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

// Traduit les erreurs Supabase Auth (anglais) en messages FR courts pour le tunnel d'inscription.
function frAuthError(e: { message?: string } | null): string {
  const m = (e?.message || '').toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered')) return 'Cet email a déjà un compte. Connectez-vous.'
  if (m.includes('invalid login')) return 'Email ou mot de passe incorrect.'
  if (m.includes('email not confirmed')) return 'Confirmez votre email via le lien reçu par mail.'
  if (m.includes('password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (m.includes('unable to validate email') || m.includes('invalid email') || m.includes('invalid format')) return 'Adresse email invalide.'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('for security purposes')) return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Les inscriptions sont momentanément indisponibles.'
  return 'Une erreur est survenue. Veuillez réessayer.'
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
  if (error) redirect('/auth/signup?error=' + encodeURIComponent(frAuthError(error)))
  // Redirection interne sûre (ex. deep-link SEO -> onboarding par objectif) ; sinon,
  // par défaut on envoie les nouveaux inscrits vers l'onboarding « par objectif » qui
  // fabrique une page + un QR en 2 clics (meilleur chemin vers la première valeur).
  const to = (formData.get('redirect') as string | null) || ''
  redirect(to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard/onboarding')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) redirect('/auth/login?error=' + encodeURIComponent(frAuthError(error)))
  // Redirection interne sûre (ex. lien d'invitation) ; sinon dashboard.
  const to = (formData.get('redirect') as string | null) || ''
  redirect(to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
