export default function SparkBar({ data = [], color = '#7c6af7', height = 36 }) {
  if (!data.length) return <div style={{ height, background: '#252540', borderRadius: 4 }} />
  const max = Math.max(...data.map(d => Number(d.value || 0)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: max > 0 ? `${Math.max(8, (Number(d.value) / max) * 100)}%` : '8%',
            background: i === data.length - 1 ? color : `${color}55`,
            borderRadius: '2px 2px 0 0'
          }}
          title={d.label}
        />
      ))}
    </div>
  )
}
