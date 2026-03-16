import numpy as np
from collections import deque
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import time

ALERT_MESSAGES = {
    "port_scan":      ("🔴", "Suspicious SSH port scanning detected",       "critical"),
    "traffic_spike":  ("🟠", "Traffic spike — possible network congestion",  "warning"),
    "high_latency":   ("🟡", "High latency detected — server may be overloaded", "warning"),
    "ddos_attempt":   ("🔴", "Potential DDoS attempt — abnormal flood rate", "critical"),
}

HEALTH_THRESHOLDS = {
    "latency_ok":      50,
    "latency_warn":    200,
    "pps_ok":          500,
    "pps_warn":        1000,
    "anomaly_rate_ok": 5,
    "anomaly_rate_warn": 15,
}


class AIEngine:
    def __init__(self, window_size: int = 200):
        self.window_size = window_size
        self.feature_buffer: deque = deque(maxlen=window_size)
        self.packet_buffer: deque = deque(maxlen=window_size)
        self.alerts: list = []
        self.max_alerts = 50

        # tried a few algos, isolation forest worked best for this
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.08,
            random_state=42,
        )
        self.scaler = StandardScaler()
        self._model_trained = False
        self._train_threshold = 50   # train once we have enough samples
        self._retrain_every  = 30    # retrain every N packets after first train

        # Recent stats
        self.recent_latencies: deque  = deque(maxlen=60)
        self.recent_pps: deque        = deque(maxlen=60)
        self.recent_anomalies: deque  = deque(maxlen=60)  # 0/1 per packet

        # Packet counter
        self._pkt_count = 0

    # ------------------------------------------------------------------
    def _extract_features(self, packet: dict) -> list[float]:
        """Return numeric feature vector for one packet."""
        protocol_map = {"HTTP": 0, "HTTPS": 1, "DNS": 2, "SSH": 3, "FTP": 4, "ICMP": 5}
        return [
            float(packet["packet_size"]),
            float(packet["latency"]),
            float(packet["packets_per_second"]),
            float(protocol_map.get(packet["protocol"], 0)),
        ]

    # ------------------------------------------------------------------
    def process(self, packet: dict) -> dict:
        """Analyse one packet; returns enriched packet dict with AI fields."""
        self._pkt_count += 1
        features = self._extract_features(packet)
        self.feature_buffer.append(features)
        self.packet_buffer.append(packet)

        self.recent_latencies.append(packet["latency"])
        self.recent_pps.append(packet["packets_per_second"])

        # --- Train / retrain model ---
        if (not self._model_trained and len(self.feature_buffer) >= self._train_threshold):
            self._train_model()
        elif (self._model_trained and self._pkt_count % self._retrain_every == 0):
            self._train_model()

        # --- Score packet ---
        ai_score = 0.0
        ai_anomaly = False
        if self._model_trained:
            X = self.scaler.transform([features])
            raw_score = self.model.decision_function(X)[0]   # negative = more anomalous
            # Normalize to 0-1 range (higher = more anomalous)
            ai_score = round(float(np.clip(1 - (raw_score + 0.5), 0, 1)), 4)
            ai_anomaly = bool(self.model.predict(X)[0] == -1)

        # combine both signals - better accuracy this way
        is_anomaly = ai_anomaly or (packet["status"] == "anomaly")
        self.recent_anomalies.append(1 if is_anomaly else 0)

        enriched = {**packet, "ai_score": ai_score, "ai_anomaly": ai_anomaly}

        # --- Generate alert if anomaly found ---
        if is_anomaly and packet.get("anomaly_type"):
            self._generate_alert(packet)

        return enriched

    # ------------------------------------------------------------------
    def _train_model(self):
        X = np.array(list(self.feature_buffer))
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        self.model.fit(X_scaled)
        self._model_trained = True

    # ------------------------------------------------------------------
    def _generate_alert(self, packet: dict):
        atype = packet.get("anomaly_type", "unknown")
        if atype not in ALERT_MESSAGES:
            return

        icon, msg, severity = ALERT_MESSAGES[atype]

        # De-duplicate — don't add same type within 10 alerts
        recent_types = [a["anomaly_type"] for a in self.alerts[-10:]]
        if atype in recent_types:
            return

        alert = {
            "id": len(self.alerts),
            "timestamp": packet["timestamp"],
            "icon": icon,
            "message": msg,
            "severity": severity,
            "anomaly_type": atype,
            "source_ip": packet["source_ip"],
            "protocol": packet["protocol"],
            "latency": packet["latency"],
            "pps": packet["packets_per_second"],
        }
        self.alerts.append(alert)
        if len(self.alerts) > self.max_alerts:
            self.alerts = self.alerts[-self.max_alerts:]

    # ------------------------------------------------------------------
    def health_score(self) -> dict:
        """Return 0-100 health score + component breakdown."""
        if not self.recent_latencies:
            return {"score": 100, "grade": "A", "components": {}}

        avg_lat    = float(np.mean(self.recent_latencies))
        avg_pps    = float(np.mean(self.recent_pps))
        anomaly_rt = float(np.mean(self.recent_anomalies)) * 100  # as %

        # Latency component (0-40 pts)
        if avg_lat < HEALTH_THRESHOLDS["latency_ok"]:
            lat_score = 40
        elif avg_lat < HEALTH_THRESHOLDS["latency_warn"]:
            lat_score = int(40 * (1 - (avg_lat - 50) / 150))
        else:
            lat_score = 0

        # Throughput component (0-30 pts)
        if avg_pps < HEALTH_THRESHOLDS["pps_ok"]:
            pps_score = 30
        elif avg_pps < HEALTH_THRESHOLDS["pps_warn"]:
            pps_score = int(30 * (1 - (avg_pps - 500) / 500))
        else:
            pps_score = 0

        # Anomaly rate component (0-30 pts)
        if anomaly_rt < HEALTH_THRESHOLDS["anomaly_rate_ok"]:
            ano_score = 30
        elif anomaly_rt < HEALTH_THRESHOLDS["anomaly_rate_warn"]:
            ano_score = int(30 * (1 - (anomaly_rt - 5) / 10))
        else:
            ano_score = 0

        total = lat_score + pps_score + ano_score
        grade = "A" if total >= 85 else "B" if total >= 70 else "C" if total >= 50 else "D" if total >= 30 else "F"

        return {
            "score": total,
            "grade": grade,
            "components": {
                "latency":  {"score": lat_score,  "max": 40, "value": round(avg_lat, 1)},
                "throughput": {"score": pps_score,"max": 30, "value": round(avg_pps, 1)},
                "anomaly_rate": {"score": ano_score, "max": 30, "value": round(anomaly_rt, 1)},
            },
        }

    # ------------------------------------------------------------------
    def predictions(self) -> list[dict]:
        """Simple rule-based short-term predictions."""
        preds = []
        if len(self.recent_latencies) < 10:
            return preds

        lat_trend = np.polyfit(range(len(self.recent_latencies)),
                               list(self.recent_latencies), 1)[0]
        pps_trend = np.polyfit(range(len(self.recent_pps)),
                               list(self.recent_pps), 1)[0]

        if lat_trend > 5:
            preds.append({
                "type": "warning",
                "message": "⚡ Latency rising — congestion likely in ~2 min",
                "confidence": min(95, int(40 + abs(lat_trend) * 3)),
            })
        if pps_trend > 10:
            preds.append({
                "type": "warning",
                "message": "📈 Traffic spike predicted in the next 3 minutes",
                "confidence": min(92, int(35 + abs(pps_trend) * 2)),
            })
        if float(np.mean(self.recent_anomalies)) > 0.15:
            preds.append({
                "type": "critical",
                "message": "🚨 Sustained anomaly pattern — investigate immediately",
                "confidence": 87,
            })
        if not preds:
            preds.append({
                "type": "ok",
                "message": "✅ Network operating within normal parameters",
                "confidence": 95,
            })

        return preds

    # ------------------------------------------------------------------
    def get_recent_alerts(self, n: int = 20) -> list:
        return list(reversed(self.alerts[-n:]))
