import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { Plus, Search, Edit, Trash2, Save, X, Settings, Filter, SortAsc, SortDesc } from 'lucide-react';
import { toast } from 'sonner';

interface TestSetting {
  id: number;
  name: string;
  category: string;
  value: any;
  description: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TestSettingsManagementProps {
  isInDemoMode?: boolean;
}

export function TestSettingsManagement({ isInDemoMode }: TestSettingsManagementProps) {
  const [settings, setSettings] = useState<TestSetting[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingSetting, setEditingSetting] = useState<TestSetting | null>(null);
  
  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'priority' | 'createdAt'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    value: '',
    description: '',
    priority: 0,
    isActive: true
  });

  // 설정 로드
  useEffect(() => {
    loadSettings();
    loadCategories();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/test-settings');
      const result = await response.json();
      
      if (result.success) {
        setSettings(result.data);
      } else {
        toast.error('설정을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('설정을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/test-settings');
      const result = await response.json();
      
      if (result.success) {
        const uniqueCategories = [...new Set(result.data.map((setting: TestSetting) => setting.category))];
        setCategories(uniqueCategories.sort());
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleAddSetting = () => {
    setModalMode('add');
    setEditingSetting(null);
    setFormData({
      name: '',
      category: '',
      value: '',
      description: '',
      priority: 0,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleEditSetting = (setting: TestSetting) => {
    setModalMode('edit');
    setEditingSetting(setting);
    setFormData({
      name: setting.name,
      category: setting.category,
      value: typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value, null, 2),
      description: setting.description,
      priority: setting.priority,
      isActive: setting.isActive
    });
    setIsModalOpen(true);
  };

  const handleSaveSetting = async () => {
    try {
      // JSON 값 파싱 시도
      let parsedValue;
      try {
        parsedValue = JSON.parse(formData.value);
      } catch {
        parsedValue = formData.value;
      }

      const settingData = {
        ...formData,
        value: parsedValue
      };

      const url = modalMode === 'add' ? '/api/test-settings' : `/api/test-settings/${editingSetting?.id}`;
      const method = modalMode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(modalMode === 'add' ? '설정이 추가되었습니다.' : '설정이 수정되었습니다.');
        setIsModalOpen(false);
        loadSettings();
      } else {
        toast.error(result.error || '설정 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save setting:', error);
      toast.error('설정 저장에 실패했습니다.');
    }
  };

  const handleDeleteSetting = async (id: number) => {
    if (!confirm('이 설정을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/test-settings/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('설정이 삭제되었습니다.');
        loadSettings();
      } else {
        toast.error(result.error || '설정 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete setting:', error);
      toast.error('설정 삭제에 실패했습니다.');
    }
  };

  // 필터링 및 정렬된 설정 목록
  const filteredSettings = settings
    .filter(setting => {
      const matchesSearch = searchQuery === '' || 
        setting.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        setting.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || setting.category === selectedCategory;
      const matchesActive = !showActiveOnly || setting.isActive;
      
      return matchesSearch && matchesCategory && matchesActive;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 및 액션 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">테스트 설정 관리</h2>
          <p className="text-muted-foreground">테스트 실행에 사용할 설정들을 관리합니다.</p>
        </div>
        <Button onClick={handleAddSetting} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          새 설정 추가
        </Button>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="설정명 또는 설명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sort">정렬</Label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">우선순위</SelectItem>
                    <SelectItem value="name">이름</SelectItem>
                    <SelectItem value="createdAt">생성일</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>필터</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active-only"
                  checked={showActiveOnly}
                  onCheckedChange={setShowActiveOnly}
                />
                <Label htmlFor="active-only">활성만 표시</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 설정 목록 */}
      <div className="grid gap-4">
        {filteredSettings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">설정이 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== 'all' || showActiveOnly
                  ? '검색 조건에 맞는 설정이 없습니다.'
                  : '새로운 테스트 설정을 추가해보세요.'}
              </p>
              {!searchQuery && selectedCategory === 'all' && !showActiveOnly && (
                <Button onClick={handleAddSetting}>
                  <Plus className="h-4 w-4 mr-2" />
                  첫 설정 추가하기
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredSettings.map((setting) => (
            <Card key={setting.id} className={!setting.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{setting.name}</h3>
                      <Badge variant={setting.isActive ? 'default' : 'secondary'}>
                        {setting.isActive ? '활성' : '비활성'}
                      </Badge>
                      <Badge variant="outline">{setting.category}</Badge>
                      <Badge variant="outline" className="text-xs">
                        우선순위: {setting.priority}
                      </Badge>
                    </div>
                    
                    {setting.description && (
                      <p className="text-muted-foreground">{setting.description}</p>
                    )}
                    
                    <div className="bg-muted p-3 rounded-md">
                      <pre className="text-sm overflow-x-auto">
                        {typeof setting.value === 'string' 
                          ? setting.value 
                          : JSON.stringify(setting.value, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSetting(setting)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSetting(setting.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 설정 추가/편집 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'add' ? '새 설정 추가' : '설정 편집'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'add' 
                ? '새로운 테스트 설정을 추가합니다.' 
                : '기존 설정을 수정합니다.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">설정명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="설정 이름을 입력하세요"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lighthouse">Lighthouse</SelectItem>
                    <SelectItem value="k6">k6</SelectItem>
                    <SelectItem value="playwright">Playwright</SelectItem>
                    <SelectItem value="common">공통</SelectItem>
                    <SelectItem value="notification">알림</SelectItem>
                    <SelectItem value="report">보고서</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="설정에 대한 설명을 입력하세요"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="value">설정값 *</Label>
              <Textarea
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder='JSON 형식으로 입력하세요. 예: {"key": "value"}'
                rows={6}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                JSON 형식으로 입력하거나 단순 문자열을 입력할 수 있습니다.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">우선순위</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label>활성 상태</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">
                    {formData.isActive ? '활성' : '비활성'}
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveSetting}>
              <Save className="h-4 w-4 mr-2" />
              {modalMode === 'add' ? '추가' : '수정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
