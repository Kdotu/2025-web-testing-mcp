# 로컬 환경 HTML/PDF 다운로드 문제점 분석 보고서

**작성일**: 2025-08-12  
**분석자**: AI Assistant  
**프로젝트**: MCP 웹페이지 테스트 시스템  
**버전**: 1.0

## 📋 **문제 개요**

### **문제 상황**
- `C:\project\mcp\2025-web-testing-mcp\backend\reports` 경로의 파일은 정상적으로 열람 가능
- 로컬 환경에서 HTML/PDF 다운로드 시 파일이 열리지 않음
- 백엔드에서는 파일이 정상적으로 생성되고 저장됨

### **영향 범위**
- HTML 리포트 다운로드 실패
- PDF 리포트 다운로드 실패
- 사용자 경험 저하
- 로컬 개발 환경에서의 테스트 어려움

## 🔍 **근본 원인 분석**

### **1. 프론트엔드 다운로드 URL 경로 문제**

#### **문제 코드 위치**
```typescript
// frontend/components/TestResults.tsx - downloadGeneratedReport 함수
const downloadUrl = `/api/documents/${documentInfo.id}/download`;
```

#### **문제점 상세**
- **잘못된 URL 생성**: 프론트엔드에서 상대 경로 `/api/documents/...`로 요청
- **포트 불일치**: 
  - 프론트엔드: `http://localhost:3100/api/documents/...`
  - 백엔드: `http://localhost:3101`에서 실행
- **API 엔드포인트 접근 실패**: 3100 포트에서 3101 포트로의 요청이 실패

#### **현재 동작 흐름**
```
프론트엔드 (3100) → /api/documents/... → 3100 포트 내부 요청 → 실패
```

#### **올바른 동작 흐름**
```
프론트엔드 (3100) → http://localhost:3101/api/documents/... → 백엔드 (3101) → 성공
```

### **2. 환경 변수 설정 불일치**

#### **현재 환경 변수 상태**
```bash
# frontend/env.development
VITE_API_BASE_URL=http://localhost:3101/api
VITE_BACKEND_URL=설정되지 않음
```

#### **백엔드 API 클라이언트 설정**
```typescript
// frontend/utils/backend-api.ts
const BACKEND_API_BASE_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3101';
```

#### **문제점**
- `VITE_BACKEND_URL`이 설정되지 않아 기본값 `http://localhost:3101` 사용
- `VITE_API_BASE_URL`과 `VITE_BACKEND_URL` 간의 불일치
- 프론트엔드 다운로드 함수에서 백엔드 API 기본 URL을 사용하지 않음

### **3. 다운로드 로직의 URL 생성 방식 차이**

#### **일관성 없는 URL 생성 방식**
```typescript
// TestResults.tsx - 잘못된 방식 (상대 경로)
const downloadUrl = `/api/documents/${documentInfo.id}/download`;

// Documentation.tsx - 올바른 방식 (backend-api.ts 함수 사용)
const url = getDocumentDownloadUrl(doc.id);
```

#### **백엔드 라우트 설정 확인**
```typescript
// backend/src/routes/documents.ts
router.get('/:documentId/download', documentationController.downloadDocument);

// backend/src/index.ts
app.use('/api/documents', documentsRoutes);
```

**라우트 경로**: `/api/documents/:documentId/download` ✅ 정상

## 🛠️ **해결 방안**

### **방법 1: 환경 변수 통일 (권장)**

#### **수정 내용**
```bash
# frontend/env.development
VITE_BACKEND_URL=http://localhost:3101
VITE_API_BASE_URL=http://localhost:3101/api
```

#### **장점**
- 환경 변수 일관성 확보
- 개발/프로덕션 환경 간 설정 통일
- 유지보수성 향상

### **방법 2: TestResults.tsx 다운로드 함수 수정**

#### **수정 전**
```typescript
const downloadUrl = `/api/documents/${documentInfo.id}/download`;
```

#### **수정 후**
```typescript
const downloadUrl = `${import.meta.env.VITE_API_BASE_URL}/documents/${documentInfo.id}/download`;
```

#### **장점**
- 빠른 해결 가능
- 기존 코드 구조 유지
- 즉시 테스트 가능

### **방법 3: backend-api.ts의 downloadGeneratedReport 함수 사용**

#### **수정 내용**
```typescript
// TestResults.tsx에서 backend-api.ts의 함수 사용
import { downloadDocument } from '../utils/backend-api';

// downloadGeneratedReport 함수 대신
await downloadDocument(documentInfo.id);
```

#### **장점**
- 코드 일관성 확보
- 중복 코드 제거
- 유지보수성 향상

## 🚀 **즉시 해결 방법 (권장)**

### **1단계: 환경 변수 수정**
```bash
# frontend/env.development 파일 수정
VITE_BACKEND_URL=http://localhost:3101
VITE_API_BASE_URL=http://localhost:3101/api
```

### **2단계: TestResults.tsx 수정**
```typescript:frontend/components/TestResults.tsx
const downloadGeneratedReport = async (documentInfo: any) => {
  try {
    console.log('생성된 리포트 자동 다운로드 시작:', documentInfo);
    
    // 수정: 올바른 백엔드 URL 사용
    const downloadUrl = `${import.meta.env.VITE_API_BASE_URL}/documents/${documentInfo.id}/download`;
    console.log('다운로드 URL:', downloadUrl);
    
    // ... existing code ...
  } catch (error: any) {
    // ... existing code ...
  }
};
```

### **3단계: 테스트 및 검증**
1. 프론트엔드 재시작
2. HTML/PDF 리포트 생성 테스트
3. 다운로드 기능 정상 동작 확인
4. 파일 열기 테스트

## 📊 **예상 효과**

### **기술적 효과**
- 로컬 환경에서 정상적인 파일 다운로드
- 프론트엔드-백엔드 간 올바른 통신
- 환경 변수 설정의 일관성 확보

### **사용자 경험 개선**
- HTML/PDF 리포트 정상 다운로드
- 로컬 개발 환경에서의 원활한 테스트
- 파일 열기 기능 정상 동작

### **개발 효율성 향상**
- 로컬 환경에서의 빠른 테스트
- 디버깅 시간 단축
- 개발-프로덕션 환경 간 일관성

## 🔧 **추가 권장사항**

### **1. 환경 변수 관리 개선**
- `.env.example` 파일에 모든 환경 변수 명시
- 개발/프로덕션 환경별 설정 파일 분리
- 환경 변수 유효성 검사 로직 추가

### **2. 에러 처리 강화**
- 다운로드 실패 시 상세한 에러 메시지 제공
- 네트워크 오류 시 재시도 메커니즘 구현
- 사용자 친화적인 에러 안내

### **3. 로깅 시스템 개선**
- 다운로드 과정의 상세 로그 기록
- 성공/실패 케이스별 로그 분류
- 디버깅을 위한 로그 레벨 설정

## 📝 **결론**

로컬 환경에서 HTML/PDF 다운로드가 실패하는 주요 원인은 **프론트엔드에서 잘못된 백엔드 URL로 요청**하는 것입니다. 

**즉시 해결 방법**으로 환경 변수 수정과 `TestResults.tsx`의 다운로드 함수 수정을 통해 문제를 해결할 수 있으며, 이를 통해 로컬 개발 환경에서의 원활한 테스트가 가능해집니다.

**우선순위**: 높음 (로컬 개발 환경 필수 기능)  
**예상 소요 시간**: 30분 이내  
**영향도**: 높음 (로컬 개발 환경 전체)

---

**문서 버전**: 1.0  
**최종 수정일**: 2025-08-12  
**검토자**: AI Assistant 