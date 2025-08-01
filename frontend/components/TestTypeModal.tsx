import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Save, Edit, Plus } from "lucide-react";
import { type TestType } from "../utils/api";
import { toast } from "sonner";

interface TestTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  testType?: TestType | null;
  onSave: (testType: Partial<TestType>) => Promise<void>;
}

export function TestTypeModal({ isOpen, onClose, mode, testType, onSave }: TestTypeModalProps) {
  const [formData, setFormData] = useState<Partial<TestType>>({ 
    id: "", 
    name: "", 
    description: "", 
    enabled: true,
    mcp_tool: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  // 모드가 변경되거나 testType이 변경될 때 폼 데이터 초기화
  useEffect(() => {
    if (mode === 'add') {
      setFormData({ id: "", name: "", description: "", enabled: true, mcp_tool: "" });
    } else if (mode === 'edit' && testType) {
      setFormData({
        id: testType.id,
        name: testType.name,
        description: testType.description,
        enabled: testType.enabled,
        mcp_tool: testType.mcp_tool || ""
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
    if (!formData.id || !formData.name || !formData.description || !formData.mcp_tool) {
      toast.error('모든 필드를 입력해주세요.');
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
    setFormData({ id: "", name: "", description: "", enabled: true, mcp_tool: "" });
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
                className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
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
                className="min-h-24 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground"
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
                className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-sm text-muted-foreground">테스트 실행에 사용할 MCP 도구명을 입력하세요. (예: lighthouse, k6, custom-tool)</p>
          </div>

          {mode === 'edit' && (
            <div className="neu-pressed rounded-xl px-4 py-4 flex items-center justify-between">
              <Label className="text-foreground font-semibold">활성화 상태</Label>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
              />
            </div>
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
            disabled={isLoading}
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