import React from 'react';
import { Menu } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';
import { ConnectionStatus } from './ConnectionStatus';

interface HeaderProps {
  activeTab: string;
  navigation: Array<{ id: string; name: string }>;
  connectionStatus: string;
  connectionError: string | null;
  isInDemoMode: boolean;
  onToggleDemoMode: () => void;
  onShowDebug: () => void;
}

export function Header({
  activeTab,
  navigation,
  connectionStatus,
  connectionError,
  isInDemoMode,
  onToggleDemoMode,
  onShowDebug
}: HeaderProps) {
  const currentPageName = navigation.find(nav => nav.id === activeTab)?.name || "메인";

  return (
    <header className="neu-flat border-b border-white/10 w-full shadow-[0_4px_16px_rgba(0,0,0,0.1),0_8px_32px_rgba(99,102,241,0.4)] flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-4 w-full">
        <div className="flex items-center space-x-4">
          <div className="neu-button rounded-lg p-2">
            <SidebarTrigger className="text-primary">
              <Menu className="h-4 w-4" />
            </SidebarTrigger>
          </div>
          <h2 className="text-xl font-semibold text-primary truncate">
            {currentPageName}
          </h2>
        </div>
        
        <ConnectionStatus
          status={connectionStatus}
          error={connectionError}
          isDemoMode={isInDemoMode}
          onToggleDemoMode={onToggleDemoMode}
          onShowDebug={onShowDebug}
        />
      </div>
    </header>
  );
} 