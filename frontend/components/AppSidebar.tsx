import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "./ui/sidebar";
import { BarChart3, Play, FileText, Settings as SettingsIcon } from "lucide-react";

const navigation = [
  { id: "dashboard", name: "메인", icon: BarChart3 },
  { id: "test-execution", name: "테스트 실행", icon: Play },
  { id: "test-results", name: "테스트 결과", icon: FileText },
  { id: "settings", name: "설정", icon: SettingsIcon },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
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
          {navigation.map((item) => (
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
                <item.icon className="mr-4 h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}