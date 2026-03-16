import { useEffect, useRef } from 'react'

const NODE_POSITIONS = {
  client_a: { x: 80,  y: 80  },
  client_b: { x: 80,  y: 200 },
  client_c: { x: 80,  y: 320 },
  router:   { x: 280, y: 200 },
  server:   { x: 470, y: 200 },
}

const NODE_ICONS = {
  client: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
  router:  'M20.2 5.9l.8-.8C19.6 3.7 17.8 3 16 3s-3.6.7-5 2.1l.8.8C13 4.8 14.5 4.2 16 4.2s3 .6 4.2 1.7zm-.9.8c-.9-.9-2.1-1.4-3.3-1.4s-2.4.5-3.3 1.4l.8.8c.7-.7 1.6-1 2.5-1s1.8.3 2.5 1l.8-.8zm-8.3 6.7L7 9.4H5v2h2l.5.5L5 14.6V16h.8l.5-.5.5.5H8v-1.4l2-2 2 2V16h1.2l.5-.5.5.5H15v-1.4l-2.2-2.2.7-.7 4.5 4.5V14h2v-2h-2L14 8l-3 5.4z',
  server:  'M19 3H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM5 13h14c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-4c0-1.1.9-2-2-2zm7 3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z',
}

const COLORS = {
  client: '#2196f3',
  router: '#00d4ff',
  server: '#00e676',
}

export default function NetworkMap({ topology, latestPacket }) {
  const svgRef = useRef(null)
  const particlesRef = useRef([])
  const animFrameRef = useRef(null)

  // ── Animate a particle along an edge ──────────────────────────────────────
  useEffect(() => {
    if (!latestPacket || !topology) return

    const src = latestPacket.source
    const dst = latestPacket.destination
    const isAnomaly = latestPacket.status === 'anomaly'

    // Path: client → router → server
    const segments = [
      { from: src, to: 'router' },
      { from: 'router', to: dst },
    ]

    segments.forEach(({ from, to }, i) => {
      if (!NODE_POSITIONS[from] || !NODE_POSITIONS[to]) return
      const id = `particle-${Date.now()}-${i}`
      particlesRef.current.push({
        id, from, to,
        progress: 0,
        speed: 0.015 + Math.random() * 0.01,
        color: isAnomaly ? '#ff9800' : '#00d4ff',
        size: isAnomaly ? 5 : 3,
        delay: i * 20,  // slight stagger
      })
    })
  }, [latestPacket, topology])

  // ── Animation loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    let particleLayer = svg.querySelector('#particle-layer')
    if (!particleLayer) {
      particleLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      particleLayer.id = 'particle-layer'
      svg.appendChild(particleLayer)
    }

    const animate = () => {
      // Remove stale circles
      particleLayer.innerHTML = ''
      particlesRef.current = particlesRef.current.filter(p => p.progress <= 1.05)

      particlesRef.current.forEach(p => {
        if (p.delay > 0) { p.delay--; return }
        p.progress += p.speed

        const from = NODE_POSITIONS[p.from]
        const to   = NODE_POSITIONS[p.to]
        if (!from || !to) return

        const x = from.x + (to.x - from.x) * Math.min(p.progress, 1)
        const y = from.y + (to.y - from.y) * Math.min(p.progress, 1)

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', x)
        circle.setAttribute('cy', y)
        circle.setAttribute('r', p.size)
        circle.setAttribute('fill', p.color)
        circle.setAttribute('opacity', Math.min(1, 2 - p.progress * 2))
        particleLayer.appendChild(circle)
      })

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  if (!topology) return null

  const { nodes, edges } = topology

  return (
    <svg
      ref={svgRef}
      className="network-map"
      viewBox="0 0 580 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#112840" strokeWidth="0.5" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <rect width="580" height="400" fill="url(#grid)" />

      {/* Edges */}
      {edges.map((edge, i) => {
        const from = NODE_POSITIONS[edge.from]
        const to   = NODE_POSITIONS[edge.to]
        if (!from || !to) return null
        return (
          <line
            key={i}
            x1={from.x} y1={from.y}
            x2={to.x}   y2={to.y}
            stroke="#1a3a5c"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        )
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos   = NODE_POSITIONS[node.id]
        const color = COLORS[node.type] || '#6b9fc8'
        const icon  = NODE_ICONS[node.type] || NODE_ICONS.client
        const r = node.type === 'router' ? 34 : node.type === 'server' ? 32 : 28

        return (
          <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
            {/* Outer ring glow */}
            <circle r={r + 8} fill="none" stroke={color} strokeWidth="0.5" opacity="0.3" />
            {/* Node circle */}
            <circle r={r} fill="#071525" stroke={color} strokeWidth="1.5" />
            {/* Icon */}
            <svg
              x={-12} y={-16}
              width="24" height="24"
              viewBox="0 0 24 24"
              fill={color}
              opacity="0.9"
            >
              <path d={icon} />
            </svg>
            {/* Label */}
            <text
              className="node-label"
              textAnchor="middle"
              y={r + 16}
              fill="#6b9fc8"
              fontSize="11"
              fontFamily="'JetBrains Mono', monospace"
            >
              {node.label}
            </text>
            {/* IP */}
            <text
              textAnchor="middle"
              y={r + 28}
              fill="#2d5070"
              fontSize="9"
              fontFamily="'JetBrains Mono', monospace"
            >
              {node.ip}
            </text>
          </g>
        )
      })}

      {/* Title */}
      <text x="16" y="388" fill="#2d5070" fontSize="10" fontFamily="'JetBrains Mono', monospace">
        NETWORK TOPOLOGY — LIVE
      </text>
    </svg>
  )
}
