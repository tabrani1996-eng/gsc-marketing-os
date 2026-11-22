// GSC Marketing Assistant — server-side proxy to the Anthropic Messages API.
// - API key only in Supabase secret ANTHROPIC_API_KEY (never in the frontend)
// - caller must be signed in AND a member of at least one GSC workspace
// - system prompt is fixed here (not taken from the client)
// - per-user daily limit (AI_DAILY_LIMIT, default 60)
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SYSTEM = `Anda adalah GSC Marketing Assistant untuk Global Sky Clean (GSC) — jasa pembersihan eksterior gedung dengan teknologi drone (kaca, permukaan beton, fasad, perawatan eksterior). Fokus Jabodetabek, berpotensi ke seluruh Indonesia.
Positioning: modern, profesional, inovatif, efisien, dan sadar biaya. Value proposition: membantu pemilik & pengelola gedung menjaga eksterior tetap bersih dengan mempertimbangkan efisiensi operasional dan batasan anggaran.
Audiens: building management, property management company, building owner, facility manager, operator properti komersial, hotel, pengelola gedung perkantoran, stakeholder properti industri.
Gaya: profesional tapi bersahabat, informatif, natural & manusiawi, edukatif, persuasif tanpa agresif, soft selling. Pesan inti: tampilan gedung adalah bagian dari citra brand perusahaan.
Aturan wajib:
- Bahasa Indonesia yang natural dan ringkas untuk audiens B2B (kecuali diminta lain).
- Jangan mengarang testimoni, hasil proyek, statistik, riset pasar, angka penghematan, atau pencapaian perusahaan. Jika butuh data, tulis placeholder [isi data nyata].
- Hindari bahasa robotik, janji berlebihan, hard selling, dan menjelekkan metode pembersihan lain.
- Tandai ide sebagai hipotesis yang perlu divalidasi.
- Shot list: asumsikan footage dari ground level (tidak ada footage top-down kamera drone).
- Tugas Anda terbatas pada pekerjaan marketing GSC; tolak permintaan di luar itu dengan sopan.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const auth = req.headers.get('Authorization') || ''
    const u = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: anon } })
    if (!u.ok) return json({ error: 'Silakan login untuk memakai AI.' }, 401)
    const user = await u.json()

    const rest = (path: string, init: RequestInit = {}) => fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...(init.headers || {}) } })
    const mem = await rest(`mkt_members?select=workspace_id&user_id=eq.${user.id}&limit=1`)
    const memRows = mem.ok ? await mem.json() : []
    if (!memRows.length) return json({ error: 'AI hanya untuk anggota workspace GSC.' }, 403)

    const key = Deno.env.get('ANTHROPIC_API_KEY')
    const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5-5'
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { return json({ error: 'Body tidak valid' }, 400) }
    if (body.ping) return json({ configured: !!key, model: key ? model : null })
    if (!key) return json({ error: 'AI belum dikonfigurasi: tambahkan secret ANTHROPIC_API_KEY di Supabase.' }, 503)

    // daily limit (skipped silently if the usage table isn't installed yet)
    const limit = Number(Deno.env.get('AI_DAILY_LIMIT') || 60)
    const since = new Date(Date.now() - 864e5).toISOString()
    const cnt = await rest(`mkt_ai_usage?select=id&user_id=eq.${user.id}&created_at=gte.${since}`, { headers: { Prefer: 'count=exact', Range: '0-0' } })
    const usageOk = cnt.ok
    if (usageOk) {
      const total = Number((cnt.headers.get('content-range') || '*/0').split('/')[1] || 0)
      if (total >= limit) return json({ error: `Batas ${limit} permintaan AI per 24 jam tercapai. Coba lagi nanti.` }, 429)
    }

    const task = String(body.task || '-').slice(0, 200)
    const prompt = String(body.prompt || '').slice(0, 12000)
    const context = String(body.context || '').slice(0, 20000)
    if (!prompt.trim()) return json({ error: 'Prompt kosong' }, 400)

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: 2500, system: SYSTEM,
        messages: [{ role: 'user', content: `Tugas: ${task}\n\n${context ? `Konteks dari GSC Marketing OS:\n${context}\n\n` : ''}Permintaan:\n${prompt}` }],
      }),
    })
    const raw = await r.text()
    let data: { content?: { type: string; text: string }[]; error?: { message?: string } } = {}
    try { data = JSON.parse(raw) } catch { return json({ error: 'Respons AI tidak valid. Coba lagi.' }, 502) }
    if (!r.ok) return json({ error: data?.error?.message || 'Permintaan AI gagal' }, 502)
    if (usageOk) await rest('mkt_ai_usage', { method: 'POST', body: JSON.stringify({ user_id: user.id }) })
    const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
    return json({ text, model })
  } catch (e) {
    return json({ error: 'Terjadi kesalahan di server AI: ' + (e instanceof Error ? e.message : String(e)) }, 500)
  }
})
