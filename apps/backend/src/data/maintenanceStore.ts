import { randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, openSync, closeSync, unlinkSync } from "fs";
import { dirname, resolve } from "path";

export type MaintenanceStatus = "logged" | "assigned" | "in_progress" | "resolved";
export interface MaintenanceRequest {
  id: string; leaseId: string; propertyId: string; propertyName: string;
  tenantName: string; description: string; status: MaintenanceStatus;
  assignedTo?: string; createdAt: string; updatedAt: string;
}
export type ActionChange = { type: "assign"; assignedTo: string } | { type: "status"; status: MaintenanceStatus };
export interface ApprovalAction {
  id: string; requestId: string; propertyName: string; change: ActionChange;
  before: MaintenanceRequest; state: "pending" | "rejected" | "executed";
  createdAt: string; decidedAt?: string; decidedBy?: string; reason?: string;
}
interface AuditEvent { actionId: string; event: "proposed" | "approved" | "rejected" | "executed"; at: string; actor: string; }
interface State { version: 1; requests: MaintenanceRequest[]; actions: ApprovalAction[]; audit: AuditEvent[]; }
export class ApprovalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function filePath() { return resolve(process.env.APPROVAL_STORE_PATH || "data/maintenance-approvals.json"); }
function load(): State {
  const file = filePath();
  if (!existsSync(file)) return { version: 1, requests: [], actions: [], audit: [] };
  const state = JSON.parse(readFileSync(file, "utf8"));
  if (state.version !== 1 || !Array.isArray(state.requests) || !Array.isArray(state.actions) || !Array.isArray(state.audit)) {
    throw new Error("Invalid approval store; refusing to overwrite it");
  }
  return state;
}
// Decision, local mutation and audit are written together, under a writer lock.
function transaction<T>(update: (state: State) => T): T {
  const file = filePath();
  mkdirSync(dirname(file), { recursive: true });
  const lock = file + ".lock";
  let fd: number;
  try { fd = openSync(lock, "wx"); } catch { throw new ApprovalError(503, "Approval store busy; retry later"); }
  const temp = file + "." + randomUUID() + ".tmp";
  try {
    const state = load();
    const result = update(state);
    writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600, flush: true });
    renameSync(temp, file);
    return result;
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
    closeSync(fd);
    unlinkSync(lock);
  }
}
export function getAllRequests() { return load().requests; }
export function getRequestById(id: string) { return load().requests.find(r => r.id === id); }
export function addRequest(input: Pick<MaintenanceRequest, "leaseId" | "propertyId" | "propertyName" | "tenantName" | "description">): MaintenanceRequest {
  return transaction(state => {
    const now = new Date().toISOString();
    const request: MaintenanceRequest = { ...input, id: randomUUID(), status: "logged", createdAt: now, updatedAt: now };
    state.requests.push(request);
    return request;
  });
}
export function proposeAction(requestId: string, change: ActionChange): ApprovalAction {
  return transaction(state => {
    const request = state.requests.find(r => r.id === requestId);
    if (!request) throw new ApprovalError(404, "Maintenance request not found");
    const existing = state.actions.find(a => a.state === "pending" && a.requestId === requestId && JSON.stringify(a.change) === JSON.stringify(change) && JSON.stringify(a.before) === JSON.stringify(request));
    if (existing) return existing;
    const action: ApprovalAction = { id: randomUUID(), requestId, propertyName: request.propertyName,
      change, before: structuredClone(request), state: "pending", createdAt: new Date().toISOString() };
    state.actions.push(action);
    state.audit.push({ actionId: action.id, event: "proposed", at: action.createdAt, actor: "requester" });
    return action;
  });
}
export function listApprovals() { const { actions, audit } = load(); return { actions, audit }; }
export function decideAction(id: string, decision: "approve" | "reject", actor: string, reason: string) {
  return transaction(state => {
    const action = state.actions.find(a => a.id === id);
    if (!action) throw new ApprovalError(404, "Action not found");
    if (action.state !== "pending") throw new ApprovalError(409, "Action has already been decided");
    const request = state.requests.find(r => r.id === action.requestId);
    const at = new Date().toISOString();
    if (decision === "approve") {
      if (!request || JSON.stringify(request) !== JSON.stringify(action.before)) {
        throw new ApprovalError(409, "Request changed since proposal; reject this action and submit a new one");
      }
      state.audit.push({ actionId: id, event: "approved", actor, at });
      if (action.change.type === "assign") {
        request.assignedTo = action.change.assignedTo;
        if (request.status === "logged") request.status = "assigned";
      } else if (action.change.type === "status") {
        request.status = action.change.status;
      } else { throw new ApprovalError(400, "Unsupported action type"); }
      request.updatedAt = at;
      action.state = "executed";
      state.audit.push({ actionId: id, event: "executed", actor, at });
    } else {
      action.state = "rejected";
      state.audit.push({ actionId: id, event: "rejected", actor, at });
    }
    action.decidedAt = at; action.decidedBy = actor; action.reason = reason;
    return { action, request };
  });
}
