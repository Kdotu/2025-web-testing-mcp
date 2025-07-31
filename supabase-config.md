# Supabase 설정 가이드

## 타임존 설정

### Supabase 프로젝트 타임존 변경

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **Settings > Database 설정**
   - 왼쪽 메뉴에서 "Settings" 클릭
   - "Database" 탭 선택

3. **Timezone 설정**
   - "Timezone" 섹션에서 "Asia/Seoul" 선택
   - "Save" 클릭

### SQL을 통한 타임존 설정

```sql
-- 현재 타임존 확인
SELECT current_setting('timezone');

-- 타임존을 Asia/Seoul로 설정
ALTER DATABASE postgres SET timezone TO 'Asia/Seoul';

-- 세션별 타임존 설정
SET timezone = 'Asia/Seoul';

-- 타임존 변경 확인
SELECT now();
```

### 환경변수 설정

프로젝트 루트에 `.env` 파일에 추가:

```env
# 타임존 설정
TZ=Asia/Seoul
```

## 데이터베이스 스키마

### 1. 테스트 메트릭 테이블 (m2_test_metrics)

```sql
CREATE TABLE public.m2_test_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  metric_type character varying NOT NULL,
  metric_name character varying NOT NULL,
  value numeric,
  unit character varying,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT m2_test_metrics_pkey PRIMARY KEY (id)
);

-- 인덱스 생성
CREATE INDEX idx_m2_test_metrics_test_id ON m2_test_metrics(test_id);
CREATE INDEX idx_m2_test_metrics_type ON m2_test_metrics(metric_type);
CREATE INDEX idx_m2_test_metrics_name ON m2_test_metrics(metric_name);
CREATE INDEX idx_m2_test_metrics_created_at ON m2_test_metrics(created_at DESC);

-- RLS 정책
ALTER TABLE m2_test_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON m2_test_metrics
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON m2_test_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON m2_test_metrics
  FOR UPDATE USING (true);
```

### 2. 테스트 결과 테이블 (m2_test_results)

```sql
CREATE TABLE public.m2_test_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  name character varying,
  description text,
  url character varying NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  test_type character varying DEFAULT 'load'::character varying,
  current_step character varying DEFAULT '테스트 준비 중...'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  summary jsonb DEFAULT '{}'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  details jsonb DEFAULT '{}'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  raw_data text,
  CONSTRAINT m2_test_results_pkey PRIMARY KEY (id)
);

-- 인덱스 생성
CREATE INDEX idx_m2_test_results_test_id ON m2_test_results(test_id);
CREATE INDEX idx_m2_test_results_status ON m2_test_results(status);
CREATE INDEX idx_m2_test_results_created_at ON m2_test_results(created_at DESC);
CREATE INDEX idx_m2_test_results_test_type ON m2_test_results(test_type);

-- RLS 정책
ALTER TABLE m2_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON m2_test_results
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON m2_test_results
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON m2_test_results
  FOR UPDATE USING (true);
```

### 3. 테스트 타입 테이블 (m2_test_types)

```sql
CREATE TABLE public.m2_test_types (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT true,
  category text DEFAULT 'custom'::text,
  icon text,
  color text,
  config_template jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT m2_test_types_pkey PRIMARY KEY (id)
);

-- 기본 테스트 타입 데이터 삽입
INSERT INTO m2_test_types (id, name, description, category, icon, color, config_template) VALUES
('load', '부하 테스트', '웹사이트 부하 테스트', 'load', 'zap', 'blue', '{"duration": "30s", "vus": 10, "thresholds": {"http_req_duration": ["p(95)<2000"]}}'),
('performance', '성능 테스트', '웹사이트 성능 테스트', 'performance', 'gauge', 'green', '{"timeout": 30, "retries": 3, "device": "desktop"}'),
('lighthouse', 'Lighthouse 테스트', 'Google Lighthouse 성능 분석', 'lighthouse', 'search', 'purple', '{"device": "desktop", "categories": ["performance", "accessibility"]}'),
('security', '보안 테스트', '웹사이트 보안 취약점 테스트', 'security', 'shield', 'red', '{"checks": ["xss", "sql-injection"], "depth": "medium"}'),
('accessibility', '접근성 테스트', '웹사이트 접근성 테스트', 'accessibility', 'eye', 'orange', '{"standard": "WCAG2AA", "level": "AA"}');

-- 인덱스 생성
CREATE INDEX idx_m2_test_types_enabled ON m2_test_types(enabled);
CREATE INDEX idx_m2_test_types_category ON m2_test_types(category);

-- RLS 정책
ALTER TABLE m2_test_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON m2_test_types
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON m2_test_types
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON m2_test_types
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON m2_test_types
  FOR DELETE USING (true);
```

## 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase 설정
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 서버 설정
PORT=3101
NODE_ENV=development

# CORS 설정
CORS_ORIGIN=http://localhost:5173

# k6 설정
K6_BIN=k6

# 타임존 설정
TZ=Asia/Seoul
```

## 사용법

1. Supabase 프로젝트에서 SQL 에디터를 열고 위의 스키마를 실행하세요.
2. Supabase 대시보드에서 타임존을 "Asia/Seoul"로 설정하세요.
3. 환경변수를 설정하세요.
4. 백엔드 서버를 시작하세요: `npm run dev`

## 테이블 구조 설명

### m2_test_metrics
- 개별 메트릭 데이터 저장
- `id`: UUID 기본키
- `test_id`: 테스트 식별자
- `metric_type`: 메트릭 타입
- `metric_name`: 메트릭 이름
- `value`: 메트릭 값 (numeric)
- `unit`: 단위
- `description`: 메트릭 설명

### m2_test_results
- 테스트 실행 결과를 저장하는 메인 테이블
- `id`: UUID 기본키
- `test_id`: 고유한 테스트 식별자
- `name`: 테스트 이름
- `description`: 테스트 설명
- `url`: 테스트 대상 URL
- `status`: 테스트 상태 (pending, running, completed, failed)
- `test_type`: 테스트 타입
- `current_step`: 현재 진행 단계
- `summary`, `metrics`, `details`, `config`: JSON 형태의 결과 데이터
- `raw_data`: 원시 로그 데이터

### m2_test_types
- 테스트 유형 정의 테이블
- `id`: 테스트 타입 식별자 (text)
- `name`: 테스트 타입 이름
- `description`: 테스트 타입 설명
- `enabled`: 활성화 여부
- `category`: 테스트 카테고리
- `icon`: 아이콘 이름
- `color`: 색상
- `config_template`: 기본 설정 템플릿 (JSON)

## 메트릭 타입 예시

### HTTP 메트릭
- `metric_type`: 'http'
- `metric_name`: 'req_duration_avg', 'req_duration_p95', 'req_failed_rate', 'reqs_total', 'reqs_rate'

### 체크 메트릭
- `metric_type`: 'checks'
- `metric_name`: 'total', 'succeeded', 'failed', 'succeeded_rate'

### 실행 메트릭
- `metric_type`: 'execution'
- `metric_name`: 'iterations_total', 'iterations_rate', 'duration_avg', 'duration_p95'

### VU 메트릭
- `metric_type`: 'vus'
- `metric_name`: 'min', 'max', 'avg'

### 네트워크 메트릭
- `metric_type`: 'network'
- `metric_name`: 'data_received_bytes', 'data_received_rate', 'data_sent_bytes', 'data_sent_rate'

### 임계값 메트릭
- `metric_type`: 'thresholds'
- `metric_name`: 'passed', 'failed', 'total' 
