import type { MaintenanceRequest, MaintenanceStatus } from "./types";
export interface ApprovalAction {
  id: string; requestId: string; propertyName: string;
  change: { type: "assign"; assignedTo: string } | { type: "status"; status: MaintenanceStatus };
  before: MaintenanceRequest; state: "pending" | "rejected" | "executed";
  createdAt: string; decidedAt?: string; decidedBy?: string; reason?: string;
}
export interface ApprovalData {
  actions: ApprovalAction[];
  audit: { actionId: string; event: string; at: string; actor: string }[];
}
const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export async function approvalRequest(token: string, id?: string, decision?: "approve" | "reject", reason = "") {
  const response = await fetch(`${base}/approvals${id ? `/${encodeURIComponent(id)}/decision` : ""}`, {
    method: id ? "POST" : "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(id ? { body: JSON.stringify({ decision, reason }) } : {}),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? "Approval request failed");
  return body;
}
