"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Inbox, Wrench, Calculator } from "lucide-react";

const commands = [
  { label: "Go to Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Go to Leases", href: "/leases", icon: FileText },
  { label: "Go to Smart Inbox", href: "/inbox", icon: Inbox },
  { label: "Go to Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Go to Accounting", href: "/accounting", icon: Calculator },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-32"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command or search..."
          className="w-full px-4 py-3 text-sm text-charcoal border-b border-border focus:outline-none"
        />
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No results</p>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.href}
                  onClick={() => {
                    router.push(cmd.href);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal hover:bg-gray-50 text-left"
                >
                  <Icon size={16} className="text-gray-400" />
                  {cmd.label}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}