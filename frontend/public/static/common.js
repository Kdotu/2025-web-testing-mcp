// MCP 웹사이트 테스터 - 공통 JavaScript (예시용)

// 전역 변수
let currentPage = 'dashboard';
let isLoading = false;
let isMobile = window.innerWidth <= 768;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 앱 초기화
function initializeApp() {
    setupEventListeners();
    setupMobileDetection();
    initializePage();
    setupKeyboardShortcuts();
    showNotification('예시 화면이 로드되었습니다.', 'info');
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 사이드바 메뉴 버튼들
    const menuButtons = document.querySelectorAll('.sidebar-menu-btn');
    menuButtons.forEach(button => {
        button.addEventListener('click', handleMenuClick);
    });

    // 모바일 메뉴 버튼
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    }

    // 창 크기 변경 감지
    window.addEventListener('resize', handleResize);

    // 클릭 가능한 활동 항목들
    const clickableItems = document.querySelectorAll('.activity-item.clickable');
    clickableItems.forEach(item => {
        item.addEventListener('click', () => {
            showNotification('실제 앱에서는 테스트 결과 페이지로 이동합니다.', 'info');
        });
    });

    // 빠른 실행 버튼들
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            showNotification('실제 앱에서는 테스트 실행 페이지로 이동합니다.', 'info');
        });
    });
}

// 메뉴 클릭 처리
function handleMenuClick(event) {
    const button = event.currentTarget;
    const page = button.getAttribute('data-page');
    
    if (page && page !== currentPage) {
        // 예시에서는 실제 페이지 이동 대신 알림 표시
        const pageNames = {
            'dashboard': '대시보드',
            'test-execution': '테스트 실행',
            'test-results': '테스트 결과',
            'settings': '설정'
        };
        
        showNotification(`실제 앱에서는 ${pageNames[page]} 페이지로 이동합니다.`, 'info');
        
        // 활성 메뉴 업데이트
        updateActiveMenu(page);
        currentPage = page;
    }
}

// 활성 메뉴 업데이트
function updateActiveMenu(page) {
    const menuButtons = document.querySelectorAll('.sidebar-menu-btn');
    menuButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-page') === page) {
            button.classList.add('active');
        }
    });
}

// 모바일 감지 설정
function setupMobileDetection() {
    updateMobileState();
}

// 창 크기 변경 처리
function handleResize() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    if (wasMobile !== isMobile) {
        updateMobileState();
    }
}

// 모바일 상태 업데이트
function updateMobileState() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        if (isMobile) {
            sidebar.classList.remove('open');
        }
    }
}

// 모바일 사이드바 토글
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// 키보드 단축키 설정
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Escape 키로 모바일 사이드바 닫기
        if (e.key === 'Escape' && isMobile) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }
        
        // Alt + 숫자 키로 페이지 전환 시뮬레이션
        if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            const pages = ['dashboard', 'test-execution', 'test-results', 'settings'];
            const number = parseInt(e.key);
            
            if (number >= 1 && number <= 4) {
                e.preventDefault();
                const pageNames = {
                    'dashboard': '대시보드',
                    'test-execution': '테스트 실행',
                    'test-results': '테스트 결과',
                    'settings': '설정'
                };
                const targetPage = pages[number - 1];
                showNotification(`실제 앱에서는 ${pageNames[targetPage]} 페이지로 이동합니다.`, 'info');
                updateActiveMenu(targetPage);
                currentPage = targetPage;
            }
        }
    });
}

// 페이지 초기화
function initializePage() {
    // 현재 페이지 감지 (예시에서는 항상 dashboard)
    currentPage = 'dashboard';
    updateActiveMenu(currentPage);
}

// 알림 표시 함수
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 400px;
        padding: 1rem 1.5rem;
        background: var(--card);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 0.75rem;
        box-shadow: 12px 12px 24px var(--neu-shadow-dark), -12px -12px 24px var(--neu-shadow-light);
        color: var(--foreground);
        font-size: 0.875rem;
        animation: slideInRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--primary); flex-shrink: 0;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

// 애니메이션 CSS 추가
const animationCSS = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;

// 스타일 태그 추가
const styleTag = document.createElement('style');
styleTag.textContent = animationCSS;
document.head.appendChild(styleTag);

// 유틸리티 함수들
function formatDate(date) {
    return new Date(date).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 예시용 데모 함수들
function simulateTest() {
    showNotification('테스트를 시작합니다...', 'info');
    
    setTimeout(() => {
        showNotification('테스트가 완료되었습니다!', 'success');
    }, 3000);
}

function showResults() {
    showNotification('테스트 결과를 표시합니다.', 'info');
}

// 전역 함수로 내보내기 (예시용)
window.showNotification = showNotification;
window.simulateTest = simulateTest;
window.showResults = showResults;