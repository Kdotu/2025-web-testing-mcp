/**
 * k6 부하 테스트 설정 인터페이스
 */
export interface LoadTestConfig {
  id?: string;
  url: string;
  name?: string;
  description?: string;
  stages?: LoadTestStage[]; // Lighthouse 테스트에서는 선택적
  testType?: string; // 테스트 유형 (load, lighthouse, playwright 등)
  device?: string; // Lighthouse용 디바이스 설정 (desktop, mobile)
  categories?: string[]; // Lighthouse용 카테고리 설정
  scriptPath?: string; // k6 스크립트 파일 경로
  duration?: string; // 테스트 지속 시간
  vus?: number; // 가상 사용자 수
  createdAt?: string;
  updatedAt?: string;
}

/**
 * k6 테스트 스테이지 인터페이스
 */
export interface LoadTestStage {
  target: number;
  duration: string;
  description?: string;
}

/**
 * k6 테스트 결과 인터페이스
 */
export interface LoadTestResult {
  id: string;
  testId: string;
  testType?: string; // 테스트 유형 (load, performance, security 등)
  url: string;
  name?: string;
  description?: string; // 테스트 설명 추가
  config?: any; // 설정값 저장 필드 (LoadTestConfig 또는 상세 설정)
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'stopped';
  currentStep?: string;
  metrics: {
    http_req_duration: {
      avg: number;
      min: number;
      max: number;
      p95: number;
    };
    http_req_rate: number;
    http_req_failed: number;
    vus: number;
    vus_max: number;
  };
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    duration: number;
    startTime: string;
    endTime: string;
  };
  details?: any;
  raw_data?: string; // k6 실행 로그 저장 필드 추가
  createdAt: string;
  updatedAt: string;
  rowNumber?: number; // 순차 번호 필드 추가
  // 프론트엔드 호환성을 위한 필드 추가
  startTime?: string;
  endTime?: string;
  duration?: string | undefined;
}

/**
 * E2E 테스트 설정 인터페이스
 */
export interface E2ETestConfig {
  url: string;
  name: string;
  description?: string;
  config: {
    testType: string;
    settings: any;
  };
}

/**
 * E2E 테스트 로컬 결과 인터페이스
 */
export interface E2ETestLocalResult {
  id: string;
  url: string;
  name: string;
  description?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'stopped';
  startTime: string;
  endTime?: string;
  logs: string[];
  results?: any;
  error?: string;
}

/**
 * E2E 테스트 결과 인터페이스
 */
export interface E2ETestResult {
  id: string;
  testId: string;
  testType: 'playwright';
  url: string;
  name: string;
  description?: string;
  config?: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  metrics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    successRate: number;
  };
  summary: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    duration: number;
    startTime: string;
    endTime?: string;
  };
  details?: any;
  raw_data?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * API 응답 인터페이스
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * 테스트 상태 업데이트 인터페이스
 */
export interface TestStatusUpdate {
  testId: string;
  status: LoadTestResult['status'];
  progress?: number;
  currentStep?: string;
  message?: string;
  timestamp: string;
}

/**
 * MCP 서버 설정 인터페이스
 */
export interface MCPServerConfig {
  url: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * 에러 타입 정의
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MCP_CONNECTION_ERROR = 'MCP_CONNECTION_ERROR',
  TEST_EXECUTION_ERROR = 'TEST_EXECUTION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: string;
} 