import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LighthouseService } from '../services/lighthouse-service';
import { LoadTestConfig } from '../types';

/**
 * Lighthouse 테스트 컨트롤러
 */
export class LighthouseController {
  private lighthouseService: LighthouseService;

  constructor() {
    this.lighthouseService = new LighthouseService();
  }

  /**
   * Lighthouse 테스트 실행
   */
  async runLighthouseTest(req: Request, res: Response): Promise<void> {
    try {
      const { url, device = 'desktop', categories = ['performance', 'accessibility', 'best-practices', 'seo'] } = req.body;

      if (!url) {
        res.status(400).json({
          success: false,
          error: 'URL is required'
        });
        return;
      }

      // UUID 형식의 id와 Lighthouse 형식의 test_id 생성
      const id = uuidv4();
      const testId = `lighthouse_${Date.now()}`;

      // 테스트 설정
      const config: LoadTestConfig = {
        url,
        device,
        categories,
        testType: 'lighthouse'
      };

      console.log(`Lighthouse test config:`, config);

      console.log(`Starting Lighthouse test for URL: ${url}`);
      console.log(`ID: ${id}`);
      console.log(`Test ID: ${testId}`);
      console.log(`Device: ${device}`);
      console.log(`Categories: ${categories.join(', ')}`);

      // 비동기로 Lighthouse 테스트 실행
      this.lighthouseService.executeTest(id, testId, config).catch(error => {
        console.error('Lighthouse test execution error:', error);
      });

      // 즉시 응답
      res.status(200).json({
        success: true,
        id,
        testId,
        message: 'Lighthouse test started successfully',
        config
      });

    } catch (error) {
      console.error('Lighthouse controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start Lighthouse test'
      });
    }
  }

  /**
   * Lighthouse 테스트 상태 조회
   */
  async getLighthouseTestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;

      if (!testId) {
        res.status(400).json({
          success: false,
          error: 'Test ID is required'
        });
        return;
      }

      // UUID 형식인지 확인
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testId);
      
      if (isUUID) {
        // UUID 형식이면 TestResultService를 통해 조회
        try {
          const { TestResultService } = await import('../services/test-result-service');
          const testResultService = new TestResultService();
          const result = await testResultService.getResultById(testId);
          
          if (result) {
            res.status(200).json({
              success: true,
              testId,
              status: result.status,
              currentStep: result.currentStep || 'Lighthouse 감사 완료',
              isRunning: result.status === 'running',
              result: result
            });
            return;
          }
        } catch (error) {
          console.error('Failed to get test result from database:', error);
        }
      }

      // 기존 방식으로 조회 (실행 중인 테스트)
      const isRunning = this.lighthouseService.isTestRunning(testId);
      const testResult = this.lighthouseService.getTestResult(testId);
      const runningTests = this.lighthouseService.getRunningTests();

      // 테스트 결과가 있으면 완료된 것으로 간주
      const status = testResult ? 'completed' : (isRunning ? 'running' : 'not_found');
      const currentStep = testResult ? 'Lighthouse 감사 완료' : (isRunning ? 'Lighthouse 감사 진행 중...' : '테스트를 찾을 수 없습니다');

      res.status(200).json({
        success: true,
        testId,
        status,
        currentStep,
        isRunning,
        runningTests,
        result: testResult || null
      });

    } catch (error) {
      console.error('Lighthouse status check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check Lighthouse test status'
      });
    }
  }

  /**
   * Lighthouse 테스트 취소
   */
  async cancelLighthouseTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;

      if (!testId) {
        res.status(400).json({
          success: false,
          error: 'Test ID is required'
        });
        return;
      }

      await this.lighthouseService.cancelTest(testId);

      res.status(200).json({
        success: true,
        message: 'Lighthouse test cancelled successfully'
      });

    } catch (error) {
      console.error('Lighthouse test cancellation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel Lighthouse test'
      });
    }
  }

  /**
   * 실행 중인 Lighthouse 테스트 목록 조회
   */
  async getRunningLighthouseTests(_req: Request, res: Response): Promise<void> {
    try {
      const runningTests = this.lighthouseService.getRunningTests();

      res.status(200).json({
        success: true,
        runningTests,
        count: runningTests.length
      });

    } catch (error) {
      console.error('Lighthouse running tests error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get running Lighthouse tests'
      });
    }
  }
} 