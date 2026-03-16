# 🧠 AI Network Digital Twin

> A real-time ML-powered network simulation and intelligence platform.
> Simulates a live network, generates traffic, detects anomalies with Isolation Forest, and predicts failures before they happen.

![Python](https://img.shields.io/badge/Python-3.11-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green) ![React](https://img.shields.io/badge/React-18-61dafb) ![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-orange) ![Docker](https://img.shields.io/badge/Docker-ready-2496ed)

---

## 🏗️ Architecture

```
Network Simulator (Python)
        ↓
   Traffic Generator  ← generates HTTP, DNS, SSH, FTP, ICMP packets
        ↓
   Log Collector      ← enriches with timestamp, IP, latency, packet size
        ↓
   AI Analysis Engine ← Isolation Forest anomaly detection
        ↓
   Prediction Engine  ← trend analysis, failure forecasting
        ↓
   FastAPI + WebSocket ← real-time streaming to frontend
        ↓
   React Dashboard    ← live topology map, charts, AI alerts
```

## 🤖 AI Capabilities

| Feature | Algorithm | What it detects |
|---|---|---|
| Anomaly Detection | Isolation Forest | Port scans, traffic spikes, DDoS attempts |
| Failure Prediction | Linear trend analysis | Congestion, server overload, latency spikes |
| Health Scoring | Multi-factor weighted model | Latency + throughput + anomaly rate |

## 📁 Project Structure

```
ai-network-digital-twin/
├── backend/
│   ├── main.py          # FastAPI app, WebSocket, REST endpoints
│   ├── simulator.py     # Network + traffic simulation engine
│   ├── ai_engine.py     # Isolation Forest + health scoring
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main layout, WebSocket client
│   │   └── components/
│   │       ├── NetworkMap.jsx         # Animated SVG topology
│   │       ├── TrafficChart.jsx       # Recharts live traffic graphs
│   │       ├── HealthScore.jsx        # Radial health ring
│   │       └── AlertPanel.jsx        # AI alerts + predictions
│   ├── package.json
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Python 3.11+
- Node.js 20+
- pip, npm

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/ai-network-digital-twin.git
cd ai-network-digital-twin
```

### 2. Start the backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
> Backend runs at http://localhost:8000

### 3. Start the frontend
```bash
cd frontend
npm install
npm run dev
```
> Dashboard opens at http://localhost:3000

---

## 🐳 Docker (One Command)

```bash
docker-compose up --build
```
- Frontend → http://localhost:3000
- Backend API → http://localhost:8000
- API Docs → http://localhost:8000/docs

---

## ☁️ Deploy to Render

### Backend (Web Service)
1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend (Static Site)
1. Render → New → Static Site
2. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Environment Variable:** `VITE_WS_URL=wss://YOUR-BACKEND.onrender.com/ws`

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Health check |
| `/ws` | WebSocket | Real-time packet stream |
| `/api/topology` | GET | Network node + edge map |
| `/api/health` | GET | Current health score + predictions |
| `/api/alerts` | GET | Recent AI anomaly alerts |
| `/api/history?n=100` | GET | Last N packets |
| `/api/stats` | GET | Uptime, totals, anomaly rate |
| `/docs` | GET | Interactive Swagger UI |

### WebSocket Message Format
```json
{
  "type": "packet",
  "packet": {
    "id": 1234,
    "source_ip": "192.168.1.10",
    "destination_ip": "10.0.0.100",
    "protocol": "HTTPS",
    "packet_size": 512,
    "latency": 14.2,
    "packets_per_second": 87,
    "status": "normal",
    "ai_score": 0.12,
    "ai_anomaly": false
  },
  "health": { "score": 91, "grade": "A", "components": {} },
  "predictions": [],
  "stats": { "total_packets": 1500, "anomaly_rate": 7.2 }
}
```

---

## 🧪 Simulated Network

```
192.168.1.10 (Client A) ─┐
192.168.1.11 (Client B) ─┤──→ 10.0.0.1 (Router) ──→ 10.0.0.100 (Server)
192.168.1.12 (Client C) ─┘
```

**Traffic types:** HTTP, HTTPS, DNS, SSH, FTP, ICMP

**Anomaly types simulated:**
- 🔴 Port scanning (SSH flood, small packets, high PPS)
- 🟠 Traffic spike (oversized packets, burst PPS)
- 🟡 High latency (congestion simulation)
- 🔴 DDoS attempt (massive PPS flood)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, WebSockets |
| AI / ML | scikit-learn (Isolation Forest), NumPy |
| Frontend | React 18, Vite, Recharts |
| Deployment | Docker, Docker Compose, Render |

---

## 📊 Dashboard Features

- **Live Network Map** — animated SVG topology with real-time packet particles
- **Traffic Charts** — PPS and latency graphs (last 60 packets)
- **AI Alerts** — anomaly detection with source IP, protocol, severity
- **Health Score** — 0-100 weighted score with A-F grade
- **Prediction Engine** — trend-based failure forecasting
- **Packet Feed** — live scrolling packet log with protocol badges

---

Built this to explore how ML can be applied to network monitoring - ended up being way more fun than expected. PRs welcome.
