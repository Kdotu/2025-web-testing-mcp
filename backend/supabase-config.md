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

```sql
-- 테스트 결과 테이블 생성
CREATE TABLE m2_m2_test_resultsltss (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  url TEXT NOT NULL,
  config JSONB NOT NULL,
  status TEXT NOT NULL,
  metrics JSONB NOT NULL,
  summary JSONB NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_m2_test_resultsltss_test_id ON m2_m2_test_resultsesultss(test_id);
CREATE INDEX idx_m2_test_resultsltss_status ON m2_m2_test_resultsesultss(status);
CREATE INDEX idx_m2_test_resultsltss_created_at ON m2_m2_test_resultsesultss(created_at);

-- RLS 정책 설정 (선택사항)
ALTER TABLE m2_test_resultsltss ENABLE ROW LEVEL SECURITY;
```

## 연결 테스트

백엔드 서버를 실행한 후 `/health` 엔드포인트로 연결을 확인할 수 있습니다. 