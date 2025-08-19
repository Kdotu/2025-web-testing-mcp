import { Button } from "../ui/button";
import { Square, Timer, AlertCircle } from "lucide-react";

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

interface TestProgressProps {
  runningTests: RunningTest[];
  testTypes: any[];
  elapsedTime: {[key: number]: string};
  onStopTest: (testId: number) => void;
  setStopConfirmDialog: (dialog: any) => void;
}

export function TestProgress({
  runningTests,
  testTypes,
  elapsedTime,
  onStopTest,
  setStopConfirmDialog
}: TestProgressProps) {
  const activeTestCount = runningTests.filter((t) => t.status === "running" || t.status === "실행중").length;
  const stoppedTestCount = runningTests.filter((t) => t.status === "중단됨").length;
  const totalTestCount = activeTestCount + stoppedTestCount;

  if (totalTestCount === 0) {
    return null;
  }

  return (
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

      {/* 테스트 진행 상황 목록 */}
      <div className="space-y-6">
        <h4 className="font-semibold text-foreground text-lg">
          진행 중인 테스트 목록
        </h4>
        
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
      </div>
    </div>
  );
} 