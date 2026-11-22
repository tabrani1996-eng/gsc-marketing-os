import { useMemo, useState } from 'react'
import { Users, Columns3, Table2, BarChart3, FileText, Phone, AlarmClock, Plus } from 'lucide-react'
import RecordManager from '../components/RecordManager'
import { RecordForm } from '../components/RecordForm'
import { PageHeader, Tabs, Card, Stat, Notice, SampleBadge } from '../components/ui'
import { Bars, Donut } from '../components/charts'
import { useData, useRecords } from '../lib/data'
import { cx, fmtRp, fmtDate, fmtCompact, monthKey, fmtMonth, today, exportPDF, pct, num } from '../lib/utils'
import { FUNNEL, LEAD_SOURCES, PLATFORM_COLORS } from '../config/constants'

const STAGE_COLOR = { Awareness: 'bg-slate-100', Interest: 'bg-indigo-50', Consideration: 'bg-violet-50', Inquiry: 'bg-sky-50', 'Qualified Lead': 'bg-electric-100', 'Follow-up': 'bg-amber-50', Deal: 'bg-emerald-50', Lost: 'bg-red-50' }
const ORDER = Object.fromEntries(FUNNEL.map((s, i) => [s, i]))

function Board() {
  const { update, canWrite } = useData()
  const leads = useRecords('leads')
  const [edit, setEdit] = useState(null)
  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-3 scroll-thin">
        {FUNNEL.map((s) => {
          const list = leads.filter((l) => (l.data.stage || 'Inquiry') === s)
          const total = list.reduce((a, l) => a + num(l.data.value), 0)
          return (
            <div key={s} className={cx('w-64 shrink-0 rounded-xl p-2', STAGE_COLOR[s])}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData('text/id'); if (id && canWrite) update(id, { stage: s }, { silent: true }) }}>
              <div className="mb-2 px-1"><div className="flex justify-between text-sm font-semibold text-navy-900">{s}<span className="text-xs text-slate-500">{list.length}</span></div>{total > 0 && <div className="text-[11px] text-slate-500">{fmtRp(total)}</div>}</div>
              <div className="min-h-[100px] space-y-1.5">
                {list.map((l) => (
                  <div key={l.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/id', l.id)} onClick={() => setEdit(l)} className="cursor-grab rounded-lg bg-white p-2.5 text-xs shadow-sm ring-1 ring-slate-200 hover:ring-electric">
                    <div className="font-medium text-navy-900">{l.is_sample && <SampleBadge />} {l.data.name}</div>
                    <div className="text-slate-500">{l.data.company} · {l.data.building_type}</div>
                    <div className="mt-1 flex items-center justify-between"><span className="chip bg-slate-100" style={{ color: PLATFORM_COLORS[l.data.source] }}>{l.data.source}</span>{l.data.followup && <span className={cx('text-[10px]', l.data.followup < today() ? 'font-semibold text-red-600' : 'text-slate-500')}>FU {fmtDate(l.data.followup)}</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <RecordForm module="leads" open={!!edit} record={edit} onClose={() => setEdit(null)} />
    </>
  )
}

function Report() {
  const leads = useRecords('leads')
  const [month, setMonth] = useState(today().slice(0, 7))
  const ml = leads.filter((l) => monthKey(l.data.first_contact) === month)
  const reached = (arr, stage) => arr.filter((l) => l.data.stage !== 'Lost' ? ORDER[l.data.stage] >= ORDER[stage] : false).length
  const inquiries = ml.length
  const qualified = ml.filter((l) => ['Qualified Lead', 'Follow-up', 'Deal'].includes(l.data.stage)).length
  const deals = ml.filter((l) => l.data.stage === 'Deal')
  const lost = ml.filter((l) => l.data.stage === 'Lost').length
  const bySource = LEAD_SOURCES.map((s) => ({ name: s, value: ml.filter((l) => l.data.source === s).length, color: PLATFORM_COLORS[s] })).filter((x) => x.value)
  const monthly = useMemo(() => {
    const m = {}
    leads.forEach((l) => { const k = monthKey(l.data.first_contact); if (!k) return; m[k] = m[k] || { key: k, inquiry: 0, qualified: 0, deal: 0 }; m[k].inquiry++; if (['Qualified Lead', 'Follow-up', 'Deal'].includes(l.data.stage)) m[k].qualified++; if (l.data.stage === 'Deal') m[k].deal++ })
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key)).slice(-12)
  }, [leads])
  const funnelData = FUNNEL.filter((s) => s !== 'Lost').map((s) => ({ key: s, n: reached(leads, s) }))
  const dueFU = leads.filter((l) => l.data.followup && l.data.followup <= today() && !['Deal', 'Lost'].includes(l.data.stage))
  const months = [...new Set(leads.map((l) => monthKey(l.data.first_contact)).filter(Boolean))].sort().reverse()
  if (!months.includes(month)) months.unshift(month)

  const pdf = () => exportPDF({
    title: `Laporan Lead Generation — ${fmtMonth(month)}`, filename: `gsc-leads-${month}`,
    sections: [
      { heading: 'Ringkasan', text: `Inquiry masuk: ${inquiries}\nQualified lead: ${qualified} (${pct(inquiries ? (qualified / inquiries) * 100 : NaN)})\nDeal: ${deals.length} (${pct(inquiries ? (deals.length / inquiries) * 100 : NaN)} dari inquiry)\nLost: ${lost}\nNilai deal: ${fmtRp(deals.reduce((a, l) => a + num(l.data.value), 0))}${leads.some((l) => l.is_sample) ? '\n\nCatatan: workspace memuat DATA CONTOH.' : ''}` },
      { heading: 'Lead per sumber', columns: [{ key: 'name', label: 'Sumber' }, { key: 'value', label: 'Jumlah' }], rows: bySource },
      { heading: 'Daftar lead', columns: [{ key: 'name', label: 'Lead' }, { key: 'company', label: 'Perusahaan' }, { key: 'source', label: 'Sumber' }, { key: 'stage', label: 'Tahap' }, { get: (r) => fmtRp(r.value), label: 'Estimasi' }, { get: (r) => fmtDate(r.followup), label: 'Follow-up' }], rows: ml.map((l) => l.data) },
    ],
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}</select>
        <button className="btn-outline btn-sm py-1.5" onClick={pdf}><FileText size={14} /> Export laporan PDF</button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Inquiry masuk" value={inquiries} />
        <Stat label="Qualified lead" value={qualified} sub={`Rate ${pct(inquiries ? (qualified / inquiries) * 100 : NaN)}`} />
        <Stat label="Deal" value={deals.length} sub={`Konversi ${pct(inquiries ? (deals.length / inquiries) * 100 : NaN)}`} tone="green" />
        <Stat label="Lost" value={lost} tone="rose" />
        <Stat label="Nilai deal" value={fmtCompact(deals.reduce((a, l) => a + num(l.data.value), 0))} sub="Rp" tone="navy" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Sumber lead (bulan dipilih)"><Donut data={bySource} /></Card>
        <Card title="Lead per bulan" className="lg:col-span-2"><Bars data={monthly} bars={[{ key: 'inquiry', name: 'Inquiry' }, { key: 'qualified', name: 'Qualified', color: '#0b1b3f' }, { key: 'deal', name: 'Deal', color: '#22c55e' }]} xFmt={fmtMonth} /></Card>
        <Card title="Funnel keseluruhan" subtitle="Lead yang mencapai tiap tahap (tidak termasuk Lost)" className="lg:col-span-2"><Bars data={funnelData} bars={[{ key: 'n', name: 'Lead' }]} horizontal h={260} /></Card>
        <Card title="Follow-up jatuh tempo" subtitle={`${dueFU.length} lead`}>
          {!dueFU.length ? <div className="py-6 text-center text-sm text-slate-400">Tidak ada follow-up tertunda 🎉</div> : (
            <div className="space-y-2">{dueFU.map((l) => <div key={l.id} className="flex items-start gap-2 text-sm"><AlarmClock size={14} className="mt-0.5 text-red-500" /><div><div className="font-medium">{l.data.name}</div><div className="text-xs text-slate-500">{fmtDate(l.data.followup)} · {l.data.contact_person} {l.data.phone && <a className="text-electric" href={`https://wa.me/${String(l.data.phone).replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noreferrer"><Phone size={10} className="inline" /> WA</a>}</div></div></div>)}</div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function Leads({ param }) {
  const [tab, setTab] = useState(param || 'board')
  const leads = useRecords('leads')
  return (
    <div>
      <PageHeader icon={Users} title="Lead Generation & Conversion Tracker" subtitle="Awareness → Interest → Consideration → Inquiry → Qualified Lead → Follow-up → Deal" />
      <Notice className="mb-3">Data kontak lead bersifat pribadi — hanya anggota workspace yang dapat melihatnya. Catat sumber setiap inquiry agar performa kanal dapat dievaluasi.</Notice>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'board', label: 'Funnel board', icon: Columns3, count: leads.length }, { id: 'table', label: 'Tabel lead', icon: Table2 }, { id: 'report', label: 'Laporan bulanan', icon: BarChart3 }]} />
      {tab === 'board' && <><div className="mb-3 flex justify-end"><AddLead /></div><Board /></>}
      {tab === 'table' && <RecordManager module="leads" initial={{ first_contact: today() }} emptyHint="Tambahkan lead dari Instagram, TikTok, LinkedIn, WhatsApp, website, atau referral." />}
      {tab === 'report' && <Report />}
    </div>
  )
}

function AddLead() {
  const { canWrite } = useData()
  const [o, setO] = useState(false)
  if (!canWrite) return null
  return <><button className="btn-primary" onClick={() => setO(true)}><Plus size={15} /> Lead</button><RecordForm module="leads" open={o} initial={{ first_contact: today() }} onClose={() => setO(false)} /></>
}
