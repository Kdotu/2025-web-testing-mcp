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
          text: '연결됨',
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
    <div className="flex items-center space-x-2">
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