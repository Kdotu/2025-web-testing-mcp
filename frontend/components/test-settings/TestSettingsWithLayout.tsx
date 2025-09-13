import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Layout, 
  Eye, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { DynamicTestSettingsForm } from './DynamicTestSettingsForm';
import { 
  getTestLayoutsByTestType, 
  TestLayout,
  LayoutField,
  LayoutSection 
} from '../../utils/backend-api';

interface TestSettingsWithLayoutProps {
  testType: string;
  onSave?: (values: Record<string, any>) => void;
  onCancel?: () => void;
  initialValues?: Record<string, any>;
  isReadOnly?: boolean;
}

export function TestSettingsWithLayout({ 
  testType, 
  onSave, 
  onCancel, 
  initialValues = {},
  isReadOnly = false 
}: TestSettingsWithLayoutProps) {
  const [layouts, setLayouts] = useState<TestLayout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<TestLayout | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any>>(initialValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 레이아웃 로드
  useEffect(() => {
    loadLayouts();
  }, [testType]);

  const loadLayouts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // API 호출 대신 로컬 스토리지에서 로드 (데이터베이스 관계 문제로 인한 임시 해결책)
      const savedLayouts = localStorage.getItem('test-layouts');
      if (savedLayouts) {
        const allLayouts = JSON.parse(savedLayouts);
        const filteredLayouts = allLayouts.filter((layout: any) => layout.testType === testType);
        setLayouts(filteredLayouts);
        
        // 기본 레이아웃 선택
        const defaultLayout = filteredLayouts.find((layout: any) => layout.isDefault) || filteredLayouts[0];
        if (defaultLayout) {
          setSelectedLayout(defaultLayout);
        }
      } else {
        setLayouts([]);
      }
    } catch (error) {
      console.error('Failed to load layouts:', error);
      setError('레이아웃을 불러오는데 실패했습니다.');
      toast.error('레이아웃을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 값 변경 핸들러
  const handleValuesChange = (values: Record<string, any>) => {
    setCurrentValues(values);
  };

  // 저장 핸들러
  const handleSave = async (values: Record<string, any>) => {
    if (!onSave) return;

    try {
      setIsSaving(true);
      await onSave(values);
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // 레이아웃 변경 핸들러
  const handleLayoutChange = (layoutId: string) => {
    const layout = layouts.find(l => l.id.toString() === layoutId);
    if (layout) {
      setSelectedLayout(layout);
      // 레이아웃 변경 시 기본값으로 초기화
      const defaultValues: Record<string, any> = {};
      layout.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.defaultValue !== undefined) {
            defaultValues[field.fieldName] = field.defaultValue;
          }
        });
      });
      setCurrentValues({ ...defaultValues, ...initialValues });
    }
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    loadLayouts();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>레이아웃을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!layouts || layouts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">사용 가능한 레이아웃이 없습니다</h3>
        <p className="text-muted-foreground mb-4">
          {testType} 테스트에 대한 레이아웃이 설정되지 않았습니다.
        </p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 레이아웃 선택 */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">설정 레이아웃</h3>
            <p className="text-sm text-muted-foreground">
              사용할 설정 레이아웃을 선택하세요.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select 
              value={selectedLayout?.id.toString() || ''} 
              onValueChange={handleLayoutChange}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="레이아웃을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {layouts.map((layout) => (
                  <SelectItem key={layout.id} value={layout.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{layout.name}</span>
                      {layout.isDefault && (
                        <Badge variant="default" className="text-xs">기본</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        v{layout.version}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 선택된 레이아웃 정보 */}
      {selectedLayout && (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">{selectedLayout.name}</h4>
              {selectedLayout.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedLayout.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {selectedLayout.testType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {selectedLayout.sections?.length || 0}개 섹션
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {selectedLayout.sections?.reduce((total, section) => total + (section.fields?.length || 0), 0) || 0}개 필드
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedLayout.isDefault && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  기본 레이아웃
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                v{selectedLayout.version}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* 동적 설정 폼 */}
      {selectedLayout && (
        <DynamicTestSettingsForm
          layout={selectedLayout}
          initialValues={currentValues}
          onValuesChange={handleValuesChange}
          onSave={onSave ? handleSave : undefined}
          onCancel={onCancel}
          isReadOnly={isReadOnly}
          showValidation={true}
        />
      )}

      {/* 저장 상태 표시 */}
      {isSaving && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span className="text-blue-800">설정을 저장하는 중...</span>
          </div>
        </Card>
      )}
    </div>
  );
}
