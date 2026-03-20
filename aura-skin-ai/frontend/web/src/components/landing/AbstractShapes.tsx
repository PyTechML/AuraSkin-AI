"use client";

import { motion, type MotionValue } from "framer-motion";

const SHAPE_COLOR = "rgba(137, 108, 108, 0.08)";
const SHAPE_COLOR_CTA = "rgba(229, 190, 181, 0.12)";

/** Decorative abstract shapes in hero section - accepts motion style (y, opacity) */
export function HeroShapes({
  style,
}: {
  style?: { y?: number | MotionValue<number>; opacity?: number | MotionValue<number> };
}) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={style}
      aria-hidden
    >
      <div
        className="absolute top-1/4 left-[10%] w-32 h-32 rounded-full blur-2xl"
        style={{ background: SHAPE_COLOR }}
      />
      <div
        className="absolute top-1/3 right-[15%] w-40 h-40 rounded-full blur-3xl"
        style={{ background: SHAPE_COLOR }}
      />
      <div
        className="absolute bottom-1/4 left-[20%] w-24 h-24 rounded-full blur-xl"
        style={{ background: SHAPE_COLOR }}
      />
    </motion.div>
  );
}

/** Decorative shapes for section dividers */
export function SectionDividerShapes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div
        className="absolute left-0 top-1/2 w-20 h-20 -translate-y-1/2 rounded-full blur-2xl"
        style={{ background: SHAPE_COLOR }}
      />
      <div
        className="absolute right-0 top-1/2 w-24 h-24 -translate-y-1/2 rounded-full blur-2xl"
        style={{ background: SHAPE_COLOR }}
      />
    </div>
  );
}

/** Decorative shapes in CTA section */
export function CTAShapes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div
        className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full blur-[60px]"
        style={{ background: SHAPE_COLOR_CTA }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full blur-[50px]"
        style={{ background: SHAPE_COLOR_CTA }}
      />
    </div>
  );
}
