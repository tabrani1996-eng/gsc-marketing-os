import { useState } from 'react'
import { Megaphone, Wallet, Users, Eye, TrendingUp, Pencil, FileText } from 'lucide-react'
import RecordManager from '../components/RecordManager'
import { RecordForm } from '../components/RecordForm'
import { PageHeader, Progress, Notice, SampleBadge, Tabs, Empty } from '../components/ui'
import { useData, useRecords } from '../lib/data'
import { fmtRp, fmtDate, fmtCompact, num, pct, cx, exportPDF } from '../lib/utils'
import { sumRows } from '../lib/metrics'

export function campaignStats(c, { content, leads, metrics }) {
  const items = content.filter((x) => x.data.campaign === c.id)
  const ids = new Set(items.map((x) => x.id))
  const t = sumRows(metrics.filter((m) => ids.has(m.data.content)))
  const ld = leads.filter((l) => l.data.campaign === c.id)
  const deals = ld.filter((l) => l.data.stage === 'Deal')
  const spend = num(c.data.spend); const budget = num(c.data.budget)
  const revenue = num(c.data.revenue) || deals.reduce((a, l) => a + num(l.data.value), 0)
  return {
    items, t, leads: ld, deals, spend, budget, revenue,
    cpl: spend > 0 && ld.length ? spend / ld.length : null,
    roi: spend > 0 && revenue > 0 ? ((revenue - spend) / spend) * 100 : null,
  }
}

function CampaignCards() {
  const all = useRecords('campaigns')
  const content = useRecords('content')
  const leads = useRecords('leads')
  const metrics = useRecords('metrics')
  const [edit, setEdit] = useState(null)
  if (!all.length) return <Empty title="Belum ada kampanye" hint="Buat kampanye di tab Daftar." />
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {all.map((c) => {
          const s = campaignStats(c, { content, leads, metrics })
          return (
            <div key={c.id} className="card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div><div className="font-semibold text-navy-900">{c.is_sample && <SampleBadge />} {c.data.name}</div><div className="text-xs text-slate-500">{c.data.kind} · {c.data.objective} · {fmtDate(c.data.start)} – {fmtDate(c.data.end)}</div></div>
                <div className="flex items-center gap-1"><span className={cx('chip', c.data.status === 'Berjalan' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100')}>{c.data.status}</span><button className="btn-ghost p-1" onClick={() => setEdit(c)}><Pencil size={14} /></button></div>
              </div>
              {c.data.message && <p className="mb-3 text-sm text-slate-600">“{c.data.message}”</p>}
              {s.budget > 0 && <div className="mb-3"><div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Budget terpakai</span><span className="font-semibold">{fmtRp(s.spend)} / {fmtRp(s.budget)}</span></div><Progress value={s.spend} max={s.budget} /></div>}
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-2"><Eye size={12} className="text-electric" /><div className="font-bold text-navy-900">{fmtCompact(s.t.reach)}</div><div className="text-slate-500">reach ({s.items.length} konten)</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><Users size={12} className="text-electric" /><div className="font-bold text-navy-900">{s.leads.length}</div><div className="text-slate-500">leads · {s.deals.length} deal</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><Wallet size={12} className="text-electric" /><div className="font-bold text-navy-900">{s.cpl != null ? fmtRp(s.cpl) : '–'}</div><div className="text-slate-500">biaya / lead</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><TrendingUp size={12} className="text-electric" /><div className={cx('font-bold', s.roi == null ? 'text-slate-400' : s.roi >= 0 ? 'text-emerald-600' : 'text-red-600')}>{s.roi != null ? pct(s.roi) : 'Data kurang'}</div><div className="text-slate-500">ROI</div></div>
              </div>
              {s.roi == null && <div className="mt-2 text-[11px] text-slate-400">ROI dihitung bila realisasi biaya & nilai deal terkait sudah diisi.</div>}
              {c.data.evaluation && <div className="mt-3 border-t pt-2 text-xs text-slate-600"><b>Evaluasi:</b> {c.data.evaluation}</div>}
            </div>
          )
        })}
      </div>
      <RecordForm module="campaigns" open={!!edit} record={edit} onClose={() => setEdit(null)} />
    </>
  )
}

export default function Campaigns() {
  const [tab, setTab] = useState('cards')
  const all = useRecords('campaigns')
  const content = useRecords('content'); const leads = useRecords('leads'); const metrics = useRecords('metrics')
  const report = () => exportPDF({
    title: 'Laporan Kampanye', filename: 'gsc-kampanye',
    columns: [{ key: 'name', label: 'Kampanye' }, { key: 'kind', label: 'Jenis' }, { key: 'status', label: 'Status' }, { key: 'budget', label: 'Budget' }, { key: 'spend', label: 'Biaya' }, { key: 'leads', label: 'Leads' }, { key: 'deals', label: 'Deal' }, { key: 'roi', label: 'ROI' }],
    rows: all.map((c) => { const s = campaignStats(c, { content, leads, metrics }); return { ...c.data, budget: fmtRp(s.budget), spend: fmtRp(s.spend), leads: s.leads.length, deals: s.deals.length, roi: s.roi != null ? pct(s.roi) : 'Data kurang' } }),
  })
  return (
    <div>
      <PageHeader icon={Megaphone} title="Campaign Management" subtitle="Kampanye organik & berbayar: pesan, budget, konten, leads, hasil, dan evaluasi."
        actions={<button className="btn-outline btn-sm py-1.5" onClick={report}><FileText size={14} /> Laporan PDF</button>} />
      <Notice className="mb-3">Hubungkan konten ke kampanye lewat field “Kampanye” di setiap konten, dan lead lewat field yang sama di modul Leads. ROI hanya ditampilkan bila datanya cukup.</Notice>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'cards', label: 'Ringkasan performa' }, { id: 'list', label: 'Daftar kampanye', count: all.length }]} />
      {tab === 'cards' ? <CampaignCards /> : <RecordManager module="campaigns" emptyHint="Buat kampanye pertama: objektif, audiens, pesan utama, platform, budget, dan periode." />}
    </div>
  )
}
