import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, ExternalLink, Check } from 'lucide-react'
import { MODULES } from '../config/modules'
import { PILLAR_NAMES } from '../config/constants'
import { useData, useAutosave } from '../lib/data'
import { cx, uid, fmt } from '../lib/utils'
import { Modal } from './ui'

export function useOptions(field) {
  const { pillarList } = useData()
  return useMemo(() => {
    if (field.options === 'pillars') {
      const names = pillarList.filter((p) => p.active !== false).map((p) => p.name).filter(Boolean)
      return names.length ? names : PILLAR_NAMES
    }
    return field.options || []
  }, [field.options, pillarList])
}

function RelationInput({ field, value, onChange, disabled }) {
  const { records, titleOf } = useData()
  const opts = records.filter((r) => r.module === field.module)
  if (field.multiple) {
    const arr = Array.isArray(value) ? value : []
    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1">
          {arr.map((id) => (
            <span key={id} className="chip bg-electric-50 text-navy-800">{titleOf(id) || '(terhapus)'}
              {!disabled && <button onClick={() => onChange(arr.filter((x) => x !== id))} className="ml-0.5 text-slate-400 hover:text-red-600">×</button>}
            </span>
          ))}
        </div>
        <select className="input" disabled={disabled} value="" onChange={(e) => e.target.value && onChange([...arr, e.target.value])}>
          <option value="">+ Tambah {MODULES[field.module]?.singular?.toLowerCase()}…</option>
          {opts.filter((o) => !arr.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{titleOf(o.id)}</option>)}
        </select>
      </div>
    )
  }
  return (
    <select className="input" disabled={disabled} value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">— Tidak ada —</option>
      {opts.map((o) => <option key={o.id} value={o.id}>{titleOf(o.id)}</option>)}
    </select>
  )
}

function ChecklistInput({ value, onChange, disabled }) {
  const items = Array.isArray(value) ? value : []
  const [t, setT] = useState('')
  const add = () => { if (!t.trim()) return; onChange([...items, { id: uid(), text: t.trim(), done: false }]); setT('') }
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
          <button disabled={disabled} onClick={() => onChange(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))}
            className={cx('flex h-4 w-4 items-center justify-center rounded border', it.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300')}>
            {it.done && <Check size={11} />}
          </button>
          <span className={cx('flex-1 text-sm', it.done && 'text-slate-400 line-through')}>{it.text}</span>
          {!disabled && <button onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>}
        </div>
      ))}
      {!disabled && (
        <div className="flex gap-2">
          <input className="input" placeholder="Tambah item checklist…" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
          <button className="btn-outline" onClick={add}><Plus size={15} /></button>
        </div>
      )}
    </div>
  )
}

export function FieldInput({ field, value, onChange, disabled }) {
  const options = useOptions(field)
  switch (field.type) {
    case 'textarea':
      return <textarea className="input min-h-[72px]" rows={field.rows || 3} disabled={disabled} placeholder={field.placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    case 'number':
    case 'money':
      return (
        <div>
          <input className="input" type="number" inputMode="decimal" disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
          {field.type === 'money' && value ? <div className="mt-0.5 text-[11px] text-slate-500">Rp {fmt(value)}</div> : null}
        </div>
      )
    case 'date': case 'time': case 'month':
      return <input className="input" type={field.type} disabled={disabled} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    case 'url':
      return (
        <div className="flex gap-1.5">
          <input className="input" type="url" placeholder="https://" disabled={disabled} value={value || ''} onChange={(e) => onChange(e.target.value)} />
          {value && /^https?:\/\//.test(value) && <a className="btn-outline px-2" href={value} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>}
        </div>
      )
    case 'select':
      return (
        <select className="input" disabled={disabled} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Pilih —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
          {value && !options.includes(value) && <option value={value}>{value}</option>}
        </select>
      )
    case 'multiselect': {
      const arr = Array.isArray(value) ? value : []
      return (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button type="button" key={o} disabled={disabled} onClick={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}
              className={cx('chip border py-1', arr.includes(o) ? 'border-electric bg-electric text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-electric')}>{o}</button>
          ))}
        </div>
      )
    }
    case 'tags':
      return <input className="input" disabled={disabled} placeholder="pisahkan dengan koma" value={Array.isArray(value) ? value.join(', ') : value || ''} onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trimStart()))} onBlur={() => Array.isArray(value) && onChange(value.map((s) => s.trim()).filter(Boolean))} />
    case 'color':
      return <input type="color" className="h-9 w-16 cursor-pointer rounded border border-slate-300" disabled={disabled} value={value || '#1f6bff'} onChange={(e) => onChange(e.target.value)} />
    case 'checkbox':
      return <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={disabled} checked={value !== false && value != null ? !!value : false} onChange={(e) => onChange(e.target.checked)} /> Ya</label>
    case 'relation':
      return <RelationInput field={field} value={value} onChange={onChange} disabled={disabled} />
    case 'checklist':
      return <ChecklistInput value={value} onChange={onChange} disabled={disabled} />
    default:
      return <input className="input" disabled={disabled} placeholder={field.placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
  }
}

export function defaultsFor(module, extra = {}) {
  const d = {}
  MODULES[module].fields.forEach((f) => { if (f.default !== undefined) d[f.key] = f.default })
  return { ...d, ...extra }
}

/**
 * Drawer form for create/edit. For modules with `autosave`, edits on an existing
 * record are saved automatically (debounced). New-record drafts are kept locally.
 */
export function RecordForm({ module, record, initial, open, onClose, onSaved, extraTop, extraBottom, fields: fieldsOverride }) {
  const { create, update, canWrite, workspaceId } = useData()
  const cfg = MODULES[module]
  const fields = fieldsOverride || cfg.fields
  const draftKey = `gsc.draft.${workspaceId}.${module}`
  const baseline = useRef('')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    let next
    if (record) next = { ...record.data }
    else {
      let draft = null
      try { draft = !initial && cfg.autosave ? JSON.parse(localStorage.getItem(draftKey) || 'null') : null } catch { draft = null }
      next = draft || defaultsFor(module, initial)
    }
    baseline.current = JSON.stringify(next)
    setForm(next)
    setErrors({}); setSavedAt(null)
  }, [open, record?.id]) // eslint-disable-line

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // autosave
  const dirty = () => JSON.stringify(form) !== baseline.current
  const persist = async (f) => {
    if (!canWrite || JSON.stringify(f) === baseline.current) return
    if (record) {
      const row = await update(record.id, f, { silent: true })
      if (row) { baseline.current = JSON.stringify(f); setSavedAt(new Date()) }
    } else {
      localStorage.setItem(draftKey, JSON.stringify(f))
      baseline.current = JSON.stringify(f)
      setSavedAt(new Date())
    }
  }
  const cancelAutosave = useAutosave(() => { if (open) persist(form) }, [form], 1500, open && !!cfg.autosave)

  // closing flushes pending autosave edits instead of dropping them
  const close = () => {
    cancelAutosave()
    if (cfg.autosave && dirty()) persist(form)
    onClose()
  }

  const validate = () => {
    const e = {}
    fields.forEach((f) => { if (f.required && (form[f.key] == null || form[f.key] === '' || (Array.isArray(form[f.key]) && !form[f.key].length))) e[f.key] = 'Wajib diisi' })
    setErrors(e)
    return !Object.keys(e).length
  }

  const save = async () => {
    if (!validate()) return
    cancelAutosave()
    setSaving(true)
    const clean = { ...form }
    Object.keys(clean).forEach((k) => { if (Array.isArray(clean[k]) && fields.find((f) => f.key === k)?.type === 'tags') clean[k] = clean[k].map((s) => String(s).trim()).filter(Boolean) })
    const row = record ? await update(record.id, clean) : await create(module, clean)
    setSaving(false)
    if (row) {
      baseline.current = JSON.stringify(form)
      if (!record) localStorage.removeItem(draftKey)
      onSaved?.(row)
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={close} side wide={fields.length > 10} title={(record ? 'Edit ' : 'Tambah ') + cfg.singular.toLowerCase()}
      footer={<>
        {cfg.autosave && savedAt && <span className="mr-auto text-xs text-slate-500">{record ? 'Tersimpan otomatis' : 'Draf disimpan lokal'} {savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
        {!record && cfg.autosave && <button className="btn-ghost text-xs" onClick={() => { localStorage.removeItem(draftKey); setForm(defaultsFor(module, initial)) }}>Reset draf</button>}
        <button className="btn-outline" onClick={close}>Tutup</button>
        {canWrite && <button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</button>}
      </>}>
      {record?.is_sample && <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Ini <b>data contoh</b> untuk ilustrasi — bukan data nyata GSC.</div>}
      {extraTop}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={cx((f.full || ['textarea', 'multiselect', 'checklist'].includes(f.type)) && 'md:col-span-2')}>
            <label className="label">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
            <FieldInput field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} disabled={!canWrite} />
            {errors[f.key] && <div className="mt-0.5 text-xs text-red-600">{errors[f.key]}</div>}
          </div>
        ))}
      </div>
      {extraBottom && extraBottom(form, set)}
    </Modal>
  )
}
