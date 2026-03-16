import random
import time
from datetime import datetime

NODES = {
    "client_a": {"ip": "192.168.1.10", "type": "client", "label": "Client A"},
    "client_b": {"ip": "192.168.1.11", "type": "client", "label": "Client B"},
    "client_c": {"ip": "192.168.1.12", "type": "client", "label": "Client C"},
    "router":   {"ip": "10.0.0.1",   "type": "router", "label": "Core Router"},
    "server":   {"ip": "10.0.0.100", "type": "server", "label": "Main Server"},
}

PROTOCOLS = ["HTTP", "HTTPS", "DNS", "SSH", "FTP", "ICMP"]
PROTOCOL_WEIGHTS = [25, 40, 15, 5, 5, 10]

ANOMALY_TYPES = ["port_scan", "traffic_spike", "high_latency", "ddos_attempt"]


class NetworkSimulator:
    def __init__(self):
        self.packet_count = 0
        self.anomaly_count = 0
        self.start_time = time.time()
        self._anomaly_burst = 0  # remaining burst packets
        self._current_anomaly_type = None

    def _normal_packet(self) -> dict:
        clients = ["client_a", "client_b", "client_c"]
        src_key = random.choice(clients)
        protocol = random.choices(PROTOCOLS, weights=PROTOCOL_WEIGHTS)[0]
        packet_size = int(max(64, min(1500, random.gauss(512, 180))))
        latency = round(max(1.0, random.gauss(12, 4)), 2)
        pps = random.randint(10, 120)

        return {
            "id": self.packet_count,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "source": src_key,
            "source_ip": NODES[src_key]["ip"],
            "destination": "server",
            "destination_ip": NODES["server"]["ip"],
            "protocol": protocol,
            "packet_size": packet_size,
            "latency": latency,
            "packets_per_second": pps,
            "status": "normal",
            "anomaly_type": None,
        }

    def _anomaly_packet(self, anomaly_type: str) -> dict:
        packet = self._normal_packet()
        packet["status"] = "anomaly"

        if anomaly_type == "port_scan":
            packet["protocol"] = "SSH"
            packet["packet_size"] = random.randint(40, 90)
            packet["latency"] = round(random.uniform(0.5, 3.0), 2)
            packet["packets_per_second"] = random.randint(400, 900)
            packet["anomaly_type"] = "port_scan"

        elif anomaly_type == "traffic_spike":
            packet["packet_size"] = random.randint(1350, 1500)
            packet["packets_per_second"] = random.randint(700, 2000)
            packet["latency"] = round(random.uniform(80, 300), 2)
            packet["anomaly_type"] = "traffic_spike"

        elif anomaly_type == "high_latency":
            packet["latency"] = round(random.uniform(400, 1800), 2)
            packet["packets_per_second"] = random.randint(5, 30)
            packet["anomaly_type"] = "high_latency"

        elif anomaly_type == "ddos_attempt":
            clients = ["client_a", "client_b", "client_c"]
            packet["source"] = random.choice(clients)
            packet["protocol"] = random.choice(["ICMP", "HTTP"])
            packet["packet_size"] = random.randint(64, 128)
            packet["packets_per_second"] = random.randint(1500, 5000)
            packet["latency"] = round(random.uniform(200, 1000), 2)
            packet["anomaly_type"] = "ddos_attempt"

        return packet

    def next_packet(self) -> dict:
        self.packet_count += 1

        # Start a new anomaly burst (~8% chance if not in burst)
        if self._anomaly_burst <= 0 and random.random() < 0.08:
            self._anomaly_burst = random.randint(3, 8)
            self._current_anomaly_type = random.choice(ANOMALY_TYPES)

        if self._anomaly_burst > 0:
            self._anomaly_burst -= 1
            self.anomaly_count += 1
            return self._anomaly_packet(self._current_anomaly_type)

        return self._normal_packet()

    def get_node_topology(self) -> dict:
        return {
            "nodes": [
                {"id": k, "label": v["label"], "ip": v["ip"], "type": v["type"]}
                for k, v in NODES.items()
            ],
            "edges": [
                {"from": "client_a", "to": "router"},
                {"from": "client_b", "to": "router"},
                {"from": "client_c", "to": "router"},
                {"from": "router",   "to": "server"},
            ],
        }

    def stats(self) -> dict:
        uptime = round(time.time() - self.start_time, 1)
        return {
            "total_packets": self.packet_count,
            "total_anomalies": self.anomaly_count,
            "uptime_seconds": uptime,
            "anomaly_rate": round(self.anomaly_count / max(1, self.packet_count) * 100, 2),
        }
