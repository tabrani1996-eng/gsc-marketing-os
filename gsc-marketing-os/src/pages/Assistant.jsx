import { useMemo, useState } from 'react'
import { Sparkles, Send, Loader2, Copy, Check, Trash2, ShieldCheck, ClipboardCopy } from 'lucide-react'
import { PageHeader, Card, Notice } from '../components/ui'
import { useAIStatus } from '../components/AIBox'
import { askAI, buildPortablePrompt } from '../lib/ai'
import { useData, useRecords } from '../lib/data'
import { cx, copyText, fmt, pct, rangeFor } from '../lib/utils'
import { totalsRows, sumRows, contentPerformance, groupPerf } from '../lib/metrics'

const TASKS = [
  ['Brainstorm konten', 'Berikan 10 ide konten untuk minggu depan sesuai struktur editorial mingguan GSC. Sertakan pilar, format, hook, dan CTA.'],
  ['Sintesis riset audiens', 'Sintesiskan profil audiens yang tercatat menjadi 5 insight utama dan 5 pertanyaan validasi yang perlu ditanyakan ke calon klien.'],
  ['Saran strategi konten', 'Berdasarkan pilar dan data performa, sarankan penyesuaian porsi pilar dan format untuk bulan depan. Jelaskan alasannya dan tandai yang masih hipotesis.'],
  ['Tulis hook', 'Tulis 10 variasi hook (maks 12 kata) untuk topik: [isi topik]. Hindari clickbait dan klaim berlebihan.'],
  ['Draf caption', 'Tulis caption Instagram (maks 150 kata) untuk konten: [isi judul/topik]. Soft selling, akhiri dengan CTA lembut dan 5 hashtag.'],
  ['Kembangkan script', 'Kembangkan script Reels 30–45 detik dengan struktur ART untuk topik: [isi topik]. Sertakan VO, arahan scene (ground level), text overlay.'],
  ['Clustering keyword', 'Kelompokkan keyword yang tercatat menjadi cluster topik dan sarankan halaman/konten untuk tiap cluster. Jangan sebut angka volume.'],
  ['Repurpose konten', 'Ubah konten berikut menjadi versi LinkedIn, TikTok, dan Threads: [tempel caption/script].'],
  ['Ringkasan bulanan', 'Tulis ringkasan laporan bulanan untuk manajemen berdasarkan data performa dalam konteks. Gunakan hanya angka yang tersedia.'],
  ['Analisis performa', 'Analisis data performa per pilar dan format dalam konteks. Apa pola yang terlihat, dan eksperimen apa yang layak dicoba?'],
]

export default function Assistant() {
  const { create, remove, canWrite, records, byId, workspace } = useData()
  const status = useAIStatus()
  const history = useRecords('ai_history')
  const [prompt, setPrompt] = useState('')
  const [task, setTask] = useState('')
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState(null)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(null)
  const [ctxOn, setCtxOn] = useState({ pillars: true, audiences: true, perf: true, keywords: false, weekly: true })

  const context = useMemo(() => {
    const parts = []
    const by = (m) => records.filter((r) => r.module === m)
    if (ctxOn.pillars) parts.push('PILAR: ' + by('pillars').map((p) => `${p.data.name} (${p.data.objective || '-'})`).join('; '))
    if (ctxOn.weekly) parts.push('STRUKTUR MINGGUAN: ' + (workspace?.settings?.weekly || []).map((w) => `${w.day}: ${w.plan}`).join('; '))
    if (ctxOn.audiences) parts.push('AUDIENS:\n' + by('audiences').map((a) => `- ${a.data.name} [${a.data.verification}]: masalah: ${a.data.problems || '-'}; keberatan: ${a.data.objections || '-'}`).join('\n'))
    if (ctxOn.keywords) parts.push('KEYWORD: ' + by('keywords').map((k) => `${k.data.keyword} (${k.data.intent || '-'})`).join('; '))
    if (ctxOn.perf) {
      const metrics = by('metrics'); const r = rangeFor('all')
      const t = sumRows(totalsRows(metrics, r))
      const perf = contentPerformance(metrics, byId)
      const sample = metrics.some((m) => m.is_sample)
      parts.push(`PERFORMA (semua periode${sample ? ', TERMASUK DATA CONTOH — bukan data nyata' : ''}): reach ${fmt(t.reach)}, impressions ${fmt(t.impressions)}, ER ${pct(t.er, 2)}, WA clicks ${fmt(t.wa_clicks)}, inquiries ${fmt(t.inquiries)}.\nPer pilar: ${groupPerf(perf, (p) => p.content.data.pillar).map((g) => `${g.name} ER ${g.er.toFixed(1)}% (${g.posts})`).join('; ')}\nPer format: ${groupPerf(perf, (p) => p.content.data.format).map((g) => `${g.name} ER ${g.er.toFixed(1)}%`).join('; ')}`)
    }
    return parts.join('\n\n')
  }, [records, byId, ctxOn, workspace])

  const run = async () => {
    setBusy(true); setErr(null); setOut(null)
    try {
      const text = await askAI({ task: task || 'Pertanyaan umum', prompt, context })
      setOut(text)
      if (canWrite) await create('ai_history', { title: (task || prompt).slice(0, 80), task, prompt, output: text, at: new Date().toISOString() }, { silent: true })
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  const copy = async (t, k) => { await copyText(t); setCopied(k); setTimeout(() => setCopied(null), 2000) }

  return (
    <div>
      <PageHeader icon={Sparkles} title="GSC Marketing Assistant" subtitle="Asisten AI yang memakai positioning & gaya komunikasi GSC." />
      {status && !status.configured && (
        <Notice kind="warn" className="mb-4">
          <b>AI server belum aktif.</b> {status.reason} Owner dapat mengaktifkannya dengan menambahkan secret <code>ANTHROPIC_API_KEY</code> di Supabase → Edge Functions → Secrets. Sementara itu, gunakan tombol <b>“Salin prompt lengkap”</b> — prompt sudah berisi konteks & aturan brand GSC dan bisa ditempel di Claude.
        </Notice>
      )}
      {status?.configured && <Notice className="mb-4"><ShieldCheck size={13} className="mr-1 inline" />AI aktif ({status.model}). API key tersimpan aman di server, tidak pernah dikirim ke browser.</Notice>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Tugas cepat">
            <div className="flex flex-wrap gap-1.5">{TASKS.map(([t, p]) => <button key={t} onClick={() => { setTask(t); setPrompt(p) }} className={cx('chip border py-1', task === t ? 'border-electric bg-electric text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-electric')}>{t}</button>)}</div>
          </Card>
          <Card title="Permintaan">
            <textarea className="input" rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Tulis permintaan Anda… Ganti bagian [isi …] dengan detail." />
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-primary" disabled={!prompt.trim() || busy || !status?.configured} onClick={run}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Kirim ke AI</button>
              <button className="btn-outline" disabled={!prompt.trim()} onClick={() => copy(buildPortablePrompt({ task, prompt, context }), 'p')}>{copied === 'p' ? <Check size={15} /> : <ClipboardCopy size={15} />} Salin prompt lengkap</button>
            </div>
            {err && <div className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          </Card>
          {out && (
            <Card title="Hasil" subtitle="Draf AI — periksa fakta & sesuaikan sebelum dipakai" actions={<button className="btn-outline btn-sm" onClick={() => copy(out, 'o')}>{copied === 'o' ? <Check size={12} /> : <Copy size={12} />} Salin</button>}>
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{out}</pre>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card title="Konteks yang dikirim" subtitle="Dari data workspace">
            {[['pillars', 'Content pillars'], ['weekly', 'Struktur mingguan'], ['audiences', 'Profil audiens'], ['perf', 'Ringkasan performa'], ['keywords', 'Keyword']].map(([k, l]) => <label key={k} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={ctxOn[k]} onChange={() => setCtxOn((c) => ({ ...c, [k]: !c[k] }))} />{l}</label>)}
            <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer">Lihat konteks</summary><pre className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">{context}</pre></details>
          </Card>
          <Card title="Aturan AI" subtitle="Selalu diterapkan">
            <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
              <li>Memakai positioning & gaya komunikasi GSC</li>
              <li>Tidak mengarang testimoni, hasil proyek, statistik, riset, atau pencapaian</li>
              <li>Tanpa hard selling & tanpa menjelekkan metode lain</li>
              <li>Ide ditandai sebagai hipotesis yang perlu divalidasi</li>
              <li>Shot list mengasumsikan footage ground level</li>
            </ul>
          </Card>
          <Card title="Riwayat">
            {!history.length ? <div className="text-xs text-slate-400">Belum ada riwayat.</div> : (
              <div className="max-h-96 space-y-1.5 overflow-y-auto scroll-thin">{[...history].reverse().map((h) => (
                <div key={h.id} className="group flex items-start gap-1 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                  <button className="min-w-0 flex-1 text-left" onClick={() => { setTask(h.data.task); setPrompt(h.data.prompt); setOut(h.data.output) }}><div className="truncate font-medium text-navy-900">{h.data.title}</div><div className="text-slate-400">{new Date(h.data.at).toLocaleString('id-ID')}</div></button>
                  {canWrite && <button className="hidden text-slate-400 hover:text-red-600 group-hover:block" onClick={() => remove(h.id, { silent: true })}><Trash2 size={12} /></button>}
                </div>
              ))}</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
