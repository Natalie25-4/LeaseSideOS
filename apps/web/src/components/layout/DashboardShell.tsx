import { Sidebar } from "@/components/ui/Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  );
}