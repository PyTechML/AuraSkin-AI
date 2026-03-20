"use client";

import { motion } from "framer-motion";

// Chromia-style: scroll reveal timing and motion
export const revealConfig = {
  duration: 0.9,
  ease: "easeOut" as const,
  initial: { opacity: 0, y: 56 },
  animate: { opacity: 1, y: 0 },
  viewportMargin: "-60px",
  viewportMarginFadeOnly: "-40px",
};

const revealTransition = { duration: revealConfig.duration, ease: revealConfig.ease };

const fadeUp = {
  initial: { ...revealConfig.initial },
  whileInView: { ...revealConfig.animate },
  viewport: { once: true, margin: revealConfig.viewportMargin },
  transition: revealTransition,
};

const fadeOnly = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: revealConfig.viewportMarginFadeOnly },
  transition: revealTransition,
};

const slideUp = {
  initial: { opacity: 0, y: 56 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: revealConfig.viewportMargin },
  transition: revealTransition,
};

const slideLeft = {
  initial: { opacity: 0, x: -48 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: revealConfig.viewportMargin },
  transition: revealTransition,
};

const slideRight = {
  initial: { opacity: 0, x: 48 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: revealConfig.viewportMargin },
  transition: revealTransition,
};

export const scrollReveal = {
  fadeUp,
  fadeOnly,
  slideUp,
  slideLeft,
  slideRight,
};

export function SectionReveal({
  children,
  variant = "fadeUp",
  className,
}: {
  children: React.ReactNode;
  variant?: "fadeUp" | "fadeOnly" | "slideUp" | "slideLeft" | "slideRight";
  className?: string;
}) {
  const props = scrollReveal[variant];
  return (
    <motion.div className={className} {...props}>
      {children}
    </motion.div>
  );
}

const headingMotion = { h1: motion.h1, h2: motion.h2, h3: motion.h3 };

/** Heading with letter-spacing animation on scroll + fade in */
export function HeadingReveal({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const Component = headingMotion[Tag];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, letterSpacing: "0.06em" }}
      whileInView={{ opacity: 1, letterSpacing: "0.02em" }}
      viewport={{ once: true, margin: revealConfig.viewportMargin }}
      transition={{ duration: revealConfig.duration, ease: revealConfig.ease }}
    >
      {children}
    </Component>
  );
}

/** Subtext that fades in with delay */
export function SubtextReveal({
  children,
  className,
  delay = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.p
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: revealConfig.viewportMargin }}
      transition={{ delay, duration: 0.6, ease: revealConfig.ease }}
    >
      {children}
    </motion.p>
  );
}

export function StaggerChildren({
  children,
  stagger = 0.12,
  className,
}: {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        visible: {
          transition: { staggerChildren: stagger },
        },
        hidden: {},
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: revealConfig.duration, ease: revealConfig.ease },
        },
        hidden: { opacity: 0, y: 56 },
      }}
    >
      {children}
    </motion.div>
  );
}
