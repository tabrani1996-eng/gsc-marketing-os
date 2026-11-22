
export const cx = (...a) => a.filter(Boolean).join(' ')

export const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
export const fmt = (v) => new Intl.NumberFormat('id-ID').format(Math.round(num(v)))
export const fmtCompact = (v) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(num(v))
export const fmtRp = (v) => 'Rp ' + fmt(v)
export const pct = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) + '%' : '–')

export const pad = (n) => String(n).padStart(2, '0')
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => toISO(new Date())
export const parseISO = (s) => {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const startOfWeek = (d) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x }
export const monthKey = (s) => (s || '').slice(0, 7)
export const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const DAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
export const fmtDate = (s) => {
  const d = parseISO(s)
  return d ? `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}` : '–'
}
export const fmtMonth = (k) => {
  if (!k) return '–'
  const [y, m] = k.split('-').map(Number)
  return `${MONTHS_ID[m - 1]} ${y}`
}

// Date range presets -> [fromISO, toISO]
export function rangeFor(preset, custom) {
  const now = new Date()
  const t = toISO(now)
  switch (preset) {
    case 'daily': return [t, t]
    case 'weekly': return [toISO(startOfWeek(now)), toISO(addDays(startOfWeek(now), 6))]
    case 'monthly': return [toISO(new Date(now.getFullYear(), now.getMonth(), 1)), toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0))]
    case 'quarterly': { const q = Math.floor(now.getMonth() / 3); return [toISO(new Date(now.getFullYear(), q * 3, 1)), toISO(new Date(now.getFullYear(), q * 3 + 3, 0))] }
    case 'custom': return [custom?.from || '0000-01-01', custom?.to || '9999-12-31']
    default: return ['0000-01-01', '9999-12-31']
  }
}
export const inRange = (s, [a, b]) => !!s && s >= a && s <= b

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

// ---------- Export helpers ----------
const cellText = (v) => {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? (x.text ?? JSON.stringify(x)) : x)).join('; ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function downloadBlob(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function toCSV(rows, columns) {
  const esc = (s) => {
    const t = cellText(s)
    return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t
  }
  const head = columns.map((c) => esc(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(',')).join('\n')
  return '﻿' + head + '\n' + body
}

export function exportCSV(rows, columns, filename) {
  downloadBlob(toCSV(rows, columns), filename.endsWith('.csv') ? filename : filename + '.csv', 'text/csv;charset=utf-8')
}

export async function exportPDF({ title, subtitle, columns, rows, filename, sections }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: columns && columns.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(11, 27, 63); doc.rect(0, 0, W, 60, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.text(title, 32, 30)
  doc.setFontSize(9); doc.text(subtitle || `GSC Digital Marketing OS • dibuat ${fmtDate(today())}`, 32, 46)
  doc.setTextColor(30, 41, 59)
  let y = 80
  if (sections) {
    sections.forEach((s) => {
      if (s.heading) { doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(s.heading, 32, y); doc.setFont(undefined, 'normal'); y += 8 }
      if (s.text) {
        doc.setFontSize(9.5)
        const lines = doc.splitTextToSize(s.text, W - 64)
        lines.forEach((ln) => { if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 40 } y += 13; doc.text(ln, 32, y) })
        y += 10
      }
      if (s.columns) {
        autoTable(doc, {
          startY: y + 4, head: [s.columns.map((c) => c.label)],
          body: s.rows.map((r) => s.columns.map((c) => cellText(typeof c.get === 'function' ? c.get(r) : r[c.key]).slice(0, 400))),
          styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [31, 107, 255] }, margin: { left: 32, right: 32 },
        })
        y = doc.lastAutoTable.finalY + 22
      }
    })
  } else {
    autoTable(doc, {
      startY: y, head: [columns.map((c) => c.label)],
      body: rows.map((r) => columns.map((c) => cellText(typeof c.get === 'function' ? c.get(r) : r[c.key]).slice(0, 400))),
      styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [31, 107, 255] }, margin: { left: 32, right: 32 },
    })
  }
  doc.save(filename.endsWith('.pdf') ? filename : filename + '.pdf')
}

// RFC4180-style CSV parser with a single delimiter detected from the header line
export function detectDelimiter(text) {
  const line = text.replace(/^\ufeff/, '').split(/\r?\n/)[0] || ''
  const counts = { ',': 0, ';': 0, '\t': 0 }
  let q = false
  for (const ch of line) { if (ch === '"') q = !q; else if (!q && ch in counts) counts[ch]++ }
  return Object.entries(counts).sort((x, y) => y[1] - x[1])[0][1] > 0 ? Object.entries(counts).sort((x, y) => y[1] - x[1])[0][0] : ','
}
export function parseCSV(text) {
  const delim = detectDelimiter(text)
  const rows = []; let row = []; let cur = ''; let q = false
  text = text.replace(/^\ufeff/, '')
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch
    } else if (ch === '"') q = true
    else if (ch === delim) { row.push(cur); cur = '' }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else if (ch !== '\r') cur += ch
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** Parses numbers written in Indonesian or English style: 12.500 / 12,500 / 1,5 / 1.5 / Rp 3.200.000 */
export function parseNumber(v) {
  if (v == null) return null
  let t = String(v).replace(/rp|idr|%|\s/gi, '')
  if (!t) return null
  const neg = /^-/.test(t); t = t.replace(/^-/, '')
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  else if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '')
  else if (t.includes('.') && t.includes(',')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  else if (t.includes(',')) t = t.replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? (neg ? -n : n) : null
}

/** Normalises YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY to YYYY-MM-DD; returns null if unrecognised. */
export function parseDate(v) {
  const t = String(v || '').trim()
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m && +m[2] <= 12) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`
  return null
}

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true } catch { return false }
}
