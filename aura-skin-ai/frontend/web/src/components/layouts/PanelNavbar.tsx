"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Bell, Menu, User, LogOut, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { dropdownTransition } from "@/lib/motion";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { usePartnerNotificationCount } from "./PartnerNav";
import {
  PanelRole,
  panelNavConfig,
  PanelNavCenterItem,
  PanelNavLinkConfig,
} from "./panelNavConfig";

interface PanelNavbarProps {
  role: PanelRole;
  className?: string;
}

const rootLinkBaseClass =
  "text-sm font-label text-muted-foreground hover:text-foreground shrink-0 border-b-2 border-transparent pb-0.5 transition-[color,border-color] duration-150 ease-out";

const mobileLinkClass =
  "text-sm font-label text-muted-foreground hover:text-foreground py-3 px-4 rounded-xl hover:bg-white/20 transition-colors";

function isActivePath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(href + "/");
}

function CenterNav({
  items,
  pathname,
}: {
  items: PanelNavCenterItem[];
  pathname: string;
}) {
  return (
    <div className="hidden md:flex flex-1 justify-center min-w-0">
      <div className="flex items-center gap-7">
        {items.map((item) => {
          if (item.type === "link") {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  rootLinkBaseClass,
                  isActivePath(pathname, item.href) &&
                    "text-foreground border-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          }

          return (
            <NavDropdown
              key={item.label}
              label={item.label}
              items={item.items}
            />
          );
        })}
      </div>
    </div>
  );
}

function NavDropdown({
  label,
  items,
  className,
}: {
  label: string;
  items: PanelNavLinkConfig[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
        className="flex items-center gap-2 text-sm font-label text-muted-foreground hover:text-foreground shrink-0 border-b-2 border-transparent pb-0.5 transition-[color,border-color] duration-150 ease-out"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-150 ease-out", open && "rotate-180")}
        />
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

export function PanelNavbar({ role, className }: PanelNavbarProps) {
  const pathname = usePathname();
  const { session } = useAuth();
  const logout = useAuthStore((s) => s.logout);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const unreadCount = usePartnerNotificationCount(session?.user?.id);

  const config = panelNavConfig[role];

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
    if (!notificationsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside, true);
    return () =>
      document.removeEventListener("click", handleClickOutside, true);
  }, [notificationsOpen]);

  const handleLogout = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <>
      <motion.nav
        className={cn(
          "flex h-14 items-center justify-between px-6 gap-4 flex-nowrap shrink-0 min-w-0",
          className
        )}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Left zone: brand / logo */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={
              role === "DERMATOLOGIST"
                ? "/dermatologist/dashboard"
                : "/store/dashboard"
            }
            className="font-brand font-semibold text-lg tracking-tight text-foreground whitespace-nowrap"
          >
            AuraSkin AI
          </Link>
          {config.subtitle && (
            <span className="hidden sm:inline text-xs font-label text-muted-foreground truncate max-w-[160px]">
              {config.subtitle}
            </span>
          )}
        </div>

        {/* Center zone: primary navigation (desktop and up) */}
        <CenterNav items={config.centerItems} pathname={pathname} />

        {/* Right zone: notifications + profile + mobile trigger */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Notification bell: visible on sm+ to avoid crowding on very small screens */}
          <div className="relative hidden sm:block" ref={notificationsRef}>
            <button
              type="button"
              aria-label={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : "Notifications"
              }
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/20 backdrop-blur-[20px] hover:bg-white/30 transition-colors shadow-sm"
              onClick={() => setNotificationsOpen((o) => !o)}
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
            </button>
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-[20px] shadow-md py-1 z-50"
                  initial={dropdownTransition.initial}
                  animate={dropdownTransition.animate}
                  exit={dropdownTransition.exit}
                  transition={dropdownTransition.transition}
                >
                  <div className="px-4 py-2.5 text-sm font-label text-muted-foreground">
                    {unreadCount > 0
                      ? "You have new notifications."
                      : "You're all caught up. Notifications will appear here."}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile avatar */}
          <div className="relative hidden sm:block" ref={profileRef}>
            <button
              type="button"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/20 backdrop-blur-[20px] hover:bg-white/30 transition-colors shadow-sm"
              onClick={() => setProfileOpen((o) => !o)}
            >
              <User className="h-4 w-4 text-foreground" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-[20px] shadow-md py-1 z-50"
                  initial={dropdownTransition.initial}
                  animate={dropdownTransition.animate}
                  exit={dropdownTransition.exit}
                  transition={dropdownTransition.transition}
                >
                  <Link
                    href={
                      role === "DERMATOLOGIST"
                        ? "/dermatologist/profile"
                        : "/store/profile"
                    }
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-label text-muted-foreground hover:text-foreground hover:bg-white/20 transition-colors first:rounded-t-2xl"
                    onClick={() => setProfileOpen(false)}
                  >
                    View Profile
                  </Link>
                  <Link
                    href={
                      role === "DERMATOLOGIST"
                        ? "/dermatologist/profile"
                        : "/store/profile"
                    }
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-label text-muted-foreground hover:text-foreground hover:bg-white/20 transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    Account Settings
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-label text-muted-foreground hover:text-foreground hover:bg-white/20 transition-colors text-left last:rounded-b-2xl"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Open navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/20 backdrop-blur-[20px] hover:bg-white/30 transition-colors shadow-sm md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile / tablet drawer for nav + identity actions */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="panel-nav-overlay"
              aria-hidden
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="panel-nav-drawer"
              className="fixed top-0 right-0 z-50 h-full w-[min(85vw,320px)] rounded-l-2xl border-l border-border/60 bg-card/95 backdrop-blur-[20px] shadow-xl md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            >
              <div className="flex flex-col gap-1 pt-20 pb-6 px-6">
                {config.mobileSections.map((section, index) => (
                  <div key={section.label ?? `section-${index}`}>
                    {section.label && (
                      <span className="mt-3 mb-1 text-xs font-label text-muted-foreground/80 px-2">
                        {section.label}
                      </span>
                    )}
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={mobileLinkClass}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
                <button
                  type="button"
                  className={cn(
                    mobileLinkClass,
                    "flex items-center gap-2 mt-4 border border-border/40"
                  )}
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

