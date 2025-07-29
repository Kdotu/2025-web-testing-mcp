# MCP 웹사이트 테스터 배포 가이드

## 시스템 요구사항

- Node.js 18.0.0 이상
- npm 8.0.0 이상 또는 yarn 1.22.0 이상
- Git

## 로컬 개발 환경 설정

### 1. 저장소 클론

```bash
git clone https://github.com/your-org/mcp-website-tester.git
cd mcp-website-tester
```

### 2. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase 설정
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API 설정
VITE_API_BASE_URL=your_api_base_url

# 기타 설정
VITE_APP_VERSION=1.0.0
VITE_APP_NAME="MCP 웹사이트 테스터"
```

### 4. 개발 서버 실행

```bash
npm run dev
# 또는
yarn dev
```

애플리케이션이 http://localhost:3000에서 실행됩니다.

## 빌드

### 프로덕션 빌드

```bash
npm run build
# 또는
yarn build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

### 빌드 미리보기

```bash
npm run preview
# 또는
yarn preview
```

## 배포

### 정적 호스팅 (Netlify, Vercel, GitHub Pages)

1. **Netlify**
   ```bash
   npm run build
   # dist 폴더를 Netlify에 드래그 앤 드롭
   ```

2. **Vercel**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

3. **GitHub Pages**
   ```bash
   npm run build
   # dist 폴더 내용을 gh-pages 브랜치에 푸시
   ```

### 서버 배포

#### Docker를 사용한 배포

1. Dockerfile 생성:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. nginx.conf 생성:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api/ {
            proxy_pass http://your-api-server:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

3. 빌드 및 실행:
```bash
docker build -t mcp-website-tester .
docker run -p 80:80 mcp-website-tester
```

#### PM2를 사용한 Node.js 서버 배포

1. serve 패키지로 정적 파일 서빙:
```bash
npm install -g serve pm2
npm run build
pm2 serve dist 3000 --spa --name "mcp-website-tester"
```

2. ecosystem.config.js 생성:
```javascript
module.exports = {
  apps: [{
    name: 'mcp-website-tester',
    script: 'serve',
    args: 'dist -s -l 3000',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

## Supabase 설정

### 1. 프로젝트 생성
1. [Supabase 콘솔](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. 데이터베이스 비밀번호 설정

### 2. 필요한 테이블 생성

```sql
-- KV Store 테이블
CREATE TABLE kv_store_96e41890 (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 테스트 타입 테이블
CREATE TABLE m2_test_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 테스트 결과 테이블
CREATE TABLE m2_test_results (
  id SERIAL PRIMARY KEY,
  test_type TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_kv_store_key ON kv_store_96e41890(key);
CREATE INDEX idx_m2_test_results_type ON m2_m2_test_results(test_type);
CREATE INDEX idx_m2_test_results_url ON m2_m2_test_results(url);
CREATE INDEX idx_m2_test_results_status ON m2_m2_test_results(status);
CREATE INDEX idx_m2_test_results_created_at ON m2_m2_test_results(created_at);
```

### 3. RLS (Row Level Security) 설정

```sql
-- RLS 활성화
ALTER TABLE kv_store_96e41890 ENABLE ROW LEVEL SECURITY;
ALTER TABLE m2_test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE m2_test_results ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (모든 사용자 읽기/쓰기 허용)
CREATE POLICY "Allow all access" ON kv_store_96e41890 FOR ALL USING (true);
CREATE POLICY "Allow all access" ON m2_test_types FOR ALL USING (true);
CREATE POLICY "Allow all access" ON m2_test_results FOR ALL USING (true);
```

### 4. Edge Functions 배포

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 초기화
supabase init

# Edge Functions 배포
supabase functions deploy server

# 환경 변수 설정
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 환경별 설정

### 개발 환경
- Hot reload 활성화
- Source map 생성
- 디버그 로그 출력

### 스테이징 환경
- 프로덕션과 동일한 빌드
- 테스트 데이터베이스 사용
- 성능 모니터링 활성화

### 프로덕션 환경
- 코드 압축 및 최적화
- 소스맵 비활성화
- 에러 추적 활성화
- CDN 사용

## 모니터링 및 로깅

### 에러 추적
- Sentry 또는 Bugsnag 설정
- 클라이언트 및 서버 에러 모니터링

### 성능 모니터링
- Web Vitals 측정
- Lighthouse CI 설정
- 성능 예산 설정

### 로그 수집
- 구조화된 로깅
- 중앙 집중식 로그 관리

## 보안 고려사항

### API 보안
- CORS 설정
- Rate limiting
- API 키 순환

### 클라이언트 보안
- CSP (Content Security Policy) 설정
- XSS 방지
- 민감한 데이터 클라이언트 노출 방지

## 백업 및 복구

### 데이터베이스 백업
```bash
# Supabase 백업
supabase db dump > backup.sql

# 복구
supabase db reset
psql -h your-db-host -U postgres -d postgres < backup.sql
```

### 설정 백업
- 환경 변수 백업
- Supabase 설정 내보내기
- DNS 및 도메인 설정 문서화

## 트러블슈팅

### 일반적인 문제들

1. **빌드 실패**
   - Node.js 버전 확인
   - 의존성 버전 충돌 해결
   - 메모리 부족 시 `NODE_OPTIONS=--max_old_space_size=4096` 설정

2. **API 연결 실패**
   - 환경 변수 확인
   - CORS 설정 확인
   - 네트워크 연결 상태 확인

3. **Supabase 연결 문제**
   - API 키 유효성 확인
   - RLS 정책 확인
   - 데이터베이스 연결 상태 확인

### 로그 확인
```bash
# 애플리케이션 로그
pm2 logs mcp-website-tester

# Nginx 로그
tail -f /var/log/nginx/error.log

# 시스템 로그
journalctl -u your-service-name
```

## 성능 최적화

### 번들 크기 최적화
- Tree shaking 활용
- 코드 분할 (Code splitting)
- 불필요한 의존성 제거

### 이미지 최적화
- WebP 포맷 사용
- 레이지 로딩 구현
- 적응형 이미지 제공

### 캐싱 전략
- 브라우저 캐싱 설정
- CDN 활용
- Service Worker 구현

---

## 지원 및 문의

- 이슈 리포트: [GitHub Issues](https://github.com/your-org/mcp-website-tester/issues)
- 문서: [Wiki](https://github.com/your-org/mcp-website-tester/wiki)
- 이메일: support@your-domain.com