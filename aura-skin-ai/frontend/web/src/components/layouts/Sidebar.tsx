"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  User,
  TrendingUp,
  Users,
  Package,
  Stethoscope,
  Store,
  Settings,
  Boxes,
  Activity,
  BookOpen,
  Monitor,
} from "lucide-react";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  variant: "user" | "admin" | "partner";
  open: boolean;
  onClose?: () => void;
}

const userLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/start-assessment", label: "Start Assessment", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/tracking", label: "Routine", icon: TrendingUp },
];

const adminLinks: SidebarLink[] = [
  { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { href: "/admin/sessions", label: "Sessions", icon: Monitor },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/role-requests", label: "Role Requests", icon: ClipboardList },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/stores", label: "Stores", icon: Store },
  { href: "/admin/dermatologists", label: "Dermatologists", icon: Stethoscope },
  { href: "/admin/rule-engine", label: "Rules Engine", icon: Boxes },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
  { href: "/admin/system-health", label: "System Health", icon: Activity },
  { href: "/admin/platform", label: "About / Platform", icon: BookOpen },
];

const partnerLinks: SidebarLink[] = [
  { href: "/partner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/partner/patients", label: "Patients", icon: Users },
  { href: "/partner/profile", label: "Profile", icon: User },
  { href: "/partner/inventory", label: "Inventory", icon: Boxes },
];

const linkMap = { user: userLinks, admin: adminLinks, partner: partnerLinks };

export function Sidebar({ variant, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const links = linkMap[variant];

  const content = (
    <aside
      className={cn(
        "flex flex-col w-56 border-r border-border bg-card text-card-foreground",
        "fixed md:static inset-y-0 left-0 z-30 pt-14 md:pt-0",
        "transform transition-transform duration-200 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <nav className="flex-1 gap-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-label transition-colors",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          aria-hidden
          onClick={onClose}
        />
      )}
      {content}
    </>
  );
}
