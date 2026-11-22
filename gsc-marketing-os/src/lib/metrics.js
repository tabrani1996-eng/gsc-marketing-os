import { num, inRange, monthKey, startOfWeek, parseISO, toISO } from './utils'

export const METRIC_KEYS = ['reach', 'impressions', 'views', 'watch_time', 'likes', 'comments', 'shares', 'saves', 'followers_gained', 'profile_visits', 'link_clicks', 'wa_clicks', 'inquiries', 'qualified_leads']

export const engagementOf = (d) => num(d.likes) + num(d.comments) + num(d.shares) + num(d.saves)
export const erOf = (d) => (num(d.reach) > 0 ? (engagementOf(d) / num(d.reach)) * 100 : NaN)

/**
 * Account-level rows (no `content`) are the source of truth for totals. For a
 * platform + month that has no account-level rows, that month's content-level
 * rows are summed instead — so nothing is double-counted and a month with only
 * per-post data is not dropped.
 */
export function totalsRows(metrics, range, platform) {
  const rows = metrics.filter((m) => inRange(m.data.date, range) && (!platform || m.data.platform === platform))
  const key = (r) => r.data.platform + '|' + monthKey(r.data.date)
  const acct = new Set(rows.filter((r) => !r.data.content).map(key))
  return rows.filter((r) => (r.data.content ? !acct.has(key(r)) : true))
}

export function sumRows(rows) {
  const t = Object.fromEntries(METRIC_KEYS.map((k) => [k, 0]))
  rows.forEach((r) => METRIC_KEYS.forEach((k) => { t[k] += num(r.data[k]) }))
  t.engagement = t.likes + t.comments + t.shares + t.saves
  t.er = t.reach > 0 ? (t.engagement / t.reach) * 100 : NaN
  return t
}

export function sources(rows) {
  const s = new Set(rows.map((r) => r.data.source || 'Manual entry'))
  const sample = rows.some((r) => r.is_sample)
  return { label: [...s].join(', ') || '–', sample }
}

// time-series buckets
export function bucketKey(dateStr, gran) {
  if (gran === 'month') return monthKey(dateStr)
  if (gran === 'week') return toISO(startOfWeek(parseISO(dateStr)))
  return dateStr
}

export function series(rows, gran, keys) {
  const map = {}
  rows.forEach((r) => {
    const k = bucketKey(r.data.date, gran)
    map[k] = map[k] || { key: k, ...Object.fromEntries(keys.map((x) => [x, 0])) }
    keys.forEach((x) => {
      if (x === 'engagement') map[k][x] += engagementOf(r.data)
      else map[k][x] += num(r.data[x])
    })
  })
  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key))
}

export function latestFollowers(metrics, platform) {
  const rows = metrics.filter((m) => m.data.platform === platform && !m.data.content && num(m.data.followers) > 0).sort((a, b) => a.data.date.localeCompare(b.data.date))
  return rows.length ? num(rows[rows.length - 1].data.followers) : null
}

export function contentPerformance(metrics, contentById) {
  const agg = {}
  metrics.filter((m) => m.data.content && contentById[m.data.content]).forEach((m) => {
    const id = m.data.content
    agg[id] = agg[id] || { id, rows: [] }
    agg[id].rows.push(m)
  })
  return Object.values(agg).map((a) => {
    const t = sumRows(a.rows)
    const c = contentById[a.id]
    return { id: a.id, content: c, ...t, score: t.reach + t.engagement * 10 + t.inquiries * 200 }
  })
}

export function groupPerf(perf, keyFn) {
  const g = {}
  perf.forEach((p) => {
    const k = keyFn(p) || 'Tanpa label'
    g[k] = g[k] || { name: k, posts: 0, reach: 0, engagement: 0, inquiries: 0, saves: 0, shares: 0 }
    g[k].posts++; g[k].reach += p.reach; g[k].engagement += p.engagement; g[k].inquiries += p.inquiries; g[k].saves += p.saves; g[k].shares += p.shares
  })
  return Object.values(g).map((x) => ({ ...x, er: x.reach ? (x.engagement / x.reach) * 100 : 0, avgReach: x.posts ? Math.round(x.reach / x.posts) : 0 })).sort((a, b) => b.er - a.er)
}

/** Rule-based recommendations derived only from recorded data. */
export function recommendations({ perf, byPillar, byFormat, totals, prevTotals, leads }) {
  const out = []
  if (perf.length < 5) {
    out.push({ kind: 'info', text: `Baru ada ${perf.length} konten dengan data performa. Rekomendasi akan lebih andal setelah minimal 5–10 konten tercatat per pilar.` })
  }
  if (byPillar.length >= 2) {
    const top = byPillar[0]; const low = byPillar[byPillar.length - 1]
    out.push({ kind: 'up', text: `Pilar "${top.name}" mencatat engagement rate tertinggi (${top.er.toFixed(1)}% dari ${top.posts} konten). Pertimbangkan menjaga atau menambah porsinya.` })
    if (low.posts >= 2) out.push({ kind: 'down', text: `Pilar "${low.name}" terendah (${low.er.toFixed(1)}%). Evaluasi hook, format, dan jam tayang sebelum mengurangi porsinya.` })
  }
  if (byFormat.length >= 2) out.push({ kind: 'up', text: `Format "${byFormat[0].name}" saat ini paling efektif menurut engagement rate (${byFormat[0].er.toFixed(1)}%).` })
  if (prevTotals && prevTotals.reach > 0) {
    const ch = ((totals.reach - prevTotals.reach) / prevTotals.reach) * 100
    out.push({ kind: ch >= 0 ? 'up' : 'down', text: `Reach ${ch >= 0 ? 'naik' : 'turun'} ${Math.abs(ch).toFixed(1)}% dibanding periode sebelumnya.` })
  }
  const saveHeavy = [...perf].sort((a, b) => b.saves - a.saves)[0]
  if (saveHeavy && saveHeavy.saves > 0) out.push({ kind: 'info', text: `Konten paling banyak disimpan: "${saveHeavy.content.data.title}". Konten yang banyak di-save biasanya cocok dijadikan seri edukasi lanjutan.` })
  if (leads) {
    const withSrc = leads.filter((l) => l.data.source)
    if (withSrc.length) {
      const c = {}; withSrc.forEach((l) => { c[l.data.source] = (c[l.data.source] || 0) + 1 })
      const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]
      out.push({ kind: 'info', text: `Sumber lead terbanyak: ${best[0]} (${best[1]} lead). Pastikan CTA di kanal ini jelas dan link WhatsApp aktif.` })
    }
  }
  if (totals.reach > 0 && totals.wa_clicks === 0 && totals.link_clicks === 0) out.push({ kind: 'down', text: 'Belum ada klik WhatsApp/link yang tercatat. Cek apakah CTA dan link bio sudah terpasang dan apakah data klik sudah diinput.' })
  return out
}
