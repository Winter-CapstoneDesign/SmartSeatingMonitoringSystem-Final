import { createContext, useContext, useReducer, useCallback, useState } from "react";

const NotificationsContext = createContext(null);

/* ===============================
   상태 / 리듀서
=============================== */
function reducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const { key, level, title, message } = action.payload;

      const others = state.items.filter((n) => n.key !== key);

      return {
        ...state,
        items: [
          ...others,
          {
            id: Date.now(),
            key,
            type: level,      // 🔔 Bell에서 쓰는 type
            title,
            message,
            read: false,
            time: new Date().toLocaleTimeString("ko-KR"),
          },
        ],
      };
    }

    case "MARK_READ":
      return {
        ...state,
        items: state.items.map((n) =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };

    case "READ_ALL":
      return {
        ...state,
        items: state.items.map((n) => ({ ...n, read: true })),
      };

    case "CLEAR":
      return { ...state, items: [] };

    default:
      return state;
  }
}

const initialState = {
  items: [],
};

/* ===============================
   Provider
=============================== */
export function NotificationsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 🔔 알림 ON / OFF 상태
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem("notifications-enabled") !== "false";
  });

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("notifications-enabled", String(next));
      return next;
    });
  }, []);

  const add = useCallback(
    ({ key, type, title, message }) => {
      if (!enabled) return;
      if (!title || !message) return;

      dispatch({
        type: "ADD",
        payload: {
          key,
          level: type, // warn | danger
          title,
          message,
        },
      });
    },
    [enabled]
  );

  const markRead = useCallback((id) => {
    dispatch({ type: "MARK_READ", id });
  }, []);

  const markAllRead = useCallback(() => {
    dispatch({ type: "READ_ALL" });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const value = {
    items: state.items,
    unreadCount: state.items.filter((n) => !n.read).length,

    // 🔔 알림 제어
    enabled,
    toggleEnabled,

    // 🔔 액션
    add,
    markRead,
    markAllRead,
    clearAll,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

/* ===============================
   Hook
=============================== */
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}

