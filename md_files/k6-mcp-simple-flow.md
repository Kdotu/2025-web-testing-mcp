# k6 MCP 호출 흐름 (단순화)

## 기본 흐름

```mermaid
flowchart LR
    A[프론트엔드] --> B[Backend API]
    B --> C[K6Service]
    C --> D[MCP Wrapper]
    D --> E[SimpleMCPClient]
    E --> F[Python k6_server.py]
    F --> G[k6 CLI]
    G --> H[결과 반환]
    H --> I[DB 저장]
```

## 상세 단계

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant K as K6Service
    participant M as MCP Wrapper
    participant P as Python Server
    participant K6 as k6 CLI
    participant D as Database

    F->>B: 테스트 요청
    B->>D: 초기 상태 저장 (running)
    B->>K: executeTestViaMCP()
    K->>M: executeK6Test()
    M->>P: callTool('execute_k6_test')
    P->>K6: k6 run script.js
    K6-->>P: 실행 결과
    P-->>M: JSON 응답
    M-->>K: MCPTestResult
    K->>D: 최종 결과 저장
    B->>F: 상태 업데이트
```

## 핵심 컴포넌트

```mermaid
graph TD
    A[Frontend] --> B[LoadTestController]
    B --> C[K6Service.executeTestViaMCP]
    C --> D[MCPServiceWrapper.executeK6Test]
    D --> E[SimpleMCPClient.callTool]
    E --> F[Python k6_server.py]
    F --> G[k6 CLI 실행]
    G --> H[결과 파싱]
    H --> I[DB 저장]
```

## 에러 처리 흐름

```mermaid
flowchart TD
    A[k6 실행] --> B{성공?}
    B -->|Yes| C[메트릭 추출]
    B -->|No| D[에러 감지]
    
    C --> E[DB: completed]
    D --> F{에러 타입}
    
    F -->|Network| G[DB: failed<br/>Network Error]
    F -->|Threshold| H[DB: failed<br/>Threshold Error]
    F -->|Other| I[DB: failed<br/>Unknown Error]
```

## 실제 호출 예시

```
1. Frontend → POST /api/load-tests
2. Backend → K6Service.executeTestViaMCP()
3. K6Service → MCPServiceWrapper.executeK6Test()
4. MCP Wrapper → SimpleMCPClient.callTool()
5. SimpleMCPClient → Python k6_server.py
6. Python Server → k6 run script.js
7. k6 → 실행 결과 반환
8. Python Server → JSON 응답
9. MCP Wrapper → 결과 파싱
10. K6Service → DB 저장
11. Backend → Frontend 상태 업데이트
``` 