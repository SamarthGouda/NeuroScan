import { AppSidebar } from "../app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppSidebarExample() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <p className="text-muted-foreground">Sidebar navigation example</p>
        </main>
      </div>
    </SidebarProvider>
  );
}
