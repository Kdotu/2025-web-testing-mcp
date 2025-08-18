-- 기본 테스트 타입 추가 (통합 버전)
INSERT INTO m2_test_types (id, name, description, enabled, category, icon, color, mcp_tool, config_template, created_at, updated_at, is_locked, locked_by, lock_type)
VALUES 
  ('lighthouse', 'Lighthouse', '웹페이지 품질 종합 분석', true, 'lighthouse', 'search', 'purple', 'lighthouse', '{"device": "desktop", "categories": ["performance", "accessibility", "best-practices", "seo"], "throttling": "4g", "locale": "ko-KR"}', NOW(), NOW(), false, null, 'config'),
  ('playwright', 'Playwright E2E 테스트', '엔드투엔드 사용자 시나리오 테스트', true, 'e2e', 'play', 'blue', 'playwright', '{"browser": "chromium", "headless": true, "viewport": {"width": 1280, "height": 720}, "timeout": 30000, "screenshotOnFailure": true}', NOW(), NOW(), false, null, 'config'),
  ('load', '부하 테스트', '동시 접속 및 부하 처리 능력 측정', true, 'load', 'zap', 'orange', 'k6', '{"executor": "ramping-arrival-rate", "preset": "medium", "startRate": 100, "timeUnit": "20s", "preAllocatedVUs": 10, "maxVUs": 500}', NOW(), NOW(), false, null, 'config'),
  ('performance', '성능 테스트', '페이지 로딩 속도 및 성능 측정', true, 'performance', 'gauge', 'green', 'k6', '{"timeout": 30, "retries": 3, "device": "desktop", "metrics": ["FCP", "LCP", "CLS"], "throttling": true}', NOW(), NOW(), false, null, 'config'),
  ('security', '보안 테스트', '웹사이트 보안 취약점 검사', true, 'security', 'shield', 'red', 'k6', '{"checks": ["ssl", "headers", "xss"], "depth": "medium", "includeSubdomains": false, "timeout": 60}', NOW(), NOW(), false, null, 'config'),
  ('accessibility', '접근성 테스트', '웹 접근성 준수 검사', true, 'accessibility', 'eye', 'indigo', 'k6', '{"standard": "wcag21", "level": "aa", "includeWarnings": true, "checkImages": true}', NOW(), NOW(), false, null, 'config')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  enabled = EXCLUDED.enabled,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  mcp_tool = EXCLUDED.mcp_tool,
  config_template = EXCLUDED.config_template,
  updated_at = NOW(),
  is_locked = EXCLUDED.is_locked,
  locked_by = EXCLUDED.locked_by,
  lock_type = EXCLUDED.lock_type;

-- 기존 잠금 상태 정리 (locked_by가 null인 경우 잠금 해제)
UPDATE m2_test_types SET is_locked = false, locked_by = null WHERE locked_by IS NULL AND is_locked = true;

-- 테스트 타입별 MCP 도구 매핑 확인
-- lighthouse -> lighthouse-mcp-server
-- playwright -> playwright-mcp-server  
-- load, performance, security, accessibility -> k6-mcp-server 