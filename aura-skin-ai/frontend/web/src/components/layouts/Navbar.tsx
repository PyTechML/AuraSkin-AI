"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthContext";
import { useAuthStore } from "@/store/authStore";
import { getRedirectPathForRole } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useAdminSidebarStore } from "@/store/adminSidebarStore";
import type { UserRole } from "@/types";
import {
  ADMIN_DASHBOARD,
  ADMIN_NAV_GROUPS,
  getAdminGroupForPath,
} from "@/config/adminNavConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, LogOut, User, ShoppingCart, ChevronDown } from "lucide-react";
import { PartnerNavLinks, PartnerNavIcons, usePartnerNotificationCount } from "./PartnerNav";
import { getPartnerStore } from "@/services/apiPartner";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface NavLink {
  href: string;
  label: string;
}

interface DropdownItem {
  label: string;
  href?: string;
  action?: () => void;
}

interface NavbarProps {
  /** Optional display title override (e.g. "AuraSkin AI — Admin"). Mode is always derived from auth. */
  title?: string;
  onMenuClick?: () => void;
  showSidebarToggle?: boolean;
}

type NavMode = "public" | "user" | "admin" | "partner";

const publicLinks: NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const userAppLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/start-assessment", label: "Start Assessment" },
  { href: "/reports", label: "Reports" },
  { href: "/tracking", label: "Routine" },
  { href: "/shop", label: "Products" },
  { href: "/stores", label: "Stores" },
  { href: "/dermatologists", label: "Dermatologists" },
  { href: "/contact", label: "Contact" },
];

const adminAppLinks: NavLink[] = [
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/role-requests", label: "Role Requests" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/stores", label: "Stores" },
  { href: "/admin/dermatologists", label: "Dermatologists" },
  { href: "/admin/rule-engine", label: "Rules Engine" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/system-health", label: "System Health" },
];

const partnerAppLinksBase: NavLink[] = [
  { href: "/partner/dashboard", label: "Partner Dashboard" },
  { href: "/partner/orders", label: "Orders" },
  { href: "/partner/inventory", label: "Inventory" },
  { href: "/partner/assigned-users", label: "Assigned Users" },
  { href: "/partner/analytics", label: "Analytics" },
  { href: "/partner/payouts", label: "Payouts" },
  { href: "/partner/store-profile", label: "Store Profile" },
  { href: "/partner/notifications", label: "Notifications" },
  { href: "/partner/support", label: "Contact Support" },
];

function getPartnerLinks(role: UserRole | null, hasDermatologist: boolean): NavLink[] {
  const links = [...partnerAppLinksBase];
  if (role === "DERMATOLOGIST" || hasDermatologist) {
    links.splice(3, 0, { href: "/partner/bookings", label: "Consultations" });
  }
  return links;
}

function getLinksForMode(mode: NavMode, role?: UserRole | null, hasDermatologist = false): NavLink[] {
  switch (mode) {
    case "public":
      return publicLinks;
    case "user":
      return userAppLinks;
    case "admin":
      return adminAppLinks;
    case "partner":
      return getPartnerLinks(role ?? null, hasDermatologist);
  }
}

function getEffectiveMode(isAuthenticated: boolean, role: UserRole | null): NavMode {
  if (!isAuthenticated) return "public";
  if (role === "ADMIN") return "admin";
  if (role === "DERMATOLOGIST" || role === "STORE") return "partner";
  return "user";
}

const userMenuItems: DropdownItem[] = [
  { label: "Profile", href: "/dashboard/profile" },
  { label: "Assessment History", href: "/reports" },
  { label: "Routine", href: "/tracking" },
  { label: "Account Settings", href: "/dashboard/profile" },
];

const adminMenuItems: DropdownItem[] = [
  { label: "Admin Profile", href: "/admin" },
  { label: "System Settings", href: "/admin/rule-engine" },
  { label: "User Management Access", href: "/admin/users" },
];

const partnerMenuItems: DropdownItem[] = [
  { label: "Store Profile", href: "/partner/store-profile" },
];

function getDropdownItems(role: UserRole | null): DropdownItem[] {
  if (!role) return [];
  if (role === "USER") return userMenuItems;
  if (role === "ADMIN") return adminMenuItems;
  return partnerMenuItems;
}

export function Navbar({
  onMenuClick,
  showSidebarToggle = false,
  title = "AuraSkin AI",
}: NavbarProps) {
  const pathname = usePathname();
  const { session, role, isAuthenticated, loading } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const cartCount = useCartStore((s) => (s.items ?? []).reduce((acc, i) => acc + (i?.quantity ?? 0), 0));
  const effectiveMode = getEffectiveMode(isAuthenticated, role);
  const [hasDermatologist, setHasDermatologist] = useState(false);
  const navLinks = getLinksForMode(effectiveMode, role, hasDermatologist);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminOpenGroup, setAdminOpenGroup] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const adminNavRef = useRef<HTMLDivElement>(null);
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const adminMobileOpen = useAdminSidebarStore((s) => s.open);
  const setAdminMobileOpen = useAdminSidebarStore((s) => s.setOpen);
  const adminActiveGroup = pathname ? getAdminGroupForPath(pathname) : null;

  useEffect(() => {
    setMobileOpen(false);
    setAdminMobileOpen(false);
    setProfileOpen(false);
    setAdminOpenGroup(null);
  }, [pathname, setAdminMobileOpen]);

  useEffect(() => {
    if (effectiveMode !== "partner" || !session?.user?.id) {
      setHasDermatologist(false);
      return;
    }
    getPartnerStore(session.user.id)
      .then((store) => setHasDermatologist(!!store?.linkedDermatologistId))
      .catch(() => setHasDermatologist(false));
  }, [effectiveMode, session?.user?.id]);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, [profileOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminNavRef.current && !adminNavRef.current.contains(e.target as Node)) {
        setAdminOpenGroup(null);
      }
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, [adminOpenGroup]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const dropdownItems = getDropdownItems(role);
  const allMenuItems: DropdownItem[] = [...dropdownItems, { label: "Logout", action: handleLogout }];
  const partnerUnreadCount = usePartnerNotificationCount(
    effectiveMode === "partner" ? session?.user?.id : undefined
  );

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full pt-3 pb-2 px-4 bg-transparent">
        <div className="mx-auto w-full max-w-5xl rounded-full border shadow-md backdrop-blur-[20px] bg-white/30 border border-border/60">
          <div className="flex h-14 items-center justify-between px-6 gap-4">
            <div className="h-5 w-24 rounded bg-muted/60 animate-pulse" />
            <div className="h-9 w-20 rounded-full bg-muted/60 animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  const pillContent = (
    <div className={cn("flex h-14 items-center justify-between px-6 gap-4", effectiveMode === "partner" && "relative")}>
      <div className="flex items-center gap-4">
        {(showSidebarToggle || (effectiveMode === "admin" && isAdminRoute)) && (
          <button
            type="button"
            className="md:hidden p-2 rounded-full hover:bg-white/20 transition-colors"
            onClick={effectiveMode === "admin" && isAdminRoute ? () => setAdminMobileOpen(!adminMobileOpen) : onMenuClick}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {(effectiveMode === "public" || effectiveMode === "user" || effectiveMode === "partner") && !showSidebarToggle && (
          <button
            type="button"
            className="md:hidden p-2 rounded-full hover:bg-white/20 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link href="/" className="font-brand font-semibold text-lg tracking-tight text-foreground">
          {title}
        </Link>
      </div>

      {effectiveMode === "partner" ? (
        <>
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center">
            <PartnerNavLinks role={role} hasDermatologist={hasDermatologist} />
          </div>
          <div className="hidden md:flex items-center shrink-0">
            <PartnerNavIcons
              unreadCount={partnerUnreadCount}
              onProfileClick={() => setProfileOpen((o) => !o)}
              profileOpen={profileOpen}
              profileRef={profileRef}
            >
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-[20px] shadow-md py-1 z-50"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                  >
                    {allMenuItems.map((item) =>
                      item.href ? (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-label text-muted-foreground hover:text-foreground hover:bg-white/20 transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <button
                          key={item.label}
                          type="button"
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-label text-muted-foreground hover:text-foreground hover:bg-white/20 transition-colors text-left"
                          onClick={item.action}
                        >
                          <LogOut className="h-4 w-4" />
                          {item.label}
                        </button>
                      )
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </PartnerNavIcons>
          </div>
        </>
      ) : (
        <>
          <nav className="hidden md:flex items-center gap-6" ref={adminNavRef}>
            {effectiveMode === "admin" ? (
              <>
                <Link
                  href={ADMIN_DASHBOARD.href}
                  className={cn(
                    "text-sm font-label transition-colors",
                    pathname === ADMIN_DASHBOARD.href
                      ? "text-foreground font-medium border-b-2 border-accent pb-0.5"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {ADMIN_DASHBOARD.label}
                </Link>
                {ADMIN_NAV_GROUPS.map((group) => {
                  const isOpen = adminOpenGroup === group.label;
                  const isActive = adminActiveGroup === group.label;
                  return (
                    <div key={group.label} className="relative">
                      <button
                        type="button"
                        onClick={() => setAdminOpenGroup((g) => (g === group.label ? null : group.label))}
                        className={cn(
                          "flex items-center gap-0.5 text-sm font-label transition-colors px-2 py-1",
                          isActive ? "text-foreground font-medium border-b-2 border-accent pb-0.5" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {group.label} <ChevronDown className="h-4 w-4 opacity-70" />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            className="absolute left-0 top-full mt-1 w-48 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-[20px] shadow-lg py-1 z-50"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.15 }}
                          >
                            {group.items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                className="block px-4 py-2.5 text-sm font-label transition-colors hover:text-foreground hover:bg-white/20"
                                onClick={() => setAdminOpenGroup(null)}
                              >
                                {item.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </>
            ) : (
              navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-label text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))
            )}
          </nav>

          <div className="flex items-center gap-2 relative" ref={profileRef}>
            {effectiveMode === "user" && (
              <Link
                href="/cart"
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/20 backdrop-blur-[20px] hover:bg-white/30 transition-colors shadow-sm"
              >
                <ShoppingCart className="h-4 w-4 text-foreground" />
                {cartCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full">
                    {cartCount > 99 ? "99+" : cartCount}
                  </Badge>
                )}
              </Link>
            )}
            {!isAuthenticated && (
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            )}
            {isAuthenticated && (
              <div className="relative">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/20 backdrop-blur-[20px] hover:bg-white/30 transition-colors shadow-sm"
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-label="Profile"
                >
                  <User className="h-4 w-4 text-foreground" />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-[20px] shadow-md py-1 z-50"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                    >
                      {allMenuItems.map((item) =>
                        item.href ? (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-label text-muted-foreground hover:text-foreground hover:bg-white/20"
                            onClick={() => setProfileOpen(false)}
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <button
                            key={item.label}
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-label text-muted-foreground hover:text-foreground text-left"
                            onClick={item.action}
                          >
                            <LogOut className="h-4 w-4" />
                            {item.label}
                          </button>
                        )
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full pt-3 pb-2 px-4 bg-transparent">
      <div className="mx-auto w-full max-w-5xl rounded-full border shadow-md backdrop-blur-[20px] bg-white/30 border border-border/60">
        {pillContent}
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 z-50 h-full w-[min(85vw,320px)] rounded-l-2xl border-l border-border/60 bg-card/95 backdrop-blur-[20px] shadow-xl md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <div className="flex flex-col gap-1 pt-20 pb-6 px-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-label text-muted-foreground hover:text-foreground py-3 px-4 rounded-xl hover:bg-white/20"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
