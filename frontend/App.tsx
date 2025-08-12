import { useState, useEffect } from "react";
import { SidebarProvider, useSidebar } from "./components/ui/sidebar";
import { 
  AppSidebar, 
  Header, 
  Footer, 
  Dashboard, 
  TestExecution, 
  TestResults, 
  Settings 
} from "./components";
import { checkApiHealth, checkDatabaseStatus, getConnectionInfo, isDemoMode, setDemoMode } from "./utils/api";
import { initializeApp } from "./utils/supabase/client";

const navigation = [
  { id: "dashboard", name: "메인", component: Dashboard },
  { id: "test-execution", name: "테스트 실행", component: TestExecution },
  { id: "test-results", name: "테스트 결과", component: TestResults },
  { id: "settings", name: "설정", component: Settings },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isInDemoMode, setIsInDemoMode] = useState(isDemoMode());
  const { isMobile, setOpenMobile, open, state } = useSidebar();

  // 앱 초기화
  useEffect(() => {
    const initializeAppData = async () => {
      try {
        await initializeApp();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeAppData();
  }, []);

  // 연결 상태 확인
  useEffect(() => {
    let isComponentMounted = true;
    let abortController = new AbortController();
    
    const checkConnections = async () => {
      if (!isComponentMounted || abortController.signal.aborted) return;
      
      const currentDemoMode = isDemoMode();
      if (currentDemoMode !== isInDemoMode) {
        setIsInDemoMode(currentDemoMode);
      }
      
      if (currentDemoMode) {
        if (isComponentMounted) {
          setConnectionStatus('demo');
          setConnectionError('데모 모드가 활성화되어 있습니다.');
        }
        return;
      }
      
      try {
        if (isComponentMounted) {
          setConnectionStatus('checking');
        }
        
        const apiResult = await checkApiHealth();
        
        if (!isComponentMounted || abortController.signal.aborted) return;
        
        if (apiResult.offline || apiResult.demo) {
          setConnectionStatus(apiResult.demo ? 'demo' : 'offline');
          setConnectionError(apiResult.message || '연결 문제가 발생했습니다.');
          if (apiResult.demo) {
            setIsInDemoMode(true);
          }
          return;
        }
        
        if (apiResult.success) {
          const dbResult = await checkDatabaseStatus();
          
          if (!isComponentMounted || abortController.signal.aborted) return;
          
          if (apiResult.success && dbResult.success) {
            setConnectionStatus('connected');
            setConnectionError(null);
          } else {
            setConnectionStatus('error');
            setConnectionError(dbResult.message || '데이터베이스 연결 실패');
          }
        } else {
          setConnectionStatus('error');
          setConnectionError(apiResult.message || 'API 연결 실패');
        }
      } catch (error: any) {
        if (!isComponentMounted || abortController.signal.aborted) return;
        
        // AbortError는 무시 (정상적인 취소)
        if (error.name === 'AbortError') {
          return;
        }
        
        setConnectionStatus('offline');
        setConnectionError('네트워크 연결을 확인하세요.');
      }
    };

    // 초기 연결 체크
    checkConnections();
    
    // 주기적 체크를 위한 인터벌 설정
    const interval = setInterval(() => {
      // 새로운 AbortController 생성 (이전 요청과 독립적으로 관리)
      if (!abortController.signal.aborted) {
        checkConnections();
      }
    }, 30000);
    
    return () => {
      isComponentMounted = false;
      abortController.abort(); // 진행 중인 모든 요청 취소
      clearInterval(interval);
    };
  }, [isInDemoMode]);

  const ActiveComponent = navigation.find(nav => nav.id === activeTab)?.component || Dashboard;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const showDebugInfo = () => {
    const info = getConnectionInfo();
    const debugInfo = {
      ...info,
      connectionStatus,
      connectionError,
      timestamp: new Date().toLocaleString()
    };
    
    console.group('🔍 MCP Tester 연결 정보');
    console.table(debugInfo);
    console.groupEnd();
    
    alert('디버그 정보가 콘솔에 출력되었습니다.');
  };

  const toggleDemoMode = () => {
    const newDemoMode = !isInDemoMode;
    setDemoMode(newDemoMode);
    setIsInDemoMode(newDemoMode);
    
    if (newDemoMode) {
      setConnectionStatus('demo');
      setConnectionError('데모 모드가 활성화되었습니다.');
    } else {
      setConnectionStatus('checking');
      setConnectionError(null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* 사이드바 */}
      <AppSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
      />

      {/* 메인 콘텐츠 영역 - 사이드바 오른쪽에 위치 */}
      <div className={`flex flex-col min-h-screen w-full transition-all duration-300 ease-in-out ${
        isMobile ? 'ml-0' : 
        state === 'collapsed' ? 'ml-0' : 'md:ml-60'
      }`}>
        {/* 헤더 */}
        <Header
          activeTab={activeTab}
          navigation={navigation}
          connectionStatus={connectionStatus}
          connectionError={connectionError}
          isInDemoMode={isInDemoMode}
          onToggleDemoMode={toggleDemoMode}
          onShowDebug={showDebugInfo}
        />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto px-4 md:px-12 py-4 md:py-8 w-full">
          <div className="w-full px-2 md:px-6">
            <ActiveComponent 
              onNavigate={handleTabChange} 
              isInDemoMode={isInDemoMode}
              connectionStatus={connectionStatus}
            />
          </div>
        </main>

        {/* 푸터 */}
        <Footer connectionStatus={connectionStatus} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppContent />
    </SidebarProvider>
  );
}