import { Request, Response, NextFunction } from 'express';
import { TestMetricService } from '../services/test-metric-service';

export class TestMetricController {
  private testMetricService: TestMetricService;

  constructor() {
    this.testMetricService = new TestMetricService();
  }

  /**
   * 특정 테스트의 모든 메트릭 조회
   */
  getMetricsByTestId = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { testId } = req.params;
      
      if (!testId) {
        res.status(400).json({ success: false, error: 'Test ID is required' });
        return;
      }
      
      const metrics = await this.testMetricService.getMetricsByTestId(testId);
      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Failed to get metrics by test ID:', error);
      res.status(500).json({ success: false, error: 'Failed to get metrics' });
    }
  }

  /**
   * 특정 테스트의 메트릭을 타입별로 그룹화하여 조회
   */
  getGroupedMetricsByTestId = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { testId } = req.params;
      
      if (!testId) {
        res.status(400).json({ success: false, error: 'Test ID is required' });
        return;
      }
      
      const groupedMetrics = await this.testMetricService.getMetricsGroupedByType(testId);
      res.json({ success: true, data: groupedMetrics });
    } catch (error) {
      console.error('Failed to get grouped metrics:', error);
      res.status(500).json({ success: false, error: 'Failed to get grouped metrics' });
    }
  }

  /**
   * 특정 테스트의 특정 타입 메트릭 조회
   */
  getMetricsByTestIdAndType = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { testId, metricType } = req.params;
      
      if (!testId || !metricType) {
        res.status(400).json({ success: false, error: 'Test ID and metric type are required' });
        return;
      }
      
      const metrics = await this.testMetricService.getMetricsByType(testId, metricType);
      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Failed to get metrics by type:', error);
      res.status(500).json({ success: false, error: 'Failed to get metrics by type' });
    }
  }

  /**
   * 특정 테스트의 특정 타입과 이름의 메트릭 조회
   */
  getMetricByTestIdTypeAndName = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { testId, metricType, metricName } = req.params;
      
      if (!testId || !metricType || !metricName) {
        res.status(400).json({ success: false, error: 'Test ID, metric type, and metric name are required' });
        return;
      }
      
      const metric = await this.testMetricService.getMetric(testId, metricType, metricName);
      
      if (!metric) {
        res.status(404).json({ success: false, error: 'Metric not found' });
        return;
      }
      
      res.json({ success: true, data: metric });
    } catch (error) {
      console.error('Failed to get metric:', error);
      res.status(500).json({ success: false, error: 'Failed to get metric' });
    }
  }

  /**
   * 특정 테스트의 특정 타입과 이름의 메트릭 통계 조회
   */
  getMetricStatsByTestIdTypeAndName = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { testId, metricType, metricName } = req.params;
      
      if (!testId || !metricType || !metricName) {
        res.status(400).json({ success: false, error: 'Test ID, metric type, and metric name are required' });
        return;
      }
      
      const stats = await this.testMetricService.getMetricStats(testId, metricType, metricName);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Failed to get metric stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get metric stats' });
    }
  }
} 