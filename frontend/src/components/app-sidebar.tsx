import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  FileText,
  Brain,
  LogOut,
  Upload,
  Stethoscope,
  FolderOpen,
  BarChart3,
  Settings,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
}

const menuConfig: Record<string, MenuItem[]> = {
  admin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "User & Team Management", url: "/users", icon: Users },
    { title: "Audit Logs", url: "/audit-logs", icon: ShieldCheck },
    { title: "Reports", url: "/reports", icon: FileText },
    { title: "System Statistics", url: "/statistics", icon: BarChart3 },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  doctor: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Patient Scans", url: "/cases", icon: Stethoscope },
    { title: "New Analysis", url: "/upload", icon: Upload },
    { title: "Cases", url: "/cases", icon: FolderOpen },
    { title: "Reports", url: "/reports", icon: FileText },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  technician: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Upload Scans", url: "/upload", icon: Upload },
    { title: "Recent Uploads", url: "/cases", icon: Activity },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
};

const roleDisplay: Record<string, { label: string; badge: string; color: string }> = {
  admin: { label: "Hospital Administrator", badge: "Admin", color: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800" },
  doctor: { label: "Lead Neuroradiologist", badge: "Doctor", color: "bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:border-cyan-800" },
  technician: { label: "MRI Technologist", badge: "Technician", color: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800" },
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const userRole = user?.role || "doctor";
  const menuItems = menuConfig[userRole] || menuConfig.doctor;
  const roleInfo = roleDisplay[userRole] || roleDisplay.doctor;

  return (
    <Sidebar className="border-r border-border/60 bg-card/50 backdrop-blur-md">
      <SidebarHeader className="border-b border-border/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <Brain className="h-6 w-6 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold tracking-tight text-foreground">NEUROSCAN AI</p>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${roleInfo.color}`}>
                {roleInfo.badge}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{user?.fullName || roleInfo.label}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                const IconComponent = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logout()}
              className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
