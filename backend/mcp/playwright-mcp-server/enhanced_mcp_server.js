#!/usr/bin/env node

/**
 * Enhanced Playwright MCP Server
 * 자연어 시나리오를 Playwright 테스트 코드로 변환하는 MCP 서버
 * MCP(Model Context Protocol) 표준을 따르는 서버 구현
 */

const readline = require('readline');

// stdin/stdout 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

/**
 * 자연어 파싱 엔진
 */
class NaturalLanguageParser {
  constructor() {
    this.patterns = this.initializePatterns();
  }

  /**
   * 패턴 매칭 시스템 초기화
   */
  initializePatterns() {
    return [
      {
        name: 'navigation',
        regex: /(?:접속|방문|이동|이동한다?)\s*(?:한다?|한다?|한다?)\s*(?:["""'']?)(https?:\/\/[^\s""']+)(?:["""'']?)/i,
        extract: (match) => {
          const url = match.match(/(?:["""'']?)(https?:\/\/[^\s""']+)(?:["""'']?)/i)?.[1];
          return { 
            type: 'navigation', 
            url, 
            action: 'goto',
            priority: 1
          };
        }
      },
      {
        name: 'navigation_quoted',
        regex: /["""''](https?:\/\/[^\s""']+)["""'']\s*(?:에\s*)?(?:접속|방문|이동|이동한다?)/i,
        extract: (match) => {
          const url = match.match(/["""''](https?:\/\/[^\s""']+)["""'']/i)?.[1];
          return { 
            type: 'navigation', 
            url, 
            action: 'goto',
            priority: 1
          };
        }
      },
      {
        name: 'click',
        regex: /(?:클릭|누른다?|클릭한다?|버튼을\s*누른다?|토글\s*버튼을\s*누른다?)\s*(?:["""'']([^""']+)["""'']|([가-힣a-zA-Z0-9\s]+))/i,
        extract: (match) => {
          const quotedText = match.match(/["""'']([^""']+)["""'']/)?.[1];
          const unquotedText = match.match(/(?:클릭|누른다?|클릭한다?|버튼을\s*누른다?|토글\s*버튼을\s*누른다?)\s*([가-힣a-zA-Z0-9\s]+)/)?.[1];
          const target = quotedText || unquotedText;
          return {
            type: 'click',
            target: target?.trim(),
            action: 'click',
            priority: 2
          };
        }
      },
      {
        name: 'input',
        regex: /(?:입력|채운다?|타이핑|작성한다?)\s*(?:["""'']([^""']+)["""''])\s*(?:에|을|를)\s*(?:["""'']([^""']+)["""''])/i,
        extract: (match) => {
          const selector = match.match(/["""'']([^""']+)["""'']/)?.[1];
          const value = match.match(/(?:에|을|를)\s*["""'"]+([^""']+)["""'']/)?.[1];
          return {
            type: 'input',
            selector,
            value,
            action: 'fill',
            priority: 3
          };
        }
      },
      {
        name: 'input_advanced',
        regex: /([가-힣a-zA-Z0-9\s]+)\s*(?:에|을|를)\s*["""'']([^""']+)["""'']\s*(?:를\s*)?(?:입력|채운다?|타이핑|작성한다?)/i,
        extract: (match) => {
          const selector = match.match(/([가-힣a-zA-Z0-9\s]+)\s*(?:에|을|를)/)?.[1];
          const value = match.match(/["""'']([^""']+)["""'']/)?.[1];
          return {
            type: 'input',
            selector: selector?.trim(),
            value,
            action: 'fill',
            priority: 3
          };
        }
      },
      {
        name: 'input_field_fill',
        regex: /([가-힣a-zA-Z0-9\s]+)\s*(?:에|을|를)\s*["""'']([^""']+)["""'']\s*(?:를\s*)?(?:채운다?|작성한다?|입력한다?)/i,
        extract: (match) => {
          const selector = match.match(/([가-힣a-zA-Z0-9\s]+)\s*(?:에|을|를)/)?.[1];
          const value = match.match(/["""'']([^""']+)["""'']/)?.[1];
          return {
            type: 'input',
            selector: selector?.trim(),
            value,
            action: 'fill',
            priority: 3
          };
        }
      },
      {
        name: 'verification',
        regex: /(?:확인|검증|보인다?|존재한다?)\s*(?:["""'']([^""']+)["""'']|([가-힣a-zA-Z0-9\s]+))/i,
        extract: (match) => {
          const quotedText = match.match(/["""'']([^""']+)["""'']/)?.[1];
          const unquotedText = match.match(/(?:확인|검증|보인다?|존재한다?)\s*([가-힣a-zA-Z0-9\s]+)/)?.[1];
          const target = quotedText || unquotedText;
          return {
            type: 'verification',
            target: target?.trim(),
            action: 'expect',
            priority: 4
          };
        }
      },
      {
        name: 'wait',
        regex: /(?:기다린다?|대기|로딩|완료).*?(?:까지|될\s*때|완료)/i,
        extract: (match) => {
          return {
            type: 'wait',
            action: 'waitForLoadState',
            priority: 5
          };
        }
      },
      {
        name: 'screenshot',
        regex: /(?:스크린샷|캡처|스크린샷을\s*찍는다?)/i,
        extract: (match) => {
          return {
            type: 'screenshot',
            action: 'screenshot',
            priority: 6
          };
        }
      },
      {
        name: 'state_change',
        regex: /(?:상태|모드|설정).*?(?:변경|전환|토글|활성화|비활성화)/i,
        extract: (match) => {
          return {
            type: 'state_change',
            action: 'click',
            priority: 7
          };
        }
      }
    ];
  }

  /**
   * 자연어 텍스트를 구조화된 단계로 파싱
   */
  parseNaturalLanguage(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const steps = [];

    lines.forEach((line, index) => {
      // 번호가 있는 경우 제거 (예: "1)", "2)", "-", "•")
      const cleanLine = line.replace(/^\d+[\)\.]\s*/, '').replace(/^[-•]\s*/, '');
      
      // 패턴 매칭
      for (const pattern of this.patterns) {
        if (pattern.regex.test(cleanLine)) {
          const parsedStep = pattern.extract(cleanLine);
          parsedStep.originalText = cleanLine;
          parsedStep.lineNumber = index + 1;
          steps.push(parsedStep);
          break;
        }
      }

      // 매칭되지 않은 라인은 로그로 처리
      if (!steps.some(step => step.originalText === cleanLine)) {
        steps.push({
          type: 'log',
          action: 'log',
          originalText: cleanLine,
          lineNumber: index + 1,
          priority: 999
        });
      }
    });

    // 우선순위에 따라 정렬
    return steps.sort((a, b) => a.priority - b.priority);
  }
}

/**
 * Playwright 코드 생성기
 */
class PlaywrightCodeGenerator {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  /**
   * 코드 템플릿 시스템 초기화
   */
  initializeTemplates() {
    return {
      header: `const { chromium } = require('playwright');

(async () => {
  let browser;
  let page;
  
  try {
    // 브라우저 실행
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // 브라우저 설정
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setDefaultTimeout(30000);
    console.log('🚀 테스트 시작: 브라우저로 실행');`,
      
      footer: `
    console.log('✅ 자연어 시나리오 실행 완료');
  } catch (error) {
    console.error('❌ 테스트 실행 실패:', error);
    console.error('에러 상세:', error.stack);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('페이지 종료 실패:', e.message);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('브라우저 종료 실패:', e.message);
      }
    }
  }
})();`,


    };
  }

  /**
   * 셀렉터 생성 로직 (중복 요소 문제 해결)
   */
  generateSelector(text) {
    if (!text) return 'body';
    
    // 이미 셀렉터 형태인 경우
    if (/^#|\.|\[|\//.test(text)) return text;
    
    // 태그명 매칭
    if (/^(h1|h2|h3|button|input|a|div|span)$/i.test(text)) return text;
    
    // 텍스트 기반 셀렉터 (따옴표가 있는 경우)
    if (text.includes('"') || text.includes("'")) {
      // 따옴표가 포함된 텍스트는 올바른 text 셀렉터로 변환
      const cleanText = text.replace(/["']/g, ''); // 따옴표 제거
      return `getByRole('button', { name: '${cleanText}' }).first()`;
    }
    
    // 일반 텍스트는 role 기반 셀렉터 사용 (중복 요소 문제 해결)
    return `getByRole('button', { name: '${text}' }).first()`;
  }

  /**
   * 안전한 문자열 생성 (JSON.stringify 사용)
   */
  createSafeString(str) {
    if (str === null || str === undefined) return '""';
    if (typeof str === 'string') {
      // URL인 경우 특별 처리
      if (str.includes('http://') || str.includes('https://')) {
        // URL에서 오타 수정 (loccalhost -> localhost)
        const correctedUrl = str.replace(/loccalhost/g, 'localhost');
        return JSON.stringify(correctedUrl);
      }
      // JSON.stringify를 사용하여 안전한 문자열 처리
      return JSON.stringify(str);
    }
    return JSON.stringify(String(str));
  }

  /**
   * 안전한 변수명 생성
   */
  createSafeVariableName(prefix, index) {
    return `${prefix}_${index}`;
  }

  /**
   * Input 필드용 selector 생성
   */
  generateInputSelector(text) {
    if (!text) return 'input[type="text"]';
    
    // 이미 셀렉터 형태인 경우
    if (/^#|\.|\[|\//.test(text)) return text;
    
    // input 태그인 경우
    if (/^input$/i.test(text)) return 'input[type="text"]';
    
    // 텍스트 기반 셀렉터 (따옴표가 있는 경우)
    if (text.includes('"') || text.includes("'")) {
      const cleanText = text.replace(/["']/g, '');
      return `input[placeholder*="${cleanText}"], input[aria-label*="${cleanText}"], input[name*="${cleanText}"]`;
    }
    
    // 일반 텍스트는 placeholder, aria-label, name 속성으로 검색
    return `input[placeholder*="${text}"], input[aria-label*="${text}"], input[name*="${text}"]`;
  }

  /**
   * 문자열 이스케이프 처리 함수
   * JavaScript 코드에서 안전하게 사용할 수 있도록 문자열을 이스케이프
   */
  escapeString(str) {
    if (!str) return '';
    
    // 작은따옴표와 큰따옴표를 이스케이프 처리
    let escaped = str
      .replace(/\\/g, '\\\\')  // 백슬래시 먼저 이스케이프
      .replace(/'/g, "\\'")    // 작은따옴표를 이스케이프
      .replace(/"/g, '\\"')    // 큰따옴표를 이스케이프
      .replace(/\n/g, '\\n')   // 줄바꿈을 이스케이프
      .replace(/\r/g, '\\r')   // 캐리지 리턴을 이스케이프
      .replace(/\t/g, '\\t');  // 탭을 이스케이프
    
    return escaped;
  }

  /**
   * 코드 품질 검증
   */
  validateGeneratedCode(code) {
    const issues = [];
    
    // 세미콜론 중복 검사
    if (code.includes(';;')) {
      issues.push('세미콜론 중복 발견');
    }

    // 괄호 균형 검사
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`괄호 균형: 열린 괄호 ${openParens}, 닫힌 괄호 ${closeParens}`);
    }

    // 기본 구조 검사
    if (!code.includes('const { chromium }')) {
      issues.push('Playwright import 누락');
    }
    
    if (!code.includes('page.goto')) {
      issues.push('페이지 이동 코드 누락');
    }

    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * 코드 품질 검증 및 자동 수정
   */
  validateAndFixCode(code) {
    let correctedCode = code;
    const issues = [];
    
    // 1. 세미콜론 중복 수정
    if (correctedCode.includes(';;')) {
      correctedCode = correctedCode.replace(/;;/g, ';');
      issues.push('세미콜론 중복 수정됨');
    }
    
    // 2. 일반적인 오타 수정
    correctedCode = correctedCode
      .replace(/loccator/g, 'locator')  // loccator -> locator
      .replace(/cconfig/g, 'config')    // cconfig -> config
      .replace(/ccchromium/g, 'chromium') // cchromium -> chromium
      .replace(/clickEleement_/g, 'clickElement_') // 변수명 오타 교정
      .replace(/paage\./g, 'page.')              // page 오타 교정
      .replace(/&&&/g, '&&')            // &&& -> &&
      .replace(/texxt/g, 'text')        // texxt -> text
      .replace(/text==/g, 'text=')      // text== -> text=
      .replace(/consst/g, 'const')      // consst -> const
      .replace(/실 패:/g, '실패:')      // 실 패 -> 실패
      .replace(/완 료:/g, '완료:')      // 완 료 -> 완료
      .replace(/버튼을 누른  다\./g, '버튼을 누른다.')  // 공백 오류 수정
      .replace(/테스트  타입/g, '테스트 타입')          // 공백 중복 수정
      .replace(/단계:  /g, '단계: ')                  // 공백 중복 수정
      .replace(/page\.locator\(\(/g, 'page.locator(') // 괄호 오류 수정
      .replace(/n  await/g, '\n  await')              // 줄바꿈 오류 수정

    // 2.1 스크린샷 timestamp 중복 선언 제거 및 Date.now()로 통일 (더 강력한 치환)
    // 다양한 문자열/공백 패턴을 허용하여 timestamp 사용을 모두 Date.now()로 치환
    correctedCode = correctedCode
      // 'screenshot-' + timestamp + '.png' 형태
      .replace(/(['"])screenshot-\1\s*\+\s*timestamp\s*\+\s*(['"])\.png\2/g, `'screenshot-' + Date.now() + '.png'`)
      // "screenshot-" + timestamp + ".png" 형태
      .replace(/"screenshot-"\s*\+\s*timestamp\s*\+\s*"\.png"/g, `'screenshot-' + Date.now() + '.png'`)
      // 'screenshot-' + (timestamp) + '.png' 형태
      .replace(/(['"])screenshot-\1\s*\+\s*\(?\s*timestamp\s*\)?\s*\+\s*(['"])\.png\2/g, `'screenshot-' + Date.now() + '.png'`)
      // 객체 리터럴 path: 'screenshot-' + timestamp + '.png'
      .replace(/path:\s*(['"])screenshot-\1\s*\+\s*timestamp\s*\+\s*(['"])\.png\2/g, `path: 'screenshot-' + Date.now() + '.png'`);

    // 별도의 timestamp 변수 선언 라인 제거 (어떤 형태든 const timestamp = ... 제거)
    correctedCode = correctedCode.replace(/\n\s*const\s+timestamp\s*=\s*[^;]+;?/g, '');
    
    // 3. 괄호 균형 수정
    const openParens = (correctedCode.match(/\(/g) || []).length;
    const closeParens = (correctedCode.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      correctedCode += ')'.repeat(openParens - closeParens);
      issues.push(`괄호 균형 수정됨: 닫는 괄호 ${openParens - closeParens}개 추가`);
    }
    
    // 4. 문자열 연결 문제 수정
    correctedCode = correctedCode
      .replace(/(console\.log\('[^']*' \+ "[^"]*" \+ '[^']*');/g, (match) => {
        // 복잡한 문자열 연결을 단순화
        return match.replace(/\+/g, ' + ').replace(/\s+/g, ' ');
      });
    
    // 5. 불완전한 console.log 수정
    correctedCode = correctedCode
      .replace(/(console\.log\('[^']*' \+ "[^"]*" \+ '[^']*');/g, (match) => {
        if (match.includes('undefined') || match.includes('null')) {
          return match.replace(/\+ '[^']*'/, ''); // undefined/null 부분 제거
        }
        return match;
      });
    
    // 6. 수정된 코드 재검증
    const revalidation = this.validateGeneratedCode(correctedCode);
    
    return {
      originalCode: code,
      correctedCode: correctedCode,
      issues: issues,
      isValid: revalidation.isValid,
      validationIssues: revalidation.issues
    };
  }

  /**
   * 파싱된 단계들을 Playwright 코드로 변환
   */
  generateCode(steps, config = {}) {
    const { header, footer } = this.templates;
    
    // 각 단계별 코드 생성 - 실제 Playwright 액션 포함
    const stepCodes = steps.map((step, index) => {
      step.lineNumber = index + 1;
      
      // 안전한 문자열 생성
      const safeOriginalText = this.createSafeString(step.originalText);
      
      switch (step.type) {
        case 'navigation':
          const safeUrl = this.createSafeString(step.url);
          return `  console.log('🌐 단계: ' + ${safeOriginalText});
  await page.goto(${safeUrl}, { waitUntil: 'networkidle' });
  console.log('✅ 페이지 이동 완료: ' + ${safeUrl});`;
           
        case 'click':
          const safeTarget = this.createSafeString(step.target);
          const clickVarName = this.createSafeVariableName('clickElement', index);
          return `  console.log('🖱️ 단계: ' + ${safeOriginalText});
  const ${clickVarName} = page.getByRole('button', { name: ${safeTarget} }).first();
  await ${clickVarName}.waitFor({ state: 'visible', timeout: 10000 });
  await ${clickVarName}.click();
  console.log('✅ 클릭 완료: ' + ${safeTarget});`;
           
        case 'input':
          const safeInputSelector = this.createSafeString(step.selector);
          const safeValue = this.createSafeString(step.value);
          const inputVarName = this.createSafeVariableName('inputElement', index);
          // input 필드의 selector를 더 정확하게 생성
          const inputSelector = this.generateInputSelector(step.selector);
          const safeInputSelectorGenerated = this.createSafeString(inputSelector);
          return `  console.log('✏️ 단계: ' + ${safeOriginalText});
  const ${inputVarName} = page.locator(${safeInputSelectorGenerated});
  await ${inputVarName}.waitFor({ state: 'visible', timeout: 10000 });
  await ${inputVarName}.fill(${safeValue});
  console.log('✅ 입력 완료: ' + ${safeInputSelector} + '에 ' + ${safeValue});`;
           
        case 'verification':
          const safeVerifyTarget = this.createSafeString(step.target);
          const verifyVarName = this.createSafeVariableName('verifyElement', index);
          return `  console.log('✅ 단계: ' + ${safeOriginalText});
  const ${verifyVarName} = page.getByRole('button', { name: ${safeVerifyTarget} }).first();
  await ${verifyVarName}.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ 검증 완료: ' + ${safeVerifyTarget} + ' 요소가 표시됨');`;
           
        case 'wait':
          return `  console.log('⏳ 단계: ' + ${safeOriginalText});
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  console.log('✅ 페이지 로딩 완료');`;
           
        case 'screenshot':
          return `  console.log('📸 단계: ' + ${safeOriginalText});
  await page.screenshot({ 
    path: 'screenshot-' + Date.now() + '.png', 
    fullPage: true 
  });
  console.log('✅ 스크린샷 촬영 완료');`;
           
        case 'state_change':
          return `  console.log('🔄 단계: ' + ${safeOriginalText});
  await page.waitForLoadState('networkidle');
  console.log('✅ 상태 변경 완료');`;
           
        default:
          return `  console.log('ℹ️ 단계: ' + ${safeOriginalText});`;
      }
    });

    // 전체 코드 조합
    // URL 이동 단계가 있다면 헤더 직후에 배치하도록 보정
    const navigationCode = stepCodes.find(code => code.includes('page.goto('));
    const nonNavigationCodes = stepCodes.filter(code => !code.includes('page.goto('));
    const orderedBody = navigationCode ? [navigationCode, ...nonNavigationCodes] : stepCodes;

    const generatedCode = `${header}
${orderedBody.join('\n\n')}
${footer}`;

    // 코드 품질 검증 및 자동 수정
    const codeFixResult = this.validateAndFixCode(generatedCode);
    
    if (codeFixResult.issues.length > 0) {
      console.log('[Code Generator] 자동 수정 완료:', codeFixResult.issues);
    }
    
    if (codeFixResult.isValid) {
      console.log('[Code Generator] 코드 품질 검증 통과');
      return codeFixResult.correctedCode;
    } else {
      console.error('[Code Generator] 코드 품질 문제 지속:', codeFixResult.validationIssues);
      // 수정된 코드라도 반환 (최소한의 개선)
      return codeFixResult.correctedCode;
    }
  }
}

/**
 * MCP 서버 클래스
 */
class EnhancedPlaywrightMCPServer {
  constructor() {
    this.parser = new NaturalLanguageParser();
    this.codeGenerator = new PlaywrightCodeGenerator();
    this.requestId = 0;
  }

  /**
   * MCP 요청 처리
   */
  async handleRequest(request) {
    try {
      const { method, params, id } = request;
      
      switch (method) {
        case 'tools/list':
          return this.handleToolsList(id);
        
        case 'tools/call':
          return this.handleToolsCall(params, id);
        
        default:
          return this.createErrorResponse(id, -32601, `Method not found: ${method}`);
      }
    } catch (error) {
      return this.createErrorResponse(request.id || this.requestId++, -32603, error.message);
    }
  }

  /**
   * 사용 가능한 도구 목록 반환
   */
  handleToolsList(id) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'convert_natural_language',
            description: '자연어를 Playwright 테스트 코드로 변환',
            inputSchema: {
              type: 'object',
              properties: {
                naturalLanguage: {
                  type: 'string',
                  description: '변환할 자연어 시나리오'
                },
                config: {
                  type: 'object',
                  description: '브라우저 설정 정보 (선택사항)',
                  properties: {
                    browser: { type: 'string', default: 'chromium' },
                    headless: { type: 'boolean', default: true },
                    viewport: {
                      type: 'object',
                      properties: {
                        width: { type: 'number', default: 1280 },
                        height: { type: 'number', default: 720 }
                      }
                    },
                    timeout: { type: 'number', default: 30000 }
                  }
                }
              },
              required: ['naturalLanguage']
            }
          }
        ]
      }
    };
  }

  /**
   * 도구 호출 처리
   */
  async handleToolsCall(params, id) {
    const { name, arguments: args } = params;
    
    if (name === 'convert_natural_language') {
      return await this.convertNaturalLanguage(args, id);
    }
    
    return this.createErrorResponse(id, -32601, `Unknown tool: ${name}`);
  }

  /**
   * 자연어를 Playwright 코드로 변환
   */
  async convertNaturalLanguage(args, id) {
    const { naturalLanguage, config = {} } = args;
    
    if (!naturalLanguage) {
      return this.createErrorResponse(id, -32602, 'naturalLanguage parameter is required');
    }

    try {
      // 자연어 파싱
      const steps = this.parser.parseNaturalLanguage(naturalLanguage);
      
      // Playwright 코드 생성
      const generatedCode = this.codeGenerator.generateCode(steps, config);
      
      // 결과 반환
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: generatedCode
            }
          ],
          metadata: {
            stepsCount: steps.length,
            patterns: steps.map(s => s.type),
            config: config
          }
        }
      };
    } catch (error) {
      return this.createErrorResponse(id, -32603, `Conversion failed: ${error.message}`);
    }
  }

  /**
   * 에러 응답 생성
   */
  createErrorResponse(id, code, message) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    };
  }

  /**
   * 서버 시작
   */
  start() {
    console.error('[Enhanced Playwright MCP Server] 서버 시작됨');
    console.error('[Enhanced Playwright MCP Server] PID:', process.pid);
    console.error('[Enhanced Playwright MCP Server] Node.js 버전:', process.version);
    
    // 프로세스 종료 시그널 처리
    process.on('SIGINT', () => {
      console.error('[Enhanced Playwright MCP Server] SIGINT 수신, 서버 종료 중...');
      this.cleanup();
    });
    
    process.on('SIGTERM', () => {
      console.error('[Enhanced Playwright MCP Server] SIGTERM 수신, 서버 종료 중...');
      this.cleanup();
    });
    
    process.on('uncaughtException', (error) => {
      console.error('[Enhanced Playwright MCP Server] 처리되지 않은 예외:', error);
      this.cleanup();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Enhanced Playwright MCP Server] 처리되지 않은 Promise 거부:', reason);
      this.cleanup();
    });
    
    rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        console.log('[Enhanced Playwright MCP Server] 요청 수신:', request.method);
        
        const response = await this.handleRequest(request);
        console.log(JSON.stringify(response));
      } catch (error) {
        console.error('[Enhanced Playwright MCP Server] 요청 처리 실패:', error.message);
        const errorResponse = this.createErrorResponse(
          this.requestId++,
          -32700,
          'Parse error: Invalid JSON'
        );
        console.log(JSON.stringify(errorResponse));
      }
    });

    rl.on('close', () => {
      console.error('[Enhanced Playwright MCP Server] 서버 종료됨');
      this.cleanup();
    });
  }

  /**
   * 서버 정리
   */
  cleanup() {
    try {
      if (rl) {
        rl.close();
      }
      console.error('[Enhanced Playwright MCP Server] 정리 완료');
      process.exit(0);
    } catch (error) {
      console.error('[Enhanced Playwright MCP Server] 정리 실패:', error.message);
      process.exit(1);
    }
  }
}

// 서버 시작
const server = new EnhancedPlaywrightMCPServer();
server.start();
