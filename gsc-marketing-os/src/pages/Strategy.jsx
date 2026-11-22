import { useEffect, useState } from 'react'
import { Compass, Layers, Grid3x3, CalendarRange, Target, Plus, Pencil, ArrowRight, Trash2, Save } from 'lucide-react'
import RecordManager from '../components/RecordManager'
import { RecordForm } from '../components/RecordForm'
import { PageHeader, Tabs, Progress, Notice, Card } from '../components/ui'
import { useData, useRecords } from '../lib/data'
import { contentPerformance, groupPerf } from '../lib/metrics'
import { today, monthKey, pct, fmtCompact } from '../lib/utils'
import { WEEKLY_DEFAULT, STORY_TYPES } from '../config/constants'

function Pillars() {
  const { canWrite, byId } = useData()
  const pillars = useRecords('pillars')
  const content = useRecords('content')
  const metrics = useRecords('metrics')
  const [edit, setEdit] = useState(null)
  const m = today().slice(0, 7)
  const perf = groupPerf(contentPerformance(metrics, byId), (p) => p.content.data.pillar)
  const perfBy = Object.fromEntries(perf.map((p) => [p.name, p]))
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="muted">Pilar konten GSC beserta objektif, audiens, format, KPI, dan performanya.</p>
        {canWrite && <button className="btn-primary" onClick={() => setEdit('new')}><Plus size={15} /> Pilar</button>}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pillars.map((p) => {
          const d = p.data
          const count = content.filter((c) => c.data.pillar === d.name && monthKey(c.data.date) === m).length
          const pf = perfBy[d.name]
          return (
            <div key={p.id} className="card overflow-hidden">
              <div className="h-1.5" style={{ background: d.color || '#1f6bff' }} />
              <div className="p-4">
                <div className="mb-1 flex items-start justify-between">
                  <div className="font-semibold text-navy-900">{d.name} {d.active === false && <span className="chip bg-slate-100 text-slate-500">nonaktif</span>}</div>
                  <button className="btn-ghost p-1" onClick={() => setEdit(p)}><Pencil size={14} /></button>
                </div>
                <p className="mb-3 line-clamp-2 text-xs text-slate-600">{d.description}</p>
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div><div className="text-slate-400">Objektif</div><div className="font-medium">{d.objective || '–'}</div></div>
                  <div><div className="text-slate-400">KPI</div><div className="font-medium">{d.kpi || '–'}</div></div>
                  <div className="col-span-2"><div className="text-slate-400">Format</div><div>{(d.formats || []).join(', ') || '–'}</div></div>
                  <div className="col-span-2"><div className="text-slate-400">Audiens</div><div>{(d.audience || []).join(', ') || '–'}</div></div>
                </div>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Konten bulan ini</span><span className="font-semibold">{count}{d.monthly_target ? ` / ${d.monthly_target}` : ''}</span></div>
                <Progress value={count} max={d.monthly_target || count || 1} />
                <div className="mt-3 flex gap-3 border-t pt-2 text-xs text-slate-600">
                  {pf ? <><span>{pf.posts} konten terukur</span><span>ER {pct(pf.er)}</span><span>{fmtCompact(pf.avgReach)} reach/post</span></> : <span className="text-slate-400">Belum ada data performa</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <RecordForm module="pillars" open={!!edit} record={edit !== 'new' ? edit : null} onClose={() => setEdit(null)} />
    </div>
  )
}

function Matrix() {
  const rows = useRecords('matrix')
  const steps = [['problem', 'Masalah audiens'], ['objective', 'Objektif'], ['pillar', 'Pilar'], ['format', 'Format'], ['cta', 'CTA'], ['kpi', 'KPI']]
  return (
    <div>
      <Notice className="mb-3">Setiap baris menghubungkan: <b>Masalah audiens → Objektif marketing → Content pillar → Format → CTA → KPI</b>. Gunakan matrix ini sebagai acuan saat membuat ide konten.</Notice>
      {rows.length > 0 && (
        <div className="mb-5 space-y-2">
          {rows.slice(0, 6).map((r) => (
            <div key={r.id} className="card flex flex-col gap-2 overflow-x-auto p-3 md:flex-row md:items-stretch">
              {steps.map(([k, l], i) => (
                <div key={k} className="flex items-center gap-2 md:min-w-0 md:flex-1">
                  <div className="flex-1 rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <div className="text-[10px] font-semibold uppercase text-slate-400">{l}</div>
                    <div className="line-clamp-2 text-xs font-medium text-navy-900">{r.data[k] || '–'}</div>
                    {k === 'problem' && r.data.audience && <div className="text-[10px] text-electric">{r.data.audience}</div>}
                  </div>
                  {i < steps.length - 1 && <ArrowRight size={14} className="hidden shrink-0 text-slate-300 md:block" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <RecordManager module="matrix" emptyHint="Mulai dari masalah audiens yang nyata, lalu tentukan objektif, pilar, format, CTA, dan KPI." />
    </div>
  )
}

function Weekly() {
  const { workspace, updateWorkspaceSettings, canWrite, toast } = useData()
  const [weekly, setWeekly] = useState(WEEKLY_DEFAULT)
  const [stories, setStories] = useState(STORY_TYPES)
  const [newStory, setNewStory] = useState('')
  useEffect(() => {
    setWeekly(workspace?.settings?.weekly || WEEKLY_DEFAULT)
    setStories(workspace?.settings?.stories || STORY_TYPES)
  }, [workspace?.id]) // eslint-disable-line
  const save = async () => { await updateWorkspaceSettings({ weekly, stories }); toast('Struktur mingguan disimpan') }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Struktur editorial mingguan" subtitle="Saran awal — bebas diubah, bukan aturan tetap" className="lg:col-span-2"
        actions={canWrite && <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={() => setWeekly(WEEKLY_DEFAULT)}>Reset</button><button className="btn-primary btn-sm" onClick={save}><Save size={13} /> Simpan</button></div>}>
        <div className="space-y-2">
          {weekly.map((w, i) => (
            <div key={w.day} className="flex items-center gap-3">
              <div className="w-20 shrink-0 text-sm font-semibold text-navy-900">{w.day}</div>
              <input className="input" disabled={!canWrite} value={w.plan} onChange={(e) => setWeekly(weekly.map((x, j) => (j === i ? { ...x, plan: e.target.value } : x)))} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="Story content" subtitle="Format story berulang">
        <div className="space-y-1.5">
          {stories.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">{s}
              {canWrite && <button className="text-slate-400 hover:text-red-600" onClick={() => setStories(stories.filter((_, j) => j !== i))}><Trash2 size={13} /></button>}
            </div>
          ))}
          {canWrite && <div className="flex gap-2 pt-1"><input className="input" placeholder="Tambah jenis story…" value={newStory} onChange={(e) => setNewStory(e.target.value)} /><button className="btn-outline" onClick={() => { if (newStory.trim()) { setStories([...stories, newStory.trim()]); setNewStory('') } }}><Plus size={14} /></button></div>}
          {canWrite && <button className="btn-primary btn-sm mt-2 w-full" onClick={save}>Simpan</button>}
        </div>
      </Card>
    </div>
  )
}

export default function Strategy({ param }) {
  const [tab, setTab] = useState(param || 'pillars')
  return (
    <div>
      <PageHeader icon={Compass} title="Content Strategy Center" subtitle="Pilar konten, strategy matrix, struktur mingguan, dan target bulanan." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'pillars', label: 'Content Pillars', icon: Layers },
        { id: 'matrix', label: 'Strategy Matrix', icon: Grid3x3 },
        { id: 'weekly', label: 'Struktur Mingguan', icon: CalendarRange },
        { id: 'goals', label: 'Target Bulanan', icon: Target },
      ]} />
      {tab === 'pillars' && <Pillars />}
      {tab === 'matrix' && <Matrix />}
      {tab === 'weekly' && <Weekly />}
      {tab === 'goals' && <RecordManager module="goals" initial={{ month: today().slice(0, 7) }} notice="Target dibandingkan otomatis dengan data yang tercatat (konten, metrik, leads) di dashboard." emptyHint="Tetapkan target bulanan: jumlah konten terbit, reach, inquiry, qualified leads, dll." />}
    </div>
  )
}
