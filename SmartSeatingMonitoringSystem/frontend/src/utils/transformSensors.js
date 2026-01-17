export function toChartData(sensors) {
  if (!sensors) return [];

  return [
    // 🔄 등받이 (좌우 반전)
    {
      key: "back_top_right",
      label: "등받이 우측 상단",
      value: sensors.back_top_right ?? 0,
    },
    {
      key: "back_top_left",
      label: "등받이 좌측 상단",
      value: sensors.back_top_left ?? 0,
    },
    {
      key: "back_bottom_right",
      label: "등받이 우측 하단",
      value: sensors.back_bottom_right ?? 0,
    },
    {
      key: "back_bottom_left",
      label: "등받이 좌측 하단",
      value: sensors.back_bottom_left ?? 0,
    },
    {
      key: "seat_bottom_right",
      label: "좌판 우측 하단",
      value: sensors.seat_bottom_right ?? 0,
    },
    {
      key: "seat_bottom_left",
      label: "좌판 좌측 하단",
      value: sensors.seat_bottom_left ?? 0,
    },
    {
      key: "seat_top_right",
      label: "좌판 우측 상단",
      value: sensors.seat_top_right ?? 0,
    },
    {
      key: "seat_top_left",
      label: "좌판 좌측 상단",
      value: sensors.seat_top_left ?? 0,
    },
  ];
}

