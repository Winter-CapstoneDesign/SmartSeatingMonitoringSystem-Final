import { useEffect, useMemo, useState } from "react";
import { toChartData } from "../utils/transformSensors";
import SensorBarChart from "../components/SensorBarChart";
import AveragePressureChart from "../components/AveragePressureChart";

export default function RecordsPage() {
  /* ===============================
     상태
  =============================== */
  const [sensors, setSensors] = useState(null);      // 최신 센서 값
  const [avgHistory, setAvgHistory] = useState([]); // 10초 평균 히스토리 (raw)

  /* ===============================
     1️⃣ 센서 데이터 polling (2초)
  =============================== */
  useEffect(() => {
    let mounted = true;

    const fetchLatestSensors = async () => {
      try {
        const res = await fetch("/api/sensors/latest");
        const data = await res.json();

        if (mounted) {
          setSensors(data);
        }
      } catch (e) {
        console.error("❌ 센서 데이터 로드 실패", e);
      }
    };

    fetchLatestSensors();
    const id = setInterval(fetchLatestSensors, 2000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  /* ===============================
     2️⃣ 평균 히스토리 polling (10초)
  =============================== */
  useEffect(() => {
    let mounted = true;

    const fetchAvgHistory = async () => {
      try {
        const res = await fetch("/api/agg/10s");
        const data = await res.json();

        if (mounted) {
          setAvgHistory(data);
        }
      } catch (e) {
        console.error("❌ 10초 집계 데이터 로드 실패", e);
      }
    };

    fetchAvgHistory();
    const id = setInterval(fetchAvgHistory, 10000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  /* ===============================
     📊 센서 차트 데이터
  =============================== */
  const chartData = useMemo(() => {
    if (!sensors) {
      return [
        { key: "back_top_right", label: "등받이 우측 상단", value: 0 },
        { key: "back_top_left", label: "등받이 좌측 상단", value: 0 },
        { key: "back_bottom_right", label: "등받이 우측 하단", value: 0 },
        { key: "back_bottom_left", label: "등받이 좌측 하단", value: 0 },
        { key: "seat_bottom_right", label: "좌판 우측 하단", value: 0 },
        { key: "seat_bottom_left", label: "좌판 좌측 하단", value: 0 },
        { key: "seat_top_right", label: "좌판 우측 상단", value: 0 },
        { key: "seat_top_left", label: "좌판 좌측 상단", value: 0 },
      ];
    }

    return toChartData(sensors);
  }, [sensors]);

  /* ===============================
     ⏱ 평균 압력 차트용 데이터
     - ISO → HH:mm 변환
     - RecordsPage 안에서만 처리 (유틸 ❌)
  =============================== */
  const avgChartData = useMemo(() => {
    return avgHistory.map((item) => ({
      ...item,
      time: new Date(item.time).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    }));
  }, [avgHistory]);

  /* ===============================
     렌더링
  =============================== */
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold">착석 기록</h2>
          <p className="mt-1 text-sm text-slate-600">
            압력 센서 기반 착석 분포 및 평균 변화를 확인합니다.
          </p>
        </div>

        <div className="rounded-full px-3 py-1 text-xs font-bold bg-slate-100 text-slate-600">
          API Polling
        </div>
      </div>

      {/* 센서 상태 안내 */}
      {!sensors && (
        <div className="mt-6 text-center text-sm text-slate-500">
          센서 데이터 로딩 중…
        </div>
      )}

      {/* 🔢 센서 카드 */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {chartData.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl bg-slate-50 p-4 shadow-sm ring-1 ring-slate-200"
          >
            <div className="text-xs font-semibold text-slate-500">
              {item.label}
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* 📊 센서 분포 그래프 */}
      <div className="mt-10 rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div className="font-extrabold">압력 분포 그래프</div>
        </div>

        <div className="h-[320px]">
          <SensorBarChart data={chartData} />
        </div>
      </div>

      {/* ⏱ 평균 압력 히스토리 */}
      <div className="mt-10 rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">⏱</span>
          <div className="font-extrabold">
            시간별 평균 압력 (10초 단위)
          </div>
        </div>

        <div className="h-[280px]">
          {avgChartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              데이터가 없습니다.
            </div>
          ) : (
            <AveragePressureChart data={avgChartData} />
          )}
        </div>
      </div>
    </div>
  );
}

