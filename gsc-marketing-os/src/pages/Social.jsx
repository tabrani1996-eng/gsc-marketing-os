import { useEffect, useState } from 'react'
import { Share2, Copy, ExternalLink, CheckCircle2, Save, Check } from 'lucide-react'
import { PageHeader, Tabs, Card, Stat, Notice, Modal, Empty } from '../components/ui'
import { Lines } from '../components/charts'
import { useData, useRecords } from '../lib/data'
import { cx, fmtDate, fmt, fmtCompact, pct, today, copyText, rangeFor, inRange, MONTHS_ID } from '../lib/utils'
import { totalsRows, sumRows, series, latestFollowers } from '../lib/metrics'
import { SOCIAL_PLATFORMS, PLATFORM_COLORS, WORKFLOW_COLORS } from '../config/constants'

const LINKS = {
  Instagram: [['Instagram (buat post)', 'https://www.instagram.com/'], ['Meta Business Suite', 'https://business.facebook.com/latest/composer'], ['Instagram Insights', 'https://business.facebook.com/latest/insights']],
  TikTok: [['TikTok Studio (upload)', 'https://www.tiktok.com/tiktokstudio/upload'], ['TikTok Analytics', 'https://www.tiktok.com/tiktokstudio/analytics']],
  Facebook: [['Meta Business Suite', 'https://business.facebook.com/latest/composer'], ['Facebook Insights', 'https://business.facebook.com/latest/insights']],
  LinkedIn: [['LinkedIn (buat post)', 'https://www.linkedin.com/feed/'], ['LinkedIn Page analytics', 'https://www.linkedin.com/company/']],
  Threads: [['Threads', 'https://www.threads.net/']],
}
const CHECK = ['Konten sudah berstatus Approved', 'File final (rasio & resolusi benar) siap', 'Caption & hashtag dicek ejaan', 'CTA & link (bio/WhatsApp) aktif', 'Tag lokasi / akun yang relevan (jika diizinkan)', 'Cover / thumbnail dipilih', 'Jam tayang sesuai jadwal']

function PublishModal({ c, onClose }) {
  const { update, toast } = useData()
  const [checked, setChecked] = useState([])
  const [url, setUrl] = useState(c?.data.published_url || '')
  const [copied, setCopied] = useState(false)
  if (!c) return null
  const done = async () => {
    await update(c.id, { status: 'Published', publication: 'Terbit (dikonfirmasi manual)', published_url: url, published_at: new Date().toISOString() }, { silent: true })
    toast('Ditandai terbit (konfirmasi manual)'); onClose()
  }
  return (
    <Modal open onClose={onClose} title={`Checklist publikasi manual — ${c.data.platform}`} wide
      footer={<><button className="btn-outline" onClick={onClose}>Tutup</button><button className="btn-primary" disabled={checked.length < CHECK.length} onClick={done}><CheckCircle2 size={14} /> Saya sudah mempublikasikan</button></>}>
      <Notice kind="warn" className="mb-3">API publikasi langsung belum terhubung — aplikasi <b>tidak</b> mempublikasikan otomatis. Publikasikan manual di platform, lalu konfirmasi di sini.</Notice>
      <div className="mb-3 font-medium text-navy-900">{c.data.title}</div>
      <div className="mb-3 space-y-1.5">{CHECK.map((x) => <label key={x} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked.includes(x)} onChange={() => setChecked((p) => (p.includes(x) ? p.filter((y) => y !== x) : [...p, x]))} />{x}</label>)}</div>
      <div className="mb-3 rounded-lg bg-slate-50 p-3">
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">Caption <button className="btn-ghost btn-sm" onClick={async () => { setCopied(await copyText(`${c.data.caption || ''}\n\n${c.data.hashtags || ''}`)); setTimeout(() => setCopied(false), 2000) }}>{copied ? <Check size={12} /> : <Copy size={12} />} Salin</button></div>
        <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-slate-700">{c.data.caption || '(caption kosong)'}{'\n\n'}{c.data.hashtags}</pre>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">{(LINKS[c.data.platform] || []).map(([l, u]) => <a key={l} href={u} target="_blank" rel="noreferrer" className="btn-outline btn-sm">{l} <ExternalLink size={11} /></a>)}</div>
      <label className="label">URL postingan setelah terbit</label>
      <input className="input" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
    </Modal>
  )
}

function ContentRow({ c, onPublish }) {
  return (
    <div className="flex flex-col gap-2 py-2.5 md:flex-row md:items-center">
      <div className="w-24 shrink-0 text-xs text-slate-500">{fmtDate(c.data.date)} {c.data.time}</div>
      <div className="min-w-0 flex-1"><a href={`#/calendar/${c.id}`} className="font-medium text-navy-900 hover:text-electric">{c.data.title}</a><div className="text-xs text-slate-500">{c.data.format} · {c.data.pillar}</div></div>
      <span className={cx('chip', WORKFLOW_COLORS[c.data.status])}>{c.data.status}</span>
      <span className="chip bg-slate-100 text-slate-600">{c.data.publication || 'Belum terbit'}</span>
      {c.data.published_url ? <a href={c.data.published_url} target="_blank" rel="noreferrer" className="btn-ghost btn-sm text-electric">Lihat <ExternalLink size={11} /></a>
        : <button className="btn-outline btn-sm" onClick={() => onPublish(c)}>Checklist publikasi</button>}
    </div>
  )
}

function PlatformTab({ p }) {
  const { workspace, updateWorkspaceSettings, canWrite, toast } = useData()
  const content = useRecords('content').filter((c) => c.data.platform === p)
  const metrics = useRecords('metrics')
  const [pub, setPub] = useState(null)
  const [obj, setObj] = useState('')
  useEffect(() => { setObj(workspace?.settings?.platform_objectives?.[p] || '') }, [p, workspace?.id]) // eslint-disable-line
  const month = rangeFor('monthly')
  const t = sumRows(totalsRows(metrics, month, p))
  const followers = latestFollowers(metrics, p)
  const growth = series(totalsRows(metrics, rangeFor('all'), p).filter((r) => !r.data.content), 'week', ['followers_gained', 'reach'])
  const upcoming = content.filter((c) => c.data.date >= today() || !['Published', 'Evaluated'].includes(c.data.status)).sort((a, b) => (a.data.date || '9').localeCompare(b.data.date || '9'))
  const recent = content.filter((c) => ['Published', 'Evaluated'].includes(c.data.status)).sort((a, b) => (b.data.date || '').localeCompare(a.data.date || '')).slice(0, 8)
  const formats = {}; content.forEach((c) => { if (c.data.format) formats[c.data.format] = (formats[c.data.format] || 0) + 1 })
  const saveObj = async () => { await updateWorkspaceSettings({ platform_objectives: { ...(workspace?.settings?.platform_objectives || {}), [p]: obj } }); toast('Objektif platform disimpan') }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Followers (terakhir dicatat)" value={followers != null ? fmt(followers) : '–'} />
        <Stat label="Followers baru (bulan ini)" value={fmt(t.followers_gained)} />
        <Stat label="Reach (bulan ini)" value={fmtCompact(t.reach)} />
        <Stat label="Engagement rate" value={pct(t.er, 2)} />
        <Stat label="Konten terbit (total)" value={recent.length ? content.filter((c) => ['Published', 'Evaluated'].includes(c.data.status)).length : 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Objektif platform" subtitle={`Apa peran ${p} untuk GSC?`}>
          <textarea className="input" rows={4} disabled={!canWrite} value={obj} onChange={(e) => setObj(e.target.value)} placeholder={p === 'LinkedIn' ? 'Mis. kredibilitas B2B & menjangkau property/facility manager' : 'Mis. awareness & edukasi drone cleaning'} />
          {canWrite && <button className="btn-primary btn-sm mt-2" onClick={saveObj}><Save size={13} /> Simpan</button>}
          <div className="mt-4 text-xs font-semibold text-slate-500">Format yang dipakai</div>
          <div className="mt-1 flex flex-wrap gap-1">{Object.entries(formats).map(([f, n]) => <span key={f} className="chip bg-slate-100">{f}: {n}</span>)}{!Object.keys(formats).length && <span className="text-xs text-slate-400">–</span>}</div>
        </Card>
        <Card title="Pertumbuhan audiens" subtitle="Followers baru per minggu (data tercatat)" className="lg:col-span-2"><Lines data={growth} lines={[{ key: 'followers_gained', name: 'Followers baru', color: PLATFORM_COLORS[p] }]} xFmt={(k) => k?.slice(8) + ' ' + MONTHS_ID[Number(k?.slice(5, 7)) - 1]} area h={200} /></Card>
      </div>
      <Card title="Jadwal & status publikasi" subtitle="Konten mendatang / belum terbit">
        {!upcoming.length ? <Empty title={`Belum ada konten ${p} terjadwal`} action={<a className="btn-primary" href="#/calendar">Buka kalender</a>} /> : <div className="divide-y">{upcoming.map((c) => <ContentRow key={c.id} c={c} onPublish={setPub} />)}</div>}
      </Card>
      {recent.length > 0 && <Card title="Baru terbit"><div className="divide-y">{recent.map((c) => <ContentRow key={c.id} c={c} onPublish={setPub} />)}</div></Card>}
      {pub && <PublishModal c={pub} onClose={() => setPub(null)} />}
    </div>
  )
}

function Unified() {
  const content = useRecords('content')
  const [pub, setPub] = useState(null)
  const range = rangeFor('monthly')
  const list = content.filter((c) => SOCIAL_PLATFORMS.includes(c.data.platform) && (inRange(c.data.date, range) || (c.data.date >= today()))).sort((a, b) => ((a.data.date || '') + (a.data.time || '')).localeCompare((b.data.date || '') + (b.data.time || '')))
  const byDate = {}; list.forEach((c) => { (byDate[c.data.date || 'Tanpa tanggal'] ||= []).push(c) })
  return (
    <Card title="Unified publishing calendar" subtitle="Semua platform — bulan ini & mendatang">
      {!list.length ? <Empty title="Belum ada jadwal" /> : Object.entries(byDate).map(([d, items]) => (
        <div key={d} className="mb-3">
          <div className={cx('mb-1 text-xs font-semibold', d === today() ? 'text-electric' : 'text-slate-500')}>{d === 'Tanpa tanggal' ? d : fmtDate(d)}{d === today() && ' · hari ini'}</div>
          <div className="space-y-1.5">{items.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <span className="w-20 shrink-0 text-xs font-semibold" style={{ color: PLATFORM_COLORS[c.data.platform] }}>{c.data.platform}</span>
              <span className="w-12 shrink-0 text-xs text-slate-400">{c.data.time}</span>
              <a href={`#/calendar/${c.id}`} className="min-w-0 flex-1 truncate hover:text-electric">{c.data.title}</a>
              <span className={cx('chip hidden md:inline-flex', WORKFLOW_COLORS[c.data.status])}>{c.data.status}</span>
              {!c.data.published_url && <button className="btn-ghost btn-sm text-electric" onClick={() => setPub(c)}>Publikasi</button>}
            </div>
          ))}</div>
        </div>
      ))}
      {pub && <PublishModal c={pub} onClose={() => setPub(null)} />}
    </Card>
  )
}

export default function Social({ param }) {
  const [tab, setTab] = useState(param || 'all')
  const content = useRecords('content')
  return (
    <div>
      <PageHeader icon={Share2} title="Social Media Management" subtitle="Workspace per platform: jadwal, caption, format, status publikasi, performa, dan pertumbuhan audiens." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'Unified calendar' }, ...SOCIAL_PLATFORMS.map((p) => ({ id: p, label: p, count: content.filter((c) => c.data.platform === p).length }))]} />
      {tab === 'all' ? <Unified /> : <PlatformTab p={tab} />}
    </div>
  )
}
