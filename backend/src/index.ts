import express from 'express';
import cors from 'cors';
import { loadTestRoutes } from './routes/load-tests';
import { testResultRoutes } from './routes/test-results';
import { testTypeRoutes } from './routes/test-types';
import testMetricRoutes from './routes/test-metrics';
import lighthouseRoutes from './routes/lighthouse';
import e2eTestRoutes from './routes/e2e-tests';

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
app.use('/api/load-tests', loadTestRoutes);
app.use('/api/test-results', testResultRoutes);
app.use('/api/test-types', testTypeRoutes);
app.use('/api/test-metrics', testMetricRoutes);
app.use('/api/lighthouse', lighthouseRoutes);
app.use('/api/e2e-tests', e2eTestRoutes);

// 헬스 체크
app.get('/health', (_req, res) => {
  const now = new Date();
  console.log(`Health check at ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  res.json({ 
    success: true,
    status: 'ok', 
    timestamp: now.toISOString(),
    timezone: 'Asia/Seoul'
  });
});

// 서버 시작
app.listen(PORT, () => {
  const now = new Date();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏰ Server started at ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  console.log(`🌍 Timezone: Asia/Seoul`);
}); 