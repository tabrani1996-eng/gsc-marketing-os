import { useEffect, useRef, useState } from 'react'
import { Settings as Cog, Users, Database, Download, Upload, Trash2, FlaskConical, Plus, Sparkles, Building2, Save } from 'lucide-react'
import { PageHeader, Card, Notice, Confirm, Badge } from '../components/ui'
import { useData } from '../lib/data'
import { supabase } from '../lib/supabase'
import { seedWorkspace } from '../lib/seed'
import { downloadBlob, exportCSV, today } from '../lib/utils'
import { MODULES } from '../config/modules'
import { aiStatus } from '../lib/ai'
import { exportColumns } from '../components/RecordManager'

export default function Settings() {
  const { workspace, role, records, renameWorkspace, removeWhere, reload, createMany, createWorkspace, user, toast, canWrite } = useData()
  const [name, setName] = useState(workspace?.name || '')
  const [members, setMembers] = useState([])
  const [email, setEmail] = useState('')
  const [mrole, setMrole] = useState('editor')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState(null)
  const [newWs, setNewWs] = useState('')
  const fileRef = useRef()
  const sampleCount = records.filter((r) => r.is_sample).length

  const loadMembers = async () => {
    const { data } = await supabase.from('mkt_members').select('*').eq('workspace_id', workspace.id).order('created_at')
    setMembers(data || [])
  }
  useEffect(() => { if (workspace) { loadMembers(); setName(workspace.name) } aiStatus(true).then(setAi) }, [workspace?.id]) // eslint-disable-line

  const invite = async () => {
    const { data, error } = await supabase.rpc('mkt_add_member', { ws: workspace.id, member_email: email.trim(), member_role: mrole })
    if (error) return toast(error.message, 'err')
    if (data === 'not_found') return toast('Email belum terdaftar. Minta yang bersangkutan membuat akun dulu, lalu undang lagi.', 'err')
    toast('Anggota ditambahkan'); setEmail(''); loadMembers()
  }
  const removeMember = async (m) => {
    const { error } = await supabase.from('mkt_members').delete().eq('workspace_id', workspace.id).eq('user_id', m.user_id)
    if (error) return toast(error.message, 'err')
    loadMembers()
  }

  const backup = () => {
    const payload = { app: 'GSC Digital Marketing OS', version: 1, exported_at: new Date().toISOString(), workspace: { name: workspace.name, settings: workspace.settings }, records: records.map((r) => ({ id: r.id, module: r.module, data: r.data, is_sample: r.is_sample, created_at: r.created_at })) }
    downloadBlob(JSON.stringify(payload, null, 2), `gsc-backup-${today()}.json`, 'application/json')
  }
  const exportAllCSV = () => {
    Object.keys(MODULES).filter((m) => MODULES[m].fields.length).forEach((m, i) => {
      const rows = records.filter((r) => r.module === m)
      if (!rows.length) return
      setTimeout(() => exportCSV(rows.map((r) => ({ ...r.data, _sample: r.is_sample ? 'CONTOH' : '' })), [...exportColumns(m), { key: '_sample', label: 'Label data' }], `gsc-${m}-${today()}`), i * 350)
    })
  }
  // Restores records and re-links references (content, campaign, content_ids, idea_id, repurposed_from) to the new ids.
  const restore = async (file) => {
    try {
      const j = JSON.parse(await file.text())
      if (!Array.isArray(j.records)) throw new Error('Format backup tidak dikenali')
      setBusy(true)
      const list = j.records.filter((r) => MODULES[r.module])
      const idMap = {}
      // insert referenced modules first so their new ids are known
      const order = ['campaigns', 'content', 'ideas']
      const rank = (m) => (order.includes(m) ? order.indexOf(m) : 9)
      const groups = {}
      list.forEach((r) => { (groups[r.module + '|' + !!r.is_sample] ||= []).push(r) })
      const remap = (d) => {
        const x = { ...d }
        ;['content', 'campaign', 'idea_id', 'repurposed_from'].forEach((k) => { if (x[k]) x[k] = idMap[x[k]] || null })
        if (Array.isArray(x.content_ids)) x.content_ids = x.content_ids.map((v) => idMap[v]).filter(Boolean)
        return x
      }
      let n = 0
      for (const k of Object.keys(groups).sort((a, b) => rank(a.split('|')[0]) - rank(b.split('|')[0]))) {
        const [m, smp] = k.split('|')
        const src = groups[k]
        const res = await createMany(m, src.map((r) => remap(r.data)), { sample: smp === 'true' })
        res.forEach((row, i) => { if (src[i]?.id) idMap[src[i].id] = row.id })
        n += res.length
      }
      toast(`${n} data dipulihkan (ditambahkan ke workspace ini)`)
    } catch (e) { toast('Gagal memulihkan: ' + e.message, 'err') }
    setBusy(false)
  }
  const loadSample = async () => { setBusy(true); try { await seedWorkspace(workspace.id, { sample: true, base: false }); await reload(); toast('Data contoh dimuat') } catch (e) { toast(e.message, 'err') } setBusy(false) }

  return (
    <div>
      <PageHeader icon={Cog} title="Pengaturan, Backup & Deployment" subtitle={`Workspace: ${workspace?.name} · peran Anda: ${role}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Workspace" subtitle="Privat — hanya anggota yang dapat mengakses">
          <label className="label">Nama workspace</label>
          <div className="flex gap-2"><input className="input" value={name} disabled={!canWrite} onChange={(e) => setName(e.target.value)} />{canWrite && <button className="btn-primary" onClick={() => renameWorkspace(name)}><Save size={14} /></button>}</div>
          <div className="mt-4 border-t pt-3">
            <label className="label">Buat workspace baru</label>
            <div className="flex gap-2"><input className="input" placeholder="Nama workspace" value={newWs} onChange={(e) => setNewWs(e.target.value)} /><button className="btn-outline" disabled={!newWs.trim()} onClick={async () => { const w = await createWorkspace(newWs.trim()); if (w) { await seedWorkspace(w.id, { sample: false }); setNewWs(''); window.location.reload() } }}><Building2 size={14} /> Buat</button></div>
          </div>
        </Card>

        <Card title="Anggota tim" subtitle="Owner dapat mengundang editor (bisa mengubah) atau viewer (hanya lihat)">
          <div className="mb-3 divide-y">{members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between py-2 text-sm">
              <span>{m.email || m.user_id.slice(0, 8)} {m.user_id === user.id && <span className="text-xs text-slate-400">(Anda)</span>}</span>
              <span className="flex items-center gap-2"><Badge>{m.role}</Badge>{role === 'owner' && m.role !== 'owner' && <button className="text-slate-400 hover:text-red-600" onClick={() => removeMember(m)}><Trash2 size={14} /></button>}</span>
            </div>
          ))}</div>
          {role === 'owner' && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="input" type="email" placeholder="email@perusahaan.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <select className="input sm:w-32" value={mrole} onChange={(e) => setMrole(e.target.value)}><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
              <button className="btn-primary" disabled={!email.includes('@')} onClick={invite}><Plus size={14} /> Undang</button>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">Anggota harus membuat akun terlebih dahulu di halaman login aplikasi ini.</p>
        </Card>

        <Card title="Data contoh" subtitle="Untuk mencoba fitur — tidak untuk pelaporan">
          <p className="mb-3 text-sm text-slate-600">Saat ini ada <b>{sampleCount}</b> data berlabel <Badge className="bg-amber-100 text-amber-800">CONTOH</Badge>.</p>
          {canWrite && <div className="flex flex-wrap gap-2">
            <button className="btn-danger" disabled={!sampleCount || busy} onClick={() => setConfirm('sample')}><Trash2 size={14} /> Hapus semua data contoh</button>
            <button className="btn-outline" disabled={busy} onClick={loadSample}><FlaskConical size={14} /> Muat data contoh</button>
          </div>}
        </Card>

        <Card title="Export & backup" subtitle={`${records.length} data di workspace ini`}>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={backup}><Download size={14} /> Backup lengkap (JSON)</button>
            <button className="btn-outline" onClick={exportAllCSV}><Database size={14} /> Export semua modul (CSV)</button>
            {canWrite && <><input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files[0] && restore(e.target.files[0])} /><button className="btn-outline" disabled={busy} onClick={() => fileRef.current.click()}><Upload size={14} /> Pulihkan dari backup</button></>}
          </div>
          <p className="mt-2 text-xs text-slate-400">Pemulihan menambahkan data dari file backup ke workspace ini dan menyambung ulang relasi antar data (tidak menimpa data yang ada — sebaiknya pulihkan ke workspace baru/kosong agar tidak dobel). Data juga tersimpan & tersinkron di cloud (Supabase).</p>
        </Card>

        <Card title="AI Assistant" subtitle="Integrasi opsional">
          <div className="mb-2 flex items-center gap-2 text-sm"><Sparkles size={15} className="text-electric" /> Status: {ai ? (ai.configured ? <Badge className="bg-emerald-50 text-emerald-700">Aktif · {ai.model}</Badge> : <Badge className="bg-amber-50 text-amber-800">Belum aktif</Badge>) : '…'}</div>
          {!ai?.configured && <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Buat API key di console.anthropic.com</li>
            <li>Supabase Dashboard → project <b>GSC Toolkit</b> → Edge Functions → Secrets</li>
            <li>Tambahkan <code>ANTHROPIC_API_KEY</code> = key Anda (opsional: <code>ANTHROPIC_MODEL</code>)</li>
            <li>Muat ulang halaman ini — status akan berubah menjadi Aktif</li>
          </ol>}
          <Notice className="mt-3">Key disimpan di server (Edge Function), tidak pernah ada di kode frontend. Hanya pengguna yang login yang dapat memanggil AI.</Notice>
        </Card>

        <Card title="Integrasi & keterbatasan" subtitle="Transparansi">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li><b>Publikasi:</b> belum ada API publikasi langsung — gunakan checklist publikasi manual di modul Social Media.</li>
            <li><b>Analitik:</b> input manual atau impor CSV (Insights, Metricool). Sumber data ditampilkan di setiap laporan.</li>
            <li><b>SEO:</b> tanpa koneksi data, volume & difficulty tidak ditampilkan.</li>
            <li><b>Riset web:</b> tombol pencarian membuka hasil di tab baru; catat temuan secara manual dengan sumbernya.</li>
          </ul>
        </Card>
      </div>
      <Confirm open={confirm === 'sample'} onClose={() => setConfirm(null)} title="Hapus semua data contoh?" message={`${sampleCount} data berlabel CONTOH akan dihapus permanen. Data asli Anda tidak terpengaruh.`} onConfirm={async () => { if (await removeWhere({ sample: true })) toast('Data contoh dihapus') }} />
    </div>
  )
}
