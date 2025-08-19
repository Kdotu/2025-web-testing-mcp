import { Play, Sparkles } from "lucide-react";

interface TestExecutionHeaderProps {
  isInDemoMode?: boolean;
}

export function TestExecutionHeader({ isInDemoMode }: TestExecutionHeaderProps) {
  return (
    <div className="neu-card rounded-3xl px-8 py-8 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(99,102,241,0.4)]">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center neu-accent">
          <Play className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-primary mb-4">테스트 실행</h1>
          <p className="text-muted-foreground text-lg">웹사이트에 대한 다양한 테스트를 실행하세요</p>
        </div>
      </div>
      
      {/* 데모 모드 알림 */}
      {isInDemoMode && (
        <div className="neu-input rounded-3xl px-6 py-6 border-l-4 border-l-purple-500">
          <div className="flex items-start space-x-4">
            <Sparkles className="h-6 w-6 text-purple-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-primary mb-2">🎭 데모 모드로 실행 중</h3>
              <p className="text-muted-foreground mb-4">
                모든 기능을 완전히 사용할 수 있는 시뮬레이션 환경입니다. 
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 