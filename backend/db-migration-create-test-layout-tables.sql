-- 테스트 레이아웃 테이블 생성
CREATE TABLE IF NOT EXISTS m2_test_layouts (
  id SERIAL PRIMARY KEY,
  test_type VARCHAR(50) NOT NULL, -- 'lighthouse', 'k6', 'playwright'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 레이아웃 섹션 테이블 생성
CREATE TABLE IF NOT EXISTS m2_test_layout_sections (
  id SERIAL PRIMARY KEY,
  layout_id INTEGER REFERENCES m2_test_layouts(id) ON DELETE CASCADE,
  section_name VARCHAR(100) NOT NULL,
  section_title VARCHAR(255) NOT NULL,
  section_description TEXT,
  section_order INTEGER NOT NULL,
  is_collapsible BOOLEAN DEFAULT FALSE,
  is_expanded BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 레이아웃 필드 테이블 생성
CREATE TABLE IF NOT EXISTS m2_test_layout_fields (
  id SERIAL PRIMARY KEY,
  layout_id INTEGER REFERENCES m2_test_layouts(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES m2_test_layout_sections(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL, -- 'input', 'select', 'switch', 'textarea', 'number', 'range'
  label VARCHAR(255) NOT NULL,
  placeholder TEXT,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  field_order INTEGER NOT NULL,
  field_width VARCHAR(20) DEFAULT 'full', -- 'full', 'half', 'third', 'quarter'
  default_value TEXT,
  validation_rules JSONB, -- 유효성 검사 규칙
  options JSONB, -- select, radio 등의 옵션
  conditional_logic JSONB, -- 조건부 표시 로직
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 레이아웃 버전 관리 테이블 생성
CREATE TABLE IF NOT EXISTS m2_test_layout_versions (
  id SERIAL PRIMARY KEY,
  layout_id INTEGER REFERENCES m2_test_layouts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  layout_data JSONB NOT NULL, -- 전체 레이아웃 데이터 스냅샷
  change_description TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_test_layouts_test_type ON m2_test_layouts(test_type);
CREATE INDEX IF NOT EXISTS idx_test_layouts_active ON m2_test_layouts(is_active);
CREATE INDEX IF NOT EXISTS idx_test_layout_sections_layout_id ON m2_test_layout_sections(layout_id);
CREATE INDEX IF NOT EXISTS idx_test_layout_sections_order ON m2_test_layout_sections(section_order);
CREATE INDEX IF NOT EXISTS idx_test_layout_fields_layout_id ON m2_test_layout_fields(layout_id);
CREATE INDEX IF NOT EXISTS idx_test_layout_fields_section_id ON m2_test_layout_fields(section_id);
CREATE INDEX IF NOT EXISTS idx_test_layout_fields_order ON m2_test_layout_fields(field_order);
CREATE INDEX IF NOT EXISTS idx_test_layout_versions_layout_id ON m2_test_layout_versions(layout_id);
CREATE INDEX IF NOT EXISTS idx_test_layout_versions_version ON m2_test_layout_versions(version_number);

-- 기본 레이아웃 데이터 삽입
INSERT INTO m2_test_layouts (test_type, name, description, is_default, is_active, version, created_by) VALUES
('lighthouse', 'Lighthouse 기본 레이아웃', 'Lighthouse 테스트의 기본 설정 레이아웃입니다.', true, true, 1, 'system'),
('k6', 'k6 부하테스트 기본 레이아웃', 'k6 부하테스트의 기본 설정 레이아웃입니다.', true, true, 1, 'system'),
('playwright', 'Playwright E2E 기본 레이아웃', 'Playwright E2E 테스트의 기본 설정 레이아웃입니다.', true, true, 1, 'system')
ON CONFLICT DO NOTHING;

-- 기본 섹션 데이터 삽입
INSERT INTO m2_test_layout_sections (layout_id, section_name, section_title, section_description, section_order, is_collapsible, is_expanded)
SELECT 
  l.id,
  'basic_settings',
  '기본 설정',
  '기본 테스트 설정',
  1,
  false,
  true
FROM m2_test_layouts l
WHERE l.is_default = true
ON CONFLICT DO NOTHING;

-- Lighthouse 기본 필드 데이터 삽입
INSERT INTO m2_test_layout_fields (
  layout_id, section_id, field_name, field_type, label, placeholder, 
  is_required, is_visible, field_order, field_width, default_value, options
)
SELECT 
  l.id,
  s.id,
  'url',
  'input',
  '테스트 URL',
  'https://example.com',
  true,
  true,
  1,
  'full',
  '',
  NULL
FROM m2_test_layouts l
JOIN m2_test_layout_sections s ON l.id = s.layout_id
WHERE l.test_type = 'lighthouse' AND l.is_default = true
ON CONFLICT DO NOTHING;

INSERT INTO m2_test_layout_fields (
  layout_id, section_id, field_name, field_type, label, 
  is_required, is_visible, field_order, field_width, default_value, options
)
SELECT 
  l.id,
  s.id,
  'device',
  'select',
  '디바이스',
  false,
  true,
  2,
  'half',
  'desktop',
  '[{"value": "desktop", "label": "데스크톱"}, {"value": "mobile", "label": "모바일"}]'::jsonb
FROM m2_test_layouts l
JOIN m2_test_layout_sections s ON l.id = s.layout_id
WHERE l.test_type = 'lighthouse' AND l.is_default = true
ON CONFLICT DO NOTHING;

INSERT INTO m2_test_layout_fields (
  layout_id, section_id, field_name, field_type, label, 
  is_required, is_visible, field_order, field_width, default_value, options
)
SELECT 
  l.id,
  s.id,
  'categories',
  'select',
  '카테고리',
  false,
  true,
  3,
  'half',
  '["performance", "accessibility"]'::text,
  '[{"value": "performance", "label": "성능"}, {"value": "accessibility", "label": "접근성"}, {"value": "best-practices", "label": "모범 사례"}, {"value": "seo", "label": "SEO"}]'::jsonb
FROM m2_test_layouts l
JOIN m2_test_layout_sections s ON l.id = s.layout_id
WHERE l.test_type = 'lighthouse' AND l.is_default = true
ON CONFLICT DO NOTHING;

-- k6 기본 필드 데이터 삽입
INSERT INTO m2_test_layout_fields (
  layout_id, section_id, field_name, field_type, label, placeholder, 
  is_required, is_visible, field_order, field_width, default_value
)
SELECT 
  l.id,
  s.id,
  'url',
  'input',
  '테스트 URL',
  'https://example.com',
  true,
  true,
  1,
  'full',
  ''
FROM m2_test_layouts l
JOIN m2_test_layout_sections s ON l.id = s.layout_id
WHERE l.test_type = 'k6' AND l.is_default = true
ON CONFLICT DO NOTHING;

INSERT INTO m2_test_layout_fields (
  layout_id, section_id, field_name, field_type, label, 
  is_required, is_visible, field_order, field_width, default_value
)
SELECT 
  l.id,
  s.id,
  'vus',
  'number',
  '가상 사용자 수',
  false,
  true,
  2,
  'half',
  '10'
FROM m2_test_layouts l
JOIN m2_test_layout_sections s ON l.id = s.layout_id
WHERE l.test_type = 'k6' AND l.is_default = true
ON CONFLICT DO NOTHING;

INSERT INTO m2_test_layout_fields (
  layout_id, section_id, field_name, field_type, label, placeholder, 
  is_required, is_visible, field_order, field_width, default_value
)
SELECT 
  l.id,
  s.id,
  'duration',
  'input',
  '테스트 지속 시간',
  '30s',
  false,
  true,
  3,
  'half',
  '30s'
FROM m2_test_layouts l
JOIN m2_test_layout_sections s ON l.id = s.layout_id
WHERE l.test_type = 'k6' AND l.is_default = true
ON CONFLICT DO NOTHING;

-- Playwright 기본 필드 데이터 삽입
INSERT INTO m2_test_layout_fields (
  layout_id, section_id, field_name, field_type, label, placeholder, 
  is_required, is_visible, field_order, field_width, default_value
)
SELECT 
  l.id,
  s.id,
  'url',
  'input',
  '테스트 URL',
  'https://example.com',
  true,
  true,
  1,
  'full',
  ''
FROM m2_test_layouts l
JOIN m2_test_layout_sections s ON l.id = s.layout_id
WHERE l.test_type = 'playwright' AND l.is_default = true
ON CONFLICT DO NOTHING;

INSERT INTO m2_test_layout_fields (
  layout_id, section_id, field_name, field_type, label, 
  is_required, is_visible, field_order, field_width, default_value, options
)
SELECT 
  l.id,
  s.id,
  'browser',
  'select',
  '브라우저',
  false,
  true,
  2,
  'half',
  'chromium',
  '[{"value": "chromium", "label": "Chromium"}, {"value": "firefox", "label": "Firefox"}, {"value": "webkit", "label": "WebKit"}]'::jsonb
FROM m2_test_layouts l
JOIN m2_test_layout_sections s ON l.id = s.layout_id
WHERE l.test_type = 'playwright' AND l.is_default = true
ON CONFLICT DO NOTHING;

INSERT INTO m2_test_layout_fields (
  layout_id, section_id, field_name, field_type, label, 
  is_required, is_visible, field_order, field_width, default_value
)
SELECT 
  l.id,
  s.id,
  'headless',
  'switch',
  '헤드리스 모드',
  false,
  true,
  3,
  'half',
  'true'
FROM m2_test_layouts l
JOIN m2_test_layout_sections s ON l.id = s.layout_id
WHERE l.test_type = 'playwright' AND l.is_default = true
ON CONFLICT DO NOTHING;

-- 업데이트 시간 자동 갱신을 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_test_layouts_updated_at ON m2_test_layouts;
CREATE TRIGGER update_test_layouts_updated_at
    BEFORE UPDATE ON m2_test_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_layout_sections_updated_at ON m2_test_layout_sections;
CREATE TRIGGER update_test_layout_sections_updated_at
    BEFORE UPDATE ON m2_test_layout_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_layout_fields_updated_at ON m2_test_layout_fields;
CREATE TRIGGER update_test_layout_fields_updated_at
    BEFORE UPDATE ON m2_test_layout_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
