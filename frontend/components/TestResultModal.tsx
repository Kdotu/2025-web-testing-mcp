import { X, Globe, Download } from "lucide-react";

interface TestResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: any;
  onDownload: (result: any, format: string) => void;
}

export function TestResultModal({ isOpen, onClose, result, onDownload }: TestResultModalProps) {
  if (!isOpen || !result) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#7886C7";
    if (score >= 70) return "#A9B5DF";
    return "#9BA8E8";
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "성능테스트": return { bg: "#7886C7", text: "white" };
      case "Lighthouse": return { bg: "#A9B5DF", text: "#2D336B" };
      case "부하테스트": return { bg: "#9BA8E8", text: "white" };
      case "보안테스트": return { bg: "#6773C0", text: "white" };
      case "접근성테스트": return { bg: "#4F5BA3", text: "white" };
      default: return { bg: "#A9B5DF", text: "#2D336B" };
    }
  };

  const calculateElapsedTime = (startTime: string, endTime?: string): string => {
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const elapsedTime = end - start;
    const elapsedSeconds = Math.floor(elapsedTime / 1000);
    
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-card rounded-3xl px-6 py-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center space-x-4 mb-4">
              <Globe className="h-8 w-8 text-primary" />
              <h3 className="text-3xl font-semibold text-primary">테스트 결과 상세</h3>
            </div>
            <p className="text-muted-foreground text-lg">
              {result.url} - {result.testType || result.type || '부하테스트'}
            </p>
          </div>
          <button 
            className="neu-button rounded-xl p-3 font-medium text-foreground hover:text-primary transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      
        <div className="grid gap-8 md:grid-cols-2">
          <div className="neu-flat rounded-2xl px-6 py-8">
            <h4 className="font-semibold mb-6 text-primary text-xl">기본 정보</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-4 px-6 neu-pressed rounded-xl">
                <span className="font-medium text-foreground">테스트 점수</span>
                <span 
                  className="font-bold text-2xl"
                  style={{ color: getScoreColor(result.score || 0) }}
                >
                  {result.score || 0}점
                </span>
              </div>
              <div className="flex justify-between py-4 px-6">
                <span className="font-medium text-foreground">실행 시간</span>
                <span className="font-semibold text-primary">
                  {result.createdAt ? new Date(result.createdAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-4 px-6 neu-pressed rounded-xl">
                <span className="font-medium text-foreground">소요 시간</span>
                <span className="font-semibold text-primary">
                  {result.duration || calculateElapsedTime(result.createdAt, result.updatedAt) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-4 px-6">
                <span className="font-medium text-foreground">테스트 유형</span>
                <div className="neu-subtle rounded-full px-4 py-2" style={{ 
                  backgroundColor: getBadgeColor(result.type || result.testType || '부하테스트').bg,
                  color: getBadgeColor(result.type || result.testType || '부하테스트').text
                }}>
                  <span className="font-semibold">{result.type || result.testType || '부하테스트'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="neu-flat rounded-2xl px-6 py-8">
            <h4 className="font-semibold mb-6 text-primary text-xl">상세 지표</h4>
            <div className="space-y-4">
              {result.details && Object.entries(result.details).map(([key, value], index) => (
                <div key={key} className={`flex justify-between py-4 px-6 ${index % 2 === 0 ? 'neu-pressed' : ''} rounded-xl`}>
                  <span className="capitalize font-medium text-foreground">{key}</span>
                  <span className="font-semibold text-primary">{value as string}</span>
                </div>
              ))}
              {(!result.details || Object.keys(result.details).length === 0) && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">상세 지표 정보가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex flex-wrap gap-4">
          <button 
            className="neu-accent rounded-xl px-6 py-4 font-semibold text-primary-foreground transition-all duration-200 hover:neu-accent"
            onClick={() => onDownload(result, 'pdf')}
          >
            <Download className="h-5 w-5 mr-3" />
            텍스트 다운로드
          </button>
          <button 
            className="neu-button rounded-xl px-6 py-4 font-medium text-foreground hover:text-primary transition-colors"
            onClick={() => onDownload(result, 'json')}
          >
            <Download className="h-5 w-5 mr-3" />
            JSON 다운로드
          </button>
          <button 
            className="neu-button rounded-xl px-6 py-4 font-medium text-foreground hover:text-primary transition-colors"
            onClick={() => onDownload(result, 'csv')}
          >
            <Download className="h-5 w-5 mr-3" />
            CSV 다운로드
          </button>
        </div>
      </div>
    </div>
  );
} 