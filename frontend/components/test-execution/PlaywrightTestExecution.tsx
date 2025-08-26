import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { AlertCircle, Play, CheckCircle, XCircle, Clock, FileText, Code, BookOpen, Zap, Monitor, Bug } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PlaywrightTestExecution() {
  const [scenarioCode, setScenarioCode] = useState('');
  const [naturalScenario, setNaturalScenario] = useState('');
  const [config, setConfig] = useState({
    browser: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    timeout: 30000
  });
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'pending' | 'running' | 'completed' | 'failed'>('idle');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 자연어 시나리오 기본 예시만 설정 (코드는 자동 생성되도록)
    setNaturalScenario(``);
  }, []);

  // 자연어 시나리오가 변경될 때마다 자동으로 코드 변환
  useEffect(() => {
    if (naturalScenario.trim()) {
      const generated = generateCodeFromNaturalLanguage(naturalScenario);
      setScenarioCode(generated);
    } else {
      // 자연어 시나리오가 비어있으면 코드도 비움 (placeholder가 보이도록)
      setScenarioCode('');
    }
  }, [naturalScenario]);

  const generateCodeFromNaturalLanguage = (nl: string): string => {
    const lines = nl.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const steps = lines.filter(l => /\d+\)/.test(l) || /^-\s+/.test(l) || /\b(접속|클릭|입력|확인|기다림|스크린샷|타이틀|제목|URL|뷰포트)\b/.test(l));

    const body: string[] = [];

    const add = (code: string) => body.push(code);

    const selectorFrom = (text: string): string => {
      // 매우 단순한 휴리스틱: 따옴표 포함 텍스트 우선, role/label 키워드 매핑 시도
      const q = (text.match(/"([^"]+)"|'([^']+)'/) || [])[1] || text;
      if (/^#|\.|\[|\//.test(q)) return q; // selector로 보이면 그대로
      if (/\bh1|h2|h3|button|input|a\b/.test(q)) return q; // 태그명
      return `text=${q}`; // 텍스트 매칭
    };

    for (const raw of steps) {
      const l = raw.replace(/^\d+\)\s*/, '').replace(/^[-•]\s*/, '');
      // 접속/이동
      if (/(접속|방문|이동).*https?:\/\//.test(l)) {
        const url = l.match(/https?:\/\/[\w\-._~:\/?#\[\]@!$&'()*+,;=%]+/i)?.[0];
        if (url) add(`  await page.goto('${url}');`);
        continue;
      }
      if (/타이틀|제목/.test(l) && /(포함|같다|일치)/.test(l)) {
        const m = l.match(/["“”'']([^"”']+)["”'']/);
        if (m) add(`  await expect(page).toHaveTitle(/${m[1].replace(/[\\/]/g, '')}/);`);
        continue;
      }
      if (/(보이는지|존재|표시).*(확인|검증)/.test(l) || /보인다$/.test(l)) {
        const m = l.match(/["“”'']([^"”']+)["”'']/);
        if (m) {
          add(`  await expect(page.locator('${selectorFrom(m[1])}')).toBeVisible();`);
        } else if (/h1|h2|h3|button|input|a/.test(l)) {
          const tag = l.match(/h1|h2|h3|button|input|a/)?.[0] || 'h1';
          add(`  await expect(page.locator('${tag}')).toBeVisible();`);
        }
        continue;
      }
      if (/(클릭|누른다)/.test(l)) {
        const m = l.match(/["“”'']([^"”']+)["”'']/);
        if (m) add(`  await page.click('${selectorFrom(m[1])}');`);
        continue;
      }
      if (/(입력|채운다|타이핑)/.test(l)) {
        // 예: "#email" 에 "user@example.com" 을 입력한다
        const sel = l.match(/("[^"]+"|'[^']+')\s*에/)?.[1];
        const val = l.match(/에\s*("[^"]+"|'[^']+')\s*을?\s*(입력|채운다|타이핑)/)?.[1];
        if (sel && val) add(`  await page.fill(${sel}, ${val});`);
        continue;
      }
      if (/(URL|주소).*포함/.test(l)) {
        const m = l.match(/["“”'']([^"”']+)["”'']/);
        if (m) add(`  await expect(page).toHaveURL(new RegExp(${JSON.stringify(m[1])}));`);
        continue;
      }
      if (/스크린샷|캡처/.test(l)) {
        add(`  await page.screenshot({ path: 'screenshot-${Date.now()}.png', fullPage: true });`);
        continue;
      }
      if (/뷰포트|해상도/.test(l) && /(설정|변경)/.test(l)) {
        const w = Number(l.match(/(\d{3,4})\s*[xX*×]\s*(\d{3,4})/)?.[1] || '');
        const h = Number(l.match(/(\d{3,4})\s*[xX*×]\s*(\d{3,4})/)?.[2] || '');
        if (w && h) add(`  await page.setViewportSize({ width: ${w}, height: ${h} });`);
        continue;
      }
      // 기본 로그로 폴백
      add(`  console.log('NL step: ${l.replace(/'/g, "\\'")}');`);
    }

    const header = `const { test, expect } = require('@playwright/test');

test('자연어 기반 시나리오', async ({ page }) => {
`;
    const footer = `\n  console.log('✅ 자연어 시나리오 실행 완료');
});`;
    return `${header}${body.join('\n')}\n${footer}`;
  };

  const executeTestScenario = async () => {
    if (!scenarioCode.trim()) {
      if (naturalScenario.trim()) {
        const generated = generateCodeFromNaturalLanguage(naturalScenario);
        setScenarioCode(generated);
      } else {
        setError('테스트 시나리오 코드를 입력하거나 자연어 시나리오를 작성해주세요.');
        return;
      }
    }

    try {
      setExecutionStatus('pending');
      setError(null);
      setLogs([]);
      setProgressPercentage(0);
      setCurrentStep('테스트 실행 준비 중...');

      const response = await fetch('/api/playwright/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioCode,
          config
        }),
      });

      if (!response.ok) {
        throw new Error(`테스트 실행 실패: ${response.statusText}`);
      }

      const result = await response.json();
      setExecutionId(result.executionId);
      setCurrentStep('테스트 실행 중...');
      
      // 실행 모니터링 시작
      startExecutionMonitoring(result.executionId);
      
    } catch (err) {
      setExecutionStatus('failed');
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setCurrentStep('테스트 실행 실패');
    }
  };

  const startExecutionMonitoring = (executionId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/playwright/status/${executionId}`);
        if (!response.ok) {
          throw new Error('상태 조회 실패');
        }

        const statusData = await response.json();
        setExecutionStatus(statusData.status);
        setProgressPercentage(statusData.progressPercentage || 0);
        setCurrentStep(statusData.currentStep || '');
        
        if (statusData.logs && statusData.logs.length > 0) {
          setLogs(statusData.logs);
        }

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval);
          if (statusData.status === 'completed') {
            getFinalResult(executionId);
          }
        }
      } catch (err) {
        console.error('모니터링 오류:', err);
        clearInterval(interval);
      }
    }, 1000);
  };

  const getFinalResult = async (executionId: string) => {
    try {
      const response = await fetch(`/api/playwright/results/${executionId}`);
      if (response.ok) {
        const result = await response.json();
        setLogs(prev => [...prev, `🎯 최종 결과: ${result.resultSummary}`]);
        if (result.errorDetails) {
          setError(result.errorDetails);
        }
      }
    } catch (err) {
      console.error('최종 결과 조회 실패:', err);
    }
  };

  const validateScenario = async () => {
    try {
      const response = await fetch('/api/playwright/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenarioCode }),
      });

      const result = await response.json();
      if (result.valid) {
        setError(null);
        setLogs(prev => [...prev, '✅ 시나리오 코드 검증 완료']);
      } else {
        setError(`검증 실패: ${result.message}`);
      }
    } catch (err) {
      setError('검증 중 오류가 발생했습니다.');
    }
  };

  const getStatusIcon = () => {
    switch (executionStatus) {
      case 'idle': return <Play className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'running': return <Zap className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (executionStatus) {
      case 'idle': return '테스트 실행';
      case 'pending': return '실행 대기 중...';
      case 'running': return '실행 중...';
      case 'completed': return '완료됨';
      case 'failed': return '실패함';
      default: return '테스트 실행';
    }
  };

  const getButtonVariant = () => {
    switch (executionStatus) {
      case 'idle': return 'default';
      case 'pending':
      case 'running': return 'secondary';
      case 'completed': return 'outline';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* 시나리오 작성 가이드 */}
      <div className="neu-subtle rounded-xl px-6 py-6">
        <div className="flex items-center space-x-3 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <Label className="text-foreground font-semibold text-lg">Playwright 시나리오 작성 가이드</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="neu-pressed rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Code className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">기본 구조</span>
            </div>
            <p className="text-xs text-muted-foreground">
              test() 함수로 테스트 케이스를 정의하고, page 객체로 브라우저를 제어합니다.
            </p>
          </div>
          
          <div className="neu-pressed rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Monitor className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">페이지 조작</span>
            </div>
            <p className="text-xs text-muted-foreground">
              goto(), click(), fill(), type() 등으로 실제 사용자 행동을 시뮬레이션합니다.
            </p>
          </div>
          
          <div className="neu-pressed rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Bug className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">검증</span>
            </div>
            <p className="text-xs text-muted-foreground">
              expect() 함수로 요소 존재, 텍스트 내용, 페이지 제목 등을 검증합니다.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong>중요:</strong> 시나리오 코드는 Node.js 환경에서 실행되므로, require() 구문을 사용하거나 ES6 모듈 형식으로 작성해야 합니다.
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <FileText className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong>팁:</strong> console.log()를 사용하여 테스트 진행 상황을 로그로 출력할 수 있습니다. 이 로그들은 테스트 결과에서 확인할 수 있습니다.
            </div>
          </div>
        </div>
      </div>



      {/* 시나리오 입력 - 2개 컬럼 */}
      <div className="neu-subtle rounded-xl px-6 py-6">
        <Label className="text-foreground font-semibold text-lg mb-4 block">
          테스트 시나리오 작성 <span className="text-xs text-muted-foreground ml-1">(Test Scenario Creation)</span>
        </Label>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 자연어 시나리오 입력 */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              자연어 시나리오 <span className="text-xs text-muted-foreground">(Natural Language)</span>
            </Label>
            <div className="neu-input rounded-xl px-4 py-3">
              <textarea
                value={naturalScenario}
                onChange={(e) => setNaturalScenario(e.target.value)}
                placeholder={`예)
1) https://example.com 에 접속한다
2) 페이지 제목에 "Example Domain" 이 포함되어야 한다
3) "로그인" 버튼을 클릭한다
4) 스크린샷을 찍는다`}
                className="min-h-80 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground font-mono text-sm w-full leading-relaxed"
                spellCheck="false"
              />
            </div>
          </div>

          {/* 자동 생성된 테스트 코드 */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              생성 테스트 코드 <span className="text-xs text-muted-foreground">(Auto-generated Code)</span>
            </Label>
            <div className="neu-input rounded-xl px-4 py-3">
              <textarea
                value={scenarioCode}
                onChange={(e) => setScenarioCode(e.target.value)}
                placeholder="자연어 시나리오를 입력하면 자동으로 테스트 코드가 생성됩니다..."
                className="min-h-80 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground font-mono text-sm w-full leading-relaxed"
                spellCheck="false"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            onClick={validateScenario}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>코드 검증</span>
          </Button>
          
          <Button
            onClick={() => {
              const generated = generateCodeFromNaturalLanguage(naturalScenario);
              setScenarioCode(generated);
            }}
            variant="secondary"
            className="flex items-center space-x-2"
            disabled={!naturalScenario.trim()}
          >
            <Code className="h-4 w-4" />
            <span>수동 변환</span>
          </Button>
          
          <Button
            onClick={executeTestScenario}
            disabled={executionStatus === 'pending' || executionStatus === 'running'}
            variant={getButtonVariant()}
            className="flex items-center space-x-2"
          >
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Button>
        </div>
      </div>

      {/* 실행 상태 및 결과 */}
      {executionId && (
        <div className="neu-subtle rounded-xl px-6 py-6">
          <Label className="text-foreground font-semibold text-lg mb-4 block">
            테스트 실행 상태 <span className="text-xs text-muted-foreground ml-1">(Test Execution Status)</span>
          </Label>
          
          <div className="space-y-4">
            {/* 실행 ID */}
            <div className="neu-pressed rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">실행 ID:</span>
                <span className="font-mono text-sm text-foreground">{executionId}</span>
              </div>
            </div>

            {/* 진행률 */}
            {executionStatus === 'running' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">진행률</span>
                  <span className="text-foreground">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* 현재 단계 */}
            {currentStep && (
              <div className="neu-pressed rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">현재 단계:</span>
                  <span className="text-sm text-foreground">{currentStep}</span>
                </div>
              </div>
            )}

            {/* 오류 메시지 */}
            {error && (
              <div className="neu-pressed rounded-lg px-4 py-3 border-l-4 border-destructive">
                <div className="flex items-start space-x-2">
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-destructive">
                    <strong>오류:</strong> {error}
                  </div>
                </div>
              </div>
            )}

            {/* 실행 로그 */}
            {logs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">실행 로그</Label>
                <div className="neu-pressed rounded-lg px-4 py-3 max-h-48 overflow-y-auto">
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-xs font-mono text-foreground">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 추가 예제 및 팁 */}
      {/* <div className="neu-subtle rounded-xl px-6 py-6">
        <Label className="text-foreground font-semibold text-lg mb-4 block">
          유용한 시나리오 예제 <span className="text-xs text-muted-foreground ml-1">(Useful Examples)</span>
        </Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="neu-pressed rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">폼 입력 테스트</h4>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
{`// 로그인 폼 테스트
await page.goto('/login');
await page.fill('#email', 'user@example.com');
await page.fill('#password', 'password123');
await page.click('button[type="submit"]');
await expect(page).toHaveURL('/dashboard');`}
            </pre>
          </div>
          
          <div className="neu-pressed rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">API 응답 대기</h4>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
{`// API 응답 대기 후 검증
await page.click('#load-data');
await page.waitForResponse(response => 
  response.url().includes('/api/data')
);
await expect(page.locator('.data-item')).toHaveCount(5);`}
            </pre>
          </div>
          
          <div className="neu-pressed rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">사용자 상호작용</h4>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
{`// 드래그 앤 드롭 테스트
await page.goto('/kanban');
const source = page.locator('.task-item').first();
const target = page.locator('.column').nth(1);
await source.dragTo(target);
await expect(target.locator('.task-item')).toHaveCount(1);`}
            </pre>
          </div>
          
          <div className="neu-pressed rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">반응형 테스트</h4>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
{`// 모바일 뷰포트로 테스트
await page.setViewportSize({ width: 375, height: 667 });
await page.goto('/');
await expect(page.locator('.mobile-menu')).toBeVisible();
await page.click('.mobile-menu-toggle');`}
            </pre>
          </div>
        </div>
      </div> */}
    </div>
  );
}
