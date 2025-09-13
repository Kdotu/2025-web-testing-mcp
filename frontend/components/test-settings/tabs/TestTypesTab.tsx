import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Activity, AlertCircle, CheckCircle, Database, Lock, Settings as SettingsIcon, Trash2, Edit, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { TestTypeModal } from '@/components/test-settings/TestTypeModal';
import { getTestTypes, updateTestType, deleteTestType, addTestType, type TestType } from '@/utils/backend-api';
import { isDemoMode } from '@/utils/api';

export function TestTypesTab() {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTestType, setEditingTestType] = useState<TestType | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getTestTypes();
      if (res.success && res.data) setTestTypes(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (t: TestType) => {
    const res = await updateTestType(t.id, { enabled: !t.enabled });
    if (res.success) {
      setTestTypes(prev => prev.map(x => (x.id === t.id ? { ...x, enabled: !t.enabled } : x)));
    } else {
      toast.error(res.error || '상태 변경 실패');
    }
  };

  const handleDelete = async (t: TestType) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const res = await deleteTestType(t.id);
    if (res.success) {
      setTestTypes(prev => prev.filter(x => x.id !== t.id));
      toast.success('삭제 완료');
    } else {
      toast.error(res.error || '삭제 실패');
    }
  };

  const getIcon = (testType: TestType) => {
    const typeId = testType.id.toLowerCase();
    const typeName = (testType.name || '').toLowerCase();
    if (typeId.includes('lighthouse') || typeName.includes('lighthouse')) return <CheckCircle className="h-5 w-5 text-primary" />;
    if (typeId.includes('load') || typeName.includes('부하') || typeName.includes('load')) return <Database className="h-5 w-5 text-primary" />;
    return <SettingsIcon className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-semibold text-primary mb-2">테스트 타입 관리</h3>
          <p className="text-muted-foreground text-lg">사용 가능한 테스트 타입을 관리합니다</p>
        </div>
        <Button
          onClick={() => {
            setModalMode('add');
            setEditingTestType(null);
            setIsModalOpen(true);
          }}
          className="neu-accent text-primary-foreground rounded-xl px-6 py-3 font-semibold"
          disabled={isDemoMode()}
        >
          <Edit className="h-4 w-4 mr-2" /> 새 테스트 타입
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-16 w-16 mx-auto mb-6 opacity-50 animate-spin" />
          <p className="font-semibold text-lg mb-2">불러오는 중..</p>
        </div>
      ) : (
        <div className="space-y-4">
          {testTypes.map((t) => (
            <div key={t.id} className="neu-flat rounded-xl px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <Switch checked={t.enabled} onCheckedChange={() => handleToggle(t)} />
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="neu-pressed rounded-full p-2 mr-2">{getIcon(t)}</div>
                      <h4 className="font-semibold text-primary text-lg">{t.name}</h4>
                    </div>
                    <p className="text-muted-foreground">{t.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button variant="ghost" size="sm" onClick={() => { setModalMode('edit'); setEditingTestType(t); setIsModalOpen(true); }}>
                    <Edit className="h-4 w-4 mr-2" /> 수정
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(t)}>
                    <Trash2 className="h-4 w-4 mr-2" /> 삭제
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {testTypes.length === 0 && (
            <Alert>
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>등록된 테스트 타입이 없습니다.</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <TestTypeModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTestType(null); }}
        mode={modalMode}
        testType={editingTestType}
        onSave={async (data) => {
          if (modalMode === 'add') {
            const res = await addTestType(data as TestType);
            if (res.success) { toast.success('추가되었습니다'); load(); } else { toast.error(res.error || '추가 실패'); }
          } else if (editingTestType) {
            const res = await updateTestType(editingTestType.id, data as any);
            if (res.success) { toast.success('수정되었습니다'); load(); } else { toast.error(res.error || '수정 실패'); }
          }
        }}
        onSwitchChange={() => load()}
      />
    </div>
  );
}


