"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { pageTransition } from "@/lib/motion";

/**
 * Wraps partner panel content so route changes trigger a single entrance animation.
 * Animation runs only on pathname change (key={pathname}), not on state updates.
 */
export function PartnerRouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
      className="min-h-0"
    >
      {children}
    </motion.div>
  );
}
