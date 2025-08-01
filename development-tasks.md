# k6 MCP 부하 테스트 시스템 개발 Task 목록

**프로젝트 시작일**: 2025-07-29  
**목표**: k6 MCP를 활용한 웹사이트 부하 테스트 시스템 구축

## 📋 전체 개발 로드맵

### Phase 1: 백엔드 인프라 구축 (우선순위 1) ✅ 완료
- [x] **1.1** 백엔드 프로젝트 구조 생성
  - [x] backend/ 디렉토리 생성
  - [x] package.json 설정 (Node.js/Express)
  - [x] TypeScript 설정 (tsconfig.json)
  - [x] 기본 디렉토리 구조 생성 (src/, mcp/, tests/)

- [x] **1.2** 기본 서버 설정
  - [x] Express.js 서버 초기화
  - [x] CORS 미들웨어 설정
  - [x] 환경변수 설정 (.env.example)
  - [x] 기본 라우팅 구조 설정

- [x] **1.3** 데이터베이스 설정
  - [x] Supabase 연결 설정
  - [x] 테스트 결과 저장을 위한 스키마 설계
  - [x] Supabase 기반 데이터베이스 서비스 구현

### Phase 2: MCP 서버 연결 (우선순위 2) ✅ 완료
- [x] **2.1** k6 MCP 클라이언트 설정
  - [x] @modelcontextprotocol/sdk 설치
  - [x] MCP 클라이언트 초기화
  - [x] k6 MCP 서버 연결 설정

- [x] **2.2** k6 테스트 실행 서비스
  - [x] k6 테스트 스크립트 생성 로직
  - [x] 비동기 테스트 실행 함수
  - [x] 테스트 상태 모니터링
  - [x] 결과 수집 및 파싱

### Phase 3: API 엔드포인트 구현 (우선순위 3) ✅ 완료
- [x] **3.1** 핵심 API 엔드포인트
  - [x] POST /api/load-tests - 테스트 실행 요청
  - [x] GET /api/load-tests/:id - 테스트 상태 조회
  - [x] GET /api/load-tests/:id/results - 테스트 결과 조회
  - [x] DELETE /api/load-tests/:id - 테스트 중단
  - [x] GET /api/test-results - 모든 테스트 결과 조회
  - [x] POST /api/load-tests/k6-mcp - k6 MCP 테스트 실행

- [x] **3.2** 타입 정의
  - [x] LoadTestConfig 인터페이스
  - [x] TestResult 인터페이스
  - [x] ApiResponse 인터페이스
  - [x] 에러 타입 정의
  - [x] currentStep, testType 필드 추가 (progress 제거)

- [x] **3.3** 컨트롤러 및 서비스 레이어
  - [x] LoadTestController 구현
  - [x] K6Service 구현
  - [x] 에러 핸들링 미들웨어
  - [x] k6 output 파싱 및 메트릭 추출
  - [x] 실시간 진행률 업데이트 (currentStep 기반)

### Phase 4: 프론트엔드 연동 (우선순위 4) ✅ 완료
- [x] **4.1** API 통신 유틸리티
  - [x] frontend/utils/backend-api.ts 생성
  - [x] 백엔드 API 호출 함수 구현
  - [x] 에러 핸들링 및 재시도 로직

- [x] **4.2** 기존 컴포넌트 연동
  - [x] TestExecution.tsx 백엔드 연동
  - [x] TestExecution.tsx k6 MCP 연동
  - [x] 백엔드 k6 MCP 엔드포인트 구현
  - [x] TestResults.tsx 결과 표시 업데이트
  - [x] Dashboard.tsx 통계 데이터 연동

- [x] **4.3** 실시간 업데이트
  - [x] 폴링 기반 실시간 테스트 상태 업데이트
  - [x] k6 output 기반 진행률 표시 기능
  - [x] 테스트 완료 시 실행 현황 자동 새로고침

- [x] **4.4** 경과 시간 표시 기능
  - [x] TestResults.tsx에 경과 시간 표시 (MM:SS 포맷)
  - [x] Dashboard.tsx에 경과 시간 표시
  - [x] TestExecution.tsx 최근 활동에 소요시간 표시
  - [x] 실시간 경과 시간 업데이트 (실행 중인 테스트)
  - [x] test_type 데이터베이스 저장 및 표시

- [x] **4.5** UI/UX 개선
  - [x] TestResults.tsx 테이블 높이 제한 및 스크롤바 추가
  - [x] TestResults.tsx 점수(Score) 컬럼 제거
  - [x] TestResults.tsx 모달창 구현 (TestResultModal.tsx 분리)
  - [x] TestResults.tsx 웹사이트 폰트 크기 축소
  - [x] TestResults.tsx created_at 컬럼 사용하여 실행 시간 표시
  - [x] 모달창 배경색 통일 (색조 없는 중성적 색상)
  - [x] 모달창 컴포넌트 분리 (TestResultModal.tsx)
  - [x] TestResultModal.tsx X 버튼 외에 모달 배경 클릭 시 닫힘 기능 구현

- [x] **4.6** 테스트 타입 관리 시스템
  - [x] m2_test_types 테이블 스키마 설계 및 생성
  - [x] TestTypeService 백엔드 서비스 구현
  - [x] TestTypeController 백엔드 컨트롤러 구현
  - [x] test-types 라우트 및 API 엔드포인트 구현
  - [x] 프론트엔드 API 함수 수정 (getTestTypes, addTestType, updateTestType, deleteTestType)
  - [x] Settings.tsx에서 Supabase 테스트 타입 데이터 연동
  - [x] 기본 테스트 타입 초기화 기능 구현

- [x] **4.7** 데이터베이스 스키마 최적화
  - [x] m2_test_results에서 progress 컬럼 제거
  - [x] insert/update 로직 최적화 (최초 insert 후 update 방식)
  - [x] m2_test_metrics 테이블 구조 단순화 (key-value 형태)
  - [x] m2_test_configs 테이블 삭제 (m2_test_results에 통합)
  - [x] raw_data 컬럼 추가 (k6 실행 로그 저장)
  - [x] description, config 컬럼 추가 (m2_test_results)

- [x] **4.8** TestExecution.tsx UI/UX 대폭 개선
  - [x] 테스트 진행 중 "테스트 시작" 버튼 비활성화 기능
  - [x] 세로 레이아웃으로 변경 (기본 테스트 설정 → 테스트 설정 → 테스트 시작 버튼 → 실행 현황)
  - [x] 실행 방식 선택 제거 (MCP 서버 방식만 사용)
  - [x] 테스트 유형 선택을 버튼 형식으로 변경
  - [x] 부하테스트 설정 레이아웃 개선 (프리셋 선택과 현재 설정을 한 줄에 배치)
  - [x] 테스트 유형과 활용 MCP 도구를 세로 배치로 변경
  - [x] 테스트 유형 좌측에 TestTube 아이콘 추가
  - [x] 텍스트 너비 통일 (w-28)로 버튼과 요소 시작점 정렬
  - [x] 테스트 유형이 선택되지 않아도 활용 MCP 도구 라벨 표시

### Phase 5: 상세 메트릭 시스템 (우선순위 5) 🔄 진행 중
- [x] **5.1** 메트릭 데이터베이스 설계
  - [x] m2_test_metrics 테이블 스키마 설계
  - [x] TestMetricService 백엔드 서비스 구현
  - [x] TestMetricController 백엔드 컨트롤러 구현
  - [x] test-metrics 라우트 및 API 엔드포인트 구현

- [ ] **5.2** 상세 메트릭 표시
  - [ ] TestResultModal.tsx에서 m2_test_metrics 데이터 조회
  - [ ] 메트릭 타입별 그룹화 표시
  - [ ] 메트릭 값 및 단위 표시
  - [ ] 메트릭 설명 (한국어) 표시

- [x] **5.3** MCP 서버 실행 방식 문제 해결 ✅ 완료
  - [x] **문제점**: MCP 서버 방식으로 실행 시 테스트가 끝나지 않는 문제
    - [x] 증상: status가 'running'에서 벗어나지 않음, currentStep이 null
    - [x] 원인: MCP 서버(Python)가 1회성 실행이 아니라 계속 대기 상태로 남아있음
    - [x] 결과: Node.js에서 close 이벤트가 발생하지 않아 handleTestCompletion 호출 안됨
  - [x] **수정 완료 사항**:
    - [x] k6-mcp-server/k6_server.py를 1회성 실행 방식으로 변경 (FastMCP 제거)
    - [x] MCP 서버가 k6 실행 후 프로세스 종료되도록 수정
    - [x] Node.js에서 MCP 서버 close 이벤트 정상 처리 확인
    - [x] 백엔드 로그 추가: MCP 서버 프로세스 시작/종료, close 이벤트 발생 여부
  - [x] **해결 방안 적용**:
    - [x] MCP 서버를 1회성 실행(요청-응답 후 종료)으로 변경
    - [x] JSON 기반 stdin/stdout 통신 방식으로 변경
    - [x] 백엔드에서 JSON 응답 파싱 로직 구현

- [x] **5.4** 네트워크 연결 문제 해결 ✅ 완료
  - [x] **문제점**: localhost 연결 오류 (`connectex: No connection could be made because the target machine actively refused it.`)
  - [x] **원인 분석**: IPv4/IPv6 주소 불일치 (k6가 127.0.0.1로 연결, 서버는 [::1]에서 실행)
  - [x] **해결 방안**:
    - [x] 백엔드에서 localhost를 [::1]로 자동 변환하는 로직 구현
    - [x] https://를 http://로 자동 변환하는 로직 구현 (로컬 개발 환경용)
    - [x] k6 임계값 조정 (http_req_duration: p(95)<5000, http_req_failed: rate<0.8)
  - [x] **프론트엔드 UI 개선**:
    - [x] 사용자가 입력한 URL을 그대로 표시 (변환 로직은 백엔드에서만 처리)
    - [x] URL 변환 로직을 백엔드로 이동하여 UI 일관성 유지

- [ ] **5.5** 메트릭 분석 기능
  - [ ] 메트릭 통계 계산
  - [ ] 성능 임계값 분석
  - [ ] 메트릭 비교 기능

- [x] **5.6** 추가 MCP 서버 연동 (2025-07-31 계획) ✅ 완료
  - [x] **Lighthouse MCP 서버 연동**:
    - [x] Lighthouse MCP 서버 구조 설계 및 구현
    - [x] 백엔드 Lighthouse MCP 클라이언트 구현
    - [x] Lighthouse 테스트 실행 API 엔드포인트 추가
    - [x] 프론트엔드 Lighthouse 테스트 실행 연동
    - [x] Lighthouse 결과 파싱 및 메트릭 추출
    - [x] Lighthouse 결과 데이터베이스 저장
  - [ ] **Playwright MCP 서버 연동**:
    - [ ] Playwright MCP 서버 구조 설계 및 구현
    - [ ] 백엔드 Playwright MCP 클라이언트 구현
    - [ ] Playwright 테스트 실행 API 엔드포인트 추가
    - [ ] 프론트엔드 Playwright 테스트 실행 연동
    - [ ] Playwright 결과 파싱 및 메트릭 추출
    - [ ] Playwright 결과 데이터베이스 저장
  - [x] **통합 관리 시스템**:
    - [x] MCP 서버 타입별 실행 관리
    - [x] 테스트 유형별 MCP 서버 매핑
    - [x] MCP 서버 상태 모니터링
    - [x] 에러 핸들링 및 재시도 로직

### Phase 6: 문서화 기능 (우선순위 6)
- [ ] **6.1** HTML 리포트 생성
  - [ ] 테스트 결과 HTML 템플릿
  - [ ] 차트 및 그래프 포함
  - [ ] 상세 메트릭 분석 표시

- [ ] **6.2** PDF 문서화
  - [ ] PDF 생성 라이브러리 설정
  - [ ] HTML을 PDF로 변환
  - [ ] 문서 스타일링

- [ ] **6.3** 문서 관리
  - [ ] 문서 저장 및 관리 시스템
  - [ ] 문서 검색 및 필터링
  - [ ] 문서 공유 기능

### Phase 7: 고급 기능 (우선순위 7)
- [ ] **7.1** 모니터링 및 알림
  - [ ] 실시간 모니터링 대시보드
  - [ ] 임계값 기반 알림 시스템
  - [ ] 성능 메트릭 추적

- [ ] **7.2** 테스트 템플릿
  - [ ] 사전 정의된 테스트 템플릿
  - [ ] 템플릿 저장 및 관리
  - [ ] 템플릿 공유 기능

- [ ] **7.3** 사용자 관리
  - [ ] 사용자 인증 시스템
  - [ ] 권한 관리
  - [ ] 팀 협업 기능

## 🚀 현재 개발 상태

**현재 단계**: Phase 5 - 상세 메트릭 시스템 (진행 중)  
**다음 작업**: 상세 메트릭 표시 (Phase 5.2)

## 📝 개발 노트

### 2025-07-31
- **TestExecution.tsx UI/UX 대폭 개선 완료**:
  - 테스트 진행 중 "테스트 시작" 버튼 비활성화 기능 구현
  - 세로 레이아웃으로 변경하여 더 직관적인 사용자 경험 제공
  - 실행 방식 선택 제거 (MCP 서버 방식만 사용)
  - 테스트 유형 선택을 버튼 형식으로 변경하여 더 나은 시각적 피드백 제공
  - 부하테스트 설정 레이아웃 개선 (프리셋 선택과 현재 설정을 한 줄에 배치)
  - 테스트 유형과 활용 MCP 도구를 세로 배치로 변경하여 논리적 흐름 개선
  - 테스트 유형 좌측에 TestTube 아이콘 추가로 시각적 일관성 향상
  - 텍스트 너비 통일 (w-28)로 버튼과 요소 시작점 정렬 개선
  - 테스트 유형이 선택되지 않아도 활용 MCP 도구 라벨이 표시되도록 개선
- **Lighthouse MCP 서버 연동 완료**:
  - Lighthouse MCP 서버 구조 설계 및 구현 완료
  - 백엔드 Lighthouse MCP 클라이언트 구현 완료
  - Lighthouse 테스트 실행 API 엔드포인트 추가 완료
  - 프론트엔드 Lighthouse 테스트 실행 연동 완료
  - Lighthouse 결과 파싱 및 메트릭 추출 완료
  - Lighthouse 결과 데이터베이스 저장 완료
  - 통합 관리 시스템 구축 완료 (MCP 서버 타입별 실행 관리, 테스트 유형별 MCP 서버 매핑)
- **추가 MCP 서버 연동 계획**:
  - Playwright MCP 서버 연동 작업 시작 예정
  - 기존 k6 MCP 서버와 동일한 패턴으로 구현 계획
  - 테스트 유형별 MCP 서버 매핑 시스템 구축 완료

### 2025-07-30
- **MCP 서버 실행 방식 문제 해결 완료**:
  - MCP 서버 방식으로 실행 시 테스트가 끝나지 않는 문제 해결
  - k6-mcp-server/k6_server.py를 1회성 실행 방식으로 변경 (FastMCP 제거)
  - JSON 기반 stdin/stdout 통신 방식으로 변경
  - 백엔드에서 JSON 응답 파싱 로직 구현
  - MCP 서버가 k6 실행 후 프로세스 종료되도록 수정
  - Node.js에서 MCP 서버 close 이벤트 정상 처리 확인
- **네트워크 연결 문제 해결 완료**:
  - localhost 연결 오류 해결 (`connectex: No connection could be made because the target machine actively refused it.`)
  - IPv4/IPv6 주소 불일치 문제 해결 (k6가 127.0.0.1로 연결, 서버는 [::1]에서 실행)
  - 백엔드에서 localhost를 [::1]로 자동 변환하는 로직 구현
  - https://를 http://로 자동 변환하는 로직 구현 (로컬 개발 환경용)
  - k6 임계값 조정 (http_req_duration: p(95)<5000, http_req_failed: rate<0.8)
  - 사용자가 입력한 URL을 그대로 표시하도록 UI 개선 (변환 로직은 백엔드에서만 처리)
- **k6 실행 방식 분리 완료**:
  - 기존 직접 실행 방식 유지 (executeK6Direct)
  - 새로운 MCP 서버 방식 추가 (executeK6ViaMCP)
  - 프론트엔드에서 실행 방식 선택 UI 구현
  - 백엔드 API 엔드포인트 분리 (/k6-mcp-direct, /k6-mcp)
- **데이터베이스 스키마 최적화 완료**:
  - m2_test_results에서 progress 컬럼 제거
  - insert/update 로직 최적화 (최초 insert 후 update 방식)
  - m2_test_metrics 테이블 구조 단순화 (key-value 형태)
  - m2_test_configs 테이블 삭제 (m2_test_results에 통합)
  - raw_data 컬럼 추가 (k6 실행 로그 저장)
  - description, config 컬럼 추가 (m2_test_results)
- **백엔드 수정 완료**:
  - LoadTestResult 타입에서 progress 필드 제거
  - TestResultService에서 progress 관련 코드 제거
  - K6Service에서 progress 관련 코드 제거
  - LoadTestController에서 progress 관련 코드 제거
- **프론트엔드 수정 완료**:
  - RunningTest 인터페이스에서 progress 필드 제거
  - Progress 컴포넌트 import 제거
  - UI에서 progress bar 제거
  - getProgressColor 함수 제거
  - LoadTestConfig에서 options 속성 제거
- **Phase 5 시작**: 상세 메트릭 시스템
  - m2_test_metrics 테이블 스키마 설계 완료
  - TestMetricService 백엔드 서비스 구현 완료
  - TestMetricController 백엔드 컨트롤러 구현 완료
  - test-metrics 라우트 및 API 엔드포인트 구현 완료

### 2025-07-29
- 프로젝트 초기 설정 완료
- 개발 가이드라인 문서화
- Task 목록 생성
- Phase 1 완료: 백엔드 인프라 구축
- Phase 2 완료: MCP 서버 연결 (k6 서비스 구현)
- Phase 3 완료: API 엔드포인트 구현
- Phase 4.1 완료: API 통신 유틸리티 구현
- Phase 4.2 진행: TestExecution.tsx 백엔드 연동
- 모든 의존성 설치 완료
- Supabase 데이터베이스로 변경 완료
- TypeScript 빌드 성공
- 백엔드 API 서버 완성
- 프론트엔드 백엔드 연동 시작
- **ROLLBACK**: 타입 정의 오류로 인한 파일 롤백
- **재시작**: MCP 연결 작업 재진행
- **k6 MCP 서버 연결 완료**: 의존성 설치, 환경 설정, 테스트 실행 성공
- **k6 MCP 프론트엔드 연동 완료**: TestExecution.tsx에서 k6 MCP 테스트 호출 구현
- **백엔드 k6 MCP 엔드포인트 구현 완료**: /api/load-tests/k6-mcp 엔드포인트 추가
- **Phase 4 완료**: 프론트엔드 연동 완료
  - TestResults.tsx 결과 표시 업데이트 완료
  - Dashboard.tsx 통계 데이터 연동 완료
  - k6 output 기반 진행률 표시 기능 구현
  - 테스트 완료 시 실행 현황 자동 새로고침 구현
  - **UI/UX 개선 완료**:
    - TestResults.tsx 테이블 높이 제한 및 스크롤바 추가
    - TestResults.tsx 점수(Score) 컬럼 제거
    - TestResults.tsx 모달창 구현 (TestResultModal.tsx 분리)
    - TestResults.tsx 웹사이트 폰트 크기 축소
    - TestResults.tsx created_at 컬럼 사용하여 실행 시간 표시
    - 모달창 배경색 통일 (색조 없는 중성적 색상)
    - 모달창 컴포넌트 분리 (TestResultModal.tsx)
  - **테스트 타입 관리 시스템 완료**:
    - m2_test_types 테이블 스키마 설계 및 생성
    - TestTypeService 백엔드 서비스 구현
    - TestTypeController 백엔드 컨트롤러 구현
    - test-types 라우트 및 API 엔드포인트 구현
    - 프론트엔드 API 함수 수정 (getTestTypes, addTestType, updateTestType, deleteTestType)
    - Settings.tsx에서 Supabase 테스트 타입 데이터 연동
    - 기본 테스트 타입 초기화 기능 구현

### 기술 스택 결정사항
- **백엔드**: Node.js/Express (빠른 개발, 풍부한 생태계)
- **데이터베이스**: Supabase (PostgreSQL 기반, 실시간 기능)
- **MCP**: @modelcontextprotocol/sdk 사용
- **문서화**: HTML + PDF 생성

### 주의사항
- 프론트엔드 기존 코드 직접 수정 금지
- 환경변수 사용 필수 (하드코딩 금지)
- 비동기 실행 필수 (동기 실행 금지)
- 메모리 누수 방지 (리소스 정리 필수)
- Supabase 연결 설정 필수 (.env 파일)

## 🔧 개발 환경 설정

### 필수 도구
- Node.js 18+
- npm 또는 yarn
- k6 설치
- TypeScript
- ESLint + Prettier
- Supabase 프로젝트 설정

### 환경변수 설정 (.env)
```
# Server Configuration
PORT=3101
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# MCP Server Configuration
K6_MCP_SERVER_URL=http://localhost:3101

# CORS Configuration
CORS_ORIGIN=http://localhost:3100
```

## 📊 진행률 추적

- **Phase 1**: 100% (3/3 완료) ✅
- **Phase 2**: 100% (2/2 완료) ✅
- **Phase 3**: 100% (3/3 완료) ✅
- **Phase 4**: 100% (8/8 완료) ✅
- **Phase 5**: 67% (4/6 완료) 🔄
- **Phase 6**: 0% (0/3 완료)
- **Phase 7**: 0% (0/3 완료)

**전체 진행률**: 87% (20/23 완료)

## 📁 생성된 파일 구조

```
backend/
├── package.json ✅
├── tsconfig.json ✅
├── supabase-config_3.md ✅ (Supabase 설정 가이드)
├── src/
│   ├── index.ts ✅ (Express 서버)
│   ├── types/index.ts ✅ (타입 정의)
│   ├── middleware/error-handler.ts ✅
│   ├── routes/
│   │   ├── load-tests.ts ✅
│   │   ├── test-results.ts ✅
│   │   ├── test-types.ts ✅ (테스트 타입 관리)
│   │   └── test-metrics.ts ✅ (메트릭 관리)
│   ├── controllers/
│   │   ├── load-test-controller.ts ✅
│   │   ├── test-result-controller.ts ✅
│   │   ├── test-type-controller.ts ✅ (테스트 타입 관리)
│   │   └── test-metric-controller.ts ✅ (메트릭 관리)
│   └── services/
│       ├── supabase-client.ts ✅ (Supabase 클라이언트)
│       ├── k6-service.ts ✅
│       ├── test-result-service.ts ✅ (Supabase 기반)
│       ├── test-type-service.ts ✅ (테스트 타입 관리)
│       └── test-metric-service.ts ✅ (메트릭 관리)

frontend/
├── utils/
│   ├── api.tsx ✅ (기존 Supabase API)
│   └── backend-api.ts ✅ (새로운 백엔드 API 클라이언트)
└── components/
    ├── TestExecution.tsx ✅ (백엔드 API 연동 및 UI/UX 대폭 개선)
    ├── TestResults.tsx ✅ (UI/UX 개선 완료)
    ├── TestResultModal.tsx ✅ (모달창 컴포넌트 분리)
    └── Settings.tsx ✅ (테스트 타입 관리 연동)

k6-mcp-server/
├── k6_server.py ✅ (MCP 서버 - 1회성 실행 방식으로 변경)
├── requirements.txt ✅
└── hello.js ✅ (테스트 스크립트)
```

## 🚀 다음 단계

1. **Phase 5.2 완료**: 상세 메트릭 표시
   - TestResultModal.tsx에서 m2_test_metrics 데이터 조회
   - 메트릭 타입별 그룹화 표시
   - 메트릭 값 및 단위 표시
   - 메트릭 설명 (한국어) 표시

2. **Phase 5.5 완료**: 메트릭 분석 기능
   - 메트릭 통계 계산
   - 성능 임계값 분석
   - 메트릭 비교 기능

3. **Phase 5.6 시작**: 추가 MCP 서버 연동 (2025-07-31 계획)
   - Lighthouse MCP 서버 연동
   - Playwright MCP 서버 연동
   - 통합 관리 시스템 구축

4. **Phase 6 시작**: 문서화 기능
   - HTML 리포트 생성
   - PDF 문서화
   - 문서 관리 시스템

### 📈 전체 진행률: 83% (19/23 완료)

