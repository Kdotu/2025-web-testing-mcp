import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Download, Search, Filter, Eye, Calendar, Globe, ExternalLink, FileText, BarChart3 } from "lucide-react";
import { getAllTestResults, getTestResultById } from "../utils/backend-api";

interface TestResultsProps {
  onNavigate?: (tabId: string) => void;
}

export function TestResults({ onNavigate }: TestResultsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 경과 시간 계산 함수 (MM:SS 포맷)
  const calculateElapsedTime = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : currentTime;
    const elapsedTime = end - start;
    const elapsedSeconds = Math.floor(elapsedTime / 1000);
    
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 백엔드 API에서 테스트 결과 데이터 가져오기
  useEffect(() => {
    const fetchTestResults = async () => {
      try {
        setLoading(true);
        const result = await getAllTestResults(1, 50);
        
        if (result.success && result.data) {
          // data가 배열인지 확인하고 설정
          const resultsArray = Array.isArray(result.data) ? result.data : [];
          setTestResults(resultsArray);
          // console.log('Fetched test results:', resultsArray);
        } else {
          const errorMessage = result.error || '테스트 결과를 불러오는데 실패했습니다.';
          setError(errorMessage);
          console.error('Failed to fetch test results:', result.error);
          setTestResults([]); // 빈 배열로 초기화
        }
      } catch (err) {
        setError('테스트 결과를 불러오는 중 오류가 발생했습니다.');
        console.error('Error fetching test results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestResults();
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
    const matchesFilter = filterType === "all" || result.type === filterType;
    return matchesSearch && matchesFilter;
  }) : [];

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
            <BarChart3 className="h-8 w-8 text-primary-foreground/90" />
          </div>
          <div className="text-4xl font-bold text-primary-foreground mb-2">{testResults.length}</div>
          <p className="text-primary-foreground/80">실행된 테스트</p>
        </div>
        
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-foreground font-semibold text-lg">평균 점수</div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div className="text-4xl font-bold text-primary mb-2">
                {testResults.length > 0 
                  ? Math.round(testResults.reduce((acc, r) => acc + r.score, 0) / testResults.length)
                  : 0
                }
          </div>
          <p className="text-muted-foreground">전체 평균</p>
        </div>
        
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-foreground font-semibold text-lg">성공률</div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
              <div className="text-4xl font-bold text-primary mb-2">
                {testResults.length > 0 
                  ? Math.round((testResults.filter(r => r.status === '완료').length / testResults.length) * 100)
                  : 0
                }%
              </div>
          <p className="text-muted-foreground">완료된 테스트</p>
        </div>
        
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-foreground font-semibold text-lg">오늘 실행</div>
            <Calendar className="h-8 w-8 text-primary" />
          </div>
              <div className="text-4xl font-bold text-primary mb-2">
                {testResults.filter(r => {
                  const today = new Date().toISOString().split('T')[0];
                  return r.date === today;
                }).length}
              </div>
          <p className="text-muted-foreground">최근 테스트</p>
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
                <SelectItem value="성능테스트">성능테스트</SelectItem>
                <SelectItem value="Lighthouse">Lighthouse</SelectItem>
                <SelectItem value="부하테스트">부하테스트</SelectItem>
                <SelectItem value="보안테스트">보안테스트</SelectItem>
                <SelectItem value="접근성테스트">접근성테스트</SelectItem>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="neu-subtle rounded-xl">
                  <TableHead className="w-[300px] px-6 py-6 text-primary font-semibold text-lg">웹사이트</TableHead>
                  <TableHead className="w-[120px] px-6 py-6 text-primary font-semibold text-lg">테스트 유형</TableHead>
                  <TableHead className="w-[120px] px-6 py-6 text-primary font-semibold text-lg">점수</TableHead>
                  <TableHead className="w-[150px] px-6 py-6 text-primary font-semibold text-lg">실행 일시</TableHead>
                  <TableHead className="w-[100px] px-6 py-6 text-primary font-semibold text-lg">소요 시간</TableHead>
                  <TableHead className="w-[80px] px-6 py-6 text-primary font-semibold text-lg">상태</TableHead>
                  <TableHead className="w-[140px] text-right px-6 py-6 text-primary font-semibold text-lg">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => {
                  const badgeColor = getBadgeColor(result.type);
                  return (
                    <TableRow 
                      key={result.id} 
                      className="hover:neu-flat cursor-pointer transition-all duration-300 rounded-xl"
                      onClick={() => setSelectedResult(result)}
                    >
                      <TableCell className="px-6 py-6">
                        <div className="flex items-center space-x-4">
                          <Globe className="h-6 w-6 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold truncate text-foreground text-lg">{result.url}</p>
                            <p className="text-muted-foreground">{result.date}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6">
                        <div className="neu-subtle rounded-full px-4 py-2 inline-block" style={{ 
                          backgroundColor: badgeColor.bg, 
                          color: badgeColor.text
                        }}>
                          <span className="font-semibold">{result.testType || result.type || '부하테스트'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6">
                        <div className="flex items-center space-x-4">
                          <span 
                            className="font-bold text-2xl"
                            style={{ color: getScoreColor(result.score) }}
                          >
                            {result.score}
                          </span>
                          <div className="w-16 neu-pressed rounded-full p-1">
                            <Progress value={result.score} className="h-2" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6">
                        <div>
                          <div className="font-semibold text-foreground">{result.date}</div>
                          <div className="text-muted-foreground text-sm">{result.time}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6 text-muted-foreground font-medium">
                        {result.status === 'running' 
                          ? calculateElapsedTime(result.createdAt)
                          : (result.duration || calculateElapsedTime(result.createdAt, result.updatedAt))
                        }
                      </TableCell>
                      <TableCell className="px-6 py-6">
                        <div className="neu-subtle rounded-full px-4 py-2 inline-block border-2" style={{ 
                          borderColor: '#7886C7', 
                          color: '#7886C7',
                          backgroundColor: 'transparent'
                        }}>
                          <span className="font-semibold">{result.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6 py-6">
                        <div className="flex justify-end space-x-3">
                          <button 
                            className="neu-button rounded-xl p-3 font-medium text-foreground hover:text-primary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResult(result);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
            )}
      </div>

      {/* 결과 상세 모달 */}
      {selectedResult && (
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <Globe className="h-8 w-8 text-primary" />
                <h3 className="text-3xl font-semibold text-primary">테스트 결과 상세</h3>
              </div>
              <p className="text-muted-foreground text-lg">
                {selectedResult.url} - {selectedResult.type}
              </p>
            </div>
            <button 
              className="neu-button rounded-xl px-6 py-3 font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => setSelectedResult(null)}
            >
              닫기
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
                    style={{ color: getScoreColor(selectedResult.score) }}
                  >
                    {selectedResult.score}점
                  </span>
                </div>
                <div className="flex justify-between py-4 px-6">
                  <span className="font-medium text-foreground">실행 시간</span>
                  <span className="font-semibold text-primary">{selectedResult.date} {selectedResult.time}</span>
                </div>
                <div className="flex justify-between items-center py-4 px-6 neu-pressed rounded-xl">
                  <span className="font-medium text-foreground">소요 시간</span>
                  <span className="font-semibold text-primary">{selectedResult.duration}</span>
                </div>
                <div className="flex justify-between items-center py-4 px-6">
                  <span className="font-medium text-foreground">테스트 유형</span>
                  <div className="neu-subtle rounded-full px-4 py-2" style={{ 
                    backgroundColor: getBadgeColor(selectedResult.type).bg,
                    color: getBadgeColor(selectedResult.type).text
                  }}>
                    <span className="font-semibold">{selectedResult.type}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="neu-flat rounded-2xl px-6 py-8">
              <h4 className="font-semibold mb-6 text-primary text-xl">상세 지표</h4>
              <div className="space-y-4">
                {Object.entries(selectedResult.details).map(([key, value], index) => (
                  <div key={key} className={`flex justify-between py-4 px-6 ${index % 2 === 0 ? 'neu-pressed' : ''} rounded-xl`}>
                    <span className="capitalize font-medium text-foreground">{key}</span>
                    <span className="font-semibold text-primary">{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <button 
              className="neu-accent rounded-xl px-6 py-4 font-semibold text-primary-foreground transition-all duration-200 hover:neu-accent"
              onClick={() => handleDownload(selectedResult, 'pdf')}
            >
              <Download className="h-5 w-5 mr-3" />
              텍스트 다운로드
            </button>
            <button 
              className="neu-button rounded-xl px-6 py-4 font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => handleDownload(selectedResult, 'json')}
            >
              <Download className="h-5 w-5 mr-3" />
              JSON 다운로드
            </button>
            <button 
              className="neu-button rounded-xl px-6 py-4 font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => handleDownload(selectedResult, 'csv')}
            >
              <Download className="h-5 w-5 mr-3" />
              CSV 다운로드
            </button>
          </div>
        </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}