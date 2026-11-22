import { supabase } from './supabase'
import { PILLARS_DEFAULT, WEEKLY_DEFAULT, STORY_TYPES } from '../config/constants'
import { toISO, addDays } from './utils'

// ---------- Base configuration (real starting setup, not performance data) ----------
const AUDIENCE_PROFILES = [
  {
    name: 'Building management', role_example: 'Building Manager, Chief Engineering',
    responsibilities: 'Operasional harian gedung, perawatan fasilitas, koordinasi vendor, keselamatan kerja, laporan ke pemilik.',
    challenges: 'Jadwal perawatan eksterior yang padat, menjaga gedung tetap beroperasi normal selama pekerjaan, koordinasi izin & keselamatan.',
    problems: 'Kaca & fasad cepat kotor karena polusi; pembersihan eksterior butuh perencanaan dan koordinasi yang matang.',
    purchasing: 'Keamanan kerja, gangguan minimal pada penghuni/tenant, kejelasan metode, legalitas vendor, referensi proyek.',
    budget: 'Anggaran perawatan tahunan terbatas dan harus dipertanggungjawabkan ke owner.',
    decision: 'Mengumpulkan penawaran → evaluasi teknis → rekomendasi ke owner/manajemen → persetujuan anggaran.',
    objections: 'Apakah drone aman di area gedung? Apakah hasilnya sebersih metode yang biasa dipakai? Bagaimana izin terbangnya?',
    interests: 'Edukasi perawatan fasad, perbandingan metode yang objektif, tips penjadwalan, studi kasus.',
    signals: 'Bertanya soal survei lokasi, jadwal, luas area, atau meminta company profile.',
  },
  {
    name: 'Facility managers', role_example: 'Facility Manager, FM Supervisor',
    responsibilities: 'Mengelola seluruh layanan pendukung gedung (cleaning, MEP, keamanan), kontrak vendor, SLA.',
    challenges: 'Menjaga standar kebersihan dengan biaya terkendali; mengelola banyak vendor.',
    problems: 'Perlu vendor yang bisa diandalkan dan mudah dikoordinasikan untuk area yang sulit dijangkau.',
    purchasing: 'SLA, laporan pekerjaan yang jelas, dokumentasi before-after, fleksibilitas jadwal.',
    budget: 'Harus menunjukkan efisiensi biaya per periode.',
    decision: 'Evaluasi vendor → uji coba/pilot → kontrak periodik.',
    objections: 'Belum familiar dengan teknologi drone cleaning; khawatir soal asuransi & tanggung jawab.',
    interests: 'Konten operasional, checklist perawatan, FAQ teknis, proses kerja.',
    signals: 'Menanyakan opsi kontrak rutin, laporan kerja, atau jadwal survei.',
  },
  {
    name: 'Property owners', role_example: 'Pemilik gedung, Direktur properti',
    responsibilities: 'Menjaga nilai aset dan citra properti, keputusan investasi perawatan.',
    challenges: 'Menjaga daya tarik properti bagi tenant/tamu; menyeimbangkan biaya dan nilai.',
    problems: 'Tampilan eksterior yang kusam dapat memengaruhi persepsi terhadap properti dan brand.',
    purchasing: 'Citra brand, kredibilitas vendor, nilai jangka panjang.',
    budget: 'Fokus pada nilai dibanding biaya; tetap membutuhkan justifikasi.',
    decision: 'Menerima rekomendasi dari building/property manager → keputusan akhir.',
    objections: 'Apakah layanan ini sepadan? Siapa saja klien yang pernah ditangani?',
    interests: 'Konten citra gedung, transformasi visual, insight properti.',
    signals: 'Menanyakan portofolio, legalitas, atau jadwal presentasi.',
  },
  {
    name: 'Property management companies', role_example: 'Property Manager, Head of Operations',
    responsibilities: 'Mengelola beberapa gedung sekaligus atas nama owner, standar layanan lintas properti.',
    challenges: 'Standarisasi vendor di banyak lokasi; laporan ke banyak owner.',
    problems: 'Butuh mitra yang bisa melayani beberapa gedung dengan kualitas konsisten.',
    purchasing: 'Skalabilitas, konsistensi, harga paket/kontrak multi-gedung.',
    budget: 'Negosiasi berbasis volume dan kontrak jangka panjang.',
    decision: 'Tender/penawaran → evaluasi → kontrak kerangka.',
    objections: 'Kapasitas tim & armada drone; cakupan wilayah.',
    interests: 'Insight industri properti, partnership, efisiensi operasional.',
    signals: 'Menanyakan cakupan area layanan, kapasitas, atau skema kerja sama.',
  },
  {
    name: 'Commercial building operators', role_example: 'Operator mall, hotel, perkantoran',
    responsibilities: 'Pengalaman pengunjung/tenant, operasional 24/7, citra lokasi.',
    challenges: 'Pekerjaan perawatan tidak boleh mengganggu pengunjung atau operasional.',
    problems: 'Jendela waktu pekerjaan terbatas; area publik yang ramai.',
    purchasing: 'Fleksibilitas waktu kerja, keamanan area publik, kecepatan pengerjaan.',
    budget: 'Anggaran per properti; dibandingkan dengan biaya operasional lain.',
    decision: 'Operasional → manajemen properti → pengadaan.',
    objections: 'Kebisingan, keamanan pengunjung, izin area.',
    interests: 'Konten behind the scenes, demonstrasi proses, before-after.',
    signals: 'Menanyakan jam kerja, prosedur keamanan, dan durasi pekerjaan.',
  },
]

const KEYWORDS = [
  ['jasa pembersihan gedung', 'Commercial investigation', 'Tinggi', 'jasa'],
  ['jasa cleaning facade gedung', 'Commercial investigation', 'Tinggi', 'fasad'],
  ['jasa pembersihan kaca gedung', 'Transactional', 'Tinggi', 'kaca'],
  ['drone cleaning Indonesia', 'Informational', 'Tinggi', 'drone'],
  ['jasa gondola gedung', 'Commercial investigation', 'Sedang', 'jasa'],
  ['pembersihan eksterior gedung', 'Informational', 'Sedang', 'fasad'],
  ['building facade cleaning', 'Informational', 'Sedang', 'fasad'],
  ['building maintenance services', 'Commercial investigation', 'Sedang', 'jasa'],
].map(([keyword, intent, priority, cluster]) => ({
  keyword, intent, priority, cluster, source: 'Belum ada data', audience: 'Building management',
  opportunity: 'Peluang konten edukasi + halaman layanan. Validasi volume & persaingan dengan Google Keyword Planner / Search Console sebelum menetapkan prioritas akhir.',
}))

const MATRIX = [
  { problem: 'Kaca & fasad cepat kusam karena polusi, tapi pembersihan eksterior sulit dijadwalkan.', audience: 'Building management', objective: 'Edukasi pasar', pillar: 'Fasad Talk', format: 'Reels', cta: 'Simpan untuk referensi perawatan', kpi: 'Saves, reach' },
  { problem: 'Belum yakin apakah drone cleaning aman untuk gedungnya.', audience: 'Facility managers', objective: 'Kredibilitas & kepercayaan', pillar: 'FAQ', format: 'Reels', cta: 'Tanyakan di kolom komentar', kpi: 'Comments, DM' },
  { problem: 'Perlu justifikasi anggaran perawatan eksterior ke owner.', audience: 'Building owners', objective: 'Inquiry berkualitas', pillar: 'Building Insight', format: 'Carousel', cta: 'Konsultasi gratis via WhatsApp', kpi: 'WhatsApp clicks' },
  { problem: 'Mengelola banyak gedung dengan standar kebersihan berbeda.', audience: 'Property management companies', objective: 'Partnership', pillar: 'Soft Selling', format: 'LinkedIn post', cta: 'Diskusikan kebutuhan portofolio gedung', kpi: 'Inquiries, profile visits' },
]

export function baseSeed() {
  return [
    ...PILLARS_DEFAULT.map((p) => ({ module: 'pillars', data: { ...p, active: true, monthly_target: ['Fasad Talk', 'Building Insight', 'Before & After'].includes(p.name) ? 8 : 2 } })),
    ...AUDIENCE_PROFILES.map((a) => ({ module: 'audiences', data: { ...a, verification: 'Asumsi / observasi', notes: 'Profil awal berbasis asumsi umum industri. Validasi lewat wawancara klien, percakapan sales, dan pertanyaan yang masuk.' } })),
    ...KEYWORDS.map((k) => ({ module: 'keywords', data: k })),
    ...MATRIX.map((m) => ({ module: 'matrix', data: m })),
  ]
}

// ---------- Clearly-labelled SAMPLE data ----------
export function sampleSeed() {
  const now = new Date()
  const d = (n) => toISO(addDays(now, n))
  const platforms = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'Threads']
  const content = [
    ['Kenapa kaca gedung cepat kusam di Jakarta?', 'Fasad Talk', 'Reels', 'Instagram', -40, 'Evaluated'],
    ['3 hal yang dicek building manager sebelum membersihkan fasad', 'Building Insight', 'Carousel', 'Instagram', -36, 'Evaluated'],
    ['Mitos atau fakta: drone cleaning bikin kaca baret?', 'FAQ', 'Reels', 'TikTok', -33, 'Evaluated'],
    ['Begini proses drone cleaning dari ground level', 'Product Demonstration', 'TikTok video', 'TikTok', -29, 'Evaluated'],
    ['Tampilan gedung = citra perusahaan', 'Brand Awareness', 'LinkedIn post', 'LinkedIn', -26, 'Evaluated'],
    ['Before & after fasad beton (contoh)', 'Before & After', 'Reels', 'Instagram', -22, 'Published'],
    ['Merencanakan anggaran perawatan eksterior tahunan', 'Building Insight', 'LinkedIn post', 'LinkedIn', -19, 'Published'],
    ['Jenis kotoran di fasad dan cara penanganannya', 'Fasad Talk', 'Carousel', 'Instagram', -15, 'Published'],
    ['Behind the scenes: persiapan tim sebelum terbang', 'Behind the Scenes', 'Story', 'Instagram', -12, 'Published'],
    ['Apa yang perlu disiapkan pengelola gedung sebelum survei?', 'FAQ', 'Carousel', 'Facebook', -9, 'Published'],
    ['Masalah klasik: jadwal cleaning bentrok operasional', 'Problem & Solution', 'Reels', 'Instagram', -6, 'Published'],
    ['Fasad Talk: kaca reflektif vs kaca biasa', 'Fasad Talk', 'Reels', 'Instagram', -2, 'Scheduled'],
    ['Building Insight: checklist perawatan eksterior kuartalan', 'Building Insight', 'Carousel', 'LinkedIn', 1, 'Approved'],
    ['Konsultasi perawatan fasad gedung Anda', 'Soft Selling', 'Feed (single image)', 'Instagram', 3, 'Review'],
    ['Detail close-up: sikat & nozzle drone', 'Product Demonstration', 'TikTok video', 'TikTok', 5, 'Editing'],
    ['Before & after kaca lobi (contoh)', 'Before & After', 'Reels', 'Instagram', 7, 'Production'],
    ['Ask GSC: berapa lama membersihkan 1 sisi gedung?', 'FAQ', 'Story', 'Instagram', 9, 'Scriptwriting'],
    ['Thread: 5 pertanyaan sebelum memilih vendor eksterior', 'Building Insight', 'Threads post', 'Threads', 11, 'Brief'],
    ['Fasad Talk: kapan waktu terbaik membersihkan fasad?', 'Fasad Talk', 'Reels', 'Instagram', 14, 'Research'],
    ['Cerita tim: hari pertama di lokasi proyek', 'Behind the Scenes', 'Reels', 'TikTok', 18, 'Idea'],
  ].map(([title, pillar, format, platform, off, status]) => ({
    module: 'content',
    data: {
      title, pillar, format, platform, date: d(off), time: '18:30', status,
      objective: pillar === 'Soft Selling' ? 'Inquiry berkualitas' : pillar === 'Brand Awareness' ? 'Brand awareness' : 'Edukasi pasar',
      approval: ['Approved', 'Scheduled', 'Published', 'Evaluated'].includes(status) ? 'Disetujui' : status === 'Review' ? 'Menunggu approval' : 'Belum diajukan',
      publication: ['Published', 'Evaluated'].includes(status) ? 'Terbit (dikonfirmasi manual)' : 'Belum terbit',
      caption: 'Contoh caption — ganti dengan caption final.', cta: 'Konsultasi via WhatsApp', hashtags: '#GlobalSkyClean #DroneCleaning #FasadGedung',
    },
  }))

  // account-level weekly metrics per platform (SAMPLE)
  const metrics = []
  const base = { Instagram: 1800, TikTok: 2600, LinkedIn: 700, Facebook: 500, Threads: 250 }
  for (let w = 12; w >= 0; w--) {
    platforms.forEach((p, i) => {
      const growth = 1 + (12 - w) * 0.045
      const wobble = 0.85 + ((w * 7 + i * 3) % 10) / 33
      const reach = Math.round(base[p] * growth * wobble)
      metrics.push({
        module: 'metrics',
        data: {
          date: d(-w * 7), platform: p, source: 'Manual entry', reach, impressions: Math.round(reach * 1.6),
          views: p === 'TikTok' || p === 'Instagram' ? Math.round(reach * 1.3) : null,
          likes: Math.round(reach * 0.035), comments: Math.round(reach * 0.004), shares: Math.round(reach * 0.005), saves: Math.round(reach * 0.006),
          followers_gained: Math.round(reach * 0.004), followers: Math.round(base[p] * 0.4 + (12 - w) * base[p] * 0.004),
          profile_visits: Math.round(reach * 0.03), link_clicks: Math.round(reach * 0.004), wa_clicks: p === 'Instagram' ? Math.round(reach * 0.002) : 0,
          inquiries: p === 'Instagram' && w % 3 === 0 ? 1 : 0, qualified_leads: p === 'Instagram' && w % 6 === 0 ? 1 : 0,
          watch_time: p === 'TikTok' ? Math.round(reach * 0.12) : null,
        },
      })
    })
  }

  const leads = [
    ['Gedung perkantoran — Sudirman (contoh)', 'PT Contoh Properti A', 'Perkantoran', 'Jakarta Selatan', 'Instagram', 'Qualified Lead', -20, 85000000],
    ['Hotel bintang 4 (contoh)', 'Hotel Contoh B', 'Hotel', 'Tangerang', 'Referral', 'Follow-up', -14, 60000000],
    ['Apartemen 30 lantai (contoh)', 'PM Contoh C', 'Apartemen', 'Bekasi', 'LinkedIn', 'Inquiry', -8, 120000000],
    ['Mall ritel (contoh)', 'Contoh Mall D', 'Mall/Ritel', 'Depok', 'WhatsApp', 'Consideration', -5, 0],
    ['Kampus swasta (contoh)', 'Yayasan Contoh E', 'Kampus/Sekolah', 'Bogor', 'Website', 'Deal', -45, 45000000],
    ['Gudang logistik (contoh)', 'PT Contoh F', 'Gudang', 'Cikarang', 'TikTok', 'Lost', -30, 30000000],
  ].map(([name, company, building_type, location, source, stage, off, value]) => ({
    module: 'leads',
    data: { name, company, building_type, location, source, stage, first_contact: d(off), followup: stage === 'Deal' || stage === 'Lost' ? null : d(Math.abs(off) % 7 + 1), value, contact_person: 'Nama contoh', interest: 'Pembersihan kaca & fasad (contoh)', notes: 'DATA CONTOH — hapus sebelum dipakai.' },
  }))

  const campaigns = [
    { name: 'Edukasi Fasad Q4 (contoh)', kind: 'Organik', status: 'Berjalan', objective: 'Edukasi pasar', platforms: ['Instagram', 'TikTok'], start: d(-30), end: d(30), budget: 0, spend: 0, message: 'Perawatan fasad adalah bagian dari citra brand gedung.' },
    { name: 'Lead gen building manager (contoh)', kind: 'Berbayar', status: 'Berjalan', objective: 'Inquiry berkualitas', platforms: ['Instagram', 'Facebook'], start: d(-21), end: d(9), budget: 5000000, spend: 3200000, revenue: 0, message: 'Konsultasi perawatan eksterior tanpa biaya.' },
  ].map((c) => ({ module: 'campaigns', data: c }))

  const ideas = [
    ['Seri "Fasad 101": mengenal material fasad', 'Fasad Talk', 'Carousel', 'Building management'],
    ['Q&A dengan pilot drone GSC', 'Behind the Scenes', 'Reels', 'Facility managers'],
    ['Checklist sebelum menerima vendor eksterior', 'Building Insight', 'Carousel', 'Property management companies'],
    ['Mitos atau fakta: drone tidak bisa bekerja saat berangin', 'FAQ', 'Story', 'Facility managers'],
  ].map(([title, pillar, format, audience]) => ({ module: 'ideas', data: { title, pillar, format, audience, status: 'Baru', validation: 'Belum divalidasi', objective: 'Edukasi pasar' } }))

  const extra = [
    { module: 'goals', data: { month: toISO(now).slice(0, 7), title: 'Konten terbit bulan ini (contoh)', metric: 'Konten terbit', target: 24 } },
    { module: 'goals', data: { month: toISO(now).slice(0, 7), title: 'Inquiry bulan ini (contoh)', metric: 'Inquiries', target: 6 } },
    { module: 'goals', data: { month: toISO(now).slice(0, 7), title: 'Reach bulan ini (contoh)', metric: 'Reach', target: 40000 } },
    { module: 'competitors', data: { name: '[Template] Kompetitor A — isi dengan data nyata', verification: 'Perlu dicek', opportunities: 'Ganti template ini dengan observasi nyata. Jangan isi data yang tidak diverifikasi.' } },
    { module: 'trends', data: { title: '[Contoh] Musim hujan → pertanyaan soal noda air di kaca', type: 'Peluang musiman', input_method: 'Input manual', verification: 'Asumsi / observasi', summary: 'Contoh entri. Tambahkan sumber nyata sebelum dipakai sebagai dasar konten.' } },
    { module: 'shots', data: { shot: 'Drone take-off dari ground level (contoh)', angle: 'Ground-level drone shot', status: 'Perlu diambil', description: 'Kamera di tripod setinggi dada, drone naik keluar frame atas.' } },
    { module: 'production', data: { title: 'Shooting before-after kaca lobi (contoh)', type: 'Jadwal shooting', due: d(4), status: 'Belum mulai', assignee: 'Tim konten', checklist: [{ id: 'a', text: 'Izin lokasi', done: true }, { id: 'b', text: 'Foto kondisi awal dari angle yang sama', done: false }] } },
  ]

  return [...content, ...metrics, ...leads, ...campaigns, ...ideas, ...extra]
}

export async function seedWorkspace(workspaceId, { sample = false, base = true } = {}) {
  const rows = [
    ...(base ? baseSeed().map((r) => ({ ...r, is_sample: false })) : []),
    ...(sample ? sampleSeed().map((r) => ({ ...r, is_sample: true })) : []),
  ].map((r) => ({ ...r, workspace_id: workspaceId }))
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await supabase.from('mkt_records').insert(rows.slice(i, i + 400))
    if (error) throw error
  }
  if (sample) {
    // per-content SAMPLE metrics for published posts
    const { data: posts } = await supabase.from('mkt_records').select('id,data').eq('workspace_id', workspaceId).eq('module', 'content').eq('is_sample', true)
    const pub = (posts || []).filter((p) => ['Published', 'Evaluated'].includes(p.data.status))
    const m = pub.map((p, i) => {
      const reach = 600 + ((i * 937) % 2400)
      return {
        workspace_id: workspaceId, module: 'metrics', is_sample: true,
        data: { date: p.data.date, platform: p.data.platform, content: p.id, source: 'Manual entry', reach, impressions: Math.round(reach * 1.5), views: Math.round(reach * 1.2), likes: Math.round(reach * (0.02 + (i % 4) * 0.01)), comments: 2 + (i % 5), shares: 3 + (i % 7), saves: 4 + ((i * 3) % 11), profile_visits: Math.round(reach * 0.03), link_clicks: i % 3, wa_clicks: i % 2, inquiries: i % 4 === 0 ? 1 : 0, observation: 'Contoh observasi — ganti dengan catatan nyata.' },
      }
    })
    if (m.length) await supabase.from('mkt_records').insert(m)
  }
  if (base) {
    await supabase.from('mkt_workspaces').update({ settings: { weekly: WEEKLY_DEFAULT, stories: STORY_TYPES } }).eq('id', workspaceId)
  }
}
