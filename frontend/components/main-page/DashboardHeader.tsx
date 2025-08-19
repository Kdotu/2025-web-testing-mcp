import { BarChart3, Sparkles, WifiOff, Database } from "lucide-react";
import { Button } from "../ui/button";

interface DashboardHeaderProps {
  isInDemoMode?: boolean;
  connectionStatus?: string;
  isOfflineMode?: boolean;
  onToggleDemoMode?: () => void;
}

export function DashboardHeader({ 
  isInDemoMode, 
  connectionStatus, 
  isOfflineMode, 
  onToggleDemoMode 
}: DashboardHeaderProps) {
  // 연결 상태에 따른 배너 표시
  const renderConnectionBanner = () => {
    if (connectionStatus === 'demo' || isInDemoMode) {
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
    
    if (connectionStatus === 'offline' || isOfflineMode) {
      return (
        <div className="neu-card rounded-3xl px-6 py-6 mb-8 border-l-4 border-l-blue-500">
          <div className="flex items-start space-x-4">
            <WifiOff className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-primary mb-2">오프라인 모드로 실행 중</h3>
              <p className="text-muted-foreground mb-4">
                Supabase Edge Functions에 연결할 수 없어 로컬 데이터를 표시하고 있습니다. 
                모든 기능은 정상적으로 사용할 수 있습니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onToggleDemoMode}
                  className="neu-button"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  데모 모드로 전환
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (connectionStatus === 'connected') {
      return (
        <div className="neu-card rounded-3xl px-6 py-4 mb-8 border-l-4 border-l-green-500">
          <div className="flex items-center space-x-4">
            <Database className="h-5 w-5 text-green-500" />
            <div>
              <h3 className="font-semibold text-primary">Supabase 연결됨</h3>
              <p className="text-sm text-muted-foreground">실시간 데이터 동기화가 활성화되어 있습니다.</p>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="neu-card rounded-3xl px-8 py-8 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(99,102,241,0.4)]">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center neu-accent">
          <BarChart3 className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-primary mb-4">대시보드</h1>
          <p className="text-muted-foreground text-lg">웹사이트 테스트 현황 및 통계를 확인하세요</p>
        </div>
      </div>
      
      {/* 연결 상태 배너 */}
      {renderConnectionBanner()}
    </div>
  );
} 