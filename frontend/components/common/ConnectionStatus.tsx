import { CheckCircle, AlertCircle, Database, Sparkles, WifiOff, Info } from "lucide-react";

interface ConnectionStatusProps {
  status: string;
  error: string | null;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onShowDebug: () => void;
}

export function ConnectionStatus({ 
  status, 
  error, 
  isDemoMode, 
  onToggleDemoMode, 
  onShowDebug 
}: ConnectionStatusProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'checking':
        return {
          icon: Database,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          text: '연결 확인 중',
          animate: 'animate-pulse'
        };
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          text: '온라인',
          animate: ''
        };
      case 'demo':
        return {
          icon: Sparkles,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          text: '데모',
          animate: ''
        };
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          text: '오프라인',
          animate: ''
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          text: '연결 실패',
          animate: ''
        };
    }
  };

  const display = getStatusDisplay();
  const StatusIcon = display.icon;

  return (
    <div className="flex items-center space-x-4">
      {/* 데모/연결 모드 선택 Toggle Switch */}
      <div className="rounded-lg px-3 py-2 border border-white/10">
        <div className="flex items-center space-x-3">
          <span className={`text-xs font-medium transition-colors duration-200 ${
            status === 'demo' ? display.color : 'text-muted-foreground'
          }`}>
            데모
          </span>
          
          {/* Toggle Switch */}
          <button
            onClick={onToggleDemoMode}
                         className={`
               relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 ease-in-out
               focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
               ${isDemoMode
                 ? 'bg-purple-600'
                 : (status === 'connected'
                   ? 'bg-green-600'
                   : (status === 'offline' ? 'bg-blue-600' : 'bg-gray-400'))
               }
             `}
            role="switch"
            aria-checked={isDemoMode}
            aria-label="데모 모드 토글"
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 ease-in-out
                ${isDemoMode ? 'translate-x-1' : 'translate-x-5'}
                shadow-md
              `}
            />
          </button>
          
          <span className={`text-xs font-medium transition-colors duration-200 ${
            status === 'connected' ? 'text-green-600' : status === 'offline' ? 'text-blue-600' : 'text-muted-foreground'
          }`}>
            {status === 'connected' ? '온라인' : status === 'offline' ? '오프라인' : '연결'}
          </span>
        </div>
      </div>

      {/* 연결 상태 표시 */}
      <div 
        className={`
          flex items-center space-x-2 neu-pressed rounded-full px-4 py-2 
          cursor-pointer transition-all duration-200 hover:shadow-md
          ${display.bgColor}
        `}
        onClick={onShowDebug}
        title={error || display.text}
      >
        <StatusIcon className={`w-4 h-4 ${display.color} ${display.animate}`} />
        <span className={`text-sm font-medium ${display.color} hidden sm:block`}>
          {display.text}
        </span>
        <Info className="w-3 h-3 text-muted-foreground" />
      </div>
    </div>
  );
} 