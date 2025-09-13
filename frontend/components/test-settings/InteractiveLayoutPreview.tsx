import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, 
  EyeOff, 
  Monitor, 
  Smartphone, 
  Tablet,
  Settings,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Edit,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';
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

interface InteractiveLayoutPreviewProps {
  sections: LayoutSection[];
  testType: string;
  onSectionsChange?: (sections: LayoutSection[]) => void;
  onFieldChange?: (fieldName: string, value: any) => void;
  values?: Record<string, any>;
  // 외부 패널에서 편집을 처리하고 싶은 경우 제공
  onEditField?: (field: LayoutField) => void;
  onAddSection?: () => void;
  onAddFieldToSection?: (sectionId: string) => void;
  // 새로운 props
  isRealTimeEditing?: boolean;
  selectedDevice?: 'desktop' | 'tablet' | 'mobile';
}

// 드래그 가능한 필드 아이템 컴포넌트
const SortableFieldItem = React.forwardRef<HTMLDivElement, { 
  field: LayoutField; 
  value: any; 
  onChange: (value: any) => void;
  onEdit: () => void;
  isSelected?: boolean;
}>(({ field, value, onChange, onEdit, isSelected = false }, ref) => {
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

  const getWidthClass = (width?: string) => {
    switch (width) {
      case 'half': return 'w-1/2';
      case 'third': return 'w-1/3';
      case 'quarter': return 'w-1/4';
      default: return 'w-full';
    }
  };

  const renderField = () => {
    switch (field.type) {
      case 'input':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full"
          />
        );
      
      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder || '선택하세요'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value || false}
              onCheckedChange={onChange}
            />
            <Label className="text-sm text-muted-foreground">
              {value ? '활성' : '비활성'}
            </Label>
          </div>
        );
      
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full"
            rows={3}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full"
          />
        );
      
      case 'range':
        return (
          <div className="space-y-2">
            <Input
              type="range"
              value={value || 0}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-center">
              {value || 0}
            </div>
          </div>
        );
      
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full"
          />
        );
    }
  };

  if (!field.visible) return null;

  return (
    <div ref={setNodeRef}>
      <Card 
        style={style}
        className={`p-4 cursor-move transition-all ${isSelected ? 'ring-2 ring-primary' : ''} ${isDragging ? 'shadow-lg' : ''}`}
        onClick={onEdit}
      >
      <div className="flex items-start gap-3">
        {/* 드래그 핸들 */}
        <div 
          {...attributes} 
          {...listeners}
          className="flex flex-col gap-1 cursor-grab active:cursor-grabbing mt-1"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* 필드 내용 */}
        <div className={`flex-1 space-y-2 ${getWidthClass(field.width)}`}>
          <div className="flex items-center justify-between">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-6 w-6 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
          {renderField()}
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
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
    </div>
  );
}

export function InteractiveLayoutPreview({ 
  sections, 
  testType, 
  onSectionsChange,
  onFieldChange,
  values = {},
  onEditField,
  onAddSection,
  onAddFieldToSection,
  isRealTimeEditing = true,
  selectedDevice = 'desktop'
}: InteractiveLayoutPreviewProps) {
  const [previewValues, setPreviewValues] = useState<Record<string, any>>(values);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections?.map(section => section.id) || [])
  );
  const [selectedField, setSelectedField] = useState<LayoutField | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeField, setActiveField] = useState<LayoutField | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 초기값 설정
  useEffect(() => {
    if (!sections || sections.length === 0) return;
    
    const initialValues: Record<string, any> = {};
    sections.forEach(section => {
      if (section.fields) {
        section.fields.forEach(field => {
          if (field.defaultValue !== undefined) {
            initialValues[field.name] = field.defaultValue;
          }
        });
      }
    });
    setPreviewValues({ ...initialValues, ...values });
  }, [sections, values]);

  // 필드 값 변경
  const handleFieldChange = (fieldName: string, value: any) => {
    setPreviewValues(prev => ({ ...prev, [fieldName]: value }));
    if (onFieldChange) {
      onFieldChange(fieldName, value);
    }
  };

  // 필드 편집
  const handleFieldEdit = (field: LayoutField) => {
    if (onEditField) {
      onEditField(field);
      return;
    }
    setSelectedField(field);
    setIsEditModalOpen(true);
  };

  // 필드 저장
  const handleFieldSave = (updatedField: LayoutField) => {
    if (!onSectionsChange) return;

    const updatedSections = sections.map(section => ({
      ...section,
      fields: section.fields.map(field => 
        field.id === updatedField.id ? updatedField : field
      )
    }));

    onSectionsChange(updatedSections);
    toast.success('필드가 업데이트되었습니다.');
  };

  // 섹션 토글
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (!sections) return;
    
    const field = sections
      .flatMap(section => section.fields || [])
      .find(field => field.id === active.id);
    setActiveField(field || null);
  };

  // 드래그 종료
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveField(null);

    if (!over || !onSectionsChange || !sections) return;

    const activeField = sections
      .flatMap(section => section.fields || [])
      .find(field => field.id === active.id);

    if (!activeField) return;

    // 같은 섹션 내에서의 순서 변경
    const activeSection = sections.find(section => 
      section.fields?.some(field => field.id === active.id)
    );
    const overSection = sections.find(section => 
      section.fields?.some(field => field.id === over.id)
    );

    if (activeSection && overSection && activeSection.id === overSection.id && activeSection.fields && overSection.fields) {
      const oldIndex = activeSection.fields.findIndex(field => field.id === active.id);
      const newIndex = overSection.fields.findIndex(field => field.id === over.id);

      if (oldIndex !== newIndex) {
        const updatedSections = sections.map(section => {
          if (section.id === activeSection.id && section.fields) {
            const newFields = arrayMove(section.fields, oldIndex, newIndex);
            // 순서 재정렬
            newFields.forEach((field, index) => {
              field.order = index + 1;
            });
            return { ...section, fields: newFields };
          }
          return section;
        });

        onSectionsChange(updatedSections);
      }
    }
  };

  // 정렬된 섹션
  const sortedSections = sections ? [...sections].sort((a, b) => a.order - b.order) : [];

  // 정렬된 필드
  const getSortedFields = (fields: LayoutField[]) => {
    return [...fields].sort((a, b) => a.order - b.order);
  };

  // 그리드 레이아웃 계산
  const getGridLayout = (fields: LayoutField[]) => {
    const visibleFields = fields.filter(field => field.visible);
    const rows: LayoutField[][] = [];
    let currentRow: LayoutField[] = [];
    let currentRowWidth = 0;

    visibleFields.forEach(field => {
      const fieldWidth = field.width === 'half' ? 0.5 : 
                        field.width === 'third' ? 0.33 : 
                        field.width === 'quarter' ? 0.25 : 1;
      
      if (currentRowWidth + fieldWidth > 1) {
        rows.push([...currentRow]);
        currentRow = [field];
        currentRowWidth = fieldWidth;
      } else {
        currentRow.push(field);
        currentRowWidth += fieldWidth;
      }
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  };

  const getViewModeClass = () => {
    switch (selectedDevice) {
      case 'tablet': return 'max-w-2xl';
      case 'mobile': return 'max-w-sm';
      default: return 'max-w-4xl';
    }
  };

  return (
    <div className="space-y-6">
      {/* 미리보기 컨테이너 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`mx-auto ${getViewModeClass()}`}>
          <Card className="p-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {testType} 설정
              </CardTitle>
              <CardDescription>
                테스트 실행을 위한 설정을 구성하세요. 필드를 드래그하여 순서를 변경하고, 클릭하여 편집하세요.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {sortedSections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const sortedFields = getSortedFields(section.fields);
                const visibleFields = sortedFields.filter(field => field.visible);
                
                if (visibleFields.length === 0) return null;

                return (
                  <div key={section.id} className="space-y-4">
                    {/* 섹션 헤더 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium">{section.title}</h4>
                        {section.description && (
                          <p className="text-sm text-muted-foreground">
                            {section.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {onAddFieldToSection && (
                          <Button size="sm" variant="outline" onClick={() => onAddFieldToSection(section.id)}>필드 추가</Button>
                        )}
                        {section.isCollapsible && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection(section.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        )}
                      </div>
                    </div>

                    {/* 섹션 필드들 */}
                    {isExpanded && (
                      <SortableContext 
                        items={visibleFields.map(field => field.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4">
                          {getGridLayout(visibleFields).map((row, rowIndex) => (
                            <div key={rowIndex} className="flex flex-wrap gap-4">
                              {row.map((field) => (
                                <SortableFieldItem
                                  key={field.id}
                                  field={field}
                                  value={previewValues[field.name]}
                                  onChange={(value) => handleFieldChange(field.name, value)}
                                  onEdit={() => handleFieldEdit(field)}
                                  isSelected={selectedField?.id === field.id}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>
                );
              })}

              {sections.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>설정할 필드가 없습니다.</p>
                  <p className="text-sm">레이아웃 편집기에서 필드를 추가해보세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 드래그 오버레이 */}
        <DragOverlay>
          {activeField ? (
            <Card className="p-4 shadow-lg border-2 border-primary">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-primary" />
                <span className="font-medium">{activeField.label}</span>
                <Badge variant="outline" className="text-xs">
                  {activeField.type}
                </Badge>
              </div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 외부 편집 패널을 쓰는 경우 모달 비활성화 */}
      {!onEditField && (
        <FieldEditModal
          field={selectedField}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedField(null);
          }}
          onSave={handleFieldSave}
        />
      )}

      {/* 현재 값 표시 (개발 모드) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="p-4 bg-muted">
          <h4 className="font-medium mb-2">현재 설정값 (개발 모드)</h4>
          <pre className="text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(previewValues, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
