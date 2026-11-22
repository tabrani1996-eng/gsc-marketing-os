import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend, AreaChart, Area, Cell, PieChart, Pie } from 'recharts'
import { fmtCompact, fmt } from '../lib/utils'

export const C = ['#1f6bff', '#0b1b3f', '#38bdf8', '#22c55e', '#f97316', '#a855f7', '#eab308', '#14b8a6', '#ef4444', '#64748b']
const axis = { fontSize: 11, fill: '#64748b' }
const tip = { contentStyle: { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }, formatter: (v) => fmt(v) }

export const NoData = ({ h = 220, text = 'Belum ada data untuk periode ini' }) => (
  <div className="flex items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400" style={{ height: h }}>{text}</div>
)

export function Bars({ data, x = 'key', bars, h = 240, stacked, xFmt, horizontal, colors }) {
  if (!data?.length) return <NoData h={h} />
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 6, right: 8, left: horizontal ? 10 : -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        {horizontal ? <><XAxis type="number" tick={axis} tickFormatter={fmtCompact} /><YAxis type="category" dataKey={x} tick={axis} width={120} /></>
          : <><XAxis dataKey={x} tick={axis} tickFormatter={xFmt} /><YAxis tick={axis} tickFormatter={fmtCompact} /></>}
        <Tooltip {...tip} labelFormatter={xFmt} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {bars.map((b, i) => (
          <Bar key={b.key} dataKey={b.key} name={b.name} stackId={stacked ? 's' : undefined} fill={b.color || C[i]} radius={stacked ? 0 : [4, 4, 0, 0]}>
            {colors && data.map((d, j) => <Cell key={j} fill={colors[j % colors.length]} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Lines({ data, x = 'key', lines, h = 240, xFmt, area }) {
  if (!data?.length) return <NoData h={h} />
  const Chart = area ? AreaChart : LineChart
  return (
    <ResponsiveContainer width="100%" height={h}>
      <Chart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey={x} tick={axis} tickFormatter={xFmt} />
        <YAxis tick={axis} tickFormatter={fmtCompact} />
        <Tooltip {...tip} labelFormatter={xFmt} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {lines.map((l, i) => area
          ? <Area key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color || C[i]} fill={l.color || C[i]} fillOpacity={0.12} strokeWidth={2} />
          : <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color || C[i]} strokeWidth={2} dot={false} />)}
      </Chart>
    </ResponsiveContainer>
  )
}

export function Donut({ data, h = 220, colors }) {
  if (!data?.length || !data.some((d) => d.value > 0)) return <NoData h={h} />
  return (
    <ResponsiveContainer width="100%" height={h}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((d, i) => <Cell key={i} fill={d.color || (colors || C)[i % C.length]} />)}
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
