import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from simulator import NetworkSimulator
from ai_engine import AIEngine

# global state - keeping it simple for now
simulator = NetworkSimulator()
ai_engine = AIEngine(window_size=200)

# Rolling history for REST endpoints
HISTORY_SIZE = 300
packet_history: list[dict] = []

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()

# runs in background, sends packets to all connected clients
async def packet_loop():
    while True:
        raw = simulator.next_packet()
        enriched = ai_engine.process(raw)

        # Keep rolling history
        packet_history.append(enriched)
        if len(packet_history) > HISTORY_SIZE:
            packet_history.pop(0)

        # Build broadcast payload
        payload = {
            "type": "packet",
            "packet": enriched,
            "health": ai_engine.health_score(),
            "predictions": ai_engine.predictions(),
            "stats": simulator.stats(),
        }
        await manager.broadcast(payload)
        await asyncio.sleep(0.4)   # ~2.5 packets/sec

# startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(packet_loop())
    yield
    task.cancel()

app = FastAPI(title="AI Network Digital Twin", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# websocket handler
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    # Send current snapshot immediately on connect
    await ws.send_json({
        "type": "snapshot",
        "topology": simulator.get_node_topology(),
        "history": packet_history[-50:],
        "alerts": ai_engine.get_recent_alerts(20),
        "health": ai_engine.health_score(),
        "stats": simulator.stats(),
    })
    try:
        while True:
            await ws.receive_text()   # keep alive
    except WebSocketDisconnect:
        manager.disconnect(ws)

# REST API routes
@app.get("/")
def root():
    return {"status": "running", "service": "AI Network Digital Twin"}

@app.get("/api/topology")
def get_topology():
    return simulator.get_node_topology()

@app.get("/api/health")
def get_health():
    return {
        "health": ai_engine.health_score(),
        "predictions": ai_engine.predictions(),
        "stats": simulator.stats(),
    }

@app.get("/api/alerts")
def get_alerts(n: int = 20):
    return {"alerts": ai_engine.get_recent_alerts(n)}

@app.get("/api/history")
def get_history(n: int = 100):
    return {"packets": packet_history[-n:]}

@app.get("/api/stats")
def get_stats():
    return simulator.stats()
