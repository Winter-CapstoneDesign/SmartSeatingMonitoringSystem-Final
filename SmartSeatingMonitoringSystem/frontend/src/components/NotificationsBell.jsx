import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../app/notifications";

function typeBadge(type) {
  if (type === "danger") return "bg-red-600";
  if (type === "warn") return "bg-orange-600";
  return "bg-slate-600";
}

export default function NotificationsBell() {
  const { items, unreadCount, markAllRead, clearAll, markRead, enabled, toggleEnabled } =
    useNotifications();

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 text-white hover:bg-white/15 transition"
        aria-label="알림"
        title={enabled ? "알림 ON" : "알림 OFF"}
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && enabled && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-extrabold text-white shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[380px] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 pointer-events-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="font-extrabold text-slate-900">알림</div>

            <div className="flex gap-2">
              <button
                onClick={toggleEnabled}
                className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                  enabled
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                🔔 알림 {enabled ? "ON" : "OFF"}
              </button>

              <button
                onClick={markAllRead}
                className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                모두 읽음
              </button>
              <button
                onClick={clearAll}
                className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                비우기
              </button>
            </div>
          </div>

          {/* 리스트 */}
          <div className="max-h-[360px] overflow-auto px-2 pb-2">
            {items.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-slate-500">
                알림이 없습니다.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left rounded-2xl px-3 py-3 mb-2 transition ring-1 ${
                    n.read ? "bg-white ring-slate-100" : "bg-slate-50 ring-slate-200"
                  } hover:bg-slate-100`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${typeBadge(n.type)}`} />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-bold text-slate-900">{n.title}</div>
                        <div className="shrink-0 text-xs text-slate-500">{n.time}</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-700">{n.message}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
