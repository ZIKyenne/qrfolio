
import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import Particles from '@/components/Particles'
import QrowgLogo from '@/components/QrowgLogo'
import SignupForm from './SignupForm'
import GoogleButton from '../GoogleButton'

export const metadata: Metadata = { title: 'Créer un compte' }

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string; redirect?: string }>
}) {
  const sp = await searchParams
  // Conserve la destination interne (deep-link SEO) quand on bascule vers la connexion.
  const loginHref = sp.redirect ? `/auth/login?redirect=${encodeURIComponent(sp.redirect)}` : '/auth/login'
  // Arrivée depuis l'éditeur avec une page déjà composée : on le dit, sinon on a
  // l'air de demander un compte pour rien juste avant la récompense.
  const claiming = (sp.redirect || '').includes('claim=1')
  // Elle n'a pas cliqué « créer un compte » : elle a cliqué « publier ». Le dire,
  // sinon le compte a l'air d'être une condition surgie de nulle part.
  const pourPublier = (sp.redirect || '').includes('publier=1')
  return (
    <div style={{
      minHeight: '100dvh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(24px + env(safe-area-inset-top)) 22px calc(24px + env(safe-area-inset-bottom))',
      position: 'relative', isolation: 'isolate', overflow: 'hidden',
      backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)',
    }}>
      <Particles behind />
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <a href="/" aria-label="QRowg — accueil" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <QrowgLogo size={26} />
          </a>
          <h1 style={{ color: '#F8F4EC', fontSize: 23, fontWeight: 700, margin: '18px 0 6px', fontFamily: 'Fraunces, serif' }}>{pourPublier ? 'Plus qu\'une étape avant la mise en ligne' : claiming ? 'Plus qu\'une étape' : 'Créer un compte'}</h1>
          <p style={{ color: '#C9C3B6', fontSize: 14.5, margin: 0 }}>{pourPublier ? 'Votre page part en ligne juste après — elle est reprise telle quelle, rien à resaisir.' : claiming ? 'Votre page est prête et vous attend — elle sera reprise telle quelle.' : 'Gratuit · prêt en 3 minutes.'}</p>
        </div>

        <div style={{ background: '#141210', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 'clamp(22px, 6vw, 30px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

          {sp.error && (
            <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 11, padding: '12px 14px', marginBottom: 18, fontSize: 13.5, color: 'var(--danger)', lineHeight: 1.45 }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{decodeURIComponent(sp.error)}</span>
            </div>
          )}

          <GoogleButton label="Continuer avec Google" refCode={sp.ref} />
          <SignupForm refCode={sp.ref} />
        </div>

        <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14.5, color: '#C9C3B6' }}>
          Déjà un compte ?{' '}
          <a href={loginHref} style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: 700 }}>Se connecter</a>
        </p>
      </div>
    </div>
  )
}
