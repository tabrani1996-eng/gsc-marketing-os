import { useState } from 'react'
import { Radar, Factory, Users, Swords, TrendingUp, ExternalLink, Search } from 'lucide-react'
import RecordManager from '../components/RecordManager'
import { PageHeader, Tabs, Notice } from '../components/ui'
import { useRecords } from '../lib/data'
import { RecordForm } from '../components/RecordForm'
import { MODULES } from '../config/modules'

function AudienceCards() {
  const list = useRecords('audiences')
  const [edit, setEdit] = useState(null)
  const sections = MODULES.audiences.fields.filter((f) => f.type === 'textarea' && f.key !== 'notes')
  return (
    <div>
      <RecordManager module="audiences" compact notice="Profil audiens awal bersifat asumsi. Ubah status verifikasi menjadi 'Terverifikasi' hanya setelah didukung wawancara, data penjualan, atau sumber lain." emptyHint="Tambahkan profil audiens: tanggung jawab, masalah, keberatan, hingga sinyal pembelian." />
      {list.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-navy-900">Kartu profil audiens</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {list.map((a) => (
              <div key={a.id} className="card cursor-pointer p-4 hover:border-electric" onClick={() => setEdit(a)}>
                <div className="mb-2 flex items-start justify-between">
                  <div><div className="font-semibold text-navy-900">{a.data.name}</div><div className="text-xs text-slate-500">{a.data.role_example}</div></div>
                  <span className="chip bg-amber-50 text-amber-800">{a.data.verification}</span>
                </div>
                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  {sections.map((s) => a.data[s.key] ? <div key={s.key}><dt className="font-semibold text-slate-600">{s.label}</dt><dd className="line-clamp-3 text-slate-600">{a.data[s.key]}</dd></div> : null)}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
      <RecordForm module="audiences" open={!!edit} record={edit} onClose={() => setEdit(null)} />
    </div>
  )
}

function WebResearchLinks() {
  const [q, setQ] = useState('drone cleaning gedung')
  const links = [
    ['Google', `https://www.google.com/search?q=${encodeURIComponent(q)}`],
    ['Google News', `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=id`],
    ['Google Trends', `https://trends.google.com/trends/explore?geo=ID&q=${encodeURIComponent(q)}`],
    ['YouTube', `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`],
    ['TikTok', `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`],
    ['LinkedIn', `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(q)}`],
  ]
  return (
    <div className="card mb-4 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900"><Search size={15} className="text-electric" /> Riset web cepat</div>
      <p className="mb-2 text-xs text-slate-500">Aplikasi ini belum terhubung ke API pencarian web. Gunakan tombol di bawah untuk membuka hasil pencarian, lalu catat temuan beserta URL & tanggal sumber sebagai entri baru (metode input: "Hasil web research").</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">{links.map(([l, u]) => <a key={l} href={u} target="_blank" rel="noreferrer" className="btn-outline btn-sm py-1.5">{l} <ExternalLink size={11} /></a>)}</div>
      </div>
    </div>
  )
}

export default function Research({ param }) {
  const [tab, setTab] = useState(param || 'industry')
  const counts = { industry: useRecords('industry').length, audiences: useRecords('audiences').length, competitors: useRecords('competitors').length, trends: useRecords('trends').length }
  return (
    <div>
      <PageHeader icon={Radar} title="Riset Pasar & Industry Insight" subtitle="Kumpulkan riset industri, audiens, kompetitor, dan tren — dengan sumber yang jelas." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'industry', label: 'Riset Industri', icon: Factory, count: counts.industry },
        { id: 'audiences', label: 'Audiens', icon: Users, count: counts.audiences },
        { id: 'competitors', label: 'Kompetitor', icon: Swords, count: counts.competitors },
        { id: 'trends', label: 'Tren', icon: TrendingUp, count: counts.trends },
      ]} />
      {tab === 'industry' && <><WebResearchLinks /><RecordManager module="industry" notice="Topik: tren perawatan gedung, perawatan fasad, pasar exterior cleaning, teknologi drone cleaning, industri property management, tantangan building management, biaya operasional, pain point pelanggan. Selalu cantumkan URL & tanggal sumber." emptyHint="Catat temuan riset beserta sumber dan implikasinya untuk konten GSC." /></>}
      {tab === 'audiences' && <AudienceCards />}
      {tab === 'competitors' && <RecordManager module="competitors" notice="Jangan mengarang data kompetitor. Isi hanya hasil observasi nyata, tandai status verifikasi, dan catat tanggal pengecekan. Analisis kompetitor dipakai untuk menemukan peluang — bukan untuk menyerang metode lain di konten." emptyHint="Tambahkan kompetitor yang Anda amati: layanan, positioning, tema konten, frekuensi posting, kekuatan & kelemahan." />}
      {tab === 'trends' && <><WebResearchLinks /><RecordManager module="trends" notice="Semua entri tren berlabel metode inputnya ('Input manual' atau 'Hasil web research'). Sertakan URL & tanggal publikasi sumber." emptyHint="Catat tren industri, topik trending, keyword, pertanyaan audiens, berita, dan peluang musiman." /></>}
    </div>
  )
}
