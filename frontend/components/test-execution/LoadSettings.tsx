import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AlertCircle, TrendingUp, BarChart3, Zap, Wrench } from "lucide-react";

interface LoadTestStage {
  target: number;
  duration: string;
  description?: string;
}

interface LoadTestPreset {
  id: string;
  name: string;
  description: string;
  icon: any;
  startRate: number;
  timeUnit: string;
  preAllocatedVUs: number;
  maxVUs: number;
  stages: LoadTestStage[];
}

interface LoadSettingsProps {
  settings: any;
  update: (key: string, value: any) => void;
}

export function LoadSettings({ settings, update }: LoadSettingsProps) {
  const presets: LoadTestPreset[] = [
    {
      id: "low",
      name: "Low",
      description: "가벼운 부하 테스트 (소규모 트래픽, ~2 TPS)",
      icon: TrendingUp,
      startRate: 50,
      timeUnit: "30s",
      preAllocatedVUs: 5,
      maxVUs: 100,
      stages: [
        { target: 50, duration: "30s", description: "점진적 시작" },
        { target: 100, duration: "1m", description: "낮은 부하 유지" },
        { target: 50, duration: "30s", description: "점진적 감소" },
      ],
    },
    {
      id: "medium",
      name: "Medium",
      description: "중간 규모 부하 테스트 (일반적인 트래픽, ~5-250 TPS)",
      icon: BarChart3,
      startRate: 100,
      timeUnit: "20s",
      preAllocatedVUs: 10,
      maxVUs: 500,
      stages: [
        { target: 100, duration: "20s", description: "초기 부하 단계" },
        { target: 5000, duration: "1m", description: "점진적 증가" },
        { target: 5000, duration: "2m", description: "중간 부하 유지" },
        { target: 100, duration: "30s", description: "점진적 감소" },
      ],
    },
    {
      id: "high",
      name: "High",
      description: "고강도 부하 테스트 (대규모 트래픽, ~20-1000 TPS + 스파이크)",
      icon: Zap,
      startRate: 200,
      timeUnit: "10s",
      preAllocatedVUs: 20,
      maxVUs: 1000,
      stages: [
        { target: 200, duration: "10s", description: "빠른 시작" },
        { target: 10000, duration: "0", description: "즉시 스파이크" },
        { target: 10000, duration: "3m", description: "고부하 유지" },
        { target: 1000, duration: "1m", description: "완만한 감소" },
        { target: 200, duration: "20s", description: "정상화" },
      ],
    },
    {
      id: "custom",
      name: "Custom",
      description: "사용자 정의 설정 (k6 iterations per timeUnit 기준)",
      icon: Wrench,
      startRate: 100,
      timeUnit: "20s",
      preAllocatedVUs: 10,
      maxVUs: 500,
      stages: [
        { target: 100, duration: "20s", description: "초기 부하 단계" },
        { target: 1000, duration: "1m", description: "점진적 증가" },
        { target: 1000, duration: "1m", description: "최대 부하 유지" },
        { target: 100, duration: "20s", description: "점진적 감소" },
      ],
    },
  ];

  const applyPreset = (id: string) => {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    update("preset", p.id);
    update("startRate", p.startRate);
    update("timeUnit", p.timeUnit);
    update("preAllocatedVUs", p.preAllocatedVUs);
    update("maxVUs", p.maxVUs);
    update("stages", [...p.stages]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Preset */}
        <div className="neu-subtle rounded-xl px-6 py-6">
          <Label className="text-foreground font-semibold text-lg mb-4 block">테스트 프리셋 선택 <span className="text-xs text-muted-foreground ml-1">(Test Preset Selection)</span></Label>
          <div className="grid grid-cols-2 gap-4">
            {presets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = settings?.preset === preset.id;
              return (
                <button key={preset.id} onClick={() => applyPreset(preset.id)} className={`neu-button rounded-xl p-4 text-left transition-all duration-200 ${isSelected ? "neu-button-active" : ""}`}>
                  <div className="flex items-center space-x-3 mb-2">
                    <Icon className={`h-5 w-5 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                    <span className={`font-semibold ${isSelected ? "text-primary-foreground" : "text-primary"}`}>{preset.name}</span>
                  </div>
                  <p className={`text-sm ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{preset.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="neu-subtle rounded-xl px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-foreground font-semibold text-lg">현재 기본 설정 <span className="text-xs text-muted-foreground ml-1">(Current Settings)</span></Label>
            <div className="neu-pressed rounded-lg px-3 py-1"><span className="text-xs text-muted-foreground">Executor: {settings?.executor || "ramping-vus"}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="neu-pressed rounded-lg px-4 py-3">
              <Label className="text-sm text-muted-foreground mb-1 block">시작 요청 속도 <span className="text-xs">(Start Rate)</span></Label>
              <div className="flex flex-col">
                <span className="text-foreground font-semibold">{settings?.startRate || 0} 요청 / {settings?.timeUnit || "1s"}</span>
                <span className="text-xs text-foreground">≈ {Math.round(((settings?.startRate || 0) / parseInt(settings?.timeUnit || "1")) * 100) / 100} TPS</span>
              </div>
            </div>
            <div className="neu-pressed rounded-lg px-4 py-3">
              <Label className="text-sm text-muted-foreground mb-1 block">시간 단위</Label>
              <span className="text-foreground font-semibold">{settings?.timeUnit || "20s"}</span>
            </div>
            <div className="neu-pressed rounded-lg px-4 py-3">
              <Label className="text-sm text-muted-foreground mb-1 block">사전 할당 VU</Label>
              <span className="text-foreground font-semibold">{settings?.preAllocatedVUs || 10}</span>
            </div>
            <div className="neu-pressed rounded-lg px-4 py-3">
              <Label className="text-sm text-muted-foreground mb-1 block">최대 VU</Label>
              <span className="text-foreground font-semibold">{settings?.maxVUs || 500}</span>
            </div>
          </div>
          <div className="mt-4 neu-pressed rounded-lg px-4 py-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground"><strong>Ramping Arrival Rate:</strong> 일정 시간 동안 목표 요청률까지 선형 증가. 실제 TPS는 시스템 성능에 따라 달라질 수 있습니다.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Executor + Advanced */}
      <div className="grid grid-cols-2 gap-6">
        <div className="neu-subtle rounded-xl px-6 py-6">
          <Label className="text-foreground font-semibold text-lg mb-4 block">실행 모드 <span className="text-xs text-muted-foreground ml-1">(Executor)</span></Label>
          <div className="neu-input rounded-xl px-3 py-2">
            <Select value={settings?.executor || "ramping-vus"} onValueChange={(v) => update("executor", v)}>
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
          <Label className="text-foreground font-semibold text-lg mb-4 block">상세 설정 <span className="text-xs text-muted-foreground ml-1">(Advanced)</span></Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">시작 요청 수</Label>
              <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                <Input type="number" value={settings?.startRate || 100} onChange={(e) => {
                  const value = Math.max(1, Math.min(10000, Number(e.target.value) || 1));
                  update("startRate", value);
                }} min={1} max={10000} className="border-none bg-transparent text-center text-primary font-semibold text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">시간 단위</Label>
              <div className="neu-input rounded-lg px-2 py-1 ring-1 ring-primary/20">
                <Select value={settings?.timeUnit || "20s"} onValueChange={(v) => update("timeUnit", v)}>
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
                <Input type="number" value={settings?.preAllocatedVUs || 10} onChange={(e) => {
                  const value = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                  update("preAllocatedVUs", value);
                }} min={1} max={100} className="border-none bg-transparent text-center text-primary font-semibold text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">최대 VU</Label>
              <div className="neu-input rounded-lg px-3 py-2 ring-1 ring-primary/20">
                <Input type="number" value={settings?.maxVUs || 500} onChange={(e) => {
                  const value = Math.max(1, Math.min(2000, Number(e.target.value) || 1));
                  update("maxVUs", value);
                }} min={1} max={2000} className="border-none bg-transparent text-center text-primary font-semibold text-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stages */}
      <div className="neu-subtle rounded-xl px-6 py-6">
        <Label className="text-foreground font-semibold text-lg mb-4 block">테스트 단계 <span className="text-xs text-muted-foreground ml-1">(Stages)</span>{settings?.preset !== "custom" && (<span className="text-sm text-muted-foreground ml-2">• 프리셋 기반</span>)}</Label>
        <div className="space-y-4">
          {(settings?.stages || []).map((stage: LoadTestStage, index: number) => (
            <div key={`stage-${index}-${stage.target}-${stage.duration}`} className="neu-input rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">목표 요청 수 <span className="text-xs">(per {settings?.timeUnit || "20s"})</span></Label>
                  <Input type="number" value={stage.target || 0} onChange={(e) => {
                    if (settings?.preset !== "custom") return;
                    const newStages = [...(settings?.stages || [])];
                    newStages[index] = { ...stage, target: Number(e.target.value) || 0 };
                    update("stages", newStages);
                  }} disabled={settings?.preset !== "custom"} className={`border-none bg-transparent text-foreground text-center font-semibold ${settings?.preset !== "custom" ? "opacity-60" : ""}`} min={0} max={50000} />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">지속 시간</Label>
                  {settings?.preset === "custom" ? (
                    <Select value={stage.duration || "1m"} onValueChange={(v) => {
                      const newStages = [...(settings?.stages || [])];
                      newStages[index] = { ...stage, duration: v };
                      update("stages", newStages);
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
                    <div className="neu-pressed rounded-lg px-3 py-2 opacity-60"><span className="text-sm text-muted-foreground">{stage.duration === "0" ? "0s (즉시)" : stage.duration}</span></div>
                  )}
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">단계 설명</Label>
                  <div className="neu-pressed rounded-lg px-3 py-2"><span className="text-sm text-muted-foreground">{stage.duration === "0" ? "⚡ 즉시 스파이크" : stage.description || "점진적 변화"}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 neu-pressed rounded-xl px-4 py-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground text-sm"><strong>k6 기준:</strong> target은 iterations per timeUnit 값이며, duration이 "0"인 단계는 즉시 스파이크를 생성합니다. 실제 TPS는 시스템 성능에 따라 달라집니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 