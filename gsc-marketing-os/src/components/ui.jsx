import { useEffect } from 'react'
import { X, Loader2, AlertTriangle, Inbox, CheckCircle2, Info } from 'lucide-react'
import { cx } from '../lib/utils'
import { useData } from '../lib/data'

export function Modal({ open, onClose, title, children, footer, wide, side }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-navy-950/40 backdrop-blur-[1px]" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('flex h-full w-full flex-col bg-white shadow-2xl', side ? (wide ? 'md:max-w-4xl' : 'md:max-w-2xl') : 'm-auto h-auto max-h-[92vh] rounded-xl md:max-w-lg', !side && wide && 'md:max-w-3xl')}>
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <button className="btn-ghost p-1.5" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 scroll-thin">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({ open, onClose, onConfirm, title = 'Hapus data?', message = 'Tindakan ini tidak dapat dibatalkan.', label = 'Hapus' }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button className="btn-danger" onClick={() => { onConfirm(); onClose() }}>{label}</button></>}>
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  )
}

export const Loading = ({ label = 'Memuat data…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 className="animate-spin" size={18} /> {label}</div>
)

export const ErrorBox = ({ message, onRetry }) => (
  <div className="card flex items-start gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-800">
    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
    <div className="flex-1"><b>Terjadi kesalahan.</b> {message}</div>
    {onRetry && <button className="btn-outline btn-sm" onClick={onRetry}>Coba lagi</button>}
  </div>
)

export const Empty = ({ title = 'Belum ada data', hint, action, icon: Icon = Inbox }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <Icon className="text-slate-300" size={36} />
    <div className="font-medium text-slate-700">{title}</div>
    {hint && <div className="max-w-md text-sm text-slate-500">{hint}</div>}
    {action && <div className="mt-2">{action}</div>}
  </div>
)

export const Notice = ({ children, kind = 'info', className }) => (
  <div className={cx('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs', kind === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-electric-100 bg-electric-50 text-navy-800', className)}>
    {kind === 'warn' ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <Info size={14} className="mt-0.5 shrink-0" />}
    <div>{children}</div>
  </div>
)

export const SampleBadge = () => <span className="chip bg-amber-100 text-amber-800" title="Data contoh — bukan data performa nyata GSC">CONTOH</span>

export function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        {Icon && <div className="rounded-xl bg-navy-900 p-2.5 text-white"><Icon size={20} /></div>}
        <div><h1 className="h1">{title}</h1>{subtitle && <p className="muted mt-0.5">{subtitle}</p>}</div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 scroll-thin">
      {tabs.map((t) => (
        <button key={t.id} className={cx('tab', value === t.id && 'tab-active')} onClick={() => onChange(t.id)}>
          {t.icon && <t.icon size={14} className="mr-1.5 inline -mt-0.5" />}{t.label}
          {t.count != null && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, sub, icon: Icon, tone = 'blue', source }) {
  const tones = { blue: 'bg-electric-50 text-electric', navy: 'bg-navy-900 text-white', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600', rose: 'bg-rose-50 text-rose-600' }
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        {Icon && <div className={cx('rounded-lg p-1.5', tones[tone])}><Icon size={15} /></div>}
      </div>
      <div className="mt-1 text-2xl font-bold text-navy-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
      {source && <div className="mt-1 text-[10px] text-slate-400">Sumber: {source}</div>}
    </div>
  )
}

export function Card({ title, subtitle, actions, children, className, bodyClass }) {
  return (
    <div className={cx('card', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div><div className="text-sm font-semibold text-navy-900">{title}</div>{subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}</div>
          {actions}
        </div>
      )}
      <div className={cx('p-4', bodyClass)}>{children}</div>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useData()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cx('pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg', t.kind === 'err' ? 'bg-red-600' : 'bg-navy-900')}>
          {t.kind === 'err' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} className="text-emerald-300" />}{t.msg}
        </div>
      ))}
    </div>
  )
}

export function Badge({ children, className, color }) {
  return <span className={cx('chip', className || 'bg-slate-100 text-slate-700')} style={color ? { background: color + '1a', color } : undefined}>{children}</span>
}

export function Progress({ value, max = 100, className }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return <div className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}><div className="h-full rounded-full bg-electric transition-all" style={{ width: p + '%' }} /></div>
}
