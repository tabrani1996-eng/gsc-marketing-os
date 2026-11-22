import { useEffect, useMemo, useRef, useState } from 'react'
import { PenTool, Plus, Trash2, FileText, Copy, Wand2, Check, Film } from 'lucide-react'
import { PageHeader, Card, Notice, Empty } from '../components/ui'
import AIBox from '../components/AIBox'
import { useData, useRecords, useAutosave } from '../lib/data'
import { cx, copyText, exportPDF, uid } from '../lib/utils'
import { SCRIPT_STRUCTURES, SOCIAL_PLATFORMS } from '../config/constants'

const LIMITS = { Instagram: 2200, TikTok: 4000, Facebook: 63206, LinkedIn: 3000, Threads: 500 }
const PLATFORM_TIPS = {
  Instagram: 'Reels 15–60 dtk; hook di 1–3 detik pertama; teks overlay besar & singkat; caption: hook di baris pertama.',
  TikTok: 'Vertikal 9:16, ritme cepat; bicara langsung ke kamera atau VO; caption singkat + 3–5 hashtag relevan.',
  Facebook: 'Video/gambar dengan konteks; audiens cenderung lebih senior — tulis lebih lengkap & jelas.',
  LinkedIn: 'Nada profesional; buka dengan insight; paragraf pendek; ajak diskusi di akhir; 3 hashtag cukup.',
  Threads: 'Maks 500 karakter per post; gaya percakapan; cocok untuk seri tips bertingkat.',
}
const SHOT_SUGGEST = ['Ground-level: drone take-off / hovering di depan fasad', 'Close-up: nozzle/sikat menyentuh kaca', 'Eksterior gedung wide dari seberang jalan', 'Before-after dari angle & jarak yang sama', 'Detail peralatan: drone, selang, tangki air', 'Operasional: pilot & tim di area aman']

const emptyScene = (label) => ({ id: uid(), label, vo: '', direction: '', visual: '', overlay: '' })

const safeStructure = (x) => (SCRIPT_STRUCTURES[x] ? x : 'ART Storytelling')
function normalizeStudio(st) {
  if (!st) return null
  const structure = safeStructure(st.structure)
  return { ...initStudio(structure), ...st, structure, scenes: Array.isArray(st.scenes) && st.scenes.length ? st.scenes : SCRIPT_STRUCTURES[structure].map(emptyScene), footage: Array.isArray(st.footage) ? st.footage : [] }
}
function initStudio(structure) {
  structure = safeStructure(structure)
  return { structure, hook: '', visual_hook: '', scenes: SCRIPT_STRUCTURES[structure].map(emptyScene), footage: [], closing: '', cta: '', caption: '', hashtags: '' }
}

export function scriptToText(s) {
  if (!s) return ''
  return [
    `STRUKTUR: ${s.structure}`, `HOOK PEMBUKA: ${s.hook}`, `VISUAL HOOK: ${s.visual_hook}`, '',
    ...s.scenes.flatMap((sc, i) => [`SCENE ${i + 1} — ${sc.label}`, `  VO: ${sc.vo}`, `  Arahan: ${sc.direction}`, `  Visual: ${sc.visual}`, `  Text overlay: ${sc.overlay}`]),
    '', `PENUTUP: ${s.closing}`, `CTA: ${s.cta}`, '', `FOOTAGE CHECKLIST:`, ...s.footage.map((f) => `  [${f.done ? 'x' : ' '}] ${f.text}`),
  ].join('\n')
}

export default function Studio({ param }) {
  const { update, create, canWrite, byId, toast } = useData()
  const content = useRecords('content')
  const [id, setId] = useState(param || '')
  const rec = id ? byId[id] : null
  const [s, setS] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [copied, setCopied] = useState(false)
  const [newF, setNewF] = useState('')

  useEffect(() => { if (param) setId(param) }, [param])
  const baseline = useRef('')
  const cur = useRef({ id: null, s: null })
  const persist = async (recId, st) => {
    if (!recId || !st || !canWrite || JSON.stringify(st) === baseline.current) return
    baseline.current = JSON.stringify(st)
    const row = await update(recId, { studio: st, script_structure: st.structure, script: scriptToText(st), caption: st.caption, cta: st.cta, hashtags: st.hashtags }, { silent: true })
    if (row) setSavedAt(new Date())
  }
  useEffect(() => {
    // flush unsaved edits of the previously open content before switching
    if (cur.current.id && cur.current.id !== rec?.id) persist(cur.current.id, cur.current.s)
    if (!rec) { setS(null); cur.current = { id: null, s: null }; return }
    const next = normalizeStudio(rec.data.studio) || { ...initStudio(rec.data.script_structure), caption: rec.data.caption || '', cta: rec.data.cta || '', hashtags: rec.data.hashtags || '' }
    baseline.current = JSON.stringify(next)
    setS(next)
  }, [rec?.id]) // eslint-disable-line
  useEffect(() => { cur.current = { id: rec?.id, s } }, [rec?.id, s])
  useEffect(() => () => { if (cur.current.id) persist(cur.current.id, cur.current.s) }, []) // eslint-disable-line

  useAutosave(() => persist(rec?.id, s), [s], 1500, !!rec && !!s)

  const platform = rec?.data.platform || 'Instagram'
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }))
  const setScene = (i, k, v) => setS((x) => ({ ...x, scenes: x.scenes.map((sc, j) => (j === i ? { ...sc, [k]: v } : sc)) }))
  const changeStructure = (st) => setS((x) => ({ ...x, structure: st, scenes: SCRIPT_STRUCTURES[st].map((l, i) => ({ ...(x.scenes[i] || emptyScene(l)), label: l })) }))

  const sorted = useMemo(() => [...content].sort((a, b) => (b.data.date || '').localeCompare(a.data.date || '')), [content])

  const newContent = async () => {
    const r = await create('content', { title: 'Konten baru dari Studio', platform: 'Instagram', format: 'Reels', status: 'Scriptwriting', approval: 'Belum diajukan', publication: 'Belum terbit' })
    if (r) { setId(r.id); window.location.hash = '/studio/' + r.id }
  }

  const chars = (s?.caption || '').length + (s?.hashtags ? s.hashtags.length + 2 : 0)

  return (
    <div>
      <PageHeader icon={PenTool} title="Scriptwriting & Copywriting Studio" subtitle="Script scene-by-scene, caption, dan hashtag untuk Reels, Feed, Stories, TikTok, LinkedIn, dan Facebook."
        actions={canWrite && <button className="btn-outline" onClick={newContent}><Plus size={15} /> Konten baru</button>} />

      <div className="card mb-4 flex flex-col gap-3 p-3 md:flex-row md:items-center">
        <div className="flex-1">
          <label className="label">Pilih konten</label>
          <select className="input" value={id} onChange={(e) => { setId(e.target.value); window.location.hash = '/studio/' + e.target.value }}>
            <option value="">— Pilih konten dari kalender —</option>
            {sorted.map((c) => <option key={c.id} value={c.id}>{c.data.date ? c.data.date + ' · ' : ''}{c.data.platform} · {c.data.title}</option>)}
          </select>
        </div>
        {s && (
          <div className="md:w-64">
            <label className="label">Struktur script</label>
            <select className="input" value={s.structure} disabled={!canWrite} onChange={(e) => changeStructure(e.target.value)}>{Object.keys(SCRIPT_STRUCTURES).map((k) => <option key={k}>{k}</option>)}</select>
          </div>
        )}
      </div>

      {!rec || !s ? <Empty icon={PenTool} title="Pilih konten untuk mulai menulis" hint="Script tersimpan otomatis di item konten, sehingga tersinkron dengan kalender dan modul produksi." /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Card title={rec.data.title} subtitle={`${platform} · ${rec.data.format || '–'} · ${rec.data.pillar || '–'}`}
              actions={<span className="text-xs text-slate-400">{savedAt ? `Tersimpan otomatis ${savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : 'Autosave aktif'}</span>}>
              <div className="grid gap-3 md:grid-cols-2">
                <div><label className="label">Opening hook (kalimat)</label><textarea className="input" rows={2} disabled={!canWrite} value={s.hook} onChange={(e) => set('hook', e.target.value)} placeholder="Kalimat pertama yang menghentikan scroll…" /></div>
                <div><label className="label">Visual hook (gambar 1–3 detik pertama)</label><textarea className="input" rows={2} disabled={!canWrite} value={s.visual_hook} onChange={(e) => set('visual_hook', e.target.value)} placeholder="Mis. close-up air mengalir di kaca kusam" /></div>
              </div>
            </Card>

            {s.scenes.map((sc, i) => (
              <div key={sc.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">{i + 1}</span>
                    <input className="border-0 bg-transparent p-0 text-sm font-semibold text-navy-900 outline-none" disabled={!canWrite} value={sc.label} onChange={(e) => setScene(i, 'label', e.target.value)} /></div>
                  {canWrite && s.scenes.length > 1 && <button className="text-slate-400 hover:text-red-600" onClick={() => set('scenes', s.scenes.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div><label className="label">Voice-over</label><textarea className="input" rows={3} disabled={!canWrite} value={sc.vo} onChange={(e) => setScene(i, 'vo', e.target.value)} /></div>
                  <div><label className="label">Arahan scene</label><textarea className="input" rows={3} disabled={!canWrite} value={sc.direction} onChange={(e) => setScene(i, 'direction', e.target.value)} /></div>
                  <div>
                    <label className="label">Visual / shot</label>
                    <input className="input" list={`shots-${i}`} disabled={!canWrite} value={sc.visual} onChange={(e) => setScene(i, 'visual', e.target.value)} />
                    <datalist id={`shots-${i}`}>{SHOT_SUGGEST.map((x) => <option key={x} value={x} />)}</datalist>
                  </div>
                  <div><label className="label">Text overlay</label><input className="input" disabled={!canWrite} value={sc.overlay} onChange={(e) => setScene(i, 'overlay', e.target.value)} /></div>
                </div>
              </div>
            ))}
            {canWrite && <button className="btn-outline w-full" onClick={() => set('scenes', [...s.scenes, emptyScene('Scene tambahan')])}><Plus size={14} /> Tambah scene</button>}

            <Card title="Penutup & copy">
              <div className="grid gap-3 md:grid-cols-2">
                <div><label className="label">Closing statement</label><textarea className="input" rows={2} disabled={!canWrite} value={s.closing} onChange={(e) => set('closing', e.target.value)} /></div>
                <div><label className="label">CTA</label><textarea className="input" rows={2} disabled={!canWrite} value={s.cta} onChange={(e) => set('cta', e.target.value)} placeholder="Ajakan lembut, mis. 'Konsultasikan kondisi fasad gedung Anda'" /></div>
                <div className="md:col-span-2">
                  <label className="label flex justify-between"><span>Caption</span><span className={cx(chars > (LIMITS[platform] || 2200) ? 'text-red-600' : 'text-slate-400')}>{chars} / {LIMITS[platform] || 2200} karakter</span></label>
                  <textarea className="input" rows={6} disabled={!canWrite} value={s.caption} onChange={(e) => set('caption', e.target.value)} />
                </div>
                <div className="md:col-span-2"><label className="label">Hashtags</label><input className="input" disabled={!canWrite} value={s.hashtags} onChange={(e) => set('hashtags', e.target.value)} placeholder="#GlobalSkyClean #DroneCleaning …" /></div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Panduan platform">
              <p className="text-sm text-slate-600">{PLATFORM_TIPS[platform] || 'Sesuaikan format dengan platform.'}</p>
              <Notice kind="warn" className="mt-3">Hindari klaim performa/penghematan tanpa data, janji berlebihan, dan menyinggung metode lain. Gunakan hanya hasil & testimoni nyata yang diizinkan klien.</Notice>
            </Card>
            <Card title="Footage checklist" subtitle="Footage yang ada umumnya dari ground level">
              <div className="space-y-1.5">
                {s.footage.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2 text-sm">
                    <button disabled={!canWrite} className={cx('flex h-4 w-4 items-center justify-center rounded border', f.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300')} onClick={() => set('footage', s.footage.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}>{f.done && <Check size={11} />}</button>
                    <span className={cx('flex-1', f.done && 'text-slate-400 line-through')}>{f.text}</span>
                    {canWrite && <button className="text-slate-300 hover:text-red-600" onClick={() => set('footage', s.footage.filter((_, j) => j !== i))}><Trash2 size={12} /></button>}
                  </div>
                ))}
                {canWrite && <>
                  <div className="flex gap-1.5"><input className="input py-1.5" value={newF} onChange={(e) => setNewF(e.target.value)} placeholder="Tambah footage…" onKeyDown={(e) => { if (e.key === 'Enter' && newF.trim()) { set('footage', [...s.footage, { id: uid(), text: newF.trim(), done: false }]); setNewF('') } }} /></div>
                  <div className="flex flex-wrap gap-1 pt-1">{SHOT_SUGGEST.filter((x) => !s.footage.some((f) => f.text === x)).map((x) => <button key={x} className="chip border border-dashed border-slate-300 text-slate-500 hover:border-electric hover:text-electric" onClick={() => set('footage', [...s.footage, { id: uid(), text: x, done: false }])}>+ {x}</button>)}</div>
                </>}
              </div>
            </Card>
            <Card title="Asisten penulisan">
              <AIBox task="Menulis script & caption" label="Draf script dengan AI"
                context={() => `Konten: ${rec.data.title}\nPlatform: ${platform}\nFormat: ${rec.data.format}\nPilar: ${rec.data.pillar}\nObjektif: ${rec.data.objective}\nCatatan: ${rec.data.notes || '-'}`}
                buildPrompt={() => `Tulis script dengan struktur "${s.structure}" (bagian: ${(SCRIPT_STRUCTURES[s.structure] || []).join(', ')}). Untuk tiap bagian berikan: voice-over, arahan scene, visual/shot (ground level), dan text overlay. Lalu berikan opening hook, visual hook, closing statement, CTA soft selling, caption (${LIMITS[platform] || 2200} karakter maks), dan 5 hashtag relevan.`}
                onResult={(text) => { set('closing', (s.closing ? s.closing + '\n\n' : '') + '--- DRAF AI (review sebelum dipakai) ---\n' + text); toast('Draf AI ditambahkan di "Closing statement" — pindahkan bagian yang dipakai.') }} />
            </Card>
            <Card title="Export">
              <div className="flex flex-wrap gap-2">
                <button className="btn-outline btn-sm" onClick={async () => { setCopied(await copyText(scriptToText(s) + '\n\nCAPTION:\n' + s.caption + '\n' + s.hashtags)); setTimeout(() => setCopied(false), 2000) }}>{copied ? <Check size={13} /> : <Copy size={13} />} Salin script + caption</button>
                <button className="btn-outline btn-sm" onClick={() => exportPDF({ title: 'Script — ' + rec.data.title, filename: 'script-' + rec.data.title.slice(0, 30), sections: [{ heading: `${platform} · ${rec.data.format || ''} · ${s.structure}`, text: `Hook: ${s.hook}\nVisual hook: ${s.visual_hook}` }, { heading: 'Scene-by-scene', columns: [{ key: 'label', label: 'Bagian' }, { key: 'vo', label: 'Voice-over' }, { key: 'direction', label: 'Arahan' }, { key: 'visual', label: 'Visual' }, { key: 'overlay', label: 'Overlay' }], rows: s.scenes }, { heading: 'Penutup & CTA', text: `${s.closing}\n\nCTA: ${s.cta}` }, { heading: 'Caption', text: s.caption + '\n\n' + s.hashtags }, { heading: 'Footage checklist', text: s.footage.map((f) => `[${f.done ? 'x' : ' '}] ${f.text}`).join('\n') || '-' }] })}><FileText size={13} /> PDF</button>
                <a className="btn-outline btn-sm" href={`#/production`}><Film size={13} /> Ke produksi</a>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export { SOCIAL_PLATFORMS, Wand2 }
