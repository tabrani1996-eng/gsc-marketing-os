import { useEffect, useState } from 'react'
import { GraduationCap, ExternalLink, CheckCircle2, Circle, ArrowRight, Save, Check } from 'lucide-react'
import { PageHeader, Card, Progress, Notice } from '../components/ui'
import { useData, useRecords } from '../lib/data'
import { cx } from '../lib/utils'
import { LEARNING } from '../config/learning'

function ModuleDetail({ m, rec, onSave, canWrite }) {
  const [d, setD] = useState({})
  useEffect(() => { setD(rec?.data || { module_key: m.key, status: 'Belum mulai', done: [], notes: '', reflection: '', score: null }) }, [m.key, rec?.id]) // eslint-disable-line
  const done = d.done || []
  const toggle = (i) => setD((x) => ({ ...x, done: done.includes(i) ? done.filter((y) => y !== i) : [...done, i] }))
  return (
    <div className="space-y-4">
      <Card title={m.title} subtitle="Pahami WHAT, WHY, dan HOW" actions={<a href={`#/${m.app}`} className="btn-outline btn-sm">Praktik di modul terkait <ArrowRight size={12} /></a>}>
        <div className="grid gap-4 md:grid-cols-2">
          <div><div className="mb-1 text-xs font-semibold text-slate-500">Tujuan belajar</div><ul className="space-y-1">{m.objectives.map((o) => <li key={o} className="flex gap-2 text-sm"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-electric" />{o}</li>)}</ul></div>
          <div><div className="mb-1 text-xs font-semibold text-slate-500">Sumber belajar</div><ul className="space-y-1">{m.resources.map(([l, u]) => <li key={u}><a href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-electric hover:underline">{l} <ExternalLink size={11} /></a></li>)}</ul></div>
        </div>
      </Card>
      <Card title="Tugas praktik" subtitle={`${done.length}/${m.assignments.length} selesai`}>
        <div className="space-y-2">{m.assignments.map((a, i) => (
          <button key={i} disabled={!canWrite} onClick={() => toggle(i)} className="flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:border-electric">
            {done.includes(i) ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <Circle size={16} className="mt-0.5 shrink-0 text-slate-300" />}<span className={cx(done.includes(i) && 'text-slate-400 line-through')}>{a}</span>
          </button>
        ))}</div>
      </Card>
      <Card title="Catatan & evaluasi">
        <div className="grid gap-3 md:grid-cols-3">
          <div><label className="label">Status</label><select className="input" disabled={!canWrite} value={d.status || 'Belum mulai'} onChange={(e) => setD({ ...d, status: e.target.value })}>{['Belum mulai', 'Sedang belajar', 'Selesai'].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Self-assessment (1–5)</label><select className="input" disabled={!canWrite} value={d.score || ''} onChange={(e) => setD({ ...d, score: Number(e.target.value) || null })}><option value="">–</option>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></div>
        </div>
        <label className="label mt-3">Catatan belajar</label>
        <textarea className="input" rows={5} disabled={!canWrite} value={d.notes || ''} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        <label className="label mt-3">Refleksi: apa yang akan saya terapkan di konten GSC & bagaimana mengukurnya?</label>
        <textarea className="input" rows={3} disabled={!canWrite} value={d.reflection || ''} onChange={(e) => setD({ ...d, reflection: e.target.value })} />
        {canWrite && <button className="btn-primary mt-3" onClick={() => onSave(d)}><Save size={14} /> Simpan progres</button>}
      </Card>
    </div>
  )
}

export default function Learning() {
  const { create, update, canWrite } = useData()
  const recs = useRecords('learning')
  const [sel, setSel] = useState(LEARNING[0].key)
  const byKey = Object.fromEntries(recs.map((r) => [r.data.module_key, r]))
  const progress = (m) => { const r = byKey[m.key]; return r ? (r.data.status === 'Selesai' ? 1 : (r.data.done || []).length / m.assignments.length) : 0 }
  const total = LEARNING.reduce((a, m) => a + progress(m), 0) / LEARNING.length
  const m = LEARNING.find((x) => x.key === sel)
  const save = async (d) => { const r = byKey[m.key]; if (r) await update(r.id, d); else await create('learning', { ...d, module_key: m.key }) }
  return (
    <div>
      <PageHeader icon={GraduationCap} title="Learning Center" subtitle="Berkembang sebagai Social Media & Digital Marketing Specialist — memahami WHAT, WHY, dan HOW." />
      <div className="card mb-4 flex items-center gap-4 p-4"><div className="text-sm font-semibold text-navy-900">Progres total</div><Progress value={total * 100} className="flex-1" /><div className="text-sm font-bold text-navy-900">{Math.round(total * 100)}%</div></div>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="card h-fit divide-y">
          {LEARNING.map((x, i) => (
            <button key={x.key} onClick={() => setSel(x.key)} className={cx('flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm', sel === x.key ? 'bg-electric-50' : 'hover:bg-slate-50')}>
              <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', progress(x) === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600')}>{progress(x) === 1 ? <Check size={12} /> : i + 1}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium text-navy-900">{x.title}</span><Progress value={progress(x) * 100} className="mt-1 h-1" /></span>
            </button>
          ))}
        </div>
        <div>
          <Notice className="mb-3">Setiap modul menghubungkan teori dengan praktik langsung di aplikasi ini, agar Anda tahu <b>apa</b> yang dipublikasikan, <b>kenapa</b>, dan <b>bagaimana</b> hasilnya dievaluasi.</Notice>
          <ModuleDetail m={m} rec={byKey[m.key]} onSave={save} canWrite={canWrite} />
        </div>
      </div>
    </div>
  )
}
