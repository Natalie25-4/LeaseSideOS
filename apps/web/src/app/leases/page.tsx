"use client";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type LeaseRecord = {
  id: string;
  reference: string | null;
  status: string;
  commencement_date: string | null;
  expiry_date: string | null;
  property_name: string;
  tenant_name: string | null;
};

type Clause = {
  id: string;
  clause_type: string;
  clause_reference: string | null;
  page_number: number;
  source_text: string;
  filename: string;
};

type Answer = {
  answered: boolean;
  answer: string;
  verified?: boolean;
  mode?: string;
  citations: { clause_reference: string | null; page_number: number }[];
  provider: string;
};

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-NZ", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function LeasesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [records, setRecords] = useState<LeaseRecord[]>([]);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clauses, setClauses] = useState<Clause[]>([]);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);

  const loadLeases = useCallback(async () => {
    const res = await fetch(`${API}/api/leases`);
    if (!res.ok) throw new Error(String(res.status));
    const data: LeaseRecord[] = await res.json();
    setRecords(data);
    return data;
  }, []);

  const loadClauses = useCallback((leaseId: string) => {
    fetch(`${API}/api/leases/${leaseId}/clauses`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(setClauses)
      .catch(() => setClauses([]));
  }, []);

  useEffect(() => {
    loadLeases()
      .then((data) => {
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() =>
        setRecordsError(
          "Could not reach the lease API. Check the Express server is running on port 4000."
        )
      );
  }, [loadLeases]);

  useEffect(() => {
    if (!selectedId) return;
    setAnswer(null);
    loadClauses(selectedId);
  }, [selectedId, loadClauses]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API}/api/documents`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());

      const { document } = await res.json();
      await loadLeases();
      setSelectedId(document.lease_id);
      loadClauses(document.lease_id);
    } catch {
      setError(
        "Something went wrong reading this lease. Check the Python service is running on port 8000."
      );
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !selectedId) return;

    setAsking(true);
    setAnswer(null);

    try {
      const res = await fetch(`${API}/api/leases/${selectedId}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setAnswer(await res.json());
    } catch {
      setAnswer({
        answered: false,
        answer: "Clark could not be reached. Is the Python service running on port 8000?",
        citations: [],
        provider: "—",
      });
    } finally {
      setAsking(false);
    }
  };

  const selected = records.find((r) => r.id === selectedId) ?? null;

  const displayStatus = (lease: LeaseRecord) => {
    const expiry = lease.expiry_date ? new Date(lease.expiry_date) : null;
    const now = new Date();

    if (lease.status === "draft")
      return { label: "Under review", cls: "bg-blue-50 text-blue-600" };
    if (lease.status === "terminated")
      return { label: "Terminated", cls: "bg-gray-100 text-gray-600" };
    if (lease.status === "expired" || (expiry && expiry < now))
      return { label: "Expired", cls: "bg-red-50 text-red-500" };
    if (expiry && (expiry.getTime() - now.getTime()) / 86_400_000 <= 120)
      return { label: "Expiring soon", cls: "bg-amber-50 text-amber-600" };
    return { label: "Active", cls: "bg-green-50 text-green-600" };
  };

  const uploadButton = (label: string) => (
    <label>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleUpload}
        disabled={loading}
        className="hidden"
      />
      <span className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary-hover">
        {loading ? "Reading lease…" : label}
      </span>
    </label>
  );

  return (
    <DashboardShell>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Leases</h1>
          <p className="text-sm text-gray-500 mt-1">
            All uploaded commercial leases across your portfolio.
          </p>
        </div>
        {uploadButton("Upload lease")}
      </div>

      {recordsError && <p className="text-sm text-critical mb-4">{recordsError}</p>}
      {error && <p className="text-sm text-critical mb-4">{error}</p>}

      {records.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-5">
          <EmptyState
            title="No leases uploaded yet"
            description="Upload a lease to have Clark start extracting clauses and key terms."
            action={uploadButton("Upload your first lease")}
          />
        </div>
      ) : (
        <>
          <div className="bg-surface border border-border rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-4 font-normal">Tenant</th>
                  <th className="px-6 py-4 font-normal">Property</th>
                  <th className="px-6 py-4 font-normal">Status</th>
                  <th className="px-6 py-4 font-normal">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {records.map((lease) => {
                  const status = displayStatus(lease);
                  return (
                    <tr
                      key={lease.id}
                      onClick={() => setSelectedId(lease.id)}
                      className={`border-t border-border cursor-pointer ${
                        lease.id === selectedId ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-6 py-4 text-charcoal">{lease.tenant_name ?? "—"}</td>
                      <td className="px-6 py-4 text-gray-600">{lease.property_name}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-3 py-1 rounded-full ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(lease.expiry_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-semibold text-charcoal mb-1">Ask Clark</h2>
            <p className="text-sm text-gray-500 mb-4">
              {selected ? `Asking about ${selected.property_name}. ` : ""}
              Answers are checked against the document text.
            </p>

            <form onSubmit={handleAsk} className="flex gap-2 mb-4">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="How is the rent reviewed?"
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={asking || !selectedId}
                className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
              >
                {asking ? "Thinking…" : "Ask"}
              </button>
            </form>

            {answer && (
              <div className="text-sm">
                <p className={answer.answered ? "text-charcoal" : "text-gray-600 italic"}>
                  {answer.answer}
                </p>

                {answer.citations.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs text-gray-400 mb-2">Sources</p>
                    {answer.citations.map((c, i) => (
                      <p key={i} className="text-xs text-gray-600 mb-1">
                        {c.clause_reference ? `Clause ${c.clause_reference}, ` : ""}page{" "}
                        {c.page_number}
                      </p>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  {answer.verified
                    ? "Quote verified against the lease text"
                    : "Not traceable to a specific passage — treat with care"}
                  {" · "}
                  {answer.mode === "model"
                    ? `answered by ${answer.provider}`
                    : answer.mode === "retrieval"
                    ? "matched from the lease text"
                    : "answered from stored clauses"}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}