import time
import json
import websocket
import threading
from datetime import datetime, timezone
from gpiozero import MCP3008, DistanceSensor

# ===============================
# 1. 설정 (서버 및 하드웨어)
# ===============================
#SERVER_WS = "ws://10.0.17.76:8080"	# dongwoo
#SERVER_WS = "ws://172.20.10.4:8080"		# sanghwa
SERVER_WS = "ws://13.209.7.148:8080"		# sanghwa

# 초음파 센서 설정 (GPIO 18, 16)
try:
    ultrasonic = DistanceSensor(echo=18, trigger=16, max_distance=2.0)
except Exception as e:
    print(f"초음파 센서 초기화 실패: {e}")
    ultrasonic = None

SENSOR_KEYS = [
    "back_top_right", "back_top_left", "back_bottom_right", "back_bottom_left",
    "seat_bottom_right", "seat_bottom_left", "seat_top_right", "seat_top_left"
]

SEAT_THRESHOLD_CM = 20.0
PRESSURE_THRESHOLD = 20

# MCP3008을 미리 만들어 재사용 (매번 with로 열지 않기)
ADCS = []
for ch in range(8):
    try:
        ADCS.append(MCP3008(channel=ch))
    except Exception as e:
        print(f"MCP3008 채널 {ch} 초기화 실패: {e}")
        ADCS.append(None)

# ===============================
# 2. 데이터 수집 함수들
# ===============================
def read_pressure_sensors():
    values = {}
    for i in range(8):
        adc = ADCS[i]
        try:
            if adc is None:
                raise RuntimeError("ADC not initialized")

            raw_val = int(adc.value * 1023)

            if raw_val < PRESSURE_THRESHOLD:
                val = 0
            else:
                val = raw_val

            values[SENSOR_KEYS[i]] = val

        except Exception as e:
            print(f"x 압력 센서 읽기 실패 ch={i}: {e}")
            values[SENSOR_KEYS[i]] = 0

    return values

def get_ultrasonic_status():
    dist_cm = -1
    is_seated = False
    if ultrasonic:
        try:
            if ultrasonic.value is not None:
                dist_cm = ultrasonic.distance * 100
                is_seated = dist_cm < SEAT_THRESHOLD_CM
        except Exception as e:
            print(f"x 초음파 읽기 실패: {e}")
    return is_seated

# ===============================
# 3. 분리 전송 로직
# ===============================
def run_sensor_loop(ws):
    print("센서 데이터 전송 루프 시작")

    while True:
        try:
            now_utc = datetime.now(timezone.utc)
            timestamp_str = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

            # --- [데이터 1] 초음파 ---
            is_seated = get_ultrasonic_status()
            packet_1 = {
                "isSeated": is_seated,
                "detectedAt": timestamp_str
            }

            # --- [데이터 2] 압력 센서 ---
            pressure_values = read_pressure_sensors()
            packet_2 = {
                "sensors": pressure_values,
                "timestamp": timestamp_str
            }

            # --- 전송  ---
            if ws.sock and ws.sock.connected:
                # send가 멈추는지 확인하기 위한 직전/직후 로그
                print("-> ws.send(초음파) 시작")
                ws.send(json.dumps(packet_1))
                print(f"[초음파] 전송 완료: {packet_1}")

                time.sleep(0.05)

                print("-> ws.send(압력) 시작")
                ws.send(json.dumps(packet_2))
                print(f"[압  력] 전송 완료: {packet_2}")

            else:
                print("연결 끊김...")
                break

            time.sleep(3)

        except Exception as e:
            print(f"x 데이터 전송 중 에러: {e}")
            break

# ===============================
# 4. WebSocket 핸들러
# ===============================
def on_open(ws):
    print("서버 연결 성공! 데이터 전송을 시작합니다.")
    t = threading.Thread(target=run_sensor_loop, args=(ws,))
    t.daemon = True
    t.start()

def on_error(ws, error):
    print(f"x 에러: {error}")

def on_close(ws, close_status_code, close_msg):
    print(f"연결 종료 code={close_status_code}, msg={close_msg}")

if __name__ == "__main__":
    ws = websocket.WebSocketApp(
        SERVER_WS,
        on_open=on_open,
        on_error=on_error,
        on_close=on_close
    )

    while True:
        try:
            # ping/pong으로 죽은 연결 감지
            ws.run_forever(ping_interval=30, ping_timeout=10)
            print("재연결 시도...")
            time.sleep(3)
        except KeyboardInterrupt:
            print("\n종료")
            break
        except Exception as e:
            print(f"x run_forever 예외: {e}")
            time.sleep(3)