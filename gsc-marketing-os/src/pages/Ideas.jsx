import { useMemo, useState } from 'react'
import { Lightbulb, Wand2, CalendarPlus, Plus, Check } from 'lucide-react'
import RecordManager from '../components/RecordManager'
import { PageHeader, Card, Notice, Modal } from '../components/ui'
import AIBox from '../components/AIBox'
import { useData, useRecords } from '../lib/data'
import { addDays, toISO, today, cx } from '../lib/utils'
import { PILLAR_NAMES, FORMATS, OBJECTIVES } from '../config/constants'

const SOURCES = [
  ['pain', 'Pain point audiens'], ['keyword', 'Keyword pencarian'], ['question', 'Pertanyaan industri/audiens'],
  ['gap', 'Content gap (pilar jarang diisi)'], ['competitor', 'Observasi kompetitor'], ['objective', 'Objektif marketing'],
]

const lines = (s) => String(s || '').split(/\n|;|\. /).map((x) => x.trim().replace(/\.$/, '')).filter((x) => x.length > 8)

function templateIdeas(kind, item, pillars) {
  const P = (n) => pillars.includes(n) ? n : pillars[0]
  const t = item.text
  const base = { audience: item.audience, validation: 'Belum divalidasi', status: 'Baru', research_sources: item.source || '' }
  switch (kind) {
    case 'pain': return [
      { ...base, title: `Masalah: ${t}`, pillar: P('Problem & Solution'), format: 'Reels', objective: 'Inquiry berkualitas', problem: t, hook: `Pernah mengalami ini di gedung Anda? ${t}.`, key_message: 'Akui masalahnya, jelaskan penyebab umum, tunjukkan pendekatan perawatan yang terencana.', cta: 'Diskusikan kondisi gedung Anda via WhatsApp' },
      { ...base, title: `3 hal yang perlu diketahui soal: ${t}`, pillar: P('Building Insight'), format: 'Carousel', objective: 'Edukasi pasar', problem: t, hook: `${t} — ini 3 hal yang jarang dibahas.`, key_message: 'Edukasi praktis yang bisa langsung dipakai building management.', cta: 'Simpan untuk referensi' },
    ]
    case 'keyword': return [
      { ...base, title: `Penjelasan sederhana: ${t}`, pillar: P('Fasad Talk'), format: 'Carousel', objective: 'Edukasi pasar', topic: t, hook: `Mencari "${t}"? Ini yang perlu Anda pahami dulu.`, key_message: 'Jawab search intent dengan jelas dan jujur.', cta: 'Tanya tim GSC' },
      { ...base, title: `FAQ seputar ${t}`, pillar: P('FAQ'), format: 'Reels', objective: 'Kredibilitas & kepercayaan', topic: t, hook: `Pertanyaan yang paling sering muncul soal ${t}.`, key_message: 'Jawab 1 pertanyaan per video, singkat dan faktual.', cta: 'Kirim pertanyaan Anda di komentar' },
    ]
    case 'question': return [
      { ...base, title: `Ask GSC: ${t}`, pillar: P('FAQ'), format: 'Story', objective: 'Kredibilitas & kepercayaan', problem: t, hook: t.endsWith('?') ? t : t + '?', key_message: 'Jawaban singkat + ajakan bertanya lebih lanjut.', cta: 'Balas story ini' },
      { ...base, title: `Mitos atau fakta: ${t}`, pillar: P('FAQ'), format: 'Reels', objective: 'Edukasi pasar', problem: t, hook: `Mitos atau fakta? ${t}`, key_message: 'Luruskan dengan penjelasan yang dapat dipertanggungjawabkan.', cta: 'Ikuti untuk seri berikutnya' },
    ]
    case 'gap': return [
      { ...base, title: `[${t}] Ide konten untuk mengisi pilar yang jarang dipakai`, pillar: P(t), format: 'Reels', objective: 'Brand awareness', topic: t, hook: 'Tulis hook berdasarkan masalah audiens untuk pilar ini.', key_message: `Pilar "${t}" belum banyak diisi dalam 30 hari terakhir.`, cta: 'Sesuaikan dengan objektif pilar' },
    ]
    case 'competitor': return [
      { ...base, title: `Sudut berbeda dari observasi: ${t}`, pillar: P('Building Insight'), format: 'Carousel', objective: 'Kredibilitas & kepercayaan', topic: t, hook: 'Angkat topik dari sudut edukasi yang belum banyak dibahas.', key_message: 'Fokus pada nilai untuk audiens, tanpa menyinggung kompetitor.', cta: 'Simpan & bagikan ke tim' },
    ]
    default: return [
      { ...base, title: `Konten untuk objektif: ${t}`, pillar: P(t.includes('aware') ? 'Brand Awareness' : t.includes('Inquiry') ? 'Soft Selling' : 'Fasad Talk'), format: 'Reels', objective: t, hook: 'Tulis hook yang relevan dengan objektif ini.', key_message: `Konten yang dirancang untuk: ${t}.`, cta: 'Sesuaikan CTA dengan objektif' },
    ]
  }
}

function Generator() {
  const { create, canWrite, pillarList, toast } = useData()
  const audiences = useRecords('audiences')
  const keywords = useRecords('keywords')
  const trends = useRecords('trends')
  const competitors = useRecords('competitors')
  const content = useRecords('content')
  const [kind, setKind] = useState('pain')
  const [picked, setPicked] = useState([])
  const [saved, setSaved] = useState({})
  const pillars = pillarList.length ? pillarList.map((p) => p.name) : PILLAR_NAMES

  const items = useMemo(() => {
    switch (kind) {
      case 'pain': return audiences.flatMap((a) => lines(a.data.problems + '\n' + a.data.challenges).map((t) => ({ text: t, audience: a.data.name, source: `Profil audiens: ${a.data.name} (${a.data.verification})` })))
      case 'keyword': return keywords.map((k) => ({ text: k.data.keyword, audience: k.data.audience, source: `Keyword: ${k.data.keyword}` }))
      case 'question': return [...trends.filter((t) => t.data.type === 'Pertanyaan audiens').map((t) => ({ text: t.data.title, source: t.data.source_url || 'Riset tren' })), ...audiences.flatMap((a) => lines(a.data.objections).map((t) => ({ text: t, audience: a.data.name, source: `Keberatan audiens: ${a.data.name}` })))]
      case 'gap': {
        const since = toISO(addDays(new Date(), -30))
        return pillars.map((p) => ({ text: p, n: content.filter((c) => c.data.pillar === p && c.data.date >= since).length })).sort((a, b) => a.n - b.n).slice(0, 5).map((x) => ({ text: x.text, source: `${x.n} konten dalam 30 hari terakhir` }))
      }
      case 'competitor': return competitors.flatMap((c) => lines(c.data.opportunities + '\n' + c.data.themes).map((t) => ({ text: t, source: `Observasi kompetitor: ${c.data.name} (${c.data.verification})` })))
      default: return OBJECTIVES.map((o) => ({ text: o }))
    }
  }, [kind, audiences, keywords, trends, competitors, content, pillars])

  const ideas = picked.flatMap((i) => templateIdeas(kind, items[i], pillars))
  const save = async (idea, idx) => { const r = await create('ideas', idea, { silent: true }); if (r) { setSaved((s) => ({ ...s, [idx]: true })); toast('Ide disimpan ke bank ide') } }

  const ctxText = () => items.filter((_, i) => picked.includes(i)).map((x) => `- ${x.text}${x.audience ? ` (audiens: ${x.audience})` : ''}${x.source ? ` [sumber: ${x.source}]` : ''}`).join('\n')

  return (
    <Card title="Bantuan generate ide" subtitle="Dari data riset yang sudah Anda catat di aplikasi" className="mb-5">
      <div className="mb-3 flex flex-wrap gap-1.5">{SOURCES.map(([k, l]) => <button key={k} onClick={() => { setKind(k); setPicked([]); setSaved({}) }} className={cx('chip border py-1', kind === k ? 'border-electric bg-electric text-white' : 'border-slate-300 bg-white text-slate-600')}>{l}</button>)}</div>
      {!items.length ? <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Belum ada data sumber untuk kategori ini. Isi dulu di Riset Pasar / SEO / Kompetitor.</div> : (
        <div className="mb-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2 scroll-thin">
          {items.map((it, i) => (
            <label key={i} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
              <input type="checkbox" className="mt-1" checked={picked.includes(i)} onChange={() => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))} />
              <span><span className="text-navy-900">{it.text}</span>{it.source && <span className="block text-[11px] text-slate-400">{it.source}</span>}</span>
            </label>
          ))}
        </div>
      )}
      {picked.length > 0 && (
        <AIBox task="Brainstorm ide konten" compact label="Kembangkan dengan AI"
          context={ctxText}
          buildPrompt={() => `Buat 5 ide konten untuk GSC berdasarkan input berikut. Untuk tiap ide berikan: judul, pilar (pilih dari: ${pillars.join(', ')}), format, target audiens, masalah audiens, hook, pesan utama, CTA, footage yang dibutuhkan (ground level), dan catatan validasi yang perlu dicek.`}
          onResult={(text) => create('ideas', { title: 'Hasil AI — ' + new Date().toLocaleString('id-ID'), production_notes: text, status: 'Baru', validation: 'Belum divalidasi' })} />
      )}
      {ideas.length > 0 && (
        <div className="mt-4">
          <Notice kind="warn" className="mb-2">Draf di bawah dibuat dari template berdasarkan data Anda — <b>belum divalidasi</b> oleh data audiens. Edit sebelum diproduksi.</Notice>
          <div className="grid gap-2 md:grid-cols-2">
            {ideas.map((idea, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <div className="font-medium text-navy-900">{idea.title}</div>
                <div className="mt-1 text-xs text-slate-500">{idea.pillar} · {idea.format} · {idea.objective}</div>
                <div className="mt-1 text-xs"><b>Hook:</b> {idea.hook}</div>
                {canWrite && <button className={cx('btn-sm mt-2', saved[i] ? 'btn-outline text-emerald-600' : 'btn-primary')} disabled={saved[i]} onClick={() => save(idea, i)}>{saved[i] ? <><Check size={12} /> Tersimpan</> : <><Plus size={12} /> Simpan ide</>}</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export function ScheduleModal({ idea, onClose }) {
  const { create, update } = useData()
  const [date, setDate] = useState(toISO(addDays(new Date(), 3)))
  const [platforms, setPlatforms] = useState(['Instagram'])
  if (!idea) return null
  const go = async () => {
    for (const p of platforms) {
      await create('content', {
        title: idea.data.title, date, platform: p, pillar: idea.data.pillar, format: idea.data.format, objective: idea.data.objective,
        cta: idea.data.cta, status: 'Brief', approval: 'Belum diajukan', publication: 'Belum terbit', idea_id: idea.id,
        notes: [idea.data.hook && `Hook: ${idea.data.hook}`, idea.data.key_message && `Pesan utama: ${idea.data.key_message}`, idea.data.footage && `Footage: ${idea.data.footage}`].filter(Boolean).join('\n'),
      }, { silent: true })
    }
    await update(idea.id, { status: 'Dijadwalkan' }, { silent: true })
    onClose(true)
  }
  return (
    <Modal open onClose={() => onClose(false)} title="Jadwalkan ide ke kalender" footer={<><button className="btn-outline" onClick={() => onClose(false)}>Batal</button><button className="btn-primary" disabled={!platforms.length} onClick={go}>Jadwalkan</button></>}>
      <div className="mb-2 text-sm font-medium text-navy-900">{idea.data.title}</div>
      <label className="label">Tanggal publikasi</label>
      <input type="date" className="input mb-3" value={date} min={today()} onChange={(e) => setDate(e.target.value)} />
      <label className="label">Platform (1 ide bisa di-repurpose ke beberapa platform)</label>
      <div className="flex flex-wrap gap-1.5">{['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Threads'].map((p) => <button key={p} onClick={() => setPlatforms((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))} className={cx('chip border py-1', platforms.includes(p) ? 'border-electric bg-electric text-white' : 'border-slate-300')}>{p}</button>)}</div>
    </Modal>
  )
}

export default function Ideas() {
  const { toast } = useData()
  const [sched, setSched] = useState(null)
  return (
    <div>
      <PageHeader icon={Lightbulb} title="Content Idea Workspace" subtitle="Brainstorm terstruktur — setiap ide terhubung ke audiens, masalah, objektif, dan pilar." />
      <Generator />
      <RecordManager module="ideas" emptyHint="Tambahkan ide manual atau gunakan bantuan generate di atas."
        rowActions={(r) => <button className="btn-ghost p-1.5 text-electric" title="Jadwalkan ke kalender" onClick={() => setSched(r)}><CalendarPlus size={14} /></button>} />
      {sched && <ScheduleModal idea={sched} onClose={(ok) => { setSched(null); if (ok) toast('Ide dijadwalkan ke kalender') }} />}
    </div>
  )
}

export { FORMATS }
