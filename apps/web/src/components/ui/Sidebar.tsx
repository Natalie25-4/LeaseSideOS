"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Inbox, Wrench, Calculator, Settings, LogOut } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leases", href: "/leases", icon: FileText },
  { label: "Smart Inbox", href: "/inbox", icon: Inbox },
  { label: "Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Accounting", href: "/accounting", icon: Calculator },
];

export function Sidebar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className="w-60 bg-navy h-screen flex flex-col justify-between py-6 px-3 fixed left-0 top-0">
      <div>
        <div className="flex items-center gap-2 px-3 mb-8">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white font-bold text-sm">
            L
          </div>
          <span className="text-white font-semibold text-sm">LeaseSide OS</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors " +
                  (isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white")
                }
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative px-3">
        {menuOpen && (
          <div className="absolute bottom-full left-3 mb-2 w-44 bg-white rounded-md shadow-lg border border-border overflow-hidden">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-charcoal hover:bg-gray-50 text-left">
              <Settings size={14} /> Settings
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-critical hover:bg-gray-50 text-left">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-9 h-9 rounded-full bg-primary"
        />
      </div>
    </aside>
  );
}