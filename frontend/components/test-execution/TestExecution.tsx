import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import { Slider } from "../ui/slider";
import {
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Globe,
  Timer,
  Settings,
  Zap,
  TrendingUp,
  BarChart3,
  Wrench,
  TestTube,
  XCircle,
  Download,
  Copy,
  Check,
  Shield,
  Database,
  Sparkles
} from "lucide-react";
import {
  executeTest,
  getTestStatus,
  stopTest,
  getAllTestResults,
  saveTestSettings,
  getTestSettings,
  getTestTypes,
  type TestType,
  isDemoMode,
} from "../../utils/api";

import { getMcpTools } from "../../utils/supabase/client";
import {
  createLoadTest,
  getTestStatus as getBackendTestStatus,
  cancelTest,
  checkBackendHealth,
  executeK6MCPTestDirect,
  executeK6MCPTest,
  getLighthouseTestStatus,
  runLighthouseTest,
  executeE2ETest,
  executeDefaultTest,
  getAllTestResults as getBackendTestResults,
} from "../../utils/backend-api";

import { Progress } from "../ui/progress";

// 새로운 컴포넌트들 import
import {
  TestExecutionHeader,
  BasicTestSettings,
  TestConfiguration,
  TestProgress,
  RecentActivity,
  TestStartButton,
  StopConfirmDialog
} from "./index";
import { DemoModeNotice } from "../common";

interface RunningTest {
  id: number;
  backendTestId?: string;
  url: string;
  type: string;
  status: string;
  startTime: string;
  currentStep: string;
  estimatedTime: string;
  logs: string[];
  settings: any;
  description?: string;
  testStartTime?: number;
  stopTime?: string;
}

interface TestExecutionProps {
  onNavigate?: (tabId: string) => void;
  isInDemoMode?: boolean;
  connectionStatus?: string;
}

export function TestExecution({ onNavigate, isInDemoMode }: TestExecutionProps) {
  const [testUrl, setTestUrl] = useState("");
  const [selectedTestType, setSelectedTestType] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [urlError, setUrlError] = useState("");
  const [runningTests, setRunningTests] = useState<RunningTest[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [recentTestResults, setRecentTestResults] = useState<any[]>([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [useBackendApi, setUseBackendApi] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<{[key: number]: string}>({});
  const [recentResults, setRecentResults] = useState<any[]>([]);
  


  // MCP 도구 상태
  const [mcpTools, setMcpTools] = useState<string[]>([]);
  const [mcpToolsLoading, setMcpToolsLoading] = useState(false);

  // 중단 확인 다이얼로그 상태
  const [stopConfirmDialog, setStopConfirmDialog] = useState<{
    isOpen: boolean;
    testId: number | null;
    testUrl: string;
  }>({
    isOpen: false,
    testId: null,
    testUrl: '',
  });

  // 테스트 설정 상태
  const [testSettings, setTestSettings] = useState<any>({});

  // 백엔드 API 연결 체크
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await checkBackendHealth();
        const isConnected = response.success === true || (response as any).status === 'ok';
        setBackendConnected(isConnected);
        
        if (isConnected) {
          setBackendError(null);
        } else {
          setBackendError(response.error || '백엔드 서버에 연결할 수 없습니다.');
        }
      } catch (error) {
        setBackendConnected(false);
        setBackendError('백엔드 서버에 연결할 수 없습니다.');
      }
    };

    checkBackendConnection();
  }, []);

  // MCP 도구 매핑
  const fetchMcpTools = async (testType: string) => {
    setMcpToolsLoading(true);
    try {
      const tools = await getMcpTools(testType);
      setMcpTools(tools);
    } catch (error) {
      const defaultTools = getDefaultMcpTools(testType);
      setMcpTools(defaultTools);
    } finally {
      setMcpToolsLoading(false);
    }
  };

  // 기본 MCP 도구 목록
  const getDefaultMcpTools = (testType: string) => {
    switch (testType) {
      case "performance":
        return [""];
      default:
        return [];
    }
  };

  // 테스트 타입이 변경될 때 MCP 도구 가져오기
  useEffect(() => {
    if (selectedTestType) {
      fetchMcpTools(selectedTestType);
    }
  }, [selectedTestType]);

  // 컴포넌트 마운트 시 저장된 설정 불러오기
  useEffect(() => {
    const loadData = async () => {
      try {
        // 테스트 유형 불러오기
        const testTypesResult = await getTestTypes();
        if (testTypesResult.success && testTypesResult.data) {
          const filteredTypes = (isDemoMode() || testTypesResult.offline)
            ? testTypesResult.data.filter((type) => type.enabled)
            : testTypesResult.data.filter((type) => type.enabled && type.category !== 'builtin');
          
          setTestTypes(filteredTypes);
        }

        // 저장된 설정 불러오기
        const settingsResult = await getTestSettings();
        if (settingsResult.success && settingsResult.data) {
          setTestSettings(settingsResult.data);
        }

        // 최근 테스트 결과 및 전체 통계 불러오기
        if (isDemoMode()) {
          // 데모 모드: mock 데이터 설정
          setRecentTestResults([
            {
              id: "demo_recent_1",
              url: "https://example.com",
              testType: "performance",
              status: "completed",
              score: 92,
              createdAt: "2025-01-23T10:30:00",
              updatedAt: "2025-01-23T10:32:15",
              duration: "2m 15s"
            },
            {
              id: "demo_recent_2", 
              url: "https://demo-site.com",
              testType: "lighthouse",
              status: "completed",
              score: 88,
              createdAt: "2025-01-23T09:15:00",
              updatedAt: "2025-01-23T09:16:45",
              duration: "1m 45s"
            },
            {
              id: "demo_recent_3",
              url: "https://test-site.com",
              testType: "load",
              status: "stopped",
              createdAt: "2025-01-23T08:00:00",
              updatedAt: "2025-01-23T08:05:00",
              duration: "5m 0s"
            }
          ]);
          
          // 데모 모드: mock 실행중 테스트 설정
          setRunningTests([
            {
              id: Date.now(),
              url: "https://demo-running.com",
              type: "lighthouse",
              status: "running",
              startTime: new Date().toISOString(),
              currentStep: "Lighthouse 실행 중",
              estimatedTime: "2m",
              logs: ["테스트 시작", "페이지 로딩 중", "Lighthouse 실행 중"],
              settings: {},
              description: "데모 실행중 테스트",
              testStartTime: Date.now() - 30000, // 30초 전 시작
            }
          ]);
        } else {
          // 실제 모드: 백엔드에서 데이터 가져오기
          try {
            // 최근 테스트 결과 가져오기
            const recentResults = await getBackendTestResults(1, 10);
            if (recentResults.success && recentResults.data) {
              setRecentTestResults(recentResults.data);
            }
            
            // 실행중인 테스트 가져오기
            const allResults = await getBackendTestResults(1, 1000);
            if (allResults.success && allResults.data) {
              const runningTestsData = allResults.data
                .filter((r: any) => r.status === 'running' || r.status === '실행중')
                .map((r: any) => ({
                  id: r.id || Date.now(),
                  backendTestId: r.testId || r.id,
                  url: r.url,
                  type: r.testType || r.type || 'unknown',
                  status: r.status,
                  startTime: r.createdAt || r.startTime || new Date().toISOString(),
                  currentStep: r.currentStep || '실행 중',
                  estimatedTime: r.estimatedTime || 'N/A',
                  logs: r.logs || [],
                  settings: r.settings || {},
                  description: r.description || '',
                  testStartTime: new Date(r.createdAt || r.startTime).getTime(),
                }));
              
              setRunningTests(runningTestsData);
            }
          } catch (error) {
            console.log('테스트 데이터를 불러올 수 없습니다:', error);
          }
        }

        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    };

    loadData();
  }, []);

  // 실행중인 테스트 상태 주기적 업데이트 (실제 모드에서만)
  useEffect(() => {
    if (isDemoMode() || !backendConnected) return;

    const updateRunningTests = async () => {
      try {
        const allResults = await getBackendTestResults(1, 1000);
        if (allResults.success && allResults.data) {
          const runningTestsData = allResults.data
            .filter((r: any) => r.status === 'running' || r.status === '실행중')
            .map((r: any) => ({
              id: r.id || Date.now(),
              backendTestId: r.testId || r.id,
              url: r.url,
              type: r.testType || r.type || 'unknown',
              status: r.status,
              startTime: r.createdAt || r.startTime || new Date().toISOString(),
              currentStep: r.currentStep || '실행 중',
              estimatedTime: r.estimatedTime || 'N/A',
              logs: r.logs || [],
              settings: r.settings || {},
              description: r.description || '',
              testStartTime: new Date(r.createdAt || r.startTime).getTime(),
            }));
          
          setRunningTests(runningTestsData);
        }
      } catch (error) {
        console.log('실행중인 테스트 상태 업데이트 실패:', error);
      }
    };

    // 초기 실행
    updateRunningTests();

    // 10초마다 상태 업데이트
    const interval = setInterval(updateRunningTests, 10000);

    return () => clearInterval(interval);
  }, [backendConnected, isDemoMode]);

  // URL 유효성 검사 함수
  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    try {
      const urlObj = new URL(url);
      return (urlObj.protocol === "http:" || urlObj.protocol === "https:");
    } catch {
      return false;
    }
  };

  // URL 자동 보정 함수
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    if (!trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  // URL 입력 핸들러
  const handleUrlChange = (value: string) => {
    setTestUrl(value);
    if (value && !validateUrl(value)) {
      setUrlError('올바른 URL을 입력해주세요.');
    } else {
      setUrlError('');
    }
  };

  // URL 입력 완료 시 자동 보정
  const handleUrlBlur = () => {
    if (testUrl.trim() && !testUrl.match(/^https?:\/\//i)) {
      const normalized = normalizeUrl(testUrl);
      setTestUrl(normalized);
      if (validateUrl(normalized)) {
        setUrlError("");
      }
    }
  };

  // Lighthouse 테스트 검증 함수
  const validateLighthouseTest = (): boolean => {
    if (!validateUrl(testUrl)) {
      return false;
    }
    if (selectedTestType === 'lighthouse') {
      const lighthouseSettings = testSettings?.lighthouse;
      if (!lighthouseSettings) {
        return false;
      }
      if (!lighthouseSettings.device || lighthouseSettings.device.trim() === '') {
        return false;
      }
      if (!lighthouseSettings.categories || lighthouseSettings.categories.length === 0) {
        return false;
      }
    }
    return true;
  };

  // 테스트 설정 업데이트 함수
  const updateTestSetting = async (testType: keyof any, key: string, value: any): Promise<void> => {
    let newSettings;
    
    if (key === 'fullSettings') {
      // 전체 설정을 한 번에 업데이트하는 경우
      newSettings = {
        ...testSettings,
        [testType]: value,
      };
    } else {
      // 개별 설정을 업데이트하는 경우
      newSettings = {
        ...testSettings,
        [testType]: {
          ...testSettings[testType],
          [key]: value,
        },
      };
    }
    
    // 로컬 상태 업데이트
    setTestSettings(newSettings);
    
    // 설정을 백엔드에 저장 (비동기)
    try {
      await saveTestSettings(newSettings);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      // 에러가 발생해도 로컬 상태는 유지
    }
  };

  // 테스트 시작 함수
  const handleStartTest = async () => {
    const normalizedUrl = normalizeUrl(testUrl);
    if (!normalizedUrl || !selectedTestType || isExecuting || !validateLighthouseTest()) {
      return;
    }

    if (!backendConnected) {
      alert('백엔드 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.');
      return;
    }

    setIsExecuting(true);

    // 러닝 테스트 등록 (UI 즉시 반영)
    const newTestId = Date.now();
    const startTimeIso = new Date().toISOString();
    const runningItem: RunningTest = {
      id: newTestId,
      url: normalizedUrl,
      type: selectedTestType,
      status: 'running',
      startTime: startTimeIso,
      currentStep: '테스트 시작',
      estimatedTime: '',
      logs: [],
      settings: testSettings,
      description: testDescription,
      testStartTime: Date.now(),
    };
    setRunningTests((prev) => [runningItem, ...prev]);
    


    // k6 기본 스크립트 생성기
    const createBasicK6Script = (targetUrl: string) => `import http from 'k6/http';\nimport { check, sleep } from 'k6';\nexport default function () {\n  const res = http.get('${targetUrl}');\n  check(res, { 'status is 200': (r) => r.status === 200 });\n  sleep(1);\n}`;

    try {
      if (selectedTestType === 'lighthouse') {
        const device = testSettings?.lighthouse?.device || 'desktop';
        const categories = testSettings?.lighthouse?.categories || ['performance', 'accessibility', 'best-practices', 'seo'];
        
        console.log('🔧 Lighthouse 테스트 설정:', { device, categories, testSettings: testSettings?.lighthouse });
        
        const res = await runLighthouseTest({ 
          url: normalizedUrl, 
          device, 
          categories,
          name: 'Lighthouse 테스트',
          description: testDescription
        });
        if (!res.success) throw new Error(res.error || 'Lighthouse 테스트 시작 실패');
        
        // 백엔드 응답에서 testId와 상태 정보 추출
        const backendTestId = (res as any).data?.testId || (res as any).testId;
        const testStatus = (res as any).data?.status || 'running';
        const currentStep = (res as any).data?.currentStep || 'Lighthouse 실행 중';
        
        updateTestStatus(newTestId, 'running', { 
          backendTestId, 
          currentStep,
          status: testStatus
        });
      } else if (selectedTestType === 'load') {
        // k6 기본 프리셋 기반 구성
        const loadCfg = testSettings?.load || {};
        const config = {
          url: normalizedUrl,
          testType: 'load',
          duration: loadCfg.duration || '3m',
          vus: loadCfg.preAllocatedVUs || 10,
          detailedConfig: loadCfg,
        } as any;
        
        console.log('🔧 Load 테스트 설정:', { loadCfg, config });
        const script = createBasicK6Script(normalizedUrl);
        const res = await executeK6MCPTest({
          url: normalizedUrl,
          name: '웹 부하 테스트',
          description: testDescription,
          script,
          config,
        });
        if (!res.success) throw new Error(res.error || '부하 테스트 시작 실패');
        
        // 백엔드 응답에서 testId와 상태 정보 추출
        const backendTestId = (res as any).data?.testId || (res as any).testId;
        const testStatus = (res as any).data?.status || 'running';
        const currentStep = (res as any).data?.currentStep || 'k6 실행 중';
        
        updateTestStatus(newTestId, 'running', { 
          backendTestId, 
          currentStep,
          status: testStatus
        });
      } else if (selectedTestType === 'e2e') {
        const playwrightSettings = testSettings?.playwright || {};
        
        console.log('🔧 E2E 테스트 설정:', { playwrightSettings });
        
        const res = await executeE2ETest({
          url: normalizedUrl,
          name: 'E2E 테스트',
          description: testDescription,
          config: { testType: 'e2e', settings: playwrightSettings },
        });
        if (!res.success) throw new Error(res.error || 'E2E 테스트 시작 실패');
        
        // 백엔드 응답에서 testId와 상태 정보 추출
        const backendTestId = (res as any).data?.testId || (res as any).testId;
        const testStatus = (res as any).data?.status || 'running';
        const currentStep = (res as any).data?.currentStep || 'Playwright 실행 중';
        
        updateTestStatus(newTestId, 'running', { 
          backendTestId, 
          currentStep,
          status: testStatus
        });
      } else {
        // 기본 실행 경로
        const res = await executeDefaultTest({ 
          url: normalizedUrl, 
          name: '기본 테스트', 
          description: testDescription, 
          testType: selectedTestType 
        });
        if (!res.success) throw new Error(res.error || '테스트 시작 실패');
        
        // 백엔드 응답에서 testId와 상태 정보 추출
        const backendTestId = (res as any).data?.testId || (res as any).testId;
        const testStatus = (res as any).data?.status || 'running';
        const currentStep = (res as any).data?.currentStep || '실행 중';
        
        updateTestStatus(newTestId, 'running', { 
          backendTestId, 
          currentStep,
          status: testStatus
        });
      }
    } catch (err: any) {
      console.error('테스트 시작 실패:', err);
      updateTestStatus(newTestId, 'failed', { currentStep: err?.message || '시작 실패' });
    } finally {
      setIsExecuting(false);
    }
  };

  // 테스트 중단 함수
  const handleStopTest = async (testId: number) => {
    const target = runningTests.find((t) => t.id === testId);
    if (!target) return;

    try {
      // 먼저 UI 상태를 'stopping'으로 변경
      updateTestStatus(testId, 'stopping', { currentStep: '중단 중...' });

      let cancelSuccess = false;
      
      // 백엔드 API 호출 - 통합된 API 사용
      if (target.backendTestId) {
        // 테스트 타입을 백엔드 형식에 맞게 매핑
        let backendTestType = 'load'; // 기본값
        
        if (target.type === 'lighthouse') {
          backendTestType = 'lighthouse';
        } else if (target.type === 'e2e') {
          backendTestType = 'e2e';
        } else if (target.type === 'load' || target.type === 'k6') {
          backendTestType = 'load';
        }

        console.log(`테스트 중단 요청: ID=${target.backendTestId}, Type=${backendTestType}`);
        
        // 통합된 테스트 취소 API 사용
        const result = await cancelTest(target.backendTestId, backendTestType);
        cancelSuccess = result.success;
        
        console.log('테스트 중단 결과:', result);
      } else {
        // 백엔드 ID가 없는 경우 (데모 모드 등) 로컬에서만 처리
        cancelSuccess = true;
      }

      if (cancelSuccess) {
        // 백엔드에서 성공적으로 중단된 경우
        updateTestStatus(testId, 'stopped', { 
          stopTime: new Date().toISOString(),
          currentStep: '테스트가 중단되었습니다'
        });
        
        // 백엔드 상태 동기화를 위해 잠시 후 실행중인 테스트 목록 새로고침
        setTimeout(() => {
          if (!isDemoMode() && backendConnected) {
            // 주기적 업데이트 useEffect가 있으므로 별도 호출 불필요
            console.log('테스트 중단 완료, 백엔드 상태 동기화 대기 중...');
          }
        }, 1000);
      } else {
        // 백엔드에서 중단 실패한 경우
        updateTestStatus(testId, 'failed', { currentStep: '중단 실패: 백엔드 응답 오류' });
      }
    } catch (err) {
      console.error('테스트 중단 실패:', err);
      updateTestStatus(testId, 'failed', { currentStep: '중단 실패: 네트워크 오류' });
    }
  };

  // 테스트 상태 업데이트 공통 함수
  const updateTestStatus = (testId: number, newStatus: string, additionalData: any = {}) => {
    setRunningTests((prev) => {
      const updated = prev.map((test) => 
        test.id === testId 
          ? { ...test, status: newStatus, ...additionalData }
          : test
      );
      
      if (newStatus === 'stopped' || newStatus === 'completed') {
        // 테스트가 완료되거나 중단되면 최근 결과에 추가
        const completedTest = prev.find(test => test.id === testId);
        if (completedTest) {
          const testData = {
            ...completedTest,
            status: newStatus,
            ...additionalData,
            updatedAt: new Date().toISOString()
          };
          addTestToRecentResults(testData);
          

        }
        return updated.filter(test => test.id !== testId);
      }
      
      return updated;
    });
  };

  // 테스트를 최근 결과에 추가하는 공통 함수
  const addTestToRecentResults = (testData: any) => {
    setRecentTestResults((prev) => {
      const existingIndex = prev.findIndex(result => result.id === testData.id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = testData;
        return updated;
      } else {
        return [testData, ...prev.slice(0, 4)];
      }
    });
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-8 mx-auto">
        {/* 페이지 헤더 */}
        <TestExecutionHeader isInDemoMode={isInDemoMode} />

        {/* 메인 설정 영역: 세로 레이아웃 */}
        <div className="space-y-8">
          {/* 기본 테스트 설정 */}
          <BasicTestSettings
            testUrl={testUrl}
            setTestUrl={setTestUrl}
            selectedTestType={selectedTestType}
            setSelectedTestType={setSelectedTestType}
            testDescription={testDescription}
            setTestDescription={setTestDescription}
            testTypes={testTypes}
            mcpTools={mcpTools}
            mcpToolsLoading={mcpToolsLoading}
            isExecuting={isExecuting}
          />

          {/* 테스트 설정 영역 */}
          <TestConfiguration
            selectedTestType={selectedTestType}
            testSettings={testSettings}
            updateTestSetting={updateTestSetting}
            testTypes={testTypes}
          />

          {/* 테스트 시작 버튼 */}
          <TestStartButton
            testUrl={testUrl}
            selectedTestType={selectedTestType}
            isExecuting={isExecuting}
            runningTests={runningTests}
            validateLighthouseTest={validateLighthouseTest}
            onStartTest={handleStartTest}
          />
        </div>

        {/* 테스트 진행 상황 */}
        <TestProgress
          runningTests={runningTests}
          testTypes={testTypes}
          elapsedTime={elapsedTime}
          onStopTest={handleStopTest}
          setStopConfirmDialog={setStopConfirmDialog}
        />

        {/* 최근 활동 */}
        <RecentActivity
          runningTests={runningTests}
          recentTestResults={recentTestResults}
          onNavigate={onNavigate}
        />
      </div>

      {/* 중단 확인 다이얼로그 */}
      <StopConfirmDialog
        isOpen={stopConfirmDialog.isOpen}
        testUrl={stopConfirmDialog.testUrl}
        onConfirm={() => {
          if (stopConfirmDialog.testId) {
            updateTestStatus(stopConfirmDialog.testId, 'stopping');
            setStopConfirmDialog(prev => ({ ...prev, isOpen: false }));
            handleStopTest(stopConfirmDialog.testId);
          }
        }}
        onCancel={() => setStopConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
} 