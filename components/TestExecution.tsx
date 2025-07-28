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
import { Progress } from "./ui/progress";
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

interface RunningTest {
  id: number;
  url: string;
  type: string;
  progress: number;
  status: string;
  startTime: string;
  currentStep: string;
  estimatedTime: string;
  logs: string[];
  settings: any;
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

  // MCP 도구 매핑
  const getMcpTools = (testType: string) => {
    switch (testType) {
      case "performance":
        return ["Lighthouse CLI", "WebPageTest"];
      case "lighthouse":
        return ["Google Lighthouse", "Lighthouse CI"];
      case "load":
        return ["k6", "Artillery"];
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
              progress: test.progress,
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

    if (!value.trim()) {
      setUrlError("");
      return;
    }

    const normalizedUrl = normalizeUrl(value);
    if (!validateUrl(normalizedUrl)) {
      setUrlError(
        "올바른 웹 URL을 입력하세요 (예: https://example.com)",
      );
    } else {
      setUrlError("");
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

  const handleStartTest = async () => {
    const normalizedUrl = normalizeUrl(testUrl);
    if (
      !normalizedUrl ||
      !selectedTestType ||
      !validateUrl(normalizedUrl)
    )
      return;

    setIsExecuting(true);

    try {
      // 백엔드에 테스트 실행 요청
      const result = await executeTest(
        normalizedUrl,
        selectedTestType,
        testSettings[selectedTestType as keyof TestSettings],
      );

      if (result.success && result.testId) {
        const newTest: RunningTest = {
          id: Date.now(),
          url: normalizedUrl,
          type: selectedTestType,
          progress: 0,
          status: "실행중",
          startTime: new Date().toLocaleTimeString(),
          currentStep: "초기화 중...",
          estimatedTime: "약 3분",
          logs: [
            `${new Date().toLocaleTimeString()} - 테스트 시작: ${normalizedUrl}`,
          ],
          settings:
            testSettings[
              selectedTestType as keyof TestSettings
            ],
        };

        setRunningTests((prev) => [...prev, newTest]);

        // 테스트 상태 폴링
        const pollInterval = setInterval(async () => {
          try {
            const statusResult = await getTestStatus(
              result.testId!,
            );

            if (statusResult.success && statusResult.data) {
              const testData = statusResult.data;
              const steps = getTestSteps(selectedTestType);
              const currentStepIndex = Math.floor(
                (testData.progress / 100) * steps.length,
              );

              setRunningTests((prev) =>
                prev.map((test) =>
                  test.id === newTest.id
                    ? {
                        ...test,
                        progress: testData.progress,
                        status:
                          testData.status === "completed"
                            ? "완료"
                            : testData.status === "stopped"
                              ? "중단됨"
                              : testData.status === "failed"
                                ? "실패"
                                : "실행중",
                        currentStep:
                          testData.status === "completed"
                            ? "완료"
                            : testData.status === "stopped"
                              ? "사용자에 의해 중단됨"
                              : testData.status === "failed"
                                ? "오류 발생"
                                : steps[currentStepIndex] ||
                                  "처리 중...",
                        estimatedTime:
                          testData.status === "completed" ||
                          testData.status === "stopped"
                            ? "완료"
                            : "약 3분",
                        logs: testData.logs || test.logs,
                      }
                    : test,
                ),
              );

              // 테스트 완료되면 폴링 중지
              if (
                testData.status === "completed" ||
                testData.status === "stopped" ||
                testData.status === "failed"
              ) {
                clearInterval(pollInterval);
                setIsExecuting(false);

                // 폼 초기화
                setTestUrl("");
                setSelectedTestType("");
                setTestDescription("");
              }
            }
          } catch (error) {
            console.error("Error polling test status:", error);
          }
        }, 1000);
      } else {
        console.error("Failed to start test:", result.error);
        setIsExecuting(false);
      }
    } catch (error) {
      console.error("Error starting test:", error);
      setIsExecuting(false);
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
                progress: test.progress,
                currentStep: "사용자에 의해 중단됨",
              }
            : test,
        ),
      );
    } catch (error) {
      console.error("Error stopping test:", error);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "#7886C7";
    if (progress > 50) return "#A9B5DF";
    return "#9BA8E8";
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

  const renderTestTypeSettings = () => {
    if (!selectedTestType) {
      return (
        <div className="neu-card rounded-3xl px-6 py-8 flex items-center justify-center">
          <div className="text-center py-12 text-muted-foreground">
            <Settings className="h-16 w-16 mx-auto mb-6 opacity-50" />
            <p className="font-semibold text-lg mb-2">
              테스트 유형을 선택하세요
            </p>
            <p className="text-base">
              좌측에서 테스트 유형을 선택하면 상세 설정이
              나타납니다
            </p>
          </div>
        </div>
      );
    }

    const currentSettings =
      testSettings[selectedTestType as keyof TestSettings];

    // 설정이 없거나 잘못된 경우 기본값 사용
    if (!currentSettings) {
      return (
        <div className="neu-card rounded-3xl px-6 py-8 flex items-center justify-center">
          <div className="text-center py-12 text-muted-foreground">
            <Settings className="h-16 w-16 mx-auto mb-6 opacity-50" />
            <p className="font-semibold text-lg mb-2">
              설정 로딩 중...
            </p>
            <p className="text-base">잠시만 기다려주세요</p>
          </div>
        </div>
      );
    }

    switch (selectedTestType) {
      case "performance":
        return (
          <div className="neu-card rounded-3xl px-6 py-8">
            <div className="flex items-center space-x-4 mb-8">
              <Settings className="h-7 w-7 text-primary" />
              <h3 className="text-2xl font-semibold text-primary">
                성능테스트 설정
              </h3>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-foreground font-semibold text-lg">
                    타임아웃 (초)
                  </Label>
                  <div className="neu-input rounded-xl px-4 py-3">
                    <Input
                      type="number"
                      value={currentSettings.timeout || 30}
                      onChange={(e) =>
                        updateTestSetting(
                          "performance",
                          "timeout",
                          Number(e.target.value),
                        )
                      }
                      min="10"
                      max="300"
                      className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-foreground font-semibold text-lg">
                    재시도 횟수
                  </Label>
                  <div className="neu-input rounded-xl px-4 py-3">
                    <Input
                      type="number"
                      value={currentSettings.retries || 3}
                      onChange={(e) =>
                        updateTestSetting(
                          "performance",
                          "retries",
                          Number(e.target.value),
                        )
                      }
                      min="0"
                      max="10"
                      className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-foreground font-semibold text-lg">
                  디바이스 타입
                </Label>
                <div className="neu-input rounded-xl px-3 py-2">
                  <Select
                    value={currentSettings.device || "desktop"}
                    onValueChange={(value) =>
                      updateTestSetting(
                        "performance",
                        "device",
                        value,
                      )
                    }
                  >
                    <SelectTrigger className="border-none bg-transparent text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="neu-card rounded-xl border-none bg-card">
                      <SelectItem value="desktop">
                        데스크톱
                      </SelectItem>
                      <SelectItem value="mobile">
                        모바일
                      </SelectItem>
                      <SelectItem value="tablet">
                        태블릿
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-6">
                <Label className="text-foreground font-semibold text-lg">
                  측정할 메트릭
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    "FCP",
                    "LCP",
                    "CLS",
                    "TBT",
                    "SI",
                    "FID",
                  ].map((metric) => (
                    <div
                      key={metric}
                      className="neu-subtle rounded-xl px-4 py-4 flex items-center space-x-4"
                    >
                      <Checkbox
                        checked={(
                          currentSettings.metrics || []
                        ).includes(metric)}
                        onCheckedChange={(checked) => {
                          const currentMetrics =
                            currentSettings.metrics || [];
                          const newMetrics = checked
                            ? [...currentMetrics, metric]
                            : currentMetrics.filter(
                                (m) => m !== metric,
                              );
                          updateTestSetting(
                            "performance",
                            "metrics",
                            newMetrics,
                          );
                        }}
                      />
                      <Label className="font-semibold text-foreground cursor-pointer">
                        {metric}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="neu-subtle rounded-xl px-6 py-6 flex items-center justify-between">
                <Label className="text-foreground font-semibold text-lg">
                  네트워크 스로틀링 적용
                </Label>
                <Switch
                  checked={currentSettings.throttling ?? true}
                  onCheckedChange={(checked) =>
                    updateTestSetting(
                      "performance",
                      "throttling",
                      checked,
                    )
                  }
                />
              </div>
            </div>
          </div>
        );

      case "load":
        // 안전한 접근을 위한 현재 설정 검증 및 기본값 제공
        const safeLoadSettings = {
          executor:
            currentSettings.executor || "ramping-arrival-rate",
          preset: currentSettings.preset || "medium",
          startRate: currentSettings.startRate || 100,
          timeUnit: currentSettings.timeUnit || "20s",
          preAllocatedVUs:
            currentSettings.preAllocatedVUs || 10,
          maxVUs: currentSettings.maxVUs || 500,
          stages: Array.isArray(currentSettings.stages)
            ? currentSettings.stages
            : getDefaultLoadSettings().stages,
        };

        const currentPreset =
          loadTestPresets.find(
            (p) => p.id === safeLoadSettings.preset,
          ) || loadTestPresets[1]; // default to medium

        // TPS 계산 함수
        const calculateTPS = (
          iterations: number,
          timeUnit: string,
        ) => {
          const seconds = timeUnit.includes("m")
            ? parseInt(timeUnit) * 60
            : parseInt(timeUnit);
          return Math.round((iterations / seconds) * 100) / 100;
        };

        // 시간 단위를 초로 변환
        const parseTimeUnit = (timeUnit: string) => {
          const match = timeUnit.match(/(\d+)([sm])/);
          if (!match) return 1;
          const [, value, unit] = match;
          const num = parseInt(value);
          return unit === "m" ? num * 60 : num;
        };

        return (
          <div className="neu-card rounded-3xl px-6 py-8">
            <div className="flex items-center space-x-4 mb-6">
              <Settings className="h-7 w-7 text-primary" />
              <h3 className="text-2xl font-semibold text-primary">
                부하테스트 설정 (k6 기반)
              </h3>
            </div>
            <div className="space-y-6">
              {/* Preset 선택 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  테스트 프리셋 선택 <span className="text-xs text-muted-foreground ml-1">(Test Preset Selection)</span>
                </Label>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {loadTestPresets.map((preset) => {
                    const IconComponent = preset.icon;
                    const isSelected =
                      safeLoadSettings.preset === preset.id;

                    return (
                      <button
                        key={preset.id}
                        onClick={() =>
                          handlePresetChange(preset.id)
                        }
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

              {/* 기본 설정 표시 - 개선된 버전 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-foreground font-semibold text-lg">
                    현재 기본 설정 <span className="text-xs text-muted-foreground ml-1">(Current Settings)</span>
                  </Label>
                  <div className="neu-pressed rounded-lg px-3 py-1">
                    <span className="text-xs text-muted-foreground">
                      Executor: {safeLoadSettings.executor}
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
                        {safeLoadSettings.startRate} 요청 /{" "}
                        {safeLoadSettings.timeUnit}
                      </span>
                      <span className="text-xs text-foreground">
                        ≈{" "}
                        {calculateTPS(
                          safeLoadSettings.startRate,
                          safeLoadSettings.timeUnit,
                        )}{" "}
                        TPS
                      </span>
                    </div>
                  </div>
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      시간 단위 <span className="text-xs text-muted-foreground">(Time Unit)</span>
                    </Label>
                    <span className="text-foreground font-semibold">
                      {safeLoadSettings.timeUnit}
                      <span className="text-xs text-foreground ml-1">
                        (
                        {parseTimeUnit(
                          safeLoadSettings.timeUnit,
                        )}
                        초)
                      </span>
                    </span>
                  </div>
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      사전 할당 VU <span className="text-xs text-muted-foreground">(Pre-allocated VUs)</span>
                    </Label>
                    <span className="text-foreground font-semibold">
                      {safeLoadSettings.preAllocatedVUs}
                    </span>
                  </div>
                  <div className="neu-pressed rounded-lg px-4 py-3">
                    <Label className="text-sm text-muted-foreground mb-1 block">
                      최대 VU <span className="text-xs text-muted-foreground">(Max VUs)</span>
                    </Label>
                    <span className="text-foreground font-semibold">
                      {safeLoadSettings.maxVUs}
                    </span>
                  </div>
                </div>

                {/* Executor 설명 추가 */}
                <div className="mt-4 neu-pressed rounded-lg px-4 py-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <strong>Ramping Arrival Rate:</strong>{" "}
                      일정 시간 동안 목표 요청률(iterations per
                      timeUnit)까지 선형 증가시키는 부하
                      방식입니다. 실제 TPS는 시스템 응답 성능에
                      따라 달라질 수 있습니다.
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom 모드일 때만 상세 설정 표시 */}
              {safeLoadSettings.preset === "custom" && (
                <>
                  {/* Executor 선택 */}
                  <div className="neu-subtle rounded-xl px-6 py-6">
                    <Label className="text-foreground font-semibold text-lg mb-4 block">
                      실행 모드 <span className="text-xs text-muted-foreground ml-1">(Executor)</span>
                    </Label>
                    <div className="neu-input rounded-xl px-3 py-2">
                      <Select
                        value={safeLoadSettings.executor}
                        onValueChange={(value) =>
                          updateTestSetting(
                            "load",
                            "executor",
                            value,
                          )
                        }
                      >
                        <SelectTrigger className="border-none bg-transparent text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="neu-card rounded-xl border-none bg-card">
                          <SelectItem value="ramping-arrival-rate">
                            Ramping Arrival Rate (점진적 요청률
                            증가)
                          </SelectItem>
                          <SelectItem value="constant-arrival-rate">
                            Constant Arrival Rate (일정한 요청률
                            유지)
                          </SelectItem>
                          <SelectItem value="ramping-vus">
                            Ramping VUs (점진적 가상 사용자
                            증가)
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
                          ramping-arrival-rate는 실제 사용자
                          행동 패턴을 가장 잘 시뮬레이션합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 컴팩트한 설정 그리드 */}
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
                            value={safeLoadSettings.startRate}
                            onChange={(e) => {
                              const value = Math.max(
                                1,
                                Math.min(
                                  10000,
                                  Number(e.target.value) || 1,
                                ),
                              );
                              updateTestSetting(
                                "load",
                                "startRate",
                                value,
                              );
                            }}
                            min="1"
                            max="10000"
                            className="border-none bg-transparent text-center text-primary font-semibold text-sm focus:text-foreground transition-colors"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          per {safeLoadSettings.timeUnit} ≈{" "}
                          {calculateTPS(
                            safeLoadSettings.startRate,
                            safeLoadSettings.timeUnit,
                          )}{" "}
                          TPS
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          시간 단위 <span className="text-xs text-muted-foreground">(Time Unit)</span>
                        </Label>
                        <div className="neu-input rounded-lg px-2 py-1 ring-1 ring-primary/20">
                          <Select
                            value={safeLoadSettings.timeUnit}
                            onValueChange={(value) =>
                              updateTestSetting(
                                "load",
                                "timeUnit",
                                value,
                              )
                            }
                          >
                            <SelectTrigger className="border-none bg-transparent text-primary text-sm h-8 hover:text-foreground transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="neu-card rounded-xl border-none bg-card">
                              <SelectItem value="1s">
                                1초
                              </SelectItem>
                              <SelectItem value="5s">
                                5초
                              </SelectItem>
                              <SelectItem value="10s">
                                10초
                              </SelectItem>
                              <SelectItem value="20s">
                                20초
                              </SelectItem>
                              <SelectItem value="30s">
                                30초
                              </SelectItem>
                              <SelectItem value="1m">
                                1분
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          {parseTimeUnit(
                            safeLoadSettings.timeUnit,
                          )}
                          초
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          사전 할당 VU <span className="text-xs text-muted-foreground">(Pre-allocated VUs)</span>
                        </Label>
                        <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                          <Input
                            type="number"
                            value={
                              safeLoadSettings.preAllocatedVUs
                            }
                            onChange={(e) => {
                              const value = Math.max(
                                1,
                                Math.min(
                                  100,
                                  Number(e.target.value) || 1,
                                ),
                              );
                              updateTestSetting(
                                "load",
                                "preAllocatedVUs",
                                value,
                              );
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
                            value={safeLoadSettings.maxVUs}
                            onChange={(e) => {
                              const value = Math.max(
                                1,
                                Math.min(
                                  2000,
                                  Number(e.target.value) || 1,
                                ),
                              );
                              updateTestSetting(
                                "load",
                                "maxVUs",
                                value,
                              );
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
                          <strong>k6 기준:</strong> iterations
                          per timeUnit으로 설정하며, 실제 TPS는
                          시스템 응답 성능에 따라 달라질 수
                          있습니다. 프리셋 사용을 권장합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 테스트 단계 (Stages) - 모든 모드에서 표시하되 Custom만 편집 가능 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  테스트 단계 <span className="text-xs text-muted-foreground ml-1">(Stages)</span>
                  {safeLoadSettings.preset !== "custom" && (
                    <span className="text-sm text-muted-foreground ml-2">
                      • {currentPreset.name} 프리셋
                    </span>
                  )}
                </Label>
                <div className="space-y-4">
                  {safeLoadSettings.stages.map(
                    (stage, index) => (
                      <div
                        key={index}
                        className="neu-input rounded-xl p-4"
                      >
                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">
                              목표 요청 수 <span className="text-xs text-muted-foreground">(Target Requests)</span>
                              <span className="text-xs ml-1">
                                (per {safeLoadSettings.timeUnit}
                                )
                              </span>
                            </Label>
                            <Input
                              type="number"
                              value={stage.target || 0}
                              onChange={(e) => {
                                if (
                                  safeLoadSettings.preset !==
                                  "custom"
                                )
                                  return;
                                const newStages = [
                                  ...safeLoadSettings.stages,
                                ];
                                newStages[index] = {
                                  ...stage,
                                  target:
                                    Number(e.target.value) || 0,
                                };
                                updateTestSetting(
                                  "load",
                                  "stages",
                                  newStages,
                                );
                              }}
                              disabled={
                                safeLoadSettings.preset !==
                                "custom"
                              }
                              className={`border-none bg-transparent text-foreground text-center font-semibold ${
                                safeLoadSettings.preset !==
                                "custom"
                                  ? "opacity-60"
                                  : ""
                              }`}
                              min="0"
                              max="50000"
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              ≈{" "}
                              {calculateTPS(
                                stage.target || 0,
                                safeLoadSettings.timeUnit,
                              )}{" "}
                              TPS
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">
                              지속 시간 <span className="text-xs text-muted-foreground">(Duration)</span>
                            </Label>
                            {safeLoadSettings.preset ===
                            "custom" ? (
                              <Select
                                value={stage.duration || "1m"}
                                onValueChange={(value) => {
                                  const newStages = [
                                    ...safeLoadSettings.stages,
                                  ];
                                  newStages[index] = {
                                    ...stage,
                                    duration: value,
                                  };
                                  updateTestSetting(
                                    "load",
                                    "stages",
                                    newStages,
                                  );
                                }}
                              >
                                <SelectTrigger className="border-none bg-transparent text-foreground">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="neu-card rounded-xl border-none bg-card">
                                  <SelectItem value="0">
                                    0s (즉시 스파이크)
                                  </SelectItem>
                                  <SelectItem value="10s">
                                    10s
                                  </SelectItem>
                                  <SelectItem value="20s">
                                    20s
                                  </SelectItem>
                                  <SelectItem value="30s">
                                    30s
                                  </SelectItem>
                                  <SelectItem value="1m">
                                    1m
                                  </SelectItem>
                                  <SelectItem value="2m">
                                    2m
                                  </SelectItem>
                                  <SelectItem value="5m">
                                    5m
                                  </SelectItem>
                                  <SelectItem value="10m">
                                    10m
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="neu-pressed rounded-lg px-3 py-2 opacity-60">
                                <span className="text-sm text-muted-foreground">
                                  {stage.duration === "0"
                                    ? "0s (즉시)"
                                    : stage.duration}
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              {stage.duration === "0"
                                ? "즉시 변경"
                                : `${parseTimeUnit(stage.duration || "1m")}초`}
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
                                {stage.duration === "0"
                                  ? "⚡ 즉시 스파이크"
                                  : stage.description ||
                                    "점진적 변화"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <div className="mt-4 neu-pressed rounded-xl px-4 py-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground text-sm">
                      <strong>k6 기준:</strong> target은
                      "iterations per timeUnit" 값이며,
                      duration이 "0"인 단계는 즉시 스파이크를
                      생성합니다. 실제 TPS는 시스템 응답 성능에
                      따라 달라집니다. Custom 모드에서만 수정
                      가능합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="neu-card rounded-3xl px-6 py-8 flex items-center justify-center">
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-16 w-16 mx-auto mb-6 opacity-50" />
              <p className="font-semibold text-lg mb-2">설정</p>
              <p className="text-base">
                이 테스트 유형은 설정이 별도로 없습니다.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="neu-card rounded-3xl px-6 py-6">
        <h1 className="text-4xl font-bold text-primary mb-4">
          테스트 실행
        </h1>
        <p className="text-muted-foreground text-lg">
          웹사이트에 대한 다양한 테스트를 실행하세요
        </p>
      </div>

      {/* 메인 설정 영역: 기본 설정 + 상세 설정 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 기본 테스트 설정 (좌측) */}
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-primary mb-4">
              기본 테스트 설정
            </h3>
            <p className="text-muted-foreground text-lg">
              테스트할 웹사이트와 테스트 유형을 선택하세요
            </p>

            {/* 선택된 테스트 유형의 MCP 도구 표시 */}
            {selectedTestType && (
              <div className="mt-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <Label className="text-foreground font-semibold text-lg">
                    활용 MCP 도구
                  </Label>
                </div>
                <div className="flex flex-wrap gap-2">
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
              </div>
            )}
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
                테스트 유형
              </Label>
              <div className="neu-input rounded-xl px-3 py-2">
                <Select
                  value={selectedTestType}
                  onValueChange={setSelectedTestType}
                  disabled={isExecuting}
                >
                  <SelectTrigger className="border-none bg-transparent text-foreground">
                    <SelectValue placeholder="테스트 유형을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="neu-card rounded-xl border-none bg-card">
                    {testTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="font-medium text-foreground">
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

        {/* 테스트 유형별 상세 설정 (우측) */}
        {renderTestTypeSettings()}
      </div>

      {/* 테스트 시작 버튼 */}
      {selectedTestType && (
        <div className="flex justify-center">
          <button
            onClick={handleStartTest}
            disabled={
              !testUrl ||
              !selectedTestType ||
              isExecuting ||
              !validateUrl(normalizeUrl(testUrl))
            }
            className={`
              px-12 py-6 rounded-2xl text-xl font-semibold
              transition-all duration-200 flex items-center space-x-4
              ${
                !testUrl ||
                !selectedTestType ||
                isExecuting ||
                !validateUrl(normalizeUrl(testUrl))
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
            ) : (
              <>
                <Play className="h-6 w-6" />
                <span>테스트 시작</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 실행중인 테스트 목록 - 단순화된 버전 */}
      {runningTests.filter((t) => t.status === "실행중")
        .length > 0 && (
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <Timer className="h-7 w-7 text-primary" />
            <h3 className="text-2xl font-semibold text-primary">
              테스트 진행 상황
            </h3>
          </div>
          <div className="space-y-6">
            {runningTests
              .filter((t) => t.status === "실행중")
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        진행률
                      </span>
                      <span className="font-medium text-primary">
                        {test.progress}%
                      </span>
                    </div>
                    <Progress
                      value={test.progress}
                      className="h-3"
                      style={
                        {
                          background: "var(--background)",
                          "--progress-foreground":
                            getProgressColor(test.progress),
                        } as any
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      {test.currentStep}
                    </p>
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
                  (t) => t.status === "실행중",
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
                runningTests.filter((t) => t.status === "완료")
                  .length
              }
            </div>
            <p className="text-muted-foreground font-semibold">
              완료
            </p>
          </div>
        </div>

        {runningTests.length === 0 ? (
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
            {runningTests
              .slice(-3)
              .reverse()
              .map((test) => (
                <div
                  key={test.id}
                  className="neu-flat rounded-xl px-4 py-4 flex items-center space-x-4 cursor-pointer hover:neu-button transition-all duration-200"
                  onClick={() => onNavigate?.('test-results')}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner"
                    style={{
                      backgroundColor:
                        test.status === "완료"
                          ? "#7886C7"
                          : "#A9B5DF",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-foreground truncate">
                        {test.url}
                      </span>
                      <div className="neu-pressed rounded-lg px-3 py-1">
                        <span className="text-xs font-medium text-primary">
                          {testTypes.find(
                            (t) => t.id === test.type,
                          )?.name || test.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="neu-pressed rounded-full px-4 py-2">
                    <span className="text-sm font-medium text-primary">
                      {test.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}