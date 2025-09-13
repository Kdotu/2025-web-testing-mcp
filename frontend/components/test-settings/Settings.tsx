import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Save, Bell, Database, Settings as SettingsIcon, Cog, Activity, CheckCircle, Shield, AlertCircle, Lock, Unlock, Sparkles } from "lucide-react";
import { isDemoMode } from "@/utils/api";
import { getTestTypes, addTestType, updateTestType, deleteTestType, type TestType } from "@/utils/backend-api";
import { toast } from "sonner";
import { TestTypeModal } from "@/components/test-settings/TestTypeModal";
import { SettingsHeader } from "@/components/test-settings/SettingsHeader";
import { TestLayoutCustomizer } from "@/components/test-settings/TestLayoutCustomizer";
import { TestSettingsWithLayout } from "@/components/test-settings/TestSettingsWithLayout";

interface SettingsProps {
  onNavigate?: (tabId: string) => void;
  isInDemoMode?: boolean;
  connectionStatus?: string;
}

export function Settings({ onNavigate, isInDemoMode, connectionStatus: propConnectionStatus }: SettingsProps) {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTestType, setEditingTestType] = useState<TestType | null>(null);
  const [isDemoModeActive, setIsDemoModeActive] = useState(isInDemoMode || false);
  const [selectedTestType, setSelectedTestType] = useState<string>('lighthouse');
  
  // 일반 설정
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [maxConcurrentTests, setMaxConcurrentTests] = useState(3);
  const [defaultTimeout, setDefaultTimeout] = useState(30);

  // 데모 모드 기본 제공 테스트 타입 (폴백 데이터)
  const demoBuiltinTestTypes: TestType[] = [
    {
      id: 'builtin_lighthouse',
      name: 'Lighthouse 감사',
      description: '성능/접근성/SEO 등 품질 지표 분석',
      enabled: true,
      category: 'builtin',
      icon: 'CheckCircle',
      color: '#6366f1',
      mcp_tool: 'lighthouse',
      is_locked: true,
      lock_type: 'config'
    },
    {
      id: 'builtin_load',
      name: '부하 테스트 (k6)',
      description: 'k6 기반 부하•스트레스 테스트',
      enabled: false,
      category: 'builtin',
      icon: 'Database',
      color: '#10b981',
      mcp_tool: 'k6',
      is_locked: false,
      lock_type: 'config'
    },
    {
      id: 'builtin_playwright',
      name: 'Playwright E2E',
      description: '브라우저 자동화 E2E 시나리오 실행',
      enabled: true,
      category: 'builtin',
      icon: 'Settings',
      color: '#f59e0b',
      mcp_tool: 'playwright',
      is_locked: true,
      lock_type: 'config'
    }
  ];

  // props 변경 시 상태 업데이트
  useEffect(() => {
    if (isInDemoMode !== undefined) {
      setIsDemoModeActive(isInDemoMode);
    }
  }, [isInDemoMode]);

  // 컴포넌트 마운트시 테스트 타입 불러오기
  useEffect(() => {
    loadTestTypes();
  }, []);

  const loadTestTypes = async () => {
    setIsLoading(true);
    try {
      const result = await getTestTypes();
      if (result.success && result.data) {
        // DB 데이터 우선으로 정렬 및 그룹화
        const sortedTestTypes = sortTestTypesByCategory(result.data);
        if (isDemoMode() && sortedTestTypes.length === 0) {
          setTestTypes(sortTestTypesByCategory(demoBuiltinTestTypes));
        } else {
          setTestTypes(sortedTestTypes);
        }
      } else {
        // API 실패 시에도 데이터가 있으면 사용 (오프라인 모드)
        if (result.data && result.data.length > 0) {
          const sortedTestTypes = sortTestTypesByCategory(result.data);
          setTestTypes(sortedTestTypes);
        } else if (isDemoMode()) {
          // 데모 모드 폴백 사용
          setTestTypes(sortTestTypesByCategory(demoBuiltinTestTypes));
        } else {
          toast.error('테스트 타입을 불러오는데 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Error loading test types:', error);
      if (isDemoMode()) {
        // 에러 시에도 데모 모드 폴백 제공
        setTestTypes(sortTestTypesByCategory(demoBuiltinTestTypes));
      } else {
        toast.error('테스트 타입을 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 테스트 타입을 카테고리별로 정렬
  const sortTestTypesByCategory = (types: TestType[]): TestType[] => {
    // 데모 모드나 오프라인 모드일 때는 기본 제공(builtin) 카테고리의 테스트 타입 표시
    // 일반 모드일 때만 builtin 카테고리를 완전히 숨김
    let filteredTypes = types;
    if (isDemoMode()) {
      // 데모 모드: builtin 카테고리만 표시
      filteredTypes = types.filter(testType => testType.category === 'builtin');
    } else {
      // 일반 모드: builtin 카테고리 제외 (오프라인 데이터는 이미 필터링됨)
      filteredTypes = types.filter(testType => testType.category !== 'builtin');
    }

    // 카테고리별로 그룹화하여 정렬
    return filteredTypes.sort((a, b) => {
      // 카테고리별로 정렬
      const aCategory = a.category || 'custom';
      const bCategory = b.category || 'custom';
      
      if (aCategory !== bCategory) {
        return aCategory.localeCompare(bCategory);
      }
      
      // 같은 카테고리 내에서는 이름으로 정렬
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  // 테스트 타입을 카테고리별로 그룹화
  const groupTestTypesByCategory = (types: TestType[]) => {
    const groups: { category: string; testTypes: TestType[] }[] = [];
    const categoryMap = new Map<string, TestType[]>();

    // 카테고리별로 그룹화
    types.forEach(testType => {
      const category = testType.category || 'custom';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(testType);
    });

    // Map을 배열로 변환하고 카테고리명으로 정렬
    const sortedGroups = Array.from(categoryMap.entries())
      .map(([category, testTypes]) => ({ category, testTypes }))
      .sort((a, b) => a.category.localeCompare(b.category));

    return sortedGroups;
  };



    const handleSaveTestType = async (testTypeData: Partial<TestType>) => {
    try {
      if (modalMode === 'add') {
        const result = await addTestType(testTypeData as TestType);
        if (result.success) {
          toast.success('✅ 테스트 타입이 성공적으로 추가되었습니다.');
          loadTestTypes();
        } else {
          toast.error(result.error || '❌ 테스트 타입 추가에 실패했습니다.');
        }
      } else {
        if (!editingTestType) return;

        // 잠금 상태 확인 (기본 수정 시에만)
        if (editingTestType.is_locked && !testTypeData.is_locked) {
          toast.error(`🔒 잠금된 테스트 타입입니다.
          잠금 유형: ${editingTestType.lock_type || 'config'}
          잠금 해제 후 수정이 가능합니다.`);
          return;
        }

        // 실시간 업데이트를 위한 로컬 상태 변경
        if (testTypeData.is_locked !== undefined || testTypeData.enabled !== undefined) {
          setTestTypes(prev => prev.map(t => 
            t.id === editingTestType.id ? { 
              ...t, 
              is_locked: testTypeData.is_locked !== undefined ? testTypeData.is_locked : t.is_locked,
              enabled: testTypeData.enabled !== undefined ? testTypeData.enabled : t.enabled
            } : t
          ));
          
          // 백그라운드에서 전체 데이터 새로고침 (실시간 업데이트 보장)
          loadTestTypes();
        }
        
        // 기본 정보 수정 시에만 API 호출
        if (testTypeData.name || testTypeData.description || testTypeData.mcp_tool) {
          const result = await updateTestType(editingTestType.id, {
            name: testTypeData.name!,
            description: testTypeData.description!,
            enabled: testTypeData.enabled!,
            mcp_tool: testTypeData.mcp_tool || '',
            is_locked: testTypeData.is_locked,
            lock_type: testTypeData.lock_type || 'config'
          });
          
          if (result.success) {
            toast.success('✅ 테스트 타입이 성공적으로 수정되었습니다.');
            // 백그라운드에서 전체 데이터 새로고침
            loadTestTypes();
          } else {
            // 실패 시 원래 상태로 되돌리기
            setTestTypes(prev => prev.map(t => 
              t.id === editingTestType.id ? editingTestType : t
            ));
            
            // 실패 원인에 따른 상세 메시지
            let errorMessage = '❌ 테스트 타입 수정에 실패했습니다.';
            if (result.error) {
              if (result.error.includes('locked') || result.error.includes('잠금')) {
                errorMessage = `🔒 잠금된 테스트 타입입니다. 잠금 해제 후 수정해주세요.`;
              } else if (result.error.includes('permission') || result.error.includes('권한')) {
                errorMessage = `🚫 권한이 없습니다. 관리자에게 문의하세요.`;
              } else if (result.error.includes('not found') || result.error.includes('찾을 수 없음')) {
                errorMessage = `🔍 테스트 타입을 찾을 수 없습니다.`;
              } else {
                errorMessage = `❌ ${result.error}`;
              }
            }
            toast.error(errorMessage);
          }
        }
      }
    } catch (error) {
      console.error('Error saving test type:', error);
      toast.error('❌ 테스트 타입 저장 중 오류가 발생했습니다.');
    }
  };

  // TestTypeModal의 Switch 변경 시 호출되는 콜백
  const handleModalSwitchChange = async (testTypeData: Partial<TestType>) => {
    try {
      if (!editingTestType) return;

      // 로컬 상태 즉시 업데이트
      setTestTypes(prev => prev.map(t => 
        t.id === editingTestType.id ? { 
          ...t, 
          is_locked: testTypeData.is_locked !== undefined ? testTypeData.is_locked : t.is_locked,
          enabled: testTypeData.enabled !== undefined ? testTypeData.enabled : t.enabled
        } : t
      ));

      // 백그라운드에서 전체 데이터 새로고침
      loadTestTypes();
    } catch (error) {
      console.error('Error handling modal switch change:', error);
    }
  };



  const handleToggleTestType = async (testType: TestType) => {
    try {
      const result = await updateTestType(testType.id, {
        enabled: !testType.enabled
      });
      
      if (result.success) {
        // 성공 시에만 UI 업데이트
        setTestTypes(prev => prev.map(t => 
          t.id === testType.id ? { ...t, enabled: !testType.enabled } : t
        ));
        
        const status = !testType.enabled ? '활성화' : '비활성화';
        toast.success(`✅ ${testType.name}이(가) 성공적으로 ${status}되었습니다.`);
      } else {
        // 실패 원인에 따른 상세 메시지
        let errorMessage = '❌ 테스트 타입 상태 변경에 실패했습니다.';
        if (result.error) {
          if (result.error.includes('locked') || result.error.includes('잠금')) {
            errorMessage = `🔒 잠금된 테스트 타입입니다. 잠금 해제 후 상태 변경해주세요.`;
          } else if (result.error.includes('permission') || result.error.includes('권한')) {
            errorMessage = `🚫 권한이 없습니다. 관리자에게 문의하세요.`;
          } else if (result.error.includes('not found') || result.error.includes('찾을 수 없음')) {
            errorMessage = `🔍 테스트 타입을 찾을 수 없습니다.`;
          } else {
            errorMessage = `❌ ${result.error}`;
          }
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error toggling test type:', error);
      toast.error('❌ 테스트 타입 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 잠금 상태 toggle 함수 추가
  const handleToggleLockStatus = async (testType: TestType) => {
    try {
      const newLockStatus = !testType.is_locked;
      
      // 잠금 상태가 true가 되면 활성화 상태도 true로 고정
      const updateData: any = { is_locked: newLockStatus };
      if (newLockStatus) {
        updateData.enabled = true;
      }
      
      const result = await updateTestType(testType.id, updateData);
      
      if (result.success) {
        // 성공 시에만 UI 업데이트
        setTestTypes(prev => prev.map(t => 
          t.id === testType.id ? { 
            ...t, 
            is_locked: newLockStatus,
            enabled: newLockStatus ? true : t.enabled
          } : t
        ));
        
        const action = newLockStatus ? '잠금' : '잠금 해제';
        toast.success(`🔒 ${testType.name}이(가) 성공적으로 ${action}되었습니다.`);
      } else {
        // 실패 원인에 따른 상세 메시지
        let errorMessage = '❌ 잠금 상태 변경에 실패했습니다.';
        if (result.error) {
          if (result.error.includes('permission') || result.error.includes('권한')) {
            errorMessage = `🚫 권한이 없습니다. 관리자에게 문의하세요.`;
          } else if (result.error.includes('not found') || result.error.includes('찾을 수 없음')) {
            errorMessage = `🔍 테스트 타입을 찾을 수 없습니다.`;
          } else {
            errorMessage = `❌ ${result.error}`;
          }
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error toggling lock status:', error);
      toast.error('❌ 잠금 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 테스트 타입에 맞는 아이콘 반환 (DB 데이터 우선)
  const getTestTypeIcon = (testType: TestType) => {
    // DB에 저장된 icon이 있으면 우선 사용
    if (testType.icon) {
      try {
        // Lucide 아이콘 동적 매핑
        const iconMap: { [key: string]: any } = {
          'BarChart3': Activity,
          'Activity': Activity,
          'Zap': Activity,
          'TrendingUp': Activity,
          'Shield': Shield,
          'Eye': AlertCircle,
          'MousePointer': CheckCircle,
          'Database': Database,
          'Settings': SettingsIcon,
          'CheckCircle': CheckCircle,
          'AlertCircle': AlertCircle
        };
        
        const IconComponent = iconMap[testType.icon] || SettingsIcon;
        return <IconComponent className="h-5 w-5" style={{ color: testType.color || 'var(--primary)' }} />;
      } catch (error) {
        console.warn(`Icon not found: ${testType.icon}`, error);
      }
    }
    
    // DB에 icon이 없거나 매핑 실패 시 ID 기반 폴백
    const typeId = testType.id.toLowerCase();
    const typeName = testType.name.toLowerCase();
    
    if (typeId.includes('lighthouse') || typeName.includes('lighthouse')) {
      return <CheckCircle className="h-5 w-5 text-primary" />;
    }
    if (typeId.includes('load') || typeName.includes('부하') || typeName.includes('load')) {
      return <Database className="h-5 w-5 text-primary" />;
    }
    if (typeId.includes('performance') || typeName.includes('성능')) {
      return <Activity className="h-5 w-5 text-primary" />;
    }
    if (typeId.includes('security') || typeName.includes('보안')) {
      return <Shield className="h-5 w-5 text-primary" />;
    }
    if (typeId.includes('accessibility') || typeName.includes('접근성')) {
      return <AlertCircle className="h-5 w-5 text-primary" />;
    }
    
    // 기본 아이콘
    return <SettingsIcon className="h-5 w-5 text-primary" />;
  };

  const handleDeleteTestType = async (testType: TestType) => {
    if (!confirm(`"${testType.name}" 테스트 타입을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const result = await deleteTestType(testType.id);
      if (result.success) {
        toast.success('🗑️ 테스트 타입이 성공적으로 삭제되었습니다.');
        loadTestTypes();
      } else {
        // 실패 원인에 따른 상세 메시지
        let errorMessage = '❌ 테스트 타입 삭제에 실패했습니다.';
        if (result.error) {
          if (result.error.includes('locked') || result.error.includes('잠금')) {
            errorMessage = `🔒 잠금된 테스트 타입입니다. 잠금 해제 후 삭제해주세요.`;
          } else if (result.error.includes('permission') || result.error.includes('권한')) {
            errorMessage = `🚫 권한이 없습니다. 관리자에게 문의하세요.`;
          } else if (result.error.includes('in use') || result.error.includes('사용 중')) {
            errorMessage = `⚠️ 현재 사용 중인 테스트 타입입니다. 사용을 중단한 후 삭제해주세요.`;
          } else if (result.error.includes('not found') || result.error.includes('찾을 수 없음')) {
            errorMessage = `🔍 테스트 타입을 찾을 수 없습니다.`;
          } else {
            errorMessage = `❌ ${result.error}`;
          }
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting test type:', error);
      toast.error('❌ 테스트 타입 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-8 mx-auto">
          {/* 페이지 헤더 */}
          <SettingsHeader isInDemoMode={isDemoModeActive} />

        <div className="neu-card rounded-3xl px-6 py-8">
          <Tabs defaultValue="test-types" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 neu-flat rounded-xl p-1.5 gap-1.5 h-auto">
              <TabsTrigger 
                value="test-types"
                className="flex items-center justify-center rounded-lg px-4 py-4 font-semibold text-base transition-all duration-200 data-[state=active]:neu-button-active data-[state=active]:text-primary-foreground data-[state=active]:bg-primary h-14"
              >
                <Activity className="h-4 w-4 mr-2" />
                테스트 타입
              </TabsTrigger>
              <TabsTrigger 
                value="test-settings"
                className="flex items-center justify-center rounded-lg px-4 py-4 font-semibold text-base transition-all duration-200 data-[state=active]:neu-button-active data-[state=active]:text-primary-foreground data-[state=active]:bg-primary h-14"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                레이아웃 설정
              </TabsTrigger>
            </TabsList>

            <TabsContent value="test-types" className="space-y-6">
              <TestTypesTab />
            </TabsContent>

            <TabsContent value="test-settings" className="space-y-6">
              <LayoutSettingsTab isInDemoMode={isDemoModeActive} />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-2">고급 설정</h3>
                <p className="text-muted-foreground text-lg">고급 사용자를 위한 테스트 설정</p>
              </div>
              
              <div className="space-y-6">
                <div className="neu-flat rounded-xl px-6 py-6">
                  <Label className="font-semibold text-foreground text-lg">MCP API 엔드포인트</Label>
                  <div className="neu-input rounded-xl px-4 py-3 mt-4">
                    <Input
                      placeholder="https://api.example.com/mcp"
                      className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <p className="text-muted-foreground mt-4">
                    MCP 서버의 API 엔드포인트를 설정하세요
                  </p>
                </div>

                <div className="neu-flat rounded-xl px-6 py-6">
                  <Label className="font-semibold text-foreground text-lg">API 키</Label>
                  <div className="neu-input rounded-xl px-4 py-3 mt-4">
                    <Input
                      type="password"
                      placeholder="YOUR_API_KEY_HERE"
                      className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <p className="text-muted-foreground mt-4">
                    MCP 서비스 인증을 위한 API 키
                  </p>
                </div>

                <div className="neu-flat rounded-xl px-6 py-6">
                  <Label className="font-semibold text-foreground text-lg">웹훅 URL</Label>
                  <div className="neu-input rounded-xl px-4 py-3 mt-4">
                    <Input
                      placeholder="https://your-site.com/webhook"
                      className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <p className="text-muted-foreground mt-4">
                    테스트 완료 시 결과를 전송할 웹훅 URL
                  </p>
                </div>

                <div className="neu-flat rounded-xl px-6 py-6">
                  <Label className="font-semibold text-foreground text-lg">커스텀 헤더</Label>
                  <div className="neu-input rounded-xl px-4 py-3 mt-4">
                    <Textarea
                      placeholder='{"Authorization": "Bearer token", "Custom-Header": "value"}'
                      className="min-h-32 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <p className="text-muted-foreground mt-4">
                    테스트 요청에 포함할 커스텀 헤더 (JSON 형식)
                  </p>
                </div>

                <Alert className="neu-pressed rounded-xl border-none">
                  <Database className="h-5 w-5" />
                  <AlertDescription className="text-muted-foreground">
                    고급 설정을 변경하기 전에 현재 설정을 백업하는 것을 권장합니다. 
                    잘못된 설정이 테스트 작동을 방해할 수 있습니다.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            
          </Tabs>
        </div>
        

      </div>

      {/* 테스트 타입 모달 */}
      <TestTypeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTestType(null);
        }}
        mode={modalMode}
        testType={editingTestType}
        onSave={handleSaveTestType}
        onSwitchChange={handleModalSwitchChange}
      />
    </div>
  );
}

// Define components directly to avoid build issues
function TestTypesTab() {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTestType, setEditingTestType] = useState<TestType | null>(null);

  useEffect(() => {
    loadTestTypes();
  }, []);

  const loadTestTypes = async () => {
    try {
      setIsLoading(true);
      const response = await getTestTypes();
      if (response.success && response.data) {
        setTestTypes(response.data);
      } else {
        setTestTypes([]);
      }
    } catch (error) {
      console.error('Failed to load test types:', error);
      toast.error('테스트 타입을 불러오는데 실패했습니다.');
      setTestTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTestType = () => {
    setModalMode('add');
    setEditingTestType(null);
    setIsModalOpen(true);
  };

  const handleEditTestType = (testType: TestType) => {
    setModalMode('edit');
    setEditingTestType(testType);
    setIsModalOpen(true);
  };

  const handleSaveTestType = async (testTypeData: Partial<TestType>) => {
    try {
      if (modalMode === 'add') {
        await addTestType(testTypeData as any);
        toast.success('테스트 타입이 추가되었습니다.');
      } else {
        await updateTestType(editingTestType!.id, testTypeData as any);
        toast.success('테스트 타입이 수정되었습니다.');
      }
      await loadTestTypes();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save test type:', error);
      toast.error('테스트 타입 저장에 실패했습니다.');
    }
  };

  const handleDeleteTestType = async (id: string) => {
    if (!confirm('이 테스트 타입을 삭제하시겠습니까?')) return;

    try {
      await deleteTestType(id);
      toast.success('테스트 타입이 삭제되었습니다.');
      await loadTestTypes();
    } catch (error) {
      console.error('Failed to delete test type:', error);
      toast.error('테스트 타입 삭제에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>테스트 타입을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-primary mb-2">테스트 타입 관리</h3>
        <p className="text-muted-foreground text-lg">사용 가능한 테스트 타입을 관리하세요</p>
      </div>

      <div className="grid gap-4">
        {testTypes.map((testType) => (
          <Card key={testType.id} className="neu-pressed rounded-xl border-none">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold">{testType.name}</h4>
                    <Badge variant={testType.enabled ? "default" : "secondary"}>
                      {testType.enabled ? "활성" : "비활성"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{testType.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {testType.category}
                    </Badge>
                    {testType.mcp_tool && (
                      <Badge variant="secondary" className="text-xs">
                        {testType.mcp_tool}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTestType(testType)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTestType(testType.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={handleAddTestType} className="neu-pressed rounded-xl border-none">
        <Plus className="h-4 w-4 mr-2" />
        테스트 타입 추가
      </Button>

      <TestTypeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTestType(null);
        }}
        mode={modalMode}
        testType={editingTestType}
        onSave={handleSaveTestType}
        onSwitchChange={async () => {}}
      />
    </div>
  );
}

function LayoutSettingsTab({ isInDemoMode }: { isInDemoMode?: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-primary mb-2">레이아웃 설정</h3>
        <p className="text-muted-foreground text-lg">레이아웃을 구성하세요</p>
      </div>
      <Alert className="neu-pressed rounded-xl border-none">
        <Bell className="h-5 w-5" />
        <AlertDescription className="text-muted-foreground">
          설정 변경사항은 즉시 적용됩니다. 하지만 실행중인 테스트에 즉시 반영되지 않을 수 있습니다.
        </AlertDescription>
      </Alert>
      <TestLayoutCustomizer isInDemoMode={isInDemoMode} />
    </div>
  );
}