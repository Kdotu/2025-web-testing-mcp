import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from 'https://deno.land/x/hono@v3.12.11/middleware.ts';
import { Hono } from 'https://deno.land/x/hono@v3.12.11/mod.ts';
import * as kv from './kv_store.tsx';

const app = new Hono();

// CORS 설정
app.use('*', cors({
  origin: ['http://localhost:3100', 'https://ihubdmrqggwusivtopsi.supabase.co'],
  credentials: true,
}));

// Supabase 클라이언트 초기화
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// 데이터베이스 초기화 함수
async function initializeDatabase() {
  console.log('🚀 데이터베이스 초기화 시작...');
  
  try {
    // kv_store_96e41890 테이블 생성
    const createKVTableSQL = `
      CREATE TABLE IF NOT EXISTS public.kv_store_96e41890 (
        key TEXT NOT NULL PRIMARY KEY,
        value JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
    `;
    
    const { error: kvTableError } = await supabase.rpc('exec_sql', { 
      sql: createKVTableSQL 
    });
    
    if (kvTableError) {
      console.log('⚠️  KV 테이블 생성 오류 (이미 존재함):', kvTableError.message);
      // 테이블이 이미 존재하는 경우는 오류를 무시
    } else {
      console.log('✅ KV 테이블 생성 완료');
    }
    
    // 기본 설정 테이블 초기화
    const defaultSettings = {
      performance: { timeout: 30000, mobile: false },
      lighthouse: { categories: ['performance', 'accessibility', 'best-practices', 'seo'] },
      load: { users: 10, duration: 60 },
      security: { depth: 'medium' },
      accessibility: { level: 'AA' }
    };
    
    // 기존 설정이 없으면 기본 설정
    const existingSettings = await kv.get('test-settings').catch(() => null);
    if (!existingSettings) {
      await kv.set('test-settings', defaultSettings);
      console.log('✅ 기본 테스트 설정 초기화 완료');
    }
    
    // 기본 테스트 타입 초기화
    const defaultTestTypes = [
      { id: "performance", name: "성능 테스트", description: "페이지 로딩 속도 및 성능 측정", enabled: true },
      { id: "lighthouse", name: "Lighthouse", description: "웹페이지 품질 종합 분석", enabled: true },
      { id: "load", name: "부하 테스트", description: "동시 접속 및 부하 처리 능력 측정", enabled: true },
      { id: "security", name: "보안 테스트", description: "웹사이트 보안 취약점 검사", enabled: true },
      { id: "accessibility", name: "접근성 테스트", description: "웹 접근성 준수 검사", enabled: true },
    ];
    
    const existingTestTypes = await kv.get('m2_test_types').catch(() => null);
    if (!existingTestTypes) {
      await kv.set('m2_test_types', defaultTestTypes);
      console.log('✅ 기본 테스트 타입 초기화 완료');
    }
    
    console.log('🚀 데이터베이스 초기화 성공');
    
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    
    // exec_sql 함수가 없는 경우, 직접 SQL 실행 시도
    try {
      console.log('🔄 대체 방법으로 테이블 생성 시도...');
      
      // 직접 테이블 존재 여부 확인
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'kv_store_96e41890');
      
      if (tablesError) {
        console.log('⚠️  테이블 존재 확인 실패:', tablesError.message);
      } else if (!tables || tables.length === 0) {
        console.log('⚠️  kv_store_96e41890 테이블이 존재하지 않습니다.');
        console.log('🔧 Supabase 대시보드에서 다음 SQL을 실행해주세요:');
        console.log(`
CREATE TABLE IF NOT EXISTS public.kv_store_96e41890 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
        `);
      } else {
        console.log('✅ kv_store_96e41890 테이블이 이미 존재합니다.');
      }
      
    } catch (fallbackError) {
      console.error('❌ 대체 초기화도 실패:', fallbackError);
    }
  }
}

// 서버 시작 시 데이터베이스 초기화
await initializeDatabase();

// 테스트 실행 엔드포인트
app.post('/make-server-96e41890/execute-test', async (c) => {
  try {
    const { url, testType, settings } = await c.req.json();
    
    console.log(`Starting ${testType} test for ${url}`);
    
    // 테스트 ID 생성
    const testId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 테스트 정보를 KV 스토어에 저장
    const testData = {
      id: testId,
      url,
      testType,
      settings,
      status: 'running',
      progress: 0,
      startTime: new Date().toISOString(),
      logs: [`${new Date().toLocaleTimeString()} - 테스트 시작: ${url}`]
    };
    
    await kv.set(`test:${testId}`, testData);
    
    // 테스트 실행 시뮬레이션 (실제 환경에서는 백그라운드 작업으로 처리)
    setTimeout(async () => {
      try {
        // 테스트 진행 상황 업데이트
        for (let progress = 10; progress <= 100; progress += 10) {
          const updatedData = {
            ...testData,
            progress,
            status: progress === 100 ? 'completed' : 'running',
            logs: [
              ...testData.logs,
              `${new Date().toLocaleTimeString()} - 진행률 ${progress}%`
            ]
          };
          
          if (progress === 100) {
            updatedData.endTime = new Date().toISOString();
            updatedData.logs.push(`${new Date().toLocaleTimeString()} - 테스트 완료`);
          }
          
          await kv.set(`test:${testId}`, updatedData);
          
          // 1초 간격으로 진행
          if (progress < 100) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.error('Error updating test progress:', error);
      }
    }, 0);
    
    return c.json({
      success: true,
      testId,
      message: 'Test started successfully'
    });
    
  } catch (error) {
    console.error('Error in execute-test:', error);
    return c.json({
      success: false,
      error: 'Failed to start test',
      details: error.message
    }, 500);
  }
});

// 테스트 상태 조회 엔드포인트
app.get('/make-server-96e41890/test-status/:testId', async (c) => {
  try {
    const testId = c.req.param('testId');
    const testData = await kv.get(`test:${testId}`);
    
    if (!testData) {
      return c.json({
        success: false,
        error: 'Test not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      data: testData
    });
    
  } catch (error) {
    console.error('Error in test-status:', error);
    return c.json({
      success: false,
      error: 'Failed to get test status',
      details: error.message
    }, 500);
  }
});

// 모든 테스트 결과 조회 엔드포인트
app.get('/make-server-96e41890/test-results', async (c) => {
  try {
    const tests = await kv.getByPrefix('test:');
    
    // 최신 순으로 정렬
    const sortedTests = tests.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
    return c.json({
      success: true,
      data: sortedTests
    });
    
  } catch (error) {
    console.error('Error in test-results:', error);
    return c.json({
      success: false,
      error: 'Failed to get test results',
      details: error.message
    }, 500);
  }
});

// 테스트 중지 엔드포인트
app.post('/make-server-96e41890/stop-test/:testId', async (c) => {
  try {
    const testId = c.req.param('testId');
    const testData = await kv.get(`test:${testId}`);
    
    if (!testData) {
      return c.json({
        success: false,
        error: 'Test not found'
      }, 404);
    }
    
    const updatedData = {
      ...testData,
      status: 'stopped',
      endTime: new Date().toISOString(),
      logs: [
        ...testData.logs,
        `${new Date().toLocaleTimeString()} - 사용자에 의해 중단됨`
      ]
    };
    
    await kv.set(`test:${testId}`, updatedData);
    
    return c.json({
      success: true,
      message: 'Test stopped successfully'
    });
    
  } catch (error) {
    console.error('Error in stop-test:', error);
    return c.json({
      success: false,
      error: 'Failed to stop test',
      details: error.message
    }, 500);
  }
});

// 테스트 설정 저장 엔드포인트
app.post('/make-server-96e41890/save-settings', async (c) => {
  try {
    const settings = await c.req.json();
    await kv.set('test-settings', settings);
    
    return c.json({
      success: true,
      message: 'Settings saved successfully'
    });
    
  } catch (error) {
    console.error('Error in save-settings:', error);
    return c.json({
      success: false,
      error: 'Failed to save settings',
      details: error.message
    }, 500);
  }
});

// 테스트 설정 불러오기 엔드포인트
app.get('/make-server-96e41890/get-settings', async (c) => {
  try {
    const settings = await kv.get('test-settings');
    
    return c.json({
      success: true,
      data: settings || null
    });
    
  } catch (error) {
    console.error('Error in get-settings:', error);
    return c.json({
      success: false,
      error: 'Failed to get settings',
      details: error.message
    }, 500);
  }
});

// 테스트 타입 관리 엔드포인트들

// 테스트 타입 목록 조회
app.get('/make-server-96e41890/test-types', async (c) => {
  try {
    const testTypes = await kv.get('m2_test_types');
    
    // 기본 테스트 타입들 (초기화용)
    const defaultTestTypes = [
      { id: "performance", name: "성능 테스트", description: "페이지 로딩 속도 및 성능 측정", enabled: true },
      { id: "lighthouse", name: "Lighthouse", description: "웹페이지 품질 종합 분석", enabled: true },
      { id: "load", name: "부하 테스트", description: "동시 접속 및 부하 처리 능력 측정", enabled: true },
      { id: "security", name: "보안 테스트", description: "웹사이트 보안 취약점 검사", enabled: true },
      { id: "accessibility", name: "접근성 테스트", description: "웹 접근성 준수 검사", enabled: true },
    ];
    
    return c.json({
      success: true,
      data: testTypes || defaultTestTypes
    });
  } catch (error) {
    console.error('Error getting test types:', error);
    return c.json({
      success: false,
      error: 'Failed to get test types',
      details: error.message
    }, 500);
  }
});

// 테스트 타입 전체 업데이트
app.put('/make-server-96e41890/test-types', async (c) => {
  try {
    const testTypes = await c.req.json();
    await kv.set('m2_test_types', testTypes);
    
    return c.json({
      success: true,
      message: 'Test types updated successfully'
    });
  } catch (error) {
    console.error('Error updating test types:', error);
    return c.json({
      success: false,
      error: 'Failed to update test types',
      details: error.message
    }, 500);
  }
});

// 새 테스트 타입 추가
app.post('/make-server-96e41890/test-types', async (c) => {
  try {
    const newTestType = await c.req.json();
    const existingTypes = await kv.get('m2_test_types') || [];
    
    // ID 중복 체크
    if (existingTypes.find(type => type.id === newTestType.id)) {
      return c.json({
        success: false,
        error: 'Test type with this ID already exists'
      }, 400);
    }
    
    const updatedTypes = [...existingTypes, newTestType];
    await kv.set('m2_test_types', updatedTypes);
    
    return c.json({
      success: true,
      message: 'Test type added successfully',
      data: newTestType
    });
  } catch (error) {
    console.error('Error adding test type:', error);
    return c.json({
      success: false,
      error: 'Failed to add test type',
      details: error.message
    }, 500);
  }
});

// 테스트 타입 수정
app.put('/make-server-96e41890/test-types/:id', async (c) => {
  try {
    const testTypeId = c.req.param('id');
    const updatedTestType = await c.req.json();
    const existingTypes = await kv.get('m2_test_types') || [];
    
    const typeIndex = existingTypes.findIndex(type => type.id === testTypeId);
    if (typeIndex === -1) {
      return c.json({
        success: false,
        error: 'Test type not found'
      }, 404);
    }
    
    existingTypes[typeIndex] = { ...existingTypes[typeIndex], ...updatedTestType };
    await kv.set('m2_test_types', existingTypes);
    
    return c.json({
      success: true,
      message: 'Test type updated successfully',
      data: existingTypes[typeIndex]
    });
  } catch (error) {
    console.error('Error updating test type:', error);
    return c.json({
      success: false,
      error: 'Failed to update test type',
      details: error.message
    }, 500);
  }
});

// 테스트 타입 삭제
app.delete('/make-server-96e41890/test-types/:id', async (c) => {
  try {
    const testTypeId = c.req.param('id');
    const existingTypes = await kv.get('m2_test_types') || [];
    
    const filteredTypes = existingTypes.filter(type => type.id !== testTypeId);
    
    if (filteredTypes.length === existingTypes.length) {
      return c.json({
        success: false,
        error: 'Test type not found'
      }, 404);
    }
    
    await kv.set('m2_test_types', filteredTypes);
    
    return c.json({
      success: true,
      message: 'Test type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test type:', error);
    return c.json({
      success: false,
      error: 'Failed to delete test type',
      details: error.message
    }, 500);
  }
});

// 데이터베이스 상태 확인 엔드포인트
app.get('/make-server-96e41890/db-status', async (c) => {
  try {
    // 테이블 존재 여부 및 기본 기능 확인
    const testValue = await kv.get('db-test-key').catch(() => null);
    await kv.set('db-test-key', { test: true, timestamp: new Date().toISOString() });
    
    const settings = await kv.get('test-settings').catch(() => null);
    const testTypes = await kv.get('m2_test_types').catch(() => null);
    
    return c.json({
      success: true,
      message: 'Database connection successful',
      data: {
        kvStore: 'working',
        settings: settings ? 'exists' : 'not_found',
        testTypes: testTypes ? 'exists' : 'not_found',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database status check failed:', error);
    return c.json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    }, 500);
  }
});

// 헬스 체크 엔드포인트
app.get('/make-server-96e41890/health', (c) => {
  return c.json({
    success: true,
    message: 'MCP Website Tester API is running',
    timestamp: new Date().toISOString()
  });
});

serve(app.fetch);