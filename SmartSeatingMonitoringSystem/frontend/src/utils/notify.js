// src/utils/notify.js
export async function showSeatAlert({ title, body, level }) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;

  reg.showNotification(title, {
    body,
    icon: "/vite.svg", // TODO: 교체 가능
    tag: `seat-alert-${level}`, // 🔑 warn / danger 묶기
    renotify: true,
    requireInteraction: true,
  });
}

