"use client";
import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLeaseStore } from "@/lib/leaseStore";
 
export default function LeasesPage() {
  const { leases, addLease } = useLeaseStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Extraction failed");

      const data = await res.json();
      addLease({ filename: data.filename, clauses: data.clauses });
    } catch (err) {
      setError("Something went wrong extracting this lease. Check the Python service is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-charcoal">Leases</h1>
        <label>
          <input type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
          <span className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary-hover">
            Upload lease
          </span>
        </label>
      </div>

      {loading && (
        <div className="bg-surface border border-border rounded-lg p-5 mb-4">
          <div className="h-4 w-1/3 mb-3 rounded bg-gray-200" />
          <div className="h-3 w-full mb-2 rounded bg-gray-200" />
          <div className="h-3 w-5/6 mb-2 rounded bg-gray-200" />
          <div className="h-3 w-2/3 rounded bg-gray-200" />
        </div>
      )}
      {error && <p className="text-sm text-critical mb-4">{error}</p>}

      {leases.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-5">
          <EmptyState
            title="No leases uploaded yet"
            description="Upload a lease to have Clark start extracting clauses and key terms."
            action={
              <label>
                 <input type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
                 <span className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium cursor-pointer hover:bg-primary-hover">
                   Upload your first lease
                 </span>
              </label>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {leases.map((lease, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5">
              <h3 className="font-semibold text-charcoal mb-3">{lease.filename}</h3>
              <div className="flex flex-col gap-2">
                {lease.clauses.map((clause, j) => (
                  <div key={j} className="text-sm border-b border-border last:border-0 py-2">
                    <span className="font-medium text-charcoal capitalize">
                      {clause.category.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">Page {clause.page}</span>
                    <p className="text-gray-600 mt-1">{clause.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}