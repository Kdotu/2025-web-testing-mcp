import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Settings, 
  Layout, 
  Eye, 
  EyeOff, 
  GripVertical,
  Move,
  Copy,
  Palette,
  Grid3X3
} from 'lucide-react';
import { toast } from 'sonner';

interface LayoutField {
  id: string;
  name: string;
  type: 'input' | 'select' | 'switch' | 'textarea' | 'number' | 'range';
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  required?: boolean;
  visible: boolean;
  order: number;
  width?: 'full' | 'half' | 'third' | 'quarter';
  description?: string;
  sectionId?: string;
}

interface LayoutSection {
  id: string;
  name: string;
  title: string;
  description?: string;
  order: number;
  isCollapsible: boolean;
  isExpanded: boolean;
  fields: LayoutField[];
}

interface DragDropLayoutEditorProps {
  testType: string;
  initialFields?: LayoutField[];
  onSave: (sections: LayoutSection[]) => void;
  onCancel: () => void;
}

// 드래그 가능한 필드 아이템 컴포넌트
const SortableFieldItem = React.forwardRef<HTMLDivElement, { 
  field: LayoutField; 
  onUpdate: (fieldId: string, updates: Partial<LayoutField>) => void;
  onRemove: (fieldId: string) => void;
  onEdit: (field: LayoutField) => void;
}>(({ field, onUpdate, onRemove, onEdit }, ref) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef}>
      <Card 
        style={style}
        className={`p-4 cursor-move ${isDragging ? 'shadow-lg' : ''}`}
      >
      <div className="flex items-start gap-4">
        {/* 드래그 핸들 */}
        <div 
          {...attributes} 
          {...listeners}
          className="flex flex-col gap-1 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* 필드 정보 */}
        <div className="flex-1 grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">필드명 *</Label>
            <Input
              value={field.name}
              onChange={(e) => onUpdate(field.id, { name: e.target.value })}
              placeholder="field_name"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label className="text-xs">라벨 *</Label>
            <Input
              value={field.label}
              onChange={(e) => onUpdate(field.id, { label: e.target.value })}
              placeholder="표시 이름"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label className="text-xs">타입</Label>
            <Select value={field.type} onValueChange={(value: any) => onUpdate(field.id, { type: value })}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="input">텍스트 입력</SelectItem>
                <SelectItem value="select">선택박스</SelectItem>
                <SelectItem value="switch">스위치</SelectItem>
                <SelectItem value="textarea">여러줄 텍스트</SelectItem>
                <SelectItem value="number">숫자</SelectItem>
                <SelectItem value="range">범위</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs">너비</Label>
            <Select value={field.width || 'full'} onValueChange={(value: any) => onUpdate(field.id, { width: value })}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">전체</SelectItem>
                <SelectItem value="half">절반</SelectItem>
                <SelectItem value="third">1/3</SelectItem>
                <SelectItem value="quarter">1/4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* 필드 제어 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              id={`visible-${field.id}`}
              checked={field.visible}
              onCheckedChange={(checked) => onUpdate(field.id, { visible: checked })}
              size="sm"
            />
            <Label htmlFor={`visible-${field.id}`} className="text-xs">
              표시
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id={`required-${field.id}`}
              checked={field.required || false}
              onCheckedChange={(checked) => onUpdate(field.id, { required: checked })}
              size="sm"
            />
            <Label htmlFor={`required-${field.id}`} className="text-xs">
              필수
            </Label>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(field)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(field.id)}
              className="text-destructive hover:text-destructive h-8 w-8 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        </div>
      </Card>
    </div>
  );
});

// 필드 편집 모달
function FieldEditModal({ 
  field, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  field: LayoutField | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (field: LayoutField) => void;
}) {
  const [editedField, setEditedField] = useState<LayoutField | null>(null);
  const [optionsText, setOptionsText] = useState('');

  useEffect(() => {
    if (field) {
      setEditedField({ ...field });
      // 옵션 텍스트 초기화
      if (field.options && field.options.length > 0) {
        setOptionsText(field.options.map(opt => `${opt.value}:${opt.label}`).join('\n'));
      } else {
        setOptionsText('');
      }
    }
  }, [field]);

  if (!isOpen || !editedField) return null;

  const handleSave = () => {
    // 옵션 파싱
    if (editedField.type === 'select' && optionsText.trim()) {
      try {
        const options = optionsText.split('\n').map(line => {
          const [value, label] = line.split(':');
          return { value: value?.trim() || '', label: label?.trim() || value?.trim() || '' };
        }).filter(opt => opt.value);
        setEditedField({ ...editedField, options });
      } catch (error) {
        console.error('옵션 파싱 오류:', error);
      }
    }
    
    onSave(editedField);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        <CardHeader className="sticky top-0 bg-background border-b z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">필드 편집</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fieldName">필드명 *</Label>
              <Input
                id="fieldName"
                value={editedField.name}
                onChange={(e) => setEditedField({ ...editedField, name: e.target.value })}
                placeholder="field_name"
              />
            </div>
            <div>
              <Label htmlFor="fieldLabel">라벨 *</Label>
              <Input
                id="fieldLabel"
                value={editedField.label}
                onChange={(e) => setEditedField({ ...editedField, label: e.target.value })}
                placeholder="표시 이름"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fieldType">타입</Label>
              <Select 
                value={editedField.type} 
                onValueChange={(value: any) => setEditedField({ ...editedField, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">텍스트 입력</SelectItem>
                  <SelectItem value="select">선택박스</SelectItem>
                  <SelectItem value="switch">스위치</SelectItem>
                  <SelectItem value="textarea">여러줄 텍스트</SelectItem>
                  <SelectItem value="number">숫자</SelectItem>
                  <SelectItem value="range">범위</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fieldWidth">너비</Label>
              <Select 
                value={editedField.width || 'full'} 
                onValueChange={(value: any) => setEditedField({ ...editedField, width: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">전체</SelectItem>
                  <SelectItem value="half">절반</SelectItem>
                  <SelectItem value="third">1/3</SelectItem>
                  <SelectItem value="quarter">1/4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="fieldPlaceholder">
              {editedField.type === 'select' ? '옵션 목록' : '플레이스홀더'}
            </Label>
            {editedField.type === 'select' ? (
              <div className="space-y-2">
                <Textarea
                  id="fieldPlaceholder"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="value:label 형식으로 입력하세요&#10;예:&#10;desktop:데스크톱&#10;mobile:모바일"
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  각 줄에 "값:라벨" 형식으로 입력하세요. 예: desktop:데스크톱
                </p>
              </div>
            ) : (
              <Input
                id="fieldPlaceholder"
                value={editedField.placeholder || ''}
                onChange={(e) => setEditedField({ ...editedField, placeholder: e.target.value })}
                placeholder="플레이스홀더 텍스트"
              />
            )}
          </div>

          <div>
            <Label htmlFor="fieldDescription">설명</Label>
            <Textarea
              id="fieldDescription"
              value={editedField.description || ''}
              onChange={(e) => setEditedField({ ...editedField, description: e.target.value })}
              placeholder="필드 설명"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="fieldRequired"
                checked={editedField.required || false}
                onCheckedChange={(checked) => setEditedField({ ...editedField, required: checked })}
              />
              <Label htmlFor="fieldRequired">필수</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="fieldVisible"
                checked={editedField.visible}
                onCheckedChange={(checked) => setEditedField({ ...editedField, visible: checked })}
              />
              <Label htmlFor="fieldVisible">표시</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              저장
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 필드 편집 모달 (컴포넌트 루트에 배치하여 상태 참조 오류 방지) */}
      <FieldEditModal
        field={selectedField}
        isOpen={isFieldEditModalOpen}
        onClose={() => {
          setIsFieldEditModalOpen(false);
          setSelectedField(null);
        }}
        onSave={handleFieldSave}
      />
    </div>
  );
}

// 드래그 오버레이 컴포넌트
function DragOverlayContent({ field }: { field: LayoutField }) {
  return (
    <Card className="p-4 shadow-lg border-2 border-primary">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-primary" />
        <span className="font-medium">{field.label}</span>
        <Badge variant="outline" className="text-xs">
          {field.type}
        </Badge>
      </div>
    </Card>
  );
}

export function DragDropLayoutEditor({ 
  testType, 
  initialFields = [], 
  onSave, 
  onCancel 
}: DragDropLayoutEditorProps) {
  const [sections, setSections] = useState<LayoutSection[]>([]);
  const [activeField, setActiveField] = useState<LayoutField | null>(null);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [selectedField, setSelectedField] = useState<LayoutField | null>(null);
  const [isFieldEditModalOpen, setIsFieldEditModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 초기 데이터 로드
  useEffect(() => {
    if (initialFields.length > 0) {
      // 기존 필드들을 기본 섹션으로 그룹화
      const defaultSection: LayoutSection = {
        id: 'default-section',
        name: 'default',
        title: '기본 설정',
        description: '기본 테스트 설정',
        order: 1,
        isCollapsible: false,
        isExpanded: true,
        fields: initialFields.map((field, index) => ({
          ...field,
          order: index + 1,
          sectionId: 'default-section'
        }))
      };
      setSections([defaultSection]);
    } else {
      // 기본 섹션 생성
      const defaultSection: LayoutSection = {
        id: 'default-section',
        name: 'default',
        title: '기본 설정',
        description: '기본 테스트 설정',
        order: 1,
        isCollapsible: false,
        isExpanded: true,
        fields: []
      };
      setSections([defaultSection]);
    }
  }, [initialFields]);

  // 필드 업데이트
  const handleUpdateField = (fieldId: string, updates: Partial<LayoutField>) => {
    setSections(prevSections => 
      prevSections.map(section => ({
        ...section,
        fields: section.fields.map(field =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }))
    );
  };

  // 필드 삭제
  const handleRemoveField = (fieldId: string) => {
    setSections(prevSections => 
      prevSections.map(section => ({
        ...section,
        fields: section.fields.filter(field => field.id !== fieldId)
      }))
    );
  };

  // 필드 편집
  const handleEditField = (field: LayoutField) => {
    setSelectedField(field);
    setIsFieldEditModalOpen(true);
  };

  // 필드 저장
  const handleFieldSave = (updatedField: LayoutField) => {
    setSections(prevSections => 
      prevSections.map(section => ({
        ...section,
        fields: section.fields.map(field => 
          field.id === updatedField.id ? updatedField : field
        )
      }))
    );
    toast.success('필드가 업데이트되었습니다.');
  };

  // 필드 추가
  const handleAddField = (sectionId: string) => {
    const newField: LayoutField = {
      id: `field-${Date.now()}`,
      name: '',
      type: 'input',
      label: '',
      placeholder: '',
      required: false,
      visible: true,
      order: 0,
      width: 'full',
      sectionId
    };

    setSections(prevSections => 
      prevSections.map(section => {
        if (section.id === sectionId) {
          const maxOrder = Math.max(...section.fields.map(f => f.order), 0);
          return {
            ...section,
            fields: [...section.fields, { ...newField, order: maxOrder + 1 }]
          };
        }
        return section;
      })
    );
  };

  // 섹션 추가
  const handleAddSection = () => {
    if (!newSectionName.trim() || !newSectionTitle.trim()) {
      toast.error('섹션 이름과 제목을 입력해주세요.');
      return;
    }

    const newSection: LayoutSection = {
      id: `section-${Date.now()}`,
      name: newSectionName,
      title: newSectionTitle,
      description: '',
      order: sections.length + 1,
      isCollapsible: true,
      isExpanded: true,
      fields: []
    };

    setSections(prevSections => [...prevSections, newSection]);
    setNewSectionName('');
    setNewSectionTitle('');
    setIsAddingSection(false);
  };

  // 섹션 삭제
  const handleRemoveSection = (sectionId: string) => {
    if (sections.length <= 1) {
      toast.error('최소 하나의 섹션은 유지해야 합니다.');
      return;
    }

    setSections(prevSections => 
      prevSections.filter(section => section.id !== sectionId)
    );
  };

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const field = sections
      .flatMap(section => section.fields)
      .find(field => field.id === active.id);
    setActiveField(field || null);
  };

  // 드래그 종료
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveField(null);

    if (!over) return;

    const activeField = sections
      .flatMap(section => section.fields)
      .find(field => field.id === active.id);

    if (!activeField) return;

    // 같은 섹션 내에서의 순서 변경
    const activeSection = sections.find(section => 
      section.fields.some(field => field.id === active.id)
    );
    const overSection = sections.find(section => 
      section.fields.some(field => field.id === over.id)
    );

    if (activeSection && overSection && activeSection.id === overSection.id) {
      const oldIndex = activeSection.fields.findIndex(field => field.id === active.id);
      const newIndex = overSection.fields.findIndex(field => field.id === over.id);

      if (oldIndex !== newIndex) {
        setSections(prevSections => 
          prevSections.map(section => {
            if (section.id === activeSection.id) {
              const newFields = arrayMove(section.fields, oldIndex, newIndex);
              // 순서 재정렬
              newFields.forEach((field, index) => {
                field.order = index + 1;
              });
              return { ...section, fields: newFields };
            }
            return section;
          })
        );
      }
    }
  };

  // 저장
  const handleSave = () => {
    // 필드 검증
    const allFields = sections.flatMap(section => section.fields);
    const invalidFields = allFields.filter(field => 
      !field.name.trim() || !field.label.trim()
    );

    if (invalidFields.length > 0) {
      toast.error('모든 필드의 이름과 라벨을 입력해주세요.');
      return;
    }

    onSave(sections);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">레이아웃 편집기</h2>
          <p className="text-muted-foreground">
            {testType} 테스트의 설정 레이아웃을 드래그 앤 드롭으로 구성하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      {/* 섹션 목록 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  <Badge variant="outline">{section.fields.length}개 필드</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField(section.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    필드 추가
                  </Button>
                  {sections.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveSection(section.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {section.description && (
                <p className="text-muted-foreground mb-4">{section.description}</p>
              )}

              {/* 필드 목록 */}
              <SortableContext 
                items={section.fields.map(field => field.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {section.fields.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      onUpdate={handleUpdateField}
                      onRemove={handleRemoveField}
                      onEdit={handleEditField}
                    />
                  ))}
                </div>
              </SortableContext>

              {section.fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>이 섹션에 필드를 추가해보세요.</p>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* 드래그 오버레이 */}
        <DragOverlay>
          {activeField ? <DragOverlayContent field={activeField} /> : null}
        </DragOverlay>
      </DndContext>

      {/* 새 섹션 추가 */}
      <Card className="p-6 border-dashed">
        {isAddingSection ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sectionName">섹션 이름 *</Label>
                <Input
                  id="sectionName"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="section_name"
                />
              </div>
              <div>
                <Label htmlFor="sectionTitle">섹션 제목 *</Label>
                <Input
                  id="sectionTitle"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="섹션 제목"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddSection}>
                <Plus className="h-4 w-4 mr-2" />
                섹션 추가
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingSection(false);
                  setNewSectionName('');
                  setNewSectionTitle('');
                }}
              >
                취소
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => setIsAddingSection(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 섹션 추가
          </Button>
        )}
      </Card>
    </div>
  );
}
