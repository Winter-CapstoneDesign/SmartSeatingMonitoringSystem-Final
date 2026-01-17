// src/app/App.jsx
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationsProvider } from "./notifications";

export default function App() {
  const location = useLocation();

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />

        <main className="mx-auto max-w-5xl px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </NotificationsProvider>
  );
}

