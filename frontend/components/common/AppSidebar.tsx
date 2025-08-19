import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "../ui/sidebar";
import { BarChart3, Play, FileText, Settings as SettingsIcon } from "lucide-react";

// 아이콘 컴포넌트 매핑 함수
const getIconComponent = (id: string) => {
  const iconMap: { [key: string]: any } = {
    'dashboard': BarChart3,
    'test-execution': Play,
    'test-results': FileText,
    'settings': SettingsIcon,
  };
  return iconMap[id] || BarChart3;
};



interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  navigation: Array<{
    id: string;
    name: string;
    component?: any;
    url: string;
  }>;
}

export function AppSidebar({ activeTab, onTabChange, navigation }: AppSidebarProps) {
  return (
    <Sidebar className="border-none neu-raised" collapsible="offcanvas">
      <SidebarHeader className="px-6 py-6 border-b border-white/20">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 neu-accent rounded-xl flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg text-foreground font-semibold truncate">
              MCP 테스터
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              웹사이트 테스트 플랫폼
            </p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-4 py-6">
        <SidebarMenu className="space-y-3">
          {navigation.map((item) => {
            // 아이콘 컴포넌트 동적 매핑
            const IconComponent = getIconComponent(item.id);
            
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={activeTab === item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`
                    w-full justify-start rounded-xl px-6 py-4 text-base font-medium
                    transition-all duration-200 min-h-[3rem]
                    ${activeTab === item.id 
                      ? 'neu-button-active text-primary-foreground bg-primary' 
                      : 'neu-button text-foreground hover:text-primary'
                    }
                  `}
                >
                  <IconComponent className="mr-4 h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
} 