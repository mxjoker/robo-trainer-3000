import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

export default function DualLineChart({ data = [] }) {
  if (!data.length) return <div style={{ height: 44, background: '#252540', borderRadius: 4 }} />
  return (
    <ResponsiveContainer width="100%" height={44}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="pain_level" stroke="#f472b6" dot={false} strokeWidth={1.5} />
        <Line type="monotone" dataKey="energy_level" stroke="var(--accent)" dot={false} strokeWidth={1.5} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid #252540', borderRadius: 6, fontSize: 11 }}
          itemStyle={{ color: '#fff' }}
          labelStyle={{ color: '#666' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
