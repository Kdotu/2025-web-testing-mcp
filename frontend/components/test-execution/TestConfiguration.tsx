import { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AlertCircle, Settings, TrendingUp, BarChart3, Zap, Wrench } from "lucide-react";

interface TestSettings {
  performance: any;
  lighthouse: any;
  load: any;
  security: any;
  accessibility: any;
  playwright: any;
}

interface TestConfigurationProps {
  selectedTestType: string;
  testSettings: TestSettings;
  updateTestSetting: (testType: keyof TestSettings, key: string, value: any) => void;
  testTypes: any[];
}

export function TestConfiguration({
  selectedTestType,
  testSettings,
  updateTestSetting,
  testTypes
}: TestConfigurationProps) {
  const [playwrightConfigMode, setPlaywrightConfigMode] = useState<'settings' | 'scenario'>('settings');
  const [playwrightScenario, setPlaywrightScenario] = useState('');

  if (!selectedTestType) {
    return (
      <div className="neu-card rounded-3xl px-6 py-8">
        <div className="flex items-center space-x-4 mb-6">
          <Settings className="h-7 w-7 text-primary" />
          <h3 className="text-2xl font-semibold text-primary">테스트 설정</h3>
        </div>
        
        <div className="text-center py-12 text-muted-foreground">
          <Settings className="h-16 w-16 mx-auto mb-6 opacity-50" />
          <p className="font-semibold text-lg mb-2">테스트 유형을 선택하세요</p>
          <p className="text-base">좌측에서 테스트 유형을 선택하면 상세 설정이 나타납니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="neu-card rounded-3xl px-6 py-8">
      <div className="flex items-center space-x-4 mb-6">
        <Settings className="h-7 w-7 text-primary" />
        <h3 className="text-2xl font-semibold text-primary">
          {testTypes.find(t => t.id === selectedTestType)?.name} 설정
        </h3>
      </div>
      
      {selectedTestType === 'load' ? (
        // 부하테스트 상세 설정 복구
        <div className="space-y-6">
          {/* 프리셋 + 요약 */}
          <div className="grid grid-cols-2 gap-6">
            {/* Preset 선택 */}
            <div className="neu-subtle rounded-xl px-6 py-6">
              <Label className="text-foreground font-semibold text-lg mb-4 block">
                테스트 프리셋 선택 <span className="text-xs text-muted-foreground ml-1">(Test Preset Selection)</span>
              </Label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'low', name: 'Low', description: '가벼운 부하 테스트 (소규모 트래픽, ~2 TPS)', icon: TrendingUp, startRate: 50, timeUnit: '30s', preAllocatedVUs: 5, maxVUs: 100, stages: [ { target: 50, duration: '30s' }, { target: 100, duration: '1m' }, { target: 50, duration: '30s' } ] },
                  { id: 'medium', name: 'Medium', description: '중간 규모 부하 테스트 (일반적인 트래픽, ~5-250 TPS)', icon: BarChart3, startRate: 100, timeUnit: '20s', preAllocatedVUs: 10, maxVUs: 500, stages: [ { target: 100, duration: '20s' }, { target: 5000, duration: '1m' }, { target: 5000, duration: '2m' }, { target: 100, duration: '30s' } ] },
                  { id: 'high', name: 'High', description: '고강도 부하 테스트 (대규모 트래픽, ~20-1000 TPS + 스파이크)', icon: Zap, startRate: 200, timeUnit: '10s', preAllocatedVUs: 20, maxVUs: 1000, stages: [ { target: 200, duration: '10s' }, { target: 10000, duration: '0' }, { target: 10000, duration: '3m' }, { target: 1000, duration: '1m' }, { target: 200, duration: '20s' } ] },
                  { id: 'custom', name: 'Custom', description: '사용자 정의 설정 (k6 iterations per timeUnit 기준)', icon: Wrench, startRate: 100, timeUnit: '20s', preAllocatedVUs: 10, maxVUs: 500, stages: [ { target: 100, duration: '20s' }, { target: 1000, duration: '1m' }, { target: 1000, duration: '1m' }, { target: 100, duration: '20s' } ] },
                ].map((preset) => {
                  const Icon = preset.icon as any;
                  const isSelected = testSettings.load?.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        updateTestSetting('load', 'preset', preset.id);
                        updateTestSetting('load', 'startRate', preset.startRate);
                        updateTestSetting('load', 'timeUnit', preset.timeUnit);
                        updateTestSetting('load', 'preAllocatedVUs', preset.preAllocatedVUs);
                        updateTestSetting('load', 'maxVUs', preset.maxVUs);
                        updateTestSetting('load', 'stages', preset.stages);
                      }}
                      className={`neu-button rounded-xl p-4 text-left transition-all duration-200 ${isSelected ? 'neu-button-active' : ''}`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
                        <span className={`font-semibold ${isSelected ? 'text-primary-foreground' : 'text-primary'}`}>{preset.name}</span>
                      </div>
                      <p className={`text-sm ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 요약 */}
            <div className="neu-subtle rounded-xl px-6 py-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-foreground font-semibold text-lg">
                  현재 기본 설정 <span className="text-xs text-muted-foreground ml-1">(Current Settings)</span>
                </Label>
                <div className="neu-pressed rounded-lg px-3 py-1">
                  <span className="text-xs text-muted-foreground">Executor: {testSettings.load?.executor || 'ramping-vus'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="neu-pressed rounded-lg px-4 py-3">
                  <Label className="text-sm text-muted-foreground mb-1 block">시작 요청 속도 <span className="text-xs text-muted-foreground">(Start Rate)</span></Label>
                  <div className="flex flex-col">
                    <span className="text-foreground font-semibold">{testSettings.load?.startRate || 0} 요청 / {testSettings.load?.timeUnit || '1s'}</span>
                    <span className="text-xs text-foreground">≈ {Math.round(((testSettings.load?.startRate || 0) / parseInt(testSettings.load?.timeUnit || '1')) * 100) / 100} TPS</span>
                  </div>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-3">
                  <Label className="text-sm text-muted-foreground mb-1 block">시간 단위 <span className="text-xs text-muted-foreground">(Time Unit)</span></Label>
                  <span className="text-foreground font-semibold">{testSettings.load?.timeUnit || '20s'}</span>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-3">
                  <Label className="text-sm text-muted-foreground mb-1 block">사전 할당 VU <span className="text-xs text-muted-foreground">(Pre-allocated VUs)</span></Label>
                  <span className="text-foreground font-semibold">{testSettings.load?.preAllocatedVUs || 10}</span>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-3">
                  <Label className="text-sm text-muted-foreground mb-1 block">최대 VU <span className="text-xs text-muted-foreground">(Max VUs)</span></Label>
                  <span className="text-foreground font-semibold">{testSettings.load?.maxVUs || 500}</span>
                </div>
              </div>
              <div className="mt-4 neu-pressed rounded-lg px-4 py-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <strong>Ramping Arrival Rate:</strong> 일정 시간 동안 목표 요청률(iterations per timeUnit)까지 선형 증가. 실제 TPS는 시스템 성능에 따라 달라질 수 있습니다.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom 모드 상세 */}
          {testSettings.load?.preset === 'custom' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">실행 모드 <span className="text-xs text-muted-foreground ml-1">(Executor)</span></Label>
                <div className="neu-input rounded-xl px-3 py-2">
                  <Select value={testSettings.load?.executor || 'ramping-vus'} onValueChange={(v) => updateTestSetting('load', 'executor', v)}>
                    <SelectTrigger className="border-none bg-transparent text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent className="neu-card rounded-xl border-none bg-card">
                      <SelectItem value="ramping-arrival-rate">Ramping Arrival Rate</SelectItem>
                      <SelectItem value="constant-arrival-rate">Constant Arrival Rate</SelectItem>
                      <SelectItem value="ramping-vus">Ramping VUs</SelectItem>
                      <SelectItem value="constant-vus">Constant VUs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">상세 설정 <span className="text-xs text-muted-foreground ml-1">(Advanced Settings)</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">시작 요청 수</Label>
                    <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                      <Input type="number" value={testSettings.load?.startRate || 100} onChange={(e) => {
                        const value = Math.max(1, Math.min(10000, Number(e.target.value) || 1));
                        updateTestSetting('load', 'startRate', value);
                      }} min={1} max={10000} className="border-none bg-transparent text-center text-primary font-semibold text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">시간 단위</Label>
                    <div className="neu-input rounded-lg px-2 py-1 ring-1 ring-primary/20">
                      <Select value={testSettings.load?.timeUnit || '20s'} onValueChange={(v) => updateTestSetting('load', 'timeUnit', v)}>
                        <SelectTrigger className="border-none bg-transparent text-primary text-sm h-8"><SelectValue /></SelectTrigger>
                        <SelectContent className="neu-card rounded-xl border-none bg-card">
                          <SelectItem value="1s">1초</SelectItem>
                          <SelectItem value="5s">5초</SelectItem>
                          <SelectItem value="10s">10초</SelectItem>
                          <SelectItem value="20s">20초</SelectItem>
                          <SelectItem value="30s">30초</SelectItem>
                          <SelectItem value="1m">1분</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">사전 할당 VU</Label>
                    <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                      <Input type="number" value={testSettings.load?.preAllocatedVUs || 10} onChange={(e) => {
                        const value = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                        updateTestSetting('load', 'preAllocatedVUs', value);
                      }} min={1} max={100} className="border-none bg-transparent text-center text-primary font-semibold text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">최대 VU</Label>
                    <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                      <Input type="number" value={testSettings.load?.maxVUs || 500} onChange={(e) => {
                        const value = Math.max(1, Math.min(2000, Number(e.target.value) || 1));
                        updateTestSetting('load', 'maxVUs', value);
                      }} min={1} max={2000} className="border-none bg-transparent text-center text-primary font-semibold text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stages */}
          <div className="neu-subtle rounded-xl px-6 py-6">
            <Label className="text-foreground font-semibold text-lg mb-4 block">
              테스트 단계 <span className="text-xs text-muted-foreground ml-1">(Stages)</span>
              {testSettings.load?.preset !== 'custom' && (
                <span className="text-sm text-muted-foreground ml-2">• 프리셋 기반</span>
              )}
            </Label>
            <div className="space-y-4">
              {(testSettings.load?.stages || []).map((stage: any, index: number) => (
                <div key={`stage-${index}-${stage.target}-${stage.duration}`} className="neu-input rounded-xl p-4">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        목표 요청 수 <span className="text-xs text-muted-foreground">(per {testSettings.load?.timeUnit || '20s'})</span>
                      </Label>
                      <Input type="number" value={stage.target || 0} onChange={(e) => {
                        if (testSettings.load?.preset !== 'custom') return;
                        const newStages = [...(testSettings.load?.stages || [])];
                        newStages[index] = { ...stage, target: Number(e.target.value) || 0 };
                        updateTestSetting('load', 'stages', newStages);
                      }} disabled={testSettings.load?.preset !== 'custom'} className={`border-none bg-transparent text-foreground text-center font-semibold ${testSettings.load?.preset !== 'custom' ? 'opacity-60' : ''}`} min={0} max={50000} />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">지속 시간</Label>
                      {testSettings.load?.preset === 'custom' ? (
                        <Select value={stage.duration || '1m'} onValueChange={(v) => {
                          const newStages = [...(testSettings.load?.stages || [])];
                          newStages[index] = { ...stage, duration: v };
                          updateTestSetting('load', 'stages', newStages);
                        }}>
                          <SelectTrigger className="border-none bg-transparent text-foreground"><SelectValue /></SelectTrigger>
                          <SelectContent className="neu-card rounded-xl border-none bg-card">
                            <SelectItem value="0">0s (즉시 스파이크)</SelectItem>
                            <SelectItem value="10s">10s</SelectItem>
                            <SelectItem value="20s">20s</SelectItem>
                            <SelectItem value="30s">30s</SelectItem>
                            <SelectItem value="1m">1m</SelectItem>
                            <SelectItem value="2m">2m</SelectItem>
                            <SelectItem value="5m">5m</SelectItem>
                            <SelectItem value="10m">10m</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="neu-pressed rounded-lg px-3 py-2 opacity-60">
                          <span className="text-sm text-muted-foreground">{stage.duration === '0' ? '0s (즉시)' : stage.duration}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">단계 설명</Label>
                      <div className="neu-pressed rounded-lg px-3 py-2">
                        <span className="text-sm text-muted-foreground">{stage.duration === '0' ? '⚡ 즉시 스파이크' : stage.description || '점진적 변화'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 neu-pressed rounded-xl px-4 py-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground text-sm"><strong>k6 기준:</strong> target은 "iterations per timeUnit" 값이며, duration이 "0"인 단계는 즉시 스파이크를 생성합니다. 실제 TPS는 시스템 성능에 따라 달라집니다.</p>
              </div>
            </div>
          </div>
        </div>
      ) : selectedTestType === 'lighthouse' ? (
        // Lighthouse 상세 설정 복구
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Categories */}
            <div className="neu-subtle rounded-xl px-6 py-6">
              <Label className="text-foreground font-semibold text-lg mb-4 block">
                검사 카테고리 <span className="text-xs text-muted-foreground ml-1">(Categories)</span>
              </Label>
              <div className="space-y-3">
                {[
                  { id: 'performance', name: '성능', description: '페이지 로딩 속도 및 성능 측정' },
                  { id: 'accessibility', name: '접근성', description: '웹 접근성 표준 준수 검사' },
                  { id: 'best-practices', name: '모범 사례', description: '웹 개발 모범 사례 준수' },
                  { id: 'seo', name: 'SEO', description: '검색 엔진 최적화 검사' },
                  { id: 'pwa', name: 'PWA', description: 'Progressive Web App 기능' }
                ].map((c) => {
                  const isSelected = testSettings.lighthouse?.categories?.includes(c.id) || false;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        const newCategories = isSelected
                          ? (testSettings.lighthouse?.categories || []).filter((x: string) => x !== c.id)
                          : [...(testSettings.lighthouse?.categories || []), c.id];
                        updateTestSetting('lighthouse', 'categories', newCategories);
                      }}
                      className={`neu-button rounded-xl p-4 text-left transition-all duration-200 cursor-pointer ${isSelected ? 'neu-button-active' : ''}`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className={`font-semibold ${isSelected ? 'text-primary-foreground' : 'text-primary'}`}>{c.name}</span>
                        </div>
                      </div>
                      <p className={`text-sm ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{c.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Device + Throttling */}
            <div className="space-y-6">
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  디바이스 <span className="text-xs text-muted-foreground ml-1">(Device)</span>
                </Label>
                <div className="flex gap-2">
                  {[{ id: 'desktop', name: '데스크톱' }, { id: 'mobile', name: '모바일' }].map((device) => {
                    const isSelected = testSettings.lighthouse?.device === device.id;
                    return (
                      <button
                        key={device.id}
                        onClick={() => updateTestSetting('lighthouse', 'device', device.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${isSelected ? 'neu-accent text-primary-foreground' : 'neu-button text-foreground hover:text-primary'}`}
                      >
                        {device.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">
                  네트워크 제한 <span className="text-xs text-muted-foreground ml-1">(Throttling)</span>
                </Label>
                <div className="neu-input rounded-xl px-3 py-2">
                  <Select value={testSettings.lighthouse?.throttling || '4g'} onValueChange={(v) => updateTestSetting('lighthouse', 'throttling', v)}>
                    <SelectTrigger className="border-none bg-transparent text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent className="neu-card rounded-xl border-none bg-card">
                      <SelectItem value="4g">4G (고속)</SelectItem>
                      <SelectItem value="3g">3G (중간)</SelectItem>
                      <SelectItem value="2g">2G (저속)</SelectItem>
                      <SelectItem value="none">제한 없음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : selectedTestType === 'playwright' ? (
        // Playwright 상세 설정 복구
        <div className="space-y-6">
          {/* 설정 모드 탭 */}
          <div className="neu-subtle rounded-xl px-6 py-6">
            <Label className="text-foreground font-semibold text-lg mb-4 block">
              설정 모드 <span className="text-xs text-muted-foreground ml-1">(Configuration Mode)</span>
            </Label>
            <div className="flex gap-2">
              <button onClick={() => setPlaywrightConfigMode('settings')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${playwrightConfigMode === 'settings' ? 'neu-accent text-primary-foreground' : 'neu-button text-foreground hover:text-primary'}`}>항목별 설정</button>
              <button onClick={() => setPlaywrightConfigMode('scenario')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${playwrightConfigMode === 'scenario' ? 'neu-accent text-primary-foreground' : 'neu-button text-foreground hover:text-primary'}`}>시나리오 입력</button>
            </div>
          </div>

          {playwrightConfigMode === 'scenario' ? (
            <div className="neu-subtle rounded-xl px-6 py-6">
              <Label className="text-foreground font-semibold text-lg mb-4 block">Playwright 테스트 시나리오 <span className="text-xs text-muted-foreground ml-1">(Test Scenario)</span></Label>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">테스트 시나리오 코드</Label>
                  <div className="neu-input rounded-xl px-4 py-3">
                    <textarea value={playwrightScenario} onChange={(e) => setPlaywrightScenario(e.target.value)} placeholder={`// Playwright 테스트 시나리오를 입력하세요`} className="min-h-64 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground font-mono text-sm w-full" />
                  </div>
                </div>
                <div className="neu-pressed rounded-lg px-4 py-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground"><strong>시나리오 모드:</strong> 사용자가 직접 Playwright 테스트 코드를 작성하여 실행. 기본 설정(브라우저, 뷰포트 등)은 항목별 설정에서 구성한 값이 적용됩니다.</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 브라우저 설정 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">브라우저 설정 <span className="text-xs text-muted-foreground ml-1">(Browser Settings)</span></Label>
                  <div className="flex flex-col gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-1 block">브라우저</Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Select value={testSettings.playwright?.browser || 'chromium'} onValueChange={(v) => updateTestSetting('playwright', 'browser', v)}>
                          <SelectTrigger className="border-none bg-transparent text-foreground"><SelectValue /></SelectTrigger>
                          <SelectContent className="neu-card rounded-xl border-none bg-card">
                            <SelectItem value="chromium">Chromium</SelectItem>
                            <SelectItem value="firefox">Firefox</SelectItem>
                            <SelectItem value="webkit">Safari (WebKit)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">헤드리스 모드</Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Switch checked={testSettings.playwright?.headless || true} onCheckedChange={(c) => updateTestSetting('playwright', 'headless', c)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 뷰포트 설정 */}
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">뷰포트 설정 <span className="text-xs text-muted-foreground ml-1">(Viewport Settings)</span></Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">너비</Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input type="number" value={testSettings.playwright?.viewport?.width || 1280} onChange={(e) => {
                          const v = { ...(testSettings.playwright?.viewport || { width: 1280, height: 720 }), width: Number(e.target.value) };
                          updateTestSetting('playwright', 'viewport', v);
                        }} className="border-none bg-transparent text-center text-foreground" min={320} max={3840} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">높이</Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input type="number" value={testSettings.playwright?.viewport?.height || 720} onChange={(e) => {
                          const v = { ...(testSettings.playwright?.viewport || { width: 1280, height: 720 }), height: Number(e.target.value) };
                          updateTestSetting('playwright', 'viewport', v);
                        }} className="border-none bg-transparent text-center text-foreground" min={240} max={2160} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 타임아웃 설정 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">타임아웃 설정 <span className="text-xs text-muted-foreground ml-1">(Timeout Settings)</span></Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">전체 타임아웃 (ms)</Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Input type="number" value={testSettings.playwright?.timeout || 30000} onChange={(e) => updateTestSetting('playwright', 'timeout', Number(e.target.value))} className="border-none bg-transparent text-center text-foreground" min={1000} max={300000} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">네비게이션 타임아웃 (ms)</Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Input type="number" value={testSettings.playwright?.navigationTimeout || 30000} onChange={(e) => updateTestSetting('playwright', 'navigationTimeout', Number(e.target.value))} className="border-none bg-transparent text-center text-foreground" min={1000} max={300000} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">액션 타임아웃 (ms)</Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Input type="number" value={testSettings.playwright?.actionTimeout || 5000} onChange={(e) => updateTestSetting('playwright', 'actionTimeout', Number(e.target.value))} className="border-none bg-transparent text-center text-foreground" min={1000} max={300000} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 녹화 설정 */}
              <div className="neu-subtle rounded-xl px-6 py-6">
                <Label className="text-foreground font-semibold text-lg mb-4 block">녹화 설정 <span className="text-xs text-muted-foreground ml-1">(Recording Settings)</span></Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">스크린샷 (실패 시)</Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Switch checked={testSettings.playwright?.screenshotOnFailure || true} onCheckedChange={(c) => updateTestSetting('playwright', 'screenshotOnFailure', c)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">비디오 녹화</Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Switch checked={testSettings.playwright?.videoRecording || false} onCheckedChange={(c) => updateTestSetting('playwright', 'videoRecording', c)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">트레이스 녹화</Label>
                    <div className="neu-input rounded-lg px-3 py-2">
                      <Switch checked={testSettings.playwright?.traceRecording || false} onCheckedChange={(c) => updateTestSetting('playwright', 'traceRecording', c)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 고급/지역 설정 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">고급 설정 <span className="text-xs text-muted-foreground ml-1">(Advanced Settings)</span></Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">슬로우 모션</Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input type="number" value={testSettings.playwright?.slowMo || 0} onChange={(e) => updateTestSetting('playwright', 'slowMo', Number(e.target.value))} className="border-none bg-transparent text-center text-foreground" min={0} max={5000} step={100} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">사용자 에이전트</Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Input value={testSettings.playwright?.userAgent || ''} onChange={(e) => updateTestSetting('playwright', 'userAgent', e.target.value)} placeholder="기본값 사용" className="border-none bg-transparent text-center text-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="neu-subtle rounded-xl px-6 py-6">
                  <Label className="text-foreground font-semibold text-lg mb-4 block">지역 설정 <span className="text-xs text-muted-foreground ml-1">(Locale Settings)</span></Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">로케일</Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Select value={testSettings.playwright?.locale || 'ko-KR'} onValueChange={(v) => updateTestSetting('playwright', 'locale', v)}>
                          <SelectTrigger className="border-none bg-transparent text-foreground"><SelectValue /></SelectTrigger>
                          <SelectContent className="neu-card rounded-xl border-none bg-card">
                            <SelectItem value="ko-KR">한국어 (ko-KR)</SelectItem>
                            <SelectItem value="en-US">English (en-US)</SelectItem>
                            <SelectItem value="ja-JP">日本語 (ja-JP)</SelectItem>
                            <SelectItem value="zh-CN">中文 (zh-CN)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">시간대</Label>
                      <div className="neu-input rounded-lg px-3 py-2">
                        <Select value={testSettings.playwright?.timezone || 'Asia/Seoul'} onValueChange={(v) => updateTestSetting('playwright', 'timezone', v)}>
                          <SelectTrigger className="border-none bg-transparent text-foreground"><SelectValue /></SelectTrigger>
                          <SelectContent className="neu-card rounded-xl border-none bg-card">
                            <SelectItem value="Asia/Seoul">Asia/Seoul (KST)</SelectItem>
                            <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                            <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // 기타 테스트 유형
        <div className="neu-subtle rounded-xl px-6 py-6">
          <div className="flex items-start space-x-4">
            <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="text-muted-foreground mb-2">{testTypes.find(t => t.id === selectedTestType)?.description}</p>
              <p className="text-sm text-muted-foreground">이 테스트 유형은 기본 설정으로 실행됩니다. 상세 설정이 필요한 경우 개발팀에 문의하세요.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 