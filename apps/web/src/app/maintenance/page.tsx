import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MaintenancePage() {
  return (
    <DashboardShell>
      <h1 className="text-xl font-semibold text-charcoal mb-6">Maintenance</h1>
      <div className="bg-surface border border-border rounded-lg p-5">
        <EmptyState
          title="No maintenance requests yet"
          description="Requests logged against a property will appear here."
        />
      </div>
    </DashboardShell>
  );
}