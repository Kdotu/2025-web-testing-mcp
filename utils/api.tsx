import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-96e41890`;

// 데모 모드 설정 (로컬 스토리지에서 관리)
const DEMO_MODE_KEY = 'mcp_demo_mode';
const CONNECTION_RETRY_KEY = 'mcp_connection_retry_count';
const MAX_CONNECTION_RETRIES = 3;

export const isDemoMode = () => {
  try {
    const demoMode = localStorage.getItem(DEMO_MODE_KEY);
    return demoMode === 'true';
  } catch {
    return false;
  }
};

export const setDemoMode = (enabled: boolean) => {
  try {
    localStorage.setItem(DEMO_MODE_KEY, enabled.toString());
    if (enabled) {
      localStorage.setItem(CONNECTION_RETRY_KEY, '0');
    }
  } catch {
    // localStorage 접근 실패시 무시
  }
};

const getRetryCount = () => {
  try {
    const count = localStorage.getItem(CONNECTION_RETRY_KEY);
    return parseInt(count || '0');
  } catch {
    return 0;
  }
};

const incrementRetryCount = () => {
  try {
    const count = getRetryCount() + 1;
    localStorage.setItem(CONNECTION_RETRY_KEY, count.toString());
    return count;
  } catch {
    return 1;
  }
};

const resetRetryCount = () => {
  try {
    localStorage.setItem(CONNECTION_RETRY_KEY, '0');
  } catch {
    // 무시
  }
};

// 테스트 타입 정의
export interface TestType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// 연결 상태 체크를 위한 유틸리티 함수
const isNetworkError = (error: any): boolean => {
  return error instanceof TypeError && error.message.includes('Failed to fetch');
};

const logConnectionError = (operation: string, error: any, retryCount: number) => {
  // AbortError는 정상적인 요청 취소이므로 로그를 남기지 않음
  if (error.name === 'AbortError') {
    return;
  }
  
  if (isNetworkError(error)) {
    if (retryCount <= 1) {
      console.log(`[${operation}]: Supabase Edge Functions 연결 시도 중..`);
    } else if (retryCount >= MAX_CONNECTION_RETRIES) {
      console.log(`[${operation}]: 데모 모드로 전환 (Edge Functions 미배포)`);
      console.log('[배포 전 기능을 사용하려면 deploy-guide.md를 참조하여 Supabase에 배포하세요]');
    }
  } else {
    console.error(`[${operation} 실행 중 오류]:`, error);
  }
};

// API 헬스 체크
export const checkApiHealth = async () => {
  // 데모 모드가 활성화되면 즉시 오프라인 모드로 전환
  if (isDemoMode()) {
    return { 
      success: false, 
      error: 'Demo mode enabled',
      offline: true,
      demo: true,
      message: '데모 모드 활성화됨 - 모든 기능은 로컬에서 실행됩니다.'
    };
  }

  const retryCount = getRetryCount();
  
  // 최대 시도 횟수를 초과한 경우 자동으로 데모 모드 활성화
  if (retryCount >= MAX_CONNECTION_RETRIES) {
    setDemoMode(true);
    return { 
      success: false, 
      error: 'Max retries exceeded',
      offline: true,
      demo: true,
      message: '자동으로 데모 모드로 전환되었습니다. 모든 기능은 로컬에서 사용하실 수 있습니다.'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃으로 단축
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    resetRetryCount(); // 성공시 카운터 리셋
    console.log('[Supabase Edge Functions 연결 성공]');
    return data;
  } catch (error: any) {
    const newRetryCount = incrementRetryCount();
    logConnectionError('API 헬스 체크', error, newRetryCount);
    
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        error: 'Connection timeout',
        offline: true,
        retryCount: newRetryCount,
        message: newRetryCount >= MAX_CONNECTION_RETRIES 
          ? '연결 시간 초과 - 데모 모드로 전환합니다.'
          : '연결 시간 초과 - 재시도 중..'
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      offline: isNetworkError(error),
      retryCount: newRetryCount,
      message: isNetworkError(error) 
        ? (newRetryCount >= MAX_CONNECTION_RETRIES 
          ? 'Supabase Edge Functions에 연결할 수 없습니다. 데모 모드로 전환합니다.'
          : 'Supabase Edge Functions 연결 시도 중..')
        : `API 연결 실패: ${error.message}`
    };
  }
};

// 데이터베이스 상태 확인
export const checkDatabaseStatus = async () => {
  if (isDemoMode()) {
    return { 
      success: false, 
      error: 'Demo mode enabled',
      offline: true,
      demo: true,
      message: '데모 모드: 로컬 스토리지를 사용합니다.'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_BASE_URL}/db-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[데이터베이스 연결 성공]');
    return data;
  } catch (error: any) {
    logConnectionError('데이터베이스 상태 체크', error, getRetryCount());
    
    // AbortError는 요청 취소이므로 별도 응답 반환
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        error: 'Connection timeout',
        offline: true,
        message: '연결 시간 초과'
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      offline: isNetworkError(error),
      message: isNetworkError(error) 
        ? '데이터베이스 연결 불가 - 로컬 스토리지를 사용합니다.'
        : `데이터베이스 연결 실패: ${error.message}`
    };
  }
};

// 오프라인 모드를 위한 로컬 스토리지 헬퍼
const OFFLINE_STORAGE_KEY = 'mcp_tester_offline_data';

const getOfflineData = () => {
  try {
    const data = localStorage.getItem(OFFLINE_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const setOfflineData = (key: string, value: any) => {
  try {
    const data = getOfflineData();
    data[key] = value;
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('로컬 스토리지 저장 실패:', error);
  }
};

// 테스트 실행
export const executeTest = async (url: string, testType: string, settings: any) => {
  if (isDemoMode()) {
    const mockTestId = `demo_test_${Date.now()}`;
    console.log('[데모 모드: 가짜 테스트를 실행합니다]');
    
    return {
      success: true,
      testId: mockTestId,
      message: '데모 모드에서 가짜 테스트가 실행됩니다.',
      demo: true
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    const response = await fetch(`${API_BASE_URL}/execute-test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, testType, settings }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    logConnectionError('테스트 실행', error, getRetryCount());
    
    // AbortError 처리
    if (error.name === 'AbortError') {
      const mockTestId = `timeout_test_${Date.now()}`;
      return {
        success: true,
        testId: mockTestId,
        message: '연결 시간 초과 - 오프라인 모드로 실행합니다.',
        offline: true
      };
    }
    
    if (isNetworkError(error)) {
      const mockTestId = `offline_test_${Date.now()}`;
      console.log('[오프라인 모드에서 가짜 테스트를 실행합니다]');
      
      return {
        success: true,
        testId: mockTestId,
        message: '오프라인 모드에서 가짜 테스트가 실행됩니다.',
        offline: true
      };
    }
    
    return { success: false, error: error.message };
  }
};

// 테스트 상태 조회
export const getTestStatus = async (testId: string) => {
  if (isDemoMode() || testId.startsWith('demo_test_') || testId.startsWith('offline_test_')) {
    const startTime = parseInt(testId.split('_')[2]) || Date.now();
    const elapsed = Date.now() - startTime;
    const progress = Math.min(100, Math.floor(elapsed / 100));
    
    return {
      success: true,
      data: {
        id: testId,
        progress: progress,
        status: progress >= 100 ? 'completed' : 'running',
        logs: [
          `${new Date().toLocaleTimeString()} - ${isDemoMode() ? '데모' : '오프라인'} 가짜 진행 중.. (${progress}%)`
        ]
      }
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8초 타임아웃
    
    const response = await fetch(`${API_BASE_URL}/test-status/${testId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    logConnectionError('테스트 상태 조회', error, getRetryCount());
    
    // AbortError 처리
    if (error.name === 'AbortError') {
      return { success: false, error: 'Connection timeout', message: '연결 시간 초과' };
    }
    
    return { success: false, error: error.message };
  }
};

// 모든 테스트 결과 조회
export const getTestResults = async () => {
  if (isDemoMode()) {
    const demoResults = [
      {
        id: "demo_1",
        url: "https://example.com",
        testType: "performance",
        status: "completed",
        score: 92,
        startTime: new Date(Date.now() - 3600000).toISOString(),
        progress: 100,
        logs: ["데모 테스트 완료"]
      },
      {
        id: "demo_2",
        url: "https://demo-site.com", 
        testType: "lighthouse",
        status: "completed",
        score: 88,
        startTime: new Date(Date.now() - 7200000).toISOString(),
        progress: 100,
        logs: ["데모 테스트 완료"]
      }
    ];
    
    return {
      success: true,
      data: demoResults,
      demo: true,
      message: '데모 모드: 샘플 테스트 결과를 표시합니다.'
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/test-results`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      setOfflineData('testResults', data.data);
    }
    
    return data;
  } catch (error: any) {
    logConnectionError('테스트 결과 조회', error, getRetryCount());
    
    if (isNetworkError(error)) {
      const offlineData = getOfflineData();
      console.log('[로컬 스토리지에서 테스트 결과를 불러옵니다]');
      
      return {
        success: true,
        data: offlineData.testResults || [],
        offline: true,
        message: '오프라인 모드: 로컬 스토리지에 저장된 데이터를 표시합니다.'
      };
    }
    
    return { success: false, error: error.message };
  }
};

// 나머지 함수들도 동일하게 오프라인 모드 지원...
export const stopTest = async (testId: string) => {
  if (isDemoMode() || testId.startsWith('demo_test_') || testId.startsWith('offline_test_')) {
    return {
      success: true,
      message: `${isDemoMode() ? '데모' : '오프라인'} 모드에서 테스트를 중지했습니다.`,
      demo: isDemoMode(),
      offline: !isDemoMode()
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/stop-test/${testId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    logConnectionError('테스트 중지', error, getRetryCount());
    
    if (isNetworkError(error)) {
      return {
        success: true,
        message: '오프라인 모드에서 테스트를 중지했습니다.',
        offline: true
      };
    }
    
    return { success: false, error: error.message };
  }
};

// 설정 저장
export const saveSettings = async (settings: any) => {
  if (isDemoMode()) {
    setOfflineData('settings', settings);
    console.log('[데모 모드: 설정을 로컬 스토리지에 저장했습니다]');
    
    return {
      success: true,
      message: '데모 모드: 설정이 로컬에 저장되었습니다.',
      demo: true
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/save-settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      setOfflineData('settings', settings);
    }
    
    return data;
  } catch (error: any) {
    logConnectionError('설정 저장', error, getRetryCount());
    
    if (isNetworkError(error)) {
      setOfflineData('settings', settings);
      console.log('[오프라인 모드: 설정을 로컬 스토리지에 저장했습니다]');
      
      return {
        success: true,
        message: '오프라인 모드: 설정이 로컬에 저장되었습니다.',
        offline: true
      };
    }
    
    return { success: false, error: error.message };
  }
};

// 설정 불러오기
export const getSettings = async () => {
  if (isDemoMode()) {
    const offlineData = getOfflineData();
    return {
      success: true,
      data: offlineData.settings || null,
      demo: true,
      message: '데모 모드: 로컬 스토리지의 설정을 표시합니다.'
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/get-settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      setOfflineData('settings', data.data);
    }
    
    return data;
  } catch (error: any) {
    logConnectionError('설정 불러오기', error, getRetryCount());
    
    if (isNetworkError(error)) {
      const offlineData = getOfflineData();
      console.log('[로컬 스토리지에서 설정을 불러옵니다]');
      
      return {
        success: true,
        data: offlineData.settings || null,
        offline: true,
        message: '오프라인 모드: 로컬 스토리지의 설정을 표시합니다.'
      };
    }
    
    return { success: false, error: error.message };
  }
};

// 테스트 타입 목록 조회
export const getTestTypes = async () => {
  const defaultTestTypes = [
    { id: "performance", name: "성능 테스트", description: "페이지 로딩 속도 및 성능 측정", enabled: true },
    { id: "lighthouse", name: "Lighthouse", description: "웹페이지 품질 종합 분석", enabled: true },
    { id: "load", name: "부하 테스트", description: "동시 접속 및 부하 처리 능력 측정", enabled: true },
    { id: "security", name: "보안 테스트", description: "웹사이트 보안 취약점 검사", enabled: true },
    { id: "accessibility", name: "접근성 테스트", description: "웹 접근성 준수 검사", enabled: true },
  ];

  if (isDemoMode()) {
    return {
      success: true,
      data: defaultTestTypes,
      demo: true,
      message: '데모 모드: 기본 테스트 타입을 표시합니다.'
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/test-types`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      setOfflineData('testTypes', data.data);
    }
    
    return data;
  } catch (error: any) {
    logConnectionError('테스트 타입 조회', error, getRetryCount());
    
    if (isNetworkError(error)) {
      const offlineData = getOfflineData();
      
      return {
        success: true,
        data: offlineData.testTypes || defaultTestTypes,
        offline: true,
        message: '오프라인 모드: 기본 테스트 타입을 표시합니다.'
      };
    }
    
    return { success: false, error: error.message };
  }
};

// 나머지 테스트 타입 관리 함수들... (간단한 버전)
export const updateTestTypes = async (testTypes: any[]) => {
  if (isDemoMode()) {
    setOfflineData('testTypes', testTypes);
    return { success: true, message: '데모 모드: 테스트 타입이 로컬에 저장되었습니다.', demo: true };
  }
  // 실제 API 호출 로직...
  return { success: false, error: 'Not implemented in demo' };
};

export const addTestType = async (testType: any) => {
  if (isDemoMode()) {
    const offlineData = getOfflineData();
    const currentTypes = offlineData.testTypes || [];
    const updatedTypes = [...currentTypes, testType];
    setOfflineData('testTypes', updatedTypes);
    return { success: true, message: '데모 모드: 테스트 타입이 로컬에 추가되었습니다.', data: testType, demo: true };
  }
  return { success: false, error: 'Not implemented in demo' };
};

export const updateTestType = async (id: string, testType: any) => {
  if (isDemoMode()) {
    return { success: true, message: '데모 모드: 테스트 타입이 로컬에서 수정되었습니다.', data: testType, demo: true };
  }
  return { success: false, error: 'Not implemented in demo' };
};

export const deleteTestType = async (id: string) => {
  if (isDemoMode()) {
    return { success: true, message: '데모 모드: 테스트 타입이 로컬에서 삭제되었습니다.', demo: true };
  }
  return { success: false, error: 'Not implemented in demo' };
};

// 별칭 함수들 (기존 컴포넌트와의 호환성을 위해)
export const getAllTestResults = getTestResults;
export const saveTestSettings = saveSettings;
export const getTestSettings = getSettings;

// 연결 상태 디버깅을 위한 유틸리티
export const getConnectionInfo = () => {
  return {
    apiUrl: API_BASE_URL,
    projectId,
    hasAnonKey: !!publicAnonKey,
    demoMode: isDemoMode(),
    retryCount: getRetryCount(),
    maxRetries: MAX_CONNECTION_RETRIES,
    timestamp: new Date().toISOString()
  };
};

// 개발용 디버깅 헬퍼 함수
if (typeof window !== 'undefined') {
  (window as any).mcpDebug = {
    getConnectionInfo,
    checkApiHealth,
    checkDatabaseStatus,
    isDemoMode,
    setDemoMode,
    clearOfflineData: () => {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
      localStorage.removeItem(DEMO_MODE_KEY);
      localStorage.removeItem(CONNECTION_RETRY_KEY);
      console.log('[모든 로컬 데이터를 삭제했습니다]');
    },
    getOfflineData,
    resetRetryCount,
    apiUrl: API_BASE_URL
  };
}