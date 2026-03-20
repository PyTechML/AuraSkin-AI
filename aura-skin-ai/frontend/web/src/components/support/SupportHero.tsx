"use client";

import { motion } from "framer-motion";

export function SupportHero({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
}) {
  return (
    <section className="relative min-h-[40vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden bg-glass-4">
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden
      >
        <div
          className="w-[360px] h-[260px] rounded-full blur-[90px] opacity-80"
          style={{
            background:
              "radial-gradient(ellipse, rgba(137,108,108,0.16) 0%, rgba(229,190,181,0.08) 50%, transparent 65%)",
          }}
        />
      </div>
      <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
        {eyebrow ? (
          <motion.span
            className="block text-xs font-label uppercase tracking-[0.2em] text-muted-foreground mb-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {eyebrow}
          </motion.span>
        ) : null}
        <motion.h1
          className="font-heading text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="mt-5 text-muted-foreground font-body text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
        >
          {subtitle}
        </motion.p>
      </div>
    </section>
  );
}

