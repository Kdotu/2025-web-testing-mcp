import { Settings as SettingsIcon } from "lucide-react";
import { DemoModeNotice } from "../common";

interface SettingsHeaderProps {
  isInDemoMode?: boolean;
}

export function SettingsHeader({ isInDemoMode }: SettingsHeaderProps) {
  return (
    <div className="neu-card rounded-3xl px-8 py-8 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(99,102,241,0.4)]">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center neu-accent">
          <SettingsIcon className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-primary mb-4">설정</h1>
          <p className="text-muted-foreground text-lg">테스트 설정을 관리하고 테스트 타입을 구성하세요</p>
        </div>
      </div>
      
      {/* 데모 모드 알림 */}
      {isInDemoMode && <DemoModeNotice />}
    </div>
  );
} 