import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell } from 'lucide-react';
import { TestLayoutCustomizer } from '@/components/test-settings/TestLayoutCustomizer';

export function LayoutSettingsTab({ isInDemoMode }: { isInDemoMode?: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-primary mb-2">레이아웃 설정</h3>
        <p className="text-muted-foreground text-lg">레이아웃을 구성하세요</p>
      </div>
      <Alert className="neu-pressed rounded-xl border-none">
        <Bell className="h-5 w-5" />
        <AlertDescription className="text-muted-foreground">
          설정 변경사항은 즉시 적용됩니다. 하지만 실행중인 테스트에 즉시 반영되지 않을 수 있습니다.
        </AlertDescription>
      </Alert>
      <TestLayoutCustomizer isInDemoMode={isInDemoMode} />
    </div>
  );
}


