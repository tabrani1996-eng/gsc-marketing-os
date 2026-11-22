import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { MODULES } from '../config/modules'

const DataCtx = createContext(null)
export const useData = () => useContext(DataCtx)

export function useRecords(module) {
  const { records } = useData()
  return useMemo(() => records.filter((r) => r.module === module), [records, module])
}

export function DataProvider({ session, children }) {
  const [workspaces, setWorkspaces] = useState([])
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem('gsc.ws') || null)
  const [role, setRole] = useState(null)
  const [records, setRecords] = useState([])
  const recordsRef = useRef([])
  recordsRef.current = records
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toasts, setToasts] = useState([])
  const user = session?.user

  const toast = useCallback((msg, kind = 'ok') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  const loadWorkspaces = useCallback(async () => {
    const { data, error } = await supabase.from('mkt_workspaces').select('*').order('created_at')
    if (error) { setError(error.message); return [] }
    setWorkspaces(data)
    return data
  }, [])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      const ws = await loadWorkspaces()
      if (ws.length && !ws.find((w) => w.id === workspaceId)) setWorkspaceId(ws[0].id)
      if (!ws.length) setLoading(false)
    })()
  }, [user?.id, loadWorkspaces]) // eslint-disable-line

  const loadSeq = useRef(0)
  const loadRecords = useCallback(async (wsId) => {
    const seq = ++loadSeq.current
    setLoading(true); setError(null)
    const all = []
    let from = 0
    const page = 1000
    // paginate to fetch everything in the workspace
    for (;;) {
      const { data, error } = await supabase.from('mkt_records').select('*').eq('workspace_id', wsId).order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, from + page - 1)
      if (seq !== loadSeq.current) return
      if (error) { setError(error.message); setLoading(false); return }
      all.push(...data)
      if (data.length < page) break
      from += page
    }
    const { data: mem } = await supabase.from('mkt_members').select('role').eq('workspace_id', wsId).eq('user_id', user.id).maybeSingle()
    if (seq !== loadSeq.current) return
    setRole(mem?.role || 'viewer')
    setRecords(all)
    setLoading(false)
  }, [user?.id]) // eslint-disable-line

  useEffect(() => {
    if (!workspaceId || !user) return
    localStorage.setItem('gsc.ws', workspaceId)
    loadRecords(workspaceId)
  }, [workspaceId, user?.id, loadRecords]) // eslint-disable-line

  const workspace = workspaces.find((w) => w.id === workspaceId) || null
  const canWrite = role === 'owner' || role === 'editor'

  const createWorkspace = async (name) => {
    const { data, error } = await supabase.from('mkt_workspaces').insert({ name, owner_id: user.id }).select().single()
    if (error) { toast(error.message, 'err'); return null }
    await loadWorkspaces()
    setWorkspaceId(data.id)
    return data
  }

  const updateWorkspaceSettings = async (patch) => {
    if (!workspace) return
    const settings = { ...(workspace.settings || {}), ...patch }
    const { error } = await supabase.from('mkt_workspaces').update({ settings }).eq('id', workspace.id)
    if (error) { toast(error.message, 'err'); return }
    setWorkspaces((ws) => ws.map((w) => (w.id === workspace.id ? { ...w, settings } : w)))
  }

  const renameWorkspace = async (name) => {
    const { error } = await supabase.from('mkt_workspaces').update({ name }).eq('id', workspace.id)
    if (error) return toast(error.message, 'err')
    setWorkspaces((ws) => ws.map((w) => (w.id === workspace.id ? { ...w, name } : w)))
    toast('Nama workspace diperbarui')
  }

  const create = async (module, data, opts = {}) => {
    if (!canWrite) { toast('Akses Anda hanya lihat (viewer).', 'err'); return null }
    const { data: row, error } = await supabase.from('mkt_records')
      .insert({ workspace_id: workspaceId, module, data, is_sample: !!opts.sample }).select().single()
    if (error) { toast('Gagal menyimpan: ' + error.message, 'err'); return null }
    setRecords((r) => [...r, row])
    if (!opts.silent) toast(`${MODULES[module]?.singular || 'Data'} tersimpan`)
    return row
  }

  const createMany = async (module, list, opts = {}) => {
    if (!canWrite || !list.length) return []
    const rows = list.map((data) => ({ workspace_id: workspaceId, module, data, is_sample: !!opts.sample }))
    const out = []
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await supabase.from('mkt_records').insert(rows.slice(i, i + 500)).select()
      if (error) { toast('Gagal impor: ' + error.message, 'err'); break }
      out.push(...data)
    }
    setRecords((r) => [...r, ...out])
    return out
  }

  // Sends only changed keys; the server merges (data || patch) and rejects stale writes.
  const update = async (id, data, opts = {}) => {
    if (!canWrite) { toast('Akses Anda hanya lihat (viewer).', 'err'); return null }
    const prev = recordsRef.current.find((r) => r.id === id)
    const patch = {}
    Object.entries(data).forEach(([k, v]) => { if (JSON.stringify(prev?.data?.[k]) !== JSON.stringify(v)) patch[k] = v })
    if (!Object.keys(patch).length) return prev
    setRecords((rs) => rs.map((r) => (r.id === id ? { ...r, data: { ...r.data, ...patch } } : r)))
    let { data: row, error } = await supabase.rpc('mkt_patch_record', { rec_id: id, patch, expected_updated_at: prev?.updated_at || null })
    if (error && /mkt_patch_record|PGRST202|42883/.test(error.message + error.code)) {
      // fallback if the patch function isn't installed yet
      const res = await supabase.from('mkt_records').update({ data: { ...(prev?.data || {}), ...patch } }).eq('id', id).select().single()
      row = res.data; error = res.error
    }
    if (error) {
      const conflict = /CONFLICT/.test(error.message)
      toast(conflict ? 'Data ini baru saja diubah orang lain — versi terbaru dimuat, silakan ulangi perubahan Anda.' : 'Gagal memperbarui: ' + error.message, 'err')
      const { data: fresh } = await supabase.from('mkt_records').select('*').eq('id', id).maybeSingle()
      setRecords((rs) => (fresh ? rs.map((r) => (r.id === id ? fresh : r)) : prev ? rs.map((r) => (r.id === id ? prev : r)) : rs))
      return null
    }
    setRecords((rs) => rs.map((r) => (r.id === id ? row : r)))
    if (!opts.silent) toast('Perubahan tersimpan')
    return row
  }

  const remove = async (id, opts = {}) => {
    if (!canWrite) { toast('Akses Anda hanya lihat (viewer).', 'err'); return false }
    const { error } = await supabase.from('mkt_records').delete().eq('id', id)
    if (error) { toast('Gagal menghapus: ' + error.message, 'err'); return false }
    setRecords((rs) => rs.filter((r) => r.id !== id))
    if (!opts.silent) toast('Data dihapus')
    return true
  }

  const removeWhere = async (filter) => {
    let q = supabase.from('mkt_records').delete().eq('workspace_id', workspaceId)
    if (filter.sample) q = q.eq('is_sample', true)
    if (filter.module) q = q.eq('module', filter.module)
    const { error } = await q
    if (error) { toast(error.message, 'err'); return false }
    await loadRecords(workspaceId)
    return true
  }

  const byId = useMemo(() => Object.fromEntries(records.map((r) => [r.id, r])), [records])

  const titleOf = useCallback((id) => {
    const r = byId[id]
    if (!r) return ''
    const key = MODULES[r.module]?.titleKey
    return r.data?.[key] || '(tanpa judul)'
  }, [byId])

  const pillarList = useMemo(() => records.filter((r) => r.module === 'pillars').map((r) => r.data), [records])

  const value = {
    session, user, workspaces, workspace, workspaceId, setWorkspaceId, role, canWrite, records, loading, error,
    create, createMany, update, remove, removeWhere, createWorkspace, renameWorkspace, updateWorkspaceSettings,
    reload: () => loadRecords(workspaceId), byId, titleOf, pillarList, toast, toasts,
  }
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

// Debounced autosave. Returns cancel(); call it before an explicit save or on close.
export function useAutosave(fn, deps, delay = 1200, enabled = true) {
  const t = useRef(null)
  const first = useRef(true)
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => {
    if (!enabled) { first.current = true; clearTimeout(t.current); return }
    if (first.current) { first.current = false; return }
    clearTimeout(t.current)
    t.current = setTimeout(() => fnRef.current(), delay)
    return () => clearTimeout(t.current)
  }, [...deps, enabled]) // eslint-disable-line
  return useCallback(() => clearTimeout(t.current), [])
}
