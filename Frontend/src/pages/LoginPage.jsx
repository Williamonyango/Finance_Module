import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from '../context/SessionContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn } = useSession()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      const account = await signIn(email, password)
      toast.success(`Welcome, ${account.name}.`)
      navigate('/')
    } catch (error) {
      toast.error(error.message || 'Unable to sign in.')
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual-inner">
          <div className="brand brand--light"><div className="brand-mark">✦</div><div><strong>Parish Ledger</strong><span>Finance ERP</span></div></div>
          <div className="login-message"><span className="eyebrow eyebrow--light">Stewardship, simplified</span><h1>Clarity for every parish decision.</h1><p>A calm, connected workspace for managing church finances and serving your community well.</p></div>
          <div className="login-quote"><ShieldCheck size={18} /><span>Built for accountable, mission-led financial stewardship.</span></div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="mobile-brand brand"><div className="brand-mark">✦</div><div><strong>Parish Ledger</strong><span>Finance ERP</span></div></div>
          <span className="eyebrow">Welcome back</span>
          <h2>Sign in to your workspace</h2>
          <p className="form-intro">Sign in with your Finance ERP account to access your workspace.</p>
          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="email">Email address<div className="input-wrap"><Mail size={18} /><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div></label>
            <label htmlFor="password">Password<div className="input-wrap"><LockKeyhole size={18} /><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></div></label>
            <button className="primary-button" type="submit">Continue to workspace <ArrowRight size={18} /></button>
          </form>
          <p className="login-footnote">Sessions are securely maintained by the Finance ERP API.</p>
        </div>
      </section>
    </main>
  )
}
