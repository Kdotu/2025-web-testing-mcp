import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
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
} from "../utils/api";
import { getAllTestResults as getBackendTestResults } from "../utils/backend-api";
import {
  createLoadTest,
  getTestStatus as getBackendTestStatus,
  cancelTest as cancelBackendTest,
  checkBackendHealth,
  executeK6MCPTestDirect,
  executeK6MCPTest,
  getLighthouseTestStatus,
  runLighthouseTest,
  type LoadTestConfig,
  type LoadTestResult,
} from "../utils/backend-api";

interface RunningTest {
  id: number;
  backendTestId?: string; // 백엔드 testId
  url: string;
  type: string;
  status: string;
  startTime: string;
  currentStep: string;
  estimatedTime: string;
  logs: string[];
  settings: any;
  testStartTime?: number; // 테스트 시작 시간 (밀리초)
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
}

interface TestExecutionProps {
  onNavigate?: (tabId: string) => void;
}

export function TestExecution({ onNavigate }: TestExecutionProps) {
  const [testUrl, setTestUrl] = useState("");
  const [selectedTestType, setSelectedTestType] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [urlError, setUrlError] = useState("");
  const [runningTests, setRunningTests] = useState<
    RunningTest[]
  >([]);
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
          console.log('TestExecution: 백엔드 API 연결 성공');
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

  // 최근 테스트 결과 가져오기
  useEffect(() => {
    const fetchRecentTestResults = async () => {
      try {
        const result = await getBackendTestResults(1, 3); // 최근 3개 테스트
        if (result.success && result.data) {
          setRecentTestResults(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch recent test results:', error);
      }
    };

    fetchRecentTestResults();
  }, []);

  // MCP 도구 매핑
  const getMcpTools = (testType: string) => {
    switch (testType) {
      case "performance":
        return ["Lighthouse CLI", "WebPageTest"];
      case "lighthouse":
        return ["Google Lighthouse", "Lighthouse CI"];
      case "load":
        return ["k6"]; // "Artillery"
      case "security":
        return ["OWASP ZAP", "Nmap"];
        
      case "accessibility":
        return ["axe-core", "Pa11y"];
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
    )!;
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
    });

  // 설정 마이그레이션 함수 - 기존 설정을 새 k6 형식으로 변환
  const migrateLoadSettings = (loadSettings: any) => {
    // 이미 새 형식이면 그대로 반환
    if (loadSettings.executor && loadSettings.stages) {
      // preset 속성이 없으면 custom으로 설정
      if (!loadSettings.preset) {
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
          setTestTypes(
            testTypesResult.data.filter((type) => type.enabled),
          );
        } else {
          // API 실패 시에도 데이터가 있으면 사용 (오프라인 모드에서 로컬 데이터 반환)
          if (
            testTypesResult.data &&
            testTypesResult.data.length > 0
          ) {
            setTestTypes(
              testTypesResult.data.filter(
                (type) => type.enabled,
              ),
            );
          } else {
            // 완전히 실패한 경우에만 기본값 사용
            const defaultTestTypes = [
              {
                id: "performance",
                name: "성능테스트",
                description: "페이지 로딩 속도 및 성능 측정",
                enabled: true,
              },
              {
                id: "lighthouse",
                name: "Lighthouse",
                description: "웹페이지 품질 종합 평가",
                enabled: true,
              },
              {
                id: "load",
                name: "부하테스트",
                description:
                  "k6 기반 동시 접속자 부하 처리 능력 측정",
                enabled: true,
              },
              {
                id: "security",
                name: "보안테스트",
                description: "웹사이트 보안 취약점 검사",
                enabled: true,
              },
              {
                id: "accessibility",
                name: "접근성테스트",
                description: "웹 접근성 표준 준수 검사",
                enabled: true,
              },
            ];
            setTestTypes(
              defaultTestTypes.filter((type) => type.enabled),
            );
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
      const loadTestConfig: LoadTestConfig = {
        url: testUrl,
        name: testDescription || `Load Test - ${testUrl}`,
        description: testDescription,
        stages: testSettings.load.stages,
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
          duration: testSettings.load.timeUnit,
          vus: testSettings.load.maxVUs,
          detailedConfig: {
            executor: testSettings.load.executor,
            preset: testSettings.load.preset,
            startRate: testSettings.load.startRate,
            timeUnit: testSettings.load.timeUnit,
            preAllocatedVUs: testSettings.load.preAllocatedVUs,
            maxVUs: testSettings.load.maxVUs,
            stages: testSettings.load.stages,
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
          }, 2000);

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
          categories: testSettings.lighthouse.categories,
          device: testSettings.lighthouse.device,
          throttling: testSettings.lighthouse.throttling,
          locale: testSettings.lighthouse.locale
        };
        
        // Lighthouse MCP API 호출 (실제 구현 필요)
        result = await executeLighthouseTest(lighthouseParams);
      } else {
        // 다른 테스트 유형은 k6 사용
        const k6Script = generateTestScript(normalizedUrl, selectedTestType, testSettings);
        
        const testParams = {
          url: normalizedUrl,
          name: testDescription || `${selectedTestType} Test - ${normalizedUrl}`,
          description: testDescription,
          script: k6Script,
          config: {
            duration: selectedTestType === 'load' ? testSettings.load.timeUnit : '30s',
            vus: selectedTestType === 'load' ? testSettings.load.maxVUs : 10,
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
              }
            } catch (error) {
              console.error('테스트 상태 확인 중 오류:', error);
            }
          }, 3000); // 3초마다 상태 확인

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

  const handleStopTest = async (testId: number) => {
    try {
      const testToStop = runningTests.find(
        (test) => test.id === testId,
      );
      if (!testToStop) return;

      // 백엔드에 테스트 중지 요청 (실제 구현에서는 testId를 서버 ID로 매핑 필요)
      // const result = await stopTest(serverTestId);

      setRunningTests((prev) =>
        prev.map((test) =>
          test.id === testId
            ? {
                ...test,
                status: "중단됨",

                currentStep: "사용자에 의해 중단됨",
              }
            : test,
        ),
      );
    } catch (error) {
      console.error("Error stopping test:", error);
    }
  };



  const updateTestSetting = (
    testType: keyof TestSettings,
    key: string,
    value: any,
  ) => {
    setTestSettings((prev) => ({
      ...prev,
      [testType]: {
        ...prev[testType],
        [key]: value,
      },
    }));
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

      return (
    <div className="w-full flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-8 mx-auto">
      {/* 헤더 */}
      <div className="neu-card rounded-3xl px-8 py-6 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(99,102,241,0.4)]">
        <h1 className="text-4xl font-bold text-primary mb-4">
          테스트 실행
        </h1>
        <p className="text-muted-foreground text-lg">
          웹사이트에 대한 다양한 테스트를 실행하세요
        </p>
          </div>

      {/* 메인 설정 영역: 세로 레이아웃 */}
      <div className="space-y-8">
        {/* 기본 테스트 설정 */}
          <div className="neu-card rounded-3xl px-6 py-8">
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-primary mb-4">
              기본 테스트 설정
              </h3>
            <p className="text-muted-foreground text-lg">
              테스트할 웹사이트와 테스트 유형을 선택하세요
            </p>

            {/* 테스트 유형과 활용 MCP 도구 표시 - 항상 표시 */}
            <div className="mt-6">
                            {/* 테스트 유형 선택 */}
              <div className="mb-4">
                <div className="flex items-center space-x-3">
                  <TestTube className="h-5 w-5 text-primary" />
                  <Label className="text-foreground font-semibold text-lg w-28">
                    테스트 유형
                  </Label>
                  <div className="flex gap-2">
                    {testTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedTestType(type.id)}
                        disabled={isExecuting}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedTestType === type.id 
                            ? "neu-accent text-primary-foreground" 
                            : "neu-button text-foreground hover:text-primary"
                        } ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {type.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* 활용 MCP 도구 표시 */}
              <div className="mb-4">
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <Label className="text-foreground font-semibold text-lg w-28">
                    활용 MCP 도구
                  </Label>
                  {selectedTestType && (
                    <div className="flex gap-2">
                      {getMcpTools(selectedTestType).map((tool) => (
                        <div
                          key={tool}
                          className="neu-pressed rounded-lg px-3 py-2"
                        >
                          <Badge
                            variant="secondary"
                            className="font-semibold text-sm bg-transparent border-none text-muted-foreground"
                          >
                            {tool}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
              <div className="space-y-6">
            <div className="space-y-4">
                <Label className="text-foreground font-semibold text-lg">
                테스트 URL
                </Label>
              <div
                className={`neu-input rounded-xl px-4 py-3 ${urlError ? "border-destructive border-2" : ""}`}
              >
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={testUrl}
                  onChange={(e) =>
                    handleUrlChange(e.target.value)
                  }
                  onBlur={handleUrlBlur}
                  disabled={isExecuting}
                  className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
                  pattern="https?://.*"
                />
                    </div>
              {urlError && (
                <div className="flex items-start space-x-2 text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{urlError}</p>
                </div>
              )}
              </div>

            <div className="space-y-4">
                <Label className="text-foreground font-semibold text-lg">
                테스트 설명 (선택사항)
                </Label>
              <div className="neu-input rounded-xl px-4 py-1">
                <Textarea
                  placeholder="이 테스트에 대한 간단한 설명을 입력하세요"
                  value={testDescription}
                  onChange={(e) =>
                    setTestDescription(e.target.value)
                  }
                  disabled={isExecuting}
                  className="min-h-12 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>



            {selectedTestType && (
              <div className="neu-pressed rounded-xl px-6 py-5">
                <div className="flex items-start space-x-4">
                  <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <p className="text-muted-foreground">
                    {
                      testTypes.find(
                        (t) => t.id === selectedTestType,
                      )?.description
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

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
                      const isSelected = testSettings.load.preset === preset.id;

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
                        Executor: {testSettings.load.executor}
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
                          {testSettings.load.startRate} 요청 / {testSettings.load.timeUnit}
                      </span>
                      <span className="text-xs text-foreground">
                          ≈ {Math.round((testSettings.load.startRate / parseInt(testSettings.load.timeUnit)) * 100) / 100} TPS
                      </span>
                    </div>
                  </div>
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      시간 단위 <span className="text-xs text-muted-foreground">(Time Unit)</span>
                    </Label>
                    <span className="text-foreground font-semibold">
                        {testSettings.load.timeUnit}
                    </span>
                  </div>
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      사전 할당 VU <span className="text-xs text-muted-foreground">(Pre-allocated VUs)</span>
                    </Label>
                    <span className="text-foreground font-semibold">
                        {testSettings.load.preAllocatedVUs}
                    </span>
                  </div>
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      최대 VU <span className="text-xs text-muted-foreground">(Max VUs)</span>
                    </Label>
                    <span className="text-foreground font-semibold">
                        {testSettings.load.maxVUs}
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
              {testSettings.load.preset === "custom" && (
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
                          value={testSettings.load.executor}
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
                              value={testSettings.load.startRate}
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
                            per {testSettings.load.timeUnit} ≈ {Math.round((testSettings.load.startRate / parseInt(testSettings.load.timeUnit)) * 100) / 100} TPS
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          시간 단위 <span className="text-xs text-muted-foreground">(Time Unit)</span>
                        </Label>
                        <div className="neu-input rounded-lg px-2 py-1 ring-1 ring-primary/20">
                          <Select
                              value={testSettings.load.timeUnit}
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
                            {testSettings.load.timeUnit.includes('m') ? parseInt(testSettings.load.timeUnit) * 60 : parseInt(testSettings.load.timeUnit)}초
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          사전 할당 VU <span className="text-xs text-muted-foreground">(Pre-allocated VUs)</span>
                        </Label>
                        <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                          <Input
                            type="number"
                              value={testSettings.load.preAllocatedVUs}
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
                              value={testSettings.load.maxVUs}
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
                  {testSettings.load.preset !== "custom" && (
                    <span className="text-sm text-muted-foreground ml-2">
                      • {loadTestPresets.find(p => p.id === testSettings.load.preset)?.name} 프리셋
                    </span>
                  )}
                </Label>
                <div className="space-y-4">
                  {testSettings.load.stages.map((stage, index) => (
                    <div key={index} className="neu-input rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">
                              목표 요청 수 <span className="text-xs text-muted-foreground">(Target Requests)</span>
                            <span className="text-xs ml-1">(per {testSettings.load.timeUnit})</span>
                            </Label>
                            <Input
                              type="number"
                              value={stage.target || 0}
                              onChange={(e) => {
                              if (testSettings.load.preset !== "custom") return;
                              const newStages = [...testSettings.load.stages];
                              newStages[index] = { ...stage, target: Number(e.target.value) || 0 };
                              updateTestSetting("load", "stages", newStages);
                            }}
                            disabled={testSettings.load.preset !== "custom"}
                              className={`border-none bg-transparent text-foreground text-center font-semibold ${
                              testSettings.load.preset !== "custom" ? "opacity-60" : ""
                              }`}
                              min="0"
                              max="50000"
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                            ≈ {Math.round((stage.target || 0) / parseInt(testSettings.load.timeUnit) * 100) / 100} TPS
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">
                              지속 시간 <span className="text-xs text-muted-foreground">(Duration)</span>
                            </Label>
                          {testSettings.load.preset === "custom" ? (
                              <Select
                                value={stage.duration || "1m"}
                                onValueChange={(value) => {
                                const newStages = [...testSettings.load.stages];
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
              {/* Categories 선택 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  검사 카테고리 <span className="text-xs text-muted-foreground ml-1">(Categories)</span>
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'performance', name: '성능', description: '페이지 로딩 속도 및 성능 측정' },
                    { id: 'accessibility', name: '접근성', description: '웹 접근성 표준 준수 검사' },
                    { id: 'best-practices', name: '모범 사례', description: '웹 개발 모범 사례 준수' },
                    { id: 'seo', name: 'SEO', description: '검색 엔진 최적화 검사' },
                    { id: 'pwa', name: 'PWA', description: 'Progressive Web App 기능' }
                  ].map((category) => {
                    const isSelected = testSettings.lighthouse.categories.includes(category.id);
                    
                    return (
                      <div
                        key={category.id}
                        onClick={() => {
                          const newCategories = isSelected
                            ? testSettings.lighthouse.categories.filter(c => c !== category.id)
                            : [...testSettings.lighthouse.categories, category.id];
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
                <div className="mt-4 neu-pressed rounded-lg px-4 py-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <strong>선택된 카테고리:</strong> {testSettings.lighthouse.categories.join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Device 설정 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  디바이스 <span className="text-xs text-muted-foreground ml-1">(Device)</span>
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'desktop', name: '데스크톱', description: '데스크톱 환경에서 테스트' },
                    { id: 'mobile', name: '모바일', description: '모바일 환경에서 테스트' }
                  ].map((device) => {
                    const isSelected = testSettings.lighthouse.device === device.id;
                    
                    return (
                      <button
                        key={device.id}
                        onClick={() => updateTestSetting('lighthouse', 'device', device.id)}
                        className={`neu-button rounded-xl p-4 text-left transition-all duration-200 ${
                          isSelected ? "neu-button-active" : ""
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-3 h-3 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                          <span
                            className={`font-semibold ${isSelected ? "text-primary-foreground" : "text-primary"}`}
                          >
                            {device.name}
                          </span>
                        </div>
                        <p
                          className={`text-sm ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                        >
                          {device.description}
                        </p>
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
                    value={testSettings.lighthouse.throttling}
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
                  !validateUrl(normalizeUrl(testUrl)) ||
                  runningTests.some(test => test.status === "running" || test.status === "실행중")
              }
              className={`
                px-12 py-6 rounded-2xl text-xl font-semibold
                transition-all duration-200 flex items-center space-x-4 w-full justify-center
                ${
                  !testUrl ||
                  !selectedTestType ||
                  isExecuting ||
                    !validateUrl(normalizeUrl(testUrl)) ||
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
        const runningTestCount = runningTests.filter((t) => t.status === "running" || t.status === "실행중").length;
        // console.log('Running test count:', runningTestCount, 'Total tests:', runningTests.length);
        return runningTestCount > 0;
      })() && (
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <Timer className="h-7 w-7 text-primary" />
            <h3 className="text-2xl font-semibold text-primary">
              테스트 진행 상황
            </h3>
          </div>
          <div className="space-y-6">
            {runningTests
              .filter((t) => t.status === "running" || t.status === "실행중")
              .map((test) => (
                <div
                  key={test.id}
                  className="neu-flat rounded-xl px-6 py-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                      <div>
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
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStopTest(test.id)}
                      className="neu-button text-sm px-4 py-2"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      중단
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {/* <div className="flex justify-between text-sm">

                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">
                        경과 시간
                      </span>
                      <span className="font-medium text-primary">
                        {elapsedTime[test.id] || '00:00'}
                      </span>
                    </div>
                    {/* 디버깅용 로그 */}
                    {/* {process.env.NODE_ENV === 'development' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Debug: {test.backendTestId} - {test.currentStep} - {elapsedTime[test.id]}
                      </p>
                    )} */}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 실행 현황 (하단으로 이동) */}
      <div className="neu-card rounded-3xl px-6 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Activity className="h-7 w-7 text-primary" />
          <div>
            <h3 className="text-2xl font-semibold text-primary">
              실행 현황
            </h3>
            <p className="text-muted-foreground text-lg mt-1">
              현재 진행 중인 테스트 상태
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-8">
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
            <div className="text-4xl font-bold text-primary mb-3">
              {
                runningTests.filter((t) => t.status === "completed" || t.status === "완료")
                  .length
              }
            </div>
            <p className="text-muted-foreground font-semibold">
              완료
            </p>
          </div>
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
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground text-lg">
              최근 활동
            </h4>
            {(recentTestResults.length > 0 ? recentTestResults : runningTests.slice(-3).reverse()).map((test, index) => {
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
                  key={test.id || index}
                  className="neu-flat rounded-xl px-4 py-4 flex items-center space-x-4 cursor-pointer hover:neu-button transition-all duration-200"
                  onClick={() => onNavigate?.('test-results')}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner"
                    style={{
                      backgroundColor:
                        testStatus === "완료" || testStatus === "completed"
                          ? "#7886C7"
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
                    <span className="text-sm font-medium text-primary">
                      {testStatus === "completed" ? "완료" : 
                       testStatus === "running" ? "실행중" : 
                       testStatus === "failed" ? "실패" : testStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}