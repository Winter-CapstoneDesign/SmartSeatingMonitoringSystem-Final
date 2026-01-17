// src/api/seat.js
export async function getSeatStatus() {
  return {
    isSeated: true,
    detectedAt: new Date().toISOString(),
  };
}

export async function getPressureData() {
  return {
    sensors: {
      seat_front: 312,
      seat_back: 280,
      seat_left: 295,
      seat_right: 300,
      back_front: 120,
      back_back: 90,
      back_left: 110,
      back_right: 100,
    },
    timestamp: new Date().toISOString(),
  };
}
