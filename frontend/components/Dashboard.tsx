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
  Sparkles
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { getTestResults, checkApiHealth, isDemoMode, setDemoMode } from "../utils/api";
import { getAllTestResults } from "../utils/backend-api";

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
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isDemoModeActive, setIsDemoModeActive] = useState(isDemoMode());
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

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // 데모 모드 상태 확인
        const demoMode = isDemoMode();
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
            // Supabase에서 최근 테스트 결과 불러오기
            const results = await getAllTestResults(1, 10); // 최근 10개 테스트
            if (results.success && results.data) {
              // 테스트 결과를 Dashboard 형식에 맞게 변환
              const formattedResults = results.data.map((test: any) => ({
                id: test.id,
                url: test.url,
                testType: test.config?.stages ? 'load' : 'performance', // 부하테스트 여부로 판단
                status: test.status,
                score: test.metrics?.http_req_duration?.avg ? Math.round(100 - (test.metrics.http_req_duration.avg / 20)) : 85, // 응답시간 기반 점수
                startTime: test.createdAt,
                endTime: test.updatedAt,
                duration: calculateElapsedTime(test.createdAt, test.updatedAt)
              }));
              setTestResults(formattedResults);
              setIsOfflineMode(false);
            } else {
              // 백엔드 API에서 가져오기 (기존 방식)
              const apiResults = await getTestResults();
              if (apiResults.success && apiResults.data) {
                setTestResults(apiResults.data);
                setIsOfflineMode(false);
              } else {
                setTestResults(mockData.recentTests);
                setIsOfflineMode(true);
              }
            }
          } catch (error) {
            console.error('Supabase data loading error:', error);
            // 백엔드 API로 폴백
            const apiResults = await getTestResults();
            if (apiResults.success && apiResults.data) {
              setTestResults(apiResults.data);
              setIsOfflineMode(false);
            } else {
              setTestResults(mockData.recentTests);
              setIsOfflineMode(true);
            }
          }
        } else {
          // 오프라인 모드
          setConnectionStatus(healthCheck.demo ? 'demo' : 'offline');
          setTestResults(mockData.recentTests);
          setIsOfflineMode(true);
          
          if (healthCheck.demo) {
            setIsDemoModeActive(true);
          }
        }
      } catch (error) {
        console.error('Dashboard data loading error:', error);
        setConnectionStatus('offline');
        setTestResults(mockData.recentTests);
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

  // 통계 계산
  const totalTests = isOfflineMode || isDemoModeActive ? 83 : testResults.length;
  const passedTests = isOfflineMode || isDemoModeActive ? 75 : testResults.filter(test => test.status === 'completed').length;
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
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
                    <span className="text-sm font-medium">실시간 테스트 시뮬레이션</span>
                  </div>
                </div>
                <div className="neu-pressed rounded-xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">완전한 UI/UX 경험</span>
                  </div>
                </div>
                <div className="neu-pressed rounded-xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">로컬 데이터 저장</span>
                  </div>
                </div>
                <div className="neu-pressed rounded-xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">설정 및 결과 관리</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleDemoMode}
                  className="neu-button"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Supabase 연결 시도
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
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.group('🎭 데모 모드 정보');
                    console.log('현재 상태: 데모 모드 활성화');
                    console.log('모든 기능: 완전히 사용 가능');
                    console.log('데이터 저장: 브라우저 로컬 저장소');
                    console.log('실제 테스트: 시뮬레이션');
                    console.log('Supabase 연동: window.mcpDebug.setDemoMode(false)');
                    console.groupEnd();
                    alert('데모 모드 정보가 콘솔에 출력되었습니다.');
                  }}
                  className="neu-button"
                >
                  <Info className="h-4 w-4 mr-2" />
                  데모 정보
                </Button>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="neu-card rounded-3xl px-8 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center neu-accent">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">총 테스트</p>
                <p className="text-4xl font-bold text-primary">{totalTests}</p>
              </div>
            </div>
          </div>

          <div className="neu-card rounded-3xl px-8 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center neu-secondary">
                <CheckCircle className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">성공률</p>
                <p className="text-4xl font-bold text-primary">{passRate}%</p>
              </div>
            </div>
          </div>

          <div className="neu-card rounded-3xl px-8 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#9BA8E8' }}>
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">평균 점수</p>
                <p className="text-4xl font-bold text-primary">{avgScore}</p>
              </div>
            </div>
          </div>

          <div className="neu-card rounded-3xl px-8 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#6773C0' }}>
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">이번 주</p>
                <p className="text-4xl font-bold text-primary">
                  {isDemoModeActive || isOfflineMode ? 83 : mockData.weeklyStats.reduce((sum, day) => sum + day.tests, 0)}
                </p>
              </div>
            </div>
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
                <BarChart data={mockData.weeklyStats}>
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
                  <Bar dataKey="passed" fill="#A9B5DF" radius={[4, 4, 0, 0]} />
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
                    data={mockData.testTypeDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#7886C7"
                  >
                    {mockData.testTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
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
              {mockData.testTypeDistribution.map((item, index) => (
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
              ))}
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
            <Button className="neu-button rounded-xl">
              <Play className="h-4 w-4 mr-2" />
              새 테스트 실행
            </Button>
          </div>

          <div className="space-y-4">
            {(testResults.length > 0 ? testResults.slice(0, 5) : mockData.recentTests).map((test, index) => {
              const StatusIcon = getStatusIcon(test.status);
              return (
                <div key={test.id || index} className="neu-flat rounded-2xl px-6 py-6">
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
                          <span>{new Date(test.startTime).toLocaleString()}</span>
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
                      {test.score && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">점수</p>
                          <p className="text-2xl font-bold text-primary">{test.score}</p>
                        </div>
                      )}
                      <div className={`neu-pressed rounded-full px-4 py-2 ${getStatusColor(test.status)}`}>
                        <span className="font-semibold">
                          {test.status === 'completed' ? '완료' : 
                           test.status === 'running' ? '실행중' : 
                           test.status === 'failed' ? '실패' : '대기중'}
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