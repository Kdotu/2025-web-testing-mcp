import { Play, Timer } from "lucide-react";

interface TestStartButtonProps {
  testUrl: string;
  selectedTestType: string;
  isExecuting: boolean;
  runningTests: any[];
  validateLighthouseTest: () => boolean;
  onStartTest: () => void;
}

export function TestStartButton({
  testUrl,
  selectedTestType,
  isExecuting,
  runningTests,
  validateLighthouseTest,
  onStartTest
}: TestStartButtonProps) {
  if (!selectedTestType) {
    return null;
  }

  const isDisabled = !testUrl || 
    !selectedTestType || 
    isExecuting || 
    !validateLighthouseTest() ||
    runningTests.some(test => test.status === "running" || test.status === "실행중");

  const hasRunningTests = runningTests.some(test => test.status === "running" || test.status === "실행중");

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <button
          onClick={onStartTest}
          disabled={isDisabled}
          className={`
            px-12 py-6 rounded-2xl text-xl font-semibold
            transition-all duration-200 flex items-center space-x-4 w-full justify-center
            ${
              isDisabled
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
          ) : hasRunningTests ? (
            <>
              <Timer className="h-6 w-6 animate-pulse" />
              <span>다른 테스트가 진행 중입니다</span>
            </>
          ) : (
            <>
              <Play className="h-6 w-6" />
              <span>테스트 시작</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
} 