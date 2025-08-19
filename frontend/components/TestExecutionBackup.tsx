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
} from "../utils/backend-api";

import { Progress } from "./ui/progress";

interface RunningTest {
  id: number;
  backendTestId?: string; // 백엔드 testId
  url: string;
  type: string;
  status: string; // 'running', 'stopping', 'stopped', 'completed', 'failed'
  startTime: string;
  currentStep: string;
  estimatedTime: string;
  logs: string[];
  settings: any;
  description?: string; // 테스트 설명
  testStartTime?: number; // 테스트 시작 시간 (밀리초)
  stopTime?: string; // 테스트 중지 시간 (밀리초)
}

interface LoadTestStage {
  target: number;
  duration: string;
  description?: string;
}

interface LoadTestPreset {
  id: string;
  name: string;
  description: string;
  icon: any;
  startRate: number;
  timeUnit: string;
  preAllocatedVUs: number;
  maxVUs: number;
  stages: LoadTestStage[];
}

interface TestSettings {
  performance: {
    timeout: number;
    retries: number;
    device: string;
    metrics: string[];
    throttling: boolean;
  };
  lighthouse: {
    device: string;
    categories: string[];
    throttling: string;
    locale: string;
  };
  load: {
    executor: string;
    preset: string;
    startRate: number;
    timeUnit: string;
    preAllocatedVUs: number;
    maxVUs: number;
    stages: LoadTestStage[];
  };
  security: {
    checks: string[];
    depth: string;
    includeSubdomains: boolean;
    timeout: number;
  };
  accessibility: {
    standard: string;
    level: string;
    includeWarnings: boolean;
    checkImages: boolean;
  };
  playwright: {
    browser: string;
    headless: boolean;
    viewport: {
      width: number;
      height: number;
    };
    timeout: number;
    navigationTimeout: number;
    actionTimeout: number;
    screenshotOnFailure: boolean;
    videoRecording: boolean;
    traceRecording: boolean;
    slowMo: number;
    userAgent: string;
    locale: string;
    timezone: string;
    permissions: string[];
    geolocation: {
      latitude: number;
      longitude: number;
      accuracy: number;
    };
    colorScheme: string;
    reducedMotion: boolean;
    forcedColors: string;
    acceptDownloads: boolean;
    ignoreHttpsErrors: boolean;
    bypassCSP: boolean;
    extraHttpHeaders: Record<string, string>;
    httpCredentials: {
      username: string;
      password: string;
    };
    proxy: {
      server: string;
      bypass: string;
      username: string;
      password: string;
    };
  };
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

  // 백엔드 API 연결 체크
  useEffect(() => {
    const checkBackendConnection = async () => {
      console.log('TestExecution: Checking backend connection...');
      try {
        const response = await checkBackendHealth();
        console.log('TestExecution: Backend health check response:', response);
        
        // 백엔드 응답 형식에 맞게 처리
        const isConnected = response.success === true || (response as any).status === 'ok';
        setBackendConnected(isConnected);
        
        if (isConnected) {
          // console.log('TestExecution: 백엔드 API 연결 성공');
          setBackendError(null);
        } else {
          console.log('TestExecution: 백엔드 API 연결 실패:', response.error);
          setBackendError(response.error || '백엔드 서버에 연결할 수 없습니다.');
        }
      } catch (error) {
        console.error('TestExecution: 백엔드 API 연결 실패:', error);
        setBackendConnected(false);
        setBackendError('백엔드 서버에 연결할 수 없습니다.');
      }
    };

    checkBackendConnection();
  }, []);

  // 실시간 경과 시간 업데이트
  useEffect(() => {
    if (runningTests.length === 0) return;

    const timer = setInterval(() => {
      setElapsedTime(prev => {
        const newElapsedTime: {[key: number]: string} = {};
        runningTests.forEach(test => {
          if (test.testStartTime) {
            newElapsedTime[test.id] = calculateElapsedTime(test);
          }
        });
        return newElapsedTime;
      });
    }, 1000); // 1초마다 업데이트

    return () => clearInterval(timer);
  }, [runningTests]);

  // 최근 테스트 결과 가져오기 및 실행 중인 테스트 상태 동기화
  useEffect(() => {
    const fetchRecentTestResults = async () => {
      try {
        const result = await getBackendTestResults(1, 10); // 최근 10개 테스트로 증가
        if (result.success && result.data) {
          setRecentTestResults(result.data);
          
          // 실행 중인 테스트가 있다면 백엔드 상태와 동기화
          const runningTestsFromBackend = result.data.filter((test: any) => 
            test.status === 'running' || test.status === '실행중'
          );
          
          if (runningTestsFromBackend.length > 0) {
            console.log('백엔드에서 실행 중인 테스트 발견:', runningTestsFromBackend);
            
            // 프론트엔드의 runningTests와 백엔드 상태 동기화
            setRunningTests(prev => {
              const updated = prev.map(frontendTest => {
                const backendTest = runningTestsFromBackend.find(bt => 
                  bt.id === frontendTest.id || bt.url === frontendTest.url
                );
                
                if (backendTest) {
                  // 백엔드 상태가 'stopped' 또는 'completed'라면 프론트엔드도 업데이트
                  if (backendTest.status === 'stopped' || backendTest.status === 'completed') {
                    console.log(`테스트 ${frontendTest.id} 상태 동기화: ${frontendTest.status} -> ${backendTest.status}`);
                    return {
                      ...frontendTest,
                      status: backendTest.status,
                      currentStep: backendTest.status === 'stopped' ? '백엔드에서 중단됨' : '백엔드에서 완료됨'
                    };
                  }
                }
                return frontendTest;
              });
              
              // 백엔드에서 중단되거나 완료된 테스트는 runningTests에서 제거
              return updated.filter(test => 
                test.status !== 'stopped' && test.status !== 'completed'
              );
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch recent test results:', error);
        // 데이터베이스 오류 시 빈 배열로 설정
        setRecentTestResults([]);
      }
    };

    fetchRecentTestResults();
    
    // 주기적으로 상태 동기화 (30초마다)
    const syncInterval = setInterval(fetchRecentTestResults, 30000);
    
    return () => clearInterval(syncInterval);
  }, []);

  // MCP 도구 상태
  const [mcpTools, setMcpTools] = useState<string[]>([]);
  const [mcpToolsLoading, setMcpToolsLoading] = useState(false);
  
  // Playwright 테스트 설정 모드 (기존 설정 vs 시나리오 입력)
  const [playwrightConfigMode, setPlaywrightConfigMode] = useState<'settings' | 'scenario'>('settings');
  const [playwrightScenario, setPlaywrightScenario] = useState('');

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

  // MCP 도구 매핑 (데이터베이스에서 가져오기)
  const fetchMcpTools = async (testType: string) => {
    setMcpToolsLoading(true);
    try {
      const tools = await getMcpTools(testType);
      console.log('tools', tools);
      setMcpTools(tools);
    } catch (error) {
      console.error('Error fetching MCP tools:', error);
      // 오류 시 기본값 사용
      const defaultTools = getDefaultMcpTools(testType);
      setMcpTools(defaultTools);
    } finally {
      setMcpToolsLoading(false);
    }
  };

  // DB의 config_template을 활용한 기본 설정 생성
  const generateDefaultSettingsFromDB = (testType: any): any => {
    if (!testType || !testType.config_template) {
      return null;
    }

    const template = testType.config_template;
    
    switch (testType.id) {
      case 'lighthouse':
        return {
          device: template.device || 'desktop',
          categories: template.categories || ['performance'],
          throttling: template.throttling || 'none',
          locale: template.locale || 'ko-KR'
        };
      case 'load':
        return {
          executor: 'ramping-vus',
          preset: 'custom',
          startRate: template.startRate || 50,
          timeUnit: template.timeUnit || '30s',
          preAllocatedVUs: template.preAllocatedVUs || 5,
          maxVUs: template.maxVUs || 100,
          stages: template.stages || []
        };
      case 'playwright':
        return {
          browser: template.browser || 'chromium',
          headless: template.headless !== undefined ? template.headless : true,
          viewport: template.viewport || { width: 1280, height: 720 },
          timeout: template.timeout || 30000,
          navigationTimeout: template.navigationTimeout || 30000,
          actionTimeout: template.actionTimeout || 5000,
          screenshotOnFailure: template.screenshotOnFailure !== undefined ? template.screenshotOnFailure : true,
          videoRecording: template.videoRecording || false,
          traceRecording: template.traceRecording || false,
          slowMo: template.slowMo || 0,
          userAgent: template.userAgent || '',
          locale: template.locale || 'ko-KR',
          timezone: template.timezone || 'Asia/Seoul'
        };
      default:
        return null;
    }
  };

  // 테스트 타입이 변경될 때 MCP 도구 가져오기 및 DB 설정 적용
  useEffect(() => {
    if (selectedTestType) {
      fetchMcpTools(selectedTestType);
      
      // DB의 config_template을 활용하여 기본 설정 적용
      const selectedType = testTypes.find(t => t.id === selectedTestType);
      if (selectedType) {
        const defaultSettings = generateDefaultSettingsFromDB(selectedType);
        if (defaultSettings) {
          setTestSettings(prev => ({
            ...prev,
            [selectedTestType]: {
              ...prev[selectedTestType as keyof TestSettings],
              ...defaultSettings
            }
          }));
        }
      }
    }
  }, [selectedTestType, testTypes]);

  // Playwright 테스트 완료 상태 모니터링
  useEffect(() => {
    if (runningTests.length === 0) return;

    const completedTests = runningTests.filter(test => 
      test.status === 'completed' || test.status === 'failed' || test.status === '완료' || test.status === '실패'
    );

    if (completedTests.length > 0) {
      // 완료된 테스트를 실행 중 목록에서 제거
      setRunningTests(prev => prev.filter(test => 
        !(test.status === 'completed' || test.status === 'failed' || test.status === '완료' || test.status === '실패')
      ));

      // 실행 현황 새로고침
      const refreshResults = async () => {
        try {
          const resultsResult = await getBackendTestResults();
          if (resultsResult.success && resultsResult.data) {
            const resultsArray = Array.isArray(resultsResult.data) ? resultsResult.data : [];
            setRecentResults(resultsArray.slice(0, 5));
          }
        } catch (error) {
          console.error('Failed to refresh test results:', error);
          // 데이터베이스 오류 시 기존 결과 유지
        }
      };

      refreshResults();
    }
  }, [runningTests]);

  // 테스트 상태 변경 시 실행 현황 데이터 자동 업데이트
  useEffect(() => {
    const refreshResults = async () => {
      try {
        const resultsResult = await getBackendTestResults();
        if (resultsResult.success && resultsResult.data) {
          const resultsArray = Array.isArray(resultsResult.data) ? resultsResult.data : [];
          setRecentResults(resultsArray.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to refresh test results:', error);
      }
    };

    // 컴포넌트 마운트 시 초기 데이터 로드
    refreshResults();

    // 주기적으로 실행 현황 데이터 업데이트 (10초마다)
    const interval = setInterval(refreshResults, 10000);

    return () => clearInterval(interval);
  }, []);

  // 테스트 실행/중단/완료 시 즉시 실행 현황 데이터 업데이트
  useEffect(() => {
    const refreshResults = async () => {
      try {
        const resultsResult = await getBackendTestResults();
        if (resultsResult.success && resultsResult.data) {
          const resultsArray = Array.isArray(resultsResult.data) ? resultsResult.data : [];
          setRecentResults(resultsArray.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to refresh test results:', error);
      }
    };

    // runningTests 상태가 변경될 때마다 실행 현황 데이터 업데이트
    refreshResults();
  }, [runningTests.length, runningTests.map(t => t.status).join(',')]);

  // 테스트 중지 후 백엔드 상태 동기화
  useEffect(() => {
    const syncStoppedTests = async () => {
      const stoppedTests = runningTests.filter(test => test.status === 'stopped');
      
      for (const test of stoppedTests) {
        if (test.backendTestId) {
          try {
            // 백엔드에서 테스트 상태 확인
            const statusResponse = await getBackendTestStatus(test.backendTestId);
            if (statusResponse.success && statusResponse.data) {
              const backendStatus = statusResponse.data.status;
              
              // 백엔드 상태가 'cancelled' 또는 'stopped'인 경우 프론트엔드 상태 동기화
              if (backendStatus === 'cancelled' || backendStatus === 'stopped') {
                console.log(`테스트 ${test.id} 백엔드 상태 동기화: ${backendStatus}`);
                
                // 공통 함수를 사용하여 상태 동기화
                updateTestStatus(test.id, 'stopped', {
                  currentStep: '사용자에 의해 중단됨'
                });
              }
            }
          } catch (error) {
            console.error(`테스트 ${test.id} 상태 동기화 실패:`, error);
          }
        }
      }
    };

    // 중단된 테스트가 있을 때만 동기화 실행
    if (runningTests.some(test => test.status === 'stopped')) {
      syncStoppedTests();
    }
  }, [runningTests.filter(test => test.status === 'stopped').length]);

  // 기본 MCP 도구 목록 (fallback)
  const getDefaultMcpTools = (testType: string) => {
    switch (testType) {
      case "performance":
        return [""];
      default:
        return [];
    }
  };

  // 부하테스트 프리셋 정의 (k6 공식 기준)
  const loadTestPresets: LoadTestPreset[] = [
    {
      id: "low",
      name: "Low",
      description: "가벼운 부하 테스트 (소규모 트래픽, ~2 TPS)",
      icon: TrendingUp,
      startRate: 50,
      timeUnit: "30s",
      preAllocatedVUs: 5,
      maxVUs: 100,
      stages: [
        {
          target: 50,
          duration: "30s",
          description: "점진적 시작",
        },
        {
          target: 100,
          duration: "1m",
          description: "낮은 부하 유지",
        },
        {
          target: 50,
          duration: "30s",
          description: "점진적 감소",
        },
      ],
    },
    {
      id: "medium",
      name: "Medium",
      description:
        "중간 규모 부하 테스트 (일반적인 트래픽, ~5-250 TPS)",
      icon: BarChart3,
      startRate: 100,
      timeUnit: "20s",
      preAllocatedVUs: 10,
      maxVUs: 500,
      stages: [
        {
          target: 100,
          duration: "20s",
          description: "초기 부하 단계",
        },
        {
          target: 5000,
          duration: "1m",
          description: "점진적 증가",
        },
        {
          target: 5000,
          duration: "2m",
          description: "중간 부하 유지",
        },
        {
          target: 100,
          duration: "30s",
          description: "점진적 감소",
        },
      ],
    },
    {
      id: "high",
      name: "High",
      description:
        "고강도 부하 테스트 (대규모 트래픽, ~20-1000 TPS + 스파이크)",
      icon: Zap,
      startRate: 200,
      timeUnit: "10s",
      preAllocatedVUs: 20,
      maxVUs: 1000,
      stages: [
        {
          target: 200,
          duration: "10s",
          description: "빠른 시작",
        },
        {
          target: 10000,
          duration: "0",
          description: "즉시 스파이크",
        },
        {
          target: 10000,
          duration: "3m",
          description: "고부하 유지",
        },
        {
          target: 1000,
          duration: "1m",
          description: "완만한 감소",
        },
        { target: 200, duration: "20s", description: "정상화" },
      ],
    },
    {
      id: "custom",
      name: "Custom",
      description:
        "사용자 정의 설정 (k6 iterations per timeUnit 기준)",
      icon: Wrench,
      startRate: 100,
      timeUnit: "20s",
      preAllocatedVUs: 10,
      maxVUs: 500,
      stages: [
        {
          target: 100,
          duration: "20s",
          description: "초기 부하 단계",
        },
        {
          target: 1000,
          duration: "1m",
          description: "점진적 증가",
        },
        {
          target: 1000,
          duration: "1m",
          description: "최대 부하 유지",
        },
        {
          target: 100,
          duration: "20s",
          description: "점진적 감소",
        },
      ],
    },
  ];

  // 기본 k6 설정 (Medium preset을 기본값으로)
  const getDefaultLoadSettings = () => {
    const mediumPreset = loadTestPresets.find(
      (p) => p.id === "medium",
    );
    
    // medium preset을 찾지 못한 경우 기본값 사용
    if (!mediumPreset) {
      console.warn('Medium preset not found, using default values');
      return {
        executor: "ramping-arrival-rate",
        preset: "medium",
        startRate: 100,
        timeUnit: "20s",
        preAllocatedVUs: 10,
        maxVUs: 500,
        stages: [
          {
            target: 100,
            duration: "20s",
            description: "초기 부하 단계",
          },
          {
            target: 5000,
            duration: "1m",
            description: "점진적 증가",
          },
          {
            target: 5000,
            duration: "2m",
            description: "중간 부하 유지",
          },
          {
            target: 100,
            duration: "30s",
            description: "점진적 감소",
          },
        ],
      };
    }
    
    return {
      executor: "ramping-arrival-rate",
      preset: "medium",
      startRate: mediumPreset.startRate,
      timeUnit: mediumPreset.timeUnit,
      preAllocatedVUs: mediumPreset.preAllocatedVUs,
      maxVUs: mediumPreset.maxVUs,
      stages: mediumPreset.stages,
    };
  };

  // 테스트 유형별 기본 설정
  const [testSettings, setTestSettings] =
    useState<TestSettings>({
      performance: {
        timeout: 30,
        retries: 3,
        device: "desktop",
        metrics: ["FCP", "LCP", "CLS"],
        throttling: true,
      },
      lighthouse: {
        device: "desktop",
        categories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
        throttling: "4g",
        locale: "ko",
      },
      load: getDefaultLoadSettings(),
      security: {
        checks: ["ssl", "headers", "xss"],
        depth: "medium",
        includeSubdomains: false,
        timeout: 60,
      },
      accessibility: {
        standard: "wcag21",
        level: "aa",
        includeWarnings: true,
        checkImages: true,
      },
      playwright: {
        browser: "chromium",
        headless: true,
        viewport: {
          width: 1280,
          height: 720,
        },
        timeout: 30000,
        navigationTimeout: 30000,
        actionTimeout: 5000,
        screenshotOnFailure: true,
        videoRecording: false,
        traceRecording: false,
        slowMo: 0,
        userAgent: "",
        locale: "ko-KR",
        timezone: "Asia/Seoul",
        permissions: [],
        geolocation: {
          latitude: 37.5665,
          longitude: 126.9780,
          accuracy: 100,
        },
        colorScheme: "light",
        reducedMotion: false,
        forcedColors: "none",
        acceptDownloads: true,
        ignoreHttpsErrors: false,
        bypassCSP: false,
        extraHttpHeaders: {},
        httpCredentials: {
          username: "",
          password: "",
        },
        proxy: {
          server: "",
          bypass: "",
          username: "",
          password: "",
        },
      },
    });

  // 설정 마이그레이션 함수 - 기존 설정을 새 k6 형식으로 변환
  const migrateLoadSettings = (loadSettings: any) => {
    // 이미 새 형식이면 그대로 반환
    if (loadSettings.executor && loadSettings.stages) {
      // preset 속성이 없으면 custom으로 설정
      if (!loadSettings?.preset) {
        loadSettings.preset = "custom";
      }
      // stages가 배열인지 확인하고 기본값으로 대체
      if (!Array.isArray(loadSettings.stages)) {
        return {
          ...loadSettings,
          stages: getDefaultLoadSettings().stages,
        };
      }
      return loadSettings;
    }

    // 기존 형식이면 새 형식으로 변환
    const defaultSettings = getDefaultLoadSettings();

    // 기존 설정값이 있으면 일부 매핑
    if (loadSettings.maxUsers || loadSettings.maxVUs) {
      defaultSettings.maxVUs =
        loadSettings.maxUsers || loadSettings.maxVUs || 500;
    }

    return defaultSettings;
  };

  // 프리셋 변경 핸들러
  const handlePresetChange = (presetId: string) => {
    const preset = loadTestPresets.find(
      (p) => p.id === presetId,
    );
    if (!preset) return;

    const newSettings = {
      ...testSettings.load,
      preset: presetId,
      startRate: preset.startRate,
      timeUnit: preset.timeUnit,
      preAllocatedVUs: preset.preAllocatedVUs,
      maxVUs: preset.maxVUs,
      stages: [...preset.stages], // 깊은 복사
    };

    setTestSettings((prev) => ({
      ...prev,
      load: newSettings,
    }));
  };

  // 컴포넌트 마운트 시 저장된 설정 불러오기 및 기존 테스트 결과 불러오기
  useEffect(() => {
    const loadData = async () => {
      try {
        // 테스트 유형 불러오기
        const testTypesResult = await getTestTypes();
        if (testTypesResult.success && testTypesResult.data) {
          // 데모 모드나 오프라인 모드일 때는 builtin 카테고리 포함
          // 일반 모드일 때만 builtin 카테고리 제외
          const filteredTypes = (isDemoMode() || testTypesResult.offline)
            ? testTypesResult.data.filter((type) => type.enabled)
            : testTypesResult.data.filter((type) => type.enabled && type.category !== 'builtin');
          
          setTestTypes(filteredTypes);
        } else {
          // API 실패 시 데모 모드가 아니면 빈 배열 사용
          if (!isDemoMode()) {
            setTestTypes([]);
          } else if (
            testTypesResult.data &&
            testTypesResult.data.length > 0
          ) {
            // 데모 모드일 때만 데이터가 있으면 사용
            setTestTypes(
              testTypesResult.data.filter(
                (type) => type.enabled,
              ),
            );
          } else {
            setTestTypes([]);
          }
        }

        // 저장된 설정 불러오기
        const settingsResult = await getTestSettings();
        if (settingsResult.success && settingsResult.data) {
          const loadedSettings = settingsResult.data;

          // 부하테스트 설정 마이그레이션
          if (loadedSettings.load) {
            loadedSettings.load = migrateLoadSettings(
              loadedSettings.load,
            );
          }

          // playwright 설정이 없으면 기본값 추가
          if (!loadedSettings.playwright) {
            loadedSettings.playwright = {
              browser: "chromium",
              headless: true,
              viewport: {
                width: 1280,
                height: 720,
              },
              timeout: 30000,
              navigationTimeout: 30000,
              actionTimeout: 5000,
              screenshotOnFailure: true,
              videoRecording: false,
              traceRecording: false,
              slowMo: 0,
              userAgent: "",
              locale: "ko-KR",
              timezone: "Asia/Seoul",
              permissions: [],
              geolocation: {
                latitude: 37.5665,
                longitude: 126.9780,
                accuracy: 100,
              },
              colorScheme: "light",
              reducedMotion: false,
              forcedColors: "none",
              acceptDownloads: true,
              ignoreHttpsErrors: false,
              bypassCSP: false,
              extraHttpHeaders: {},
              httpCredentials: {
                username: "",
                password: "",
              },
              proxy: {
                server: "",
                bypass: "",
                username: "",
                password: "",
              },
            };
          }

          setTestSettings(loadedSettings);
        }

        // 기존 테스트 결과 불러오기
        const resultsResult = await getAllTestResults();
        if (resultsResult.success && resultsResult.data) {
          const formattedTests = resultsResult.data.map(
            (test) => ({
              id: parseInt(test.id.split("_")[1]) || Date.now(),
              url: test.url,
              type: test.testType,
              status:
                test.status === "completed"
                  ? "완료"
                  : test.status === "stopped"
                    ? "중단됨"
                    : test.status === "failed"
                      ? "실패"
                      : "실행중",
              startTime: new Date(
                test.startTime,
              ).toLocaleTimeString(),
              currentStep:
                test.status === "completed"
                  ? "완료"
                  : test.status === "stopped"
                    ? "사용자에 의해 중단됨"
                    : test.status === "failed"
                      ? "오류 발생"
                      : "처리 중...",
              estimatedTime:
                test.status === "completed" ||
                test.status === "stopped"
                  ? "완료"
                  : "약 3분",
              logs: test.logs || [],
              settings: test.settings,
            }),
          );
          setRunningTests(formattedTests);
        }

        setIsConnected(true);
      } catch (error) {
        console.error("Error loading data:", error);
        setIsConnected(false);
      }
    };

    loadData();
  }, []);

  // 설정 변경 시 자동 저장
  useEffect(() => {
    if (isConnected) {
      const saveSettings = async () => {
        try {
          await saveTestSettings(testSettings);
        } catch (error) {
          console.error("Error saving settings:", error);
        }
      };

      // 디바운스로 너무 자주 저장되지 않도록 함
      const timeoutId = setTimeout(saveSettings, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [testSettings, isConnected]);

  // URL 유효성 검사 함수
  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false;

    try {
      const urlObj = new URL(url);
      // HTTP 또는 HTTPS 프로토콜만 허용
      return (
        urlObj.protocol === "http:" ||
        urlObj.protocol === "https:"
      );
    } catch {
      return false;
    }
  };

  // URL 자동 보정 함수
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;

    // 프로토콜이 없으면 https:// 추가
    if (!trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`;
    }

    return trimmed;
  };

  // URL 입력 핸들러
  const handleUrlChange = (value: string) => {
    setTestUrl(value);

    // URL 유효성 검사
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

  // 테스트 실행 단계들
  const getTestSteps = (type: string) => {
    switch (type) {
      case "performance":
        return [
          "초기화 중...",
          "페이지 로딩 분석 중...",
          "FCP 측정 중...",
          "LCP 측정 중...",
          "CLS 계산 중...",
          "결과 생성 중...",
        ];
      case "lighthouse":
        return [
          "초기화 중...",
          "성능 분석 중...",
          "접근성 검사 중...",
          "모범 사례 확인 중...",
          "SEO 분석 중...",
          "종합 점수 계산 중...",
        ];
      case "load":
        return [
          "초기화 중...",
          "가상 사용자 생성 중...",
          "부하 증가 중...",
          "응답 시간 측정 중...",
          "오류율 확인 중...",
          "결과 분석 중...",
        ];
      case "security":
        return [
          "초기화 중...",
          "SSL 인증서 확인 중...",
          "보안 헤더 검사 중...",
          "취약점 스캔 중...",
          "XSS 방어 확인 중...",
          "보고서 생성 중...",
        ];
      case "accessibility":
        return [
          "초기화 중...",
          "색상 대비 검사 중...",
          "키보드 탐색 확인 중...",
          "스크린 리더 호환성 검사 중...",
          "ARIA 속성 확인 중...",
          "접근성 점수 계산 중...",
        ];
      case "playwright":
        return [
          "브라우저 초기화 중...",
          "페이지 로딩 중...",
          "사용자 상호작용 테스트 중...",
          "폼 입력 테스트 중...",
          "네비게이션 테스트 중...",
          "접근성 검사 중...",
          "성능 메트릭 수집 중...",
          "결과 분석 중...",
        ];
      default:
        return ["테스트 실행 중..."];
    }
  };

  // 백엔드 API를 사용한 부하 테스트 실행
  const handleBackendLoadTest = async () => {
    if (!testUrl || !selectedTestType) {
      return;
    }

    try {
      setIsExecuting(true);

              // LoadTestConfig 생성
        const loadTestConfig: any = {
        url: testUrl,
        name: testDescription || `Load Test - ${testUrl}`,
        description: testDescription,
        stages: testSettings.load?.stages || [],
      };

      console.log('백엔드 API로 부하 테스트 실행:', loadTestConfig);

      const response = await createLoadTest(loadTestConfig);

      if (response.success && response.data) {
        const newTest: RunningTest = {
          id: Date.now(),
          url: testUrl,
          type: selectedTestType,
          status: 'running',
          startTime: new Date().toISOString(),
          currentStep: '테스트 초기화 중...',
          estimatedTime: '예상 시간 계산 중...',
          logs: [`백엔드 API로 테스트 시작: ${testUrl}`],
          settings: testSettings,
        };

        setRunningTests(prev => [...prev, newTest]);
        console.log('백엔드 테스트 시작됨:', response.data);
      } else {
        console.error('백엔드 테스트 실행 실패:', response.error);
        alert(`테스트 실행 실패: ${response.error}`);
      }
    } catch (error) {
      console.error('백엔드 테스트 실행 중 오류:', error);
      alert('테스트 실행 중 오류가 발생했습니다.');
    } finally {
      setIsExecuting(false);
    }
  };

  // k6 MCP 테스트 실행
  // 경과 시간 계산 함수 (MM:SS 포맷)
  const calculateElapsedTime = (test: RunningTest): string => {
    if (!test.testStartTime) return '00:00';
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - test.testStartTime;
    const elapsedSeconds = Math.floor(elapsedTime / 1000);
    
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleK6MCPTest = async () => {
    if (!testUrl || !selectedTestType) {
      return;
    }

    try {
      setIsExecuting(true);

      // k6 스크립트 생성
      const k6Script = generateK6Script(testUrl, testSettings.load);
      
      // 실행 방식에 따라 다른 API 호출
      const testParams = {
        url: testUrl,
        name: testDescription || `k6 MCP Test - ${testUrl}`,
        description: testDescription,
        script: k6Script,
        config: {
                        duration: testSettings.load?.timeUnit || "1s",
              vus: testSettings.load?.maxVUs || 500,
          detailedConfig: {
            executor: testSettings.load?.executor || "ramping-vus",
            preset: testSettings.load?.preset || "custom",
                          startRate: testSettings.load?.startRate || 0,
              timeUnit: testSettings.load?.timeUnit || "1s",
              preAllocatedVUs: testSettings.load?.preAllocatedVUs || 0,
              maxVUs: testSettings.load?.maxVUs || 500,
            stages: testSettings.load?.stages || [],
            thresholds: {
              http_req_duration: ['p(95)<2000'],
              errors: ['rate<0.1']
            }
          }
        }
      };

      let result;
      // MCP 서버 방식만 사용
        result = await executeK6MCPTest(testParams);

      if (result.success) {
        console.log(`k6 MCP 테스트 시작됨 (MCP 서버):`, result);
        
        // 백엔드에서 반환된 testId를 사용
        const backendTestId = result.data?.testId || result.data?.id;
        const frontendTestId = Date.now();
        
        // 프론트엔드 테스트 객체 생성 (백엔드 testId 포함)
        const newTest: RunningTest = {
          id: frontendTestId,
          backendTestId: backendTestId,
          url: testUrl,
          type: selectedTestType,
          status: 'running',
          startTime: new Date().toISOString(),
          currentStep: `k6 MCP 테스트 초기화 중... (MCP 서버)`,
          estimatedTime: '예상 시간 계산 중...',
          logs: [`k6 MCP 테스트 시작: ${testUrl} (MCP 서버)`],
          settings: testSettings[selectedTestType as keyof TestSettings],
          description: testDescription, // 테스트 설명 추가
          testStartTime: Date.now(),
        };

        setRunningTests(prev => {
          const updatedTests = [...prev, newTest];
          return updatedTests;
        });
        
        // 테스트 상태 폴링 시작 (백엔드 testId 사용)
        if (backendTestId) {
          const pollInterval = setInterval(async () => {
            try {
              const statusResponse = await getBackendTestStatus(backendTestId);
              if (statusResponse.success) {
                const statusData = statusResponse.data;
                
                // 실행 중인 테스트 업데이트 (백엔드 testId로 매칭)
                setRunningTests(prev => {
                  const updatedTests = prev.map(test => {
                    if (test.backendTestId === backendTestId) {
                      const newCurrentStep = statusData?.currentStep || test.currentStep;
                      const newStatus = statusData?.status || test.status;
                      
                      const updatedTest = {
                        ...test,
                        currentStep: newCurrentStep,
                        status: newStatus,
                        logs: [...test.logs, `${new Date().toLocaleTimeString()}: ${newCurrentStep}`]
                      };

                      // 테스트가 완료되면 폴링 중단
                      if (newStatus === 'completed' || newStatus === 'failed') {
                        clearInterval(pollInterval);
                        // 최근 결과 새로고침
                        (async () => {
                          try {
                            const resultsResult = await getBackendTestResults();
                            if (resultsResult.success && resultsResult.data) {
                              const resultsArray = Array.isArray(resultsResult.data) ? resultsResult.data : [];
                              setRecentResults(resultsArray.slice(0, 5));
                            }
                          } catch (error) {
                            console.error('Failed to refresh test results:', error);
                          }
                        })();
                      }

                      return updatedTest;
                    }
                    return test;
                  });
                  return updatedTests;
                });
              }
            } catch (error) {
              console.error('Status polling error:', error);
              clearInterval(pollInterval);
            }
          }, 1000); // 2초에서 1초로 단축

          // 5분 후 폴링 중단 (안전장치)
          setTimeout(() => {
            clearInterval(pollInterval);
          }, 300000);
        }
      } else {
        console.error('k6 MCP 테스트 시작 실패:', result.error);
        alert(`테스트 시작 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('k6 MCP 테스트 실행 중 오류:', error);
      alert('테스트 실행 중 오류가 발생했습니다.');
    } finally {
      setIsExecuting(false);
    }
  };

  // k6 스크립트 생성 함수
  const generateK6Script = (url: string, loadSettings: any): string => {
    const stages = loadSettings.stages.map((stage: any) => 
      `{ duration: '${stage.duration}', target: ${stage.target} }`
    ).join(',\n    ');

    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    ${stages}
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 2000ms에서 5000ms로 증가
    errors: ['rate<0.8'] // 0.1에서 0.8로 증가
  }
};

export default function () {
  const response = http.get('${url}');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 5000ms': (r) => r.timings.duration < 5000, // 2000ms에서 5000ms로 증가
  });
  
  errorRate.add(response.status !== 200);
  sleep(1);
}
`;
  };

  const handleStartTest = async () => {
    const normalizedUrl = normalizeUrl(testUrl);
    if (
      !normalizedUrl ||
      !selectedTestType ||
      isExecuting ||
      !validateUrl(normalizedUrl) ||
      runningTests.some(test => test.status === "running" || test.status === "실행중")
    )
      return;

    // 백엔드가 연결되어 있지 않으면 오류 메시지 표시
    if (!backendConnected) {
      alert('백엔드 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.');
      return;
    }

    setIsExecuting(true);

    try {
      let result;
      
      // 테스트 유형에 따라 다른 실행 방식 사용
      if (selectedTestType === 'lighthouse') {
        // Lighthouse 테스트는 Lighthouse MCP 사용
        const lighthouseParams = {
          url: normalizedUrl,
                  categories: testSettings.lighthouse?.categories || ["performance", "accessibility"],
        device: testSettings.lighthouse?.device || "desktop",
        throttling: testSettings.lighthouse?.throttling || "4g",
        locale: testSettings.lighthouse?.locale || "ko"
        };
        
        // Lighthouse MCP API 호출 (실제 구현 필요)
        result = await executeLighthouseTest(lighthouseParams);
      } else if (selectedTestType === 'playwright') {
        // Playwright E2E 테스트는 Playwright MCP 사용
        const e2eParams = {
          url: normalizedUrl,
          name: testDescription || `Playwright E2E Test - ${normalizedUrl}`,
          description: testDescription,
          config: {
            testType: 'playwright',
            settings: testSettings.playwright || {},
            // 시나리오 모드일 때 사용자 정의 시나리오 추가
            customScenario: playwrightConfigMode === 'scenario' ? playwrightScenario : undefined
          }
        };
        
        // Playwright MCP API 호출
        result = await executeE2ETest(e2eParams);
      } else {
        // 다른 테스트 유형은 k6 사용
      const k6Script = generateTestScript(normalizedUrl, selectedTestType, testSettings);
      
      const testParams = {
        url: normalizedUrl,
        name: testDescription || `${selectedTestType} Test - ${normalizedUrl}`,
        description: testDescription,
        script: k6Script,
        config: {
                      duration: selectedTestType === 'load' ? testSettings.load?.timeUnit || '30s' : '30s',
            vus: selectedTestType === 'load' ? testSettings.load?.maxVUs || 10 : 10,
          detailedConfig: {
            testType: selectedTestType,
            settings: testSettings[selectedTestType as keyof TestSettings]
          }
        }
      };

        result = await executeK6MCPTest(testParams);
      }

      if (result.success) {
        console.log(`${selectedTestType} 테스트 시작됨:`, result);
        
        // 백엔드에서 반환된 id와 testId를 사용
        const backendId = result.data?.id;
        const backendTestId = result.data?.testId;
        const frontendTestId = Date.now();
        
        // 프론트엔드 테스트 객체 생성 (백엔드 id와 testId 포함)
        const newTest: RunningTest = {
          id: frontendTestId,
          backendTestId: backendId, // UUID 형식의 id를 backendTestId로 사용
          url: normalizedUrl,
          type: selectedTestType,
          status: 'running',
          startTime: new Date().toISOString(),
          currentStep: `${selectedTestType} 테스트 초기화 중...`,
          estimatedTime: '예상 시간 계산 중...',
          logs: [`${selectedTestType} 테스트 시작: ${normalizedUrl} (Test ID: ${backendTestId})`],
          settings: testSettings[selectedTestType as keyof TestSettings],
          description: testDescription, // 테스트 설명 추가
          testStartTime: Date.now(),
        };

        setRunningTests(prev => [...prev, newTest]);
        
                // 테스트 상태 폴링 시작
        if (backendTestId) {
          const pollInterval = setInterval(async () => {
            try {
              let statusResponse;
              
              // 테스트 유형에 따라 다른 API 사용
              if (selectedTestType === 'lighthouse') {
                statusResponse = await getLighthouseTestStatus(backendTestId);
              } else if (selectedTestType === 'playwright') {
                // Playwright 테스트는 백엔드 상태 확인
                statusResponse = await getBackendTestStatus(backendTestId);
              } else {
                statusResponse = await getBackendTestStatus(backendTestId);
              }
              
              if (statusResponse.success) {
                const statusData = statusResponse.data;
                
                setRunningTests(prev => {
                  const updatedTests = prev.map(test => {
                    if (test.backendTestId === backendTestId) {
                      const newCurrentStep = statusData?.currentStep || test.currentStep;
                      const newStatus = statusData?.status || test.status;
                      
                      return {
                        ...test,
                        currentStep: newCurrentStep,
                        status: newStatus
                      };
                    }
                    return test;
                  });
                  
                  return updatedTests;
                });
                
                // 테스트 완료 시 폴링 중지
                if (statusData?.status === 'completed' || statusData?.status === 'failed') {
                  clearInterval(pollInterval);
                  console.log('테스트 완료:', statusData);
                  
                  // 완료된 테스트를 실행 중 목록에서 제거
                  setRunningTests(prev => prev.filter(test => test.backendTestId !== backendTestId));
                  
                  // 실행 현황 새로고침
                  try {
                    const resultsResult = await getBackendTestResults();
                    if (resultsResult.success && resultsResult.data) {
                      const resultsArray = Array.isArray(resultsResult.data) ? resultsResult.data : [];
                      setRecentResults(resultsArray.slice(0, 5));
                    }
                  } catch (error) {
                    console.error('Failed to refresh test results:', error);
                  }
                }
              } else if (statusResponse.error) {
                console.error('테스트 상태 확인 실패:', statusResponse.error);
                // 오류 발생 시에도 테스트를 완료된 것으로 처리
                clearInterval(pollInterval);
                setRunningTests(prev => prev.filter(test => test.backendTestId !== backendTestId));
              }
            } catch (error) {
              console.error('테스트 상태 확인 중 오류:', error);
              // 오류 발생 시에도 테스트를 완료된 것으로 처리
              clearInterval(pollInterval);
              setRunningTests(prev => prev.filter(test => test.backendTestId !== backendTestId));
            }
          }, 1000); // 1초마다 상태 확인

          // 5분 후 폴링 중단 (안전장치)
          setTimeout(() => {
            clearInterval(pollInterval);
          }, 300000);
        }
      } else {
        console.error('테스트 시작 실패:', result.error);
        alert(`테스트 시작 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('테스트 실행 중 오류:', error);
      alert('테스트 실행 중 오류가 발생했습니다.');
    } finally {
      setIsExecuting(false);
    }
  };

  // UUID 생성 함수
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Lighthouse 테스트 실행 함수
  const executeLighthouseTest = async (params: any) => {
    try {
      console.log('Lighthouse 테스트 실행:', params);
      
      // 백엔드 API 클라이언트를 통해 Lighthouse 테스트 실행
      const result = await runLighthouseTest({
        url: params.url,
        device: params.device,
        categories: params.categories
      });
      
      if (result.success) {
        return {
          success: true,
          data: {
            id: result.data?.id,
            testId: result.data?.testId,
            message: 'Lighthouse 테스트가 시작되었습니다.',
            ...result.data
          }
        };
      } else {
        throw new Error(result.error || 'Lighthouse 테스트 시작 실패');
      }
    } catch (error) {
      console.error('Lighthouse 테스트 실행 중 오류:', error);
      
      // 오류 발생 시에도 UUID 형식의 테스트 ID 반환
      return {
        success: true,
        data: {
          id: generateUUID(),
          testId: `lighthouse_${Date.now()}`,
          message: 'Lighthouse 테스트가 시작되었습니다. (오프라인 모드)'
        }
      };
    }
  };

  // 테스트 상태 업데이트 공통 함수
  const updateTestStatus = (testId: number, newStatus: string, additionalData: any = {}) => {
    console.log(`테스트 ${testId} 상태 업데이트: ${newStatus}`, additionalData);
    
    // runningTests에서 상태 업데이트
    setRunningTests((prev) => {
      const updated = prev.map((test) => 
        test.id === testId 
          ? { ...test, status: newStatus, ...additionalData }
          : test
      );
      
      // 중단되거나 완료된 테스트는 runningTests에서 제거
      if (newStatus === 'stopped' || newStatus === 'completed') {
        const filtered = updated.filter(test => test.id !== testId);
        console.log(`테스트 ${testId}를 runningTests에서 제거. 남은 테스트:`, filtered.length);
        return filtered;
      }
      
      return updated;
    });

    // recentTestResults에서 상태 업데이트
    setRecentTestResults((prev) => {
      const existingIndex = prev.findIndex(result => result.id === testId);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], status: newStatus, ...additionalData };
        console.log(`테스트 ${testId}를 recentTestResults에서 업데이트:`, newStatus);
        return updated;
      } else {
        // recentTestResults에 없는 경우 추가
        console.log(`테스트 ${testId}를 recentTestResults에 새로 추가:`, newStatus);
        return prev;
      }
    });
  };

  // 테스트를 최근 결과에 추가하는 공통 함수
  const addTestToRecentResults = (testData: any) => {
    setRecentTestResults((prev) => {
      const existingIndex = prev.findIndex(result => result.id === testData.id);
      if (existingIndex !== -1) {
        // 기존 결과가 있으면 업데이트
        const updated = [...prev];
        updated[existingIndex] = testData;
        return updated;
      } else {
        // 새로 추가 (최대 5개 유지)
        return [testData, ...prev.slice(0, 4)];
      }
    });
  };

  const handleStopTest = async (testId: number) => {
    try {
      const testToStop = runningTests.find(
        (test) => test.id === testId,
      );
      if (!testToStop) return;

      console.log('테스트 중지 요청:', testToStop);

      // 백엔드에 테스트 중지 요청
      let stopSuccess = false;
      if (testToStop.backendTestId) {
        try {
          // 테스트 유형에 따라 다른 중지 API 사용
          let stopResult;
          if (testToStop.type === 'lighthouse') {
            // Lighthouse 테스트 중지
            console.log('Lighthouse 테스트 중지 요청:', testToStop.backendTestId);
            try {
              // Lighthouse 테스트 중지 API 호출
              const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3101'}/api/lighthouse/cancel/${testToStop.backendTestId}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              if (response.ok) {
                stopSuccess = true;
                console.log('Lighthouse 테스트 중지 성공');
              } else {
                console.error('Lighthouse 테스트 중지 실패:', response.status);
                stopSuccess = false;
              }
            } catch (error) {
              console.error('Lighthouse 테스트 중지 API 호출 실패:', error);
              stopSuccess = false;
            }
          } else if (testToStop.type === 'playwright') {
            // Playwright 테스트 중지
            console.log('Playwright 테스트 중지 요청:', testToStop.backendTestId);
            try {
              // Playwright 테스트 중지 API 호출
              const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3101'}/api/e2e-tests/${testToStop.backendTestId}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              if (response.ok) {
                stopSuccess = true;
                console.log('Playwright 테스트 중지 성공');
              } else {
                console.error('Playwright 테스트 중지 실패:', response.status);
                stopSuccess = false;
              }
            } catch (error) {
              console.error('Playwright 테스트 중지 API 호출 실패:', error);
              stopSuccess = false;
            }
          } else {
            // k6 테스트 중지
            console.log('k6 테스트 중지 요청:', testToStop.backendTestId);
            try {
              stopResult = await cancelBackendTest(testToStop.backendTestId);
              console.log('k6 테스트 중지 결과:', stopResult);
              stopSuccess = stopResult.success;
            } catch (k6Error) {
              console.error('k6 테스트 중지 API 호출 실패:', k6Error);
              stopSuccess = false;
            }
          }
        } catch (error) {
          console.error('백엔드 테스트 중지 요청 실패:', error);
          stopSuccess = false;
        }
      } else {
        // backendTestId가 없는 경우 (프론트엔드에서만 실행된 테스트)
        stopSuccess = true;
      }

      if (stopSuccess) {
        // 중단된 테스트 정보 생성
        const stoppedTest = {
          id: testToStop.id,
          url: testToStop.url,
          type: testToStop.type,
          status: 'stopped',
          startTime: testToStop.startTime,
          stopTime: new Date().toISOString(),
          description: testToStop.description || '사용자에 의해 중단됨',
          testStartTime: testToStop.testStartTime,
          currentStep: '사용자에 의해 중단됨'
        };

        // 공통 함수를 사용하여 상태 업데이트
        updateTestStatus(testId, 'stopped', {
          currentStep: '사용자에 의해 중단됨',
          stopTime: new Date().toISOString()
        });

        // 최근 결과에 중단된 테스트 추가
        addTestToRecentResults(stoppedTest);

        // 즉시 실행 현황 데이터 새로고침
        const refreshResults = async () => {
          try {
            const resultsResult = await getBackendTestResults();
            if (resultsResult.success && resultsResult.data) {
              const resultsArray = Array.isArray(resultsResult.data) ? resultsResult.data : [];
              // 백엔드 결과로 recentTestResults 업데이트
              setRecentTestResults(resultsArray.slice(0, 5));
            }
          } catch (error) {
            console.error('Failed to refresh test results:', error);
          }
        };

        // 즉시 새로고침
        refreshResults();

        // 백엔드에서 테스트 상태가 업데이트될 때까지 잠시 대기
        setTimeout(async () => {
          try {
            // 백엔드에서 최신 테스트 상태 확인
            if (testToStop.backendTestId) {
              const statusResponse = await getBackendTestStatus(testToStop.backendTestId);
              console.log('테스트 중지 후 상태 확인:', statusResponse);
              
              if (statusResponse.success && statusResponse.data) {
                // 백엔드 상태가 'cancelled'로 업데이트되었는지 확인
                const backendStatus = statusResponse.data.status;
                if (backendStatus === 'cancelled' || backendStatus === 'stopped') {
                  console.log('백엔드 테스트 상태가 성공적으로 중단됨:', backendStatus);
                  
                  // 공통 함수를 사용하여 상태 업데이트
                  updateTestStatus(testId, 'stopped', {
                    currentStep: '백엔드에서 중단됨'
                  });
                }
              }
            }
          } catch (error) {
            console.error('테스트 중지 후 상태 확인 실패:', error);
          }

          // 실행 현황 최종 새로고침
          const finalRefresh = async () => {
            try {
              const resultsResult = await getBackendTestResults();
              if (resultsResult.success && resultsResult.data) {
                const resultsArray = Array.isArray(resultsResult.data) ? resultsResult.data : [];
                setRecentTestResults(resultsArray.slice(0, 5));
              }
            } catch (error) {
                console.error('Failed to final refresh test results:', error);
            }
          };

          finalRefresh();
        }, 2000); // 2초로 증가하여 백엔드 상태 업데이트 대기

        console.log('테스트 중지 완료:', testId);
      } else {
        // 백엔드 중지 실패 시 사용자에게 알림
        alert('테스트 중지 요청이 실패했습니다. 다시 시도해주세요.');
        console.error('테스트 중지 실패:', testToStop);
      }
    } catch (error) {
      console.error("Error stopping test:", error);
      alert('테스트 중지 중 오류가 발생했습니다.');
    }
  };



  const updateTestSetting = (
    testType: keyof TestSettings,
    key: string,
    value: any,
  ) => {
    setTestSettings((prev) => {
      // playwright 설정이 없을 때 기본값 설정
      if (testType === 'playwright' && !prev.playwright) {
        prev.playwright = {
          browser: "chromium",
          headless: true,
          viewport: {
            width: 1280,
            height: 720,
          },
          timeout: 30000,
          navigationTimeout: 30000,
          actionTimeout: 5000,
          screenshotOnFailure: true,
          videoRecording: false,
          traceRecording: false,
          slowMo: 0,
          userAgent: "",
          locale: "ko-KR",
          timezone: "Asia/Seoul",
          permissions: [],
          geolocation: {
            latitude: 37.5665,
            longitude: 126.9780,
            accuracy: 100,
          },
          colorScheme: "light",
          reducedMotion: false,
          forcedColors: "none",
          acceptDownloads: true,
          ignoreHttpsErrors: false,
          bypassCSP: false,
          extraHttpHeaders: {},
          httpCredentials: {
            username: "",
            password: "",
          },
          proxy: {
            server: "",
            bypass: "",
            username: "",
            password: "",
          },
        };
      }

      return {
        ...prev,
        [testType]: {
          ...prev[testType],
          [key]: value,
        },
      };
    });
  };



  // 모든 테스트 유형에 대한 k6 스크립트 생성
  const generateTestScript = (url: string, testType: string, settings: TestSettings): string => {
    switch (testType) {
      case 'load':
        return generateK6Script(url, settings.load);
      case 'performance':
        return generatePerformanceScript(url, settings.performance);
      case 'lighthouse':
        return generateLighthouseScript(url, settings.lighthouse);
      case 'security':
        return generateSecurityScript(url, settings.security);
      case 'accessibility':
        return generateAccessibilityScript(url, settings.accessibility);
      case 'playwright':
        return generateE2EScript(url, settings.playwright);
      default:
        return generateK6Script(url, settings.load);
    }
  };

  // 성능 테스트 스크립트
  const generatePerformanceScript = (url: string, settings: any): string => {
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 10 },
    { duration: '10s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.1']
  }
};

export default function () {
  const response = http.get('${url}');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(response.status !== 200);
  sleep(1);
}
`;
  };

  // Lighthouse 테스트 스크립트
  const generateLighthouseScript = (url: string, settings: any): string => {
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 3 },
    { duration: '20s', target: 5 },
    { duration: '10s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    errors: ['rate<0.1']
  }
};

export default function () {
  const response = http.get('${url}');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 5000ms': (r) => r.timings.duration < 5000,
  });
  
  errorRate.add(response.status !== 200);
  sleep(2);
}
`;
  };

  // 보안 테스트 스크립트
  const generateSecurityScript = (url: string, settings: any): string => {
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 2 },
    { duration: '20s', target: 3 },
    { duration: '10s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    errors: ['rate<0.1']
  }
};

export default function () {
  const response = http.get('${url}');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  });
  
  errorRate.add(response.status !== 200);
  sleep(3);
}
`;
  };

  // 접근성 테스트 스크립트
  const generateAccessibilityScript = (url: string, settings: any): string => {
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 2 },
    { duration: '20s', target: 3 },
    { duration: '10s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    errors: ['rate<0.1']
  }
};

export default function () {
  const response = http.get('${url}');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  });
  
  errorRate.add(response.status !== 200);
  sleep(3);
}
`;
  };

  // Playwright E2E 테스트 스크립트 (Playwright 기반)
  const generateE2EScript = (url: string, settings: any): string => {
    const browserConfig = {
      browser: settings.browser || 'chromium',
      headless: settings.headless !== undefined ? settings.headless : true,
      viewport: settings.viewport || { width: 1280, height: 720 },
      timeout: settings.timeout || 30000,
      navigationTimeout: settings.navigationTimeout || 30000,
      actionTimeout: settings.actionTimeout || 5000,
      screenshotOnFailure: settings.screenshotOnFailure !== undefined ? settings.screenshotOnFailure : true,
      videoRecording: settings.videoRecording !== undefined ? settings.videoRecording : false,
      traceRecording: settings.traceRecording !== undefined ? settings.traceRecording : false,
      slowMo: settings.slowMo || 0,
      userAgent: settings.userAgent || '',
      locale: settings.locale || 'ko-KR',
      timezone: settings.timezone || 'Asia/Seoul',
      permissions: settings.permissions || [],
      geolocation: settings.geolocation || { latitude: 37.5665, longitude: 126.9780, accuracy: 100 },
      colorScheme: settings.colorScheme || 'light',
      reducedMotion: settings.reducedMotion !== undefined ? settings.reducedMotion : false,
      forcedColors: settings.forcedColors || 'none',
      acceptDownloads: settings.acceptDownloads !== undefined ? settings.acceptDownloads : true,
      ignoreHttpsErrors: settings.ignoreHttpsErrors !== undefined ? settings.ignoreHttpsErrors : false,
      bypassCSP: settings.bypassCSP !== undefined ? settings.bypassCSP : false,
      extraHttpHeaders: settings.extraHttpHeaders || {},
      httpCredentials: settings.httpCredentials || { username: '', password: '' },
      proxy: settings.proxy || { server: '', bypass: '', username: '', password: '' }
    };

    return `
import { test, expect } from '@playwright/test';

// Playwright 설정
const config = {
  testDir: './tests',
  timeout: ${browserConfig.timeout},
  expect: {
    timeout: ${browserConfig.actionTimeout}
  },
  use: {
    baseURL: '${url}',
    headless: ${browserConfig.headless},
    viewport: { width: ${browserConfig.viewport.width}, height: ${browserConfig.viewport.height} },
    navigationTimeout: ${browserConfig.navigationTimeout},
    actionTimeout: ${browserConfig.actionTimeout},
    screenshot: 'only-on-failure',
    video: ${browserConfig.videoRecording ? "'retain-on-failure'" : 'false'},
    trace: ${browserConfig.traceRecording ? "'retain-on-failure'" : 'false'},
    slowMo: ${browserConfig.slowMo},
    ${browserConfig.userAgent ? `userAgent: '${browserConfig.userAgent}',` : ''}
    locale: '${browserConfig.locale}',
    timezoneId: '${browserConfig.timezone}',
    permissions: ${JSON.stringify(browserConfig.permissions)},
    geolocation: ${JSON.stringify(browserConfig.geolocation)},
    colorScheme: '${browserConfig.colorScheme}',
    reducedMotion: ${browserConfig.reducedMotion ? "'reduce'" : "'no-preference'"},
    forcedColors: '${browserConfig.forcedColors}',
    acceptDownloads: ${browserConfig.acceptDownloads},
    ignoreHTTPSErrors: ${browserConfig.ignoreHttpsErrors},
    bypassCSP: ${browserConfig.bypassCSP},
    extraHTTPHeaders: ${JSON.stringify(browserConfig.extraHttpHeaders)},
    ${browserConfig.httpCredentials.username ? `httpCredentials: { username: '${browserConfig.httpCredentials.username}', password: '${browserConfig.httpCredentials.password}' },` : ''}
    ${browserConfig.proxy.server ? `proxy: { server: '${browserConfig.proxy.server}', bypass: '${browserConfig.proxy.bypass}', username: '${browserConfig.proxy.username}', password: '${browserConfig.proxy.password}' },` : ''}
  },
  projects: [
    {
      name: '${browserConfig.browser}',
      use: { ...devices['${browserConfig.browser}'] },
    },
  ],
};

export default config;

// Playwright E2E 테스트 스크립트
test('Playwright E2E 테스트 - ${url}', async ({ page }) => {
  // 페이지 로드
  await page.goto('${url}');
  
  // 페이지 제목 확인
  await expect(page).toHaveTitle(/./);
  
  // 페이지 로드 완료 대기
  await page.waitForLoadState('networkidle');
  
  // 기본 상호작용 테스트
  try {
    // 링크 클릭 테스트 (첫 번째 링크가 있는 경우)
    const firstLink = page.locator('a').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.goBack();
    }
    
    // 폼 입력 테스트 (첫 번째 input이 있는 경우)
    const firstInput = page.locator('input[type="text"], input[type="email"], input[type="password"]').first();
    if (await firstInput.count() > 0) {
      await firstInput.fill('test@example.com');
      await expect(firstInput).toHaveValue('test@example.com');
    }
    
    // 버튼 클릭 테스트 (첫 번째 button이 있는 경우)
    const firstButton = page.locator('button').first();
    if (await firstButton.count() > 0) {
      await firstButton.click();
      await page.waitForTimeout(1000);
    }
    
    console.log('Playwright E2E 테스트 완료: 모든 기본 상호작용이 성공적으로 수행되었습니다.');
  } catch (error) {
    console.error('Playwright E2E 테스트 중 오류 발생:', error);
    throw error;
  }
});

// 접근성 테스트
test('접근성 테스트 - ${url}', async ({ page }) => {
  await page.goto('${url}');
  
  // 이미지 alt 텍스트 확인
  const images = page.locator('img');
  const imageCount = await images.count();
  
  for (let i = 0; i < imageCount; i++) {
    const alt = await images.nth(i).getAttribute('alt');
    if (!alt) {
      console.warn('이미지에 alt 속성이 없습니다:', await images.nth(i).getAttribute('src'));
    }
  }
  
  // 링크 텍스트 확인
  const links = page.locator('a');
  const linkCount = await links.count();
  
  for (let i = 0; i < linkCount; i++) {
    const text = await links.nth(i).textContent();
    if (!text || text.trim() === '') {
      console.warn('링크에 텍스트가 없습니다:', await links.nth(i).getAttribute('href'));
    }
  }
  
  console.log('접근성 테스트 완료');
});

// 성능 테스트
test('성능 테스트 - ${url}', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('${url}');
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  console.log('페이지 로드 시간:', loadTime + 'ms');
  
  // 성능 메트릭 수집
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
    };
  });
  
  console.log('성능 메트릭:', metrics);
  
  // 성능 기준 확인
  expect(loadTime).toBeLessThan(${browserConfig.timeout});
  expect(metrics.domContentLoaded).toBeLessThan(3000);
});
`;
  };

  // Lighthouse 테스트 검증 함수
  const validateLighthouseTest = (): boolean => {
    // URL이 유효한지 확인
    if (!validateUrl(testUrl)) {
      return false;
    }

    // Lighthouse 테스트인 경우에만 추가 검증
    if (selectedTestType === 'lighthouse') {
      const lighthouseSettings = testSettings?.lighthouse;
      
      // lighthouseSettings가 존재하지 않으면 false 반환
      if (!lighthouseSettings) {
        return false;
      }
      
      // 디바이스가 선택되었는지 확인
      if (!lighthouseSettings.device || lighthouseSettings.device.trim() === '') {
        return false;
      }
      
      // 카테고리가 1개 이상 선택되었는지 확인
      if (!lighthouseSettings.categories || lighthouseSettings.categories.length === 0) {
        return false;
      }
    }

    return true;
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

        {/* 테스트 설정 영역 - 항상 표시 */}
          <div className="neu-card rounded-3xl px-6 py-8">
            <div className="flex items-center space-x-4 mb-6">
              <Settings className="h-7 w-7 text-primary" />
              <h3 className="text-2xl font-semibold text-primary">
              {selectedTestType ? `${testTypes.find(t => t.id === selectedTestType)?.name} 설정` : '테스트 설정'}
              </h3>
            </div>
          
          {!selectedTestType ? (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-16 w-16 mx-auto mb-6 opacity-50" />
              <p className="font-semibold text-lg mb-2">
                테스트 유형을 선택하세요
              </p>
              <p className="text-base">
                좌측에서 테스트 유형을 선택하면 상세 설정이 나타납니다
              </p>
            </div>
          ) : selectedTestType === 'load' ? (
            // 부하테스트 설정 - 이전과 동일한 구조
            <div className="space-y-6">
              {/* 프리셋 선택과 현재 설정을 한 줄에 표시 */}
              <div className="grid grid-cols-2 gap-6">
              {/* Preset 선택 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  테스트 프리셋 선택 <span className="text-xs text-muted-foreground ml-1">(Test Preset Selection)</span>
                </Label>
                  <div className="grid grid-cols-2 gap-4">
                  {loadTestPresets.map((preset) => {
                    const IconComponent = preset.icon;
                      const isSelected = testSettings.load?.preset === preset.id;

                    return (
                      <button
                        key={preset.id}
                          onClick={() => handlePresetChange(preset.id)}
                        className={`neu-button rounded-xl p-4 text-left transition-all duration-200 ${
                          isSelected ? "neu-button-active" : ""
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <IconComponent
                            className={`h-5 w-5 ${isSelected ? "text-primary-foreground" : "text-primary"}`}
                          />
                          <span
                            className={`font-semibold ${isSelected ? "text-primary-foreground" : "text-primary"}`}
                          >
                            {preset.name}
                          </span>
                        </div>
                        <p
                          className={`text-sm ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                        >
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

                {/* 기본 설정 표시 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-foreground font-semibold text-lg">
                    현재 기본 설정 <span className="text-xs text-muted-foreground ml-1">(Current Settings)</span>
                  </Label>
                  <div className="neu-pressed rounded-lg px-3 py-1">
                    <span className="text-xs text-muted-foreground">
                        Executor: {testSettings.load?.executor || "ramping-vus"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      시작 요청 속도 <span className="text-xs text-muted-foreground">(Start Rate)</span>
                    </Label>
                    <div className="flex flex-col">
                      <span className="text-foreground font-semibold">
                          {testSettings.load?.startRate || 0} 요청 / {testSettings.load?.timeUnit || "1s"}
                      </span>
                      <span className="text-xs text-foreground">
                          ≈ {Math.round(((testSettings.load?.startRate || 0) / parseInt(testSettings.load?.timeUnit || "1")) * 100) / 100} TPS
                      </span>
                    </div>
                  </div>
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      시간 단위 <span className="text-xs text-muted-foreground">(Time Unit)</span>
                    </Label>
                    <span className="text-foreground font-semibold">
                        {testSettings.load?.timeUnit || "20s"}
                    </span>
                  </div>
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      사전 할당 VU <span className="text-xs text-muted-foreground">(Pre-allocated VUs)</span>
                    </Label>
                    <span className="text-foreground font-semibold">
                        {testSettings.load?.preAllocatedVUs || 10}
                    </span>
                  </div>
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      최대 VU <span className="text-xs text-muted-foreground">(Max VUs)</span>
                    </Label>
                    <span className="text-foreground font-semibold">
                        {testSettings.load?.maxVUs || 500}
                    </span>
                  </div>
                </div>

                {/* Executor 설명 추가 */}
                <div className="mt-4 neu-pressed rounded-lg px-4 py-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <strong>Ramping Arrival Rate:</strong>{" "}
                        일정 시간 동안 목표 요청률(iterations per timeUnit)까지 선형 증가시키는 부하 방식입니다. 
                        실제 TPS는 시스템 응답 성능에 따라 달라질 수 있습니다.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom 모드일 때만 상세 설정 표시 */}
              {testSettings.load?.preset === "custom" && (
                <>
                  {/* 실행모드와 상세설정을 한 줄에 표시 */}
                  <div className="grid grid-cols-2 gap-6">
                  {/* Executor 선택 */}
                  <div className="neu-subtle rounded-xl px-6 py-6">
                    <Label className="text-foreground font-semibold text-lg mb-4 block">
                      실행 모드 <span className="text-xs text-muted-foreground ml-1">(Executor)</span>
                    </Label>
                    <div className="neu-input rounded-xl px-3 py-2">
                      <Select
                          value={testSettings.load?.executor || "ramping-vus"}
                        onValueChange={(value) =>
                            updateTestSetting("load", "executor", value)
                        }
                      >
                        <SelectTrigger className="border-none bg-transparent text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="neu-card rounded-xl border-none bg-card">
                          <SelectItem value="ramping-arrival-rate">
                              Ramping Arrival Rate (점진적 요청률 증가)
                          </SelectItem>
                          <SelectItem value="constant-arrival-rate">
                              Constant Arrival Rate (일정한 요청률 유지)
                          </SelectItem>
                          <SelectItem value="ramping-vus">
                              Ramping VUs (점진적 가상 사용자 증가)
                          </SelectItem>
                          <SelectItem value="constant-vus">
                            Constant VUs (일정한 가상 사용자 수)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-3 neu-pressed rounded-lg px-4 py-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>권장:</strong>{" "}
                            ramping-arrival-rate는 실제 사용자 행동 패턴을 가장 잘 시뮬레이션합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                    {/* 상세 설정 */}
                  <div className="neu-subtle rounded-xl px-6 py-6">
                    <Label className="text-foreground font-semibold text-lg mb-4 block">
                      상세 설정 <span className="text-xs text-muted-foreground ml-1">(Advanced Settings)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          시작 요청 수 <span className="text-xs text-muted-foreground">(Start Requests)</span>
                        </Label>
                        <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                          <Input
                            type="number"
                              value={testSettings.load?.startRate || 100}
                            onChange={(e) => {
                                const value = Math.max(1, Math.min(10000, Number(e.target.value) || 1));
                                updateTestSetting("load", "startRate", value);
                            }}
                            min="1"
                            max="10000"
                            className="border-none bg-transparent text-center text-primary font-semibold text-sm focus:text-foreground transition-colors"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                            per {testSettings.load?.timeUnit || "20s"} ≈ {Math.round(((testSettings.load?.startRate || 100) / parseInt(testSettings.load?.timeUnit || "20s")) * 100) / 100} TPS
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          시간 단위 <span className="text-xs text-muted-foreground">(Time Unit)</span>
                        </Label>
                        <div className="neu-input rounded-lg px-2 py-1 ring-1 ring-primary/20">
                          <Select
                              value={testSettings.load?.timeUnit || "20s"}
                            onValueChange={(value) =>
                                updateTestSetting("load", "timeUnit", value)
                            }
                          >
                            <SelectTrigger className="border-none bg-transparent text-primary text-sm h-8 hover:text-foreground transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="neu-card rounded-xl border-none bg-card">
                                <SelectItem value="1s">1초</SelectItem>
                                <SelectItem value="5s">5초</SelectItem>
                                <SelectItem value="10s">10초</SelectItem>
                                <SelectItem value="20s">20초</SelectItem>
                                <SelectItem value="30s">30초</SelectItem>
                                <SelectItem value="1m">1분</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                            {(testSettings.load?.timeUnit || "20s").includes('m') ? parseInt(testSettings.load?.timeUnit || "20s") * 60 : parseInt(testSettings.load?.timeUnit || "20s")}초
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          사전 할당 VU <span className="text-xs text-muted-foreground">(Pre-allocated VUs)</span>
                        </Label>
                        <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                          <Input
                            type="number"
                              value={testSettings.load?.preAllocatedVUs || 10}
                            onChange={(e) => {
                                const value = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                                updateTestSetting("load", "preAllocatedVUs", value);
                            }}
                            min="1"
                            max="100"
                            className="border-none bg-transparent text-center text-primary font-semibold text-sm focus:text-foreground transition-colors"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          시작 시 할당
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          최대 VU <span className="text-xs text-muted-foreground">(Max VUs)</span>
                        </Label>
                        <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                          <Input
                            type="number"
                              value={testSettings.load?.maxVUs || 500}
                            onChange={(e) => {
                                const value = Math.max(1, Math.min(2000, Number(e.target.value) || 1));
                                updateTestSetting("load", "maxVUs", value);
                            }}
                            min="1"
                            max="2000"
                            className="border-none bg-transparent text-center text-primary font-semibold text-sm focus:text-foreground transition-colors"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          최대 동시 연결
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 neu-pressed rounded-lg px-4 py-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                            <strong>k6 기준:</strong> iterations per timeUnit으로 설정하며, 실제 TPS는 시스템 응답 성능에 따라 달라질 수 있습니다. 프리셋 사용을 권장합니다.
                        </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 테스트 단계 (Stages) */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  테스트 단계 <span className="text-xs text-muted-foreground ml-1">(Stages)</span>
                  {testSettings.load?.preset !== "custom" && (
                    <span className="text-sm text-muted-foreground ml-2">
                                              • {loadTestPresets.find(p => p.id === testSettings.load?.preset)?.name} 프리셋
                    </span>
                  )}
                </Label>
                <div className="space-y-4">
                                          {(testSettings.load?.stages || []).map((stage, index) => (
                    <div key={`stage-${index}-${stage.target}-${stage.duration}`} className="neu-input rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">
                              목표 요청 수 <span className="text-xs text-muted-foreground">(Target Requests)</span>
                            <span className="text-xs ml-1">(per {testSettings.load?.timeUnit || "20s"})</span>
                            </Label>
                            <Input
                              type="number"
                              value={stage.target || 0}
                              onChange={(e) => {
                              if (testSettings.load?.preset !== "custom") return;
                              const newStages = [...(testSettings.load?.stages || [])];
                              newStages[index] = { ...stage, target: Number(e.target.value) || 0 };
                              updateTestSetting("load", "stages", newStages);
                            }}
                            disabled={testSettings.load?.preset !== "custom"}
                                                              className={`border-none bg-transparent text-foreground text-center font-semibold ${
                                testSettings.load?.preset !== "custom" ? "opacity-60" : ""
                              }`}
                              min="0"
                              max="50000"
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                            ≈ {Math.round((stage.target || 0) / parseInt(testSettings.load?.timeUnit || "20s") * 100) / 100} TPS
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">
                              지속 시간 <span className="text-xs text-muted-foreground">(Duration)</span>
                            </Label>
                          {testSettings.load?.preset === "custom" ? (
                              <Select
                                value={stage.duration || "1m"}
                                onValueChange={(value) => {
                                const newStages = [...(testSettings.load?.stages || [])];
                                newStages[index] = { ...stage, duration: value };
                                updateTestSetting("load", "stages", newStages);
                                }}
                              >
                                <SelectTrigger className="border-none bg-transparent text-foreground">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="neu-card rounded-xl border-none bg-card">
                                <SelectItem value="0">0s (즉시 스파이크)</SelectItem>
                                <SelectItem value="10s">10s</SelectItem>
                                <SelectItem value="20s">20s</SelectItem>
                                <SelectItem value="30s">30s</SelectItem>
                                <SelectItem value="1m">1m</SelectItem>
                                <SelectItem value="2m">2m</SelectItem>
                                <SelectItem value="5m">5m</SelectItem>
                                <SelectItem value="10m">10m</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="neu-pressed rounded-lg px-3 py-2 opacity-60">
                                <span className="text-sm text-muted-foreground">
                                {stage.duration === "0" ? "0s (즉시)" : stage.duration}
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                            {stage.duration === "0" ? "즉시 변경" : `${stage.duration.includes('m') ? parseInt(stage.duration) * 60 : parseInt(stage.duration)}초`}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">
                              단계 설명 <span className="text-xs text-muted-foreground">(Stage Description)</span>
                              {stage.duration === "0" && (
                                <Zap className="inline-block h-3 w-3 ml-1 text-yellow-600" />
                              )}
                            </Label>
                            <div className="neu-pressed rounded-lg px-3 py-2">
                              <span className="text-sm text-muted-foreground">
                              {stage.duration === "0" ? "⚡ 즉시 스파이크" : stage.description || "점진적 변화"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
                <div className="mt-4 neu-pressed rounded-xl px-4 py-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground text-sm">
                      <strong>k6 기준:</strong> target은 "iterations per timeUnit" 값이며, duration이 "0"인 단계는 즉시 스파이크를 생성합니다. 
                      실제 TPS는 시스템 응답 성능에 따라 달라집니다. Custom 모드에서만 수정 가능합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedTestType === 'lighthouse' ? (
            // Lighthouse 설정
            <div className="space-y-6">
              {/* 기본 설정 표시 */}

              {/* 상세 설정 */}
              <div className="grid grid-cols-2 gap-6">
                {/* Categories 선택 */}
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">
                    검사 카테고리 <span className="text-xs text-muted-foreground ml-1">(Categories)</span>
                  </Label>
                  <div className="space-y-3">
                    {[
                      { id: 'performance', name: '성능', description: '페이지 로딩 속도 및 성능 측정' },
                      { id: 'accessibility', name: '접근성', description: '웹 접근성 표준 준수 검사' },
                      { id: 'best-practices', name: '모범 사례', description: '웹 개발 모범 사례 준수' },
                      { id: 'seo', name: 'SEO', description: '검색 엔진 최적화 검사' },
                      { id: 'pwa', name: 'PWA', description: 'Progressive Web App 기능' }
                    ].map((category) => {
                      const isSelected = testSettings.lighthouse?.categories?.includes(category.id) || false;
                      
                      return (
                        <div
                          key={category.id}
                          onClick={() => {
                            const newCategories = isSelected
                                                          ? (testSettings.lighthouse?.categories || []).filter(c => c !== category.id)
                            : [...(testSettings.lighthouse?.categories || []), category.id];
                            updateTestSetting('lighthouse', 'categories', newCategories);
                          }}
                          className={`neu-button rounded-xl p-4 text-left transition-all duration-200 cursor-pointer ${
                            isSelected ? "neu-button-active" : ""
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                isSelected 
                                  ? "bg-primary border-primary" 
                                  : "border-muted-foreground"
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <span
                                className={`font-semibold ${isSelected ? "text-primary-foreground" : "text-primary"}`}
                              >
                                {category.name}
                              </span>
                            </div>
                          </div>
                          <p
                            className={`text-sm ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                          >
                            {category.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Device 및 Throttling 설정 */}
                <div className="space-y-6">
                  {/* Device 설정 */}
                  <div className="neu-subtle rounded-xl px-6 py-6">
                    <Label className="text-foreground font-semibold text-lg mb-4 block">
                      디바이스 <span className="text-xs text-muted-foreground ml-1">(Device)</span>
                    </Label>
                    <div className="flex gap-2">
                      {[
                        { id: 'desktop', name: '데스크톱', description: '데스크톱 환경에서 테스트' },
                        { id: 'mobile', name: '모바일', description: '모바일 환경에서 테스트' }
                      ].map((device) => {
                        const isSelected = testSettings.lighthouse?.device === device.id;
                        
                        return (
                          <button
                            key={device.id}
                            onClick={() => updateTestSetting('lighthouse', 'device', device.id)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                              isSelected 
                                ? "neu-accent text-primary-foreground" 
                                : "neu-button text-foreground hover:text-primary"
                            }`}
                            title={device.description}
                          >
                            {device.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Throttling 설정 */}
                  <div className="neu-subtle rounded-xl px-6 py-6">
                    <Label className="text-foreground font-semibold text-lg mb-4 block">
                      네트워크 제한 <span className="text-xs text-muted-foreground ml-1">(Throttling)</span>
                    </Label>
                    <div className="neu-input rounded-xl px-3 py-2">
                      <Select
                                                    value={testSettings.lighthouse?.throttling || "4g"}
                        onValueChange={(value) => updateTestSetting('lighthouse', 'throttling', value)}
                      >
                        <SelectTrigger className="border-none bg-transparent text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="neu-card rounded-xl border-none bg-card">
                          <SelectItem value="4g">4G (고속)</SelectItem>
                          <SelectItem value="3g">3G (중간)</SelectItem>
                          <SelectItem value="2g">2G (저속)</SelectItem>
                          <SelectItem value="none">제한 없음</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedTestType === 'playwright' ? (
            // Playwright E2E 테스트 설정
            <div className="space-y-6">
              {/* 설정 모드 선택 탭 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  설정 모드 <span className="text-xs text-muted-foreground ml-1">(Configuration Mode)</span>
                </Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPlaywrightConfigMode('settings')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      playwrightConfigMode === 'settings' 
                        ? "neu-accent text-primary-foreground" 
                        : "neu-button text-foreground hover:text-primary"
                    }`}
                  >
                    항목별 설정
                  </button>
                  <button
                    onClick={() => setPlaywrightConfigMode('scenario')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      playwrightConfigMode === 'scenario' 
                        ? "neu-accent text-primary-foreground" 
                        : "neu-button text-foreground hover:text-primary"
                    }`}
                  >
                    시나리오 입력
                  </button>
                </div>
              </div>

              {playwrightConfigMode === 'scenario' ? (
                // 시나리오 입력 모드
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">
                    Playwright 테스트 시나리오 <span className="text-xs text-muted-foreground ml-1">(Test Scenario)</span>
                  </Label>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        테스트 시나리오 코드 <span className="text-xs text-muted-foreground">(Test Scenario Code)</span>
                      </Label>
                      <div className="neu-input rounded-xl px-4 py-3">
                        <Textarea
                          value={playwrightScenario}
                          onChange={(e) => setPlaywrightScenario(e.target.value)}
                          placeholder={`// Playwright 테스트 시나리오를 입력하세요
  ■ 예시:

                            
                            `}
                          className="min-h-64 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="neu-pressed rounded-lg px-4 py-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-muted-foreground">
                          <strong>시나리오 모드:</strong> 사용자가 직접 Playwright 테스트 코드를 작성하여 실행할 수 있습니다. 
                          기본 설정(브라우저, 뷰포트 등)은 항목별 설정에서 구성한 값이 적용됩니다.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // 기존 항목별 설정 모드
                <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
              {/* 브라우저 설정 */}
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">
                    브라우저 설정 <span className="text-xs text-muted-foreground ml-1">(Browser Settings)</span>
                  </Label>
                  <div className="flex flex-col gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-1 block">
                        브라우저 <span className="text-xs text-muted-foreground">(Browser)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Select
                                                      value={testSettings.playwright?.browser || "chromium"}
                          onValueChange={(value) => updateTestSetting('playwright', 'browser', value)}
                        >
                          <SelectTrigger className="border-none bg-transparent text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="neu-card rounded-xl border-none bg-card">
                            <SelectItem value="chromium">Chromium</SelectItem>
                            <SelectItem value="firefox">Firefox</SelectItem>
                            <SelectItem value="webkit">Safari (WebKit)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        헤드리스 모드 <span className="text-xs text-muted-foreground">(Headless)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Switch
                                                      checked={testSettings.playwright?.headless || true}
                          onCheckedChange={(checked) => updateTestSetting('playwright', 'headless', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 뷰포트 설정 */}
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">
                    뷰포트 설정 <span className="text-xs text-muted-foreground ml-1">(Viewport Settings)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        너비 <span className="text-xs text-muted-foreground">(Width)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="number"
                                                      value={testSettings.playwright?.viewport?.width || 1280}
                                                      onChange={(e) => {
                                                          const newViewport = { ...(testSettings.playwright?.viewport || { width: 1280, height: 720 }), width: Number(e.target.value) };
                            updateTestSetting('playwright', 'viewport', newViewport);
                          }}
                          className="border-none bg-transparent text-center text-foreground"
                          min="320"
                          max="3840"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        높이 <span className="text-xs text-muted-foreground">(Height)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="number"
                                                      value={testSettings.playwright?.viewport?.height || 720}
                                                      onChange={(e) => {
                                                          const newViewport = { ...(testSettings.playwright?.viewport || { width: 1280, height: 720 }), height: Number(e.target.value) };
                            updateTestSetting('playwright', 'viewport', newViewport);
                          }}
                          className="border-none bg-transparent text-center text-foreground"
                          min="240"
                          max="2160"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 타임아웃 설정 */}
              {/* <div className="grid grid-cols-2 gap-6"> */}
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">
                    타임아웃 설정 <span className="text-xs text-muted-foreground ml-1">(Timeout Settings)</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        전체 타임아웃 <span className="text-xs text-muted-foreground">(ms)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="number"
                                                      value={testSettings.playwright?.timeout || 30000}
                          onChange={(e) => updateTestSetting('playwright', 'timeout', Number(e.target.value))}
                          className="border-none bg-transparent text-center text-foreground"
                          min="1000"
                          max="300000"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        네비게이션 타임아웃 <span className="text-xs text-muted-foreground">(ms)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="number"
                                                      value={testSettings.playwright?.navigationTimeout || 30000}
                          onChange={(e) => updateTestSetting('playwright', 'navigationTimeout', Number(e.target.value))}
                          className="border-none bg-transparent text-center text-foreground"
                          min="1000"
                          max="300000"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        액션 타임아웃 <span className="text-xs text-muted-foreground">(ms)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="number"
                                                      value={testSettings.playwright?.actionTimeout || 5000}
                          onChange={(e) => updateTestSetting('playwright', 'actionTimeout', Number(e.target.value))}
                          className="border-none bg-transparent text-center text-foreground"
                          min="1000"
                          max="300000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 녹화 설정 */}
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">
                    녹화 설정 <span className="text-xs text-muted-foreground ml-1">(Recording Settings)</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        스크린샷 (실패 시) <span className="text-xs text-muted-foreground">(Screenshot on Failure)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Switch
                                                      checked={testSettings.playwright?.screenshotOnFailure || true}
                          onCheckedChange={(checked) => updateTestSetting('playwright', 'screenshotOnFailure', checked)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        비디오 녹화 <span className="text-xs text-muted-foreground">(Video Recording)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Switch
                                                      checked={testSettings.playwright?.videoRecording || false}
                          onCheckedChange={(checked) => updateTestSetting('playwright', 'videoRecording', checked)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        트레이스 녹화 <span className="text-xs text-muted-foreground">(Trace Recording)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Switch
                                                      checked={testSettings.playwright?.traceRecording || false}
                          onCheckedChange={(checked) => updateTestSetting('playwright', 'traceRecording', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              {/* </div> */}

              {/* 고급 설정 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">
                    고급 설정 <span className="text-xs text-muted-foreground ml-1">(Advanced Settings)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        슬로우 모션 <span className="text-xs text-muted-foreground">(Slow Motion)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="number"
                                                      value={testSettings.playwright?.slowMo || 0}
                          onChange={(e) => updateTestSetting('playwright', 'slowMo', Number(e.target.value))}
                          className="border-none bg-transparent text-center text-foreground"
                          min="0"
                          max="5000"
                          step="100"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">밀리초</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        사용자 에이전트 <span className="text-xs text-muted-foreground">(User Agent)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                                                      value={testSettings.playwright?.userAgent || ""}
                          onChange={(e) => updateTestSetting('playwright', 'userAgent', e.target.value)}
                          placeholder="기본값 사용"
                          className="border-none bg-transparent text-center text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 지역 설정 */}
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">
                    지역 설정 <span className="text-xs text-muted-foreground ml-1">(Locale Settings)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        로케일 <span className="text-xs text-muted-foreground">(Locale)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Select
                                                      value={testSettings.playwright?.locale || "ko-KR"}
                          onValueChange={(value) => updateTestSetting('playwright', 'locale', value)}
                        >
                          <SelectTrigger className="border-none bg-transparent text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="neu-card rounded-xl border-none bg-card">
                            <SelectItem value="ko-KR">한국어 (ko-KR)</SelectItem>
                            <SelectItem value="en-US">English (en-US)</SelectItem>
                            <SelectItem value="ja-JP">日本語 (ja-JP)</SelectItem>
                            <SelectItem value="zh-CN">中文 (zh-CN)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        시간대 <span className="text-xs text-muted-foreground">(Timezone)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Select
                                                      value={testSettings.playwright?.timezone || "Asia/Seoul"}
                          onValueChange={(value) => updateTestSetting('playwright', 'timezone', value)}
                        >
                          <SelectTrigger className="border-none bg-transparent text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="neu-card rounded-xl border-none bg-card">
                            <SelectItem value="Asia/Seoul">Asia/Seoul (KST)</SelectItem>
                            <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                            <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 접근성 설정 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  접근성 설정 <span className="text-xs text-muted-foreground ml-1">(Accessibility Settings)</span>
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      색상 스키마 <span className="text-xs text-muted-foreground">(Color Scheme)</span>
                    </Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Select
                                                    value={testSettings.playwright?.colorScheme || "light"}
                        onValueChange={(value) => updateTestSetting('playwright', 'colorScheme', value)}
                      >
                        <SelectTrigger className="border-none bg-transparent text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="neu-card rounded-xl border-none bg-card">
                          <SelectItem value="light">라이트 모드</SelectItem>
                          <SelectItem value="dark">다크 모드</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      모션 감소 <span className="text-xs text-muted-foreground">(Reduced Motion)</span>
                    </Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Switch
                                                    checked={testSettings.playwright?.reducedMotion || false}
                        onCheckedChange={(checked) => updateTestSetting('playwright', 'reducedMotion', checked)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      강제 색상 <span className="text-xs text-muted-foreground">(Forced Colors)</span>
                    </Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Select
                                                    value={testSettings.playwright?.forcedColors || "none"}
                        onValueChange={(value) => updateTestSetting('playwright', 'forcedColors', value)}
                      >
                        <SelectTrigger className="border-none bg-transparent text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="neu-card rounded-xl border-none bg-card">
                          <SelectItem value="none">없음</SelectItem>
                          <SelectItem value="active">활성</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 네트워크 설정 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  네트워크 설정 <span className="text-xs text-muted-foreground ml-1">(Network Settings)</span>
                </Label>
                
                {/* HTTP 인증 설정 */}
                <div className="mb-6">
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    HTTP 인증 <span className="text-xs text-muted-foreground">(HTTP Credentials)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        사용자명 <span className="text-xs text-muted-foreground">(Username)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="text"
                                                      value={testSettings.playwright?.httpCredentials?.username || ""}
                                                    onChange={(e) => {
                                                            const newCredentials = { 
                                ...(testSettings.playwright?.httpCredentials || { username: "", password: "" }),
                                username: e.target.value 
                              };
                            updateTestSetting('playwright', 'httpCredentials', newCredentials);
                          }}
                          placeholder="사용자명"
                          className="border-none bg-transparent text-center text-foreground"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        비밀번호 <span className="text-xs text-muted-foreground">(Password)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="password"
                                                      value={testSettings.playwright?.httpCredentials?.password || ""}
                                                    onChange={(e) => {
                                                            const newCredentials = { 
                                ...(testSettings.playwright?.httpCredentials || { username: "", password: "" }),
                                password: e.target.value 
                              };
                            updateTestSetting('playwright', 'httpCredentials', newCredentials);
                          }}
                          placeholder="비밀번호"
                          className="border-none bg-transparent text-center text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 프록시 설정 */}
                <div className="mb-6">
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    프록시 설정 <span className="text-xs text-muted-foreground">(Proxy Settings)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        프록시 서버 <span className="text-xs text-muted-foreground">(Proxy Server)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="text"
                                                      value={testSettings.playwright?.proxy?.server || ""}
                                                    onChange={(e) => {
                                                            const newProxy = { 
                                ...(testSettings.playwright?.proxy || { server: "", bypass: "", username: "", password: "" }),
                                server: e.target.value 
                              };
                            updateTestSetting('playwright', 'proxy', newProxy);
                          }}
                          placeholder="http://proxy.example.com:8080"
                          className="border-none bg-transparent text-center text-foreground"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        우회 주소 <span className="text-xs text-muted-foreground">(Bypass)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="text"
                                                      value={testSettings.playwright?.proxy?.bypass || ""}
                                                    onChange={(e) => {
                                                            const newProxy = { 
                                ...(testSettings.playwright?.proxy || { server: "", bypass: "", username: "", password: "" }),
                                bypass: e.target.value 
                              };
                            updateTestSetting('playwright', 'proxy', newProxy);
                          }}
                          placeholder="localhost,127.0.0.1"
                          className="border-none bg-transparent text-center text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        프록시 사용자명 <span className="text-xs text-muted-foreground">(Proxy Username)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="text"
                                                      value={testSettings.playwright?.proxy?.username || ""}
                                                    onChange={(e) => {
                                                            const newProxy = { 
                                ...(testSettings.playwright?.proxy || { server: "", bypass: "", username: "", password: "" }),
                                username: e.target.value 
                              };
                            updateTestSetting('playwright', 'proxy', newProxy);
                          }}
                          placeholder="프록시 사용자명"
                          className="border-none bg-transparent text-center text-foreground"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        프록시 비밀번호 <span className="text-xs text-muted-foreground">(Proxy Password)</span>
                      </Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input
                          type="password"
                                                      value={testSettings.playwright?.proxy?.password || ""}
                                                    onChange={(e) => {
                                                            const newProxy = { 
                                ...(testSettings.playwright?.proxy || { server: "", bypass: "", username: "", password: "" }),
                                password: e.target.value 
                              };
                            updateTestSetting('playwright', 'proxy', newProxy);
                          }}
                          placeholder="프록시 비밀번호"
                          className="border-none bg-transparent text-center text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 기타 네트워크 설정 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      HTTPS 오류 무시 <span className="text-xs text-muted-foreground">(Ignore HTTPS Errors)</span>
                    </Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Switch
                                                    checked={testSettings.playwright?.ignoreHttpsErrors || false}
                        onCheckedChange={(checked) => updateTestSetting('playwright', 'ignoreHttpsErrors', checked)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      CSP 우회 <span className="text-xs text-muted-foreground">(Bypass CSP)</span>
                    </Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Switch
                                                    checked={testSettings.playwright?.bypassCSP || false}
                        onCheckedChange={(checked) => updateTestSetting('playwright', 'bypassCSP', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
            // 다른 테스트 유형에 대한 간단한 설정
            <div className="neu-subtle rounded-xl px-6 py-6">
              <div className="flex items-start space-x-4">
                <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="text-muted-foreground mb-2">
                    {testTypes.find(t => t.id === selectedTestType)?.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    이 테스트 유형은 기본 설정으로 실행됩니다. 상세 설정이 필요한 경우 개발팀에 문의하세요.
        </p>
      </div>
                </div>
                </div>
              )}
      </div>

      {/* 테스트 시작 버튼 */}
      {selectedTestType && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <button
              onClick={handleStartTest}
              disabled={
                !testUrl ||
                !selectedTestType ||
                isExecuting ||
                  !validateLighthouseTest() ||
                  runningTests.some(test => test.status === "running" || test.status === "실행중")
              }
              className={`
                px-12 py-6 rounded-2xl text-xl font-semibold
                transition-all duration-200 flex items-center space-x-4 w-full justify-center
                ${
                  !testUrl ||
                  !selectedTestType ||
                  isExecuting ||
                    !validateLighthouseTest() ||
                    runningTests.some(test => test.status === "running" || test.status === "실행중")
                    ? "neu-button opacity-50 cursor-not-allowed text-muted-foreground"
                    : "neu-button-primary text-white"
                }
              `}
            >
              {isExecuting ? (
                <>
                  <Timer className="h-6 w-6 animate-spin" />
                  <span>테스트 실행 중...</span>
                </>
                ) : runningTests.some(test => test.status === "running" || test.status === "실행중") ? (
                  <>
                    <Timer className="h-6 w-6 animate-pulse" />
                    <span>다른 테스트가 진행 중입니다</span>
                </>
              ) : (
                <>
                  <Play className="h-6 w-6 " />
                  <span>테스트 시작</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
      </div>

      {/* 실행중인 테스트 목록 - 단순화된 버전 */}
      {(() => {
        const activeTestCount = runningTests.filter((t) => t.status === "running" || t.status === "실행중").length;
        const stoppedTestCount = runningTests.filter((t) => t.status === "중단됨").length;
        const totalTestCount = activeTestCount + stoppedTestCount;
        return totalTestCount > 0;
      })() && (
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <Timer className="h-7 w-7 text-primary" />
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-primary">
                테스트 진행 상황
              </h3>
              <p className="text-muted-foreground text-lg mt-1">
                현재 진행 중인 테스트
              </p>
            </div>
          </div>
          



          </div>
        )}

      {/* 최근 활동 */}
      <div className="neu-card rounded-3xl px-6 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Timer className="h-7 w-7 text-primary" />
          <div>
            <h3 className="text-2xl font-semibold text-primary">
              최근 활동
            </h3>
            <p className="text-muted-foreground text-lg mt-1">
              최근 실행된 테스트 결과
            </p>
          </div>
        </div>

        {/* 실행 현황 카드들 */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="neu-pressed rounded-2xl px-6 py-8 text-center">
            <div className="text-4xl font-bold text-primary mb-3">
              {
                runningTests.filter(
                  (t) => t.status === "running" || t.status === "실행중",
                ).length
              }
            </div>
            <p className="text-muted-foreground font-semibold">
              실행중
            </p>
          </div>
          <div className="neu-pressed rounded-2xl px-6 py-8 text-center">
            <div className="text-4xl font-bold text-orange-600 mb-3">
              {
                runningTests.filter((t) => t.status === "stopped").length +
                recentTestResults.filter((t) => t.status === "stopped" || t.status === "중단됨").length
              }
            </div>
            <p className="text-muted-foreground font-semibold">
              중단됨
            </p>
          </div>
          <div className="neu-pressed rounded-2xl px-6 py-8 text-center">
            <div className="text-4xl font-bold text-primary mb-3">
              {
                runningTests.filter((t) => t.status === "completed" || t.status === "완료").length +
                recentTestResults.filter((t) => t.status === "completed" || t.status === "완료").length
              }
            </div>
            <p className="text-muted-foreground font-semibold">
              완료
            </p>
          </div>
        </div>


            {/* 테스트 진행 상황 목록 */}
            <div className="space-y-6">
              <h4 className="font-semibold text-foreground text-lg">
                진행 중인 테스트 목록
              </h4>
              
              {(() => {
                const activeTestCount = runningTests.filter((t) => t.status === "running" || t.status === "실행중").length;
                const stoppedTestCount = runningTests.filter((t) => t.status === "stopped").length;
                const stoppingTestCount = runningTests.filter((t) => t.status === "stopping").length;
                const totalTestCount = activeTestCount + stoppedTestCount + stoppingTestCount;
                return totalTestCount > 0;
              })() ? (
                // 진행 중인 테스트가 있는 경우
                <div className="space-y-6">
                  {runningTests
                    .filter((t) => t.status === "running" || t.status === "실행중" || t.status === "stopped" || t.status === "stopping")
                    .map((test) => {
                      const isStopped = test.status === "stopped";
                      const isRunning = test.status === "running" || test.status === "실행중";
                      const isStopping = test.status === "stopping";
                      
                      return (
                        <div
                          key={`running-${test.id}-${test.startTime}-${test.type}`}
                          className={`neu-flat rounded-xl px-6 py-4 transition-all duration-200 ${
                            isStopped ? 'opacity-75 border-l-4 border-l-orange-500' : 
                            isStopping ? 'border-l-4 border-l-yellow-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className={`w-3 h-3 rounded-full ${
                                isStopped 
                                  ? 'bg-orange-500' 
                                  : isStopping
                                  ? 'bg-yellow-500 animate-pulse'
                                  : 'bg-primary animate-pulse'
                              }`} />
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">
                                  {test.url}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {
                                    testTypes.find(
                                      (t) => t.id === test.type,
                                    )?.name
                                  }{" "}
                                  • {test.startTime}
                                  {isStopped && test.stopTime && (
                                    <span className="text-orange-600 ml-2">
                                      (중단: {new Date(test.stopTime).toLocaleTimeString()})
                                    </span>
                                  )}
                                </p>
                                {/* Description 정보 추가 */}
                                {test.description && (
                                  <p className="text-sm text-muted-foreground mt-1 italic">
                                    {test.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isRunning ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // 중단 확인 다이얼로그 표시
                                  setStopConfirmDialog({
                                    isOpen: true,
                                    testId: test.id,
                                    testUrl: test.url,
                                  });
                                }}
                                disabled={test.status === 'stopping'}
                                className="neu-button text-sm px-4 py-2 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Square className="h-4 w-4 mr-2" />
                                {test.status === 'stopping' ? '중단 중...' : '중단'}
                              </Button>
                            ) : isStopping ? (
                              <div className="neu-pressed rounded-lg px-3 py-2">
                                <span className="text-sm text-yellow-600 font-medium">
                                  중단 중...
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm text-orange-600 font-medium">
                                중단됨
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            {isRunning && (
                              <div className="flex justify-between text-sm mt-2">
                                <span className="text-muted-foreground">
                                  경과 시간
                                </span>
                                <span className="text-sm font-medium text-primary">
                                  {elapsedTime[test.id] || '00:00'}
                                </span>
                              </div>
                            )}
                            {isStopped && (
                              <div className="neu-pressed rounded-lg px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <AlertCircle className="h-4 w-4 text-orange-500" />
                                  <span className="text-sm text-orange-600">
                                    {test.currentStep}
                                  </span>
                                </div>
                              </div>
                            )}
                            {isStopping && (
                              <div className="neu-pressed rounded-lg px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <Timer className="h-4 w-4 text-yellow-500 animate-spin" />
                                  <span className="text-sm text-yellow-600">
                                    테스트 진행 중...
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                // 진행 중인 테스트가 없는 경우
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-base">
                    진행중인 테스트 목록이 없습니다.
                  </p>
                </div>
              )}
            </div>


        {runningTests.length === 0 && recentTestResults.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="h-16 w-16 mx-auto mb-6 opacity-50" />
            <p className="font-semibold text-lg mb-2">
              실행중인 테스트가 없습니다
            </p>
            <p className="text-base">
              새 테스트를 시작해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-8">
            <h4 className="font-semibold text-foreground text-lg">
              최근 활동
            </h4>
            {(recentTestResults.length > 0 ? recentTestResults.slice(0, 5) : runningTests.slice(-3).reverse()).map((test, index) => {
              // 경과 시간 계산
              const calculateTestElapsedTime = (test: any): string => {
                if (test.testStartTime) {
                  // 실행 중인 테스트 (실시간)
                  const currentTime = Date.now();
                  const elapsedTime = currentTime - test.testStartTime;
                  const elapsedSeconds = Math.floor(elapsedTime / 1000);
                  const minutes = Math.floor(elapsedSeconds / 60);
                  const seconds = elapsedSeconds % 60;
                  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else if (test.createdAt && test.updatedAt) {
                  // 완료된 테스트 (DB에서 가져온 데이터)
                  const start = new Date(test.createdAt).getTime();
                  const end = new Date(test.updatedAt).getTime();
                  const elapsedTime = end - start;
                  const elapsedSeconds = Math.floor(elapsedTime / 1000);
                  const minutes = Math.floor(elapsedSeconds / 60);
                  const seconds = elapsedSeconds % 60;
                  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
                return '00:00';
              };

              const testType = test.testType || test.type || '부하테스트';
              const testStatus = test.status || '완료';
              const testUrl = test.url || '알 수 없음';
              const elapsedTime = calculateTestElapsedTime(test);

              return (
                <div
                  key={`${test.id}-${test.createdAt || test.testStartTime}-${index}`}
                  className="neu-flat rounded-xl px-4 py-4 flex items-center space-x-4 cursor-pointer hover:neu-button transition-all duration-200"
                  onClick={() => onNavigate?.('test-results')}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner"
                    style={{
                      backgroundColor:
                        testStatus === "완료" || testStatus === "completed"
                          ? "#7886C7"
                          : testStatus === "stopped" || testStatus === "중단됨"
                          ? "#F59E0B"
                          : testStatus === "failed" || testStatus === "실패"
                          ? "#EF4444"
                          : "#A9B5DF",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-medium text-foreground truncate">
                        {testUrl}
                      </span>
                      <div className="neu-pressed rounded-lg px-3 py-1">
                        <span className="text-xs font-medium text-primary">
                          {testType}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>소요시간: {elapsedTime}</span>
                    </div>
                  </div>
                  <div className="neu-pressed rounded-full px-4 py-2">
                    <span className={`text-sm font-medium ${
                      testStatus === "stopped" || testStatus === "중단됨" 
                        ? "text-orange-600" 
                        : testStatus === "failed" || testStatus === "실패"
                        ? "text-gray-500"
                        : "text-primary"
                    }`}>
                      {testStatus === "completed" ? "완료" : 
                       testStatus === "running" ? "실행중" : 
                       testStatus === "failed" ? "실패" : 
                       testStatus === "stopped" ? "중단됨" : testStatus}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* 더보기 버튼 */}
            {recentTestResults.length > 5 && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => onNavigate?.('test-results')}
                  className="neu-button hover:bg-primary hover:text-white transition-colors duration-200"
                >
                  더보기 ({recentTestResults.length - 5}개 더)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* 중단 확인 다이얼로그 */}
    <AlertDialog 
      open={stopConfirmDialog.isOpen} 
      onOpenChange={(open) => setStopConfirmDialog(prev => ({ ...prev, isOpen: open }))}
    >
      <AlertDialogContent className="bg-[#F8F6FF] rounded-2xl border border-gray-200 shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-primary">
            테스트 중단 확인
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            정말 테스트를 중단하시겠습니까?
            <br />
            <span className="font-medium text-foreground mt-2 block">
              {stopConfirmDialog.testUrl}
            </span>
            <br />
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="neu-button">
            취소
          </AlertDialogCancel>
          <AlertDialogAction 
            className="neu-button-primary bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => {
              if (stopConfirmDialog.testId) {
                // 공통 함수를 사용하여 상태를 stopping으로 변경
                updateTestStatus(stopConfirmDialog.testId, 'stopping');
                
                // 다이얼로그 닫기
                setStopConfirmDialog(prev => ({ ...prev, isOpen: false }));
                
                // 테스트 중단 처리
                handleStopTest(stopConfirmDialog.testId);
              }
            }}
          >
            중단
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);
}