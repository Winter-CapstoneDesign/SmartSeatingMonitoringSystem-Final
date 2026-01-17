const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

// =====================
// 파일 경로
// =====================
const DATA_PATH = path.join(__dirname, "data/sensor_data.json");
const AGG_PATH = path.join(__dirname, "data/sensor_agg_10min.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend/dist"), { index: false }));

// =====================
// 공통 유틸
// =====================
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

function appendJsonFile(filePath, newData) {
  const data = readJsonFile(filePath);
  data.push(newData);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

// =========================================================
// 🔹 전역 상태
// =========================================================
let lastUltrasonicSeated = false;
let lastUltrasonicAt = null;

// ✅ 마지막으로 보낸 alert 중복 방지용
let lastAlertKey = null;

// =========================================================
// 🔹 10초 집계
// =========================================================
let aggBuffer = [];
let lastAggTime = Date.now();
const AGG_INTERVAL = 10 * 1000;

// =========================================================
// 🔹 센서 유틸
// =========================================================
const MIN_ACTIVE = 5;

function safeInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1023, Math.trunc(n)));
}
function isActive(v) {
  return safeInt(v) >= MIN_ACTIVE;
}
function isZero(v) {
  return safeInt(v) === 0;
}
function normalizeSensors(raw) {
  return {
    back_top_right: safeInt(raw.back_top_right),
    back_top_left: safeInt(raw.back_top_left),
    back_bottom_right: safeInt(raw.back_bottom_right),
    back_bottom_left: safeInt(raw.back_bottom_left),
    seat_bottom_right: safeInt(raw.seat_bottom_right),
    seat_bottom_left: safeInt(raw.seat_bottom_left),
    seat_top_right: safeInt(raw.seat_top_right),
    seat_top_left: safeInt(raw.seat_top_left),
  };
}

// =========================================================
// 🔹 자세 판별 (switch(true))  (그대로 유지)
// =========================================================
function calculatePosture(rawSensors, ultrasonicSeated) {
  const detectedAt = new Date().toISOString();

  if (!ultrasonicSeated) {
    return {
      isSeated: false,
      detectedAt,
      level: "normal",
      posture: "미착석",
      sensors: null,
    };
  }

  const s = normalizeSensors(rawSensors);

  switch (true) {
    /* ===============================
       1️⃣ 앞쪽으로 걸터앉음
    =============================== */
    case (
      isActive(s.seat_top_left) &&
      isActive(s.seat_top_right) &&
      isZero(s.seat_bottom_left) &&
      isZero(s.seat_bottom_right)
    ):
      return {
        isSeated: true,
        detectedAt,
        level: "warn",
        posture: "앞쪽으로 걸터앉은 자세",
        sensors: s,
      };

    /* ===============================
       2️⃣ 오른쪽 다리 꼼 (좌판 ONLY)
    =============================== */
    case (
      isZero(s.seat_top_right) &&
      (isActive(s.seat_top_left) ||
        isActive(s.seat_bottom_left) ||
        isActive(s.seat_bottom_right))
    ):
      return {
        isSeated: true,
        detectedAt,
        level: "warn",
        posture: "오른쪽 다리를 꼼",
        sensors: s,
      };

    /* ===============================
       3️⃣ 왼쪽 다리 꼼 (좌판 ONLY)
    =============================== */
    case (
      isZero(s.seat_top_left) &&
      (isActive(s.seat_top_right) ||
        isActive(s.seat_bottom_left) ||
        isActive(s.seat_bottom_right))
    ):
      return {
        isSeated: true,
        detectedAt,
        level: "warn",
        posture: "왼쪽 다리를 꼼",
        sensors: s,
      };

    /* ===============================
       4️⃣ 상체 우측 기울어짐
    =============================== */
    case isZero(s.back_top_left) && isZero(s.back_bottom_left):
      return {
        isSeated: true,
        detectedAt,
        level: "warn",
        posture: "상체가 우측으로 기울어짐",
        sensors: s,
      };

    /* ===============================
       5️⃣ 상체 좌측 기울어짐
    =============================== */
    case isZero(s.back_top_right) && isZero(s.back_bottom_right):
      return {
        isSeated: true,
        detectedAt,
        level: "warn",
        posture: "상체가 좌측으로 기울어짐",
        sensors: s,
      };

    /* ===============================
       6️⃣ 바른 자세
    =============================== */
    case Object.values(s).every((v) => isActive(v)):
      return {
        isSeated: true,
        detectedAt,
        level: "normal",
        posture: "바른 자세",
        sensors: s,
      };

    /* ===============================
       7️⃣ 기타
    =============================== */
    default:
      return {
        isSeated: true,
        detectedAt,
        level: "warn", // ✅ 기타도 올바르지 않은 자세 취급
        posture: "착석 (기타 자세)",
        sensors: s,
      };
  }
}

// =========================================================
// 🔹 seatedMinutes 계산 (유지)
// =========================================================
function computeSeatedMinutesFromSeatLogs(seatLogs) {
  if (seatLogs.length === 0) return 0;

  const last = seatLogs[seatLogs.length - 1];
  if (!last.isSeated) return 0;

  let startTime = null;

  for (let i = seatLogs.length - 1; i >= 0; i--) {
    const cur = seatLogs[i];
    const prev = i > 0 ? seatLogs[i - 1] : null;

    if (cur.isSeated === true && (!prev || prev.isSeated === false)) {
      startTime = new Date(cur.detectedAt || cur.receivedAt).getTime();
      break;
    }
  }

  if (!startTime) return 0;
  return Math.max(0, Math.floor((Date.now() - startTime) / 60000));
}

// =========================================================
// ✅ 최종 레벨/알람 결정
// - warn: 자세만(올바르지 않은 자세일 때만)
// - danger: 착석 2분 이상만
// =========================================================
function decideLevelAndAlert({ isSeated, posture, seatedMinutes }) {
  // 1) danger: 시간 기반 (2분 이상)
  if (isSeated && seatedMinutes >= 2) {
    return {
      level: "danger",
      alert: {
        title: "경고 안내",
        message: "장시간 착석이 감지되었습니다. 휴식을 취하거나 스트레칭을 하세요.",
      },
    };
  }

  // 2) warn: 자세 기반 (올바르지 않은 자세만)
  const badPostures = new Set([
    "앞쪽으로 걸터앉은 자세",
    "오른쪽 다리를 꼼",
    "왼쪽 다리를 꼼",
    "상체가 우측으로 기울어짐",
    "상체가 좌측으로 기울어짐",
    "착석 (기타 자세)",
  ]);

  if (isSeated && badPostures.has(posture)) {
    return {
      level: "warn",
      alert: {
        title: "주의",
        message: `${posture} 자세가 감지되었습니다. 올바른 자세를 유지해주세요.`,
      },
    };
  }

  return { level: "normal", alert: null };
}

// ✅ alert 중복 방지
function buildAlertToSend({ level, alert }) {
  if (!alert) return null;
  const key = `${level}:${alert.title}:${alert.message}`;
  if (key === lastAlertKey) return null;
  lastAlertKey = key;
  return alert;
}

// =========================================================
// 🔹 현재 상태
// =========================================================
function getCurrentSeatState() {
  const data = readJsonFile(DATA_PATH);

  const seatLogs = data.filter((d) => typeof d.isSeated === "boolean");
  const sensorLogs = data.filter((d) => d.sensors);

  // 최신 초음파 상태 갱신(로그 우선)
  if (seatLogs.length > 0) {
    const lastSeat = seatLogs[seatLogs.length - 1];
    lastUltrasonicSeated = lastSeat.isSeated;
    lastUltrasonicAt = lastSeat.detectedAt || lastSeat.receivedAt;
  }

  const seatedMinutes = computeSeatedMinutesFromSeatLogs(seatLogs);

  // 센서 로그 없으면 초음파 상태만
  if (sensorLogs.length === 0) {
    const posture = lastUltrasonicSeated ? "착석 (기타 자세)" : "미착석";
    const decided = decideLevelAndAlert({
      isSeated: lastUltrasonicSeated,
      posture,
      seatedMinutes,
    });

    return {
      isSeated: lastUltrasonicSeated,
      seatedMinutes,
      detectedAt: lastUltrasonicAt,
      level: decided.level,
      posture,
      sensors: null,
      alertTitle: decided.alert ? decided.alert.title : null,
      alertMessage: decided.alert ? decided.alert.message : null,
    };
  }

  const lastSensor = sensorLogs[sensorLogs.length - 1];

  // 자세 판별
  const postureState = calculatePosture(lastSensor.sensors, lastUltrasonicSeated);

  // 최종 레벨/알람 결정
  const decided = decideLevelAndAlert({
    isSeated: postureState.isSeated,
    posture: postureState.posture,
    seatedMinutes,
  });

  return {
    ...postureState,
    seatedMinutes,
    level: decided.level,
    detectedAt: lastSensor.timestamp || lastSensor.receivedAt,
    alertTitle: decided.alert ? decided.alert.title : null,
    alertMessage: decided.alert ? decided.alert.message : null,
  };
}

// =========================================================
// REST / WS / 집계 / SPA
// =========================================================
app.get("/api/state/current", (req, res) => res.json(getCurrentSeatState()));

app.get("/api/sensors/latest", (req, res) => {
  const data = readJsonFile(DATA_PATH);
  const last = [...data].reverse().find((d) => d.sensors);
  res.json(last ? last.sensors : null);
});

app.get("/api/agg/10s", (req, res) => res.json(readJsonFile(AGG_PATH)));

app.post("/api/state/reset", (req, res) => {
  fs.writeFileSync(DATA_PATH, "[]");
  fs.writeFileSync(AGG_PATH, "[]");
  aggBuffer = [];
  lastAggTime = Date.now();
  lastUltrasonicSeated = false;
  lastUltrasonicAt = null;
  lastAlertKey = null;
  res.json({ ok: true });
});

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString());
    const now = new Date().toISOString();

    // 초음파
    if (typeof data.isSeated === "boolean") {
      const detectedAt = data.detectedAt || now;
      const receivedAt = data.receivedAt || now;

      appendJsonFile(DATA_PATH, { ...data, detectedAt, receivedAt });

      lastUltrasonicSeated = data.isSeated;
      lastUltrasonicAt = detectedAt;
    }

    // 센서
    if (data.sensors) {
      const sensors = normalizeSensors(data.sensors);
      const timestamp = data.timestamp || now;
      const receivedAt = data.receivedAt || now;

      appendJsonFile(DATA_PATH, { sensors, timestamp, receivedAt });
      aggBuffer.push({ sensors, receivedAt });
    }

    // 상태 브로드캐스트
    const state = getCurrentSeatState();
    broadcast({ type: "state", payload: state });

    // alert 브로드캐스트
    const decided = decideLevelAndAlert({
      isSeated: state.isSeated,
      posture: state.posture,
      seatedMinutes: state.seatedMinutes,
    });

    const alertToSend = buildAlertToSend(decided);
    if (alertToSend) {
      broadcast({ type: "alert", payload: alertToSend });
    }
  });
});

setInterval(() => {
  if (!aggBuffer.length) return;
  let sum = 0,
    count = 0;
  aggBuffer.forEach((i) =>
    Object.values(i.sensors).forEach((v) => {
      sum += v;
      count++;
    })
  );
  appendJsonFile(AGG_PATH, {
    time: new Date(lastAggTime).toISOString(),
    avg: Number((sum / count).toFixed(2)),
    samples: aggBuffer.length,
  });
  aggBuffer = [];
  lastAggTime = Date.now();
}, AGG_INTERVAL);

// =========================================================
// SPA (⚠️ 무조건 맨 밑)
// =========================================================
app.use((req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
);

server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server started on port ${PORT}`)
);

