import { useState } from 'react'
import { Building2, LogOut } from 'lucide-react'
import { useData } from '../lib/data'
import { supabase } from '../lib/supabase'
import { seedWorkspace } from '../lib/seed'
import { Logo } from './Auth'

export default function Onboarding() {
  const data = useData()
  const [name, setName] = useState('Global Sky Clean — Marketing')
  const [withSample, setWithSample] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(data.error)

  const go = async () => {
    setBusy(true); setErr(null)
    const ws = await data.createWorkspace(name)
    if (ws) await seedWorkspace(ws.id, { sample: withSample })
    if (ws) await data.reload?.()
    setBusy(false)
    if (ws) window.location.reload()
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 p-6">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-6 flex items-center justify-between"><Logo /><button className="btn-ghost text-xs" onClick={() => supabase.auth.signOut()}><LogOut size={14} /> Keluar</button></div>
        <div className="mb-1 flex items-center gap-2 text-lg font-bold text-navy-900"><Building2 size={20} className="text-electric" /> Buat workspace</div>
        <p className="mb-5 text-sm text-slate-500">Workspace bersifat privat. Anda bisa mengundang anggota tim (editor/viewer) dari menu Pengaturan.</p>
        <label className="label">Nama workspace</label>
        <input className="input mb-4" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="mb-2 rounded-lg border border-slate-200 p-3 text-sm">
          <div className="font-medium text-navy-900">Konfigurasi awal yang otomatis disiapkan</div>
          <ul className="mt-1 list-disc pl-5 text-slate-600">
            <li>10 content pillar GSC + jadwal mingguan & story content (bisa diedit)</li>
            <li>5 profil audiens awal (berlabel <i>asumsi</i>, perlu divalidasi)</li>
            <li>Daftar keyword awal tanpa angka volume (tidak dikarang)</li>
          </ul>
        </div>
        <label className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <input type="checkbox" className="mt-1" checked={withSample} onChange={(e) => setWithSample(e.target.checked)} />
          <span>Muat juga <b>data contoh</b> (konten, metrik, leads, kampanye) agar dashboard bisa dicoba. Semua berlabel <b>CONTOH</b> dan bisa dihapus sekali klik di Pengaturan.</span>
        </label>
        {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <button className="btn-primary w-full py-2.5" disabled={busy || !name.trim()} onClick={go}>{busy ? 'Menyiapkan…' : 'Buat workspace'}</button>
      </div>
    </div>
  )
}
