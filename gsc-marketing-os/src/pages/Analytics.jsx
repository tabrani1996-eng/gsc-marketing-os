import { useMemo, useState } from 'react'
import { BarChart3, Database, FileText, TrendingUp, TrendingDown, Info, MessageSquareQuote } from 'lucide-react'
import RecordManager from '../components/RecordManager'
import { PageHeader, Tabs, Card, Stat, Notice, Empty } from '../components/ui'
import { Bars, Lines } from '../components/charts'
import AIBox from '../components/AIBox'
import DateFilter, { useDateFilter } from '../components/DateFilter'
import { useData, useRecords } from '../lib/data'
import { fmt, fmtCompact, pct, inRange, fmtMonth, monthKey, fmtDate, exportPDF, cx, MONTHS_ID } from '../lib/utils'
import { totalsRows, sumRows, sources, series, contentPerformance, groupPerf, recommendations } from '../lib/metrics'

const KPIS = [['reach', 'Reach'], ['impressions', 'Impressions'], ['engagement', 'Engagement'], ['er', 'Engagement rate'], ['views', 'Views'], ['watch_time', 'Watch time (mnt)'], ['saves', 'Saves'], ['shares', 'Shares'], ['comments', 'Comments'], ['followers_gained', 'Followers baru'], ['profile_visits', 'Profile visits'], ['link_clicks', 'Link clicks'], ['wa_clicks', 'WhatsApp clicks'], ['inquiries', 'Inquiries'], ['qualified_leads', 'Qualified leads']]

function useAnalytics(f, platform) {
  const { byId } = useData()
  const metrics = useRecords('metrics')
  const leads = useRecords('leads')
  return useMemo(() => {
    const rows = totalsRows(metrics, f.range, platform)
    const totals = sumRows(rows)
    const prevTotals = f.prev ? sumRows(totalsRows(metrics, f.prev, platform)) : null
    const cm = metrics.filter((m) => inRange(m.data.date, f.range) && (!platform || m.data.platform === platform))
    const perf = contentPerformance(cm, byId)
    const byPillar = groupPerf(perf, (p) => p.content.data.pillar)
    const byFormat = groupPerf(perf, (p) => p.content.data.format)
    const monthly = {}
    totalsRows(metrics, ['0000', '9999'], platform).forEach((r) => { const k = monthKey(r.data.date); (monthly[k] ||= []).push(r) })
    const months = Object.entries(monthly).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6).map(([k, rs]) => ({ key: k, ...sumRows(rs) }))
    const observations = cm.filter((m) => m.data.observation).sort((a, b) => b.data.date.localeCompare(a.data.date))
    const leadsR = leads.filter((l) => inRange(l.data.first_contact, f.range))
    const recs = recommendations({ perf, byPillar, byFormat, totals, prevTotals, leads: leadsR })
    return { rows, totals, prevTotals, perf, byPillar, byFormat, months, observations, src: sources(rows.length ? rows : cm), recs, weekly: series(rows, 'week', ['reach', 'impressions', 'engagement']) }
  }, [metrics, leads, byId, f.range, f.prev, platform])
}

function Overview({ f, platform }) {
  const a = useAnalytics(f, platform)
  const sorted = [...a.perf].sort((x, y) => y.score - x.score)
  const val = (k) => (k === 'er' ? pct(a.totals.er, 2) : fmtCompact(a.totals[k]))
  const delta = (k) => {
    if (!a.prevTotals || !a.prevTotals[k] || k === 'er') return null
    const ch = ((a.totals[k] - a.prevTotals[k]) / a.prevTotals[k]) * 100
    return <span className={ch >= 0 ? 'text-emerald-600' : 'text-red-600'}>{ch >= 0 ? '▲' : '▼'} {Math.abs(ch).toFixed(1)}%</span>
  }
  const xw = (k) => k?.slice(8) + ' ' + MONTHS_ID[Number(k?.slice(5, 7)) - 1]
  const Row = ({ p, i }) => (
    <tr className="border-t text-xs">
      <td className="py-2 pr-2">{i + 1}</td>
      <td className="max-w-[220px] truncate py-2 pr-2 font-medium text-navy-900"><a href={`#/calendar/${p.id}`} className="hover:text-electric">{p.content.data.title}</a></td>
      <td>{p.content.data.platform}</td><td>{p.content.data.pillar}</td><td>{p.content.data.format}</td>
      <td className="text-right">{fmtCompact(p.reach)}</td><td className="text-right">{fmt(p.engagement)}</td><td className="text-right">{pct(p.er)}</td><td className="text-right">{p.saves}</td><td className="text-right">{p.inquiries}</td>
    </tr>
  )
  const head = <thead className="text-left text-[11px] text-slate-500"><tr><th>#</th><th>Konten</th><th>Platform</th><th>Pilar</th><th>Format</th><th className="text-right">Reach</th><th className="text-right">Eng.</th><th className="text-right">ER</th><th className="text-right">Saves</th><th className="text-right">Inq.</th></tr></thead>

  return (
    <div className="space-y-4">
      <div className={cx('flex items-center gap-2 rounded-lg px-3 py-2 text-xs', a.src.sample ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-600')}><Database size={13} /> Sumber data: <b>{a.src.label}</b>{a.src.sample && ' — termasuk DATA CONTOH (bukan performa nyata)'}. Total dihitung dari data level akun; bila tidak ada, dari penjumlahan data per konten.</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{KPIS.map(([k, l]) => <Stat key={k} label={l} value={val(k)} sub={delta(k)} />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Reach, impressions & engagement mingguan"><Lines data={a.weekly} lines={[{ key: 'reach', name: 'Reach' }, { key: 'impressions', name: 'Impressions', color: '#38bdf8' }, { key: 'engagement', name: 'Engagement', color: '#0b1b3f' }]} xFmt={xw} /></Card>
        <Card title="Rekomendasi berdasarkan data tercatat" subtitle="Aturan otomatis — bukan prediksi">
          {!a.recs.length ? <div className="text-sm text-slate-400">Belum cukup data.</div> : <ul className="space-y-2">{a.recs.map((r, i) => <li key={i} className="flex gap-2 text-sm">{r.kind === 'up' ? <TrendingUp size={15} className="mt-0.5 shrink-0 text-emerald-600" /> : r.kind === 'down' ? <TrendingDown size={15} className="mt-0.5 shrink-0 text-red-500" /> : <Info size={15} className="mt-0.5 shrink-0 text-electric" />}<span>{r.text}</span></li>)}</ul>}
        </Card>
        <Card title="Pilar terbaik (engagement rate)"><Bars data={a.byPillar.map((x) => ({ key: x.name, er: +x.er.toFixed(2), avgReach: x.avgReach }))} bars={[{ key: 'er', name: 'ER %' }]} horizontal h={260} /></Card>
        <Card title="Format terbaik (engagement rate)"><Bars data={a.byFormat.map((x) => ({ key: x.name, er: +x.er.toFixed(2) }))} bars={[{ key: 'er', name: 'ER %', color: '#0b1b3f' }]} horizontal h={260} /></Card>
      </div>
      <Card title="Konten performa tertinggi">{!sorted.length ? <Empty title="Belum ada data per konten" hint="Input metrik per konten di tab Input data." /> : <div className="overflow-x-auto"><table className="w-full">{head}<tbody>{sorted.slice(0, 5).map((p, i) => <Row key={p.id} p={p} i={i} />)}</tbody></table></div>}</Card>
      {sorted.length > 5 && <Card title="Konten performa terendah"><div className="overflow-x-auto"><table className="w-full">{head}<tbody>{sorted.slice(-5).reverse().map((p, i) => <Row key={p.id} p={p} i={i} />)}</tbody></table></div></Card>}
      <Card title="Perbandingan bulanan" subtitle="6 bulan terakhir">
        {!a.months.length ? <Empty title="Belum ada data" /> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead className="text-left text-slate-500"><tr><th className="py-1.5">Bulan</th>{['Reach', 'Impr.', 'Engagement', 'ER', 'Followers +', 'Profile visits', 'Link clicks', 'WA clicks', 'Inquiries'].map((h) => <th key={h} className="text-right">{h}</th>)}</tr></thead>
            <tbody>{a.months.map((m) => <tr key={m.key} className="border-t"><td className="py-2 font-medium">{fmtMonth(m.key)}</td>{['reach', 'impressions', 'engagement'].map((k) => <td key={k} className="text-right">{fmt(m[k])}</td>)}<td className="text-right">{pct(m.er, 2)}</td>{['followers_gained', 'profile_visits', 'link_clicks', 'wa_clicks', 'inquiries'].map((k) => <td key={k} className="text-right">{fmt(m[k])}</td>)}</tr>)}</tbody>
          </table></div>
        )}
      </Card>
      <Card title="Observasi respons audiens" subtitle="Dari catatan saat input data">
        {!a.observations.length ? <div className="text-sm text-slate-400">Belum ada observasi. Tambahkan di kolom “Observasi respons audiens” saat input data.</div> : <div className="space-y-2">{a.observations.slice(0, 10).map((o) => <div key={o.id} className="flex gap-2 text-sm"><MessageSquareQuote size={15} className="mt-0.5 shrink-0 text-electric" /><div><div>{o.data.observation}</div><div className="text-[11px] text-slate-400">{fmtDate(o.data.date)} · {o.data.platform}</div></div></div>)}</div>}
      </Card>
    </div>
  )
}

function MonthlyReport({ f, platform }) {
  const a = useAnalytics(f, platform)
  const [summary, setSummary] = useState('')
  const label = f.preset === 'custom' ? `${fmtDate(f.range[0])} – ${fmtDate(f.range[1])}` : f.preset === 'all' ? 'Semua periode' : `${fmtDate(f.range[0])} – ${fmtDate(f.range[1])}`
  const ctx = () => `Periode: ${label}${platform ? `, platform ${platform}` : ''}\nSumber data: ${a.src.label}${a.src.sample ? ' (DATA CONTOH)' : ''}\nTotal: ${KPIS.map(([k, l]) => `${l}=${k === 'er' ? pct(a.totals.er, 2) : fmt(a.totals[k])}`).join(', ')}\nPilar: ${a.byPillar.map((p) => `${p.name} ER ${p.er.toFixed(1)}% (${p.posts} konten)`).join('; ')}\nFormat: ${a.byFormat.map((p) => `${p.name} ER ${p.er.toFixed(1)}%`).join('; ')}\nTop konten: ${[...a.perf].sort((x, y) => y.score - x.score).slice(0, 3).map((p) => p.content.data.title).join('; ')}\nRekomendasi otomatis: ${a.recs.map((r) => r.text).join(' ')}`
  const pdf = () => exportPDF({
    title: 'Laporan Performa Marketing GSC', subtitle: `${label}${platform ? ' · ' + platform : ''} · sumber: ${a.src.label}${a.src.sample ? ' (termasuk DATA CONTOH)' : ''}`, filename: 'gsc-laporan-performa',
    sections: [
      { heading: 'Ringkasan KPI', columns: [{ key: 'l', label: 'Metrik' }, { key: 'v', label: 'Nilai' }], rows: KPIS.map(([k, l]) => ({ l, v: k === 'er' ? pct(a.totals.er, 2) : fmt(a.totals[k]) })) },
      ...(summary ? [{ heading: 'Ringkasan & analisis', text: summary }] : []),
      { heading: 'Rekomendasi (berdasarkan data tercatat)', text: a.recs.map((r) => '• ' + r.text).join('\n') || '-' },
      { heading: 'Performa per pilar', columns: [{ key: 'name', label: 'Pilar' }, { key: 'posts', label: 'Konten' }, { get: (r) => fmt(r.reach), label: 'Reach' }, { get: (r) => pct(r.er), label: 'ER' }, { key: 'inquiries', label: 'Inquiry' }], rows: a.byPillar },
      { heading: 'Top konten', columns: [{ get: (r) => r.content.data.title, label: 'Konten' }, { get: (r) => r.content.data.platform, label: 'Platform' }, { get: (r) => fmt(r.reach), label: 'Reach' }, { get: (r) => pct(r.er), label: 'ER' }], rows: [...a.perf].sort((x, y) => y.score - x.score).slice(0, 10) },
      { heading: 'Perbandingan bulanan', columns: [{ get: (r) => fmtMonth(r.key), label: 'Bulan' }, { get: (r) => fmt(r.reach), label: 'Reach' }, { get: (r) => fmt(r.engagement), label: 'Engagement' }, { get: (r) => pct(r.er, 2), label: 'ER' }, { get: (r) => fmt(r.inquiries), label: 'Inquiry' }], rows: a.months },
    ],
  })
  return (
    <div className="space-y-4">
      <Card title="Laporan performa" subtitle={label}>
        <p className="mb-3 text-sm text-slate-600">Laporan PDF berisi ringkasan KPI, rekomendasi, performa pilar, top konten, dan perbandingan bulanan — dengan sumber data tercantum.</p>
        <div className="mb-3 flex flex-wrap gap-2"><button className="btn-primary" onClick={pdf}><FileText size={15} /> Export laporan PDF</button></div>
        <label className="label">Ringkasan / analisis (opsional, ikut masuk ke PDF)</label>
        <textarea className="input mb-2" rows={8} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Tulis ringkasan evaluasi, pelajaran, dan rencana bulan depan…" />
        <AIBox task="Ringkasan laporan bulanan & analisis performa" label="Draf ringkasan dengan AI" compact context={ctx}
          buildPrompt={() => 'Tulis ringkasan laporan performa marketing (maks 250 kata) untuk manajemen GSC: apa yang berjalan baik, apa yang perlu diperbaiki, dan 3 rencana aksi bulan depan. Gunakan HANYA angka dari konteks; jika data contoh, sebutkan bahwa ini data contoh.'}
          onResult={(t) => setSummary(t)} />
      </Card>
    </div>
  )
}

export default function Analytics({ param }) {
  const [tab, setTab] = useState(param || 'overview')
  const f = useDateFilter('all')
  const [platform, setPlatform] = useState('')
  return (
    <div>
      <PageHeader icon={BarChart3} title="Analytics & Performance Report" subtitle="Input manual atau impor CSV dari Insights/Metricool. Sumber data selalu ditampilkan."
        actions={tab !== 'data' && <><DateFilter f={f} /><select className="input w-auto py-1.5 text-xs" value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">Semua platform</option>{['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Threads', 'YouTube', 'Website', 'WhatsApp'].map((p) => <option key={p}>{p}</option>)}</select></>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview', icon: BarChart3 }, { id: 'data', label: 'Input data', icon: Database }, { id: 'report', label: 'Laporan', icon: FileText }]} />
      {tab === 'overview' && <Overview f={f} platform={platform} />}
      {tab === 'data' && (
        <>
          <Notice className="mb-3">Input satu baris per <b>platform per periode</b> (biarkan “Konten” kosong = data level akun) atau per <b>konten</b> (pilih kontennya). Impor CSV: kolom memakai kunci seperti <code>date, platform, reach, impressions, likes, comments, shares, saves, followers_gained, profile_visits, link_clicks, wa_clicks, inquiries</code>.</Notice>
          <RecordManager module="metrics" initial={{ date: new Date().toISOString().slice(0, 10) }} filterKeys={['platform', 'source']} emptyHint="Tambahkan data performa dari Insights tiap platform." />
        </>
      )}
      {tab === 'report' && <MonthlyReport f={f} platform={platform} />}
    </div>
  )
}
