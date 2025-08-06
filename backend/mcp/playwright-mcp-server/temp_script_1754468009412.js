
const { test, expect } = require('@playwright/test');

test('E2E Test for http://localhost:3100/', async ({ page }) => {
  console.log('Starting E2E test for: http://localhost:3100/');
  
  // 페이지 로드
  await page.goto('http://localhost:3100/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // 기본 검증
  await expect(page).toHaveTitle(/./);
  
  // 스크린샷 캡처
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  
  // 성능 메트릭 수집
  const performanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
    };
  });
  
  console.log('Performance metrics:', JSON.stringify(performanceMetrics));
  
  // 테스트 결과 반환
  test.info().annotations.push({
    type: 'test-result',
    description: 'E2E Test Results',
    data: {
      url: 'http://localhost:3100/',
      browser: 'chromium',
      performanceMetrics,
      timestamp: new Date().toISOString()
    }
  });
});
