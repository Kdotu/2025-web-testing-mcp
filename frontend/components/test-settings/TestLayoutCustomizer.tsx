import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { toast } from 'sonner';
import { InteractiveLayoutPreview } from '@/components/test-settings/InteractiveLayoutPreview';

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

interface TestLayout {
  id: string;
  testType: string;
  name: string;
  description: string;
  sections: LayoutSection[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TestLayoutCustomizerProps {
  isInDemoMode?: boolean;
}

export function TestLayoutCustomizer({ isInDemoMode }: TestLayoutCustomizerProps) {
  const [layouts, setLayouts] = useState<TestLayout[]>([]);
  const [testTypes] = useState([
    { value: 'lighthouse', label: 'Lighthouse' },
    { value: 'k6', label: 'k6 부하테스트' },
    { value: 'playwright', label: 'Playwright E2E' }
  ]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTestType, setSelectedTestType] = useState<string>('lighthouse');
  const [currentSections, setCurrentSections] = useState<LayoutSection[]>([]);
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [isRealTimeEditing, setIsRealTimeEditing] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // 기본 필드 템플릿
  const defaultFields: { [key: string]: LayoutField[] } = {
    lighthouse: [
      {
        id: 'url',
        name: 'url',
        type: 'input',
        label: '테스트 URL',
        placeholder: 'https://example.com',
        required: true,
        visible: true,
        order: 1,
        width: 'full'
      },
      {
        id: 'device',
        name: 'device',
        type: 'select',
        label: '디바이스',
        options: [
          { value: 'desktop', label: '데스크톱' },
          { value: 'mobile', label: '모바일' }
        ],
        defaultValue: 'desktop',
        visible: true,
        order: 2,
        width: 'half'
      },
      {
        id: 'categories',
        name: 'categories',
        type: 'select',
        label: '카테고리',
        options: [
          { value: 'performance', label: '성능' },
          { value: 'accessibility', label: '접근성' },
          { value: 'best-practices', label: '모범 사례' },
          { value: 'seo', label: 'SEO' }
        ],
        defaultValue: ['performance', 'accessibility'],
        visible: true,
        order: 3,
        width: 'half'
      }
    ],
    k6: [
      {
        id: 'url',
        name: 'url',
        type: 'input',
        label: '테스트 URL',
        placeholder: 'https://example.com',
        required: true,
        visible: true,
        order: 1,
        width: 'full'
      },
      {
        id: 'vus',
        name: 'vus',
        type: 'number',
        label: '가상 사용자 수',
        defaultValue: 10,
        visible: true,
        order: 2,
        width: 'half'
      },
      {
        id: 'duration',
        name: 'duration',
        type: 'input',
        label: '테스트 지속 시간',
        placeholder: '30s',
        defaultValue: '30s',
        visible: true,
        order: 3,
        width: 'half'
      }
    ],
    playwright: [
      {
        id: 'url',
        name: 'url',
        type: 'input',
        label: '테스트 URL',
        placeholder: 'https://example.com',
        required: true,
        visible: true,
        order: 1,
        width: 'full'
      },
      {
        id: 'browser',
        name: 'browser',
        type: 'select',
        label: '브라우저',
        options: [
          { value: 'chromium', label: 'Chromium' },
          { value: 'firefox', label: 'Firefox' },
          { value: 'webkit', label: 'WebKit' }
        ],
        defaultValue: 'chromium',
        visible: true,
        order: 2,
        width: 'half'
      },
      {
        id: 'headless',
        name: 'headless',
        type: 'switch',
        label: '헤드리스 모드',
        defaultValue: true,
        visible: true,
        order: 3,
        width: 'half'
      }
    ]
  };

  // 레이아웃 로드
  useEffect(() => {
    loadLayouts();
  }, []);

  // 테스트 타입 변경 시 현재 섹션 업데이트
  useEffect(() => {
    if (layouts.length === 0) return; // layouts가 아직 로드되지 않았으면 대기
    
    const currentLayout = layouts.find(layout => layout.testType === selectedTestType);
    if (currentLayout) {
      setCurrentSections(currentLayout.sections);
    } else {
      // 기본 섹션 생성
      setCurrentSections([{
        id: 'default-section',
        name: 'default',
        title: '기본 설정',
        description: '기본 테스트 설정',
        order: 1,
        isCollapsible: false,
        isExpanded: true,
        fields: defaultFields[selectedTestType] || []
      }]);
    }
  }, [selectedTestType, layouts]);

  const loadLayouts = async () => {
    try {
      setIsLoading(true);
      // 실제 API 호출 대신 로컬 스토리지에서 로드
      const savedLayouts = localStorage.getItem('test-layouts');
      if (savedLayouts) {
        setLayouts(JSON.parse(savedLayouts));
      } else {
        // 기본 레이아웃 생성
        const defaultLayouts = testTypes.map(testType => ({
          id: `default-${testType.value}`,
          testType: testType.value,
          name: `${testType.label} 기본 레이아웃`,
          description: `${testType.label} 테스트의 기본 설정 레이아웃입니다.`,
          sections: [{
            id: 'default-section',
            name: 'default',
            title: '기본 설정',
            description: '기본 테스트 설정',
            order: 1,
            isCollapsible: false,
            isExpanded: true,
            fields: defaultFields[testType.value] || []
          }],
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        setLayouts(defaultLayouts);
        localStorage.setItem('test-layouts', JSON.stringify(defaultLayouts));
      }
    } catch (error) {
      console.error('Failed to load layouts:', error);
      toast.error('레이아웃을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSectionsChange = (sections: LayoutSection[]) => {
    if (!sections) return;
    
    setCurrentSections(sections);
    
    // 현재 레이아웃 업데이트
    const currentLayout = layouts.find(layout => layout.testType === selectedTestType);
    if (currentLayout) {
      const updatedLayout = {
        ...currentLayout,
        sections,
        updatedAt: new Date().toISOString()
      };
      
      const updatedLayouts = layouts.map(layout => 
        layout.id === updatedLayout.id ? updatedLayout : layout
      );
      setLayouts(updatedLayouts);
      localStorage.setItem('test-layouts', JSON.stringify(updatedLayouts));
    }
  };

  const handleAddSection = () => {
    const newSection = {
      id: `section-${Date.now()}`,
      name: 'new_section',
      title: '새 섹션',
      description: '',
      order: (currentSections?.length || 0) + 1,
      isCollapsible: true,
      isExpanded: true,
      fields: []
    };
    handleSectionsChange([...(currentSections || []), newSection]);
  };

  const handleAddFieldToSection = (sectionId: string) => {
    if (!currentSections) return;
    
    const newField = {
      id: `field-${Date.now()}`,
      name: '',
      type: 'input' as const,
      label: '새 필드',
      placeholder: '',
      required: false,
      visible: true,
      order: 0,
      width: 'full' as const,
      sectionId
    };
    
    const updatedSections = currentSections.map(section => {
      if (section.id === sectionId) {
        const maxOrder = Math.max(...(section.fields?.map(f => f.order) || [0]), 0);
        return { ...section, fields: [...(section.fields || []), { ...newField, order: maxOrder + 1 }] };
      }
      return section;
    });
    
    handleSectionsChange(updatedSections);
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setPreviewValues(prev => ({ ...prev, [fieldName]: value }));
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

  return (
    <div className="space-y-6">
      {/* 헤더 및 테스트 타입 선택 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">테스트 설정 레이아웃 관리</h2>
          <p className="text-muted-foreground">각 테스트 타입별 설정 화면의 레이아웃을 커스터마이징합니다.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTestType} onValueChange={setSelectedTestType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {testTypes.map(testType => (
                <SelectItem key={testType.value} value={testType.value}>
                  {testType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 테스트 설정 구성 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{selectedTestType} 설정</CardTitle>
          <CardDescription>
            테스트 실행을 위한 설정을 구성하세요. 필드를 드래그하여 순서를 변경하고, 클릭하여 편집하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!currentSections || currentSections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Settings className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                설정할 필드가 없습니다. 레이아웃 편집기에서 필드를 추가해보세요.
              </p>
              <Button onClick={handleAddSection} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                섹션 추가
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {currentSections.map((section) => (
                <div key={section.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{section.title}</h3>
                      {section.description && (
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddFieldToSection(section.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      필드 추가
                    </Button>
                  </div>
                  
                  {section.fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      이 섹션에 필드가 없습니다. 필드를 추가해보세요.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {section.fields.map((field) => (
                        <div key={field.id} className="flex items-center gap-3 p-3 border rounded">
                          <div className="flex-1">
                            <Label className="text-sm font-medium">{field.label}</Label>
                            <p className="text-xs text-muted-foreground">
                              {field.type} • {field.required ? '필수' : '선택'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <Button onClick={handleAddSection} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                섹션 추가
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 인터랙티브 레이아웃 미리보기 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">인터랙티브 레이아웃 미리보기</CardTitle>
              <CardDescription>
                {selectedTestType} 테스트 설정 화면을 드래그 앤 드롭으로 편집하세요.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* 디바이스 뷰 선택 */}
              <div className="flex items-center gap-1 border rounded">
                <Button
                  variant={selectedDevice === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedDevice('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedDevice === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedDevice('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedDevice === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedDevice('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
              
              {/* 실시간 편집 토글 */}
              <Button
                variant={isRealTimeEditing ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsRealTimeEditing(!isRealTimeEditing)}
                className={isRealTimeEditing ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${isRealTimeEditing ? 'bg-white' : 'bg-gray-400'}`} />
                실시간 편집
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`border rounded-lg p-6 ${selectedDevice === 'mobile' ? 'max-w-sm mx-auto' : selectedDevice === 'tablet' ? 'max-w-2xl mx-auto' : 'w-full'}`}>
            {!currentSections || currentSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  설정할 필드가 없습니다. 레이아웃 편집기에서 필드를 추가해보세요.
                </p>
              </div>
            ) : (
              <InteractiveLayoutPreview
                sections={currentSections}
                testType={selectedTestType}
                onSectionsChange={handleSectionsChange}
                onAddSection={handleAddSection}
                onAddFieldToSection={handleAddFieldToSection}
                onFieldChange={handleFieldChange}
                values={previewValues}
                isRealTimeEditing={isRealTimeEditing}
                selectedDevice={selectedDevice}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}