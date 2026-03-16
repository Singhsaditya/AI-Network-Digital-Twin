const GRADE_COLOR = {
  A: '#00e676',
  B: '#69f0ae',
  C: '#ffeb3b',
  D: '#ff9800',
  F: '#ff3d3d',
}

const COMPONENT_COLOR = {
  latency:      '#c678dd',
  throughput:   '#00d4ff',
  anomaly_rate: '#ff9800',
}

function HealthRing({ score, grade }) {
  const r = 50
  const circumference = 2 * Math.PI * r
  const filled = circumference * (score / 100)
  const color = GRADE_COLOR[grade] || '#00d4ff'

  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="health-ring-svg">
      {/* Track */}
      <circle cx="65" cy="65" r={r} fill="none" stroke="#112840" strokeWidth="8" />
      {/* Fill */}
      <circle
        cx="65" cy="65" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.25}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      {/* Score */}
      <text className="health-score-text" x="65" y="60" fill={color}>
        {score}
      </text>
      <text className="health-grade-text" x="65" y="80">
        Grade {grade}
      </text>
    </svg>
  )
}

export default function HealthScore({ health }) {
  if (!health) return null

  const { score = 100, grade = 'A', components = {} } = health
  const color = GRADE_COLOR[grade] || '#00d4ff'

  return (
    <div>
      <div className="health-ring-wrapper">
        <HealthRing score={score} grade={grade} />
        <div style={{ fontSize: 10, color: '#2d5070', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginTop: 4 }}>
          NETWORK HEALTH
        </div>
      </div>

      {Object.entries(components).map(([key, comp]) => {
        const pct = Math.round((comp.score / comp.max) * 100)
        const barColor = COMPONENT_COLOR[key] || '#00d4ff'
        const label = key === 'anomaly_rate'
          ? `${comp.value}% anomalies`
          : key === 'latency'
            ? `${comp.value} ms avg`
            : `${comp.value} pps avg`

        return (
          <div key={key} className="health-component">
            <div className="health-component-header">
              <span style={{ textTransform: 'capitalize', letterSpacing: '0.06em' }}>
                {key.replace('_', ' ')}
              </span>
              <span style={{ color: barColor }}>{label}</span>
            </div>
            <div className="health-bar-track">
              <div
                className="health-bar-fill"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
