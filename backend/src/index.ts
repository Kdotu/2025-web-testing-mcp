import express from 'express';
import cors from 'cors';
import testRoutes from './routes/test-routes';
import { testResultRoutes } from './routes/test-results';
import { testTypeRoutes } from './routes/test-types';
import testMetricRoutes from './routes/test-metrics';
import testManageRoutes from './routes/test-manage';
import { settingsRoutes } from './routes/settings';
import { testSettingsRoutes } from './routes/test-settings';
import { testLayoutRoutes } from './routes/test-layouts';
import { dynamicSettingsRoutes } from './routes/dynamic-settings';
import { dbStatusRoutes } from './routes/db-status';
import { saveSettingsRoutes } from './routes/save-settings';
import documentsRoutes from './routes/documents';
import mcpStatusRoutes from './routes/mcp-status';
import playwrightTestRoutes from './routes/playwright-test';
import mcpPlaywrightRoutes from './routes/mcp-playwright';
import { debugEnvironmentVariables } from './services/supabase-client';
import { TestResultService } from './services/test-result-service';

// 타임존 설정
process.env.TZ = 'Asia/Seoul';

const app = express();
const PORT = process.env['PORT'] || 3101;

// 미들웨어 설정
const allowedOrigins = [
  'http://localhost:3100',
  'http://localhost:3000',
  'https://2025-web-testing-mcp.netlify.app'
];

if (process.env['CORS_ORIGIN']) {
  allowedOrigins.push(process.env['CORS_ORIGIN']);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// 라우트 설정
app.use('/api/test', testRoutes);
app.use('/api/test-results', testResultRoutes);
app.use('/api/test-types', testTypeRoutes);
app.use('/api/test-settings', testSettingsRoutes);
app.use('/api/test-layouts', testLayoutRoutes);
app.use('/api/dynamic-settings', dynamicSettingsRoutes);
app.use('/api/test-metrics', testMetricRoutes);
app.use('/api/test-manage', testManageRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api', mcpStatusRoutes);
app.use('/api/playwright', playwrightTestRoutes);
app.use('/api/mcp/playwright', mcpPlaywrightRoutes);


// 설정 라우트 (프론트엔드 호환성을 위해 루트 경로에 추가)
app.use('/get-settings', settingsRoutes);
app.use('/test-results', testResultRoutes);
app.use('/test-types', testTypeRoutes);
app.use('/db-status', dbStatusRoutes);
app.use('/save-settings', saveSettingsRoutes);

// 헬스 체크
app.get('/health', async (_req, res) => {
  const now = new Date();
  console.log(`Health check at ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  
  try {
    // 데이터베이스 연결 상태 확인
    const testResultService = new TestResultService();
    const dbStatus = await testResultService.testDatabaseConnection();
    
    res.json({ 
      success: true,
      status: 'ok', 
      timestamp: now.toISOString(),
      timezone: 'Asia/Seoul',
      database: {
        connected: dbStatus.connected,
        responseTime: dbStatus.responseTime,
        lastError: dbStatus.lastError
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.json({ 
      success: false,
      status: 'error', 
      timestamp: now.toISOString(),
      timezone: 'Asia/Seoul',
      database: {
        connected: false,
        responseTime: null,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * 서버 시작 시 running 상태의 테스트들 확인 및 타임아웃 처리
 */
async function checkAndUpdateRunningTests(): Promise<void> {
  try {
    console.log('🔍 Checking for running tests that may have timed out...');
    
    const testResultService = new TestResultService();
    
    // running 상태의 모든 테스트 조회
    const runningTests = await testResultService.getRunningTests();
    
    if (runningTests.length === 0) {
      console.log('✅ No running tests found');
      return;
    }
    
    console.log(`📊 Found ${runningTests.length} running tests`);
    
    const now = new Date();
    const timeoutThreshold = 10 * 60 * 1000; // 10분 (밀리초)
    let updatedCount = 0;
    let failedCount = 0;
    
    for (const test of runningTests) {
      console.log(`🔍 Processing test: ${test.testId}`);
      console.log(`   - Created at: ${test.createdAt}`);
      console.log(`   - Current status: ${test.status}`);
      console.log(`   - Current step: ${test.currentStep}`);
      
      const createdAt = new Date(test.createdAt);
      const timeDiff = now.getTime() - createdAt.getTime();
      const minutesElapsed = Math.round(timeDiff / 1000 / 60);
      
      console.log(`   - Time elapsed: ${minutesElapsed} minutes (${timeDiff}ms)`);
      console.log(`   - Timeout threshold: 10 minutes (${timeoutThreshold}ms)`);
      
      if (timeDiff > timeoutThreshold) {
        console.log(`⏰ Test ${test.testId} has been running for ${minutesElapsed} minutes, marking as failed`);
        
        // 테스트 상태를 failed로 업데이트
        const updatedResult = {
          ...test,
          status: 'failed' as const,
          currentStep: 'Test timeout after 10 minutes (server restart)',
          updatedAt: now.toISOString()
        };
        
        console.log(`🔄 Attempting to update test ${test.testId} with data:`, {
          testId: updatedResult.testId,
          status: updatedResult.status,
          currentStep: updatedResult.currentStep,
          updatedAt: updatedResult.updatedAt
        });
        
        try {
          await testResultService.updateResult(updatedResult);
          console.log(`✅ Test ${test.testId} status updated to failed`);
          updatedCount++;
        } catch (updateError) {
          console.error(`❌ Failed to update test ${test.testId}:`, updateError);
          console.error(`   Error details:`, {
            message: (updateError as any).message,
            code: (updateError as any).code,
            details: (updateError as any).details,
            hint: (updateError as any).hint
          });
          failedCount++;
        }
      } else {
        console.log(`✅ Test ${test.testId} is still within timeout period (${minutesElapsed} minutes)`);
      }
    }
    
    console.log(`📈 Summary: Updated ${updatedCount} tests to failed status, ${failedCount} updates failed`);
    
  } catch (error) {
    console.error('❌ Error checking running tests:', error);
    console.error('   Error details:', {
      message: (error as any).message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint
    });
  }
}

// 서버 시작
app.listen(PORT, async () => {
  const now = new Date();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏰ Server started at ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  console.log(`🌍 Timezone: Asia/Seoul`);
  
  // 환경 변수 디버깅 정보 출력
  debugEnvironmentVariables();
  
  // 서버 시작 시 running 상태의 테스트들 확인 및 타임아웃 처리
  await checkAndUpdateRunningTests();
}); 