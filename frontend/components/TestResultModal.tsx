import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, BarChart3, Copy, Check, FileText, ChevronDown } from 'lucide-react';
import { getTestMetrics, getGroupedTestMetrics, TestMetric, getDocuments } from '../utils/backend-api';

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
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showDocumentsDropdown, setShowDocumentsDropdown] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
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

  // 문서 다운로드 함수
  const handleDocumentDownload = async (doc: any) => {
    try {
      console.log('문서 다운로드 시작 - document:', doc);
      
      // 다운로드 진행 상태 표시
      const downloadButton = document.querySelector(`[data-document-id="${doc.id}"]`);
      if (downloadButton) {
        downloadButton.setAttribute('disabled', 'true');
        downloadButton.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>다운로드 중...';
      }
      
      const downloadUrl = `/api/documents/${doc.id}/download`;
      console.log('다운로드 URL:', downloadUrl);
      
      // fetch를 사용하여 파일 다운로드 상태 확인
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      // 파일 내용을 blob으로 변환
      const blob = await response.blob();
      
      // 다운로드 링크 생성 및 클릭
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = doc.filename;
      link.target = '_blank';
      
      // 링크를 DOM에 추가하고 클릭
      document.body.appendChild(link);
      link.click();
      
      // 정리
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      // 다운로드 성공 메시지
      setTimeout(() => {
        alert(`${doc.type === 'html' ? 'HTML' : 'PDF'} 리포트가 다운로드되었습니다.`);
      }, 1000);
      
    } catch (error: any) {
      console.error('문서 다운로드 오류:', error);
      
      // 사용자에게 구체적인 에러 메시지 표시
      let errorMessage = '문서 다운로드에 실패했습니다.';
      
      if (error.message.includes('404')) {
        errorMessage = '문서를 찾을 수 없습니다. 문서가 삭제되었거나 이동되었을 수 있습니다.';
      } else if (error.message.includes('403')) {
        errorMessage = '문서에 접근할 권한이 없습니다.';
      } else if (error.message.includes('500')) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.';
      }
      
      alert(errorMessage);
      
    } finally {
      // 다운로드 버튼 상태 복원
      const downloadButton = document.querySelector(`[data-document-id="${doc.id}"]`);
      if (downloadButton) {
        downloadButton.removeAttribute('disabled');
        downloadButton.innerHTML = `<FileText className="h-4 w-4 mr-3" />${doc.type === 'html' ? 'HTML' : 'PDF'} Report`;
      }
    }
  };

  // Report 생성 후 문서 목록 새로고침
  const handleReportGeneration = async (format: string) => {
    try {
      setReportGenerating(true);
      const testId = result.testId || result.test_id || result.id;
      console.log('Report 생성 시작 - format:', format, 'testId:', testId);
      
      // Report 생성
      const response = await onDownload(result, format);
      console.log('Report 생성 응답:', response);
      
      // 잠시 대기 후 문서 목록 새로고침
      setTimeout(async () => {
        console.log('문서 목록 새로고침 시작');
        await fetchDocuments(testId);
        
        // 새로 생성된 문서를 찾아서 자동 다운로드
        const updatedDocuments = await getDocuments(testId);
        if (updatedDocuments.success && updatedDocuments.data) {
          // 가장 최근에 생성된 문서 찾기
          const latestDocument = updatedDocuments.data
            .filter((doc: any) => doc.type === format)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          
          if (latestDocument) {
            console.log('새로 생성된 문서 자동 다운로드:', latestDocument);
            // 자동 다운로드 실행
            setTimeout(() => {
              handleDocumentDownload(latestDocument);
            }, 1000);
          }
        }
      }, 2000);
      
    } catch (error) {
      console.error('Report 생성 오류:', error);
    } finally {
      setReportGenerating(false);
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

  // 생성된 문서 목록 가져오기
  const fetchDocuments = useCallback(async (testId: string) => {
    try {
      setDocumentsLoading(true);
      console.log('문서 목록 가져오기 시작 - testId:', testId);
      const response = await getDocuments(testId);
      console.log('문서 목록 응답:', response);
      if (response.success && response.data) {
        console.log('사용 가능한 문서들:', response.data);
        
        // 중복 제거 (같은 ID를 가진 문서 중 가장 최신 것만 유지)
        const uniqueDocuments = response.data.reduce((acc: any[], current: any) => {
          const existingIndex = acc.findIndex(doc => doc.id === current.id);
          if (existingIndex === -1) {
            acc.push(current);
          } else {
            // 기존 문서보다 현재 문서가 더 최신이면 교체
            const existing = acc[existingIndex];
            if (new Date(current.createdAt) > new Date(existing.createdAt)) {
              acc[existingIndex] = current;
            }
          }
          return acc;
        }, []);
        
        console.log('중복 제거 후 문서들:', uniqueDocuments);
        setAvailableDocuments(uniqueDocuments);
      } else {
        console.log('문서가 없거나 응답 실패');
        setAvailableDocuments([]);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setAvailableDocuments([]);
    } finally {
      setDocumentsLoading(false);
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
        fetchDocuments(testId);
      } else {
        console.error('TestResultModal: No testId found in result:', result);
      }
    }
  }, [isOpen, result, fetchMetrics, fetchDocuments]);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      loadedTestIdRef.current = null;
      setMetrics([]);
      setGroupedMetrics({});
      setLoading(false);
      setShowReportDropdown(false);
      setShowDownloadDropdown(false);
      setShowDocumentsDropdown(false);
      setAvailableDocuments([]);
      setDocumentsLoading(false);
      setReportGenerating(false);
    }
  }, [isOpen]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showReportDropdown && !target.closest('.report-dropdown')) {
        setShowReportDropdown(false);
      }
      if (showDownloadDropdown && !target.closest('.download-dropdown')) {
        setShowDownloadDropdown(false);
      }
      if (showDocumentsDropdown && !target.closest('.documents-dropdown')) {
        setShowDocumentsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReportDropdown, showDownloadDropdown, showDocumentsDropdown]);

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
                            {result.config?.detailedConfig?.settings?.executor || 'N/A'}
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
                        
                        {result.config?.detailedConfig?.settings?.preset && (
                          <div className="neu-flat rounded-lg px-4 py-3">
                            <span className="text-sm text-muted-foreground">프리셋</span>
                            <div className="font-semibold text-primary text-sm mt-1">
                              {result.config?.detailedConfig?.settings?.preset === 'low' ? 'Low' :
                               result.config?.detailedConfig?.settings?.preset === 'medium' ? 'Medium' :
                               result.config?.detailedConfig?.settings?.preset === 'high' ? 'High' :
                               result.config?.detailedConfig?.settings?.preset === 'custom' ? 'Custom' :
                               result.config?.detailedConfig?.settings?.preset}
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
              <div className="mt-6 flex flex-wrap gap-4 justify-end">
                <div className="relative download-dropdown">
                  <button 
                    className="neu-accent rounded-xl px-6 py-4 font-semibold text-primary-foreground transition-all duration-200 hover:neu-accent flex items-center"
                    onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                  >
                    <Download className="h-5 w-5 mr-3" />
                    다운로드
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showDownloadDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showDownloadDropdown && (
                    <div className="absolute top-full right-0 mt-2 neu-flat rounded-xl shadow-lg z-10 min-w-[200px]">
                      <button 
                        className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors rounded-t-xl flex items-center"
                        onClick={() => {
                          onDownload(result, 'text');
                          setShowDownloadDropdown(false);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        텍스트 다운로드
                      </button>
                      <button 
                        className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center"
                        onClick={() => {
                          onDownload(result, 'json');
                          setShowDownloadDropdown(false);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        JSON 다운로드
                      </button>
                      <button 
                        className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors rounded-b-xl flex items-center"
                        onClick={() => {
                          onDownload(result, 'csv');
                          setShowDownloadDropdown(false);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        CSV 다운로드
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Report 생성 버튼 */}
                <div className="relative report-dropdown">
                  <button 
                    className="neu-button rounded-xl px-6 py-4 font-medium text-foreground hover:text-primary transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowReportDropdown(!showReportDropdown)}
                    disabled={reportGenerating}
                  >
                    {reportGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-3"></div>
                        생성 중...
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5 mr-3" />
                        Report 생성
                        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showReportDropdown ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                  
                  {showReportDropdown && !reportGenerating && (
                    <div className="absolute top-full right-0 mt-2 neu-flat rounded-xl shadow-lg z-10 min-w-[200px]">
                      <button 
                        className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors rounded-t-xl flex items-center"
                        onClick={() => {
                          handleReportGeneration('html');
                          setShowReportDropdown(false);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        HTML Report
                      </button>
                      <button 
                        className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors rounded-b-xl flex items-center"
                        onClick={() => {
                          handleReportGeneration('pdf');
                          setShowReportDropdown(false);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        PDF Report
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 생성된 문서 다운로드 버튼 */}
                {documentsLoading ? (
                  <div className="neu-button rounded-xl px-6 py-4 font-medium text-foreground flex items-center opacity-50">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-3"></div>
                    문서 목록 로딩 중...
                  </div>
                ) : availableDocuments.length > 0 ? (
                  <div className="relative documents-dropdown">
                    <button 
                      className="neu-accent rounded-xl px-6 py-4 font-semibold text-primary-foreground transition-all duration-200 hover:neu-accent flex items-center"
                      onClick={() => setShowDocumentsDropdown(!showDocumentsDropdown)}
                    >
                      <Download className="h-5 w-5 mr-3" />
                      생성된 문서 다운로드 ({availableDocuments.length})
                      <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showDocumentsDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showDocumentsDropdown && (
                      <div className="absolute top-full right-0 mt-2 neu-flat rounded-xl shadow-lg z-10 min-w-[250px]">
                        {availableDocuments.map((doc, index) => (
                          <button 
                            key={`${doc.id}-${doc.type}-${doc.createdAt}`}
                            data-document-id={doc.id}
                            className={`w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center ${
                              index === 0 ? 'rounded-t-xl' : ''
                            } ${
                              index === availableDocuments.length - 1 ? 'rounded-b-xl' : ''
                            }`}
                            onClick={() => {
                              handleDocumentDownload(doc);
                              setShowDocumentsDropdown(false);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-3" />
                            {doc.type === 'html' ? 'HTML' : 'PDF'} Report
                            <span className="ml-auto text-xs text-muted-foreground">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* 성능 메트릭 */}
            <div className="neu-flat rounded-2xl px-6 py-8">
                <h4 className="font-semibold mb-6 text-primary text-xl">성능 메트릭</h4>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">메트릭 데이터를 불러오는 중...</p>
                </div>
              ) : metrics.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">상세 메트릭 데이터가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedMetrics).map(([metricType, metricsList]: [string, any]) => {
                    // metricsList가 배열인지 확인
                    const metricsArray = Array.isArray(metricsList) ? metricsList : [];
                    
                    if (metricsArray.length === 0) {
                      return null; // 빈 배열이면 렌더링하지 않음
                    }

                    return (
                      <div key={metricType} className="neu-pressed rounded-xl px-6 py-6">
                        <h5 className="font-semibold mb-4 text-primary text-lg capitalize">{metricType} 메트릭</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {metricsArray.map((metric: TestMetric) => (
                            <div key={metric.id} className="neu-flat rounded-lg px-4 py-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">{metric.metric_name}</span>
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                  {metric.unit}
                                </span>
                              </div>
                              <div className="font-semibold text-primary text-sm">
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
            )}
            </div>
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
                   style={{ backgroundColor: '#5d5d5f', color: '#a5b4fc', height: 'calc(65vh - 10px)' }}>
                <pre className="whitespace-pre-wrap">{result.raw_data}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 