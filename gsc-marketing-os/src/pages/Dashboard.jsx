import { useMemo, useState } from 'react'
import {
  LayoutDashboard, Send, CalendarClock, ClipboardCheck, Hammer, Eye, MonitorPlay, Heart, UserPlus, MousePointerClick,
  MessageCircle, Inbox, BadgeCheck, Settings2, Target, Globe, ArrowRight,
} from 'lucide-react'
import { useData, useRecords } from '../lib/data'
import { fmt, fmtCompact, pct, inRange, fmtMonth, fmtDate, monthKey, today, cx, num, MONTHS_ID, startOfWeek, addDays, toISO } from '../lib/utils'
import { totalsRows, sumRows, sources, series, contentPerformance, groupPerf } from '../lib/metrics'
import { PageHeader, Stat, Card, Progress, Notice, Modal, Badge } from '../components/ui'
import DateFilter, { useDateFilter } from '../components/DateFilter'
import { Bars, Lines, NoData } from '../components/charts'
import { WORKFLOW, WORKFLOW_COLORS, PLATFORM_COLORS } from '../config/constants'

const WIDGETS = [
  ['kpi_content', 'KPI produksi konten'], ['kpi_perf', 'KPI performa'], ['goals', 'Target bulanan'], ['weekly', 'Progres mingguan'],
  ['c_output', 'Grafik output konten bulanan'], ['c_eng', 'Grafik engagement'], ['c_reach', 'Grafik reach & impressions'],
  ['c_leads', 'Grafik lead generation'], ['c_pillar', 'Performa per pilar'], ['c_platform', 'Performa per platform'],
  ['campaigns', 'Performa kampanye'], ['top', 'Top konten'],
]

const xMonth = (k) => (k?.length === 7 ? fmtMonth(k) : k?.length === 10 ? k.slice(8) + ' ' + MONTHS_ID[Number(k.slice(5, 7)) - 1] : k)

function goalActual(g, ctx) {
  const m = g.data.month
  const range = [m + '-01', m + '-31']
  const mRows = totalsRows(ctx.metrics, range)
  const t = sumRows(mRows)
  const metricGoal = ['Reach', 'Impressions', 'Engagement rate (%)', 'Followers baru', 'Profile visits', 'Website clicks', 'WhatsApp clicks'].includes(g.data.metric)
  if (metricGoal && !mRows.length) return null
  const leadsInMonth = ctx.leads.filter((l) => monthKey(l.data.first_contact) === m)
  switch (g.data.metric) {
    case 'Konten terbit': return ctx.content.filter((c) => monthKey(c.data.date) === m && ['Published', 'Evaluated'].includes(c.data.status)).length
    case 'Reach': return t.reach
    case 'Impressions': return t.impressions
    case 'Engagement rate (%)': return Number.isFinite(t.er) ? +t.er.toFixed(2) : 0
    case 'Followers baru': return t.followers_gained
    case 'Profile visits': return t.profile_visits
    case 'Website clicks': return t.link_clicks
    case 'WhatsApp clicks': return t.wa_clicks
    case 'Inquiries': return Math.max(t.inquiries, leadsInMonth.length)
    case 'Qualified leads': return Math.max(t.qualified_leads, leadsInMonth.filter((l) => ['Qualified Lead', 'Follow-up', 'Deal'].includes(l.data.stage)).length)
    case 'Deal': return leadsInMonth.filter((l) => l.data.stage === 'Deal').length
    default: return 0
  }
}

export default function Dashboard() {
  const { workspace, records, byId } = useData()
  const content = useRecords('content')
  const metrics = useRecords('metrics')
  const leads = useRecords('leads')
  const goals = useRecords('goals')
  const campaigns = useRecords('campaigns')
  const f = useDateFilter('monthly')
  const [cfgOpen, setCfgOpen] = useState(false)
  const storeKey = `gsc.dash.${workspace?.id}`
  const [hidden, setHidden] = useState(() => { try { return JSON.parse(localStorage.getItem(storeKey) || '[]') } catch { return [] } })
  const show = (k) => !hidden.includes(k)
  const toggle = (k) => { const n = hidden.includes(k) ? hidden.filter((x) => x !== k) : [...hidden, k]; setHidden(n); localStorage.setItem(storeKey, JSON.stringify(n)) }

  const hasSample = records.some((r) => r.is_sample)
  const rows = useMemo(() => totalsRows(metrics, f.range), [metrics, f.range])
  const t = useMemo(() => sumRows(rows), [rows])
  const prevT = useMemo(() => (f.prev ? sumRows(totalsRows(metrics, f.prev)) : null), [metrics, f.prev])
  const src = sources(rows)

  const inR = content.filter((c) => inRange(c.data.date, f.range))
  const published = inR.filter((c) => ['Published', 'Evaluated'].includes(c.data.status)).length
  const scheduled = content.filter((c) => c.data.status === 'Scheduled').length
  const awaiting = content.filter((c) => c.data.approval === 'Menunggu approval' || c.data.status === 'Review').length
  const inProd = content.filter((c) => ['Brief', 'Scriptwriting', 'Production', 'Editing'].includes(c.data.status)).length
  const leadsR = leads.filter((l) => inRange(l.data.first_contact, f.range))
  const qualified = leadsR.filter((l) => ['Qualified Lead', 'Follow-up', 'Deal'].includes(l.data.stage)).length
  const delta = (k) => {
    if (!prevT || !prevT[k]) return null
    const ch = ((t[k] - prevT[k]) / prevT[k]) * 100
    return <span className={ch >= 0 ? 'text-emerald-600' : 'text-red-600'}>{ch >= 0 ? '▲' : '▼'} {Math.abs(ch).toFixed(1)}% vs periode lalu</span>
  }

  // charts
  const outputSeries = useMemo(() => {
    const m = {}
    content.forEach((c) => {
      if (!c.data.date) return
      const k = monthKey(c.data.date)
      m[k] = m[k] || { key: k, published: 0, planned: 0 }
      if (['Published', 'Evaluated'].includes(c.data.status)) m[k].published++; else m[k].planned++
    })
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key)).slice(-12)
  }, [content])
  const gran = f.preset === 'all' || f.preset === 'quarterly' ? 'week' : f.preset === 'custom' ? 'week' : 'week'
  const allAcct = totalsRows(metrics, f.preset === 'all' ? f.range : [toISO(addDays(new Date(), -120)), today()])
  const engSeries = series(f.preset === 'monthly' || f.preset === 'weekly' || f.preset === 'daily' ? allAcct : rows, gran, ['engagement', 'reach']).map((d) => ({ ...d, er: d.reach ? +((d.engagement / d.reach) * 100).toFixed(2) : 0 }))
  const reachSeries = series(f.preset === 'monthly' || f.preset === 'weekly' || f.preset === 'daily' ? allAcct : rows, gran, ['reach', 'impressions'])
  const leadSeries = useMemo(() => {
    const m = {}
    leads.forEach((l) => {
      if (!l.data.first_contact) return
      const k = monthKey(l.data.first_contact)
      m[k] = m[k] || { key: k, inquiry: 0, qualified: 0, deal: 0 }
      m[k].inquiry++
      if (['Qualified Lead', 'Follow-up', 'Deal'].includes(l.data.stage)) m[k].qualified++
      if (l.data.stage === 'Deal') m[k].deal++
    })
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key)).slice(-12)
  }, [leads])
  const perf = contentPerformance(metrics.filter((m) => inRange(m.data.date, f.range)), byId)
  const byPillar = groupPerf(perf, (p) => p.content.data.pillar)
  const byPlatform = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Threads'].map((p) => {
    const s = sumRows(totalsRows(metrics, f.range, p))
    return { key: p, reach: s.reach, engagement: s.engagement, er: Number.isFinite(s.er) ? +s.er.toFixed(2) : 0 }
  }).filter((x) => x.reach > 0)

  // weekly progress
  const ws = startOfWeek(new Date()); const we = addDays(ws, 6)
  const weekRange = [toISO(ws), toISO(we)]
  const weekItems = content.filter((c) => inRange(c.data.date, weekRange))
  const weekDone = weekItems.filter((c) => ['Published', 'Evaluated', 'Scheduled'].includes(c.data.status)).length
  const upcoming = content.filter((c) => c.data.date >= today() && !['Published', 'Evaluated'].includes(c.data.status)).sort((a, b) => (a.data.date + (a.data.time || '')).localeCompare(b.data.date + (b.data.time || ''))).slice(0, 6)

  const thisMonth = today().slice(0, 7)
  const monthGoals = goals.filter((g) => g.data.month === thisMonth)
  const ctx = { metrics, leads, content }

  return (
    <div>
      <PageHeader icon={LayoutDashboard} title="Marketing Overview" subtitle={`${workspace?.name} · ringkasan seluruh aktivitas marketing`}
        actions={<><DateFilter f={f} /><button className="btn-outline btn-sm py-1.5" onClick={() => setCfgOpen(true)}><Settings2 size={14} /> Atur dashboard</button></>} />

      {hasSample && <Notice kind="warn" className="mb-4">Workspace ini memuat <b>data contoh</b> untuk ilustrasi. Angka di bawah bukan performa nyata GSC. Hapus data contoh di <a className="underline" href="#/settings">Pengaturan</a> sebelum memakai dashboard untuk pelaporan.</Notice>}

      {show('kpi_content') && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Konten terbit (periode)" value={published} icon={Send} tone="green" sub={`${inR.length} konten terjadwal di periode ini`} />
          <Stat label="Terjadwal" value={scheduled} icon={CalendarClock} tone="blue" sub="status Scheduled" />
          <Stat label="Menunggu approval" value={awaiting} icon={ClipboardCheck} tone="amber" sub="Review / menunggu" />
          <Stat label="Dalam produksi" value={inProd} icon={Hammer} tone="violet" sub="Brief → Editing" />
        </div>
      )}

      {show('kpi_perf') && (
        <>
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400"><span>Sumber data performa: {src.label}{src.sample && ' (termasuk data CONTOH)'}</span></div>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Total reach" value={fmtCompact(t.reach)} icon={Eye} sub={delta('reach')} />
            <Stat label="Impressions" value={fmtCompact(t.impressions)} icon={MonitorPlay} sub={delta('impressions')} />
            <Stat label="Engagement rate" value={pct(t.er, 2)} icon={Heart} tone="rose" sub={`${fmt(t.engagement)} interaksi`} />
            <Stat label="Followers baru" value={fmt(t.followers_gained)} icon={UserPlus} tone="green" sub={delta('followers_gained')} />
            <Stat label="Profile visits" value={fmt(t.profile_visits)} icon={Globe} tone="violet" sub={delta('profile_visits')} />
            <Stat label="Website clicks" value={fmt(t.link_clicks)} icon={MousePointerClick} tone="blue" sub={delta('link_clicks')} />
            <Stat label="WhatsApp clicks" value={fmt(t.wa_clicks)} icon={MessageCircle} tone="green" sub={delta('wa_clicks')} />
            <Stat label="Inquiry masuk" value={fmt(Math.max(leadsR.length, t.inquiries))} icon={Inbox} tone="amber" sub={`${leadsR.length} tercatat di Leads`} />
            <Stat label="Qualified leads" value={fmt(qualified)} icon={BadgeCheck} tone="navy" sub="Qualified / Follow-up / Deal" />
          </div>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {show('goals') && (
          <Card title="Target bulan ini" subtitle={fmtMonth(thisMonth)} actions={<a href="#/strategy/goals" className="text-xs text-electric">Kelola →</a>}>
            {!monthGoals.length ? <div className="py-6 text-center text-sm text-slate-400">Belum ada target. <a href="#/strategy/goals" className="text-electric">Tambah target</a></div> : (
              <div className="space-y-3">
                {monthGoals.map((g) => {
                  const a = goalActual(g, ctx)
                  return (
                    <div key={g.id}>
                      <div className="mb-1 flex justify-between text-sm"><span className="flex items-center gap-1.5"><Target size={13} className="text-electric" />{g.data.title}</span><span className="font-semibold">{a == null ? <span className="text-xs font-normal text-slate-400">Belum ada data</span> : fmt(a)} / {fmt(g.data.target)}</span></div>
                      <Progress value={a || 0} max={num(g.data.target)} />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}
        {show('weekly') && (
          <Card title="Progres minggu ini" subtitle={`${fmtDate(weekRange[0])} – ${fmtDate(weekRange[1])}`} className="lg:col-span-2" actions={<a href="#/calendar" className="text-xs text-electric">Kalender →</a>}>
            <div className="mb-3 flex items-center gap-3"><Progress value={weekDone} max={weekItems.length || 1} /><span className="whitespace-nowrap text-sm font-semibold">{weekDone}/{weekItems.length} siap/terbit</span></div>
            <div className="mb-3 flex flex-wrap gap-1.5">{WORKFLOW.map((s) => { const n = weekItems.filter((c) => c.data.status === s).length; return n ? <span key={s} className={cx('chip', WORKFLOW_COLORS[s])}>{s}: {n}</span> : null })}</div>
            <div className="divide-y">
              {upcoming.length ? upcoming.map((c) => (
                <a key={c.id} href={`#/calendar/${c.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-slate-50">
                  <span className="w-20 shrink-0 text-xs text-slate-500">{fmtDate(c.data.date)}</span>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PLATFORM_COLORS[c.data.platform] }} />
                  <span className="flex-1 truncate">{c.data.title}</span>
                  <span className={cx('chip', WORKFLOW_COLORS[c.data.status])}>{c.data.status}</span>
                </a>
              )) : <div className="py-4 text-center text-sm text-slate-400">Tidak ada konten mendatang.</div>}
            </div>
          </Card>
        )}

        {show('c_output') && <Card title="Output konten bulanan" subtitle="Terbit vs direncanakan"><Bars data={outputSeries} bars={[{ key: 'published', name: 'Terbit' }, { key: 'planned', name: 'Direncanakan', color: '#cbd5e1' }]} stacked xFmt={xMonth} /></Card>}
        {show('c_eng') && <Card title="Pertumbuhan engagement" subtitle="Interaksi mingguan (likes+comments+shares+saves)"><Lines data={engSeries} lines={[{ key: 'engagement', name: 'Engagement' }]} xFmt={xMonth} area /></Card>}
        {show('c_reach') && <Card title="Reach & impressions" subtitle="Mingguan, level akun"><Lines data={reachSeries} lines={[{ key: 'reach', name: 'Reach' }, { key: 'impressions', name: 'Impressions', color: '#38bdf8' }]} xFmt={xMonth} /></Card>}
        {show('c_leads') && <Card title="Lead generation" subtitle="Per bulan (dari modul Leads)"><Bars data={leadSeries} bars={[{ key: 'inquiry', name: 'Inquiry' }, { key: 'qualified', name: 'Qualified', color: '#0b1b3f' }, { key: 'deal', name: 'Deal', color: '#22c55e' }]} xFmt={xMonth} /></Card>}
        {show('c_pillar') && <Card title="Performa per content pillar" subtitle="Engagement rate rata-rata (data per konten)"><Bars data={byPillar.map((p) => ({ key: p.name, er: +p.er.toFixed(2) }))} bars={[{ key: 'er', name: 'ER %' }]} horizontal h={260} /></Card>}
        {show('c_platform') && <Card title="Performa per platform" subtitle="Reach & engagement periode ini"><Bars data={byPlatform} bars={[{ key: 'reach', name: 'Reach' }, { key: 'engagement', name: 'Engagement', color: '#0b1b3f' }]} colors={undefined} /></Card>}

        {show('campaigns') && (
          <Card title="Performa kampanye" className="lg:col-span-2" actions={<a href="#/campaigns" className="text-xs text-electric">Semua →</a>}>
            {!campaigns.length ? <NoData h={120} text="Belum ada kampanye" /> : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500"><tr><th className="py-1.5">Kampanye</th><th>Jenis</th><th>Status</th><th className="text-right">Budget</th><th className="text-right">Terpakai</th><th className="text-right">Leads</th></tr></thead>
                <tbody>{campaigns.map((c) => {
                  const ln = leads.filter((l) => l.data.campaign === c.id).length
                  return <tr key={c.id} className="border-t"><td className="py-2 font-medium">{c.data.name}</td><td>{c.data.kind}</td><td><Badge>{c.data.status}</Badge></td><td className="text-right">{fmtCompact(c.data.budget)}</td><td className="text-right">{fmtCompact(c.data.spend)}</td><td className="text-right">{ln}</td></tr>
                })}</tbody>
              </table></div>
            )}
          </Card>
        )}
        {show('top') && (
          <Card title="Top konten (periode)" actions={<a href="#/analytics" className="text-xs text-electric">Analitik <ArrowRight size={11} className="inline" /></a>}>
            {!perf.length ? <NoData h={120} text="Belum ada data performa per konten" /> : (
              <ol className="space-y-2">{[...perf].sort((a, b) => b.score - a.score).slice(0, 5).map((p, i) => (
                <li key={p.id} className="flex items-start gap-2 text-sm"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-electric-50 text-[11px] font-bold text-electric">{i + 1}</span>
                  <div className="min-w-0"><div className="truncate font-medium">{p.content.data.title}</div><div className="text-xs text-slate-500">{fmtCompact(p.reach)} reach · ER {pct(p.er)} · {p.inquiries} inquiry</div></div></li>
              ))}</ol>
            )}
          </Card>
        )}
      </div>

      <Modal open={cfgOpen} onClose={() => setCfgOpen(false)} title="Atur widget dashboard">
        <p className="mb-3 text-sm text-slate-500">Pilih widget yang ditampilkan. Pengaturan disimpan di perangkat ini.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{WIDGETS.map(([k, l]) => <label key={k} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={show(k)} onChange={() => toggle(k)} />{l}</label>)}</div>
      </Modal>
    </div>
  )
}
