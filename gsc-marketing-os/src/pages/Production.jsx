import { useState } from 'react'
import { Clapperboard, ListChecks, Camera, FolderOpen, ClipboardCheck, Wand2, CheckCircle2, RotateCcw, Send, Film } from 'lucide-react'
import RecordManager from '../components/RecordManager'
import { PageHeader, Tabs, Notice, Card, Empty, Modal } from '../components/ui'
import { useData, useRecords } from '../lib/data'
import { cx, fmtDate, uid, today } from '../lib/utils'
import { WORKFLOW_COLORS } from '../config/constants'

const SHOT_TEMPLATE = [
  ['Eksterior gedung wide (establishing)', 'Eksterior gedung', 'Ambil dari seberang jalan / area aman, kamera stabil (tripod/gimbal), gedung penuh dalam frame.'],
  ['Drone take-off dari ground level', 'Ground-level drone shot', 'Kamera setinggi dada di area kontrol; drone naik ke luar frame atas.'],
  ['Drone bekerja di fasad (tele dari bawah)', 'Ground-level drone shot', 'Gunakan zoom/tele dari bawah; jaga jarak aman; ambil 10–15 detik stabil.'],
  ['Close-up semprotan / sikat di permukaan', 'Close-up detail pembersihan', 'Hanya jika aman dijangkau (lantai bawah / area uji). Slow-motion bila memungkinkan.'],
  ['Kondisi BEFORE dari titik tetap', 'Angle before-after', 'Tandai posisi kamera & focal length agar AFTER bisa diambil dari titik yang sama.'],
  ['Kondisi AFTER dari titik yang sama', 'Angle before-after', 'Waktu & arah cahaya mirip dengan BEFORE supaya perbandingan jujur.'],
  ['Detail peralatan (drone, tangki, selang)', 'Detail peralatan', 'Close-up bersih, logo GSC terlihat jika ada.'],
  ['Pilot & tim briefing keselamatan', 'Footage operasional', 'Tunjukkan prosedur & APD; minta izin orang yang terekam.'],
]
const EDIT_CHECKLIST = ['Hook visual di 1–3 detik pertama', 'Durasi sesuai platform', 'Subtitle / text overlay terbaca di mobile', 'Audio & VO jelas, musik berlisensi', 'Logo & warna brand sesuai', 'Tidak ada klaim tanpa data di overlay', 'Wajah/plat/area klien sudah diizinkan atau di-blur', 'Export 9:16 / 4:5 sesuai format', 'Thumbnail / cover dipilih']

function ShotTemplate() {
  const { createMany, canWrite, toast } = useData()
  const content = useRecords('content').filter((c) => !['Published', 'Evaluated'].includes(c.data.status))
  const [cid, setCid] = useState('')
  const [open, setOpen] = useState(false)
  const go = async () => {
    await createMany('shots', SHOT_TEMPLATE.map(([shot, angle, description]) => ({ shot, angle, description, status: 'Perlu diambil', content: cid || null })))
    toast('Shot list praktis dibuat'); setOpen(false)
  }
  if (!canWrite) return null
  return (
    <>
      <button className="btn-dark btn-sm py-1.5" onClick={() => setOpen(true)}><Wand2 size={13} /> Template shot list</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Buat shot list praktis (ground level)" footer={<><button className="btn-outline" onClick={() => setOpen(false)}>Batal</button><button className="btn-primary" onClick={go}>Buat {SHOT_TEMPLATE.length} shot</button></>}>
        <Notice kind="warn" className="mb-3">Template ini mengasumsikan footage diambil dari <b>ground level</b> — tidak mengandalkan footage top-down dari kamera drone.</Notice>
        <label className="label">Untuk konten</label>
        <select className="input mb-3" value={cid} onChange={(e) => setCid(e.target.value)}><option value="">— Umum (tanpa konten) —</option>{content.map((c) => <option key={c.id} value={c.id}>{c.data.title}</option>)}</select>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">{SHOT_TEMPLATE.map(([s]) => <li key={s}>{s}</li>)}</ul>
      </Modal>
    </>
  )
}

function Pipeline() {
  const { update, canWrite, toast } = useData()
  const content = useRecords('content')
  const tasks = useRecords('production')
  const shots = useRecords('shots')
  const [rev, setRev] = useState(null)
  const [note, setNote] = useState('')
  const stages = ['Brief', 'Scriptwriting', 'Production', 'Editing', 'Review', 'Approved']
  const active = content.filter((c) => stages.includes(c.data.status)).sort((a, b) => (a.data.date || '9').localeCompare(b.data.date || '9'))

  const submit = (c) => update(c.id, { status: 'Review', approval: 'Menunggu approval' }).then(() => toast('Diajukan untuk approval'))
  const approve = (c) => update(c.id, { status: 'Approved', approval: 'Disetujui', approval_log: [...(c.data.approval_log || []), { at: new Date().toISOString(), action: 'Disetujui' }] })
  const requestRevision = async () => {
    const c = rev
    await update(c.id, { status: 'Editing', approval: 'Perlu revisi', approval_log: [...(c.data.approval_log || []), { at: new Date().toISOString(), action: 'Revisi', note }] })
    setRev(null); setNote('')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {stages.map((s) => <div key={s} className="card p-3"><div className={cx('chip mb-1', WORKFLOW_COLORS[s])}>{s}</div><div className="text-2xl font-bold text-navy-900">{content.filter((c) => c.data.status === s).length}</div></div>)}
      </div>
      <Card title="Approval workflow & produksi berjalan" subtitle="Ajukan → setujui / minta revisi. Riwayat revisi tercatat di tiap konten.">
        {!active.length ? <Empty title="Tidak ada konten dalam produksi" hint="Konten berstatus Brief hingga Approved akan muncul di sini." /> : (
          <div className="divide-y">
            {active.map((c) => {
              const t = tasks.filter((x) => x.data.content === c.id)
              const sh = shots.filter((x) => x.data.content === c.id)
              const log = c.data.approval_log || []
              return (
                <div key={c.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <a href={`#/calendar/${c.id}`} className="font-medium text-navy-900 hover:text-electric">{c.data.title}</a>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className={cx('chip', WORKFLOW_COLORS[c.data.status])}>{c.data.status}</span>
                      <span className={cx('chip', c.data.approval === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' : c.data.approval === 'Perlu revisi' ? 'bg-red-50 text-red-700' : 'bg-slate-100')}>{c.data.approval || 'Belum diajukan'}</span>
                      <span>{c.data.platform} · {fmtDate(c.data.date)}</span>
                      <span>· {t.filter((x) => x.data.status === 'Selesai').length}/{t.length} tugas</span>
                      <span>· {sh.filter((x) => x.data.status === 'Sudah diambil').length}/{sh.length} shot</span>
                      {log.filter((l) => l.action === 'Revisi').length > 0 && <span className="text-red-600">· {log.filter((l) => l.action === 'Revisi').length}x revisi</span>}
                    </div>
                    {log.length > 0 && log[log.length - 1].note && <div className="mt-1 text-xs italic text-slate-500">Catatan terakhir: {log[log.length - 1].note}</div>}
                  </div>
                  {canWrite && (
                    <div className="flex flex-wrap gap-1.5">
                      <a className="btn-outline btn-sm" href={`#/studio/${c.id}`}>Script</a>
                      {c.data.status !== 'Review' && c.data.status !== 'Approved' && <button className="btn-outline btn-sm" onClick={() => submit(c)}><Send size={12} /> Ajukan</button>}
                      {c.data.status === 'Review' && <><button className="btn-sm btn bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => approve(c)}><CheckCircle2 size={12} /> Setujui</button><button className="btn-outline btn-sm text-red-600" onClick={() => setRev(c)}><RotateCcw size={12} /> Revisi</button></>}
                      {c.data.status === 'Approved' && <button className="btn-primary btn-sm" onClick={() => update(c.id, { status: 'Scheduled' })}>Tandai Scheduled</button>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
      <Card title="Checklist editing video standar" subtitle="Salin ke tugas editing">
        <div className="grid gap-1.5 md:grid-cols-3">{EDIT_CHECKLIST.map((x) => <div key={x} className="flex items-center gap-2 text-sm"><ListChecks size={14} className="text-electric" />{x}</div>)}</div>
      </Card>
      <Modal open={!!rev} onClose={() => setRev(null)} title="Minta revisi" footer={<><button className="btn-outline" onClick={() => setRev(null)}>Batal</button><button className="btn-danger" disabled={!note.trim()} onClick={requestRevision}>Kirim revisi</button></>}>
        <label className="label">Catatan revisi</label>
        <textarea className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Apa yang perlu diubah?" />
      </Modal>
    </div>
  )
}

export default function Production({ param }) {
  const [tab, setTab] = useState(param || 'pipeline')
  return (
    <div>
      <PageHeader icon={Clapperboard} title="Content Production Management" subtitle="Checklist, jadwal shooting, shot list, editing, voice-over, aset, revisi, dan approval." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'pipeline', label: 'Pipeline & Approval', icon: ClipboardCheck },
        { id: 'tasks', label: 'Tugas & Jadwal', icon: ListChecks },
        { id: 'shots', label: 'Shot List', icon: Camera },
        { id: 'assets', label: 'Asset Library', icon: FolderOpen },
      ]} />
      {tab === 'pipeline' && <Pipeline />}
      {tab === 'tasks' && <RecordManager module="production" initial={{ checklist: [], due: today() }}
        extraActions={null}
        notice="Gunakan jenis tugas untuk jadwal shooting, kebutuhan footage, editing, desain, rekaman voice-over, dan revisi. Checklist editing standar bisa ditambahkan di tiap tugas."
        emptyHint="Buat tugas produksi dan hubungkan ke konten." />}
      {tab === 'shots' && <RecordManager module="shots" extraActions={<ShotTemplate />} notice="Footage yang tersedia saat ini mayoritas dari ground level. Rencanakan shot berdasarkan kondisi itu." emptyHint="Buat shot list dari template praktis atau tambahkan manual." />}
      {tab === 'assets' && <RecordManager module="assets" notice="Simpan link aset (Google Drive, dsb.). Pastikan hak penggunaan jelas — terutama untuk foto/video gedung klien." emptyHint="Tambahkan link aset video, foto, desain, audio, dan referensi." />}
    </div>
  )
}

export { uid, Film }
