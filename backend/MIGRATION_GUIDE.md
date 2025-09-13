# 데이터베이스 테이블 통합 마이그레이션 가이드

## 개요
`m2_playwright_test_results` 테이블을 `m2_test_results` 테이블로 통합하는 마이그레이션을 수행합니다.

## 마이그레이션 단계

### 1. 데이터베이스 백업 (중요!)
마이그레이션을 시작하기 전에 반드시 데이터베이스 백업을 수행하세요.

### 2. Supabase 대시보드에서 SQL 실행
1. Supabase 대시보드에 로그인
2. SQL Editor로 이동
3. 아래 SQL 스크립트를 복사하여 실행

```sql
-- 1. m2_test_results 테이블에 Playwright 전용 컬럼들 추가
ALTER TABLE public.m2_test_results 
ADD COLUMN IF NOT EXISTS scenario_code text,
ADD COLUMN IF NOT EXISTS browser_type text DEFAULT 'chromium',
ADD COLUMN IF NOT EXISTS viewport_width integer DEFAULT 1280,
ADD COLUMN IF NOT EXISTS viewport_height integer DEFAULT 720,
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS test_type_id integer,
ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS result_summary text,
ADD COLUMN IF NOT EXISTS screenshots jsonb,
ADD COLUMN IF NOT EXISTS videos jsonb,
ADD COLUMN IF NOT EXISTS error_details text,
ADD COLUMN IF NOT EXISTS execution_time_ms integer;

-- 2. test_type 컬럼을 더 유연하게 변경 (CHECK 제약 조건 추가)
ALTER TABLE public.m2_test_results 
DROP CONSTRAINT IF EXISTS m2_test_results_test_type_check;

ALTER TABLE public.m2_test_results 
ADD CONSTRAINT m2_test_results_test_type_check 
CHECK (test_type IN ('load', 'lighthouse', 'playwright', 'k6'));

-- 3. status 컬럼에 'success' 상태 추가
ALTER TABLE public.m2_test_results 
DROP CONSTRAINT IF EXISTS m2_test_results_status_check;

ALTER TABLE public.m2_test_results 
ADD CONSTRAINT m2_test_results_status_check 
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'success'));

-- 4. 기존 Playwright 데이터를 m2_test_results로 마이그레이션
INSERT INTO public.m2_test_results (
  id,
  test_id,
  name,
  description,
  url,
  status,
  test_type,
  current_step,
  created_at,
  updated_at,
  summary,
  metrics,
  details,
  config,
  raw_data,
  scenario_code,
  browser_type,
  viewport_width,
  viewport_height,
  user_id,
  test_type_id,
  progress_percentage,
  result_summary,
  screenshots,
  videos,
  error_details,
  execution_time_ms
)
SELECT 
  execution_id as id,
  execution_id as test_id, -- execution_id를 test_id로 매핑
  'Playwright Test' as name,
  scenario_code as description,
  'http://localhost:3100' as url, -- 기본 URL 설정
  status,
  'playwright' as test_type,
  current_step,
  created_at,
  updated_at,
  '{}'::jsonb as summary,
  '{}'::jsonb as metrics,
  '{}'::jsonb as details,
  jsonb_build_object(
    'browser_type', browser_type,
    'viewport_width', viewport_width,
    'viewport_height', viewport_height
  ) as config,
  raw_data,
  scenario_code,
  browser_type,
  viewport_width,
  viewport_height,
  user_id,
  test_type_id,
  progress_percentage,
  result_summary,
  screenshots,
  videos,
  error_details,
  execution_time_ms
FROM public.m2_playwright_test_results;

-- 5. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_m2_test_results_test_type ON m2_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_m2_test_results_user_id ON m2_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_m2_test_results_browser_type ON m2_test_results(browser_type);
```

### 3. 애플리케이션 재시작
마이그레이션 완료 후 백엔드 애플리케이션을 재시작하세요.

### 4. 테스트 실행
Playwright 테스트를 실행하여 정상 작동하는지 확인하세요.

### 5. 기존 테이블 삭제 (선택사항)
모든 것이 정상 작동하는 것을 확인한 후, 기존 테이블을 삭제할 수 있습니다:

```sql
-- 주의: 이 명령은 되돌릴 수 없습니다!
DROP TABLE IF EXISTS public.m2_playwright_test_results;
```

## 변경사항 요약

### 백엔드 변경사항
- ✅ `PlaywrightTestService`가 `m2_test_results` 테이블을 사용하도록 수정
- ✅ 모든 데이터베이스 쿼리가 새로운 테이블 구조에 맞게 수정
- ✅ `test_type` 필터링 추가로 Playwright 데이터만 조회

### 데이터베이스 변경사항
- ✅ `m2_test_results` 테이블에 Playwright 전용 컬럼 추가
- ✅ `test_type` 제약 조건에 'playwright' 추가
- ✅ `status` 제약 조건에 'success' 추가
- ✅ 기존 Playwright 데이터 마이그레이션

### API 변경사항
- ✅ 기존 API 엔드포인트 유지 (하위 호환성 보장)
- ✅ 내부적으로만 새로운 테이블 구조 사용

## 롤백 방법
문제가 발생한 경우:

1. 백엔드 코드를 이전 버전으로 되돌리기
2. `m2_test_results`에서 Playwright 관련 컬럼들 제거
3. `m2_playwright_test_results` 테이블 복원 (백업에서)

## 주의사항
- 마이그레이션 중에는 애플리케이션을 중지하세요
- 데이터 백업을 반드시 수행하세요
- 테스트 환경에서 먼저 검증하세요
- 마이그레이션 후 모든 기능을 테스트하세요
