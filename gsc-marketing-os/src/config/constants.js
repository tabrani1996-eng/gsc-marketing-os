export const PLATFORMS = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Threads', 'YouTube', 'Website']
export const SOCIAL_PLATFORMS = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Threads']

export const PLATFORM_COLORS = {
  Instagram: '#d6336c', TikTok: '#111827', Facebook: '#1877f2', LinkedIn: '#0a66c2',
  Threads: '#4b5563', YouTube: '#dc2626', Website: '#0d9488', WhatsApp: '#16a34a',
}

export const PILLARS_DEFAULT = [
  { name: 'Fasad Talk', description: 'Konten edukasi tentang fasad gedung: material, perawatan, dan kenapa tampilan eksterior penting.', objective: 'Edukasi pasar', audience: ['Building management', 'Facility managers'], formats: ['Reels', 'Carousel'], kpi: 'Saves, shares, reach', color: '#1f6bff' },
  { name: 'Building Insight', description: 'Insight manajemen gedung dan edukasi industri properti.', objective: 'Membangun kredibilitas', audience: ['Property management companies', 'Building owners'], formats: ['Carousel', 'LinkedIn article'], kpi: 'Engagement rate, profile visits', color: '#0ea5e9' },
  { name: 'Before & After', description: 'Hasil pembersihan dan transformasi visual (hanya dari proyek nyata).', objective: 'Bukti hasil & kepercayaan', audience: ['Building owners', 'Hotels'], formats: ['Reels', 'Carousel'], kpi: 'Reach, shares, inquiries', color: '#22c55e' },
  { name: 'FAQ', description: 'Menjawab pertanyaan yang sering muncul dari calon klien.', objective: 'Mengurangi keraguan', audience: ['Facility managers'], formats: ['Reels', 'Story'], kpi: 'Comments, DM, WhatsApp clicks', color: '#a855f7' },
  { name: 'Problem & Solution', description: 'Masalah audiens dan bagaimana GSC dapat membantu.', objective: 'Menghasilkan minat', audience: ['Building management'], formats: ['Reels', 'Carousel'], kpi: 'Profile visits, inquiries', color: '#f97316' },
  { name: 'Product Demonstration', description: 'Proses drone cleaning dan demonstrasi layanan.', objective: 'Edukasi teknologi', audience: ['Facility managers', 'Commercial property operators'], formats: ['Reels', 'TikTok'], kpi: 'Views, watch time', color: '#06b6d4' },
  { name: 'Brand Awareness', description: 'Pengenalan dan positioning GSC.', objective: 'Brand awareness', audience: ['Semua audiens'], formats: ['Reels', 'Feed'], kpi: 'Reach, followers growth', color: '#0b1b3f' },
  { name: 'Soft Selling', description: 'Manfaat layanan dan ajakan konsultasi tanpa hard selling.', objective: 'Inquiry', audience: ['Building owners', 'Property management companies'], formats: ['Feed', 'Story'], kpi: 'WhatsApp clicks, inquiries', color: '#eab308' },
  { name: 'Social Proof', description: 'Testimoni, proyek, dan kepercayaan klien (hanya yang terverifikasi & diizinkan klien).', objective: 'Kepercayaan', audience: ['Semua audiens'], formats: ['Carousel', 'Reels'], kpi: 'Saves, inquiries', color: '#14b8a6' },
  { name: 'Behind the Scenes', description: 'Aktivitas operasional dan teknologi di balik layanan.', objective: 'Humanisasi brand', audience: ['Semua audiens'], formats: ['Story', 'Reels'], kpi: 'Engagement, replies', color: '#64748b' },
]

export const PILLAR_NAMES = PILLARS_DEFAULT.map((p) => p.name)

export const AUDIENCES = ['Building management', 'Property management companies', 'Building owners', 'Facility managers', 'Commercial property operators', 'Hotels & hospitality', 'Office building managers', 'Industrial & commercial stakeholders']

export const FORMATS = ['Reels', 'Carousel', 'Feed (single image)', 'Story', 'TikTok video', 'LinkedIn post', 'LinkedIn article', 'Facebook post', 'Threads post', 'Live', 'Blog/Website']

export const OBJECTIVES = ['Brand awareness', 'Edukasi pasar', 'Kredibilitas & kepercayaan', 'Inquiry berkualitas', 'Peluang bisnis', 'Partnership']

export const WORKFLOW = ['Idea', 'Research', 'Brief', 'Scriptwriting', 'Production', 'Editing', 'Review', 'Approved', 'Scheduled', 'Published', 'Evaluated']
export const WORKFLOW_COLORS = {
  Idea: 'bg-slate-100 text-slate-700', Research: 'bg-indigo-50 text-indigo-700', Brief: 'bg-violet-50 text-violet-700',
  Scriptwriting: 'bg-fuchsia-50 text-fuchsia-700', Production: 'bg-orange-50 text-orange-700', Editing: 'bg-amber-50 text-amber-700',
  Review: 'bg-yellow-50 text-yellow-800', Approved: 'bg-lime-50 text-lime-700', Scheduled: 'bg-sky-50 text-sky-700',
  Published: 'bg-emerald-50 text-emerald-700', Evaluated: 'bg-teal-50 text-teal-700',
}
export const APPROVAL = ['Belum diajukan', 'Menunggu approval', 'Perlu revisi', 'Disetujui']
export const PUBLICATION = ['Belum terbit', 'Siap terbit (manual)', 'Terbit (dikonfirmasi manual)']

export const FUNNEL = ['Awareness', 'Interest', 'Consideration', 'Inquiry', 'Qualified Lead', 'Follow-up', 'Deal', 'Lost']
export const LEAD_SOURCES = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Website', 'WhatsApp', 'Referral', 'Other']
export const BUILDING_TYPES = ['Perkantoran', 'Hotel', 'Apartemen', 'Mall/Ritel', 'Rumah sakit', 'Kampus/Sekolah', 'Industri/Pabrik', 'Gudang', 'Pemerintahan', 'Lainnya']

export const SCRIPT_STRUCTURES = {
  'ART Storytelling': ['Attention', 'Relevance', 'Trigger'],
  'Problem – Solution – CTA': ['Problem', 'Solution', 'CTA'],
  FAQ: ['Pertanyaan', 'Jawaban singkat', 'Penjelasan', 'CTA'],
  Educational: ['Hook', 'Konteks', 'Poin edukasi 1', 'Poin edukasi 2', 'Poin edukasi 3', 'Kesimpulan'],
  'Product Demonstration': ['Hook visual', 'Masalah', 'Proses step-by-step', 'Hasil', 'CTA'],
  'Soft Selling': ['Situasi audiens', 'Insight', 'Bagaimana GSC membantu', 'Ajakan lembut'],
  'Before & After': ['Kondisi awal', 'Tantangan', 'Proses', 'Hasil', 'Penutup'],
}

export const DATA_SOURCES = ['Manual entry', 'Instagram Insights (manual)', 'TikTok Analytics (manual)', 'Meta Business Suite (manual)', 'LinkedIn Analytics (manual)', 'Metricool export', 'Google Search Console', 'CSV import', 'Lainnya']

export const VERIFICATION = ['Terverifikasi (ada sumber)', 'Asumsi / observasi', 'Perlu dicek']

export const WEEKLY_DEFAULT = [
  { day: 'Senin', plan: 'Fasad Talk' },
  { day: 'Selasa', plan: 'Riset konten & audience insight' },
  { day: 'Rabu', plan: 'Building Insight' },
  { day: 'Kamis', plan: 'Fasad Talk' },
  { day: 'Jumat', plan: 'Building Insight' },
  { day: 'Sabtu', plan: 'Before & After' },
  { day: 'Minggu', plan: 'Before & After atau evaluasi mingguan' },
]
export const STORY_TYPES = ['Ask GSC', 'Mitos atau Fakta', 'Project updates', 'Interactive questions', 'Behind the scenes']

export const GSC_BRAND = `Global Sky Clean (GSC) — jasa pembersihan eksterior gedung dengan teknologi drone (kaca, permukaan beton, fasad, perawatan eksterior). Fokus Jabodetabek, berpotensi ke seluruh Indonesia.
Positioning: modern, profesional, inovatif, efisien, dan sadar biaya.
Value proposition: membantu pemilik & pengelola gedung menjaga eksterior tetap bersih dengan mempertimbangkan efisiensi operasional dan batasan anggaran.
Audiens: building management, property management company, building owner, facility manager, operator properti komersial, hotel, pengelola gedung perkantoran, stakeholder properti industri.
Gaya komunikasi: profesional tapi bersahabat, informatif, natural & manusiawi, edukatif, persuasif tanpa agresif, soft selling.
Larangan: klaim berlebihan, menyerang metode pembersihan lain, klaim performa/penghematan biaya tanpa data, testimoni/hasil/statistik karangan.
Pesan inti: tampilan gedung adalah bagian dari citra brand perusahaan, dan perawatan eksterior layak diperhatikan.
Batasan produksi: footage yang ada sebagian besar diambil dari ground level; jangan asumsikan ada footage top-down dari kamera drone.`
