import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function InboxPage() {
  return (
    <DashboardShell>
      <h1 className="text-xl font-semibold text-charcoal mb-6">Smart Inbox</h1>
      <div className="bg-surface border border-border rounded-lg p-5">
        <EmptyState
          title="No emails connected yet"
          description="Once connected, emails will be matched to properties and leases automatically."
        />
      </div>
    </DashboardShell>
  );
}