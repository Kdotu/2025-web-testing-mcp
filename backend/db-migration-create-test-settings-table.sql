-- 테스트 설정 관리 테이블 생성
CREATE TABLE IF NOT EXISTS m2_test_settings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  description TEXT DEFAULT '',
  priority INTEGER DEFAULT 0,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_test_settings_category ON m2_test_settings(category);
CREATE INDEX IF NOT EXISTS idx_test_settings_priority ON m2_test_settings(priority DESC);
CREATE INDEX IF NOT EXISTS idx_test_settings_active ON m2_test_settings(isActive);
CREATE INDEX IF NOT EXISTS idx_test_settings_name ON m2_test_settings(name);

-- 기본 설정 데이터 삽입
INSERT INTO m2_test_settings (name, category, value, description, priority, isActive) VALUES
-- Lighthouse 설정
('Lighthouse 기본 설정', 'lighthouse', '{"categories": ["performance", "accessibility", "best-practices", "seo"], "throttling": "simulated", "formFactor": "desktop"}', 'Lighthouse 테스트의 기본 카테고리 및 설정', 100, true),
('Lighthouse 모바일 설정', 'lighthouse', '{"categories": ["performance", "accessibility", "best-practices", "seo"], "throttling": "simulated", "formFactor": "mobile"}', '모바일 환경에서의 Lighthouse 테스트 설정', 90, true),
('Lighthouse 성능 임계값', 'lighthouse', '{"performance": 90, "accessibility": 95, "best-practices": 90, "seo": 85}', 'Lighthouse 점수 임계값 설정', 80, true),

-- k6 부하 테스트 설정
('k6 기본 부하 설정', 'k6', '{"vus": 10, "duration": "30s", "iterations": 100}', 'k6 부하 테스트의 기본 설정', 100, true),
('k6 스트레스 테스트 설정', 'k6', '{"vus": 50, "duration": "2m", "iterations": 500}', 'k6 스트레스 테스트 설정', 90, true),
('k6 스파이크 테스트 설정', 'k6', '{"vus": 100, "duration": "1m", "iterations": 1000}', 'k6 스파이크 테스트 설정', 80, true),

-- Playwright E2E 설정
('Playwright 기본 브라우저 설정', 'playwright', '{"browser": "chromium", "headless": true, "viewport": {"width": 1280, "height": 720}}', 'Playwright 기본 브라우저 설정', 100, true),
('Playwright 모바일 뷰포트 설정', 'playwright', '{"browser": "chromium", "headless": true, "viewport": {"width": 375, "height": 667}}', '모바일 환경 Playwright 테스트 설정', 90, true),
('Playwright 타임아웃 설정', 'playwright', '{"timeout": 30000, "navigationTimeout": 30000, "actionTimeout": 10000}', 'Playwright 타임아웃 관련 설정', 80, true),

-- 공통 설정
('기본 테스트 URL', 'common', '{"baseUrl": "https://example.com", "protocol": "https"}', '테스트 대상 기본 URL 설정', 100, true),
('테스트 재시도 설정', 'common', '{"maxRetries": 3, "retryDelay": 1000}', '테스트 실패 시 재시도 설정', 90, true),
('테스트 타임아웃 설정', 'common', '{"defaultTimeout": 30000, "maxTimeout": 300000}', '전체 테스트 타임아웃 설정', 80, true),

-- 알림 설정
('이메일 알림 설정', 'notification', '{"enabled": true, "recipients": ["admin@example.com"], "onSuccess": false, "onFailure": true}', '테스트 결과 이메일 알림 설정', 100, true),
('슬랙 알림 설정', 'notification', '{"enabled": false, "webhookUrl": "", "onSuccess": false, "onFailure": true}', '테스트 결과 슬랙 알림 설정', 90, true),

-- 보고서 설정
('HTML 리포트 설정', 'report', '{"template": "default", "includeCharts": true, "includeScreenshots": true}', 'HTML 리포트 생성 설정', 100, true),
('PDF 리포트 설정', 'report', '{"format": "A4", "orientation": "portrait", "includeCharts": true}', 'PDF 리포트 생성 설정', 90, true),
('CSV 내보내기 설정', 'report', '{"includeMetrics": true, "includeRawData": false, "separator": ","}', 'CSV 데이터 내보내기 설정', 80, true)
ON CONFLICT DO NOTHING;

-- 업데이트 시간 자동 갱신을 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_test_settings_updated_at ON m2_test_settings;
CREATE TRIGGER update_test_settings_updated_at
    BEFORE UPDATE ON m2_test_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
