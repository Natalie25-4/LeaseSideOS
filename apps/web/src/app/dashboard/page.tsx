"use client";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttentionItem } from "@/components/dashboard/AttentionItem";
import { AskClarkPanel } from "@/components/clark/AskClarkPanel";
import { useLeaseStore } from "@/lib/leaseStore";

export default function DashboardPage() {
  const { leases, tasks } = useLeaseStore();

  return (
    <DashboardShell>
      <h1 className="text-xl font-semibold text-charcoal mb-6">Portfolio Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Leases managed" value={leases.length || "—"} />
        <StatCard label="Needs attention" value={tasks.length || "—"} />
        <StatCard label="Rent overdue" value="—" />
        <StatCard label="Reviews in 90 days" value="—" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-charcoal mb-2">What needs attention</h2>
            {tasks.length === 0 ? (
              <EmptyState
                title="Nothing to show yet"
                description="  Upload a lease to start seeing what needs your attention."
              />
            ) : (
              tasks.map((task) => (
                <AttentionItem
                  key={task.id}
                  priority={task.priority}
                  title={task.title}
                  description={task.description}
                  clauseLabel={task.clauseLabel}
                  actionLabel="Review"
                />
              ))
            )}
          </div>
        </div>

        <div className="h-[600px]">
          <AskClarkPanel />
        </div>
      </div>
    </DashboardShell>
  );
}