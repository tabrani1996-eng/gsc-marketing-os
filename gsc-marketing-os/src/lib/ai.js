import { supabase } from './supabase'
import { GSC_BRAND } from '../config/constants'

let statusCache = null

/** Checks whether the server-side AI function is deployed AND has an API key configured. */
export async function aiStatus(force) {
  if (statusCache && !force) return statusCache
  try {
    const { data, error } = await supabase.functions.invoke('gsc-ai', { body: { ping: true } })
    statusCache = error ? { configured: false, reason: 'Fungsi AI belum dapat dihubungi.' } : { configured: !!data?.configured, model: data?.model, reason: data?.configured ? null : 'API key AI belum diset di server (Supabase secret ANTHROPIC_API_KEY).' }
  } catch {
    statusCache = { configured: false, reason: 'Fungsi AI belum dapat dihubungi.' }
  }
  return statusCache
}

export const SYSTEM_RULES = `Anda adalah GSC Marketing Assistant untuk Global Sky Clean.
${GSC_BRAND}

Aturan wajib:
- Tulis dalam Bahasa Indonesia yang natural, ringkas, dan cocok untuk audiens B2B (kecuali diminta lain).
- Jangan mengarang testimoni, hasil proyek, statistik, riset pasar, angka penghematan, atau pencapaian perusahaan. Jika butuh data, tulis placeholder seperti [isi data nyata] dan sebutkan data apa yang perlu dicari.
- Hindari bahasa robotik, janji berlebihan, dan hard selling. Jangan menjelekkan metode pembersihan lain.
- Tandai ide sebagai hipotesis yang perlu divalidasi, bukan fakta yang sudah terbukti.
- Untuk shot list, asumsikan footage diambil dari ground level (tidak ada footage top-down dari kamera drone).`

export async function askAI({ task, prompt, context }) {
  const { data, error } = await supabase.functions.invoke('gsc-ai', { body: { task, prompt, context } })
  if (error) {
    let msg = error.message
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error } catch { /* ignore */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data.text
}

/** Builds a complete prompt the user can paste into Claude when server AI isn't configured. */
export function buildPortablePrompt({ task, prompt, context }) {
  return `${SYSTEM_RULES}\n\nTugas: ${task}\n${context ? `\nKonteks dari GSC Marketing OS:\n${context}\n` : ''}\nPermintaan:\n${prompt}`
}
