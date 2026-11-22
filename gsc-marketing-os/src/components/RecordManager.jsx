import { useMemo, useRef, useState } from 'react'
import { Plus, Search, Download, FileText, Upload, Copy, Pencil, Trash2, ArrowUpDown, ExternalLink, Filter } from 'lucide-react'
import { MODULES } from '../config/modules'
import { useData, useRecords } from '../lib/data'
import { cx, exportCSV, exportPDF, fmtDate, fmtRp, fmt, parseCSV, parseNumber, parseDate } from '../lib/utils'
import { RecordForm, useOptions } from './RecordForm'
import { Confirm, Empty, ErrorBox, Loading, Modal, SampleBadge, Notice } from './ui'
import { WORKFLOW_COLORS } from '../config/constants'

export function CellValue({ field, value }) {
  const { titleOf } = useData()
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return <span className="text-slate-300">–</span>
  switch (field.type) {
    case 'date': return fmtDate(value)
    case 'money': return fmtRp(value)
    case 'number': return fmt(value)
    case 'url': return <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-electric hover:underline" onClick={(e) => e.stopPropagation()}>Buka <ExternalLink size={11} /></a>
    case 'relation': return Array.isArray(value) ? `${value.length} item` : <span className="line-clamp-1">{titleOf(value) || '(terhapus)'}</span>
    case 'multiselect': case 'tags': return <span className="line-clamp-1">{value.join(', ')}</span>
    case 'checkbox': return value ? 'Ya' : 'Tidak'
    case 'color': return <span className="inline-block h-3 w-6 rounded" style={{ background: value }} />
    case 'checklist': { const d = value.filter((x) => x.done).length; return `${d}/${value.length}` }
    case 'select':
      if (field.key === 'status' && WORKFLOW_COLORS[value]) return <span className={cx('chip', WORKFLOW_COLORS[value])}>{value}</span>
      if (field.key === 'verification') return <span className={cx('chip', value.startsWith('Terverifikasi') ? 'bg-emerald-50 text-emerald-700' : value.startsWith('Perlu') ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800')}>{value}</span>
      return <span className="line-clamp-1">{value}</span>
    default: return <span className="line-clamp-2">{String(value)}</span>
  }
}

function FilterSelect({ field, value, onChange }) {
  const options = useOptions(field)
  return (
    <select className="input w-auto py-1.5 text-xs" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{field.label}: semua</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export const exportColumns = (module) => MODULES[module].fields.map((f) => ({ key: f.key, label: f.label }))

function ImportModal({ module, open, onClose }) {
  const { createMany, toast, records, titleOf } = useData()
  const fields = MODULES[module].fields
  const [rows, setRows] = useState(null)
  const fileRef = useRef()
  const onFile = async (file) => {
    const text = await file.text()
    const parsed = parseCSV(text)
    if (parsed.length < 2) return toast('CSV kosong atau tidak valid', 'err')
    const head = parsed[0].map((h) => h.trim().toLowerCase())
    const map = head.map((h) => fields.find((f) => f.key.toLowerCase() === h || f.label.toLowerCase() === h))
    const warn = { date: 0, num: 0, rel: 0 }
    const resolveRel = (f, c) => {
      const pool = records.filter((x) => x.module === f.module)
      const v = c.trim().toLowerCase()
      const hit = pool.find((x) => x.id === c.trim()) || pool.find((x) => (titleOf(x.id) || '').trim().toLowerCase() === v)
      if (!hit) warn.rel++
      return hit?.id || null
    }
    const out = parsed.slice(1).map((r) => {
      const d = {}
      r.forEach((c, i) => {
        const f = map[i]; if (!f || c.trim() === '') return
        if (['number', 'money'].includes(f.type)) { const n = parseNumber(c); if (n == null) warn.num++; else d[f.key] = n }
        else if (f.type === 'date') { const dt = parseDate(c); if (dt) d[f.key] = dt; else warn.date++ }
        else if (['multiselect', 'tags'].includes(f.type)) d[f.key] = c.split(/[;|]/).map((x) => x.trim()).filter(Boolean)
        else if (f.type === 'checkbox') d[f.key] = /^(ya|yes|true|1)$/i.test(c.trim())
        else if (f.type === 'relation') { if (!f.multiple) { const id = resolveRel(f, c); if (id) d[f.key] = id } }
        else if (f.type === 'checklist') return
        else d[f.key] = c.trim()
      })
      if (module === 'metrics' && !d.source) d.source = 'CSV import'
      return d
    })
    setRows({ out, matched: map.filter(Boolean).map((f) => f.label), warn })
  }
  const doImport = async () => {
    const res = await createMany(module, rows.out)
    toast(`${res.length} baris diimpor`)
    setRows(null); onClose()
  }
  return (
    <Modal open={open} onClose={() => { setRows(null); onClose() }} title={`Impor CSV — ${MODULES[module].label}`}
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-primary" disabled={!rows} onClick={doImport}>Impor {rows?.out.length || ''} baris</button></>}>
      <p className="mb-3 text-sm text-slate-600">Baris pertama harus berisi nama kolom (kunci atau label field). Kolom yang dikenali:</p>
      <div className="mb-3 flex flex-wrap gap-1">{fields.filter((f) => !['relation', 'checklist'].includes(f.type)).map((f) => <code key={f.key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">{f.key}</code>)}</div>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      <button className="btn-outline w-full" onClick={() => fileRef.current.click()}><Upload size={15} /> Pilih file CSV</button>
      {rows && <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{rows.out.length} baris siap diimpor. Kolom cocok: {rows.matched.join(', ') || 'tidak ada'}</div>}
      {rows && (rows.warn.date + rows.warn.num + rows.warn.rel > 0) && <div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Dilewati: {rows.warn.date} tanggal tidak dikenali (pakai YYYY-MM-DD atau DD/MM/YYYY), {rows.warn.num} angka tidak valid, {rows.warn.rel} referensi (mis. kolom content) tidak cocok dengan judul/ID yang ada.</div>}
      <p className="mt-2 text-[11px] text-slate-400">Pemisah kolom (koma, titik koma, atau tab) dideteksi otomatis. Angka format Indonesia (12.500 / 1,5) didukung. Kolom <code>content</code> diisi judul konten persis atau ID-nya.</p>
    </Modal>
  )
}

/**
 * Generic list/table manager with search, filters, sort, create/edit/duplicate/delete,
 * CSV & PDF export and CSV import.
 */
export default function RecordManager({
  module, rowFilter, initial, title, notice, extraActions, rowActions, columns: colKeys, compact,
  emptyHint, onOpen, filterKeys, hideImport,
}) {
  const { loading, error, reload, canWrite, create, remove } = useData()
  const cfg = MODULES[module]
  const all = useRecords(module)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState({ key: null, dir: 1 })
  const [editing, setEditing] = useState(null) // record | 'new' | null
  const [del, setDel] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  const listFields = (colKeys ? colKeys.map((k) => cfg.fields.find((f) => f.key === k)).filter(Boolean) : cfg.fields.filter((f) => f.list)).slice(0, compact ? 4 : 8)
  const filterFields = (filterKeys ? filterKeys.map((k) => cfg.fields.find((f) => f.key === k)) : cfg.fields.filter((f) => f.list && f.type === 'select')).filter(Boolean).slice(0, 4)

  const rows = useMemo(() => {
    let r = rowFilter ? all.filter(rowFilter) : all
    if (q) {
      const s = q.toLowerCase()
      r = r.filter((x) => JSON.stringify(x.data).toLowerCase().includes(s))
    }
    Object.entries(filters).forEach(([k, v]) => { if (v) r = r.filter((x) => x.data[k] === v) })
    if (sort.key) {
      r = [...r].sort((a, b) => {
        const A = a.data[sort.key] ?? ''; const B = b.data[sort.key] ?? ''
        return (typeof A === 'number' && typeof B === 'number' ? A - B : String(A).localeCompare(String(B))) * sort.dir
      })
    } else r = [...r].reverse()
    return r
  }, [all, q, filters, sort, rowFilter])

  const flat = rows.map((r) => ({ ...r.data, _sample: r.is_sample ? 'CONTOH' : '' }))
  const cols = [...exportColumns(module), { key: '_sample', label: 'Label data' }]

  const duplicate = async (r) => {
    const data = { ...r.data }
    const tk = cfg.titleKey
    if (typeof data[tk] === 'string') data[tk] = data[tk] + ' (salinan)'
    await create(module, data)
  }

  const open = (r) => (onOpen ? onOpen(r) : setEditing(r))

  return (
    <div>
      {notice && <Notice className="mb-3">{notice}</Notice>}
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input pl-9" placeholder={`Cari ${cfg.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterFields.length > 0 && <Filter size={14} className="text-slate-400" />}
          {filterFields.map((f) => <FilterSelect key={f.key} field={f} value={filters[f.key]} onChange={(v) => setFilters((x) => ({ ...x, [f.key]: v }))} />)}
          {extraActions}
          <button className="btn-outline btn-sm py-1.5" title="Export CSV" onClick={() => exportCSV(flat, cols, `gsc-${module}`)}><Download size={14} /> CSV</button>
          <button className="btn-outline btn-sm py-1.5" title="Export PDF" onClick={() => exportPDF({ title: title || cfg.label, columns: listFields.map((f) => ({ key: f.key, label: f.label })), rows: flat, filename: `gsc-${module}` })}><FileText size={14} /> PDF</button>
          {canWrite && !hideImport && <button className="btn-outline btn-sm py-1.5" onClick={() => setImportOpen(true)}><Upload size={14} /> Impor</button>}
          {canWrite && <button className="btn-primary py-1.5" onClick={() => setEditing('new')}><Plus size={15} /> {cfg.singular}</button>}
        </div>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : loading ? <Loading /> : !rows.length ? (
        <Empty title={all.length ? 'Tidak ada hasil yang cocok' : `Belum ada ${cfg.label.toLowerCase()}`} hint={all.length ? 'Ubah kata kunci atau filter.' : emptyHint}
          action={canWrite && !all.length && <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={15} /> Tambah {cfg.singular.toLowerCase()}</button>} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-x-auto md:block scroll-thin">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  {listFields.map((f) => (
                    <th key={f.key} className="cursor-pointer select-none px-3 py-2.5 font-semibold hover:text-navy-900" onClick={() => setSort((s) => ({ key: f.key, dir: s.key === f.key ? -s.dir : 1 }))}>
                      <span className="inline-flex items-center gap-1">{f.label}<ArrowUpDown size={11} className={sort.key === f.key ? 'text-electric' : 'opacity-30'} /></span>
                    </th>
                  ))}
                  <th className="w-28 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-t border-slate-100 hover:bg-electric-50/40" onClick={() => open(r)}>
                    {listFields.map((f, i) => (
                      <td key={f.key} className={cx('max-w-[260px] px-3 py-2.5 align-top', i === 0 && 'font-medium text-navy-900')}>
                        <div className="flex items-start gap-1.5">{i === 0 && r.is_sample && <SampleBadge />}<CellValue field={f} value={r.data[f.key]} /></div>
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        {rowActions?.(r)}
                        <button className="btn-ghost p-1.5" title="Edit" onClick={() => setEditing(r)}><Pencil size={14} /></button>
                        {canWrite && <button className="btn-ghost p-1.5" title="Duplikat" onClick={() => duplicate(r)}><Copy size={14} /></button>}
                        {canWrite && <button className="btn-ghost p-1.5 hover:text-red-600" title="Hapus" onClick={() => setDel(r)}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {rows.map((r) => (
              <div key={r.id} className="card p-3" onClick={() => open(r)}>
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="font-medium text-navy-900">{r.is_sample && <SampleBadge />} <CellValue field={listFields[0]} value={r.data[listFields[0]?.key]} /></div>
                  <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {rowActions?.(r)}
                    {canWrite && <button className="btn-ghost p-1" onClick={() => duplicate(r)}><Copy size={14} /></button>}
                    {canWrite && <button className="btn-ghost p-1" onClick={() => setDel(r)}><Trash2 size={14} /></button>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {listFields.slice(1).map((f) => <div key={f.key}><span className="text-slate-400">{f.label}: </span><CellValue field={f} value={r.data[f.key]} /></div>)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-400">{rows.length} dari {all.length} data</div>
        </>
      )}

      <RecordForm module={module} open={!!editing} record={editing && editing !== 'new' ? editing : null} initial={initial} onClose={() => setEditing(null)} />
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => remove(del.id)} message={`Hapus "${del?.data?.[cfg.titleKey] || 'data ini'}"? Tindakan ini tidak dapat dibatalkan.`} />
      <ImportModal module={module} open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
