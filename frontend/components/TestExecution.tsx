import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
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
} from "../utils/api";
import { getAllTestResults as getBackendTestResults } from "../utils/backend-api";
import { getMcpTools } from "../utils/supabase/client";
import {
  createLoadTest,
  getTestStatus as getBackendTestStatus,
  cancelTest as cancelBackendTest,
  checkBackendHealth,
  executeK6MCPTestDirect,
  executeK6MCPTest,
  getLighthouseTestStatus,
  runLighthouseTest,
  executeE2ETest,
  executeDefaultTest,
  cancelLighthouseTest,
  cancelE2ETest,
} from "../utils/backend-api";

import { Progress } from "./ui/progress";

// 새로운 컴포넌트들 import
import {
  TestExecutionHeader,
  BasicTestSettings,
  TestConfiguration,
  TestProgress,
  RecentActivity,
  TestStartButton,
  StopConfirmDialog
} from "./test-execution";

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

        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    };

    loadData();
  }, []);

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
  const updateTestSetting = (testType: keyof any, key: string, value: any) => {
    setTestSettings((prev: any) => ({
      ...prev,
      [testType]: {
        ...prev[testType],
        [key]: value,
      },
    }));
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
        const res = await runLighthouseTest({ url: normalizedUrl, device, categories });
        if (!res.success) throw new Error(res.error || 'Lighthouse 테스트 시작 실패');
        const backendTestId = (res as any).testId || (res.data as any)?.testId;
        updateTestStatus(newTestId, 'running', { backendTestId, currentStep: 'Lighthouse 실행 중' });
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
        const script = createBasicK6Script(normalizedUrl);
        const res = await executeK6MCPTest({
          url: normalizedUrl,
          name: '웹 부하 테스트',
          description: testDescription,
          script,
          config,
        });
        if (!res.success) throw new Error(res.error || '부하 테스트 시작 실패');
        const backendTestId = (res as any).data?.testId || (res as any).testId;
        updateTestStatus(newTestId, 'running', { backendTestId, currentStep: 'k6 실행 중' });
      } else if (selectedTestType === 'playwright') {
        const res = await executeE2ETest({
          url: normalizedUrl,
          name: 'E2E 테스트',
          description: testDescription,
          config: { testType: 'playwright', settings: testSettings?.playwright || {} },
        });
        if (!res.success) throw new Error(res.error || 'E2E 테스트 시작 실패');
        const backendTestId = (res as any).data?.testId || (res as any).testId;
        updateTestStatus(newTestId, 'running', { backendTestId, currentStep: 'Playwright 실행 중' });
      } else {
        // 기본 실행 경로
        const res = await executeDefaultTest({ url: normalizedUrl, name: '기본 테스트', description: testDescription, testType: selectedTestType });
        if (!res.success) throw new Error(res.error || '테스트 시작 실패');
        const backendTestId = (res as any).data?.testId || (res as any).testId;
        updateTestStatus(newTestId, 'running', { backendTestId, currentStep: '실행 중' });
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
      if (target.type === 'lighthouse' && target.backendTestId) {
        await cancelLighthouseTest(target.backendTestId);
      } else if (target.type === 'load' && target.backendTestId) {
        await cancelBackendTest(target.backendTestId);
      } else if (target.type === 'playwright' && target.backendTestId) {
        await cancelE2ETest(target.backendTestId);
      }
      updateTestStatus(testId, 'stopped', { stopTime: new Date().toISOString() });
    } catch (err) {
      console.error('테스트 중단 실패:', err);
      updateTestStatus(testId, 'failed', { currentStep: '중단 실패' });
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
        {/* 헤더 */}
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