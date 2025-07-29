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
    }
  }
);

/**
 * Supabase 서비스 역할 키로 클라이언트 생성 (관리자 권한)
 */
export const createServiceClient = () => {
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
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
          }
        }
      );
    } else {
      throw new Error('Missing Supabase service role key. Please check your .env file.');
    }
  }
  
  return createClient(
    supabaseUrl || 'http://localhost:54321', 
    serviceRoleKey, 
    {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      }
    }
  );
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