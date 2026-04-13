"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const MotionDiv = dynamic(
  () => import("framer-motion").then((mod) => mod.motion.div),
  { ssr: false }
);

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
    <MotionDiv
      className={cn(className)}
      initial={panelSectionVariants.initial}
      whileInView={panelSectionVariants.animate}
      viewport={panelViewport}
      transition={panelSectionTransition}
    >
      {children}
    </MotionDiv>
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
    <MotionDiv
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
    </MotionDiv>
  );
}

/** Single item in a PanelStagger. */
interface PanelStaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function PanelStaggerItem({ children, className }: PanelStaggerItemProps) {
  return (
    <MotionDiv
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
    </MotionDiv>
  );
}
