# MCP 웹사이트 테스터

> MCP (Model Context Protocol) 기반의 웹사이트 성능 테스트 및 분석 플랫폼

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39-green.svg)](https://supabase.com/)

## 🌟 주요 기능

- **🚀 (구현 예정) 성능 테스트**: 웹페이지 로딩 속도 및 성능 지표 측정
- **💡 (구현 예정) Lighthouse 분석**: 종합적인 웹사이트 품질 평가 
- **⚡ (진행중) 부하 테스트**: k6 기반 고성능 부하 테스트

## 🎨 디자인 시스템

- **색상 팔레트**: 라벤더/네이비 색상 스킴 (#FFF2F2, #A9B5DF, #7886C7, #2D336B)
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

### Backend & Infrastructure
- **Supabase** - 백엔드 서비스 (데이터베이스, 인증, Edge Functions)
- **k6** - 부하 테스트 엔진
- **Google Lighthouse** - 웹사이트 품질 분석

### Development Tools
- **ESLint** - 코드 품질
- **Prettier** - 코드 포맷팅
- **Conventional Commits** - 커밋 컨벤션

## 🚀 빠른 시작

### 시스템 요구사항
- Node.js 18.0.0 이상
- npm 8.0.0 이상
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
   http://localhost:3000
   ```

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
mcp-website-tester/
├── components/          # React 컴포넌트
│   ├── ui/             # 재사용 가능한 UI 컴포넌트
│   ├── Dashboard.tsx   # 대시보드 페이지
│   ├── TestExecution.tsx # 테스트 실행 페이지
│   ├── TestResults.tsx # 테스트 결과 페이지
│   └── Settings.tsx    # 설정 페이지
├── utils/              # 유틸리티 함수
│   ├── api.tsx        # API 통신
│   └── supabase/      # Supabase 설정
├── styles/             # 스타일 파일
│   └── globals.css    # 글로벌 CSS
├── supabase/           # Supabase 설정
│   └── functions/     # Edge Functions
├── static/             # 정적 파일
│   ├── common.css     # 공통 CSS
│   └── common.js      # 공통 JavaScript
├── *.html             # 페이지별 HTML 파일
└── package.json       # 프로젝트 설정
```

## 🔧 주요 컴포넌트

### Dashboard
- 테스트 통계 요약
- 최근 테스트 활동
- 빠른 테스트 실행

### TestExecution
- URL 입력 및 검증
- 테스트 타입 선택
- 실시간 진행 상황
- 세부 설정 옵션

### TestResults
- 테스트 결과 목록
- 상세 분석 결과
- 차트 및 그래프
- 리포트 다운로드

### Settings
- 테스트 타입 관리
- MCP 도구 설정
- 시스템 설정

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

## 📊 부하 테스트 설정

### 프리셋 옵션
- **Low**: 기본적인 부하 테스트
- **Medium**: 중간 수준의 트래픽 시뮬레이션
- **High**: 높은 부하 상황 테스트
- **Custom**: 사용자 정의 설정

### 주요 설정값
- **시작 요청 속도**: iterations per timeUnit
- **시간 단위**: 1s, 5s, 10s, 20s, 30s, 1m
- **사전 할당 VU**: 1-100
- **최대 VU**: 1-2000
- **단계별 설정**: 지속시간과 목표값 설정


## 🔄 버전 히스토리

### v1.0.0 (2025-01-28)
- 초기 릴리스
- 기본 테스트 기능 구현
- 라벤더/네이비 디자인 시스템 적용
- Supabase 통합
- k6 부하 테스트 지원
