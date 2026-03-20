"use client";

/**
 * Store Partner nav: store-owned data only. Do not link to Admin moderation,
 * approval dashboards, commission config, or Dermatologist-only consultation panels.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Bell, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getPartnerNotifications } from "@/services/apiPartner";
import { dropdownTransition } from "@/lib/motion";

interface PartnerNavProps {
  role: UserRole | null;
  /** When true, show Bookings in Operations (store has linked dermatologist). */
  hasDermatologist?: boolean;
  unreadCount?: number;
  onProfileClick: () => void;
  profileOpen: boolean;
  profileRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

interface DropdownLink {
  label: string;
  href: string;
}

const commerceLinks: DropdownLink[] = [
  { label: "Orders", href: "/partner/orders" },
  { label: "Inventory", href: "/partner/inventory" },
  { label: "Add Product", href: "/partner/inventory/add" },
];

const operationsLinksBase: DropdownLink[] = [
  { label: "Assigned Users", href: "/partner/assigned-users" },
  { label: "Notifications", href: "/partner/notifications" },
];

const moreLinks: DropdownLink[] = [
  { label: "Store Profile", href: "/partner/store-profile" },
  { label: "Contact Support", href: "/partner/support" },
];

function NavDropdown({
  label,
  items,
  className,
}: {
  label: string;
  items: DropdownLink[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 text-sm font-label text-muted-foreground hover:text-foreground transition-colors shrink-0 border-b-2 border-transparent pb-0.5"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="absolute left-0 top-full mt-1 w-48 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-[20px] shadow-md py-1 z-50"
            initial={dropdownTransition.initial}
            animate={dropdownTransition.animate}
            exit={dropdownTransition.exit}
            transition={dropdownTransition.transition}
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="block px-4 py-2.5 text-sm font-label text-muted-foreground hover:text-foreground hover:bg-white/20 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const rootLinkBaseClass =
  "text-sm font-label text-muted-foreground hover:text-foreground transition-colors shrink-0 border-b-2 border-transparent pb-0.5";

function PartnerNavLinksContent({
  role,
  hasDermatologist = false,
}: {
  role: UserRole | null;
  hasDermatologist?: boolean;
}) {
  const pathname = usePathname();
  if (role !== "STORE" && role !== "DERMATOLOGIST") {
    return null;
  }

  const showConsultations = role === "DERMATOLOGIST" || hasDermatologist;
  const operationsLinks = showConsultations
    ? [
        { label: "Assigned Users", href: "/partner/assigned-users" },
        { label: "Consultations", href: "/partner/bookings" },
        { label: "Notifications", href: "/partner/notifications" },
      ]
    : operationsLinksBase;

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex items-center gap-8 flex-nowrap shrink-0 min-w-0">
      <Link
        href="/partner/dashboard"
        className={cn(
          rootLinkBaseClass,
          isActive("/partner/dashboard") && "text-foreground border-foreground"
        )}
      >
        Partner Dashboard
      </Link>
      <NavDropdown label="Commerce" items={commerceLinks} />
      <NavDropdown label="Operations" items={operationsLinks} />
      <Link
        href="/partner/analytics"
        className={cn(
          rootLinkBaseClass,
          isActive("/partner/analytics") && "text-foreground border-foreground"
        )}
      >
        Analytics
      </Link>
      <Link
        href="/partner/payouts"
        className={cn(
          rootLinkBaseClass,
          isActive("/partner/payouts") && "text-foreground border-foreground"
        )}
      >
        Payouts
      </Link>
      <NavDropdown label="More" items={moreLinks} />
    </div>
  );
}

export function PartnerNavLinks({
  role,
  hasDermatologist = false,
}: {
  role: UserRole | null;
  hasDermatologist?: boolean;
}) {
  if (role !== "STORE" && role !== "DERMATOLOGIST") {
    return null;
  }
  return <PartnerNavLinksContent role={role} hasDermatologist={hasDermatologist} />;
}

export function PartnerNavIcons({
  unreadCount = 0,
  onProfileClick,
  profileOpen,
  profileRef,
  children,
}: {
  unreadCount?: number;
  onProfileClick: () => void;
  profileOpen: boolean;
  profileRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href="/partner/notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/20 backdrop-blur-[20px] hover:bg-white/30 transition-colors shadow-sm"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <Badge
            variant="default"
            className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Link>
      <div className="relative" ref={profileRef as React.RefObject<HTMLDivElement>}>
        <button
          type="button"
          aria-label="Open profile menu"
          aria-expanded={profileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/20 backdrop-blur-[20px] hover:bg-white/30 transition-colors shadow-sm"
          onClick={onProfileClick}
        >
          <User className="h-4 w-4 text-foreground" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function PartnerNav({
  role,
  hasDermatologist = false,
  unreadCount = 0,
  onProfileClick,
  profileOpen,
  profileRef,
  children,
}: PartnerNavProps) {
  if (role !== "STORE" && role !== "DERMATOLOGIST") {
    return null;
  }

  return (
    <nav className="hidden md:flex items-center justify-between flex-1 flex-nowrap gap-6 min-w-0">
      <PartnerNavLinksContent role={role} hasDermatologist={hasDermatologist} />
      <PartnerNavIcons
        unreadCount={unreadCount}
        onProfileClick={onProfileClick}
        profileOpen={profileOpen}
        profileRef={profileRef}
        children={children}
      />
    </nav>
  );
}

export function usePartnerNotificationCount(partnerId: string | undefined) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!partnerId) {
      setCount(0);
      return;
    }
    getPartnerNotifications(partnerId)
      .then((list) => setCount(list.filter((n) => !n.read).length))
      .catch(() => setCount(0));
  }, [partnerId]);
  return count;
}
