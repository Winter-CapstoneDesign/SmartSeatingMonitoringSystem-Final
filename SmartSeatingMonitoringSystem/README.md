# Smart Seating Monitoring System (SSMS)

라즈베리파이와 압력 센서를 활용한 **스마트 착석 모니터링 시스템**입니다.  
사용자의 착석 여부와 자세(바른 자세, 걸터앉음, 기울임, 다리 꼬기 등)를 실시간으로 분석하여 시각화하고, 장시간 착석 시 경고 알림을 제공합니다.

## 📌 주요 기능

*   **실시간 자세 분석**: 압력 센서 데이터를 기반으로 사용자의 자세를 판단합니다.
    *   바른 자세, 상체 기울임(좌/우), 앞쪽으로 걸터앉음, 다리 꼬기(좌/우)
*   **장시간 착석 경고**: 2분 이상 연속 착석 시 휴식 필요 알림을 표시합니다.
    *   *개발/테스트 목적으로 2분으로 설정되어 있습니다.*
*   **실시간 데이터 시각화**: 센서 데이터 분포와 자세 변화를 직관적인 차트로 제공합니다.
*   **Web Dashboard**: React 기반의 반응형 웹 대시보드를 통해 상태를 모니터링합니다.

## 🛠 기술 스택 (Tech Stack)

### Backend
*   **Node.js**: 런타임 환경
*   **Express**: RESTful API 서버
*   **ws (WebSocket)**: 라즈베리파이 센서 데이터 실시간 수신 및 클라이언트 브로드캐스팅
*   **File System**: JSON 파일 기반의 경량 데이터 저장 (`backend/data/`)

### Frontend
*   **React (Vite)**: 사용자 인터페이스
*   **Tailwind CSS**: 스타일링
*   **Framer Motion**: 부드러운 UI 애니메이션
*   **Recharts**: 데이터 차트 시각화
*   **Socket.io-client**: 실시간 데이터 수신 (웹소켓)

---

## 🚀 시작 가이드 (Getting Started)

프로젝트를 로컬 환경에서 실행하기 위한 방법입니다.

### 1. 사전 요구사항 (Prerequisites)
*   [Node.js](https://nodejs.org/) (v16 이상 권장)
*   npm (Node Package Manager)

### 2. 설치 및 실행 (Installation & Run)

프로젝트 루트 디렉토리에서 터미널을 열고 다음 단계를 따르세요.

#### 🔹 Backend 실행
백엔드 서버는 기본적으로 **8080** 포트에서 실행됩니다.

```bash
cd backend

# 의존성 설치
npm install

# 개발 모드 실행 (nodemon 사용)
npm run dev

# 또는 프로덕션 모드 실행
npm start
```

#### 🔹 Frontend 실행
프론트엔드 개발 서버는 **5173** 포트(Vite 기본값)에서 실행됩니다.

```bash
# 새 터미널 창을 열고 실행하세요
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 3. 접속 방법
브라우저 주소창에 다음 주소를 입력하여 대시보드에 접속합니다.

*   **개발 환경**: `http://localhost:5173`
*   **배포 환경 (빌드 후)**: `http://localhost:8080` (백엔드에서 정적 파일 제공 시)

---

## 📂 프로젝트 구조 (Structure)

```
c:\team2\SmartSeatingMonitoringSystem
├── backend/                # 백엔드 서버
│   ├── data/               # 센서 데이터 저장 (JSON)
│   ├── server.js           # 메인 서버 로직 (Express + WebSocket)
│   └── package.json
│
├── frontend/               # 프론트엔드 클라이언트
│   ├── src/                # React 소스 코드
│   ├── dist/               # 빌드 결과물
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## ⚠️ 참고 사항
*   **데이터 초기화**: 대시보드 UI 하단의 '초기화' 버튼을 통해 누적된 센서 데이터를 삭제할 수 있습니다.
*   **센서 데이터**: 실제 라즈베리파이가 연결되어 있지 않은 경우, 테스트를 위해 웹소켓으로 모의 데이터를 전송하거나 `backend/data/sensor_data.json` 형식을 참고하여 데이터를 주입할 수 있습니다.
