"use client";

import { useState } from "react";
import type { MaintenanceRequest, MaintenanceStatus } from "../../lib/types";
import StatusBadge from "./StatusBadge";

const STATUS_OPTIONS: MaintenanceStatus[] = ["logged", "assigned", "in_progress", "resolved"];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * "Build status update UI" + "Build assignment UI" (Maintenance progress
 * tracking, SPRINT 11) - a status dropdown and an assign field inline per
 * row, so a request's full lifecycle (logged -> assigned -> in_progress ->
 * resolved) can be walked through without leaving the page.
 */
export default function MaintenanceTable({
  requests,
  onStatusChange,
  onAssign,
}: {
  requests: MaintenanceRequest[];
  onStatusChange: (id: string, status: MaintenanceStatus) => Promise<void>;
  onAssign: (id: string, assignedTo: string) => Promise<void>;
}) {
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assigneeInput, setAssigneeInput] = useState("");

  function startAssign(request: MaintenanceRequest) {
    setAssigningId(request.id);
    setAssigneeInput(request.assignedTo ?? "");
  }

  async function submitAssign(id: string) {
    if (!assigneeInput.trim()) return;
    await onAssign(id, assigneeInput.trim());
    setAssigningId(null);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-charcoal/50">
            <th className="px-4 py-3 font-medium">Property</th>
            <th className="px-4 py-3 font-medium">Tenant</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Logged</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Assigned to</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr
              key={request.id}
              className="border-b border-border last:border-0 hover:bg-surface"
            >
              <td className="px-4 py-4 font-medium text-charcoal">
                {request.propertyName}
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {request.tenantName}
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {request.description}
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {formatDate(request.createdAt)}
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-col gap-1">
                  <StatusBadge status={request.status} />
                  <select
                    aria-label={`Propose status for ${request.propertyName}`}
                    value={request.status}
                    onChange={(e) =>
                      onStatusChange(request.id, e.target.value as MaintenanceStatus)
                    }
                    className="rounded border border-border bg-surface px-1.5 py-1 text-xs text-charcoal/70"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td className="px-4 py-4 text-charcoal/80">
                {assigningId === request.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={assigneeInput}
                      onChange={(e) => setAssigneeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitAssign(request.id);
                        if (e.key === "Escape") setAssigningId(null);
                      }}
                      placeholder="Name"
                      aria-label="Proposed assignee"
                      maxLength={200}
                      className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-xs text-charcoal"
                    />
                    <button
                      onClick={() => submitAssign(request.id)}
                      className="text-xs font-medium text-primary hover:text-primary-hover"
                    >
                      Request approval
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startAssign(request)}
                    className="text-xs text-charcoal/70 hover:text-primary"
                  >
                    {request.assignedTo ?? "Assign..."}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
