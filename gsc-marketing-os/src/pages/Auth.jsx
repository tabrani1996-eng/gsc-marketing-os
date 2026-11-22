import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, ShieldCheck, Radar, Target, LineChart } from 'lucide-react'

export function Logo({ light }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-electric text-white">
        <svg viewBox="0 0 64 64" className="h-6 w-6"><path d="M12 40c6-14 34-14 40 0" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" /><circle cx="32" cy="24" r="7" fill="currentColor" /></svg>
      </div>
      <div className="leading-tight">
        <div className={`text-sm font-bold tracking-wide ${light ? 'text-white' : 'text-navy-900'}`}>GSC MARKETING OS</div>
        <div className={`text-[10px] ${light ? 'text-blue-200' : 'text-slate-500'}`}>Global Sky Clean</div>
      </div>
    </div>
  )
}

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (!data.session) setMsg({ ok: true, t: 'Akun dibuat. Cek email Anda untuk konfirmasi, lalu masuk.' })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) throw error
        setMsg({ ok: true, t: 'Link reset password telah dikirim ke email Anda.' })
      }
    } catch (err) {
      const t = err.message === 'Invalid login credentials' ? 'Email atau password salah.' : err.message
      setMsg({ ok: false, t })
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-full flex-col bg-navy-900 lg:flex-row">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-electric/20 blur-3xl" />
        <Logo light />
        <div className="relative max-w-lg">
          <h1 className="text-4xl font-bold leading-tight">Research. Strategize. Create.<br /><span className="text-electric-400">Publish. Analyze. Grow.</span></h1>
          <p className="mt-4 text-blue-100/80">Command center internal untuk seluruh alur digital marketing Global Sky Clean — dari riset pasar hingga lead dan evaluasi performa.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {[[Radar, 'Riset pasar & kompetitor'], [Target, 'Strategi & kalender konten'], [LineChart, 'Analitik & lead funnel'], [ShieldCheck, 'Workspace privat & aman']].map(([I, t]) => (
              <div key={t} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5"><I size={16} className="text-electric-400" />{t}</div>
            ))}
          </div>
        </div>
        <div className="text-xs text-blue-200/60">© Global Sky Clean — internal use only</div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 lg:max-w-xl lg:rounded-l-3xl">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-bold text-navy-900">{mode === 'login' ? 'Masuk' : mode === 'signup' ? 'Buat akun' : 'Reset password'}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">{mode === 'login' ? 'Masuk ke workspace marketing GSC.' : mode === 'signup' ? 'Daftar untuk membuat workspace privat.' : 'Masukkan email akun Anda.'}</p>
          <label className="label">Email</label>
          <input className="input mb-3" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== 'reset' && <>
            <label className="label">Password</label>
            <input className="input mb-4" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </>}
          {msg && <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.t}</div>}
          <button className="btn-primary w-full py-2.5" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}{mode === 'login' ? 'Masuk' : mode === 'signup' ? 'Daftar' : 'Kirim link reset'}</button>
          <div className="mt-4 flex justify-between text-sm">
            {mode !== 'login' ? <button type="button" className="text-electric" onClick={() => setMode('login')}>← Kembali masuk</button>
              : <button type="button" className="text-electric" onClick={() => setMode('signup')}>Buat akun baru</button>}
            {mode === 'login' && <button type="button" className="text-slate-500" onClick={() => setMode('reset')}>Lupa password?</button>}
          </div>
          {mode === 'signup' && <p className="mt-4 text-xs text-slate-400">Password minimal 8 karakter.</p>}
        </form>
      </div>
    </div>
  )
}
