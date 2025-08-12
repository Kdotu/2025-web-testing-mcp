import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";


import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Save, Edit, Plus } from "lucide-react";
import { toast } from "sonner";
import { updateTestType, type TestType } from "../utils/backend-api";

interface TestTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  testType?: TestType | null;
  onSave: (testType: Partial<TestType>) => Promise<void>;
  onSwitchChange?: (testTypeData: Partial<TestType>) => Promise<void>;
}

export function TestTypeModal({ isOpen, onClose, mode, testType, onSave, onSwitchChange }: TestTypeModalProps) {
  const [formData, setFormData] = useState<Partial<TestType>>({ 
    id: "", 
    name: "", 
    description: "", 
    enabled: true,
    mcp_tool: "",
    is_locked: false,
    lock_type: 'config' as const
  });
  const [isLoading, setIsLoading] = useState(false);

  // 모드가 변경되거나 testType이 변경될 때 폼 데이터 초기화
  useEffect(() => {
    if (mode === 'add') {
      setFormData({ 
        id: "", 
        name: "", 
        description: "", 
        enabled: true, 
        mcp_tool: "",
        is_locked: false,
        lock_type: 'config'
      });
    } else if (mode === 'edit' && testType) {
      setFormData({
        id: testType.id,
        name: testType.name,
        description: testType.description,
        enabled: testType.enabled,
        mcp_tool: testType.mcp_tool || "",
        is_locked: testType.is_locked || false,
        lock_type: testType.lock_type || 'config' as const
      });
    }
  }, [mode, testType]);

  const generateTestTypeId = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '')
      .replace(/[가-힣]/g, (char) => {
        // 한글을 영문으로 간단한 변환
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

  const handleSubmit = async () => {
    if (!formData.id || !formData.name || !formData.description) {
      toast.error('필수 필드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving test type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ 
      id: "", 
      name: "", 
      description: "", 
      enabled: true, 
      mcp_tool: "",
      is_locked: false,
      lock_type: 'config'
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-none max-w-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-primary text-xl">
            {mode === 'add' ? '새 테스트 타입 추가' : '테스트 타입 수정'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {mode === 'add' 
              ? '새로운 테스트 타입을 시스템에 추가합니다' 
              : '테스트 타입의 정보를 수정합니다'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label className="text-foreground font-semibold text-lg">테스트 타입 ID</Label>
            <div className="neu-input rounded-xl px-4 py-3">
              <Input
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder="예: performance, security"
                className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
                disabled={mode === 'edit'} // 수정 모드에서는 ID 변경 불가
              />
            </div>
            <p className="text-sm text-muted-foreground">영문, 숫자, 하이픈만 사용 가능합니다.</p>
          </div>
          
          <div className="space-y-4">
            <Label className="text-foreground font-semibold text-lg">테스트 타입 이름</Label>
            <div className="neu-input rounded-xl px-4 py-3">
              <Input
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData, 
                    name: e.target.value,
                    id: formData.id || generateTestTypeId(e.target.value)
                  });
                }}
                placeholder="예: 접근성 테스트"
                className={`border-none bg-transparent placeholder:text-muted-foreground ${
                  mode === 'edit' && formData.is_locked 
                    ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                    : 'text-foreground'
                }`}
                disabled={mode === 'edit' && formData.is_locked}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <Label className="text-foreground font-semibold text-lg">설명</Label>
            <div className="neu-input rounded-xl px-4 py-3">
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="예: 웹 접근성 준수 검사"
                className={`min-h-24 border-none bg-transparent resize-none placeholder:text-muted-foreground ${
                  mode === 'edit' && formData.is_locked 
                    ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                    : 'text-foreground'
                }`}
                disabled={mode === 'edit' && formData.is_locked}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-foreground font-semibold text-lg">MCP 도구</Label>
            <div className="neu-input rounded-xl px-4 py-3">
              <Input
                value={formData.mcp_tool}
                onChange={(e) => setFormData({...formData, mcp_tool: e.target.value})}
                placeholder="예: lighthouse, k6, custom-tool"
                className={`border-none bg-transparent placeholder:text-muted-foreground ${
                  mode === 'edit' && formData.is_locked 
                    ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                    : 'text-foreground'
                }`}
                disabled={mode === 'edit' && formData.is_locked}
              />
            </div>
            <p className="text-sm text-muted-foreground">테스트 실행에 사용할 MCP 도구명을 입력하세요. (선택사항, 예: lighthouse, k6, custom-tool)</p>
          </div>

          {mode === 'edit' && (
            <>
              <div className="neu-pressed rounded-xl px-4 py-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">활성화 상태</Label>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={async (checked) => {
                    try {
                      if (testType) {
                        // DB에 즉시 업데이트
                        const result = await updateTestType(testType.id, {
                          enabled: checked
                        });

                        if (result.success) {
                          // 성공 시 로컬 상태 업데이트
                          setFormData(prev => ({...prev, enabled: checked}));
                          
                          // 부모 컴포넌트에 즉시 업데이트 알림
                          if (onSwitchChange) {
                            // 현재 formData 상태를 기반으로 업데이트된 데이터 전달
                            const updatedData = {
                              ...formData,
                              enabled: checked
                            };
                            await onSwitchChange(updatedData);
                          }
                          
                          // 성공 메시지 표시
                          const status = checked ? '활성화' : '비활성화';
                          toast.success(`✅ ${testType.name}이(가) 성공적으로 ${status}되었습니다.`);
                        } else {
                          // 실패 시 Switch 상태를 원래대로 되돌리기
                          console.error('Failed to update enabled status:', result.error);
                          toast.error(`활성화 상태 변경에 실패했습니다: ${result.error}`);
                          
                          // Switch 상태를 원래대로 되돌리기
                          setFormData(prev => ({
                            ...prev,
                            enabled: !checked // 원래 상태로 되돌리기
                          }));
                        }
                      } else {
                        // 새로 추가하는 경우 로컬 상태만 업데이트
                        setFormData(prev => ({...prev, enabled: checked}));
                      }
                    } catch (error) {
                      console.error('Error updating enabled status:', error);
                      toast.error('활성화 상태 변경 중 오류가 발생했습니다.');
                      
                      // 에러 시 Switch 상태를 원래대로 되돌리기
                      setFormData(prev => ({
                        ...prev,
                        enabled: !checked // 원래 상태로 되돌리기
                      }));
                    }
                  }}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
                />
              </div>
              
              <div className="neu-pressed rounded-xl px-4 py-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">잠금 상태</Label>
                  <p className="text-sm text-muted-foreground">
                    잠금 설정 시 테스트 타입의 수정 및 삭제가 불가능합니다
                  </p>
                </div>
                <Switch
                  checked={formData.is_locked}
                  onCheckedChange={async (checked) => {
                    // 잠금 상태 변경 시 즉시 DB에 반영
                    try {
                      if (testType) {
                        // DB에 즉시 업데이트
                        const result = await updateTestType(testType.id, {
                          is_locked: checked,
                          // 잠금 상태가 true가 되면 활성화 상태도 true로 고정
                          enabled: checked ? true : formData.enabled
                        });

                        if (result.success) {
                          // 성공 시 로컬 상태 업데이트
                          setFormData(prev => ({
                            ...prev, 
                            is_locked: checked,
                            enabled: checked ? true : prev.enabled
                          }));
                          
                          // 부모 컴포넌트에 즉시 업데이트 알림
                          if (onSwitchChange) {
                            // 현재 formData 상태를 기반으로 업데이트된 데이터 전달
                            const updatedData = {
                              ...formData,
                              is_locked: checked,
                              enabled: checked ? true : formData.enabled
                            };
                            await onSwitchChange(updatedData);
                          }
                          
                          // 성공 메시지 표시
                          const action = checked ? '잠금' : '잠금 해제';
                          toast.success(`🔒 ${testType.name}이(가) 성공적으로 ${action}되었습니다.`);
                        } else {
                          // 실패 시 Switch 상태를 원래대로 유지 (변경하지 않음)
                          console.error('Failed to update lock status:', result.error);
                          toast.error(`잠금 상태 변경에 실패했습니다: ${result.error}`);
                          
                          // Switch 상태를 원래대로 되돌리기
                          setFormData(prev => ({
                            ...prev,
                            is_locked: !checked, // 원래 상태로 되돌리기
                            enabled: prev.enabled
                          }));
                        }
                      } else {
                        // 새로 추가하는 경우 로컬 상태만 업데이트
                        setFormData(prev => ({
                          ...prev, 
                          is_locked: checked,
                          enabled: checked ? true : prev.enabled
                        }));
                      }
                    } catch (error) {
                      console.error('Error updating lock status:', error);
                      toast.error('잠금 상태 변경 중 오류가 발생했습니다.');
                      
                      // 에러 시 Switch 상태를 원래대로 되돌리기
                      setFormData(prev => ({
                        ...prev,
                        is_locked: !checked, // 원래 상태로 되돌리기
                        enabled: prev.enabled
                      }));
                    }
                  }}
                  className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-muted"
                />
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="space-x-3">
          <Button 
            variant="outline"
            onClick={handleClose}
            className="neu-button rounded-xl px-6 py-3"
            disabled={isLoading}
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="neu-accent rounded-xl px-6 py-3 text-primary-foreground"
            disabled={isLoading || (mode === 'edit' && formData.is_locked)}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : mode === 'add' ? (
              <Plus className="h-4 w-4 mr-2" />
            ) : (
              <Edit className="h-4 w-4 mr-2" />
            )}
            {mode === 'add' ? '추가' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 