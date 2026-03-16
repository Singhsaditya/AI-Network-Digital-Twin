import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0a1e35', border: '1px solid #112840',
      borderRadius: 6, padding: '8px 12px', fontSize: 11,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function TrafficChart({ history }) {
  if (!history?.length) return null

  // Take last 60 points
  const data = history.slice(-60).map((p, i) => ({
    t: i,
    pps: p.packets_per_second,
    latency: p.latency,
    size: p.packet_size,
    anomaly: p.status === 'anomaly' ? p.packets_per_second : null,
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, height: 190 }}>
      {/* PPS chart */}
      <div>
        <div style={{ fontSize: 10, color: '#2d5070', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, letterSpacing: '0.08em' }}>
          PACKETS / SEC
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ppsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff9800" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ff9800" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#112840" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis tick={{ fill: '#2d5070', fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="pps"
              stroke="#00d4ff"
              strokeWidth={1.5}
              fill="url(#ppsGrad)"
              dot={false}
              name="Normal"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="anomaly"
              stroke="#ff9800"
              strokeWidth={1.5}
              fill="url(#anomalyGrad)"
              dot={false}
              name="Anomaly"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Latency chart */}
      <div>
        <div style={{ fontSize: 10, color: '#2d5070', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, letterSpacing: '0.08em' }}>
          LATENCY (ms)
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#112840" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis tick={{ fill: '#2d5070', fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="latency"
              stroke="#c678dd"
              strokeWidth={1.5}
              dot={false}
              name="Latency"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
