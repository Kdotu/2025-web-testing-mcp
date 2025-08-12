# Development Guidelines

## Project Overview

### k6 MCP Load Testing System

- **목적**: k6 MCP를 활용한 웹사이트 부하 테스트 시스템
- **기술 스택**: Frontend (React + TypeScript + Vite), Backend (Node.js/Express 또는 Python/FastAPI), k6 MCP
- **핵심 기능**: 부하 테스트 실행, 결과 수집, 문서화

## Project Architecture

### Directory Structure

```
/
├── frontend/          # React 애플리케이션 (기존 파일들)
│   ├── components/    # UI 컴포넌트
│   ├── utils/         # 유틸리티 함수
│   ├── styles/        # 스타일 파일
│   └── ...
├── backend/           # 백엔드 서버 (신규 생성)
│   ├── src/           # 소스 코드
│   ├── mcp/           # MCP 서버 연결
│   └── tests/         # 테스트 파일
└── docs/              # 문서화 결과물
```

### Module Divisions

- **Frontend**: 사용자 인터페이스, 테스트 설정, 결과 표시
- **Backend**: API 서버, MCP 서버 통신, 테스트 실행 관리
- **MCP Server**: k6 테스트 실행, 결과 수집
- **Documentation**: 테스트 결과 HTML/PDF 생성

## Code Standards

### Naming Conventions

- **파일명**: kebab-case 사용 (예: load-test.ts, test-results.ts)
- **변수명**: camelCase 사용 (예: testConfig, loadTestResult)
- **상수명**: UPPER_SNAKE_CASE 사용 (예: MAX_CONCURRENT_TESTS)
- **API 엔드포인트**: kebab-case 사용 (예: /api/load-tests, /api/test-results)

### Formatting Requirements

- **TypeScript**: strict 모드 사용
- **ESLint**: 기존 설정 유지
- **Prettier**: 일관된 코드 포맷팅
- **주석**: JSDoc 형식 사용

### Comment Rules

```typescript
/**
 * k6 부하 테스트 실행
 * @param config 테스트 설정
 * @returns 테스트 결과
 */
async function executeLoadTest(config: LoadTestConfig): Promise<TestResult>
```

## Functionality Implementation Standards

### Backend API 설계

**필수 엔드포인트:**
- `POST /api/load-tests` - 테스트 실행 요청
- `GET /api/load-tests/:id` - 테스트 상태 조회
- `GET /api/load-tests/:id/results` - 테스트 결과 조회
- `DELETE /api/load-tests/:id` - 테스트 중단
- `GET /api/test-results` - 모든 테스트 결과 조회

**응답 형식:**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### MCP 서버 연결

**k6 MCP 통신 표준:**
- WebSocket 또는 HTTP 통신 사용
- JSON 형식으로 메시지 교환
- 비동기 테스트 실행
- 실시간 상태 업데이트

**테스트 실행 흐름:**
1. Frontend → Backend API 호출
2. Backend → k6 MCP 서버 요청
3. k6 MCP → 테스트 실행
4. k6 MCP → Backend 결과 전송
5. Backend → Frontend 상태 업데이트

### 테스트 결과 문서화

**JSON 결과 형식:**
```typescript
interface LoadTestResult {
  id: string;
  url: string;
  config: LoadTestConfig;
  metrics: {
    avgResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    duration: number;
  };
  timestamp: string;
}
```

**문서화 표준:**
- HTML 리포트 자동 생성
- PDF 문서화 기능
- 차트 및 그래프 포함
- 상세한 메트릭 분석

## Framework/Plugin/Third-party Library Usage Standards

### k6 사용 표준

**설치 및 설정:**
```bash
npm install k6
# 또는
yarn add k6
```

**테스트 스크립트 형식:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  const response = http.get('https://test.k6.io');
  check(response, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### MCP 서버 연결 표준

**Node.js MCP 클라이언트:**
```typescript
import { MCPClient } from '@modelcontextprotocol/sdk/client';

const client = new MCPClient({
  server: {
    command: 'k6-mcp-server',
    args: ['--port', '3101']
  }
});
```

**Python MCP 서버:**
```python
from mcp.server import Server
from mcp.server.models import InitializationOptions

server = Server("k6-load-testing")
```

### Express/FastAPI 사용 표준

**Express.js 백엔드:**
```typescript
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/load-tests', async (req, res) => {
  // 테스트 실행 로직
});
```

**FastAPI 백엔드:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])
```

## Workflow Standards

### 테스트 실행 워크플로우

1. **테스트 설정 입력** (Frontend)
   - URL 입력
   - 부하 설정 (VU, duration, stages)
   - 테스트 설명

2. **테스트 실행 요청** (Frontend → Backend)
   - POST /api/load-tests
   - 설정 데이터 전송

3. **MCP 서버 연결** (Backend → k6 MCP)
   - k6 MCP 서버 시작
   - 테스트 스크립트 생성
   - 실행 요청

4. **테스트 실행** (k6 MCP)
   - 부하 테스트 실행
   - 메트릭 수집
   - 실시간 상태 업데이트

5. **결과 수집** (k6 MCP → Backend)
   - JSON 결과 수신
   - 데이터베이스 저장
   - 문서화 처리

6. **결과 표시** (Backend → Frontend)
   - WebSocket 실시간 업데이트
   - 결과 페이지 렌더링

### 문서화 워크플로우

1. **결과 데이터 수집**
2. **HTML 리포트 생성**
3. **PDF 문서화**
4. **저장 및 관리**

## Key File Interaction Standards

### 동시 수정 필요 파일

**API 엔드포인트 추가 시:**
- `backend/src/routes/load-tests.ts` - 라우터 정의
- `backend/src/controllers/load-test-controller.ts` - 컨트롤러 로직
- `backend/src/services/k6-service.ts` - k6 서비스 로직
- `frontend/src/utils/api.ts` - API 호출 함수
- `frontend/src/components/TestExecution.tsx` - UI 연동

**테스트 결과 형식 변경 시:**
- `backend/src/types/test-result.ts` - 타입 정의
- `frontend/src/types/test-result.ts` - 프론트엔드 타입
- `backend/src/services/documentation-service.ts` - 문서화 서비스
- `frontend/src/components/TestResults.tsx` - 결과 표시 UI

### 파일 의존성 규칙

- **Backend 우선 개발**: API 서버 완성 후 Frontend 연동
- **타입 정의 공유**: backend/src/types와 frontend/src/types 동기화
- **환경변수 관리**: .env 파일로 설정 분리
- **에러 핸들링**: 일관된 에러 응답 형식 사용

## AI Decision-making Standards

### 우선순위 결정 기준

1. **백엔드 인프라 우선**: API 서버, 데이터베이스, MCP 연결
2. **핵심 기능 구현**: k6 테스트 실행 및 결과 수집
3. **프론트엔드 연동**: 기존 UI와 백엔드 연결
4. **문서화 기능**: 결과 리포트 및 PDF 생성
5. **고급 기능**: 실시간 모니터링, 알림 등

### 모호한 상황 처리

**기술 스택 선택 시:**
- Node.js/Express: 빠른 개발, 풍부한 생태계
- Python/FastAPI: 데이터 처리, ML 통합 용이
- **결정 기준**: 팀 숙련도, 프로젝트 요구사항

**데이터베이스 선택 시:**
- SQLite: 간단한 설정, 파일 기반
- PostgreSQL: 확장성, 복잡한 쿼리
- **결정 기준**: 데이터 규모, 성능 요구사항

**에러 처리 방식:**
- try-catch 블록 사용
- 적절한 HTTP 상태 코드 반환
- 사용자 친화적 에러 메시지
- 로깅 및 모니터링

## Prohibited Actions

### 절대 금지사항

1. **프론트엔드 코드 직접 수정 금지**
   - 기존 UI 컴포넌트 구조 변경 금지
   - 새로운 기능은 별도 컴포넌트로 추가
   - 기존 스타일링 변경 금지

2. **하드코딩 금지**
   - 설정값은 환경변수(.env) 사용
   - API 엔드포인트는 설정 파일로 관리
   - 데이터베이스 연결 정보는 환경변수 사용

3. **동기 실행 금지**
   - k6 테스트는 반드시 비동기로 실행
   - 긴 작업은 백그라운드 처리
   - UI 블로킹 방지

4. **메모리 누수 금지**
   - 테스트 완료 후 리소스 정리
   - WebSocket 연결 해제
   - 임시 파일 삭제

### 개발 금지사항

1. **일반 개발 지식 포함 금지**
   - React, TypeScript 기본 문법 설명 금지
   - 일반적인 웹 개발 패턴 설명 금지
   - 프로젝트 특화 규칙만 포함

2. **추측 기반 개발 금지**
   - 불확실한 요구사항은 사용자에게 확인
   - 기존 코드 분석 후 구현
   - 명확한 스펙 정의 후 개발

3. **테스트 없이 배포 금지**
   - 단위 테스트 작성 필수
   - 통합 테스트 실행
   - API 엔드포인트 테스트

### 예시: 올바른 구현 vs 금지된 구현

**올바른 구현:**
```typescript
// 환경변수 사용
const K6_MCP_SERVER_URL = process.env.K6_MCP_SERVER_URL || 'http://localhost:3101';

// 비동기 테스트 실행
async function executeTest(config: LoadTestConfig): Promise<TestResult> {
  try {
    const result = await k6MCPClient.runTest(config);
    return result;
  } catch (error) {
    logger.error('Test execution failed:', error);
    throw new Error('Test execution failed');
  }
}
```

**금지된 구현:**
```typescript
// 하드코딩 금지
const K6_MCP_SERVER_URL = 'http://localhost:3101';

// 동기 실행 금지
function executeTest(config: LoadTestConfig): TestResult {
  const result = k6MCPClient.runTestSync(config); // 동기 실행
  return result;
}
``` 