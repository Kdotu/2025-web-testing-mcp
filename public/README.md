# MCP 웹사이트 테스터 - 정적 예시 파일들

이 폴더에는 MCP 웹사이트 테스터의 정적 HTML 예시 파일들이 포함되어 있습니다.

## 📁 폴더 구조

```
public/
├── README.md              # 이 파일
├── examples/              # HTML 예시 파일들
│   ├── dashboard.html     # 대시보드 예시 페이지 ✅
│   ├── test-execution.html # 테스트 실행 예시 페이지 ✅
│   ├── test-results.html  # 테스트 결과 예시 페이지 ✅
│   └── settings.html      # 설정 예시 페이지 ✅
└── static/                # 정적 리소스
    ├── common.css         # 공통 스타일시트
    └── common.js          # 공통 JavaScript
```

## 🎯 용도

이 예시 파일들은 다음과 같은 목적으로 사용됩니다:

1. **디자인 시스템 확인**: 라벤더/네이비 색상 스킴과 뉴모피즘 스타일 확인
2. **레이아웃 테스트**: 반응형 디자인과 사이드바 동작 확인
3. **UI 컴포넌트 검증**: 버튼, 카드, 입력 필드 등의 시각적 일관성 확인
4. **사용자 경험 평가**: 전체적인 사용자 인터페이스 흐름 확인

## 🚀 사용 방법

### 로컬에서 실행

1. **웹 서버 실행**
   ```bash
   # Python 3 사용 시
   python -m http.server 8080
   
   # Python 2 사용 시
   python -SimpleHTTPServer 8080
   
   # Node.js serve 패키지 사용 시
   npx serve .
   ```

2. **브라우저에서 확인**
   ```
   http://localhost:8080/examples/dashboard.html
   http://localhost:8080/examples/test-execution.html
   http://localhost:8080/examples/test-results.html
   http://localhost:8080/examples/settings.html
   ```

### Vite 개발 서버에서 확인

실제 React 애플리케이션을 실행하는 동안 예시 파일을 비교하려면:

```bash
# 메인 React 앱 실행
npm run dev

# 예시 파일들은 브라우저에서 직접 접근 가능
# http://localhost:3000/examples/dashboard.html
# http://localhost:3000/examples/test-execution.html  
# http://localhost:3000/examples/test-results.html
# http://localhost:3000/examples/settings.html
```

## 🎨 디자인 특징

### 색상 팔레트
- **배경**: #FFF2F2 (연한 핑크)
- **카드**: #F8F1F7 (연한 라벤더)
- **주요색**: #7886C7 (라벤더)
- **보조색**: #A9B5DF (연한 블루)
- **텍스트**: #2D336B (진한 네이비)

### 뉴모피즘 효과
- **neu-card**: 카드 형태의 뉴모피즘 효과
- **neu-button**: 클릭 가능한 버튼 효과
- **neu-pressed**: 누른 상태의 inset 효과
- **neu-flat**: 평평한 뉴모피즘 효과

### 반응형 디자인
- **데스크톱**: 사이드바 고정 표시
- **태블릿**: 적응형 그리드 레이아웃
- **모바일**: 햄버거 메뉴와 접이식 사이드바

## 📱 반응형 브레이크포인트

- **모바일**: `max-width: 768px`
- **태블릿**: `max-width: 1024px`
- **데스크톱**: `min-width: 1025px`

## 🔧 사용된 기술

### CSS
- **Pretendard Variable**: 한글 최적화 폰트
- **CSS Custom Properties**: 테마 관리
- **CSS Grid & Flexbox**: 레이아웃
- **CSS Animations**: 상호작용 효과

### JavaScript
- **Vanilla JS**: 추가 라이브러리 없이 구현
- **Event Handling**: 사용자 상호작용 처리
- **Responsive Detection**: 모바일/데스크톱 감지
- **Notification System**: 알림 시스템

## ⚠️ 주의사항

1. **예시 전용**: 이 파일들은 시각적 확인 목적으로만 사용됩니다.
2. **기능 제한**: 실제 데이터 처리나 API 통신은 동작하지 않습니다.
3. **React와 분리**: 메인 React 애플리케이션과는 독립적으로 작동합니다.
4. **상대 경로**: 정적 리소스는 상대 경로로 참조됩니다.

## 🔄 업데이트 정책

예시 파일들은 메인 React 컴포넌트의 디자인이 변경될 때마다 함께 업데이트됩니다:

1. **색상 변경**: globals.css의 변수 업데이트 시 반영
2. **레이아웃 수정**: 컴포넌트 구조 변경 시 반영
3. **새 기능**: 새로운 UI 요소 추가 시 예시에 포함

## 📞 문의

예시 파일과 관련된 문의사항이나 버그 리포트는 다음을 통해 연락하세요:

- **GitHub Issues**: [프로젝트 이슈 페이지](https://github.com/your-org/mcp-website-tester/issues)
- **이메일**: support@your-domain.com

---

*이 예시 파일들은 MCP 웹사이트 테스터 프로젝트의 디자인 시스템을 시각적으로 확인하기 위한 참고 자료입니다.*