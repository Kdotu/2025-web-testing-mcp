// 로컬 스토리지 기반 데이터 관리 유틸리티

export interface LocalTestType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface LocalTestResult {
  id: string;
  url: string;
  testType: string;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  logs: string[];
  settings: any;
}

export interface LocalTestSettings {
  [key: string]: any;
}

// 기본 테스트 유형
const DEFAULT_TEST_TYPES: LocalTestType[] = [
  { id: "performance", name: "성능테스트", description: "페이지 로딩 속도 및 성능 측정", enabled: true },
  { id: "lighthouse", name: "Lighthouse", description: "웹페이지 품질 종합 평가", enabled: true },
  { id: "load", name: "부하테스트", description: "동시 접속자 부하 처리 능력 측정", enabled: true },
  { id: "security", name: "보안테스트", description: "웹사이트 보안 취약점 검사", enabled: true },
  { id: "accessibility", name: "접근성테스트", description: "웹 접근성 표준 준수 검사", enabled: true },
];

// 로컬 스토리지 키
const STORAGE_KEYS = {
  TEST_TYPES: 'mcp_tester_test_types',
  m2_test_results: 'mcp_tester_m2_test_results',
  TEST_SETTINGS: 'mcp_tester_test_settings',
};

// 안전한 JSON 파싱
function safeJsonParse<T>(str: string | null, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

// 테스트 유형 관리
export const localTestTypes = {
  getAll: (): LocalTestType[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.TEST_TYPES);
    return safeJsonParse(stored, DEFAULT_TEST_TYPES);
  },

  setAll: (testTypes: LocalTestType[]): void => {
    localStorage.setItem(STORAGE_KEYS.TEST_TYPES, JSON.stringify(testTypes));
  },

  add: (testType: LocalTestType): boolean => {
    const existing = localTestTypes.getAll();
    if (existing.find(t => t.id === testType.id)) {
      return false; // 이미 존재
    }
    existing.push(testType);
    localTestTypes.setAll(existing);
    return true;
  },

  update: (id: string, updates: Partial<LocalTestType>): boolean => {
    const existing = localTestTypes.getAll();
    const index = existing.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    existing[index] = { ...existing[index], ...updates };
    localTestTypes.setAll(existing);
    return true;
  },

  delete: (id: string): boolean => {
    const existing = localTestTypes.getAll();
    const filtered = existing.filter(t => t.id !== id);
    if (filtered.length === existing.length) return false;
    
    localTestTypes.setAll(filtered);
    return true;
  },
};

// 테스트 결과 관리
export const localTestResults = {
  getAll: (): LocalTestResult[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.m2_test_results);
    return safeJsonParse(stored, []);
  },

  setAll: (results: LocalTestResult[]): void => {
    localStorage.setItem(STORAGE_KEYS.m2_test_results, JSON.stringify(results));
  },

  add: (result: LocalTestResult): void => {
    const existing = localTestResults.getAll();
    existing.push(result);
    localTestResults.setAll(existing);
  },

  update: (id: string, updates: Partial<LocalTestResult>): boolean => {
    const existing = localTestResults.getAll();
    const index = existing.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    existing[index] = { ...existing[index], ...updates };
    localTestResults.setAll(existing);
    return true;
  },

  delete: (id: string): boolean => {
    const existing = localTestResults.getAll();
    const filtered = existing.filter(r => r.id !== id);
    if (filtered.length === existing.length) return false;
    
    localTestResults.setAll(filtered);
    return true;
  },

  deleteAll: (): void => {
    localStorage.removeItem(STORAGE_KEYS.m2_test_results);
  },
};

// 테스트 설정 관리
export const localTestSettings = {
  get: (): LocalTestSettings => {
    const stored = localStorage.getItem(STORAGE_KEYS.TEST_SETTINGS);
    return safeJsonParse(stored, {});
  },

  set: (settings: LocalTestSettings): void => {
    localStorage.setItem(STORAGE_KEYS.TEST_SETTINGS, JSON.stringify(settings));
  },

  update: (updates: Partial<LocalTestSettings>): void => {
    const existing = localTestSettings.get();
    const updated = { ...existing, ...updates };
    localTestSettings.set(updated);
  },

  clear: (): void => {
    localStorage.removeItem(STORAGE_KEYS.TEST_SETTINGS);
  },
};

// 모든 로컬 데이터 초기화
export const clearAllLocalData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// 로컬 데이터 내보내기 (백업용)
export const exportLocalData = () => {
  return {
    testTypes: localTestTypes.getAll(),
    testResults: localTestResults.getAll(),
    testSettings: localTestSettings.get(),
    exportDate: new Date().toISOString(),
  };
};

// 로컬 데이터 가져오기 (복원용)
export const importLocalData = (data: any): boolean => {
  try {
    if (data.testTypes) localTestTypes.setAll(data.testTypes);
    if (data.testResults) localTestResults.setAll(data.testResults);
    if (data.testSettings) localTestSettings.set(data.testSettings);
    return true;
  } catch {
    return false;
  }
};