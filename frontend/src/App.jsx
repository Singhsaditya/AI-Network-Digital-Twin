import { useState, useEffect, useRef, useCallback } from 'react'
import NetworkMap    from './components/NetworkMap.jsx'
import TrafficChart  from './components/TrafficChart.jsx'
import HealthScore   from './components/HealthScore.jsx'
import AlertPanel    from './components/AlertPanel.jsx'

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://ai-network-digital-twin.onrender.com/ws'
const HISTORY_MAX = 200
const PACKET_FEED_MAX = 30

export default function App() {
  const [connected, setConnected] = useState(false)
  const [topology,  setTopology]  = useState(null)
  const [history,   setHistory]   = useState([])
  const [packetFeed,setPacketFeed]= useState([])
  const [alerts,    setAlerts]    = useState([])
  const [health,    setHealth]    = useState(null)
  const [predictions,setPredictions] = useState([])
  const [stats,     setStats]     = useState(null)
  const [latest,    setLatest]    = useState(null)

  const wsRef = useRef(null)

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data)

      if (msg.type === 'snapshot') {
        setTopology(msg.topology)
        setHistory(msg.history || [])
        setAlerts(msg.alerts || [])
        setHealth(msg.health)
        setStats(msg.stats)
        return
      }

      if (msg.type === 'packet') {
        const pkt = msg.packet

        setLatest(pkt)

        setHistory(h => {
          const next = [...h, pkt]
          return next.length > HISTORY_MAX ? next.slice(-HISTORY_MAX) : next
        })

        setPacketFeed(f => {
          const next = [pkt, ...f]
          return next.slice(0, PACKET_FEED_MAX)
        })

        if (msg.health)      setHealth(msg.health)
        if (msg.predictions) setPredictions(msg.predictions)
        if (msg.stats)       setStats(msg.stats)

        // Poll fresh alerts every 10 packets (lightweight)
        if (pkt.status === 'anomaly') {
          fetch('/api/alerts?n=20')
            .then(r => r.json())
            .then(d => setAlerts(d.alerts || []))
            .catch(() => {})
        }
      }
    }

    ws.onclose = () => {
      setConnected(false)
      setTimeout(connect, 3000)  // auto-reconnect
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])

  const grade = health?.grade || 'A'
  const gradeColor = { A:'#00e676', B:'#69f0ae', C:'#ffeb3b', D:'#ff9800', F:'#ff3d3d' }[grade]

  return (
    <div className="app-layout">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-brand">
          <svg className="header-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" stroke="#00d4ff" strokeWidth="1.5" />
            <circle cx="20" cy="20" r="10" stroke="#00d4ff" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="20" cy="20" r="4" fill="#00d4ff" />
            <line x1="8"  y1="8"  x2="14" y2="14" stroke="#00d4ff" strokeWidth="1" />
            <line x1="32" y1="8"  x2="26" y2="14" stroke="#00d4ff" strokeWidth="1" />
            <line x1="8"  y1="32" x2="14" y2="26" stroke="#00d4ff" strokeWidth="1" />
            <line x1="32" y1="32" x2="26" y2="26" stroke="#00d4ff" strokeWidth="1" />
          </svg>
          <div>
            <div className="header-title">AI Network Digital Twin</div>
            <div className="header-subtitle">ML-POWERED NETWORK INTELLIGENCE PLATFORM</div>
          </div>
        </div>

        <div className="header-status">
          {stats && (
            <>
              <div className="status-pill">
                <span style={{ color: '#c678dd', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                  {stats.total_packets?.toLocaleString()} packets
                </span>
              </div>
              <div className="status-pill">
                <span style={{ color: '#ff9800', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                  {stats.anomaly_rate}% anomaly rate
                </span>
              </div>
              <div className="status-pill">
                <span style={{ color: gradeColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                  Health: {health?.score || 100}/100
                </span>
              </div>
            </>
          )}
          <div className="status-pill">
            <div className={`pulse-dot ${connected ? '' : 'offline'}`} />
            <span>{connected ? 'LIVE' : 'CONNECTING'}</span>
          </div>
        </div>
      </header>

      {/* ── 3-column main grid ──────────────────────────────────────────────── */}
      <div className="main-grid">

        {/* ─ LEFT PANEL: Health + stats ─────────────────────────────────────── */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">System Health</span>
            {stats && <span className="panel-badge">{stats.uptime_seconds}s uptime</span>}
          </div>
          <div className="panel-body">
            <HealthScore health={health} />

            <div className="section-divider">Network Stats</div>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Total Packets</div>
                <div className="stat-value cyan">{stats?.total_packets?.toLocaleString() || '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Anomalies</div>
                <div className="stat-value orange">{stats?.total_anomalies?.toLocaleString() || '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Latency</div>
                <div className="stat-value" style={{ color: '#c678dd' }}>
                  {health?.components?.latency?.value || '—'} ms
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg PPS</div>
                <div className="stat-value" style={{ color: '#00d4ff' }}>
                  {health?.components?.throughput?.value || '—'}
                </div>
              </div>
            </div>

            <div className="section-divider">Last Packet</div>
            {latest && (
              <div style={{
                background: '#0a1e35', border: '1px solid #112840',
                borderRadius: 8, padding: '10px 12px',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                lineHeight: 1.8,
              }}>
                {[
                  ['SRC', latest.source_ip],
                  ['DST', latest.destination_ip],
                  ['PROTO', latest.protocol],
                  ['SIZE', `${latest.packet_size} B`],
                  ['LATENCY', `${latest.latency} ms`],
                  ['PPS', latest.packets_per_second],
                  ['STATUS', latest.status],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#2d5070' }}>{k}</span>
                    <span style={{ color: latest.status === 'anomaly' && k !== 'SRC' ? '#ff9800' : '#6b9fc8' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─ CENTER: Map + Charts ───────────────────────────────────────────── */}
        <div className="center-panel">
          <div className="network-map-wrapper">
            <div className="panel-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, background: 'transparent', borderBottom: 'none' }}>
              <span className="panel-title">Live Network Topology</span>
              <span className="panel-badge">{topology?.nodes?.length || 0} nodes · {topology?.edges?.length || 0} links</span>
            </div>
            <NetworkMap topology={topology} latestPacket={latest} />
          </div>

          <div className="charts-wrapper">
            <div className="charts-title">Traffic Analytics — Last 60s</div>
            <TrafficChart history={history} />
          </div>
        </div>

        {/* ─ RIGHT PANEL: Alerts + packet feed ─────────────────────────────── */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">AI Alerts</span>
            <span className="panel-badge" style={{ color: alerts.length ? '#ff9800' : '#2d5070' }}>
              {alerts.length} active
            </span>
          </div>
          <div className="panel-body">
            <AlertPanel alerts={alerts} predictions={predictions} />

            <div className="section-divider" style={{ marginTop: 20 }}>Packet Feed</div>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 80px 52px 1fr', gap: 4, marginBottom: 6 }}>
              {['PROTO', 'SRC IP', 'LAT', 'PPS'].map(h => (
                <div key={h} style={{ fontSize: 9, color: '#2d5070', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
                  {h}
                </div>
              ))}
            </div>
            {packetFeed.map((p, i) => (
              <div key={`${p.id}-${i}`} className={`packet-row ${p.status === 'anomaly' ? 'anomaly' : ''}`}>
                <div>
                  <span className={`proto-tag proto-${p.protocol}`}>{p.protocol}</span>
                </div>
                <div>{p.source_ip}</div>
                <div>{p.latency}ms</div>
                <div>{p.packets_per_second}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Connecting overlay ──────────────────────────────────────────────── */}
      {!connected && (
        <div className="connecting-overlay">
          <div className="spinner" />
          <div className="connecting-text">CONNECTING TO BACKEND...</div>
          <div style={{ fontSize: 10, color: '#2d5070', fontFamily: "'JetBrains Mono', monospace" }}>
            ws://localhost:8000/ws
          </div>
        </div>
      )}
    </div>
  )
}
