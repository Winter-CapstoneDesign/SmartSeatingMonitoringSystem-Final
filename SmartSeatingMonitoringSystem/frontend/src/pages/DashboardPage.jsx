import { useEffect, useMemo, useState } from "react";
import { useNotifications } from "../app/notifications";
import { showSeatAlert } from "../utils/notify";

/* ===============================
   단계별 UI
=============================== */
function levelUI(level) {
  if (level === "danger") {
    return {
      bg: "from-rose-100 via-red-50 to-white",
      badge: "bg-red-600",
      ring: "ring-red-200/60",
      title: "경고",
      desc: "장시간 착석 상태가 감지되었습니다. 휴식을 권장합니다.",
    };
  }
  if (level === "warn") {
    return {
      bg: "from-amber-100 via-orange-50 to-white",
      badge: "bg-orange-600",
      ring: "ring-orange-200/60",
      title: "주의",
      desc: "자세가 잘못되었습니다. 올바른 자세를 유지하세요.",
    };
  }
  return {
    bg: "from-emerald-100 via-green-50 to-white",
    badge: "bg-emerald-600",
    ring: "ring-emerald-200/60",
    title: "정상",
    desc: "현재 상태가 정상입니다.",
  };
}

function formatKoreanTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function DashboardPage() {
  const { add, enabled } = useNotifications();

  const [state, setState] = useState({
    isSeated: false,
    seatedMinutes: 0,
    detectedAt: null,
    level: "normal",
    posture: null,
    alertTitle: null,
    alertMessage: null,
  });

  /* 🔔 알림 권한 요청 (1회) */
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  /* ===============================
     ✅ API Polling (상태 + 알림)
  =============================== */
  useEffect(() => {
    let mounted = true;

    const fetchState = async () => {
      try {
        const res = await fetch("/api/state/current");
        const data = await res.json();
        if (!mounted) return;

        setState(data);

        // 🔔 알림은 서버 state 기준으로만 발생
        if (data.level !== "normal" && data.alertTitle && data.alertMessage) {
          add({
            key: data.level, // warn / danger 묶기
            type: data.level,
            title: data.alertTitle,
            message: data.alertMessage,
          });

          if (enabled) {
            showSeatAlert({
              title: data.alertTitle,
              body: data.alertMessage,
              level: data.level,
            });
          }
        }
      } catch {}
    };

    fetchState();
    const id = setInterval(fetchState, 2000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [add, enabled]);

  const ui = useMemo(() => levelUI(state.level), [state.level]);

  /* ===============================
     렌더링
  =============================== */
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${ui.bg} p-6 shadow-lg ring-1 ${ui.ring}`}>
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold">대시보드</h2>
          <p className="text-sm text-slate-600">
            실시간 착석 상태와 경고 단계를 표시합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`${ui.badge} rounded-full px-3 py-1 text-sm font-bold text-white`}>
            {ui.title}
          </span>

          <span className="rounded-full bg-white/70 px-3 py-1 text-xs">
            업데이트: {formatKoreanTime(state.detectedAt)}
          </span>

          <button
            onClick={async () => {
              if (!confirm("착석 기록을 초기화할까요?")) return;
              await fetch("/api/state/reset", { method: "POST" });
            }}
            className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 카드 */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">착석 상태</div>
          <div className="mt-2 flex justify-between items-center">
            <div className="text-3xl font-black">
              {state.isSeated ? "착석" : "미착석"}
            </div>
            <div className="text-2xl">{state.isSeated ? "✅" : "⛔️"}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">현재 착석 시간</div>
          <div className="mt-2 text-3xl font-black">
            {state.seatedMinutes} <span className="text-base">min</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">현재 자세 판별</div>
          <div className="mt-2 text-xl font-extrabold text-slate-800 break-keep">
            {state.posture || "분석 중..."}
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 p-5 ring-1">
          <div className="text-xs text-slate-500">경고 안내</div>
          <div className="mt-2 font-bold text-sm text-slate-700 break-keep">
            {state.level === "normal" ? ui.desc : state.alertMessage}
          </div>
        </div>
      </div>
    </div>
  );
}

