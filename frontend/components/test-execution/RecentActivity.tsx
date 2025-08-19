import { Button } from "../ui/button";
import { Timer, Globe } from "lucide-react";

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

interface RecentActivityProps {
  runningTests: RunningTest[];
  recentTestResults: any[];
  onNavigate?: (tabId: string) => void;
}

export function RecentActivity({
  runningTests,
  recentTestResults,
  onNavigate
}: RecentActivityProps) {
  // 경과 시간 계산 함수
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

  if (runningTests.length === 0 && recentTestResults.length === 0) {
    return (
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

        <div className="text-center py-12 text-muted-foreground">
          <Globe className="h-16 w-16 mx-auto mb-6 opacity-50" />
          <p className="font-semibold text-lg mb-2">
            실행중인 테스트가 없습니다
          </p>
          <p className="text-base">
            새 테스트를 시작해보세요
          </p>
        </div>
      </div>
    );
  }

  return (
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

      {/* 최근 활동 목록 */}
      <div className="space-y-4 mt-8">
        <h4 className="font-semibold text-foreground text-lg">
          최근 활동
        </h4>
        {(recentTestResults.length > 0 ? recentTestResults.slice(0, 5) : runningTests.slice(-3).reverse()).map((test, index) => {
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
    </div>
  );
} 