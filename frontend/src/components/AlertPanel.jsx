export default function AlertPanel({ alerts, predictions }) {
  return (
    <div>
      {/* Predictions */}
      {predictions?.length > 0 && (
        <>
          <div className="section-divider">AI Predictions</div>
          {predictions.map((pred, i) => (
            <div key={i} className={`prediction-item ${pred.type}`}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#e8f4ff' }}>{pred.message}</div>
                <div className="prediction-conf">{pred.confidence}% confidence</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Alerts */}
      <div className="section-divider">Active Alerts</div>

      {(!alerts || alerts.length === 0) && (
        <div style={{
          textAlign: 'center', padding: '20px 0',
          color: '#2d5070', fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          No alerts detected
        </div>
      )}

      {alerts?.map((alert) => (
        <div key={alert.id} className={`alert-item ${alert.severity}`}>
          <div className="alert-message">{alert.message}</div>
          <div className="alert-meta">
            <span>{alert.source_ip}</span>
            <span>{alert.protocol}</span>
            <span>{alert.latency}ms</span>
            <span>{alert.pps} pps</span>
          </div>
          <div style={{ fontSize: 9, color: '#2d5070', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            {new Date(alert.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  )
}
