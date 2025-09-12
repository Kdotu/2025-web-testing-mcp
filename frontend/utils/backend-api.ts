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

// MCP Playwright API 응답 타입
interface MCPPlaywrightResponse {
  success: boolean;
  code?: string;
  metadata?: {
    stepsCount: number;
    patterns: string[];
    config: any;
  };
  error?: string;
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
    // console.log('BackendApiClient: Making request to', url);
    
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

      // console.log('BackendApiClient: Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // console.log('BackendApiClient: Response data:', data);
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
    return this.request('/api/test/load', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * MCP Playwright: 자연어를 Playwright 코드로 변환
   */
  async convertNaturalLanguageToPlaywright(
    naturalLanguage: string, 
    config: any = {}
  ): Promise<MCPPlaywrightResponse> {
    return this.request('/api/mcp/playwright/convert', {
      method: 'POST',
      body: JSON.stringify({ naturalLanguage, config }),
    });
  }

  /**
   * MCP Playwright: 서버 상태 확인
   */
  async checkMCPPlaywrightStatus(): Promise<MCPPlaywrightResponse> {
    return this.request('/api/mcp/playwright/status');
  }

  /**
   * MCP Playwright: 지원하는 패턴 정보 조회
   */
  async getMCPPlaywrightPatterns(): Promise<MCPPlaywrightResponse> {
    return this.request('/api/mcp/playwright/patterns');
  }

  /**
   * 테스트 상태 조회 (기본)
   */
  async getTestStatus(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/test-manage/status/${testId}?testType=load`);
  }

  /**
   * k6 테스트 상태 조회
   */
  async getK6TestStatus(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/test-manage/status/${testId}?testType=load`);
  }

  /**
   * 테스트 결과 조회
   */
  async getTestResults(testId: string): Promise<BackendApiResponse<LoadTestResult>> {
    return this.request(`/api/test-results/${testId}`);
  }

  /**
   * 테스트 취소 (통합)
   */
  async cancelTest(testId: string, testType?: string): Promise<BackendApiResponse> {
    const queryParam = testType ? `?testType=${testType}` : '';
    const url = `/api/test-manage/cancel/${testId}${queryParam}`;
    
    console.log('🔍 cancelTest 호출:', { testId, testType, url });
    
    try {
      const result = await this.request(url, {
        method: 'DELETE'
      });
      console.log('✅ cancelTest 성공:', result);
      return result;
    } catch (error) {
      console.error('❌ cancelTest 실패:', error);
      throw error;
    }
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
    return this.request('/api/test/load/k6-mcp-direct', {
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
    return this.request('/api/test/load/k6-mcp', {
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
    return this.request('/api/test/load/default', {
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
    name?: string;
    description?: string;
  }): Promise<BackendApiResponse> {
    return this.request('/api/test/lighthouse', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Lighthouse 테스트 상태 조회
   */
  async getLighthouseTestStatus(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/test-manage/status/${testId}?testType=lighthouse`);
  }

  /**
   * 실행 중인 Lighthouse 테스트 조회
   */
  async getRunningLighthouseTests(): Promise<BackendApiResponse> {
    // 새로운 통합 API에서는 개별 실행 중인 테스트 조회 대신 전체 상태를 조회
    return this.request('/api/test-manage/status/all?testType=lighthouse');
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
    return this.request('/api/test/e2e', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * E2E 테스트 상태 조회
   */
  async getE2ETestStatus(testId: string): Promise<BackendApiResponse> {
    return this.request(`/api/test-manage/status/${testId}?testType=e2e`);
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

  // ===== Playwright 단위테스트 엔드포인트 =====
  /**
   * 자연어/코드 기반 Playwright 시나리오 실행
   */
  async executePlaywrightScenario(params: {
    scenarioCode: string;
    config?: any;
    userId?: string;
    description?: string;
  }): Promise<BackendApiResponse<{ executionId: string }>> {
    return this.request('/api/playwright/execute', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  /** 실행 상태 조회 */
  async getPlaywrightStatus(executionId: string): Promise<BackendApiResponse> {
    return this.request(`/api/playwright/status/${executionId}`);
  }

  /** 실행 결과 조회 */
  async getPlaywrightResult(executionId: string): Promise<BackendApiResponse> {
    return this.request(`/api/playwright/results/${executionId}`);
  }

  // ===== 테스트 설정 관련 메서드들 =====

  /** 모든 테스트 설정 조회 */
  async getTestSettings(): Promise<TestSetting[]> {
    const response = await this.request<TestSetting[]>('/api/test-settings');
    return response.success ? response.data || [] : [];
  }

  /** 특정 테스트 설정 조회 */
  async getTestSettingById(id: number): Promise<TestSetting | null> {
    const response = await this.request<TestSetting>(`/api/test-settings/${id}`);
    return response.success ? response.data || null : null;
  }

  /** 새 테스트 설정 생성 */
  async createTestSetting(data: CreateTestSettingData): Promise<TestSetting> {
    const response = await this.request<TestSetting>('/api/test-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to create test setting');
    }
    return response.data!;
  }

  /** 테스트 설정 업데이트 */
  async updateTestSetting(id: number, data: UpdateTestSettingData): Promise<TestSetting> {
    const response = await this.request<TestSetting>(`/api/test-settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to update test setting');
    }
    return response.data!;
  }

  /** 테스트 설정 삭제 */
  async deleteTestSetting(id: number): Promise<boolean> {
    const response = await this.request(`/api/test-settings/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  /** 카테고리별 테스트 설정 조회 */
  async getTestSettingsByCategory(category: string): Promise<TestSetting[]> {
    const response = await this.request<TestSetting[]>(`/api/test-settings/category/${category}`);
    return response.success ? response.data || [] : [];
  }

  /** 테스트 설정 검색 */
  async searchTestSettings(params: {
    query?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<TestSetting[]> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.append('q', params.query);
    if (params.category) searchParams.append('category', params.category);
    if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    
    const response = await this.request<TestSetting[]>(`/api/test-settings/search?${searchParams.toString()}`);
    return response.success ? response.data || [] : [];
  }

  // ===== 테스트 레이아웃 관련 메서드들 =====

  /** 모든 테스트 레이아웃 조회 */
  async getTestLayouts(): Promise<TestLayout[]> {
    const response = await this.request<TestLayout[]>('/api/test-layouts');
    return response.success ? response.data || [] : [];
  }

  /** 테스트 타입별 레이아웃 조회 */
  async getTestLayoutsByTestType(testType: string): Promise<TestLayout[]> {
    const response = await this.request<TestLayout[]>(`/api/test-layouts/test-type/${testType}`);
    return response.success ? response.data || [] : [];
  }

  /** 특정 레이아웃 조회 */
  async getTestLayoutById(id: number): Promise<TestLayout | null> {
    const response = await this.request<TestLayout>(`/api/test-layouts/${id}`);
    return response.success ? response.data || null : null;
  }

  /** 새 레이아웃 생성 */
  async createTestLayout(data: CreateLayoutData): Promise<TestLayout> {
    const response = await this.request<TestLayout>('/api/test-layouts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to create test layout');
    }
    return response.data!;
  }

  /** 레이아웃 업데이트 */
  async updateTestLayout(id: number, data: UpdateLayoutData): Promise<TestLayout> {
    const response = await this.request<TestLayout>(`/api/test-layouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to update test layout');
    }
    return response.data!;
  }

  /** 레이아웃 삭제 */
  async deleteTestLayout(id: number): Promise<boolean> {
    const response = await this.request(`/api/test-layouts/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }
}

const backendApi = new BackendApiClient();

// ===== 내보내기 함수들 =====

export const checkBackendHealth = () => backendApi.checkHealth();
export const createLoadTest = (config: LoadTestConfig) => backendApi.createLoadTest(config);
export const getTestStatus = (testId: string) => backendApi.getTestStatus(testId);
export const getK6TestStatus = (testId: string) => backendApi.getK6TestStatus(testId);
export const getTestResults = (testId: string) => backendApi.getTestResults(testId);
export const cancelTest = (testId: string, testType?: string) => backendApi.cancelTest(testId, testType);
export const getTotalTestCount = () => backendApi.getTotalTestCount();
export const getAllTestResults = (page?: number, limit?: number, status?: string) => 
  backendApi.getAllTestResults(page, limit, status);
export const getTestResultById = (id: string) => backendApi.getTestResultById(id);
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
  mcp_tool?: string;
  is_locked?: boolean;
  lock_type?: "config" | "execution";
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

// ===== Playwright 단위테스트 전용 내보내기 =====
export const executePlaywrightScenario = (params: {
  scenarioCode: string;
  config?: any;
  userId?: string;
}) => backendApi.executePlaywrightScenario(params);

export const getPlaywrightStatus = (executionId: string) => backendApi.getPlaywrightStatus(executionId);
export const getPlaywrightResult = (executionId: string) => backendApi.getPlaywrightResult(executionId);

// ===== 테스트 설정 관련 함수들 =====

export interface TestSetting {
  id: number;
  name: string;
  category: string;
  value: any;
  description: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestSettingData {
  name: string;
  category: string;
  value: any;
  description?: string;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateTestSettingData {
  name?: string;
  category?: string;
  value?: any;
  description?: string;
  priority?: number;
  isActive?: boolean;
}

export const getTestSettings = async (): Promise<TestSetting[]> => {
  return backendApi.getTestSettings();
};

export const getTestSettingById = async (id: number): Promise<TestSetting | null> => {
  return backendApi.getTestSettingById(id);
};

export const createTestSetting = async (data: CreateTestSettingData): Promise<TestSetting> => {
  return backendApi.createTestSetting(data);
};

export const updateTestSetting = async (id: number, data: UpdateTestSettingData): Promise<TestSetting> => {
  return backendApi.updateTestSetting(id, data);
};

export const deleteTestSetting = async (id: number): Promise<boolean> => {
  return backendApi.deleteTestSetting(id);
};

export const getTestSettingsByCategory = async (category: string): Promise<TestSetting[]> => {
  return backendApi.getTestSettingsByCategory(category);
};

export const searchTestSettings = async (params: {
  query?: string;
  category?: string;
  isActive?: boolean;
}): Promise<TestSetting[]> => {
  return backendApi.searchTestSettings(params);
};

// ===== 테스트 레이아웃 관련 함수들 =====

export interface LayoutField {
  id: number;
  layoutId: number;
  sectionId: number;
  fieldName: string;
  fieldType: string;
  label: string;
  placeholder?: string;
  description?: string;
  isRequired: boolean;
  isVisible: boolean;
  fieldOrder: number;
  fieldWidth: string;
  defaultValue?: string;
  validationRules?: any;
  options?: any;
  conditionalLogic?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LayoutSection {
  id: number;
  layoutId: number;
  sectionName: string;
  sectionTitle: string;
  sectionDescription?: string;
  sectionOrder: number;
  isCollapsible: boolean;
  isExpanded: boolean;
  createdAt: string;
  updatedAt: string;
  fields: LayoutField[];
}

export interface TestLayout {
  id: number;
  testType: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  sections: LayoutSection[];
}

export interface CreateLayoutData {
  testType: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateLayoutData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export const getTestLayouts = async (): Promise<TestLayout[]> => {
  return backendApi.getTestLayouts();
};

export const getTestLayoutsByTestType = async (testType: string): Promise<TestLayout[]> => {
  return backendApi.getTestLayoutsByTestType(testType);
};

export const getTestLayoutById = async (id: number): Promise<TestLayout | null> => {
  return backendApi.getTestLayoutById(id);
};

export const createTestLayout = async (data: CreateLayoutData): Promise<TestLayout> => {
  return backendApi.createTestLayout(data);
};

export const updateTestLayout = async (id: number, data: UpdateLayoutData): Promise<TestLayout> => {
  return backendApi.updateTestLayout(id, data);
};

export const deleteTestLayout = async (id: number): Promise<boolean> => {
  return backendApi.deleteTestLayout(id);
};

// ===== MCP Playwright 관련 함수들 =====
export const convertNaturalLanguageToPlaywright = async (
  naturalLanguage: string, 
  config: any = {}
): Promise<MCPPlaywrightResponse> => {
  const client = new BackendApiClient();
  return client.convertNaturalLanguageToPlaywright(naturalLanguage, config);
};

export const checkMCPPlaywrightStatus = async (): Promise<MCPPlaywrightResponse> => {
  const client = new BackendApiClient();
  return client.checkMCPPlaywrightStatus();
};

export const getMCPPlaywrightPatterns = async (): Promise<MCPPlaywrightResponse> => {
  const client = new BackendApiClient();
  return client.getMCPPlaywrightPatterns();
};