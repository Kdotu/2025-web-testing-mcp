# Supabase 설정 가이드

## 환경변수 설정

`.env` 파일에 다음 정보를 추가하세요:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# MCP Server Configuration
K6_MCP_SERVER_URL=http://localhost:3001

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Logging Configuration
LOG_LEVEL=info
```

## Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 설정에서 URL과 API 키 확인
3. SQL Editor에서 다음 테이블 생성:


## 데이터베이스 테이블 생성

### 1. 테스트 결과 테이블 (m2_test_results)
```sql
CREATE TABLE m2_test_results (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  test_type TEXT,
  url TEXT NOT NULL,
  config JSONB NOT NULL,
  status TEXT NOT NULL,
  metrics JSONB NOT NULL,
  summary JSONB NOT NULL,
  raw_data JSONB,
  progress INTEGER DEFAULT 0,
  current_step TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. 테스트 타입 관리 테이블 (m2_test_types)
```sql
CREATE TABLE m2_test_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'custom',
  icon TEXT,
  color TEXT,
  config_template JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. 기본 테스트 타입 데이터 삽입
```sql
INSERT INTO m2_test_types (id, name, description, category, icon, color, config_template) VALUES
('performance', '성능테스트', '웹사이트 성능 및 응답 시간 테스트', 'builtin', 'BarChart3', '#7886C7', '{"duration": "30s", "vus": 10}'),
('load', '부하테스트', '높은 부하 상황에서의 시스템 안정성 테스트', 'builtin', 'Activity', '#9BA8E8', '{"duration": "1m", "vus": 50}'),
('stress', '스트레스테스트', '시스템 한계점을 찾는 테스트', 'builtin', 'Zap', '#6773C0', '{"duration": "2m", "vus": 100}'),
('spike', '스파이크테스트', '갑작스러운 트래픽 증가 테스트', 'builtin', 'TrendingUp', '#4F5BA3', '{"duration": "30s", "vus": 200}'),
('security', '보안테스트', '웹사이트 보안 취약점 테스트', 'builtin', 'Shield', '#A9B5DF', '{"duration": "1m", "vus": 5}'),
('accessibility', '접근성테스트', '웹 접근성 준수 검사', 'builtin', 'Eye', '#7886C7', '{"duration": "30s", "vus": 1}');
```

## 컬럼 설명

### m2_test_types 테이블 컬럼 설명:

1. **id** (TEXT PRIMARY KEY): 테스트 타입의 고유 식별자
   - 예: 'performance', 'load', 'custom-test-1'

2. **name** (TEXT NOT NULL): 테스트 타입의 표시 이름
   - 예: '성능테스트', '부하테스트', '커스텀 테스트'

3. **description** (TEXT): 테스트 타입에 대한 설명
   - 예: '웹사이트 성능 및 응답 시간 테스트'

4. **enabled** (BOOLEAN DEFAULT true): 테스트 타입 활성화 여부
   - true: 사용 가능, false: 비활성화

5. **category** (TEXT DEFAULT 'custom'): 테스트 타입 카테고리
   - 'builtin': 기본 제공 테스트 타입
   - 'custom': 사용자 정의 테스트 타입

6. **icon** (TEXT): UI에서 표시할 아이콘 이름
   - 예: 'BarChart3', 'Activity', 'Zap'

7. **color** (TEXT): UI에서 사용할 색상 코드
   - 예: '#7886C7', '#9BA8E8'

8. **config_template** (JSONB): 기본 설정 템플릿
   - 예: {"duration": "30s", "vus": 10, "thresholds": {...}}

9. **created_at** (TIMESTAMP): 생성 시간
10. **updated_at** (TIMESTAMP): 수정 시간

## RLS (Row Level Security) 설정

```sql
-- RLS 활성화
ALTER TABLE m2_test_types ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Allow read access to all users" ON m2_test_types
  FOR SELECT USING (true);

-- 인증된 사용자만 수정 가능하도록 정책 설정
CREATE POLICY "Allow authenticated users to modify" ON m2_test_types
  FOR ALL USING (auth.role() = 'authenticated');
```

## 인덱스 생성

```sql
-- 성능 향상을 위한 인덱스
CREATE INDEX idx_test_types_enabled ON m2_test_types(enabled);
CREATE INDEX idx_test_types_category ON m2_test_types(category);
CREATE INDEX idx_test_types_created_at ON m2_test_types(created_at);
```

## 사용 예시

### 테스트 타입 조회
```sql
-- 활성화된 모든 테스트 타입 조회
SELECT * FROM m2_test_types WHERE enabled = true ORDER BY category, name;

-- 기본 제공 테스트 타입만 조회
SELECT * FROM m2_test_types WHERE category = 'builtin' AND enabled = true;

-- 사용자 정의 테스트 타입만 조회
SELECT * FROM m2_test_types WHERE category = 'custom' AND enabled = true;
```

### 테스트 타입 추가
```sql
INSERT INTO m2_test_types (id, name, description, category, icon, color, config_template) 
VALUES (
  'custom-api-test',
  'API 테스트',
  'REST API 엔드포인트 성능 테스트',
  'custom',
  'Globe',
  '#A9B5DF',
  '{"duration": "1m", "vus": 20, "thresholds": {"http_req_duration": ["p(95)<2000"]}}'
);
```

### 테스트 타입 수정
```sql
UPDATE m2_test_types 
SET name = '업데이트된 테스트', description = '수정된 설명', updated_at = NOW()
WHERE id = 'custom-api-test';
```

### 테스트 타입 비활성화
```sql
UPDATE m2_test_types 
SET enabled = false, updated_at = NOW()
WHERE id = 'custom-api-test';
``` 

## 연결 테스트

백엔드 서버를 실행한 후 `/health` 엔드포인트로 연결을 확인할 수 있습니다. 