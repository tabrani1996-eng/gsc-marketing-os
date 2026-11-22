import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, LayoutGrid, Columns3, List, CalendarRange, Sun, Copy, Repeat2, PenTool } from 'lucide-react'
import { PageHeader, Modal, Empty, Loading } from '../components/ui'
import { RecordForm, useOptions } from '../components/RecordForm'
import RecordManager from '../components/RecordManager'
import { useData, useRecords } from '../lib/data'
import { cx, toISO, addDays, startOfWeek, MONTHS_LONG, DAYS_ID, today, fmtDate, parseISO } from '../lib/utils'
import { WORKFLOW, WORKFLOW_COLORS, PLATFORM_COLORS, SOCIAL_PLATFORMS } from '../config/constants'

const VIEWS = [['month', 'Bulan', LayoutGrid], ['week', 'Minggu', CalendarRange], ['day', 'Harian', Sun], ['kanban', 'Kanban', Columns3], ['list', 'List', List]]
const FORMAT_FOR = { Instagram: 'Reels', TikTok: 'TikTok video', LinkedIn: 'LinkedIn post', Facebook: 'Facebook post', Threads: 'Threads post' }

function Item({ c, onOpen, compact, pillarColor }) {
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData('text/id', c.id); e.dataTransfer.effectAllowed = 'move' }}
      onClick={(e) => { e.stopPropagation(); onOpen(c) }}
      className={cx('cursor-grab rounded-md border-l-[3px] bg-white px-1.5 py-1 text-[11px] shadow-sm ring-1 ring-slate-200 hover:ring-electric active:cursor-grabbing', compact ? 'truncate' : '')}
      style={{ borderLeftColor: pillarColor || PLATFORM_COLORS[c.data.platform] || '#1f6bff' }} title={`${c.data.title} — ${c.data.platform} · ${c.data.status}`}>
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PLATFORM_COLORS[c.data.platform] }} />
        {c.data.time && <span className="text-slate-400">{c.data.time}</span>}
        <span className={cx('font-medium text-navy-900', compact && 'truncate')}>{c.data.title}</span>
      </div>
      {!compact && <div className="mt-0.5 flex flex-wrap gap-1"><span className={cx('chip px-1.5 py-0 text-[10px]', WORKFLOW_COLORS[c.data.status])}>{c.data.status}</span><span className="text-[10px] text-slate-400">{c.data.platform} · {c.data.format}</span></div>}
    </div>
  )
}

export function RepurposeModal({ record, onClose }) {
  const { create, toast } = useData()
  const [sel, setSel] = useState([])
  const [date, setDate] = useState(record?.data.date || today())
  if (!record) return null
  const go = async () => {
    for (const p of sel) {
      await create('content', { ...record.data, platform: p, format: FORMAT_FOR[p] || record.data.format, date, status: record.data.status === 'Published' ? 'Brief' : record.data.status, approval: 'Belum diajukan', publication: 'Belum terbit', published_url: '', repurposed_from: record.id, notes: (record.data.notes || '') + `\n[Repurpose dari ${record.data.platform}] Sesuaikan caption & format untuk ${p}.` }, { silent: true })
    }
    toast(`${sel.length} versi repurpose dibuat`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Repurpose ke platform lain" footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-primary" disabled={!sel.length} onClick={go}>Buat {sel.length} versi</button></>}>
      <p className="mb-3 text-sm text-slate-600">Salin "<b>{record.data.title}</b>" sebagai konten baru untuk platform lain. Caption & format perlu disesuaikan setelahnya.</p>
      <div className="mb-3 flex flex-wrap gap-1.5">{SOCIAL_PLATFORMS.filter((p) => p !== record.data.platform).map((p) => <button key={p} onClick={() => setSel((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))} className={cx('chip border py-1', sel.includes(p) ? 'border-electric bg-electric text-white' : 'border-slate-300')}>{p}</button>)}</div>
      <label className="label">Tanggal</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
    </Modal>
  )
}

export function ContentEditor({ record, initial, open, onClose }) {
  const { create } = useData()
  const [rep, setRep] = useState(null)
  return (
    <>
      <RecordForm module="content" record={record} initial={initial} open={open} onClose={onClose}
        extraTop={record && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" onClick={async () => { await create('content', { ...record.data, title: record.data.title + ' (salinan)', publication: 'Belum terbit', published_url: '' }); onClose() }}><Copy size={13} /> Duplikat</button>
            <button className="btn-outline btn-sm" onClick={() => setRep(record)}><Repeat2 size={13} /> Repurpose</button>
            <a className="btn-outline btn-sm" href={`#/studio/${record.id}`}><PenTool size={13} /> Buka di Script Studio</a>
          </div>
        )} />
      {rep && <RepurposeModal record={rep} onClose={() => setRep(null)} />}
    </>
  )
}

export default function Calendar({ param }) {
  const { update, loading, pillarList, byId } = useData()
  const all = useRecords('content')
  const [view, setView] = useState(() => localStorage.getItem('gsc.calview') || 'month')
  const [cursor, setCursor] = useState(new Date())
  const [edit, setEdit] = useState(null)
  const [newDate, setNewDate] = useState(null)
  const [fPlatform, setFPlatform] = useState('')
  const [fPillar, setFPillar] = useState('')
  const pillarOpts = useOptions({ options: 'pillars' })
  const pColor = Object.fromEntries(pillarList.map((p) => [p.name, p.color]))

  useEffect(() => { localStorage.setItem('gsc.calview', view) }, [view])
  useEffect(() => { if (param && byId[param]) setEdit(byId[param]) }, [param, byId[param]]) // eslint-disable-line

  const items = useMemo(() => all.filter((c) => (!fPlatform || c.data.platform === fPlatform) && (!fPillar || c.data.pillar === fPillar)), [all, fPlatform, fPillar])
  const onDate = (iso) => items.filter((c) => c.data.date === iso).sort((a, b) => (a.data.time || '').localeCompare(b.data.time || ''))
  const unscheduled = items.filter((c) => !c.data.date)

  const drop = (e, patch) => { e.preventDefault(); const id = e.dataTransfer.getData('text/id'); if (id) update(id, patch, { silent: true }) }
  const allow = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  const move = (dir) => {
    const d = new Date(cursor)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir)
    else d.setDate(d.getDate() + dir)
    setCursor(d)
  }
  const title = view === 'month' ? `${MONTHS_LONG[cursor.getMonth()]} ${cursor.getFullYear()}` : view === 'week' ? `${fmtDate(toISO(startOfWeek(cursor)))} – ${fmtDate(toISO(addDays(startOfWeek(cursor), 6)))}` : view === 'day' ? fmtDate(toISO(cursor)) : ''
  const open = (c) => setEdit(c)
  const add = (iso) => { setNewDate(iso || toISO(cursor)); setEdit('new') }

  let body
  if (loading) body = <Loading />
  else if (view === 'month') {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = startOfWeek(first)
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
    body = (
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-[11px] font-semibold text-slate-500">{DAYS_ID.map((d) => <div key={d} className="py-2">{d}</div>)}</div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const iso = toISO(d); const inMonth = d.getMonth() === cursor.getMonth(); const list = onDate(iso)
            return (
              <div key={iso} onDragOver={allow} onDrop={(e) => drop(e, { date: iso })} onDoubleClick={() => add(iso)}
                className={cx('group min-h-[92px] border-b border-r p-1 md:min-h-[118px]', !inMonth && 'bg-slate-50/70', iso === today() && 'bg-electric-50/60')}>
                <div className="mb-1 flex items-center justify-between">
                  <span className={cx('text-[11px] font-semibold', inMonth ? 'text-slate-600' : 'text-slate-300', iso === today() && 'rounded-full bg-electric px-1.5 text-white')}>{d.getDate()}</span>
                  <button className="hidden text-slate-400 hover:text-electric group-hover:block" onClick={() => add(iso)}><Plus size={13} /></button>
                </div>
                <div className="space-y-1">{list.slice(0, 4).map((c) => <Item key={c.id} c={c} onOpen={open} compact pillarColor={pColor[c.data.pillar]} />)}{list.length > 4 && <div className="text-[10px] text-slate-500">+{list.length - 4} lagi</div>}</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  } else if (view === 'week') {
    const s = startOfWeek(cursor)
    body = (
      <div className="grid gap-2 md:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => addDays(s, i)).map((d, i) => {
          const iso = toISO(d)
          return (
            <div key={iso} onDragOver={allow} onDrop={(e) => drop(e, { date: iso })} className={cx('card min-h-[200px] p-2', iso === today() && 'ring-2 ring-electric')}>
              <div className="mb-2 flex items-center justify-between"><div className="text-xs font-semibold text-navy-900">{DAYS_ID[i]} <span className="text-slate-400">{d.getDate()}</span></div><button className="text-slate-400 hover:text-electric" onClick={() => add(iso)}><Plus size={14} /></button></div>
              <div className="space-y-1.5">{onDate(iso).map((c) => <Item key={c.id} c={c} onOpen={open} pillarColor={pColor[c.data.pillar]} />)}</div>
            </div>
          )
        })}
      </div>
    )
  } else if (view === 'day') {
    const iso = toISO(cursor); const list = onDate(iso)
    body = (
      <div className="card p-4" onDragOver={allow} onDrop={(e) => drop(e, { date: iso })}>
        {!list.length ? <Empty title="Tidak ada konten di hari ini" action={<button className="btn-primary" onClick={() => add(iso)}><Plus size={15} /> Tambah konten</button>} /> : (
          <div className="space-y-3">{list.map((c) => (
            <div key={c.id} className="flex cursor-pointer gap-4 rounded-lg border p-3 hover:border-electric" onClick={() => open(c)}>
              <div className="w-14 shrink-0 text-sm font-semibold text-navy-900">{c.data.time || '—'}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-navy-900">{c.data.title}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs"><span className={cx('chip', WORKFLOW_COLORS[c.data.status])}>{c.data.status}</span><span className="chip bg-slate-100">{c.data.platform}</span><span className="chip bg-slate-100">{c.data.format}</span><span className="chip bg-slate-100">{c.data.pillar}</span><span className="chip bg-slate-100">{c.data.approval}</span></div>
                {c.data.caption && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{c.data.caption}</p>}
              </div>
            </div>
          ))}</div>
        )}
      </div>
    )
  } else if (view === 'kanban') {
    body = (
      <div className="flex gap-3 overflow-x-auto pb-3 scroll-thin">
        {WORKFLOW.map((s) => {
          const list = items.filter((c) => (c.data.status || 'Idea') === s)
          return (
            <div key={s} onDragOver={allow} onDrop={(e) => drop(e, { status: s })} className="w-64 shrink-0 rounded-xl bg-slate-200/60 p-2">
              <div className="mb-2 flex items-center justify-between px-1"><span className={cx('chip', WORKFLOW_COLORS[s])}>{s}</span><span className="text-xs text-slate-500">{list.length}</span></div>
              <div className="min-h-[120px] space-y-1.5">{list.map((c) => <div key={c.id}><Item c={c} onOpen={open} pillarColor={pColor[c.data.pillar]} />{c.data.date && <div className="px-1 pt-0.5 text-[10px] text-slate-500">{fmtDate(c.data.date)}</div>}</div>)}</div>
            </div>
          )
        })}
      </div>
    )
  } else {
    body = <RecordManager module="content" onOpen={open} title="Daftar konten" filterKeys={['platform', 'pillar', 'status', 'approval']} />
  }

  return (
    <div>
      <PageHeader icon={CalendarDays} title="Content Calendar & Editorial Planner" subtitle="Seret konten ke tanggal lain (atau ke kolom status di Kanban) untuk menjadwalkan ulang."
        actions={<button className="btn-primary" onClick={() => add(today())}><Plus size={15} /> Konten</button>} />
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white">
          {VIEWS.map(([k, l, I]) => <button key={k} onClick={() => setView(k)} className={cx('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium', view === k ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-50')}><I size={13} />{l}</button>)}
        </div>
        {['month', 'week', 'day'].includes(view) && (
          <div className="flex items-center gap-2">
            <button className="btn-outline px-2 py-1.5" onClick={() => move(-1)}><ChevronLeft size={15} /></button>
            <div className="min-w-[180px] text-center text-sm font-semibold text-navy-900">{title}</div>
            <button className="btn-outline px-2 py-1.5" onClick={() => move(1)}><ChevronRight size={15} /></button>
            <button className="btn-ghost btn-sm" onClick={() => setCursor(new Date())}>Hari ini</button>
          </div>
        )}
        {view !== 'list' && (
          <div className="flex gap-2">
            <select className="input w-auto py-1.5 text-xs" value={fPlatform} onChange={(e) => setFPlatform(e.target.value)}><option value="">Semua platform</option>{['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Threads', 'YouTube', 'Website'].map((p) => <option key={p}>{p}</option>)}</select>
            <select className="input w-auto py-1.5 text-xs" value={fPillar} onChange={(e) => setFPillar(e.target.value)}><option value="">Semua pilar</option>{pillarOpts.map((p) => <option key={p}>{p}</option>)}</select>
          </div>
        )}
      </div>
      {body}
      {unscheduled.length > 0 && ['month', 'week', 'day'].includes(view) && (
        <div className="mt-4"><div className="mb-2 text-xs font-semibold text-slate-500">Belum dijadwalkan ({unscheduled.length}) — seret ke tanggal</div>
          <div className="flex flex-wrap gap-2">{unscheduled.map((c) => <div key={c.id} className="w-56"><Item c={c} onOpen={open} compact /></div>)}</div></div>
      )}
      <ContentEditor open={!!edit} record={edit && edit !== 'new' ? edit : null} initial={edit === 'new' ? { date: newDate } : undefined}
        onClose={() => { setEdit(null); if (param) window.location.hash = '/calendar' }} />
    </div>
  )
}

export { parseISO }
