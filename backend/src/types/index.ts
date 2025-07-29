/**
 * k6 부하 테스트 설정 인터페이스
 */
export interface LoadTestConfig {
  id?: string;
  url: string;
  name: string;
  description?: string | undefined;
  stages: LoadTestStage[];
  duration?: string; // k6 duration (e.g., "30s", "1m", "5m")
  vus?: number; // number of virtual users
  options?: {
    vus?: number;
    duration?: string;
    thresholds?: Record<string, string[]>;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * k6 테스트 스테이지 인터페이스
 */
export interface LoadTestStage {
  duration: string;
  target: number;
}

/**
 * k6 테스트 결과 인터페이스
 */
export interface LoadTestResult {
  id: string;
  testId: string;
  testType?: string; // 테스트 유형 (load, performance, security 등)
  url: string;
  config: LoadTestConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  currentStep?: string;
  metrics: {
    http_req_duration: { avg: number; min: number; max: number; p95: number };
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
  rawData?: any;
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