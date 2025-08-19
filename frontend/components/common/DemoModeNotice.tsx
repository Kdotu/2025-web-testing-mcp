import { Sparkles } from "lucide-react";


interface DemoModeNoticeProps {
  className?: string;
}

export function DemoModeNotice({ className = "" }: DemoModeNoticeProps) {
  return (
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
  );
} 