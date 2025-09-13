-- 테이블 통합을 위한 마이그레이션 스크립트
-- m2_playwright_test_results를 m2_test_results로 통합

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

-- 5. 마이그레이션 완료 후 기존 테이블 삭제 (주의: 백업 후 실행)
-- DROP TABLE IF EXISTS public.m2_playwright_test_results;

-- 6. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_m2_test_results_test_type ON m2_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_m2_test_results_user_id ON m2_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_m2_test_results_browser_type ON m2_test_results(browser_type);

-- 7. RLS 정책 업데이트 (필요시)
-- 기존 RLS 정책은 그대로 유지
