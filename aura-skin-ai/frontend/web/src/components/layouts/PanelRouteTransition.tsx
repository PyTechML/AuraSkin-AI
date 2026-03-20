"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { pageTransition } from "@/lib/motion";

interface PanelRouteTransitionProps {
  children: React.ReactNode;
}

export function PanelRouteTransition({ children }: PanelRouteTransitionProps) {
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

