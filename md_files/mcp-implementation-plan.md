# MCP 구현 방식 변경 계획

## 📋 개요

현재 프로젝트는 Child Process + stdin/stdout 방식을 사용하고 있으나, 실제 Model Context Protocol (MCP) SDK를 활용한 표준 구현 방식으로 변경하여 타입 안전성, 확장성, 유지보수성을 향상시키는 것을 목표로 합니다.

## 🎯 목표

- ✅ **표준 MCP 프로토콜 사용**
- ✅ **타입 안전성 향상**
- ✅ **에러 처리 표준화**
- ✅ **확장성 개선**
- ✅ **유지보수성 향상**

## 📊 작업 공수 분석

| 작업 항목 | 소요 시간 | 우선순위 | 복잡도 |
|-----------|-----------|----------|--------|
| **Phase 1: MCP 서버 표준화** | 16시간 | 높음 | 높음 |
| **Phase 2: MCP 클라이언트 구현** | 12시간 | 높음 | 중간 |
| **Phase 3: 백엔드 서비스 통합** | 8시간 | 중간 | 중간 |
| **Phase 4: 프론트엔드 연동** | 6시간 | 중간 | 낮음 |
| **Phase 5: 테스트 및 검증** | 4시간 | 낮음 | 낮음 |
| **총 소요 시간** | **46시간** | - | - |

## 🚀 구현 계획

### **Phase 1: MCP 서버 표준화 (16시간)**

#### **1.1 k6 MCP 서버 표준화 (6시간)**
```typescript
// backend/mcp/k6-mcp-server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server';

const server = new Server({
  name: 'k6-load-testing',
  version: '1.0.0'
});

server.setRequestHandler('execute_k6_test', async (params) => {
  // k6 테스트 실행 로직
  const result = await runK6Test(params.script_file, params.duration, params.vus);
  return { result };
});
```

**작업 내용:**
- [ ] 기존 `k6_server.py` 제거
- [ ] TypeScript 기반 MCP 서버 구현
- [ ] 표준 MCP 프로토콜 적용
- [ ] 도구 정의 및 구현
- [ ] 에러 처리 표준화

#### **1.2 Lighthouse MCP 서버 표준화 (5시간)**
```typescript
// backend/mcp/lighthouse-mcp-server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server';

const server = new Server({
  name: 'lighthouse-auditing',
  version: '1.0.0'
});

server.setRequestHandler('run_audit', async (params) => {
  // Lighthouse 감사 실행 로직
  const result = await runLighthouseAudit(params.url, params.device, params.categories);
  return { result };
});
```

**작업 내용:**
- [ ] 기존 `lighthouse_server.js` 제거
- [ ] TypeScript 기반 MCP 서버 구현
- [ ] 표준 MCP 프로토콜 적용
- [ ] 도구 정의 및 구현

#### **1.3 Playwright MCP 서버 표준화 (5시간)**
```typescript
// backend/mcp/playwright-mcp-server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server';

const server = new Server({
  name: 'playwright-e2e-testing',
  version: '1.0.0'
});

server.setRequestHandler('run_test', async (params) => {
  // Playwright 테스트 실행 로직
  const result = await runPlaywrightTest(params.url, params.config);
  return { result };
});
```

**작업 내용:**
- [ ] 기존 `playwright_server.js` 제거
- [ ] TypeScript 기반 MCP 서버 구현
- [ ] 표준 MCP 프로토콜 적용
- [ ] 도구 정의 및 구현

### **Phase 2: MCP 클라이언트 구현 (12시간)**

#### **2.1 MCP 클라이언트 팩토리 구현 (4시간)**
```typescript
// backend/src/services/mcp-client-factory.ts
import { MCPClient } from '@modelcontextprotocol/sdk/client';

export class MCPClientFactory {
  static createK6Client(): MCPClient {
    return new MCPClient({
      server: {
        command: 'node',
        args: ['backend/mcp/k6-mcp-server/index.js']
      }
    });
  }

  static createLighthouseClient(): MCPClient {
    return new MCPClient({
      server: {
        command: 'node',
        args: ['backend/mcp/lighthouse-mcp-server/index.js']
      }
    });
  }

  static createPlaywrightClient(): MCPClient {
    return new MCPClient({
      server: {
        command: 'node',
        args: ['backend/mcp/playwright-mcp-server/index.js']
      }
    });
  }
}
```

#### **2.2 MCP 서비스 래퍼 구현 (8시간)**
```typescript
// backend/src/services/mcp-service-wrapper.ts
export class MCPServiceWrapper {
  private k6Client: MCPClient;
  private lighthouseClient: MCPClient;
  private playwrightClient: MCPClient;

  constructor() {
    this.k6Client = MCPClientFactory.createK6Client();
    this.lighthouseClient = MCPClientFactory.createLighthouseClient();
    this.playwrightClient = MCPClientFactory.createPlaywrightClient();
  }

  async executeK6Test(config: LoadTestConfig): Promise<any> {
    return await this.k6Client.callTool('execute_k6_test', {
      script_file: config.scriptPath,
      duration: config.duration,
      vus: config.vus
    });
  }

  async executeLighthouseTest(config: any): Promise<any> {
    return await this.lighthouseClient.callTool('run_audit', {
      url: config.url,
      device: config.device,
      categories: config.categories
    });
  }

  async executePlaywrightTest(config: E2ETestConfig): Promise<any> {
    return await this.playwrightClient.callTool('run_test', {
      url: config.url,
      config: config.config
    });
  }
}
```

### **Phase 3: 백엔드 서비스 통합 (8시간)**

#### **3.1 K6Service MCP 클라이언트 통합 (3시간)**
```typescript
// backend/src/services/k6-service.ts
export class K6Service {
  private mcpWrapper: MCPServiceWrapper;

  constructor() {
    this.mcpWrapper = new MCPServiceWrapper();
  }

  async executeTestViaMCP(testId: string, config: LoadTestConfig): Promise<void> {
    try {
      const result = await this.mcpWrapper.executeK6Test(config);
      await this.parseK6Output(testId, result, config);
    } catch (error) {
      console.error('MCP k6 test execution error:', error);
      throw error;
    }
  }
}
```

#### **3.2 LighthouseService MCP 클라이언트 통합 (3시간)**
```typescript
// backend/src/services/lighthouse-service.ts
export class LighthouseService {
  private mcpWrapper: MCPServiceWrapper;

  constructor() {
    this.mcpWrapper = new MCPServiceWrapper();
  }

  async executeTest(id: string, testId: string, config: LoadTestConfig): Promise<void> {
    try {
      const result = await this.mcpWrapper.executeLighthouseTest(config);
      await this.parseLighthouseOutput(id, testId, result, config);
    } catch (error) {
      console.error('MCP Lighthouse test execution error:', error);
      throw error;
    }
  }
}
```

#### **3.3 E2ETestService MCP 클라이언트 통합 (2시간)**
```typescript
// backend/src/services/e2e-test-service.ts
export class E2ETestService {
  private mcpWrapper: MCPServiceWrapper;

  constructor(private testResultService: TestResultService) {
    this.mcpWrapper = new MCPServiceWrapper();
  }

  async executeE2ETest(config: E2ETestConfig): Promise<E2ETestLocalResult> {
    try {
      const result = await this.mcpWrapper.executePlaywrightTest(config);
      return await this.parsePlaywrightOutput(result, config);
    } catch (error) {
      console.error('MCP Playwright test execution error:', error);
      throw error;
    }
  }
}
```

### **Phase 4: 프론트엔드 연동 (6시간)**

#### **4.1 API 엔드포인트 업데이트 (2시간)**
- [ ] 기존 API 엔드포인트 유지
- [ ] 내부적으로 MCP 클라이언트 사용하도록 변경
- [ ] 에러 처리 개선

#### **4.2 프론트엔드 에러 처리 개선 (2시간)**
- [ ] MCP 관련 에러 메시지 추가
- [ ] 재시도 로직 개선
- [ ] 사용자 친화적 에러 표시

#### **4.3 테스트 및 검증 (2시간)**
- [ ] 각 테스트 유형별 MCP 연결 테스트
- [ ] 에러 시나리오 테스트
- [ ] 성능 테스트

### **Phase 5: 테스트 및 검증 (4시간)**

#### **5.1 단위 테스트 작성 (2시간)**
```typescript
// backend/tests/mcp-client.test.ts
describe('MCP Client Tests', () => {
  test('should execute k6 test via MCP', async () => {
    const mcpWrapper = new MCPServiceWrapper();
    const result = await mcpWrapper.executeK6Test(mockConfig);
    expect(result).toBeDefined();
  });
});
```

#### **5.2 통합 테스트 작성 (2시간)**
- [ ] 전체 MCP 워크플로우 테스트
- [ ] 실제 도구 실행 테스트
- [ ] 에러 처리 테스트

## 📅 구현 우선순위

### **1단계 (1-2주차): 핵심 MCP 서버 구현**
1. k6 MCP 서버 표준화
2. MCP 클라이언트 팩토리 구현
3. K6Service MCP 통합

### **2단계 (3-4주차): 나머지 서버 통합**
1. Lighthouse MCP 서버 표준화
2. Playwright MCP 서버 표준화
3. 각 서비스 MCP 통합

### **3단계 (5-6주차): 프론트엔드 및 테스트**
1. 프론트엔드 연동 개선
2. 단위/통합 테스트 작성
3. 문서화 및 최적화

## 🎯 예상 효과

### **개선 사항:**
- ✅ **표준 MCP 프로토콜 사용**
- ✅ **타입 안전성 향상**
- ✅ **에러 처리 표준화**
- ✅ **확장성 개선**
- ✅ **유지보수성 향상**

### **기대 효과:**
- **개발 시간 단축**: 표준 MCP 도구 재사용
- **안정성 향상**: 타입 안전한 통신
- **확장성**: 새로운 MCP 서버 쉽게 추가
- **호환성**: 다른 MCP 클라이언트와 연동 가능

## 📝 현재 상태

- ✅ `@modelcontextprotocol/sdk` 설치됨
- ❌ 실제 MCP 클라이언트/서버 구현 없음
- ❌ 현재는 Child Process + stdin/stdout 방식 사용
- ❌ 표준 MCP 프로토콜 미사용

## 🔄 진행 상황

- [ ] Phase 1: MCP 서버 표준화
- [ ] Phase 2: MCP 클라이언트 구현
- [ ] Phase 3: 백엔드 서비스 통합
- [ ] Phase 4: 프론트엔드 연동
- [ ] Phase 5: 테스트 및 검증

---

**작성일**: 2025-01-27  
**작성자**: Development Team  
**버전**: 1.0.0 