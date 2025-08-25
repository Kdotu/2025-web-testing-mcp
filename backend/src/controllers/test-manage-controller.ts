import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { E2ETestService } from '../services/e2e-test-service';
import { LighthouseService } from '../services/lighthouse-service';
import { K6Service } from '../services/k6-service';
import { TestResultService } from '../services/test-result-service';
import { TestManageService } from '../services/test-manage-service';
import { createValidationError } from '../middleware/error-handler';
import { LoadTestConfig, LoadTestResult } from '../types';

/**
 * 테스트 관리 공통 컨트롤러
 * E2E, Lighthouse, Load 테스트의 공통 기능을 통합 관리
 */
export class TestManageController {
  private e2eTestService: E2ETestService;
  private lighthouseService: LighthouseService;
  private k6Service: K6Service;
  private testResultService: TestResultService;
  private testManageService: TestManageService;

  constructor() {
    console.log('🔧 TestManageController 생성자 시작...');
    
    try {
      this.testResultService = new TestResultService();
      console.log('✅ TestResultService 초기화 완료');
      
      this.e2eTestService = new E2ETestService(this.testResultService);
      console.log('✅ E2ETestService 초기화 완료');
      
      this.lighthouseService = new LighthouseService();
      console.log('✅ LighthouseService 초기화 완료');
      
      this.k6Service = new K6Service();
      console.log('✅ K6Service 초기화 완료');
      
      this.testManageService = new TestManageService();
      console.log('✅ TestManageService 초기화 완료');
      
      console.log('🎉 TestManageController 생성자 완료');
    } catch (error) {
      console.error('❌ TestManageController 생성자 에러:', error);
      throw error;
    }
  }

  // ==================== E2E 테스트 관련 ====================

  /**
   * E2E 테스트 실행 (INSERT → UPDATE 방식)
   */
  executeE2ETest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url, name, description, config } = req.body;

      if (!url || !name) {
        throw createValidationError('URL과 이름은 필수입니다.');
      }

      console.log('🚀 E2E 테스트 시작:', { url, name, description, config });

      // config 객체 구조화 및 검증
      const structuredConfig = {
        testType: config?.testType || 'e2e',
        settings: config?.settings || {},
        url,
        name: name || 'E2E 테스트',
        description: description || '',
        timestamp: new Date().toISOString()
      };

      console.log('📋 구조화된 config:', JSON.stringify(structuredConfig, null, 2));

      // 1. 테스트 결과 레코드 즉시 생성 (INSERT)
      const testResult = await this.testResultService.createInitialResult({
        testType: config?.testType || 'e2e',
        url,
        name: name || 'E2E 테스트',
        description,
        status: 'pending',
        config: structuredConfig
      });

      console.log('✅ 초기 테스트 결과 생성 완료:', testResult.test_id);

      // 2. 테스트 실행 시작 (비동기로 실행, 결과는 별도로 처리)
      this.e2eTestService.executeE2ETest({
        url,
        name,
        description,
        config
      }, testResult.test_id).catch(async (error) => {
        console.error('E2E 테스트 실행 중 오류 발생:', error);
        
        // 에러 발생 시 상태를 failed로 업데이트
        try {
          await this.testResultService.updateResult({
            id: testResult.id,
            testId: testResult.test_id,
            testType: config?.testType || 'e2e',
            url,
            name,
            description,
            status: 'failed',
            currentStep: '테스트 실행 실패',
            metrics: {
              http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
              http_req_rate: 0,
              http_req_failed: 0,
              vus: 0,
              vus_max: 0
            },
            summary: {
              totalRequests: 0,
              successfulRequests: 0,
              failedRequests: 0,
              duration: 0,
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString()
            },
            details: {},
            config,
            raw_data: `Error: ${error.message}`,
            createdAt: testResult.created_at,
            updatedAt: new Date().toISOString()
          });
        } catch (updateError) {
          console.error('Failed to update test status to failed:', updateError);
        }
      });

      // 3. 실행 결과로 상태 업데이트 (UPDATE)
      await this.testResultService.updateResult({
        id: testResult.id,
        testId: testResult.test_id,
        testType: config?.testType || 'e2e',
        url,
        name,
        description,
        status: 'running',
        currentStep: '테스트 시작',
        metrics: {
          http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
          http_req_rate: 0,
          http_req_failed: 0,
          vus: 0,
          vus_max: 0
        },
        summary: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          duration: 0,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString()
        },
        details: {},
        config,
        raw_data: '',
        createdAt: testResult.created_at,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ E2E 테스트 상태 업데이트 완료');

      res.status(201).json({
        success: true,
        data: {
          testId: testResult.test_id,
          status: 'running',
          currentStep: '테스트 시작',
          message: 'E2E 테스트가 시작되었습니다.'
        },
        message: 'E2E 테스트가 시작되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ E2E 테스트 실행 실패:', error);
      next(error);
    }
  }

  // ==================== Lighthouse 테스트 관련 ====================

  /**
   * Lighthouse 테스트 실행 (INSERT → UPDATE 방식)
   */
  async runLighthouseTest(req: Request, res: Response): Promise<void> {
    try {
      const { url, device = 'desktop', categories = ['performance', 'accessibility', 'best-practices', 'seo'], name, description } = req.body;

      if (!url) {
        res.status(400).json({
          success: false,
          error: 'URL is required'
        });
        return;
      }

      console.log('🚀 Lighthouse 테스트 시작:', { url, device, categories, name, description });

      // 이미 실행 중인 동일한 URL의 Lighthouse 테스트가 있는지 확인
      const runningTests = await this.testResultService.getRunningTests();
      const existingLighthouseTest = runningTests.find(test => 
        test.testType === 'lighthouse' && test.url === url
      );

      if (existingLighthouseTest) {
        console.log(`⚠️ Lighthouse test for ${url} is already running (ID: ${existingLighthouseTest.testId})`);
        res.status(409).json({
          success: false,
          error: 'Lighthouse test is already running for this URL',
          data: {
            existingTestId: existingLighthouseTest.testId,
            status: existingLighthouseTest.status,
            currentStep: existingLighthouseTest.currentStep
          }
        });
        return;
      }

      // config 객체 구조화 및 검증
      const structuredConfig = {
        testType: 'lighthouse',
        device: device || 'desktop',
        categories: categories || ['performance', 'accessibility', 'best-practices', 'seo'],
        url,
        name: name || 'Lighthouse 테스트',
        description: description || '',
        timestamp: new Date().toISOString(),
        settings: {
          device: device || 'desktop',
          categories: categories || ['performance', 'accessibility', 'best-practices', 'seo']
        }
      };

      console.log('📋 구조화된 Lighthouse config:', JSON.stringify(structuredConfig, null, 2));

      // 1. 테스트 결과 레코드 즉시 생성 (INSERT) - running 상태로 시작
      const testResult = await this.testResultService.createInitialResult({
        testType: 'lighthouse',
        url,
        name: name || 'Lighthouse 테스트',
        description: description || '',
        status: 'running', // pending 대신 running으로 시작
        config: structuredConfig
      });

      console.log('✅ 초기 Lighthouse 테스트 결과 생성 완료:', testResult.test_id);

      // 2. 테스트 실행 시작
      const id = uuidv4();
      const testId = testResult.test_id;

      const config: LoadTestConfig = {
        url,
        device,
        categories,
        testType: 'lighthouse'
      };

      console.log(`Starting Lighthouse test via MCP for URL: ${url}`);
      console.log(`ID: ${id}`);
      console.log(`Test ID: ${testId}`);

      // 비동기로 테스트 실행 (에러 처리 포함)
      this.lighthouseService.executeTest(id, testId, config).catch(async (error) => {
        console.error('Lighthouse MCP test execution error:', error);
        
        // 에러 발생 시 상태를 failed로 업데이트
        try {
          await this.testResultService.updateResult({
            id: testResult.id,
            testId: testResult.test_id,
            testType: 'lighthouse',
            url,
            name: name || 'Lighthouse 테스트',
            description: description || '',
            status: 'failed',
            currentStep: '테스트 실행 실패',
            metrics: {
              http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
              http_req_rate: 0,
              http_req_failed: 0,
              vus: 0,
              vus_max: 0
            },
            summary: {
              totalRequests: 0,
              successfulRequests: 0,
              failedRequests: 0,
              duration: 0,
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString()
            },
            details: {},
            config: { device, categories, testType: 'lighthouse' },
            raw_data: `Error: ${error.message}`,
            createdAt: testResult.created_at,
            updatedAt: new Date().toISOString()
          });
        } catch (updateError) {
          console.error('Failed to update test status to failed:', updateError);
        }
      });

      // 3. 응답 즉시 반환 (중복 상태 업데이트 제거)
      res.status(200).json({
        success: true,
        data: {
          testId: testResult.test_id,
          status: 'running',
          currentStep: 'Lighthouse 실행 중',
          message: 'Lighthouse test started successfully'
        },
        message: 'Lighthouse test started successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Lighthouse 테스트 실행 실패:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start Lighthouse test'
      });
    }
  }

  // ==================== Load 테스트 관련 ====================

  /**
   * 새로운 부하 테스트 생성 및 실행 (INSERT → UPDATE 방식)
   */
  async createLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    try {
      console.log('🚀 Load 테스트 시작:', config);

      // config 객체 구조화 및 검증
      const structuredConfig = {
        testType: 'load',
        name: config.name || '부하 테스트',
        description: config.description || '',
        duration: config.duration || '3m',
        vus: config.vus || 10,
        timestamp: new Date().toISOString(),
        settings: {
          duration: config.duration || '3m',
          vus: config.vus || 10,
          detailedConfig: (config as any).detailedConfig || {}
        },
        ...config // 기존 config 데이터 유지
      };

      console.log('📋 구조화된 Load config:', JSON.stringify(structuredConfig, null, 2));

      // 1. 테스트 결과 레코드 즉시 생성 (INSERT)
      const testResult = await this.testResultService.createInitialResult({
        testType: 'load',
        url: config.url,
        name: config.name || '부하 테스트',
        description: config.description || '',
        status: 'pending',
        config: structuredConfig
      });

      console.log('✅ 초기 Load 테스트 결과 생성 완료:', testResult.test_id);

      // 2. 테스트 실행 시작
      const testId = testResult.test_id;
      const now = new Date().toISOString();

      // 테스트 설정에 ID 추가
      const testConfig: LoadTestConfig = {
        ...config,
        id: testId,
        createdAt: now,
        updatedAt: now
      };

      // 3. 상태를 running으로 업데이트
      await this.testResultService.updateResult({
        id: testResult.id,
        testId: testResult.test_id,
        testType: 'load',
        url: config.url,
        name: config.name || '부하 테스트',
        description: config.description || '',
        status: 'running',
        currentStep: 'k6 테스트 실행 중',
        metrics: {
          http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
          http_req_rate: 0,
          http_req_failed: 0,
          vus: 0,
          vus_max: 0
        },
        summary: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          duration: 0,
          startTime: now,
          endTime: now
        },
        details: {},
        config: testConfig,
        raw_data: '',
        createdAt: testResult.created_at,
        updatedAt: now
      });

      // k6 테스트 실행 (비동기)
      this.k6Service.executeTest(testId, testConfig).catch(async (error) => {
        console.error('Test execution failed:', error);
        
        // 에러 발생 시 상태를 failed로 업데이트
        try {
          await this.testResultService.updateResult({
            id: testResult.id,
            testId: testResult.test_id,
            testType: 'load',
            url: config.url,
            name: config.name || '부하 테스트',
            description: config.description || '',
            status: 'failed',
            currentStep: '테스트 실행 실패',
            metrics: {
              http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
              http_req_rate: 0,
              http_req_failed: 0,
              vus: 0,
              vus_max: 0
            },
            summary: {
              totalRequests: 0,
              successfulRequests: 0,
              failedRequests: 0,
              duration: 0,
              startTime: now,
              endTime: now
            },
            details: {},
            config: testConfig,
            raw_data: `Error: ${error.message}`,
            createdAt: testResult.created_at,
            updatedAt: new Date().toISOString()
          });
        } catch (updateError) {
          console.error('Failed to update test status to failed:', updateError);
        }
      });

      console.log('✅ Load 테스트 상태 업데이트 완료');

      return {
        id: testResult.id,
        testId: testResult.test_id,
        testType: 'load',
        url: config.url,
        name: config.name || '부하 테스트',
        description: config.description || '',
        status: 'running',
        currentStep: 'k6 테스트 실행 중',
        metrics: {
          http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
          http_req_rate: 0,
          http_req_failed: 0,
          vus: 0,
          vus_max: 0
        },
        summary: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          duration: 0,
          startTime: now,
          endTime: now
        },
        details: {},
        config: testConfig,
        raw_data: '',
        createdAt: testResult.created_at,
        updatedAt: now
      };
    } catch (error) {
      console.error('❌ Load 테스트 생성 실패:', error);
      throw error;
    }
  }

  /**
   * k6 MCP 테스트 실행 (직접 실행 방식)
   */
  async executeK6MCPTestDirect(params: {
    url: string;
    name: string;
    description?: string;
    script: string;
    config: {
      duration: string;
      vus: number;
      detailedConfig?: any;
    };
  }): Promise<LoadTestResult> {
    const testId = uuidv4();
    const now = new Date().toISOString();

    const fs = await import('fs');
    const path = await import('path');
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const scriptPath = path.join(tempDir, `${testId}.js`);
    fs.writeFileSync(scriptPath, params.script);

    const initialResult: LoadTestResult = {
      id: uuidv4(),
      testId,
      testType: 'load',
      url: params.url,
      name: params.name,
      ...(params.description && { description: params.description }),
      config: {
        duration: params.config.duration,
        vus: params.config.vus,
        detailedConfig: params.config.detailedConfig || {}
      },
      status: 'running',
      metrics: {
        http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
        http_req_rate: 0,
        http_req_failed: 0,
        vus: 0,
        vus_max: 0
      },
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        duration: 0,
        startTime: now,
        endTime: now
      },
      createdAt: now,
      updatedAt: now
    };

    await this.testResultService.saveResult(initialResult);

    this.executeK6MCPTestDirectAsync(testId, scriptPath, params.config, params.url).catch(error => {
      console.error('k6 MCP test execution failed:', error);
      this.testManageService.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
    });

    return initialResult;
  }

  /**
   * k6 MCP 테스트 실행 (MCP 서버 방식)
   */
  async executeK6MCPTest(params: {
    url: string;
    name: string;
    description?: string;
    script: string;
    config: {
      duration: string;
      vus: number;
      detailedConfig?: any;
    };
  }): Promise<LoadTestResult> {
    const testId = uuidv4();
    const now = new Date().toISOString();

    const fs = await import('fs');
    const path = await import('path');
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const scriptPath = path.join(tempDir, `${testId}.js`);
    fs.writeFileSync(scriptPath, params.script);

    const initialResult: LoadTestResult = {
      id: uuidv4(),
      testId,
      testType: 'load',
      url: params.url,
      name: params.name,
      ...(params.description && { description: params.description }),
      config: {
        duration: params.config.duration,
        vus: params.config.vus,
        detailedConfig: params.config.detailedConfig || {}
      },
      status: 'running',
      metrics: {
        http_req_duration: { avg: 0, min: 0, max: 0, p95: 0 },
        http_req_rate: 0,
        http_req_failed: 0,
        vus: 0,
        vus_max: 0
      },
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        duration: 0,
        startTime: now,
        endTime: now
      },
      createdAt: now,
      updatedAt: now
    };

    await this.testResultService.saveResult(initialResult);

    this.executeK6MCPTestAsync(testId, scriptPath, params.config, params.url).catch(error => {
      console.error('k6 MCP test execution failed:', error);
      this.testManageService.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
    });

    return initialResult;
  }

  // ==================== 공통 테스트 상태 관리 ====================

  /**
   * 테스트 상태 조회 (공통)
   */
  async getTestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { testId } = req.params;

      if (!testId) {
        throw createValidationError('테스트 ID가 필요합니다.');
      }

      // TestManageService를 사용하여 공통으로 처리
      const result = await this.testManageService.getTestStatus(testId);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 테스트 취소 (공통)
   */
  async cancelTest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { testId } = req.params;

      if (!testId) {
        throw createValidationError('테스트 ID가 필요합니다.');
      }

      // TestManageService를 사용하여 공통으로 처리
      await this.testManageService.cancelTest(testId);

      // 테스트 취소 성공 응답
      res.json({
        success: true,
        message: '테스트 취소 요청이 처리되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 테스트 상태 업데이트 (공통)
   */
  async updateTestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { testId } = req.params;
      const { status, currentStep, message } = req.body;

      if (!testId || !status) {
        throw createValidationError('테스트 ID와 상태는 필수입니다.');
      }

      // TestManageService를 사용하여 공통으로 처리
      await this.testManageService.updateTestStatus(testId, status, currentStep, message);

      res.json({
        success: true,
        message: '테스트 상태가 업데이트되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== 내부 헬퍼 메서드 ====================













  /**
   * k6 MCP 테스트 비동기 실행 (MCP 서버 방식)
   */
  private async executeK6MCPTestAsync(
    testId: string, 
    _scriptPath: string, 
    config: { duration: string; vus: number; detailedConfig?: any },
    url: string
  ): Promise<void> {
    try {
      await this.k6Service.executeTestViaMCP(testId, {
        id: testId,
        url: url,
        targetUrl: url,
        name: 'k6 MCP Test',
        duration: config.duration,
        vus: config.vus,
        detailedConfig: config.detailedConfig,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);

      console.log('k6 MCP server test completed successfully, updating status to completed');
    } catch (error) {
      console.error('k6 MCP server test execution error:', error);
      await this.testManageService.updateTestStatus(testId, 'failed', 'k6 MCP server test execution failed');
      throw error;
    }
  }

  /**
   * k6 MCP 테스트 비동기 실행 (직접 실행 방식)
   */
  private async executeK6MCPTestDirectAsync(
    testId: string, 
    _scriptPath: string, 
    config: { duration: string; vus: number; detailedConfig?: any },
    url: string
  ): Promise<void> {
    try {
      await this.k6Service.executeTest(testId, {
        id: testId,
        url: url,
        targetUrl: url,
        name: 'k6 MCP Test',
        duration: config.duration,
        vus: config.vus,
        detailedConfig: config.detailedConfig,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);

      console.log('k6 test completed successfully, updating status to completed');
    } catch (error) {
      console.error('k6 MCP test execution error:', error);
      await this.testManageService.updateTestStatus(testId, 'failed', 'k6 MCP test execution failed');
      throw error;
    }
  }
} 