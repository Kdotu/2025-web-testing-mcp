# MCP 웹사이트 테스터

> MCP (Model Context Protocol) 기반의 웹사이트 성능 테스트 및 분석 플랫폼

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39-green.svg)](https://supabase.com/)
[![k6](https://img.shields.io/badge/k6-1.1.0-orange.svg)](https://k6.io/)


## 🌟 주요 기능

- **🧪 Playwright E2E 테스트(자연어 → 코드 변환)**: MCP 기반으로 자연어 시나리오를 Playwright 코드로 자동 변환 및 실행
- **⚡ (진행중) 부하 테스트**: k6 기반 고성능 부하 테스트
- **💾 (진행중) 결과 저장**: Supabase 데이터베이스에 테스트 결과 저장
- **📈 (진행중) 대시보드**: 테스트 통계 및 결과 시각화
- **💡 (구현 예정) Lighthouse 분석**: 종합적인 웹사이트 품질 평가 
- **UI/UX 개선**: 뉴모피즘 스타일, 단계형 검증 워크플로우, 모달/테이블/폰트 최적화


## 🎨 디자인 시스템

- **색상 팔레트**: 인디고/퍼플 색상 스킴 (#6366F1, #A5B4FC, #8B5CF6, #F5F3FF)
- **UI 스타일**: 뉴모피즘(Neumorphism) 디자인
- **폰트**: Pretendard Variable
- **반응형**: 모바일 퍼스트 접근 방식

## 🛠 기술 스택

### Frontend
- **React 18.2** - 사용자 인터페이스
- **TypeScript 5.2** - 타입 안전성
- **Vite 5.1** - 빌드 도구
- **Tailwind CSS 4.0** - 스타일링
- **Radix UI** - 접근성 우선 컴포넌트
- **Lucide React** - 아이콘
- **Recharts** - 데이터 시각화

### Playwright (E2E)
- **Playwright MCP Server (Node.js)** - 자연어를 Playwright 코드로 변환
- **검증 워크플로우** - 단계별(UI)로 입력→변환→검증→실행 준비→실행

### Backend & Infrastructure
- **k6** - 부하 테스트 엔진
- **k6 MCP Server** - [QAInsights/k6-mcp-server](https://github.com/QAInsights/k6-mcp-server)
- **Playwright MCP Server** - 자연어 → Playwright 코드 변환용 Node 서버
- **Supabase** - 백엔드 서비스 (데이터베이스, 인증)
- **Google Lighthouse** - 웹사이트 품질 분석

### Development Tools
- **ESLint** - 코드 품질
- **Prettier** - 코드 포맷팅
- **Conventional Commits** - 커밋 컨벤션

## 🚀 빠른 시작

### 시스템 요구사항
- Node.js 18.0.0 이상
- npm 8.0.0 이상
- Python 3.12 이상 (k6 MCP 서버용)
- k6 1.1.0 이상
- Git

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone https://github.com/your-org/mcp-website-tester.git
   cd mcp-website-tester
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   ```bash
   cp .env.example .env.local
   # .env.local 파일을 편집하여 필요한 환경 변수 설정
   ```

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

5. **브라우저에서 확인**
   ```
   http://localhost:3100
   ```

### Playwright MCP 서버 실행 (선택)
- 저장소에 포함된 Playwright MCP 서버를 사용하거나, 외부 MCP 서버를 연결할 수 있습니다.
- 백엔드 API가 MCP 서버를 자동으로 구동/호출하므로 기본 설정으로도 동작합니다.

## ⚙️ 개발 모드

### React SPA 구조
이 프로젝트는 React Single Page Application으로 구성되어 있습니다:
- **엔트리포인트**: `/main.tsx`
- **메인 컴포넌트**: `/App.tsx`
- **라우팅**: React 내부 상태 기반 페이지 전환
- **빌드**: Vite + TypeScript

### 개발 명령어
```bash
# 개발 서버 실행 (Hot reload)
npm run dev

# 타입 체크
npm run type-check

# 린트 체크
npm run lint

# 린트 자동 수정
npm run lint:fix

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 번들 크기 분석
npm run analyze
```

## 📁 프로젝트 구조

```
2025-web-testing-mcp/
├── 📄 README.md                    # 프로젝트 메인 문서
├── 📄 development-tasks.md         # 개발 진행상황 추적
├── 📄 shrimp-rules.md             # 개발 가이드라인
│
├── 🖥️ frontend/                   # React 프론트엔드
│   ├── 📄 package.json            # 프론트엔드 의존성
│   ├── 📄 App.tsx                 # 메인 앱 컴포넌트
│   ├── 📄 main.tsx                # React 앱 엔트리포인트
│   │
│   ├── 🧩 components/             # React 컴포넌트
│   │   ├── 📄 Dashboard.tsx       # 대시보드 페이지
│   │   ├── 📄 TestExecution.tsx   # 테스트 실행 페이지
│   │   ├── 📄 TestResults.tsx     # 테스트 결과 페이지
│   │   ├── 📄 Settings.tsx        # 설정 페이지
│   │   └── 🎨 ui/                 # 재사용 가능한 UI 컴포넌트 (40+)
│   │
│   ├── 🔧 utils/                  # 유틸리티 함수
│   │   ├── 📄 api.tsx             # Supabase API 통신
│   │   └── 📄 backend-api.ts      # 백엔드 API 클라이언트
│   │
│   ├── 🎨 styles/                 # 스타일 파일
│   └── 📁 public/                 # 정적 파일
│
├── ⚙️ backend/                    # Node.js 백엔드
│   ├── 📄 package.json            # 백엔드 의존성
│   │
│   ├── 📁 src/                    # 소스 코드
│   │   ├── 📄 index.ts            # Express 서버 엔트리포인트
│   │   ├── 🛠️ services/           # 비즈니스 로직 서비스
│   │   ├── 🎮 controllers/        # API 컨트롤러
│   │   ├── 🛣️ routes/             # API 라우트
│   │   ├── 🔧 middleware/         # 미들웨어
│   │   └── 📋 types/              # TypeScript 타입 정의
│   │
│   └── 📁 temp/                   # 임시 파일 (k6 스크립트)
│
├── 🧪 k6-mcp-server/              # k6 MCP 서버 (Python)
│   ├── 📄 k6_server.py            # MCP 서버 메인 파일
│   ├── 📄 requirements.txt        # Python 의존성
│   └── 📄 hello.js                # k6 테스트 예제
│
└── 📁 .vite/                      # Vite 캐시 디렉토리
```

## 🔧 주요 컴포넌트

### Frontend
- **Dashboard** - 테스트 통계 및 개요
- **TestExecution** - 부하 테스트 및 E2E 실행/설정
- **TestResults** - 테스트 결과 표시 및 분석
- **Settings** - 시스템 설정 및 MCP 도구 관리

### Backend
- **K6Service** - k6 MCP 서버와 통신
- **TestResultService** - Supabase 데이터베이스 관리
- **WebSocket** - 실시간 테스트 상태 업데이트

## 🎯 테스트 타입

### 1. 성능 테스트
- **목적**: 웹페이지 로딩 성능 측정
- **지표**: TTFB, FCP, LCP, CLS
- **도구**: Chrome DevTools Protocol

### 2. Lighthouse 분석
- **목적**: 종합적인 웹사이트 품질 평가
- **지표**: Performance, Accessibility, Best Practices, SEO
- **도구**: Google Lighthouse

### 3. 부하 테스트
- **목적**: 높은 트래픽 상황에서의 안정성 확인
- **지표**: TPS, 응답시간, 에러율
- **도구**: k6 (ramping-arrival-rate executor)

### 4. E2E (Playwright)
- **목적**: 사용자 시나리오 기반 E2E 동작 검증
- **입력**: 자연어 시나리오 (예: "1) https://example.com 에 접속한다 …")
- **동작**: MCP 변환 → 코드 검증 → 실행 준비 → 실행
- **도구**: Playwright

## 🧭 Playwright 시나리오 실행 흐름

- **검증 단계(UI) 순서**: `MCP 점검 → 입력 → 자연어 변환 → 코드 검증 → 실행 준비`
- **자연어 변환**: 클릭 시 MCP 서버 호출 → 코드 수신 후 자동으로 코드 검증 실행
- **코드 검증(정적 검사)**:
  - `chromium.launch(`, `browser.newPage(` 또는 `page = await browser.newPage(`, `console.log(` 존재 확인(정규식 기반, 공백 허용)
  - 괄호/따옴표 균형, 최소 길이(50자) 검사
  - 실패 시 다음 단계 자동 차단 및 오류 메시지 표시
- **입력 제어**: 변환 중에는 자연어 입력창 `disabled`; 완료/실패 시 자동 복원
- **재시작**: "1단계부터 다시 시작" 버튼으로 전체 단계 초기화 + MCP 점검 즉시 재실행
- **코드 정리 정책**: 현재는 원본 유지(불필요 변환으로 오류 유입 방지)

## 📊 부하 테스트 설정

### 프리셋 옵션
- **Low**: 기본적인 부하 테스트 (10 VU, 30초)
- **Medium**: 중간 수준의 트래픽 시뮬레이션 (50 VU, 60초)
- **High**: 높은 부하 상황 테스트 (100 VU, 120초)
- **Custom**: 사용자 정의 설정

### 주요 설정값
- **Virtual Users (VU)**: 1-2000
- **Duration**: 10초-30분
- **Stages**: 단계별 부하 증가 설정
- **Target URL**: 테스트 대상 웹사이트


## 🔄 버전 히스토리

### v1.2.0 (2025-08-29)
- Playwright MCP 자연어 변환 및 단계형 검증 워크플로우 추가
- 자연어 변환 중 입력창 비활성화 및 재시작 시 MCP 점검 자동 재확인
- 코드 검증 기준 정규식 기반으로 완화(구조적 정상성 우선)

### v1.1.0 (2025-07-29)
- k6 MCP 서버 통합
- 실시간 WebSocket 연결
- Supabase 데이터베이스 연동
- 프론트엔드-백엔드 분리 아키텍처


### v1.0.0 (2025-07-28)
- 초기 릴리스
- 기본 테스트 기능 구현
- 라벤더/네이비 디자인 시스템 적용
- Supabase 통합
- k6 부하 테스트 지원
