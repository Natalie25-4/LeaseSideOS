"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface Clause {
  category: string;
  text: string;
  page: number;
  confidence: number;
}

export interface Lease {
  filename: string;
  clauses: Clause[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  clauseLabel: string;
}

const priorityByCategory: Record<string, Task["priority"]> = {
  rent_review: "critical",
  termination_notice: "high",
  renewal_option: "high",
  outgoings: "medium",
  maintenance_obligations: "medium",
  rent: "low",
  term: "low",
  permitted_use: "low",
};

function deriveTasks(lease: Lease): Task[] {
  return lease.clauses
    .filter((c) => priorityByCategory[c.category])
    .map((c, i) => ({
      id: `${lease.filename}-${c.category}-${i}`,
      title: `${lease.filename} — ${c.category.replace(/_/g, " ")}`,
      description: c.text.length > 140 ? c.text.slice(0, 140) + "…" : c.text,
      priority: priorityByCategory[c.category],
      clauseLabel: `Page ${c.page}`,
    }));
}

interface LeaseStoreContextValue {
  leases: Lease[];
  tasks: Task[];
  addLease: (lease: Lease) => void;
}

const LeaseStoreContext = createContext<LeaseStoreContextValue | null>(null);

export function LeaseStoreProvider({ children }: { children: ReactNode }) {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Load what's already stored in Postgres, so the dashboard survives a refresh.
  useEffect(() => {
    fetch(`${API}/api/portfolio/leases`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: Lease[]) => {
        setLeases(data);
        setTasks(data.flatMap(deriveTasks));
      })
      .catch(() => {
        /* API unavailable — fall back to in-memory uploads */
      });
  }, []);

  const addLease = (lease: Lease) => {
    setLeases((prev) => [...prev, lease]);
    setTasks((prev) => [...prev, ...deriveTasks(lease)]);
  };

  return (
    <LeaseStoreContext.Provider value={{ leases, tasks, addLease }}>
      {children}
    </LeaseStoreContext.Provider>
  );
}

export function useLeaseStore() {
  const ctx = useContext(LeaseStoreContext);
  if (!ctx) throw new Error("useLeaseStore must be used inside LeaseStoreProvider");
  return ctx;
}