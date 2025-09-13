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
  ChevronDown, 
  ChevronRight, 
  Settings, 
  Save, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface LayoutField {
  id: number;
  layoutId: number;
  sectionId: number;
  fieldName: string;
  fieldType: string;
  label: string;
  placeholder?: string;
  description?: string;
  isRequired: boolean;
  isVisible: boolean;
  fieldOrder: number;
  fieldWidth: string;
  defaultValue?: string;
  validationRules?: any;
  options?: { value: string; label: string }[];
  conditionalLogic?: any;
  createdAt: string;
  updatedAt: string;
}

interface LayoutSection {
  id: number;
  layoutId: number;
  sectionName: string;
  sectionTitle: string;
  sectionDescription?: string;
  sectionOrder: number;
  isCollapsible: boolean;
  isExpanded: boolean;
  createdAt: string;
  updatedAt: string;
  fields: LayoutField[];
}

interface TestLayout {
  id: number;
  testType: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  sections: LayoutSection[];
}

interface DynamicTestSettingsFormProps {
  layout: TestLayout;
  initialValues?: Record<string, any>;
  onValuesChange?: (values: Record<string, any>) => void;
  onSave?: (values: Record<string, any>) => void;
  onCancel?: () => void;
  isReadOnly?: boolean;
  showValidation?: boolean;
}

// 필드 타입별 렌더링 컴포넌트
function FieldRenderer({ 
  field, 
  value, 
  onChange, 
  error,
  isReadOnly = false
}: { 
  field: LayoutField; 
  value: any; 
  onChange: (value: any) => void;
  error?: string;
  isReadOnly?: boolean;
}) {
  const getWidthClass = (width: string) => {
    switch (width) {
      case 'half': return 'w-1/2';
      case 'third': return 'w-1/3';
      case 'quarter': return 'w-1/4';
      default: return 'w-full';
    }
  };

  const renderField = () => {
    const commonProps = {
      disabled: isReadOnly,
      className: `w-full ${error ? 'border-destructive' : ''}`
    };

    switch (field.fieldType) {
      case 'input':
        return (
          <Input
            {...commonProps}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.isRequired}
          />
        );
      
      case 'select':
        return (
          <Select 
            value={value || ''} 
            onValueChange={onChange}
            disabled={isReadOnly}
          >
            <SelectTrigger className={error ? 'border-destructive' : ''}>
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
              disabled={isReadOnly}
            />
            <Label className="text-sm text-muted-foreground">
              {value ? '활성' : '비활성'}
            </Label>
          </div>
        );
      
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.isRequired}
            rows={3}
          />
        );
      
      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            required={field.isRequired}
          />
        );
      
      case 'range':
        return (
          <div className="space-y-2">
            <Input
              {...commonProps}
              type="range"
              value={value || 0}
              onChange={(e) => onChange(Number(e.target.value))}
              min={field.validationRules?.min || 0}
              max={field.validationRules?.max || 100}
              step={field.validationRules?.step || 1}
            />
            <div className="text-sm text-muted-foreground text-center">
              {value || 0}
            </div>
          </div>
        );
      
      default:
        return (
          <Input
            {...commonProps}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.isRequired}
          />
        );
    }
  };

  if (!field.isVisible) return null;

  return (
    <div className={`space-y-2 ${getWidthClass(field.fieldWidth)}`}>
      <Label htmlFor={field.fieldName} className="text-sm font-medium">
        {field.label}
        {field.isRequired && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderField()}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

export function DynamicTestSettingsForm({ 
  layout, 
  initialValues = {}, 
  onValuesChange,
  onSave,
  onCancel,
  isReadOnly = false,
  showValidation = true
}: DynamicTestSettingsFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(layout.sections.map(section => section.id))
  );
  const [isValidating, setIsValidating] = useState(false);

  // 초기값 설정
  useEffect(() => {
    const defaultValues: Record<string, any> = {};
    layout.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          defaultValues[field.fieldName] = field.defaultValue;
        }
      });
    });
    setValues({ ...defaultValues, ...initialValues });
  }, [layout, initialValues]);

  // 값 변경 핸들러
  const handleFieldChange = (fieldName: string, value: any) => {
    const newValues = { ...values, [fieldName]: value };
    setValues(newValues);
    
    // 에러 제거
    if (errors[fieldName]) {
      const newErrors = { ...errors };
      delete newErrors[fieldName];
      setErrors(newErrors);
    }
    
    if (onValuesChange) {
      onValuesChange(newValues);
    }
  };

  // 섹션 토글
  const toggleSection = (sectionId: number) => {
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

  // 필드 유효성 검사
  const validateField = (field: LayoutField, value: any): string | null => {
    if (field.isRequired && (!value || value === '')) {
      return `${field.label}은(는) 필수 항목입니다.`;
    }

    if (field.validationRules) {
      const rules = field.validationRules;
      
      if (rules.minLength && value && value.length < rules.minLength) {
        return `${field.label}은(는) 최소 ${rules.minLength}자 이상이어야 합니다.`;
      }
      
      if (rules.maxLength && value && value.length > rules.maxLength) {
        return `${field.label}은(는) 최대 ${rules.maxLength}자까지 입력 가능합니다.`;
      }
      
      if (rules.min && value && Number(value) < rules.min) {
        return `${field.label}은(는) ${rules.min} 이상이어야 합니다.`;
      }
      
      if (rules.max && value && Number(value) > rules.max) {
        return `${field.label}은(는) ${rules.max} 이하여야 합니다.`;
      }
      
      if (rules.pattern && value && !new RegExp(rules.pattern).test(value)) {
        return `${field.label}의 형식이 올바르지 않습니다.`;
      }
    }

    return null;
  };

  // 전체 유효성 검사
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    layout.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.isVisible) {
          const error = validateField(field, values[field.fieldName]);
          if (error) {
            newErrors[field.fieldName] = error;
            isValid = false;
          }
        }
      });
    });

    setErrors(newErrors);
    return isValid;
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!onSave) return;

    if (showValidation) {
      setIsValidating(true);
      const isValid = validateAll();
      
      if (!isValid) {
        toast.error('입력값을 확인해주세요.');
        setIsValidating(false);
        return;
      }
    }

    try {
      await onSave(values);
      toast.success('설정이 저장되었습니다.');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsValidating(false);
    }
  };

  // 정렬된 섹션
  const sortedSections = [...layout.sections].sort((a, b) => a.sectionOrder - b.sectionOrder);

  // 정렬된 필드
  const getSortedFields = (fields: LayoutField[]) => {
    return [...fields].sort((a, b) => a.fieldOrder - b.fieldOrder);
  };

  // 그리드 레이아웃 계산
  const getGridLayout = (fields: LayoutField[]) => {
    const visibleFields = fields.filter(field => field.isVisible);
    const rows: LayoutField[][] = [];
    let currentRow: LayoutField[] = [];
    let currentRowWidth = 0;

    visibleFields.forEach(field => {
      const fieldWidth = field.fieldWidth === 'half' ? 0.5 : 
                        field.fieldWidth === 'third' ? 0.33 : 
                        field.fieldWidth === 'quarter' ? 0.25 : 1;
      
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{layout.name}</h2>
          {layout.description && (
            <p className="text-muted-foreground">{layout.description}</p>
          )}
        </div>
        
        {!isReadOnly && (onSave || onCancel) && (
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                취소
              </Button>
            )}
            {onSave && (
              <Button 
                onClick={handleSave} 
                disabled={isValidating}
                className="flex items-center gap-2"
              >
                {isValidating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                저장
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 섹션들 */}
      <div className="space-y-6">
        {sortedSections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const sortedFields = getSortedFields(section.fields);
          const visibleFields = sortedFields.filter(field => field.isVisible);
          
          if (visibleFields.length === 0) return null;

          return (
            <Card key={section.id} className="p-6">
              <div className="space-y-4">
                {/* 섹션 헤더 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{section.sectionTitle}</h3>
                    {section.sectionDescription && (
                      <p className="text-sm text-muted-foreground">
                        {section.sectionDescription}
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
                            value={values[field.fieldName]}
                            onChange={(value) => handleFieldChange(field.fieldName, value)}
                            error={errors[field.fieldName]}
                            isReadOnly={isReadOnly}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 유효성 검사 결과 */}
      {showValidation && Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {Object.keys(errors).length}개의 필드에 오류가 있습니다. 입력값을 확인해주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 현재 값 표시 (개발 모드) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="p-4 bg-muted">
          <h4 className="font-medium mb-2">현재 설정값 (개발 모드)</h4>
          <pre className="text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(values, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
