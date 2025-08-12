import React from 'react';

interface FooterProps {
  connectionStatus: string;
}

export function Footer({ connectionStatus }: FooterProps) {
  return (
    <footer className="neu-flat border-t border-white/10 w-full flex-shrink-0">
      <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-4 w-full">
        <span>© 2025 MCP 웹사이트 테스터</span>
        <div className="flex items-center space-x-3">
          <span>버전 1.0.0</span>
          {connectionStatus === 'connected' && (
            <span className="text-green-600">• 연결됨</span>
          )}
          {connectionStatus === 'demo' && (
            <span className="text-purple-600">• 데모 모드</span>
          )}
        </div>
      </div>
    </footer>
  );
} 