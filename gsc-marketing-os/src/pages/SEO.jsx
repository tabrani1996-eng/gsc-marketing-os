import { useState } from 'react'
import { Search, KeyRound, Network, Link2, Plus } from 'lucide-react'
import RecordManager from '../components/RecordManager'
import { PageHeader, Tabs, Card, Notice, Empty } from '../components/ui'
import AIBox from '../components/AIBox'
import { useData, useRecords } from '../lib/data'
import { cx, fmt } from '../lib/utils'

const PRI = { Tinggi: 'bg-red-50 text-red-700', Sedang: 'bg-amber-50 text-amber-800', Rendah: 'bg-slate-100 text-slate-600' }

function Mapping() {
  const { titleOf, update, canWrite, create } = useData()
  const keywords = useRecords('keywords')
  const content = useRecords('content')
  const [adding, setAdding] = useState({})
  if (!keywords.length) return <Empty title="Belum ada keyword" />
  const clusters = {}
  keywords.forEach((k) => { (clusters[k.data.cluster || 'Tanpa cluster'] ||= []).push(k) })
  const unmapped = keywords.filter((k) => !(k.data.content_ids || []).length)
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="card p-4"><div className="text-xs text-slate-500">Total keyword</div><div className="text-2xl font-bold text-navy-900">{keywords.length}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-500">Sudah dipetakan ke konten</div><div className="text-2xl font-bold text-emerald-600">{keywords.length - unmapped.length}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-500">Belum ada konten (peluang)</div><div className="text-2xl font-bold text-amber-600">{unmapped.length}</div></div>
      </div>
      {Object.entries(clusters).map(([cl, ks]) => (
        <Card key={cl} title={`Cluster: ${cl}`} subtitle={`${ks.length} keyword`}>
          <div className="divide-y">
            {ks.map((k) => {
              const ids = k.data.content_ids || []
              return (
                <div key={k.id} className="flex flex-col gap-2 py-2.5 md:flex-row md:items-start">
                  <div className="md:w-72">
                    <div className="font-medium text-navy-900">{k.data.keyword}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1 text-[11px]"><span className={cx('chip', PRI[k.data.priority])}>{k.data.priority}</span><span className="chip bg-slate-100">{k.data.intent}</span>
                      {k.data.source && k.data.source !== 'Belum ada data' && k.data.volume != null ? <span className="chip bg-emerald-50 text-emerald-700">Vol {fmt(k.data.volume)} · {k.data.source}</span> : <span className="chip bg-slate-50 text-slate-400">Volume: belum ada sumber data</span>}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {ids.map((id) => <a key={id} href={`#/calendar/${id}`} className="chip bg-electric-50 text-navy-800 hover:underline"><Link2 size={10} /> {titleOf(id) || '(terhapus)'}</a>)}
                    {!ids.length && <span className="text-xs text-amber-700">Belum ada konten — {k.data.opportunity ? k.data.opportunity.slice(0, 90) + '…' : 'peluang konten baru'}</span>}
                    {canWrite && (
                      <select className="input w-44 py-1 text-xs" value={adding[k.id] || ''} onChange={(e) => { const v = e.target.value; if (!v) return; if (v === '__new') { create('ideas', { title: `Konten untuk keyword: ${k.data.keyword}`, topic: k.data.keyword, format: k.data.format, audience: k.data.audience, status: 'Baru', validation: 'Belum divalidasi', research_sources: `Keyword: ${k.data.keyword}` }) } else update(k.id, { content_ids: [...ids, v] }, { silent: true }); setAdding((a) => ({ ...a, [k.id]: '' })) }}>
                        <option value="">+ Petakan konten…</option>
                        <option value="__new">✚ Buat ide konten baru</option>
                        {content.filter((c) => !ids.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.data.title}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function SEO() {
  const [tab, setTab] = useState('keywords')
  const keywords = useRecords('keywords')
  const [aiOut, setAiOut] = useState('')
  return (
    <div>
      <PageHeader icon={Search} title="SEO & Keyword Research" subtitle="Lacak keyword, search intent, peluang konten, dan pemetaan keyword → konten." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'keywords', label: 'Keyword', icon: KeyRound, count: keywords.length }, { id: 'map', label: 'Keyword → Konten', icon: Network }]} />
      {tab === 'keywords' && (
        <>
          <Notice kind="warn" className="mb-3">Search volume & keyword difficulty <b>tidak dikarang</b>. Isi kolom volume hanya jika ada sumber data nyata (Google Keyword Planner, Search Console, dll.) dan pilih sumbernya.</Notice>
          <div className="card mb-4 p-3">
            <div className="mb-2 text-sm font-semibold text-navy-900">Keyword clustering dengan AI</div>
            <AIBox task="Keyword clustering" compact label="Kelompokkan keyword"
              context={() => keywords.map((k) => `- ${k.data.keyword} (intent: ${k.data.intent || '-'})`).join('\n')}
              buildPrompt={() => 'Kelompokkan keyword berikut menjadi cluster topik untuk website & konten GSC. Untuk tiap cluster beri nama, search intent dominan, target audiens, dan 2 ide konten. Jangan menyebut angka volume pencarian.'}
              onResult={setAiOut} />
            {aiOut && <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-xs text-slate-700">{aiOut}</pre>}
          </div>
          <RecordManager module="keywords" emptyHint="Tambahkan keyword target beserta intent, audiens, dan peluang kontennya." />
        </>
      )}
      {tab === 'map' && <Mapping />}
    </div>
  )
}

export { Plus }
