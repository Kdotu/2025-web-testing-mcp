import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Download, Search, Filter, Eye, Calendar, Globe, ExternalLink, FileText, BarChart3 } from "lucide-react";
import { getAllTestResults, getTestResultById, getTestTypes } from "../utils/backend-api";
import { TestResultModal } from "./TestResultModal";

interface TestResultsProps {
  onNavigate?: (tabId: string) => void;
}

export function TestResults({ onNavigate }: TestResultsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 테이블 드래그 스크롤 기능
  useEffect(() => {
    const tableContainer = document.querySelector('.overflow-x-auto') as HTMLElement;
    if (!tableContainer) return;

    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleMouseDown = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      // 버튼 클릭이 아닌 경우에만 드래그 시작
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      
      isDragging = true;
      startX = mouseEvent.pageX - tableContainer.offsetLeft;
      scrollLeft = tableContainer.scrollLeft;
      tableContainer.style.cursor = 'grabbing';
      tableContainer.style.userSelect = 'none';
    };

    const handleMouseMove = (e: Event) => {
      if (!isDragging) return;
      const mouseEvent = e as MouseEvent;
      mouseEvent.preventDefault();
      const x = mouseEvent.pageX - tableContainer.offsetLeft;
      const walk = (x - startX) * 1.5;
      tableContainer.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => {
      isDragging = false;
      tableContainer.style.cursor = 'grab';
      tableContainer.style.userSelect = 'auto';
    };

    tableContainer.style.cursor = 'grab';
    tableContainer.addEventListener('mousedown', handleMouseDown);
    tableContainer.addEventListener('mousemove', handleMouseMove);
    tableContainer.addEventListener('mouseup', handleMouseUp);
    tableContainer.addEventListener('mouseleave', handleMouseUp);

    return () => {
      tableContainer.removeEventListener('mousedown', handleMouseDown);
      tableContainer.removeEventListener('mousemove', handleMouseMove);
      tableContainer.removeEventListener('mouseup', handleMouseUp);
      tableContainer.removeEventListener('mouseleave', handleMouseUp);
    };
  }, []);



  // 백엔드 API에서 테스트 결과 데이터와 테스트 타입 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 테스트 결과와 테스트 타입을 병렬로 가져오기
        const [resultsResult, typesResult] = await Promise.all([
          getAllTestResults(1, 50),
          getTestTypes()
        ]);
        
        if (resultsResult.success && resultsResult.data) {
          const resultsArray = Array.isArray(resultsResult.data) ? resultsResult.data : [];
          setTestResults(resultsArray);
        } else {
          const errorMessage = resultsResult.error || '테스트 결과를 불러오는데 실패했습니다.';
          setError(errorMessage);
          console.error('Failed to fetch test results:', resultsResult.error);
          setTestResults([]);
        }
        
        if (typesResult.success && typesResult.data) {
          setTestTypes(typesResult.data);
        } else {
          console.error('Failed to fetch test types:', typesResult.error);
          setTestTypes([]);
        }
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 실시간 경과 시간 업데이트 (실행 중인 테스트용)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const filteredResults = Array.isArray(testResults) ? testResults.filter(result => {
    const matchesSearch = result.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || 
                         result.type === filterType || 
                         result.testType === filterType ||
                         result.testTypeId === filterType;
    return matchesSearch && matchesFilter;
  }) : [];



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

  const openModal = (result: any) => {
    setSelectedResult(result);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedResult(null);
  };

  const handleDownload = (result: any, format: string) => {
    let content: string;
    let filename: string;
    let mimeType: string;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(result, null, 2);
        filename = `test-result-${result.id}.json`;
        mimeType = 'application/json';
        break;
      case 'csv':
        const headers = ['URL', 'Type', 'Score', 'Status', 'Date', 'Duration'];
        const values = [result.url, result.type, result.score, result.status, result.date, result.duration];
        content = `${headers.join(',')}\n${values.join(',')}`;
        filename = `test-result-${result.id}.csv`;
        mimeType = 'text/csv';
        break;
      case 'pdf':
        content = `Test Result Report\n\nURL: ${result.url}\nType: ${result.type}\nScore: ${result.score}\nStatus: ${result.status}\nDate: ${result.date}\nDuration: ${result.duration}\n\nDetails:\n${JSON.stringify(result.details, null, 2)}`;
        filename = `test-result-${result.id}.txt`;
        mimeType = 'text/plain';
        break;
      default:
        return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  return (
    <div className="w-full flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-8 mx-auto">
      {/* 페이지 헤더 */}
      <div className="neu-card rounded-3xl px-8 py-6 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(99,102,241,0.4)]">
        <div className="flex items-center space-x-4 mb-4">
          <FileText className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold text-primary">테스트 결과</h1>
            <p className="text-muted-foreground text-lg mt-2">실행된 테스트 결과를 확인하고 분석하세요</p>
          </div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="neu-card rounded-3xl px-8 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">테스트 결과를 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="neu-card rounded-3xl px-8 py-12 text-center">
          <div className="text-red-500 mb-4">
            <FileText className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-lg text-red-500 mb-4">{error}</p>
          <button 
            className="neu-button rounded-xl px-6 py-3 font-medium text-foreground hover:text-primary transition-colors"
            onClick={() => window.location.reload()}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 데이터가 있을 때만 표시 */}
      {!loading && !error && (
        <>
      {/* 상단 통계 */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="neu-accent rounded-3xl px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-primary-foreground font-semibold text-lg">총 테스트</div>
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div className="text-4xl font-bold text-primary-foreground mb-2">{testResults.length}</div>
          <p className="text-white">실행된 테스트</p>
        </div>
        
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-foreground font-semibold text-lg">최다 실행 테스트</div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div className="text-4xl font-bold text-primary mb-2">
                {(() => {
                  if (testResults.length === 0) return 0;
                  
                  // 테스트 유형별 실행 횟수 계산
                  const testTypeCounts: { [key: string]: number } = {};
                  testResults.forEach(result => {
                    const testType = result.testType || result.type || 'unknown';
                    testTypeCounts[testType] = (testTypeCounts[testType] || 0) + 1;
                  });
                  
                  // 가장 많이 실행된 테스트 유형 찾기
                  const mostFrequentType = Object.entries(testTypeCounts)
                    .sort(([,a], [,b]) => b - a)[0];
                  
                  return mostFrequentType ? mostFrequentType[1] : 0;
                })()}
          </div>
          <p className="text-muted-foreground">
                {(() => {
                  if (testResults.length === 0) return '테스트 없음';
                  
                  // 테스트 유형별 실행 횟수 계산
                  const testTypeCounts: { [key: string]: number } = {};
                  testResults.forEach(result => {
                    const testType = result.testType || result.type || 'unknown';
                    testTypeCounts[testType] = (testTypeCounts[testType] || 0) + 1;
                  });
                  
                  // 가장 많이 실행된 테스트 유형 찾기
                  const mostFrequentType = Object.entries(testTypeCounts)
                    .sort(([,a], [,b]) => b - a)[0];
                  
                  if (!mostFrequentType) return '테스트 없음';
                  
                  // 테스트 유형 이름 매핑
                  const typeNames: { [key: string]: string } = {
                    'load': '부하테스트',
                    'lighthouse': 'Lighthouse',
                    'performance': '성능테스트',
                    'security': '보안테스트',
                    'accessibility': '접근성테스트',
                    'unknown': '알 수 없음'
                  };
                  
                  return typeNames[mostFrequentType[0]] || mostFrequentType[0];
                })()}
          </p>
        </div>
        
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-foreground font-semibold text-lg">성공률</div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
              <div className="text-4xl font-bold text-primary mb-2">
                {(() => {
                  if (testResults.length === 0) return 0;
                  
                  // 완료된 테스트 수 계산 (다양한 상태값 고려)
                  const completedTests = testResults.filter(r => 
                    r.status === '완료' || 
                    r.status === 'completed' || 
                    r.status === 'success' ||
                    r.status === 'complete'
                  ).length;
                  
                  return Math.round((completedTests / testResults.length) * 100);
                })()}%
              </div>
          <p className="text-muted-foreground">완료된 테스트</p>
        </div>
        
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-foreground font-semibold text-lg">오늘 실행</div>
            <Calendar className="h-8 w-8 text-primary" />
          </div>
              <div className="text-4xl font-bold text-primary mb-2">
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  
                  return testResults.filter(r => {
                    // 다양한 날짜 필드 확인
                    const testDate = r.date || 
                                   r.createdAt?.split('T')[0] || 
                                   r.created_at?.split('T')[0] ||
                                   r.startTime?.split('T')[0];
                    
                    return testDate === today;
                  }).length;
                })()}
              </div>
          <p className="text-muted-foreground">오늘 실행된 테스트</p>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="neu-card rounded-3xl px-6 py-8">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-primary mb-2">검색 및 필터</h3>
          <p className="text-muted-foreground text-lg">원하는 테스트 결과를 빠르게 찾아보세요</p>
        </div>
        <div className="flex gap-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <div className="neu-input rounded-xl px-4 py-3">
              <Input
                placeholder="URL로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-none bg-transparent text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="neu-input rounded-xl px-3 py-2" style={{ minWidth: '200px' }}>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="border-none bg-transparent text-foreground">
                <SelectValue placeholder="테스트 유형 필터" />
              </SelectTrigger>
              <SelectContent className="neu-card rounded-xl border-none bg-card">
                <SelectItem value="all">모든 유형</SelectItem>
                {testTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} {type.mcp_tool && `(${type.mcp_tool})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button className="neu-button rounded-xl px-6 py-3 font-medium text-foreground hover:text-primary transition-colors">
            <Filter className="h-5 w-5 mr-3" />
            필터
          </button>
        </div>
      </div>

      {/* 테스트 결과 테이블 */}
      <div className="neu-card rounded-3xl px-6 py-8">
        <div className="mb-8">
          <h3 className="text-2xl font-semibold text-primary mb-2">테스트 결과 ({filteredResults.length}개)</h3>
          <p className="text-muted-foreground text-lg">클릭하여 상세 정보를 확인하거나 결과를 다운로드하세요</p>
        </div>
            
            {filteredResults.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">검색 결과가 없습니다</p>
                <p className="text-muted-foreground">다른 검색어나 필터를 시도해보세요</p>
              </div>
            ) : (
        <div className="neu-pressed rounded-2xl p-2">
                  <div className="overflow-x-auto select-none" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <Table>
              <TableHeader className="sticky top-0 z-50 bg-card shadow-sm border-b">
                <TableRow className="neu-subtle rounded-xl">
                  <TableHead className="w-[80px] px-6 py-6 text-primary font-semibold text-lg text-center">작업</TableHead>
                  <TableHead className="w-[120px] px-6 py-6 text-primary font-semibold text-lg text-center">웹사이트</TableHead>
                  <TableHead className="w-[120px] px-6 py-6 text-primary font-semibold text-lg text-center">실행 테스트</TableHead>
                  <TableHead className="w-[120px] px-6 py-6 text-primary font-semibold text-lg text-center">실행 일시</TableHead>
                  <TableHead className="w-[80px] px-6 py-6 text-primary font-semibold text-lg text-center">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => {
                  const badgeColor = getBadgeColor(result.type);
                  return (
                    <TableRow 
                      key={result.id} 
                      className="hover:neu-flat cursor-pointer transition-all duration-300 rounded-xl"
                              onClick={() => openModal(result)}
                    >
                      <TableCell className="px-6 py-6">
                        <div className="flex justify-center space-x-3">
                          {/* <button 
                            className="neu-button rounded-xl p-3 font-medium text-foreground hover:text-primary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                                      openModal(result);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </button> */}
                          <button 
                            className="neu-secondary rounded-xl p-3 font-medium text-secondary-foreground hover:text-primary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(result, 'json');
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-6 w-[120px]">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                                    <p className="font-semibold truncate text-foreground text-sm">{result.url}</p>
                                    <p className="text-muted-foreground text-xs">{result.createdAt ? new Date(result.createdAt).toLocaleString() : ''}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6 w-[120px] text-center">
                        <div className="neu-subtle rounded-full px-4 py-2 inline-block" style={{ 
                          backgroundColor: badgeColor.bg, 
                          color: badgeColor.text
                        }}>
                                  <span className="font-semibold">{result.testType || result.type || ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6 w-[120px]">
                        <div>
                                  <div className="font-semibold text-foreground text-xs">{result.createdAt ? new Date(result.createdAt).toLocaleString() : ''}</div>
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-6 w-[80px] text-center">
                        <div className="neu-subtle rounded-full px-4 py-2 inline-block border-2" style={{ 
                          borderColor: result.status === 'running' ? '#a5b4fc' : '#7886C7', 
                          color: result.status === 'running' ? '#a5b4fc' : '#7886C7',
                          backgroundColor: result.status === 'running' ? '#a5b4fc' : 'transparent'
                        }}>
                          <span className={`font-semibold ${
                            result.status === 'completed' ? 'text-[var(--primary)]' : 
                            result.status === 'failed' ? 'text-gray-500' : 
                            result.status === 'running' ? 'text-white' : 
                            result.status === 'cancelled' ? 'text-gray-500' : 
                            result.status === 'pending' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {result.status === 'completed' ? '성공' : 
                             result.status === 'failed' ? '실패' : 
                             result.status === 'running' ? '실행중' : 
                             result.status === 'cancelled' ? '취소됨' : 
                             result.status === 'pending' ? '대기중' : result.status}
                          </span>
                        </div>
                      </TableCell>

                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
            )}
      </div>
        </>
      )}
      </div>

      {/* 결과 상세 모달 */}
      <TestResultModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        result={selectedResult}
        onDownload={handleDownload}
      />
    </div>
  );
}

