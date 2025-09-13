const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 클라이언트 설정
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl.includes('supabase.co') || supabaseKey === 'your-service-role-key') {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정해주세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔄 데이터베이스 테이블 통합 마이그레이션을 시작합니다...');
    
    // 1. m2_test_results 테이블에 Playwright 컬럼들 추가
    console.log('1️⃣ m2_test_results 테이블에 Playwright 컬럼들 추가 중...');
    
    const alterTableQueries = [
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS scenario_code text;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS browser_type text DEFAULT 'chromium';",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS viewport_width integer DEFAULT 1280;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS viewport_height integer DEFAULT 720;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS user_id uuid;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS test_type_id integer;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS result_summary text;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS screenshots jsonb;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS videos jsonb;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS error_details text;",
      "ALTER TABLE public.m2_test_results ADD COLUMN IF NOT EXISTS execution_time_ms integer;"
    ];

    for (const query of alterTableQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.warn(`⚠️  컬럼 추가 중 경고: ${error.message}`);
      } else {
        console.log(`✅ 컬럼 추가 완료: ${query.split(' ')[5]}`);
      }
    }

    // 2. test_type 제약 조건 업데이트
    console.log('2️⃣ test_type 제약 조건 업데이트 중...');
    
    const { error: dropConstraintError } = await supabase.rpc('exec_sql', { 
      sql: "ALTER TABLE public.m2_test_results DROP CONSTRAINT IF EXISTS m2_test_results_test_type_check;" 
    });
    
    const { error: addConstraintError } = await supabase.rpc('exec_sql', { 
      sql: "ALTER TABLE public.m2_test_results ADD CONSTRAINT m2_test_results_test_type_check CHECK (test_type IN ('load', 'lighthouse', 'playwright', 'k6'));" 
    });

    if (addConstraintError) {
      console.warn(`⚠️  test_type 제약 조건 업데이트 경고: ${addConstraintError.message}`);
    } else {
      console.log('✅ test_type 제약 조건 업데이트 완료');
    }

    // 3. status 제약 조건 업데이트
    console.log('3️⃣ status 제약 조건 업데이트 중...');
    
    const { error: dropStatusConstraintError } = await supabase.rpc('exec_sql', { 
      sql: "ALTER TABLE public.m2_test_results DROP CONSTRAINT IF EXISTS m2_test_results_status_check;" 
    });
    
    const { error: addStatusConstraintError } = await supabase.rpc('exec_sql', { 
      sql: "ALTER TABLE public.m2_test_results ADD CONSTRAINT m2_test_results_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'success'));" 
    });

    if (addStatusConstraintError) {
      console.warn(`⚠️  status 제약 조건 업데이트 경고: ${addStatusConstraintError.message}`);
    } else {
      console.log('✅ status 제약 조건 업데이트 완료');
    }

    // 4. 기존 Playwright 데이터 마이그레이션
    console.log('4️⃣ 기존 Playwright 데이터 마이그레이션 중...');
    
    // 먼저 기존 데이터 확인
    const { data: existingData, error: selectError } = await supabase
      .from('m2_playwright_test_results')
      .select('*')
      .limit(5);

    if (selectError) {
      console.log('ℹ️  m2_playwright_test_results 테이블이 존재하지 않거나 비어있습니다.');
    } else {
      console.log(`ℹ️  마이그레이션할 데이터 ${existingData.length}개 발견`);
      
      if (existingData.length > 0) {
        // 데이터 마이그레이션 실행
        const migrationQuery = `
          INSERT INTO public.m2_test_results (
            id, test_id, name, description, url, status, test_type, current_step,
            created_at, updated_at, summary, metrics, details, config, raw_data,
            scenario_code, browser_type, viewport_width, viewport_height,
            user_id, test_type_id, progress_percentage, result_summary,
            screenshots, videos, error_details, execution_time_ms
          )
          SELECT 
            execution_id as id,
            execution_id as test_id,
            'Playwright Test' as name,
            scenario_code as description,
            'http://localhost:3100' as url,
            status,
            'playwright' as test_type,
            current_step,
            created_at,
            updated_at,
            '{}'::jsonb as summary,
            '{}'::jsonb as metrics,
            '{}'::jsonb as details,
            jsonb_build_object(
              'browser_type', browser_type,
              'viewport_width', viewport_width,
              'viewport_height', viewport_height
            ) as config,
            raw_data,
            scenario_code,
            browser_type,
            viewport_width,
            viewport_height,
            user_id,
            test_type_id,
            progress_percentage,
            result_summary,
            screenshots,
            videos,
            error_details,
            execution_time_ms
          FROM public.m2_playwright_test_results;
        `;

        const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationQuery });
        
        if (migrationError) {
          console.error(`❌ 데이터 마이그레이션 실패: ${migrationError.message}`);
        } else {
          console.log('✅ 데이터 마이그레이션 완료');
        }
      }
    }

    // 5. 인덱스 생성
    console.log('5️⃣ 인덱스 생성 중...');
    
    const indexQueries = [
      "CREATE INDEX IF NOT EXISTS idx_m2_test_results_test_type ON m2_test_results(test_type);",
      "CREATE INDEX IF NOT EXISTS idx_m2_test_results_user_id ON m2_test_results(user_id);",
      "CREATE INDEX IF NOT EXISTS idx_m2_test_results_browser_type ON m2_test_results(browser_type);"
    ];

    for (const query of indexQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.warn(`⚠️  인덱스 생성 경고: ${error.message}`);
      } else {
        console.log(`✅ 인덱스 생성 완료: ${query.split(' ')[5]}`);
      }
    }

    console.log('🎉 데이터베이스 테이블 통합 마이그레이션이 완료되었습니다!');
    console.log('📝 다음 단계:');
    console.log('   1. 애플리케이션을 재시작하세요');
    console.log('   2. Playwright 테스트를 실행해보세요');
    console.log('   3. 모든 것이 정상 작동하면 m2_playwright_test_results 테이블을 삭제할 수 있습니다');

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  }
}

// exec_sql 함수가 없는 경우를 위한 대안
async function runMigrationAlternative() {
  try {
    console.log('🔄 대안 방법으로 데이터베이스 테이블 통합을 시작합니다...');
    
    // 직접 SQL 파일을 읽어서 실행
    const migrationFile = path.join(__dirname, 'db-migration-unify-test-results.sql');
    
    if (!fs.existsSync(migrationFile)) {
      console.error('❌ 마이그레이션 파일을 찾을 수 없습니다:', migrationFile);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    console.log('📄 마이그레이션 SQL 파일을 읽었습니다.');
    console.log('⚠️  이 SQL을 Supabase 대시보드의 SQL Editor에서 직접 실행해주세요:');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('📝 실행 후 애플리케이션을 재시작하세요.');

  } catch (error) {
    console.error('❌ 대안 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  }
}

// 메인 실행
if (require.main === module) {
  // exec_sql 함수가 있는지 확인
  supabase.rpc('exec_sql', { sql: 'SELECT 1;' })
    .then(() => runMigration())
    .catch(() => {
      console.log('ℹ️  exec_sql 함수를 사용할 수 없습니다. 대안 방법을 사용합니다.');
      runMigrationAlternative();
    });
}

module.exports = { runMigration, runMigrationAlternative };
