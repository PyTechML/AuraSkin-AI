"use client";

import { motion } from "framer-motion";

const container = {
  rest: {},
  hover: {
    scale: 1.02,
    transition: { staggerChildren: 0.05, duration: 0.2 },
  },
};

const glowExpand = {
  rest: { opacity: 0, scale: 1 },
  hover: {
    opacity: 1,
    scale: 1.2,
    transition: { duration: 0.3 },
  },
};

export function CTAWithGlow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      className={`group relative inline-block ${className ?? ""}`}
      initial="rest"
      whileHover="hover"
      variants={container}
    >
      <motion.span
        className="absolute -inset-2 rounded-full blur-xl pointer-events-none"
        style={{
          originX: "50%",
          originY: "50%",
          background: "radial-gradient(circle, rgba(229,190,181,0.4) 0%, rgba(137,108,108,0.1) 50%, transparent 70%)",
        }}
        variants={glowExpand}
      />
      <span className="relative block">{children}</span>
    </motion.span>
  );
}
