## 📋 **테스트 설정 레이아웃 동적 적용 시스템 구현 작업 목록**

### **Phase 1: 인터랙티브 레이아웃 편집기 구현**
- [ ] **1.1** 실시간 드래그 앤 드롭 편집기
  - [ ] `@dnd-kit` 라이브러리 통합
  - [ ] 필드 순서 변경 드래그 앤 드롭
  - [ ] 필드 그룹화 및 섹션 분리
  - [ ] 시각적 피드백 및 애니메이션
  - [ ] 실시간 편집 모드 토글

- [ ] **1.2** 인터랙티브 미리보기 시스템
  - [ ] 하단 중심 미리보기 레이아웃
  - [ ] 실시간 레이아웃 변경 반영
  - [ ] 반응형 디바이스 뷰 (데스크톱/태블릿/모바일)
  - [ ] 필드 간격 및 정렬 실시간 미리보기

### **Phase 2: 데이터베이스 스키마 설계 및 구현**
- [ ] **2.1** 테스트 레이아웃 테이블 생성
  - [ ] `m2_test_layouts` 테이블 생성
  - [ ] `m2_test_layout_fields` 테이블 생성
  - [ ] 관계형 데이터베이스 설계

- [ ] **2.2** 레이아웃 버전 관리
  - [ ] 레이아웃 히스토리 테이블
  - [ ] 버전 관리 시스템
  - [ ] 롤백 기능

### **Phase 3: 백엔드 API 구현**
- [ ] **3.1** 레이아웃 관리 API
  - [ ] 레이아웃 CRUD API
  - [ ] 필드 관리 API
  - [ ] 레이아웃 적용 API

- [ ] **3.2** 동적 설정 렌더링 API
  - [ ] 레이아웃 기반 설정 폼 생성
  - [ ] 필드 유효성 검사 API
  - [ ] 설정값 저장/로드 API

### **Phase 4: 프론트엔드 동적 렌더링 시스템**
- [ ] **4.1** 동적 폼 렌더러 구현
  - [ ] 레이아웃 기반 폼 컴포넌트
  - [ ] 필드 타입별 렌더링
  - [ ] 실시간 유효성 검사
  - [ ] 빈 상태 처리 (기어 아이콘 및 안내 메시지)

- [ ] **4.2** 테스트 설정 화면 통합
  - [ ] 기존 테스트 설정 화면 수정
  - [ ] 동적 레이아웃 적용
  - [ ] 설정값 저장/로드
  - [ ] 섹션 추가 기능 구현

### **Phase 5: 사용자 경험 개선**
- [ ] **5.1** 레이아웃 템플릿 시스템
  - [ ] 기본 템플릿 제공
  - [ ] 템플릿 가져오기/내보내기
  - [ ] 커뮤니티 템플릿 공유

- [ ] **5.2** 고급 레이아웃 기능
  - [ ] 조건부 필드 표시
  - [ ] 필드 간 의존성 설정
  - [ ] 동적 옵션 생성

## 🗄️ **필요한 데이터베이스 테이블**

### **1. m2_test_layouts (테스트 레이아웃 테이블)**
```sql
CREATE TABLE m2_test_layouts (
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
```

### **2. m2_test_layout_fields (레이아웃 필드 테이블)**
```sql
CREATE TABLE m2_test_layout_fields (
  id SERIAL PRIMARY KEY,
  layout_id INTEGER REFERENCES m2_test_layouts(id) ON DELETE CASCADE,
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
```

### **3. m2_test_layout_sections (레이아웃 섹션 테이블)**
```sql
CREATE TABLE m2_test_layout_sections (
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
```

### **4. m2_test_layout_field_sections (필드-섹션 매핑 테이블)**
```sql
CREATE TABLE m2_test_layout_field_sections (
  id SERIAL PRIMARY KEY,
  field_id INTEGER REFERENCES m2_test_layout_fields(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES m2_test_layout_sections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **5. m2_test_layout_versions (레이아웃 버전 관리 테이블)**
```sql
CREATE TABLE m2_test_layout_versions (
  id SERIAL PRIMARY KEY,
  layout_id INTEGER REFERENCES m2_test_layouts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  layout_data JSONB NOT NULL, -- 전체 레이아웃 데이터 스냅샷
  change_description TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 **구현해야 할 핵심 컴포넌트**

### **1. InteractiveLayoutEditor**
- 실시간 드래그 앤 드롭 편집기
- 하단 미리보기와 연동된 편집
- 실시간 편집 모드 토글
- 섹션별 필드 그룹화

### **2. LayoutPreviewPanel**
- 하단 중심 미리보기 레이아웃
- 반응형 디바이스 뷰 (데스크톱/태블릿/모바일)
- 실시간 편집 반영
- 실제 테스트 설정 화면과 동일한 스타일

### **3. TestSettingsConfigurator**
- 필드 추가 및 편집 영역
- 섹션 추가 기능
- 빈 상태 처리 (기어 아이콘 및 안내 메시지)
- 필드 드래그 앤 드롭으로 순서 변경

### **4. DynamicFieldRenderer**
- 각 필드 타입별 렌더링 로직
- 조건부 필드 표시
- 동적 옵션 생성
- 실시간 유효성 검사

### **5. TestTypeSelector**
- 상단 테스트 타입 드롭다운 (Lighthouse, K6, Playwright)
- 테스트 타입별 레이아웃 전환

## �� **고려사항**

### **기술적 고려사항**
1. **성능**: 대량의 필드가 있는 레이아웃의 렌더링 성능
2. **확장성**: 새로운 필드 타입 추가의 용이성
3. **호환성**: 기존 테스트 설정과의 호환성
4. **유효성 검사**: 동적 필드의 유효성 검사 로직

### **사용자 경험 고려사항**
1. **직관성**: 드래그 앤 드롭 인터페이스의 직관성
2. **미리보기**: 실시간 미리보기의 정확성
3. **에러 처리**: 잘못된 레이아웃 설정에 대한 에러 처리
4. **백업/복원**: 레이아웃 설정의 백업 및 복원
