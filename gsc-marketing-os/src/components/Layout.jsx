import { useState } from 'react'
import {
  LayoutDashboard, Radar, Compass, Lightbulb, CalendarDays, PenTool, Clapperboard, Share2, Search, Users,
  Megaphone, BarChart3, GraduationCap, Sparkles, Settings, Menu, X, LogOut, ChevronDown,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useData } from '../lib/data'
import { cx } from '../lib/utils'
import { Logo } from '../pages/Auth'

export const NAV = [
  { group: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { group: 'Research', items: [{ id: 'research', label: 'Riset Pasar & Insight', icon: Radar }, { id: 'seo', label: 'SEO & Keyword', icon: Search }] },
  { group: 'Strategize', items: [{ id: 'strategy', label: 'Strategi Konten', icon: Compass }, { id: 'campaigns', label: 'Kampanye', icon: Megaphone }] },
  { group: 'Create', items: [{ id: 'ideas', label: 'Ide Konten', icon: Lightbulb }, { id: 'calendar', label: 'Kalender Editorial', icon: CalendarDays }, { id: 'studio', label: 'Script & Copy Studio', icon: PenTool }, { id: 'production', label: 'Produksi', icon: Clapperboard }] },
  { group: 'Publish', items: [{ id: 'social', label: 'Social Media', icon: Share2 }] },
  { group: 'Analyze & Grow', items: [{ id: 'analytics', label: 'Analitik & Laporan', icon: BarChart3 }, { id: 'leads', label: 'Leads & Konversi', icon: Users }] },
  { group: 'Develop', items: [{ id: 'learning', label: 'Learning Center', icon: GraduationCap }, { id: 'assistant', label: 'AI Assistant', icon: Sparkles }] },
]

export default function Layout({ current, children }) {
  const { user, workspace, workspaces, setWorkspaceId, role } = useData()
  const [open, setOpen] = useState(false)
  const [wsOpen, setWsOpen] = useState(false)

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4"><Logo light /><button className="text-white lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <div className="relative mx-3 mb-2">
        <button className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left text-xs text-blue-100 hover:bg-white/10" onClick={() => setWsOpen((v) => !v)}>
          <span className="truncate"><span className="block text-[10px] uppercase tracking-wider text-blue-300/70">Workspace · {role}</span>{workspace?.name}</span>
          <ChevronDown size={14} />
        </button>
        {wsOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg bg-white py-1 text-sm shadow-xl">
            {workspaces.map((w) => <button key={w.id} className={cx('block w-full truncate px-3 py-2 text-left hover:bg-slate-50', w.id === workspace?.id && 'font-semibold text-electric')} onClick={() => { setWorkspaceId(w.id); setWsOpen(false) }}>{w.name}</button>)}
            <a href="#/settings" className="block border-t px-3 py-2 text-xs text-slate-500 hover:bg-slate-50" onClick={() => setWsOpen(false)}>Kelola workspace →</a>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 scroll-thin">
        {NAV.map((g) => (
          <div key={g.group} className="mt-3">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300/60">{g.group}</div>
            {g.items.map((it) => (
              <a key={it.id} href={`#/${it.id}`} onClick={() => setOpen(false)}
                className={cx('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition', current === it.id ? 'bg-electric text-white shadow' : 'text-blue-100/80 hover:bg-white/5 hover:text-white')}>
                <it.icon size={16} />{it.label}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-3">
        <a href="#/settings" onClick={() => setOpen(false)} className={cx('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm', current === 'settings' ? 'bg-electric text-white' : 'text-blue-100/80 hover:bg-white/5')}><Settings size={16} /> Pengaturan & Backup</a>
        <div className="mt-2 flex items-center justify-between px-2.5 text-xs text-blue-200/70">
          <span className="truncate">{user?.email}</span>
          <button title="Keluar" className="hover:text-white" onClick={() => supabase.auth.signOut()}><LogOut size={15} /></button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 bg-navy-900 lg:block">{nav}</aside>
      {open && <div className="fixed inset-0 z-40 flex lg:hidden"><div className="w-72 bg-navy-900">{nav}</div><div className="flex-1 bg-navy-950/50" onClick={() => setOpen(false)} /></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="text-navy-900"><Menu size={22} /></button>
          <Logo />
        </header>
        <main className="flex-1 overflow-y-auto scroll-thin">
          <div className="mx-auto max-w-[1400px] p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
