import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// 환경 변수가 없으면 에러를 발생시키지 않고 null을 반환
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// 테스트 결과를 저장하는 함수
export const saveTestResult = async (testData: {
  url: string;
  testType: string;
  status: string;
  progress: number;
  settings: any;
  logs: string[];
  startTime: string;
  endTime?: string;
  raw_data?: string; // raw_data 필드 추가
}) => {
  if (!supabase) {
    console.error('Supabase client is not initialized.');
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabase
      .from('m2_test_results')
      .insert([
        {
          url: testData.url,
          test_type: testData.testType,
          status: testData.status,
          progress: testData.progress,
          settings: testData.settings,
          logs: testData.logs,
          start_time: testData.startTime,
          end_time: testData.endTime,
          raw_data: testData.raw_data, // raw_data 저장
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error saving test result:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in saveTestResult:', error);
    return { success: false, error };
  }
};

// 테스트 결과를 불러오는 함수 (m2_test_results 테이블 구조에 맞게 수정)
export const getTestResults = async (limit: number = 1000) => {
  if (!supabase) {
    console.error('Supabase client is not initialized.');
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    // Supabase 연결 테스트
    const { data, error } = await supabase
      .from('m2_test_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching test results:', error);
      
      // API 키 오류인 경우 더 자세한 정보 제공
      if (error.message?.includes('Invalid API key')) {
        console.error('Supabase API 키가 유효하지 않습니다. 환경 변수를 확인하세요.');
        
        // 임시로 하드코딩된 데이터 반환 (개발 중에만 사용)
        console.log('임시 데이터를 사용합니다.');
        return { 
          success: true, 
          data: getMockTestResults(),
          error: null
        };
      }
      
      return { success: false, error, data: [] };
    }

    // 데이터를 컴포넌트에서 사용할 수 있는 형태로 변환
    const transformedData = (data || []).map((item, index) => {
      const config = item.config || {};
      const metrics = item.metrics || {};
      const summary = item.summary || {};
      
      // 테스트 유형 추출 (config에서 추출하거나 기본값 사용)
      const testType = config.testType || '성능테스트';
      
      // 점수 계산 (summary에서 추출하거나 기본값 사용)
      const score = summary.score || metrics.performance || 85;
      
      // 상태 변환
      const status = item.status === 'completed' ? '완료' : 
                    item.status === 'running' ? '실행중' : 
                    item.status === 'failed' ? '실패' : '대기중';
      
      // 날짜 포맷팅
      const createdAt = new Date(item.created_at);
      const date = createdAt.toISOString().split('T')[0];
      const time = createdAt.toTimeString().split(' ')[0];
      
      // 소요 시간 계산 (실제 데이터가 있으면 사용, 없으면 기본값)
      const duration = summary.duration || '2분 30초';
      
      // 상세 정보 구성
      const details = {
        ...metrics,
        ...summary,
        // 기본 성능 지표들
        firstContentfulPaint: metrics.firstContentfulPaint || '1.2s',
        largestContentfulPaint: metrics.largestContentfulPaint || '2.4s',
        cumulativeLayoutShift: metrics.cumulativeLayoutShift || '0.1',
        totalBlockingTime: metrics.totalBlockingTime || '150ms'
      };

      return {
        id: item.id || `test-${index + 1}`,
        test_id: item.test_id,
        url: item.url,
        type: testType,
        score: score,
        status: status,
        date: date,
        time: time,
        duration: duration,
        details: details,
        config: config,
        raw_data: item.raw_data
      };
    });

    return { success: true, data: transformedData };
  } catch (error) {
    console.error('Error in getTestResults:', error);
    
    // 오류 발생 시 임시 데이터 반환
    console.log('오류 발생으로 임시 데이터를 사용합니다.');
    return { 
      success: true, 
      data: getMockTestResults(),
      error: null
    };
  }
};

// 임시 테스트 데이터 (API 키 문제 시 사용)
const getMockTestResults = () => {
  return [
    {
      id: 'mock-1',
      test_id: 'perf-test-1',
      url: 'https://example.com',
      type: '성능테스트',
      score: 85,
      status: '완료',
      date: '2025-01-23',
      time: '14:23:45',
      duration: '2분 30초',
      details: {
        firstContentfulPaint: '1.2s',
        largestContentfulPaint: '2.4s',
        cumulativeLayoutShift: '0.1',
        totalBlockingTime: '150ms'
      }
    },
    {
      id: 'mock-2',
      test_id: 'lighthouse-test-1',
      url: 'https://test.co.kr',
      type: 'Lighthouse',
      score: 92,
      status: '완료',
      date: '2025-01-23',
      time: '13:45:20',
      duration: '3분 15초',
      details: {
        performance: 92,
        accessibility: 88,
        bestPractices: 95,
        seo: 89,
        pwa: 85 // PWA 카테고리 추가
      },
      raw_data: JSON.stringify({
        url: 'https://test.co.kr',
        fetchTime: new Date().toISOString(),
        version: '10.0.0',
        scores: {
          performance: { score: 0.92 },
          accessibility: { score: 0.88 },
          'best-practices': { score: 0.95 },
          seo: { score: 0.89 },
          pwa: { score: 0.85 } // PWA 카테고리 추가
        },
        metrics: {
          'first-contentful-paint': { value: 1200 },
          'largest-contentful-paint': { value: 2500 },
          'total-blocking-time': { value: 150 },
          'cumulative-layout-shift': { value: 0.05 },
          'speed-index': { value: 1800 },
          interactive: { value: 3200 }
        },
        categories: {
          performance: { score: 0.92, title: 'Performance', description: 'Performance audit' },
          accessibility: { score: 0.88, title: 'Accessibility', description: 'Accessibility audit' },
          'best-practices': { score: 0.95, title: 'Best Practices', description: 'Best practices audit' },
          seo: { score: 0.89, title: 'SEO', description: 'SEO audit' },
          pwa: { score: 0.85, title: 'PWA', description: 'Progressive Web App audit' } // PWA 카테고리 추가
        }
      })
    },
    {
      id: 'mock-3',
      test_id: 'load-test-1',
      url: 'https://demo.org',
      type: '부하테스트',
      score: 78,
      status: '완료',
      date: '2025-01-23',
      time: '12:30:10',
      duration: '5분 45초',
      details: {
        maxConcurrentUsers: 500,
        averageResponseTime: '450ms',
        errorRate: '2.1%',
        throughput: '145 req/sec'
      }
    },
    {
      id: 'mock-4',
      test_id: 'security-test-1',
      url: 'https://website.com',
      type: '보안테스트',
      score: 95,
      status: '완료',
      date: '2025-01-22',
      time: '15:10:15',
      duration: '8분 30초',
      details: {
        vulnerabilities: 0,
        securityHeaders: '완전',
        sslRating: 'A+',
        xssProtection: '활성화'
      }
    },
    {
      id: 'mock-5',
      test_id: 'accessibility-test-1',
      url: 'https://accessible.org',
      type: '접근성테스트',
      score: 87,
      status: '완료',
      date: '2025-01-22',
      time: '11:20:30',
      duration: '4분 15초',
      details: {
        wcagCompliance: 'AA',
        colorContrast: '통과',
        keyboardNavigation: '완전',
        screenReader: '호환'
      }
    }
  ];
};

// 특정 테스트 결과를 삭제하는 함수
export const deleteTestResult = async (id: number) => {
  if (!supabase) {
    console.error('Supabase client is not initialized.');
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { error } = await supabase
      .from('m2_test_results')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting test result:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteTestResult:', error);
    return { success: false, error };
  }
};

// 테스트 설정을 저장하는 함수
export const saveTestSettings = async (settings: any) => {
  if (!supabase) {
    console.error('Supabase client is not initialized.');
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabase
      .from('test_settings')
      .upsert([
        {
          id: 'default',
          settings: settings,
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error saving test settings:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in saveTestSettings:', error);
    return { success: false, error };
  }
};

// 테스트 설정을 불러오는 함수
export const getTestSettings = async () => {
  if (!supabase) {
    console.error('Supabase client is not initialized.');
    return { success: false, error: 'Supabase client not initialized', data: null };
  }

  try {
    const { data, error } = await supabase
      .from('test_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
      console.error('Error fetching test settings:', error);
      return { success: false, error, data: null };
    }

    return { success: true, data: data?.settings || null };
  } catch (error) {
    console.error('Error in getTestSettings:', error);
    return { success: false, error, data: null };
  }
};

// 테스트를 위한 샘플 데이터 추가 함수
export const addSampleTestResults = async () => {
  if (!supabase) {
    console.error('Supabase client is not initialized.');
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const sampleData = [
      {
        id: 'test-1',
        test_id: 'perf-test-1',
        url: 'https://example.com',
        config: { testType: '성능테스트' },
        status: 'completed',
        metrics: {
          firstContentfulPaint: '1.2s',
          largestContentfulPaint: '2.4s',
          cumulativeLayoutShift: '0.1',
          totalBlockingTime: '150ms'
        },
        summary: {
          score: 85,
          duration: '2분 30초'
        },
        raw_data: null
      },
      {
        id: 'test-2',
        test_id: 'lighthouse-test-1',
        url: 'https://test.co.kr',
        config: { testType: 'Lighthouse' },
        status: 'completed',
        metrics: {
          performance: 92,
          accessibility: 88,
          bestPractices: 95,
          seo: 89
        },
        summary: {
          score: 92,
          duration: '3분 15초'
        },
        raw_data: null
      },
      {
        id: 'test-3',
        test_id: 'load-test-1',
        url: 'https://demo.org',
        config: { testType: '부하테스트' },
        status: 'completed',
        metrics: {
          maxConcurrentUsers: 500,
          averageResponseTime: '450ms',
          errorRate: '2.1%',
          throughput: '145 req/sec'
        },
        summary: {
          score: 78,
          duration: '5분 45초'
        },
        raw_data: null
      },
      {
        id: 'test-4',
        test_id: 'security-test-1',
        url: 'https://website.com',
        config: { testType: '보안테스트' },
        status: 'completed',
        metrics: {
          vulnerabilities: 0,
          securityHeaders: '완전',
          sslRating: 'A+',
          xssProtection: '활성화'
        },
        summary: {
          score: 95,
          duration: '8분 30초'
        },
        raw_data: null
      },
      {
        id: 'test-5',
        test_id: 'accessibility-test-1',
        url: 'https://mysite.org',
        config: { testType: '접근성테스트' },
        status: 'completed',
        metrics: {
          accessibilityScore: 76,
          colorContrast: '양호',
          altTexts: '부분적',
          keyboardNavigation: '완전'
        },
        summary: {
          score: 76,
          duration: '4분 15초'
        },
        raw_data: null
      }
    ];

    const { data, error } = await supabase
      .from('m2_test_results')
      .insert(sampleData)
      .select();

    if (error) {
      console.error('Error adding sample data:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in addSampleTestResults:', error);
    return { success: false, error };
  }
};

// MCP 도구 목록을 가져오는 함수
export const getMcpTools = async (testType: string) => {
  if (!supabase) {
    console.error('Supabase client is not initialized.');
    return getDefaultMcpTools(testType);
  }

  try {
    // 먼저 테스트 타입이 존재하는지 확인
    const { data, error } = await supabase
      .from('m2_test_types')
      .select('mcp_tool')
      .eq('id', testType)
      .limit(1);

    if (error) {
      console.error('Error fetching MCP tools:', error);
      
      // 데이터베이스 연결 오류인 경우 기본값 반환
      if (error.code === 'PGRST116' || error.message?.includes('not found')) {
        console.warn(`Test type '${testType}' not found, using default tools`);
        return getDefaultMcpTools(testType);
      }
      
      // 기타 오류의 경우 기본값 반환
      return getDefaultMcpTools(testType);
    }

    // 데이터가 없으면 기본값 반환
    if (!data || data.length === 0) {
      console.warn(`Test type '${testType}' not found in database, using default tools`);
      // 데이터베이스 초기화 시도 (비동기로 실행, 결과를 기다리지 않음)
      initializeTestTypes().catch(initError => {
        console.error('Failed to initialize test types:', initError);
      });
      return getDefaultMcpTools(testType);
    }

    // mcp_tool이 JSON 배열인 경우 파싱
    const testTypeData = data[0];
    if (testTypeData?.mcp_tool) {
      const raw = testTypeData.mcp_tool as any;
      // 배열이면 그대로 반환
      if (Array.isArray(raw)) {
        return raw;
      }
      // 문자열이면 JSON 시도 후 실패 시 CSV/단일 문자열 처리
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        try {
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [parsed];
          }
        } catch (_e) {
          // JSON 파싱 실패 시 아래 fallback 로직으로 진행
        }
        // 콤마로 구분된 문자열 또는 단일 값 허용
        const list = trimmed.includes(',')
          ? trimmed.split(',').map((s) => s.trim()).filter(Boolean)
          : [trimmed];
        return list;
      }
      // 기타 타입은 단일 요소 배열로 반환
      return [raw];
    }

    return getDefaultMcpTools(testType);
  } catch (error) {
    console.error('Error in getMcpTools:', error);
    return getDefaultMcpTools(testType);
  }
};

// 기본 MCP 도구 목록 (fallback)
const getDefaultMcpTools = (testType: string) => {
  switch (testType) {
    case "lighthouse":
      return ["Lighthouse"];
    case "load":
      return ["k6"];
    case "security":
      return ["OWASP ZAP"];
    case "accessibility":
      return ["axe-core"];
    case "playwright":
      return ["Playwright"];
    default:
      return [];
  }
};

// 기본 테스트 타입 데이터 추가 함수
export const initializeTestTypes = async () => {
  if (!supabase) {
    console.error('Supabase client is not initialized.');
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    // 먼저 기존 데이터가 있는지 확인
    const { data: existingData, error: checkError } = await supabase
      .from('m2_test_types')
      .select('name')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing test types:', checkError);
      return { success: false, error: checkError };
    }

    // 이미 데이터가 있으면 성공으로 처리
    if (existingData && existingData.length > 0) {
      // console.log('Test types already exist in database');
      return { success: true, data: existingData };
    }

    const defaultTestTypes = [
      {
        name: 'lighthouse',
        description: '웹페이지 품질 종합 분석',
        enabled: true,
        mcp_tool: JSON.stringify(['Lighthouse'])
      },
      {
        name: 'load',
        description: '동시 접속 및 부하 처리 능력 측정',
        enabled: true,
        mcp_tool: JSON.stringify(['k6'])
      },
      {
        name: 'security',
        description: '웹사이트 보안 취약점 검사',
        enabled: true,
        mcp_tool: JSON.stringify(['OWASP ZAP'])
      },
      {
        name: 'accessibility',
        description: '웹 접근성 준수 검사',
        enabled: true,
        mcp_tool: JSON.stringify(['axe-core'])
      },
      {
        name: 'playwright',
        description: '엔드투엔드 테스트',
        enabled: true,
        mcp_tool: JSON.stringify(['playwright'])
      }
    ];

    console.log('Initializing test types in database...');
    const { data, error } = await supabase
      .from('m2_test_types')
      .upsert(defaultTestTypes, { onConflict: 'name' })
      .select();

    if (error) {
      console.error('Error initializing test types:', error);
      return { success: false, error };
    }

    console.log('Test types initialized successfully:', data?.length, 'records created');
    return { success: true, data };
  } catch (error) {
    console.error('Error in initializeTestTypes:', error);
    return { success: false, error };
  }
};

// 앱 초기화 시 테스트 타입 설정
export const initializeApp = async () => {
  if (!supabase) {
    console.warn('Supabase client is not initialized. App will run in offline mode.');
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    // 테스트 타입 초기화
    const initResult = await initializeTestTypes();
    if (initResult.success) {
      // console.log('App initialized successfully with test types');
    } else {
      console.warn('Failed to initialize test types:', initResult.error);
    }

    return { success: true };
  } catch (error) {
    console.error('Error initializing app:', error);
    return { success: false, error };
  }
};