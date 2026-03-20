"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Panel section reveal: fade in + slide up (16px), 300ms, trigger once. */
const panelSectionVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};
const panelSectionTransition = { duration: 0.3, ease: "easeOut" as const };
const panelViewport = { once: true, amount: 0.2 };

interface PanelSectionRevealProps {
  children: ReactNode;
  className?: string;
}

export function PanelSectionReveal({ children, className }: PanelSectionRevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={panelSectionVariants.initial}
      whileInView={panelSectionVariants.animate}
      viewport={panelViewport}
      transition={panelSectionTransition}
    >
      {children}
    </motion.div>
  );
}

const staggerDuration = 0.06;

/** Parent for staggered children (60ms between each). */
interface PanelStaggerProps {
  children: ReactNode;
  className?: string;
}

export function PanelStagger({ children, className }: PanelStaggerProps) {
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={panelViewport}
      variants={{
        visible: {
          transition: { staggerChildren: staggerDuration },
        },
        hidden: {},
      }}
    >
      {children}
    </motion.div>
  );
}

/** Single item in a PanelStagger. */
interface PanelStaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function PanelStaggerItem({ children, className }: PanelStaggerItemProps) {
  return (
    <motion.div
      className={cn(className)}
      variants={{
        visible: {
          opacity: 1,
          y: 0,
          transition: panelSectionTransition,
        },
        hidden: { opacity: 0, y: 16 },
      }}
    >
      {children}
    </motion.div>
  );
}
