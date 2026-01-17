import { Link, NavLink } from "react-router-dom";
import NotificationsBell from "./NotificationsBell";

export default function Header() {
  const navClass = ({ isActive }) =>
    [
      "rounded-xl px-3 py-2 text-sm font-semibold transition",
      "border shadow-sm",
      isActive
        ? "bg-white border-white/70 text-slate-900"
        : "bg-white/60 border-white/40 text-slate-700 hover:bg-white hover:text-slate-900",
    ].join(" ");

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-3 text-white">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 shadow-inner ring-1 ring-white/20">
            <span className="text-lg">🪑</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm opacity-80">Smart Seating</div>
            <div className="text-base font-extrabold tracking-tight">
              Monitoring Dashboard
            </div>
          </div>
        </Link>

        {/* 오른쪽 영역 */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-2 rounded-2xl bg-white/10 p-2 ring-1 ring-white/15 backdrop-blur">
            <NavLink to="/" end className={navClass}>
              대시보드
            </NavLink>
            <NavLink to="/records" className={navClass}>
              착석 기록
            </NavLink>
          </nav>

          {/* 알림 버튼은 네비와 분리 */}
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
