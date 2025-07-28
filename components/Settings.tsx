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
import { Plus, Trash2, Edit, Save, Bell, Database, Settings as SettingsIcon, Cog, Shield, Activity, AlertCircle, CheckCircle } from "lucide-react";
import { getTestTypes, addTestType, updateTestType, deleteTestType, type TestType } from "../utils/api";
import { toast } from "sonner";

interface SettingsProps {
  onNavigate?: (tabId: string) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTestType, setIsAddingTestType] = useState(false);
  const [editingTestType, setEditingTestType] = useState<TestType | null>(null);
  const [newTestType, setNewTestType] = useState<Partial<TestType>>({ 
    id: "", 
    name: "", 
    description: "", 
    enabled: true 
  });
  
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
        setTestTypes(result.data);
      } else {
        // API 실패 시에도 데이터가 있으면 사용 (오프라인 모드)
        if (result.data && result.data.length > 0) {
          setTestTypes(result.data);
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

  const handleAddTestType = async () => {
    if (!newTestType.id || !newTestType.name || !newTestType.description) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const result = await addTestType(newTestType as TestType);
      if (result.success) {
        toast.success('테스트 타입이 추가되었습니다.');
        loadTestTypes();
        setNewTestType({ id: "", name: "", description: "", enabled: true });
        setIsAddingTestType(false);
      } else {
        toast.error(result.error || '테스트 타입 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error adding test type:', error);
      toast.error('테스트 타입 추가에 실패했습니다.');
    }
  };

  const handleUpdateTestType = async () => {
    if (!editingTestType) return;

    try {
      const result = await updateTestType(editingTestType.id, {
        name: editingTestType.name,
        description: editingTestType.description,
        enabled: editingTestType.enabled
      });
      
      if (result.success) {
        toast.success('테스트 타입이 수정되었습니다.');
        loadTestTypes();
        setEditingTestType(null);
      } else {
        toast.error(result.error || '테스트 타입 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating test type:', error);
      toast.error('테스트 타입 수정에 실패했습니다.');
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

  const generateTestTypeId = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '')
      .replace(/[가-힣]/g, (char) => {
        // 한글을 영문으로 간단한 변환 (실제로는 더 정교한 변환이 필요)
        const hanToEng: { [key: string]: string } = {
          '성능': 'performance',
          '라이트하우스': 'lighthouse', 
          '부하': 'load',
          '보안': 'security',
          '접근성': 'accessibility'
        };
        for (const [han, eng] of Object.entries(hanToEng)) {
          if (name.includes(han)) return eng;
        }
        return char;
      });
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
                value="general"
                className="flex items-center justify-center rounded-lg px-4 py-4 font-semibold text-base transition-all duration-200 data-[state=active]:neu-button-active data-[state=active]:text-primary-foreground data-[state=active]:bg-primary h-14"
              >
                <Cog className="h-4 w-4 mr-2" />
                일반 설정
              </TabsTrigger>
              <TabsTrigger 
                value="advanced"
                className="flex items-center justify-center rounded-lg px-4 py-4 font-semibold text-base transition-all duration-200 data-[state=active]:neu-button-active data-[state=active]:text-primary-foreground data-[state=active]:bg-primary h-14"
              >
                <Shield className="h-4 w-4 mr-2" />
                고급 설정
              </TabsTrigger>
            </TabsList>

            <TabsContent value="test-types" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-semibold text-primary mb-2">테스트 타입 관리</h3>
                  <p className="text-muted-foreground text-lg">사용 가능한 테스트 타입을 관리합니다</p>
                </div>
                <Dialog open={isAddingTestType} onOpenChange={setIsAddingTestType}>
                  <DialogTrigger asChild>
                    <Button className="neu-accent rounded-xl px-6 py-3 text-primary-foreground font-semibold">
                      <Plus className="h-5 w-5 mr-2" />
                      테스트 타입 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="neu-card border-none max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-primary text-xl">새 테스트 타입 추가</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        새로운 테스트 타입을 시스템에 추가합니다
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                      <div className="space-y-4">
                        <Label className="text-foreground font-semibold text-lg">테스트 타입 ID</Label>
                        <div className="neu-input rounded-xl px-4 py-3">
                          <Input
                            value={newTestType.id}
                            onChange={(e) => setNewTestType({...newTestType, id: e.target.value})}
                            placeholder="예: performance, security"
                            className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">영문, 숫자, 하이픈만 사용 가능합니다.</p>
                      </div>
                      
                      <div className="space-y-4">
                        <Label className="text-foreground font-semibold text-lg">테스트 타입 이름</Label>
                        <div className="neu-input rounded-xl px-4 py-3">
                          <Input
                            value={newTestType.name}
                            onChange={(e) => {
                              setNewTestType({
                                ...newTestType, 
                                name: e.target.value,
                                id: newTestType.id || generateTestTypeId(e.target.value)
                              });
                            }}
                            placeholder="예: 접근성 테스트"
                            className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <Label className="text-foreground font-semibold text-lg">설명</Label>
                        <div className="neu-input rounded-xl px-4 py-3">
                          <Textarea
                            value={newTestType.description}
                            onChange={(e) => setNewTestType({...newTestType, description: e.target.value})}
                            placeholder="예: 웹 접근성 준수 검사"
                            className="min-h-24 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter className="space-x-3">
                      <Button 
                        variant="outline"
                        onClick={() => setIsAddingTestType(false)}
                        className="neu-button rounded-xl px-6 py-3"
                      >
                        취소
                      </Button>
                      <Button 
                        onClick={handleAddTestType} 
                        className="neu-accent rounded-xl px-6 py-3 text-primary-foreground"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        추가
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-16 w-16 mx-auto mb-6 opacity-50 animate-spin" />
                  <p className="font-semibold text-lg mb-2">테스트 타입을 불러오는 중..</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testTypes.map((testType) => (
                    <div key={testType.id} className="neu-flat rounded-xl px-6 py-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <Switch
                            checked={testType.enabled}
                            onCheckedChange={() => handleToggleTestType(testType)}
                            className="data-[state=checked]:bg-primary"
                          />
                          <div>
                            <h4 className="font-semibold text-primary text-lg mb-2">{testType.name}</h4>
                            <p className="text-muted-foreground">{testType.description}</p>
                            <div className="neu-pressed rounded-full px-3 py-1 mt-3 inline-block">
                              <span className="text-xs font-mono text-muted-foreground">ID: {testType.id}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="neu-pressed rounded-full px-4 py-2">
                            <Badge variant={testType.enabled ? "default" : "secondary"} className="font-semibold">
                              {testType.enabled ? "활성화" : "비활성화"}
                            </Badge>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="neu-button rounded-xl px-4 py-3"
                                onClick={() => setEditingTestType(testType)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                수정
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="neu-card border-none max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="text-primary text-xl">테스트 타입 수정</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                  테스트 타입의 정보를 수정합니다
                                </DialogDescription>
                              </DialogHeader>
                              
                              {editingTestType && (
                                <div className="space-y-6 py-4">
                                  <div className="space-y-4">
                                    <Label className="text-foreground font-semibold text-lg">테스트 타입 이름</Label>
                                    <div className="neu-input rounded-xl px-4 py-3">
                                      <Input
                                        value={editingTestType.name}
                                        onChange={(e) => setEditingTestType({...editingTestType, name: e.target.value})}
                                        className="border-none bg-transparent text-foreground"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-4">
                                    <Label className="text-foreground font-semibold text-lg">설명</Label>
                                    <div className="neu-input rounded-xl px-4 py-3">
                                      <Textarea
                                        value={editingTestType.description}
                                        onChange={(e) => setEditingTestType({...editingTestType, description: e.target.value})}
                                        className="min-h-24 border-none bg-transparent resize-none text-foreground"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="neu-pressed rounded-xl px-4 py-4 flex items-center justify-between">
                                    <Label className="text-foreground font-semibold">활성화 상태</Label>
                                    <Switch
                                      checked={editingTestType.enabled}
                                      onCheckedChange={(checked) => setEditingTestType({...editingTestType, enabled: checked})}
                                      className="data-[state=checked]:bg-primary"
                                    />
                                  </div>
                                </div>
                              )}
                              
                              <DialogFooter className="space-x-3">
                                <Button 
                                  variant="outline"
                                  onClick={() => setEditingTestType(null)}
                                  className="neu-button rounded-xl px-6 py-3"
                                >
                                  취소
                                </Button>
                                <Button 
                                  onClick={handleUpdateTestType} 
                                  className="neu-accent rounded-xl px-6 py-3 text-primary-foreground"
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  저장
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteTestType(testType)}
                            className="neu-button rounded-xl px-4 py-3 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {testTypes.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="h-16 w-16 mx-auto mb-6 opacity-50" />
                      <p className="font-semibold text-lg mb-2">등록된 테스트 타입이 없습니다</p>
                      <p className="text-base">새 테스트 타입을 추가해보세요</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="general" className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-2">일반 설정</h3>
                <p className="text-muted-foreground text-lg">기본 테스트 설정을 구성하세요</p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="neu-flat rounded-xl px-6 py-6 flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-foreground text-lg">알림 설정</Label>
                    <p className="text-muted-foreground mt-2">테스트 완료 시 알림 받기</p>
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={setNotifications}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="neu-flat rounded-xl px-6 py-6 flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-foreground text-lg">자동 저장</Label>
                    <p className="text-muted-foreground mt-2">테스트 결과 자동 저장</p>
                  </div>
                  <Switch
                    checked={autoSave}
                    onCheckedChange={setAutoSave}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="neu-flat rounded-xl px-6 py-6">
                  <Label className="font-semibold text-foreground text-lg">최대 동시 테스트 수</Label>
                  <div className="neu-input rounded-xl px-4 py-3 mt-4">
                    <Input
                      type="number"
                      value={maxConcurrentTests}
                      onChange={(e) => setMaxConcurrentTests(Number(e.target.value))}
                      className="border-none bg-transparent text-foreground"
                    />
                  </div>
                </div>

                <div className="neu-flat rounded-xl px-6 py-6">
                  <Label className="font-semibold text-foreground text-lg">기본 타임아웃 (초)</Label>
                  <div className="neu-input rounded-xl px-4 py-3 mt-4">
                    <Input
                      type="number"
                      value={defaultTimeout}
                      onChange={(e) => setDefaultTimeout(Number(e.target.value))}
                      className="border-none bg-transparent text-foreground"
                    />
                  </div>
                </div>
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
        
        {/* MCP 도구 정보 섹션 */}
        <div className="neu-card rounded-3xl px-6 py-8">
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-primary mb-2">MCP 도구 정보</h3>
            <p className="text-muted-foreground text-lg">각 테스트 타입에서 사용하는 MCP(Model Context Protocol) 도구입니다</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="neu-pressed rounded-xl px-6 py-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="neu-pressed rounded-full p-3">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-primary text-lg">성능 테스트</h4>
              </div>
              <div className="space-y-2">
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">Lighthouse CLI</span>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">WebPageTest</span>
                </div>
              </div>
            </div>
            
            <div className="neu-pressed rounded-xl px-6 py-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="neu-pressed rounded-full p-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-primary text-lg">Lighthouse</h4>
              </div>
              <div className="space-y-2">
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">Google Lighthouse</span>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">Lighthouse CI</span>
                </div>
              </div>
            </div>
            
            <div className="neu-pressed rounded-xl px-6 py-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="neu-pressed rounded-full p-3">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-primary text-lg">부하 테스트</h4>
              </div>
              <div className="space-y-2">
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">k6</span>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">Artillery</span>
                </div>
              </div>
            </div>
            
            <div className="neu-pressed rounded-xl px-6 py-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="neu-pressed rounded-full p-3">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-primary text-lg">보안 테스트</h4>
              </div>
              <div className="space-y-2">
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">OWASP ZAP</span>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">Nmap</span>
                </div>
              </div>
            </div>
            
            <div className="neu-pressed rounded-xl px-6 py-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="neu-pressed rounded-full p-3">
                  <AlertCircle className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-primary text-lg">접근성 테스트</h4>
              </div>
              <div className="space-y-2">
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">axe-core</span>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">Pa11y</span>
                </div>
              </div>
            </div>
            
            <div className="neu-pressed rounded-xl px-6 py-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="neu-pressed rounded-full p-3">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-primary text-lg">통합 모니터링</h4>
              </div>
              <div className="space-y-2">
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">Prometheus</span>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-2">
                  <span className="text-sm font-mono text-muted-foreground">Grafana</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <Alert className="neu-pressed rounded-xl border-none">
              <Database className="h-5 w-5" />
              <AlertDescription className="text-muted-foreground">
                각 MCP 도구는 해당 테스트 타입의 특성에 맞춰 별도로 구성됩니다. 
                실제 테스트 실행 시 선택된 도구가 자동으로 사용됩니다.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}