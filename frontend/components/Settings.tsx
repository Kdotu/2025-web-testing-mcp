import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Plus, Trash2, Edit, Save, Bell, Database, Settings as SettingsIcon, Cog, Activity, CheckCircle, Shield, AlertCircle, Lock, Unlock } from "lucide-react";
import { getTestTypes, addTestType, updateTestType, deleteTestType, type TestType, isDemoMode } from "../utils/api";
import { toast } from "sonner";
import { TestTypeModal } from "./TestTypeModal";

interface SettingsProps {
  onNavigate?: (tabId: string) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTestType, setEditingTestType] = useState<TestType | null>(null);
  
  // 일반 설정
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [maxConcurrentTests, setMaxConcurrentTests] = useState(3);
  const [defaultTimeout, setDefaultTimeout] = useState(30);

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
        setTestTypes(sortedTestTypes);
      } else {
        // API 실패 시에도 데이터가 있으면 사용 (오프라인 모드)
        if (result.data && result.data.length > 0) {
          const sortedTestTypes = sortTestTypesByCategory(result.data);
          setTestTypes(sortedTestTypes);
        } else {
          toast.error('테스트 타입을 불러오는데 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Error loading test types:', error);
      toast.error('테스트 타입을 불러오는데 실패했습니다.');
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
          toast.success('테스트 타입이 추가되었습니다.');
          loadTestTypes();
        } else {
          toast.error(result.error || '테스트 타입 추가에 실패했습니다.');
        }
      } else {
        if (!editingTestType) return;
        const result = await updateTestType(editingTestType.id, {
          name: testTypeData.name!,
          description: testTypeData.description!,
          enabled: testTypeData.enabled!,
          mcp_tool: testTypeData.mcp_tool || '',
          is_locked: testTypeData.is_locked,
          lock_type: testTypeData.lock_type || 'config'
        });
        
        if (result.success) {
          toast.success('테스트 타입이 수정되었습니다.');
          loadTestTypes();
        } else {
          toast.error(result.error || '테스트 타입 수정에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Error saving test type:', error);
      toast.error('테스트 타입 저장에 실패했습니다.');
    }
  };



  const handleToggleTestType = async (testType: TestType) => {
    try {
      const result = await updateTestType(testType.id, {
        enabled: !testType.enabled
      });
      
      if (result.success) {
        loadTestTypes();
        toast.success(`${testType.name}이(가) ${!testType.enabled ? '활성화' : '비활성화'}되었습니다.`);
      } else {
        toast.error(result.error || '테스트 타입 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error toggling test type:', error);
      toast.error('테스트 타입 상태 변경에 실패했습니다.');
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
        toast.success('테스트 타입이 삭제되었습니다.');
        loadTestTypes();
      } else {
        toast.error(result.error || '테스트 타입 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting test type:', error);
      toast.error('테스트 타입 삭제에 실패했습니다.');
    }
  };





  return (
    <div className="w-full flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-8 mx-auto">
        <div className="neu-card rounded-3xl px-8 py-6 shadow-[0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(99,102,241,0.4)]">
          <h1 className="text-4xl font-bold text-primary mb-4">설정</h1>
          <p className="text-muted-foreground text-lg">테스트 설정을 관리하고 테스트 타입을 구성하세요</p>
        </div>

        <div className="neu-card rounded-3xl px-6 py-8">
          <Tabs defaultValue="test-types" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 neu-flat rounded-xl p-1.5 gap-1.5 h-auto">
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
                <Activity className="h-4 w-4 mr-2" />
                테스트 설정
              </TabsTrigger>
            </TabsList>

            <TabsContent value="test-types" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-semibold text-primary mb-2">테스트 타입 관리</h3>
                  <p className="text-muted-foreground text-lg">사용 가능한 테스트 타입을 관리합니다</p>
                </div>
                <Button 
                  className="neu-accent rounded-xl px-6 py-3 text-primary-foreground font-semibold" 
                  onClick={() => {
                    setModalMode('add');
                    setEditingTestType(null);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  테스트 타입 추가
                </Button>
              </div>
              
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-16 w-16 mx-auto mb-6 opacity-50 animate-spin" />
                  <p className="font-semibold text-lg mb-2">테스트 타입을 불러오는 중..</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupTestTypesByCategory(testTypes).map((group) => (
                    <div key={group.category} className="space-y-4">
                      {group.category && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <h4 className="text-lg font-semibold text-primary capitalize">
                            {group.category === 'builtin' ? '기본 제공' : 
                             group.category === 'custom' ? '사용자 정의' :
                             group.category}
                          </h4>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        {group.testTypes.map((testType) => (
                          <div key={testType.id} className="neu-flat rounded-xl px-6 py-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-6">
                                <Switch
                                  checked={testType.enabled}
                                  onCheckedChange={() => handleToggleTestType(testType)}
                                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
                                />
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="neu-pressed rounded-full p-2 mr-2">
                                      {getTestTypeIcon(testType)}
                                    </div>
                                    <h4 className="font-semibold text-primary text-lg">{testType.name}</h4>
                                  </div>
                                  <p className="text-muted-foreground">{testType.description}</p>
                                  <div className="flex items-center space-x-3 mt-3">
                                    <div className="neu-pressed rounded-full px-3 py-1">
                                      <span className="text-xs font-mono text-muted-foreground">ID: {testType.id}</span>
                                    </div>
                                    {testType.category && (
                                      <div className="neu-pressed rounded-full px-3 py-1">
                                        <span className="text-xs font-mono text-primary" style={{ color: testType.color }}>
                                          {testType.category}
                                        </span>
                                      </div>
                                    )}
                                    {testType.mcp_tool && (
                                      <div className="neu-pressed rounded-full px-3 py-1">
                                        <span className="text-xs font-mono text-primary">MCP: {testType.mcp_tool}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="flex flex-col items-center space-y-2">
                                  {testType.is_locked ? (
                                    <Lock className="h-5 w-5 text-orange-500" />
                                  ) : (
                                    <Unlock className="h-5 w-5 text-green-500" />
                                  )}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="neu-button rounded-xl px-4 py-3"
                                  onClick={() => {
                                    setModalMode('edit');
                                    setEditingTestType(testType);
                                    setIsModalOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  수정
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteTestType(testType)}
                                  disabled={testType.is_locked}
                                  className="neu-button rounded-xl px-4 py-3 text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  삭제
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {testTypes.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="h-16 w-16 mx-auto mb-6 opacity-50" />
                      <p className="font-semibold text-lg mb-2">
                        {isDemoMode() ? '데모 모드: 기본 제공 테스트 타입이 없습니다' : '등록된 테스트 타입이 없습니다'}
                      </p>
                      <p className="text-base">
                        {isDemoMode() ? '데모 모드에서는 기본 제공 테스트 타입만 사용할 수 있습니다' : '새 테스트 타입을 추가해보세요'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="test-settings" className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-2">일반 설정</h3>
                <p className="text-muted-foreground text-lg">기본 테스트 설정을 구성하세요</p>
              </div>
              <Alert className="neu-pressed rounded-xl border-none">
                <Bell className="h-5 w-5" />
                <AlertDescription className="text-muted-foreground">
                  설정 변경사항은 즉시 적용됩니다. 하지만 설정이 실행중인 테스트에 즉시 반영되지 않을 수 있습니다.
                </AlertDescription>
              </Alert>
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
      />
    </div>
  );
}