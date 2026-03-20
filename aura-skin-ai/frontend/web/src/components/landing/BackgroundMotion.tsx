"use client";

import { motion } from "framer-motion";

/** Palette only: #896C6C, #E5BEB5, #EEE6CA, #F5FAE1 */
const PALETTE_RGBA = {
  glass1: "rgba(137,108,108,",
  glass2: "rgba(229,190,181,",
  glass3: "rgba(238,230,202,",
  glass4: "rgba(245,250,225,",
} as const;

/**
 * Soft blurred organic shapes with slow horizontal drift and breathing scale.
 * Palette only. Variant "withRing" adds a gradient ring and soft pill.
 */
export function BackgroundMotion({
  intensity = "default",
  variant = "default",
}: {
  intensity?: "default" | "subtle";
  variant?: "default" | "withRing";
}) {
  const blobCount = intensity === "subtle" ? 2 : 3;
  const withRing = variant === "withRing";
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(229,190,181,0.12) 0%, rgba(137,108,108,0.04) 40%, transparent 70%)",
          left: "10%",
          top: "20%",
        }}
        animate={{
          x: [0, 80, -50, 0],
          scale: [1, 1.04, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(229,190,181,0.08) 0%, transparent 65%)",
          right: "5%",
          bottom: "15%",
        }}
        animate={{
          x: [0, -60, 40, 0],
          scale: [1.02, 1, 1.03],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {blobCount > 2 && (
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(137,108,108,0.06) 0%, transparent 60%)",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            x: [0, 45, -35, 0],
            y: [0, -8, 6, 0],
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      {withRing && (
        <>
          <motion.div
            className="absolute rounded-full border-2 border-[rgba(229,190,181,0.08)] w-[220px] h-[220px]"
            style={{
              left: "70%",
              top: "25%",
              boxShadow: `inset 0 0 30px ${PALETTE_RGBA.glass3}0.04)`,
            }}
            animate={{ scale: [1, 1.05, 1], rotate: [0, 8, -4, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-[9999px] blur-[60px] w-[200px] h-[56px]"
            style={{
              background: `linear-gradient(90deg, ${PALETTE_RGBA.glass2}0.06) 0%, ${PALETTE_RGBA.glass3}0.05) 50%, ${PALETTE_RGBA.glass4}0.04) 100%)`,
              right: "15%",
              bottom: "30%",
            }}
            animate={{ x: [0, 20, -15, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
    </div>
  );
}
