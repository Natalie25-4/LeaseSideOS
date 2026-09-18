import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AccountingPage() {
  return (
    <DashboardShell>
      <h1 className="text-xl font-semibold text-charcoal mb-6">Accounting</h1>
      <div className="bg-surface border border-border rounded-lg p-5">
        <EmptyState
          title="No financial data yet"
          description="Rent, OPEX, and payment status will appear here once leases are added."
        />
      </div>
    </DashboardShell>
  );
}