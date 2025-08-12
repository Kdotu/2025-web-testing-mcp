import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { 
  BarChart3, 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  TrendingUp, 
  Globe,
  Server,
  Database,
  WifiOff,
  ExternalLink,
  Info,
  Sparkles,
  Calendar
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { getTestResults, checkApiHealth, isDemoMode, setDemoMode } from "../utils/api";
import { getAllTestResults, getTotalTestCount } from "../utils/backend-api";

// Mock 데이터 (오프라인/데모 모드용)
const mockData = {
  recentTests: [
    {
      id: "demo_1",
      url: "https://example.com",
      testType: "performance",
      status: "completed",
      score: 92,
      startTime: "2025-01-23T10:30:00",
      duration: "2m 15s"
    },
    {
      id: "demo_2", 
      url: "https://demo-site.com",
      testType: "lighthouse",
      status: "completed",
      score: 88,
      startTime: "2025-01-23T09:15:00",
      duration: "1m 45s"
    },
    {
      id: "demo_3",
      url: "https://test-app.com",
      testType: "security",
      status: "completed", 
      score: 95,
      startTime: "2025-01-23T08:45:00",
      duration: "3m 30s"
    }
  ],
  weeklyStats: [
    { name: '월', tests: 12, passed: 10 },
    { name: '화', tests: 15, passed: 13 },
    { name: '수', tests: 8, passed: 7 },
    { name: '목', tests: 18, passed: 16 },
    { name: '금', tests: 22, passed: 20 },
    { name: '토', tests: 5, passed: 5 },
    { name: '일', tests: 3, passed: 3 }
  ],
  testTypeDistribution: [
    { name: '성능테스트', value: 35, color: '#7886C7' },
    { name: 'Lighthouse', value: 25, color: '#A9B5DF' },
    { name: '보안테스트', value: 20, color: '#9BA8E8' },
    { name: '부하테스트', value: 15, color: '#6773C0' },
    { name: '접근성테스트', value: 5, color: '#4F5BA3' }
  ]
};

interface DashboardProps {
  onNavigate?: (tabId: string) => void;
  isInDemoMode?: boolean;
  connectionStatus?: string;
}

export function Dashboard({ onNavigate, isInDemoMode, connectionStatus: propConnectionStatus }: DashboardProps) {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [totalTestCount, setTotalTestCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(propConnectionStatus || 'checking');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isDemoModeActive, setIsDemoModeActive] = useState(isInDemoMode || isDemoMode());
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 경과 시간 계산 함수 (MM:SS 포맷)
  const calculateElapsedTime = (startTime: string | number | Date, endTime?: string | number | Date): string => {
    try {
      // startTime이 유효한지 확인
      if (!startTime) {
        return '00:00';
      }

      // startTime을 Date 객체로 변환
      const start = startTime instanceof Date ? startTime : new Date(startTime);
      
      // start가 유효한 날짜인지 확인
      if (isNaN(start.getTime())) {
        console.warn('Invalid startTime:', startTime);
        return '00:00';
      }

      // endTime 처리
      let end: Date;
      if (endTime) {
        end = endTime instanceof Date ? endTime : new Date(endTime);
        if (isNaN(end.getTime())) {
          console.warn('Invalid endTime:', endTime);
          end = new Date(currentTime);
        }
      } else {
        end = new Date(currentTime);
      }

      const elapsedTime = end.getTime() - start.getTime();
      
      // 음수 시간 방지
      if (elapsedTime < 0) {
        return '00:00';
      }

      const elapsedSeconds = Math.floor(elapsedTime / 1000);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating elapsed time:', error);
      return '00:00';
    }
  };

  // 안전한 날짜 포맷팅 함수
  const formatDate = (dateInput: string | number | Date): string => {
    try {
      if (!dateInput) {
        return '날짜 없음';
      }

      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date input:', dateInput);
        return '날짜 없음';
      }

      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '날짜 없음';
    }
  };

  // props 변경 시 상태 업데이트
  useEffect(() => {
    if (isInDemoMode !== undefined) {
      setIsDemoModeActive(isInDemoMode);
    }
    if (propConnectionStatus) {
      setConnectionStatus(propConnectionStatus);
    }
  }, [isInDemoMode, propConnectionStatus]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // props에서 데모 모드 상태 확인
        const demoMode = isInDemoMode !== undefined ? isInDemoMode : isDemoMode();
        setIsDemoModeActive(demoMode);
        
        if (demoMode) {
          setConnectionStatus('demo');
          setTestResults(mockData.recentTests);
          setIsOfflineMode(false);
          setIsLoading(false);
          return;
        }
        
        // API 연결 상태 확인
        const healthCheck = await checkApiHealth();
        
        if (healthCheck.success) {
          setConnectionStatus('connected');
          
          try {
            // Supabase에서 전체 테스트 결과와 전체 개수 불러오기
            const [results, countResult] = await Promise.all([
              getAllTestResults(1, 1000), // 전체 테스트 결과 (TestResults와 동일)
              getTotalTestCount() // 전체 테스트 개수
            ]);
            
            if (results.success && results.data) {
              // TestResults와 동일하게 원본 데이터 사용
              const resultsArray = Array.isArray(results.data) ? results.data : [];
              setTestResults(resultsArray);
              setIsOfflineMode(false);
              
              // 전체 테스트 개수 설정
              if (countResult.success && countResult.data) {
                setTotalTestCount(countResult.data.total);
              } else {
                setTotalTestCount(resultsArray.length);
              }
            } else {
              // 백엔드 API에서 가져오기 (기존 방식)
              const apiResults = await getTestResults();
              if (apiResults.success && apiResults.data) {
                setTestResults(apiResults.data);
                setTotalTestCount(apiResults.data.length);
                setIsOfflineMode(false);
              } else {
                setTestResults(mockData.recentTests);
                setTotalTestCount(mockData.recentTests.length);
                setIsOfflineMode(true);
              }
            }
          } catch (error) {
            console.error('Supabase data loading error:', error);
            // 백엔드 API로 폴백
            const apiResults = await getTestResults();
            if (apiResults.success && apiResults.data) {
              setTestResults(apiResults.data);
              setTotalTestCount(apiResults.data.length);
              setIsOfflineMode(false);
            } else {
              setTestResults(mockData.recentTests);
              setTotalTestCount(mockData.recentTests.length);
              setIsOfflineMode(true);
            }
          }
        } else {
          // 오프라인 모드
          setConnectionStatus(healthCheck.demo ? 'demo' : 'offline');
          setTestResults(mockData.recentTests);
          setTotalTestCount(mockData.recentTests.length);
          setIsOfflineMode(true);
          
          if (healthCheck.demo) {
            setIsDemoModeActive(true);
          }
        }
      } catch (error) {
        console.error('Dashboard data loading error:', error);
        setConnectionStatus('offline');
        setTestResults(mockData.recentTests);
        setTotalTestCount(mockData.recentTests.length);
        setIsOfflineMode(true);
      }
      
      setIsLoading(false);
    };

    loadDashboardData();
  }, []);

  // 실시간 경과 시간 업데이트 (실행 중인 테스트용)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 통계 계산 - TestResults.tsx와 동일한 방식으로 계산
  const totalTests = isOfflineMode || isDemoModeActive ? 83 : totalTestCount;
  
  // 성공률 계산 - 다양한 상태값 고려
  const completedTests = isOfflineMode || isDemoModeActive ? 75 : testResults.filter(r => 
    r.status === '완료' || 
    r.status === 'completed' || 
    r.status === 'success' ||
    r.status === 'complete'
  ).length;
  
  const passRate = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;
  
  const avgScore = isOfflineMode || isDemoModeActive ? 91 : testResults.length > 0 ? 
    Math.round(testResults.reduce((sum, test) => sum + (test.score || 85), 0) / testResults.length) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'running': return Clock;
      case 'failed': return AlertCircle;
      default: return Clock;
    }
  };

  const getTestTypeLabel = (type: string) => {
    const labels = {
      'performance': '성능테스트',
      'lighthouse': 'Lighthouse',
      'load': '부하테스트',
      'security': '보안테스트',
      'accessibility': '접근성테스트'
    };
    return labels[type] || type;
  };

  // 데모 모드 토글
  const toggleDemoMode = () => {
    const newDemoMode = !isDemoModeActive;
    setDemoMode(newDemoMode);
    setIsDemoModeActive(newDemoMode);
    
    if (newDemoMode) {
      setConnectionStatus('demo');
      setIsOfflineMode(false);
    } else {
      setConnectionStatus('checking');
      // 페이지 새로고침으로 연결 상태 재확인
      window.location.reload();
    }
  };

  // 연결 상태에 따른 배너 표시
  const renderConnectionBanner = () => {
    if (connectionStatus === 'demo' || isDemoModeActive) {
      return (
        <div className="neu-card rounded-3xl px-6 py-6 mb-8 border-l-4 border-l-purple-500">
          <div className="flex items-start space-x-4">
            <Sparkles className="h-6 w-6 text-purple-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-primary mb-2">🎭 데모 모드로 실행 중</h3>
              <p className="text-muted-foreground mb-4">
                모든 기능을 완전히 사용할 수 있는 시뮬레이션 환경입니다. 
                실제 테스트는 시뮬레이션되며, 모든 데이터는 브라우저에 저장됩니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="neu-pressed rounded-xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">UI 화면 확인</span>
                  </div>
                </div>
                <div className="neu-pressed rounded-xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">로컬 데이터 저장</span>
                  </div>
                </div>
              </div>
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
                  onClick={toggleDemoMode}
                  className="neu-button"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  데모 모드로 전환
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('/deploy-guide.md', '_blank')}
                  className="neu-button"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  배포 가이드
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="neu-card rounded-3xl px-8 py-6">
          <div className="flex items-center space-x-4">
            <div className="animate-pulse w-8 h-8 bg-primary/20 rounded-lg"></div>
            <div>
              <div className="animate-pulse w-48 h-6 bg-primary/20 rounded mb-2"></div>
              <div className="animate-pulse w-32 h-4 bg-muted-foreground/20 rounded"></div>
            </div>
          </div>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="neu-card rounded-3xl px-6 py-8">
              <div className="animate-pulse space-y-4">
                <div className="w-8 h-8 bg-primary/20 rounded-lg"></div>
                <div className="w-24 h-8 bg-primary/20 rounded"></div>
                <div className="w-16 h-4 bg-muted-foreground/20 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-6 mx-auto">
        {/* 대시보드 헤더 */}
        <div className="neu-card rounded-3xl px-8 py-6 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(99,102,241,0.4)]">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center neu-accent">
              <BarChart3 className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">대시보드</h1>
              <p className="text-muted-foreground text-lg mt-1">
                웹사이트 테스트 현황 및 통계를 확인하세요
              </p>
            </div>
          </div>
        </div>

        {/* 연결 상태 배너 */}
        {renderConnectionBanner()}

        {/* 주요 통계 카드 */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="neu-accent rounded-3xl px-6 py-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-primary-foreground font-semibold text-lg">총 테스트</div>
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div className="text-4xl font-bold text-primary-foreground mb-2">{totalTests}</div>
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

        {/* 차트 섹션 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 주간 테스트 추이 */}
          <div className="neu-card rounded-3xl px-6 py-8">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-primary mb-2">주간 테스트 추이</h3>
              <p className="text-muted-foreground">
                지난 7일간의 테스트 실행 현황 
                {(isDemoModeActive || isOfflineMode) && <span className="text-purple-600">(시뮬레이션 데이터)</span>}
              </p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(() => {
                  // 지난 7일간의 데이터 생성
                  const weeklyData: { name: string; tests: number; completed: number }[] = [];
                  for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                    
                    // 해당 날짜의 테스트 수 계산
                    const dayTests = testResults.filter(r => {
                      const testDate = r.date || 
                                     r.createdAt?.split('T')[0] || 
                                     r.created_at?.split('T')[0] ||
                                     r.startTime?.split('T')[0];
                      return testDate === dateStr;
                    });
                    
                    // 완료된 테스트 수 계산
                    const completedTests = dayTests.filter(r => 
                      r.status === '완료' || 
                      r.status === 'completed' || 
                      r.status === 'success' ||
                      r.status === 'complete'
                    );
                    
                    weeklyData.push({
                      name: dayName,
                      tests: dayTests.length,
                      completed: completedTests.length
                    });
                  }
                  
                  return isOfflineMode || isDemoModeActive ? mockData.weeklyStats : weeklyData;
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DBE8" />
                  <XAxis dataKey="name" stroke="#5A6082" />
                  <YAxis stroke="#5A6082" />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#F8F1F7',
                      border: '1px solid #E5DBE8',
                      borderRadius: '12px',
                      boxShadow: '4px 4px 8px rgba(232, 213, 229, 0.5)'
                    }}
                  />
                  <Bar dataKey="tests" fill="#7886C7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#A9B5DF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 테스트 유형 분포 */}
          <div className="neu-card rounded-3xl px-6 py-8">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-primary mb-2">테스트 유형 분포</h3>
              <p className="text-muted-foreground">
                각 테스트 유형별 실행 비율
                {(isDemoModeActive || isOfflineMode) && <span className="text-purple-600">(시뮬레이션 데이터)</span>}
              </p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(() => {
                      if (isOfflineMode || isDemoModeActive) {
                        return mockData.testTypeDistribution;
                      }
                      
                      // 실제 테스트 유형별 분포 계산
                      const testTypeCounts: { [key: string]: number } = {};
                      testResults.forEach(result => {
                        const testType = result.testType || result.type || 'unknown';
                        testTypeCounts[testType] = (testTypeCounts[testType] || 0) + 1;
                      });
                      
                      const totalTests = testResults.length;
                      const typeColors = {
                        'load': '#7886C7',
                        'lighthouse': '#A9B5DF',
                        'performance': '#9BA8E8',
                        'security': '#6773C0',
                        'accessibility': '#4F5BA3',
                        'unknown': '#A9B5DF'
                      };
                      
                      const typeNames = {
                        'load': '부하테스트',
                        'lighthouse': 'Lighthouse',
                        'performance': '성능테스트',
                        'security': '보안테스트',
                        'accessibility': '접근성테스트',
                        'unknown': '알 수 없음'
                      };
                      
                      return Object.entries(testTypeCounts).map(([type, count]) => ({
                        name: typeNames[type] || type,
                        value: totalTests > 0 ? Math.round((count / totalTests) * 100) : 0,
                        color: typeColors[type] || '#A9B5DF'
                      }));
                    })()}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#7886C7"
                  >
                    {(() => {
                      const data = isOfflineMode || isDemoModeActive ? mockData.testTypeDistribution : (() => {
                        const testTypeCounts: { [key: string]: number } = {};
                        testResults.forEach(result => {
                          const testType = result.testType || result.type || 'unknown';
                          testTypeCounts[testType] = (testTypeCounts[testType] || 0) + 1;
                        });
                        
                        const totalTests = testResults.length;
                        const typeColors = {
                          'load': '#7886C7',
                          'lighthouse': '#A9B5DF',
                          'e2e' : '#9BA8E8',
                          'performance': '#9BA8E8',
                          'security': '#6773C0',
                          'accessibility': '#4F5BA3',
                          'unknown': '#A9B5DF'
                        };
                        
                        const typeNames = {
                          'load': '부하테스트',
                          'lighthouse': 'Lighthouse',
                          'e2e' : '단위 테스트',
                          'performance': '성능테스트',
                          'security': '보안테스트',
                          'accessibility': '접근성테스트',
                          'unknown': '알 수 없음'
                        };
                        
                        return Object.entries(testTypeCounts).map(([type, count]) => ({
                          name: typeNames[type] || type,
                          value: totalTests > 0 ? Math.round((count / totalTests) * 100) : 0,
                          color: typeColors[type] || '#A9B5DF'
                        }));
                      })();
                      
                      return data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ));
                    })()}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#F8F1F7',
                      border: '1px solid #E5DBE8',
                      borderRadius: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-3">
              {(() => {
                const data = isOfflineMode || isDemoModeActive ? mockData.testTypeDistribution : (() => {
                  const testTypeCounts: { [key: string]: number } = {};
                  testResults.forEach(result => {
                    const testType = result.testType || result.type || 'unknown';
                    testTypeCounts[testType] = (testTypeCounts[testType] || 0) + 1;
                  });
                  
                  const totalTests = testResults.length;
                  const typeColors = {
                    'load': '#7886C7',
                    'lighthouse': '#A9B5DF',
                    'performance': '#9BA8E8',
                    'security': '#6773C0',
                    'accessibility': '#4F5BA3',
                    'unknown': '#A9B5DF'
                  };
                  
                  const typeNames = {
                    'load': '부하테스트',
                    'lighthouse': 'Lighthouse',
                    'performance': '성능테스트',
                    'e2e' : '단위 테스트',
                    'security': '보안테스트',
                    'accessibility': '접근성테스트',
                    'unknown': '알 수 없음'
                  };
                  
                  return Object.entries(testTypeCounts).map(([type, count]) => ({
                    name: typeNames[type] || type,
                    value: totalTests > 0 ? Math.round((count / totalTests) * 100) : 0,
                    color: typeColors[type] || '#A9B5DF'
                  }));
                })();
                
                return data.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* 최근 테스트 결과 */}
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-semibold text-primary mb-2">최근 테스트 결과</h3>
              <p className="text-muted-foreground">
                최신 테스트 실행 결과를 확인하세요
                {(isDemoModeActive || isOfflineMode) && <span className="text-purple-600"> (시뮬레이션 결과)</span>}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {(testResults.length > 0 ? testResults.slice(0, 5) : mockData.recentTests).map((test, index) => {
              const StatusIcon = getStatusIcon(test.status);
              return (
                <div key={`${test.id}-${test.startTime}-${index}`} className="neu-flat rounded-2xl px-6 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        test.status === 'completed' ? 'neu-accent' : 'neu-secondary'
                      }`}>
                        <StatusIcon className={`h-6 w-6 ${
                          test.status === 'completed' ? 'text-primary-foreground' : 'text-secondary-foreground'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-foreground text-lg">{test.url}</h4>
                          <div className="neu-pressed rounded-full px-3 py-1">
                            <span className="text-sm font-medium text-primary">
                              {getTestTypeLabel(test.testType || 'load')}
                            </span>
                          </div>
                          {(isDemoModeActive || isOfflineMode) && (
                            <div className="neu-pressed rounded-full px-3 py-1 bg-purple-500/10">
                              <span className="text-xs font-medium text-purple-600">시뮬레이션</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{formatDate(test.startTime)}</span>
                          <span>•</span>
                          <span>경과시간: {
                            test.status === 'running' 
                              ? calculateElapsedTime(test.startTime) 
                              : (test.duration || calculateElapsedTime(test.startTime, test.endTime))
                          }</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                    <div className="neu-subtle rounded-full px-4 py-2 inline-block border-2" style={{ 
                          borderColor: '#7886c7', 
                          color: test.status === 'running' ? '#a5b4fc' : '#7886C7',
                          backgroundColor: test.status === 'running' ? '#a5b4fc' : 'transparent'
                        }}>
                      {/* <div className={`neu-pressed rounded-full px-4 py-2 ${getStatusColor(test.status)}`}> */}
                      <span className={`font-semibold ${
                            test.status === 'completed' ? 'text-[var(--primary)]' : 
                            test.status === 'failed' ? 'text-gray-500' : 
                            test.status === 'running' ? 'text-white' : 
                            test.status === 'cancelled' ? 'text-gray-500' : 
                            test.status === 'pending' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {test.status === 'completed' ? '성공' : 
                             test.status === 'failed' ? '실패' : 
                             test.status === 'running' ? '실행중' : 
                             test.status === 'cancelled' ? '취소됨' : 
                             test.status === 'pending' ? '대기중' : test.status}
                          </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {testResults.length === 0 && !isOfflineMode && !isDemoModeActive && (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-16 w-16 mx-auto mb-6 opacity-50" />
              <p className="font-semibold text-lg mb-2">아직 실행된 테스트가 없습니다</p>
              <p className="text-base">첫 번째 테스트를 실행해보세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}