import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'];

// 환경변수가 없으면 개발 모드로 실행
const isDevelopment = process.env['NODE_ENV'] === 'development';

if (!supabaseUrl || !supabaseAnonKey) {
  if (isDevelopment) {
    console.warn('⚠️ Supabase environment variables not found. Running in development mode without database.');
  } else {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
  }
}

/**
 * Supabase 클라이언트 생성
 */
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321', 
  supabaseAnonKey || 'dummy-key', 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'mcp-web-testing'
      }
    }
  }
);

/**
 * Supabase 서비스 역할 키로 클라이언트 생성 (관리자 권한)
 */
export const createServiceClient = () => {
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
  console.log('createServiceClient: Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
  console.log('createServiceClient: Service Role Key:', serviceRoleKey ? 'Set' : 'Not set');
  
  if (!serviceRoleKey) {
    if (isDevelopment) {
      console.warn('⚠️ Supabase service role key not found. Using dummy client.');
      return createClient(
        supabaseUrl || 'http://localhost:54321',
        'dummy-service-key',
        {
          auth: {
            autoRefreshToken: true,
            persistSession: false
          },
          db: {
            schema: 'public'
          },
          global: {
            headers: {
              'X-Client-Info': 'mcp-web-testing'
            }
          }
        }
      );
    } else {
      throw new Error('Missing Supabase service role key. Please check your .env file.');
    }
  }
  
  try {
    const client = createClient(
      supabaseUrl || 'http://localhost:54321', 
      serviceRoleKey, 
      {
        auth: {
          autoRefreshToken: true,
          persistSession: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Client-Info': 'mcp-web-testing'
          }
        }
      }
    );
    console.log('✅ Service client created successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to create service client:', error);
    if (isDevelopment) {
      console.warn('⚠️ Using dummy client due to service client creation error');
      return createClient(
        supabaseUrl || 'http://localhost:54321',
        'dummy-service-key',
        {
          auth: {
            autoRefreshToken: true,
            persistSession: false
          },
          db: {
            schema: 'public'
          },
          global: {
            headers: {
              'X-Client-Info': 'mcp-web-testing'
            }
          }
        }
      );
    } else {
      throw error;
    }
  }
};

/**
 * 연결 테스트
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('m2_test_results')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

/**
 * 환경 변수 디버깅
 */
export const debugEnvironmentVariables = () => {
  console.log('🔍 Environment Variables Debug:');
  console.log('NODE_ENV:', process.env['NODE_ENV']);
  console.log('SUPABASE_URL:', process.env['SUPABASE_URL'] ? 'Set' : 'Not set');
  console.log('SUPABASE_ANON_KEY:', process.env['SUPABASE_ANON_KEY'] ? 'Set' : 'Not set');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env['SUPABASE_SERVICE_ROLE_KEY'] ? 'Set' : 'Not set');
  
  if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    console.log('Service Role Key length:', key.length);
    console.log('Service Role Key starts with:', key.substring(0, 10) + '...');
  }
}; 