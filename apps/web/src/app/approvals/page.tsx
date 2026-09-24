"use client";
import { useState } from "react";
import Link from "next/link";
import { approvalRequest, type ApprovalData } from "../lib/approvals";

export default function ApprovalsPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<ApprovalData | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    setBusy(true); setError(""); setMessage("");
    try { setData(await approvalRequest(token)); }
    catch (err) { setData(null); setError(err instanceof Error ? err.message : "Unable to load approvals"); }
    finally { setBusy(false); }
  }
  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await approvalRequest(token, id, decision, reasons[id] ?? "");
      setData(previous => previous ? { ...previous, actions: previous.actions.map(a => a.id === id ? result.action : a) } : null);
      setMessage(decision === "approve" ? "Approved and applied to the maintenance record." : "Rejected. The maintenance record was not changed.");
      setData(await approvalRequest(token));
    } catch (err) { setError(err instanceof Error ? err.message : "Decision could not be confirmed. Refresh before retrying."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-4xl p-6 text-charcoal">
    <Link className="underline" href="/maintenance">Back to maintenance</Link>
    <h1 className="mt-6 text-2xl font-semibold">Action approvals</h1>
    <p className="my-3">Review the exact change before applying it. Approval updates the local maintenance record; it does not send work orders or payments.</p>
    <form className="my-6 flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void load(); }}>
      <label>PM approval key<input className="block rounded border p-2" type="password" autoComplete="off" value={token} disabled={busy} onChange={e => { setToken(e.target.value); setData(null); setMessage(""); }} required /></label>
      <button className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy}>Load / refresh</button>
      <button className="rounded border px-4 py-2" type="button" disabled={busy} onClick={() => { setToken(""); setData(null); setReasons({}); setMessage(""); setError(""); }}>Lock</button>
    </form>
    {error && <p role="alert" className="my-4 text-red-700">{error}</p>}
    {message && <p role="status" className="my-4 text-green-800">{message}</p>}
    {data && data.actions.length === 0 && <p>No actions awaiting review or in history.</p>}
    {data && [...data.actions].reverse().map(action => <article key={action.id} className="my-4 rounded-lg border p-5">
      <h2 className="text-lg font-semibold">{action.propertyName} — {action.state}</h2>
      <p className="my-2">{action.before.description}</p>
      <p>Current at proposal: {action.before.status.replaceAll("_", " ")} · Assigned to {action.before.assignedTo || "nobody"}</p>
      <p className="my-3 font-semibold">Proposed: {action.change.type === "assign" ? `assign to ${action.change.assignedTo}` : `change status to ${action.change.status.replaceAll("_", " ")}`}</p>
      <p className="text-sm">Requested {new Date(action.createdAt).toLocaleString()}</p>
      {action.state === "pending" ? <div className="mt-4">
        <label>Reason (optional)<textarea className="my-2 block w-full rounded border p-2" maxLength={1000} value={reasons[action.id] ?? ""} disabled={busy} onChange={e => setReasons({ ...reasons, [action.id]: e.target.value })} /></label>
        <button disabled={busy} className="mr-3 rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => void decide(action.id, "approve")}>Approve and apply</button>
        <button disabled={busy} className="rounded border px-4 py-2 disabled:opacity-50" onClick={() => void decide(action.id, "reject")}>Reject</button>
      </div> : <p className="mt-3">Decided by {action.decidedBy}: {action.reason || "No reason provided"}</p>}
      <details className="mt-4"><summary>Audit history</summary><ul>{data.audit.filter(event => event.actionId === action.id).map((event, i) => <li key={i}>{event.event} · {event.actor} · {new Date(event.at).toLocaleString()}</li>)}</ul></details>
    </article>)}
  </main>;
}
