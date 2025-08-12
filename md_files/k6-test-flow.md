# k6 MCP 테스트 실행 흐름도

## 전체 테스트 흐름

```mermaid
flowchart TD
    A[프론트엔드: 테스트 시작] --> B[LoadTestController.createTest]
    B --> C[초기 결과 DB 저장<br/>status: running]
    C --> D[executeK6MCPTestAsync 호출]
    D --> E[K6Service.executeTestViaMCP]
    E --> F[MCP Wrapper 실행]
    F --> G[SimpleMCPClient.callTool]
    G --> H[Python k6_server.py 실행]
    H --> I[k6 스크립트 생성]
    I --> J[k6 CLI 실행]
    J --> K{실행 결과}
    
    K -->|성공| L[정상 k6 출력]
    K -->|실패| M[에러 출력]
    
    L --> N[메트릭 파싱]
    M --> O[에러 감지]
    
    N --> P[결과 DB 저장<br/>status: completed]
    O --> Q[에러 타입 분류]
    
    Q --> R{에러 유형}
    R -->|네트워크 에러| S[Network Error<br/>status: failed]
    R -->|Threshold 초과| T[Threshold Error<br/>status: failed]
    
    S --> U[에러 결과 DB 저장]
    T --> U
    P --> V[테스트 완료]
    U --> V
```

## 상세 MCP 통신 흐름

```mermaid
sequenceDiagram
    participant FE as 프론트엔드
    participant BC as Backend Controller
    participant KS as K6Service
    participant MW as MCP Wrapper
    participant MC as SimpleMCPClient
    participant PS as Python k6_server.py
    participant K6 as k6 CLI
    participant DB as Database

    FE->>BC: POST /api/load-tests
    BC->>DB: 초기 결과 저장 (running)
    BC->>KS: executeTestViaMCP()
    
    KS->>MW: executeK6Test(config)
    MW->>MC: callTool('execute_k6_test', params)
    MC->>PS: spawn('python', 'k6_server.py')
    
    PS->>K6: k6 run script.js
    K6-->>PS: 실행 결과 (stdout/stderr)
    PS-->>MC: JSON 응답
    MC-->>MW: MCPTestResult
    
    alt 성공 케이스
        MW-->>KS: success: true, output: k6결과
        KS->>KS: parseK6Output()
        KS->>DB: 메트릭 저장
        KS->>DB: status: completed
    else 실패 케이스
        MW-->>KS: success: false, error: 에러메시지
        KS->>DB: status: failed
    end
    
    BC->>FE: 테스트 상태 업데이트
```

## 에러 처리 흐름

```mermaid
flowchart TD
    A[k6 실행 결과] --> B{결과 분석}
    
    B -->|정상 출력| C[메트릭 파싱]
    B -->|에러 출력| D[에러 감지]
    
    D --> E{에러 유형}
    E -->|네트워크 에러| F[Network Connection Error]
    E -->|Threshold 초과| G[Performance Threshold Error]
    E -->|기타 에러| H[Unknown Error]
    
    F --> I[status: failed<br/>error: Network connection error]
    G --> J[status: failed<br/>error: Performance thresholds exceeded]
    H --> K[status: failed<br/>error: Unknown error]
    
    C --> L[status: completed<br/>metrics: 추출된 메트릭]
    
    I --> M[DB 저장]
    J --> M
    K --> M
    L --> M
```

## 실제 실행된 테스트 분석

### 테스트 정보
- **URL**: `https://dev.mobigen.com/safezone`
- **Duration**: 10초
- **VUs**: 1000
- **Preset**: high

### 실행 결과
1. **MCP 서버 호출**: ✅ 성공
2. **k6 스크립트 생성**: ✅ 성공
3. **k6 실행**: ❌ 실패
4. **에러 유형**: Threshold 초과
5. **최종 상태**: `completed` (잘못된 처리)

### 문제점
- Threshold 에러가 발생했지만 `completed`로 처리됨
- 수정된 에러 처리 로직이 적용되지 않음

### 개선 사항
- Threshold 에러 시 `failed` 상태로 처리
- 구체적인 에러 메시지 제공
- 에러 유형별 분류 처리 