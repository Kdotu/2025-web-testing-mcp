import { FileText } from "lucide-react";
import { DemoModeNotice } from "../common";

interface TestResultHeaderProps {
  isInDemoMode?: boolean;
}

export function TestResultHeader({ isInDemoMode }: TestResultHeaderProps) {
  return (
    <div className="neu-card rounded-3xl px-8 py-6 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(99,102,241,0.4)]">
      <div className="flex items-center space-x-4 mb-4">
        <FileText className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-4xl font-bold text-primary">테스트 결과</h1>
          <p className="text-muted-foreground text-lg mt-2">
            {isInDemoMode 
              ? '데모 모드: 샘플 테스트 결과를 확인하세요' 
              : '실행된 테스트 결과를 확인하고 분석하세요'
            }
          </p>
        </div>
      </div>
      
      {/* 데모 모드 알림 */}
      {isInDemoMode && <DemoModeNotice />}
    </div>
  );
} 