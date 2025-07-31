import { LoadTestConfig, LoadTestResult, ApiResponse } from '../../backend/src/types';

// 백엔드 API 기본 URL
const BACKEND_API_BASE_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3101';

// API 응답 타입
interface BackendApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * 백엔드 API 클라이언트
 */
class BackendApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * API 요청 헬퍼
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BackendApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('BackendApiClient: Making request to', url);
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, {
        ...defaultOptions,
        ...options,
      });

      console.log('BackendApiClient: Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('BackendApiClient: Response data:', data);
      return data;
    } catch (error: any) {
      console.error(`API 요청 실패 (${endpoint}):`, error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 헬스 체크
   */
  async checkHealth(): Promise<BackendApiResponse> {
    console.log('BackendApiClient: Checking health at', this.baseUrl);
    const result = await this.request('/health');
    console.log('BackendApiClient: Health check result:', result);
    return result;
  }

  /**
   * 부하 테스트 생성 및 실행
   */
  async createLoadTest(config: LoadTestConfig): Promise<BackendApiResponse<LoadTestResult>> {
    return this.request('/api/load-tests', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * 테스트 상태 조회
   */
  async getTestStatus(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/load-tests/${testId}`);
  }

  /**
   * 테스트 결과 조회
   */
  async getTestResults(testId: string): Promise<BackendApiResponse<LoadTestResult>> {
    return this.request(`/api/load-tests/${testId}/results`);
  }

  /**
   * 테스트 중단
   */
  async cancelTest(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/load-tests/${testId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 모든 테스트 결과 조회
   */
  async getAllTestResults(page: number = 1, limit: number = 10, status?: string): Promise<BackendApiResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }

    return this.request(`/api/test-results?${params.toString()}`);
  }

  /**
   * 특정 테스트 결과 조회
   */
  async getTestResultById(id: string): Promise<BackendApiResponse<LoadTestResult>> {
    return this.request(`/api/test-results/${id}`);
  }

  /**
   * 테스트 결과 삭제
   */
  async deleteTestResult(id: string): Promise<BackendApiResponse> {
    return this.request(`/api/test-results/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * 통계 조회
   */
  async getStatistics(): Promise<BackendApiResponse> {
    return this.request('/api/test-results/statistics');
  }

  /**
   * k6 MCP 테스트 실행 (직접 실행 방식)
   */
  async executeK6MCPTestDirect(params: {
    url: string;
    name: string;
    description?: string;
    script: string;
    config: {
      duration: string;
      vus: number;
      detailedConfig?: any;
    };
  }): Promise<BackendApiResponse<LoadTestResult>> {
    return this.request('/api/load-tests/k6-mcp-direct', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * k6 MCP 테스트 실행 (MCP 서버 방식)
   */
  async executeK6MCPTest(params: {
    url: string;
    name: string;
    description?: string;
    script: string;
    config: {
      duration: string;
      vus: number;
      detailedConfig?: any;
    };
  }): Promise<BackendApiResponse<LoadTestResult>> {
    return this.request('/api/load-tests/k6-mcp', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

// 기본 API 클라이언트 인스턴스
export const backendApi = new BackendApiClient();

// 편의 함수들
export const checkBackendHealth = () => backendApi.checkHealth();
export const createLoadTest = (config: LoadTestConfig) => backendApi.createLoadTest(config);
export const getTestStatus = (testId: string) => backendApi.getTestStatus(testId);
export const getTestResults = (testId: string) => backendApi.getTestResults(testId);
export const cancelTest = (testId: string) => backendApi.cancelTest(testId);
export const getAllTestResults = (page?: number, limit?: number, status?: string) => 
  backendApi.getAllTestResults(page, limit, status);
export const getTestResultById = (id: string) => backendApi.getTestResultById(id);
export const deleteTestResult = (id: string) => backendApi.deleteTestResult(id);
export const getStatistics = () => backendApi.getStatistics();

// k6 MCP 테스트 실행 함수들
export const executeK6MCPTestDirect = (params: {
  url: string;
  name: string;
  description?: string;
  script: string;
  config: {
    duration: string;
    vus: number;
    detailedConfig?: any;
  };
}) => backendApi.executeK6MCPTestDirect(params);

export const executeK6MCPTest = (params: {
  url: string;
  name: string;
  description?: string;
  script: string;
  config: {
    duration: string;
    vus: number;
    detailedConfig?: any;
  };
}) => backendApi.executeK6MCPTest(params);

// 타입 내보내기
export type { BackendApiResponse, LoadTestConfig, LoadTestResult }; 

// 테스트 타입 관련 API
export interface TestType {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
  icon?: string;
  color?: string;
  config_template?: any;
  created_at?: string;
  updated_at?: string;
}

/**
 * 모든 테스트 타입 조회
 */
export const getTestTypes = async (): Promise<{ success: boolean; data?: TestType[]; error?: string }> => {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/test-types`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error fetching test types:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 활성화된 테스트 타입만 조회
 */
export const getEnabledTestTypes = async (): Promise<{ success: boolean; data?: TestType[]; error?: string }> => {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/test-types/enabled`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error fetching enabled test types:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 테스트 타입 추가
 */
export const addTestType = async (testType: Omit<TestType, 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: TestType; error?: string }> => {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/test-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testType),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error adding test type:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 테스트 타입 수정
 */
export const updateTestType = async (id: string, updates: Partial<TestType>): Promise<{ success: boolean; data?: TestType; error?: string }> => {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/test-types/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error updating test type:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 테스트 타입 삭제
 */
export const deleteTestType = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/test-types/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error deleting test type:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 테스트 타입 활성화/비활성화 토글
 */
export const toggleTestType = async (id: string, enabled: boolean): Promise<{ success: boolean; data?: TestType; error?: string }> => {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/test-types/${id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error toggling test type:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 기본 테스트 타입 초기화
 */
export const initializeDefaultTestTypes = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/api/test-types/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error initializing default test types:', error);
    return { success: false, error: error.message };
  }
}; 

// TestMetric 인터페이스 추가
export interface TestMetric {
  id: string;
  test_id: string;
  metric_type: string;
  metric_name: string;
  value: number;
  unit: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// 메트릭 관련 API 함수들
export const getTestMetrics = async (testId: string): Promise<TestMetric[]> => {
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3101';
  const response = await fetch(`${backendUrl}/api/test-metrics/${testId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch test metrics: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data || [];
};

export const getGroupedTestMetrics = async (testId: string): Promise<any> => {
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3101';
  const response = await fetch(`${backendUrl}/api/test-metrics/${testId}/grouped`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch grouped test metrics: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data || {};
}; 