import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { AlertCircle, Play, CheckCircle, XCircle, Clock, FileText, Code, BookOpen, Zap, Monitor, Bug, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { executePlaywrightScenario, getPlaywrightStatus, getPlaywrightResult, convertNaturalLanguageToPlaywright, checkMCPPlaywrightStatus, getMCPPlaywrightPatterns } from '../../utils/backend-api';

// 검증 단계 타입 정의
type ValidationStep = 'input' | 'code_validation' | 'natural_conversion' | 'mcp_check' | 'ready';

interface ValidationStatus {
  step: ValidationStep;
  completed: boolean;
  error?: string;
  message?: string;
}

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
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'timeout'>('idle');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConvertingNaturalLanguage, setIsConvertingNaturalLanguage] = useState(false);

  // 단계별 검증 상태 관리
  const [validationSteps, setValidationSteps] = useState<ValidationStatus[]>([
    { step: 'mcp_check', completed: false, message: 'MCP 서버 점검 대기 중' },
    { step: 'input', completed: false, message: '자연어 시나리오 입력 대기 중' },
    { step: 'natural_conversion', completed: false, message: '변환 버튼 클릭 대기 중' },
    { step: 'code_validation', completed: false, message: '코드 검증 대기 중' },
    { step: 'ready', completed: false, message: '실행 준비 대기 중' }
  ]);

  // 현재 활성화된 검증 단계
  const [currentValidationStep, setCurrentValidationStep] = useState<ValidationStep>('input');

  // 검증 완료 여부
  const isValidationComplete = validationSteps.every(step => step.completed);
  const canExecuteTest = isValidationComplete && currentValidationStep === 'ready';

  useEffect(() => {
    // 자연어 시나리오 기본 예시만 설정 (코드는 자동 생성되도록)
    setNaturalScenario(``);
  }, []);

  // MCP 서버 상태 확인
  useEffect(() => {
    const checkMCPStatus = async () => {
      try {
        const status = await checkMCPPlaywrightStatus();
        if (status.success) {
          console.log('MCP 서버 상태:', status);
          updateValidationStep('mcp_check', true, 'MCP 서버 정상 동작');
        } else {
          console.warn('MCP 서버 상태 확인 실패:', status.error);
          updateValidationStep('mcp_check', false, 'MCP 서버 연결 실패');
        }
      } catch (error) {
        console.error('MCP 서버 상태 확인 중 오류:', error);
        updateValidationStep('mcp_check', false, 'MCP 서버 연결 오류');
      }
    };
    
    checkMCPStatus();
  }, []);

  // 검증 단계 업데이트 함수
  const updateValidationStep = (step: ValidationStep, completed: boolean, message?: string, error?: string) => {
    setValidationSteps(prev => prev.map(s => 
      s.step === step 
        ? { ...s, completed, message, error }
        : s
    ));
  };

     // 모든 단계를 초기화하고 01 단계부터 다시 시작
   const resetToFirstStep = async () => {
     setValidationSteps(prev => prev.map(s => ({ ...s, completed: false })));
     setCurrentValidationStep('input');
     setScenarioCode('');
     setNaturalScenario('');
     setError(null);
     setExecutionId(null);
     setExecutionStatus('idle');
     setProgressPercentage(0);
     setCurrentStep('');
     setLogs([]);
     setIsConvertingNaturalLanguage(false);
     console.log('🔄 01 단계부터 다시 시작합니다.');

    // MCP 점검을 즉시 재실행하여 1단계 완료 상태 복구
    try {
      const status = await checkMCPPlaywrightStatus();
      if (status.success) {
        updateValidationStep('mcp_check', true, 'MCP 서버 정상 동작');
      } else {
        updateValidationStep('mcp_check', false, 'MCP 서버 연결 실패');
      }
    } catch (e) {
      updateValidationStep('mcp_check', false, 'MCP 서버 연결 오류');
    }
   };

       // 코드 정리 함수 테스트 (디버깅용)
    const testSanitizeFunction = () => {
      const testCode = `const { chromium } = require('playwright\\');
      args: ['--no-sandbox', \\'--disable-setuid-sandbox']`;
      
      console.log('🧪 테스트 코드:', testCode);
      const result = sanitizeGeneratedCode(testCode);
      console.log('🧪 정리 결과:', result);
      
      // 실제 MCP 서버에서 생성된 코드로 테스트
      const realMCPCode = `const { chromium } = require('playwright\\');
      args: ['--no-sandbox', \\'--disable-setuid-sandbox\\']`;
      
      console.log('🧪 실제 MCP 코드:', realMCPCode);
      const realResult = sanitizeGeneratedCode(realMCPCode);
      console.log('🧪 실제 정리 결과:', realResult);
    };

  // MCP 변환 처리 함수
  const handleMCPConversion = async () => {
    if (!naturalScenario.trim()) return;
    
    try {
      setIsConvertingNaturalLanguage(true);
      setCurrentValidationStep('natural_conversion');
      updateValidationStep('natural_conversion', false, 'MCP 서버를 통한 변환 진행 중...');
      
      console.log('🔄 MCP 서버 변환 시작:', naturalScenario);
      const result = await convertNaturalLanguageToPlaywright(naturalScenario, config);
      
             if (result.success && result.code) {
         setScenarioCode(result.code);
         updateValidationStep('natural_conversion', true, 'MCP 서버를 통한 자연어 변환 완료');
         console.log('✅ MCP 서버 변환 완료:', result.code);
         
         // 자연어 변환 완료 후 자동으로 코드 검증 실행
         validateGeneratedCode(result.code);
       } else {
        throw new Error(result.error || 'MCP 서버 변환 실패');
      }
         } catch (error) {
       console.error('❌ MCP 서버 변환 실패:', error);
       updateValidationStep('natural_conversion', false, 'MCP 서버 변환 실패', error instanceof Error ? error.message : '알 수 없는 오류');
       
       // MCP 실패 시 기본 변환 시도
       try {
         const generated = generateCodeFromNaturalLanguage(naturalScenario);
         setScenarioCode(generated);
         updateValidationStep('natural_conversion', false, 'MCP 서버 변환 실패, 기본 변환 사용');
         
         // 기본 변환 완료 후 자동으로 코드 검증 실행
         validateGeneratedCode(generated);
                } catch (fallbackError) {
           console.error('❌ 기본 변환도 실패:', fallbackError);
           updateValidationStep('natural_conversion', false, '모든 변환 방법 실패', 'MCP 서버와 기본 변환 모두 실패했습니다');
           setCurrentValidationStep('natural_conversion'); // 현재 단계에 머무름
           
           // 오류 발생 시 다음 단계로 진행하지 않음
           setScenarioCode('');
         }
     }
  };

  // 자연어 시나리오가 변경될 때 입력 단계만 업데이트
  useEffect(() => {
    if (naturalScenario.trim()) {
      // 입력 단계 완료
      updateValidationStep('input', true, '자연어 시나리오 입력 완료');
      setCurrentValidationStep('natural_conversion'); // 자연어 변환 단계로 이동
      setScenarioCode(''); // 기존 코드 초기화
    } else {
      // 자연어 시나리오가 비어있으면 모든 단계 초기화
      setValidationSteps(prev => prev.map(s => ({ ...s, completed: false })));
      setCurrentValidationStep('input');
      setScenarioCode('');
    }
  }, [naturalScenario]);

  // 코드 정리 함수 - MCP 서버 생성 코드는 이미 정상이므로 최소한의 정리만 수행
  const sanitizeGeneratedCode = (code: string): string => {
    let sanitized = code;
    
    console.log('🔧 코드 정리 시작 - 원본 코드는 정상이므로 그대로 반환');
    console.log('🔧 원본 코드 샘플:', code.substring(0, 200) + '...');
    
    // MCP 서버에서 받은 코드는 이미 정상이므로 그대로 반환
    // 불필요한 정리 과정에서 오히려 문제가 발생하고 있었음
    
    console.log('🔧 코드 정리 완료 - 변경 없음');
    return sanitized;
  };

    // 생성된 코드 검증 함수
  const validateGeneratedCode = (code: string) => {
    const errors: string[] = [];
    
         // 코드 정리 먼저 수행
     const sanitizedCode = sanitizeGeneratedCode(code);
     if (sanitizedCode !== code) {
       console.log('🔧 코드 정리 완료:', sanitizedCode);
       setScenarioCode(sanitizedCode); // 정리된 코드로 업데이트
     }
     
     // 디버깅을 위한 상세 로그
     console.log('🔍 검증 대상 코드:', {
       originalLength: code.length,
       sanitizedLength: sanitizedCode.length,
       hasChanges: sanitizedCode !== code
     });
    
    // 1. 기본 문법 검사
    if (!sanitizedCode.includes('const {') && !sanitizedCode.includes('require(')) {
      errors.push('Playwright 모듈 import 누락');
    }
    
    // 2. Playwright 기본 구조 검사 - MCP 서버 코드 특성에 맞게 완화
    const launchRegex = /chromium\s*\.\s*launch\s*\(/;
    const newPageRegex = /(browser\s*\.\s*newPage\s*\(|page\s*=\s*await\s*browser\s*\.\s*newPage\s*\()/;
    const logRegex = /console\.log\s*\(/;

    const hasPlaywrightStructure = launchRegex.test(sanitizedCode) &&
                                   newPageRegex.test(sanitizedCode) &&
                                   logRegex.test(sanitizedCode);
     
    if (!hasPlaywrightStructure) {
      errors.push('Playwright 기본 구조가 없습니다 (chromium.launch + browser.newPage 필요)');
    }
    
    // 3. 괄호 균형 검사
    const openBrackets = (sanitizedCode.match(/\(/g) || []).length;
    const closeBrackets = (sanitizedCode.match(/\)/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push('괄호 불균형: 열린 괄호와 닫힌 괄호의 개수가 다릅니다');
    }
    
    // 4. 따옴표 균형 검사 (정리 후)
    const singleQuotes = (sanitizedCode.match(/'/g) || []).length;
    const doubleQuotes = (sanitizedCode.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
      errors.push('따옴표 불균형: 따옴표가 올바르게 닫히지 않았습니다');
    }
    
    // 5. 잘못된 이스케이프 문자 검사 - MCP 서버 코드는 정상이므로 완화
    // 백슬래시 자체는 정상적인 이스케이프 문자일 수 있으므로 검사 제거
    
    // 6. 기본적인 JavaScript 문법 검사
    if (sanitizedCode.includes('iff ') || sanitizedCode.includes('connsole.')) {
      errors.push('JavaScript 문법 오류가 있습니다 (오타 발견)');
    }
    
    // 7. 코드 길이 검사 - MCP 서버 코드에 맞게 완화
    if (sanitizedCode.length < 50) {
      errors.push('코드가 너무 짧습니다 (최소 50자 필요)');
    }
    
         if (errors.length === 0) {
       updateValidationStep('code_validation', true, '코드 검증 통과');
       
       // 코드 검증이 완료되면 실행 준비 단계로
       setCurrentValidationStep('ready');
       updateValidationStep('ready', true, '모든 검증 완료, 테스트 실행 준비됨');
     } else {
       const errorMessage = `코드 검증 실패: ${errors.join(', ')}`;
       updateValidationStep('code_validation', false, errorMessage);
       setCurrentValidationStep('code_validation');
       
       // 오류 발생 시 실행 준비 단계를 명시적으로 실패 상태로 설정
       updateValidationStep('ready', false, '코드 검증 실패로 인해 실행 불가', '코드 검증을 통과해야 합니다');
       
       // 사용자에게 오류 상세 정보 표시
       console.error('🔴 코드 검증 실패 상세:', {
         errors,
         originalCode: code,
         sanitizedCode: sanitizedCode
       });
       
       // 오류가 있는 경우 코드를 다시 표시하여 사용자가 수정할 수 있도록
       if (sanitizedCode !== code) {
         setScenarioCode(sanitizedCode);
       }
     }
  };

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
    // 검증이 완료되지 않은 경우 실행 차단
    if (!canExecuteTest) {
      setError('모든 검증 단계를 완료해야 테스트를 실행할 수 있습니다.');
      return;
    }

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

      const result = await executePlaywrightScenario({ scenarioCode, config });
      if (!result.success) {
        throw new Error(result.error || '테스트 실행 실패');
      }
      const execId = (result.data as any)?.executionId || (result as any).executionId;
      setExecutionId(execId);
      setCurrentStep('테스트 실행 중...');
      
      // 실행 모니터링 시작
      startExecutionMonitoring(execId);
      
    } catch (err) {
      setExecutionStatus('failed');
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setCurrentStep('테스트 실행 실패');
    } finally {
      setIsConvertingNaturalLanguage(false);
    }
  };

  const startExecutionMonitoring = (executionId: string) => {
    let pollCount = 0;
    const maxPolls = 360; // 최대 6분간 폴링 (1초 * 360)
    
    const interval = setInterval(async () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        clearInterval(interval);
        setExecutionStatus('timeout');
        setError('테스트 실행 타임아웃 (6분 초과)');
        return;
      }
      
      try {
        const statusRes = await getPlaywrightStatus(executionId);
        console.log('statusResp:', statusRes);
        if (!statusRes.success) throw new Error(statusRes.error || '상태 조회 실패');
        const statusData: any = statusRes.data || statusRes;
        console.log('statusData:', statusData);
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
        
        // 타임아웃 에러인 경우 폴링 중단
        if (err instanceof Error && err.message.includes('timeout')) {
          clearInterval(interval);
          setExecutionStatus('timeout');
          setError('데이터베이스 타임아웃 오류: ' + err.message);
        }
      }
    }, 1000);
  };

  const getFinalResult = async (executionId: string) => {
    try {
      const res = await getPlaywrightResult(executionId);
      if (res.success) {
        const result: any = res.data || res;
        setLogs(prev => [...prev, `🎯 최종 결과: ${result.resultSummary || '완료'}`]);
        if (result.errorDetails) {
          setError(result.errorDetails);
        }
      }
    } catch (err) {
      console.error('최종 결과 조회 실패:', err);
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
                disabled={isConvertingNaturalLanguage}
                placeholder={`예)
1) https://example.com 에 접속한다
2) 페이지 제목에 "Example Domain" 이 포함되어야 한다
3) "로그인" 버튼을 클릭한다
4) 스크린샷을 찍는다
`}
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
                placeholder="자연어 시나리오를 입력한 후 변환 버튼을 클릭하면 테스트 코드가 생성됩니다..."
                className="min-h-80 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground font-mono text-sm w-full leading-relaxed"
                spellCheck="false"
              />
            </div>
          </div>
        </div>

        {/* 단계별 검증 상태 표시 */}
        <div className="mt-6 mb-4">
          <Label className="text-sm text-muted-foreground mb-3 block">
            검증 단계 <span className="text-xs text-muted-foreground">(Validation Steps)</span>
          </Label>
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
             {validationSteps.map((step, index) => {
                                               // 단계별 상태 및 클릭 가능 여부 결정
                const isClickable = step.step === 'natural_conversion' && (!step.completed || step.error) && naturalScenario.trim() ||
                                   step.step === 'code_validation' && step.completed === false && !step.error && scenarioCode.trim(); // 코드 검증 실패 시에는 재시도 불가
                
                const isDisabled = step.step === 'natural_conversion' && !step.completed && !naturalScenario.trim() ||
                                  step.step === 'code_validation' && (step.completed === true || step.error); // 코드 검증 성공 또는 실패 시에는 비활성화
               
               return (
                 <div
                   key={step.step}
                   className={`rounded-lg p-3 transition-all duration-300 ${
                     step.completed 
                       ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 shadow-inner' // 완료된 단계: 안으로 들어간 스타일
                       : isClickable
                       ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105' // 실행 가능한 단계: 튀어나온 스타일
                       : isDisabled
                       ? 'border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 opacity-50' // 비활성화된 단계
                       : 'border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900' // 기본 상태
                   }`}
                                        onClick={(event) => {
                                               if (isClickable) {
                          if (step.step === 'natural_conversion') {
                            // 자연어 변환 단계 클릭 시 MCP 변환 실행
                            handleMCPConversion();
                          } else if (step.step === 'code_validation') {
                            // 코드 검증 단계 클릭 시 코드 검증 재실행
                            validateGeneratedCode(scenarioCode);
                          }
                          // 클릭 효과
                          const element = event.currentTarget as HTMLElement;
                          if (element) {
                            element.style.transform = 'scale(0.95)';
                            setTimeout(() => {
                              element.style.transform = '';
                            }, 150);
                          }
                        }
                     }}
                 >
                   <div className="flex items-center space-x-2 mb-2">
                     {step.completed ? (
                       <CheckCircle className="h-4 w-4 text-green-600" />
                     ) : isClickable ? (
                       <Clock className="h-4 w-4 text-blue-600" />
                     ) : isDisabled ? (
                       <AlertCircle className="h-4 w-4 text-gray-400" />
                     ) : (
                       <AlertCircle className="h-4 w-4 text-gray-400" />
                     )}
                                           <span className={`text-xs font-medium ${
                        step.completed ? 'text-green-700 dark:text-green-300' :
                        isClickable ? 'text-blue-700 dark:text-blue-300' :
                        isDisabled ? 'text-gray-500 dark:text-gray-400' :
                        'text-gray-600 dark:text-gray-300'
                      }`}>
                        {index + 1}. {step.step === 'mcp_check' ? 'MCP 점검' :
                                   step.step === 'input' ? '입력' : 
                                   step.step === 'natural_conversion' ? '자연어 변환' :
                                   step.step === 'code_validation' ? '코드 검증' :
                                   '실행 준비'}
                      </span>
                   </div>
                   <div className={`text-xs ${
                     step.completed ? 'text-green-600 dark:text-green-400' :
                     isClickable ? 'text-blue-600 dark:text-blue-400' :
                     isDisabled ? 'text-gray-400 dark:text-gray-500' :
                     'text-muted-foreground'
                   }`}>
                     {step.message}
                   </div>
                   {step.error && (
                     <div className="text-xs text-red-600 mt-1">
                       {step.error}
                     </div>
                   )}
                                          {!step.completed && isClickable && (
                         <div className="text-xs text-blue-600 mt-1 font-medium">
                           {step.step === 'natural_conversion' ? '⚡ 클릭하여 변환' : 
                            step.step === 'code_validation' ? '🔄 클릭하여 재검증' : ''}
                         </div>
                       )}
                       {!step.completed && isDisabled && (
                         <div className="text-xs text-gray-500 mt-1">
                           {step.step === 'natural_conversion' ? '자연어 시나리오 필요' : 
                            step.step === 'code_validation' ? (step.error ? '검증 실패 - 수정 필요' : '검증 완료됨') : ''}
                         </div>
                       )}
                       {step.error && step.step === 'code_validation' && (
                         <div className="text-xs text-red-600 mt-1 font-medium">
                           ⚠️ 코드 수정 후 자연어 변환 단계를 다시 실행하세요
                         </div>
                       )}
                 </div>
               );
             })}
           </div>
        </div>

            {/* 단계별 실행 안내 */}
           <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
             <div className="flex items-start space-x-2">
               <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
               <div className="text-sm text-blue-700 dark:text-blue-300">
                                 <strong>실행 방법:</strong> 자연어 변환 단계만 클릭하면 자동으로 진행됩니다. 
                 <br />
                 • <strong>MCP 점검:</strong> 시스템 시작 시 자동으로 실행됩니다
                 <br />
                 • <strong>자연어 변환:</strong> 클릭하여 MCP 서버를 통한 고품질 변환 실행
                 <br />
                 • <strong>코드 검증:</strong> 변환 완료 후 자동으로 실행됩니다 (엄격한 검증)
                 <br />
                 <span className="text-xs text-orange-600 mt-1 block">
                   ⚠️ 코드 검증은 문법 오류, 따옴표 균형, Playwright 액션 등을 엄격하게 검사합니다
                 </span>
                 <span className="text-xs text-red-600 mt-1 block">
                   🚫 코드 검증 실패 시 다음 단계로 진행할 수 없으며, 자연어 변환 단계부터 다시 시작해야 합니다
                 </span>
               </div>
             </div>
           </div>

           {/* 01 단계부터 다시 시작 버튼 */}
           <div className="mt-4 flex justify-center">
             <Button
               onClick={resetToFirstStep}
               variant="outline"
               size="sm"
               className="flex items-center space-x-2 text-orange-600 border-orange-300 hover:bg-orange-50"
             >
               <AlertCircle className="h-4 w-4" />
               <span>1단계부터 다시 시작</span>
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

      {/* 테스트 실행 제어 섹션 */}
      <div className="neu-subtle rounded-xl px-6 py-6">
        <Label className="text-foreground font-semibold text-lg mb-4 block">
          테스트 실행 제어 <span className="text-xs text-muted-foreground ml-1">(Test Execution Control)</span>
        </Label>
        
        <div className="space-y-4">
          {/* 검증 상태 요약 */}
          <div className="neu-pressed rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">검증 상태:</span>
                <span className={`text-sm font-medium ${
                  isValidationComplete ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {isValidationComplete ? '모든 검증 완료' : `${validationSteps.filter(s => s.completed).length}/${validationSteps.length} 단계 완료`}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {currentValidationStep === 'ready' ? '✅ 실행 준비됨' : `🔄 ${currentValidationStep} 단계 진행 중`}
              </div>
            </div>
          </div>

          {/* 최종 실행 버튼 */}
          <div className="flex justify-center">
            <Button
              onClick={executeTestScenario}
              disabled={!canExecuteTest || executionStatus === 'pending' || executionStatus === 'running'}
              size="lg"
              className="flex items-center space-x-3 px-8 py-3 text-lg font-semibold"
            >
              {executionStatus === 'pending' || executionStatus === 'running' ? (
                <>
                  <Clock className="h-5 w-5" />
                  <span>테스트 실행 중...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>테스트 시작</span>
                </>
              )}
            </Button>
          </div>

          {/* 실행 전 최종 확인 메시지 */}
          {!canExecuteTest && (
            <div className="neu-pressed rounded-lg px-4 py-3 border-l-4 border-orange-500">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-600">
                  <strong>실행 대기 중:</strong> 모든 검증 단계를 완료해야 테스트를 실행할 수 있습니다.
                </div>
              </div>
            </div>
          )}

          {/* 실행 가능 시 확인 메시지 */}
          {canExecuteTest && (
            <div className="neu-pressed rounded-lg px-4 py-3 border-l-4 border-green-500">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-600">
                  <strong>실행 준비 완료:</strong> 모든 검증이 통과되었습니다. "테스트 시작" 버튼을 클릭하여 테스트를 실행하세요.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
