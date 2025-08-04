# Web Testing MCP Frontend

## 환경 변수 설정

이 프로젝트를 실행하기 전에 다음 환경 변수들을 설정해야 합니다:

### 필수 환경 변수

1. **Supabase 설정**
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase 익명 API 키

### 선택적 환경 변수

2. **앱 설정**
   - `VITE_APP_NAME`: 앱 이름 (기본값: "Web Testing MCP")
   - `VITE_APP_VERSION`: 앱 버전 (기본값: "1.0.0")
   - `VITE_APP_DESCRIPTION`: 앱 설명
   - `VITE_APP_AUTHOR`: 앱 제작자
   - `VITE_APP_KEYWORDS`: 앱 키워드

3. **API 설정**
   - `VITE_API_BASE_URL`: 백엔드 API 기본 URL
   - `VITE_BACKEND_URL`: 백엔드 서버 URL

## 설정 방법

### 로컬 개발

1. `env.example` 파일을 `.env`로 복사:
   ```bash
   cp env.example .env
   ```

2. `.env` 파일을 편집하여 실제 값들을 입력:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key
   ```

### Netlify 배포

Netlify 대시보드에서 환경 변수를 설정하세요:

1. Site settings > Environment variables
2. 다음 변수들을 추가:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - 기타 필요한 환경 변수들

## 개발 서버 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## 주의사항

- 환경 변수 값들은 절대 코드에 하드코딩하지 마세요
- `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다
- 프로덕션 환경에서는 Netlify 환경 변수를 사용하세요 