import { useState, useEffect } from 'react';
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
  Edit
} from 'lucide-react';
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

interface LayoutPreviewProps {
  sections: LayoutSection[];
  testType: string;
  isLive?: boolean;
  onFieldChange?: (fieldName: string, value: any) => void;
  values?: Record<string, any>;
}

// 필드 타입별 렌더링 컴포넌트
function FieldRenderer({ 
  field, 
  value, 
  onChange 
}: { 
  field: LayoutField; 
  value: any; 
  onChange: (value: any) => void;
}) {
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
    <div className={`space-y-2 ${getWidthClass(field.width)}`}>
      <Label htmlFor={field.name} className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderField()}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}

export function LayoutPreview({ 
  sections, 
  testType, 
  isLive = false, 
  onFieldChange,
  values = {}
}: LayoutPreviewProps) {
  const [previewValues, setPreviewValues] = useState<Record<string, any>>(values);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(section => section.id))
  );

  // 초기값 설정
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialValues[field.name] = field.defaultValue;
        }
      });
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

  // 정렬된 섹션
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

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
    switch (viewMode) {
      case 'tablet': return 'max-w-2xl';
      case 'mobile': return 'max-w-sm';
      default: return 'max-w-4xl';
    }
  };

  return (
    <div className="space-y-6">
      {/* 미리보기 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold">레이아웃 미리보기</h3>
          <p className="text-muted-foreground">
            {testType} 테스트 설정 화면의 미리보기입니다.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 뷰 모드 선택 */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          {isLive && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" />
              실시간 미리보기
            </Badge>
          )}
        </div>
      </div>

      {/* 미리보기 컨테이너 */}
      <div className={`mx-auto ${getViewModeClass()}`}>
        <Card className="p-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {testType} 설정
            </CardTitle>
            <CardDescription>
              테스트 실행을 위한 설정을 구성하세요.
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

                  {/* 섹션 필드들 */}
                  {isExpanded && (
                    <div className="space-y-4">
                      {getGridLayout(visibleFields).map((row, rowIndex) => (
                        <div key={rowIndex} className="flex flex-wrap gap-4">
                          {row.map((field) => (
                            <FieldRenderer
                              key={field.id}
                              field={field}
                              value={previewValues[field.name]}
                              onChange={(value) => handleFieldChange(field.name, value)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
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
