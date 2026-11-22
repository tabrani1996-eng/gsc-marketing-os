import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { cx, rangeFor, parseISO, addDays, toISO } from '../lib/utils'

const PRESETS = [['daily', 'Harian'], ['weekly', 'Mingguan'], ['monthly', 'Bulanan'], ['quarterly', 'Kuartal'], ['all', 'Semua'], ['custom', 'Custom']]

const f0 = (x) => !!x

export function useDateFilter(initial = 'monthly') {
  const [preset, setPreset] = useState(initial)
  const [custom, setCustom] = useState({ from: '', to: '' })
  const range = rangeFor(preset, custom)
  // Previous period, calendar-aligned and "to-date": e.g. 1–22 Nov is compared with 1–22 Oct.
  let prev = null
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const elapsedEnd = (start, end) => Math.round((Math.min(parseISO(end), t) - parseISO(start)) / 864e5)
  if (preset === 'daily') prev = [toISO(addDays(t, -1)), toISO(addDays(t, -1))]
  else if (preset === 'weekly') { const a = addDays(parseISO(range[0]), -7); prev = [toISO(a), toISO(addDays(a, elapsedEnd(range[0], range[1])))] }
  else if (preset === 'monthly' || preset === 'quarterly') {
    const a = parseISO(range[0]); const months = preset === 'monthly' ? 1 : 3
    const ps = new Date(a.getFullYear(), a.getMonth() - months, 1)
    const pEndCap = new Date(a.getFullYear(), a.getMonth(), 0)
    const pe = addDays(ps, elapsedEnd(range[0], range[1]))
    prev = [toISO(ps), toISO(pe > pEndCap ? pEndCap : pe)]
  } else if (preset === 'custom' && f0(custom.from) && f0(custom.to)) {
    const a = parseISO(range[0]); const b = parseISO(range[1])
    const len = Math.round((b - a) / 864e5) + 1
    prev = [toISO(addDays(a, -len)), toISO(addDays(a, -1))]
  }
  return { preset, setPreset, custom, setCustom, range, prev }
}

export default function DateFilter({ f }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white">
        {PRESETS.map(([k, l]) => (
          <button key={k} onClick={() => f.setPreset(k)} className={cx('px-2.5 py-1.5 text-xs font-medium', f.preset === k ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-50')}>{l}</button>
        ))}
      </div>
      {f.preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <CalendarRange size={14} className="text-slate-400" />
          <input type="date" className="input w-auto py-1 text-xs" value={f.custom.from} onChange={(e) => f.setCustom((c) => ({ ...c, from: e.target.value }))} />
          <span className="text-xs text-slate-400">s/d</span>
          <input type="date" className="input w-auto py-1 text-xs" value={f.custom.to} onChange={(e) => f.setCustom((c) => ({ ...c, to: e.target.value }))} />
        </div>
      )}
    </div>
  )
}
