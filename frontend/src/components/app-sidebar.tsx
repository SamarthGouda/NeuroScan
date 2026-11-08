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
  Cpu,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";

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
  admin: { label: "Hospital Administrator", badge: "Admin", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  doctor: { label: "Lead Neuroradiologist", badge: "Doctor", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  technician: { label: "MRI Technologist", badge: "Technician", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const userRole = user?.role || "doctor";
  const menuItems = menuConfig[userRole] || menuConfig.doctor;
  const roleInfo = roleDisplay[userRole] || roleDisplay.doctor;

  return (
    <Sidebar className="border-r border-border/70 bg-card/60 backdrop-blur-2xl transition-all duration-300">
      {/* Institutional Medical Header */}
      <SidebarHeader className="border-b border-border/70 p-4">
        <div className="flex items-center justify-between">
          <Logo size="sm" href="/" showBadge badgeText={roleInfo.badge} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground truncate">{user?.fullName || roleInfo.label}</p>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${roleInfo.color}`}>
              {roleInfo.badge}
            </Badge>
            {user?.roles && user.roles.length > 1 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono text-cyan-400 bg-cyan-500/10 border-cyan-500/20" title={`Authorized roles: ${user.roles.join(', ')}`}>
                +{user.roles.length - 1}
              </Badge>
            )}
          </div>
        </div>

        {/* AI Engine Telemetry Pill */}
        <div className="mt-3 rounded-lg bg-background/60 border border-border/60 p-2 text-[11px] flex items-center justify-between font-mono">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Cpu className="h-3.5 w-3.5 text-cyan-500" />
            <span>CNN-ViT Hybrid</span>
          </div>
          <span className="text-emerald-500 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ONLINE
          </span>
        </div>
      </SidebarHeader>

      {/* Navigation Links */}
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 mb-2 font-mono">
            Clinical Modules
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
                      className={`relative w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-200 ${isActive
                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-cyan-400"
                          : "text-muted-foreground hover:bg-card hover:text-foreground hover:border hover:border-border/50"
                        }`}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <IconComponent className={`h-4 w-4 shrink-0 transition-transform ${isActive ? "text-cyan-400 scale-105" : "text-muted-foreground"}`} />
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

      {/* Footer with PACS Status & Sign Out */}
      <SidebarFooter className="border-t border-border/70 p-3 bg-card/40">
        {/* HIPAA / Compliance pill */}
        <div className="mb-2 px-2 py-1.5 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PACS · HIPAA Compliant
          </span>
          <span>v3.0.4</span>
        </div>
        <SidebarMenu className="space-y-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logout()}
              className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out Workstation</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
