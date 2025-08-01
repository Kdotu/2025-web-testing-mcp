import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, BarChart3, Copy, Check } from 'lucide-react';
import { getTestMetrics, getGroupedTestMetrics, TestMetric } from '../utils/backend-api';

interface TestResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: any;
  onDownload: (result: any, format: string) => void;
}

export function TestResultModal({ isOpen, onClose, result, onDownload }: TestResultModalProps) {
  const [metrics, setMetrics] = useState<TestMetric[]>([]);
  const [groupedMetrics, setGroupedMetrics] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const loadedTestIdRef = useRef<string | null>(null);

  // raw_data 복사 함수
  const copyRawData = async () => {
    if (!result.raw_data) return;
    
    try {
      await navigator.clipboard.writeText(result.raw_data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy raw data:', error);
      // fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = result.raw_data;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchMetrics = useCallback(async (testId: string) => {
    if (loadedTestIdRef.current === testId) return;
    
    loadedTestIdRef.current = testId;
    setLoading(true);
    
    try {
      console.log('Fetching metrics for testId:', testId);
      
      const [metricsData, groupedData] = await Promise.all([
        getTestMetrics(testId),
        getGroupedTestMetrics(testId)
      ]);
      
      console.log('Metrics data:', metricsData);
      console.log('Grouped data:', groupedData);
      
      setMetrics(metricsData);
      setGroupedMetrics(groupedData);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 메트릭 데이터 조회
  useEffect(() => {
    if (isOpen && result) {
      // testId 필드를 사용
      const testId = result.testId || result.test_id || result.id;
      console.log('TestResultModal: Modal opened with result:', result);
      console.log('TestResultModal: Using testId:', testId);
      
      if (testId) {
        fetchMetrics(testId);
      } else {
        console.error('TestResultModal: No testId found in result:', result);
      }
    }
  }, [isOpen, result, fetchMetrics]);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      loadedTestIdRef.current = null;
      setMetrics([]);
      setGroupedMetrics({});
      setLoading(false);
    }
  }, [isOpen]);

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

  const renderMetrics = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">메트릭 데이터를 불러오는 중...</p>
        </div>
      );
    }

    if (metrics.length === 0) {
      return (
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">상세 메트릭 데이터가 없습니다.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(groupedMetrics).map(([metricType, metricsList]: [string, any]) => {
          // metricsList가 배열인지 확인
          const metricsArray = Array.isArray(metricsList) ? metricsList : [];
          
          if (metricsArray.length === 0) {
            return null; // 빈 배열이면 렌더링하지 않음
          }

          return (
            <div key={metricType} className="neu-flat rounded-2xl px-6 py-8">
              <h4 className="font-semibold mb-6 text-primary text-xl capitalize">{metricType} 메트릭</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metricsArray.map((metric: TestMetric) => (
                  <div key={metric.id} className="neu-pressed rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">{metric.metric_name}</h5>
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        {metric.unit}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {metric.value.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metric.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-3xl px-6 py-8 max-w-[75vw] w-full mx-4 max-h-[90vh] overflow-y-auto shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center space-x-4 mb-4">
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
          <div className="space-y-8">
            {/* 기본 정보 */}
            <div className="neu-flat rounded-2xl px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-semibold text-primary text-xl">기본 정보</h4>
                {result.testId && (
                  <div className="neu-pressed rounded-lg px-3 py-2">
                    <span className="text-xs text-muted-foreground mr-2">Test ID:</span>
                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                      {result.testId}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center py-4 px-6 neu-pressed rounded-xl">
                <div className="flex items-center justify-between w-full">
                  <div className="text-center flex-1">
                    <span className="text-sm text-muted-foreground">실행 시간</span>
                    <div className="font-semibold text-primary text-sm">
                      {result.createdAt ? new Date(result.createdAt).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <span className="text-sm text-muted-foreground">소요 시간</span>
                    <div className="font-semibold text-primary text-sm">
                      {result.duration || calculateElapsedTime(result.createdAt, result.updatedAt) || 'N/A'}
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <span className="text-sm text-muted-foreground">테스트 유형</span>
                    <div className="font-semibold text-primary text-sm">
                      {result.type || result.testType || '부하테스트'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 테스트 설정 정보 */}
              {result.config && (
                <div className="mt-6 neu-pressed rounded-xl px-6 py-6">
                  <h5 className="font-semibold mb-4 text-primary text-lg">테스트 설정</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.testType === 'lighthouse' && result.config.categories && (
                      <div className="neu-flat rounded-lg px-4 py-3">
                        <span className="text-sm text-muted-foreground">검사 카테고리</span>
                        <div className="font-semibold text-primary text-sm mt-1">
                          {Array.isArray(result.config.categories) 
                            ? result.config.categories.join(', ')
                            : result.config.categories}
                        </div>
                      </div>
                    )}
                    
                    {result.testType === 'lighthouse' && result.config.device && (
                      <div className="neu-flat rounded-lg px-4 py-3">
                        <span className="text-sm text-muted-foreground">디바이스</span>
                        <div className="font-semibold text-primary text-sm mt-1">
                          {result.config.device === 'desktop' ? '데스크톱' : '모바일'}
                        </div>
                      </div>
                    )}
                    
                    {result.testType === 'load' && result.config.detailedConfig && (
                      <>
                        <div className="neu-flat rounded-lg px-4 py-3">
                          <span className="text-sm text-muted-foreground">실행 모드</span>
                          <div className="font-semibold text-primary text-sm mt-1">
                            {result.config.detailedConfig.settings.executor || 'N/A'}
                          </div>
                        </div>
                        
                        <div className="neu-flat rounded-lg px-4 py-3">
                          <span className="text-sm text-muted-foreground">최대 VU</span>
                          <div className="font-semibold text-primary text-sm mt-1">
                            {result.config.detailedConfig.settings.maxVUs || result.config.vus || 'N/A'}
                          </div>
                        </div>
                        
                        <div className="neu-flat rounded-lg px-4 py-3">
                          <span className="text-sm text-muted-foreground">지속 시간</span>
                          <div className="font-semibold text-primary text-sm mt-1">
                            {result.config.duration || 'N/A'}
                          </div>
                        </div>
                        
                        {result.config.detailedConfig.settings.preset && (
                          <div className="neu-flat rounded-lg px-4 py-3">
                            <span className="text-sm text-muted-foreground">프리셋</span>
                            <div className="font-semibold text-primary text-sm mt-1">
                              {result.config.detailedConfig.settings.preset === 'low' ? 'Low' :
                               result.config.detailedConfig.settings.preset === 'medium' ? 'Medium' :
                               result.config.detailedConfig.settings.preset === 'high' ? 'High' :
                               result.config.detailedConfig.settings.preset === 'custom' ? 'Custom' :
                               result.config.detailedConfig.settings.preset}
                            </div>
                          </div>
                        )}
                        
                        {result.config.detailedConfig.stages && Array.isArray(result.config.detailedConfig.stages) && (
                          <div className="neu-flat rounded-lg px-4 py-3">
                            <span className="text-sm text-muted-foreground">테스트 단계</span>
                            <div className="font-semibold text-primary text-sm mt-1">
                              {result.config.detailedConfig.stages.length}개 단계
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {result.testType === 'performance' && result.config.metrics && (
                      <div className="neu-flat rounded-lg px-4 py-3">
                        <span className="text-sm text-muted-foreground">측정 메트릭</span>
                        <div className="font-semibold text-primary text-sm mt-1">
                          {Array.isArray(result.config.metrics) 
                            ? result.config.metrics.join(', ')
                            : result.config.metrics}
                        </div>
                      </div>
                    )}
                    
                    {result.config.timeout && (
                      <div className="neu-flat rounded-lg px-4 py-3">
                        <span className="text-sm text-muted-foreground">타임아웃</span>
                        <div className="font-semibold text-primary text-sm mt-1">
                          {result.config.timeout}초
                        </div>
                      </div>
                    )}
                    
                    {result.config.retries && (
                      <div className="neu-flat rounded-lg px-4 py-3">
                        <span className="text-sm text-muted-foreground">재시도 횟수</span>
                        <div className="font-semibold text-primary text-sm mt-1">
                          {result.config.retries}회
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 다운로드 버튼 */}
              {/* <div className="mt-6 flex flex-wrap gap-4 justify-end">
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
              </div> */}
            </div>

            {/* 성능 메트릭 */}
            {metrics.length > 0 && (
              <div>
                <h4 className="font-semibold mb-6 text-primary text-xl">성능 메트릭</h4>
                {renderMetrics()}
              </div>
            )}
          </div>

          {/* 실행 로그 - 우측 */}
          {result.raw_data && (
            <div className="neu-flat rounded-2xl px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-semibold text-primary text-xl">실행 로그</h4>
                <button
                  onClick={copyRawData}
                  className="neu-button rounded-lg px-4 py-2 flex items-center space-x-2 transition-all duration-200 hover:text-primary"
                  title="Raw Data 복사"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="text-sm">복사</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 rounded-xl font-mono text-sm overflow-x-auto overflow-y-auto" 
                   style={{ backgroundColor: '#5d5d5f', color: '#a5b4fc', height: 'calc(70vh - 10px)' }}>
                <pre className="whitespace-pre-wrap">{result.raw_data}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 