import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error-handler';
import { loadTestRoutes } from './routes/load-tests';
import { testResultRoutes } from './routes/test-results';

// 환경변수 로드
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3000;

// 미들웨어 설정
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 로깅 미들웨어
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 헬스체크 엔드포인트
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'k6 MCP Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// API 라우트 설정
app.use('/api/load-tests', loadTestRoutes);
app.use('/api/test-results', testResultRoutes);

// 404 핸들러
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 k6 MCP Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env['NODE_ENV'] || 'development'}`);
});

export default app; 