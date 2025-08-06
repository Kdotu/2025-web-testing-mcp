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

// 문서 정보 타입
export interface DocumentInfo {
  id: string;
  testId: string;
  type: 'html' | 'pdf';
  filename: string;
  filepath: string;
  size: number;
  createdAt: string;
  url?: string;
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
   * 테스트 상태 조회 (기본)
   */
  async getTestStatus(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/load-tests/${testId}`);
  }

  /**
   * k6 테스트 상태 조회
   */
  async getK6TestStatus(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/load-tests/${testId}`);
  }

  /**
   * 테스트 결과 조회
   */
  async getTestResults(testId: string): Promise<BackendApiResponse<LoadTestResult>> {
    return this.request(`/api/load-tests/${testId}/results`);
  }

  /**
   * 테스트 취소
   */
  async cancelTest(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/load-tests/${testId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 전체 테스트 결과 개수 조회
   */
  async getTotalTestCount(): Promise<BackendApiResponse<{ total: number }>> {
    return this.request('/api/test-results/count');
  }

  /**
   * 모든 테스트 결과 조회
   */
  async getAllTestResults(page: number = 1, limit: number = 1000, status?: string): Promise<BackendApiResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    
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
   * k6 MCP 테스트 실행 (직접)
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
   * k6 MCP 테스트 실행
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

  /**
   * 기본 테스트 실행
   */
  async executeDefaultTest(params: {
    url: string;
    name: string;
    description?: string;
    testType: string;
  }): Promise<BackendApiResponse> {
    return this.request('/api/load-tests/default', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Lighthouse 테스트 실행
   */
  async runLighthouseTest(params: {
    url: string;
    device?: string;
    categories?: string[];
  }): Promise<BackendApiResponse> {
    return this.request('/api/lighthouse/run', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Lighthouse 테스트 상태 조회
   */
  async getLighthouseTestStatus(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/lighthouse/status/${testId}`);
  }

  /**
   * Lighthouse 테스트 취소
   */
  async cancelLighthouseTest(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/lighthouse/cancel/${testId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 실행 중인 Lighthouse 테스트 조회
   */
  async getRunningLighthouseTests(): Promise<BackendApiResponse> {
    return this.request('/api/lighthouse/running');
  }

  /**
   * E2E 테스트 실행
   */
  async executeE2ETest(params: {
    url: string;
    name: string;
    description?: string;
    config: {
      testType: string;
      settings: any;
    };
  }): Promise<BackendApiResponse<LoadTestResult>> {
    return this.request('/api/e2e-tests', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * E2E 테스트 상태 조회
   */
  async getE2ETestStatus(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/e2e-tests/${testId}`);
  }

  /**
   * E2E 테스트 취소
   */
  async cancelE2ETest(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/e2e-tests/${testId}`, {
      method: 'DELETE',
    });
  }

  // ===== 문서화 관련 API =====

  /**
   * HTML 리포트 생성
   */
  async generateHtmlReport(testId: string): Promise<BackendApiResponse<DocumentInfo>> {
    return this.request(`/api/documents/html/${testId}`, {
      method: 'POST',
    });
  }

  /**
   * PDF 리포트 생성
   */
  async generatePdfReport(testId: string): Promise<BackendApiResponse<DocumentInfo>> {
    return this.request(`/api/documents/pdf/${testId}`, {
      method: 'POST',
    });
  }

  /**
   * 문서 목록 조회
   */
  async getDocuments(testId?: string, type?: 'html' | 'pdf'): Promise<BackendApiResponse<DocumentInfo[]>> {
    const params = new URLSearchParams();
    if (testId) params.append('testId', testId);
    if (type) params.append('type', type);
    
    return this.request(`/api/documents?${params.toString()}`);
  }

  /**
   * 문서 통계 조회
   */
  async getDocumentStats(): Promise<BackendApiResponse> {
    return this.request('/api/documents/stats');
  }

  /**
   * 문서 다운로드 URL 생성
   */
  getDocumentDownloadUrl(documentId: string): string {
    return `${this.baseUrl}/api/documents/${documentId}/download`;
  }

  /**
   * 문서 미리보기 URL 생성
   */
  getDocumentPreviewUrl(documentId: string): string {
    return `${this.baseUrl}/api/documents/${documentId}/preview`;
  }

  /**
   * 문서 삭제
   */
  async deleteDocument(documentId: string): Promise<BackendApiResponse> {
    return this.request(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  // ===== 테스트 타입 관련 API =====

  /**
   * 테스트 타입 목록 조회
   */
  async getTestTypes(): Promise<{ success: boolean; data?: TestType[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-types`);
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 활성화된 테스트 타입만 조회
   */
  async getEnabledTestTypes(): Promise<{ success: boolean; data?: TestType[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-types?enabled=true`);
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 테스트 타입 추가
   */
  async addTestType(testType: Omit<TestType, 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: TestType; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testType),
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 테스트 타입 수정
   */
  async updateTestType(id: string, updates: Partial<TestType>): Promise<{ success: boolean; data?: TestType; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 테스트 타입 삭제
   */
  async deleteTestType(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-types/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 테스트 타입 활성화/비활성화
   */
  async toggleTestType(id: string, enabled: boolean): Promise<{ success: boolean; data?: TestType; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-types/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 기본 테스트 타입 초기화
   */
  async initializeDefaultTestTypes(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-types/initialize`, {
        method: 'POST',
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===== 메트릭 관련 API =====

  /**
   * 테스트 메트릭 조회
   */
  async getTestMetrics(testId: string): Promise<TestMetric[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-metrics/${testId}`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('메트릭 조회 실패:', error);
      return [];
    }
  }

  /**
   * 그룹화된 테스트 메트릭 조회
   */
  async getGroupedTestMetrics(testId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-metrics/${testId}/grouped`);
      const data = await response.json();
      return data.success ? data.data : {};
    } catch (error) {
      console.error('그룹화된 메트릭 조회 실패:', error);
      return {};
    }
  }

  /**
   * 외부 MCP 서버 상태 확인
   */
  async getMCPStatus(): Promise<BackendApiResponse> {
    return this.request('/api/mcp-status');
  }

  /**
   * 특정 MCP 서버 테스트
   */
  async testMCPServer(serverType: 'k6' | 'lighthouse' | 'playwright'): Promise<BackendApiResponse> {
    return this.request('/api/mcp-status/test', {
      method: 'POST',
      body: JSON.stringify({ serverType }),
    });
  }

  /**
   * MCP 서버 설정 정보 조회
   */
  async getMCPConfig(): Promise<BackendApiResponse> {
    return this.request('/api/mcp-status/config');
  }
}

const backendApi = new BackendApiClient();

// ===== 내보내기 함수들 =====

export const checkBackendHealth = () => backendApi.checkHealth();
export const createLoadTest = (config: LoadTestConfig) => backendApi.createLoadTest(config);
export const getTestStatus = (testId: string) => backendApi.getTestStatus(testId);
export const getK6TestStatus = (testId: string) => backendApi.getK6TestStatus(testId);
export const getTestResults = (testId: string) => backendApi.getTestResults(testId);
export const cancelTest = (testId: string) => backendApi.cancelTest(testId);
export const getTotalTestCount = () => backendApi.getTotalTestCount();
export const getAllTestResults = (page?: number, limit?: number, status?: string) => 
  backendApi.getAllTestResults(page, limit, status);
export const getTestResultById = (id: string) => backendApi.getTestResultById(id);
export const deleteTestResult = (id: string) => backendApi.deleteTestResult(id);
export const getStatistics = () => backendApi.getStatistics();

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

export const executeDefaultTest = (params: {
  url: string;
  name: string;
  description?: string;
  testType: string;
}) => backendApi.executeDefaultTest(params);

export const runLighthouseTest = (params: {
  url: string;
  device?: string;
  categories?: string[];
}) => backendApi.runLighthouseTest(params);

export const getLighthouseTestStatus = (testId: string) => backendApi.getLighthouseTestStatus(testId);
export const cancelLighthouseTest = (testId: string) => backendApi.cancelLighthouseTest(testId);
export const getRunningLighthouseTests = () => backendApi.getRunningLighthouseTests();

export const executeE2ETest = (params: {
  url: string;
  name: string;
  description?: string;
  config: {
    testType: string;
    settings: any;
  };
}) => backendApi.executeE2ETest(params);

export const getE2ETestStatus = (testId: string) => backendApi.getE2ETestStatus(testId);
export const cancelE2ETest = (testId: string) => backendApi.cancelE2ETest(testId);

// ===== 문서화 관련 함수들 =====

export const generateHtmlReport = (testId: string) => backendApi.generateHtmlReport(testId);
export const generatePdfReport = (testId: string) => backendApi.generatePdfReport(testId);
export const getDocuments = (testId?: string, type?: 'html' | 'pdf') => backendApi.getDocuments(testId, type);
export const getDocumentStats = () => backendApi.getDocumentStats();
export const getDocumentDownloadUrl = (documentId: string) => backendApi.getDocumentDownloadUrl(documentId);
export const getDocumentPreviewUrl = (documentId: string) => backendApi.getDocumentPreviewUrl(documentId);
export const deleteDocument = (documentId: string) => backendApi.deleteDocument(documentId);

// ===== 테스트 타입 관련 함수들 =====

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

export const getTestTypes = async (): Promise<{ success: boolean; data?: TestType[]; error?: string }> => {
  return backendApi.getTestTypes();
};

export const getEnabledTestTypes = async (): Promise<{ success: boolean; data?: TestType[]; error?: string }> => {
  return backendApi.getEnabledTestTypes();
};

export const addTestType = async (testType: Omit<TestType, 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: TestType; error?: string }> => {
  return backendApi.addTestType(testType);
};

export const updateTestType = async (id: string, updates: Partial<TestType>): Promise<{ success: boolean; data?: TestType; error?: string }> => {
  return backendApi.updateTestType(id, updates);
};

export const deleteTestType = async (id: string): Promise<{ success: boolean; error?: string }> => {
  return backendApi.deleteTestType(id);
};

export const toggleTestType = async (id: string, enabled: boolean): Promise<{ success: boolean; data?: TestType; error?: string }> => {
  return backendApi.toggleTestType(id, enabled);
};

export const initializeDefaultTestTypes = async (): Promise<{ success: boolean; error?: string }> => {
  return backendApi.initializeDefaultTestTypes();
};

// ===== 메트릭 관련 함수들 =====

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

export const getTestMetrics = async (testId: string): Promise<TestMetric[]> => {
  return backendApi.getTestMetrics(testId);
};

export const getGroupedTestMetrics = async (testId: string): Promise<any> => {
  return backendApi.getGroupedTestMetrics(testId);
};

// ===== MCP 서버 관련 함수들 =====

export const getMCPStatus = () => backendApi.getMCPStatus();
export const testMCPServer = (serverType: 'k6' | 'lighthouse' | 'playwright') => backendApi.testMCPServer(serverType);
export const getMCPConfig = () => backendApi.getMCPConfig(); 